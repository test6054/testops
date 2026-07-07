/** AI 分析卡片内容区阶段：各卡片独立计算，互不影响。 */
export type AiAnalysisCardPhase = 'loading' | 'generating' | 'empty' | 'ready'

export function resolveAiAnalysisCardPhase(input: {
  loading: boolean
  generating: boolean
  hasContent: boolean
}): AiAnalysisCardPhase {
  if (input.generating) return 'generating'
  if (input.loading) return 'loading'
  if (!input.hasContent) return 'empty'
  return 'ready'
}
