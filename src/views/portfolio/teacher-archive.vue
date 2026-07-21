<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioArchiveBagAssembleVO,
  PortfolioArchiveBagPreviewVO,
  PortfolioArchiveScoreResultVO,
} from '@/apis/portfolio/bag-types'
import type { PortfolioArchiveRecordSourceTypeCode } from '@/apis/portfolio/enums'
import type {
  PortfolioArchiveRecordDetailVO,
  PortfolioArchiveRecordSummaryVO,
  PortfolioArchiveSupportMaterialVO,
  PortfolioArchiveTimelineItemVO,
  PortfolioCompletenessLevelCode,
  PortfolioMaterialVO,
  PortfolioTeacherOneTableCategoryVO,
} from '@/apis/portfolio/types'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { PortfolioArchiveBagSourceTypeDescription } from '@/apis/portfolio/bag-types'
import {
  PortfolioArchiveRecordSourceTypeDescription,
  PortfolioArchiveRecordStatusCode,
  PortfolioArchiveRecordStatusDescription,
  PortfolioArchiveSupportMaterialSourceTypeDescription,
  PortfolioCompletenessLevelDescription,
} from '@/apis/portfolio/enums'
import { portfolioMaterialApi } from '@/apis/portfolio/material'
import { portfolioArchiveBagApi } from '@/apis/portfolio/teacher-platform'
import {
  PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE,
  PORTFOLIO_COMPLETENESS_LEVEL_TONE,
} from '@/apis/portfolio/types'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiDropdownAction from '@/components/ui-guide/ui/UiDropdownAction.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

function archiveRecordStatusLabel(status: PortfolioArchiveRecordStatusCode): string {
  return strictEnumLabel(PortfolioArchiveRecordStatusDescription, status, '档案记录状态')
}

function archiveRecordStatusTone(status: PortfolioArchiveRecordStatusCode): BadgeTone {
  return strictEnumTone(PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE, status, '档案记录状态')
}

function archiveRecordSourceTypeLabel(sourceType: PortfolioArchiveRecordSourceTypeCode): string {
  return strictEnumLabel(
    PortfolioArchiveRecordSourceTypeDescription,
    sourceType,
    '档案记录来源类型',
  )
}

function supportMaterialSourceTypeLabel(
  sourceType: PortfolioArchiveSupportMaterialVO['sourceType'],
): string {
  return strictEnumLabel(
    PortfolioArchiveSupportMaterialSourceTypeDescription,
    sourceType,
    '档案支撑材料来源类型',
  )
}

function bagSourceTypeLabel(
  sourceType: PortfolioArchiveBagPreviewVO['catalogItems'][number]['sourceType'],
): string {
  return strictEnumLabel(PortfolioArchiveBagSourceTypeDescription, sourceType, '档案袋来源类型')
}

function completenessLevelLabel(level?: PortfolioCompletenessLevelCode): string {
  if (!level) {
    return ''
  }
  return strictEnumLabel(PortfolioCompletenessLevelDescription, level, '档案完整度分级')
}

function completenessLevelTone(level?: PortfolioCompletenessLevelCode): BadgeTone {
  if (!level) {
    return 'gray'
  }
  return strictEnumTone(PORTFOLIO_COMPLETENESS_LEVEL_TONE, level, '档案完整度分级')
}

function bagCompletenessHeadline(
  preview: PortfolioArchiveBagPreviewVO | PortfolioArchiveBagAssembleVO,
): string {
  const level
    = 'completenessLevel' in preview && preview.completenessLevel
      ? completenessLevelLabel(preview.completenessLevel)
      : ''
  const percent = preview.completenessPercent ?? '—'
  return level ? `${percent}% · ${level}` : `${percent}%`
}

function bagCourseArchiveLabel(preview: PortfolioArchiveBagPreviewVO): string {
  if ((preview.courseArchiveFrameworkSlotTotal ?? 0) <= 0) {
    return ''
  }
  const slot = `${preview.courseArchiveFrameworkSlotDone ?? 0}/${preview.courseArchiveFrameworkSlotTotal ?? 0}`
  const complete = preview.courseArchiveFullyCompleteCount ?? 0
  return `${preview.currentAcademicYear ?? '本学年'} 五框架 ${slot} · 齐备 ${complete} 门`
}

function bagAssembleCompletenessHeadline(summary: PortfolioArchiveBagAssembleVO): string {
  if (summary.preview) {
    return bagCompletenessHeadline(summary.preview)
  }
  return `${summary.completenessPercent ?? '—'}%`
}

const bagFilterFields: FilterField[] = [
  { key: 'academicYear', label: '学年', placeholder: '如 2025-2026', width: 140 },
  {
    key: 'semester',
    label: '学期',
    type: 'select',
    placeholder: '选择学期',
    allowClear: true,
    width: 140,
    options: SemesterOptions.map((item) => ({ label: item.label, value: item.value })),
  },
  { key: 'courseCode', label: '课程编码', placeholder: '课程编码', width: 140 },
  { key: 'achievementType', label: '成果类型', placeholder: '成果类型', width: 140 },
  { key: 'materialType', label: '材料类型', placeholder: '材料类型', width: 140 },
]

const recordColumns: ColumnsType = [
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 140, fixed: 'left' },
  { title: '版本', key: 'documentVersionNo', width: 72 },
  { title: '状态', key: 'recordStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '来源', key: 'sourceType', width: 100 },
  { title: '参与评价', key: 'evaluationIncluded', width: 96 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 80 },
]

const fieldColumns: ColumnsType = [
  { title: '字段', key: 'fieldLabel', width: 160, fixed: 'left' },
  { title: '值', dataIndex: 'fieldValue', key: 'fieldValue' },
  { title: '证据', dataIndex: 'evidenceRef', key: 'evidenceRef', width: 120 },
  { title: '操作', key: 'actions', width: 88 },
]

const materialLibraryColumns: ColumnsType<PortfolioMaterialVO> = [
  { title: '材料标题', dataIndex: 'materialTitle', key: 'materialTitle' },
  { title: '分类编码', dataIndex: 'categoryCode', key: 'categoryCode', width: 130 },
  { title: '操作', key: 'actions', width: 88 },
]

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard()
const { currentUserId } = usePortfolioTeacherAccess()

