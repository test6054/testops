<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { AccreditationCockpitVO, AccreditationCycleVO } from '@/apis/quality/accreditation'
import type {
  ArchiveQueryRequest,
  ArchiveSaveRequest,
  ArchiveVO,
  ExpertPackageExportRequest,
} from '@/apis/quality/archive'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { AuditTimelineEvent, SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { getOperationLogPage } from '@/apis/edu/operation-logs'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { accreditationApi } from '@/apis/quality/accreditation'
import { archiveApi } from '@/apis/quality/archive'
import {
  ALL_ARCHIVE_BUSINESS_TYPE_CODES,
  ArchiveBusinessTypeCode,
  ArchiveBusinessTypeDescription,
  ExpertPackageTypeCode,
  ExpertPackageTypeDescription,
} from '@/apis/quality/types'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import {
  AchievementResultSelector,
  AuditRectificationSelector,
  CourseGoalSelector,
  CourseSelector,
  GraduationRequirementSelector,
  ReportSelector,
  TeacherSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import AuditTimelineDrawer from '@/components/workbench/AuditTimelineDrawer.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  canExportExpertPackage,
  expertPackageExportBlockers,
} from '@/composables/useAccreditationWorkbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

function archiveBusinessTypeLabel(value: ArchiveBusinessTypeCode): string {
  return strictEnumLabel(ArchiveBusinessTypeDescription, value, '归档业务类型')
}

function archiveBusinessTypeColor(value: ArchiveBusinessTypeCode): BadgeTone {
  if (value === ArchiveBusinessTypeCode.EXPERT_PACKAGE) return 'yellow'
  if (value === ArchiveBusinessTypeCode.REPORT) return 'blue'
  if (value === ArchiveBusinessTypeCode.GRADUATION_REQUIREMENT) return 'purple'
  return 'blue'
}

function isExpertPackageRecord(value: ArchiveBusinessTypeCode): boolean {
  return value === ArchiveBusinessTypeCode.EXPERT_PACKAGE
}

const list = ref<ArchiveVO[]>([])
const total = ref(0)
const loading = ref(false)
const qualityStore = useQualityStore()

interface ArchiveFilterModel {
  businessType?: ArchiveBusinessTypeCode
  archiveCategory: string
  keyword: string
}

const query = reactive<ArchiveQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  businessType: undefined,
  excludeBusinessType: undefined,
  archiveCategory: '',
  archiveOfficeConfirmed: undefined,
  keyword: '',
})

type ArchiveListTab = 'expert' | 'annual'
const archiveListTab = ref<ArchiveListTab>('expert')

function applyArchiveListTab(tab: ArchiveListTab): void {
  archiveListTab.value = tab
  query.pageNum = 1
  filterModel.value.businessType = undefined
  if (tab === 'expert') {
    query.businessType = ArchiveBusinessTypeCode.EXPERT_PACKAGE
    query.excludeBusinessType = undefined
  } else {
    query.businessType = undefined
    query.excludeBusinessType = ArchiveBusinessTypeCode.EXPERT_PACKAGE
  }
}

function handleArchiveListTabChange(key: string | number): void {
  if (key === 'expert') {
    applyArchiveListTab('expert')
    void loadList()
    return
  }
  if (key === 'annual') {
    applyArchiveListTab('annual')
    void loadList()
  }
}

const businessTypeOptions = ALL_ARCHIVE_BUSINESS_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveBusinessTypeDescription, value, '归档业务类型'),
}))

const filterModel = ref<ArchiveFilterModel>({
  businessType: undefined,
  archiveCategory: '',
  keyword: '',
})

const annualBusinessTypeOptions = businessTypeOptions.filter(
  (item) => item.value !== ArchiveBusinessTypeCode.EXPERT_PACKAGE,
)

