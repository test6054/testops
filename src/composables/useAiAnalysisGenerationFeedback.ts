import message from 'ant-design-vue/es/message'
import { ref } from 'vue'

/** AI 分析卡片「重新生成」：运行中展示进度面板，失败由 axios 拦截器统一 Message 提示 */
export function useAiAnalysisGenerationFeedback() {
  const generating = ref(false)

  async function runGeneration<T>(
    task: () => Promise<T>,
    options: {
      successMessage: string
      onSuccess: (result: T) => void
      onFailure?: () => void
    },
  ): Promise<void> {
    // MVR-097：双点 / 键盘连触防重入
    if (generating.value) {
      return
    }
    generating.value = true
    try {
      const result = await task()
      options.onSuccess(result)
      void message.success(options.successMessage)
    } catch {
      options.onFailure?.()
    } finally {
      generating.value = false
    }
  }

  return {
    generating,
    runGeneration,
  }
}
