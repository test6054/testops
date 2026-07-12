import { AnonymityModeCode, AnonymityModeDescription } from '@/types/enums/anonymity-mode-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_ANONYMITY_MODE_CODES,
  AnonymityModeCode,
  AnonymityModeDescription,
} from '@/types/enums/anonymity-mode-enum'

export const ANONYMITY_MODE_OPTIONS: Array<{
  label: string
  value: AnonymityModeCode
}> = [
  {
    value: AnonymityModeCode.ANONYMOUS,
    label: strictEnumLabel(AnonymityModeDescription, AnonymityModeCode.ANONYMOUS, '匿名模式'),
  },
  {
    value: AnonymityModeCode.NAMED,
    label: strictEnumLabel(AnonymityModeDescription, AnonymityModeCode.NAMED, '匿名模式'),
  },
]
