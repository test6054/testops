import type {
  FinalScoreFailureGroupResponse,
  FinalScoreReadinessActionCode,
  FinalScoreReadinessGroupCode,
  FinalScoreReadinessItemResponse,
  FinalScoreReadinessSeverityCode,
  FinalScoreRiskOverviewResponse,
} from '@/apis/mark/exam-score'

/** 就绪分组中文名（业务域，供说明与审计） */
export const FINAL_SCORE_READINESS_GROUP_LABEL: Record<FinalScoreReadinessGroupCode, string> = {
  ABSENCE: '缺考与名册',
  IMAGING: '扫描影像',
  GRADING: '批阅完成',
  SOFT_RISK: '风险复核',
  PUBLISH: '发布策略',
}

/** 动作按钮文案（面板 CTA 追加 →） */
export const FINAL_SCORE_READINESS_ACTION_LABEL: Record<FinalScoreReadinessActionCode, string> = {
  NONE: '',
  GO_ABSENCE: '去缺考确认',
  REPAIR_SCORE_ZERO: '一键补齐计零',
  GO_QUESTION_REVIEW: '去批阅确认',
  GO_SCAN_BATCHES: '去扫描处置',
  OPEN_RISK_REVIEW: '去集中复核',
  BATCH_CONFIRM: '批量确认无风险',
  FILTER_CORRECTED: '仅看已更正',
  FILTER_PENDING_PUBLISH_REVIEW: '仅看待发布复核',
  FILTER_PENDING_MY_PUBLISH_REVIEW: '仅看待我复核',
  GO_DELAYED_TASKS: '查看失败任务',
}

/** 优先级展示带：必须修复 / 建议检查 / 可推进机会 */
export type ScoreConfirmPriorityBand = 'must_fix' | 'advisory' | 'opportunity'

export interface ScoreConfirmReadinessBandView {
  band: ScoreConfirmPriorityBand
  label: string
  description: string
  items: FinalScoreReadinessItemResponse[]
}

export interface ScoreConfirmReadinessGroupView {
  groupCode: FinalScoreReadinessGroupCode
  label: string
  items: FinalScoreReadinessItemResponse[]
  highestSeverity: FinalScoreReadinessSeverityCode
}

export interface ScoreConfirmReadinessViewModel {
  items: FinalScoreReadinessItemResponse[]
  /** 按优先级分带（主展示） */
  bands: ScoreConfirmReadinessBandView[]
  /** 业务域分组（次要，折叠展开用） */
  groups: ScoreConfirmReadinessGroupView[]
  /** 问题类数 = 必须修复 + 建议检查 的条目数 */
  problemClassCount: number
  mustFixCount: number
  advisoryCount: number
  opportunityCount: number
  hardBlockCount: number
  actionRequiredCount: number
  confirmBlocked: boolean
  publishBlocked: boolean
  allClear: boolean
}

const SEVERITY_RANK: Record<FinalScoreReadinessSeverityCode, number> = {
  HARD_BLOCK: 0,
  ACTION_REQUIRED: 1,
  INFO: 2,
}

const GROUP_ORDER: FinalScoreReadinessGroupCode[] = [
  'ABSENCE',
  'IMAGING',
  'GRADING',
  'SOFT_RISK',
  'PUBLISH',
]

/**
 * 将就绪项归入优先级带。
 * 必须修复：硬阻断或阻断确认/发布；建议检查：须处置但不阻断写路径；机会：可推进的 INFO（如安全批量确认）。
 */
export function resolveScoreConfirmPriorityBand(
  item: FinalScoreReadinessItemResponse,
): ScoreConfirmPriorityBand {
  if (item.actionCode === 'BATCH_CONFIRM' || item.code === 'SAFE_CONFIRMABLE') {
    return 'opportunity'
  }
  if (item.severity === 'HARD_BLOCK' || item.blocksConfirm || item.blocksPublish) {
    return 'must_fix'
  }
  if (item.severity === 'ACTION_REQUIRED') {
    return 'advisory'
  }
  return 'opportunity'
}

/**
 * 合并 BE readinessItems 生成优先级分带就绪度视图。
 * 后端 readinessItems 为唯一真源；禁止前端再拼装延迟确认等就绪项。
 */