const filterFields = computed((): FilterField[] => {
  const fields: FilterField[] = [
    {
      key: 'archiveCategory',
      type: 'input',
      label: '归档分类',
      placeholder: '归档分类',
      allowClear: true,
      width: 130,
      triggerSearchOnChange: false,
    },
    {
      key: 'keyword',
      type: 'input',
      label: '关键字',
      placeholder: '关键字',
      allowClear: true,
      width: 180,
      triggerSearchOnChange: false,
    },
  ]
  if (archiveListTab.value === 'annual') {
    fields.unshift({
      key: 'businessType',
      type: 'select',
      label: '业务类型',
      placeholder: '业务类型',
      allowClear: true,
      width: 180,
      options: annualBusinessTypeOptions,
    })
  }
  return fields
})

const exportVisible = ref(false)
const exportSubmitting = ref(false)
const exportForm = reactive<ExpertPackageExportRequest>({
  packageType: ExpertPackageTypeCode.REQUIREMENT,
  targetId: '',
  archiveCode: '',
  retentionYears: 20,
  archiveCategory: '',
  notes: '',
  recipientUserIds: [],
})
const exportTrainingPlanId = ref('')
const exportCockpit = ref<AccreditationCockpitVO | undefined>()
const exportActiveCycle = ref<AccreditationCycleVO | undefined>()
const exportEvidenceCount = ref(0)
const exportReadinessLoading = ref(false)

const exportProgramBlockers = computed(() => {
  if (exportForm.packageType !== ExpertPackageTypeCode.PROGRAM_ACCREDITATION) {
    return []
  }
  return expertPackageExportBlockers(
    exportActiveCycle.value,
    exportCockpit.value,
    exportEvidenceCount.value,
  )
})

const canSubmitProgramExport = computed(() => {
  if (exportForm.packageType !== ExpertPackageTypeCode.PROGRAM_ACCREDITATION) {
    return true
  }
  return canExportExpertPackage(
    exportActiveCycle.value,
    exportCockpit.value,
    exportEvidenceCount.value,
  )
})

async function loadProgramExportReadiness(trainingPlanId: string) {
  if (!trainingPlanId.trim()) {
    exportCockpit.value = undefined
    exportActiveCycle.value = undefined
    exportEvidenceCount.value = 0
    return
  }
  exportReadinessLoading.value = true
  try {
    const cockpit = await accreditationApi.cockpit(trainingPlanId.trim())
    exportCockpit.value = cockpit
    exportActiveCycle.value = cockpit.activeCycle
    const programId = qualityStore.currentProgramId
    if (!programId) {
      exportEvidenceCount.value = 0
      return
    }
    const evidencePage = await accreditationApi.evidencePage({
      programId,
      trainingPlanId: trainingPlanId.trim(),
      pageNum: 1,
      pageSize: 1,
    })
    exportEvidenceCount.value = readPageTotal(evidencePage, '认证证据数量加载失败，请刷新后重试')
  } catch (error) {
    exportCockpit.value = undefined
    exportActiveCycle.value = undefined
    exportEvidenceCount.value = 0
    showUserError(error)
  } finally {
    exportReadinessLoading.value = false
  }
}

const detailVisible = ref(false)
const detailRecord = ref<ArchiveVO | null>(null)
const detailLoading = ref(false)

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorSubmitting = ref(false)
const editor = reactive<ArchiveSaveRequest>({
  archiveCode: '',
  businessType: ArchiveBusinessTypeCode.TRAINING_PLAN,
  businessId: '',
  fileId: '',
  archiveCategory: '',
  retentionPolicyCode: '',
  retentionYears: undefined,
  digitalStatus: '',
  notes: '',
})
const editorTrainingPlanId = ref('')
const editorQualityCourseId = ref('')
const archiveFileName = ref<string>()

