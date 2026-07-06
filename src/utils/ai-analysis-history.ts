import type { AiAnalysisStatusCode } from '@/apis/mark/ai-analysis-status'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { aiAnalysisStatusLabel } from '@/apis/mark/ai-analysis-status'
import { formatAcademicYearSemester } from '@/types/enums/semester-enum'
import { formatDateTime } from '@/utils/format'

/** AI 分析历史下拉行展示所需字段 */
export interface AiAnalysisHistoryRow {
  id: string
  createTime?: string
  analysisStatus: AiAnalysisStatusCode
  examCount?: number
  academicYear?: string
  semester?: SemesterCode
  /** 追加说明，如趋势维度、班级名 */
  extraHint?: string
}

/** 格式化历史记录下拉选项文案 */
export function formatAiAnalysisHistoryLabel(row: AiAnalysisHistoryRow): string {
  const parts: string[] = []
  const timeText = formatDateTime(row.createTime)
  if (timeText) {
    parts.push(timeText)
  }
  parts.push(aiAnalysisStatusLabel(row.analysisStatus))
  const termText = formatAcademicYearSemester(row.academicYear, row.semester)
  if (termText) {
    parts.push(termText)
  }
  if (row.examCount != null) {
    parts.push(`${row.examCount}场考试`)
  }
  if (row.extraHint?.trim()) {
    parts.push(row.extraHint.trim())
  }
  return parts.join(' · ')
}
