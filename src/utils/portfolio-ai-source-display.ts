import type { PortfolioAiSourceRefVO } from '@/apis/portfolio/types'
import { AiTaskTypeDescription } from '@/types/enums/ai-task-type-enum'
import { PortfolioAiAnalysisTypeDescription } from '@/types/enums/portfolio-ai-analysis-type-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

const TITLE_MAX_LEN = 40

function truncateTitle(title: string): string {
  if (title.length <= TITLE_MAX_LEN) {
    return title
  }
  return `${title.slice(0, TITLE_MAX_LEN)}…`
}

/**
 * 将结构化 AI 来源引用拼装为教师可读文案。
 * 优先正式分析类型 + 标题，否则任务类型；禁止回退展示主键。
 */
export function portfolioAiSourceDisplay(source?: PortfolioAiSourceRefVO | null): string {
  if (!source) {
    return ''
  }
  if (source.analysisType) {
    const typeLabel = strictEnumLabel(
      PortfolioAiAnalysisTypeDescription,
      source.analysisType,
      'AI 分析类型',
    )
    if (source.resultTitle?.trim()) {
      return `${typeLabel} · ${truncateTitle(source.resultTitle.trim())}`
    }
    return typeLabel
  }
  if (source.taskType) {
    const label = strictEnumLabel(AiTaskTypeDescription, source.taskType, 'AI 任务类型')
    if (label.startsWith('档案袋')) {
      const shortened = label.slice('档案袋'.length).trim()
      return shortened || label
    }
    return label
  }
  if (source.resultTitle?.trim()) {
    return truncateTitle(source.resultTitle.trim())
  }
  return ''
}
