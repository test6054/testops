/**
 * 扫描一体机阶段状态机（三阶段主链 + 独立历史页）
 *
 * 主链：准备 → 扫描中 → 复核
 * 历史：侧栏入口进入 /scanner-kiosk/history，不参与 StageBar
 */

import type { KioskWorkflow } from './useKioskWorkflow'
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type KioskStageId = 'setup' | 'scanning' | 'review' | 'history'

export interface KioskStageDef {
  id: KioskStageId
  label: string
  description: string
  routeName: string
  /** StageBar 显示顺序索引；-1 表示不在 StageBar 展示 */
  order: number
}

/** StageBar 三阶段定义，顺序与 router children 一致。 */
export const KIOSK_STAGES: readonly KioskStageDef[] = Object.freeze([
  {
    id: 'setup',
    label: '扫描答卷',
    description: '设备就绪 / 开始扫描',
    routeName: 'ScannerExamKioskSetup',
    order: 0,
  },
  {
    id: 'scanning',
    label: '扫描中',
    description: '采集 / 上传 / 进度',
    routeName: 'ScannerExamKioskScanning',
    order: 1,
  },
  {
    id: 'review',
    label: '复核',
    description: '异常处置 / 补扫',
    routeName: 'ScannerExamKioskReview',
    order: 2,
  },
])

export const KIOSK_HISTORY_STAGE: KioskStageDef = Object.freeze({
  id: 'history',
  label: '扫描记录',
  description: '历史批次只读浏览',
  routeName: 'ScannerExamKioskHistory',
  order: -1,
})

const ALL_KIOSK_STAGES: readonly KioskStageDef[] = Object.freeze([...KIOSK_STAGES, KIOSK_HISTORY_STAGE])

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

  /** 系统按业务状态推导出的主链阶段（不含 history）。 */
  const autoStage = computed<KioskStageId>(() => {
    const job = workflow.currentJob.value
    const ctx = workflow.kioskContext.value

    if (!workflow.examId.value || !ctx) return 'setup'
    if (workflow.activeBackendScanSession.value) return 'scanning'
    if (job) return 'scanning'
    if (workflow.reviewScanJob.value) return 'review'
    return 'scanning'
  })

  const currentStage = computed<KioskStageId>(() => {
    const matched = ALL_KIOSK_STAGES.find((s) => s.routeName === route.name)
    return matched?.id ?? 'setup'
  })

  function gotoStage(stageId: KioskStageId) {
    if (stageId === currentStage.value) return
    const job = workflow.currentJob.value
    const activeSession = Boolean(
      workflow.activeBackendScanSession.value
      || (job && SCANNING_JOB_STATUS.has(job.status)),
    )
    if (stageId === 'review' && (Boolean(job) || !workflow.reviewScanJob.value)) return
    if (activeSession && stageId !== 'scanning') {
      const stage = ALL_KIOSK_STAGES.find((s) => s.id === 'scanning')
      if (stage && currentStage.value !== 'scanning') {
        router.replace({ name: stage.routeName, query: route.query })
      }
      return
    }
    if (autoStage.value === 'review' && stageId === 'setup') {
      return
    }
    if (stageId === 'review' && autoStage.value !== 'review') return
    const stage = ALL_KIOSK_STAGES.find((s) => s.id === stageId)
    if (!stage) return
    router.push({ name: stage.routeName, query: route.query })
  }

  function syncToAutoStage() {
    if (autoStage.value === currentStage.value) return
    if (currentStage.value === 'history' && autoStage.value !== 'scanning') return
    const stage = KIOSK_STAGES.find((s) => s.id === autoStage.value)
    if (!stage) return
    router.replace({ name: stage.routeName, query: route.query })
  }

  function autoSyncOnce() {
    syncToAutoStage()
  }

  watch(autoStage, (next, prev) => {
    if (next === prev) return
    if (next === currentStage.value) return
    if (currentStage.value === 'history' && next !== 'scanning') return

    const enterScanning = prev === 'setup' && next === 'scanning'
    const exitScanning = prev === 'scanning' && (next === 'review' || next === 'setup')

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
