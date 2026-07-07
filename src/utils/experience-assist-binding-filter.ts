import type { ExamQuestionExperienceAssistBindingResponse } from '@/apis/mark/grading-experience-assist'
import type { GradingExperienceAssistQuestionResolutionCode } from '@/types/enums/grading-experience-assist-question-resolution-enum'

export interface ExperienceAssistBindingFilterQuery {
  keyword?: string
  assistResolutionStatus?: GradingExperienceAssistQuestionResolutionCode
}

/** 题目定标绑定列表筛选：题号 / 来源考试 / 经验摘要关键词 + 定标状态。 */
export function filterExperienceAssistBindings(
  rows: ExamQuestionExperienceAssistBindingResponse[],
  query: ExperienceAssistBindingFilterQuery,
): ExamQuestionExperienceAssistBindingResponse[] {
  const keyword = query.keyword?.trim().toLowerCase()
  const status = query.assistResolutionStatus
  if (!keyword && !status) {
    return rows
  }
  return rows.filter((row) => {
    if (status && row.assistResolutionStatus !== status) {
      return false
    }
    if (!keyword) {
      return true
    }
    const haystacks = [row.questionNo, row.sourceExamName, row.experienceSummary]
    return haystacks.some((value) => value?.toLowerCase().includes(keyword))
  })
}
