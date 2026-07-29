<script setup lang="ts">
import type { ScanDispatchTicketVO } from '@/apis/mark/scanner-dispatch'
import {
  ALL_SCAN_DISPATCH_TICKET_STATUS_CODES,
  ScanDispatchTicketStatusDescription,
} from '@/apis/mark/scanner-dispatch'
import type { DispatchQueueStatusFilterCode } from '@/types/enums/dispatch-queue-status-filter-enum'
import {
  ALL_DISPATCH_QUEUE_STATUS_FILTER_CODES,
  DispatchQueueStatusFilterDescription,
} from '@/types/enums/dispatch-queue-status-filter-enum'
import type { PortfolioCollectModeCode } from '@/types/enums/portfolio-collect-mode-enum'
import { PortfolioCollectModeDescription } from '@/types/enums/portfolio-collect-mode-enum'
import { ArrowLeft, CalendarClock, Inbox, MapPin, RefreshCw, UserRound } from '@lucide/vue'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import {
  ALL_KIOSK_DISPATCH_SCAN_TASK_KIND_CODES,
  KioskDispatchScanTaskKindDescription,
  ScanTaskKindCode,
} from '@/types/enums/scan-task-kind-enum'
import { strictEnumLabel } from '@/utils/strict-enum'
import DocumentKioskActivationGate from './components/DocumentKioskActivationGate.vue'
import { useDocumentKioskBootstrap } from './composables/useDocumentKioskBootstrap'
import { useDispatchQueue } from './core/useDispatchQueue'

function portfolioCollectModeLabel(value: PortfolioCollectModeCode | undefined): string {
  return value
    ? strictEnumLabel(PortfolioCollectModeDescription, value, '档案袋采集模式')
    : '档案袋采集'
}

function ticketStatusLabel(item: { status?: string; failureReason?: string }): string {
  if (item.failureReason) {
    return '处理失败'
  }
  const status = ALL_SCAN_DISPATCH_TICKET_STATUS_CODES.find((code) => code === item.status)
  return status
    ? strictEnumLabel(ScanDispatchTicketStatusDescription, status, '派单票据状态')
    : '状态异常'
}

const router = useRouter()
const route = useRoute()
const queue = useDispatchQueue()
const bootstrap = useDocumentKioskBootstrap()

const statusTabs = ALL_DISPATCH_QUEUE_STATUS_FILTER_CODES.map((key) => ({
  key,
  label: strictEnumLabel(DispatchQueueStatusFilterDescription, key, '派单队列状态筛选'),
}))

function resolveTaskKindFilter(value: unknown) {
  return ALL_KIOSK_DISPATCH_SCAN_TASK_KIND_CODES.find((code) => code === value)
}

function resolveStatusFilter(value: unknown): DispatchQueueStatusFilterCode | undefined {
  return ALL_DISPATCH_QUEUE_STATUS_FILTER_CODES.find((code) => code === value)
}

const queueScopeLabel = computed(() => {
  const kind = queue.taskKind.value
  return kind
    ? strictEnumLabel(KioskDispatchScanTaskKindDescription, kind, '派单任务类型')
    : '全部采集任务'
})

const stationLabel = computed(() => bootstrap.setup.value?.scannerStationId || '工位未就绪')
const scannerLabel = computed(() => {
  const selected = bootstrap.scanners.value.find(
    (scanner) => scanner.localScannerId === bootstrap.selectedScannerId.value,
  )
  return selected?.displayName || selected?.localScannerId || '扫描仪未连接'
})
const totalPages = computed(() => Math.max(1, Math.ceil(queue.total.value / queue.pageSize.value)))

function applyStationContext() {
  const setup = bootstrap.setup.value
  if (setup?.scannerDeviceId && setup.scannerStationId) {
    queue.setStationFilter(setup.scannerDeviceId, setup.scannerStationId)
  }
}

async function refreshQueue() {
  await bootstrap.refreshAgentState()
  applyStationContext()
  if (bootstrap.activation.isActivatedForMarkApis()) {
    await queue.loadQueue()
  }
}

