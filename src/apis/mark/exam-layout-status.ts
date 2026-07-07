import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { ExamLayoutStatusCode } from '@/types/enums/exam-layout-status-enum'

export {
  ALL_EXAM_LAYOUT_STATUS_CODES,
  ExamLayoutStatusCode,
  ExamLayoutStatusDescription,
} from '@/types/enums/exam-layout-status-enum'

export const EXAM_LAYOUT_STATUS_TONE: Record<ExamLayoutStatusCode, BadgeTone> = {
  [ExamLayoutStatusCode.ACTIVE]: 'green',
  [ExamLayoutStatusCode.DRAFT]: 'gray',
}
