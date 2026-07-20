<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDevelopmentRecordStatusCode } from '@/apis/portfolio/enums'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import {
  PortfolioDevelopmentRecordStatusDescription,
  PortfolioDevelopmentRecordTypeCode,
  PortfolioDevelopmentRecordTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioDevelopmentRecordApi } from '@/apis/portfolio/teacher-platform'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
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
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const {
  archiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
} = usePortfolioArchiveWriteGuard()

const RECORD_TAB_KEYS: PortfolioDevelopmentRecordTypeCode[] = [
  PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT,
  PortfolioDevelopmentRecordTypeCode.POLICY,
]
const RECORD_TABS = RECORD_TAB_KEYS.map((key) => ({
  key,
  label: strictEnumLabel(PortfolioDevelopmentRecordTypeDescription, key, '发展档案记录类型'),
}))

type RecordType = (typeof RECORD_TAB_KEYS)[number]

const activeType = ref<RecordType>(PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT)
const importModalOpen = ref(false)
const saving = ref(false)
const removingId = ref('')
const exporting = ref(false)
const { teacherOptions, searchTeachers, hydrateTeacherLabels, teacherLabel }
  = usePortfolioTeacherSearch()
const {
  loading,
  rows,
  pageNum,
  pageSize,
  pageTotal,
  loadError,
  loadPage,
  search,
  handlePageChange,
} = useQueryTable(
  (params) =>
    portfolioDevelopmentRecordApi.page({
      ...params,
      recordType: activeType.value,
    }),
  {
    onLoaded: (list) => {
      const userIds = list.map((row) => row.teacherUserId).filter((id): id is string => Boolean(id))
      void hydrateTeacherLabels([...new Set(userIds)])
    },
  },
)
interface DevelopmentRecordForm {
  recordTitle: string
  descriptionText: string
  teacherUserId: string
}

const form = reactive<DevelopmentRecordForm>({
  recordTitle: '',
  descriptionText: '',
  teacherUserId: '',
})

const requiresTeacher = computed(
  () => activeType.value === PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT,
)

const columns = computed<ColumnsType>(() => {
  const base: ColumnsType = [{ title: '标题', dataIndex: 'recordTitle', key: 'recordTitle' }]
  if (requiresTeacher.value) {
    base.push({ title: '所属教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 })
    base.push({
      title: '业务日工号',
      dataIndex: 'affiliationStaffNo',
      key: 'affiliationStaffNo',
      width: 120,
    })
  }
  base.push(
    { title: '分类', dataIndex: 'categoryCode', key: 'categoryCode', width: 120 },
    { title: '状态', dataIndex: 'recordStatus', key: 'recordStatus', width: 88 },
    { title: '生命周期', key: 'lifecycleStatus', width: 100 },
    { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
    { title: '操作', key: 'actions', width: 120 },
  )
  return base
})

const tabLabel = computed(
  () => RECORD_TABS.find((item) => item.key === activeType.value)?.label ?? '',
)

const importContext = computed(() => ({ defaultRecordType: activeType.value }))


function lifecycleTagTone(record: { lifecycleStatus?: string }): 'green' | 'orange' | 'neutral' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'neutral'
}

function recordStatusLabel(status: PortfolioDevelopmentRecordStatusCode): string {
  return strictEnumLabel(PortfolioDevelopmentRecordStatusDescription, status, '发展档案条目状态')
}

function resetForm() {
  form.recordTitle = ''
  form.descriptionText = ''
  form.teacherUserId = ''
}

async function saveRecord() {
  if (!assertArchiveWritable()) {
    return
  }
  if (saving.value) {
    return
  }
  if (!form.recordTitle.trim()) {
    showFormValidationMessage('请填写标题')
    return
  }
  if (requiresTeacher.value && !form.teacherUserId) {
    showFormValidationMessage('成果条目须选择所属教师')
    return
  }
  saving.value = true
  try {
    await portfolioDevelopmentRecordApi.save({
      recordType: activeType.value,
      recordTitle: form.recordTitle.trim(),
      descriptionText: form.descriptionText.trim() || undefined,
      teacherUserId: requiresTeacher.value ? form.teacherUserId : undefined,
    })
    message.success('已保存')
    resetForm()
    await loadPage()
  } catch (error) {
    showUserError(error, '保存发展记录失败')
  } finally {
    saving.value = false
  }
}

async function removeRecord(id: string) {
  if (!assertArchiveWritable()) {
    return
  }
  if (removingId.value || saving.value) {
    return
  }
  removingId.value = id
  try {
    await portfolioDevelopmentRecordApi.delete({ id })
    message.success('已删除')
    await loadPage()
  } catch (error) {
    showUserError(error, '删除发展记录失败')
  } finally {
    removingId.value = ''
  }
}

async function exportExcel() {
  if (exporting.value) {
    return
  }
  exporting.value = true
  try {
    const result = await portfolioDevelopmentRecordApi.exportExcel({ recordType: activeType.value })
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出发展记录失败')
  } finally {
    exporting.value = false
  }
}

function switchTab(type: RecordType) {
  activeType.value = type
  resetForm()
  search()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title :title="tabLabel" />
    </template>
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="mb-3"
    />
    <div class="tabs">
      <UiButton
        size="sm"
        v-for="tab in RECORD_TABS"
        :key="tab.key"
        :variant="activeType === tab.key ? 'primary' : 'outline'"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </UiButton>
    </div>
    <UiCard title="新增条目">
      <div class="form-row">
        <input v-model="form.recordTitle" class="input input--wide" placeholder="标题" />
        <UiSelect
          size="sm"
          v-if="requiresTeacher"
          v-model="form.teacherUserId"
          allow-search
          allow-clear
          placeholder="搜索教师姓名或工号"
          class="input input--teacher"
          :filter-option="false"
          :options="teacherOptions"
          @search="searchTeachers"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="saving"
          :disabled="saving"
          @click="saveRecord"
        >
          保存
        </UiButton>
      </div>
    </UiCard>
    <UiCard>
      <div class="toolbar">
        <UiButton size="sm" @click="loadPage"> 刷新 </UiButton>
        <UiButton size="sm" variant="primary" @click="importModalOpen = true"> 批量导入 </UiButton>
        <UiButton size="sm" :loading="exporting" :disabled="exporting" @click="exportExcel">
          导出表格文件
        </UiButton>
      </div>
      <UiEmpty
        size="sm"
        v-if="!loadError && !loading && rows.length === 0"
        description="当前筛选无发展记录"
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
          <template v-if="column.key === 'teacherUserId'">
            {{ teacherLabel(record.teacherUserId) }}
          </template>
          <template v-else-if="column.key === 'affiliationStaffNo'">
            {{ record.affiliationStaffNo || '—' }}
          </template>
          <template v-else-if="column.key === 'recordStatus'">
            {{ recordStatusLabel(record.recordStatus) }}
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>
            
            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <span v-else class="text-neutral-400">—</span>
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
              :items="[{ key: 'delete', label: '删除', tone: 'danger' }]"
              split
              @action="() => removeRecord(record.id)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiPlatformExcelImportModal
      v-model:open="importModalOpen"
      entity-label="发展档案"
      :scene-key="ExcelImportSceneKey.PORTFOLIO_DEVELOPMENT_RECORD"
      :context="importContext"
      @success="loadPage"
    />
  </StageWorkbenchShell>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.form-row,
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}
.input {
  padding: 6px 8px;
  border: 1px solid var(--dp-border);
  border-radius: 4px;
}
.input--wide {
  flex: 1;
  min-width: 200px;
}
.input--teacher {
  width: 240px;
  min-width: 200px;
}
</style>
