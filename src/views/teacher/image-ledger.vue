<template>
  <StageWorkbenchShell class="ledger-page">
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="影像账本"
        :subtitle="imageLedgerWorkbenchSubtitle"
      >
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId && (ledger || loadFailed)" #signal>
      <SignalBand
        layout="spotlight"
        compact
        variant="panel"
        :metrics="ledgerSignalMetrics"
        @metric-click="handleLedgerMetricClick"
      />
    </template>

    <ExamSelectGateStrip
      v-if="!selectedExamId"
      class="ledger-page__empty"
      body="请先选择考试后再查看影像账本"
    />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard class="ledger-page__surface">
        <UiAlertStrip
          v-if="loadFailed"
          tone="error"
          title="影像账本加载失败"
          :closable="false"
          dense
          class="ledger-page__blocking-strip"
        />
        <LedgerSummaryCard
          :ledger="ledger"
          :loading="loadingDetail === true && !ledger" :balancing="balancing"
          :load-failed="loadFailed"
          :can-manage-owner-ledger-writes="canManageOwnerLedgerWrites"
          @balance="handleBalance"
        />
        <DuplicateResolutionCard
          :key="selectedExamId"
          ref="duplicateCardRef"
          :exam-id="selectedExamId"
          :pending-duplicate-count="ledger?.pendingDuplicateCount ?? 0"
          :can-manage-owner-ledger-writes="canManageOwnerLedgerWrites"
          @resolve="openResolve"
        />
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>

  <DuplicateResolveModal
    v-model:open="resolveOpen"
    :exam-id="selectedExamId || ''"
    :resolution="resolveTarget"
    :can-manage-owner-ledger-writes="canManageOwnerLedgerWrites"
    @submitted="onChildSubmitted"
  />
</template>

<script lang="ts" setup>
import type {
  ExamPaperDuplicateResolutionVO,
  ImageLedgerDetailResponse,
} from '@/apis/mark/image-ledger'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, nextTick, onActivated, onDeactivated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  executeImageLedgerBalance,
  getImageLedgerDetail,
  LedgerStatusCode,
} from '@/apis/mark/image-ledger'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import mittBus from '@/utils/mitt'
import DuplicateResolutionCard from './image-ledger/DuplicateResolutionCard.vue'
import DuplicateResolveModal from './image-ledger/DuplicateResolveModal.vue'
import LedgerSummaryCard from './image-ledger/LedgerSummaryCard.vue'

defineOptions({ name: 'TeacherImageLedger' })

const { selectedExamId } = useMarkExamContext()
const router = useRouter()
const { examStatusLabel, examStatusTone } = useExamJourneyContextBar('影像账本')
const { refreshSnapshot } = useWorkspaceExamId()

const ledger = ref<ImageLedgerDetailResponse | null>(null)
const duplicateCardRef = ref<InstanceType<typeof DuplicateResolutionCard> | null>(null)
const loadingDetail = ref(false)
const balancing = ref(false)
const loadFailed = ref(false)
const resolveOpen = ref(false)
const resolveTarget = ref<ExamPaperDuplicateResolutionVO | null>(null)
let examLoadGeneration = 0
let refreshListenerActive = false
/** 本页写后本地刷新时抑制 mitt 自回调，避免双载。 */
let suppressSelfRefresh = false

/** MVR-264/324：仅认 BE canManageOwnerLedgerWrites===true；加载失败时禁止写入 */
const canManageOwnerLedgerWrites = computed(
  () => ledger.value?.canManageOwnerLedgerWrites === true && loadFailed.value !== true,
)

/** 任务工作台副标题：扫描进度真数，避免仅考试状态标签。 */
const imageLedgerWorkbenchSubtitle = computed(() => {
  if (loadFailed.value) {
    return '账本加载失败'
  }
  const data = ledger.value
  if (!data) {
    return '账本加载中'
  }
  const parts: string[] = []
  if ((data.pendingDuplicateCount ?? 0) > 0) {
    parts.push(`待消重 ${data.pendingDuplicateCount}`)
  }
  if ((data.missingCandidateCount ?? 0) > 0) {
    parts.push(`缺考生 ${data.missingCandidateCount}`)
  }
  const scanned = data.scannedPageCount
  const expected = data.expectedPageCount
  parts.push(expected != null ? `已扫 ${scanned}/${expected} 页` : `已扫 ${scanned} 页`)
  return parts.join(' · ')
})

