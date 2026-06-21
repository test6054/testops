<template>
  <UiDataTable
    pagination-mode="none"
    :columns="columns"
    :data-source="pages"
    :show-pagination="false"
    flat
    :total="pages.length"
    row-key="rowKey"
    size="middle"
    class="exam-template-page-table"
    bordered
    :scroll="{ x: 880 }"
  >
    <template #bodyCell="{ column, record, index }">
      <template v-if="column.key === 'pageNo'">
        <span>{{ record.pageNo ?? '—' }}</span>
      </template>
      <template v-else-if="column.key === 'templateFile'">
        <div class="exam-template-page-table__file">
          <span v-if="record.templateFileId" class="exam-template-page-table__file-name">
            {{ record.templateFileName }}
          </span>
          <UiTag v-else tone="orange" size="sm">未上传</UiTag>
          <a-space v-if="record.templateFileId" :size="4">
            <UiButton size="sm" variant="ghost" @click="openPreview(record)">预览</UiButton>
          </a-space>
        </div>
      </template>
      <template v-else-if="column.key === 'widthPx'">
        <span>{{ record.widthPx ?? '—' }}</span>
      </template>
      <template v-else-if="column.key === 'heightPx'">
        <span>{{ record.heightPx ?? '—' }}</span>
      </template>
      <template v-else-if="column.key === 'pageActions'">
        <a-space v-if="!readOnly">
          <UiButton size="sm" variant="ghost" @click="openEdit(index)">编辑</UiButton>
          <UiButton size="sm" variant="ghost" @click="emitRemove(index)">删除</UiButton>
        </a-space>
        <span v-else class="exam-template-page-table__readonly-hint">—</span>
      </template>
    </template>
  </UiDataTable>

  <a-modal
    v-model:open="editOpen"
    :title="editIndex === null ? '新增页面' : `编辑第 ${pageDraft.pageNo ?? ''} 页`"
    :destroy-on-close="true"
    :mask-closable="false"
    width="520px"
    @ok="handleEditOk"
  >
    <a-form layout="vertical">
      <a-form-item label="页号" required>
        <a-input-number v-model:value="pageDraft.pageNo" :min="1" style="width: 100%" />
      </a-form-item>
      <a-form-item label="模板文件" required>
        <div class="exam-template-page-table__edit-file">
          <span v-if="pageDraft.templateFileId" class="exam-template-page-table__file-name">
            {{ pageDraft.templateFileName }}
          </span>
          <UiTag v-else tone="orange" size="sm">未上传</UiTag>
          <a-upload
            :show-upload-list="false"
            :before-upload="handleUploadInModal"
            accept="image/*,application/pdf"
          >
            <UiButton size="sm" variant="outline" :loading="pageDraft.uploading">
              <template #icon><UploadOutlined /></template>
              {{ pageDraft.templateFileId ? '替换' : '上传' }}
            </UiButton>
          </a-upload>
          <UiButton
            v-if="pageDraft.templateFileId"
            size="sm"
            variant="ghost"
            @click="openPreview(pageDraft)"
          >
            预览
          </UiButton>
        </div>
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="宽度（px）" required>
            <a-input-number v-model:value="pageDraft.widthPx" :min="1" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="高度（px）" required>
            <a-input-number v-model:value="pageDraft.heightPx" :min="1" style="width: 100%" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>

  <a-modal
    v-model:open="previewOpen"
    title="模板文件预览"
    :footer="null"
    width="min(92vw, 960px)"
    :destroy-on-close="true"
    @cancel="closePreview"
  >
    <a-spin :spinning="previewLoading">
      <div v-if="previewError" class="exam-template-page-table__preview-error">
        {{ previewError }}
      </div>
      <template v-else-if="previewUrl">
        <img
          v-if="previewKind === 'image'"
          :src="previewUrl"
          :alt="previewFileName"
          class="exam-template-page-table__preview-image"
        />
        <iframe
          v-else-if="previewKind === 'pdf'"
          :src="previewUrl"
          class="exam-template-page-table__preview-pdf"
          :title="previewFileName"
        />
        <div v-else class="exam-template-page-table__preview-unsupported">
          当前文件类型暂不支持内嵌预览，请下载后查看。
          <UiButton size="sm" variant="outline" @click="openPreviewInNewTab">新窗口打开</UiButton>
        </div>
      </template>
    </a-spin>
  </a-modal>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import message from 'ant-design-vue/es/message'
