import type { AiAnalysisStatusCode } from './ai-analysis-status'
import type { AnalysisScopeTypeCode } from './analysis-scope-type'

import type { ExamClassRefVO } from '@/apis/mark/exam'
/**
 * AI 跨考试纵向分析 API - 对接 edu-mark 模块 CrossExamAnalysisController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/cross-exam-analysis
 * - 写操作与查询均为 POST + 请求体 DTO
 * - 后端 Long ID 统一用 string 表达到前端
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { CourseObjectiveDimensionCode } from '@/types/enums/course-objective-dimension-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'
import { CourseAchievementStatusCode } from '@/types/enums/course-achievement-status-enum'
import { SemesterGrowthTrendCode } from '@/types/enums/semester-growth-trend-enum'

export {
  ALL_COURSE_ACHIEVEMENT_STATUS_CODES,
  CourseAchievementStatusCode,
  CourseAchievementStatusDescription,
} from '@/types/enums/course-achievement-status-enum'

export {
  ALL_COURSE_OBJECTIVE_DIMENSION_CODES,
  CourseObjectiveDimensionCode,
  CourseObjectiveDimensionDescription,
} from '@/types/enums/course-objective-dimension-enum'

export {
  ALL_SEMESTER_GROWTH_TREND_CODES,
  SemesterGrowthTrendCode,
  SemesterGrowthTrendDescription,
} from '@/types/enums/semester-growth-trend-enum'

/** 学期成长趋势颜色，保持成长曲线页趋势状态一致。 */
export const SEMESTER_GROWTH_TREND_TONE: Record<SemesterGrowthTrendCode, BadgeTone> = {
  [SemesterGrowthTrendCode.IMPROVING]: 'green',
  [SemesterGrowthTrendCode.STABLE]: 'blue',
  [SemesterGrowthTrendCode.DECLINING]: 'red',
}

/** 课程目标达成状态颜色，保持达成结论在分析页中的语义一致。 */
export const COURSE_ACHIEVEMENT_STATUS_TONE: Record<CourseAchievementStatusCode, BadgeTone> = {
  [CourseAchievementStatusCode.ACHIEVED]: 'green',
  [CourseAchievementStatusCode.PARTIALLY]: 'orange',
  [CourseAchievementStatusCode.NOT_ACHIEVED]: 'red',
}

/** 考试维度统计快照 - 对应 ExamStatSnapshot */
export interface ExamStatSnapshotResponse {
  examId?: string
  examName?: string
  examTime?: string
  participantCount?: number
  avgScore?: number
  totalFullScore?: number
  scoreRate?: number
  stdDev?: number
  maxScore?: number
  minScore?: number
  passRate?: number
  paperDifficultyIndex?: number
  paperDiscriminationIndex?: number
  cronbachAlpha?: number
}

/** 跨考试趋势条目 */
export interface CrossExamTrendItemResponse {
  dimension?: string
  description?: string
  direction?: string
  changeRate?: number
  turningPoint?: string
  possibleCause?: string
  suggestion?: string
}

/** 学期成长条目 */
export interface SemesterGrowthItemResponse {
  dimension?: string
  dimensionLabel?: string
  description?: string
  startValue?: number
  endValue?: number
  changeRate?: number
  improvementNote?: string
  riskNote?: string
}

/** 课程目标达成条目 */
export interface CourseAchievementItemResponse {
  objectiveDimension?: CourseObjectiveDimensionCode
  objectiveDescription?: string
  achievementRate?: number
  status?: CourseAchievementStatusCode
  evidenceNote?: string
  suggestion?: string
}

/** AI 分析使用的考试范围项 */
export interface AnalysisExamScopeResponse {
  examId: string
  examName: string
  examTime?: string
  displayOrder?: number
}

/** 跨考试趋势分析记录 - 对应 CrossExamTrendAnalysis */
export interface CrossExamTrendAnalysisResponse {
  id: string
  courseId: string
  courseName: string
  classId?: string
  className?: string
  scopeType: AnalysisScopeTypeCode
  exams: AnalysisExamScopeResponse[]
  examCount: number
  aiTraceId?: string
  trendSummary?: string
  trendItems?: CrossExamTrendItemResponse[]
  examStatSnapshots?: ExamStatSnapshotResponse[]
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime: string
}

