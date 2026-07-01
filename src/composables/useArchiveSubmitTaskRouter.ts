import type {
  ArchiveVolumeSubmitChecklistItemVO,
  ArchiveVolumeWizardStepKey,
} from '@/apis/mark/archive-volume'

export type ArchiveVolumeExpertTabKey
  = | 'materials'
    | 'scores'
    | 'integrity'
    | 'storage'
    | 'scan-batches'
    | 'scan-review'
    | 'transfer'
    | 'access'
    | 'appraisal'
    | 'events'

export interface ArchiveSubmitTaskRouteTarget {
  wizardStep: ArchiveVolumeWizardStepKey
  expertTab: ArchiveVolumeExpertTabKey
}

const WIZARD_STEP_KEYS: ArchiveVolumeWizardStepKey[] = [
  'materials',
  'integrity',
  'catalog',
  'selfCheck',
  'submit',
]

/** 将后端阻塞项映射到向导步骤与专家 Tab。 */
export function resolveSubmitTaskTarget(
  item: ArchiveVolumeSubmitChecklistItemVO,
): ArchiveSubmitTaskRouteTarget {
  const tab = normalizeExpertTab(item.targetTab)
  if (tab) {
    return {
      wizardStep: expertTabToWizardStep(tab),
      expertTab: tab,
    }
  }
  return {
    wizardStep: dimensionToWizardStep(item.dimension),
    expertTab: dimensionToExpertTab(item.dimension),
  }
}

/** 向导步骤序号（1~5）转步骤 key。 */
export function wizardStepKeyFromNumber(step: number): ArchiveVolumeWizardStepKey {
  const index = Math.min(Math.max(step, 1), WIZARD_STEP_KEYS.length) - 1
  return WIZARD_STEP_KEYS[index]
}

/** 向导步骤 key 转序号（1~5）。 */
export function wizardStepNumberFromKey(stepKey: ArchiveVolumeWizardStepKey): number {
  const index = WIZARD_STEP_KEYS.indexOf(stepKey)
  return index >= 0 ? index + 1 : 1
}

function normalizeExpertTab(raw?: string): ArchiveVolumeExpertTabKey | null {
  if (!raw) return null
  const allowed: ArchiveVolumeExpertTabKey[] = [
    'materials',
    'scores',
    'integrity',
    'storage',
    'scan-batches',
    'scan-review',
    'transfer',
    'access',
    'appraisal',
    'events',
  ]
  if (raw === 'catalog') return 'materials'
  if (raw === 'selfCheck') return 'materials'
  return allowed.includes(raw as ArchiveVolumeExpertTabKey)
    ? raw as ArchiveVolumeExpertTabKey
    : null
}

function expertTabToWizardStep(tab: ArchiveVolumeExpertTabKey): ArchiveVolumeWizardStepKey {
  if (tab === 'integrity') return 'integrity'
  if (tab === 'scores') return 'materials'
  if (tab === 'transfer') return 'submit'
  return 'materials'
}

function dimensionToWizardStep(dimension: string): ArchiveVolumeWizardStepKey {
  switch (dimension) {
    case 'FOUR_PROPERTY':
    case 'REMEDIATION':
      return 'integrity'
    case 'CATALOG_NOT_READY':
    case 'CATALOG':
      return 'catalog'
    case 'SELF_CHECK_PENDING':
    case 'SELF_CHECK':
    case 'SELF_CHECK_FORM':
    case 'SIGN_OFF':
      return 'selfCheck'
    default:
      return 'materials'
  }
}

function dimensionToExpertTab(dimension: string): ArchiveVolumeExpertTabKey {
  switch (dimension) {
    case 'FOUR_PROPERTY':
    case 'REMEDIATION':
      return 'integrity'
    case 'SCORE':
      return 'scores'
    case 'CATALOG_NOT_READY':
    case 'CATALOG':
      return 'materials'
    case 'SELF_CHECK_PENDING':
    case 'SELF_CHECK':
    case 'SELF_CHECK_FORM':
    case 'SIGN_OFF':
      return 'materials'
    default:
      return 'materials'
  }
}
