import { AnonymityModeCode, AnonymityModeDescription } from '@/types/enums/anonymity-mode-enum'

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
    label: AnonymityModeDescription[AnonymityModeCode.ANONYMOUS],
  },
  { value: AnonymityModeCode.NAMED, label: AnonymityModeDescription[AnonymityModeCode.NAMED] },
]
