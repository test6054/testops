/**
 * 扫描一体机互斥规则聚合
 *
 * 把 useKioskWorkflow 中分散的 canStartDirectScan / canStartSupplementScan 等
 * 全部聚合为统一的 blockedReasons 对象，UI 层只读这一个 computed 决定 disable 状态。
 */

import type { ExamKioskWorkflow } from './useExamKioskWorkflow'
import { computed } from 'vue'
import { LocalScanJobStatusCode } from '@/apis/mark/scanner-agent-local'
import { resolveKioskActivationGuardMessage } from '../utils/kioskActivationGuard'

const UPLOAD_PHASE_JOB_STATUSES: readonly LocalScanJobStatusCode[] = [
  LocalScanJobStatusCode.READYTOUPLOAD,
  LocalScanJobStatusCode.UPLOADING,
  LocalScanJobStatusCode.RETRYING,
  LocalScanJobStatusCode.FAILED,
]

export interface KioskBlockedReasons {
  /** 切换考试是否被阻断（空字符串=不阻断） */
  switchExam: string
  /** 切换本地扫描仪 */
  switchScanner: string
  /** 重试页登记 */
  retryPageRegister: string
  /** 启动首次扫描 */
  startDirectScan: string
  /** 打开补扫启动面板 */
  openSupplementLaunch: string
  /** 确认补扫并开批次 */
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
  /** 重试提交 */
  retryCommit: string
  /** 删除 / 废弃当前任务 */
  removeJob: string
  /** 单页废弃 */
  discardLedgerPage: string
  /** 激活一体机 */
  activateAgent: string
}

export function useKioskMutex(workflow: ExamKioskWorkflow) {
  /**
   * 当前活动任务在采集 / 上传链路时通用的阻断文案。
   */
  const jobInflightBlocked = computed(() =>
    workflow.currentJobBlocksWorkspace.value ? '当前扫描任务未结束' : '',
  )

  const blockedReasons = computed<KioskBlockedReasons>(() => {
    const job = workflow.currentJob.value
    const status = job?.status

    return {
      switchExam: workflow.switchExamBlockedReason.value,
      switchScanner: jobInflightBlocked.value,

      retryPageRegister:
        workflow.canRetryPageRegister.value
          ? ''
          : workflow.pageRegisterPending.value || workflow.pageRegisterBlocked.value
            ? '页登记重试条件未满足'
            : '当前无待重试页登记',
      startDirectScan:
        workflow.directScanBlockedReason.value
        || (workflow.loading.value ? '正在处理中' : ''),
      openSupplementLaunch:
        workflow.supplementScanBlockedReason.value
        || (workflow.loading.value ? '正在处理中' : ''),
      startSupplementScan:
        workflow.supplementScanBlockedReason.value
        || workflow.supplementLaunchFieldBlockedReason.value
        || (workflow.loading.value ? '正在处理中' : ''),

      pauseJob:
        status === LocalScanJobStatusCode.SCANNING
          ? ''
          : !job
              ? '当前没有可暂停的任务'
              : status && UPLOAD_PHASE_JOB_STATUSES.includes(status)
                ? '本批次已进入上传/提交阶段，不能暂停'
                : '当前任务不在采集阶段',
      resumeJob:
        status === LocalScanJobStatusCode.PAUSED
          ? ''
          : !job
              ? '当前没有可恢复的任务'
              : '当前任务不在暂停阶段',
      endBatch: workflow.canEndBatch.value
        ? ''
        : !job
            ? '当前没有进行中的批次'
            : status && UPLOAD_PHASE_JOB_STATUSES.includes(status)
              ? '本批次已进入上传/提交阶段，请使用重试上传或重试提交'
              : '当前任务不在采集阶段，不能结束批次',
      cancelJob: workflow.canCancelJob.value
        ? ''
        : !job
            ? workflow.hasOrphanBackendScanSession.value
              ? '当前未完成进程不可结束'
              : '当前没有可取消的任务'
            : job.status === LocalScanJobStatusCode.FAILED
              ? '扫描已产生页面，请使用重试上传或删除任务'
              : '当前任务已进入上传链路，不能取消',
      retryUpload: workflow.canRetryUpload.value
        ? ''
        : workflow.isPreUploadScanFailure.value
          ? '扫描未产生页面，请取消任务后重新开始'
          : '当前任务不允许重试上传',
      retryCommit: workflow.canRetryCommit.value ? '' : '当前任务不允许重试提交',
      removeJob: workflow.canRemoveCurrentJob.value
        ? ''
        : workflow.currentJobAllPagesUploadedButUnconfirmed.value
            ? '页面已上传完成但批次未确认，请先重试提交'
            : workflow.removeCurrentJobTitle.value,
      discardLedgerPage: workflow.canDiscardLedgerPage.value ? '' : jobInflightBlocked.value,

      activateAgent: resolveKioskActivationGuardMessage({
        health: workflow.health.value,
        currentJobBlocksWorkspace: workflow.currentJobBlocksWorkspace.value,
      }) || '',
    }
  })

  function canDo(action: keyof KioskBlockedReasons): boolean {
    return !blockedReasons.value[action]
  }

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
