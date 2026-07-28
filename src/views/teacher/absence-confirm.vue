<template>
  <StageWorkbenchShell class="absence-page">
    <template #context>
      <ContextBar layout="workbench" show-title title="缺考确认">
        <template #status>
          <UiTag tone="blue" size="sm">阶段 缺考确认</UiTag>
          <UiTag v-if="(pendingAbsenceCount ?? 0) > 0" tone="orange" size="sm">
            待确认 {{ pendingAbsenceCount }} 条
          </UiTag>
          <UiTag v-else-if="(unresolvedAbsenceScorePolicyCount ?? 0) > 0" tone="red" size="sm">
            策略未结案 {{ unresolvedAbsenceScorePolicyCount }} 条
          </UiTag>
          <UiTag v-else-if="(unreconciledAbsenceCount ?? 0) > 0" tone="orange" size="sm">
            未对账 {{ unreconciledAbsenceCount }} 人
          </UiTag>
          <UiTag v-else-if="statsLoadFailed || unreconciledLoadFailed" tone="red" size="sm">
            缺考统计加载失败
          </UiTag>
          <UiTag v-else-if="reconcileVO" tone="green" size="sm">无缺考阻塞</UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="canManageReviewerWrites === true"
            size="sm"
            :variant="(unreconciledAbsenceCount ?? 0) > 0 ? 'primary' : 'outline'"
            :loading="reconciling === true"
            @click="handleReconcile(true)"
          >
            <template #icon><PlusOutlined /></template>
            核对并新建
          </UiButton>
          <UiButton
            v-if="canManageReviewerWrites === true"
            size="sm"
            variant="ghost"
            :loading="reconciling === true"
            @click="handleReconcile(false)"
          >
            <template #icon><SyncOutlined /></template>
            出勤核对
          </UiButton>
          <UiDropdownAction
            v-if="absenceMoreActionItems.length > 0"
            trigger-style="button"
            button-text="更多"
            :items="absenceMoreActionItems"
            @select="onAbsenceMoreAction"
          />
        </template>
      </ContextBar>
    </template>

    <template v-if="reconcileVO" #signal>
      <SignalBand :metrics="absenceListMetrics" variant="panel" compact />
    </template>

    <ExamSelectGateStrip v-if="!selectedExamId" body="请从考试列表进入工作台后再确认缺考" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiAlertStrip
        v-if="recordsLoadFailed || statsLoadFailed || pendingMakeupLoadFailed || unreconciledLoadFailed"
        tone="error"
        title="缺考数据加载失败"
        dense
        class="absence-page__alert"
      />

      <UiAlertStrip
        v-if="(pendingAbsenceCount ?? 0) > 0"
        tone="warning"
        title="仍有缺考记录待确认"
        :description="`当前还有 ${pendingAbsenceCount} 条待确认缺考，成绩发布前须完成核对。`"
        dense
        class="absence-page__alert"
      >
        <template #actions>
          <UiButton variant="outline" size="sm" @click="goScoreWorkbench">
            前往成绩确认与发布
          </UiButton>
        </template>
      </UiAlertStrip>

      <UiAlertStrip
        v-if="(unresolvedAbsenceScorePolicyCount ?? 0) > 0"
        tone="error"
        title="已确认缺考仍有成绩策略未结案"
        :description="`当前有 ${unresolvedAbsenceScorePolicyCount} 条已确认缺考仍使用“待外部确认”占位策略，将阻断成绩确认、发布、关考与归档。请撤销对应缺考记录，再按学校认定结果选择计零分、排除统计或待补考。`"
        dense
        class="absence-page__alert"
      >
        <template #actions>
          <UiButton variant="primary" size="sm" @click="focusUnresolvedAbsencePolicies">
            筛选待处置记录
          </UiButton>
        </template>
      </UiAlertStrip>

      <UiAlertStrip
        v-if="(unreconciledAbsenceCount ?? 0) > 0"
        tone="warning"
        title="仍有应考学生未完成缺考核对"
        :description="`当前还有 ${unreconciledAbsenceCount} 名应考学生未对账（含无卷或最新卷为废卷 DISCARDED）。到场但未绑定/冲突卷不会出现在此列表，须先在扫描批次处理。请执行「核对并新建待确认记录」后逐条确认。`"
        dense
        class="absence-page__alert"
      >
        <template #actions>
          <UiButton
            v-if="canManageReviewerWrites === true"
            variant="primary"
            size="sm"
            :loading="reconciling === true"
            @click="handleReconcile(true)"
          >
            核对并新建待确认记录
          </UiButton>
        </template>
      </UiAlertStrip>

      <UiAlertStrip
        v-if="!reconcileVO && !recordLoading"
        tone="info"
        size="sm"
        dense
        inline
        :show-icon="false"
        class="absence-page__alert"
      >
        <template #default>
          <span style="display: inline-flex; align-items: center; gap: var(--dp-space-component-tight)">
            <UiTag tone="blue" size="sm">待核对</UiTag>
            <span>尚未执行出勤核对，无法确认缺考名单</span>
          </span>
        </template>
        <template #actions>
          <UiButton
            v-if="canManageReviewerWrites === true"
            variant="primary"
            size="sm"
            :loading="reconciling === true"
            @click="handleReconcile(false)"
          >
            立即出勤核对
          </UiButton>
        </template>
      </UiAlertStrip>

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
              size="sm"
              v-if="canManageOwnerAbsenceMakeup === true && (pendingMakeupCount ?? 0) > 0"
              variant="outline"
              @click="openDeriveMakeupModal"
            >
              推导补考名单
            </UiButton>
          </div>
        </template>
        <UiAlertStrip
          v-if="recordsLoadFailed"
          tone="error"
          title="缺考记录加载失败"
          dense
        />
        <UiDataTable
          v-if="!recordsLoadFailed || records.length > 0"
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
            <template v-else-if="column.key === 'makeupExam'">
              <div v-if="records[index].makeupExamId" class="absence-page__makeup-exam">
                <span class="absence-page__makeup-exam-name">
                  {{ records[index].makeupExamName }}
                </span>
                <span class="absence-page__makeup-exam-meta">
                  {{ records[index].makeupExamNo }} · ID {{ records[index].makeupExamId }}
                </span>
              </div>
              <span v-else class="hint-text">—</span>
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
    </template>

    <UiDrawer
      v-model:open="confirmModalOpen"
      title="确认缺考"
      :width="520"
      :hide-footer="false"
      @close="confirmModalOpen = false"
    >
      <UiForm layout="vertical">
        <UiFormItem label="学生">
          <UiInput size="sm" :value="confirmTargetName" disabled />
        </UiFormItem>
        <UiFormItem label="缺考原因" required>
          <UiSelect
            v-model="confirmForm.absenceReason"
            placeholder="选择缺考原因"
            size="sm"
            :options="ABSENCE_REASON_OPTIONS"
          />
        </UiFormItem>
        <UiFormItem label="成绩处理策略" required>
          <UiSelect
            v-model="confirmForm.scorePolicy"
            placeholder="选择成绩处理策略"
            size="sm"
            :options="ABSENCE_CONFIRM_SCORE_POLICY_OPTIONS"
          />
        </UiFormItem>
        <UiAlertStrip
          v-if="confirmForm.scorePolicy === ScorePolicyCode.SCORE_ZERO"
          tone="info"
          title="计零分将立即写入正式零分"
          description="确认后卷面分/总分记 0；请在成绩确认与发布页提交发布复核，复核通过正式发布后才会同步质量评价；若误判撤销缺考，系统将自动撤回已发布零分并通知学生。"
          dense
        />
      </UiForm>
      <template #footer>
        <UiButton size="sm" variant="outline" @click="confirmModalOpen = false">取消</UiButton>
        <UiButton
          size="sm"
          variant="primary"
          :loading="confirming"
          :disabled="confirmValid !== true"
          @click="handleConfirm"
        >
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
      <UiForm layout="vertical">
        <UiFormItem label="学生">
          <UiInput size="sm" :value="revokeTargetName" disabled />
        </UiFormItem>
        <UiAlertStrip
          v-if="revokeTargetStatus === AbsenceStatusCode.MAKEUP_ARRANGED"
          tone="warning"
          title="已安排补考的缺考认定将被撤销"
          description="确认后将恢复正考名册为有效，并从派生补考名册移除该生；若补考已有答卷或未撤回成绩，系统会拒绝撤销。"
          dense
        />
        <UiAlertStrip
          v-if="revokeWillAutoWithdrawScore === true"
          tone="warning"
          title="将自动撤回该生已发布/待复核的零分成绩"
          description="撤销缺考时系统会同步撤回零分终分、回收成绩发布通知、作废开放复核申请，并向学生发送撤回说明；无需再去成绩发布页单独操作。"
          dense
        />
        <UiFormItem label="撤销原因" required>
          <UiTextarea
            size="sm"
            v-model="revokeForm.revokeReason"
            :rows="4"
            placeholder="请描述撤销原因（必填）"
          />
        </UiFormItem>
      </UiForm>
      <template #footer>
        <UiButton size="sm" variant="outline" @click="revokeModalOpen = false">取消</UiButton>
        <UiButton
          size="sm"
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
      <UiForm v-else layout="vertical">
        <UiFormItem label="待补考学生">
          <UiInput
            size="sm"
            :value="deriveFrozenPendingCount == null ? '—' : `${deriveFrozenPendingCount} 人`"
            disabled
          />
        </UiFormItem>
        <UiFormItem label="补考学年" required>
          <UiInput size="sm" v-model="deriveForm.academicYear" placeholder="如 2024-2025" />
        </UiFormItem>
        <UiFormItem label="补考学期" required>
          <UiSelect
            size="sm"
            v-model="deriveForm.semester"
            placeholder="选择学期"
            :options="SemesterOptions"
          />
        </UiFormItem>
        <UiFormItem label="补考名称" required>
          <UiInput size="sm" v-model="deriveForm.examName" placeholder="补考名称" />
        </UiFormItem>
        <UiFormItem label="补考编号" required>
          <UiInput size="sm" v-model="deriveForm.examNo" placeholder="补考编号" />
        </UiFormItem>
        <UiFormItem label="考试时间窗" required>
          <UiRangePicker
            v-model="deriveForm.examWindow"
            show-time
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm"
          />
        </UiFormItem>
      </UiForm>
      <template #footer>
        <UiButton size="sm" variant="outline" @click="deriveModalOpen = false">取消</UiButton>
        <UiButton
          size="sm"
          variant="primary"
          :loading="deriving"
          :disabled="deriveValid !== true || deriveDetailLoading === true"
          @click="handleDeriveMakeup"
        >
          派生
        </UiButton>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
