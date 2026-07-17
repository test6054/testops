import type { ArchiveVolumeSelfCheckItemVO, ArchiveVolumeSelfCheckListResponse } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import {
  ArchiveSelfCheckStatusCode,
  checkArchiveVolumeSelfCheckItem,
  exportArchiveVolumeSelfCheck,
  listArchiveVolumeSelfCheckItems
} from '@/apis/mark/archive-volume'
import { showUserError } from '@/utils/error-handler'

/**
 * 归档卷逐项自查：加载清单、勾选确认与导出。
 */
export function useArchiveVolumeSelfCheck(volumeId: () => string) {
  const loading = ref(false)
  const loadFailed = ref(false)
  const checking = ref(false)
  const exporting = ref(false)
  const selfCheck = ref<ArchiveVolumeSelfCheckListResponse | null>(null)

  const items = computed(() => selfCheck.value?.items ?? [])
  const selfCheckStatus = computed(() => {
    if (!selfCheck.value) return ArchiveSelfCheckStatusCode.NOT_STARTED
    if (selfCheck.value.completed) return ArchiveSelfCheckStatusCode.COMPLETED
    if ((selfCheck.value.requiredChecked ?? 0) > 0) return ArchiveSelfCheckStatusCode.IN_PROGRESS
    return ArchiveSelfCheckStatusCode.NOT_STARTED
  })
  const allRequiredChecked = computed(() => selfCheck.value?.completed === true)

  async function loadSelfCheck() {
    const id = volumeId()
    if (!id) return
    loading.value = true
    try {
      selfCheck.value = await listArchiveVolumeSelfCheckItems(id)
      loadFailed.value = false
    }
    catch (error) {
      loadFailed.value = true
      showUserError(error, '加载自查清单失败')
    }
    finally {
      loading.value = false
    }
  }

  async function toggleItem(item: ArchiveVolumeSelfCheckItemVO, checked: boolean) {
    const id = volumeId()
    if (!id) return
    if (checking.value || exporting.value) return
    if (loadFailed.value) {
      message.error('自查清单状态已失效，请重新加载后再操作')
      return
    }
    checking.value = true
    try {
      await checkArchiveVolumeSelfCheckItem({
        volumeId: id,
        templateItemId: item.templateItemId,
        checked,
      })
      await loadSelfCheck()
    }
    catch (error) {
      showUserError(error, '更新自查项失败')
    }
    finally {
      checking.value = false
    }
  }

  async function exportSelfCheck() {
    const id = volumeId()
    if (!id) return
    if (exporting.value || checking.value) return
    exporting.value = true
    try {
      const result = await exportArchiveVolumeSelfCheck(id)
      if (!result.exportFileId) {
        showUserError(null, '导出未返回文件编号')
        return
      }
      await downloadFile({ nodeId: result.exportFileId })
      message.success('自查表导出完成')
    }
    catch (error) {
      showUserError(error, '导出自查表失败')
    }
    finally {
      exporting.value = false
    }
  }

  return {
    loading,
    loadFailed,
    checking,
    exporting,
    selfCheck,
    items,
    selfCheckStatus,
    allRequiredChecked,
    loadSelfCheck,
    toggleItem,
    exportSelfCheck,
  }
}
