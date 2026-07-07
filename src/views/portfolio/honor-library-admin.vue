<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioHonorStatsVO } from '@/apis/portfolio/teacher-platform'
import { portfolioDevelopmentRecordApi } from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import { PortfolioDevelopmentRecordTypeCode } from '@/apis/portfolio/enums'
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

const importModalOpen = ref(false)
const stats = ref<PortfolioHonorStatsVO | null>(null)
const honorImportContext = { defaultRecordType: PortfolioDevelopmentRecordTypeCode.HONOR }
const honorImportRequirements = [
  'recordType 须为 HONOR（模板已预填）',
  'teacherUserId 必填，须为租户内真实教师',
]

const columns: ColumnsType = [
  { title: '标题', dataIndex: 'recordTitle', key: 'recordTitle' },
  { title: '等级', dataIndex: 'levelCode', key: 'levelCode', width: 88 },
  { title: '授予单位', dataIndex: 'awardUnit', key: 'awardUnit', width: 140 },
  { title: '日期', dataIndex: 'recordDate', key: 'recordDate', width: 110 },
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 },
  { title: '操作', key: 'actions', width: 80 },
]

const form = reactive({
  recordTitle: '',
  teacherUserId: '',
  levelCode: '',
  awardUnit: '',
  recordDate: '',
  categoryCode: '',
  descriptionText: '',
})
const { teacherOptions, searchTeachers, hydrateTeacherLabels, teacherLabel } =
  usePortfolioTeacherSearch()
const {
  loading,
  rows,
  pageNum,
  pageSize,
  pageTotal,
  filters: query,
  loadPage,
  search,
  handlePageChange,
} = useQueryTable(
  (params) =>
    portfolioDevelopmentRecordApi.page({
      ...params,
      recordType: PortfolioDevelopmentRecordTypeCode.HONOR,
      levelCode: params.levelCode || undefined,
      awardUnit: params.awardUnit || undefined,
      recordDateFrom: params.recordDateFrom || undefined,
      recordDateTo: params.recordDateTo || undefined,
      categoryCode: params.categoryCode || undefined,
    }),
  {
    defaultFilters: () => ({
      levelCode: '',
      awardUnit: '',
      recordDateFrom: '',
      recordDateTo: '',
      categoryCode: '',
    }),
    onLoaded: async (list) => {
      const userIds = list.map((row) => row.teacherUserId).filter((id): id is string => Boolean(id))
      await hydrateTeacherLabels([...new Set(userIds)])
      stats.value = await portfolioDevelopmentRecordApi.honorStats({
        levelCode: query.value.levelCode || undefined,
        awardUnit: query.value.awardUnit || undefined,
        recordDateFrom: query.value.recordDateFrom || undefined,
        recordDateTo: query.value.recordDateTo || undefined,
        categoryCode: query.value.categoryCode || undefined,
      })
    },
  },
)

async function saveRecord() {
  if (!form.recordTitle.trim()) {
    message.warning('请填写荣誉标题')
    return
  }
  if (!form.teacherUserId) {
    message.warning('荣誉条目须选择所属教师')
    return
  }
  try {
    await portfolioDevelopmentRecordApi.save({
      recordType: PortfolioDevelopmentRecordTypeCode.HONOR,
      recordTitle: form.recordTitle.trim(),
      teacherUserId: form.teacherUserId,
      levelCode: form.levelCode.trim() || undefined,
      awardUnit: form.awardUnit.trim() || undefined,
      recordDate: form.recordDate || undefined,
      categoryCode: form.categoryCode.trim() || undefined,
      descriptionText: form.descriptionText.trim() || undefined,
    })
    message.success('已保存')
    form.recordTitle = ''
    form.teacherUserId = ''
    form.levelCode = ''
    form.awardUnit = ''
    form.recordDate = ''
    form.categoryCode = ''
    form.descriptionText = ''
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

async function exportHonor() {
  try {
    const result = await portfolioDevelopmentRecordApi.honorExport({
      levelCode: query.value.levelCode || undefined,
      awardUnit: query.value.awardUnit || undefined,
      recordDateFrom: query.value.recordDateFrom || undefined,
      recordDateTo: query.value.recordDateTo || undefined,
      categoryCode: query.value.categoryCode || undefined,
    })
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error)
  }
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="荣誉库" />
    </template>
    <UiCard>
      <div v-if="stats" class="stats">
        <span v-for="item in stats.levelCounts" :key="item.levelCode">
          {{ item.levelCode || '未分级' }}：{{ item.count }}
        </span>
        <span v-for="item in stats.yearCounts" :key="item.year">
          {{ item.year }}年：{{ item.count }}
        </span>
      </div>
      <div class="toolbar">
        <a-input v-model:value="query.levelCode" placeholder="等级" style="width: 100px" />
        <a-input v-model:value="query.awardUnit" placeholder="授予单位" style="width: 140px" />
        <a-input v-model:value="query.categoryCode" placeholder="分类" style="width: 100px" />
        <a-date-picker
          v-model:value="query.recordDateFrom"
          value-format="YYYY-MM-DD"
          placeholder="起始日期"
        />
        <a-date-picker
          v-model:value="query.recordDateTo"
          value-format="YYYY-MM-DD"
          placeholder="截止日期"
        />
        <UiButton @click="search"> 查询 </UiButton>
        <UiButton @click="exportHonor"> 导出 </UiButton>
        <UiButton @click="importModalOpen = true"> 批量导入 </UiButton>
      </div>
      <div class="form-row">
        <a-input v-model:value="form.recordTitle" placeholder="荣誉标题" style="width: 180px" />
        <a-select
          v-model:value="form.teacherUserId"
          show-search
          allow-clear
          placeholder="搜索教师姓名或工号"
          style="width: 220px"
          :filter-option="false"
          :options="teacherOptions"
          @search="searchTeachers"
        />
        <a-input v-model:value="form.levelCode" placeholder="等级" style="width: 88px" />
        <a-input v-model:value="form.awardUnit" placeholder="授予单位" style="width: 140px" />
        <a-date-picker
          v-model:value="form.recordDate"
          value-format="YYYY-MM-DD"
          placeholder="日期"
        />
        <UiButton variant="primary" @click="saveRecord"> 新增 </UiButton>
      </div>
      <UiEmpty
        v-if="!loading && rows.length === 0"
        description="当前筛选无荣誉记录，请调整条件或新建"
      />
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
      :scene-key="ExcelImportSceneKey.PORTFOLIO_DEVELOPMENT_RECORD"
      entity-label="荣誉库"
      :context="honorImportContext"
      :requirements="honorImportRequirements"
      @success="loadPage"
    />
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar,
.form-row,
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.stats span {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
