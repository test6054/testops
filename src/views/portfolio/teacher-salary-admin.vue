<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import { portfolioTeacherSalaryApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioReviewAccess } from '@/composables/usePortfolioReviewAccess'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useQueryTable } from '@/composables/useQueryTable'
import { useUserStore } from '@/stores/modules/user'
import { PortfolioBusinessDataSourceTypeCode } from '@/types/enums/portfolio-business-data-source-type-enum'
import { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { accessScope, ensureLoaded } = usePortfolioReviewAccess()
/** 院系路由或非租户管理员：本院系只读口径（PF-P0-421） */
const isDepartmentScoped = computed(
  () => route.path.includes('/department/') || !userStore.isTenantAdmin,
)
const pageTitle = computed(() => (isDepartmentScoped.value ? '院系教师工资' : '教师工资'))
const exportApplyModal = reactive({
  open: false,
  purpose: '',
})


const form = reactive<{
  teacherUserId: string
  salaryMonth: string
  baseAmount?: number
  performanceAmount?: number
  allowanceAmount?: number
}>({
  teacherUserId: '',
  salaryMonth: '',
  baseAmount: undefined,
  performanceAmount: undefined,
  allowanceAmount: undefined,
})

const formTeacherId = computed(() => form.teacherUserId || undefined)
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard({ teacherId: formTeacherId })
const { teacherOptions, searchTeachers } = usePortfolioTeacherSearch()
const { loading, rows, pageNum, pageSize, pageTotal, loadError, loadPage, handlePageChange }
  = useQueryTable(portfolioTeacherSalaryApi.page)
const operationKey = ref('')
const operating = computed(() => Boolean(operationKey.value))

function beginOperation(key: string): boolean {
  if (operating.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}


const columns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 },
  { title: '月份', dataIndex: 'salaryMonth', key: 'salaryMonth', width: 96 },
  {
    title: '基本工资',
    dataIndex: 'baseAmountDisplay',
    key: 'baseAmountDisplay',
    width: 100,
    align: 'right',
  },
  {
    title: '绩效工资',
    dataIndex: 'performanceAmountDisplay',
    key: 'performanceAmountDisplay',
    width: 100,
    align: 'right',
  },
  {
    title: '津贴',
    dataIndex: 'allowanceAmountDisplay',
    key: 'allowanceAmountDisplay',
    width: 100,
    align: 'right',
  },
  { title: '来源', dataIndex: 'dataSource', key: 'dataSource', width: 100 },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
]

async function saveSalary() {
  if (!assertArchiveWritable('录入薪酬')) {
    return
  }
  if (!form.teacherUserId || !form.salaryMonth.trim()) {
    showFormValidationMessage('请选择教师并填写薪酬月份')
    return
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.salaryMonth.trim())) {
    showFormValidationMessage('薪酬月份格式应为四位年份短横线两位月份')
    return
  }
  if (form.baseAmount == null && form.performanceAmount == null && form.allowanceAmount == null) {
    showFormValidationMessage('请至少填写一项薪酬金额')
    return
  }
  const operation = 'salary:save'
  if (!beginOperation(operation)) return
  const request = {
    teacherUserId: form.teacherUserId,
    salaryMonth: form.salaryMonth.trim(),
    baseAmount: form.baseAmount,
    performanceAmount: form.performanceAmount,
    allowanceAmount: form.allowanceAmount,
    dataSource: PortfolioBusinessDataSourceTypeCode.MANUAL,
  }
  try {
    await portfolioTeacherSalaryApi.save(request)
    void message.success('已保存')
    form.teacherUserId = ''
    form.salaryMonth = ''
    form.baseAmount = undefined
    form.performanceAmount = undefined
    form.allowanceAmount = undefined
    await loadPage()
  } catch (error) {
    showUserError(error, '保存教师薪酬失败')
  } finally {
    endOperation(operation)
  }
}

async function exportCsv() {
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
    showFormValidationMessage('当前账号缺少院系范围，无法申请导出教师薪酬')
    return Promise.reject(new Error('缺少院系范围'))
  }
  const operation = 'salary:export'
  if (!beginOperation(operation)) {
    return Promise.reject(new Error('操作进行中'))
  }
  try {
    await portfolioSecurityApi.applyExport({
      exportType: PortfolioExportTypeCode.TEACHER_SALARY,
      businessRef: tenantWide ? {} : { departmentId },
      exportPurpose,
    })
    exportApplyModal.open = false
    void message.success('已提交教师薪酬导出审批')
    void router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    showUserError(error, '提交教师薪酬导出审批失败')
    return Promise.reject(error)
  } finally {
    endOperation(operation)
  }
}

onMounted(() => {
  void ensureLoaded()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" :title="pageTitle" />
    </template>
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="mb-3"
    />
    <UiCard>
      <div class="form-row">
        <template v-if="!isDepartmentScoped">
          <UiSelect
            size="sm"
            v-model="form.teacherUserId"
            allow-search
            allow-clear
            placeholder="搜索教师姓名或工号"
            style="width: 220px"
            :filter-option="false"
            :options="teacherOptions"
            :disabled="operating"
            @search="searchTeachers"
          />
          <UiInput
            size="sm"
            v-model="form.salaryMonth"
            placeholder="月份，例如 2026-07"
            style="width: 120px"
            :disabled="operating"
          />
          <UiInputNumber
            size="sm"
            v-model="form.baseAmount"
            placeholder="基本工资"
            style="width: 100px"
            :disabled="operating"
          />
          <UiInputNumber
            size="sm"
            v-model="form.performanceAmount"
            placeholder="绩效工资"
            style="width: 100px"
            :disabled="operating"
          />
          <UiInputNumber
            size="sm"
            v-model="form.allowanceAmount"
            placeholder="津贴"
            style="width: 100px"
            :disabled="operating"
          />
          <UiButton
            size="sm"
            variant="primary"
            :loading="operationKey === 'salary:save'"
            :disabled="operating || archiveWriteForbidden"
            @click="saveSalary"
          >
            保存
          </UiButton>
        </template>
        <UiButton
          size="sm"
          :loading="operationKey === 'salary:export'"
          :disabled="operating"
          @click="exportCsv"
        >
          导出
        </UiButton>
      </div>
      <UiEmpty
        size="sm"
        v-if="!loading && !loadError && rows.length === 0"
        description="暂无薪酬档案"
      />
      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :total="pageTotal"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        row-key="id"
        style="margin-top: var(--dp-space-block)"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'teacherUserId'">
            {{ formatPortfolioTeacherDisplay(record.teacherName, record.teacherNumber) }}
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="portfolioLifecycleTagTone(record.lifecycleStatus)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiDialog
      v-model:open="exportApplyModal.open"
      title="申请导出教师薪酬"
      ok-text="提交审批"
      cancel-text="取消"
      :confirm-loading="operationKey === 'salary:export'"
      @ok="confirmExportApply"
    >
      <UiTextarea
        size="sm"
        v-model="exportApplyModal.purpose"
        :rows="3"
        placeholder="请填写导出用途（必填；薪酬敏感，将写入审批与水印）"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}
</style>
