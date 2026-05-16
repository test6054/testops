<template>
  <GiPageLayout>
    <div class="absence-page">
      <PageHeader title="缺考确认">
        <template #tags>
          <UiTag v-if="reconcileVO" tone="blue" size="md">应考 {{ reconcileVO.expectedCount }}</UiTag>
          <UiTag v-if="reconcileVO" tone="green" size="md">已绑定 {{ reconcileVO.attendedCount }}</UiTag>
          <UiTag v-if="reconcileVO" tone="orange" size="md">缺考 {{ reconcileVO.absentCount }}</UiTag>
        </template>
        <template #actions>
          <a-select
            v-model:value="selectedExamId"
            style="width: 280px"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examOptionsLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
          <UiButton size="sm" :disabled="!selectedExamId" :loading="reconciling" @click="handleReconcile(false)">
            <template #icon><SyncOutlined /></template>
            出勤核对
          </UiButton>
          <UiButton size="sm" variant="outline" :disabled="!selectedExamId" :loading="reconciling" @click="handleReconcile(true)">
            <template #icon><PlusOutlined /></template>
            核对并新建 PENDING
          </UiButton>
        </template>
      </PageHeader>

      <UiEmpty v-if="!selectedExamId" description="请先选择一场考试" class="empty-block" />

      <template v-else>
        <UiCard class="info-card">
          <template #title>
            <AuditOutlined />
            <span>出勤核对摘要</span>
            <UiBadge v-if="reconcileVO" tone="blue">{{ reconcileVO.absentCount }} 名缺考</UiBadge>
          </template>
          <a-alert
            v-if="!reconcileVO"
            type="info"
            show-icon
            message="尚未执行出勤核对"
            description="点击「出勤核对」对比应考名单与已绑定试卷。选择「核对并新建 PENDING」会同时为缺考学生创建待确认记录。"
          />
          <a-descriptions v-else :column="4" bordered size="small">
            <a-descriptions-item label="应考人数"><b>{{ reconcileVO.expectedCount }}</b></a-descriptions-item>
            <a-descriptions-item label="已绑定试卷"><b style="color: #389e0d">{{ reconcileVO.attendedCount }}</b></a-descriptions-item>
            <a-descriptions-item label="缺考人数"><b style="color: #d4380d">{{ reconcileVO.absentCount }}</b></a-descriptions-item>
            <a-descriptions-item label="本次新建 PENDING"><b>{{ reconcileVO.createdPendingCount }}</b></a-descriptions-item>
          </a-descriptions>
        </UiCard>

        <UiCard v-if="reconcileVO && absentStudents.length" class="info-card">
          <template #title>
            <UserDeleteOutlined />
            <span>核对检出的缺考学生</span>
            <UiBadge tone="orange">{{ absentStudents.length }}</UiBadge>
          </template>
          <a-table :columns="absentColumns" :data-source="absentStudents" :pagination="false" row-key="studentUserId" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <UiButton size="sm" @click="openConfirmModal(record.studentUserId, record.studentName)">确认缺考</UiButton>
              </template>
            </template>
          </a-table>
        </UiCard>

        <UiCard class="info-card">
          <template #title>
            <SolutionOutlined />
            <span>缺考记录</span>
            <UiBadge tone="blue">{{ records.length }}</UiBadge>
          </template>
          <template #extra>
            <a-space>
              <a-select v-model:value="statusFilter" placeholder="状态过滤" style="width: 160px" allow-clear @change="loadRecords">
                <a-select-option value="PENDING">待确认</a-select-option>
                <a-select-option value="CONFIRMED">已确认</a-select-option>
                <a-select-option value="REVOKED">已撤销</a-select-option>
              </a-select>
              <UiButton size="sm" variant="outline" :loading="recordLoading" @click="loadRecords">
                <template #icon><ReloadOutlined /></template>
                刷新
              </UiButton>
            </a-space>
          </template>
          <a-table :columns="recordColumns" :data-source="records" :loading="recordLoading" :pagination="{ pageSize: 20, showSizeChanger: false }" row-key="absenceRecordId" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'absenceStatus'">
                <UiTag :tone="statusTone(asAbsenceRecord(record).absenceStatus)" size="sm">{{ statusLabel(asAbsenceRecord(record).absenceStatus) }}</UiTag>
              </template>
              <template v-else-if="column.key === 'absenceReason'">
                {{ reasonLabel(asAbsenceRecord(record).absenceReason) }}
              </template>
              <template v-else-if="column.key === 'scorePolicy'">
                {{ scorePolicyLabel(asAbsenceRecord(record).scorePolicy) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiButton v-if="asAbsenceRecord(record).absenceStatus === 'CONFIRMED'" size="sm" variant="outline" @click="openRevokeModal(asAbsenceRecord(record))">撤销</UiButton>
                <UiButton v-else-if="asAbsenceRecord(record).absenceStatus === 'PENDING'" size="sm" @click="openConfirmModal(asAbsenceRecord(record).studentUserId, studentNameOf(asAbsenceRecord(record).studentUserId))">确认</UiButton>
                <span v-else class="hint-text">-</span>
              </template>
            </template>
          </a-table>
        </UiCard>
      </template>
    </div>

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
            <a-select-option v-for="(label, code) in ABSENCE_REASON_LABEL" :key="code" :value="code">{{ label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="成绩处理策略" required>
          <a-select v-model:value="confirmForm.scorePolicy" placeholder="选择成绩处理策略">
            <a-select-option v-for="(label, code) in ABSENCE_SCORE_POLICY_LABEL" :key="code" :value="code">{{ label }}</a-select-option>
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
          <a-textarea v-model:value="revokeForm.revokeReason" :rows="4" placeholder="请描述撤销原因（必填）" />
        </a-form-item>
      </a-form>
    </a-modal>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  AbsenceReasonCode,
  AbsenceRecordVO,
  AbsenceScorePolicyCode,
  AbsenceStatusCode,
  AttendanceReconcileVO,
} from '@/apis/mark/absence'
import type { ExamCandidateVO, ExamSummaryVO } from '@/apis/mark/exam'
import AuditOutlined from '@ant-design/icons-vue/AuditOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SolutionOutlined from '@ant-design/icons-vue/SolutionOutlined'
import SyncOutlined from '@ant-design/icons-vue/SyncOutlined'
import UserDeleteOutlined from '@ant-design/icons-vue/UserDeleteOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import { listExamCandidates, pageExams } from '@/apis/mark/exam'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import type { BadgeTone } from '@/components/ui-guide/ui/types'

defineOptions({ name: 'TeacherAbsenceConfirm' })

const route = useRoute()
const router = useRouter()

interface AbsentStudentRow {
  studentUserId: string
  studentNo: string
  studentName: string
  classId?: string
}

const selectedExamId = ref<string | undefined>(
  route.query.examId ? String(route.query.examId) : undefined,
)
const examOptions = ref<Array<{ label: string, value: string }>>([])
const examOptionsLoading = ref(false)

const candidates = ref<ExamCandidateVO[]>([])
const reconcileVO = ref<AttendanceReconcileVO | null>(null)
const reconciling = ref(false)

const records = ref<AbsenceRecordVO[]>([])
const recordLoading = ref(false)
const statusFilter = ref<AbsenceStatusCode | undefined>(undefined)

const absentStudents = computed<AbsentStudentRow[]>(() => {
  if (!reconcileVO.value) return []
  const confirmedIds = new Set(
    records.value
      .filter((r) => r.absenceStatus === 'CONFIRMED' || r.absenceStatus === 'PENDING')
      .map((r) => r.studentUserId),
  )
  const candidateMap = new Map(candidates.value.map((c) => [c.studentUserId, c]))
  return (reconcileVO.value.absentStudentUserIds ?? [])
    .filter((sid) => !confirmedIds.has(sid))
    .map((sid) => {
      const c = candidateMap.get(sid)
      return {
        studentUserId: sid,
        studentNo: c?.studentNo ?? '-',
        studentName: c?.studentName ?? '-',
        classId: c?.classId,
      }
    })
})

const absentColumns: ColumnType<AbsentStudentRow>[] = [
  { title: '学号', key: 'studentNo', dataIndex: 'studentNo', width: 160 },
  { title: '姓名', key: 'studentName', dataIndex: 'studentName', width: 140 },
  { title: '学生用户ID', key: 'studentUserId', dataIndex: 'studentUserId', width: 160 },
  { title: '班级ID', key: 'classId', dataIndex: 'classId', width: 120 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
]

const recordColumns: ColumnType<AbsenceRecordVO>[] = [
  { title: '学生用户ID', key: 'studentUserId', dataIndex: 'studentUserId', width: 140 },
  {
    title: '姓名',
    key: 'studentName',
    width: 120,
    customRender: ({ record }) => studentNameOf(record.studentUserId),
  },
  { title: '状态', key: 'absenceStatus', width: 100 },
  { title: '缺考原因', key: 'absenceReason', width: 120 },
  { title: '成绩处理策略', key: 'scorePolicy', width: 140 },
  { title: '确认时间', key: 'confirmedTime', dataIndex: 'confirmedTime', width: 180 },
  { title: '撤销时间', key: 'revokedTime', dataIndex: 'revokedTime', width: 180 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
]

function studentNameOf(studentUserId: string): string {
  const c = candidates.value.find((x) => x.studentUserId === studentUserId)
  return c ? `${c.studentName}（${c.studentNo}）` : studentUserId
}

function statusLabel(status: AbsenceStatusCode | undefined): string {
  if (!status) return '-'
  return ABSENCE_STATUS_LABEL[status] ?? status
}

function statusTone(status: AbsenceStatusCode | undefined): BadgeTone {
  if (!status) return 'gray'
  return ABSENCE_STATUS_TONE[status] ?? 'gray'
}

function reasonLabel(reason: AbsenceReasonCode | undefined): string {
  if (!reason) return '-'
  return ABSENCE_REASON_LABEL[reason] ?? '-'
}

function scorePolicyLabel(policy: AbsenceScorePolicyCode | undefined): string {
  if (!policy) return '-'
  return ABSENCE_SCORE_POLICY_LABEL[policy] ?? '-'
}

/** 模板类型桥接：将 a-table slot 的 Record<string, any> 转为后端真实 VO 类型 AbsenceRecordVO */
function asAbsenceRecord(record: Record<string, unknown>): AbsenceRecordVO {
  return record as unknown as AbsenceRecordVO
}

async function loadExamOptions(): Promise<void> {
  examOptionsLoading.value = true
  try {
    const result = await pageExams({ pageNum: 1, pageSize: 200 })
    examOptions.value = (result.list ?? []).map((item: ExamSummaryVO) => ({
      label: `${item.examName}（${item.statusMessage}）`,
      value: item.examId,
    }))
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载考试列表失败')
  } finally {
    examOptionsLoading.value = false
  }
}

async function loadCandidates(): Promise<void> {
  if (!selectedExamId.value) {
    candidates.value = []
    return
  }
  try {
    candidates.value = await listExamCandidates(selectedExamId.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载考生名册失败')
  }
}

async function loadRecords(): Promise<void> {
  if (!selectedExamId.value) {
    records.value = []
    return
  }
  recordLoading.value = true
  try {
    records.value = await listAbsenceRecords({
      examId: selectedExamId.value,
      absenceStatus: statusFilter.value,
    })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载缺考记录失败')
  } finally {
    recordLoading.value = false
  }
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
    message.error(error instanceof Error ? error.message : '出勤核对失败')
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

const confirmValid = computed(
  () => Boolean(confirmForm.studentUserId && confirmForm.absenceReason && confirmForm.scorePolicy),
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
    message.error(error instanceof Error ? error.message : '确认缺考失败')
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
  revokeTargetName.value = studentNameOf(record.studentUserId)
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
    message.error(error instanceof Error ? error.message : '撤销缺考失败')
  } finally {
    revoking.value = false
  }
}

// ─── 事件处理 ─────────────────────────────────

async function handleExamChange(value: unknown): Promise<void> {
  const next = value != null ? String(value) : undefined
  selectedExamId.value = next
  void router.replace({ query: next ? { examId: next } : {} })
  reconcileVO.value = null
  records.value = []
  candidates.value = []
  if (next) {
    await Promise.all([loadCandidates(), loadRecords()])
  }
}

watch(
  () => statusFilter.value,
  () => {
    if (selectedExamId.value) {
      void loadRecords()
    }
  },
)

onMounted(async () => {
  await loadExamOptions()
  if (selectedExamId.value) {
    await Promise.all([loadCandidates(), loadRecords()])
  }
})
</script>

<style lang="scss" scoped>
.absence-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  :deep(.ant-card-head-title) {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.empty-block {
  margin-top: 80px;
}

.hint-text {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
