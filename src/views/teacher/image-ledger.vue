<template>
  <StageWorkbenchShell class="ledger-page">
    <template #context>
      <ContextBar layout="workbench" show-title title="影像账本">
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId && ledger" #signal>
      <SignalBand
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
        <LedgerSummaryCard
          :ledger="ledger"
          :loading="loadingDetail"
          :balancing="balancing"
          :can-manage-owner-ledger-writes="canManageOwnerLedgerWrites"
          @balance="handleBalance"
        />
        <DuplicateResolutionCard
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  executeImageLedgerBalance,
  getImageLedgerDetail,
  LedgerStatusCode,
} from '@/apis/mark/image-ledger'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
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

const { selectedExamId, selectedExam } = useMarkExamContext()
const router = useRouter()
const { examStatusLabel, examStatusTone } = useExamJourneyContextBar('影像账本')
const { refreshSnapshot } = useWorkspaceExamId()

const ledger = ref<ImageLedgerDetailResponse | null>(null)
const duplicateCardRef = ref<InstanceType<typeof DuplicateResolutionCard> | null>(null)
const loadingDetail = ref(false)
const balancing = ref(false)

/** MVR-264/324：仅认 BE canManageOwnerLedgerWrites===true；禁止缺省回退 isExamOwner */
const canManageOwnerLedgerWrites = computed(() => ledger.value?.canManageOwnerLedgerWrites === true)

const ledgerSignalMetrics = computed((): SignalMetric[] => {
  const data = ledger.value
  if (!data) {
    return []
  }
  return [
    {
      key: 'scanned',
      label: '已扫页数',
      value: data.scannedPageCount,
      unit: data.expectedPageCount == null ? '页（页数待推导）' : ` / ${data.expectedPageCount}`,
      tone: data.expectedPageCount != null && data.scannedPageCount >= data.expectedPageCount ? 'green' : 'blue',
      clickable: data.expectedPageCount != null && data.scannedPageCount < data.expectedPageCount,
      helper: data.expectedPageCount != null && data.scannedPageCount < data.expectedPageCount ? '前往手动补录' : undefined,
    },
    {
      key: 'bound',
      label: '已绑定卷',
      value: data.boundPaperCount,
      unit: ` / ${data.reconstructedPaperCount}`,
      tone: data.boundPaperCount >= data.reconstructedPaperCount ? 'green' : 'orange',
    },
    {
      key: 'duplicate',
      label: '待处置重复',
      value: data.pendingDuplicateCount,
      unit: '页',
      tone: data.pendingDuplicateCount > 0 ? 'orange' : 'green',
    },
    {
      key: 'missing',
      label: '缺考人数',
      value: data.missingCandidateCount,
      unit: '人',
      tone: data.missingCandidateCount > 0 ? 'orange' : 'gray',
    },
  ]
})

function handleLedgerMetricClick(key: string): void {
  if (key !== 'scanned' || !selectedExamId.value) return
  const data = ledger.value
  if (!data || data.expectedPageCount == null || data.scannedPageCount >= data.expectedPageCount) return
  void router.push({
    name: 'TeacherExamWorkspaceScanManualEntry',
    params: { examId: selectedExamId.value },
  })
}

async function loadDetail(): Promise<void> {
  if (!selectedExamId.value) return
  loadingDetail.value = true
  try {
    ledger.value = await getImageLedgerDetail({ examId: selectedExamId.value })
  } catch (e) {
    showUserError(e, '影像账本加载失败')
  } finally {
    loadingDetail.value = false
  }
}

async function loadAll(): Promise<void> {
  await loadDetail()
  await duplicateCardRef.value?.reload()
}

async function handleBalance(): Promise<void> {
  if (!selectedExamId.value) return
  if (!canManageOwnerLedgerWrites.value) {
    return
  }
  if (balancing.value) {
    return
  }
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
  balancing.value = true
  try {
    const detail = await executeImageLedgerBalance({ examId: selectedExamId.value })
    if (detail?.ledgerStatus === LedgerStatusCode.BALANCED) {
      void message.success('影像账本已平账')
    } else {
      void message.warning(detail?.diagnostic || '对账已执行，仍存在未关闭异常，请处理后再发布成绩')
    }
    await loadAll()
    await refreshSnapshot()
    mittBus.emit('scan-workbench:refresh')
  } catch (e) {
    showUserError(e, '账本对账失败')
  } finally {
    balancing.value = false
  }
}

const resolveOpen = ref(false)
const resolveTarget = ref<ExamPaperDuplicateResolutionVO | null>(null)

function openResolve(record: ExamPaperDuplicateResolutionVO): void {
  // MVR-391：打开处置弹窗仅认 canManageOwnerLedgerWrites===true
  if (!canManageOwnerLedgerWrites.value) {
    void message.warning('仅本场主考可处置重复影像')
    return
  }
  resolveTarget.value = record
  resolveOpen.value = true
}

async function onChildSubmitted(): Promise<void> {
  await loadAll()
  await refreshSnapshot()
  mittBus.emit('scan-workbench:refresh')
}

watch(
  selectedExamId,
  (v) => {
    if (v) {
      void loadAll()
    } else {
      ledger.value = null
    }
  },
  { immediate: true },
)

onMounted(() => {
  mittBus.on('scan-workbench:refresh', loadAll)
})

onBeforeUnmount(() => {
  mittBus.off('scan-workbench:refresh', loadAll)
})
</script>

<style lang="scss" scoped>
.ledger-page {
  &__empty {
    padding: var(--dp-space-3, 12px) 0;
  }

  &__surface {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-4);
  }
}
</style>
