import type { ExamLayoutGenerateQuestionRequest } from '@/apis/mark/exam-layout-design'
import { createClientUuid } from '@/utils/client-uuid'

export type LayoutQuestionType = 'OBJECTIVE' | 'SUBJECTIVE'

export interface LayoutQuestionDraft {
  id: string
  questionNo: string
  ocrScene: string
  questionType: LayoutQuestionType
  fullScore: number
  optionCount?: number
}

const OBJECTIVE_SCENES = new Set(['CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'NUMERIC'])

export function deriveQuestionType(ocrScene: string): LayoutQuestionType {
  return OBJECTIVE_SCENES.has(ocrScene) ? 'OBJECTIVE' : 'SUBJECTIVE'
}

export function defaultFullScore(ocrScene: string): number {
  if (ocrScene === 'TRUE_FALSE') {
    return 1
  }
  if (ocrScene === 'CHOICE' || ocrScene === 'FILL_BLANK' || ocrScene === 'NUMERIC') {
    return 2
  }
  if (
    ocrScene === 'CALCULATION'
    || ocrScene === 'PROOF'
    || ocrScene === 'PROGRAMMING'
    || ocrScene === 'DRAWING'
  ) {
    return 10
  }
  return 8
}

export function defaultOptionCount(ocrScene: string): number | undefined {
  if (ocrScene === 'TRUE_FALSE') {
    return 2
  }
  if (ocrScene === 'CHOICE') {
    return 4
  }
  return undefined
}

export function createQuestionDraft(ocrScene: string, sortNo: number): LayoutQuestionDraft {
  return {
    id: createClientUuid(),
    questionNo: String(sortNo),
    ocrScene,
    questionType: deriveQuestionType(ocrScene),
    fullScore: defaultFullScore(ocrScene),
    optionCount: defaultOptionCount(ocrScene),
  }
}

/** 答题卡默认题结构：20 选择 + 5 主观。 */
export function createAnswerSheetDefaultQuestionRows(): LayoutQuestionDraft[] {
  const rows: LayoutQuestionDraft[] = []
  for (let index = 0; index < 20; index += 1) {
    rows.push(createQuestionDraft('CHOICE', rows.length + 1))
  }
  for (let index = 0; index < 5; index += 1) {
    rows.push(createQuestionDraft('SHORT_ANSWER', rows.length + 1))
  }
  return rows
}

export function buildGenerateQuestionsFromDrafts(
  rows: LayoutQuestionDraft[],
): ExamLayoutGenerateQuestionRequest[] {
  return rows.map((row, index) => {
    const question: ExamLayoutGenerateQuestionRequest = {
      questionNo: row.questionNo.trim(),
      questionType: row.questionType,
      ocrScene: row.ocrScene,
      fullScore: row.fullScore,
      sortNo: index + 1,
    }
    if (row.ocrScene === 'CHOICE' || row.ocrScene === 'TRUE_FALSE') {
      question.optionCount = row.ocrScene === 'TRUE_FALSE' ? 2 : row.optionCount
    }
    return question
  })
}
