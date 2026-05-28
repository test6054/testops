/**
 * 扫描一体机互斥规则聚合
 *
 * 把 useKioskWorkflow 中分散的 canStartScan / canSwitchExam / scanBlockedReason 等
 * 全部聚合为统一的 blockedReasons 对象，UI 层只读这一个 computed 决定 disable 状态，
 * 不再让多个组件各自重复实现规则推导。
 *
 * 业务约束（与旧 demo 规则等价）：
 *   - 任务非终态时阻断切考试 / 切扫描仪 / 切模式 / 激活 / 解绑
 *   - 任务在 SCANNING/PAUSED 才允许暂停或继续
 *   - 任务在 SCANNING/PAUSED 才允许结束本批次
 *   - 已落库扫描页才允许单页废弃
 *   - 仅在 latestBatch 已提交且 pending=0 时允许封存
 */

import type { KioskWorkflow } from './useKioskWorkflow'
import { computed } from 'vue'

export interface KioskBlockedReasons {
  /** 切换考试是否被阻断（空字符串=不阻断） */
  switchExam: string
  /** 切换本地扫描仪 */
  switchScanner: string
  /** 切换扫描模式 / 编辑扫描启动参数 */
  switchScanMode: string
  /** 编辑扫描启动设置（如预计页数） */
  editScanSetup: string
  /** 启动扫描（最严格的入口阻断） */
  startScan: string
  /** 启动补扫（与 startScan 类似但带补扫专用校验） */
  startSupplementScan: string
  /** 暂停当前任务 */
  pauseJob: string
  /** 继续当前任务 */
  resumeJob: string
  /** 结束本批次 */
  endBatch: string
  /** 取消当前任务 */
  cancelJob: string
  /** 重试上传 */
  retryUpload: string
  /** 重试 commit */
  retryCommit: string
  /** 删除 / 废弃当前任务 */
  removeJob: string
  /** 封存最近批次 */
  sealLatestBatch: string
  /** 单页废弃 */
  discardLedgerPage: string
  /** 激活一体机 */
  activateAgent: string
  /** 解除一体机绑定 */
  unbindAgent: string
}

export function useKioskMutex(workflow: KioskWorkflow) {
  /**
   * 当前活动任务在采集 / 上传链路时通用的阻断文案。
   * SCANNING / PAUSED / READYTOUPLOAD / UPLOADING / RETRYING / FAILED / CANCELLED 都属于"未结束"。
   */
  const jobInflightBlocked = computed(() =>
    workflow.currentJobBlocksWorkspace.value ? '当前扫描任务未结束' : '',
  )

  const blockedReasons = computed<KioskBlockedReasons>(() => {
    const job = workflow.currentJob.value
    const status = job?.status

    return {
      switchExam: jobInflightBlocked.value,
      switchScanner: jobInflightBlocked.value,
      switchScanMode: jobInflightBlocked.value,
      editScanSetup: jobInflightBlocked.value,

      startScan: workflow.scanBlockedReason.value || (workflow.loading.value ? '正在处理中' : ''),
      startSupplementScan:
        workflow.scanBlockedReason.value
        || (workflow.scanMode.value !== 'SUPPLEMENT' ? '当前不在补扫模式' : ''),

      pauseJob:
        status === 'SCANNING'
          ? ''
          : !job
              ? '当前没有可暂停的任务'
              : '当前任务不在采集阶段',
      resumeJob:
        status === 'PAUSED'
          ? ''
          : !job
              ? '当前没有可恢复的任务'
              : '当前任务不在暂停阶段',
      endBatch: workflow.canEndBatch.value
        ? ''
        : !job
            ? '当前没有进行中的批次'
            : '当前任务不在采集阶段，不能结束批次',
      cancelJob: workflow.canCancelJob.value
        ? ''
        : !job
            ? '当前没有可取消的任务'
            : '当前任务已进入上传链路，不能取消',
      retryUpload: workflow.canRetryUpload.value ? '' : '当前任务不允许重试上传',
      retryCommit: workflow.canRetryCommit.value ? '' : '当前任务不允许重试 commit',
      removeJob: workflow.canRemoveCurrentJob.value
        ? ''
        : workflow.currentJobAllPagesUploadedButUnconfirmed.value
            ? '页面已上传完成但批次未确认，请先点击重试 commit'
            : workflow.removeCurrentJobTitle.value,
      sealLatestBatch: workflow.latestBatchSealBlockedReason.value,
      discardLedgerPage: workflow.canDiscardLedgerPage.value ? '' : jobInflightBlocked.value,

      activateAgent: workflow.canActivateAgent.value ? '' : jobInflightBlocked.value,
      unbindAgent: workflow.canUnbindAgent.value ? '' : jobInflightBlocked.value,
    }
  })

  /** 给定动作 key，返回是否允许执行。UI 层语法糖。 */
  function canDo(action: keyof KioskBlockedReasons): boolean {
    return !blockedReasons.value[action]
  }

  /** 给定动作 key，返回阻断原因（用于 disabled tooltip）。 */
  function reasonOf(action: keyof KioskBlockedReasons): string {
    return blockedReasons.value[action]
  }

  return {
    blockedReasons,
    canDo,
    reasonOf,
  }
}

export type KioskMutex = ReturnType<typeof useKioskMutex>
