<template>
  <StageWorkbenchShell class="absence-page">
    <template #context>
      <ContextBar layout="workbench">
        <template #status>
          <UiTag tone="blue" size="sm">阶段 缺考确认</UiTag>
          <UiTag v-if="pendingAbsenceCount > 0" tone="orange" size="sm">
            待确认 {{ pendingAbsenceCount }} 条
          </UiTag>
          <UiTag v-else-if="unreconciledAbsenceCount > 0" tone="orange" size="sm">
            未对账 {{ unreconciledAbsenceCount }} 人
          </UiTag>
          <UiTag v-else-if="reconcileVO" tone="green" size="sm">无缺考阻塞</UiTag>
        </template>
        <template #actions>
          <UiButton size="sm" :loading="reconciling" @click="handleReconcile(false)">
            <template #icon><SyncOutlined /></template>
            出勤核对
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :loading="reconciling"
            @click="handleReconcile(true)"
          >
            <template #icon><PlusOutlined /></template>
            核对并新建待确认记录
          </UiButton>
          <UiButton v-if="pendingMakeupCount > 0" size="sm" @click="openDeriveMakeupModal">
            派生补考
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :loading="repairingScoreZero"
            @click="handleRepairScoreZero"
          >
            补齐计零终分
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="reconcileVO" #signal>
      <div class="absence-page__summary">
        <div class="absence-page__summary-ring">
          <MarkGaugeBlock v-bind="attendanceGaugeBlockProps" />
        </div>
        <SignalBand
          variant="tiles"
          :metrics="absenceListMetrics"
          compact
          class="absence-page__summary-stats"
        />
      </div>
    </template>

    <UiEmpty v-if="!selectedExamId" description="请从考试工作台进入缺考确认" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiAlertStrip
        v-if="pendingAbsenceCount > 0"
        tone="warning"
        title="仍有缺考记录待确认"
        :description="`当前还有 ${pendingAbsenceCount} 条待确认缺考，成绩发布前须完成核对。`"
        dense
        class="absence-page__alert"
      >
        <template #actions>
          <UiButton variant="primary" size="sm" @click="goScorePublish"> 前往成绩发布 </UiButton>
        </template>
      </UiAlertStrip>

      <UiAlertStrip
        v-if="unreconciledAbsenceCount > 0"
        tone="warning"
        title="仍有应考学生未完成缺考核对"
        :description="`当前还有 ${unreconciledAbsenceCount} 名应考学生未对账（含无卷或最新卷为废卷 DISCARDED）。到场但未绑定/冲突卷不会出现在此列表，须先在扫描批次处理。请执行「核对并新建待确认记录」后逐条确认。`"
        dense
        class="absence-page__alert"
      >
        <template #actions>
          <UiButton
            variant="primary"
            size="sm"
            :loading="reconciling"
            @click="handleReconcile(true)"
          >
            核对并新建待确认记录
          </UiButton>
        </template>
      </UiAlertStrip>

      <UiEmpty v-if="!reconcileVO && !recordLoading" description="尚未执行出勤核对，无法确认缺考名单">
        <template #action>
          <UiButton variant="primary" size="sm" :loading="reconciling" @click="handleReconcile(false)">
            立即出勤核对
          </UiButton>
        </template>
      </UiEmpty>

      <WorkbenchSurfaceCard
        v-if="reconcileVO && reconcileVO.absentCount > 0"
        flush
        class="absence-page__section"
      >
        <template #head>
          <h3 class="absence-page__section-title">核对检出的缺考学生</h3>
        </template>
        <UiDataTable
          pagination-mode="server"
          :columns="absentColumns"
          :data-source="absentStudents"
          :loading="absentStudentLoading"
          v-model:current="absentStudentPagination.pageNum"
          v-model:page-size="absentStudentPagination.pageSize"
          flat
          :total="absentStudentPagination.total"
          row-key="studentUserId"
          size="middle"
          @page-change="handleAbsentStudentPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'studentNo'">
              <span class="score-summary-table__mono">{{ record.studentNo || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildAbsentStudentActions(record)"
                split
                @action="(key) => handleAbsentStudentAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard flush class="absence-page__section">
        <template #head>缺考记录</template>
        <template #toolbar>
          <div class="absence-page__record-toolbar">
            <UiFilterBar
              v-model="recordFilterForm"
              :fields="recordFilterFields"
              search-text="查询"
              variant="plain"
              @search="handleRecordFilterSearch"
              @reset="handleRecordFilterReset"
            />
            <p class="absence-page__flow-hint">{{ ABSENCE_STATUS_FLOW_HINT }}</p>
            <UiButton
              v-if="pendingMakeupCount > 0"
              size="sm"
              variant="outline"
              @click="openDeriveMakeupModal"
            >
              推导补考名单
            </UiButton>
          </div>
        </template>
        <UiDataTable
          pagination-mode="server"
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
            <template v-if="column.key === 'studentNo'">
              <span class="score-summary-table__mono">{{ records[index].studentNo || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'absenceReason'">
              <UiTag :tone="reasonTone(records[index].absenceReason)" size="sm">
                {{ reasonLabel(records[index].absenceReason) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'scorePolicy'">
              {{ scorePolicyLabel(records[index].scorePolicy) }}
            </template>
            <template v-else-if="column.key === 'confirmState'">
              <UiTag :tone="confirmStateTone(records[index].absenceStatus)" size="sm">
                {{ confirmStateLabel(records[index].absenceStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'confirmedBy'">
              {{ records[index].confirmedUserId || '—' }}
            </template>
            <template v-else-if="column.key === 'makeupEligible'">
              <UiTag v-if="isPendingMakeupRecord(records[index])" tone="green" size="sm">
                可补考
              </UiTag>
              <UiTag
                v-else-if="records[index].absenceStatus === AbsenceStatusCode.CONFIRMED"
                tone="gray"
                size="sm"
              >
                不可
              </UiTag>
              <span v-else class="hint-text">—</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                v-if="buildAbsenceRecordActions(records[index]).length > 0"
                :items="buildAbsenceRecordActions(records[index])"
                split
                @action="(key) => handleAbsenceRecordAction(key, records[index])"
              />
              <span v-else class="hint-text">-</span>
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>

      <ScorePublishRelatedLinksCard variant="absence" />
    </template>

    <UiDrawer
      v-model:open="confirmModalOpen"
      title="确认缺考"
      :width="520"
      :hide-footer="false"
      @close="confirmModalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="学生">
          <a-input :value="confirmTargetName" disabled />
        </a-form-item>
        <a-form-item label="缺考原因" required>
          <a-select v-model:value="confirmForm.absenceReason" placeholder="选择缺考原因">
            <a-select-option
              v-for="opt in ABSENCE_REASON_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="成绩处理策略" required>
          <a-select v-model:value="confirmForm.scorePolicy" placeholder="选择成绩处理策略">
            <a-select-option
              v-for="opt in SCORE_POLICY_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <UiAlertStrip
          v-if="confirmForm.scorePolicy === ScorePolicyCode.SCORE_ZERO"
          tone="info"
          title="计零分将立即写入正式零分"
          description="确认后卷面分/总分记 0 并同步质量评价样本，可在成绩确认/发布页直接发布；撤销缺考前若已发布须先撤回成绩。"
          dense
        />
      </a-form>
      <template #footer>
        <UiButton variant="outline" @click="confirmModalOpen = false">取消</UiButton>
        <UiButton :loading="confirming" :disabled="!confirmValid" @click="handleConfirm">
          确认
        </UiButton>
      </template>
    </UiDrawer>

    <UiDrawer
      v-model:open="revokeModalOpen"
      title="撤销缺考"
      :width="520"
      :hide-footer="false"
      @close="revokeModalOpen = false"
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
      <template #footer>
        <UiButton variant="outline" @click="revokeModalOpen = false">取消</UiButton>
        <UiButton
          :loading="revoking"
          :disabled="!revokeForm.revokeReason.trim()"
          @click="handleRevoke"
        >
          撤销
        </UiButton>
      </template>
    </UiDrawer>

    <UiDrawer
      v-model:open="deriveModalOpen"
      title="派生补考"
      :width="520"
      :hide-footer="false"
      @close="deriveModalOpen = false"
    >
      <UiSkeletonState v-if="deriveDetailLoading" variant="card" compact />
      <a-form v-else layout="vertical">
        <a-form-item label="待补考学生">
          <a-input :value="`${pendingMakeupCount} 人`" disabled />
        </a-form-item>
        <a-form-item label="补考学年" required>
          <a-input v-model:value="deriveForm.academicYear" placeholder="如 2024-2025" />
        </a-form-item>
        <a-form-item label="补考学期" required>
          <a-select
            v-model:value="deriveForm.semester"
            placeholder="选择学期"
            :options="SemesterOptions"
          />
        </a-form-item>
        <a-form-item label="补考名称" required>
          <a-input v-model:value="deriveForm.examName" placeholder="补考名称" />
        </a-form-item>
        <a-form-item label="补考编号" required>
          <a-input v-model:value="deriveForm.examNo" placeholder="补考编号" />
        </a-form-item>
        <a-form-item label="考试时间窗" required>
          <a-range-picker
            v-model:value="deriveForm.examWindow"
            show-time
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
      <template #footer>
        <UiButton variant="outline" @click="deriveModalOpen = false">取消</UiButton>
        <UiButton
          :loading="deriving"
          :disabled="!deriveValid || deriveDetailLoading"
          @click="handleDeriveMakeup"
        >
          派生
        </UiButton>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  AbsenceReasonCode,
  AbsenceRecordResponse,
  AbsentStudentSnapshotResponse,
  AttendanceReconcileResponse,
} from '@/apis/mark/absence'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import SyncOutlined from '@ant-design/icons-vue/SyncOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ABSENCE_REASON_OPTIONS,
  ABSENCE_REASON_TONE,
  ABSENCE_STATUS_FLOW_HINT,
  ABSENCE_STATUS_TONE,
  AbsenceReasonDescription,
  AbsenceStatusCode,
  AbsenceStatusDescription,
  confirmAbsence,
  countPendingMakeupAbsences,
  getAbsenceExamStats,
  pageAbsenceRecords,
  pageReconcileAbsentStudents,
  reconcileAttendance,
  repairScoreZeroFinalScores,
  revokeAbsence,
  SCORE_POLICY_OPTIONS,
  ScorePolicyCode,
  ScorePolicyDescription,
} from '@/apis/mark/absence'
import { deriveMakeupExam, getExamDetail } from '@/apis/mark/exam'
import { getScorePanel } from '@/apis/mark/exam-progress'
import MarkGaugeBlock from '@/components/chart/MarkGaugeBlock.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import ScorePublishRelatedLinksCard from '@/components/workbench/ScorePublishRelatedLinksCard.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { ExamKindCode } from '@/types/enums/exam-kind-enum'
import { ExamStatusCode } from '@/types/enums/exam-status-enum'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { formatGaugeAriaLabel } from '@/utils/mark-chart-accessibility'
import { buildGaugeChartOption } from '@/utils/mark-echarts-options'
import { toneToColor } from '@/utils/score-tone'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherAbsenceConfirm' })

const { selectedExamId } = useMarkExamContext()
const router = useRouter()
const { refreshSnapshot } = useWorkspaceExamId()

interface AbsentStudentRow {
  studentUserId: string
  studentNo: string
  studentName: string
  className: string
}

const reconcileVO = ref<AttendanceReconcileResponse | null>(null)
const reconciling = ref(false)
const pendingAbsenceCount = ref(0)
const confirmedAbsenceCount = ref(0)
const unreconciledAbsenceCount = ref(0)

const records = ref<AbsenceRecordResponse[]>([])
const recordLoading = ref(false)
const recordFilterForm = reactive<{ status?: AbsenceStatusCode }>({
  status: undefined,
})

const recordFilterFields: FilterField[] = [
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '全部状态',
    allowClear: true,
    width: 160,
    options: [
      { value: AbsenceStatusCode.PENDING, label: '待确认' },
      { value: AbsenceStatusCode.CONFIRMED, label: '已确认' },
      { value: AbsenceStatusCode.MAKEUP_ARRANGED, label: '已安排补考' },
      { value: AbsenceStatusCode.MAKEUP_COMPLETED, label: '已完成补考' },
      { value: AbsenceStatusCode.REVOKED, label: '已撤销' },
    ],
  },
]
const recordPagination = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

const absentStudents = ref<AbsentStudentRow[]>([])
const absentStudentLoading = ref(false)
const absentStudentPagination = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

const attendancePercent = computed(() => {
  const total = reconcileVO.value?.expectedCount ?? 0
  const attended = reconcileVO.value?.attendedCount ?? 0
  return total > 0 ? Math.round((attended / total) * 100) : 0
})

/** 出勤率环色：≥90 充足绿 / ≥70 一般蓝 / 偏低橙 */
const attendanceRingColor = computed(() => {
  const tone: BadgeTone
    = attendancePercent.value >= 90 ? 'green' : attendancePercent.value >= 70 ? 'blue' : 'orange'
  return toneToColor(tone)
})

const { chartOption: attendanceGaugeOption } = useChartOption(() =>
  buildGaugeChartOption(attendancePercent.value, {
    label: '出勤率',
    color: attendanceRingColor.value,
    size: 'md',
  }),
)

const attendanceAriaLabel = computed(() => {
  const expected = reconcileVO.value?.expectedCount ?? 0
  const attended = reconcileVO.value?.attendedCount ?? 0
  const detail = expected > 0 ? `实到 ${attended} / 应考 ${expected} 人` : '暂无应考人数'
  return formatGaugeAriaLabel('出勤率', attendancePercent.value, detail)
})

const attendanceGaugeBlockProps = computed(
  (): {
    option: typeof attendanceGaugeOption.value
    ariaLabel: string
    layout: 'stacked'
  } => ({
    option: attendanceGaugeOption.value,
    ariaLabel: attendanceAriaLabel.value,
    layout: 'stacked',
  }),
)

const absenceListMetrics = computed((): SignalMetric[] => {
  const absentTotal = reconcileVO.value?.absentCount ?? 0
  return [
    {
      key: 'absent',
      label: '缺考人数',
      value: absentTotal,
      unit: '人',
      tone: absentTotal > 0 ? 'red' : 'gray',
    },
    {
      key: 'confirmed',
      label: '已确认',
      value: confirmedAbsenceCount.value,
      unit: '人',
      tone: 'green',
    },
    {
      key: 'makeup',
      label: '可补考',
      value: pendingMakeupCount.value,
      unit: '人',
      tone: pendingMakeupCount.value > 0 ? 'blue' : 'gray',
    },
  ]
})

const absentColumns: ColumnType<AbsentStudentRow>[] = [
  { title: '学号', key: 'studentNo', dataIndex: 'studentNo', width: 160, fixed: 'left' },
  { title: '姓名', key: 'studentName', dataIndex: 'studentName', width: 140 },
  { title: '班级', key: 'className', dataIndex: 'className', width: 180 },
  { title: '操作', key: 'actions', width: 100 },
]

const recordColumns: ColumnType<AbsenceRecordResponse>[] = [
  { title: '学号', key: 'studentNo', width: 120, fixed: 'left' },
  { title: '姓名', key: 'studentName', dataIndex: 'studentName', width: 96 },
  { title: '缺考类型', key: 'absenceReason', width: 100 },
  { title: '成绩策略', key: 'scorePolicy', width: 110 },
  { title: '已确认', key: 'confirmState', width: 96 },
  { title: '确认人', key: 'confirmedBy', width: 120 },
  { title: '可补考', key: 'makeupEligible', width: 88 },
  { title: '操作', key: 'actions', width: 120 },
]

function toAbsentStudentRow(student: AbsentStudentSnapshotResponse): AbsentStudentRow {
  return {
    studentUserId: student.studentUserId,
    studentNo: student.studentNo,
    studentName: student.studentName,
    className: student.className,
  }
}

function formatStudentSnapshot(
  record: Pick<AbsenceRecordResponse, 'studentName' | 'studentNo' | 'className'>,
): string {
  return `${record.studentName}（${record.studentNo}，${record.className}）`
}

function reasonTone(reason: AbsenceReasonCode): BadgeTone {
  return strictEnumTone(ABSENCE_REASON_TONE, reason, '缺考原因')
}

function confirmStateLabel(status: AbsenceStatusCode): string {
  return strictEnumLabel(AbsenceStatusDescription, status, 'absenceStatus')
}

function confirmStateTone(status: AbsenceStatusCode): BadgeTone {
  return strictEnumTone(ABSENCE_STATUS_TONE, status, 'absenceStatus')
}

function reasonLabel(reason: AbsenceReasonCode): string {
  return strictEnumLabel(AbsenceReasonDescription, reason, '缺考原因')
}

function scorePolicyLabel(policy: ScorePolicyCode): string {
  return strictEnumLabel(ScorePolicyDescription, policy, '成绩策略')
}

function isPendingMakeupRecord(record: AbsenceRecordResponse): boolean {
  return (
    record.absenceStatus === AbsenceStatusCode.CONFIRMED
    && record.scorePolicy === ScorePolicyCode.PENDING_MAKEUP
  )
}

function buildAbsentStudentActions(_record: AbsentStudentRow): UiTableRowActionItem[] {
  return [{ key: 'confirm', label: '确认缺考', tone: 'primary' }]
}

function handleAbsentStudentAction(key: string, record: AbsentStudentRow): void {
  if (key === 'confirm') {
    openConfirmModal(record.studentUserId, formatStudentSnapshot(record))
  }
}

function buildAbsenceRecordActions(record: AbsenceRecordResponse): UiTableRowActionItem[] {
  if (isPendingMakeupRecord(record)) {
    return [{ key: 'makeup', label: '派生补考', tone: 'primary' }]
  }
  if (record.absenceStatus === AbsenceStatusCode.CONFIRMED) {
    return [{ key: 'revoke', label: '撤销' }]
  }
  if (record.absenceStatus === AbsenceStatusCode.PENDING) {
    return [{ key: 'confirm', label: '确认', tone: 'primary' }]
  }
  return []
}

function handleAbsenceRecordAction(key: string, record: AbsenceRecordResponse): void {
  switch (key) {
    case 'makeup':
      openDeriveMakeupModal()
      break
    case 'revoke':
      openRevokeModal(record)
      break
    case 'confirm':
      openConfirmModal(record.studentUserId, formatStudentSnapshot(record))
      break
  }
}

const pendingMakeupTotal = ref(0)

const pendingMakeupCount = computed(() => pendingMakeupTotal.value)

async function loadPendingMakeupTotal(): Promise<void> {
  if (!selectedExamId.value) {
    pendingMakeupTotal.value = 0
    return
  }
  try {
    const result = await countPendingMakeupAbsences({ examId: selectedExamId.value })
    pendingMakeupTotal.value = result.pendingMakeupCount
  } catch (error) {
    pendingMakeupTotal.value = 0
    showUserError(error, '待补考人数加载失败')
  }
}

async function loadAbsenceStats(): Promise<void> {
  if (!selectedExamId.value) {
    pendingAbsenceCount.value = 0
    confirmedAbsenceCount.value = 0
    return
  }
  try {
    const stats = await getAbsenceExamStats({ examId: selectedExamId.value })
    pendingAbsenceCount.value = stats.pendingAbsenceCount
    confirmedAbsenceCount.value = stats.confirmedAbsenceCount
  } catch (error) {
    pendingAbsenceCount.value = 0
    confirmedAbsenceCount.value = 0
    showUserError(error, '缺考统计加载失败')
  }
}

async function loadAbsentStudents(): Promise<void> {
  if (!selectedExamId.value || !reconcileVO.value || reconcileVO.value.absentCount <= 0) {
    absentStudents.value = []
    absentStudentPagination.total = 0
    return
  }
  absentStudentLoading.value = true
  try {
    const page = await pageReconcileAbsentStudents({
      examId: selectedExamId.value,
      pageNum: absentStudentPagination.pageNum,
      pageSize: absentStudentPagination.pageSize,
    })
    absentStudents.value = page.list.map(toAbsentStudentRow)
    absentStudentPagination.pageNum = page.pageNum
    absentStudentPagination.pageSize = page.pageSize
    absentStudentPagination.total = page.total
  } catch (error) {
    absentStudents.value = []
    absentStudentPagination.total = 0
    showUserError(error, '核对缺考学生加载失败')
  } finally {
    absentStudentLoading.value = false
  }
}

function handleAbsentStudentPageChange(page: { current: number, pageSize: number }): void {
  absentStudentPagination.pageNum = page.current
  absentStudentPagination.pageSize = page.pageSize
  void loadAbsentStudents()
}

async function loadUnreconciledAbsenceCount(): Promise<void> {
  if (!selectedExamId.value) {
    unreconciledAbsenceCount.value = 0
    return
  }
  try {
    const panel = await getScorePanel(selectedExamId.value)
    unreconciledAbsenceCount.value = Number(panel.riskOverview?.unreconciledAbsenceCount ?? 0)
  } catch (error) {
    unreconciledAbsenceCount.value = 0
    showUserError(error, '缺考对账状态加载失败')
  }
}

function goScorePublish(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceScoreRelease',
    params: { examId: selectedExamId.value },
  })
}

async function loadRecords(): Promise<void> {
  if (!selectedExamId.value) {
    records.value = []
    recordPagination.total = 0
    return
  }
  recordLoading.value = true
  try {
    const page = await pageAbsenceRecords({
      examId: selectedExamId.value,
      absenceStatus: recordFilterForm.status,
      pageNum: recordPagination.pageNum,
      pageSize: recordPagination.pageSize,
    })
    records.value = page.list
    recordPagination.pageNum = page.pageNum
    recordPagination.pageSize = page.pageSize
    recordPagination.total = page.total
    await Promise.all([
      loadPendingMakeupTotal(),
      loadAbsenceStats(),
      loadUnreconciledAbsenceCount(),
      loadAbsentStudents(),
    ])
  } catch (error) {
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
    absentStudentPagination.pageNum = 1
    if (createPending && reconcileVO.value.createdPendingCount > 0) {
      message.success(`已为 ${reconcileVO.value.createdPendingCount} 名缺考学生创建待确认记录`)
    }
    await loadRecords()
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
  } catch (error) {
    showUserError(error, '出勤核对失败')
  } finally {
    reconciling.value = false
  }
}

const confirmModalOpen = ref(false)
const confirming = ref(false)
const confirmTargetName = ref('')
const confirmForm = reactive<{
  studentUserId: string
  absenceReason: AbsenceReasonCode | undefined
  scorePolicy: ScorePolicyCode | undefined
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

const repairingScoreZero = ref(false)

async function handleRepairScoreZero(): Promise<void> {
  if (!selectedExamId.value) return
  repairingScoreZero.value = true
  try {
    const result = await repairScoreZeroFinalScores({ examId: selectedExamId.value })
    message.success(
      result.repairedCount > 0
        ? `已补齐 ${result.repairedCount} 条计零终分`
        : '本场无待补齐的计零缺考',
    )
    await loadRecords()
  } catch (error) {
    showUserError(error, '补齐计零终分失败')
  } finally {
    repairingScoreZero.value = false
  }
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
    message.success(
      policy === ScorePolicyCode.SCORE_ZERO
        ? '已确认缺考并写入零分终分，可前往成绩发布'
        : '已确认缺考',
    )
    confirmModalOpen.value = false
    await Promise.all([loadRecords(), handleReconcile(false)])
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
  } catch (error) {
    showUserError(error, '缺考确认失败')
  } finally {
    confirming.value = false
  }
}

const revokeModalOpen = ref(false)
const revoking = ref(false)
const revokeTargetName = ref('')
const revokeForm = reactive<{ studentUserId: string, revokeReason: string }>({
  studentUserId: '',
  revokeReason: '',
})

function openRevokeModal(record: AbsenceRecordResponse): void {
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
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
  } catch (error) {
    showUserError(error, '缺考撤销失败')
  } finally {
    revoking.value = false
  }
}

const deriveModalOpen = ref(false)
const deriving = ref(false)
const deriveDetailLoading = ref(false)
const deriveForm = reactive<{
  academicYear: string
  semester: SemesterCode | undefined
  examName: string
  examNo: string
  examWindow: [string, string] | undefined
}>({
  academicYear: '',
  semester: undefined,
  examName: '',
  examNo: '',
  examWindow: undefined,
})

const deriveValid = computed(() => {
  const [startTime, endTime] = deriveForm.examWindow ?? []
  return Boolean(
    deriveForm.academicYear.trim()
    && deriveForm.semester
    && deriveForm.examName.trim()
    && deriveForm.examNo.trim()
    && startTime
    && endTime
    && startTime < endTime,
  )
})

function resetDeriveForm(): void {
  deriveForm.academicYear = ''
  deriveForm.semester = undefined
  deriveForm.examName = ''
  deriveForm.examNo = ''
  deriveForm.examWindow = undefined
}

async function openDeriveMakeupModal(): Promise<void> {
  if (!selectedExamId.value || pendingMakeupCount.value === 0) return
  resetDeriveForm()
  deriveModalOpen.value = true
  deriveDetailLoading.value = true
  try {
    const detail = await getExamDetail(selectedExamId.value)
    if (detail.examKind && detail.examKind !== ExamKindCode.REGULAR) {
      message.error('仅可从正考考试派生补考')
      deriveModalOpen.value = false
      return
    }
    if (detail.status !== ExamStatusCode.CLOSED) {
      message.error('原考试须已关考后才能派生补考')
      deriveModalOpen.value = false
      return
    }
    deriveForm.examName = `补考-${detail.examName}`
    deriveForm.examNo = `MK-${detail.examNo}`
  } catch (error) {
    deriveModalOpen.value = false
    showUserError(error, '原考试信息加载失败')
  } finally {
    deriveDetailLoading.value = false
  }
}

async function handleDeriveMakeup(): Promise<void> {
  if (!selectedExamId.value || !deriveValid.value) return
  const [startTime, endTime] = deriveForm.examWindow ?? []
  const semester = deriveForm.semester
  if (!startTime || !endTime || !semester) return
  deriving.value = true
  try {
    const makeupExamId = await deriveMakeupExam({
      sourceExamId: selectedExamId.value,
      academicYear: deriveForm.academicYear.trim(),
      semester,
      examName: deriveForm.examName.trim(),
      examNo: deriveForm.examNo.trim(),
      examStartTime: startTime,
      examEndTime: endTime,
    })
    message.success('已派生补考考试')
    deriveModalOpen.value = false
    await loadRecords()
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
    await router.push({
      name: 'TeacherExamWorkspaceOverview',
      params: { examId: makeupExamId },
    })
  } catch (error) {
    showUserError(error, '派生补考失败')
  } finally {
    deriving.value = false
  }
}

watch(
  selectedExamId,
  async (value) => {
    reconcileVO.value = null
    records.value = []
    pendingMakeupTotal.value = 0
    pendingAbsenceCount.value = 0
    confirmedAbsenceCount.value = 0
    unreconciledAbsenceCount.value = 0
    recordPagination.pageNum = 1
    recordPagination.total = 0
    if (value) {
      await loadRecords()
    }
  },
  { immediate: true },
)

function handleRecordFilterSearch() {
  if (!selectedExamId.value) return
  recordPagination.pageNum = 1
  void loadRecords()
}

function handleRecordFilterReset() {
  recordFilterForm.status = undefined
  recordPagination.pageNum = 1
  if (selectedExamId.value) {
    void loadRecords()
  }
}
</script>

<style lang="scss" scoped>
.hint-text {
  color: var(--dp-text-muted);
  font-size: 12px;
}

.absence-page {
  min-width: 0;

  &__summary {
    display: flex;
    align-items: center;
    gap: 24px;
    width: 100%;
  }

  &__summary-ring {
    flex-shrink: 0;
  }

  &__summary-stats {
    flex: 1;
    min-width: 0;
    align-self: stretch;
    display: flex;

    :deep(.signal-band) {
      width: 100%;
    }
  }

  &__section {
    margin-top: var(--dp-space-4);
  }

  &__alert {
    margin-top: var(--dp-space-3);
  }

  &__record-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--dp-space-2);
    width: 100%;
  }

  &__flow-hint {
    flex: 1 1 100%;
    margin: 0;
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__section-title {
    margin: 0;
    font-size: 16px;
    font-weight: var(--dp-font-weight-title);
    line-height: 1.5;
  }
}
</style>