async function loadList() {
  loading.value = true
  try {
    const page = await archiveApi.page({
      ...query,
      businessType: query.businessType || undefined,
      excludeBusinessType: query.excludeBusinessType || undefined,
      archiveCategory: query.archiveCategory?.trim() || undefined,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = readPageList(page, '质量归档材料加载失败，请稍后重试')
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = readPageTotal(page, '质量归档材料加载失败，请稍后重试')
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
    }
  } catch (error) {
    showUserError(error, '质量归档材料加载失败')
  } finally {
    loading.value = false
  }
}

async function handleScopeChange(): Promise<void> {
  await loadList()
}

useQualityScopedLoader(handleScopeChange, { watchScope: true, immediate: false })

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

function syncFilterToQuery() {
  if (archiveListTab.value === 'expert') {
    query.businessType = ArchiveBusinessTypeCode.EXPERT_PACKAGE
    query.excludeBusinessType = undefined
    filterModel.value.businessType = undefined
  } else {
    query.excludeBusinessType = ArchiveBusinessTypeCode.EXPERT_PACKAGE
    query.businessType = filterModel.value.businessType || undefined
  }
  query.archiveCategory = filterModel.value.archiveCategory
  query.keyword = filterModel.value.keyword
}

function handleSearch() {
  query.pageNum = 1
  syncFilterToQuery()
  loadList()
}

function handleResetSearch() {
  query.pageNum = 1
  query.archiveOfficeConfirmed = undefined
  syncFilterToQuery()
  loadList()
}

function openExport() {
  Object.assign(exportForm, {
    packageType: ExpertPackageTypeCode.REQUIREMENT,
    targetId: '',
    archiveCode: '',
    retentionYears: 20,
    archiveCategory: '',
    notes: '',
    recipientUserIds: [],
  })
  exportTrainingPlanId.value = qualityStore.currentTrainingPlanId || ''
  exportCockpit.value = undefined
  exportActiveCycle.value = undefined
  exportEvidenceCount.value = 0
  exportVisible.value = true
}

async function submitExport() {
  if (!exportForm.targetId.trim()) {
    message.error('请选择材料包对应的毕业要求或培养方案')
    return
  }
  if (exportForm.packageType === ExpertPackageTypeCode.PROGRAM_ACCREDITATION) {
    await loadProgramExportReadiness(exportForm.targetId.trim())
    if (!canSubmitProgramExport.value) {
      message.error(exportProgramBlockers.value.join('；') || '专业认证专家材料包导出条件未满足')
      return
    }
  }
  exportSubmitting.value = true
  try {
    const archiveId = await archiveApi.exportExpertPackage({
      ...exportForm,
      targetId: exportForm.targetId.trim(),
      archiveCode: exportForm.archiveCode?.trim() || undefined,
      archiveCategory: exportForm.archiveCategory?.trim() || undefined,
      notes: exportForm.notes?.trim() || undefined,
      recipientUserIds: exportForm.recipientUserIds?.length
        ? exportForm.recipientUserIds
        : undefined,
    })
    message.success('专家材料包导出成功')
    exportVisible.value = false
    await loadList()
    if (archiveId) {
      await openDetail({ id: archiveId })
    }
  } finally {
    exportSubmitting.value = false
  }
}

async function downloadArchiveFile(record: ArchiveVO) {
  if (!record.fileId) {
    message.warning('归档记录缺少文件')
    return
  }
  await handleDownloadFile({
    fileId: record.fileId,
    fileName: record.fileName,
  })
}

async function openDetail(record: Pick<ArchiveVO, 'id'>) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await archiveApi.detail(record.id)
  } finally {
    detailLoading.value = false
  }
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    archiveCode: '',
    businessType: ArchiveBusinessTypeCode.TRAINING_PLAN,
    businessId: '',
    fileId: '',
    archiveCategory: '',
    retentionPolicyCode: '',
    retentionYears: undefined,
    digitalStatus: '',
    notes: '',
  })
  editorTrainingPlanId.value = qualityStore.currentTrainingPlanId || ''
  editorQualityCourseId.value = qualityStore.currentQualityCourseId || ''
  archiveFileName.value = undefined
  editorVisible.value = true
}

