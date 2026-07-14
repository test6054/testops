import { ref } from 'vue'

/**
 * 列表加载失败态：配合 UiDataTable 的 loadError，禁止把请求失败伪装成「暂无数据」。
 *
 * 用法：
 * 1. const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
 * 2. load 开始时 beginLoad()；成功 okLoad()；catch 清空列表后 failLoad()
 * 3. 模板 <UiDataTable :load-error="loadError" ... />
 */
export function useUiTableLoadError() {
  const loadError = ref(false)

  function beginLoad() {
    loadError.value = false
  }

  function okLoad() {
    loadError.value = false
  }

  function failLoad() {
    loadError.value = true
  }

  return {
    loadError,
    beginLoad,
    okLoad,
    failLoad,
  }
}
