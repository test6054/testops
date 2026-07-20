<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioDualTeacherApplicationVO,
  PortfolioDualTeacherEligibilityFreezeVO,
} from '@/apis/portfolio/teacher-platform'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import {
  PortfolioDualTeacherApplicationStatusCode,
  PortfolioDualTeacherApplicationStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioReviewAccess } from '@/composables/usePortfolioReviewAccess'
import { useQueryTable } from '@/composables/useQueryTable'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { hasTeacherTenantPermission } from '@/utils/permission'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const authStore = useAuthStore()
const userStore = useUserStore()
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
  action: '' as
  | 'collegeReturn'
  | 'academicReturn'
  | 'academicReject'
  | '',
  id: '',
  title: '',
  opinion: '',
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
const canExport = computed(() => canAcademicReview.value)

onMounted(() => {
  void ensureLoaded()
})

function statusLabel(status: PortfolioDualTeacherApplicationVO['applicationStatus']) {
  return strictEnumLabel(PortfolioDualTeacherApplicationStatusDescription, status, '双师申请状态')
}

const importModalOpen = ref(false)
const route = useRoute()
/** PF-P0-295：院审台账 applicationId 深链高亮 */
const highlightedApplicationId = ref('')
const pendingLocateApplicationId = ref(
  typeof route.query.applicationId === 'string' ? route.query.applicationId.trim() : '',
)
const { loading, rows, pageNum, pageSize, pageTotal, loadError, loadPage, handlePageChange } = useQueryTable(
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

function dualTeacherRowClassName(record: PortfolioDualTeacherApplicationVO): string {
  return record.id === highlightedApplicationId.value ? 'dual-teacher-admin__row-active' : ''
}

const columns: ColumnsType = [
  { title: '申请单号', dataIndex: 'applicationNo', key: 'applicationNo' },
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 100 },
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
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
  { title: '操作', key: 'actions', width: 260 },
]

function lifecycleTagTone(record: PortfolioDualTeacherApplicationVO): 'green' | 'orange' | 'neutral' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'neutral'
}

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

function buildDualTeacherRowActions(
  record: PortfolioDualTeacherApplicationVO,
): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (
    record.applicationStatus === PortfolioDualTeacherApplicationStatusCode.DRAFT
    || record.applicationStatus === 'COLLEGE_RETURNED'
    || record.applicationStatus === 'ACADEMIC_RETURNED'
  ) {
    actions.push({ key: 'submit', label: '提交' })
  }
  if (
    canCollegeReview.value
    && record.applicationStatus === PortfolioDualTeacherApplicationStatusCode.COLLEGE_PENDING
  ) {
    actions.push({ key: 'preview', label: '预览资格' })
  }
  if (canCollegeReview.value && canCollegeApprove(record)) {
    actions.push({ key: 'collegeApprove', label: '院审通过', tone: 'primary' })
  }
  if (
    canCollegeReview.value
    && record.applicationStatus === PortfolioDualTeacherApplicationStatusCode.COLLEGE_PENDING
  ) {
    actions.push({ key: 'collegeReturn', label: '院审退回' })
  }
  if (canAcademicReview.value && canAcademicApprove(record)) {
    actions.push({ key: 'academicApprove', label: '教务通过', tone: 'primary' })
  }
  if (
    canAcademicReview.value
    && record.applicationStatus === PortfolioDualTeacherApplicationStatusCode.ACADEMIC_PENDING
  ) {
    actions.push({ key: 'academicReturn', label: '教务退回' })
    actions.push({ key: 'academicReject', label: '教务驳回', tone: 'danger' })
  }
  // 行内仅 1 个 primary（院审通过优先于教务通过）
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
  actionTeacherId.value = record.teacherUserId ? String(record.teacherUserId) : undefined
  void reloadLifecycleState().then(() => {
    if (key === 'collegeReturn' || key === 'academicReturn' || key === 'academicReject') {
      if (!assertArchiveWritable('双师认定审核')) {
        return
      }
      openOpinionModal(key, record.id)
      return
    }
    if (!assertArchiveWritable('双师认定审核')) {
      return
    }
    void runWorkflow(key as DualTeacherWorkflowAction, record.id)
  })
}

function openOpinionModal(
  action: 'collegeReturn' | 'academicReturn' | 'academicReject',
  id: string,
) {
  if (writing.value) {
    return
  }
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

async function confirmOpinionModal() {
  if (!opinionModal.action || !opinionModal.id) {
    return Promise.reject(new Error('缺少审核动作或申请 ID'))
  }
  if (!opinionModal.opinion.trim()) {
    showFormValidationMessage('请填写审核意见')
    return Promise.reject(new Error('审核意见为空'))
  }
  const action = opinionModal.action
  const id = opinionModal.id
  const auditOpinion = opinionModal.opinion.trim()
  if (action === 'academicReject') {
    const confirmed = await confirmAsync({
      title: '确认驳回双师认定',
      content: '驳回后本次申请终止，教师须重新发起认定申请。',
      type: 'warning',
      okText: '确认驳回',
    })
    if (!confirmed || writing.value) {
      return Promise.reject(new Error('用户取消驳回或写入中'))
    }
  }
  if (!assertArchiveWritable('双师认定审核')) {
    return Promise.reject(new Error('档案封存写禁'))
  }
  opinionModal.open = false
  await runWorkflow(action, id, auditOpinion)
}

async function runWorkflow(
  action:
    | 'submit'
    | 'collegeApprove'
    | 'collegeReturn'
    | 'academicApprove'
    | 'academicReturn'
    | 'academicReject',
  id: string,
  auditOpinion?: string,
) {
  if (writing.value) {
    return
  }
  workflowId.value = id
  try {
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
    collegeEligibilityById.value = {}
    message.success('操作成功')
    await loadPage()
  } catch (error) {
    showUserError(error, '双师认定流程操作失败')
  } finally {
    workflowId.value = ''
  }
}

async function exportRoster() {
  if (writing.value) {
    return
  }
  exporting.value = true
  try {
    const result = await portfolioDualTeacherApi.exportRoster()
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出双师认定名册失败')
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
      <ContextBar show-title layout="workbench" title="双师认定台账">
        <template #actions>
          <UiButton size="sm" variant="outline" :disabled="writing" @click="loadPage">
            刷新
          </UiButton>
          <UiButton
            v-if="canExport"
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
            导出台账
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="mb-3"
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
          <template v-if="column.key === 'applicationStatus'">
            {{ statusLabel(record.applicationStatus) }}
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>
            
            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <span v-else>—</span>
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
            <UiTag v-if="record.eligibilityFreeze?.eligible === true" tone="green">
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
              :items="buildDualTeacherRowActions(record)"
              split
              @action="(key) => handleDualTeacherRowAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>
    <UiDialog
      v-model:open="opinionModal.open"
      :title="opinionModal.title"
      ok-text="确认"
      cancel-text="取消"
      :confirm-loading="writing"
      @ok="confirmOpinionModal"
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
