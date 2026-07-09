<template>
  <StageWorkbenchShell class="ledger-page">
    <template #context>
      <ContextBar layout="workbench">
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId && ledger" #signal>
      <SignalBand
        variant="tiles"
        compact
        :metrics="ledgerSignalMetrics"
        @metric-click="handleLedgerMetricClick"
      />
    </template>

    <UiEmpty v-if="!selectedExamId" description="未进入考试工作台" class="ledger-page__empty" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard class="ledger-page__surface">
        <LedgerSummaryCard
          :ledger="ledger"
          :loading="loadingDetail"
          :balancing="balancing"
          @balance="handleBalance"
        />
        <DuplicateResolutionCard
          ref="duplicateCardRef"
          :exam-id="selectedExamId"
          :pending-duplicate-count="ledger?.pendingDuplicateCount ?? 0"
          @resolve="openResolve"
        />
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>

  <DuplicateResolveModal
    v-model:open="resolveOpen"
    :exam-id="selectedExamId || ''"
    :resolution="resolveTarget"
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
  normalizeImageLedgerDetail,
} from '@/apis/mark/image-ledger'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
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
      unit: ` / ${data.expectedPageCount}`,
      tone: data.scannedPageCount >= data.expectedPageCount ? 'green' : 'blue',
      clickable: data.scannedPageCount < data.expectedPageCount,
      helper: data.scannedPageCount < data.expectedPageCount ? '前往手动补录' : undefined,
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
  if (!data || data.scannedPageCount >= data.expectedPageCount) return
  void router.push({
    name: 'TeacherExamWorkspaceScanManualEntry',
    params: { examId: selectedExamId.value },
  })
}

async function loadDetail(): Promise<void> {
  if (!selectedExamId.value) return
  loadingDetail.value = true
  try {
    ledger.value = normalizeImageLedgerDetail(
      await getImageLedgerDetail({ examId: selectedExamId.value }),
    )
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
    await executeImageLedgerBalance({ examId: selectedExamId.value })
    message.success('账本对账已执行')
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
    padding: 60px 0;
  }

  &__surface {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-4);
  }
}
</style>