const ledgerSignalMetrics = computed((): SignalMetric[] => {
  const failed = loadFailed.value
  const data = ledger.value
  if (!data) {
    if (failed) {
      return [{
        key: 'ledger-unavailable',
        label: '影像账本',
        value: '—',
        tone: 'gray',
        emphasis: 'primary',
      }]
    }
    return []
  }
  const scanned: SignalMetric = {
    key: 'scanned',
    label: '已扫页数',
    value: data.scannedPageCount,
    unit: data.expectedPageCount == null ? '页（页数待推导）' : ` / ${data.expectedPageCount}`,
    tone: data.expectedPageCount != null && data.scannedPageCount >= data.expectedPageCount ? 'green' : 'blue',
    clickable: !failed && data.expectedPageCount != null && data.scannedPageCount < data.expectedPageCount,
    helper: failed
      ? undefined
      : data.expectedPageCount != null && data.scannedPageCount < data.expectedPageCount
        ? '前往手动补录'
        : undefined,
  }
  const bound: SignalMetric = {
    key: 'bound',
    label: '已绑定卷',
    value: data.boundPaperCount,
    unit: ` / ${data.reconstructedPaperCount}`,
    tone: data.boundPaperCount >= data.reconstructedPaperCount ? 'green' : 'orange',
  }
  const duplicate: SignalMetric = {
    key: 'duplicate',
    label: '待处置重复',
    value: data.pendingDuplicateCount,
    unit: '页',
    tone: data.pendingDuplicateCount > 0 ? 'orange' : 'green',
  }
  const missing: SignalMetric = {
    key: 'missing',
    label: '缺考人数',
    value: data.missingCandidateCount,
    unit: '人',
    tone: data.missingCandidateCount > 0 ? 'orange' : 'gray',
  }

  const primaryBase
    = data.pendingDuplicateCount > 0
      ? { ...duplicate, actionLabel: '处置重复', helper: '重复影像待处置' }
      : data.missingCandidateCount > 0
        ? { ...missing, actionLabel: '查看缺考', helper: '缺考名单待确认' }
        : data.boundPaperCount < data.reconstructedPaperCount
          ? { ...bound, actionLabel: '查看绑定', helper: '卷面绑定未完成' }
          : { ...scanned, actionLabel: scanned.clickable ? '手动补录' : undefined }

  const primary: SignalMetric = {
    ...primaryBase,
    emphasis: 'primary',
  }
  const secondaryPool = [scanned, bound, duplicate, missing].map((item) => ({
    ...item,
    emphasis: 'secondary' as const,
  }))
  return [primary, ...secondaryPool.filter((item) => item.key !== primary.key).slice(0, 3)]
})

function handleLedgerMetricClick(key: string): void {
  if (loadFailed.value || key !== 'scanned' || !selectedExamId.value) return
  const data = ledger.value
  if (!data || data.expectedPageCount == null || data.scannedPageCount >= data.expectedPageCount) return
  void router.push({
    name: 'TeacherExamWorkspaceScanManualEntry',
    params: { examId: selectedExamId.value },
  })
}

function clearExamScopedState(): void {
  ledger.value = null
  loadFailed.value = false
  loadingDetail.value = false
  balancing.value = false
  resolveOpen.value = false
  resolveTarget.value = null
}

async function loadDetail(expectedGeneration = examLoadGeneration): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) return
  const hadLedgerForSameExam = ledger.value != null
  loadingDetail.value = true
  loadFailed.value = false
  try {
    const detail = await getImageLedgerDetail({ examId })
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    ledger.value = detail
    loadFailed.value = false
  } catch (e) {
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    if (!hadLedgerForSameExam) {
      ledger.value = null
    }
    loadFailed.value = true
    showUserError(e, '影像账本加载失败')
  } finally {
    if (expectedGeneration === examLoadGeneration && selectedExamId.value === examId) {
      loadingDetail.value = false
    }
  }
}

