<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="scan-attention__context">
        <div class="scan-attention__context-info">
          <h2 class="scan-attention__title">
            阅卷交付 - 扫描异常队列
          </h2>
          <a-select
            :value="selectedExamId"
            class="scan-attention__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
        </div>
        <div class="scan-attention__context-actions">
          <UiTag :tone="attentions.length > 0 ? 'red' : 'green'" size="sm">
            {{ attentions.length > 0 ? `${attentions.length} 条未闭合` : '当前无异常' }}
          </UiTag>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadAttentions"
          >
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择一场考试以查看异常待办"
      class="scan-attention__empty"
    />

    <template v-else>
      <!-- 概览：KPI + 类型分布 -->
      <div class="scan-attention__overview">
        <UiStatPanel
          title="异常概览"
          :items="statPanelMetrics"
          :columns="4"
          variant="grid"
          compact
          class="scan-attention__stats"
        />
        <a-card :bordered="false" size="small" class="scan-attention__chart-card">
          <UiDonutChart
            :items="donutItems"
            center-label="异常总数"
            :center-value="attentions.length"
            :size="160"
            :stroke-width="14"
          />
        </a-card>
      </div>

      <section class="scan-attention__panel">
        <header class="scan-attention__panel-header">
          <h3 class="scan-attention__panel-title">
            筛选条件
          </h3>
        </header>
        <a-form
          layout="inline"
          :model="filterForm"
          class="scan-attention__filter-form"
          @submit.prevent="loadAttentions"
        >
          <a-form-item label="异常类型">
            <a-select
              v-model:value="filterForm.attentionType"
              placeholder="全部异常"
              :options="attentionTypeOptions"
              allow-clear
              class="scan-attention__type-select"
              @change="onAttentionTypeChange"
            />
          </a-form-item>
          <a-form-item label="扫描批次ID">
            <a-input
              v-model:value="filterForm.scanBatchId"
              placeholder="scanBatchId"
              allow-clear
              class="scan-attention__filter-input"
              @press-enter="loadAttentions"
            />
          </a-form-item>
          <a-form-item label="试卷实例ID">
            <a-input
              v-model:value="filterForm.paperInstanceId"
              placeholder="paperInstanceId"
              allow-clear
              class="scan-attention__filter-input"
              @press-enter="loadAttentions"
            />
          </a-form-item>
          <a-form-item>
            <a-space>
              <UiButton size="sm" :loading="loading" @click="loadAttentions">
                查询
              </UiButton>
              <UiButton size="sm" variant="outline" @click="resetFilter">
                重置
              </UiButton>
            </a-space>
          </a-form-item>
        </a-form>
      </section>

      <section class="scan-attention__panel">
        <header class="scan-attention__panel-header">
          <h3 class="scan-attention__panel-title">
            异常待办列表
          </h3>
          <span class="scan-attention__panel-meta">
            共 {{ attentions.length }} 条
          </span>
        </header>
        <UiDataTable
          :columns="columns"
          :data-source="attentions"
          :loading="loading"
          row-key="id"
          :enable-selection="true"
          :selected-row-keys="selectedRowKeys"
          :show-pagination="false"
          flat
          empty-title="当前无异常"
          empty-description="当前筛选条件下没有异常待办"
          v-bind="{ rowSelection }"
        >
          <template #toolbar-right>
            <UiButton
              size="sm"
              :disabled="selectedRowKeys.length === 0"
              :loading="batchBinding"
              @click="handleBatchBind"
            >
              批量绑定 ({{ selectedRowKeys.length }})
            </UiButton>
          </template>

          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'attentionType'">
              <UiTag :tone="attentionTypeTone(record.attentionType)" size="sm">
                {{ attentionTypeLabel(record.attentionType) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'sourceInfo'">
              <div class="scan-attention__source-cell">
                <span v-if="record.sourceType"><b>{{ record.sourceType }}</b></span>
                <span v-if="record.sourceId" class="scan-attention__hint">#{{ record.sourceId }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'paperInstanceId'">
              <a-typography-text
                v-if="record.paperInstanceId"
                copyable
                :content="record.paperInstanceId"
              />
              <span v-else class="scan-attention__hint">-</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="statusTone(record.status)" size="sm">
                {{ record.status || '-' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'diagnostic'">
              <a-typography-text :content="record.diagnostic" :ellipsis="{ tooltip: true }" />
            </template>
            <template v-else-if="column.key === 'updateTime'">
              {{ formatTime(record.updateTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <UiButton
                  v-if="record.attentionType === 'RECOGNITION_REVIEW'"
                  size="sm"
                  :disabled="!record.paperInstanceId || !record.scanBatchId"
                  @click="openBindDrawer(record)"
                >
                  身份绑定
                </UiButton>
                <UiButton v-else size="sm" @click="openLedger(record)">处置入口</UiButton>
                <UiButton size="sm" variant="ghost" @click="openDetail(record)">详情</UiButton>
              </a-space>
            </template>
          </template>
        </UiDataTable>
      </section>
    </template>

    <!-- 身份绑定抽屉 -->
    <UiDrawer
      :open="bindDrawerOpen"
      title="试卷身份绑定"
      :width="560"
      :confirm-loading="binding"
      @update:open="(v: boolean) => bindDrawerOpen = v"
      @close="bindDrawerOpen = false"
      @confirm="handleBind"
    >
      <a-form ref="bindFormRef" :model="bindForm" :rules="bindFormRules" layout="vertical">
        <UiAlertStrip
          tone="warning"
          title="操作提示"
          description="请从考生名册中选择正确的考生并提交绑定。绑定后将自动完成该试卷实例与考生的身份关联。"
          dense
          class="scan-attention__bind-alert"
        />
        <a-form-item label="扫描批次ID">
          <a-input :value="bindForm.scanBatchId" disabled />
        </a-form-item>
        <a-form-item label="试卷实例ID">
          <a-input :value="bindForm.paperInstanceId" disabled />
        </a-form-item>
        <a-form-item label="识别学号（可选，留空表示未能识别）" name="recognizedStudentNo">
          <a-input
            v-model:value="bindForm.recognizedStudentNo"
            placeholder="OCR / 二维码识别到的原始学号，供后续审计使用"
            :maxlength="64"
          />
        </a-form-item>
        <a-form-item label="正确考生（从当前考试名册选择）" name="confirmedCandidateRosterId">
          <a-select
            v-model:value="bindForm.confirmedCandidateRosterId"
            placeholder="按姓名或学号搜索"
            show-search
            :options="candidateOptions"
            :filter-option="filterCandidate"
            :loading="candidatesLoading"
            allow-clear
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="答卷状态（可选）">
              <a-input
                v-model:value="bindForm.attemptStatus"
                placeholder="如 NORMAL / ABSENT"
                :maxlength="32"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="答卷编号（可选）">
              <a-input
                v-model:value="bindForm.attemptNo"
                placeholder="多试卷时区分"
                :maxlength="32"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </UiDrawer>

    <!-- 详情抽屉 -->
    <UiDrawer
      :open="detailDrawerOpen"
      title="异常详情"
      :width="560"
      hide-footer
      @update:open="(v: boolean) => detailDrawerOpen = v"
      @close="detailDrawerOpen = false"
    >
      <a-descriptions v-if="detailRecord" :column="1" size="small" bordered>
        <a-descriptions-item label="异常类型">
          {{ detailRecord.attentionType || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">{{ detailRecord.status || '-' }}</a-descriptions-item>
        <a-descriptions-item label="来源类型">
          {{ detailRecord.sourceType || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="来源ID">{{ detailRecord.sourceId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="考试ID">{{ detailRecord.examId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="扫描批次ID">
          {{ detailRecord.scanBatchId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="试卷实例ID">
          {{ detailRecord.paperInstanceId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="页ID">{{ detailRecord.pageId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="题目模板ID">
          {{ detailRecord.questionTemplateId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="诊断">
          <pre class="scan-attention__diagnostic-pre">{{ detailRecord.diagnostic || '-' }}</pre>
        </a-descriptions-item>
        <a-descriptions-item label="更新时间">
          {{ formatTime(detailRecord.updateTime) }}
        </a-descriptions-item>
      </a-descriptions>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
/**
 * 阅卷交付 - 扫描异常队列
 *
 * 后端契约：
 * - listScanAttentions(examId, attentionType?, scanBatchId?, paperInstanceId?)
 * - bindPaper(...)、batchBindPapers(...)、listExamCandidates(examId)
 *
 * attentionType 枚举：QUALITY_BLOCK / PROCESSING_BLOCK / DUPLICATE_PENDING / RECOGNITION_REVIEW
 */
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { DefaultOptionType } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamCandidateVO, ScanAttentionItemVO } from '@/apis/mark/exam'
import type { ExamPaperBatchBindItemPayload } from '@/apis/mark/exam-mark-scanner'
import type { UiChartSliceItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { bindPaper, listExamCandidates, listScanAttentions } from '@/apis/mark/exam'
import { batchBindPapers } from '@/apis/mark/exam-mark-scanner'
import { UiAlertStrip, UiButton, UiDataTable, UiDonutChart, UiDrawer, UiEmpty, UiStatPanel, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'

defineOptions({ name: 'TeacherScanAttention' })

const router = useRouter()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

// ─── 列表筛选 + 数据 ─────────────────────────────
const filterForm = reactive<{
  attentionType?: string
  scanBatchId?: string
  paperInstanceId?: string
}>({
  attentionType: '',
  scanBatchId: '',
  paperInstanceId: '',
})

const attentions = ref<ScanAttentionItemVO[]>([])
const loading = ref(false)

const attentionTypeOptions = [
  { label: '质量阻断', value: 'QUALITY_BLOCK' },
  { label: '处理阻断', value: 'PROCESSING_BLOCK' },
  { label: '重复待处置', value: 'DUPLICATE_PENDING' },
  { label: '识别复核', value: 'RECOGNITION_REVIEW' },
]

const columns: ColumnType<ScanAttentionItemVO>[] = [
  { title: '异常类型', key: 'attentionType', width: 160 },
  { title: '来源', key: 'sourceInfo', width: 180 },
  { title: '扫描批次', dataIndex: 'scanBatchId', key: 'scanBatchId', width: 160, ellipsis: true },
  { title: '试卷实例', key: 'paperInstanceId', width: 180 },
  { title: '状态', key: 'status', width: 120 },
  { title: '诊断', key: 'diagnostic', ellipsis: true },
  { title: '更新时间', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]


function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
}

async function loadAttentions(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    attentions.value = await listScanAttentions({
      examId: selectedExamId.value,
      attentionType: filterForm.attentionType?.trim() || undefined,
      scanBatchId: filterForm.scanBatchId?.trim() || undefined,
      paperInstanceId: filterForm.paperInstanceId?.trim() || undefined,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '异常列表加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

function onAttentionTypeChange(): void {
  void loadAttentions()
}

// ─── 类型色彩编码 ─────────────────────────────────
const ATTENTION_TYPE_TONE: Record<string, 'red' | 'orange' | 'purple' | 'blue' | 'gray'> = {
  QUALITY_BLOCK: 'red',
  PROCESSING_BLOCK: 'orange',
  DUPLICATE_PENDING: 'purple',
  RECOGNITION_REVIEW: 'blue',
}

const ATTENTION_TYPE_LABEL: Record<string, string> = {
  QUALITY_BLOCK: '质量阻断',
  PROCESSING_BLOCK: '处理阻断',
  DUPLICATE_PENDING: '重复待处置',
  RECOGNITION_REVIEW: '识别复核',
}

function attentionTypeTone(type?: string): 'red' | 'orange' | 'purple' | 'blue' | 'gray' {
  return ATTENTION_TYPE_TONE[type ?? ''] ?? 'gray'
}

function attentionTypeLabel(type?: string): string {
  return ATTENTION_TYPE_LABEL[type ?? ''] ?? (type || '-')
}

function statusTone(status?: string): 'red' | 'orange' | 'green' | 'gray' {
  if (!status) return 'gray'
  if (status === 'CLOSED' || status === 'RESOLVED') return 'green'
  if (status === 'OPEN' || status === 'PENDING') return 'red'
  return 'orange'
}

const typeCounts = computed(() => {
  const counts: Record<string, number> = {
    QUALITY_BLOCK: 0,
    PROCESSING_BLOCK: 0,
    DUPLICATE_PENDING: 0,
    RECOGNITION_REVIEW: 0,
  }
  for (const a of attentions.value) {
    const k = a.attentionType ?? ''
    if (k in counts) counts[k] += 1
  }
  return counts
})

const statPanelMetrics = computed(() => [
  { label: '质量阻断', value: typeCounts.value.QUALITY_BLOCK, unit: '条', tone: typeCounts.value.QUALITY_BLOCK > 0 ? 'red' as const : 'gray' as const },
  { label: '处理阻断', value: typeCounts.value.PROCESSING_BLOCK, unit: '条', tone: typeCounts.value.PROCESSING_BLOCK > 0 ? 'orange' as const : 'gray' as const },
  { label: '重复待处置', value: typeCounts.value.DUPLICATE_PENDING, unit: '条', tone: typeCounts.value.DUPLICATE_PENDING > 0 ? 'purple' as const : 'gray' as const },
  { label: '识别复核', value: typeCounts.value.RECOGNITION_REVIEW, unit: '条', tone: typeCounts.value.RECOGNITION_REVIEW > 0 ? 'blue' as const : 'gray' as const },
])

const donutItems = computed<UiChartSliceItem[]>(() => [
  { key: 'quality', label: '质量阻断', value: typeCounts.value.QUALITY_BLOCK, tone: 'red' },
  { key: 'processing', label: '处理阻断', value: typeCounts.value.PROCESSING_BLOCK, tone: 'orange' },
  { key: 'duplicate', label: '重复待处置', value: typeCounts.value.DUPLICATE_PENDING, tone: 'purple' },
  { key: 'recognition', label: '识别复核', value: typeCounts.value.RECOGNITION_REVIEW, tone: 'blue' },
])

function resetFilter(): void {
  filterForm.attentionType = ''
  filterForm.scanBatchId = ''
  filterForm.paperInstanceId = ''
  void loadAttentions()
}

// ─── 身份绑定弹窗 ────────────────────────────────
const bindDrawerOpen = ref(false)
const binding = ref(false)
const bindFormRef = ref<FormInstance>()
const bindForm = reactive<{
  scanBatchId: string
  paperInstanceId: string
  recognizedStudentNo?: string
  confirmedCandidateRosterId?: string
  attemptStatus?: string
  attemptNo?: string
}>({
  scanBatchId: '',
  paperInstanceId: '',
  recognizedStudentNo: '',
  confirmedCandidateRosterId: undefined,
  attemptStatus: '',
  attemptNo: '',
})

const bindFormRules: Record<string, Rule[]> = {
  confirmedCandidateRosterId: [
    { required: true, message: '请从名册中选择正确考生', trigger: 'change' },
  ],
  recognizedStudentNo: [{ max: 64, message: '学号最多 64 个字符', trigger: 'blur' }],
}

// 考生名册缓存
const candidates = ref<ExamCandidateVO[]>([])
const candidatesLoading = ref(false)

const candidateOptions = computed(() =>
  candidates.value.map((item) => ({
    value: item.candidateRosterId,
    label: `${item.studentName}（${item.studentNo}）`,
    raw: item,
  })),
)

function filterCandidate(input: string, option?: DefaultOptionType): boolean {
  const kw = input.trim().toLowerCase()
  if (!kw || !option) return true
  const raw = option.raw as ExamCandidateVO
  return (
    (raw.studentName ?? '').toLowerCase().includes(kw)
    || (raw.studentNo ?? '').toLowerCase().includes(kw)
  )
}

async function ensureCandidatesLoaded(): Promise<void> {
  if (!selectedExamId.value) return
  if (candidates.value.length > 0) return
  candidatesLoading.value = true
  try {
    candidates.value = await listExamCandidates(selectedExamId.value)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '考生名册加载失败'
    message.error(errMsg)
  } finally {
    candidatesLoading.value = false
  }
}

function openBindDrawer(record: ScanAttentionItemVO): void {
  if (!record.paperInstanceId || !record.scanBatchId) {
    message.warning('该异常缺少试卷实例或扫描批次信息，无法进行身份绑定')
    return
  }
  bindForm.scanBatchId = record.scanBatchId
  bindForm.paperInstanceId = record.paperInstanceId
  bindForm.recognizedStudentNo = ''
  bindForm.confirmedCandidateRosterId = undefined
  bindForm.attemptStatus = ''
  bindForm.attemptNo = ''
  bindDrawerOpen.value = true
  void ensureCandidatesLoaded()
}

function openLedger(record: ScanAttentionItemVO): void {
  if (!selectedExamId.value) return
  void router.push({
    path: '/teacher/image-ledger',
    query: {
      examId: selectedExamId.value,
      attentionType: record.attentionType,
      sourceType: record.sourceType,
      sourceId: record.sourceId,
      paperInstanceId: record.paperInstanceId,
      pageId: record.pageId,
      scanBatchId: record.scanBatchId,
    },
  })
}

async function handleBind(): Promise<void> {
  if (!selectedExamId.value) return
  if (!bindFormRef.value) return
  try {
    await bindFormRef.value.validate()
  } catch {
    return
  }
  binding.value = true
  try {
    await bindPaper({
      examId: selectedExamId.value,
      scanBatchId: bindForm.scanBatchId,
      paperInstanceId: bindForm.paperInstanceId,
      recognizedStudentNo: bindForm.recognizedStudentNo?.trim() || undefined,
      confirmedCandidateRosterId: bindForm.confirmedCandidateRosterId,
      attemptStatus: bindForm.attemptStatus?.trim() || undefined,
      attemptNo: bindForm.attemptNo?.trim() || undefined,
    })
    message.success('试卷身份绑定成功')
    bindDrawerOpen.value = false
    await loadAttentions()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '试卷身份绑定失败'
    message.error(errMsg)
  } finally {
    binding.value = false
  }
}

// ─── 详情弹窗 ────────────────────────────────────
const detailDrawerOpen = ref(false)
const detailRecord = ref<ScanAttentionItemVO | null>(null)

function openDetail(record: ScanAttentionItemVO): void {
  detailRecord.value = record
  detailDrawerOpen.value = true
}

// ─── 行选择与批量绑定 ─────────────────────────────
const selectedRowKeys = ref<string[]>([])
const batchBinding = ref(false)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys.map(String)
  },
  getCheckboxProps: (record: ScanAttentionItemVO) => ({
    disabled: !record.paperInstanceId || !record.scanBatchId,
  }),
}))

async function handleBatchBind(): Promise<void> {
  if (!selectedExamId.value) {
    message.error('请先选择考试')
    return
  }
  const selected = attentions.value.filter(
    (item) =>
      selectedRowKeys.value.includes(item.id) && item.paperInstanceId && item.scanBatchId,
  )
  if (selected.length === 0) {
    message.error('请选择有试卷实例的异常项')
    return
  }
  const scanBatchIds = new Set(selected.map((item) => item.scanBatchId))
  if (scanBatchIds.size !== 1) {
    message.error('批量绑定必须选择同一扫描批次内的试卷')
    return
  }
  await ensureCandidatesLoaded()
  if (candidates.value.length === 0) {
    message.error('当前考试无考生名册，无法绑定')
    return
  }
  const items: ExamPaperBatchBindItemPayload[] = selected.map((item) => ({
    paperInstanceId: item.paperInstanceId!,
    confirmedCandidateRosterId: '',
    attemptStatus: 'NORMAL',
  }))
  // 简化流程：为每个试卷自动打开单条绑定弹窗；如需一次性批量，需要展开行表单
  // 此处直接调用批量接口（已选项若缺少 confirmedCandidateRosterId 则后端会校验失败）
  batchBinding.value = true
  try {
    const result = await batchBindPapers({
      examId: selectedExamId.value,
      scanBatchId: selected[0].scanBatchId!,
      items,
    })
    message.success(
      `批量绑定：成功 ${result.successCount ?? 0} 条，失败 ${result.failureCount ?? 0} 条`,
    )
    selectedRowKeys.value = []
    await loadAttentions()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '批量绑定失败'
    message.error(errMsg)
  } finally {
    batchBinding.value = false
  }
}

// ─── 初始化 ─────────────────────────────────────
watch(selectedExamId, (value) => {
  // 切换考试需要重置名册缓存
  candidates.value = []
  if (value) {
    void loadAttentions()
  } else {
    attentions.value = []
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadAttentions()
  }
})
</script>

<style lang="scss" scoped>
.scan-attention {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 280px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__exam-select {
    width: 280px;
  }

  &__overview {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 16px;
    align-items: start;
  }

  &__stats {
    min-width: 0;
  }

  &__chart-card {
    min-width: 0;
  }

  @media (max-width: 900px) {
    &__overview {
      grid-template-columns: 1fr;
    }
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__panel-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-meta {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__filter-form {
    margin: 0;
  }

  &__type-select {
    width: 240px;
  }

  &__filter-input {
    width: 200px;
  }

  &__empty {
    padding: 60px 0;
  }

  &__source-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__hint {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__diagnostic-pre {
    margin: 0;
    font-family: inherit;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--dp-text-primary, #0f172a);
  }

  &__bind-alert {
    margin-bottom: 16px;
  }
}
</style>
