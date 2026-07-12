import { ref } from 'vue'
import { suggestArchiveVolumeMaterialTags } from '@/apis/mark/archive-volume'

const cachedOptions = ref<string[]>([])
let loaded = false

/**
 * 按关键字前缀加载材料标签建议；searchScopeOnly 为 true 时与检索可见范围一致。
 */
export async function loadArchiveMaterialTagOptions(
  keyword?: string,
  limit = 20,
  searchScopeOnly = false,
): Promise<string[]> {
  try {
    const tags = await suggestArchiveVolumeMaterialTags({
      keyword: keyword?.trim() || undefined,
      limit,
      searchScopeOnly,
    })
    if (!keyword?.trim() && !searchScopeOnly) {
      cachedOptions.value = tags
      loaded = true
    }
    return tags
  } catch {
    return searchScopeOnly ? [] : loaded ? cachedOptions.value : []
  }
}

export function useArchiveMaterialTagOptions() {
  return {
    cachedOptions,
    loadArchiveMaterialTagOptions,
  }
}
