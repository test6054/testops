/**
 * 归档卷详情主区 chrome 展示策略。
 * 侧栏承担卷身份与阶段导航；主区只承载当前 Tab 操作面与阻塞门禁。
 */

/** 提交/收材工作流 Tab：可展示门禁条与主操作工具条 */
export const ARCHIVE_VOLUME_WORKFLOW_CHROME_TABS = [
  'materials',
  'scores',
  'integrity',
  'self-check',
  'four-property',
  'department-review',
  'transfer',
] as const

/** 下一步行动仅出现在收材枢纽，避免与门禁条、侧栏导航在工具页重复 */
export const ARCHIVE_VOLUME_NEXT_STEPS_TABS = ['materials'] as const

/** 质检三 Tab：完整性自检 / 自检清单 / 四性与定密 */
export const ARCHIVE_VOLUME_QUALITY_TABS = [
  'integrity',
  'self-check',
  'four-property',
] as const

/** 卷务三页：任务设置 / 协作管理 / 开始收材（无门禁条工具栏） */
export const ARCHIVE_VOLUME_MANAGE_TABS = [
  'task-settings',
  'collaborators',
  'start-collecting',
] as const

export function isArchiveVolumeManageTab(tab: string): boolean {
  return (ARCHIVE_VOLUME_MANAGE_TABS as readonly string[]).includes(tab)
}

/** 质检阶段内隐藏全部质检类导航芯片（侧栏已承担跳转，面板/引导条承担执行） */
export const ARCHIVE_VOLUME_QUALITY_STAGE_HIDDEN_GATE_KEYS = [
  'integrity',
  'fourProperty',
] as const

export type ArchiveVolumeWorkflowChromeTab
  = (typeof ARCHIVE_VOLUME_WORKFLOW_CHROME_TABS)[number]

export function isArchiveVolumeWorkflowChromeTab(tab: string): boolean {
  return (ARCHIVE_VOLUME_WORKFLOW_CHROME_TABS as readonly string[]).includes(tab)
}

export function isArchiveVolumeNextStepsTab(tab: string): boolean {
  return (ARCHIVE_VOLUME_NEXT_STEPS_TABS as readonly string[]).includes(tab)
}

export function isArchiveVolumeQualityTab(tab: string): boolean {
  return (ARCHIVE_VOLUME_QUALITY_TABS as readonly string[]).includes(tab)
}

/** 当前 Tab 下应隐藏的导航型门禁键（目标页已在现场或同阶段侧栏可达） */
export function isArchiveGateNavHiddenOnTab(tab: string, gateKey: string): boolean {
  if (isArchiveVolumeQualityTab(tab)) {
    return (ARCHIVE_VOLUME_QUALITY_STAGE_HIDDEN_GATE_KEYS as readonly string[]).includes(gateKey)
  }
  return false
}
