<template>
  <div class="ledger-page">
    <div v-if="selectedExamId" class="ledger-page__toolbar">
      <UiButton variant="outline" size="sm" @click="goBackToScanLiveMonitor">
        <template #icon><LeftOutlined /></template>
        返回扫描监控
      </UiButton>
      <UiButton
        variant="outline"
        size="sm"
        :loading="loadingDetail"
        @click="loadAll"
      >
        <template #icon><ReloadOutlined /></template>
        刷新
      </UiButton>
    </div>

    <UiEmpty
      v-if="!selectedExamId"
      description="未进入考试工作台"
      class="ledger-page__empty"
    />



    <div v-else class="ledger-page__cards">
      <a-card title="账本概览" :bordered="false" size="small">
        <UiAlertStrip
          v-if="balanceError"
          tone="error"
          title="考试整体对账失败"
          :description="balanceError"
          dense
          class="ledger-page__balance-error"
        />
        <LedgerSummaryCard
          :ledger="ledger"
          :loading="loadingDetail"
          :balancing="balancing"
          @balance="handleBalance"
        />
      </a-card>
      <DuplicateResolutionCard ref="duplicateCardRef" :exam-id="selectedExamId" @resolve="openResolve" />
    </div>
  </div>

  <DuplicateResolveModal
    v-model:open="resolveOpen"
    :exam-id="selectedExamId || ''"
    :resolution="resolveTarget"
    @submitted="onChildSubmitted"
  />
</template>

<script lang="ts" setup>
import type { ExamPaperDuplicateResolutionVO, ImageLedgerDetailVO } from '@/apis/mark/image-ledger'
import LeftOutlined from '@ant-design/icons-vue/LeftOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { executeImageLedgerBalance, getImageLedgerDetail, normalizeImageLedgerDetail } from '@/apis/mark/image-ledger'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import mittBus from '@/utils/mitt'
import DuplicateResolutionCard from './image-ledger/DuplicateResolutionCard.vue'
import DuplicateResolveModal from './image-ledger/DuplicateResolveModal.vue'
import LedgerSummaryCard from './image-ledger/LedgerSummaryCard.vue'

defineOptions({ name: 'TeacherImageLedger' })

const router = useRouter()
const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

function goBackToScanLiveMonitor(): void {
  if (selectedExamId.value) {
    void router.push({
      name: 'TeacherExamWorkspaceScanMonitor',
      params: { examId: selectedExamId.value },
    })
  }
}

const ledger = ref<ImageLedgerDetailVO | null>(null)
const duplicateCardRef = ref<InstanceType<typeof DuplicateResolutionCard> | null>(null)
const loadingDetail = ref(false)
const balancing = ref(false)
const balanceError = ref('')

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
  balancing.value = true
  balanceError.value = ''
  try {
    ledger.value = normalizeImageLedgerDetail(
      await executeImageLedgerBalance({ examId: selectedExamId.value }),
    )
    message.success('已执行考试整体对账')
    await refreshSnapshot()
  } catch (e) {
    balanceError.value = getUserErrorMessage(e, '考试整体对账失败')
    showUserError(e, '考试整体对账失败')
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
}

watch(selectedExamId, (v) => {
  balanceError.value = ''
  if (v) {
    void loadAll()
  } else {
    ledger.value = null
  }
}, { immediate: true })

onMounted(() => {
  mittBus.on('scan-workbench:refresh', loadAll)
})

onBeforeUnmount(() => {
  mittBus.off('scan-workbench:refresh', loadAll)
})
</script>

<style lang="scss" scoped>
.ledger-page {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__toolbar {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  &__empty {
    padding: 60px 0;
  }
}

.ledger-page__cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ledger-page__balance-error {
  margin-bottom: 12px;
}
</style>