import { reactive, ref } from 'vue'
import { getImageBlobUrl, uploadFile } from '@/apis/edu/file-management'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { requireUploadFileName } from '@/utils/mark-storage-file'

export interface ExamTemplatePageRow {
  rowKey: string
  pageNo?: number
  templateFileId?: string
  templateFileName?: string
  widthPx?: number
  heightPx?: number
  uploading?: boolean
}

const pages = defineModel<ExamTemplatePageRow[]>('pages', { required: true })

const props = withDefaults(
  defineProps<{
    /** 只读模式：隐藏页级编辑/删除，用于考试已开印或已扫描后的模板页。 */
    readOnly?: boolean
  }>(),
  { readOnly: false },
)

const emit = defineEmits<{
  remove: [index: number]
}>()

const columns: ColumnType<ExamTemplatePageRow>[] = [
  { title: '页号', key: 'pageNo', width: 88 },
  { title: '模板文件', key: 'templateFile', width: 360 },
  { title: '宽度（px）', key: 'widthPx', width: 120 },
  { title: '高度（px）', key: 'heightPx', width: 120 },
  { title: '操作', key: 'pageActions', width: 140, fixed: 'right' },
]

const editOpen = ref(false)
const editIndex = ref<number | null>(null)
const pageDraft = reactive<ExamTemplatePageRow>({
  rowKey: '',
  pageNo: undefined,
  templateFileId: undefined,
  templateFileName: undefined,
  widthPx: undefined,
  heightPx: undefined,
  uploading: false,
})

const previewOpen = ref(false)
const previewLoading = ref(false)
const previewError = ref('')
const previewUrl = ref('')
const previewKind = ref<'image' | 'pdf' | 'other'>('image')
const previewFileName = ref('')
let previewObjectUrl: string | null = null

function resetDraft(): void {
  pageDraft.rowKey = ''
  pageDraft.pageNo = undefined
  pageDraft.templateFileId = undefined
  pageDraft.templateFileName = undefined
  pageDraft.widthPx = undefined
  pageDraft.heightPx = undefined
  pageDraft.uploading = false
}

function openEdit(index: number): void {
  if (props.readOnly) return
  const row = pages.value[index]
  if (!row) {
    return
  }
  editIndex.value = index
  pageDraft.rowKey = row.rowKey
  pageDraft.pageNo = row.pageNo
  pageDraft.templateFileId = row.templateFileId
  pageDraft.templateFileName = row.templateFileName
  pageDraft.widthPx = row.widthPx
  pageDraft.heightPx = row.heightPx
  pageDraft.uploading = false
  editOpen.value = true
}

function openEditForNew(row: ExamTemplatePageRow): void {
  editIndex.value = pages.value.findIndex((item) => item.rowKey === row.rowKey)
  openEdit(editIndex.value)
}

