import type { ExamDetailResponse, ExamSummaryResponse } from '@/apis/mark/exam'
import { formatSemester } from '@/types/enums/semester-enum'

export interface MarkExamSelectOption {
  value: string
  label: string
}

export function formatMarkExamOptionLabel(
  exam: Pick<ExamSummaryResponse, 'examName' | 'examNo'>,
): string {
  if (!exam.examNo) return exam.examName
  return `${exam.examName} (${exam.examNo})`
}

export function formatMarkExamAcademicTerm(
  exam: Pick<ExamSummaryResponse, 'academicYear' | 'semester'>,
): string {
  return [exam.academicYear, formatSemester(exam.semester)].filter(Boolean).join(' · ')
}

export function toMarkExamSelectOption(exam: ExamSummaryResponse): MarkExamSelectOption {
  return {
    value: exam.examId,
    label: [formatMarkExamOptionLabel(exam), formatMarkExamAcademicTerm(exam)]
      .filter(Boolean)
      .join(' · '),
  }
}

/** 详情转列表项，供 URL 预选考试补全下拉标签 */
export function examSummaryFromDetail(detail: ExamDetailResponse): ExamSummaryResponse {
  return {
    examId: detail.examId,
    courseId: detail.courseId,
    examName: detail.examName,
    examNo: detail.examNo,
    academicYear: detail.academicYear,
    semester: detail.semester,
    status: detail.status,
    statusMessage: detail.statusMessage,
    examStartTime: detail.examStartTime,
    examEndTime: detail.examEndTime,
    gradingStrategy: detail.gradingStrategy,
    examKind: detail.examKind,
    remark: detail.remark,
    createUser: detail.createUser,
    createTime: detail.createTime,
    dailyScoreFull: detail.dailyScoreFull,
    examKindMessage: detail.examKindMessage,
    sourceExamId: detail.sourceExamId,
    scorePolicy: detail.scorePolicy,
    teachingAcademicYear: detail.teachingAcademicYear,
    teachingSemester: detail.teachingSemester,
  }
}
