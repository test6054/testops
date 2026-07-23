import type { ExamLayoutGenerateQuestionRequest } from '@/apis/mark/exam-layout-design'
import { MarkOcrSceneCode } from '@/types/enums/mark-ocr-scene-enum'
import { createClientSnowflakeId } from '@/utils/client-snowflake'

export type LayoutQuestionType = 'OBJECTIVE' | 'SUBJECTIVE'

export interface LayoutQuestionDraft {
  id: string
  questionNo: string
  ocrScene: MarkOcrSceneCode
  questionType: LayoutQuestionType
  fullScore: number
  optionCount?: number
}

const OBJECTIVE_SCENES = new Set<MarkOcrSceneCode>([
  MarkOcrSceneCode.CHOICE,
  MarkOcrSceneCode.TRUE_FALSE,
  MarkOcrSceneCode.FILL_BLANK,
  MarkOcrSceneCode.NUMERIC,
])

export function deriveQuestionType(ocrScene: MarkOcrSceneCode): LayoutQuestionType {
  return OBJECTIVE_SCENES.has(ocrScene) ? 'OBJECTIVE' : 'SUBJECTIVE'
}

export function defaultFullScore(ocrScene: MarkOcrSceneCode): number {
  if (ocrScene === MarkOcrSceneCode.TRUE_FALSE) {
    return 1
  }
  if (
    ocrScene === MarkOcrSceneCode.CHOICE
    || ocrScene === MarkOcrSceneCode.FILL_BLANK
    || ocrScene === MarkOcrSceneCode.NUMERIC
  ) {
    return 2
  }
  if (
    ocrScene === MarkOcrSceneCode.CALCULATION
    || ocrScene === MarkOcrSceneCode.PROOF
    || ocrScene === MarkOcrSceneCode.PROGRAMMING
    || ocrScene === MarkOcrSceneCode.DRAWING
    || ocrScene === MarkOcrSceneCode.APPLICATION
    || ocrScene === MarkOcrSceneCode.MATERIAL_ANALYSIS
    || ocrScene === MarkOcrSceneCode.TRANSLATION
    || ocrScene === MarkOcrSceneCode.COMPOSITION
  ) {
    return 10
  }
  return 8
}

export function defaultOptionCount(ocrScene: MarkOcrSceneCode): number | undefined {
  if (ocrScene === MarkOcrSceneCode.TRUE_FALSE) {
    return 2
  }
  if (ocrScene === MarkOcrSceneCode.CHOICE) {
    return 4
  }
  return undefined
}

export function createQuestionDraft(ocrScene: MarkOcrSceneCode, sortNo: number): LayoutQuestionDraft {
  return {
    id: createClientSnowflakeId(),
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
    rows.push(createQuestionDraft(MarkOcrSceneCode.CHOICE, rows.length + 1))
  }
  for (let index = 0; index < 5; index += 1) {
    rows.push(createQuestionDraft(MarkOcrSceneCode.SHORT_ANSWER, rows.length + 1))
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
    if (row.ocrScene === MarkOcrSceneCode.CHOICE || row.ocrScene === MarkOcrSceneCode.TRUE_FALSE) {
      question.optionCount = row.ocrScene === MarkOcrSceneCode.TRUE_FALSE ? 2 : row.optionCount
    }
    return question
  })
}
