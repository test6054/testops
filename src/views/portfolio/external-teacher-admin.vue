<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ExcelImportRowDiagnostic } from '@/apis/platform/types'
import type { PortfolioExternalTeacherImportBatchStatusCode } from '@/apis/portfolio/enums'
import type {
  PortfolioExternalTeacherImportBatchVO,
  PortfolioExternalTeacherPageRequest,
  PortfolioExternalTeacherSaveRequest,
  PortfolioExternalTeacherStatsVO,
  PortfolioExternalTeacherVO,
  PortfolioIndustryMentorContributionVO,
} from '@/apis/portfolio/teacher-platform'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { ExcelImportSceneKey, FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_OPTIONS,
  PortfolioExternalTeacherDataStatusCode,
  PortfolioExternalTeacherDataStatusDescription,
  PortfolioExternalTeacherImportBatchStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioExternalTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQueryTable } from '@/composables/useQueryTable'
import { PortfolioImportQualityGradeDescription } from '@/types/enums/portfolio-import-quality-grade-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const activeTab = ref('roster')
const externalTabItems = [
  { key: 'roster', label: '名册' },
  { key: 'stats', label: '统计' },
  { key: 'import-batch', label: '导入批次' },
]
const statsLoading = ref(false)
const statsLoadError = ref(false)
/** 统计请求 token，与名册筛选切换隔离 */
const statsRequestToken = ref(0)
const saving = ref(false)
const revokingId = ref('')
const exporting = ref(false)
const editLoading = ref(false)
const stats = ref<PortfolioExternalTeacherStatsVO | null>(null)
const detailContribution = ref<PortfolioIndustryMentorContributionVO | null>(null)
const drawerOpen = ref(false)
const batchDetailOpen = ref(false)
const batchDetail = ref<PortfolioExternalTeacherImportBatchVO | null>(null)
const importModalOpen = ref(false)

type ExternalTeacherFilters = Pick<
  PortfolioExternalTeacherPageRequest,
  'dataStatus' | 'teachSubject' | 'teacherSource' | 'contractStatus'
>
& Record<string, unknown>

