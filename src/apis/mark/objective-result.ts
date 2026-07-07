import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { ObjectiveResultCode } from '@/types/enums/objective-result-enum'

export {
  ALL_OBJECTIVE_RESULT_CODES,
  ObjectiveResultCode,
  ObjectiveResultDescription,
} from '@/types/enums/objective-result-enum'

export const OBJECTIVE_RESULT_TONE: Record<ObjectiveResultCode, BadgeTone> = {
  [ObjectiveResultCode.CORRECT]: 'green',
  [ObjectiveResultCode.WRONG]: 'red',
  [ObjectiveResultCode.NEED_REVIEW]: 'orange',
}