const oneTableLoading = ref(false)
const recordLoading = ref(false)
const timelineLoading = ref(false)
const detailLoading = ref(false)
const categories = ref<PortfolioTeacherOneTableCategoryVO[]>([])
const selectedCategoryId = ref<string>()
const records = ref<PortfolioArchiveRecordSummaryVO[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)
const timeline = ref<PortfolioArchiveTimelineItemVO[]>([])
const drawerOpen = ref(false)
const recordDetail = ref<PortfolioArchiveRecordDetailVO | null>(null)
const bagLoading = ref(false)
const bagSummary = ref<PortfolioArchiveBagAssembleVO | null>(null)
const bagPreview = ref<PortfolioArchiveBagPreviewVO | null>(null)
const scoreResult = ref<PortfolioArchiveScoreResultVO | null>(null)
const scoreLoading = ref(false)
const exportConfirmOpen = ref(false)
const requestToken = ref(0)
const oneTableRequestToken = ref(0)
const recordRequestToken = ref(0)
const timelineRequestToken = ref(0)
const detailRequestToken = ref(0)
const supportMaterialRequestToken = ref(0)
const supportMaterialWriting = ref(false)
const localMaterialModalOpen = ref(false)
const localMaterialTitle = ref('')
const localMaterialFileNodeId = ref<string>()
const localMaterialFileName = ref<string>()
const localMaterialFileSize = ref<number>()
const materialLibraryModalOpen = ref(false)
const materialLibraryLoading = ref(false)
const materialLibraryRows = ref<PortfolioMaterialVO[]>([])
const materialLibraryPageNum = ref(1)
const materialLibraryPageSize = ref(10)
const materialLibraryTotal = ref(0)
const materialLibraryRequestToken = ref(0)
const bagFilter = ref<{
  academicYear: string
  semester: SemesterCode | undefined
  courseCode: string
  achievementType: string
  materialType: string
}>({
  academicYear: '',
  semester: undefined,
  courseCode: '',
  achievementType: '',
  materialType: '',
})

const bagRequest = computed(() => ({
  ...teacherRequest.value,
  academicYear: bagFilter.value.academicYear || undefined,
  semester: bagFilter.value.semester || undefined,
  courseCode: bagFilter.value.courseCode || undefined,
  achievementType: bagFilter.value.achievementType || undefined,
  materialType: bagFilter.value.materialType || undefined,
}))

const teacherRequest = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
)

const selectedCategory = computed(() =>
  categories.value.find((item) => item.categoryId === selectedCategoryId.value),
)

const canLoadTeacherArchive = computed(
  () => Boolean(targetTeacherId.value) || !canPickTeachers.value,
)

/** 教师范围变化后必须清空旧档案袋派生结果，避免继续展示上一位教师的评分/预览。 */
function resetArchiveDerivedContext() {
  bagSummary.value = null
  bagPreview.value = null
  scoreResult.value = null
  exportConfirmOpen.value = false
}

/** 教师 Scope 变化时立即清空全部旧教师状态，并使所有在途读取失效。 */
function resetTeacherArchiveContext() {
  requestToken.value += 1
  oneTableRequestToken.value += 1
  recordRequestToken.value += 1
  timelineRequestToken.value += 1
  detailRequestToken.value += 1
  supportMaterialRequestToken.value += 1
  materialLibraryRequestToken.value += 1
  oneTableLoading.value = false
  recordLoading.value = false
  timelineLoading.value = false
  detailLoading.value = false
  supportMaterialWriting.value = false
  materialLibraryLoading.value = false
  revisionLoading.value = false
  scoreLoading.value = false
  bagLoading.value = false
  categories.value = []
  selectedCategoryId.value = undefined
  records.value = []
  pageTotal.value = 0
  timeline.value = []
  drawerOpen.value = false
  recordDetail.value = null
  localMaterialModalOpen.value = false
  localMaterialTitle.value = ''
  localMaterialFileNodeId.value = undefined
  localMaterialFileName.value = undefined
  localMaterialFileSize.value = undefined
  materialLibraryModalOpen.value = false
  materialLibraryRows.value = []
  materialLibraryTotal.value = 0
  resetArchiveDerivedContext()
}

async function loadOneTable() {
  const currentScopeToken = requestToken.value
  const currentToken = ++oneTableRequestToken.value
  if (!canLoadTeacherArchive.value) {
    categories.value = []
    selectedCategoryId.value = undefined
    resetArchiveDerivedContext()
    return
  }
  oneTableLoading.value = true
  try {
    const vo = await portfolioArchiveApi.getOneTable(teacherRequest.value)
    if (requestToken.value !== currentScopeToken || oneTableRequestToken.value !== currentToken) {
      return
    }
    categories.value = vo.categories
    if (
      selectedCategoryId.value
      && !categories.value.some((item) => item.categoryId === selectedCategoryId.value)
    ) {
      selectedCategoryId.value = undefined
    }
  } catch (error) {
    if (requestToken.value !== currentScopeToken || oneTableRequestToken.value !== currentToken) {
      return
    }
    categories.value = []
    selectedCategoryId.value = undefined
    showUserError(error, '加载教师一张表失败')
  } finally {
    if (requestToken.value === currentScopeToken && oneTableRequestToken.value === currentToken) {
      oneTableLoading.value = false
    }
  }
}

