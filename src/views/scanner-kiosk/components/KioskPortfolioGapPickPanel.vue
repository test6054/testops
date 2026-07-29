<script setup lang="ts">
import type { PortfolioGapTaskSummaryInternalVO } from '@/apis/mark/scanner-kiosk'
import { createAdhocDispatchTicket, pageKioskPortfolioGapTasks } from '@/apis/mark/scanner-kiosk'
import { CalendarClock, RefreshCw, UserRound } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PortfolioGapTaskStatusDescription } from '@/apis/portfolio/enums'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSearchBox from '@/components/ui-guide/ui/SearchBox.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { PortfolioCollectModeCode } from '@/types/enums/portfolio-collect-mode-enum'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import {
  getUserErrorMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  open: boolean
  scannerDeviceId: string
  scannerStationId: string
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const router = useRouter()
const loading = ref(false)
const pickingTaskId = ref('')
const errorMessage = ref('')
const keyword = ref('')
const pageNum = ref(1)
const pageSize = 8
const total = ref(0)
const tasks = ref<PortfolioGapTaskSummaryInternalVO[]>([])

const canPick = computed(() => Boolean(props.scannerDeviceId) && Boolean(props.scannerStationId))
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

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
      pageSize,
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

function gapStatusLabel(status: PortfolioGapTaskSummaryInternalVO['taskStatus']) {
  return strictEnumLabel(PortfolioGapTaskStatusDescription, status, '补采任务状态')
}

function gapCourseScopeLabel(row: PortfolioGapTaskSummaryInternalVO): string {
  if (!row.courseCode) {
    return '非课程维度'
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

function taskContractIssue(row: PortfolioGapTaskSummaryInternalVO): string {
  if (!row.teacherName?.trim()) {
    return '教师姓名缺失'
  }
  if (!row.categoryName?.trim()) {
    return '档案分类缺失'
  }
  if (!row.taskTitle?.trim()) {
    return '任务名称缺失'
  }
  return ''
}

async function changePage(nextPage: number) {
  pageNum.value = nextPage
  await loadTasks()
}

async function searchTasks() {
  pageNum.value = 1
  await loadTasks()
}

async function openGapScan(row: PortfolioGapTaskSummaryInternalVO) {
  if (canPick.value !== true) {
    showFormValidationMessage('工位未激活，无法进入补采扫描')
    return
  }
  const issue = taskContractIssue(row)
  if (issue) {
    showFormValidationMessage(`任务数据不完整：${issue}，请先在电脑端修正`)
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
      showUserError(null, '现场开单失败')
      return
    }
    emit('update:open', false)
    void router.push(`/scanner-kiosk/dispatch/${created.ticket.ticketId}`)
  } catch (error) {
    showUserError(error, '现场开单失败')
  } finally {
    pickingTaskId.value = ''
  }
}
</script>

<template>
  <UiDrawer
    :open="open"
    title="现场开单 · 教师档案袋"
    width="920"
    destroy-on-close
    @update:open="emit('update:open', $event)"
  >
    <div class="portfolio-pick__toolbar">
      <UiSearchBox
        v-model="keyword"
        placeholder="搜索教师姓名或任务名称"
        allow-clear
        class="portfolio-pick__search"
        @search="searchTasks"
      />
      <UiButton variant="outline" size="lg" :loading="loading" @click="loadTasks">
        <template #icon><RefreshCw :size="20" /></template>
        刷新
      </UiButton>
    </div>

    <p v-if="errorMessage" class="portfolio-pick__error">{{ errorMessage }}</p>
    <div v-else-if="!loading && tasks.length === 0" class="portfolio-pick__empty">
      当前没有开放的档案袋采集任务
    </div>

    <ul v-else class="portfolio-pick__list">
      <li v-for="task in tasks" :key="task.id" class="portfolio-pick__item">
        <div class="portfolio-pick__main">
          <div class="portfolio-pick__head">
            <h3>{{ task.taskTitle || '任务名称缺失' }}</h3>
            <UiTag tone="blue" size="sm">{{ gapStatusLabel(task.taskStatus) }}</UiTag>
          </div>
          <div class="portfolio-pick__identity">
            <span><UserRound :size="18" />{{ task.teacherName || '教师姓名缺失' }}</span>
            <span>{{ task.departmentName || '院系信息缺失' }}</span>
          </div>
          <div class="portfolio-pick__meta">
            <span>{{ task.categoryName || '档案分类缺失' }}</span>
            <span>{{ gapCourseScopeLabel(task) }}</span>
            <span v-if="task.dueTime"><CalendarClock :size="18" />截止 {{ task.dueTime }}</span>
          </div>
          <p v-if="taskContractIssue(task)" class="portfolio-pick__issue">
            数据不完整：{{ taskContractIssue(task) }}
          </p>
        </div>
        <UiButton
          variant="primary"
          size="lg"
          :loading="pickingTaskId === task.id"
          :disabled="canPick !== true || Boolean(taskContractIssue(task))"
          @click="openGapScan(task)"
        >
          开始扫描
        </UiButton>
      </li>
    </ul>

    <div v-if="total > pageSize" class="portfolio-pick__pager">
      <UiButton
        variant="outline"
        size="lg"
        :disabled="pageNum <= 1"
        @click="changePage(pageNum - 1)"
      >
        上一页
      </UiButton>
      <span>第 {{ pageNum }} / {{ totalPages }} 页</span>
      <UiButton
        variant="outline"
        size="lg"
        :disabled="pageNum >= totalPages"
        @click="changePage(pageNum + 1)"
      >
        下一页
      </UiButton>
    </div>
  </UiDrawer>
</template>

<style scoped>
.portfolio-pick__toolbar,
.portfolio-pick__head,
.portfolio-pick__identity,
.portfolio-pick__meta,
.portfolio-pick__pager {
  display: flex;
  align-items: center;
}

.portfolio-pick__toolbar {
  gap: 12px;
  margin-bottom: 18px;
}

.portfolio-pick__search {
  flex: 1;
  min-width: 0;
}

.portfolio-pick__list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.portfolio-pick__item {
  min-height: 150px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  align-items: center;
  gap: 20px;
  padding: 18px 20px;
  border: 1px solid var(--kiosk-divider);
  border-radius: 7px;
  background: var(--kiosk-surface);
}

.portfolio-pick__head {
  justify-content: space-between;
  gap: 12px;
}

.portfolio-pick__head h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
  letter-spacing: 0;
}

.portfolio-pick__identity,
.portfolio-pick__meta {
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 10px;
  color: var(--kiosk-ink-secondary);
}

.portfolio-pick__identity span,
.portfolio-pick__meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.portfolio-pick__issue,
.portfolio-pick__error {
  color: var(--kiosk-danger);
}

.portfolio-pick__issue {
  margin: 8px 0 0;
}

.portfolio-pick__empty {
  min-height: 300px;
  display: grid;
  place-items: center;
  border: 1px solid var(--kiosk-divider);
  color: var(--kiosk-ink-secondary);
}

.portfolio-pick__pager {
  justify-content: center;
  gap: 14px;
  margin-top: 18px;
}
</style>
