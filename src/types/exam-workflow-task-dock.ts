/** 工作台悬浮任务条类型：定标 > 待我签审 > 提交复核 > 阶段建议。 */
export type ExamWorkflowTaskDockKind
  = | 'experience-assist'
    | 'approve-publish-review'
    | 'submit-publish-review'
    | 'stage-suggestion'

/** 悬浮任务条展示模型。 */
export interface ExamWorkflowTaskDockView {
  kind: ExamWorkflowTaskDockKind
  title: string
  description: string
  actionLabel: string
  /** 结构化动作跳转路由名；阶段建议可为空 */
  routeName?: string
  badge?: string
  overflowHint?: string
  /** 成绩签审深链：进入成绩页时打开「待我复核」队列 */
  openPendingMyPublishReview?: boolean
}