async function openEdit(record: ArchiveVO) {
  editorMode.value = 'edit'
  detailLoading.value = true
  try {
    const detail = await archiveApi.detail(record.id)
    Object.assign(editor, {
      id: detail.id,
      archiveCode: detail.archiveCode,
      businessType: detail.businessType,
      businessId: detail.businessId,
      fileId: detail.fileId,
      archiveCategory: detail.archiveCategory || '',
      retentionPolicyCode: detail.retentionPolicyCode || '',
      retentionYears: detail.retentionYears,
      digitalStatus: detail.digitalStatus || '',
      notes: detail.notes || '',
    })
    editorTrainingPlanId.value = qualityStore.currentTrainingPlanId || ''
    editorQualityCourseId.value = qualityStore.currentQualityCourseId || ''
    archiveFileName.value = detail.fileName || undefined
    editorVisible.value = true
  } finally {
    detailLoading.value = false
  }
}

async function submitEditor() {
  if (!editor.archiveCode.trim()) {
    message.error('请填写归档编码')
    return
  }
  if (!editor.businessType || !editor.businessId?.trim() || !editor.fileId?.trim()) {
    message.error('请选择归档业务对象并上传归档文件')
    return
  }
  editorSubmitting.value = true
  try {
    const request: ArchiveSaveRequest = {
      ...editor,
      archiveCode: editor.archiveCode.trim(),
      businessId: editor.businessId.trim(),
      fileId: editor.fileId.trim(),
      archiveCategory: editor.archiveCategory?.trim() || undefined,
      retentionPolicyCode: editor.retentionPolicyCode?.trim() || undefined,
      digitalStatus: editor.digitalStatus?.trim() || undefined,
      notes: editor.notes?.trim() || undefined,
    }
    if (editorMode.value === 'create') {
      await archiveApi.create(request)
      message.success('已新建归档记录')
    } else {
      await archiveApi.update(request)
      message.success('已更新归档记录')
    }
    editorVisible.value = false
    await loadList()
  } finally {
    editorSubmitting.value = false
  }
}

function isArchiveDestroyable(record: ArchiveVO): boolean {
  if (!record.archivedTime || typeof record.retentionYears !== 'number') {
    return false
  }
  const archivedTime = new Date(record.archivedTime)
  if (Number.isNaN(archivedTime.getTime())) {
    return false
  }
  const expireAt = new Date(archivedTime)
  expireAt.setFullYear(expireAt.getFullYear() + record.retentionYears)
  return Date.now() >= expireAt.getTime()
}

