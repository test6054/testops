/**
 * 归档卷详情顶栏切换器：分页拉取 + keyword 搜索 + 当前卷不在页内时详情补全。
 */
import type { ArchiveVolumeResponse } from '@/apis/mark/archive-volume'
import type { ArchiveVolumeSelectOption } from '@/utils/archive-volume-option'
import { computed, ref, watch } from 'vue'
import {
  getArchiveVolumeDetail,
  pageArchiveVolumes,
} from '@/apis/mark/archive-volume'
import {
  archiveVolumeSummaryFromDetail,
  toArchiveVolumeSelectOption,
} from '@/utils/archive-volume-option'
import { showUserError } from '@/utils/error-handler'

export const ARCHIVE_VOLUME_SELECTOR_DEFAULT_PAGE_SIZE = 20

const VOLUME_SEARCH_DEBOUNCE_MS = 300

export function useArchiveVolumeSelector(options?: {
  /** 当前路由卷 ID；变化时同步补全 pinned */
  currentVolumeId: () => string
}) {
  const volumes = ref<ArchiveVolumeResponse[]>([])
  const pinnedVolume = ref<ArchiveVolumeResponse | null>(null)
  const loading = ref(false)
  const searching = ref(false)
  const resolvingPinned = ref(false)

  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined

  const volumeOptions = computed<ArchiveVolumeSelectOption[]>(() => {
    const merged = new Map<string, ArchiveVolumeSelectOption>()
    if (pinnedVolume.value) {
      merged.set(pinnedVolume.value.volumeId, toArchiveVolumeSelectOption(pinnedVolume.value))
    }
    for (const item of volumes.value) {
      merged.set(item.volumeId, toArchiveVolumeSelectOption(item))
    }
    return Array.from(merged.values())
  })

  async function loadDefaultVolumes(): Promise<void> {
    loading.value = true
    try {
      const page = await pageArchiveVolumes({
        pageNum: 1,
        pageSize: ARCHIVE_VOLUME_SELECTOR_DEFAULT_PAGE_SIZE,
        excludeAutoCreateFailureStub: true,
      })
      volumes.value = page.list
    } catch (error) {
      volumes.value = []
      showUserError(error, '归档卷列表加载失败')
    } finally {
      loading.value = false
    }
  }

  async function searchVolumes(keyword: string): Promise<void> {
    const trimmed = keyword.trim()
    if (!trimmed) {
      await loadDefaultVolumes()
      return
    }
    searching.value = true
    try {
      const page = await pageArchiveVolumes({
        keyword: trimmed,
        pageNum: 1,
        pageSize: ARCHIVE_VOLUME_SELECTOR_DEFAULT_PAGE_SIZE,
        excludeAutoCreateFailureStub: true,
      })
      volumes.value = page.list
    } catch (error) {
      volumes.value = []
      showUserError(error, '归档卷搜索失败')
    } finally {
      searching.value = false
    }
  }

  function onVolumeSearch(keyword: string): void {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }
    searchDebounceTimer = setTimeout(() => {
      void searchVolumes(keyword)
    }, VOLUME_SEARCH_DEBOUNCE_MS)
  }

  async function syncPinnedVolume(volumeId: string | undefined): Promise<void> {
    if (!volumeId) {
      pinnedVolume.value = null
      return
    }
    const inPage = volumes.value.find((item) => item.volumeId === volumeId)
    if (inPage) {
      pinnedVolume.value = inPage
      return
    }
    if (pinnedVolume.value?.volumeId === volumeId) {
      return
    }
    resolvingPinned.value = true
    try {
      const detail = await getArchiveVolumeDetail(volumeId)
      pinnedVolume.value = archiveVolumeSummaryFromDetail(detail)
    } catch (error) {
      pinnedVolume.value = null
      showUserError(error, '当前归档卷不存在或无权访问')
    } finally {
      resolvingPinned.value = false
    }
  }

  /** 用已加载的详情摘要更新 pinned，避免切换器再打一次详情 */
  function pinFromVolume(volume: ArchiveVolumeResponse | null | undefined): void {
    if (!volume?.volumeId) {
      return
    }
    pinnedVolume.value = volume
  }

  async function init(): Promise<void> {
    await loadDefaultVolumes()
    const currentId = options?.currentVolumeId()
    if (currentId) {
      await syncPinnedVolume(currentId)
    }
  }

  if (options?.currentVolumeId) {
    watch(
      () => options.currentVolumeId(),
      (next) => {
        void syncPinnedVolume(next || undefined)
      },
    )
  }

  return {
    volumes,
    volumeOptions,
    loading,
    searching,
    resolvingPinned,
    onVolumeSearch,
    syncPinnedVolume,
    pinFromVolume,
    init,
  }
}

export type { ArchiveVolumeSelectOption }
