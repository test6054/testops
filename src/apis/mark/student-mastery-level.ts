import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  ALL_MASTERY_LEVEL_CODES,
  MasteryLevelCode,
  MasteryLevelDescription,
} from '@/types/enums/mastery-level-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_MASTERY_LEVEL_CODES,
  MasteryLevelCode,
  MasteryLevelDescription,
} from '@/types/enums/mastery-level-enum'

export const MASTERY_LEVEL_TONE: Record<MasteryLevelCode, BadgeTone> = {
  [MasteryLevelCode.EXCELLENT]: 'green',
  [MasteryLevelCode.GOOD]: 'blue',
  [MasteryLevelCode.MEDIUM]: 'blue',
  [MasteryLevelCode.WEAK]: 'orange',
  [MasteryLevelCode.CRITICAL]: 'red',
}

export const MASTERY_LEVEL_OPTIONS: Array<{ label: string; value: MasteryLevelCode }> =
  ALL_MASTERY_LEVEL_CODES.map((value) => ({
    value,
    label: strictEnumLabel(MasteryLevelDescription, value, '知识掌握等级'),
  }))