async function loadRecords() {
  const currentScopeToken = requestToken.value
  const currentToken = ++recordRequestToken.value
  if (!canLoadTeacherArchive.value) {
    records.value = []
    pageTotal.value = 0
    drawerOpen.value = false
    recordDetail.value = null
    return
  }
  recordLoading.value = true
  try {
    const page = await portfolioArchiveApi.pageRecords({
      ...teacherRequest.value,
      categoryId: selectedCategoryId.value,
      academicYear: bagFilter.value.academicYear || undefined,
      semester: bagFilter.value.semester || undefined,
      courseCode: bagFilter.value.courseCode || undefined,
      achievementType: bagFilter.value.achievementType || undefined,
      materialType: bagFilter.value.materialType || undefined,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    if (requestToken.value !== currentScopeToken || recordRequestToken.value !== currentToken) {
      return
    }
    records.value = page.list
    pageTotal.value = page.total
  } catch (error) {
    if (requestToken.value !== currentScopeToken || recordRequestToken.value !== currentToken) {
      return
    }
    records.value = []
    pageTotal.value = 0
    showUserError(error, '加载档案记录失败')
  } finally {
    if (requestToken.value === currentScopeToken && recordRequestToken.value === currentToken) {
      recordLoading.value = false
    }
  }
}

async function loadTimeline() {
  const currentScopeToken = requestToken.value
  const currentToken = ++timelineRequestToken.value
  if (!canLoadTeacherArchive.value) {
    timeline.value = []
    return
  }
  timelineLoading.value = true
  try {
    const nextTimeline = await portfolioArchiveApi.listTimeline({
      ...teacherRequest.value,
      limit: 30,
    })
    if (requestToken.value !== currentScopeToken || timelineRequestToken.value !== currentToken) {
      return
    }
    timeline.value = nextTimeline
  } catch (error) {
    if (requestToken.value !== currentScopeToken || timelineRequestToken.value !== currentToken) {
      return
    }
    timeline.value = []
    showUserError(error, '加载成长时间轴失败')
  } finally {
    if (requestToken.value === currentScopeToken && timelineRequestToken.value === currentToken) {
      timelineLoading.value = false
    }
  }
}

async function openRecordById(recordId: string) {
  if (!canLoadTeacherArchive.value) {
    drawerOpen.value = false
    recordDetail.value = null
    return
  }
  const currentScopeToken = requestToken.value
  const currentToken = ++detailRequestToken.value
  drawerOpen.value = true
  recordDetail.value = null
  detailLoading.value = true
  try {
    const nextRecordDetail = await portfolioArchiveApi.getRecord(recordId)
    if (requestToken.value !== currentScopeToken || detailRequestToken.value !== currentToken) {
      return
    }
    recordDetail.value = nextRecordDetail
    if (
      recordDetail.value?.categoryId
      && selectedCategoryId.value !== recordDetail.value.categoryId
    ) {
      selectedCategoryId.value = recordDetail.value.categoryId
      pageNum.value = 1
      await loadRecords()
    }
  } catch (error) {
    if (requestToken.value !== currentScopeToken || detailRequestToken.value !== currentToken) {
      return
    }
    recordDetail.value = null
    showUserError(error, '加载档案详情失败')
  } finally {
    if (requestToken.value === currentScopeToken && detailRequestToken.value === currentToken) {
      detailLoading.value = false
    }
  }
}

const revisionLoading = ref(false)

const canCreateRevision = computed(() => {
  if (!recordDetail.value) {
    return false
  }
  const viewedTeacherId = targetTeacherId.value || currentUserId.value
  if (!viewedTeacherId || viewedTeacherId !== currentUserId.value) {
    return false
  }
  return (
    recordDetail.value.recordStatus === PortfolioArchiveRecordStatusCode.OFFICIAL
    || recordDetail.value.recordStatus === PortfolioArchiveRecordStatusCode.SUPERSEDED
  )
})

const canManageSupportMaterials = computed(() => {
  if (!recordDetail.value || recordDetail.value.teacherId !== currentUserId.value) {
    return false
  }
  return (
    recordDetail.value.recordStatus === PortfolioArchiveRecordStatusCode.DRAFT
    || recordDetail.value.recordStatus === PortfolioArchiveRecordStatusCode.RETURNED
  )
})

/** 写操作后按当前档案记录刷新支撑材料，并拒绝旧教师 Scope 或旧版本响应回写。 */
async function refreshSupportMaterials(archiveRecordId: string) {
  const currentScopeToken = requestToken.value
  const currentToken = ++supportMaterialRequestToken.value
  const rows = await portfolioArchiveApi.listSupportMaterials(archiveRecordId)
  if (
    requestToken.value !== currentScopeToken
    || supportMaterialRequestToken.value !== currentToken
    || recordDetail.value?.id !== archiveRecordId
  ) {
    return
  }
  recordDetail.value.supportMaterials = rows
}

function openLocalMaterialModal() {
  localMaterialTitle.value = ''
  localMaterialFileNodeId.value = undefined
  localMaterialFileName.value = undefined
  localMaterialFileSize.value = undefined
  localMaterialModalOpen.value = true
}

/** 将平台暂存文件正式挂接到当前草稿档案。 */
async function addLocalSupportMaterial() {
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('添加支撑材料'))) {
    return
  }

  const archiveRecordId = recordDetail.value?.id
  const materialTitle = localMaterialTitle.value.trim()
  if (!archiveRecordId || !canManageSupportMaterials.value) {
    showFormValidationMessage('当前档案不可维护支撑材料')
    return
  }
  if (supportMaterialWriting.value) {
    return
  }
  if (!materialTitle) {
    showFormValidationMessage('请填写材料标题')
    return
  }
  if (!localMaterialFileNodeId.value) {
    showFormValidationMessage('请先上传材料文件')
    return
  }
  supportMaterialWriting.value = true
  try {
    await portfolioArchiveApi.addLocalSupportMaterial({
      archiveRecordId,
      materialTitle,
      fileNodeId: localMaterialFileNodeId.value,
    })
    await refreshSupportMaterials(archiveRecordId)
    localMaterialModalOpen.value = false
    void message.success('支撑材料已添加')
  } catch (error) {
    showUserError(error, '添加支撑材料失败')
  } finally {
    supportMaterialWriting.value = false
  }
}

/** 加载当前档案所属教师的材料库，用于选择可关联文件。 */
async function loadMaterialLibrary() {
  const detail = recordDetail.value
  if (!detail || !canManageSupportMaterials.value) {
    return
  }
  const currentScopeToken = requestToken.value
  const archiveRecordId = detail.id
  const currentToken = ++materialLibraryRequestToken.value
  materialLibraryLoading.value = true
  try {
    const page = await portfolioMaterialApi.page({
      teacherId: detail.teacherId,
      pageNum: materialLibraryPageNum.value,
      pageSize: materialLibraryPageSize.value,
    })
    if (
      requestToken.value !== currentScopeToken
      || materialLibraryRequestToken.value !== currentToken
      || recordDetail.value?.id !== archiveRecordId
    ) {
      return
    }
    materialLibraryRows.value = page.list
    materialLibraryTotal.value = page.total
  } catch (error) {
    if (
      requestToken.value === currentScopeToken
      && materialLibraryRequestToken.value === currentToken
    ) {
      materialLibraryRows.value = []
      materialLibraryTotal.value = 0
      showUserError(error, '加载材料库失败')
    }
  } finally {
    if (
      requestToken.value === currentScopeToken
      && materialLibraryRequestToken.value === currentToken
    ) {
      materialLibraryLoading.value = false
    }
  }
}

function openMaterialLibraryModal() {
  materialLibraryPageNum.value = 1
  materialLibraryModalOpen.value = true
  void loadMaterialLibrary()
}

