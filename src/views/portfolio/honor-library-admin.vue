<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioHonorStatsVO } from '@/apis/portfolio/teacher-platform'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import { PortfolioDevelopmentRecordTypeCode } from '@/apis/portfolio/enums'
import { portfolioDevelopmentRecordApi } from '@/apis/portfolio/teacher-platform'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useQueryTable } from '@/composables/useQueryTable'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const importModalOpen = ref(false)
const stats = ref<PortfolioHonorStatsVO | null>(null)
const statsRequestToken = ref(0)
const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value) || importModalOpen.value)
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
  { title: '业务日工号', dataIndex: 'affiliationStaffNo', key: 'affiliationStaffNo', width: 120 },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
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
const formTeacherId = computed(() => form.teacherUserId || undefined)
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard({ teacherId: formTeacherId })
const { teacherOptions, searchTeachers } = usePortfolioTeacherSearch()
const {
  loading,
  rows,
  pageNum,
  pageSize,
  pageTotal,
  filters: query,
  loadError,
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
    onLoaded: async (list, params) => {
      const currentToken = ++statsRequestToken.value
      const nextStats = await portfolioDevelopmentRecordApi.honorStats({
        levelCode: params.levelCode || undefined,
        awardUnit: params.awardUnit || undefined,
        recordDateFrom: params.recordDateFrom || undefined,
        recordDateTo: params.recordDateTo || undefined,
        categoryCode: params.categoryCode || undefined,
      })
      if (currentToken !== statsRequestToken.value) {
        return
      }
      stats.value = nextStats
    },
  },
)

function lifecycleTagTone(record: {
  lifecycleStatus?: string
}): 'green' | 'orange' | 'gray' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
}

async function saveRecord() {
  if (writing.value) return
  if (!form.recordTitle.trim()) {
    showFormValidationMessage('请填写荣誉标题')
    return
  }
  if (!form.teacherUserId) {
    showFormValidationMessage('荣誉条目须选择所属教师')
    return
  }
  if (!assertArchiveWritable('保存荣誉记录')) {
    return
  }
  operationKey.value = 'save'
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
    void message.success('已保存')
    form.recordTitle = ''
    form.teacherUserId = ''
    form.levelCode = ''
    form.awardUnit = ''
    form.recordDate = ''
    form.categoryCode = ''
    form.descriptionText = ''
    await loadPage()
  } catch (error) {
    showUserError(error, '保存荣誉记录失败')
  } finally {
    if (operationKey.value === 'save') operationKey.value = ''
  }
}

async function removeRecord(id: string, title: string) {
  if (writing.value) return
  const operation = `delete:${id}`
  operationKey.value = operation
  try {
    const confirmed = await confirmAsync({
      title: '确认删除荣誉记录？',
      content: `确认删除「${title}」？删除后该记录不再参与教师画像、统计和档案归集。`,
      type: 'error',
      okText: '确认删除',
    })
    if (!confirmed) return
    await portfolioDevelopmentRecordApi.delete({ id })
    void message.success('已删除')
    await loadPage()
  } catch (error) {
    showUserError(error, '删除荣誉记录失败')
  } finally {
    if (operationKey.value === operation) operationKey.value = ''
  }
}

async function exportHonor() {
  if (writing.value) return
  operationKey.value = 'export'
  try {
    const result = await portfolioDevelopmentRecordApi.honorExport({
      levelCode: query.value.levelCode || undefined,
      awardUnit: query.value.awardUnit || undefined,
      recordDateFrom: query.value.recordDateFrom || undefined,
      recordDateTo: query.value.recordDateTo || undefined,
      categoryCode: query.value.categoryCode || undefined,
    })
    await downloadPortfolioExcelExport(result)
    void message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出荣誉库失败')
  } finally {
    if (operationKey.value === 'export') operationKey.value = ''
  }
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="荣誉库" />
    </template>
    <UiCard>
      <UiAlertStrip
        v-if="archiveWriteForbidden"
        tone="warning"
        :message="archiveWriteBlockMessage || '该教师档案当前禁止写入，无法保存荣誉记录'"
        class="mb-3"
      />
      <div v-if="stats" class="stats">
        <span v-for="item in stats.levelCounts" :key="item.levelCode">
          {{ item.levelCode || '未分级' }}：{{ item.count }}
        </span>
        <span v-for="item in stats.yearCounts" :key="item.year">
          {{ item.year }}年：{{ item.count }}
        </span>
      </div>
      <div class="toolbar">
        <UiInput size="sm" v-model="query.levelCode" placeholder="等级" style="width: 100px" />
        <UiInput size="sm" v-model="query.awardUnit" placeholder="授予单位" style="width: 140px" />
        <UiInput size="sm" v-model="query.categoryCode" placeholder="分类" style="width: 100px" />
        <UiDatePicker
          size="sm"
          v-model="query.recordDateFrom"
          value-format="YYYY-MM-DD"
          placeholder="起始日期"
        />
        <UiDatePicker
          size="sm"
          v-model="query.recordDateTo"
          value-format="YYYY-MM-DD"
          placeholder="截止日期"
        />
        <UiButton size="sm" :disabled="writing" @click="search"> 查询 </UiButton>
        <UiButton size="sm" :disabled="writing" @click="exportHonor"> 导出 </UiButton>
        <UiButton variant="primary" size="sm" :disabled="writing" @click="importModalOpen = true">
          批量导入
        </UiButton>
      </div>
      <div class="form-row">
        <UiInput size="sm" v-model="form.recordTitle" placeholder="荣誉标题" style="width: 180px" />
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
        <UiInput size="sm" v-model="form.levelCode" placeholder="等级" style="width: 88px" />
        <UiInput size="sm" v-model="form.awardUnit" placeholder="授予单位" style="width: 140px" />
        <UiDatePicker
          size="sm"
          v-model="form.recordDate"
          value-format="YYYY-MM-DD"
          placeholder="日期"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="operationKey === 'save'"
          :disabled="writing || archiveWriteForbidden"
          @click="saveRecord"
        >
          新增
        </UiButton>
      </div>
      <UiEmpty
        size="sm"
        v-if="!loadError && !loading && rows.length === 0"
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
        :load-error="loadError"
        row-key="id"
        style="margin-top: 16px"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'teacherUserId'">
            {{ formatPortfolioTeacherDisplay(record.teacherName, record.teacherNumber) }}
          </template>
          <template v-else-if="column.key === 'affiliationStaffNo'">
            {{ record.affiliationStaffNo || '—' }}
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
              :row-key="record.id || record.teacherId || record.teacherUserId || record.userId"
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
              :items="[
                {
                  key: 'delete',
                  label: operationKey === `delete:${record.id}` ? '删除中' : '删除',
                  tone: 'danger',
                  disabled: writing,
                },
              ]"
              split
              @action="() => removeRecord(record.id, record.recordTitle)"
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
