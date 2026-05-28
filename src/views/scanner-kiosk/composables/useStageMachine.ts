/**
 * 扫描一体机阶段状态机
 *
 * 输入：useKioskWorkflow 返回的 reactive state（currentJob / kioskContext.latestBatch）。
 * 输出：
 *   - currentStage: computed 当前应处于的阶段（自动推导）
 *   - autoStage:    computed 系统推荐阶段（用于 watch 自动跳转）
 *   - gotoStage:    手动切换阶段（先校验互斥再 router.push）
 *   - autoSyncOnce: KioskLayout onMounted 后调用一次，把路由对齐到自动推导阶段
 *
 * 规则（与 plan §6.1 一致）：
 *   - 没考试 OR job 不存在 OR INIT → setup
 *   - job 在采集/上传链路（CREATED/SCANNING/PAUSED/READYTOUPLOAD/UPLOADING/RETRYING） → scanning
 *   - job REPORTED + 有异常 OR job FAILED → review
 *   - job REPORTED + 无 pending → finalize
 */

import type { KioskWorkflow } from './useKioskWorkflow'
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type KioskStageId = 'setup' | 'scanning' | 'review' | 'finalize'

export interface KioskStageDef {
  id: KioskStageId
  label: string
  description: string
  routeName: string
  /** StageBar 显示顺序索引 */
  order: number
}

/**
 * 阶段定义。顺序与 router/routes/constant.ts 中 children 一一对应。
 */
export const KIOSK_STAGES: readonly KioskStageDef[] = Object.freeze([
  {
    id: 'setup',
    label: '准备',
    description: '选考试 / 设备就绪',
    routeName: 'ScannerKioskSetup',
    order: 0,
  },
  {
    id: 'scanning',
    label: '扫描中',
    description: '采集 / 上传 / 进度',
    routeName: 'ScannerKioskScanning',
    order: 1,
  },
  {
    id: 'review',
    label: '复核',
    description: '异常处置 / 补扫',
    routeName: 'ScannerKioskReview',
    order: 2,
  },
  {
    id: 'finalize',
    label: '封存',
    description: '历史 / 封存批次',
    routeName: 'ScannerKioskFinalize',
    order: 3,
  },
])

const SCANNING_JOB_STATUS = new Set([
  'CREATED',
  'SCANNING',
  'PAUSED',
  'READYTOUPLOAD',
  'UPLOADING',
  'RETRYING',
])

export function useStageMachine(workflow: KioskWorkflow) {
  const route = useRoute()
  const router = useRouter()

  /** 系统按业务状态推导出的"应当处于"阶段。 */
  const autoStage = computed<KioskStageId>(() => {
    const job = workflow.currentJob.value
    const ctx = workflow.kioskContext.value

    if (!workflow.examId.value || !ctx) return 'setup'
    if (!job) return 'setup'

    if (SCANNING_JOB_STATUS.has(job.status)) return 'scanning'

    if (job.status === 'FAILED') return 'review'
    if (job.status === 'CANCELLED') return 'setup'

    if (job.status === 'REPORTED') {
      const attentionCount = ctx.latestBatch?.attentionItemCount ?? ctx.attentionCount ?? 0
      const pendingUpload = ctx.latestBatch?.pendingUploadCount ?? 0
      if (attentionCount > 0) return 'review'
      if (pendingUpload === 0) return 'finalize'
      return 'review'
    }

    return 'setup'
  })

  /** 当前路由所在阶段（点击 StageBar / URL 直接访问决定）。 */
  const currentStage = computed<KioskStageId>(() => {
    const matched = KIOSK_STAGES.find((s) => s.routeName === route.name)
    return matched?.id ?? 'setup'
  })

  /**
   * 用户手动切换阶段：
   * - 如果切到 scanning 但当前没有任何活跃 job，无需阻断（视图会显示空态引导）；
   * - 切换前不做强校验（用户随时可回看任何阶段）；只有"开始扫描"等动作受互斥约束。
   */
  function gotoStage(stageId: KioskStageId) {
    if (stageId === currentStage.value) return
    const stage = KIOSK_STAGES.find((s) => s.id === stageId)
    if (!stage) return
    router.push({ name: stage.routeName, query: route.query })
  }

  /** 静默对齐到 autoStage（只用 router.replace，不进入 history）。 */
  function syncToAutoStage() {
    if (autoStage.value === currentStage.value) return
    const stage = KIOSK_STAGES.find((s) => s.id === autoStage.value)
    if (!stage) return
    router.replace({ name: stage.routeName, query: route.query })
  }

  /**
   * KioskLayout 挂载完毕、refreshAll 跑完后调用一次，把 URL 对齐到推导阶段。
   * 用于刷新页面接管 / 直接访问 /scanner-kiosk 父路由 redirect 的情况。
   */
  function autoSyncOnce() {
    syncToAutoStage()
  }

  /**
   * 监听 autoStage 变化：
   * - setup → scanning（用户开始扫描）：自动跳到 scanning 视图
   * - scanning → review/finalize（任务进入终态）：自动跳到对应视图
   * - 其它情况（review → finalize 等）：不自动跳，让用户主动决定
   */
  watch(autoStage, (next, prev) => {
    if (next === prev) return
    if (next === currentStage.value) return

    // 仅自动跳转两类关键变化，其它让用户主动控制
    const enterScanning = prev === 'setup' && next === 'scanning'
    const exitScanning = prev === 'scanning' && (next === 'review' || next === 'finalize')

    if (enterScanning || exitScanning) {
      syncToAutoStage()
    }
  })

  return {
    currentStage,
    autoStage,
    gotoStage,
    autoSyncOnce,
    syncToAutoStage,
  }
}

export type KioskStageMachine = ReturnType<typeof useStageMachine>