function handleEditOk(): void {
  if (!pageDraft.pageNo || pageDraft.pageNo <= 0) {
    message.error('请填写页号')
    return
  }
  if (!pageDraft.templateFileId || !pageDraft.templateFileName?.trim()) {
    message.error('请上传模板文件')
    return
  }
  if (!pageDraft.widthPx || pageDraft.widthPx <= 0) {
    message.error('请填写宽度像素')
    return
  }
  if (!pageDraft.heightPx || pageDraft.heightPx <= 0) {
    message.error('请填写高度像素')
    return
  }
  const index = editIndex.value
  if (index === null || index < 0 || !pages.value[index]) {
    message.error('页面行不存在')
    return
  }
  const target = pages.value[index]
  target.pageNo = pageDraft.pageNo
  target.templateFileId = pageDraft.templateFileId
  target.templateFileName = pageDraft.templateFileName.trim()
  target.widthPx = pageDraft.widthPx
  target.heightPx = pageDraft.heightPx
  editOpen.value = false
  editIndex.value = null
  resetDraft()
}

function emitRemove(index: number): void {
  if (props.readOnly) return
  emit('remove', index)
}

async function handleUploadInModal(file: File): Promise<boolean> {
  pageDraft.uploading = true
  try {
    const result = await uploadFile(file, { businessType: 'mark-exam-template' })
    pageDraft.templateFileId = result.id
    pageDraft.templateFileName = requireUploadFileName(result, file)
    message.success('模板文件已上传')
  } catch (error) {
    showUserError(error, '模板文件上传失败')
  } finally {
    pageDraft.uploading = false
  }
  return false
}

function closePreview(): void {
  previewOpen.value = false
  previewError.value = ''
  previewFileName.value = ''
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = null
  }
  previewUrl.value = ''
}

function detectPreviewKind(fileName: string, blob: Blob): 'image' | 'pdf' | 'other' {
  const lower = fileName.toLowerCase()
  if (blob.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(lower)) {
    return 'image'
  }
  if (blob.type === 'application/pdf' || lower.endsWith('.pdf')) {
    return 'pdf'
  }
  return 'other'
}

function reportPreviewFailure(error: unknown, fallback: string): void {
  previewError.value = getUserErrorMessage(error, fallback)
  showUserError(error, fallback)
}

async function openPreview(
  row: Pick<ExamTemplatePageRow, 'templateFileId' | 'templateFileName'>,
): Promise<void> {
  if (!row.templateFileId) {
    return
  }
  if (!row.templateFileName?.trim()) {
    message.error('模板文件缺少文件名，无法预览')
    return
  }
  closePreview()
  previewOpen.value = true
  previewLoading.value = true
  previewFileName.value = row.templateFileName.trim()
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      reportPreviewFailure(null, '未登录或登录已过期，无法预览模板文件')
      return
    }
    const requestUrl = new URL('/api/storage/filesystem/download', window.location.origin)
    requestUrl.searchParams.set('nodeId', row.templateFileId)
    const response = await fetch(requestUrl.toString(), {
      method: 'GET',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      reportPreviewFailure(null, '模板文件加载失败')
      return
    }
    const blob = await response.blob()
    previewKind.value = detectPreviewKind(previewFileName.value, blob)
    if (previewKind.value === 'image') {
      previewObjectUrl = await getImageBlobUrl(row.templateFileId)
      previewUrl.value = previewObjectUrl
    } else {
      previewObjectUrl = URL.createObjectURL(blob)
      previewUrl.value = previewObjectUrl
    }
  } catch (error) {
    reportPreviewFailure(error, '模板文件预览失败')
  } finally {
    previewLoading.value = false
  }
}

function openPreviewInNewTab(): void {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank', 'noopener,noreferrer')
  }
}

defineExpose({ openEditForNew })
</script>

<style lang="scss" scoped>
.exam-template-page-table {
  &__file {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__file-name {
    font-size: 13px;
    color: var(--ant-color-text);
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__edit-file {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__preview-image {
    display: block;
    max-width: 100%;
    max-height: 72vh;
    margin: 0 auto;
  }

  &__preview-pdf {
    width: 100%;
    height: 72vh;
    border: 0;
  }

  &__preview-error,
  &__preview-unsupported {
    padding: 24px;
    text-align: center;
    color: var(--ant-color-text-secondary);
    font-size: 14px;
  }
}
</style>
