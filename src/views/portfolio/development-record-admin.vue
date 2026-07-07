<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDevelopmentRecordStatusCode } from '@/apis/portfolio/enums'
import { message } from 'ant-design-vue'
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
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useQueryTable } from '@/composables/useQueryTable'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const RECORD_TAB_KEYS: PortfolioDevelopmentRecordTypeCode[] = [
  PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT,
  PortfolioDevelopmentRecordTypeCode.POLICY,
]
const RECORD_TABS = RECORD_TAB_KEYS.map((key) => ({
  key,
  label: PortfolioDevelopmentRecordTypeDescription[key],
}))

type RecordType = (typeof RECORD_TAB_KEYS)[number]

const activeType = ref<RecordType>(PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT)
const importModalOpen = ref(false)
const { teacherOptions, searchTeachers, hydrateTeacherLabels, teacherLabel }
  = usePortfolioTeacherSearch()
const { loading, rows, pageNum, pageSize, pageTotal, loadPage, search, handlePageChange }
  = useQueryTable(
    (params) =>
      portfolioDevelopmentRecordApi.page({
        ...params,
        recordType: activeType.value,
      }),
    {
      onLoaded: (list) => {
        const userIds = list
          .map((row) => row.teacherUserId)
          .filter((id): id is string => Boolean(id))
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
  }
  base.push(
    { title: '分类', dataIndex: 'categoryCode', key: 'categoryCode', width: 120 },
    { title: '状态', dataIndex: 'recordStatus', key: 'recordStatus', width: 88 },
    { title: '操作', key: 'actions', width: 120 },
  )
  return base
})

const tabLabel = computed(
  () => RECORD_TABS.find((item) => item.key === activeType.value)?.label ?? '',
)

const importContext = computed(() => ({ defaultRecordType: activeType.value }))

function recordStatusLabel(status: PortfolioDevelopmentRecordStatusCode): string {
  return strictEnumLabel(PortfolioDevelopmentRecordStatusDescription, status, '发展档案条目状态')
}

function resetForm() {
  form.recordTitle = ''
  form.descriptionText = ''
  form.teacherUserId = ''
}

async function saveRecord() {
  if (!form.recordTitle.trim()) {
    message.warning('请填写标题')
    return
  }
  if (requiresTeacher.value && !form.teacherUserId) {
    message.warning('成果条目须选择所属教师')
    return
  }
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
    showUserError(error)
  }
}

async function removeRecord(id: string) {
  try {
    await portfolioDevelopmentRecordApi.delete({ id })
    message.success('已删除')
    await loadPage()
  } catch (error) {
    showUserError(error)
  }
}

async function exportExcel() {
  try {
    const result = await portfolioDevelopmentRecordApi.exportExcel({ recordType: activeType.value })
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error)
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
    <div class="tabs">
      <UiButton
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
        <a-select
          v-if="requiresTeacher"
          v-model:value="form.teacherUserId"
          show-search
          allow-clear
          placeholder="搜索教师姓名或工号"
          class="input input--teacher"
          :filter-option="false"
          :options="teacherOptions"
          @search="searchTeachers"
        />
        <UiButton variant="primary" @click="saveRecord"> 保存 </UiButton>
      </div>
    </UiCard>
    <UiCard>
      <div class="toolbar">
        <UiButton @click="loadPage"> 刷新 </UiButton>
        <UiButton @click="importModalOpen = true"> 批量导入 </UiButton>
        <UiButton @click="exportExcel"> 导出 Excel </UiButton>
      </div>
      <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无发展记录" />
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
          <template v-else-if="column.key === 'recordStatus'">
            {{ recordStatusLabel(record.recordStatus) }}
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
  border: 1px solid var(--ant-color-border);
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
