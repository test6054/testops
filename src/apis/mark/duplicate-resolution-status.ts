import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { DuplicateResolutionStatusCode } from '@/types/enums/duplicate-resolution-status-enum'

export {
  ALL_DUPLICATE_RESOLUTION_STATUS_CODES,
  DuplicateResolutionStatusCode,
  DuplicateResolutionStatusDescription,
} from '@/types/enums/duplicate-resolution-status-enum'

export const DUPLICATE_RESOLUTION_STATUS_TONE: Record<DuplicateResolutionStatusCode, BadgeTone> = {
  [DuplicateResolutionStatusCode.PENDING]: 'orange',
  [DuplicateResolutionStatusCode.RESOLVED]: 'green',
}
