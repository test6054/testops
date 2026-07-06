import type { AiAnalysisStatusCode } from '@/apis/mark/ai-analysis-status'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/ai-analysis-status'
import { getUserProcessFailureMessage } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

/** AI 分析记录通用元数据字段（教学/错因等记录共用） */
export interface AiAnalysisRecordMetaSource {
  analysisStatus: AiAnalysisStatusCode
  createTime?: string
  latencyMs?: number
  aiTraceId?: string
  errorMessage?: string
}

/**
 * 统一 AI 分析记录元数据展示：生成时间、耗时、追踪编号与失败说明。
 * 供 AiAnalysisMetaCollapse 与各分析卡片复用，避免每卡重复 descriptions 块。
 */
export function useAiAnalysisRecordMeta(fallbackMessage: string) {
  function statusLabel(status: AiAnalysisStatusCode): string {
    return aiAnalysisStatusLabel(status)
  }

  function statusTone(status: AiAnalysisStatusCode) {
    return aiAnalysisStatusColor(status)
  }

  function createTimeText(record: AiAnalysisRecordMetaSource): string {
    if (!record.createTime?.trim()) {
      return '—'
    }
    return formatDateTime(record.createTime)
  }

  function latencyText(record: AiAnalysisRecordMetaSource): string {
    if (typeof record.latencyMs === 'number') {
      return `${record.latencyMs} ms`
    }
    if (record.analysisStatus === 'PENDING') {
      return '待分析，尚未生成耗时'
    }
    if (record.analysisStatus === 'FAILED' || record.analysisStatus === 'BLOCKED') {
      return '分析未完成'
    }
    return '—'
  }

  function traceId(record: AiAnalysisRecordMetaSource): string | undefined {
    return record.aiTraceId?.trim() || undefined
  }

  function traceText(record: AiAnalysisRecordMetaSource): string {
    if (record.analysisStatus === 'PENDING') {
      return '待分析，尚未生成追踪编号'
    }
    if (record.analysisStatus === 'FAILED' || record.analysisStatus === 'BLOCKED') {
      return '分析未完成'
    }
    return record.aiTraceId?.trim() || '—'
  }

  function failureMessage(errorMessage?: string): string {
    return getUserProcessFailureMessage(errorMessage, fallbackMessage)
  }

  return {
    statusLabel,
    statusTone,
    createTimeText,
    latencyText,
    traceId,
    traceText,
    failureMessage,
  }
}
