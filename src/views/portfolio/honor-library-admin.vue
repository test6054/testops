<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioHonorStatsVO } from '@/apis/portfolio/teacher-platform'
import type { PortfolioHonorLevelCode } from '@/types/enums/portfolio-honor-level-enum'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import { PortfolioDevelopmentRecordTypeCode } from '@/apis/portfolio/enums'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import { portfolioDevelopmentRecordApi } from '@/apis/portfolio/teacher-platform'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import PortfolioArchiveWriteGuardStrip from '@/components/portfolio/PortfolioArchiveWriteGuardStrip.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useQueryTable } from '@/composables/useQueryTable'
import { useUserStore } from '@/stores/modules/user'
import { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
/** 院系路由或非租户管理员：本院系荣誉库口径（PF-P0-420） */
const isDepartmentScoped = computed(
  () => route.path.includes('/department/') || !userStore.isTenantAdmin,
)
const pageTitle = computed(() => (isDepartmentScoped.value ? '院系荣誉库' : '荣誉库'))


const importModalOpen = ref(false)
const stats = ref<PortfolioHonorStatsVO | null>(null)
const statsRequestToken = ref(0)
const operationKey = ref('')
const exportApplyOpen = ref(false)
const exportPurpose = ref('')
const applyingExport = ref(false)
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
const {
  archiveWriteForbidden,
  archiveWriteCapabilityUnknown,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  loading: archiveWriteGuardLoading,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard({ teacherId: formTeacherId })
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
      levelCode: (params.levelCode || undefined) as PortfolioHonorLevelCode | undefined,
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
        levelCode: (params.levelCode || undefined) as PortfolioHonorLevelCode | undefined,
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
      levelCode: (form.levelCode.trim() || undefined) as PortfolioHonorLevelCode | undefined,
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

function openExportApply() {
  exportPurpose.value = ''
  exportApplyOpen.value = true
}

async function submitExportApply() {
  const purpose = exportPurpose.value.trim()
  if (!purpose) {
    showFormValidationMessage('请填写导出用途')
    return Promise.reject(new Error('导出用途为空'))
  }
  if (applyingExport.value) {
    return Promise.reject(new Error('导出申请进行中'))
  }
  applyingExport.value = true
  try {
    await portfolioSecurityApi.applyExport({
      exportType: PortfolioExportTypeCode.DEVELOPMENT_RECORD,
      businessRef: {
        developmentRecordType: PortfolioDevelopmentRecordTypeCode.HONOR,
        categoryCode: query.value.categoryCode || undefined,
        levelCode: (query.value.levelCode || undefined) as PortfolioHonorLevelCode | undefined,
        awardUnit: query.value.awardUnit || undefined,
        recordDateFrom: query.value.recordDateFrom || undefined,
        recordDateTo: query.value.recordDateTo || undefined,
      },
      exportPurpose: purpose,
    })
    exportApplyOpen.value = false
    void message.success('已提交荣誉库导出审批')
    await router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    showUserError(error, '提交荣誉库导出审批失败')
    return Promise.reject(error)
  } finally {
    applyingExport.value = false
  }
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" :title="pageTitle" />
    </template>
    <UiCard>
      <PortfolioArchiveWriteGuardStrip
        :blocked="archiveWriteForbidden"
        :capability-unknown="archiveWriteCapabilityUnknown"
        :message="archiveWriteBlockMessage || '该教师档案当前禁止写入，无法保存荣誉记录'"
        :loading="archiveWriteGuardLoading"
        @confirm="() => void reloadLifecycleState()"
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
        <UiButton
          v-if="!isDepartmentScoped"
          size="sm"
          :loading="applyingExport"
          :disabled="writing"
          @click="openExportApply"
        >
          申请导出
        </UiButton>
        <UiButton
          v-if="!isDepartmentScoped"
          variant="primary"
          size="sm"
          :disabled="writing"
          @click="importModalOpen = true"
        >
          批量导入
        </UiButton>
      </div>
      <div v-if="!isDepartmentScoped" class="form-row">
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
        style="margin-top: var(--dp-space-block)"
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
            <UiTag v-if="record.lifecycleStatus" :tone="portfolioLifecycleTagTone(record.lifecycleStatus)">
              {{ portfolioLifecycleStatusDisplay(record.lifecycleStatus) }}
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
              v-if="!isDepartmentScoped"
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
            <span v-else class="text-neutral-400">—</span>
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
      @success="() => void loadPage()"
    />
    <UiDialog
      v-model:open="exportApplyOpen"
      title="申请导出荣誉库台账"
      ok-text="提交审批"
      cancel-text="取消"
      :confirm-loading="applyingExport"
      @ok="submitExportApply"
    >
      <UiTextarea
        size="sm"
        v-model="exportPurpose"
        :rows="3"
        placeholder="请填写导出用途（必填，将写入审批记录）"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar,
.form-row,
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component-tight);
}
.stats span {
  font-size: var(--dp-font-size-sm);
  color: var(--text-secondary);
}
</style>