/**
 * 刷新待处置重复列表：世代/examId 必须在触发子卡请求前校验。
 * 切考时 :key 会重建子卡，需 nextTick 等 ref 就绪；过期 generation 不得误刷新考试。
 */
async function loadDuplicates(expectedGeneration = examLoadGeneration): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    return
  }
  if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
    return
  }
  if (!duplicateCardRef.value) {
    await nextTick()
  }
  if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
    return
  }
  await duplicateCardRef.value?.reload()
}

async function loadAll(expectedGeneration = examLoadGeneration): Promise<void> {
  await loadDetail(expectedGeneration)
  if (expectedGeneration !== examLoadGeneration || selectedExamId.value == null) {
    return
  }
  if (loadFailed.value && !ledger.value) {
    return
  }
  await loadDuplicates(expectedGeneration)
}

function handleScanWorkbenchRefreshEvent(): void {
  if (suppressSelfRefresh || !selectedExamId.value) {
    return
  }
  void loadAll(examLoadGeneration)
}

async function handleBalance(): Promise<void> {
  if (!selectedExamId.value) return
  if (canManageOwnerLedgerWrites.value !== true) {
    return
  }
  if (balancing.value === true) {
    return
  }
  const examId = selectedExamId.value
  const generation = examLoadGeneration
  const confirmed = await confirmAsync({
    title: '执行整体对账',
    content:
      '将重新汇总本考试的扫描页数、试卷重构与绑定进度，并刷新影像账本统计。对账期间请勿并发修改扫描批次或绑定关系。确认继续？',
    type: 'warning',
    okText: '执行对账',
    cancelText: '取消',
  })
  if (!confirmed) {
    return
  }
  // MVR-934：确认后再次认 canManageOwnerLedgerWrites
  if (canManageOwnerLedgerWrites.value !== true) {
    void message.warning('仅本场主考可执行影像账本对账')
    return
  }
  balancing.value = true
  try {
    const detail = await executeImageLedgerBalance({ examId })
    if (generation !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    if (detail?.ledgerStatus === LedgerStatusCode.BALANCED) {
      void message.success('影像账本已平账')
    } else {
      void message.warning(detail?.diagnostic || '对账已执行，仍存在未关闭异常，请处理后再发布成绩')
    }
    await loadAll(generation)
    await refreshSnapshot()
    suppressSelfRefresh = true
    try {
      mittBus.emit('scan-workbench:refresh')
    } finally {
      suppressSelfRefresh = false
    }
  } catch (e) {
    if (generation !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    showUserError(e, '账本对账失败')
  } finally {
    if (generation === examLoadGeneration) {
      balancing.value = false
    }
  }
}

function openResolve(record: ExamPaperDuplicateResolutionVO): void {
  // MVR-391：打开处置弹窗仅认 canManageOwnerLedgerWrites===true
  if (canManageOwnerLedgerWrites.value !== true) {
    void message.warning('仅本场主考可处置重复影像')
    return
  }
  resolveTarget.value = record
  resolveOpen.value = true
}

async function onChildSubmitted(): Promise<void> {
  const generation = examLoadGeneration
  suppressSelfRefresh = true
  try {
    await loadAll(generation)
    await refreshSnapshot()
    mittBus.emit('scan-workbench:refresh')
  } finally {
    suppressSelfRefresh = false
  }
}

watch(
  selectedExamId,
  (v) => {
    const generation = ++examLoadGeneration
    clearExamScopedState()
    loadingDetail.value = Boolean(v)
    if (v) {
      void loadAll(generation)
    }
  },
  { immediate: true },
)

onActivated(() => {
  if (refreshListenerActive) {
    return
  }
  mittBus.on('scan-workbench:refresh', handleScanWorkbenchRefreshEvent)
  refreshListenerActive = true
})

onDeactivated(() => {
  if (!refreshListenerActive) {
    return
  }
  mittBus.off('scan-workbench:refresh', handleScanWorkbenchRefreshEvent)
  refreshListenerActive = false
})
</script>

<style lang="scss" scoped>
.ledger-page {
  &__empty {
    padding: var(--dp-space-component) 0;
  }

  &__surface {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-block);
  }

  &__blocking-strip {
    margin-bottom: var(--dp-space-block);
  }
}
</style>