const {
  loading,
  rows,
  pageNum,
  pageSize,
  pageTotal,
  filters,
  loadError,
  loadPage,
  search,
  handlePageChange,
} = useQueryTable<PortfolioExternalTeacherVO, ExternalTeacherFilters>(
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
  loadError: batchLoadError,
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
const editorEpoch = ref(0)

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
  { title: '贡献度', key: 'contributionScore', width: 88 },
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
  const items = batchDetail.value?.errorReport
  if (!items?.length) {
    return []
  }
  return items.flatMap((item, index) => {
    const invalidReason = item.message?.trim() || '导入失败'
    const errorCode = item.conflictAction
    if (item.rowIndexes?.length) {
      return item.rowIndexes.map((rowIndex) => ({
        rowIndex,
        valid: false,
        invalidReason,
        errorCode,
      }))
    }
    return [
      {
        rowIndex: item.rowIndex ?? -(index + 1),
        valid: false,
        invalidReason,
        errorCode,
      },
    ]
  })
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
  editorEpoch.value += 1
  uploadingAttachment.value = false
  detailContribution.value = null
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

/** 上传结果绑定外聘教师编辑器代际，旧详情附件不得追加到新对象。 */
async function onAttachmentPick(event: Event): Promise<void> {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  const files = input.files
  if (!files?.length) {
    return
  }
  const context = {
    externalTeacherId: form.id,
    epoch: editorEpoch.value,
  }
  uploadingAttachment.value = true
  try {
    for (const file of Array.from(files)) {
      const uploaded = await stageBusinessFile(FileUploadSceneKey.PORTFOLIO_MATERIAL, file)
      if (editorEpoch.value !== context.epoch || form.id !== context.externalTeacherId) {
        return
      }
      attachmentItems.value = [
        ...attachmentItems.value,
        { fileNodeId: uploaded.id, fileName: uploaded.nodeName },
      ]
    }
    void message.success('附件已上传')
  } catch (error) {
    if (editorEpoch.value !== context.epoch) {
      return
    }
    showUserError(error, '附件上传失败')
  } finally {
    if (editorEpoch.value === context.epoch) {
      uploadingAttachment.value = false
    }
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
  const currentToken = ++statsRequestToken.value
  const requestFilters = buildRosterFilters()
  statsLoading.value = true
  statsLoadError.value = false
  try {
    const next = await portfolioExternalTeacherApi.stats(requestFilters)
    if (currentToken !== statsRequestToken.value) {
      return
    }
    stats.value = next
    statsLoadError.value = false
  } catch (error) {
    if (currentToken !== statsRequestToken.value) {
      return
    }
    stats.value = null
    statsLoadError.value = true
    showUserError(error, '加载外聘教师统计失败')
  } finally {
    if (currentToken === statsRequestToken.value) {
      statsLoading.value = false
    }
  }
}

async function searchRoster() {
  // 先作废在途统计，避免旧筛选统计覆盖新列表
  statsRequestToken.value += 1
  await Promise.all([search(), loadStats()])
}

function openCreate() {
  resetEditorContext()
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

/** 加载指定外聘教师详情，只有当前编辑器代际可以写入共享表单。 */
async function openEdit(id: string): Promise<void> {
  resetEditorContext()
  const contextEpoch = editorEpoch.value
  editLoading.value = true
  drawerOpen.value = true
  try {
    const [detail, contribution] = await Promise.all([
      portfolioExternalTeacherApi.get({ id }),
      portfolioExternalTeacherApi.contributionGet({ id }),
    ])
    if (editorEpoch.value !== contextEpoch) {
      return
    }
    detailContribution.value = contribution
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
    if (editorEpoch.value !== contextEpoch) {
      return
    }
    drawerOpen.value = false
    resetEditorContext()
    showUserError(error, '加载外聘教师详情失败')
  } finally {
    if (editorEpoch.value === contextEpoch) {
      editLoading.value = false
    }
  }
}

async function saveRecord() {
  if (saving.value) {
    return
  }
  if (!form.fullName.trim()) {
    showFormValidationMessage('请填写姓名')
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
    void message.success('外聘教师已保存')
    drawerOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '保存外聘教师失败')
  } finally {
    saving.value = false
  }
}

async function revokeRecord(id: string) {
  if (revokingId.value || saving.value || exporting.value) {
    return
  }
  const ok = await confirmAsync({
    title: '确认停用',
    content: '确认停用此外聘教师记录？',
    type: 'warning',
  })
  if (!ok) {
    return
  }
  revokingId.value = id
  try {
    await portfolioExternalTeacherApi.revoke({ id })
    void message.success('已停用')
    await loadPage()
  } catch (error) {
    showUserError(error, '停用外聘教师失败')
  } finally {
    revokingId.value = ''
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
    showUserError(error, '加载导入批次详情失败')
  }
}

async function exportRoster() {
  if (exporting.value || saving.value) {
    return
  }
  exporting.value = true
  try {
    const result = await portfolioExternalTeacherApi.exportRoster(buildRosterFilters())
    await downloadPortfolioExcelExport(result)
    void message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出外聘教师名册失败')
  } finally {
    exporting.value = false
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
          <UiButton size="sm" variant="primary" @click="openCreate"> 新增外聘教师 </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiSectionTabs v-model="activeTab" :items="externalTabItems" compact divided />
    <template v-if="activeTab === 'roster'">
      <UiCard title="批量导入">
        <UiButton size="sm" variant="primary" @click="importModalOpen = true">
          表格文件批量导入
        </UiButton>
      </UiCard>
      <UiPlatformExcelImportModal
        v-model:open="importModalOpen"
        :scene-key="ExcelImportSceneKey.PORTFOLIO_EXTERNAL_TEACHER"
        entity-label="外聘教师"
        @success="handleImportSuccess"
      />
      <UiCard>
        <div class="toolbar">
          <UiSelect
            size="sm"
            v-model="filters.dataStatus"
            allow-clear
            placeholder="数据状态"
            style="width: 120px"
            :options="PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_OPTIONS"
            @change="searchRoster"
          />
          <UiInput
            size="sm"
            v-model="filters.teachSubject"
            clearable
            placeholder="任教科目"
            style="width: 120px"
            @press-enter="searchRoster"
          />
          <UiInput
            size="sm"
            v-model="filters.teacherSource"
            clearable
            placeholder="教师来源"
            style="width: 120px"
            @press-enter="searchRoster"
          />
          <UiInput
            size="sm"
            v-model="filters.contractStatus"
            clearable
            placeholder="合同状态"
            style="width: 120px"
            @press-enter="searchRoster"
          />
          <UiButton size="sm" @click="loadPage"> 刷新 </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :loading="exporting"
            :disabled="exporting || saving"
            @click="exportRoster"
          >
            导出台账
          </UiButton>
        </div>
        <WorkbenchContextGateStrip
          v-if="!loadError && !loading && rows.length === 0"
          tag="无记录"
          body="当前筛选无外聘教师，可新增或调整筛选"
          cta-label="新增外聘教师"
          @cta="openCreate"
        />
        <UiDataTable
          v-else
          v-model:current="pageNum"
          v-model:page-size="pageSize"
          pagination-mode="server"
          :total="pageTotal"
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :load-error="loadError"
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
            <template v-else-if="column.key === 'contributionScore'">
              {{ record.contribution?.contributionScore ?? '—' }}
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
    </template>
    <template v-else-if="activeTab === 'stats'">
      <UiCard>
        <UiButton size="sm" :loading="statsLoading" @click="loadStats"> 刷新统计 </UiButton>
        <UiSpin :spinning="statsLoading">
          <div v-if="stats" class="analytics-summary mb-3">
            <UiCard title="台账总量">
              <p>筛选口径总数 {{ stats.totalCount ?? 0 }}</p>
              <p>在册有效 {{ stats.activeCount ?? 0 }}</p>
            </UiCard>
            <UiCard title="产业导师贡献度均值（§8.42）">
              <p>综合贡献度 {{ stats.avgContributionScore ?? 0 }}</p>
              <p>聘任 {{ stats.avgAppointmentValidityScore ?? 0 }} · 教学 {{ stats.avgTeachingParticipationScore ?? 0 }}</p>
              <p>实践 {{ stats.avgPracticeGuidanceScore ?? 0 }} · 成果 {{ stats.avgIndustryOutcomeScore ?? 0 }} · 考核 {{ stats.avgAssessmentScore ?? 0 }}</p>
              <p class="hint">校内职称可用：{{ stats.usableForCampusTitleEvaluation === false ? '否' : '—' }}</p>
            </UiCard>
          </div>
          <div v-if="stats" class="stats-grid">
            <div>
              <h4>合同状态分布</h4>
              <UiDataTable
                :columns="contractStatusStatsColumns"
                :data-source="stats.contractStatusCounts"
                row-key="dimensionCode"
                size="sm"
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
          <UiEmpty
            size="sm"
            v-else-if="statsLoadError"
            title="统计数据加载失败"
            action-label="重试"
            @action="loadStats"
          />
          <UiEmpty size="sm" v-else-if="!statsLoading" description="暂无统计数据" />
        </UiSpin>
      </UiCard>
    </template>
    <template v-else-if="activeTab === 'import-batch'">
      <UiCard>
        <UiButton size="sm" :loading="batchLoading" @click="loadImportBatches"> 刷新批次 </UiButton>
        <UiDataTable
          v-model:current="batchPageNum"
          v-model:page-size="batchPageSize"
          pagination-mode="server"
          :total="batchPageTotal"
          :columns="batchColumns"
          :data-source="batchRows"
          :loading="batchLoading"
          :load-error="batchLoadError"
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
    </template>
    <UiDrawer
      v-model:open="drawerOpen"
      :title="form.id ? '编辑外聘教师' : '新增外聘教师'"
      width="480"
      @close="resetEditorContext"
    >
      <UiSpin :spinning="editLoading">
        <UiForm layout="vertical">
          <UiFormItem label="姓名" required>
            <UiInput size="sm" v-model="form.fullName" />
          </UiFormItem>
          <UiFormItem label="性别">
            <UiInput size="sm" v-model="form.gender" />
          </UiFormItem>
          <UiFormItem label="专业">
            <UiInput size="sm" v-model="form.major" />
          </UiFormItem>
          <UiFormItem label="职称">
            <UiInput size="sm" v-model="form.title" />
          </UiFormItem>
          <UiFormItem label="年龄">
            <UiInputNumber size="sm" v-model="form.age" :min="0" style="width: 100%" />
          </UiFormItem>
          <UiFormItem label="身份证号">
            <UiInput size="sm" v-model="form.idCardNo" />
          </UiFormItem>
          <UiFormItem label="聘任学期">
            <UiInput size="sm" v-model="form.hireTerm" />
          </UiFormItem>
          <UiFormItem label="任教科目">
            <UiInput size="sm" v-model="form.teachSubject" />
          </UiFormItem>
          <UiFormItem label="授课学时">
            <UiInputNumber size="sm" v-model="form.teachHours" style="width: 100%" />
          </UiFormItem>
          <UiFormItem label="任职单位">
            <UiInput size="sm" v-model="form.employerUnit" />
          </UiFormItem>
          <UiFormItem label="任教专业">
            <UiInput size="sm" v-model="form.teachMajor" />
          </UiFormItem>
          <UiFormItem label="教师来源">
            <UiInput size="sm" v-model="form.teacherSource" />
          </UiFormItem>
          <UiFormItem label="试讲成绩">
            <UiInput size="sm" v-model="form.trialScore" />
          </UiFormItem>
          <UiFormItem label="行业经历">
            <UiInput size="sm" v-model="form.industryExperience" />
          </UiFormItem>
          <UiFormItem label="合同状态">
            <UiInput size="sm" v-model="form.contractStatus" />
          </UiFormItem>
          <UiFormItem label="联系电话">
            <UiInput size="sm" v-model="form.contactPhone" />
          </UiFormItem>
          <UiFormItem label="联系邮箱">
            <UiInput size="sm" v-model="form.contactEmail" />
          </UiFormItem>
          <UiFormItem label="聘期开始">
            <UiDatePicker
              size="sm"
              v-model="form.hireStartDate"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </UiFormItem>
          <UiFormItem label="聘期结束">
            <UiDatePicker
              size="sm"
              v-model="form.hireEndDate"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </UiFormItem>
          <UiFormItem label="数据状态">
            <UiSelect
              size="sm"
              v-model="form.dataStatus"
              :options="PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_OPTIONS"
            />
          </UiFormItem>
          <UiFormItem label="附件材料">
            <input
              ref="attachmentInputRef"
              type="file"
              multiple
              class="sr-only"
              @change="onAttachmentPick"
            />
            <UiButton
              variant="primary"
              size="sm"
              :loading="uploadingAttachment"
              @click="openAttachmentPicker"
            >
              上传附件
            </UiButton>
            <ul v-if="attachmentItems.length" class="attachment-list">
              <li v-for="item in attachmentItems" :key="item.fileNodeId">
                {{ item.fileName }}
                <UiTextAction @click="removeAttachment(item.fileNodeId)"> 移除 </UiTextAction>
              </li>
            </ul>
          </UiFormItem>
          <div v-if="detailContribution" class="contribution-panel">
            <p class="contribution-panel__title">§8.42 产业导师贡献度</p>
            <p>
              综合 {{ detailContribution.contributionScore }} · 聘任
              {{ detailContribution.appointmentValidityScore }} · 教学
              {{ detailContribution.teachingParticipationScore }} · 实践
              {{ detailContribution.practiceGuidanceScore }} · 成果
              {{ detailContribution.industryOutcomeScore }} · 考核
              {{ detailContribution.assessmentScore }}
            </p>
            <p class="contribution-panel__hint">{{ detailContribution.formulaLabel }}</p>
            <PortfolioOwnerIdentityLayersCell
              :layers="detailContribution.ownerIdentityLayers"
              :note="detailContribution.ownerMultiIdentityNote"
              show-note
            />
            <p class="contribution-panel__hint">不得作为校内职称评价结论</p>
            <ul v-if="detailContribution.evidenceNotes?.length">
              <li v-for="(note, idx) in detailContribution.evidenceNotes" :key="idx">{{ note }}</li>
            </ul>
          </div>
          <UiButton size="sm" variant="primary" :loading="saving" @click="saveRecord">
            保存
          </UiButton>
        </UiForm>
      </UiSpin>
    </UiDrawer>
    <UiDrawer
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
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.analytics-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.analytics-summary .hint {
  font-size: 12px;
  color: var(--dp-text-secondary);
}
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
  gap: var(--dp-space-3, 12px);
  margin-top: var(--dp-space-3, 12px);
}
.stats-grid h4 {
  margin: 0 0 8px;
  font-size: 14px;
}
.error-report {
  margin-top: 12px;
  padding: 8px;
  font-size: 12px;
  background: var(--dp-fill-quaternary);
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

.contribution-panel {
  margin: 12px 0;
  padding: 12px;
  border: 1px solid var(--dp-border-subtle, #e5e7eb);
  border-radius: 8px;
}
.contribution-panel__title {
  font-weight: 600;
  margin-bottom: 6px;
}
.contribution-panel__hint {
  color: var(--dp-text-secondary, #6b7280);
  font-size: 12px;
}
</style>
