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

    <UiAlertStrip
      v-if="attentionContext"
      tone="warning"
      :title="`来自扫描异常待办的处置上下文：${attentionContext.attentionType}`"
      dense
      class="ledger-page__attention-context"
    >
      <div class="ledger-page__attention-body">
        <span v-if="attentionContext.sourceType">来源：{{ attentionContext.sourceType }}</span>
        <span v-if="attentionContext.sourceId">来源 ID：{{ attentionContext.sourceId }}</span>
        <span v-if="attentionContext.scanBatchId">扫描批次：{{ attentionContext.scanBatchId }}</span>
        <span v-if="attentionContext.paperInstanceId">试卷实例：{{ attentionContext.paperInstanceId }}</span>
        <span v-if="attentionContext.pageId">页 ID：{{ attentionContext.pageId }}</span>
      </div>
      <template #actions>
        <UiButton size="sm" variant="outline" @click="goBackToScanAttention">
          返回异常待办
        </UiButton>
      </template>
    </UiAlertStrip>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择一场考试以查看影像账本"
      class="ledger-page__empty"
    />

    <div v-else class="ledger-page__cards">
      <a-card title="账本概览" :bordered="false" size="small">
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  executeImageLedgerBalance,
  getImageLedgerDetail,
} from '@/apis/mark/image-ledger'
import { UiAlertStrip, UiButton, UiEmpty } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import DuplicateResolutionCard from './image-ledger/DuplicateResolutionCard.vue'
import DuplicateResolveModal from './image-ledger/DuplicateResolveModal.vue'
import LedgerSummaryCard from './image-ledger/LedgerSummaryCard.vue'

defineOptions({ name: 'TeacherImageLedger' })

const route = useRoute()
const router = useRouter()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

/** 从扫描异常待办入口进入时，处理完单条 attention 后一键回到原列表 */
function goBackToScanAttention(): void {
  void router.push({
    name: 'TeacherScanAttention',
    query: selectedExamId.value ? { examId: selectedExamId.value } : undefined,
  })
}

const ledger = ref<ImageLedgerDetailVO | null>(null)
const loadingDetail = ref(false)
const balancing = ref(false)

interface ScanAttentionContext {
  attentionType: string
  sourceType?: string
  sourceId?: string
  scanBatchId?: string
  paperInstanceId?: string
  pageId?: string
}

function readQueryString(key: string): string | undefined {
  const value = route.query[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

const attentionContext = computed<ScanAttentionContext | null>(() => {
  const attentionType = readQueryString('attentionType')
  if (!attentionType) return null
  return {
    attentionType,
    sourceType: readQueryString('sourceType'),
    sourceId: readQueryString('sourceId'),
    scanBatchId: readQueryString('scanBatchId'),
    paperInstanceId: readQueryString('paperInstanceId'),
    pageId: readQueryString('pageId'),
  }
})

async function loadDetail(): Promise<void> {
  if (!selectedExamId.value) return
  loadingDetail.value = true
  try {
    ledger.value = await getImageLedgerDetail({ examId: selectedExamId.value })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '账本加载失败'
    message.error(msg)
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
  try {
    ledger.value = await executeImageLedgerBalance({ examId: selectedExamId.value })
    message.success('已执行考试整体对账')
  } catch (e) {
    const msg = e instanceof Error ? e.message : '对账失败'
    message.error(msg)
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
  if (v) void loadAll()
  else ledger.value = null
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

.ledger-page__attention-context {
  margin-bottom: 16px;
}

.ledger-page__attention-body {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
}

.ledger-page__cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
