import type { WorkbenchStageSnapshotVO } from '@/apis/mark/exam-progress'
import { storeToRefs } from 'pinia'
import { onBeforeUnmount, ref, watch } from 'vue'
import { getWorkbenchStageSnapshot } from '@/apis/mark/exam-progress'
import { usePolling } from '@/composables/usePolling'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { showUserError } from '@/utils/error-handler'

const SNAPSHOT_POLL_BASE_MS = 5000
const SNAPSHOT_POLL_MAX_MS = 30000

/**
 * 考试工作台 layout 级快照拉取：写入 markStageStore，供 StageRail 与横幅使用。
 * 当扫描/正评等阶段存在后台处理任务时，自动短轮询刷新快照（指数退避至 30s）。
 */
export function useMarkWorkbenchSnapshot(examId: () => string) {
  const markStageStore = useMarkStageStore()
  const { snapshot, loading, error, orderedStages, suggestedStageKey, prepAdvisoryReasons, prepBlockingReasons, selectedExamLabel }
    = storeToRefs(markStageStore)
  const refreshing = ref(false)
  const pollIntervalMs = ref(SNAPSHOT_POLL_BASE_MS)

  function shouldPollSnapshot(current: WorkbenchStageSnapshotVO | null): boolean {
    if (!current) {
      return false
    }
    const progress = current.markingProgress
    if (progress.openProcessingTaskCount > 0) {
      return true
    }
    if (progress.scanAttentionCount > 0) {
      return true
    }
    if (current.trialSessionActive || current.formalSessionActive) {
      return true
    }
    const watchStageKeys = new Set(['SCAN', 'FORMAL_MARKING'])
    return current.stages.some((stage) => (
      watchStageKeys.has(stage.key)
      && (stage.status === 'active' || stage.status === 'warning')
    ))
  }

  let syncPollingRef: (() => void) | null = null
  let quietFailureCount = 0

  async function refreshSnapshot(options?: { quiet?: boolean }): Promise<void> {
    const id = examId()
    const quiet = options?.quiet === true
    if (!id) {
      markStageStore.reset()
      pollIntervalMs.value = SNAPSHOT_POLL_BASE_MS
      syncPollingRef?.()
      return
    }
    markStageStore.observeExam(id)
    if (!quiet) {
      markStageStore.setLoading(true)
      refreshing.value = true
    }
    try {
      const response = await getWorkbenchStageSnapshot(id)
      quietFailureCount = 0
      markStageStore.applySnapshot(response)
      if (shouldPollSnapshot(response)) {
        pollIntervalMs.value = Math.min(
          pollIntervalMs.value + SNAPSHOT_POLL_BASE_MS,
          SNAPSHOT_POLL_MAX_MS,
        )
      }
      else {
        pollIntervalMs.value = SNAPSHOT_POLL_BASE_MS
      }
      syncPollingRef?.()
    }
    catch (err) {
      if (quiet) {
        quietFailureCount += 1
        if (quietFailureCount >= 2) {
          showUserError(err, '工作台阶段快照加载失败')
        }
      }
      else {
        markStageStore.reset()
        markStageStore.observeExam(id)
        markStageStore.setError('工作台阶段快照加载失败')
        showUserError(err, '工作台阶段快照加载失败')
      }
      pollIntervalMs.value = SNAPSHOT_POLL_BASE_MS
      syncPollingRef?.()
      if (!quiet) {
        throw err
      }
    }
    finally {
      if (!quiet) {
        markStageStore.setLoading(false)
        refreshing.value = false
      }
    }
  }

  const polling = usePolling(
    async () => {
      if (refreshing.value) {
        return
      }
      await refreshSnapshot({ quiet: true })
    },
    {
      getOptions: () => ({
        intervalMs: pollIntervalMs.value,
        when: Boolean(examId()) && shouldPollSnapshot(snapshot.value),
        immediate: false,
      }),
      pauseWhenDocumentHidden: true,
    },
  )
  syncPollingRef = polling.syncPolling

  watch(examId, (next, prev) => {
    if (next === prev) {
      return
    }
    quietFailureCount = 0
    pollIntervalMs.value = SNAPSHOT_POLL_BASE_MS
    void refreshSnapshot()
  }, { immediate: true })

  onBeforeUnmount(() => {
    polling.pause()
  })

  return {
    snapshot,
    loading,
    error,
    refreshing,
    orderedStages,
    suggestedStageKey,
    prepAdvisoryReasons,
    prepBlockingReasons,
    selectedExamLabel,
    refreshSnapshot,
    syncSnapshotPolling: polling.syncPolling,
  }
}
