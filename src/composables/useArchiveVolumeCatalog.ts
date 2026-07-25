import type {
  ArchiveVolumeCatalogLineSaveRequest,
  ArchiveVolumeCatalogLineVO,
  ArchiveVolumeCatalogResponse
} from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import {
  ArchiveCatalogStatusCode,
  confirmArchiveVolumeCatalog,
  exportArchiveVolumeCatalog,
  generateArchiveVolumeCatalogDraft,
  getArchiveVolumeCatalog,
  saveArchiveVolumeCatalog
} from '@/apis/mark/archive-volume'
import { showUserError } from '@/utils/error-handler'

/**
 * 归档卷目录编制：草稿生成、编辑保存与确认。
 */
export function useArchiveVolumeCatalog(volumeId: () => string) {
  const loading = ref(false)
  const loadFailed = ref(false)
  const saving = ref(false)
  const confirming = ref(false)
  const exporting = ref(false)
  const catalog = ref<ArchiveVolumeCatalogResponse | null>(null)
  const editableLines = ref<ArchiveVolumeCatalogLineVO[]>([])

  const catalogStatus = computed(() => catalog.value?.catalogStatus ?? ArchiveCatalogStatusCode.NOT_STARTED)
  const isConfirmed = computed(() => catalogStatus.value === ArchiveCatalogStatusCode.CONFIRMED)
  const isDraft = computed(() => catalogStatus.value === ArchiveCatalogStatusCode.DRAFT)

  async function loadCatalog() {
    const id = volumeId()
    if (!id) return
    loading.value = true
    try {
      const loadedCatalog = await getArchiveVolumeCatalog(id)
      catalog.value = loadedCatalog
      editableLines.value = (loadedCatalog.lines ?? []).map(line => ({ ...line }))
      loadFailed.value = false
    }
    catch (error) {
      loadFailed.value = true
      showUserError(error, '加载归档目录失败')
    }
    finally {
      loading.value = false
    }
  }

  async function generateDraft() {
    const id = volumeId()
    if (!id || saving.value === true || confirming.value === true || exporting.value === true) return
    const revision = catalog.value?.catalogRevision
    if (!revision || loadFailed.value) {
      void message.error('目录状态已失效，请重新加载后再操作')
      return
    }
    saving.value = true
    try {
      await generateArchiveVolumeCatalogDraft(id, revision)
      void message.success('目录草稿已生成')
      await loadCatalog()
    }
    catch (error) {
      showUserError(error, '生成目录草稿失败')
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
      materialId: line.materialId,
    }))
  }

  async function saveCatalog() {
    const id = volumeId()
    if (!id || saving.value === true || confirming.value === true || exporting.value === true) return
    const revision = catalog.value?.catalogRevision
    if (!revision || loadFailed.value) {
      void message.error('目录状态已失效，请重新加载后再操作')
      return
    }
    if (editableLines.value.some(line => !line.title?.trim())) {
      void message.error('目录题名不能为空')
      return
    }
    saving.value = true
    try {
      await saveArchiveVolumeCatalog({
        volumeId: id,
        expectedCatalogRevision: revision,
        lines: buildSaveLines(),
      })
      void message.success('目录已保存')
      await loadCatalog()
    }
    catch (error) {
      showUserError(error, '保存归档目录失败')
    }
    finally {
      saving.value = false
    }
  }

  async function confirmCatalog() {
    const id = volumeId()
    if (!id || saving.value === true || confirming.value === true || exporting.value === true) return
    const revision = catalog.value?.catalogRevision
    if (!revision || loadFailed.value) {
      void message.error('目录状态已失效，请重新加载后再操作')
      return
    }
    confirming.value = true
    try {
      await confirmArchiveVolumeCatalog(id, revision)
      void message.success('目录已确认')
      await loadCatalog()
    }
    catch (error) {
      showUserError(error, '确认归档目录失败')
    }
    finally {
      confirming.value = false
    }
  }

  async function exportCatalog() {
    const id = volumeId()
    if (!id || saving.value === true || confirming.value === true || exporting.value === true) return
    exporting.value = true
    try {
      const result = await exportArchiveVolumeCatalog(id)
      if (!result.exportFileId) {
        showUserError(null, '导出未返回文件编号')
        return
      }
      await downloadFile({ nodeId: result.exportFileId })
      void message.success('目录导出完成')
    }
    catch (error) {
      showUserError(error, '导出归档目录失败')
    }
    finally {
      exporting.value = false
    }
  }

  return {
    loading,
    loadFailed,
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
