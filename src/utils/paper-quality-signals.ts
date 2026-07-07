import type { ExamPaperAnalysisResponse } from '@/apis/mark/question-analysis'
import type { SignalMetric } from '@/types/workbench'

function formatMetricValue(value: number | null | undefined, digits = 3): string {
  if (value == null) return '—'
  return value.toFixed(digits)
}

/** 整卷测量学质量 Signal 指标，供题目分析页与 PaperQualityCard 共用。 */
export function buildPaperQualitySignalMetrics(
  data: ExamPaperAnalysisResponse | null | undefined,
): SignalMetric[] {
  if (!data) return []
  const hasAnyMetric
    = data.cronbachAlpha != null
      || data.paperDiscriminationIndex != null
      || data.paperDifficultyIndex != null
      || (data.reliabilitySampleCount != null && data.reliabilitySampleCount > 0)
  if (!hasAnyMetric) return []
  const alphaMetric: SignalMetric
    = data.cronbachAlpha == null
      ? {
          key: 'cronbachAlpha',
          label: 'Cronbach α',
          value: '样本不足（<30），无法计算信度',
          tone: 'gray',
        }
      : {
          key: 'cronbachAlpha',
          label: 'Cronbach α',
          value: formatMetricValue(data.cronbachAlpha, 3),
          tone: 'blue',
        }
  return [
    alphaMetric,
    {
      key: 'paperDiscriminationIndex',
      label: '平均区分度',
      value: formatMetricValue(data.paperDiscriminationIndex),
      tone: 'green',
    },
    {
      key: 'paperDifficultyIndex',
      label: '平均难度',
      value: formatMetricValue(data.paperDifficultyIndex),
      tone: 'orange',
    },
  ]
}
