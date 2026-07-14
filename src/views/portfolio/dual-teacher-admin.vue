<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioDualTeacherApplicationVO,
  PortfolioDualTeacherEligibilityFreezeVO,
} from '@/apis/portfolio/teacher-platform'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import {
  PortfolioDualTeacherApplicationStatusCode,
  PortfolioDualTeacherApplicationStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { usePortfolioReviewAccess } from '@/composables/usePortfolioReviewAccess'
import { useQueryTable } from '@/composables/useQueryTable'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { hasTeacherTenantPermission } from '@/utils/permission'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const authStore = useAuthStore()
const userStore = useUserStore()
const { accessScope, ensureLoaded } = usePortfolioReviewAccess()
const collegeEligibilityById = ref<Record<string, PortfolioDualTeacherEligibilityFreezeVO>>({})
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
const { loading, rows, pageNum, pageSize, pageTotal, loadPage, handlePageChange } = useQueryTable(
  portfolioDualTeacherApi.page,
)

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
  { title: '操作', key: 'actions', width: 260 },
]

async function previewEligibility(id: string) {
  try {
    const preview = await portfolioDualTeacherApi.previewEligibilityGate({ id })
    collegeEligibilityById.value = { ...collegeEligibilityById.value, [id]: preview }
    showEligibilityPreviewModal(preview)
  } catch (error) {
    showUserError(error)
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
  Modal.info({
    title: preview.eligible ? '认定资格：满足' : '认定资格：未满足',
    content: `${preview.explainText ?? ''}\n缺口：${gapText}`,
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
  return actions
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
  void runWorkflow(key as DualTeacherWorkflowAction, record.id)
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
) {
  try {
    if (action === 'submit') {
      await portfolioDualTeacherApi.submit({ id })
    } else if (action === 'collegeApprove') {
      await portfolioDualTeacherApi.collegeApprove({ id })
    } else if (action === 'collegeReturn') {
      await portfolioDualTeacherApi.collegeReturn({ id })
    } else if (action === 'academicApprove') {
      await portfolioDualTeacherApi.academicApprove({ id })
    } else if (action === 'academicReturn') {
      await portfolioDualTeacherApi.academicReturn({ id })
    } else {
      await portfolioDualTeacherApi.academicReject({ id })
    }
    message.success('操作成功')
    await loadPage()
  } catch (error) {
    showUserError(error)
  }
}

async function exportRoster() {
  try {
    const result = await portfolioDualTeacherApi.exportRoster()
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error)
  }
}

async function handleImportSuccess() {
  importModalOpen.value = false
  await loadPage()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="双师认定台账">
        <template #actions>
          <UiButton size="sm" variant="outline" @click="loadPage"> 刷新 </UiButton>
          <UiButton v-if="canExport" size="sm" variant="outline" @click="importModalOpen = true">
            Excel 导入
          </UiButton>
          <UiButton v-if="canExport" size="sm" variant="primary" @click="exportRoster">
            导出台账
          </UiButton>
        </template>
      </ContextBar>
    </template>
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
  </StageWorkbenchShell>
</template>
