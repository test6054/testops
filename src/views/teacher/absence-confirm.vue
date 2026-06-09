<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <a-select
            :value="selectedExamId"
            class="absence-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
        </template>
        <template #actions>
          <UiButton
            size="sm"
            :disabled="!selectedExamId"
            :loading="reconciling"
            @click="handleReconcile(false)"
          >
            <template #icon><SyncOutlined /></template>
            出勤核对
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!selectedExamId"
            :loading="reconciling"
            @click="handleReconcile(true)"
          >
            <template #icon><PlusOutlined /></template>
            核对并新建待确认记录
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty v-if="!selectedExamId" description="请先选择一场考试" class="absence-page__empty" />

    <template v-else>
      <a-card title="出勤核对摘要" :bordered="false" size="small">
        <UiEmpty v-if="!reconcileVO" description="尚未执行出勤核对" />
        <div v-else class="absence-page__summary">
          <div class="absence-page__summary-ring">
            <UiRingProgress
              :percent="attendancePercent"
              size="lg"
              :color="
                attendancePercent >= 90
                  ? '#16a34a'
                  : attendancePercent >= 70
                    ? '#3b82f6'
                    : '#f59e0b'
              "
              label="出勤率"
            />
          </div>
          <UiStatPanel
            :items="reconcileMetrics"
            :columns="4"
            variant="grid"
            compact
            class="absence-page__summary-stats"
          />
        </div>
      </a-card>

      <UiCard v-if="reconcileVO && absentStudents.length" class="info-card">
        <template #title>
          <UserDeleteOutlined />
          <span class="section-title">核对检出的缺考学生</span>
        </template>
        <UiDataTable class="student-detail-table__data-table"
          :columns="absentColumns"
          :data-source="absentStudents"
          :show-pagination="false"
          flat
          :total="absentStudents.length"
          row-key="studentUserId"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <span
                  class="op-link primary"
                  role="button"
                  @click="openConfirmModal(record.studentUserId, formatStudentSnapshot(record))"
                >
                  确认缺考
                </span>
              </div>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <!-- D-9 错误态：缺考记录加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="recordsLoadError"
        :error="recordsLoadError"
        title="缺考记录加载失败"
        :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
        compact
        @retry="loadRecords"
      />
      <a-card v-else :bordered="false" class="detail-table-card info-card absence-page__records-card">
        <template #title>
          <SolutionOutlined />
          <span>缺考记录</span>
        </template>
        <div class="filter-card">
          <a-form layout="inline" class="filter-form filter-form--toolbar" @submit.prevent="loadRecords">
            <a-form-item label="状态">
              <a-select
                v-model:value="statusFilter"
                placeholder="全部状态"
                style="width: 160px"
                allow-clear
              >
                <a-select-option value="PENDING">待确认</a-select-option>
                <a-select-option value="CONFIRMED">已确认</a-select-option>
                <a-select-option value="REVOKED">已撤销</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item class="filter-form__actions">
              <a-space class="filter-form__action-group">
                <span class="op-link" role="button" @click="handleRecordFilterReset">重置</span>
                <UiButton size="sm" @click="loadRecords">查询</UiButton>
                <UiButton size="sm" variant="outline" :loading="recordLoading" @click="loadRecords">
                  <template #icon><ReloadOutlined /></template>
                  刷新
                </UiButton>
              </a-space>
            </a-form-item>
          </a-form>
        </div>
        <UiDataTable class="student-detail-table__data-table"
          :columns="recordColumns"
          :data-source="records"
          :loading="recordLoading"
          v-model:current="recordPagination.pageNum"
          v-model:page-size="recordPagination.pageSize"
          flat
          :total="recordPagination.total"
          row-key="absenceRecordId"
          size="middle"
          @page-change="handleRecordPageChange"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'absenceStatus'">
              <UiTag :tone="statusTone(records[index].absenceStatus)" size="sm">
                {{ statusLabel(records[index].absenceStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'absenceReason'">
              {{ reasonLabel(records[index].absenceReason) }}
            </template>
            <template v-else-if="column.key === 'scorePolicy'">
              {{ scorePolicyLabel(records[index].scorePolicy) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <span
                  v-if="records[index].absenceStatus === 'CONFIRMED'"
                  class="op-link"
                  role="button"
                  @click="openRevokeModal(records[index])"
                >
                  撤销
                </span>
                <span
                  v-else-if="records[index].absenceStatus === 'PENDING'"
                  class="op-link primary"
                  role="button"
                  @click="
                    openConfirmModal(
                      records[index].studentUserId,
                      formatStudentSnapshot(records[index]),
                    )
                  "
                >
                  确认
                </span>
                <span v-else class="hint-text">-</span>
              </div>
            </template>
          </template>
        </UiDataTable>
      </a-card>
    </template>
  </StageWorkbenchShell>

  <a-modal
    v-model:open="confirmModalOpen"
    title="确认缺考"
    :destroy-on-close="true"
    :confirm-loading="confirming"
    :ok-button-props="{ disabled: !confirmValid }"
    ok-text="确认"
    @ok="handleConfirm"
  >
    <a-form layout="vertical">
      <a-form-item label="学生">
        <a-input :value="confirmTargetName" disabled />
      </a-form-item>
      <a-form-item label="缺考原因" required>
        <a-select v-model:value="confirmForm.absenceReason" placeholder="选择缺考原因">
          <a-select-option v-for="(label, code) in ABSENCE_REASON_LABEL" :key="code" :value="code">
            {{ label }}
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="成绩处理策略" required>
        <a-select v-model:value="confirmForm.scorePolicy" placeholder="选择成绩处理策略">
          <a-select-option
            v-for="(label, code) in ABSENCE_SCORE_POLICY_LABEL"
            :key="code"
            :value="code"
          >
            {{ label }}
          </a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </a-modal>

  <a-modal
    v-model:open="revokeModalOpen"
    title="撤销缺考"
    :destroy-on-close="true"
    :confirm-loading="revoking"
    :ok-button-props="{ disabled: !revokeForm.revokeReason.trim() }"
    ok-text="撤销"
    @ok="handleRevoke"
  >
    <a-form layout="vertical">
      <a-form-item label="学生">
        <a-input :value="revokeTargetName" disabled />
      </a-form-item>
      <a-form-item label="撤销原因" required>
        <a-textarea
          v-model:value="revokeForm.revokeReason"
          :rows="4"
          placeholder="请描述撤销原因（必填）"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  AbsenceReasonCode,
  AbsenceRecordVO,
  AbsenceScorePolicyCode,
  AbsenceStatusCode,
  AbsentStudentSnapshotVO,
  AttendanceReconcileVO,
} from '@/apis/mark/absence'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SolutionOutlined from '@ant-design/icons-vue/SolutionOutlined'
import SyncOutlined from '@ant-design/icons-vue/SyncOutlined'
import UserDeleteOutlined from '@ant-design/icons-vue/UserDeleteOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ABSENCE_REASON_LABEL,
  ABSENCE_SCORE_POLICY_LABEL,
  ABSENCE_STATUS_LABEL,
  ABSENCE_STATUS_TONE,
  confirmAbsence,
  listAbsenceRecords,
  reconcileAttendance,
  revokeAbsence,
} from '@/apis/mark/absence'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiRingProgress,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { showUserError, toUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherAbsenceConfirm' })

// B-8 统一考试选择器
const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

interface AbsentStudentRow {
  studentUserId: string
  studentNo: string
  studentName: string
  className: string
}

const reconcileVO = ref<AttendanceReconcileVO | null>(null)
const reconciling = ref(false)

const records = ref<AbsenceRecordVO[]>([])
const recordLoading = ref(false)
// D-9 错误态：缺考记录加载失败时 UiErrorRetryPanel 重试 + 上报
const recordsLoadError = ref<Error | null>(null)
const statusFilter = ref<AbsenceStatusCode | undefined>(undefined)
const recordPagination = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0,
})

const absentStudents = computed<AbsentStudentRow[]>(() => {
  if (!reconcileVO.value) return []
  const confirmedIds = new Set(
    records.value
      .filter((r) => r.absenceStatus === 'CONFIRMED' || r.absenceStatus === 'PENDING')
      .map((r) => r.studentUserId),
  )
  return reconcileVO.value.absentStudents
    .filter((student) => !confirmedIds.has(student.studentUserId))
    .map(toAbsentStudentRow)
})

const attendancePercent = computed(() => {
  const total = reconcileVO.value?.expectedCount ?? 0
  const attended = reconcileVO.value?.attendedCount ?? 0
  return total > 0 ? Math.round((attended / total) * 100) : 0
})

const reconcileMetrics = computed(() => [
  {
    label: '应考人数',
    value: reconcileVO.value?.expectedCount ?? 0,
    unit: '人',
    tone: 'blue' as const,
  },
  {
    label: '已绑定试卷',
    value: reconcileVO.value?.attendedCount ?? 0,
    unit: '人',
    tone: 'green' as const,
  },
  {
    label: '缺考人数',
    value: reconcileVO.value?.absentCount ?? 0,
    unit: '人',
    tone: (reconcileVO.value?.absentCount ?? 0) > 0 ? ('orange' as const) : ('green' as const),
  },
  {
    label: '本次新建待确认记录',
    value: reconcileVO.value?.createdPendingCount ?? 0,
    unit: '条',
    tone: (reconcileVO.value?.createdPendingCount ?? 0) > 0 ? ('blue' as const) : ('gray' as const),
  },
])

const absentColumns: ColumnType<AbsentStudentRow>[] = [
  { title: '学号', key: 'studentNo', dataIndex: 'studentNo', width: 160 },
  { title: '姓名', key: 'studentName', dataIndex: 'studentName', width: 140 },
  { title: '班级', key: 'className', dataIndex: 'className', width: 180 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
]

const recordColumns: ColumnType<AbsenceRecordVO>[] = [
  { title: '学号', key: 'studentNo', dataIndex: 'studentNo', width: 150 },
  {
    title: '姓名',
    key: 'studentName',
    dataIndex: 'studentName',
    width: 120,
  },
  { title: '班级', key: 'className', dataIndex: 'className', width: 180 },
  { title: '状态', key: 'absenceStatus', width: 100 },
  { title: '缺考原因', key: 'absenceReason', width: 120 },
  { title: '成绩处理策略', key: 'scorePolicy', width: 140 },
  { title: '确认时间', key: 'confirmedTime', dataIndex: 'confirmedTime', width: 180 },
  { title: '撤销时间', key: 'revokedTime', dataIndex: 'revokedTime', width: 180 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
]

function toAbsentStudentRow(student: AbsentStudentSnapshotVO): AbsentStudentRow {
  return {
    studentUserId: student.studentUserId,
    studentNo: student.studentNo,
    studentName: student.studentName,
    className: student.className,
  }
}

function formatStudentSnapshot(
  record: Pick<AbsenceRecordVO, 'studentName' | 'studentNo' | 'className'>,
): string {
  return `${record.studentName}（${record.studentNo}，${record.className}）`
}

function statusLabel(status: AbsenceStatusCode): string {
  return strictEnumLabel(ABSENCE_STATUS_LABEL, status, '缺考状态')
}

function statusTone(status: AbsenceStatusCode): BadgeTone {
  return strictEnumTone(ABSENCE_STATUS_TONE, status, '缺考状态')
}

function reasonLabel(reason: AbsenceReasonCode): string {
  return strictEnumLabel(ABSENCE_REASON_LABEL, reason, '缺考原因')
}

function scorePolicyLabel(policy: AbsenceScorePolicyCode): string {
  return strictEnumLabel(ABSENCE_SCORE_POLICY_LABEL, policy, '缺考成绩策略')
}

async function loadRecords(): Promise<void> {
  if (!selectedExamId.value) {
    records.value = []
    recordPagination.total = 0
    recordsLoadError.value = null
    return
  }
  recordLoading.value = true
  try {
    const page = await listAbsenceRecords({
      examId: selectedExamId.value,
      absenceStatus: statusFilter.value,
      pageNum: recordPagination.pageNum,
      pageSize: recordPagination.pageSize,
    })
    records.value = readPageList(page, '缺考记录加载失败，请稍后重试')
    recordPagination.pageNum = page.pageNum
    recordPagination.pageSize = page.pageSize
    recordPagination.total = readPageTotal(page, '缺考记录加载失败，请稍后重试')
    recordsLoadError.value = null
  } catch (error) {
    recordsLoadError.value = toUserError(error, '缺考记录加载失败')
    showUserError(error, '缺考记录加载失败')
  } finally {
    recordLoading.value = false
  }
}

function handleRecordPageChange(page: { current: number, pageSize: number }): void {
  recordPagination.pageNum = page.current
  recordPagination.pageSize = page.pageSize
  void loadRecords()
}

async function handleReconcile(createPending: boolean): Promise<void> {
  if (!selectedExamId.value) return
  reconciling.value = true
  try {
    reconcileVO.value = await reconcileAttendance({
      examId: selectedExamId.value,
      createPendingAbsence: createPending,
    })
    if (createPending && reconcileVO.value.createdPendingCount > 0) {
      message.success(`已为 ${reconcileVO.value.createdPendingCount} 名缺考学生创建待确认记录`)
    }
    await loadRecords()
  } catch (error) {
    showUserError(error, '出勤核对失败')
  } finally {
    reconciling.value = false
  }
}

// ─── 确认缺考 Modal ─────────────────────────────

const confirmModalOpen = ref(false)
const confirming = ref(false)
const confirmTargetName = ref('')
const confirmForm = reactive<{
  studentUserId: string
  absenceReason: AbsenceReasonCode | undefined
  scorePolicy: AbsenceScorePolicyCode | undefined
}>({
  studentUserId: '',
  absenceReason: undefined,
  scorePolicy: undefined,
})

const confirmValid = computed(() =>
  Boolean(confirmForm.studentUserId && confirmForm.absenceReason && confirmForm.scorePolicy),
)

function openConfirmModal(studentUserId: string, displayName: string): void {
  confirmForm.studentUserId = studentUserId
  confirmForm.absenceReason = undefined
  confirmForm.scorePolicy = undefined
  confirmTargetName.value = displayName
  confirmModalOpen.value = true
}

async function handleConfirm(): Promise<void> {
  if (!selectedExamId.value || !confirmValid.value) return
  const reason = confirmForm.absenceReason
  const policy = confirmForm.scorePolicy
  if (!reason || !policy) return
  confirming.value = true
  try {
    await confirmAbsence({
      examId: selectedExamId.value,
      studentUserId: confirmForm.studentUserId,
      absenceReason: reason,
      scorePolicy: policy,
    })
    message.success('已确认缺考')
    confirmModalOpen.value = false
    await Promise.all([loadRecords(), handleReconcile(false)])
  } catch (error) {
    showUserError(error, '缺考确认失败')
  } finally {
    confirming.value = false
  }
}

// ─── 撤销缺考 Modal ─────────────────────────────

const revokeModalOpen = ref(false)
const revoking = ref(false)
const revokeTargetName = ref('')
const revokeForm = reactive<{ studentUserId: string, revokeReason: string }>({
  studentUserId: '',
  revokeReason: '',
})

function openRevokeModal(record: AbsenceRecordVO): void {
  revokeForm.studentUserId = record.studentUserId
  revokeForm.revokeReason = ''
  revokeTargetName.value = formatStudentSnapshot(record)
  revokeModalOpen.value = true
}

async function handleRevoke(): Promise<void> {
  if (!selectedExamId.value) return
  const reason = revokeForm.revokeReason.trim()
  if (!reason) return
  revoking.value = true
  try {
    await revokeAbsence({
      examId: selectedExamId.value,
      studentUserId: revokeForm.studentUserId,
      revokeReason: reason,
    })
    message.success('已撤销缺考')
    revokeModalOpen.value = false
    await loadRecords()
  } catch (error) {
    showUserError(error, '缺考撤销失败')
  } finally {
    revoking.value = false
  }
}

// ─── 事件处理 ─────────────────────────────────

async function handleExamChange(
  value: SelectValue,
  option: DefaultOptionType | DefaultOptionType[],
): Promise<void> {
  onExamChange(value, option)
  reconcileVO.value = null
  records.value = []
  recordPagination.pageNum = 1
  recordPagination.total = 0
  if (selectedExamId.value) {
    await loadRecords()
  }
}

function handleRecordFilterReset() {
  statusFilter.value = undefined
}

watch(
  () => statusFilter.value,
  () => {
    if (selectedExamId.value) {
      recordPagination.pageNum = 1
      void loadRecords()
    }
  },
)

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadRecords()
  }
})
</script>

<style lang="scss" scoped>
.hint-text {
  color: var(--dp-text-muted, #64748b);
  font-size: 12px;
}

.info-card {
  :deep(.ant-card-head-title) {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.absence-page {
  &__exam-select {
    width: 280px;
  }

  &__empty {
    margin-top: 80px;
  }

  &__summary {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  &__summary-ring {
    flex-shrink: 0;
  }

  &__summary-stats {
    flex: 1;
    min-width: 0;
  }
}
</style>
