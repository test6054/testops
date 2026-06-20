<template>
  <a-modal
    v-model:open="visible"
    title="Excel 批量导入答卷"
    :width="560"
    :footer="null"
    @cancel="handleClose"
  >
    <!-- 上传区 -->
    <template v-if="!importResult">
      <a-upload-dragger :before-upload="beforeUpload" :show-upload-list="false" accept=".xlsx,.xls">
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">点击或拖拽 Excel 文件到此处</p>
        <p class="ant-upload-hint">支持 .xlsx / .xls 格式</p>
      </a-upload-dragger>

      <div v-if="selectedFile" class="selected-file">
        <span>已选择：{{ selectedFile.name }}</span>
        <UiButton
          variant="primary"
          size="sm"
          :loading="uploading"
          class="import-response-excel__upload-btn"
          @click="handleUpload"
        >
          开始导入
        </UiButton>
      </div>
    </template>

    <!-- 导入结果 -->
    <template v-else>
      <a-result
        :status="importResult.skippedCount > 0 ? 'warning' : 'success'"
        :title="`导入完成：成功 ${importResult.successCount} 条，跳过 ${importResult.skippedCount} 条`"
      >
        <template #extra>
          <p>总行数：{{ importResult.totalRows }}</p>

          <template v-if="importResult.errors.length > 0">
            <a-divider>错误详情</a-divider>
            <UiDataTable
              pagination-mode="client"
              :columns="errorColumns"
              :data-source="pagedImportErrors"
              v-model:current="importErrorPage"
              v-model:page-size="importErrorPageSize"
              :total="importResult.errors.length"
              :show-size-changer="false"
              row-key="rowIndex"
              size="small"
              flat
            />
          </template>

          <UiButton variant="primary" size="sm" class="import-response-excel__done-btn" @click="handleClose">
            完成
          </UiButton>
        </template>
      </a-result>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import type { IndirectResponseImportResult } from '@/apis/quality/indirect-evaluation'
import { InboxOutlined } from '@ant-design/icons-vue'
import { computed, ref } from 'vue'
import { indirectResponseApi } from '@/apis/quality/indirect-evaluation'
import { UiButton, UiDataTable } from '@/components/ui-guide/ui'

const props = defineProps<{
  open: boolean
  formId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'imported'): void
}>()

const visible = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
})

const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const importResult = ref<IndirectResponseImportResult | null>(null)

const errorColumns = [
  { title: '行号', dataIndex: 'rowIndex', width: 60 },
  { title: '题项编码', dataIndex: 'itemCode', width: 100 },
  { title: '导入处理说明', dataIndex: 'errorMessage' },
]

const importErrorPage = ref(1)
const importErrorPageSize = ref(10)

const pagedImportErrors = computed(() => {
  if (!importResult.value) return []
  const start = (importErrorPage.value - 1) * importErrorPageSize.value
  return importResult.value.errors.slice(start, start + importErrorPageSize.value)
})

function beforeUpload(file: File) {
  selectedFile.value = file
  return false // 阻止自动上传
}

async function handleUpload() {
  if (!selectedFile.value || !props.formId) return

  uploading.value = true
  try {
    const result = await indirectResponseApi.importExcel(props.formId, selectedFile.value)
    importResult.value = result
    if (result.successCount > 0) {
      emit('imported')
    }
  } finally {
    uploading.value = false
  }
}

function handleClose() {
  selectedFile.value = null
  importResult.value = null
  visible.value = false
}
</script>

<style scoped>
.selected-file {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.import-response-excel__done-btn {
  margin-top: 16px;
}
</style>
