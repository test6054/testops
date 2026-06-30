<script setup lang="ts">
import type { ScannerKioskPortfolioGapTaskSummaryVO } from '@/apis/mark/scanner-kiosk'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createAdhocDispatchTicket, pageKioskPortfolioGapTasks } from '@/apis/mark/scanner-kiosk'
import { PORTFOLIO_GAP_TASK_STATUS_LABEL } from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { getUserErrorMessage } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  open: boolean
  scannerDeviceId: string
  scannerStationId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const router = useRouter()
const loading = ref(false)
const pickingTaskId = ref('')
const errorMessage = ref('')
const keyword = ref('')
const pageNum = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tasks = ref<ScannerKioskPortfolioGapTaskSummaryVO[]>([])

const canPick = computed(() =>
  Boolean(props.scannerDeviceId && props.scannerStationId),
)

const columns = [
  { title: '分类', key: 'categoryName', dataIndex: 'categoryName', width: 120 },
  { title: '任务', key: 'taskTitle', dataIndex: 'taskTitle', ellipsis: true },
  { title: '教师', key: 'teacherId', dataIndex: 'teacherId', width: 120 },
  { title: '状态', key: 'taskStatus', dataIndex: 'taskStatus', width: 96 },
  { title: '截止', key: 'dueTime', dataIndex: 'dueTime', width: 160 },
  { title: '操作', key: 'actions', width: 88 },
]

watch(
  () => props.open,
  open => {
    if (open) {
      pageNum.value = 1
      keyword.value = ''
      void loadTasks()
    }
  },
)

async function loadTasks() {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await pageKioskPortfolioGapTasks({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      openOnly: true,
      keyword: keyword.value.trim() || undefined,
    })
    tasks.value = readPageList(page, '补采待办加载失败，请稍后重试')
    total.value = readPageTotal(page, '补采待办总数加载失败，请稍后重试')
  }
  catch (error) {
    errorMessage.value = getUserErrorMessage(error)
    tasks.value = []
    total.value = 0
  }
  finally {
    loading.value = false
  }
}

function handlePageChange(pageEvent: { current: number, pageSize: number }) {
  pageNum.value = pageEvent.current
  pageSize.value = pageEvent.pageSize
  void loadTasks()
}

function gapStatusLabel(status: ScannerKioskPortfolioGapTaskSummaryVO['taskStatus']) {
  return strictEnumLabel(PORTFOLIO_GAP_TASK_STATUS_LABEL, status, 'taskStatus')
}

async function openGapScan(row: ScannerKioskPortfolioGapTaskSummaryVO) {
  if (!canPick.value) {
    message.error('工位未激活，无法进入补采扫描')
    return
  }
  pickingTaskId.value = row.id
  try {
    const created = await createAdhocDispatchTicket({
      taskKind: 'PORTFOLIO_COLLECT',
      collectMode: 'GAP_ATTACHMENT',
      teacherId: row.teacherId,
      gapTaskId: row.id,
      categoryId: row.categoryId,
      scannerDeviceId: props.scannerDeviceId,
      scannerStationId: props.scannerStationId,
    })
    if (!created.ticket?.ticketId) {
      throw new Error('创建档案袋派单失败')
    }
    emit('update:open', false)
    void router.push(`/scanner-kiosk/dispatch/${created.ticket.ticketId}`)
  }
  catch (error) {
    message.error(getUserErrorMessage(error))
  }
  finally {
    pickingTaskId.value = ''
  }
}
</script>

<template>
  <a-drawer
    :open="open"
    title="临时扫描 · 档案袋补采待办"
    width="880"
    destroy-on-close
    @update:open="emit('update:open', $event)"
  >
    <p class="kiosk-portfolio-pick__hint">
      展示当前扫描员授权范围内、仍开放的补采任务。选定后将创建派单 ticket 并进入认知确认。
    </p>
    <div class="kiosk-portfolio-pick__toolbar">
      <a-input-search
        v-model:value="keyword"
        placeholder="搜索任务标题"
        allow-clear
        @search="() => { pageNum = 1; loadTasks() }"
      />
      <UiButton size="sm" variant="outline" :disabled="loading" @click="loadTasks">
        刷新
      </UiButton>
    </div>
    <p v-if="errorMessage" class="kiosk-portfolio-pick__error">{{ errorMessage }}</p>
    <UiDataTable
      pagination-mode="server"
      :columns="columns"
      :data-source="tasks"
      :loading="loading"
      :total="total"
      :current="pageNum"
      :page-size="pageSize"
      row-key="id"
      size="middle"
      flat
      @page-change="handlePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'categoryName'">
          {{ record.categoryName || '—' }}
        </template>
        <template v-else-if="column.key === 'taskStatus'">
          <UiTag tone="blue" size="sm">{{ gapStatusLabel(record.taskStatus) }}</UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiButton
            size="sm"
            variant="primary"
            :loading="pickingTaskId === record.id"
            :disabled="!canPick"
            @click="openGapScan(record)"
          >
            开单
          </UiButton>
        </template>
      </template>
    </UiDataTable>
  </a-drawer>
</template>

<style scoped>
.kiosk-portfolio-pick__hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--nybc-text-secondary, #595959);
}
.kiosk-portfolio-pick__toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.kiosk-portfolio-pick__toolbar :deep(.ant-input-search) {
  flex: 1;
}
.kiosk-portfolio-pick__error {
  margin: 0 0 12px;
  color: #cf1322;
}
</style>
