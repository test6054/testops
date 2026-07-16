<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ExcelImportRowDiagnostic } from '@/apis/platform/types'
import type { PortfolioExternalTeacherImportBatchStatusCode } from '@/apis/portfolio/enums'
import {
  PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_OPTIONS,
  PortfolioExternalTeacherDataStatusCode,
  PortfolioExternalTeacherDataStatusDescription,
  PortfolioExternalTeacherImportBatchStatusDescription,
} from '@/apis/portfolio/enums'
import type {
  PortfolioExternalTeacherImportBatchVO,
  PortfolioExternalTeacherPageRequest,
  PortfolioExternalTeacherSaveRequest,
  PortfolioExternalTeacherStatsVO,
  PortfolioExternalTeacherVO,
} from '@/apis/portfolio/teacher-platform'
import { portfolioExternalTeacherApi } from '@/apis/portfolio/teacher-platform'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ExcelImportSceneKey, FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQueryTable } from '@/composables/useQueryTable'
import { PortfolioImportQualityGradeDescription } from '@/types/enums/portfolio-import-quality-grade-enum'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const activeTab = ref('roster')
const statsLoading = ref(false)
const saving = ref(false)
const editLoading = ref(false)
const stats = ref<PortfolioExternalTeacherStatsVO | null>(null)
const drawerOpen = ref(false)
const batchDetailOpen = ref(false)
const batchDetail = ref<PortfolioExternalTeacherImportBatchVO | null>(null)
const importModalOpen = ref(false)

type ExternalTeacherFilters = Pick<
  PortfolioExternalTeacherPageRequest,
  'dataStatus' | 'teachSubject' | 'teacherSource' | 'contractStatus'
> &
  Record<string, unknown>

const { loading, rows, pageNum, pageSize, pageTotal, filters, loadPage, search, handlePageChange } =
  useQueryTable<PortfolioExternalTeacherVO, ExternalTeacherFilters>(
    (params) =>
      portfolioExternalTeacherApi.page({
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        dataStatus: params.dataStatus,
        teachSubject: params.teachSubject?.trim() || undefined,
        teacherSource: params.teacherSource?.trim() || undefined,
        contractStatus: params.contractStatus?.trim() || undefined,
      }),
    {
      defaultFilters: (): ExternalTeacherFilters => ({
        dataStatus: undefined,
        teachSubject: '',
        teacherSource: '',
        contractStatus: '',
      }),
      immediate: false,
    },
  )
const {
  loading: batchLoading,
  rows: batchRows,
  pageNum: batchPageNum,
  pageSize: batchPageSize,
  pageTotal: batchPageTotal,
  loadPage: loadImportBatches,
  handlePageChange: handleBatchPageChange,
} = useQueryTable<PortfolioExternalTeacherImportBatchVO>(
  portfolioExternalTeacherApi.importBatchPage,
  { immediate: false },
)

interface AttachmentItem {
  fileNodeId: string
  fileName: string
}

const attachmentItems = ref<AttachmentItem[]>([])
const attachmentInputRef = ref<HTMLInputElement>()
const uploadingAttachment = ref(false)

const form = reactive<PortfolioExternalTeacherSaveRequest>({
  id: undefined,
  fullName: '',
  gender: '',
  major: '',
  title: '',
  age: undefined,
  idCardNo: '',
  hireTerm: '',
  teachSubject: '',
  teachHours: undefined,
  employerUnit: '',
  teachMajor: '',
  teacherSource: '',
  trialScore: '',
  industryExperience: '',
  contractStatus: '',
  contactPhone: '',
  contactEmail: '',
  hireStartDate: undefined,
  hireEndDate: undefined,
  dataStatus: PortfolioExternalTeacherDataStatusCode.ACTIVE,
})