onMounted(async () => {
  queue.pageSize.value = 8
  await bootstrap.initBootstrap()
  applyStationContext()
  const tab = resolveStatusFilter(route.query.tab)
  if (tab) {
    queue.setStatusFilter(tab)
  }
  queue.setTaskKindFilter(resolveTaskKindFilter(route.query.taskKind))
  if (bootstrap.activation.isActivatedForMarkApis()) {
    await queue.loadQueue()
  }
  if (route.query.scanCommitted === '1') {
    void message.success('扫描已提交，可继续处理下一项任务')
    const nextQuery: Record<string, string> = {}
    if (tab) {
      nextQuery.tab = tab
    }
    const taskKind = resolveTaskKindFilter(route.query.taskKind)
    if (taskKind) {
      nextQuery.taskKind = taskKind
    }
    void router.replace({ path: '/scanner-kiosk/queue', query: nextQuery })
  }
})

watch(
  () => bootstrap.activation.isActivatedForMarkApis(),
  (activated) => {
    if (activated) {
      applyStationContext()
      void queue.loadQueue()
    }
  },
)

function openTicket(ticket?: ScanDispatchTicketVO) {
  if (!ticket?.ticketId) {
    return
  }
  void router.push(ticket.kioskDispatchUrl || `/scanner-kiosk/dispatch/${ticket.ticketId}`)
}

function goHub() {
  void router.replace('/scanner-kiosk')
}

async function changeStatusFilter(filter: DispatchQueueStatusFilterCode) {
  queue.setStatusFilter(filter)
  const query: Record<string, string> = { tab: filter }
  if (queue.taskKind.value) {
    query.taskKind = queue.taskKind.value
  }
  void router.replace({ path: '/scanner-kiosk/queue', query })
  await queue.loadQueue()
}

async function changePage(page: number) {
  queue.pageNum.value = page
  await queue.loadQueue()
}

function portfolioCourseScope(item: ScanDispatchTicketVO): string {
  const snapshot = item.portfolioSnapshot
  if (!snapshot?.courseCode) {
    return '非课程维度'
  }
  const parts = [snapshot.courseCode]
  if (snapshot.academicYear) {
    parts.push(snapshot.academicYear)
  }
  if (snapshot.semester) {
    parts.push(`第${snapshot.semester}学期`)
  }
  return parts.join(' · ')
}
</script>

