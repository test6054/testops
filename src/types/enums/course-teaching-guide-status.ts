/**
 * 课程教学引导状态枚举 - 与后端 CourseTeachingGuideStatus 完全对应
 */
export enum CourseTeachingGuideStatus {
  /** 未生成 */
  NOT_GENERATED = 'NOT_GENERATED',
  /** 生成中 */
  GENERATING = 'GENERATING',
  /** 已生成 */
  GENERATED = 'GENERATED',
  /** 生成失败 */
  GENERATION_FAILED = 'GENERATION_FAILED'
}
