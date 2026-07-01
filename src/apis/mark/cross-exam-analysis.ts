import type { AiAnalysisStatusCode } from './ai-analysis-status'
import type { AnalysisScopeTypeCode } from './analysis-scope-type'

/**
 * AI 跨考试纵向分析 API - 对接 edu-mark 模块 CrossExamAnalysisController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/cross-exam-analysis
 * - 写操作（生成）为 POST + @RequestParam（List 用重复 key），查询为 GET
 * - 后端 Long ID 统一用 string 表达到前端
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

/** 考试维度统计快照 - 对应 ExamStatSnapshot */
export interface ExamStatSnapshotVO {
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
}

/** 课程目标维度文案 - 与后端 CourseObjectiveDimension 完整一致 */
export const COURSE_OBJECTIVE_DIMENSION_LABEL: Record<CourseObjectiveDimensionCode, string> = {
  OVERALL_SCORE_RATE: '总体得分率',
  PASS_RATE: '及格率',
  SCORE_STABILITY: '成绩稳定性',
}

/** 跨考试趋势条目 */
export interface CrossExamTrendItemVO {
  dimension?: string
  description?: string
  direction?: string
  changeRate?: number
  turningPoint?: string
  possibleCause?: string
  suggestion?: string
}

/** 学期成长趋势 - 与后端 AbilityGrowthAiResponse.growthTrend 完整一致 */
export type SemesterGrowthTrendCode = 'IMPROVING' | 'STABLE' | 'DECLINING'

/** 学期成长趋势文案，未知趋势必须暴露合同错误。 */
export const SEMESTER_GROWTH_TREND_LABEL: Record<SemesterGrowthTrendCode, string> = {
  IMPROVING: '上升',
  STABLE: '稳定',
  DECLINING: '下降',
}

/** 学期成长趋势颜色，保持成长曲线页趋势状态一致。 */
export const SEMESTER_GROWTH_TREND_TONE: Record<SemesterGrowthTrendCode, BadgeTone> = {
  IMPROVING: 'green',
  STABLE: 'blue',
  DECLINING: 'red',
}

/** 学期成长条目 */
export interface SemesterGrowthItemVO {
  dimension?: string
  dimensionLabel?: string
  description?: string
  startValue?: number
  endValue?: number
  changeRate?: number
  improvementNote?: string
  riskNote?: string
}

/** 课程目标维度 - 与后端 CourseObjectiveDimension 完整一致 */
export type CourseObjectiveDimensionCode = 'OVERALL_SCORE_RATE' | 'PASS_RATE' | 'SCORE_STABILITY'

/** 课程目标达成条目 */
export type CourseAchievementStatusCode = 'ACHIEVED' | 'PARTIALLY' | 'NOT_ACHIEVED'

/** 课程目标达成状态文案，前端展示达成结论时禁止暴露后端状态编码。 */
export const COURSE_ACHIEVEMENT_STATUS_LABEL: Record<CourseAchievementStatusCode, string> = {
  ACHIEVED: '已达成',
  PARTIALLY: '部分达成',
  NOT_ACHIEVED: '未达成',
}

/** 课程目标达成状态颜色，保持达成结论在分析页中的语义一致。 */
export const COURSE_ACHIEVEMENT_STATUS_TONE: Record<CourseAchievementStatusCode, BadgeTone> = {
  ACHIEVED: 'green',
  PARTIALLY: 'orange',
  NOT_ACHIEVED: 'red',
}

/** 课程目标达成条目 */
export interface CourseAchievementItemVO {
  objectiveDimension?: CourseObjectiveDimensionCode
  objectiveDescription?: string
  achievementRate?: number
  status?: CourseAchievementStatusCode
  evidenceNote?: string
  suggestion?: string
}

/** AI 分析使用的考试范围项 */
export interface AnalysisExamScopeVO {
  examId: string
  examName: string
  examTime?: string
  displayOrder?: number
}

