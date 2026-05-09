<template>
  <GiPageLayout>
    <div class="ledger-page">
      <PageHeader title="影像账本">
        <template #tags>
          <UiTag v-if="ledger?.ledgerStatus" :tone="ledgerStatusTone" size="md">
            {{
              ledgerStatusLabel
            }}
          </UiTag>
          <UiTag v-if="ledger" tone="blue" size="md">已扫 {{ ledger.scannedPageCount ?? 0 }} / {{ ledger.expectedPageCount ?? 0 }} 页</UiTag>
        </template>
        <template #actions>
          <a-select
            :value="selectedExamId"
            style="width: 280px"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
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
        </template>
      </PageHeader>

      <a-alert
        v-if="attentionContext"
        class="ledger-page__attention-context"
        type="warning"
        show-icon
      >
        <template #message>
          <div class="ledger-page__attention-title">
            <span>来自扫描异常待办的处置上下文</span>
            <UiTag tone="red" size="sm">{{ attentionContext.attentionType }}</UiTag>
          </div>
        </template>
        <template #description>
          <div class="ledger-page__attention-body">
            <span v-if="attentionContext.sourceType">来源：{{ attentionContext.sourceType }}</span>
            <span v-if="attentionContext.sourceId">来源 ID：{{ attentionContext.sourceId }}</span>
            <span v-if="attentionContext.scanBatchId">扫描批次：{{ attentionContext.scanBatchId }}</span>
            <span v-if="attentionContext.paperInstanceId">试卷实例：{{ attentionContext.paperInstanceId }}</span>
            <span v-if="attentionContext.pageId">页 ID：{{ attentionContext.pageId }}</span>
            <UiButton
              v-if="attentionContext.pageId"
              size="sm"
              variant="outline"
              @click="openRepair(attentionContext.pageId)"
            >
              直接提交修复
            </UiButton>
          </div>
        </template>
      </a-alert>

      <UiEmpty
        v-if="!selectedExamId"
        description="请选择一场考试以查看影像账本"
        class="empty-block"
      />

      <div v-else class="ledger-page__cards">
        <LedgerSummaryCard
          :ledger="ledger"
          :loading="loadingDetail"
          :balancing="balancing"
          @balance="handleBalance"
        />
        <QualityMetricsCard
          :exam-id="selectedExamId"
          @repair="openRepair"
          @override="openOverride"
        />
        <DuplicateResolutionCard :exam-id="selectedExamId" @resolve="openResolve" />
      </div>
    </div>

    <RepairModal
      v-model:open="repairOpen"
      :exam-id="selectedExamId || ''"
      :page-id="repairPageId"
      @submitted="onChildSubmitted"
    />
    <QualityOverrideModal
      v-model:open="overrideOpen"
      :exam-id="selectedExamId || ''"
      :target-type="overrideTargetType"
      :target-id="overrideTargetId"
      @submitted="onChildSubmitted"
    />
    <DuplicateResolveModal
      v-model:open="resolveOpen"
      :exam-id="selectedExamId || ''"
      :resolution="resolveTarget"
      @submitted="onChildSubmitted"
    />
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type {
  ExamPaperDuplicateResolutionVO,
  ImageLedgerDetailVO,
  OverrideTargetType,
} from '@/apis/mark/image-ledger'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  executeImageLedgerBalance,
  getImageLedgerDetail,
  LEDGER_STATUS_LABEL,
} from '@/apis/mark/image-ledger'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiButton, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import DuplicateResolutionCard from './image-ledger/DuplicateResolutionCard.vue'
import DuplicateResolveModal from './image-ledger/DuplicateResolveModal.vue'
import LedgerSummaryCard from './image-ledger/LedgerSummaryCard.vue'
import QualityMetricsCard from './image-ledger/QualityMetricsCard.vue'
import QualityOverrideModal from './image-ledger/QualityOverrideModal.vue'
import RepairModal from './image-ledger/RepairModal.vue'

defineOptions({ name: 'TeacherImageLedger' })

const route = useRoute()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

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

const ledgerStatusLabel = computed(() => {
  const code = ledger.value?.ledgerStatus
  if (!code) return '未平账'
  return LEDGER_STATUS_LABEL[code] || code
})

const ledgerStatusTone = computed<'green' | 'red' | 'orange' | 'gray' | 'blue'>(() => {
  switch (ledger.value?.ledgerStatus) {
    case 'BALANCED':
      return 'green'
    case 'BLOCKED':
      return 'red'
    case 'PARTIAL':
      return 'orange'
    case 'PENDING':
      return 'blue'
    default:
      return 'gray'
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
    ledger.value = await executeImageLedgerBalance({
      examId: selectedExamId.value,
      balanceScope: 'FULL',
    })
    message.success('全量平账已执行')
  } catch (e) {
    const msg = e instanceof Error ? e.message : '平账失败'
    message.error(msg)
  } finally {
    balancing.value = false
  }
}

const repairOpen = ref(false)
const repairPageId = ref<string>('')
function openRepair(pageId: string): void {
  repairPageId.value = pageId
  repairOpen.value = true
}

const overrideOpen = ref(false)
const overrideTargetType = ref<OverrideTargetType>('PAGE')
const overrideTargetId = ref<string>('')
function openOverride(payload: { targetType: OverrideTargetType, targetId: string }): void {
  overrideTargetType.value = payload.targetType
  overrideTargetId.value = payload.targetId
  overrideOpen.value = true
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
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.ledger-page__attention-context {
  margin-bottom: 0;
}

.ledger-page__attention-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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

.empty-block {
  padding: 60px 0;
}
</style>