const columns: ColumnsType<PortfolioExternalTeacherVO> = [
  { title: '姓名', dataIndex: 'fullName', key: 'fullName', width: 88, fixed: 'left' },
  { title: '性别', dataIndex: 'gender', key: 'gender', width: 56 },
  { title: '专业', dataIndex: 'major', key: 'major', width: 88 },
  { title: '职称', dataIndex: 'title', key: 'title', width: 72 },
  { title: '年龄', dataIndex: 'age', key: 'age', width: 56 },
  { title: '聘任学期', dataIndex: 'hireTerm', key: 'hireTerm', width: 100 },
  { title: '任教科目', dataIndex: 'teachSubject', key: 'teachSubject', width: 100 },
  { title: '任职单位', dataIndex: 'employerUnit', key: 'employerUnit' },
  { title: '合同状态', dataIndex: 'contractStatus', key: 'contractStatus', width: 88 },
  { title: '状态', key: 'dataStatus', width: 72 },
  { title: '操作', key: 'actions', width: 100 },
]

const batchColumns: ColumnsType<PortfolioExternalTeacherImportBatchVO> = [
  { title: '文件名', dataIndex: 'fileName', key: 'fileName', fixed: 'left' },
  { title: '成功', dataIndex: 'successRows', key: 'successRows', width: 64 },
  { title: '失败', dataIndex: 'failedRows', key: 'failedRows', width: 64 },
  { title: '状态', key: 'batchStatus', width: 96 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 72 },
]

const batchDiagnosticColumns: ColumnsType<ExcelImportRowDiagnostic> = [
  {
    title: '行号',
    dataIndex: 'rowIndex',
    key: 'rowIndex',
    width: 72,
    customRender: ({ text }) => (Number(text) > 0 ? String(text) : '批次'),
  },
  { title: '处理说明', dataIndex: 'invalidReason', key: 'invalidReason' },
]

const batchDetailDiagnostics = computed<ExcelImportRowDiagnostic[]>(() => {
  const raw = batchDetail.value?.errorReportJson
  if (!raw) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return [{ rowIndex: -1, valid: false, invalidReason: '导入错误报告格式异常' }]
    }
    return parsed.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        return {
          rowIndex: -(index + 1),
          valid: false,
          invalidReason: '导入错误报告明细格式异常',
        }
      }
      const rowIndex =
        'rowIndex' in item && typeof item.rowIndex === 'number' ? item.rowIndex : -(index + 1)
      const invalidReason =
        'message' in item && typeof item.message === 'string' ? item.message : '导入失败'
      return { rowIndex, valid: false, invalidReason }
    })
  } catch {
    return [{ rowIndex: -1, valid: false, invalidReason: '导入错误报告不是合法 JSON' }]
  }
})

const contractStatusStatsColumns: ColumnsType = [
  { title: '合同状态', dataIndex: 'dimensionCode', key: 'dimensionCode' },
  { title: '人数', dataIndex: 'count', key: 'count', width: 72, align: 'right' },
]

const teacherSourceStatsColumns: ColumnsType = [
  { title: '教师来源', dataIndex: 'dimensionCode', key: 'dimensionCode' },
  { title: '人数', dataIndex: 'count', key: 'count', width: 72, align: 'right' },
]

function dataStatusLabel(status: PortfolioExternalTeacherDataStatusCode): string {
  return strictEnumLabel(PortfolioExternalTeacherDataStatusDescription, status, '外聘教师数据状态')
}

function batchStatusLabel(status: PortfolioExternalTeacherImportBatchStatusCode): string {
  return strictEnumLabel(
    PortfolioExternalTeacherImportBatchStatusDescription,
    status,
    '外聘教师导入批次状态',
  )
}

function resetForm() {
  form.id = undefined
  form.fullName = ''
  form.gender = ''
  form.major = ''
  form.title = ''
  form.age = undefined
  form.idCardNo = ''
  form.hireTerm = ''
  form.teachSubject = ''
  form.teachHours = undefined
  form.employerUnit = ''
  form.teachMajor = ''
  form.teacherSource = ''
  form.trialScore = ''
  form.industryExperience = ''
  form.contractStatus = ''
  form.contactPhone = ''
  form.contactEmail = ''
  form.hireStartDate = undefined
  form.hireEndDate = undefined
  form.dataStatus = PortfolioExternalTeacherDataStatusCode.ACTIVE
  attachmentItems.value = []
}

