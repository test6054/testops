import message from 'ant-design-vue/es/message'
import { ref } from 'vue'

/** AI 分析卡片「重新生成」：运行中展示进度面板，失败由 axios 拦截器统一 Message 提示 */
export function useAiAnalysisGenerationFeedback() {
  const generating = ref(false)

  async function runGeneration<T>(
    task: () => Promise<T>,
    options: {
      successMessage: string
      /** 生成写入成功后的结果刷新；支持 async，失败不否定生成本身 */
      onSuccess: (result: T) => void | Promise<void>
      onFailure?: () => void
      refreshFailureMessage?: string
    },
  ): Promise<void> {
    // MVR-097：双点 / 键盘连触防重入
    if (generating.value) {
      return
    }
    generating.value = true
    try {
      const result = await task()
      void message.success(options.successMessage)
      try {
        await options.onSuccess(result)
      } catch {
        void message.warning(
          options.refreshFailureMessage ?? '已生成，结果刷新失败，可手动刷新本卡',
        )
      }
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
