<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="appeal-page__context">
        <div class="appeal-page__context-left">
          <a-select
            :value="selectedExamId"
            class="appeal-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiTag v-if="selectedExamId" tone="blue" size="sm">已选考试</UiTag>
        </div>
        <div class="appeal-page__context-right">
          <UiButton variant="outline" size="sm" :disabled="!selectedExamId" @click="reloadAll">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择一场考试以查看复核处理内容"
      class="appeal-page__empty"
    />

    <template v-else>
      <!-- P2 顶部汇总信号：复核处理进度全景，避免教师在 4 张子卡片之间反复对比数字 -->
      <UiStatPanel
        :items="summaryMetrics"
        :columns="3"
        variant="grid"
        compact
        class="appeal-page__summary"
      />

      <!-- D-9 错误态：复核汇总加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="summaryLoadError"
        :error="summaryLoadError"
        title="复核汇总加载失败"
        :helper="`考试 ID：${selectedExamId}`"
        compact
        @retry="loadSummary"
      />

      <UiAlertStrip
        v-if="pendingCount > 0"
        tone="warning"
        :title="`有 ${pendingCount} 件复核申请待处理`"
        description="处理逾期会触发学生再次申诉，建议优先认领并完成。"
        dense
        class="appeal-page__alert"
      />

      <div class="appeal-page__cards">
        <ReviewWindowPolicyCard :exam-id="selectedExamId" :reload-token="windowReloadToken" />
        <ReviewRequestsCard
          :exam-id="selectedExamId"
          :reload-token="requestReloadToken"
          @handled="onRequestHandled"
        />
        <CorrectionsCard
          :exam-id="selectedExamId"
          :reload-token="correctionReloadToken"
          @created="onCorrectionCreated"
        />
        <BatchCorrectionPlansCard :exam-id="selectedExamId" :reload-token="batchReloadToken" />
      </div>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { UiStatPanelItem } from '@/components/ui-guide/ui/types'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import { listCorrections, listReviewRequests } from '@/apis/mark/grade-review'
import {
  UiAlertStrip,
  UiButton,
  UiEmpty,
  UiErrorRetryPanel,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import BatchCorrectionPlansCard from './appeal-handle/BatchCorrectionPlansCard.vue'
import CorrectionsCard from './appeal-handle/CorrectionsCard.vue'
import ReviewRequestsCard from './appeal-handle/ReviewRequestsCard.vue'
import ReviewWindowPolicyCard from './appeal-handle/ReviewWindowPolicyCard.vue'

defineOptions({ name: 'TeacherAppealHandle' })

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const windowReloadToken = ref(0)
const requestReloadToken = ref(0)
const correctionReloadToken = ref(0)
const batchReloadToken = ref(0)

// ─── P2 顶部汇总：复核 + 更正聚合统计 ─────────────────────────────
const summaryLoadError = ref<unknown>(null)
const pendingCount = ref(0)
const inReviewCount = ref(0)
const approvedCount = ref(0)
const rejectedCount = ref(0)
const correctedCount = ref(0)
const correctionRecordCount = ref(0)

const summaryMetrics = computed<UiStatPanelItem[]>(() => [
  {
    key: 'pending',
    label: '待处理',
    value: pendingCount.value,
    tone: pendingCount.value > 0 ? 'orange' : 'gray',
  },
  { key: 'inReview', label: '处理中', value: inReviewCount.value, tone: 'blue' },
  { key: 'approved', label: '通过', value: approvedCount.value, tone: 'green' },
  { key: 'rejected', label: '驳回', value: rejectedCount.value, tone: 'red' },
  { key: 'corrected', label: '已更正', value: correctedCount.value, tone: 'purple' },
  { key: 'corrections', label: '更正记录', value: correctionRecordCount.value, tone: 'gray' },
])

async function loadSummary(): Promise<void> {
  if (!selectedExamId.value) return
  const examId = selectedExamId.value
  summaryLoadError.value = null
  try {
    const [requests, corrections] = await Promise.all([
      listReviewRequests({ examId }),
      listCorrections({ examId }),
    ])
    const reqs = requests ?? []
    pendingCount.value = reqs.filter((r) => r.requestStatus === 'PENDING').length
    inReviewCount.value = reqs.filter((r) => r.requestStatus === 'IN_REVIEW').length
    approvedCount.value = reqs.filter((r) => r.requestStatus === 'APPROVED').length
    rejectedCount.value = reqs.filter((r) => r.requestStatus === 'REJECTED').length
    correctedCount.value = reqs.filter((r) => r.requestStatus === 'CORRECTED').length
    correctionRecordCount.value = corrections?.length ?? 0
  } catch (error) {
    summaryLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '复核汇总加载失败'
    message.warning(errMsg)
  }
}

function reloadAll(): void {
  windowReloadToken.value += 1
  requestReloadToken.value += 1
  correctionReloadToken.value += 1
  batchReloadToken.value += 1
  void loadSummary()
}

function onRequestHandled(): void {
  requestReloadToken.value += 1
  correctionReloadToken.value += 1
  void loadSummary()
}

function onCorrectionCreated(): void {
  correctionReloadToken.value += 1
  requestReloadToken.value += 1
  void loadSummary()
}

watch(selectedExamId, (v) => {
  if (v) reloadAll()
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) reloadAll()
})
</script>

<style lang="scss" scoped>
.appeal-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
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

  &__summary {
    margin-bottom: 12px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__alert {
    margin-bottom: 12px;
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}
</style>
