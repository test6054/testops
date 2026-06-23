<template>
  <a-card :bordered="false" size="small">
    <template #title>
      <a-space>
        <span>待处置重复影像</span>
        <UiTag tone="orange">待处置 {{ pendingCount }}</UiTag>
      </a-space>
    </template>

    <UiDataTable
      pagination-mode="client"
      class="student-detail-table__data-table"
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :page-size="20"
      :total="rows.length"
      flat
      row-key="id"
      size="small"
      empty-kind="first-run"
      empty-description="暂无待处置重复影像，扫描对账正常"
    >
      <template #bodyCell="{ column, index }">
        <template v-if="column.key === 'resolutionStatus'">
          <UiTag :tone="duplicateStatusColor(rows[index])">
            {{ duplicateStatusLabel(rows[index]) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTextAction @click="$emit('resolve', rows[index])">处置</UiTextAction>
        </template>
      </template>
    </UiDataTable>
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamPaperDuplicateResolutionVO } from '@/apis/mark/image-ledger'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, ref, watch } from 'vue'
import {
  DUPLICATE_RESOLUTION_STATUS_COLOR,
  DUPLICATE_RESOLUTION_STATUS_LABEL,
  listPendingDuplicates,
} from '@/apis/mark/image-ledger'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'DuplicateResolutionCard' })

const props = defineProps<{ examId: string }>()

defineEmits<{ (e: 'resolve', record: ExamPaperDuplicateResolutionVO): void }>()

const rows = ref<ExamPaperDuplicateResolutionVO[]>([])
const loading = ref(false)

const columns: ColumnType<ExamPaperDuplicateResolutionVO>[] = [
  { title: '页面哈希', dataIndex: 'pageHash', key: 'pageHash', width: 220, ellipsis: true },
  { title: '基准扫描页', dataIndex: 'firstPageId', key: 'firstPageId', width: 120 },
  { title: '重复扫描页', dataIndex: 'secondPageId', key: 'secondPageId', width: 120 },
  {
    title: '基准试卷',
    dataIndex: 'firstPaperInstanceId',
    key: 'firstPaperInstanceId',
    width: 140,
  },
  {
    title: '重复试卷',
    dataIndex: 'secondPaperInstanceId',
    key: 'secondPaperInstanceId',
    width: 140,
  },
  { title: '状态', key: 'resolutionStatus', width: 100 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
]

// helper 严格 typed 接收后端 API 对象 ExamPaperDuplicateResolutionVO。
function duplicateStatusColor(row: ExamPaperDuplicateResolutionVO): BadgeTone {
  return strictEnumTone(DUPLICATE_RESOLUTION_STATUS_COLOR, row.resolutionStatus, '重复影像处置状态')
}

function duplicateStatusLabel(row: ExamPaperDuplicateResolutionVO): string {
  return strictEnumLabel(
    DUPLICATE_RESOLUTION_STATUS_LABEL,
    row.resolutionStatus,
    '重复影像处置状态',
  )
}

const pendingCount = computed(
  () => rows.value.filter((r) => r.resolutionStatus === 'PENDING').length,
)

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    rows.value = await listPendingDuplicates({ examId: props.examId })
  } catch (e) {
    showUserError(e, '重复扫描记录加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.examId,
  () => {
    void reload()
  },
  { immediate: true },
)

defineExpose({ reload })
</script>