<template>
  <main class="dispatch-queue">
    <DocumentKioskActivationGate
      :can-activate="bootstrap.canActivateAgent.value === true"
      :submit-loading="bootstrap.loading.value === true"
      @submit="bootstrap.activateAgent"
    />

    <header class="dispatch-queue__toolbar">
      <div class="dispatch-queue__nav">
        <UiButton variant="ghost" size="lg" @click="goHub">
          <template #icon><ArrowLeft :size="22" /></template>
          返回
        </UiButton>
        <div class="dispatch-queue__title">
          <h1>扫描任务</h1>
          <span>{{ queueScopeLabel }}</span>
        </div>
      </div>
      <div class="dispatch-queue__station" aria-label="当前工位状态">
        <span class="dispatch-queue__station-dot" />
        <strong>{{ stationLabel }}</strong>
        <span>{{ scannerLabel }}</span>
        <span class="dispatch-queue__count">共 {{ queue.total.value }} 项</span>
      </div>
      <UiButton
        variant="outline"
        size="lg"
        :loading="bootstrap.loading.value || queue.loading.value"
        @click="refreshQueue"
      >
        <template #icon><RefreshCw :size="21" /></template>
        刷新
      </UiButton>
    </header>

    <section class="dispatch-queue__workspace">
      <nav class="dispatch-queue__tabs" aria-label="任务状态">
        <button
          v-for="tab in statusTabs"
          :key="tab.key"
          type="button"
          :class="{ 'is-active': queue.statusFilter.value === tab.key }"
          @click="changeStatusFilter(tab.key)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div
        v-if="queue.errorMessage.value"
        class="dispatch-queue__state dispatch-queue__state--error"
      >
        <strong>任务列表加载失败</strong>
        <p>{{ queue.errorMessage.value }}</p>
        <UiButton variant="primary" size="lg" @click="refreshQueue">
          <template #icon><RefreshCw :size="21" /></template>
          重新加载
        </UiButton>
      </div>

      <UiSkeletonState v-else-if="queue.loading.value === true" :rows="6" compact />

      <ul v-else-if="queue.tickets.value.length > 0" class="dispatch-queue__grid">
        <li v-for="item in queue.tickets.value" :key="item.ticketId">
          <button type="button" class="dispatch-task" @click="openTicket(item)">
            <div class="dispatch-task__head">
              <div class="dispatch-task__kind">
                {{
                  item.taskKind === ScanTaskKindCode.PORTFOLIO_COLLECT ? '教师档案袋' : '考试归档'
                }}
              </div>
              <UiTag :tone="item.failureReason ? 'red' : 'blue'" size="sm">
                {{ ticketStatusLabel(item) }}
              </UiTag>
            </div>

            <template v-if="item.taskKind === ScanTaskKindCode.PORTFOLIO_COLLECT">
              <h2>
                {{
                  item.portfolioSnapshot?.gapTaskTitle ||
                  item.portfolioSnapshot?.categoryName ||
                  '档案材料采集'
                }}
              </h2>
              <div class="dispatch-task__facts">
                <span
                  ><UserRound :size="18" />{{
                    item.portfolioSnapshot?.teacherName || '教师信息缺失'
                  }}</span
                >
                <span>{{ item.portfolioSnapshot?.departmentName || '院系信息缺失' }}</span>
                <span>{{ item.portfolioSnapshot?.categoryName || '分类信息缺失' }}</span>
                <span>{{ portfolioCourseScope(item) }}</span>
              </div>
              <div class="dispatch-task__foot">
                <span>{{ portfolioCollectModeLabel(item.portfolioSnapshot?.collectMode) }}</span>
                <span v-if="item.portfolioSnapshot?.dueTime">
                  <CalendarClock :size="18" />截止 {{ item.portfolioSnapshot.dueTime }}
                </span>
              </div>
            </template>

            <template v-else>
              <h2>{{ item.archiveSnapshot?.archiveTitle || '归档卷信息缺失' }}</h2>
              <div class="dispatch-task__facts">
                <span>{{ item.archiveSnapshot?.courseName || '课程名称缺失' }}</span>
                <span>{{ item.archiveSnapshot?.examName || '考试名称缺失' }}</span>
                <span>
                  {{ item.archiveSnapshot?.academicYear || '学年缺失' }}
                  <template v-if="item.archiveSnapshot?.semester">
                    · 第{{ item.archiveSnapshot.semester }}学期
                  </template>
                </span>
                <span>{{ item.archiveSnapshot?.teachingClassName || '教学班信息缺失' }}</span>
                <span
                  ><MapPin :size="18" />{{
                    item.archiveSnapshot?.physicalStorageLocation || '柜位未登记'
                  }}</span
                >
              </div>
              <div class="dispatch-task__foot">
                <span>进入后核对材料并开始扫描</span>
              </div>
            </template>

            <p v-if="item.failureReason" class="dispatch-task__failure">{{ item.failureReason }}</p>
          </button>
        </li>
      </ul>

      <div v-else class="dispatch-queue__state dispatch-queue__state--empty">
        <Inbox :size="46" stroke-width="1.6" />
        <strong>当前没有待处理任务</strong>
        <p>可刷新任务队列，或返回扫描台从现场开单进入采集。</p>
        <div class="dispatch-queue__state-actions">
          <UiButton variant="outline" size="lg" @click="refreshQueue">
            <template #icon><RefreshCw :size="21" /></template>
            刷新任务
          </UiButton>
          <UiButton variant="primary" size="lg" @click="goHub">现场开单</UiButton>
        </div>
      </div>

      <footer
        v-if="!queue.loading.value && queue.total.value > queue.pageSize.value"
        class="dispatch-queue__pager"
      >
        <UiButton
          variant="outline"
          size="lg"
          :disabled="queue.pageNum.value <= 1"
          @click="changePage(queue.pageNum.value - 1)"
        >
          上一页
        </UiButton>
        <span>第 {{ queue.pageNum.value }} / {{ totalPages }} 页</span>
        <UiButton
          variant="outline"
          size="lg"
          :disabled="queue.pageNum.value >= totalPages"
          @click="changePage(queue.pageNum.value + 1)"
        >
          下一页
        </UiButton>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.dispatch-queue {
  min-height: 100vh;
  background: var(--kiosk-page-bg);
  color: var(--kiosk-ink-primary);
}