function handleMaterialLibraryPageChange(page: { current: number, pageSize: number }) {
  materialLibraryPageNum.value = page.current
  materialLibraryPageSize.value = page.pageSize
  void loadMaterialLibrary()
}

/** 将教师材料库条目关联为当前草稿档案的支撑材料。 */
async function linkSupportMaterial(material: PortfolioMaterialVO) {
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('关联支撑材料'))) {
    return
  }

  const archiveRecordId = recordDetail.value?.id
  if (!archiveRecordId || !canManageSupportMaterials.value) {
    showFormValidationMessage('当前档案不可维护支撑材料')
    return
  }
  if (supportMaterialWriting.value) {
    return
  }
  supportMaterialWriting.value = true
  try {
    await portfolioArchiveApi.linkSyncSupportMaterial({
      archiveRecordId,
      linkedMaterialId: material.id,
    })
    await refreshSupportMaterials(archiveRecordId)
    materialLibraryModalOpen.value = false
    void message.success('材料库条目已关联')
  } catch (error) {
    showUserError(error, '关联材料失败')
  } finally {
    supportMaterialWriting.value = false
  }
}

/** 下载支撑材料对应的平台文件节点。 */
async function downloadSupportMaterial(material: PortfolioArchiveSupportMaterialVO) {
  if (!material.fileNodeId) {
    showFormValidationMessage('该支撑材料没有可下载文件')
    return
  }
  await handleDownloadFile({
    fileId: material.fileNodeId,
    fileName: material.fileName || material.materialTitle,
  })
}

/** 删除当前草稿档案与支撑材料的关联。 */
async function deleteSupportMaterial(material: PortfolioArchiveSupportMaterialVO) {
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('删除支撑材料'))) {
    return
  }

  const archiveRecordId = recordDetail.value?.id
  if (!archiveRecordId || !canManageSupportMaterials.value) {
    showFormValidationMessage('当前档案不可维护支撑材料')
    return
  }
  if (supportMaterialWriting.value) {
    return
  }
  const confirmed = await confirmAsync({
    title: '删除支撑材料',
    content: `确认删除「${material.materialTitle}」？`,
    type: 'error',
  })
  if (!confirmed) {
    return
  }
  supportMaterialWriting.value = true
  try {
    await portfolioArchiveApi.deleteSupportMaterial(material.id, archiveRecordId)
    await refreshSupportMaterials(archiveRecordId)
    void message.success('支撑材料已删除')
  } catch (error) {
    showUserError(error, '删除支撑材料失败')
  } finally {
    supportMaterialWriting.value = false
  }
}

async function createRevision() {
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('创建档案修订版'))) {
    return
  }

  if (!recordDetail.value) {
    return
  }
  const currentScopeToken = requestToken.value
  revisionLoading.value = true
  try {
    const result = await portfolioArchiveApi.createRevision(
      recordDetail.value.id,
      targetTeacherId.value || undefined,
    )
    if (requestToken.value !== currentScopeToken) {
      return
    }
    void message.success('修订草稿已创建')
    await loadRecords()
    if (result.recordId) {
      void openRecordById(result.recordId)
    }
  } catch (error) {
    if (requestToken.value !== currentScopeToken) {
      return
    }
    showUserError(error, '创建修订草稿失败')
  } finally {
    if (requestToken.value === currentScopeToken) {
      revisionLoading.value = false
    }
  }
}

function openVersionRecord(recordId: string) {
  if (recordDetail.value?.id === recordId) {
    return
  }
  void openRecordById(recordId)
}

function openRecord(row: PortfolioArchiveRecordSummaryVO) {
  void openRecordById(row.id)
}

function openTimelineItem(item: PortfolioArchiveTimelineItemVO) {
  void openRecordById(item.archiveRecordId)
}

function selectCategory(categoryId: string) {
  if (selectedCategoryId.value === categoryId) {
    return
  }
  selectedCategoryId.value = categoryId
  pageNum.value = 1
  void loadRecords()
}

function handlePageChange(page: { current: number, pageSize: number }) {
  pageNum.value = page.current
  pageSize.value = page.pageSize
  void loadRecords()
}

