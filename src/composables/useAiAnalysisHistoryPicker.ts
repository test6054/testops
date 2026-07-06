import { computed, ref, shallowRef } from 'vue'

/**
 * AI 分析卡片历史记录选择：加载列表后保留当前选中项，生成新记录后置顶并选中。
 */
export function useAiAnalysisHistoryPicker<T extends { id: string }>() {
  const records = shallowRef<T[]>([])
  const selectedId = ref<string | undefined>()

  const record = computed<T | null>(() => {
    if (!selectedId.value) {
      return null
    }
    return records.value.find((item) => item.id === selectedId.value) ?? null
  })

  function clearHistory(): void {
    records.value = []
    selectedId.value = undefined
  }

  /** 写入历史列表；返回条数。无记录时清空选中。 */
  function applyLoadedList(list: T[]): number {
    records.value = list
    if (list.length === 0) {
      selectedId.value = undefined
      return 0
    }
    const stillSelected = selectedId.value
      && list.some((item) => item.id === selectedId.value)
    if (!stillSelected) {
      selectedId.value = list[0].id
    }
    return list.length
  }

  /** 生成成功后插入或更新历史，并选中该条。 */
  function adoptGenerated(item: T): void {
    records.value = [
      item,
      ...records.value.filter((existing) => existing.id !== item.id),
    ]
    selectedId.value = item.id
  }

  return {
    records,
    selectedId,
    record,
    clearHistory,
    applyLoadedList,
    adoptGenerated,
  }
}