.dispatch-queue__toolbar {
  position: sticky;
  top: 0;
  z-index: 5;
  min-height: 80px;
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto auto;
  align-items: center;
  gap: var(--dp-space-block);
  padding: var(--dp-space-component) clamp(20px, 3vw, 48px);
  border-bottom: 1px solid var(--kiosk-divider);
  background: var(--kiosk-surface);
}

.dispatch-queue__nav,
.dispatch-queue__station,
.dispatch-queue__facts,
.dispatch-task__foot,
.dispatch-task__facts span {
  display: flex;
  align-items: center;
}

.dispatch-queue__nav {
  gap: var(--dp-space-component);
  min-width: 0;
}

.dispatch-queue__title {
  min-width: 0;
}

.dispatch-queue__title h1 {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  letter-spacing: 0;
}

.dispatch-queue__title span {
  display: block;
  margin-top: 4px;
  color: var(--kiosk-ink-secondary);
  font-size: var(--dp-font-size-sm);
}

.dispatch-queue__station {
  min-width: 0;
  gap: 10px;
  color: var(--kiosk-ink-secondary);
  white-space: nowrap;
}

.dispatch-queue__station strong {
  color: var(--kiosk-ink-primary);
}

.dispatch-queue__station-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--kiosk-success);
}

.dispatch-queue__count {
  padding-left: 10px;
  border-left: 1px solid var(--kiosk-divider);
}

.dispatch-queue__workspace {
  padding: 22px clamp(20px, 3vw, 48px) 32px;
}

.dispatch-queue__tabs {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(116px, 1fr);
  max-width: 720px;
  min-height: 52px;
  padding: 4px;
  margin-bottom: 20px;
  border: 1px solid var(--kiosk-divider);
  border-radius: 6px;
  background: var(--kiosk-surface-alt);
}

.dispatch-queue__tabs button {
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--kiosk-ink-secondary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}

.dispatch-queue__tabs button.is-active {
  color: var(--dp-color-primary);
  background: var(--kiosk-surface);
  box-shadow: var(--dp-shadow-sm);
}

.dispatch-queue__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dispatch-task {
  width: 100%;
  min-height: 190px;
  display: flex;
  flex-direction: column;
  padding: 20px 22px;
  border: 1px solid var(--kiosk-divider);
  border-radius: 7px;
  background: var(--kiosk-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    border-color var(--dp-duration-fast),
    background-color var(--dp-duration-fast),
    transform var(--dp-duration-fast);
}

.dispatch-task:active {
  transform: scale(0.99);
  background: var(--kiosk-surface-alt);
}

.dispatch-task:focus-visible {
  outline: 3px solid var(--dp-focus-ring);
  outline-offset: 2px;
}

.dispatch-task__head,
.dispatch-task__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.dispatch-task__kind {
  color: var(--dp-color-primary);
  font-size: var(--dp-font-size-sm);
  font-weight: 700;
}

.dispatch-task h2 {
  margin: 12px 0 10px;
  font-size: 19px;
  line-height: 1.35;
  letter-spacing: 0;
}

.dispatch-task__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  color: var(--kiosk-ink-secondary);
  font-size: var(--dp-font-size-sm);
}

.dispatch-task__facts span,
.dispatch-task__foot span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dispatch-task__foot {
  margin-top: auto;
  padding-top: 14px;
  color: var(--kiosk-ink-tertiary);
  font-size: var(--dp-font-size-sm);
}

.dispatch-task__failure {
  margin: 12px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--kiosk-divider);
  color: var(--kiosk-danger);
}

.dispatch-queue__state {
  min-height: 390px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  border: 1px solid var(--kiosk-divider);
  background: var(--kiosk-surface);
  text-align: center;
}

.dispatch-queue__state strong {
  margin-top: 14px;
  font-size: 20px;
}

.dispatch-queue__state p {
  max-width: 560px;
  margin: 8px 0 22px;
  color: var(--kiosk-ink-secondary);
}

.dispatch-queue__state--error {
  color: var(--kiosk-danger);
}

.dispatch-queue__state-actions,
.dispatch-queue__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.dispatch-queue__pager {
  margin-top: 20px;
}

@media (max-width: 980px) {
  .dispatch-queue__toolbar {
    grid-template-columns: 1fr auto;
  }

  .dispatch-queue__station {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .dispatch-queue__grid {
    grid-template-columns: 1fr;
  }
}
</style>
