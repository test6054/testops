<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioDualTeacherApplicationVO,
  PortfolioDualTeacherEligibilityFreezeVO,
} from '@/apis/portfolio/teacher-platform'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { PortfolioDualTeacherCertLevelCode } from '@/types/enums/portfolio-dual-teacher-cert-level-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import {
  PortfolioDualTeacherApplicationStatusCode,
  PortfolioDualTeacherApplicationStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioReviewAccess } from '@/composables/usePortfolioReviewAccess'
import { useQueryTable } from '@/composables/useQueryTable'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { PORTFOLIO_DUAL_TEACHER_CERT_LEVEL_LABEL } from '@/types/enums/portfolio-dual-teacher-cert-level-enum'
import { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { hasTeacherTenantPermission } from '@/utils/permission'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'

const authStore = useAuthStore()
const userStore = useUserStore()
const router = useRouter()
const { accessScope, ensureLoaded } = usePortfolioReviewAccess()
const collegeEligibilityById = ref<Record<string, PortfolioDualTeacherEligibilityFreezeVO>>({})
const previewingId = ref('')
const workflowId = ref('')
const exporting = ref(false)
const writing = computed(() => Boolean(previewingId.value || workflowId.value) || exporting.value)
/** 当前操作目标教师；用于封存写禁预检 */
const actionTeacherId = ref<string | undefined>()
const {
  archiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard({ teacherId: actionTeacherId })
/** 退回/驳回意见弹窗：负向决策必须填写意见后提交 */
const opinionModal = reactive({
  open: false,
  action: '' as 'collegeReturn' | 'academicReturn' | 'academicReject' | '',
  id: '',
  title: '',
  opinion: '',
})
/** 意见确认写入中：关闭弹窗时不释放行锁 */
const opinionSubmitting = ref(false)
/** 双师台账导出审批用途 */
const exportApplyModal = reactive({
  open: false,
  purpose: '',
})
/** 双师院审：受管教研室负责人或租户全校范围（与后端 assertCanCollegeReviewDualTeacher 一致） */
const canCollegeReview = computed(() => {
  const scope = accessScope.value
  if (!scope?.reviewAccess) {
    return false
  }
  return Boolean(scope.teachingGroupLeader || scope.tenantWide)
})
const canAcademicReview = computed(() =>
  hasTeacherTenantPermission({
    roleKey: authStore.userRole,
    isTenantAdmin: userStore.isTenantAdmin,
  }),
)
/** PF-P0-424：导出=校管或院系审核人；导入模板仍仅校管 */
const canExport = computed(() => canAcademicReview.value || canCollegeReview.value)
const canImportRoster = computed(() => canAcademicReview.value)

onMounted(() => {
  void ensureLoaded()
})

function statusLabel(status: PortfolioDualTeacherApplicationVO['applicationStatus']) {
  return strictEnumLabel(PortfolioDualTeacherApplicationStatusDescription, status, '双师申请状态')
}

function statusTone(status: PortfolioDualTeacherApplicationVO['applicationStatus']) {
  switch (status) {
    case PortfolioDualTeacherApplicationStatusCode.COLLEGE_PENDING:
    case PortfolioDualTeacherApplicationStatusCode.ACADEMIC_PENDING:
      return 'orange' as const
    case PortfolioDualTeacherApplicationStatusCode.APPROVED:
      return 'green' as const
    case PortfolioDualTeacherApplicationStatusCode.REJECTED:
      return 'red' as const
    default:
      return 'gray' as const
  }
}

const importModalOpen = ref(false)
const route = useRoute()
/** PF-P0-295：院审台账 applicationId 深链高亮 */
const highlightedApplicationId = ref('')
const pendingLocateApplicationId = ref(
  typeof route.query.applicationId === 'string' ? route.query.applicationId.trim() : '',
)
const { loading, rows, pageNum, pageSize, pageTotal, loadError, loadPage, handlePageChange }
  = useQueryTable(
    (params) =>
      portfolioDualTeacherApi.page({
        ...params,
        locateApplicationId: pendingLocateApplicationId.value || undefined,
      }),
    {
      onLoaded: (loadedRows) => {
        const locateOnce = pendingLocateApplicationId.value
        pendingLocateApplicationId.value = ''
        if (!locateOnce) {
          return
        }
        highlightedApplicationId.value = locateOnce
        if (!loadedRows.some((item) => item.id === locateOnce)) {
          return
        }
        void nextTick(() => {
          document.querySelector('.dual-teacher-admin__row-active')?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        })
      },
    },
  )
const DualTeacherSignalMetrics = computed<SignalMetric[]>(() => {
  if (loadError.value && pageTotal.value === 0) {
    return []
  }
  const metrics: SignalMetric[] = [
    {
      key: 'total',
      label: '双师认定',
      value: pageTotal.value,
      clickable: true,
    },
  ]
  return applySpotlightEmphasis(metrics, {
    primaryKey: 'total',
    actionLabel: '刷新',
  })
})

const DualTeacherWorkbenchSubtitle = computed(() => {
  if (loadError.value) {
    return '加载失败'
  }
  return `${pageTotal.value} 条`
})

function onDualTeacherSignalClick(_key: string) {
  void loadPage()
}

function dualTeacherRowClassName(record: PortfolioDualTeacherApplicationVO): string {
  return record.id === highlightedApplicationId.value ? 'dual-teacher-admin__row-active' : ''
}

const columns: ColumnsType = [
  { title: '申请单号', dataIndex: 'applicationNo', key: 'applicationNo' },
  { title: '教师', key: 'teacher', width: 160 },
  { title: '状态', dataIndex: 'applicationStatus', key: 'applicationStatus', width: 120 },
  { title: '等级', dataIndex: 'certLevel', key: 'certLevel', width: 80 },
  { title: '认定年度', dataIndex: 'certYear', key: 'certYear', width: 88 },
  {
    title: '实践天数',
    dataIndex: 'enterprisePracticeDays',
    key: 'enterprisePracticeDays',
    width: 88,
  },
  { title: '认定资格', key: 'eligibilityFreeze', width: 120 },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
  { title: '主行动', key: 'actions', width: 260 },
]


async function previewEligibility(id: string) {
  if (writing.value) {
    return
  }
  previewingId.value = id
  try {
    const preview = await portfolioDualTeacherApi.previewEligibilityGate({ id })
    if (previewingId.value !== id) {
      return
    }
    collegeEligibilityById.value = { ...collegeEligibilityById.value, [id]: preview }
    showEligibilityPreviewModal(preview)
  } catch (error) {
    showUserError(error, '预览认定资格失败')
  } finally {
    if (previewingId.value === id) {
      previewingId.value = ''
    }
  }
}

function canCollegeApprove(record: PortfolioDualTeacherApplicationVO): boolean {
  if (record.applicationStatus !== PortfolioDualTeacherApplicationStatusCode.COLLEGE_PENDING) {
    return false
  }
  return collegeEligibilityById.value[record.id]?.eligible === true
}

function showEligibilityPreviewModal(preview: PortfolioDualTeacherEligibilityFreezeVO) {
  const gapText = preview.gapItems?.length ? preview.gapItems.join('；') : '无缺口项'
  void confirmAsync({
    title: preview.eligible ? '认定资格：满足' : '认定资格：未满足',
    content: `${preview.explainText ?? ''}\n缺口：${gapText}`,
    type: 'info',
    hideCancel: true,
    okText: '知道了',
  })
}

function canAcademicApprove(record: PortfolioDualTeacherApplicationVO): boolean {
  if (record.applicationStatus !== PortfolioDualTeacherApplicationStatusCode.ACADEMIC_PENDING) {
    return false
  }
  if (!record.eligibilityFreeze) {
    return false
  }
  return record.eligibilityFreeze.eligible === true
}

/** 双师申请行主行动：院审/教务通过 > 提交 primary 置顶；唯一 primary。 */
function buildDualTeacherRowActions(
  record: PortfolioDualTeacherApplicationVO,
): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (canCollegeReview.value && canCollegeApprove(record)) {
    actions.push({ key: 'collegeApprove', label: '院审通过', tone: 'primary' })
  }
  if (canAcademicReview.value && canAcademicApprove(record)) {
    actions.push({ key: 'academicApprove', label: '教务通过', tone: 'primary' })
  }
  if (
    record.applicationStatus === PortfolioDualTeacherApplicationStatusCode.DRAFT
    || record.applicationStatus === 'COLLEGE_RETURNED'
    || record.applicationStatus === 'ACADEMIC_RETURNED'
  ) {
    actions.push({ key: 'submit', label: '提交', tone: 'primary' })
  }
  if (
    canCollegeReview.value
    && record.applicationStatus === PortfolioDualTeacherApplicationStatusCode.COLLEGE_PENDING
  ) {
    actions.push({ key: 'preview', label: '预览资格' })
    actions.push({ key: 'collegeReturn', label: '院审退回' })
  }
  if (
    canAcademicReview.value
    && record.applicationStatus === PortfolioDualTeacherApplicationStatusCode.ACADEMIC_PENDING
  ) {
    actions.push({ key: 'academicReturn', label: '教务退回' })
    actions.push({ key: 'academicReject', label: '教务驳回', tone: 'danger' })
  }
  let primaryUsed = false
  return actions.map((action) => {
    const next = { ...action, disabled: action.disabled || writing.value }
    if (next.tone === 'primary') {
      if (primaryUsed) {
        delete next.tone
      } else {
        primaryUsed = true
      }
    }
    return next
  })
}

type DualTeacherWorkflowAction
  = | 'submit'
    | 'collegeApprove'
    | 'collegeReturn'
    | 'academicApprove'
    | 'academicReturn'
    | 'academicReject'

function handleDualTeacherRowAction(key: string, record: PortfolioDualTeacherApplicationVO): void {
  if (key === 'preview') {
    void previewEligibility(record.id)
    return
  }
  if (writing.value || !record.id) {
    return
  }
  const actionContext = {
    applicationId: String(record.id),
    teacherId: record.teacherUserId ? String(record.teacherUserId) : '',
    action: key as DualTeacherWorkflowAction | 'collegeReturn' | 'academicReturn' | 'academicReject',
  }
  // 先冻结行目标，预检期间禁止切行串写
  workflowId.value = actionContext.applicationId
  actionTeacherId.value = actionContext.teacherId || undefined
  void (async () => {
    try {
      await reloadLifecycleState()
      if (workflowId.value !== actionContext.applicationId) {
        return
      }
      if (!assertArchiveWritable('双师认定审核')) {
        return
      }
      if (
        actionContext.action === 'collegeReturn'
        || actionContext.action === 'academicReturn'
        || actionContext.action === 'academicReject'
      ) {
        openOpinionModal(actionContext.action, actionContext.applicationId)
        return
      }
      await executeDualTeacherWorkflow(actionContext.action, actionContext.applicationId)
    } catch (error) {
      if (workflowId.value === actionContext.applicationId) {
        showUserError(error, '双师认定流程操作失败')
      }
    } finally {
      if (
        workflowId.value === actionContext.applicationId
        && !opinionModal.open
      ) {
        workflowId.value = ''
      }
    }
  })()
}

function openOpinionModal(
  action: 'collegeReturn' | 'academicReturn' | 'academicReject',
  id: string,
) {
  opinionModal.open = true
  opinionModal.action = action
  opinionModal.id = id
  opinionModal.opinion = ''
  if (action === 'collegeReturn') {
    opinionModal.title = '院审退回'
  } else if (action === 'academicReturn') {
    opinionModal.title = '教务退回补正'
  } else {
    opinionModal.title = '教务驳回'
  }
}

/** 意见弹窗关闭时释放行锁，避免取消后台账仍不可操作。 */
function onOpinionModalOpenChange(open: boolean): void {
  opinionModal.open = open
  if (
    !open
    && !opinionSubmitting.value
    && workflowId.value
    && workflowId.value === opinionModal.id
  ) {
    workflowId.value = ''
  }
}

async function confirmOpinionModal() {
  if (!opinionModal.action || !opinionModal.id) {
    return Promise.reject(new Error('缺少审核动作或申请 ID'))
  }
  if (!opinionModal.opinion.trim()) {
    showFormValidationMessage('请填写审核意见')
    return Promise.reject(new Error('审核意见为空'))
  }
  const actionContext = {
    applicationId: opinionModal.id,
    action: opinionModal.action,
    auditOpinion: opinionModal.opinion.trim(),
  }
  if (actionContext.action === 'academicReject') {
    const confirmed = await confirmAsync({
      title: '确认驳回双师认定',
      content: '驳回后本次申请终止，教师须重新发起认定申请。',
      type: 'warning',
      okText: '确认驳回',
    })
    if (!confirmed) {
      return Promise.reject(new Error('用户取消驳回'))
    }
  }
  if (workflowId.value && workflowId.value !== actionContext.applicationId) {
    return Promise.reject(new Error('审核目标已切换'))
  }
  if (!assertArchiveWritable('双师认定审核')) {
    return Promise.reject(new Error('档案封存写禁'))
  }
  opinionSubmitting.value = true
  opinionModal.open = false
  workflowId.value = actionContext.applicationId
  try {
    await executeDualTeacherWorkflow(
      actionContext.action,
      actionContext.applicationId,
      actionContext.auditOpinion,
    )
  } finally {
    opinionSubmitting.value = false
    if (workflowId.value === actionContext.applicationId) {
      workflowId.value = ''
    }
  }
}

async function executeDualTeacherWorkflow(
  action: DualTeacherWorkflowAction,
  id: string,
  auditOpinion?: string,
) {
  if (action === 'submit') {
    await portfolioDualTeacherApi.submit({ id })
  } else if (action === 'collegeApprove') {
    await portfolioDualTeacherApi.collegeApprove({ id, auditOpinion })
  } else if (action === 'collegeReturn') {
    await portfolioDualTeacherApi.collegeReturn({ id, auditOpinion })
  } else if (action === 'academicApprove') {
    await portfolioDualTeacherApi.academicApprove({ id, auditOpinion })
  } else if (action === 'academicReturn') {
    await portfolioDualTeacherApi.academicReturn({ id, auditOpinion })
  } else {
    await portfolioDualTeacherApi.academicReject({ id, auditOpinion })
  }
  if (workflowId.value !== id) {
    return
  }
  collegeEligibilityById.value = {}
  void message.success('操作成功')
  try {
    await loadPage()
  } catch (error) {
    showUserError(error, '操作已生效，台账同步失败')
  }
}

async function exportRoster() {
  if (writing.value) {
    return
  }
  exportApplyModal.purpose = ''
  exportApplyModal.open = true
}

async function confirmExportApply() {
  const exportPurpose = exportApplyModal.purpose.trim()
  if (!exportPurpose) {
    showFormValidationMessage('请填写导出用途')
    return Promise.reject(new Error('导出用途为空'))
  }
  const scope = accessScope.value
  const tenantWide = Boolean(scope?.tenantWide)
  const departmentId = scope?.reviewerDepartmentId
  if (!tenantWide && !departmentId) {
    showFormValidationMessage('当前账号缺少院系范围，无法申请导出双师台账')
    return Promise.reject(new Error('缺少院系范围'))
  }
  exporting.value = true
  try {
    await portfolioSecurityApi.applyExport({
      exportType: PortfolioExportTypeCode.DUAL_TEACHER_ROSTER,
      businessRef: tenantWide ? {} : { departmentId },
      exportPurpose,
    })
    exportApplyModal.open = false
    void message.success('已提交双师台账导出审批')
    void router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    showUserError(error, '提交双师台账导出审批失败')
    return Promise.reject(error)
  } finally {
    exporting.value = false
  }
}

async function handleImportSuccess() {
  importModalOpen.value = false
  collegeEligibilityById.value = {}
  await loadPage()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="双师认定台账" :subtitle="DualTeacherWorkbenchSubtitle">
        <template #actions>
          <UiButton size="sm" variant="outline" :disabled="writing" @click="() => void loadPage()">
            刷新
          </UiButton>
          <UiButton
            v-if="canImportRoster"
            size="sm"
            variant="outline"
            :disabled="writing"
            @click="importModalOpen = true"
          >
            表格文件导入
          </UiButton>
          <UiButton
            v-if="canExport"
            size="sm"
            variant="primary"
            :loading="exporting"
            :disabled="writing"
            @click="exportRoster"
          >
            申请导出台账
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <template v-if="DualTeacherSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="DualTeacherSignalMetrics"
        @metric-click="onDualTeacherSignalClick"
      />
    </template>

    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="dp-mb-component"
    />
    <UiPlatformExcelImportModal
      v-model:open="importModalOpen"
      :scene-key="ExcelImportSceneKey.PORTFOLIO_DUAL_TEACHER"
      entity-label="双师认定历史数据"
      @success="handleImportSuccess"
    />

    <WorkbenchSurfaceCard flush>
      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :total="pageTotal"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        :row-class-name="dualTeacherRowClassName"
        row-key="id"
        flat
        empty-kind="first-run"
        empty-description="当前无双师认定申请。院审/教务待办出现后会出现在此台账；勿将空表理解为流程已清零。"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'teacher'">
            <div>{{ record.teacherName || '—' }}</div>
            <div class="dual-teacher-admin__teacher-meta">
              {{ record.teacherNumber || '—' }}
              <template v-if="record.departmentName"> · {{ record.departmentName }}</template>
            </div>
          </template>
          <template v-else-if="column.key === 'certLevel'">
            {{
              record.certLevel
                ? (PORTFOLIO_DUAL_TEACHER_CERT_LEVEL_LABEL[record.certLevel as PortfolioDualTeacherCertLevelCode] ?? record.certLevel)
                : '-'
            }}
          </template>
          <template v-else-if="column.key === 'applicationStatus'">
            <UiTag :tone="statusTone(record.applicationStatus)">
              {{ statusLabel(record.applicationStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="portfolioLifecycleTagTone(record.lifecycleStatus)">
              {{ portfolioLifecycleStatusDisplay(record.lifecycleStatus) }}
            </UiTag>

            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
            />
          </template>
          <template v-else-if="column.key === 'countsInCurrentFacultyStructure'">
            <span>{{
              record.countsInCurrentFacultyStructure === true
                ? '是'
                : record.countsInCurrentFacultyStructure === false
                  ? '否'
                  : '—'
            }}</span>
          </template>
          <template v-else-if="column.key === 'eligibilityFreeze'">
            <UiTag v-if="record.eligibilityFreeze?.eligible" tone="green">
              已冻结·满足
            </UiTag>
            <UiTag v-else-if="record.eligibilityFreeze?.eligible === false" tone="orange">
              已冻结·未满足
            </UiTag>
            <span
              v-else-if="
                record.applicationStatus
                  === PortfolioDualTeacherApplicationStatusCode.COLLEGE_PENDING
              "
            >待院审冻结</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :max-visible="2"
              :items="buildDualTeacherRowActions(record)"
              split
              @action="(key) => handleDualTeacherRowAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>

    <UiDialog
      v-model:open="exportApplyModal.open"
      title="申请导出双师台账"
      ok-text="提交审批"
      cancel-text="取消"
      :confirm-loading="exporting"
      @ok="confirmExportApply"
    >
      <UiTextarea
        size="sm"
        v-model="exportApplyModal.purpose"
        :rows="3"
        placeholder="请填写导出用途（必填，将写入审批与水印）"
      />
    </UiDialog>

    <UiDialog
      v-model:open="opinionModal.open"
      :title="opinionModal.title"
      ok-text="确认"
      cancel-text="取消"
      :confirm-loading="writing"
      @ok="confirmOpinionModal"
      @update:open="onOpinionModalOpenChange"
    >
      <UiTextarea
        size="sm"
        v-model="opinionModal.opinion"
        :rows="3"
        placeholder="请填写审核意见（必填）"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.dual-teacher-admin__teacher-meta {
  margin-top: 2px;
  color: var(--dp-text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.dual-teacher-admin__row-active {
  background: var(--dp-surface-subtle);
}
</style>
