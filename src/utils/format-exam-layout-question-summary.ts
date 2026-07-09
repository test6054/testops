import type { ExamLayoutQuestionViewResponse } from '@/apis/mark/exam-layout-question'
import { ExamPaperPageKindDescription } from '@/apis/mark/exam-paper-page-kind'
import { ExamQuestionRegionRoleDescription } from '@/apis/mark/exam-question-region-role'
import { MarkOcrSceneDescription } from '@/apis/mark/ocr-scene'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import { strictEnumLabel } from '@/utils/strict-enum'

export const ROI_NOT_CONFIGURED_LABEL = 'ROI 未配置'

export interface ExamLayoutQuestionOption {
  value: string
  label: string
  disabled?: boolean
  title?: string
}

/** 制卷题目摘要下拉/列表展示文案，对标 Gradescope Set Question Type + 页面来源核对。 */
export function formatExamLayoutQuestionSummaryLabel(
  question: ExamLayoutQuestionViewResponse,
): string {
  const segments = [
    `第 ${question.questionNo} 题`,
    strictEnumLabel(MarkOcrSceneDescription, question.ocrScene, 'ocrScene'),
  ]
  if (question.roiReady) {
    if (question.sourcePageKind) {
      segments.push(
        strictEnumLabel(ExamPaperPageKindDescription, question.sourcePageKind, 'sourcePageKind'),
      )
    }
    if (question.regionRole) {
      segments.push(
        strictEnumLabel(ExamQuestionRegionRoleDescription, question.regionRole, 'regionRole'),
      )
    }
  } else {
    segments.push(ROI_NOT_CONFIGURED_LABEL)
  }
  segments.push(strictEnumLabel(QuestionTypeDescription, question.questionType, 'questionType'))
  segments.push(`${question.fullScore} 分`)
  if (question.questionStem) {
    const preview =
      question.questionStem.length > 24
        ? `${question.questionStem.slice(0, 24)}...`
        : question.questionStem
    segments.push(preview)
  }
  return segments.join(' · ')
}

/** 构建制卷题目下拉选项；未 ROI 就绪的题禁用并提示跳转制卷工作台。 */
export function buildExamLayoutQuestionOptions(
  questions: ExamLayoutQuestionViewResponse[],
): ExamLayoutQuestionOption[] {
  return questions.map((question) => ({
    value: question.layoutQuestionId,
    label: formatExamLayoutQuestionSummaryLabel(question),
    disabled: !question.roiReady,
    title: question.roiReady ? undefined : '请先在制卷工作台配置识别区域',
  }))
}
