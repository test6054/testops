<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import { portfolioDoubleDutyApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useQueryTable } from '@/composables/useQueryTable'
import {
  PortfolioKeyTeacherRegistryStatusCode,
  PortfolioKeyTeacherRegistryStatusDescription,
} from '@/types/enums/portfolio-key-teacher-registry-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

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

const formTeacherId = computed(() => form.teacherUserId || undefined)
const {
  archiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard({ teacherId: formTeacherId })

const { teacherOptions, searchTeachers } = usePortfolioTeacherSearch()
const { loading, rows, pageNum, pageSize, pageTotal, loadError, loadPage, handlePageChange } =
  useQueryTable(portfolioDoubleDutyApi.page)

const columns: ColumnsType = [
  { title: '教师', key: 'teacher', width: 120 },
  { title: '行政岗位', dataIndex: 'adminPostName', key: 'adminPostName' },
  { title: '教学岗位', dataIndex: 'teachingPostName', key: 'teachingPostName' },
  { title: '聘任年份', dataIndex: 'appointYear', key: 'appointYear', width: 96 },
  { title: '状态', dataIndex: 'registryStatus', key: 'registryStatus', width: 88 },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
  { title: '操作', key: 'actions', width: 80 },
]

function lifecycleTagTone(record: {
  lifecycleStatus?: string
}): 'green' | 'orange' | 'gray' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
}

function registryStatusLabel(status: PortfolioKeyTeacherRegistryStatusCode): string {
  return strictEnumLabel(PortfolioKeyTeacherRegistryStatusDescription, status, '双肩挑台账状态')
}

async function saveRegistry() {
  if (saving.value) {
    return
  }
  if (!assertArchiveWritable('登记双肩挑')) {
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
    void message.success('已登记')
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

async function revokeRegistry(id: string, teacherUserId?: string) {
  if (revokingId.value || saving.value) {
    return
  }
  if (teacherUserId) {
    form.teacherUserId = teacherUserId
    await reloadLifecycleState()
  }
  if (!assertArchiveWritable('作废双肩挑登记')) {
    return
  }
  revokingId.value = id
  try {
    await portfolioDoubleDutyApi.revoke({ id })
    void message.success('已作废')
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
    void message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出双肩挑台账失败')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="双肩挑台账"
        subtitle="行政与教学岗位登记 · 查询统计 · 导出台账"
      />
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
          size="sm"
          v-model="form.adminPostName"
          placeholder="行政岗位"
          style="width: 140px"
        />
        <UiInput
          size="sm"
          v-model="form.teachingPostName"
          placeholder="教学岗位"
          style="width: 140px"
        />
        <UiInput size="sm" v-model="form.appointYear" placeholder="聘任年份" style="width: 100px" />
        <UiInput size="sm" v-model="form.dutyScope" placeholder="职责范围" style="width: 180px" />
        <UiButton
          size="sm"
          variant="primary"
          :loading="saving"
          :disabled="saving || !!revokingId || archiveWriteForbidden"
          @click="saveRegistry"
        >
          登记
        </UiButton>
        <UiButton size="sm" :loading="exporting" :disabled="exporting" @click="exportRoster">
          导出台账
        </UiButton>
      </div>
      <UiEmpty
        size="sm"
        v-if="!loadError && !loading && rows.length === 0"
        description="暂无双肩挑台账记录"
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
        style="margin-top: 16px"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'teacher'">
            {{ formatPortfolioTeacherDisplay(record.teacherName, record.teacherNumber) }}
            <span v-if="record.departmentName" class="dept-hint">{{ record.departmentName }}</span>
          </template>
          <template v-else-if="column.key === 'registryStatus'">
            {{ registryStatusLabel(record.registryStatus) }}
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>

            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <span v-else class="text-neutral-400">—</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
            />
          </template>
          <template v-else-if="column.key === 'countsInCurrentFacultyStructure'">
            <span>
              {{
                record.countsInCurrentFacultyStructure === true
                  ? '是'
                  : record.countsInCurrentFacultyStructure === false
                    ? '否'
                    : '—'
              }}
            </span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="record.registryStatus === PortfolioKeyTeacherRegistryStatusCode.ACTIVE"
              :items="[{ key: 'revoke', label: '作废', tone: 'danger' }]"
              split
              @action="() => revokeRegistry(record.id, record.teacherUserId)"
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
