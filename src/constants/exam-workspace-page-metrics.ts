import type { InjectionKey, Ref } from 'vue'
import type { SignalMetric } from '@/types/workbench'

/** 考试工作台子页面注入页内 Signal 指标，供 ExamWorkspaceChildFrame 聚合展示 */
export const EXAM_WORKSPACE_PAGE_METRICS_KEY: InjectionKey<Ref<SignalMetric[]>> = Symbol('examWorkspacePageMetrics')