/** 学期能力成长曲线记录 - 对应 SemesterAbilityGrowth */
export interface SemesterAbilityGrowthResponse {
  id: string
  academicYear: string
  semester: SemesterCode
  courseId: string
  courseName: string
  scopeType: AnalysisScopeTypeCode
  scopeId: string
  scopeName: string
  exams: AnalysisExamScopeResponse[]
  examCount: number
  aiTraceId?: string
  growthSummary?: string
  growthItems?: SemesterGrowthItemResponse[]
  examStatSnapshots?: ExamStatSnapshotResponse[]
  growthTrend: SemesterGrowthTrendCode
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime: string
}

/** 课程目标达成度记录 - 对应 CourseObjectiveAchievement */
export interface CourseObjectiveAchievementResponse {
  id: string
  courseId: string
  courseName: string
  academicYear?: string
  semester?: SemesterCode
  exams: AnalysisExamScopeResponse[]
  examCount: number
  aiTraceId?: string
  achievementSummary?: string
  achievementItems?: CourseAchievementItemResponse[]
  examStatSnapshots?: ExamStatSnapshotResponse[]
  overallAchievementRate?: number
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime: string
}

export function generateCourseTrend(params: {
  courseId: string
  academicYear: string
  semester: SemesterCode
  examIds: string[]
}): Promise<CrossExamTrendAnalysisResponse> {
  return http.post<CrossExamTrendAnalysisResponse>('/api/exam/cross-exam-analysis/trend/course', params)
}

/**
 * 生成班级维度的跨考试趋势分析
 * POST /api/exam/cross-exam-analysis/trend/class
 */
export function generateClassTrend(params: {
  courseId: string
  classId: string
  academicYear: string
  semester: SemesterCode
  examIds: string[]
}): Promise<CrossExamTrendAnalysisResponse> {
  return http.post<CrossExamTrendAnalysisResponse>('/api/exam/cross-exam-analysis/trend/class', params)
}

/**
 * 查询多场考试在 t_exam_class_scope 中的共有班级
 * POST /api/exam/cross-exam-analysis/common-class-scopes
 */
export function listCommonClassScopes(examIds: string[]): Promise<ExamClassRefVO[]> {
  return http.post<ExamClassRefVO[]>('/api/exam/cross-exam-analysis/common-class-scopes', {
    examIds,
  })
}

/**
 * 查询趋势分析历史列表
 * POST /api/exam/cross-exam-analysis/trend/list
 */
export function listTrends(params: {
  scopeType: AnalysisScopeTypeCode
  courseId: string
  classId?: string
}): Promise<CrossExamTrendAnalysisResponse[]> {
  return http.post<CrossExamTrendAnalysisResponse[]>('/api/exam/cross-exam-analysis/trend/list', params)
}

/**
 * 生成班级学期能力成长曲线
 * POST /api/exam/cross-exam-analysis/growth/class
 */
export function generateClassGrowth(params: {
  teachingAcademicYear: string
  teachingSemester: SemesterCode
  courseId: string
  classId: string
  examIds?: string[]
  autoSelectExams?: boolean
}): Promise<SemesterAbilityGrowthResponse> {
  return http.post<SemesterAbilityGrowthResponse>('/api/exam/cross-exam-analysis/growth/class', params)
}

/**
 * 查询能力成长曲线历史列表
 * POST /api/exam/cross-exam-analysis/growth/list
 */
export function listGrowth(params: {
  teachingAcademicYear: string
  teachingSemester: SemesterCode
  scopeType: AnalysisScopeTypeCode
  scopeId?: string
}): Promise<SemesterAbilityGrowthResponse[]> {
  return http.post<SemesterAbilityGrowthResponse[]>('/api/exam/cross-exam-analysis/growth/list', params)
}

/**
 * 生成课程目标达成度分析
 * POST /api/exam/cross-exam-analysis/achievement/generate
 */
export function generateAchievement(params: {
  courseId: string
  academicYear?: string
  semester?: SemesterCode
  examIds: string[]
}): Promise<CourseObjectiveAchievementResponse> {
  return http.post<CourseObjectiveAchievementResponse>(
    '/api/exam/cross-exam-analysis/achievement/generate',
    params,
  )
}

/**
 * 查询课程目标达成度历史列表
 * POST /api/exam/cross-exam-analysis/achievement/list
 */
export function listAchievements(params: {
  courseId: string
  academicYear?: string
  semester?: SemesterCode
}): Promise<CourseObjectiveAchievementResponse[]> {
  return http.post<CourseObjectiveAchievementResponse[]>(
    '/api/exam/cross-exam-analysis/achievement/list',
    params,
  )
}
