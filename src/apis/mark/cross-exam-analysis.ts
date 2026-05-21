import type {AiAnalysisStatusCode} from './teaching-analysis'

/**
 * AI 跨考试纵向分析 API - 对接 edu-mark 模块 CrossExamAnalysisController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/cross-exam-analysis
 * - 写操作（生成）为 POST + @RequestParam（List 用重复 key），查询为 GET
 * - 后端 Long ID 统一用 string 表达到前端
 */
import http from '@/config/axios'

/** 跨考试趋势分析记录 - 对应 CrossExamTrendAnalysis */
export interface CrossExamTrendAnalysisVO {
  id: string
  tenantId?: string
  courseId?: string
  classId?: string
  scopeType?: 'COURSE' | 'CLASS'
  examIds?: string
  examCount?: number
  aiTraceId?: string
  aiModelProfileId?: string
  evidenceSnapshot?: string
  aiRawResponse?: string
  trendSummary?: string
  trendItems?: string
  analysisStatus?: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
  updateTime?: string
}

/** 学期能力成长曲线记录 - 对应 SemesterAbilityGrowth */
export interface SemesterAbilityGrowthVO {
  id: string
  tenantId?: string
  semesterCode?: string
  courseId?: string
  scopeType?: 'CLASS' | 'COURSE' | 'STUDENT'
  scopeId?: string
  examIds?: string
  examCount?: number
  aiTraceId?: string
  aiModelProfileId?: string
  evidenceSnapshot?: string
  aiRawResponse?: string
  growthSummary?: string
  growthItems?: string
  growthTrend?: string
  analysisStatus?: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
  updateTime?: string
}

/** 课程目标达成度记录 - 对应 CourseObjectiveAchievement */
export interface CourseObjectiveAchievementVO {
  id: string
  tenantId?: string
  courseId?: string
  semesterCode?: string
  examIds?: string
  examCount?: number
  aiTraceId?: string
  aiModelProfileId?: string
  evidenceSnapshot?: string
  aiRawResponse?: string
  achievementSummary?: string
  achievementItems?: string
  overallAchievementRate?: number
  analysisStatus?: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
  updateTime?: string
}

/**
 * 按后端 List<Long> 参数格式序列化多个 examId
 * Spring 接收 `examIds=1&examIds=2` 形式
 */
function buildExamIdsParam(examIds: string[]): string {
  return examIds.map((id) => `examIds=${encodeURIComponent(id)}`).join('&')
}

/**
 * 生成课程维度的跨考试趋势分析
 * POST /api/exam/cross-exam-analysis/trend/course?courseId=&examIds=&examIds=
 */
export function generateCourseTrend(params: {
  courseId: string
  examIds: string[]
}): Promise<CrossExamTrendAnalysisVO> {
  const search = `courseId=${encodeURIComponent(params.courseId)}&${buildExamIdsParam(params.examIds)}`
  return http.post<CrossExamTrendAnalysisVO>(
    `/api/exam/cross-exam-analysis/trend/course?${search}`,
  )
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
  return http.post<CrossExamTrendAnalysisVO>(
    '/api/exam/cross-exam-analysis/trend/class',
    params,
  )
}

/**
 * 查询趋势分析历史列表
 * GET /api/exam/cross-exam-analysis/trend/list
 */
export function listTrends(params: {
  scopeType: 'COURSE' | 'CLASS'
  courseId?: string
}): Promise<CrossExamTrendAnalysisVO[]> {
  return http.get<CrossExamTrendAnalysisVO[]>(
    '/api/exam/cross-exam-analysis/trend/list',
    { params },
  )
}

/**
 * 生成班级学期能力成长曲线
 * POST /api/exam/cross-exam-analysis/growth/class
 */
export function generateClassGrowth(params: {
  semesterCode: string
  courseId: string
  classId: string
  examIds: string[]
}): Promise<SemesterAbilityGrowthVO> {
  return http.post<SemesterAbilityGrowthVO>(
    '/api/exam/cross-exam-analysis/growth/class',
    params,
  )
}

/**
 * 查询能力成长曲线历史列表
 * GET /api/exam/cross-exam-analysis/growth/list
 */
export function listGrowth(params: {
  semesterCode: string
  scopeType: string
  scopeId?: string
}): Promise<SemesterAbilityGrowthVO[]> {
  return http.get<SemesterAbilityGrowthVO[]>(
    '/api/exam/cross-exam-analysis/growth/list',
    { params },
  )
}

/**
 * 生成课程目标达成度分析
 * POST /api/exam/cross-exam-analysis/achievement/generate
 */
export function generateAchievement(params: {
  courseId: string
  semesterCode?: string
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
  return http.get<CourseObjectiveAchievementVO[]>(
    '/api/exam/cross-exam-analysis/achievement/list',
    { params },
  )
}