/** 编辑详情切换或失败时必须回收抽屉上下文，避免误把失败编辑当成新增保存。 */
function resetEditorContext() {
  resetForm()
  editLoading.value = false
}

/** 导入批次详情失败后关闭抽屉，避免停留在无目标的空白详情态。 */
function resetBatchDetailContext() {
  batchDetail.value = null
}

function attachmentFileIds(): string[] {
  return attachmentItems.value.map((item) => item.fileNodeId)
}

function openAttachmentPicker() {
  attachmentInputRef.value?.click()
}

async function onAttachmentPick(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  const files = input.files
  if (!files?.length) {
    return
  }
  uploadingAttachment.value = true
  try {
    for (const file of Array.from(files)) {
      const uploaded = await stageBusinessFile(FileUploadSceneKey.PORTFOLIO_MATERIAL, file)
      attachmentItems.value = [
        ...attachmentItems.value,
        { fileNodeId: uploaded.id, fileName: uploaded.nodeName },
      ]
    }
    message.success('附件已上传')
  } catch (error) {
    showUserError(error, '附件上传失败')
  } finally {
    uploadingAttachment.value = false
    input.value = ''
  }
}

function removeAttachment(fileNodeId: string) {
  attachmentItems.value = attachmentItems.value.filter((item) => item.fileNodeId !== fileNodeId)
}

/** 统一当前名册筛选口径，保证列表、统计与导出使用同一组过滤条件。 */
function buildRosterFilters() {
  return {
    dataStatus: filters.value.dataStatus,
    teachSubject: filters.value.teachSubject?.trim() || undefined,
    teacherSource: filters.value.teacherSource?.trim() || undefined,
    contractStatus: filters.value.contractStatus?.trim() || undefined,
  }
}

async function loadStats() {
  statsLoading.value = true
  try {
    stats.value = await portfolioExternalTeacherApi.stats(buildRosterFilters())
  } catch (error) {
    showUserError(error)
  } finally {
    statsLoading.value = false
  }
}

async function searchRoster() {
  await Promise.all([search(), loadStats()])
}

function openCreate() {
  resetForm()
  drawerOpen.value = true
}

function buildExternalTeacherRowActions(
  record: PortfolioExternalTeacherVO,
): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [{ key: 'edit', label: '编辑' }]
  if (record.dataStatus === PortfolioExternalTeacherDataStatusCode.ACTIVE) {
    actions.push({ key: 'revoke', label: '停用', tone: 'danger' })
  }
  return actions
}

function handleExternalTeacherAction(key: string, record: PortfolioExternalTeacherVO): void {
  if (key === 'edit') {
    void openEdit(record.id)
    return
  }
  if (key === 'revoke') {
    void revokeRecord(record.id)
  }
}

async function openEdit(id: string) {
  resetEditorContext()
  editLoading.value = true
  drawerOpen.value = true
  try {
    const detail = await portfolioExternalTeacherApi.get({ id })
    form.id = detail.id
    form.fullName = detail.fullName
    form.gender = detail.gender ?? ''
    form.major = detail.major ?? ''
    form.title = detail.title ?? ''
    form.age = detail.age
    form.idCardNo = detail.idCardNo ?? ''
    form.hireTerm = detail.hireTerm ?? ''
    form.teachSubject = detail.teachSubject ?? ''
    form.teachHours = detail.teachHours
    form.employerUnit = detail.employerUnit ?? ''
    form.teachMajor = detail.teachMajor ?? ''
    form.teacherSource = detail.teacherSource ?? ''
    form.trialScore = detail.trialScore ?? ''
    form.industryExperience = detail.industryExperience ?? ''
    form.contractStatus = detail.contractStatus ?? ''
    form.contactPhone = detail.contactPhone ?? ''
    form.contactEmail = detail.contactEmail ?? ''
    form.hireStartDate = detail.hireStartDate
    form.hireEndDate = detail.hireEndDate
    form.dataStatus = detail.dataStatus
    attachmentItems.value = (detail.attachmentFileIds ?? []).map((fileNodeId) => ({
      fileNodeId,
      fileName: fileNodeId,
    }))
  } catch (error) {
    drawerOpen.value = false
    resetEditorContext()
    showUserError(error)
  } finally {
    editLoading.value = false
  }
}