function handleDelete(record: ArchiveVO) {
  if (!isArchiveDestroyable(record)) {
    message.warning('档案保管期未到期，禁止删除')
    return
  }
  void confirmAsync({
    title: `删除归档 ${record.archiveCode}？`,
    content: '删除后仅移除归档台帐记录，已上传的归档文件不会被删除。',
    type: 'error',
    onOk: async () => {
      await archiveApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

function clearEditorBusinessObject() {
  editor.businessId = ''
}

function syncEditorTrainingPlan(value: string | null) {
  editorTrainingPlanId.value = value || ''
  if (editor.businessType === ArchiveBusinessTypeCode.TRAINING_PLAN) editor.businessId = value || ''
}

function syncEditorCourse(value: string | null) {
  editorQualityCourseId.value = value || ''
}

/* ========== 信号指标 ========== */

const signals = computed<SignalMetric[]>(() => {
  const totalCount = list.value.length
  const confirmed = list.value.filter((r) => r.archiveOfficeConfirmed).length
  const pending = totalCount - confirmed
  const expertPackages = list.value.filter((r) => isExpertPackageRecord(r.businessType)).length
  const reports = list.value.filter((r) => r.businessType === ArchiveBusinessTypeCode.REPORT).length
  return [
    { key: 'total', label: '本页归档', value: totalCount, tone: 'blue' },
    { key: 'confirmed', label: '已确认', value: confirmed, tone: confirmed > 0 ? 'green' : 'gray' },
    { key: 'pending', label: '待确认', value: pending, tone: pending > 0 ? 'orange' : 'gray' },
    {
      key: 'expert',
      label: '专家材料包',
      value: expertPackages,
      tone: expertPackages > 0 ? 'yellow' : 'gray',
    },
    { key: 'report', label: '报告归档', value: reports, tone: reports > 0 ? 'blue' : 'gray' },
    { key: 'overall', label: '总台帐', value: total.value, tone: 'gray' },
  ]
})

const columns: ColumnsType = [
  { title: '归档编码', dataIndex: 'archiveCode', key: 'archiveCode' },
  { title: '业务类型', dataIndex: 'businessType', key: 'businessType', width: 160 },
  { title: '业务对象', dataIndex: 'businessLabel', key: 'businessRef', width: 220 },
  { title: '归档文件', key: 'fileRef', width: 220 },
  { title: '分类', dataIndex: 'archiveCategory', key: 'archiveCategory' },
  { title: '保管年限', dataIndex: 'retentionYears', key: 'retentionYears', width: 100 },
  {
    title: '档案室确认',
    dataIndex: 'archiveOfficeConfirmed',
    key: 'archiveOfficeConfirmed',
    width: 110,
  },
  { title: '归档时间', dataIndex: 'archivedTime', key: 'archivedTime', width: 170 },
  { title: '操作', key: 'actions', width: 280, fixed: 'right' },
]

const auditDrawerOpen = ref(false)
const auditEvents = ref<AuditTimelineEvent[]>([])
const auditLoading = ref(false)

async function openAuditDrawer(record: ArchiveVO) {
  auditDrawerOpen.value = true
  auditLoading.value = true
  auditEvents.value = []
  try {
    const page = await getOperationLogPage({
      pageNum: 1,
      pageSize: 50,
      module: 'ARCHIVE',
      category: 'QUALITY',
      bizId: record.id,
    })
    auditEvents.value = readPageList(page, '归档审计记录加载失败，请稍后重试').map((log) => {
      return {
        id: log.id,
        operatorName: log.userDto.nickName,
        operationType: log.type,
        operationLabel: log.detail,
        time: log.createTime,
        targetType: log.module,
        targetId: log.bizId || undefined,
        reason: log.changeDetails || log.errorStack || undefined,
      }
    })
  } finally {
    auditLoading.value = false
  }
}

watch(
  () => exportForm.packageType,
  () => {
    exportForm.targetId = ''
    exportCockpit.value = undefined
    exportActiveCycle.value = undefined
    exportEvidenceCount.value = 0
  },
)

watch(
  () => ({ packageType: exportForm.packageType, targetId: exportForm.targetId }),
  async (exportState) => {
    if (exportState.packageType !== ExpertPackageTypeCode.PROGRAM_ACCREDITATION || !exportState.targetId.trim()) {
      exportCockpit.value = undefined
      exportActiveCycle.value = undefined
      exportEvidenceCount.value = 0
      return
    }
    await loadProgramExportReadiness(exportState.targetId.trim())
  },
)

watch(
  () => editor.businessType,
  () => {
    clearEditorBusinessObject()
  },
)

onMounted(async () => {
  applyArchiveListTab('expert')
  await loadList()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar show-title title="质量评价 - 材料归档">
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadList">
            刷新
          </UiButton>
          <UiButton variant="primary" size="sm" @click="openCreate"> 补登台帐 </UiButton>
          <UiButton variant="outline" size="sm" @click="openExport"> 导出专家材料包 </UiButton>
        </template>
      </QualityPageContextBar>
    </template>

    <a-tabs
      :active-key="archiveListTab"
      class="archive-page__tabs"
      @change="handleArchiveListTabChange"
    >
      <a-tab-pane key="expert" tab="专家材料包" />
      <a-tab-pane key="annual" tab="年度归档记录" />
    </a-tabs>

    <SignalBand :metrics="signals" compact class="archive__signals" />

    <UiCard class="detail-table-card archive__table-card">
      <template #title>归档列表</template>

      <UiFilterBar
        variant="plain"
        v-model="filterModel"
        :fields="filterFields"
        show-labels
        search-text="查询"
        @search="handleSearch"
        @reset="handleResetSearch"
      />

      <UiDataTable
        class="student-detail-table__data-table"
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        :columns="columns"
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :total="total"
        flat
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'businessType'">
            <UiTag :tone="archiveBusinessTypeColor(record.businessType)" size="sm">
              {{ archiveBusinessTypeLabel(record.businessType) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'archiveCategory'">
            {{ record.archiveCategory || '未设置分类' }}
          </template>
          <template v-else-if="column.key === 'businessRef'">
            {{ record.businessLabel }}
          </template>
          <template v-else-if="column.key === 'fileRef'">
            <UiTextAction v-if="record.fileId" @click="downloadArchiveFile(record)">
              {{ record.fileName }}
            </UiTextAction>
          </template>
          <template v-else-if="column.key === 'retentionYears'">
            {{
              typeof record.retentionYears === 'number'
                ? `${record.retentionYears} 年`
                : '未设置保管年限'
            }}
          </template>
          <template v-else-if="column.key === 'archiveOfficeConfirmed'">
            <UiTag :tone="record.archiveOfficeConfirmed ? 'green' : 'gray'" size="sm">
              {{ record.archiveOfficeConfirmed ? '已确认' : '未确认' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'archivedTime'">
            {{ record.archivedTime || '尚未归档确认' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiTextAction @click="openDetail(record)">详情</UiTextAction>
              <UiTextAction v-if="record.fileId" @click="downloadArchiveFile(record)">
                下载
              </UiTextAction>
              <UiTextAction @click="openEdit(record)">编辑</UiTextAction>
              <UiTextAction
                v-if="isArchiveDestroyable(record)"
                tone="danger"
                @click="handleDelete(record)"
              >
                删除
              </UiTextAction>
              <span v-else class="archive-page__locked-hint">保管期内</span>
              <UiTextAction @click="openAuditDrawer(record)">审计</UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiDrawer
      v-model:open="exportVisible"
      title="导出专家材料包"
      :width="560"
      :confirm-loading="exportSubmitting"
      :hide-footer="false"
      ok-text="触发导出"
      @ok="submitExport"
    >
      <a-form layout="vertical" :model="exportForm">
        <a-form-item label="材料包类型" required>
          <a-radio-group v-model:value="exportForm.packageType">
            <a-radio
              v-for="(label, value) in ExpertPackageTypeDescription"
              :key="value"
              :value="value"
            >
              {{ label }}
            </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          :label="exportForm.packageType === ExpertPackageTypeCode.REQUIREMENT ? '毕业要求' : '培养方案'"
          required
        >
          <TrainingPlanSelector
            v-if="exportForm.packageType === ExpertPackageTypeCode.REQUIREMENT"
            v-model:value="exportTrainingPlanId"
            :program-id="qualityStore.currentProgramId || null"
            class="archive__stacked-control archive__stacked-control--first"
            placeholder="请选择毕业要求所属培养方案"
          />
          <GraduationRequirementSelector
            v-if="exportForm.packageType === ExpertPackageTypeCode.REQUIREMENT"
            v-model:value="exportForm.targetId"
            :training-plan-id="exportTrainingPlanId || qualityStore.currentTrainingPlanId || null"
            class="archive__stacked-control"
            placeholder="请选择毕业要求"
          />
          <TrainingPlanSelector
            v-else
            v-model:value="exportForm.targetId"
            :program-id="qualityStore.currentProgramId || null"
            placeholder="请选择培养方案"
          />
        </a-form-item>
        <div
          v-if="exportForm.packageType === ExpertPackageTypeCode.PROGRAM_ACCREDITATION && exportForm.targetId"
          class="archive-page__export-readiness"
        >
          <p class="archive-page__export-readiness-text">
            {{
              exportReadinessLoading
                ? '正在校验专业认证导出就绪条件…'
                : canSubmitProgramExport
                  ? '已满足专业认证专家材料包导出条件'
                  : '尚未满足专业认证专家材料包导出条件'
            }}
          </p>
          <ul
            v-if="!exportReadinessLoading && exportProgramBlockers.length"
            class="archive-page__export-blockers"
          >
            <li v-for="item in exportProgramBlockers" :key="item">{{ item }}</li>
          </ul>
        </div>
        <a-form-item label="归档编码">
          <a-input
            v-model:value="exportForm.archiveCode"
            placeholder="可选；为空时系统自动生成归档编码"
          />
        </a-form-item>
        <a-form-item label="保管年限">
          <a-input-number v-model:value="exportForm.retentionYears" :min="1" :max="50" />
        </a-form-item>
        <a-form-item label="归档分类">
          <a-input
            v-model:value="exportForm.archiveCategory"
            placeholder="可填写专家包、评审材料等分类"
          />
        </a-form-item>
        <a-form-item label="通知接收人">
          <TeacherSelector
            v-model:value="exportForm.recipientUserIds"
            mode="multiple"
            placeholder="请选择通知接收人"
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="exportForm.notes" :rows="2" placeholder="可选" />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建归档记录' : '编辑归档记录'"
      :width="720"
      :confirm-loading="editorSubmitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="归档编码" required>
              <a-input
                v-model:value="editor.archiveCode"
                placeholder="例：EP-REQ-1-2026"
                :disabled="editorMode === 'edit'"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="业务类型" required>
              <a-select
                v-model:value="editor.businessType"
                :options="businessTypeOptions"
                :disabled="editorMode === 'edit'"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="关联业务对象" required>
              <TrainingPlanSelector
                v-if="editor.businessType === ArchiveBusinessTypeCode.TRAINING_PLAN"
                :value="editor.businessId || null"
                :program-id="qualityStore.currentProgramId || null"
                placeholder="请选择培养方案"
                :disabled="editorMode === 'edit'"
                @change="syncEditorTrainingPlan"
              />
              <GraduationRequirementSelector
                v-else-if="editor.businessType === ArchiveBusinessTypeCode.GRADUATION_REQUIREMENT"
                v-model:value="editor.businessId"
                :training-plan-id="
                  editorTrainingPlanId || qualityStore.currentTrainingPlanId || null
                "
                placeholder="请选择毕业要求"
                :disabled="editorMode === 'edit'"
              />
              <CourseSelector
                v-else-if="editor.businessType === 'COURSE_GOAL'"
                :value="editorQualityCourseId || null"
                :training-plan-id="
                  editorTrainingPlanId || qualityStore.currentTrainingPlanId || null
                "
                :program-id="qualityStore.currentProgramId || null"
                placeholder="请先选择课程目标所属课程"
                :disabled="editorMode === 'edit'"
                @change="syncEditorCourse"
              />
              <CourseGoalSelector
                v-if="editor.businessType === 'COURSE_GOAL'"
                v-model:value="editor.businessId"
                :quality-course-id="
                  editorQualityCourseId || qualityStore.currentQualityCourseId || null
                "
                class="archive__stacked-control"
                placeholder="请选择课程目标"
                :disabled="editorMode === 'edit'"
              />
              <AchievementResultSelector
                v-else-if="editor.businessType === 'ACHIEVEMENT_RESULT'"
                v-model:value="editor.businessId"
                :training-plan-id="
                  editorTrainingPlanId || qualityStore.currentTrainingPlanId || null
                "
                :quality-course-id="
                  editorQualityCourseId || qualityStore.currentQualityCourseId || null
                "
                placeholder="请选择达成度结果"
                :disabled="editorMode === 'edit'"
              />
              <ReportSelector
                v-else-if="editor.businessType === ArchiveBusinessTypeCode.REPORT"
                v-model:value="editor.businessId"
                :program-id="qualityStore.currentProgramId || null"
                :training-plan-id="
                  editorTrainingPlanId || qualityStore.currentTrainingPlanId || null
                "
                :quality-course-id="
                  editorQualityCourseId || qualityStore.currentQualityCourseId || null
                "
                placeholder="请选择报告"
                :disabled="editorMode === 'edit'"
              />
              <AuditRectificationSelector
                v-else-if="editor.businessType === 'AUDIT_RECTIFICATION'"
                v-model:value="editor.businessId"
                placeholder="请选择审核评估整改任务"
                :disabled="editorMode === 'edit'"
              />
              <span v-else class="archive-page__form-hint">该类型需要从对应业务页面发起归档</span>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="归档文件" required>
              <UiPlatformFileField
                v-model:file-node-id="editor.fileId"
                v-model:file-name="archiveFileName"
                :scene-key="FileUploadSceneKey.QUALITY_ARCHIVE_FILE"
                :disabled="editorMode === 'edit'"
                button-text="上传归档文件"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="归档分类">
              <a-input v-model:value="editor.archiveCategory" placeholder="例：专家材料包" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="保管期编码">
              <a-input v-model:value="editor.retentionPolicyCode" placeholder="可选" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="保管年限">
              <a-input-number
                v-model:value="editor.retentionYears"
                :min="1"
                :max="50"
                class="archive__number-full"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="电子化保管状态">
          <a-input v-model:value="editor.digitalStatus" placeholder="例：全电子化 / 纸电混合" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="editor.notes" :rows="2" />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer v-model:open="detailVisible" title="归档详情" :width="560" :hide-footer="true">
      <UiEmpty v-if="!detailRecord && !detailLoading" description="暂无数据" size="sm" />
      <a-descriptions v-if="detailRecord" :column="1" size="small" bordered>
        <a-descriptions-item label="归档编码">
          {{ detailRecord.archiveCode }}
        </a-descriptions-item>
        <a-descriptions-item label="业务类型">
          <UiTag :tone="archiveBusinessTypeColor(detailRecord.businessType)" size="sm">
            {{ archiveBusinessTypeLabel(detailRecord.businessType) }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="关联业务对象">
          {{ detailRecord.businessLabel }}
        </a-descriptions-item>
        <a-descriptions-item label="归档文件">
          <UiTextAction v-if="detailRecord.fileId" @click="downloadArchiveFile(detailRecord)">
            {{ detailRecord.fileName }}
          </UiTextAction>
        </a-descriptions-item>
        <a-descriptions-item label="分类">
          {{ detailRecord.archiveCategory || '未设置分类' }}
        </a-descriptions-item>
        <a-descriptions-item label="保管年限">
          {{
            typeof detailRecord.retentionYears === 'number'
              ? `${detailRecord.retentionYears} 年`
              : '未设置保管年限'
          }}
        </a-descriptions-item>
        <a-descriptions-item label="保管期编码">
          {{ detailRecord.retentionPolicyCode || '未设置保管期编码' }}
        </a-descriptions-item>
        <a-descriptions-item label="档案室确认">
          <UiTag :tone="detailRecord.archiveOfficeConfirmed ? 'green' : 'gray'" size="sm">
            {{ detailRecord.archiveOfficeConfirmed ? '已确认' : '未确认' }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="归档时间">
          {{ detailRecord.archivedTime || '尚未归档确认' }}
        </a-descriptions-item>
        <a-descriptions-item label="备注">
          {{ detailRecord.notes || '未填写备注' }}
        </a-descriptions-item>
      </a-descriptions>
    </UiDrawer>

    <AuditTimelineDrawer
      v-model:open="auditDrawerOpen"
      :events="auditEvents"
      :loading="auditLoading"
      title="归档操作审计"
      show-diff
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.archive {
  &__signals {
    margin-bottom: 12px;
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    padding: 16px;
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__filter {
    width: 180px;

    &--xs {
      width: 130px;
    }
  }

  &__alert {
    margin-bottom: 16px;
  }

  &__number-full {
    width: 100%;
  }

  &__stacked-control {
    margin-top: 8px;

    &--first {
      margin-top: 0;
    }
  }

  &__file-name {
    margin-top: 8px;
    color: var(--dp-text-secondary);
    font-size: 13px;
    line-height: 20px;
  }

  &__export-readiness {
    margin-bottom: 16px;
  }

  &__export-readiness-text {
    margin: 0;
    font-size: 14px;
    line-height: 22px;
    color: var(--dp-text-secondary);
  }

  &__export-blockers {
    margin: 8px 0 0;
    padding-left: 18px;
    color: var(--dp-text-secondary);
    font-size: 13px;
    line-height: 20px;
  }

  &__form-hint {
    font-size: 13px;
    line-height: 20px;
    color: var(--dp-text-muted);
  }
}
</style>
