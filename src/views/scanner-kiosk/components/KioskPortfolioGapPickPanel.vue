<script setup lang="ts">
import type { PortfolioGapTaskSummaryInternalVO } from '@/apis/mark/scanner-kiosk'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createAdhocDispatchTicket, pageKioskPortfolioGapTasks } from '@/apis/mark/scanner-kiosk'
import { PortfolioGapTaskStatusDescription } from '@/apis/portfolio/enums'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { PortfolioCollectModeCode } from '@/types/enums/portfolio-collect-mode-enum'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
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
const tasks = ref<PortfolioGapTaskSummaryInternalVO[]>([])

const canPick = computed(() => Boolean(props.scannerDeviceId && props.scannerStationId))

const columns = [
  { title: '分类', key: 'categoryName', dataIndex: 'categoryName', width: 120 },
  { title: '课程维度', key: 'courseScope', width: 140 },
  { title: '任务', key: 'taskTitle', dataIndex: 'taskTitle', ellipsis: true },
  { title: '教师', key: 'teacherId', dataIndex: 'teacherId', width: 120 },
  { title: '状态', key: 'taskStatus', dataIndex: 'taskStatus', width: 96 },
  { title: '截止', key: 'dueTime', dataIndex: 'dueTime', width: 160 },
  { title: '操作', key: 'actions', width: 88 },
]

watch(
  () => props.open,
  (open) => {
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
    tasks.value = page.list
    total.value = page.total
  } catch (error) {
    errorMessage.value = getUserErrorMessage(error)
    tasks.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handlePageChange(pageEvent: { current: number, pageSize: number }) {
  pageNum.value = pageEvent.current
  pageSize.value = pageEvent.pageSize
  void loadTasks()
}

function gapStatusLabel(status: PortfolioGapTaskSummaryInternalVO['taskStatus']) {
  return strictEnumLabel(PortfolioGapTaskStatusDescription, status, 'taskStatus')
}

function gapCourseScopeLabel(row: PortfolioGapTaskSummaryInternalVO): string {
  if (!row.courseCode) {
    return '—'
  }
  const parts = [row.courseCode]
  if (row.academicYear) {
    parts.push(row.academicYear)
  }
  if (row.semester) {
    parts.push(`第${row.semester}学期`)
  }
  return parts.join(' · ')
}

async function openGapScan(row: PortfolioGapTaskSummaryInternalVO) {
  if (!canPick.value) {
    message.error('工位未激活，无法进入补采扫描')
    return
  }
  pickingTaskId.value = row.id
  try {
    const created = await createAdhocDispatchTicket({
      taskKind: ScanTaskKindCode.PORTFOLIO_COLLECT,
      collectMode: PortfolioCollectModeCode.GAP_ATTACHMENT,
      teacherId: row.teacherId,
      gapTaskId: row.id,
      categoryId: row.categoryId,
      scannerDeviceId: props.scannerDeviceId,
      scannerStationId: props.scannerStationId,
    })
    if (!created.ticket?.ticketId) {
      showUserError(null, '创建档案袋派单失败')
      return
    }
    emit('update:open', false)
    void router.push(`/scanner-kiosk/dispatch/${created.ticket.ticketId}`)
  } catch (error) {
    message.error(getUserErrorMessage(error))
  } finally {
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
      展示仍开放的补采任务。选定后将创建派单 ticket 并进入认知确认。
    </p>
    <WorkbenchSurfaceCard flush>
      <template #toolbar>
        <a-input-search
          v-model:value="keyword"
          placeholder="搜索任务标题"
          allow-clear
          class="kiosk-portfolio-pick__search"
          @search="
            () => {
              pageNum = 1
              loadTasks()
            }
          "
        />
        <UiButton size="sm" variant="outline" :disabled="loading" @click="loadTasks">
          刷新
        </UiButton>
      </template>

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
        :sticky-header="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'categoryName'">
            {{ record.categoryName || '—' }}
          </template>
          <template v-else-if="column.key === 'courseScope'">
            {{ gapCourseScopeLabel(record) }}
          </template>
          <template v-else-if="column.key === 'taskStatus'">
            <UiTag tone="blue" size="sm">{{ gapStatusLabel(record.taskStatus) }}</UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[
                { key: 'pick', label: '开单', disabled: !canPick || pickingTaskId === record.id },
              ]"
              split
              @action="() => openGapScan(record)"
            />
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>
  </a-drawer>
</template>

<style scoped>
.kiosk-portfolio-pick__hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--nybc-text-secondary, #595959);
}
.kiosk-portfolio-pick__search {
  flex: 1;
  min-width: 0;
}
.kiosk-portfolio-pick__error {
  margin: 0 0 12px;
  padding: 0 var(--dp-space-5);
  color: #cf1322;
}
</style>