export function buildScoreConfirmReadinessViewModel(
  overview: FinalScoreRiskOverviewResponse | null | undefined,
): ScoreConfirmReadinessViewModel {
  const items: FinalScoreReadinessItemResponse[] = [...(overview?.readinessItems ?? [])]

  const seen = new Set<string>()
  const unique = items.filter((item) => {
    if (seen.has(item.code)) return false
    seen.add(item.code)
    return true
  })

  unique.sort((a, b) => {
    const bandRank = (item: FinalScoreReadinessItemResponse) => {
      const band = resolveScoreConfirmPriorityBand(item)
      if (band === 'must_fix') return 0
      if (band === 'advisory') return 1
      return 2
    }
    const bandDiff = bandRank(a) - bandRank(b)
    if (bandDiff !== 0) return bandDiff
    const severityDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (severityDiff !== 0) return severityDiff
    return GROUP_ORDER.indexOf(a.groupCode) - GROUP_ORDER.indexOf(b.groupCode)
  })

  const mustFixItems = unique.filter((item) => resolveScoreConfirmPriorityBand(item) === 'must_fix')
  const advisoryItems = unique.filter((item) => resolveScoreConfirmPriorityBand(item) === 'advisory')
  const opportunityItems = unique.filter((item) => resolveScoreConfirmPriorityBand(item) === 'opportunity')

  const bands: ScoreConfirmReadinessBandView[] = []
  if (mustFixItems.length > 0) {
    bands.push({
      band: 'must_fix',
      label: '必须修复（阻断发布）',
      // 场级：blocksConfirm/硬阻断才挡确认；仅 blocksPublish（如题分未确认）挡发布，安全批量确认仍可推进无风险卷
      description: '未处理前不可发布受影响成绩；场级确认仅受硬阻断与 blocksConfirm 限制',
      items: mustFixItems,
    })
  }
  if (advisoryItems.length > 0) {
    bands.push({
      band: 'advisory',
      label: '建议检查（不阻断）',
      description: '不阻断当前写路径，但建议确认后继续',
      items: advisoryItems,
    })
  }
  if (opportunityItems.length > 0) {
    bands.push({
      band: 'opportunity',
      label: '可推进',
      description: '场级条件允许时，可对无问题答卷继续确认或发布',
      items: opportunityItems,
    })
  }

  const groups: ScoreConfirmReadinessGroupView[] = []
  for (const groupCode of GROUP_ORDER) {
    const groupItems = unique.filter((item) => item.groupCode === groupCode)
    if (groupItems.length === 0) continue
    let highest: FinalScoreReadinessSeverityCode = 'INFO'
    for (const item of groupItems) {
      if (SEVERITY_RANK[item.severity] < SEVERITY_RANK[highest]) {
        highest = item.severity
      }
    }
    groups.push({
      groupCode,
      label: FINAL_SCORE_READINESS_GROUP_LABEL[groupCode],
      items: groupItems,
      highestSeverity: highest,
    })
  }

  const hardBlockCount = unique.filter((item) => item.severity === 'HARD_BLOCK').length
  const actionRequiredCount = unique.filter((item) => item.severity === 'ACTION_REQUIRED').length
  const confirmBlocked = unique.some((item) => item.blocksConfirm)
  const publishBlocked = unique.some((item) => item.blocksPublish)

  return {
    items: unique,
    bands,
    groups,
    problemClassCount: mustFixItems.length + advisoryItems.length,
    mustFixCount: mustFixItems.length,
    advisoryCount: advisoryItems.length,
    opportunityCount: opportunityItems.length,
    hardBlockCount,
    actionRequiredCount,
    confirmBlocked,
    publishBlocked,
    allClear: hardBlockCount === 0 && actionRequiredCount === 0 && !confirmBlocked && !publishBlocked,
  }
}

/**
 * 失败分组主展示文案：N 份因「原因」失败，禁止逐卷弹 12 条。
 */
export function formatFinalScoreFailureGroups(
  groups: FinalScoreFailureGroupResponse[] | null | undefined,
): string {
  if (!groups || groups.length === 0) return ''
  return groups
    .map((group) => `${group.count} 份：${group.message || group.code}`)
    .join('；')
}

/** 动作按钮展示：有动作时追加箭头，贴近「去批阅 →」 */
export function formatReadinessActionLabel(code: FinalScoreReadinessActionCode): string {
  const label = FINAL_SCORE_READINESS_ACTION_LABEL[code]
  if (!label) return ''
  return `${label} →`
}