// MVR-951：函数式 can*(...) 写入口仅认 === true
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
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
  ABSENCE_CONFIRM_SCORE_POLICY_OPTIONS,
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
  ScorePolicyCode,
  ScorePolicyDescription,
} from '@/apis/mark/absence'
import { deriveMakeupExam, getExamDetail } from '@/apis/mark/exam'
import { getScorePanel } from '@/apis/mark/exam-progress'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiRangePicker from '@/components/ui-guide/ui/RangePicker.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { ExamKindCode } from '@/types/enums/exam-kind-enum'
import { ExamStatusCode } from '@/types/enums/exam-status-enum'
import { FinalScoreStatusCode } from '@/types/enums/final-score-status-enum'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
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
/** null = 未就绪或加载失败，禁止当成 0 */
const pendingAbsenceCount = ref<number | null>(null)
const unresolvedAbsenceScorePolicyCount = ref<number | null>(null)
const confirmedAbsenceCount = ref<number | null>(null)
const unreconciledAbsenceCount = ref<number | null>(null)
/** MVR-287：默认拒绝假可写；仅 stats 明确下发 true 后开放写入口 */
const canManageReviewerWrites = ref(false)
/** MVR-326：派生补考仅主考；仅 stats.canManageOwnerAbsenceMakeup===true */
const canManageOwnerAbsenceMakeup = ref(false)
const recordsLoadFailed = ref(false)
const statsLoadFailed = ref(false)
const pendingMakeupLoadFailed = ref(false)
const unreconciledLoadFailed = ref(false)
const absentStudentsLoadFailed = ref(false)
/** 切考试时递增，丢弃过期统计/名单/派生表单响应 */
let examLoadGeneration = 0
/** 打开派生弹窗时冻结的源考试，提交不得改读全局选中 */
const deriveSourceExamId = ref('')
/** 打开派生抽屉时冻结的待补考人数；禁止绑定实时 pendingMakeupCount（失败/切场会变成 null） */
const deriveFrozenPendingCount = ref<number | null>(null)

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

