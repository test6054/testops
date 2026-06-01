<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="ledger-page__context">
        <div class="ledger-page__context-left">
          <a-select
            :value="selectedExamId"
            class="ledger-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
        </div>
        <div class="ledger-page__context-right">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="loadingDetail"
            @click="loadAll"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择一场考试以查看影像账本"
      class="ledger-page__empty"
    />

    <!-- D-9 错误态：影像账本加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-else-if="ledgerLoadError"
      :error="ledgerLoadError"
      title="影像账本加载失败"
      :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
      @retry="loadAll"
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
  </StageWorkbenchShell>

  <DuplicateResolveModal
    v-model:open="resolveOpen"
    :exam-id="selectedExamId || ''"
    :resolution="resolveTarget"
    @submitted="onChildSubmitted"
  />
</template>

<script lang="ts" setup>
import type { ExamPaperDuplicateResolutionVO, ImageLedgerDetailVO } from '@/apis/mark/image-ledger'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { onMounted, ref, watch } from 'vue'
import { executeImageLedgerBalance, getImageLedgerDetail } from '@/apis/mark/image-ledger'
import { UiAlertStrip, UiButton, UiEmpty, UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import DuplicateResolutionCard from './image-ledger/DuplicateResolutionCard.vue'
import DuplicateResolveModal from './image-ledger/DuplicateResolveModal.vue'
import LedgerSummaryCard from './image-ledger/LedgerSummaryCard.vue'

defineOptions({ name: 'TeacherImageLedger' })

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const ledger = ref<ImageLedgerDetailVO | null>(null)
const loadingDetail = ref(false)
const balancing = ref(false)
// D-9 错误态：影像账本加载失败时 UiErrorRetryPanel 重试 + 上报
const ledgerLoadError = ref<Error | null>(null)
const balanceError = ref('')

async function loadDetail(): Promise<void> {
  if (!selectedExamId.value) return
  loadingDetail.value = true
  ledgerLoadError.value = null
  try {
    ledger.value = await getImageLedgerDetail({ examId: selectedExamId.value })
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
    ledger.value = await executeImageLedgerBalance({ examId: selectedExamId.value })
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
  await initExamSelector()
  if (selectedExamId.value) await loadAll()
})
</script>

<style lang="scss" scoped>
.ledger-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-right {
    flex-shrink: 0;
  }

  &__exam-select {
    width: 280px;
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
