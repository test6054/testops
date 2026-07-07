import type { BadgeTone } from '@/components/ui-guide/ui/types'

/** 本科教学评估卷就绪度矩阵单元格状态（由布尔字段派生） */
export enum ArchiveEvaluationDimensionReadyCode {
  READY = 'READY',
  NOT_READY = 'NOT_READY',
}

export const ALL_ARCHIVE_EVALUATION_DIMENSION_READY_CODES: readonly ArchiveEvaluationDimensionReadyCode[] = [
  ArchiveEvaluationDimensionReadyCode.READY,
  ArchiveEvaluationDimensionReadyCode.NOT_READY,
]

export const ArchiveEvaluationDimensionReadyDescription: Record<ArchiveEvaluationDimensionReadyCode, string> = {
  [ArchiveEvaluationDimensionReadyCode.READY]: '就绪',
  [ArchiveEvaluationDimensionReadyCode.NOT_READY]: '未就绪',
}

export const ArchiveEvaluationDimensionReadyTone: Record<ArchiveEvaluationDimensionReadyCode, BadgeTone> = {
  [ArchiveEvaluationDimensionReadyCode.READY]: 'green',
  [ArchiveEvaluationDimensionReadyCode.NOT_READY]: 'red',
}