function goCategoryEdit(categoryId: string) {
  void router.push({
    path: `/portfolio/teacher/archive/${categoryId}`,
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goCorrection() {
  void router.push({
    path: '/portfolio/teacher/correction',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goFieldCorrection(fieldCode: string, fieldLabel?: string, fieldValue?: string) {
  if (!recordDetail.value) {
    return
  }
  const query: Record<string, string> = {
    categoryId: recordDetail.value.categoryId,
    archiveRecordId: recordDetail.value.id,
    fieldCode,
  }
  if (targetTeacherId.value) {
    query.teacherId = targetTeacherId.value
  }
  if (fieldLabel) {
    query.fieldLabel = fieldLabel
  }
  if (fieldValue) {
    query.wrongValue = fieldValue
  }
  void router.push({ path: '/portfolio/teacher/correction', query })
}

async function refreshBagScore(silent = false) {
  const currentToken = requestToken.value
  if (!canLoadTeacherArchive.value) {
    return
  }
  scoreLoading.value = true
  try {
    const nextScoreResult = await portfolioArchiveBagApi.computeScore(bagRequest.value)
    if (requestToken.value !== currentToken) {
      return
    }
    scoreResult.value = nextScoreResult
    if (!silent) {
      void message.success(`档案袋评分 ${scoreResult.value.totalScore}`)
    }
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    scoreResult.value = null
    showUserError(error, '计算档案袋评分失败')
  } finally {
    if (requestToken.value === currentToken) {
      scoreLoading.value = false
    }
  }
}

async function computeArchiveScore() {
  await refreshBagScore(false)
}

async function assembleBag() {
  const currentToken = requestToken.value
  if (!canLoadTeacherArchive.value) {
    return
  }
  bagLoading.value = true
  try {
    const result = await portfolioArchiveBagApi.assemble(bagRequest.value)
    if (requestToken.value !== currentToken) {
      return
    }
    bagSummary.value = result
    bagPreview.value = result.preview ?? null
    void message.success(`档案袋完整度 ${result.completenessPercent}%`)
    await refreshBagScore(true)
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    bagSummary.value = null
    showUserError(error, '汇聚档案袋失败')
  } finally {
    if (requestToken.value === currentToken) {
      bagLoading.value = false
    }
  }
}

async function previewBag(): Promise<boolean> {
  const currentToken = requestToken.value
  if (!canLoadTeacherArchive.value) {
    return false
  }
  bagLoading.value = true
  try {
    const nextBagPreview = await portfolioArchiveBagApi.preview(bagRequest.value)
    if (requestToken.value !== currentToken) {
      return false
    }
    bagPreview.value = nextBagPreview
    await refreshBagScore(true)
    return true
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return false
    }
    bagPreview.value = null
    showUserError(error, '加载档案袋预览失败')
    return false
  } finally {
    if (requestToken.value === currentToken) {
      bagLoading.value = false
    }
  }
}

function openExportConfirm() {
  if (!bagPreview.value) {
    void previewBag().then((previewed) => {
      if (previewed) {
        exportConfirmOpen.value = true
      }
    })
    return
  }
  exportConfirmOpen.value = true
}

async function confirmExportBag() {
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('导出一表通'))) {
    return
  }

  const currentToken = requestToken.value
  if (!canLoadTeacherArchive.value) {
    return
  }
  bagLoading.value = true
  try {
    const result = await portfolioArchiveBagApi.buildMaterialPackage(bagRequest.value)
    if (requestToken.value !== currentToken) {
      return
    }
    if (!result.fileNodeId) {
      showUserError(new Error('导出未返回压缩包文件编号'), '导出档案袋失败')
      return
    }
    await handleDownloadFile({
      fileId: result.fileNodeId,
      fileName: result.fileName,
    })
    if (requestToken.value !== currentToken) {
      return
    }
    exportConfirmOpen.value = false
    await previewBag()
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    showUserError(error, '导出档案袋失败')
  } finally {
    if (requestToken.value === currentToken) {
      bagLoading.value = false
    }
  }
}

async function applyBagFilter() {
  requestToken.value += 1
  resetArchiveDerivedContext()
  await Promise.all([loadRecords(), previewBag()])
}

async function exportBag() {
  openExportConfirm()
}

async function reloadAll() {
  await Promise.all([loadOneTable(), loadTimeline()])
  if (canLoadTeacherArchive.value) {
    await loadRecords()
  }
}

async function openRecordFromRouteQuery() {
  const recordId = typeof route.query.recordId === 'string' ? route.query.recordId : ''
  if (!recordId) {
    drawerOpen.value = false
    recordDetail.value = null
    return
  }
  await openRecordById(recordId)
}

const archiveMoreActionItems = computed(() => [
  {
    key: 'preview',
    label: '结构化预览',
    disabled: !canLoadTeacherArchive.value || bagLoading.value,
  },
  {
    key: 'assemble',
    label: '汇聚预览',
    disabled: !canLoadTeacherArchive.value || bagLoading.value,
  },
  { key: 'correction', label: '我的纠错', disabled: !canLoadTeacherArchive.value },
  {
    key: 'reload',
    label: '刷新',
    disabled:
      !canLoadTeacherArchive.value
      || oneTableLoading.value
      || recordLoading.value
      || timelineLoading.value,
  },
])

function onArchiveMoreAction(key: string) {
  if (key === 'preview') {
    void previewBag()
    return
  }
  if (key === 'assemble') {
    void assembleBag()
    return
  }
  if (key === 'correction') {
    goCorrection()
    return
  }
  if (key === 'reload') {
    void reloadAll()
  }
}

usePortfolioScopedLoader(
  async () => {
    resetTeacherArchiveContext()
    pageNum.value = 1
    await reloadAll()
    await openRecordFromRouteQuery()
  },
  () => targetTeacherId.value,
)

watch(
  () => route.query.recordId,
  () => {
    void openRecordFromRouteQuery()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="我的档案">
        <template #actions>
          <UiButton
            size="sm"
            :loading="bagLoading"
            :disabled="!canLoadTeacherArchive"
            variant="primary"
            @click="exportBag"
          >
            导出材料包
          </UiButton>
          <UiButton
            size="sm"
            v-if="selectedCategoryId"
            variant="outline"
            @click="goCategoryEdit(selectedCategoryId)"
          >
            分类填报
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :loading="scoreLoading"
            :disabled="!canLoadTeacherArchive"
            @click="computeArchiveScore"
          >
            档案评分
          </UiButton>
          <UiDropdownAction
            trigger-style="button"
            button-text="更多"
            :disabled="!canLoadTeacherArchive"
            :items="archiveMoreActionItems"
            @select="onArchiveMoreAction"
          />
        </template>
        <UiAlertStrip
          v-if="archiveWriteForbidden"
          tone="warning"
          title="档案已封存写禁"
          :description="archiveWriteBlockMessage"
          class="mb-3"
        />
      </ContextBar>
    </template>

    <UiCard title="档案袋筛选" class="teacher-archive__bag-filter">
      <UiFilterBar
        variant="plain"
        v-model="bagFilter"
        :fields="bagFilterFields"
        show-labels
        @search="applyBagFilter"
        @reset="applyBagFilter"
      />
    </UiCard>

    <UiCard v-if="scoreResult" title="档案袋评分" class="teacher-archive__bag">
      <p>
        总分 {{ scoreResult.totalScore
        }}<template v-if="scoreResult.computedTime">
          · 计算于 {{ scoreResult.computedTime }}
        </template>
      </p>
      <ul v-if="scoreResult.breakdown.length" class="teacher-archive__score-list">
        <li
          v-for="(item, idx) in scoreResult.breakdown"
          :key="`${item.lineType || 'line'}-${item.ruleId || 'x'}-${idx}`"
          :class="{
            'teacher-archive__score-item--detail': item.lineType === 'ACHIEVEMENT_ITEM',
            'teacher-archive__score-item--blank': item.lineType === 'BLANK_PERIOD',
          }"
        >
          <div class="teacher-archive__score-item-head">
            <strong>{{ item.ruleName }}</strong>
            <span>{{ item.earnedScore }} 分</span>
          </div>
          <div
            v-if="item.lineType === 'ACHIEVEMENT_ITEM' || item.decayFactor != null"
            class="teacher-archive__score-decay"
          >
            <template v-if="item.rawScore != null">原始 {{ item.rawScore }} · </template>
            <template v-if="item.decayFactor != null">
              衰减系数 {{ item.decayFactor }}
              <template v-if="item.decayProfileLabel">（{{ item.decayProfileLabel }}）</template>
              ·
            </template>
            <template v-if="item.recognitionYear != null">
              认定年 {{ item.recognitionYear }} ·
            </template>
            <template v-if="item.decayApplied">已衰减</template>
            <template v-else-if="item.lineType === 'ACHIEVEMENT_ITEM'">未衰减</template>
          </div>
          <p class="teacher-archive__score-explain">{{ item.explainText }}</p>
        </li>
      </ul>
    </UiCard>

    <UiCard v-if="bagSummary" title="档案袋汇聚" class="teacher-archive__bag">
      <div class="teacher-archive__completeness-head">
        <span>{{ bagAssembleCompletenessHeadline(bagSummary) }}</span>
        <UiTag
          v-if="bagSummary.preview?.completenessLevel"
          :tone="completenessLevelTone(bagSummary.preview.completenessLevel)"
          size="sm"
        >
          {{ completenessLevelLabel(bagSummary.preview.completenessLevel) }}
        </UiTag>
      </div>
      <p>
        已归档 {{ bagSummary.archivedCategoryCount }} 类 · 开放补采
        {{ bagSummary.openGapTaskCount }} 项
        <template v-if="bagSummary.preview && bagCourseArchiveLabel(bagSummary.preview)">
          · {{ bagCourseArchiveLabel(bagSummary.preview) }}
        </template>
      </p>
      <p v-if="bagSummary.missingCategoryNames.length">
        缺失：{{ bagSummary.missingCategoryNames.join('、') }}
      </p>
    </UiCard>

    <UiCard v-if="bagPreview" title="结构化预览" class="teacher-archive__bag-preview">
      <div class="teacher-archive__completeness-head">
        <span>{{ bagCompletenessHeadline(bagPreview) }}</span>
        <UiTag
          v-if="bagPreview.completenessLevel"
          :tone="completenessLevelTone(bagPreview.completenessLevel)"
          size="sm"
        >
          {{ completenessLevelLabel(bagPreview.completenessLevel) }}
        </UiTag>
      </div>
      <p v-if="bagPreview.requiredCategoryTotal != null">
        必填项 {{ bagPreview.requiredCategoryDone ?? 0 }}/{{ bagPreview.requiredCategoryTotal }}
        <template v-if="bagCourseArchiveLabel(bagPreview)">
          · {{ bagCourseArchiveLabel(bagPreview) }}
        </template>
      </p>
      <p>
        附件 {{ bagPreview.totalAttachmentCount }} 个 · 目录 {{ bagPreview.catalogItems.length }} 条
      </p>
      <div v-if="bagPreview.sections.length" class="teacher-archive__section-tree">
        <section
          v-for="section in bagPreview.sections"
          :key="section.sectionType"
          class="teacher-archive__section"
        >
          <h4 class="teacher-archive__section-title">{{ section.sectionTitle }}</h4>
          <div
            v-for="group in section.groups"
            :key="`${section.sectionType}-${group.groupTitle}`"
            class="teacher-archive__group"
          >
            <p class="teacher-archive__group-title">{{ group.groupTitle }}</p>
            <ul v-if="group.items.length" class="teacher-archive__preview-list">
              <li
                v-for="item in group.items"
                :key="`${item.sourceType}-${item.recordId}-${item.title}`"
              >
                {{ item.title }}（{{ bagSourceTypeLabel(item.sourceType) }}）·
                {{ item.attachmentCount }} 附件
              </li>
            </ul>
            <UiEmpty size="sm" v-else description="该分组暂无条目" />
          </div>
        </section>
      </div>
      <UiEmpty size="sm" v-else description="当前筛选下无可预览条目" />
    </UiCard>

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />

    <div v-else class="teacher-archive__layout">
      <UiSpin :spinning="oneTableLoading">
        <UiCard title="分类导航" class="teacher-archive__nav">
          <ul v-if="categories.length" class="teacher-archive__category-list">
            <li
              v-for="item in categories"
              :key="item.categoryId"
              class="teacher-archive__category-item"
              :class="{
                'teacher-archive__category-item--active': item.categoryId === selectedCategoryId,
              }"
              @click="selectCategory(item.categoryId)"
            >
              <span class="teacher-archive__category-name">{{ item.categoryName }}</span>
              <UiTag
                v-if="item.latestRecordStatus"
                :tone="archiveRecordStatusTone(item.latestRecordStatus)"
              >
                {{ archiveRecordStatusLabel(item.latestRecordStatus) }}
              </UiTag>
              <span class="teacher-archive__category-count">{{ item.recordCount }} 条</span>
            </li>
          </ul>
          <UiEmpty size="sm" v-else description="尚无档案分类配置" />
        </UiCard>
      </UiSpin>

      <UiCard
        :title="selectedCategory ? `${selectedCategory.categoryName} · 材料列表` : '材料列表'"
        class="teacher-archive__records"
      >
        <UiDataTable
          v-model:current="pageNum"
          v-model:page-size="pageSize"
          pagination-mode="server"
          row-key="id"
          size="small"
          :columns="recordColumns"
          :data-source="records"
          :loading="recordLoading"
          :total="pageTotal"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'recordStatus'">
              <UiTag :tone="archiveRecordStatusTone(record.recordStatus)">
                {{ archiveRecordStatusLabel(record.recordStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="record.ownerIdentityLayers"
                :note="record.ownerMultiIdentityNote"
                :row-key="
                  record.id
                    || record.teacherId
                    || record.teacherUserId
                    || record.subjectTeacherUserId
                    || record.userId
                "
              />
            </template>
            <template v-else-if="column.key === 'documentVersionNo'">
              v{{ record.documentVersionNo ?? 1 }}
            </template>
            <template v-else-if="column.key === 'sourceType'">
              {{ archiveRecordSourceTypeLabel(record.sourceType) }}
            </template>
            <template v-else-if="column.key === 'evaluationIncluded'">
              {{ record.evaluationIncluded ? '是' : '否' }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[{ key: 'detail', label: '详情' }]"
                split
                @action="() => openRecord(record)"
              />
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiSpin :spinning="timelineLoading">
        <UiCard title="成长时间轴" class="teacher-archive__timeline">
          <ul v-if="timeline.length" class="teacher-archive__timeline-list">
            <li
              v-for="item in timeline"
              :key="`${item.archiveRecordId}-${item.eventTime}`"
              class="teacher-archive__timeline-item"
              @click="openTimelineItem(item)"
            >
              <p class="teacher-archive__timeline-title">
                {{ item.categoryName }}
                <UiTag :tone="archiveRecordStatusTone(item.recordStatus)">
                  {{ archiveRecordStatusLabel(item.recordStatus) }}
                </UiTag>
              </p>
              <p class="teacher-archive__timeline-meta">
                {{ archiveRecordSourceTypeLabel(item.sourceType) }}
                · {{ item.eventTime }}
              </p>
            </li>
          </ul>
          <UiEmpty size="sm" v-else description="尚无档案时间轴事件" />
        </UiCard>
      </UiSpin>
    </div>

    <UiDrawer v-model:open="drawerOpen" title="档案详情" width="640">
      <UiSpin :spinning="detailLoading">
        <template v-if="recordDetail">
          <p class="teacher-archive__detail-meta">
            {{ recordDetail.categoryName }}
            · {{ archiveRecordStatusLabel(recordDetail.recordStatus) }} ·
            {{ archiveRecordSourceTypeLabel(recordDetail.sourceType) }}
            <template v-if="recordDetail.documentVersionNo">
              · v{{ recordDetail.documentVersionNo }}
            </template>
          </p>
          <div v-if="canCreateRevision" class="teacher-archive__detail-actions">
            <UiButton
              size="sm"
              variant="primary"
              :loading="revisionLoading"
              @click="createRevision"
            >
              创建修订版
            </UiButton>
          </div>
          <section
            v-if="recordDetail.versionHistory?.length"
            class="teacher-archive__version-history"
          >
            <h4 class="teacher-archive__version-title">版本历史</h4>
            <ul class="teacher-archive__version-list">
              <li
                v-for="item in recordDetail.versionHistory"
                :key="item.id"
                class="teacher-archive__version-item"
                @click="openVersionRecord(item.id)"
              >
                <span>v{{ item.documentVersionNo ?? 1 }}</span>
                <UiTag :tone="archiveRecordStatusTone(item.recordStatus)">
                  {{ archiveRecordStatusLabel(item.recordStatus) }}
                </UiTag>
                <span class="teacher-archive__version-time">{{ item.updateTime }}</span>
              </li>
            </ul>
          </section>
          <p class="teacher-archive__detail-meta">
            更新时间 {{ recordDetail.updateTime }} · 参与评价
            {{ recordDetail.evaluationIncluded ? '是' : '否' }}
            <template v-if="recordDetail.referenceAiTaskId">
              · 智能任务 {{ recordDetail.referenceAiTaskId }}
            </template>
          </p>
          <UiDataTable
            v-if="recordDetail.fields.length"
            row-key="fieldCode"
            size="sm"
            pagination-mode="none"
            :columns="fieldColumns"
            :data-source="recordDetail.fields"
            :show-pagination="false"
            :sticky-header="false"
            flat
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'fieldLabel'">
                <span>{{ record.fieldLabel ?? record.fieldCode }}</span>
                <UiTag
                  v-if="record.fieldCorrecting"
                  tone="orange"
                  class="teacher-archive__correcting-tag"
                >
                  更正中
                </UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  v-if="recordDetail.recordStatus === PortfolioArchiveRecordStatusCode.OFFICIAL"
                  :items="[{ key: 'correct', label: '发起纠错' }]"
                  split
                  @action="
                    () => goFieldCorrection(record.fieldCode, record.fieldLabel, record.fieldValue)
                  "
                />
              </template>
            </template>
          </UiDataTable>
          <UiEmpty size="sm" v-else description="暂无字段快照" />
          <section class="teacher-archive__support-materials">
            <div class="teacher-archive__support-materials-head">
              <h4 class="teacher-archive__version-title">支撑材料</h4>
              <div
                v-if="canManageSupportMaterials"
                class="teacher-archive__support-material-actions"
              >
                <UiButton
                  size="sm"
                  variant="outline"
                  :disabled="supportMaterialWriting"
                  @click="openMaterialLibraryModal"
                >
                  关联材料库
                </UiButton>
                <UiButton
                  variant="primary"
                  size="sm"
                  :disabled="supportMaterialWriting"
                  @click="openLocalMaterialModal"
                >
                  上传材料
                </UiButton>
              </div>
            </div>
            <ul v-if="recordDetail.supportMaterials.length" class="teacher-archive__support-list">
              <li
                v-for="material in recordDetail.supportMaterials"
                :key="material.id"
                class="teacher-archive__support-item"
              >
                <div class="teacher-archive__support-main">
                  <span class="teacher-archive__support-title">{{ material.materialTitle }}</span>
                  <span class="teacher-archive__support-meta">
                    {{ supportMaterialSourceTypeLabel(material.sourceType) }}
                    <template v-if="material.fileName"> · {{ material.fileName }}</template>
                    <template v-if="material.createTime"> · {{ material.createTime }}</template>
                  </span>
                </div>
                <div class="teacher-archive__support-row-actions">
                  <UiTextAction
                    size="sm"
                    :disabled="!material.fileNodeId"
                    @click="downloadSupportMaterial(material)"
                  >
                    下载
                  </UiTextAction>
                  <UiTextAction
                    v-if="canManageSupportMaterials"
                    tone="danger"
                    size="sm"
                    :disabled="supportMaterialWriting"
                    @click="deleteSupportMaterial(material)"
                  >
                    删除
                  </UiTextAction>
                </div>
              </li>
            </ul>
            <UiEmpty size="sm" v-else description="暂无支撑材料" />
          </section>
        </template>
      </UiSpin>
    </UiDrawer>

    <UiDialog
      v-model:open="localMaterialModalOpen"
      title="上传支撑材料"
      ok-text="确认添加"
      cancel-text="取消"
      :confirm-loading="supportMaterialWriting"
      :mask-closable="!supportMaterialWriting"
      @ok="addLocalSupportMaterial"
    >
      <div class="teacher-archive__material-form">
        <label class="teacher-archive__material-label" for="archive-support-material-title">
          材料标题
        </label>
        <UiInput
          size="sm"
          id="archive-support-material-title"
          v-model="localMaterialTitle"
          :disabled="supportMaterialWriting"
          :maxlength="200"
          placeholder="填写可识别的材料标题"
        />
        <span class="teacher-archive__material-label">材料文件</span>
        <UiPlatformFileField
          v-model:file-node-id="localMaterialFileNodeId"
          v-model:file-name="localMaterialFileName"
          v-model:file-size="localMaterialFileSize"
          :scene-key="FileUploadSceneKey.PORTFOLIO_MATERIAL"
          :disabled="supportMaterialWriting"
          button-text="选择文件"
        />
      </div>
    </UiDialog>

    <UiDialog
      v-model:open="materialLibraryModalOpen"
      title="关联材料库"
      :width="720"
      hide-footer
      :mask-closable="!supportMaterialWriting"
    >
      <UiDataTable
        v-model:current="materialLibraryPageNum"
        v-model:page-size="materialLibraryPageSize"
        pagination-mode="server"
        row-key="id"
        size="small"
        :columns="materialLibraryColumns"
        :data-source="materialLibraryRows"
        :loading="materialLibraryLoading"
        :total="materialLibraryTotal"
        :show-size-changer="false"
        flat
        @page-change="handleMaterialLibraryPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <UiTextAction
              size="table"
              tone="primary"
              :disabled="
                supportMaterialWriting
                  || !record.fileNodeId
                  || recordDetail?.supportMaterials.some((item) => item.linkedMaterialId === record.id)
              "
              @click="linkSupportMaterial(record)"
            >
              {{
                recordDetail?.supportMaterials.some((item) => item.linkedMaterialId === record.id)
                  ? '已关联'
                  : record.fileNodeId
                    ? '关联'
                    : '无文件'
              }}
            </UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </UiDialog>

    <UiDialog
      v-model:open="exportConfirmOpen"
      title="确认导出材料包"
      ok-text="确认导出"
      cancel-text="取消"
      :confirm-loading="bagLoading"
      @ok="confirmExportBag"
    >
      <p v-if="bagPreview">
        将导出 {{ bagPreview.totalAttachmentCount }} 个附件，目录
        {{ bagPreview.catalogItems.length }} 条。
      </p>
      <p v-else>将按当前筛选条件构建压缩包材料包。</p>
      <p v-if="bagPreview?.latestMaterialPackageExport" class="teacher-archive__latest-export">
        上次导出 {{ bagPreview.latestMaterialPackageExport.exportedTime }}， 附件
        {{ bagPreview.latestMaterialPackageExport.attachmentCount }} 个。 本次将生成新的
        压缩包，不会覆盖历史导出。
      </p>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.teacher-archive__layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 240px;
  gap: var(--dp-space-4);
  align-items: start;
}

.teacher-archive__category-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.teacher-archive__category-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2);
  padding: var(--dp-space-2);
  border-radius: var(--dp-radius-control);
  cursor: pointer;
}

.teacher-archive__category-item--active {
  background: var(--dp-fill-quaternary);
}

.teacher-archive__category-name {
  flex: 1 1 100%;
  font-size: 14px;
  font-weight: var(--dp-font-weight-medium);
}

.teacher-archive__category-count {
  font-size: 12px;
  color: var(--dp-text-secondary);
}

.teacher-archive__timeline-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.teacher-archive__latest-export {
  margin-top: var(--dp-space-3);
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.teacher-archive__timeline-item {
  padding: var(--dp-space-2) 0;
  border-bottom: 1px solid var(--dp-border-subtle);
  cursor: pointer;
}

.teacher-archive__timeline-item:hover {
  background: var(--dp-fill-quaternary);
}

.teacher-archive__timeline-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2);
  margin: 0;
  font-size: 14px;
}

.teacher-archive__timeline-meta {
  margin: var(--dp-space-1) 0 0;
  font-size: 12px;
  color: var(--dp-text-secondary);
}

.teacher-archive__detail-meta {
  margin: 0 0 var(--dp-space-2);
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.teacher-archive__detail-actions {
  margin-bottom: var(--dp-space-3);
}

.teacher-archive__version-history {
  margin-bottom: var(--dp-space-3);
}

.teacher-archive__version-title {
  margin: 0 0 var(--dp-space-2);
  font-size: 14px;
  font-weight: var(--dp-font-weight-medium);
}

.teacher-archive__version-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.teacher-archive__version-item {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  padding: var(--dp-space-2) 0;
  border-bottom: 1px solid var(--dp-border-subtle);
  cursor: pointer;
  font-size: 13px;
}

.teacher-archive__version-time {
  margin-left: auto;
  color: var(--dp-text-secondary);
}

.teacher-archive__correcting-tag {
  margin-left: var(--dp-space-2);
}

.teacher-archive__support-materials {
  margin-top: var(--dp-space-4);
  padding-top: var(--dp-space-3);
  border-top: 1px solid var(--dp-border-subtle);
}

.teacher-archive__support-materials-head,
.teacher-archive__support-item,
.teacher-archive__support-row-actions {
  display: flex;
  align-items: center;
}

.teacher-archive__support-materials-head {
  justify-content: space-between;
  gap: var(--dp-space-3);
  margin-bottom: var(--dp-space-2);
}

.teacher-archive__support-materials-head .teacher-archive__version-title {
  margin: 0;
}

.teacher-archive__support-material-actions,
.teacher-archive__support-row-actions {
  display: flex;
  gap: var(--dp-space-2);
}

.teacher-archive__support-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.teacher-archive__support-item {
  justify-content: space-between;
  gap: var(--dp-space-3);
  min-height: 52px;
  padding: var(--dp-space-2) 0;
  border-bottom: 1px solid var(--dp-border-subtle);
}

.teacher-archive__support-main {
  min-width: 0;
}

.teacher-archive__support-title,
.teacher-archive__support-meta {
  display: block;
}

.teacher-archive__support-title {
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: var(--dp-font-weight-medium);
}

.teacher-archive__support-meta {
  margin-top: var(--dp-space-1);
  overflow-wrap: anywhere;
  font-size: 12px;
  color: var(--dp-text-secondary);
}

.teacher-archive__material-form {
  display: grid;
  gap: var(--dp-space-2);
}

.teacher-archive__material-label {
  margin-top: var(--dp-space-2);
  font-size: 13px;
  font-weight: var(--dp-font-weight-medium);
}

.teacher-archive__score-list {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 13px;
}

.teacher-archive__bag,
.teacher-archive__bag-filter,
.teacher-archive__bag-preview {
  margin-bottom: var(--dp-space-4);
}

.teacher-archive__completeness-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  margin-bottom: 8px;
  font-weight: var(--dp-font-weight-medium);
}

.teacher-archive__filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.teacher-archive__section-tree {
  margin-top: 8px;
}

.teacher-archive__section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: var(--dp-font-weight-medium);
}

.teacher-archive__group {
  margin-bottom: 12px;
}

.teacher-archive__group-title {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.teacher-archive__preview-list {
  margin: 8px 0 0;
  padding-left: 18px;
}

.teacher-archive__bag p {
  margin: 0 0 var(--dp-space-2);
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.teacher-archive__hint {
  padding: var(--dp-space-3, 12px) 0;
}

@media (max-width: 1100px) {
  .teacher-archive__layout {
    grid-template-columns: 1fr;
  }
}
</style>
