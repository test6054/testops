<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import {
  PORTFOLIO_KEY_TEACHER_REGISTRY_TYPE_OPTIONS,
  PortfolioKeyTeacherRegistryStatusCode,
  PortfolioKeyTeacherRegistryStatusDescription,
  PortfolioKeyTeacherRegistryTypeCode,
} from '@/apis/portfolio/enums'
import { portfolioKeyTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useQueryTable } from '@/composables/useQueryTable'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const REGISTRY_TABS = PORTFOLIO_KEY_TEACHER_REGISTRY_TYPE_OPTIONS.map((item) => ({
  key: item.value,
  label: item.label,
}))

const activeType = ref<PortfolioKeyTeacherRegistryTypeCode>(
  PortfolioKeyTeacherRegistryTypeCode.PROGRAM_LEADER,
)
const saving = ref(false)
const revokingId = ref('')
const exporting = ref(false)
const form = reactive({
  teacherUserId: '',
  specialtyName: '',
  majorGroupName: '',
  appointYear: '',
  dutyScope: '',
})
const { teacherOptions, searchTeachers, hydrateTeacherLabels, teacherLabel }
  = usePortfolioTeacherSearch()
const { loading, rows, pageNum, pageSize, pageTotal, loadPage, search, handlePageChange }
  = useQueryTable(
    (params) =>
      portfolioKeyTeacherApi.page({
        ...params,
        registryType: activeType.value,
      }),
    {
      onLoaded: (list) => {
        void hydrateTeacherLabels(list.map((row) => row.teacherUserId ?? ''))
      },
    },
  )

const columns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 },
  { title: '专业', dataIndex: 'specialtyName', key: 'specialtyName' },
  { title: '专业群', dataIndex: 'majorGroupName', key: 'majorGroupName', width: 120 },
  { title: '聘任年份', dataIndex: 'appointYear', key: 'appointYear', width: 96 },
  { title: '状态', dataIndex: 'registryStatus', key: 'registryStatus', width: 88 },
  { title: '操作', key: 'actions', width: 80 },
]

function registryStatusLabel(status: PortfolioKeyTeacherRegistryStatusCode): string {
  return strictEnumLabel(PortfolioKeyTeacherRegistryStatusDescription, status, '重点教师名录状态')
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
    await portfolioKeyTeacherApi.save({
      teacherUserId: form.teacherUserId,
      registryType: activeType.value,
      specialtyName: form.specialtyName.trim() || undefined,
      majorGroupName: form.majorGroupName.trim() || undefined,
      appointYear: form.appointYear.trim() || undefined,
      dutyScope: form.dutyScope.trim() || undefined,
    })
    message.success('已登记')
    form.teacherUserId = ''
    form.specialtyName = ''
    form.majorGroupName = ''
    form.appointYear = ''
    form.dutyScope = ''
    await loadPage()
  } catch (error) {
    showUserError(error, '登记重点教师失败')
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
    await portfolioKeyTeacherApi.revoke({ id })
    message.success('已作废')
    await loadPage()
  } catch (error) {
    showUserError(error, '作废重点教师登记失败')
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
    const result = await portfolioKeyTeacherApi.exportRoster({ registryType: activeType.value })
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出重点教师名册失败')
  } finally {
    exporting.value = false
  }
}

function switchType(key: string | number) {
  switch (key) {
    case PortfolioKeyTeacherRegistryTypeCode.PROGRAM_LEADER:
      activeType.value = PortfolioKeyTeacherRegistryTypeCode.PROGRAM_LEADER
      break
    case PortfolioKeyTeacherRegistryTypeCode.KEY_TEACHER:
      activeType.value = PortfolioKeyTeacherRegistryTypeCode.KEY_TEACHER
      break
  }
  search()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="骨干/带头人登记" />
    </template>
    <UiCard>
      <UiSectionTabs
        v-model="activeType"
        :items="REGISTRY_TABS"
        compact
        divided
        class="key-teacher-admin__tabs"
        @change="switchType"
      />
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
          size="sm" v-model="form.specialtyName" placeholder="专业" style="width: 140px"
        />
        <UiInput
          size="sm" v-model="form.majorGroupName" placeholder="专业群" style="width: 140px"
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
      <UiEmpty size="sm" v-if="!loading && rows.length === 0" description="当前筛选无骨干教师记录" />
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
          <template v-if="column.key === 'teacherUserId'">
            {{ teacherLabel(record.teacherUserId) }}
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
  margin-top: 8px;
}
</style>
