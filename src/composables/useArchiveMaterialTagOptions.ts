import { suggestArchiveVolumeMaterialTags } from '@/apis/mark/archive-volume'

/**
 * 按关键字前缀加载材料标签建议；searchScopeOnly 为 true 时与检索可见范围一致。
 */
export async function loadArchiveMaterialTagOptions(
  keyword?: string,
  limit = 20,
  searchScopeOnly = false,
  volumeId?: string,
): Promise<string[]> {
  return suggestArchiveVolumeMaterialTags({
    keyword: keyword?.trim() || undefined,
    limit,
    volumeId,
    searchScopeOnly,
  })
}