async function saveRecord() {
  if (!form.fullName.trim()) {
    message.warning('请填写姓名')
    return
  }
  saving.value = true
  try {
    await portfolioExternalTeacherApi.save({
      id: form.id,
      fullName: form.fullName.trim(),
      gender: form.gender?.trim() || undefined,
      major: form.major?.trim() || undefined,
      title: form.title?.trim() || undefined,
      age: form.age,
      idCardNo: form.idCardNo?.trim() || undefined,
      hireTerm: form.hireTerm?.trim() || undefined,
      teachSubject: form.teachSubject?.trim() || undefined,
      teachHours: form.teachHours,
      employerUnit: form.employerUnit?.trim() || undefined,
      teachMajor: form.teachMajor?.trim() || undefined,
      teacherSource: form.teacherSource?.trim() || undefined,
      trialScore: form.trialScore?.trim() || undefined,
      industryExperience: form.industryExperience?.trim() || undefined,
      contractStatus: form.contractStatus?.trim() || undefined,
      contactPhone: form.contactPhone?.trim() || undefined,
      contactEmail: form.contactEmail?.trim() || undefined,
      hireStartDate: form.hireStartDate,
      hireEndDate: form.hireEndDate,
      attachmentFileIds: attachmentFileIds().length ? attachmentFileIds() : undefined,
      dataStatus: form.dataStatus,
    })
    message.success('外聘教师已保存')
    drawerOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

async function revokeRecord(id: string) {
  const ok = await confirmAsync({
    title: '确认停用',
    content: '确认停用此外聘教师记录？',
    type: 'warning',
  })
  if (!ok) {
    return
  }
  try {
    await portfolioExternalTeacherApi.revoke({ id })
    message.success('已停用')
    await loadPage()
  } catch (error) {
    showUserError(error)
  }
}

async function handleImportSuccess() {
  importModalOpen.value = false
  await Promise.all([loadPage(), loadImportBatches()])
}

async function openBatchDetail(id: string) {
  batchDetailOpen.value = true
  resetBatchDetailContext()
  try {
    batchDetail.value = await portfolioExternalTeacherApi.importBatchGet({ id })
  } catch (error) {
    batchDetailOpen.value = false
    resetBatchDetailContext()
    showUserError(error)
  }
}

async function exportRoster() {
  try {
    const result = await portfolioExternalTeacherApi.exportRoster(buildRosterFilters())
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error)
  }
}

onMounted(async () => {
  await loadPage()
  await loadStats()
  await loadImportBatches()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="外聘教师台账">
        <template #actions>
          <UiButton variant="primary" @click="openCreate"> 新增外聘教师 </UiButton>
        </template>
      </ContextBar>
    </template>
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane key="roster" tab="名册">
        <UiCard title="批量导入">
          <UiButton @click="importModalOpen = true"> Excel 批量导入 </UiButton>
        </UiCard>
        <UiPlatformExcelImportModal
          v-model:open="importModalOpen"
          :scene-key="ExcelImportSceneKey.PORTFOLIO_EXTERNAL_TEACHER"
          entity-label="外聘教师"
          @success="handleImportSuccess"
        />
        <UiCard>
          <div class="toolbar">
            <a-select
              v-model:value="filters.dataStatus"
              allow-clear
              placeholder="数据状态"
              style="width: 120px"
              :options="PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_OPTIONS"
              @change="searchRoster"
            />
            <a-input
              v-model:value="filters.teachSubject"
              allow-clear
              placeholder="任教科目"
              style="width: 120px"
              @press-enter="searchRoster"
            />
            <a-input
              v-model:value="filters.teacherSource"
              allow-clear
              placeholder="教师来源"
              style="width: 120px"
              @press-enter="searchRoster"
            />
            <a-input
              v-model:value="filters.contractStatus"
              allow-clear
              placeholder="合同状态"
              style="width: 120px"
              @press-enter="searchRoster"
            />
            <UiButton @click="loadPage"> 刷新 </UiButton>
            <UiButton variant="outline" @click="exportRoster"> 导出台账 </UiButton>
          </div>
          <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无外聘教师" />
          <UiDataTable
            v-model:current="pageNum"
            v-model:page-size="pageSize"
            pagination-mode="server"
            :total="pageTotal"
            :columns="columns"
            :data-source="rows"
            :loading="loading"
            row-key="id"
            @page-change="handlePageChange"
          >
            <template
              #bodyCell="{
                column,
                record,
              }: {
                column: { key?: string }
                record: PortfolioExternalTeacherVO
              }"
            >
              <template v-if="column.key === 'dataStatus'">
                <UiTag
                  :tone="
                    record.dataStatus === PortfolioExternalTeacherDataStatusCode.ACTIVE
                      ? 'green'
                      : 'gray'
                  "
                >
                  {{ dataStatusLabel(record.dataStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="buildExternalTeacherRowActions(record)"
                  split
                  @action="(key) => handleExternalTeacherAction(key, record)"
                />
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </a-tab-pane>
      <a-tab-pane key="stats" tab="统计">
        <UiCard>
          <UiButton :loading="statsLoading" @click="loadStats"> 刷新统计 </UiButton>
          <a-spin :spinning="statsLoading">
            <div v-if="stats" class="stats-grid">
              <div>
                <h4>合同状态分布</h4>
                <UiDataTable
                  :columns="contractStatusStatsColumns"
                  :data-source="stats.contractStatusCounts"
                  row-key="dimensionCode"
                  size="small"
                  flat
                  pagination-mode="none"
                  :show-pagination="false"
                  :sticky-header="false"
                  :total="stats.contractStatusCounts.length"
                />
              </div>
              <div>
                <h4>教师来源分布</h4>
                <UiDataTable
                  :columns="teacherSourceStatsColumns"
                  :data-source="stats.teacherSourceCounts"
                  row-key="dimensionCode"
                  size="small"
                  flat
                  pagination-mode="none"
                  :show-pagination="false"
                  :sticky-header="false"
                  :total="stats.teacherSourceCounts.length"
                />
              </div>
            </div>
            <UiEmpty v-else-if="!statsLoading" description="暂无统计数据" />
          </a-spin>
        </UiCard>
      </a-tab-pane>
      <a-tab-pane key="import-batch" tab="导入批次">
        <UiCard>
          <UiButton :loading="batchLoading" @click="loadImportBatches"> 刷新批次 </UiButton>
          <UiDataTable
            v-model:current="batchPageNum"
            v-model:page-size="batchPageSize"
            pagination-mode="server"
            :total="batchPageTotal"
            :columns="batchColumns"
            :data-source="batchRows"
            :loading="batchLoading"
            row-key="id"
            style="margin-top: 16px"
            @page-change="handleBatchPageChange"
          >
            <template
              #bodyCell="{
                column,
                record,
              }: {
                column: { key?: string }
                record: PortfolioExternalTeacherImportBatchVO
              }"
            >
              <template v-if="column.key === 'batchStatus'">
                {{ batchStatusLabel(record.batchStatus) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="[{ key: 'detail', label: '详情' }]"
                  split
                  @action="() => openBatchDetail(record.id)"
                />
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </a-tab-pane>
    </a-tabs>
    <a-drawer
      v-model:open="drawerOpen"
      :title="form.id ? '编辑外聘教师' : '新增外聘教师'"
      width="480"
      @close="resetEditorContext"
    >
      <a-spin :spinning="editLoading">
        <a-form layout="vertical">
          <a-form-item label="姓名" required>
            <a-input v-model:value="form.fullName" />
          </a-form-item>
          <a-form-item label="性别">
            <a-input v-model:value="form.gender" />
          </a-form-item>
          <a-form-item label="专业">
            <a-input v-model:value="form.major" />
          </a-form-item>
          <a-form-item label="职称">
            <a-input v-model:value="form.title" />
          </a-form-item>
          <a-form-item label="年龄">
            <a-input-number v-model:value="form.age" :min="0" style="width: 100%" />
          </a-form-item>
          <a-form-item label="身份证号">
            <a-input v-model:value="form.idCardNo" />
          </a-form-item>
          <a-form-item label="聘任学期">
            <a-input v-model:value="form.hireTerm" />
          </a-form-item>
          <a-form-item label="任教科目">
            <a-input v-model:value="form.teachSubject" />
          </a-form-item>
          <a-form-item label="授课学时">
            <a-input-number v-model:value="form.teachHours" style="width: 100%" />
          </a-form-item>
          <a-form-item label="任职单位">
            <a-input v-model:value="form.employerUnit" />
          </a-form-item>
          <a-form-item label="任教专业">
            <a-input v-model:value="form.teachMajor" />
          </a-form-item>
          <a-form-item label="教师来源">
            <a-input v-model:value="form.teacherSource" />
          </a-form-item>
          <a-form-item label="试讲成绩">
            <a-input v-model:value="form.trialScore" />
          </a-form-item>
          <a-form-item label="行业经历">
            <a-input v-model:value="form.industryExperience" />
          </a-form-item>
          <a-form-item label="合同状态">
            <a-input v-model:value="form.contractStatus" />
          </a-form-item>
          <a-form-item label="联系电话">
            <a-input v-model:value="form.contactPhone" />
          </a-form-item>
          <a-form-item label="联系邮箱">
            <a-input v-model:value="form.contactEmail" />
          </a-form-item>
          <a-form-item label="聘期开始">
            <a-date-picker
              v-model:value="form.hireStartDate"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item label="聘期结束">
            <a-date-picker
              v-model:value="form.hireEndDate"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item label="数据状态">
            <a-select
              v-model:value="form.dataStatus"
              :options="PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_OPTIONS"
            />
          </a-form-item>
          <a-form-item label="附件材料">
            <input
              ref="attachmentInputRef"
              type="file"
              multiple
              class="sr-only"
              @change="onAttachmentPick"
            />
            <UiButton :loading="uploadingAttachment" @click="openAttachmentPicker">
              上传附件
            </UiButton>
            <ul v-if="attachmentItems.length" class="attachment-list">
              <li v-for="item in attachmentItems" :key="item.fileNodeId">
                {{ item.fileName }}
                <UiTextAction @click="removeAttachment(item.fileNodeId)"> 移除 </UiTextAction>
              </li>
            </ul>
          </a-form-item>
          <UiButton variant="primary" :loading="saving" @click="saveRecord"> 保存 </UiButton>
        </a-form>
      </a-spin>
    </a-drawer>
    <a-drawer
      v-model:open="batchDetailOpen"
      title="导入批次详情"
      width="480"
      @close="resetBatchDetailContext"
    >
      <template v-if="batchDetail">
        <p>文件 {{ batchDetail.fileName ?? '—' }}</p>
        <p>成功 {{ batchDetail.successRows ?? 0 }} · 失败 {{ batchDetail.failedRows ?? 0 }}</p>
        <p>状态 {{ batchStatusLabel(batchDetail.batchStatus) }}</p>
        <p v-if="batchDetail.qualityGrade">
          质量等级 {{ PortfolioImportQualityGradeDescription[batchDetail.qualityGrade] }} · 通过率
          {{ batchDetail.passRate ?? 0 }}% · 教师匹配率 {{ batchDetail.teacherMatchRate ?? 0 }}% ·
          字段可用率 {{ batchDetail.fieldUsableRate ?? 0 }}%
        </p>
        <p v-if="batchDetail.createTime">创建时间 {{ batchDetail.createTime }}</p>
        <UiDataTable
          v-if="batchDetailDiagnostics.length"
          pagination-mode="client"
          :columns="batchDiagnosticColumns"
          :data-source="batchDetailDiagnostics"
          :show-pagination="false"
          row-key="rowIndex"
          size="small"
          flat
        />
      </template>
    </a-drawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
.stats-grid h4 {
  margin: 0 0 8px;
  font-size: 14px;
}
.error-report {
  margin-top: 12px;
  padding: 8px;
  font-size: 12px;
  background: var(--ant-color-fill-quaternary);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}
.attachment-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.attachment-list li {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}
</style>
