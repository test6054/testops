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

    <UiEmpty
      v-else-if="!loadingDetail && ledgerLoadError"
      description="暂无数据"
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
      <DuplicateResolutionCard :exam-id="selectedExamId" @resolve="openResolve" />
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
import { UiAlertStrip, UiButton, UiEmpty } from '@/components/ui-guide/ui'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import mittBus from '@/utils/mitt'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import DuplicateResolutionCard from './image-ledger/DuplicateResolutionCard.vue'
import DuplicateResolveModal from './image-ledger/DuplicateResolveModal.vue'
import LedgerSummaryCard from './image-ledger/LedgerSummaryCard.vue'

defineOptions({ name: 'TeacherImageLedger' })

const router = useRouter()
const { selectedExamId } = useMarkExamContext()

function goBackToScanLiveMonitor(): void {
  if (selectedExamId.value) {
    void router.push({
      name: 'TeacherExamWorkspaceScanMonitor',
      params: { examId: selectedExamId.value },
    })
  }
}

const ledger = ref<ImageLedgerDetailVO | null>(null)
const loadingDetail = ref(false)
const balancing = ref(false)
const ledgerLoadError = ref<Error | null>(null)
const balanceError = ref('')

async function loadDetail(): Promise<void> {
  if (!selectedExamId.value) return
  loadingDetail.value = true
  ledgerLoadError.value = null
  try {
    ledger.value = normalizeImageLedgerDetail(
      await getImageLedgerDetail({ examId: selectedExamId.value }),
    )
  } catch (e) {
    ledgerLoadError.value = toUserError(e, '影像账本加载失败')
    showUserError(e, '影像账本加载失败')
  } finally {
    loadingDetail.value = false
  }
}

async function loadAll(): Promise<void> {
  await loadDetail()
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
}

watch(selectedExamId, (v) => {
  balanceError.value = ''
  if (v) {
    void loadAll()
  } else {
    ledger.value = null
  }
})

onMounted(async () => {
  if (selectedExamId.value) await loadAll()
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
