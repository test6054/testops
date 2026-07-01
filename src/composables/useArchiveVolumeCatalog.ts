import type {
  ArchiveVolumeCatalogLineSaveRequest,
  ArchiveVolumeCatalogLineVO,
  ArchiveVolumeCatalogVO,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import {
  confirmArchiveVolumeCatalog,
  exportArchiveVolumeCatalog,
  generateArchiveVolumeCatalogDraft,
  getArchiveVolumeCatalog,
  saveArchiveVolumeCatalog,
} from '@/apis/mark/archive-volume'
import { showUserError } from '@/utils/error-handler'

/**
 * 归档卷目录编制：草稿生成、编辑保存与确认。
 */
export function useArchiveVolumeCatalog(volumeId: () => string) {
  const loading = ref(false)
  const saving = ref(false)
  const confirming = ref(false)
  const exporting = ref(false)
  const catalog = ref<ArchiveVolumeCatalogVO | null>(null)
  const editableLines = ref<ArchiveVolumeCatalogLineVO[]>([])

  const catalogStatus = computed(() => catalog.value?.catalogStatus ?? 'NOT_STARTED')
  const isConfirmed = computed(() => catalogStatus.value === 'CONFIRMED')
  const isDraft = computed(() => catalogStatus.value === 'DRAFT')

  async function loadCatalog() {
    const id = volumeId()
    if (!id) return
    loading.value = true
    try {
      catalog.value = await getArchiveVolumeCatalog(id)
      editableLines.value = (catalog.value.lines ?? []).map(line => ({ ...line }))
    }
    catch (error) {
      catalog.value = null
      editableLines.value = []
      showUserError(error, '加载归档目录失败')
    }
    finally {
      loading.value = false
    }
  }

  async function generateDraft() {
    const id = volumeId()
    if (!id) return
    saving.value = true
    try {
      catalog.value = await generateArchiveVolumeCatalogDraft(id)
      editableLines.value = (catalog.value.lines ?? []).map(line => ({ ...line }))
      message.success('目录草稿已生成')
    }
    catch (error) {
      showUserError(error)
    }
    finally {
      saving.value = false
    }
  }

  function updateLine(index: number, patch: Partial<ArchiveVolumeCatalogLineVO>) {
    const line = editableLines.value[index]
    if (!line) return
    editableLines.value[index] = { ...line, ...patch }
  }

  function buildSaveLines(): ArchiveVolumeCatalogLineSaveRequest[] {
    return editableLines.value.map((line, index) => ({
      lineNo: line.lineNo ?? index + 1,
      archiveCode: line.archiveCode?.trim() || undefined,
      title: line.title.trim(),
      responsible: line.responsible?.trim() || undefined,
      pageRange: line.pageRange?.trim() || undefined,
      fileDate: line.fileDate?.trim() || undefined,
      remark: line.remark?.trim() || undefined,
    }))
  }

  async function saveCatalog() {
    const id = volumeId()
    if (!id) return
    if (editableLines.value.some(line => !line.title?.trim())) {
      message.error('目录题名不能为空')
      return
    }
    saving.value = true
    try {
      catalog.value = await saveArchiveVolumeCatalog({
        volumeId: id,
        lines: buildSaveLines(),
      })
      editableLines.value = (catalog.value.lines ?? []).map(line => ({ ...line }))
      message.success('目录已保存')
    }
    catch (error) {
      showUserError(error)
    }
    finally {
      saving.value = false
    }
  }

  async function confirmCatalog() {
    const id = volumeId()
    if (!id) return
    confirming.value = true
    try {
      catalog.value = await confirmArchiveVolumeCatalog(id)
      editableLines.value = (catalog.value.lines ?? []).map(line => ({ ...line }))
      message.success('目录已确认')
    }
    catch (error) {
      showUserError(error)
    }
    finally {
      confirming.value = false
    }
  }

  async function exportCatalog() {
    const id = volumeId()
    if (!id) return
    exporting.value = true
    try {
      const result = await exportArchiveVolumeCatalog(id)
      if (!result.exportFileId) {
        message.error('导出未返回文件 ID')
        return
      }
      await downloadFile({ nodeId: result.exportFileId })
      message.success('目录导出完成')
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
    saving,
    confirming,
    exporting,
    catalog,
    editableLines,
    catalogStatus,
    isConfirmed,
    isDraft,
    loadCatalog,
    generateDraft,
    updateLine,
    saveCatalog,
    confirmCatalog,
    exportCatalog,
  }
}
