import type { ExamWorkbenchStageSnapshotResponse } from '@/apis/mark/exam-progress'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { SignalMetric } from '@/types/workbench'

export interface ExamWorkspacePageMetricsInput {
  markStageKey?: MarkStageKey
  snapshot: ExamWorkbenchStageSnapshotResponse | null
}

/**
 * 按工作台子路由阶段键构建页级 KPI；与布局级 Signal 互补，不重复全考试指标。
 * 扫描/批阅/发布等跨阶段指标由布局 Chrome 的 buildExamWorkspaceSignalMetrics 承担。
 */
export function buildExamWorkspacePageMetrics(
  input: ExamWorkspacePageMetricsInput,
): SignalMetric[] {
  const { markStageKey, snapshot } = input
  if (!markStageKey || !snapshot) {
    return []
  }

  switch (markStageKey) {
    case 'EXAM_PREP':
    case 'PAPER_TEMPLATE':
    case 'CANDIDATE_ROSTER': {
      const steps = snapshot.prepSteps ?? []
      const completed = steps.filter((step) => step.status === 'completed').length
      const metrics: SignalMetric[] = []
      if (steps.length > 0) {
        metrics.push({
          key: 'prep-done',
          label: '准备完成',
          value: completed,
          unit: `/${steps.length}`,
          tone: completed === steps.length ? 'green' : 'blue',
          clickable: true,
        })
      }
      if (snapshot.prepBlockingReasons.length > 0) {
        metrics.push({
          key: 'prep-block',
          label: '硬阻断',
          value: snapshot.prepBlockingReasons.length,
          tone: 'orange',
          clickable: true,
        })
      }
      return metrics
    }
    case 'SCAN':
      return []
    case 'MARKING_ORG': {
      if (snapshot.markingOrgConfigured) {
        return [
          { key: 'org-ready', label: '阅卷设置', value: '已配置', tone: 'green', clickable: true },
        ]
      }
      return [
        { key: 'org-pending', label: '阅卷设置', value: '待配置', tone: 'orange', clickable: true },
      ]
    }
    case 'TRIAL_MARKING':
    case 'FORMAL_MARKING':
    case 'SCORE_PUBLISH':
      return []
    case 'ARCHIVE': {
      if (snapshot.archiveClosed) {
        return [{ key: 'archive-closed', label: '归档状态', value: '已关闭', tone: 'green' }]
      }
      return []
    }
    default:
      return []
  }
}