const absenceListMetrics = computed((): SignalMetric[] => {
  const expected = reconcileVO.value?.expectedCount ?? 0
  const attended = reconcileVO.value?.attendedCount ?? 0
  const attendancePercent = expected > 0 ? Math.round((attended / expected) * 100) : 0
  const absentTotal = reconcileVO.value?.absentCount ?? 0
  const confirmedDisplay
    = confirmedAbsenceCount.value == null ? '—' : confirmedAbsenceCount.value
  const makeupDisplay = pendingMakeupCount.value == null ? '—' : pendingMakeupCount.value
  return [
    {
      key: 'attendance',
      label: '出勤率',
      value: attendancePercent,
      unit: '%',
      tone: attendancePercent >= 90 ? 'green' : attendancePercent >= 70 ? 'blue' : 'orange',
    },
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
      value: confirmedDisplay,
      unit: confirmedAbsenceCount.value == null ? undefined : '人',
      tone: 'green',
    },
    {
      key: 'makeup',
      label: '可补考',
      value: makeupDisplay,
      unit: pendingMakeupCount.value == null ? undefined : '人',
      tone: (pendingMakeupCount.value ?? 0) > 0 ? 'blue' : 'gray',
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
  { title: '补考场次', key: 'makeupExam', width: 220 },
  { title: '操作', key: 'actions', width: 180 },
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
  if (canManageReviewerWrites.value !== true) {
    return []
  }
  return [{ key: 'confirm', label: '确认缺考', tone: 'primary' }]
}

function handleAbsentStudentAction(key: string, record: AbsentStudentRow): void {
  if (key === 'confirm') {
    openConfirmModal(record.studentUserId, formatStudentSnapshot(record))
  }
}

/** MVR-214/321：与 BE canRevokeAbsence 同源；仅认 ===true，禁止 null 缺省放行。 */
function canRevokeAbsenceRecord(record: AbsenceRecordResponse): boolean {
  if (record.absenceStatus !== AbsenceStatusCode.CONFIRMED
    && record.absenceStatus !== AbsenceStatusCode.MAKEUP_ARRANGED) {
    return false
  }
  // 禁止兼容回退本地计零启发式；BE applyAbsenceRevokeCapability 必下发行级 canRevokeAbsence
  return record.canRevokeAbsence === true
}

function requiresMakeupWithdrawBeforeRevoke(record: AbsenceRecordResponse): boolean {
  return record.absenceStatus === AbsenceStatusCode.MAKEUP_COMPLETED
}

/** 计零终分已发布/待复核/已更正时，撤销将走自动撤回主链。 */
function willAutoWithdrawScoreOnRevoke(record: AbsenceRecordResponse): boolean {
  const status = record.linkedFinalScoreStatus
  return status === FinalScoreStatusCode.PUBLISHED
    || status === FinalScoreStatusCode.PENDING_PUBLISH_REVIEW
    || status === FinalScoreStatusCode.CORRECTED
}

function buildAbsenceRecordActions(record: AbsenceRecordResponse): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (isPendingMakeupRecord(record)) {
    if (canManageOwnerAbsenceMakeup.value === true) {
      actions.push({ key: 'makeup', label: '派生补考', tone: 'primary' })
    }
    return actions
  }
  if (record.makeupExamId) {
    if (requiresMakeupWithdrawBeforeRevoke(record)) {
      actions.push({ key: 'withdrawMakeupThenRevoke', label: '撤回补考成绩' })
    }
    else {
      actions.push({
        key: 'openMakeupExam',
        label: record.absenceStatus === AbsenceStatusCode.REVOKED ? '查看原补考' : '进入补考',
      })
    }
  }
  if (canManageReviewerWrites.value !== true) {
    return actions
  }
  if (requiresMakeupWithdrawBeforeRevoke(record)) {
    return actions
  }
  if ((record.absenceStatus === AbsenceStatusCode.CONFIRMED
    || record.absenceStatus === AbsenceStatusCode.MAKEUP_ARRANGED)
  && canRevokeAbsenceRecord(record) === true) {
    actions.push({ key: 'revoke', label: '撤销' })
  }
  if (record.absenceStatus === AbsenceStatusCode.PENDING) {
    actions.push({ key: 'confirm', label: '确认', tone: 'primary' })
  }
  return actions
}

/** 按缺考记录中的唯一补考锚点进入补考工作台；缺失锚点时显式暴露合同错误。 */
function goMakeupExam(record: AbsenceRecordResponse, scoreSummary: boolean): void {
  if (!record.makeupExamId) {
    void message.error('缺考记录缺少补考考试关联，无法进入补考工作台')
    return
  }
  void router.push({
    name: scoreSummary ? 'TeacherExamWorkspaceScoreSummary' : 'TeacherExamWorkspaceOverview',
    params: { examId: record.makeupExamId },
  })
}

function handleAbsenceRecordAction(key: string, record: AbsenceRecordResponse): void {
  switch (key) {
    case 'makeup':
      openDeriveMakeupModal()
      break
    case 'revoke':
      if (canRevokeAbsenceRecord(record) !== true) {
        void message.warning(
          record.revokeBlockedReason || '当前缺考记录不可撤销',
        )
        return
      }
      openRevokeModal(record)
      break
    case 'openMakeupExam':
      goMakeupExam(record, false)
      break
    case 'withdrawMakeupThenRevoke':
      goMakeupExam(record, true)
      break
    case 'confirm':
      openConfirmModal(record.studentUserId, formatStudentSnapshot(record))
      break
  }
}

const pendingMakeupTotal = ref<number | null>(null)

const pendingMakeupCount = computed(() => pendingMakeupTotal.value)

async function loadPendingMakeupTotal(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    pendingMakeupTotal.value = null
    pendingMakeupLoadFailed.value = false
    return
  }
  const loadGeneration = examLoadGeneration
  try {
    const result = await countPendingMakeupAbsences({ examId })
    if (loadGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    pendingMakeupLoadFailed.value = false
    pendingMakeupTotal.value = result.pendingMakeupCount
  } catch (error) {
    if (loadGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    pendingMakeupLoadFailed.value = true
    showUserError(error, '待补考人数加载失败')
  }
}

async function loadAbsenceStats(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    pendingAbsenceCount.value = null
    unresolvedAbsenceScorePolicyCount.value = null
    confirmedAbsenceCount.value = null
    canManageReviewerWrites.value = false
    canManageOwnerAbsenceMakeup.value = false
    statsLoadFailed.value = false
    return
  }
  const loadGeneration = examLoadGeneration
  try {
    const stats = await getAbsenceExamStats({ examId })
    if (loadGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    statsLoadFailed.value = false
    pendingAbsenceCount.value = stats.pendingAbsenceCount
    unresolvedAbsenceScorePolicyCount.value = stats.unresolvedAbsenceScorePolicyCount
    confirmedAbsenceCount.value = stats.confirmedAbsenceCount
    canManageReviewerWrites.value = stats.canManageReviewerWrites === true
    canManageOwnerAbsenceMakeup.value = stats.canManageOwnerAbsenceMakeup === true
  } catch (error) {
    if (loadGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    statsLoadFailed.value = true
    pendingAbsenceCount.value = null
    unresolvedAbsenceScorePolicyCount.value = null
    confirmedAbsenceCount.value = null
    canManageReviewerWrites.value = false
    canManageOwnerAbsenceMakeup.value = false
    showUserError(error, '缺考统计加载失败')
  }
}

async function loadAbsentStudents(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId || !reconcileVO.value || reconcileVO.value.absentCount <= 0) {
    absentStudents.value = []
    absentStudentPagination.total = 0
    absentStudentsLoadFailed.value = false
    return
  }
  const loadGeneration = examLoadGeneration
  absentStudentLoading.value = true
  try {
    const page = await pageReconcileAbsentStudents({
      examId,
      pageNum: absentStudentPagination.pageNum,
      pageSize: absentStudentPagination.pageSize,
    })
    if (loadGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    absentStudentsLoadFailed.value = false
    absentStudents.value = page.list.map(toAbsentStudentRow)
    absentStudentPagination.pageNum = page.pageNum
    absentStudentPagination.pageSize = page.pageSize
    absentStudentPagination.total = page.total
  } catch (error) {
    if (loadGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    absentStudentsLoadFailed.value = true
    showUserError(error, '核对缺考学生加载失败')
  } finally {
    if (loadGeneration === examLoadGeneration) {
      absentStudentLoading.value = false
    }
  }
}

function handleAbsentStudentPageChange(page: { current: number, pageSize: number }): void {
  absentStudentPagination.pageNum = page.current
  absentStudentPagination.pageSize = page.pageSize
  void loadAbsentStudents()
}

async function loadUnreconciledAbsenceCount(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    unreconciledAbsenceCount.value = null
    unreconciledLoadFailed.value = false
    return
  }
  const loadGeneration = examLoadGeneration
  try {
    const panel = await getScorePanel(examId)
    if (loadGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    const count = panel.riskOverview?.unreconciledAbsenceCount
    if (count == null) {
      unreconciledAbsenceCount.value = null
      unreconciledLoadFailed.value = true
      showUserError(new Error('缺考对账数字段缺失'), '缺考对账状态合同不完整')
      return
    }
    unreconciledLoadFailed.value = false
    unreconciledAbsenceCount.value = Number(count)
  } catch (error) {
    if (loadGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    unreconciledLoadFailed.value = true
    showUserError(error, '缺考对账状态加载失败')
  }
}

function goScoreWorkbench(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceScoreSummary',
    params: { examId: selectedExamId.value },
  })
}

/** 聚焦已确认记录，便于撤销占位策略后重新完成缺考认定。 */
async function focusUnresolvedAbsencePolicies(): Promise<void> {
  recordFilterForm.status = AbsenceStatusCode.CONFIRMED
  recordPagination.pageNum = 1
  await loadRecords()
}

async function loadRecords(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    records.value = []
    recordPagination.total = 0
    recordsLoadFailed.value = false
    return
  }
  const loadGeneration = examLoadGeneration
  recordLoading.value = true
  try {
    const page = await pageAbsenceRecords({
      examId,
      absenceStatus: recordFilterForm.status,
      pageNum: recordPagination.pageNum,
      pageSize: recordPagination.pageSize,
    })
    if (loadGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    recordsLoadFailed.value = false
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
    if (loadGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    recordsLoadFailed.value = true
    showUserError(error, '缺考记录加载失败')
  } finally {
    if (loadGeneration === examLoadGeneration) {
      recordLoading.value = false
    }
  }
}

function handleRecordPageChange(page: { current: number, pageSize: number }): void {
  recordPagination.pageNum = page.current
  recordPagination.pageSize = page.pageSize
  void loadRecords()
}

async function handleReconcile(createPending: boolean): Promise<void> {
  if (!selectedExamId.value || reconciling.value) return
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员、主考或管理员可执行缺考核对')
    return
  }
  const examId = selectedExamId.value
  reconciling.value = true
  try {
    reconcileVO.value = await reconcileAttendance({
      examId,
      createPendingAbsence: createPending,
    })
    absentStudentPagination.pageNum = 1
    if (createPending === true && reconcileVO.value.createdPendingCount > 0) {
      void message.success(`已为 ${reconcileVO.value.createdPendingCount} 名缺考学生创建待确认记录`)
    }
  } catch (error) {
    showUserError(error, '出勤核对失败')
    return
  } finally {
    reconciling.value = false
  }
  await refreshAbsencePageAfterWrite()
}

/** 缺考写入成功后的统一刷新：记录/统计一次 + 快照一次，禁止嵌套二次 loadRecords。 */
async function refreshAbsencePageAfterWrite(): Promise<void> {
  try {
    await loadRecords()
  } catch (error) {
    showUserError(error, '缺考记录刷新失败')
  }
  try {
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '考试工作台状态刷新失败')
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
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员、主考或管理员可确认缺考')
    return
  }
  confirmForm.studentUserId = studentUserId
  confirmForm.absenceReason = undefined
  confirmForm.scorePolicy = undefined
  confirmTargetName.value = displayName
  confirmModalOpen.value = true
}

const repairingScoreZero = ref(false)

const absenceMoreActionItems = computed(() => {
  const items: { key: string, label: string, disabled?: boolean }[] = []
  // MVR-326：派生补考仅主考；仅认 BE canManageOwnerAbsenceMakeup===true
  if (canManageOwnerAbsenceMakeup.value === true && (pendingMakeupCount.value ?? 0) > 0) {
    items.push({ key: 'deriveMakeup', label: `派生补考 ${pendingMakeupCount.value}` })
  }
  // MVR-287/430：补齐计零与 BE requireExamReviewerPermission 对齐；仅认 === true
  if (canManageReviewerWrites.value === true) {
    items.push({
      key: 'repairScoreZero',
      label: '补齐计零',
      disabled: repairingScoreZero.value,
    })
  }
  return items
})

function onAbsenceMoreAction(key: string) {
  if (key === 'deriveMakeup') {
    void openDeriveMakeupModal()
    return
  }
  if (key === 'repairScoreZero') {
    void handleRepairScoreZero()
  }
}

async function handleRepairScoreZero(): Promise<void> {
  if (!selectedExamId.value || repairingScoreZero.value) return
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员、主考或管理员可补齐计零终分')
    return
  }
  repairingScoreZero.value = true
  try {
    const result = await repairScoreZeroFinalScores({ examId: selectedExamId.value })
    void message.success(
      result.repairedCount > 0
        ? `已补齐 ${result.repairedCount} 条计零终分`
        : '本场无待补齐的计零缺考',
    )
  } catch (error) {
    showUserError(error, '补齐计零终分失败')
    return
  } finally {
    repairingScoreZero.value = false
  }
  await refreshAbsencePageAfterWrite()
}

async function handleConfirm(): Promise<void> {
  if (!selectedExamId.value || !confirmValid.value || confirming.value === true) return
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员、主考或管理员可确认缺考')
    return
  }
  const reason = confirmForm.absenceReason
  const policy = confirmForm.scorePolicy
  if (!reason || !policy) return
  const examId = selectedExamId.value
  confirming.value = true
  try {
    await confirmAbsence({
      examId,
      studentUserId: confirmForm.studentUserId,
      absenceReason: reason,
      scorePolicy: policy,
    })
    void message.success(
      policy === ScorePolicyCode.SCORE_ZERO
        ? '已确认缺考并写入零分终分，可前往成绩确认与发布'
        : '已确认缺考',
    )
    confirmModalOpen.value = false
  } catch (error) {
    showUserError(error, '缺考确认失败')
    return
  } finally {
    confirming.value = false
  }
  // 单一刷新事务：先拉正式对账，再一次 loadRecords + 快照；禁止再调 handleReconcile 造成双载
  try {
    reconcileVO.value = await reconcileAttendance({
      examId,
      createPendingAbsence: false,
    })
    absentStudentPagination.pageNum = 1
  } catch (error) {
    showUserError(error, '缺考已确认，但出勤核对刷新失败')
  }
  await refreshAbsencePageAfterWrite()
}

