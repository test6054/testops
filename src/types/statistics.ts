import type { SemesterCode } from '@/types/enums/semester-enum'

/**
 * 统计数据类型定义
 *
 * @author 庆之
 * @version 2.3
 */

/**
 * 学生工作台VO - 精简版，只包含前端实际使用的字段
 * @version 7.0 精简字段，移除前端未使用的冗余统计数据
 */
export interface StudentWorkspaceVO {
  // 用户基础信息
  studentName: string
  avatarUrl?: string
  classInfo?: StudentClassInfo
  semester?: SemesterCode

  // 任务统计（前端卡片使用）
  totalTasks?: number
  completedTasks?: number
  inProgressTasks?: number
  completionRate?: number

  // 成绩统计（前端卡片使用）
  averageScore?: number
  classRank?: number
  classTotalCount?: number
}

/**
 * 学生班级信息（StudentWorkspaceVO 内嵌使用）
 */
export interface StudentClassInfo {
  classId: string
  className: string
}


/**
 * 学生学习进度趋势VO（时间维度）
 * V2.0重构：展示所有非完成状态任务的时间维度趋势
 * 与后端StudentProgressTrendVO完全对齐
 * @author 庆之
 * @version 2.0
 */
export interface StudentProgressTrendVO {
  /** 任务趋势列表（每个任务包含时间维度的趋势数据） */
  taskTrends: TaskTrend[]
  /** 统计摘要 */
  summary: StudentProgressSummary
}

/**
 * 单个任务的趋势数据
 * 对应后端StudentProgressTrendVO.TaskTrend
 */
export interface TaskTrend {
  /** 学生任务ID */
  studentTaskId: string
  /** 实践ID */
  practiceId: string
  /** 任务名称（实践标题） */
  taskName: string
  /** 课程设计名称 */
  courseDesignName?: string
  /** 任务状态 */
  taskStatus?: string
  /** 截止日期 */
  endDate?: string
  /** 当前我的完成度 */
  currentMyRate: number
  /** 当前班级平均完成度 */
  currentClassRate: number
  /** 趋势数据点列表（按日期升序） */
  trendPoints: TrendPoint[]
}

/**
 * 趋势数据点（时间维度）
 * 对应后端StudentProgressTrendVO.TrendPoint
 */
export interface TrendPoint {
  /** 日期（yyyy-MM-dd格式） */
  date: string
  /** 日期标签（MM-dd格式，用于图表显示） */
  dateLabel: string
  /** 我的完成度 (0-100) */
  myRate: number
  /** 班级平均完成度 (0-100) */
  classRate: number
}

/**
 * 统计摘要
 * 对应后端StudentProgressTrendVO.Summary
 * 当无活跃任务时，currentCompletionRate、classAverageRate、trend 可能为 null
 */
export interface StudentProgressSummary {
  /** 当前总体完成率，无活跃任务时为 null */
  currentCompletionRate: number | null
  /** 班级平均完成率，无活跃任务时为 null */
  classAverageRate: number | null
  /** 班级排名，格式: "3/45"，无数据时为 null */
  classRank: string | null
  /** 进度变化趋势 (IMPROVING/STABLE/DECLINING)，无活跃任务时为 null */
  trend: string | null
  /** 进行中任务数 */
  inProgressCount?: number
}
