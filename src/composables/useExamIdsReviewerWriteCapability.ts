import type { ComputedRef, Ref } from 'vue'
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import { computed } from 'vue'

/**
 * MVR-286：多考试 AI 生成写闸。
 * 仅当所选考试均带 canManageReviewerWrites===true（来自 listExamPage）时开放生成。
 * 缺字段或未加载到摘要时默认拒绝假可写。
 */
export function useExamSummariesReviewerWriteCapability(
  examIds: Ref<string[]> | ComputedRef<string[]>,
  examSummaries: Ref<ExamSummaryResponse[]> | ComputedRef<ExamSummaryResponse[]>,
) {
  const canManageReviewerWrites = computed(() => {
    const ids = examIds.value ?? []
    if (ids.length === 0) {
      return false
    }
    const summaries = examSummaries.value ?? []
    return ids.every((examId) => {
      const matched = summaries.find((item) => item.examId === examId)
      return matched?.canManageReviewerWrites === true
    })
  })

  return { canManageReviewerWrites }
}