const revokeModalOpen = ref(false)
const revoking = ref(false)
const revokeTargetName = ref('')
const revokeTargetStatus = ref<AbsenceStatusCode | null>(null)
const revokeWillAutoWithdrawScore = ref(false)
const revokeForm = reactive<{ studentUserId: string, revokeReason: string }>({
  studentUserId: '',
  revokeReason: '',
})

function openRevokeModal(record: AbsenceRecordResponse): void {
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员、主考或管理员可撤销缺考')
    return
  }
  if (canRevokeAbsenceRecord(record) !== true) {
    void message.warning(
      record.revokeBlockedReason || '当前缺考记录不可撤销',
    )
    return
  }
  revokeForm.studentUserId = record.studentUserId
  revokeForm.revokeReason = ''
  revokeTargetName.value = formatStudentSnapshot(record)
  revokeTargetStatus.value = record.absenceStatus
  revokeWillAutoWithdrawScore.value = willAutoWithdrawScoreOnRevoke(record)
  revokeModalOpen.value = true
}

async function handleRevoke(): Promise<void> {
  if (!selectedExamId.value || revoking.value) return
  // MVR-420：与 canRevokeAbsenceRecord / openRevokeModal 同源二次闸（行级 BE canRevokeAbsence）
  const target = records.value.find((item) => item.studentUserId === revokeForm.studentUserId)
  if (!target || canRevokeAbsenceRecord(target) !== true) {
    void message.warning(
      canManageReviewerWrites.value !== true
        ? '仅本场阅卷组织成员、主考或管理员可撤销缺考'
        : target?.revokeBlockedReason || '当前缺考记录不可撤销',
    )
    return
  }
  const reason = revokeForm.revokeReason.trim()
  if (!reason) return
  revoking.value = true
  try {
    await revokeAbsence({
      examId: selectedExamId.value,
      studentUserId: revokeForm.studentUserId,
      revokeReason: reason,
    })
    void message.success(
      revokeWillAutoWithdrawScore.value === true
        ? '已撤销缺考，并自动撤回该生零分成绩'
        : '已撤销缺考',
    )
    revokeModalOpen.value = false
  } catch (error) {
    showUserError(error, '撤销缺考失败')
    return
  } finally {
    revoking.value = false
  }
  await refreshAbsencePageAfterWrite()
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
  // MVR-297：派生补考仅主考；与 more 菜单 / BE requireExamOwnerPermission 对齐
  if (canManageOwnerAbsenceMakeup.value !== true) {
    void message.warning('仅本场主考可派生补考名单')
    return
  }
  const examId = selectedExamId.value
  const frozenPending = pendingMakeupCount.value
  if (!examId || frozenPending == null || frozenPending === 0) return
  const loadGeneration = examLoadGeneration
  deriveSourceExamId.value = examId
  deriveFrozenPendingCount.value = frozenPending
  resetDeriveForm()
  deriveModalOpen.value = true
  deriveDetailLoading.value = true
  try {
    const detail = await getExamDetail(examId)
    if (
      loadGeneration !== examLoadGeneration
      || selectedExamId.value !== examId
      || !deriveModalOpen.value
    ) {
      return
    }
    if (detail.examKind && detail.examKind !== ExamKindCode.REGULAR) {
      void message.error('仅可从正考考试派生补考')
      deriveModalOpen.value = false
      deriveFrozenPendingCount.value = null
      return
    }
    if (detail.status !== ExamStatusCode.CLOSED) {
      void message.error('原考试须已关考后才能派生补考')
      deriveModalOpen.value = false
      deriveFrozenPendingCount.value = null
      return
    }
    deriveForm.examName = `补考-${detail.examName}`
    deriveForm.examNo = `MK-${detail.examNo}`
  } catch (error) {
    if (
      loadGeneration !== examLoadGeneration
      || selectedExamId.value !== examId
    ) {
      return
    }
    deriveModalOpen.value = false
    deriveSourceExamId.value = ''
    deriveFrozenPendingCount.value = null
    showUserError(error, '原考试信息加载失败')
  } finally {
    if (loadGeneration === examLoadGeneration) {
      deriveDetailLoading.value = false
    }
  }
}

