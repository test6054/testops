import type { Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { getExamDetail, getMarkingProgress } from '@/apis/mark/exam'
import { applyMarkStageFromExamProgress } from '@/composables/useMarkStageSync'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { showUserError } from '@/utils/error-handler'

/**
 * 按当前考试拉取详情 + 阅卷进度，写入 markStageStore 供 StageRail 展示。
 */
export function useMarkExamStageRail(selectedExamId: Ref<string | undefined>) {
  const markStageStore = useMarkStageStore()
  const { orderedStages } = storeToRefs(markStageStore)
  const loading = ref(false)

  async function refreshStageRail(): Promise<void> {
    const examId = selectedExamId.value
    if (!examId) {
      return
    }
    loading.value = true
    try {
      const [detail, progress] = await Promise.all([
        getExamDetail(examId),
        getMarkingProgress(examId),
      ])
      applyMarkStageFromExamProgress(examId, [], [], progress, detail)
    } catch (error) {
      showUserError(error, '考试阶段进度加载失败')
    } finally {
      loading.value = false
    }
  }

  watch(
    selectedExamId,
    (examId) => {
      if (examId) {
        markStageStore.observeExam(examId)
        void refreshStageRail()
      }
    },
    { immediate: true },
  )

  return {
    orderedStages,
    loading,
    refreshStageRail,
  }
}
