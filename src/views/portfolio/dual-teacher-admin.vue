<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDualTeacherApplicationStatus } from '@/apis/portfolio/enums'
import type {
  PortfolioDualTeacherApplicationVO,
  PortfolioDualTeacherEligibilityFreezeVO,
} from '@/apis/portfolio/teacher-platform'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import { PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_LABEL } from '@/apis/portfolio/enums'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { hasTeacherTenantPermission, RoleEnum } from '@/utils/permission'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const authStore = useAuthStore()
const userStore = useUserStore()
const collegeEligibilityById = ref<Record<string, PortfolioDualTeacherEligibilityFreezeVO>>({})
const canCollegeReview = computed(() => authStore.userRole === RoleEnum.CROP_ADMIN)
const canAcademicReview = computed(() =>
  hasTeacherTenantPermission({
    roleKey: authStore.userRole,
    isTenantAdmin: userStore.isTenantAdmin,
  }),
)
const canExport = computed(() => canAcademicReview.value)

function statusLabel(status: string) {
  return strictEnumLabel(
    PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_LABEL,
    status as PortfolioDualTeacherApplicationStatus,
    '双师申请状态',
  )
}

const loading = ref(false)
const rows = ref<PortfolioDualTeacherApplicationVO[]>([])
const importModalOpen = ref(false)

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

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioDualTeacherApi.page({ pageNum: 1, pageSize: 50 })
    rows.value = readPageList(page, '加载双师申请失败')
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

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
  if (record.applicationStatus !== 'COLLEGE_PENDING') {
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
  if (record.applicationStatus !== 'ACADEMIC_PENDING') {
    return false
  }
  if (!record.eligibilityFreeze) {
    return false
  }
  return record.eligibilityFreeze.eligible === true
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

onMounted(loadPage)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="双师认定台账" />
    </template>
    <UiCard title="历史数据导入">
      <UiButton v-if="canExport" @click="importModalOpen = true"> Excel 批量导入 </UiButton>
    </UiCard>
    <UiPlatformExcelImportModal
      v-model:open="importModalOpen"
      :scene-key="ExcelImportSceneKey.PORTFOLIO_DUAL_TEACHER"
      entity-label="双师认定历史数据"
      @success="handleImportSuccess"
    />
    <UiCard>
      <div class="toolbar">
        <UiButton @click="loadPage"> 刷新 </UiButton>
        <UiButton variant="primary" v-if="canExport" @click="exportRoster"> 导出台账 </UiButton>
      </div>
      <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无双师认定记录" />
      <UiDataTable
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        row-key="id"
        style="margin-top: 16px"
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
            <span v-else-if="record.applicationStatus === 'COLLEGE_PENDING'">待院审冻结</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTextAction
              v-if="
                record.applicationStatus === 'DRAFT'
                  || record.applicationStatus === 'COLLEGE_RETURNED'
                  || record.applicationStatus === 'ACADEMIC_RETURNED'
              "
              @click="runWorkflow('submit', record.id)"
            >
              提交
            </UiTextAction>
            <UiTextAction
              v-if="canCollegeReview && record.applicationStatus === 'COLLEGE_PENDING'"
              @click="previewEligibility(record.id)"
            >
              预览资格
            </UiTextAction>
            <UiTextAction
              v-if="canCollegeReview && canCollegeApprove(record)"
              @click="runWorkflow('collegeApprove', record.id)"
            >
              院审通过
            </UiTextAction>
            <UiTextAction
              v-if="canCollegeReview && record.applicationStatus === 'COLLEGE_PENDING'"
              @click="runWorkflow('collegeReturn', record.id)"
            >
              院审退回
            </UiTextAction>
            <UiTextAction
              v-if="canAcademicReview && canAcademicApprove(record)"
              @click="runWorkflow('academicApprove', record.id)"
            >
              教务通过
            </UiTextAction>
            <UiTextAction
              v-if="canAcademicReview && record.applicationStatus === 'ACADEMIC_PENDING'"
              @click="runWorkflow('academicReturn', record.id)"
            >
              教务退回
            </UiTextAction>
            <UiTextAction
              v-if="canAcademicReview && record.applicationStatus === 'ACADEMIC_PENDING'"
              @click="runWorkflow('academicReject', record.id)"
            >
              教务驳回
            </UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
}
</style>