async function handleDeriveMakeup(): Promise<void> {
  if (canManageOwnerAbsenceMakeup.value !== true) {
    void message.warning('仅本场主考可派生补考名单')
    return
  }
  const sourceExamId = deriveSourceExamId.value
  if (!sourceExamId || sourceExamId !== selectedExamId.value || !deriveValid.value || deriving.value) {
    return
  }
  const [startTime, endTime] = deriveForm.examWindow ?? []
  const semester = deriveForm.semester
  if (!startTime || !endTime || !semester) return
  deriving.value = true
  try {
    const makeupExamId = await deriveMakeupExam({
      sourceExamId,
      academicYear: deriveForm.academicYear.trim(),
      semester,
      examName: deriveForm.examName.trim(),
      examNo: deriveForm.examNo.trim(),
      examStartTime: startTime,
      examEndTime: endTime,
    })
    void message.success('已派生补考考试')
    deriveModalOpen.value = false
    deriveSourceExamId.value = ''
    deriveFrozenPendingCount.value = null
    await loadRecords()
    try {
      await refreshSnapshot()
    } catch (error) {
      showUserError(error, '考试工作台状态刷新失败')
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
    examLoadGeneration += 1
    reconcileVO.value = null
    records.value = []
    pendingMakeupTotal.value = null
    pendingAbsenceCount.value = null
    unresolvedAbsenceScorePolicyCount.value = null
    confirmedAbsenceCount.value = null
    unreconciledAbsenceCount.value = null
    recordsLoadFailed.value = false
    statsLoadFailed.value = false
    pendingMakeupLoadFailed.value = false
    unreconciledLoadFailed.value = false
    absentStudentsLoadFailed.value = false
    canManageReviewerWrites.value = false
    canManageOwnerAbsenceMakeup.value = false
    deriveModalOpen.value = false
    deriveSourceExamId.value = ''
    deriveFrozenPendingCount.value = null
    resetDeriveForm()
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
  font-size: var(--dp-font-size-xs);
}

.absence-page {
  min-width: 0;

  &__section {
    margin-top: var(--dp-space-block);
  }

  &__alert {
    margin-top: var(--dp-space-component);
  }

  &__record-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
    width: 100%;
  }

  &__makeup-exam {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__makeup-exam-name {
    overflow: hidden;
    color: var(--dp-text-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__makeup-exam-meta {
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-xs);
  }

  &__flow-hint {
    flex: 1 1 100%;
    margin: 0;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__section-title {
    margin: 0;
    font-size: var(--dp-font-size-lg);
    font-weight: var(--dp-font-weight-title);
    line-height: 1.5;
  }
}
</style>
