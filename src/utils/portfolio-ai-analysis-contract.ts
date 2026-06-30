import type {
  PortfolioAiAnalysisDetailVO,
  PortfolioAiAnalysisReviewStatus,
  PortfolioAiAnalysisSummaryVO,
  PortfolioAiAnalysisType,
} from '@/apis/portfolio/types'
import {
  PORTFOLIO_AI_ANALYSIS_REVIEW_STATUS_LABEL,
  PORTFOLIO_AI_ANALYSIS_TYPE_LABEL,
} from '@/apis/portfolio/types'
import { assertUserFacing, assertUserFacingText, throwUserFacing } from '@/utils/contract-guard'
import { strictEnumLabel } from '@/utils/strict-enum'

const ANALYSIS_DATA_ERROR = 'AI 分析结果数据异常，请刷新后重试'

/** 校验 AI 分析摘要 VO 必填契约：analysisType / resultTitle / summary / reviewStatus 不可缺失。 */
export function assertPortfolioAiAnalysisSummaryVO(value: unknown): asserts value is PortfolioAiAnalysisSummaryVO {
  const record = value as PortfolioAiAnalysisSummaryVO
  assertUserFacingText(record?.id, ANALYSIS_DATA_ERROR)
  assertUserFacingText(record?.aiTaskId, ANALYSIS_DATA_ERROR)
  strictEnumLabel(
    PORTFOLIO_AI_ANALYSIS_TYPE_LABEL,
    record?.analysisType as PortfolioAiAnalysisType | undefined | null,
    'AI 分析类型',
  )
  assertUserFacingText(record?.resultTitle, ANALYSIS_DATA_ERROR)
  assertUserFacingText(record?.summary, ANALYSIS_DATA_ERROR)
  strictEnumLabel(
    PORTFOLIO_AI_ANALYSIS_REVIEW_STATUS_LABEL,
    record?.reviewStatus as PortfolioAiAnalysisReviewStatus | undefined | null,
    'AI 分析审核状态',
  )
}

/** 校验 AI 分析详情 VO 必填契约，含结构化条目数组。 */
export function assertPortfolioAiAnalysisDetailVO(value: unknown): asserts value is PortfolioAiAnalysisDetailVO {
  assertPortfolioAiAnalysisSummaryVO(value)
  const record = value as PortfolioAiAnalysisDetailVO
  assertUserFacing(Array.isArray(record.issueItems), ANALYSIS_DATA_ERROR)
  assertUserFacing(Array.isArray(record.evidenceItems), ANALYSIS_DATA_ERROR)
  assertUserFacing(Array.isArray(record.suggestionItems), ANALYSIS_DATA_ERROR)
}

/** 校验返回 analysisType 与当前页面/任务语义一致。 */
export function assertPortfolioAiAnalysisType(
  detail: PortfolioAiAnalysisDetailVO,
  expected: PortfolioAiAnalysisType,
): void {
  if (detail.analysisType !== expected) {
    throwUserFacing(ANALYSIS_DATA_ERROR)
  }
}
