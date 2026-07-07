/** 工作台悬浮任务条类型：试评定标优先于阶段建议。 */
export type ExamWorkflowTaskDockKind = 'experience-assist' | 'stage-suggestion'

/** 悬浮任务条展示模型。 */
export interface ExamWorkflowTaskDockView {
  kind: ExamWorkflowTaskDockKind
  title: string
  description: string
  actionLabel: string
  badge?: string
  overflowHint?: string
}
