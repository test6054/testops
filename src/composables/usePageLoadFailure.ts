import { ref } from 'vue'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'

/**
 * 页面首屏/区块加载失败态：持久 inline 文案 + toast，禁止错误块内重试按钮。
 */
export function usePageLoadFailure() {
  const loadError = ref('')

  function captureLoadFailure(error: unknown, fallback: string) {
    loadError.value = getUserErrorMessage(error, fallback)
    showUserError(error, fallback)
  }

  function clearLoadFailure() {
    loadError.value = ''
  }

  return {
    loadError,
    captureLoadFailure,
    clearLoadFailure,
  }
}
