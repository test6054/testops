import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  ALL_FINAL_SCORE_STATUS_CODES,
  FinalScoreStatusCode,
  FinalScoreStatusDescription,
} from '@/types/enums/final-score-status-enum'

export {
  ALL_FINAL_SCORE_STATUS_CODES,
  FinalScoreStatusCode,
  FinalScoreStatusDescription,
} from '@/types/enums/final-score-status-enum'

export const FINAL_SCORE_STATUS_TONE: Record<FinalScoreStatusCode, BadgeTone> = {
  [FinalScoreStatusCode.PENDING]: 'gray',
  [FinalScoreStatusCode.CALCULATED]: 'blue',
  [FinalScoreStatusCode.CONFIRMED]: 'blue',
  [FinalScoreStatusCode.CORRECTED]: 'orange',
  [FinalScoreStatusCode.PUBLISHED]: 'green',
  [FinalScoreStatusCode.WITHDRAWN]: 'red',
}

export const FINAL_SCORE_STATUS_OPTIONS: Array<{
  label: string
  value: FinalScoreStatusCode
}> = ALL_FINAL_SCORE_STATUS_CODES.map((value) => ({
  value,
  label: FinalScoreStatusDescription[value],
}))

export const FINAL_SCORE_STATUS_CODES: FinalScoreStatusCode[] = [...ALL_FINAL_SCORE_STATUS_CODES]
