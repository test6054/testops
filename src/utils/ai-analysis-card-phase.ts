/** AI 分析卡片内容区阶段：各卡片独立计算，互不影响。 */
export type AiAnalysisCardPhase = 'loading' | 'generating' | 'empty' | 'ready' | 'error'

export function resolveAiAnalysisCardPhase(input: {
  loading: boolean
  generating: boolean
  hasContent: boolean
  loadFailed?: boolean
}): AiAnalysisCardPhase {
  if (input.generating) return 'generating'
  if (input.loading && !input.hasContent) return 'loading'
  if (input.loadFailed && !input.hasContent) return 'error'
  if (!input.hasContent) return 'empty'
  return 'ready'
}
