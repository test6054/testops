import type { ArchiveVolumeSelfCheckItemVO, ArchiveVolumeSelfCheckListVO } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import {
  checkArchiveVolumeSelfCheckItem,
  exportArchiveVolumeSelfCheck,
  listArchiveVolumeSelfCheckItems,
} from '@/apis/mark/archive-volume'
import { showUserError } from '@/utils/error-handler'

/**
 * 归档卷逐项自查：加载清单、勾选确认与导出。
 */
export function useArchiveVolumeSelfCheck(volumeId: () => string) {
  const loading = ref(false)
  const checking = ref(false)
  const exporting = ref(false)
  const selfCheck = ref<ArchiveVolumeSelfCheckListVO | null>(null)

  const items = computed(() => selfCheck.value?.items ?? [])
  const selfCheckStatus = computed(() => selfCheck.value?.selfCheckStatus ?? 'NOT_STARTED')
  const allRequiredChecked = computed(() => selfCheck.value?.allRequiredChecked === true)

  async function loadSelfCheck() {
    const id = volumeId()
    if (!id) return
    loading.value = true
    try {
      selfCheck.value = await listArchiveVolumeSelfCheckItems(id)
    }
    catch (error) {
      selfCheck.value = null
      showUserError(error, '加载自查清单失败')
    }
    finally {
      loading.value = false
    }
  }

  async function toggleItem(item: ArchiveVolumeSelfCheckItemVO, checked: boolean) {
    const id = volumeId()
    if (!id) return
    checking.value = true
    try {
      selfCheck.value = await checkArchiveVolumeSelfCheckItem({
        volumeId: id,
        templateItemId: item.templateItemId,
        checked,
      })
    }
    catch (error) {
      showUserError(error)
      await loadSelfCheck()
    }
    finally {
      checking.value = false
    }
  }

  async function exportSelfCheck() {
    const id = volumeId()
    if (!id) return
    exporting.value = true
    try {
      const result = await exportArchiveVolumeSelfCheck(id)
      if (!result.exportFileId) {
        message.error('导出未返回文件 ID')
        return
      }
      await downloadFile({ nodeId: result.exportFileId })
      message.success('自查表导出完成')
    }
    catch (error) {
      showUserError(error)
    }
    finally {
      exporting.value = false
    }
  }

  return {
    loading,
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