/** 跨考试趋势分析记录 - 对应 CrossExamTrendAnalysis */
export interface CrossExamTrendAnalysisVO {
  id: string
  courseId: string
  courseName: string
  classId?: string
  className?: string
  scopeType: 'COURSE' | 'CLASS'
  exams: AnalysisExamScopeVO[]
  examCount: number
  aiTraceId?: string
  trendSummary?: string
  trendItems?: CrossExamTrendItemVO[]
  examStatSnapshots?: ExamStatSnapshotVO[]
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime: string
}

/** 学期能力成长曲线记录 - 对应 SemesterAbilityGrowth */
export interface SemesterAbilityGrowthVO {
  id: string
  semesterCode: string
  courseId: string
  courseName: string
  scopeType: AnalysisScopeTypeCode
  scopeId: string
  scopeName: string
  exams: AnalysisExamScopeVO[]
  examCount: number
  aiTraceId?: string
  growthSummary?: string
  growthItems?: SemesterGrowthItemVO[]
  examStatSnapshots?: ExamStatSnapshotVO[]
  growthTrend?: SemesterGrowthTrendCode
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime: string
}

/** 课程目标达成度记录 - 对应 CourseObjectiveAchievement */
export interface CourseObjectiveAchievementVO {
  id: string
  courseId: string
  courseName: string
  semesterCode?: string
  exams: AnalysisExamScopeVO[]
  examCount: number
  aiTraceId?: string
  achievementSummary?: string
  achievementItems?: CourseAchievementItemVO[]
  examStatSnapshots?: ExamStatSnapshotVO[]
  overallAchievementRate?: number
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime: string
}

export function generateCourseTrend(params: {
  courseId: string
  examIds: string[]
}): Promise<CrossExamTrendAnalysisVO> {
  return http.post<CrossExamTrendAnalysisVO>('/api/exam/cross-exam-analysis/trend/course', params)
}

/**
 * 生成班级维度的跨考试趋势分析
 * POST /api/exam/cross-exam-analysis/trend/class
 */
export function generateClassTrend(params: {
  courseId: string
  classId: string
  examIds: string[]
}): Promise<CrossExamTrendAnalysisVO> {
  return http.post<CrossExamTrendAnalysisVO>('/api/exam/cross-exam-analysis/trend/class', params)
}

/**
 * 查询趋势分析历史列表
 * GET /api/exam/cross-exam-analysis/trend/list
 */
export function listTrends(params: {
  scopeType: 'COURSE' | 'CLASS'
  courseId?: string
}): Promise<CrossExamTrendAnalysisVO[]> {
  return http.post<CrossExamTrendAnalysisVO[]>('/api/exam/cross-exam-analysis/trend/list', params)
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
}): Promise<SemesterAbilityGrowthVO> {
  return http.post<SemesterAbilityGrowthVO>('/api/exam/cross-exam-analysis/growth/class', params)
}

/**
 * 查询能力成长曲线历史列表
 * GET /api/exam/cross-exam-analysis/growth/list
 */
export function listGrowth(params: {
  teachingAcademicYear: string
  teachingSemester: SemesterCode
  scopeType: AnalysisScopeTypeCode
  scopeId?: string
}): Promise<SemesterAbilityGrowthVO[]> {
  return http.post<SemesterAbilityGrowthVO[]>('/api/exam/cross-exam-analysis/growth/list', params)
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
}): Promise<CourseObjectiveAchievementVO> {
  return http.post<CourseObjectiveAchievementVO>(
    '/api/exam/cross-exam-analysis/achievement/generate',
    params,
  )
}

/**
 * 查询课程目标达成度历史列表
 * GET /api/exam/cross-exam-analysis/achievement/list
 */
export function listAchievements(params: {
  courseId: string
}): Promise<CourseObjectiveAchievementVO[]> {
  return http.post<CourseObjectiveAchievementVO[]>(
    '/api/exam/cross-exam-analysis/achievement/list',
    params,
  )
}
