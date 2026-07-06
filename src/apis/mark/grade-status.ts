import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { GradeStatusCode } from '@/types/enums/grade-status-enum'

export {
  ALL_GRADE_STATUS_CODES,
  GradeStatusCode,
  GradeStatusDescription,
} from '@/types/enums/grade-status-enum'

export const GRADE_STATUS_TONE: Record<GradeStatusCode, BadgeTone> = {
  [GradeStatusCode.PENDING]: 'gray',
  [GradeStatusCode.NEED_REVIEW]: 'orange',
  [GradeStatusCode.CONFIRMED]: 'green',
}
