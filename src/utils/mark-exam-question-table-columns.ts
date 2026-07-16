import type { ColumnType } from 'ant-design-vue/es/table'
import type { QuestionTypeCode } from '@/types/enums/question-type-enum'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import { buildNumericColumn } from '@/components/ui-guide/ui/data-table'
import { strictEnumLabel } from '@/utils/strict-enum'

/** AI 分析中心制卷题目表格统一身份字段 */
export interface ExamQuestionIdentityRow {
  questionNo: string
  questionType?: QuestionTypeCode
  questionStem?: string
  fullScore?: number
}

export const EXAM_QUESTION_IDENTITY_COLUMN_KEYS = {
  questionNo: 'questionNo',
  questionType: 'questionType',
  questionStem: 'questionStem',
  fullScore: 'fullScore',
} as const

/**
 * 制卷题目身份四列：题号 / 题型 / 题干 / 满分。
 * 题目质量分析、课程目标映射等 AI 分析中心表格共用，对齐高校阅卷与 OBE 竞品列模型。
 */
export function buildExamQuestionIdentityColumns<
  T extends ExamQuestionIdentityRow = ExamQuestionIdentityRow,
>(): ColumnType<T>[] {
  return [
    {
      title: '题号',
      dataIndex: 'questionNo',
      key: EXAM_QUESTION_IDENTITY_COLUMN_KEYS.questionNo,
      width: 72,
      fixed: 'left',
    },
    {
      title: '题型',
      key: EXAM_QUESTION_IDENTITY_COLUMN_KEYS.questionType,
      width: 88,
    },
    {
      title: '题干',
      key: EXAM_QUESTION_IDENTITY_COLUMN_KEYS.questionStem,
      width: 200,
      minWidth: 160,
    },
    buildNumericColumn({
      title: '满分',
      dataIndex: 'fullScore',
      key: EXAM_QUESTION_IDENTITY_COLUMN_KEYS.fullScore,
      width: 72,
    }),
  ]
}

export function questionTypeLabel(code?: QuestionTypeCode): string {
  if (!code) {
    return '—'
  }
  return strictEnumLabel(QuestionTypeDescription, code, '题型')
}

export function formatQuestionStemPreview(stem?: string, maxLength = 36): string {
  if (!stem?.trim()) {
    return ''
  }
  const text = stem.trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

export function resolveExamQuestionFullScore(row: {
  fullScore?: number
  questionFullScore?: number
}): number | undefined {
  if (row.fullScore != null) {
    return row.fullScore
  }
  return row.questionFullScore
}

export function fmtExamQuestionScore(value?: number): string {
  if (value == null) {
    return '—'
  }
  return Number(value).toFixed(2)
}
