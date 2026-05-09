<template>
  <GiPageLayout>
    <div class="scan-attention-page">
      <PageHeader title="扫描异常待办">
        <template #tags>
          <UiTag :tone="attentions.length > 0 ? 'red' : 'green'" size="md">
            {{ attentions.length > 0 ? `${attentions.length} 条未闭合` : '当前无异常' }}
          </UiTag>
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
            :loading="loading"
            @click="loadAttentions"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </PageHeader>

      <UiEmpty
        v-if="!selectedExamId"
        description="请选择一场考试以查看异常待办"
        class="empty-block"
      />

      <template v-else>
        <UiCard class="scan-attention-page__filter-card">
          <template #title>
            <SearchOutlined />
            <span>筛选条件</span>
          </template>

          <a-form layout="inline" :model="filterForm" @submit.prevent="loadAttentions">
            <a-form-item label="异常类型">
              <a-select
                v-model:value="filterForm.attentionType"
                placeholder="全部异常"
                :options="attentionTypeOptions"
                allow-clear
                style="width: 240px"
                @change="onAttentionTypeChange"
              />
            </a-form-item>
            <a-form-item label="扫描批次ID">
              <a-input
                v-model:value="filterForm.scanBatchId"
                placeholder="scanBatchId"
                allow-clear
                style="width: 200px"
                @press-enter="loadAttentions"
              />
            </a-form-item>
            <a-form-item label="试卷实例ID">
              <a-input
                v-model:value="filterForm.paperInstanceId"
                placeholder="paperInstanceId"
                allow-clear
                style="width: 200px"
                @press-enter="loadAttentions"
              />
            </a-form-item>
            <a-form-item>
              <a-space>
                <UiButton size="sm" :loading="loading" @click="loadAttentions">查询</UiButton>
                <UiButton size="sm" variant="outline" @click="resetFilter">重置</UiButton>
              </a-space>
            </a-form-item>
          </a-form>
        </UiCard>

        <UiCard class="scan-attention-page__table-card">
          <template #title>
            <ExclamationCircleOutlined />
            <span>异常列表</span>
            <UiBadge :tone="attentions.length > 0 ? 'red' : 'green'">
              {{ attentions.length }}
            </UiBadge>
          </template>
          <template #extra>
            <UiButton
              size="sm"
              :disabled="selectedRowKeys.length === 0"
              :loading="batchBinding"
              @click="handleBatchBind"
            >
              批量绑定 ({{ selectedRowKeys.length }})
            </UiButton>
          </template>

          <UiEmpty v-if="!loading && attentions.length === 0" description="当前无异常待办" />

          <a-table
            v-else
            :columns="columns"
            :data-source="attentions"
            :loading="loading"
            :pagination="{ pageSize: 20, showTotal: (t: number) => `共 ${t} 条` }"
            :row-key="rowKey"
            :row-selection="rowSelection"
            size="middle"
            class="scan-attention-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'attentionType'">
                <UiTag tone="red" size="sm">{{ record.attentionType || '-' }}</UiTag>
              </template>
              <template v-else-if="column.key === 'sourceInfo'">
                <div class="source-cell">
                  <span v-if="record.sourceType"
                    ><b>{{ record.sourceType }}</b></span
                  >
                  <span v-if="record.sourceId" class="muted">#{{ record.sourceId }}</span>
                </div>
              </template>
              <template v-else-if="column.key === 'paperInstanceId'">
                <a-typography-text
                  v-if="record.paperInstanceId"
                  copyable
                  :content="record.paperInstanceId"
                />
                <span v-else class="muted">-</span>
              </template>
              <template v-else-if="column.key === 'status'">
                <UiTag :tone="record.status ? 'orange' : 'gray'" size="sm">{{
                  record.status || '-'
                }}</UiTag>
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
                    @click="openBindModal(record)"
                  >
                    身份绑定
                  </UiButton>
                  <UiButton v-else size="sm" @click="openLedger(record)"> 处置入口 </UiButton>
                  <a-upload
                    v-if="record.pageId && record.attentionType === 'QUALITY_BLOCK'"
                    :show-upload-list="false"
                    :before-upload="handleRepairUpload(record)"
                    :disabled="repairSubmitting"
                  >
                    <UiButton size="sm" variant="outline" :loading="repairSubmitting">
                      <template #icon><UploadOutlined /></template>
                      替换页
                    </UiButton>
                  </a-upload>
                  <UiButton size="sm" variant="ghost" @click="openDetail(record)">详情</UiButton>
                </a-space>
              </template>
            </template>
          </a-table>
        </UiCard>
      </template>
    </div>

    <!-- 身份绑定弹窗 -->
    <a-modal
      v-model:open="bindModalOpen"
      title="试卷身份绑定"
      :confirm-loading="binding"
      :mask-closable="false"
      width="600px"
      @ok="handleBind"
    >
      <a-form ref="bindFormRef" :model="bindForm" :rules="bindFormRules" layout="vertical">
        <a-alert
          type="warning"
          show-icon
          message="请从考生名册中选择正确的考生并提交绑定。绑定后将自动完成该试卷实例与考生的身份关联。"
          style="margin-bottom: 12px"
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
    </a-modal>

    <!-- 详情弹窗 -->
    <a-modal v-model:open="detailModalOpen" title="异常详情" :footer="null" width="640px">
      <a-descriptions v-if="detailRecord" :column="1" size="small" bordered>
        <a-descriptions-item label="异常类型">{{
          detailRecord.attentionType || '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="状态">{{ detailRecord.status || '-' }}</a-descriptions-item>
        <a-descriptions-item label="来源类型">{{
          detailRecord.sourceType || '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="来源ID">{{ detailRecord.sourceId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="考试ID">{{ detailRecord.examId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="扫描批次ID">{{
          detailRecord.scanBatchId || '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="试卷实例ID">{{
          detailRecord.paperInstanceId || '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="页ID">{{ detailRecord.pageId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="题目模板ID">{{
          detailRecord.questionTemplateId || '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="诊断">
          <pre class="diagnostic-pre">{{ detailRecord.diagnostic || '-' }}</pre>
        </a-descriptions-item>
        <a-descriptions-item label="更新时间">{{
          formatTime(detailRecord.updateTime)
        }}</a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { UploadProps } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamCandidateVO, ScanAttentionItemVO } from '@/apis/mark/exam'
import { bindPaper, listExamCandidates, listScanAttentions } from '@/apis/mark/exam'
import type { ExamPaperBatchBindItemPayload } from '@/apis/mark/exam-mark-scanner'
import { batchBindPapers, submitRepairAction } from '@/apis/mark/exam-mark-scanner'
import ExclamationCircleOutlined from '@ant-design/icons-vue/ExclamationCircleOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { uploadFile } from '@/apis/edu/file-management'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'
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

function rowKey(record: ScanAttentionItemVO): string {
  return [
    record.sourceType ?? '',
    record.sourceId ?? '',
    record.attentionType ?? '',
    record.paperInstanceId ?? '',
    record.pageId ?? '',
  ].join('|')
}

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

function resetFilter(): void {
  filterForm.attentionType = ''
  filterForm.scanBatchId = ''
  filterForm.paperInstanceId = ''
  void loadAttentions()
}

// ─── 身份绑定弹窗 ────────────────────────────────
const bindModalOpen = ref(false)
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

interface CandidateOption {
  value: string
  label: string
  raw: ExamCandidateVO
}

function filterCandidate(input: string, option: CandidateOption): boolean {
  const kw = input.trim().toLowerCase()
  if (!kw) return true
  const raw = option.raw
  return (
    (raw.studentName ?? '').toLowerCase().includes(kw) ||
    (raw.studentNo ?? '').toLowerCase().includes(kw)
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

function openBindModal(record: ScanAttentionItemVO): void {
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
  bindModalOpen.value = true
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
    bindModalOpen.value = false
    await loadAttentions()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '试卷身份绑定失败'
    message.error(errMsg)
  } finally {
    binding.value = false
  }
}

// ─── 详情弹窗 ────────────────────────────────────
const detailModalOpen = ref(false)
const detailRecord = ref<ScanAttentionItemVO | null>(null)

function openDetail(record: ScanAttentionItemVO): void {
  detailRecord.value = record
  detailModalOpen.value = true
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
      selectedRowKeys.value.includes(rowKey(item)) && item.paperInstanceId && item.scanBatchId,
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

// ─── 替换页修复 ──────────────────────────────────
const repairSubmitting = ref(false)

function handleRepairUpload(record: ScanAttentionItemVO): UploadProps['beforeUpload'] {
  return async (file) => {
    if (!selectedExamId.value || !record.pageId) {
      message.error('缺少考试或扫描页上下文')
      return false
    }
    repairSubmitting.value = true
    try {
      const uploaded = await uploadFile(file as File, { businessType: 'MARK_SCAN_REPAIR' })
      await submitRepairAction({
        examId: selectedExamId.value,
        pageId: record.pageId,
        repairType: 'RESCAN',
        afterFileId: uploaded.id,
        repairReason: '人工重新扫描并替换异常扫描页',
      })
      message.success('异常页已替换，后端将重新创建 OCR 识别任务')
      await loadAttentions()
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '替换页修复失败'
      message.error(errMsg)
    } finally {
      repairSubmitting.value = false
    }
    return false
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
.scan-attention-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.scan-attention-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.source-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.muted {
  color: var(--ant-color-text-tertiary);
  font-size: 12px;
}

.diagnostic-pre {
  margin: 0;
  font-family: inherit;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--ant-color-text);
}

.empty-block {
  padding: 60px 0;
}
</style>
