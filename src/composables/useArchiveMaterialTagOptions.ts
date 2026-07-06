import { ref } from 'vue'
import { suggestArchiveVolumeMaterialTags } from '@/apis/mark/archive-volume'
import { showUserError } from '@/utils/error-handler'

const cachedOptions = ref<string[]>([])
let loaded = false

/**
 * 加载租户内材料标签建议，供登记/派单/编辑标签下拉复用。
 */
export async function loadArchiveMaterialTagOptions(keyword?: string): Promise<string[]> {
  try {
    const tags = await suggestArchiveVolumeMaterialTags({
      keyword: keyword?.trim() || undefined,
      limit: 30,
    })
    if (!keyword?.trim()) {
      cachedOptions.value = tags
      loaded = true
    }
    return tags
  } catch (error) {
    showUserError(error, '标签建议加载失败')
    return loaded ? cachedOptions.value : []
  }
}

export function useArchiveMaterialTagOptions() {
  return {
    tagOptions: cachedOptions,
    loadArchiveMaterialTagOptions,
  }
}
