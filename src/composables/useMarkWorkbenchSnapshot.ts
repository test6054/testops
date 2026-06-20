import { getWorkbenchStageSnapshot } from '@/apis/mark/exam'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { showUserError } from '@/utils/error-handler'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'

/**
 * 考试工作台 layout 级快照拉取：写入 markStageStore，供 StageRail 与横幅使用。
 */
export function useMarkWorkbenchSnapshot(examId: () => string) {
  const markStageStore = useMarkStageStore()
  const { snapshot, loading, error, orderedStages, suggestedStageKey, prepAdvisoryReasons, selectedExamLabel }
    = storeToRefs(markStageStore)
  const refreshing = ref(false)

  async function refreshSnapshot(): Promise<void> {
    const id = examId()
    if (!id) {
      markStageStore.reset()
      return
    }
    markStageStore.observeExam(id)
    markStageStore.setLoading(true)
    refreshing.value = true
    try {
      const response = await getWorkbenchStageSnapshot(id)
      markStageStore.applySnapshot(response)
    }
    catch (err) {
      markStageStore.reset()
      markStageStore.observeExam(id)
      markStageStore.setError('工作台阶段快照加载失败')
      showUserError(err, '工作台阶段快照加载失败')
      throw err
    }
    finally {
      markStageStore.setLoading(false)
      refreshing.value = false
    }
  }

  watch(examId, (next, prev) => {
    if (next === prev) {
      return
    }
    void refreshSnapshot()
  }, { immediate: true })

  return {
    snapshot,
    loading,
    error,
    refreshing,
    orderedStages,
    suggestedStageKey,
    prepAdvisoryReasons,
    selectedExamLabel,
    refreshSnapshot,
  }
}
