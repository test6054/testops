<template>
  <UiDataTable
    row-key="archiveRecordId"
    pagination-mode="server"
    :columns="columns"
    :data-source="rows"
    :loading="loading"
    :total="total"
    :current="pageNum"
    :page-size="pageSize"
    :row-class-name="rowClassName"
    empty-title="暂无审核记录"
    empty-description="当前筛选条件下没有档案审核进度，可调整学年或状态后重试。"
    @page-change="handlePageChange"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'recordStatus'">
        <UiTag :tone="archiveRecordStatusTone(record.recordStatus)">
          {{ archiveRecordStatusLabel(record.recordStatus) }}
        </UiTag>
      </template>
      <template v-else-if="column.key === 'reviewTaskStatus'">
        <UiTag v-if="record.reviewTaskStatus" :tone="reviewTaskStatusTone(record.reviewTaskStatus)">
          {{ reviewTaskStatusLabel(record.reviewTaskStatus) }}
        </UiTag>
        <span v-else>—</span>
      </template>
      <template v-else-if="column.key === 'latestRejectReason'">
        {{ record.latestRejectReason || '—' }}
      </template>
    </template>
  </UiDataTable>
</template>

<script lang="ts" setup>
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioArchiveRecordStatusCode,
  PortfolioReviewTaskStatusCode,
} from '@/apis/portfolio/enums'
import {
  PortfolioArchiveRecordStatusDescription,
  PortfolioReviewTaskStatusDescription,
} from '@/apis/portfolio/enums'
import type { PortfolioTeacherReviewStatusRowVO } from '@/apis/portfolio/types'
import {
  PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE,
  PORTFOLIO_REVIEW_TASK_STATUS_TONE,
} from '@/apis/portfolio/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { ref, watch } from 'vue'
import { portfolioReviewStatusApi } from '@/apis/portfolio/review-status'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'PortfolioTeacherReviewStatusTable' })

const props = defineProps<{
  teacherId?: string
  academicYear?: string
  recordStatus?: PortfolioArchiveRecordStatusCode
  highlightRecordId?: string
}>()

const columns: ColumnsType = [
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName' },
  { title: '档案状态', key: 'recordStatus', width: 110, align: 'center' },
  { title: '审核状态', key: 'reviewTaskStatus', width: 110, align: 'center' },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 170, align: 'right' },
  { title: '退回原因', key: 'latestRejectReason' },
]

const loading = ref(false)
const rows = ref<PortfolioTeacherReviewStatusRowVO[]>([])
const pageNum = ref(1)
const pageSize = ref(20)
const total = ref(0)

function archiveRecordStatusLabel(status: PortfolioArchiveRecordStatusCode): string {
  return strictEnumLabel(PortfolioArchiveRecordStatusDescription, status, '档案记录状态')
}

function archiveRecordStatusTone(status: PortfolioArchiveRecordStatusCode): BadgeTone {
  return strictEnumTone(PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE, status, '档案记录状态')
}

function reviewTaskStatusLabel(status: PortfolioReviewTaskStatusCode): string {
  return strictEnumLabel(PortfolioReviewTaskStatusDescription, status, '审核任务状态')
}

function reviewTaskStatusTone(status: PortfolioReviewTaskStatusCode): BadgeTone {
  return strictEnumTone(PORTFOLIO_REVIEW_TASK_STATUS_TONE, status, '审核任务状态')
}

function rowClassName(record: PortfolioTeacherReviewStatusRowVO): string {
  return record.archiveRecordId === props.highlightRecordId
    ? 'portfolio-review-status__row-highlight'
    : ''
}

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioReviewStatusApi.list({
      teacherId: props.teacherId,
      academicYear: props.academicYear,
      recordStatus: props.recordStatus,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    rows.value = page.list
    total.value = page.total
  } catch (error) {
    showUserError(error, '加载审核进度失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(next: { current: number; pageSize: number }) {
  pageNum.value = next.current
  pageSize.value = next.pageSize
  void loadPage()
}

watch(
  () => [props.teacherId, props.academicYear, props.recordStatus],
  () => {
    pageNum.value = 1
    void loadPage()
  },
  { immediate: true },
)

defineExpose({ reload: loadPage })
</script>

<style scoped lang="scss">
:deep(.portfolio-review-status__row-highlight) td {
  background: var(--dp-surface-subtle);
}
</style>
