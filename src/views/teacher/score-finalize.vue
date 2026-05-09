<template>
  <GiPageLayout>
    <div class="score-finalize-page">
      <PageHeader title="成绩确认">
        <template #tags>
          <UiTag v-if="selectedExamId" tone="blue" size="md"
            >{{ pagination.total ?? 0 }} 名考生</UiTag
          >
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
            @click="loadCandidates"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </PageHeader>

      <UiEmpty
        v-if="!selectedExamId"
        description="请选择一场考试以查看考生名单"
        class="empty-block"
      />

      <template v-else>
        <UiCard class="score-finalize-page__filter-card">
          <template #title>
            <SearchOutlined />
            <span>筛选条件</span>
          </template>

          <a-space wrap>
            <a-input
              v-model:value="keyword"
              placeholder="按学号 / 姓名搜索"
              allow-clear
              style="width: 240px"
              @press-enter="handleSearch"
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </a-input>
            <a-select
              v-model:value="statusFilter"
              placeholder="按最终状态过滤"
              allow-clear
              style="width: 200px"
              :options="finalStatusOptions"
            />
            <UiButton size="sm" @click="handleSearch">查询</UiButton>
            <UiButton size="sm" variant="outline" @click="handleReset">重置</UiButton>
            <a-typography-text type="secondary">
              共 {{ pagination.total ?? 0 }} 条
            </a-typography-text>
          </a-space>
        </UiCard>

        <UiCard class="score-finalize-page__table-card">
          <template #title>
            <CheckCircleOutlined />
            <span>考生名单</span>
            <UiBadge tone="blue">{{ pagination.total ?? 0 }} 条</UiBadge>
          </template>

          <a-table
            :columns="columns"
            :data-source="candidates"
            :loading="loading"
            :pagination="pagination"
            row-key="candidateRosterId"
            size="middle"
            class="score-finalize-table"
            @change="handleTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'studentName'">
                <a-typography-text strong :content="record.studentName || '-'" />
              </template>
              <template v-else-if="column.key === 'finalScore'">
                <a-typography-text v-if="record.finalScore != null" strong type="success">
                  {{ record.finalScore }} 分
                </a-typography-text>
                <span v-else class="muted">-</span>
              </template>
              <template v-else-if="column.key === 'finalScoreStatus'">
                <UiTag
                  :tone="
                    record.finalScoreStatus
                      ? FINAL_SCORE_STATUS_TONE[record.finalScoreStatus as FinalScoreStatusCode]
                      : 'gray'
                  "
                  size="sm"
                >
                  {{
                    record.finalScoreStatus
                      ? FINAL_SCORE_STATUS_LABEL[record.finalScoreStatus as FinalScoreStatusCode]
                      : '未生成'
                  }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'confirmedTime'">
                {{ formatTime(record.confirmedTime) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <UiButton
                    size="sm"
                    variant="ghost"
                    :disabled="!record.paperInstanceId"
                    @click="openDetailDrawer(toCandidate(record))"
                  >
                    明细
                  </UiButton>
                  <UiButton
                    size="sm"
                    :disabled="!canConfirm(toCandidate(record))"
                    @click="openConfirmModal(toCandidate(record))"
                  >
                    {{ confirmButtonLabel(toCandidate(record)) }}
                  </UiButton>
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="!canPublish(toCandidate(record))"
                    @click="handlePublish(toCandidate(record))"
                  >
                    {{ publishButtonLabel(toCandidate(record)) }}
                  </UiButton>
                  <UiButton
                    size="sm"
                    variant="ghost"
                    :disabled="!canWithdraw(toCandidate(record))"
                    @click="openWithdrawModal(toCandidate(record))"
                  >
                    撤回
                  </UiButton>
                </a-space>
              </template>
            </template>
          </a-table>
        </UiCard>
      </template>
    </div>

    <!-- 成绩明细 Drawer -->
    <a-drawer v-model:open="detailOpen" title="试卷成绩明细" width="640" :destroy-on-close="true">
      <a-spin :spinning="detailLoading" tip="加载明细中...">
        <UiEmpty v-if="!paperScore" description="暂无成绩明细" />
        <div v-else>
          <a-descriptions :column="2" size="small" bordered class="detail-summary">
            <a-descriptions-item label="考生">
              {{ detailCandidate?.studentName || '-' }}（{{ detailCandidate?.studentNo || '-' }}）
            </a-descriptions-item>
            <a-descriptions-item label="班级">
              {{ detailCandidate?.studentClassName || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="试卷实例">
              <a-typography-text :content="paperScore.paperInstanceId" copyable />
            </a-descriptions-item>
            <a-descriptions-item label="总分">
              <a-typography-text strong type="success">
                {{ paperScore.totalScore ?? 0 }} 分
              </a-typography-text>
            </a-descriptions-item>
            <a-descriptions-item label="最终状态" :span="2">
              <UiTag
                :tone="
                  paperScore.finalScoreStatus
                    ? FINAL_SCORE_STATUS_TONE[paperScore.finalScoreStatus as FinalScoreStatusCode]
                    : 'gray'
                "
                size="sm"
              >
                {{
                  paperScore.finalScoreStatus
                    ? FINAL_SCORE_STATUS_LABEL[paperScore.finalScoreStatus as FinalScoreStatusCode]
                    : '未生成'
                }}
              </UiTag>
            </a-descriptions-item>
          </a-descriptions>

          <h4 class="detail-section-title">题目得分明细</h4>
          <a-table
            :columns="paperItemColumns"
            :data-source="paperScore.questions || []"
            :pagination="false"
            row-key="questionTemplateId"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'questionNo'">
                <UiTag tone="blue" size="sm">{{ record.questionNo || '-' }}</UiTag>
              </template>
              <template v-else-if="column.key === 'finalScore'">
                <a-typography-text v-if="record.finalScore != null" strong>
                  {{ record.finalScore }}
                </a-typography-text>
                <span v-else class="muted">-</span>
              </template>
            </template>
          </a-table>
        </div>
      </a-spin>
      <template #footer>
        <a-space>
          <UiButton
            v-if="
              detailCandidate?.paperInstanceId && detailCandidate?.finalScoreStatus === 'PUBLISHED'
            "
            variant="outline"
            size="sm"
            @click="handleDeanonymize"
          >
            <template #icon>
              <EyeOutlined />
            </template>
            解匿名查看
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="detailOpen = false">关闭</UiButton>
        </a-space>
      </template>
    </a-drawer>

    <!-- 确认成绩 Modal -->
    <a-modal
      v-model:open="confirmOpen"
      title="确认最终成绩"
      :confirm-loading="confirming"
      :mask-closable="false"
      width="520px"
      @ok="handleConfirm"
    >
      <a-form layout="vertical">
        <a-alert
          type="info"
          show-icon
          message="后端将以题目确认得分重新汇总作为最终总分。确认后状态进入「已确认」，需要进一步「发布」才会通知学生。"
          style="margin-bottom: 12px"
        />
        <a-form-item label="考生">
          <a-input
            :value="`${confirmCandidate?.studentName || ''}（${confirmCandidate?.studentNo || ''}）`"
            disabled
          />
        </a-form-item>
        <a-form-item label="试卷计算总分将作为最终分">
          <a-input
            :value="confirmComputedScore != null ? `${confirmComputedScore} 分` : '加载中...'"
            disabled
          />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model:checked="confirmAndPublish"> 确认后立即发布并通知学生 </a-checkbox>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 撤回成绩 Modal -->
    <a-modal
      v-model:open="withdrawOpen"
      title="撤回最终成绩"
      :confirm-loading="withdrawing"
      :mask-closable="false"
      width="520px"
      @ok="handleWithdraw"
    >
      <a-form layout="vertical">
        <a-alert
          type="warning"
          show-icon
          message="撤回后学生侧不再可见该成绩，撤回原因会落入审计日志。"
          style="margin-bottom: 12px"
        />
        <a-form-item label="考生">
          <a-input
            :value="`${withdrawCandidate?.studentName || ''}（${withdrawCandidate?.studentNo || ''}）`"
            disabled
          />
        </a-form-item>
        <a-form-item label="撤回原因" required>
          <a-textarea
            v-model:value="withdrawReason"
            placeholder="请输入撤回原因（必填）"
            :rows="3"
            :max-length="200"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { TablePaginationConfig } from 'ant-design-vue/es/table/interface'
import type {
  ExamPaperScoreVO,
  ExamQuestionScoreVO,
  ExamScoreSummaryItemVO,
  FinalScoreStatusCode,
} from '@/apis/mark/exam'
import {
  confirmFinalScore,
  deanonymizePaper,
  FINAL_SCORE_STATUS_LABEL,
  getPaperScore,
  pageExamScoreSummary,
  publishFinalScore,
  withdrawFinalScore,
} from '@/apis/mark/exam'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import EyeOutlined from '@ant-design/icons-vue/EyeOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { onMounted, reactive, ref, watch } from 'vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'

defineOptions({ name: 'TeacherScoreFinalize' })

type ToneCode = 'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

const FINAL_SCORE_STATUS_TONE: Record<FinalScoreStatusCode, ToneCode> = {
  PENDING: 'gray',
  CALCULATED: 'blue',
  CONFIRMED: 'blue',
  CORRECTED: 'orange',
  PUBLISHED: 'green',
  WITHDRAWN: 'red',
}

/** 将 a-table bodyCell slot 的 record 转为考试成绩汇总强类型 */
function toCandidate(record: unknown): ExamScoreSummaryItemVO {
  return record as ExamScoreSummaryItemVO
}

const finalStatusOptions = (Object.keys(FINAL_SCORE_STATUS_LABEL) as FinalScoreStatusCode[]).map(
  (code) => ({
    label: FINAL_SCORE_STATUS_LABEL[code],
    value: code,
  }),
)

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

// ─── 考生名单（服务端分页） ─────────────────────────────
const candidates = ref<ExamScoreSummaryItemVO[]>([])
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref<FinalScoreStatusCode | undefined>(undefined)

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
})

const columns: ColumnType<ExamScoreSummaryItemVO>[] = [
  { title: '学号', dataIndex: 'studentNo', key: 'studentNo', width: 140 },
  { title: '姓名', key: 'studentName', width: 120 },
  { title: '班级', dataIndex: 'studentClassName', key: 'studentClassName', width: 160 },
  { title: '最终分', key: 'finalScore', width: 110 },
  { title: '最终状态', key: 'finalScoreStatus', width: 110 },
  { title: '确认时间', key: 'confirmedTime', width: 170 },
  { title: '操作', key: 'actions', width: 320, fixed: 'right' },
]

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

async function loadCandidates(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    const result = await pageExamScoreSummary({
      examId: selectedExamId.value,
      keyword: keyword.value.trim() || undefined,
      finalScoreStatus: statusFilter.value,
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 20,
    })
    candidates.value = result.list || []
    pagination.total = result.total ?? 0
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '成绩汇总加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  pagination.current = 1
  void loadCandidates()
}

function handleReset(): void {
  keyword.value = ''
  statusFilter.value = undefined
  pagination.current = 1
  void loadCandidates()
}

function handleTableChange(pag: TablePaginationConfig): void {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 20
  void loadCandidates()
}

// ─── 状态机按钮可用性 ─────────────────────────────
function canConfirm(record: ExamScoreSummaryItemVO): boolean {
  if (!record.paperInstanceId) return false
  const s = record.finalScoreStatus
  // 未生成 / CALCULATED / WITHDRAWN / CORRECTED 都可以触发确认
  return !s || s === 'CALCULATED' || s === 'WITHDRAWN' || s === 'CORRECTED'
}
function confirmButtonLabel(record: ExamScoreSummaryItemVO): string {
  const s = record.finalScoreStatus
  if (s === 'WITHDRAWN' || s === 'CORRECTED') return '重新确认'
  return '确认'
}
function canPublish(record: ExamScoreSummaryItemVO): boolean {
  if (!record.paperInstanceId) return false
  const s = record.finalScoreStatus
  // CONFIRMED / WITHDRAWN / CORRECTED 可以发布
  return s === 'CONFIRMED' || s === 'WITHDRAWN' || s === 'CORRECTED'
}
function publishButtonLabel(record: ExamScoreSummaryItemVO): string {
  return record.finalScoreStatus === 'WITHDRAWN' ? '重新发布' : '发布'
}
function canWithdraw(record: ExamScoreSummaryItemVO): boolean {
  if (!record.paperInstanceId) return false
  const s = record.finalScoreStatus
  return s === 'PUBLISHED' || s === 'CORRECTED'
}

// ─── 成绩明细 Drawer ─────────────────────────────
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailCandidate = ref<ExamScoreSummaryItemVO | null>(null)
const paperScore = ref<ExamPaperScoreVO | null>(null)

const paperItemColumns: ColumnType<ExamQuestionScoreVO>[] = [
  { title: '题号', key: 'questionNo', width: 80 },
  { title: '题型', dataIndex: 'questionType', key: 'questionType', width: 100 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 80 },
  { title: '最终得分', key: 'finalScore', width: 100 },
  { title: '状态', dataIndex: 'gradeStatus', key: 'gradeStatus', width: 110 },
]

async function openDetailDrawer(record: ExamScoreSummaryItemVO): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  detailCandidate.value = record
  detailOpen.value = true
  detailLoading.value = true
  paperScore.value = null
  try {
    paperScore.value = await getPaperScore(selectedExamId.value, record.paperInstanceId)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '成绩明细加载失败'
    message.error(errMsg)
  } finally {
    detailLoading.value = false
  }
}

async function handleDeanonymize(): Promise<void> {
  if (!selectedExamId.value || !detailCandidate.value?.paperInstanceId) return
  try {
    const result = await deanonymizePaper({
      examId: selectedExamId.value,
      paperInstanceId: detailCandidate.value.paperInstanceId,
      revealScenario: 'SCORE_FINALIZE_REVIEW',
      reason: '成绩确认明细查看考生身份',
    })
    message.success(`解匿名成功：${result.studentName || ''}（${result.studentNo || ''}）`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '解匿名失败'
    message.error(errMsg)
  }
}

// ─── 确认成绩 Modal ─────────────────────────────
const confirmOpen = ref(false)
const confirming = ref(false)
const confirmCandidate = ref<ExamScoreSummaryItemVO | null>(null)
const confirmComputedScore = ref<number | null>(null)
const confirmAndPublish = ref(false)

async function openConfirmModal(record: ExamScoreSummaryItemVO): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  confirmCandidate.value = record
  confirmOpen.value = true
  confirmComputedScore.value = null
  confirmAndPublish.value = false
  try {
    const score = await getPaperScore(selectedExamId.value, record.paperInstanceId)
    confirmComputedScore.value = score.totalScore ?? 0
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '试卷计算总分加载失败'
    message.warning(errMsg)
  }
}

async function handleConfirm(): Promise<void> {
  if (!selectedExamId.value || !confirmCandidate.value?.paperInstanceId) return
  const examId = selectedExamId.value
  const paperInstanceId = confirmCandidate.value.paperInstanceId
  confirming.value = true
  try {
    await confirmFinalScore({ examId, paperInstanceId })
    if (confirmAndPublish.value) {
      await publishFinalScore({ examId, paperInstanceId })
      message.success('成绩已确认并发布，学生通知已下发')
    } else {
      message.success('成绩已确认（CONFIRMED），可在列表点击「发布」推进到 PUBLISHED')
    }
    confirmOpen.value = false
    await loadCandidates()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '成绩确认失败'
    message.error(errMsg)
  } finally {
    confirming.value = false
  }
}

// ─── 发布成绩 ─────────────────────────────
async function handlePublish(record: ExamScoreSummaryItemVO): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  try {
    await publishFinalScore({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
    message.success('成绩已发布，学生通知已下发')
    await loadCandidates()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '成绩发布失败'
    message.error(errMsg)
  }
}

// ─── 撤回成绩 Modal ─────────────────────────────
const withdrawOpen = ref(false)
const withdrawing = ref(false)
const withdrawCandidate = ref<ExamScoreSummaryItemVO | null>(null)
const withdrawReason = ref('')

function openWithdrawModal(record: ExamScoreSummaryItemVO): void {
  withdrawCandidate.value = record
  withdrawReason.value = ''
  withdrawOpen.value = true
}

async function handleWithdraw(): Promise<void> {
  if (!selectedExamId.value || !withdrawCandidate.value?.paperInstanceId) return
  const reason = withdrawReason.value.trim()
  if (!reason) {
    message.warning('请填写撤回原因')
    return
  }
  withdrawing.value = true
  try {
    await withdrawFinalScore({
      examId: selectedExamId.value,
      paperInstanceId: withdrawCandidate.value.paperInstanceId,
      reason,
    })
    message.success('成绩已撤回')
    withdrawOpen.value = false
    await loadCandidates()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '成绩撤回失败'
    message.error(errMsg)
  } finally {
    withdrawing.value = false
  }
}

// ─── 初始化 ─────────────────────────────────────
watch(selectedExamId, (value) => {
  pagination.current = 1
  if (value) {
    void loadCandidates()
  } else {
    candidates.value = []
    pagination.total = 0
  }
})

watch(statusFilter, () => {
  pagination.current = 1
  void loadCandidates()
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadCandidates()
  }
})
</script>

<style lang="scss" scoped>
.score-finalize-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.score-finalize-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.detail-summary {
  margin-bottom: 16px;
}

.detail-section-title {
  margin: 16px 0 8px 0;
  font-size: 14px;
  font-weight: 700;
}

.muted {
  color: var(--ant-color-text-tertiary);
}

.empty-block {
  padding: 60px 0;
}
</style>
