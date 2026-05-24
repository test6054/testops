<template>
  <a-card :bordered="false" size="small">
    <template #title>
      <a-space>
        <span>待处置重复影像</span>
        <a-tag color="orange">待处置 {{ pendingCount }}</a-tag>
      </a-space>
    </template>
    <template #extra>
      <a-button :loading="loading" @click="reload">
        <template #icon><ReloadOutlined /></template>刷新
      </a-button>
    </template>
    <!-- D-9 错误态：重复列表加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="loadError"
      :error="loadError"
      title="重复列表加载失败"
      compact
      @retry="reload"
    />
    <UiDataTable
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :page-size="20"
      :total="rows.length"
      flat
      row-key="id"
      size="small"
    >
      <template #bodyCell="{ column, index }">
        <template v-if="column.key === 'resolutionStatus'">
          <a-tag :color="duplicateStatusColor(rows[index])">
            {{ duplicateStatusLabel(rows[index]) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button
            type="link"
            size="small"
            :disabled="rows[index].resolutionStatus !== 'PENDING'"
            @click="$emit('resolve', rows[index])"
          >
            处置
          </a-button>
        </template>
      </template>
    </UiDataTable>
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamPaperDuplicateResolutionVO } from '@/apis/mark/image-ledger'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  DUPLICATE_RESOLUTION_STATUS_COLOR,
  DUPLICATE_RESOLUTION_STATUS_LABEL,
  listPendingDuplicates,
} from '@/apis/mark/image-ledger'
import { UiDataTable, UiErrorRetryPanel } from '@/components/ui-guide/ui'

defineOptions({ name: 'DuplicateResolutionCard' })

const props = defineProps<{ examId: string }>()

defineEmits<{ (e: 'resolve', record: ExamPaperDuplicateResolutionVO): void }>()

const rows = ref<ExamPaperDuplicateResolutionVO[]>([])
const loading = ref(false)
// D-9 错误态：重复列表加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<unknown>(null)

const columns: ColumnType<ExamPaperDuplicateResolutionVO>[] = [
  { title: '页面哈希', dataIndex: 'pageHash', key: 'pageHash', width: 220, ellipsis: true },
  { title: '基准扫描页', dataIndex: 'firstPageId', key: 'firstPageId', width: 120 },
  { title: '重复扫描页', dataIndex: 'secondPageId', key: 'secondPageId', width: 120 },
  {
    title: '基准试卷实例',
    dataIndex: 'firstPaperInstanceId',
    key: 'firstPaperInstanceId',
    width: 140,
  },
  {
    title: '重复试卷实例',
    dataIndex: 'secondPaperInstanceId',
    key: 'secondPaperInstanceId',
    width: 140,
  },
  { title: '状态', key: 'resolutionStatus', width: 100 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
]

// helper 严格 typed 接收后端 API 对象 ExamPaperDuplicateResolutionVO。
function duplicateStatusColor(row: ExamPaperDuplicateResolutionVO): string {
  return row.resolutionStatus ? DUPLICATE_RESOLUTION_STATUS_COLOR[row.resolutionStatus] : 'default'
}

function duplicateStatusLabel(row: ExamPaperDuplicateResolutionVO): string {
  if (row.resolutionStatus) return DUPLICATE_RESOLUTION_STATUS_LABEL[row.resolutionStatus]
  return '-'
}

const pendingCount = computed(
  () => rows.value.filter((r) => r.resolutionStatus === 'PENDING').length,
)

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    rows.value = await listPendingDuplicates({ examId: props.examId })
  } catch (e) {
    loadError.value = e
    message.error(e instanceof Error ? e.message : '重复列表加载失败')
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
</script>
