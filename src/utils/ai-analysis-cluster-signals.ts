import type { AiAnalysisClusterSignalResponse } from '@/apis/mark/analysis-center'
import type { WorkflowReadinessStep } from '@/components/workbench/workflow-readiness/types'
import type { SignalMetric } from '@/types/workbench'

function metricValue(value: number | undefined | null): string | number {
  if (value == null) {
    return '—'
  }
  return value
}

/** 将后端 clusterSignal 转为错因聚类 Tab SignalBand 指标 */
export function buildAiAnalysisClusterSignalMetrics(
  signal: AiAnalysisClusterSignalResponse | null | undefined,
  examSelected: boolean,
): SignalMetric[] {
  if (!examSelected || !signal) {
    return [
      { key: 'error-cause', label: '错因类型', value: '—', tone: 'blue' },
      { key: 'quality-analyzed', label: '质量已分析', value: '—', tone: 'green' },
      { key: 'low-discrim', label: '区分度异常', value: '—', tone: 'orange' },
      { key: 'ideal-zone', label: '理想区间题', value: '—', tone: 'green' },
      { key: 'rejudge-pending', label: '待审批重判', value: '—', tone: 'orange' },
      { key: 'goal-unmapped', label: '未映射题', value: '—', tone: 'red' },
    ]
  }

  const totalQuestions = signal.totalLayoutQuestionCount ?? 0
  const analyzed = signal.questionQualityAnalyzedCount ?? 0

  return [
    {
      key: 'error-cause',
      label: '错因类型',
      value: metricValue(signal.errorCauseTypeCount),
      tone: signal.clusterAnalysisReady ? 'blue' : 'gray',
    },
    {
      key: 'quality-analyzed',
      label: '质量已分析',
      value: `${analyzed}/${totalQuestions}`,
      tone: analyzed >= totalQuestions && totalQuestions > 0 ? 'green' : 'blue',
    },
    {
      key: 'low-discrim',
      label: '区分度异常',
      value: metricValue(signal.lowDiscriminationQuestionCount),
      tone: 'orange',
    },
    {
      key: 'ideal-zone',
      label: '理想区间题',
      value: metricValue(signal.idealZoneQuestionCount),
      tone: 'green',
    },
    {
      key: 'rejudge-pending',
      label: '待审批重判',
      value: metricValue(signal.pendingRejudgePlanCount),
      tone: 'orange',
    },
    {
      key: 'goal-unmapped',
      label: '未映射题',
      value: metricValue(signal.unmappedQuestionCount),
      tone: (signal.unmappedQuestionCount ?? 0) > 0 ? 'red' : 'green',
    },
  ]
}

/** 错因聚类 Tab 前置步骤：制卷 ROI、聚类、质量分析、课程目标映射（未选考试时不展示，由页头范围栏承担） */
export function buildAiAnalysisClusterReadinessSteps(
  signal: AiAnalysisClusterSignalResponse | null | undefined,
  examId: string | undefined,
): WorkflowReadinessStep[] {
  if (!examId?.trim() || !signal) {
    return []
  }

  const steps: WorkflowReadinessStep[] = []
  const roiGap = signal.layoutRoiGapCount ?? 0
  if (roiGap > 0) {
    steps.push({
      code: 'LAYOUT_ROI',
      label: '补全制卷识别区域',
      status: 'pending',
      description: `${roiGap} 道题尚未配置 ROI，无法生成按题质量分析。`,
      actionLabel: '前往制卷',
      routeName: 'TeacherExamWorkspaceLayoutDesigner',
      routeParams: { examId },
    })
  }

  if (signal.clusterAnalysisReady !== true) {
    steps.push({
      code: 'ERROR_CLUSTER',
      label: '生成错因聚类分析',
      status: 'pending',
      description: '基于本场考试作答生成错因占比与教学改进依据。',
    })
  }

  const analyzed = signal.questionQualityAnalyzedCount ?? 0
  const total = signal.totalLayoutQuestionCount ?? 0
  if (total > 0 && analyzed < total) {
    steps.push({
      code: 'QUESTION_QUALITY',
      label: '生成题目质量分析',
      status: 'pending',
      description: `已分析 ${analyzed}/${total} 题，需补全难度、区分度与正确率。`,
    })
  }

  if (signal.courseGoalConfigured === false) {
    steps.push({
      code: 'COURSE_GOAL_CONFIG',
      label: '配置质量评价课程目标',
      status: 'pending',
      description: '本场考试关联课程尚未在质量评价域维护 OBE 课程目标。',
      actionLabel: '前往质量评价',
      routeName: 'QualityCourseMatrix',
    })
  } else if ((signal.unmappedQuestionCount ?? 0) > 0) {
    steps.push({
      code: 'GOAL_MAPPING',
      label: '维护试题-课程目标映射',
      status: 'pending',
      description: `尚有 ${signal.unmappedQuestionCount} 题未挂接课程目标，影响归档达成度报告。`,
    })
  }

  const pendingRejudge = (signal.pendingRejudgePlanCount ?? 0) + (signal.approvedRejudgePlanCount ?? 0)
  if (pendingRejudge > 0) {
    steps.push({
      code: 'REJUDGE_PLAN',
      label: '处理重判计划',
      status: 'pending',
      description: `待审批 ${signal.pendingRejudgePlanCount ?? 0} 条、待执行 ${signal.approvedRejudgePlanCount ?? 0} 条。`,
    })
  }

  return steps
}

/** 治理折叠区默认展开：存在未映射题或待处理重判时打开对应 panel */
export function resolveClusterGovernanceDefaultKeys(
  signal: AiAnalysisClusterSignalResponse | null | undefined,
): string[] {
  const keys: string[] = []
  if (!signal) {
    return keys
  }
  if (signal.courseGoalConfigured === false || (signal.unmappedQuestionCount ?? 0) > 0) {
    keys.push('mapping')
  }
  const rejudgePending
    = (signal.pendingRejudgePlanCount ?? 0)
      + (signal.approvedRejudgePlanCount ?? 0)
      + (signal.executingRejudgePlanCount ?? 0)
  if (rejudgePending > 0) {
    keys.push('rejudge')
  }
  return keys
}
