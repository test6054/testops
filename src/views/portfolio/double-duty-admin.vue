<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import { portfolioDoubleDutyApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useQueryTable } from '@/composables/useQueryTable'
import {
  PortfolioKeyTeacherRegistryStatusCode,
  PortfolioKeyTeacherRegistryStatusDescription,
} from '@/types/enums/portfolio-key-teacher-registry-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const saving = ref(false)
const revokingId = ref('')
const exporting = ref(false)
const form = reactive({
  teacherUserId: '',
  adminPostName: '',
  teachingPostName: '',
  appointYear: '',
  dutyScope: '',
})
const { teacherOptions, searchTeachers } = usePortfolioTeacherSearch()
const { loading, rows, pageNum, pageSize, pageTotal, loadPage, handlePageChange } = useQueryTable(
  portfolioDoubleDutyApi.page,
)

const columns: ColumnsType = [
  { title: '教师', key: 'teacher', width: 120 },
  { title: '行政岗位', dataIndex: 'adminPostName', key: 'adminPostName' },
  { title: '教学岗位', dataIndex: 'teachingPostName', key: 'teachingPostName' },
  { title: '聘任年份', dataIndex: 'appointYear', key: 'appointYear', width: 96 },
  { title: '状态', dataIndex: 'registryStatus', key: 'registryStatus', width: 88 },
  { title: '操作', key: 'actions', width: 80 },
]

function registryStatusLabel(status: PortfolioKeyTeacherRegistryStatusCode): string {
  return strictEnumLabel(PortfolioKeyTeacherRegistryStatusDescription, status, '双肩挑台账状态')
}

async function saveRegistry() {
  if (saving.value) {
    return
  }
  if (!form.teacherUserId) {
    showFormValidationMessage('请选择教师')
    return
  }
  saving.value = true
  try {
    await portfolioDoubleDutyApi.save({
      teacherUserId: form.teacherUserId,
      adminPostName: form.adminPostName.trim() || undefined,
      teachingPostName: form.teachingPostName.trim() || undefined,
      appointYear: form.appointYear.trim() || undefined,
      dutyScope: form.dutyScope.trim() || undefined,
    })
    message.success('已登记')
    form.teacherUserId = ''
    form.adminPostName = ''
    form.teachingPostName = ''
    form.appointYear = ''
    form.dutyScope = ''
    await loadPage()
  } catch (error) {
    showUserError(error, '登记双肩挑台账失败')
  } finally {
    saving.value = false
  }
}

async function revokeRegistry(id: string) {
  if (revokingId.value || saving.value) {
    return
  }
  revokingId.value = id
  try {
    await portfolioDoubleDutyApi.revoke({ id })
    message.success('已作废')
    await loadPage()
  } catch (error) {
    showUserError(error, '作废双肩挑登记失败')
  } finally {
    revokingId.value = ''
  }
}

async function exportRoster() {
  if (exporting.value) {
    return
  }
  exporting.value = true
  try {
    const result = await portfolioDoubleDutyApi.exportRoster({})
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出双肩挑台账失败')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="双肩挑台账" subtitle="行政与教学岗位登记 · 查询统计 · 导出台账" />
    <UiCard>
      <div class="form-row">
        <UiSelect
          size="sm"
          v-model="form.teacherUserId"
          allow-search
          allow-clear
          placeholder="搜索教师姓名或工号"
          style="width: 220px"
          :filter-option="false"
          :options="teacherOptions"
          @search="searchTeachers"
        />
        <UiInput
          size="sm" v-model="form.adminPostName" placeholder="行政岗位" style="width: 140px"
        />
        <UiInput
          size="sm"
          v-model="form.teachingPostName"
          placeholder="教学岗位"
          style="width: 140px"
        />
        <UiInput
          size="sm" v-model="form.appointYear" placeholder="聘任年份" style="width: 100px"
        />
        <UiInput
          size="sm" v-model="form.dutyScope" placeholder="职责范围" style="width: 180px"
        />
        <UiButton size="sm" variant="primary" :loading="saving" :disabled="saving || !!revokingId" @click="saveRegistry"> 登记 </UiButton>
        <UiButton size="sm" :loading="exporting" :disabled="exporting" @click="exportRoster"> 导出台账 </UiButton>
      </div>
      <UiEmpty size="sm" v-if="!loading && rows.length === 0" description="暂无双肩挑台账记录" />
      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :total="pageTotal"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        row-key="id"
        style="margin-top: 16px"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'teacher'">
            {{ record.teacherName }}
            <span v-if="record.departmentName" class="dept-hint">{{ record.departmentName }}</span>
          </template>
          <template v-else-if="column.key === 'registryStatus'">
            {{ registryStatusLabel(record.registryStatus) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="record.registryStatus === PortfolioKeyTeacherRegistryStatusCode.ACTIVE"
              :items="[{ key: 'revoke', label: '作废', tone: 'danger' }]"
              split
              @action="() => revokeRegistry(record.id)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.dept-hint {
  display: block;
  font-size: 12px;
  color: var(--dp-text-secondary);
}
</style>
