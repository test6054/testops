<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioEvaluationObjectionHandleActionCode } from '@/apis/portfolio/enums'
import type {
  PortfolioEvaluationMaterialCategoryItemVO,
  PortfolioEvaluationMaterialPreviewVO,
  PortfolioEvaluationPublicityListItemVO,
  PortfolioEvaluationTeacherNoticeVO,
  PortfolioEvaluationTeacherResultSummaryVO,
} from '@/apis/portfolio/types'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  PORTFOLIO_EVALUATION_OBJECTION_TYPE_OPTIONS,
  PortfolioEvaluationObjectionHandleActionDescription,
  PortfolioEvaluationObjectionStatusDescription,
  PortfolioEvaluationObjectionTypeCode,
  PortfolioEvaluationPublicityStatusDescription,
  PortfolioEvaluationTeacherNoticeStatusCode,
  PortfolioEvaluationTeacherNoticeStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioEvaluationNoticeApi } from '@/apis/portfolio/evaluation-notice'
import { portfolioEvaluationPublicityApi } from '@/apis/portfolio/evaluation-publicity'
import {
  PORTFOLIO_EVALUATION_OBJECTION_HANDLE_ACTION_TONE,
  PORTFOLIO_EVALUATION_OBJECTION_STATUS_TONE,
  PORTFOLIO_EVALUATION_PUBLICITY_STATUS_TONE,
  PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_TONE,
} from '@/apis/portfolio/types'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function noticeStatusLabel(status: PortfolioEvaluationTeacherNoticeStatusCode): string {
  return strictEnumLabel(PortfolioEvaluationTeacherNoticeStatusDescription, status, '评价通知状态')
}

function noticeStatusTone(status: PortfolioEvaluationTeacherNoticeStatusCode) {
  return strictEnumTone(PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_TONE, status, '评价通知状态')
}

function publicityStatusLabel(
  status: PortfolioEvaluationPublicityListItemVO['publicityStatus'],
): string {
  return strictEnumLabel(PortfolioEvaluationPublicityStatusDescription, status, '评价公示状态')
}

function publicityStatusTone(status: PortfolioEvaluationPublicityListItemVO['publicityStatus']) {
  return strictEnumTone(PORTFOLIO_EVALUATION_PUBLICITY_STATUS_TONE, status, '评价公示状态')
}

function objectionStatusLabel(
  status: NonNullable<PortfolioEvaluationPublicityListItemVO['objectionStatus']>,
): string {
  return strictEnumLabel(PortfolioEvaluationObjectionStatusDescription, status, '评价异议状态')
}

function objectionStatusTone(
  status: NonNullable<PortfolioEvaluationPublicityListItemVO['objectionStatus']>,
) {
  return strictEnumTone(PORTFOLIO_EVALUATION_OBJECTION_STATUS_TONE, status, '评价异议状态')
}

function handleActionLabel(action: PortfolioEvaluationObjectionHandleActionCode): string {
  return strictEnumLabel(
    PortfolioEvaluationObjectionHandleActionDescription,
    action,
    '评价异议复核动作',
  )
}

function handleActionTone(action: PortfolioEvaluationObjectionHandleActionCode) {
  return strictEnumTone(
    PORTFOLIO_EVALUATION_OBJECTION_HANDLE_ACTION_TONE,
    action,
    '评价异议复核动作',
  )
}

const route = useRoute()
const router = useRouter()
const { targetTeacherId } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const { currentUserId, canPickTeachers } = usePortfolioTeacherAccess()

const loading = ref(false)
const publicityLoading = ref(false)
const resultLoading = ref(false)
const previewLoading = ref(false)
const confirming = ref(false)
const submittingObjection = ref(false)
const notices = ref<PortfolioEvaluationTeacherNoticeVO[]>([])
const publicityRows = ref<PortfolioEvaluationPublicityListItemVO[]>([])
const resultSummary = ref<PortfolioEvaluationTeacherResultSummaryVO | null>(null)
const preview = ref<PortfolioEvaluationMaterialPreviewVO | null>(null)
const selectedNoticeId = ref('')
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)
const objectionModalOpen = ref(false)
const objectionTarget = ref<PortfolioEvaluationPublicityListItemVO | null>(null)
const objectionForm = reactive({
  objectionType: PortfolioEvaluationObjectionTypeCode.RESULT_DISPUTE,
  indicatorCode: '',
  objectionReason: '',
})
const objectionEvidenceFileNodeId = ref('')
const objectionEvidenceFileName = ref('')
const evaluationRequestToken = ref(0)
const noticeRequestToken = ref(0)
const publicityRequestToken = ref(0)
const resultRequestToken = ref(0)
const previewRequestToken = ref(0)

const objectionIndicatorOptions = computed(() => {
  const indicatorCodes = new Set<string>()
  for (const entry of resultSummary.value?.entries ?? []) {
    if (entry.indicatorCode) {
      indicatorCodes.add(entry.indicatorCode)
    }
  }
  return Array.from(indicatorCodes).map((indicatorCode) => ({
    value: indicatorCode,
    label: indicatorCode,
  }))
})
const scoreOrResultDispute = computed(
  () =>
    objectionForm.objectionType === PortfolioEvaluationObjectionTypeCode.RESULT_DISPUTE
    || objectionForm.objectionType === PortfolioEvaluationObjectionTypeCode.SCORE_DISPUTE,
)
const showObjectionIndicatorSelect = computed(
  () => scoreOrResultDispute.value && objectionIndicatorOptions.value.length > 0,
)
const deepLinkedEvaluationTaskId = computed(() =>
  typeof route.query.evaluationTaskId === 'string' ? route.query.evaluationTaskId : '',
)

const selectedNotice = computed(
  () => notices.value.find((item) => item.id === selectedNoticeId.value) ?? null,
)

const noticeColumns: ColumnsType<PortfolioEvaluationTeacherNoticeVO> = [
  { title: '评价任务', dataIndex: 'taskTitle', key: 'taskTitle', fixed: 'left' },
  { title: '状态', key: 'noticeStatus', width: 120 },
  { title: '截止', dataIndex: 'dueTime', key: 'dueTime', width: 170 },
  { title: '操作', key: 'actions', width: 160 },
]

function evaluationMaterialCourseScopeLabel(record: unknown): string {
  const category = record as PortfolioEvaluationMaterialCategoryItemVO
  if (!category.courseCode) {
    return '—'
  }
  const parts = [category.courseCode]
  if (category.academicYear) {
    parts.push(category.academicYear)
  }
  if (category.semester) {
    parts.push(`第${category.semester}学期`)
  }
  return parts.join(' · ')
}

function evaluationCourseArchiveMeta(preview: PortfolioEvaluationMaterialPreviewVO): string {
  if ((preview.courseArchiveTaughtCourseCount ?? 0) <= 0) {
    return ''
  }
  return ` · 讲授 ${preview.courseArchiveTaughtCourseCount} 门 · 五框架 ${preview.courseArchiveFrameworkSlotDone ?? 0}/${preview.courseArchiveFrameworkSlotTotal ?? 0}`
}

const categoryColumns: ColumnsType<PortfolioEvaluationMaterialCategoryItemVO> = [
  { title: '档案分类', dataIndex: 'categoryName', key: 'categoryName', fixed: 'left' },
  { title: '课程维度', key: 'courseScope', width: 140 },
  { title: '完成', key: 'completed', width: 100 },
]

function evaluationMaterialRowKey(record: unknown): string {
  const category = record as PortfolioEvaluationMaterialCategoryItemVO
  return [
    category.categoryId,
    category.courseCode ?? '',
    category.academicYear ?? '',
    category.semester ?? '',
  ].join(':')
}

const publicityColumns: ColumnsType<PortfolioEvaluationPublicityListItemVO> = [
  { title: '任务', dataIndex: 'taskName', key: 'taskName', fixed: 'left' },
  { title: '公示标题', dataIndex: 'publicityTitle', key: 'publicityTitle' },
  { title: '公示状态', key: 'publicityStatus', width: 100 },
  { title: '公示期', key: 'publicityWindow', width: 200 },
  { title: '异议 / 复核', key: 'objectionStatus', width: 140 },
  { title: '操作', key: 'actions', width: 180 },
]

const resultColumns: ColumnsType<
  NonNullable<PortfolioEvaluationTeacherResultSummaryVO['entries']>[number]
> = [
  {
    title: '指标编码',
    dataIndex: 'indicatorCode',
    key: 'indicatorCode',
    width: 120,
    fixed: 'left',
  },
  { title: '得分', dataIndex: 'score', key: 'score', width: 90, align: 'right' },
  { title: '评语', dataIndex: 'commentText', key: 'commentText' },
]

function resetEvaluationContext() {
  evaluationRequestToken.value += 1
  noticeRequestToken.value += 1
  publicityRequestToken.value += 1
  resultRequestToken.value += 1
  previewRequestToken.value += 1
  loading.value = false
  publicityLoading.value = false
  resultLoading.value = false
  previewLoading.value = false
  confirming.value = false
  submittingObjection.value = false
  notices.value = []
  pageTotal.value = 0
  publicityRows.value = []
  resultSummary.value = null
  preview.value = null
  selectedNoticeId.value = ''
  objectionModalOpen.value = false
  objectionTarget.value = null
  objectionForm.objectionType = PortfolioEvaluationObjectionTypeCode.RESULT_DISPUTE
  objectionForm.indicatorCode = ''
  objectionForm.objectionReason = ''
  objectionEvidenceFileNodeId.value = ''
  objectionEvidenceFileName.value = ''
}

function canViewerSubmitObjection(record: PortfolioEvaluationPublicityListItemVO): boolean {
  if (!record.canSubmitObjection) {
    return false
  }
  return !(
    canPickTeachers.value
    && targetTeacherId.value
    && targetTeacherId.value !== currentUserId.value
  )
}

function publicityRowKey(record: unknown): string {
  const row = record as PortfolioEvaluationPublicityListItemVO
  return `${row.publicityId}-${row.teacherId ?? ''}`
}

async function loadNotices() {
  const scopeToken = evaluationRequestToken.value
  const requestToken = noticeRequestToken.value + 1
  noticeRequestToken.value = requestToken
  if (canPickTeachers.value && !targetTeacherId.value) {
    loading.value = false
    notices.value = []
    pageTotal.value = 0
    return
  }
  loading.value = true
  preview.value = null
  try {
    const routeNoticeId = typeof route.query.noticeId === 'string' ? route.query.noticeId : ''
    const page = await portfolioEvaluationNoticeApi.pageNotices({
      ...(targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}),
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      locateNoticeId: routeNoticeId || undefined,
    })
    if (evaluationRequestToken.value !== scopeToken || noticeRequestToken.value !== requestToken) {
      return
    }
    notices.value = page.list
    pageTotal.value = page.total
    pageNum.value = page.pageNum ?? pageNum.value
    pageSize.value = page.pageSize ?? pageSize.value
    const matched = routeNoticeId ? notices.value.find((item) => item.id === routeNoticeId) : null
    selectedNoticeId.value = matched?.id ?? ''
    if (selectedNoticeId.value) {
      await loadPreview(selectedNoticeId.value)
    }
  } catch (error) {
    if (evaluationRequestToken.value !== scopeToken || noticeRequestToken.value !== requestToken) {
      return
    }
    notices.value = []
    pageTotal.value = 0
    selectedNoticeId.value = ''
    preview.value = null
    showUserError(error, '加载评价待办失败')
  } finally {
    if (evaluationRequestToken.value === scopeToken && noticeRequestToken.value === requestToken) {
      loading.value = false
    }
  }
}

async function loadPublicity() {
  const scopeToken = evaluationRequestToken.value
  const requestToken = publicityRequestToken.value + 1
  publicityRequestToken.value = requestToken
  if (canPickTeachers.value && !targetTeacherId.value) {
    publicityLoading.value = false
    publicityRows.value = []
    return
  }
  publicityLoading.value = true
  resultSummary.value = null
  try {
    const rows = await portfolioEvaluationPublicityApi.listPublicity(
      targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
    )
    if (
      evaluationRequestToken.value !== scopeToken
      || publicityRequestToken.value !== requestToken
    ) {
      return
    }
    publicityRows.value = rows
    const matchedRow = deepLinkedEvaluationTaskId.value
      ? publicityRows.value.find(
          (item) => item.evaluationTaskId === deepLinkedEvaluationTaskId.value,
        )
      : null
    if (matchedRow) {
      await loadResultSummary(matchedRow.evaluationTaskId)
    }
  } catch (error) {
    if (
      evaluationRequestToken.value !== scopeToken
      || publicityRequestToken.value !== requestToken
    ) {
      return
    }
    publicityRows.value = []
    showUserError(error, '加载评价公示失败')
  } finally {
    if (
      evaluationRequestToken.value === scopeToken
      && publicityRequestToken.value === requestToken
    ) {
      publicityLoading.value = false
    }
  }
}

async function loadResultSummary(evaluationTaskId: string) {
  const scopeToken = evaluationRequestToken.value
  const requestToken = resultRequestToken.value + 1
  resultRequestToken.value = requestToken
  resultLoading.value = true
  try {
    const nextSummary = await portfolioEvaluationPublicityApi.summarizeTeacherResult({
      evaluationTaskId,
      ...(targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}),
    })
    if (evaluationRequestToken.value !== scopeToken || resultRequestToken.value !== requestToken) {
      return
    }
    resultSummary.value = nextSummary
  } catch (error) {
    if (evaluationRequestToken.value !== scopeToken || resultRequestToken.value !== requestToken) {
      return
    }
    resultSummary.value = null
    showUserError(error, '加载评价结果失败')
  } finally {
    if (evaluationRequestToken.value === scopeToken && resultRequestToken.value === requestToken) {
      resultLoading.value = false
    }
  }
}

async function loadPreview(noticeId: string) {
  const scopeToken = evaluationRequestToken.value
  const requestToken = previewRequestToken.value + 1
  previewRequestToken.value = requestToken
  const notice = notices.value.find((item) => item.id === noticeId)
  if (!notice) {
    preview.value = null
    return
  }
  selectedNoticeId.value = noticeId
  preview.value = null
  previewLoading.value = true
  const request = {
    evaluationTaskId: notice.evaluationTaskId,
    ...(targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}),
  }
  try {
    const nextPreview = await portfolioEvaluationNoticeApi.materialPreview(request)
    if (evaluationRequestToken.value !== scopeToken || previewRequestToken.value !== requestToken) {
      return
    }
    preview.value = nextPreview
  } catch (error) {
    if (evaluationRequestToken.value !== scopeToken || previewRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '加载参评材料预览失败')
  } finally {
    if (evaluationRequestToken.value === scopeToken && previewRequestToken.value === requestToken) {
      previewLoading.value = false
    }
  }
}

async function confirmSelected() {
  if (confirming.value) {
    return
  }
  if (!(await confirmProxyWrite('确认评价材料'))) {
    return
  }

  if (!selectedNotice.value) {
    return
  }
  const requestToken = evaluationRequestToken.value
  const noticeId = selectedNotice.value.id
  confirming.value = true
  try {
    await portfolioEvaluationNoticeApi.confirmMaterial({ noticeId })
    if (evaluationRequestToken.value !== requestToken) {
      return
    }
    message.success('材料已确认')
    await loadNotices()
  } catch (error) {
    if (evaluationRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '确认材料失败')
  } finally {
    if (evaluationRequestToken.value === requestToken) {
      confirming.value = false
    }
  }
}

function openObjectionModal(row: PortfolioEvaluationPublicityListItemVO) {
  objectionTarget.value = row
  objectionForm.objectionType = PortfolioEvaluationObjectionTypeCode.RESULT_DISPUTE
  objectionForm.indicatorCode = ''
  objectionForm.objectionReason = ''
  objectionEvidenceFileNodeId.value = ''
  objectionEvidenceFileName.value = ''
  objectionModalOpen.value = true
  void loadResultSummary(row.evaluationTaskId)
}

async function submitObjection() {
  if (submittingObjection.value) {
    return
  }
  if (!(await confirmProxyWrite('提交评价异议'))) {
    return
  }

  if (!objectionTarget.value) {
    return
  }
  const reason = objectionForm.objectionReason.trim()
  if (!reason) {
    showFormValidationMessage('请填写异议理由')
    return
  }
  if (scoreOrResultDispute.value) {
    if (resultSummary.value?.evaluationTaskId !== objectionTarget.value.evaluationTaskId) {
      showFormValidationMessage('评价结果仍在加载，请稍后提交异议')
      return
    }
    if (showObjectionIndicatorSelect.value && !objectionForm.indicatorCode) {
      showFormValidationMessage('请选择争议指标')
      return
    }
  }
  const requestToken = evaluationRequestToken.value
  submittingObjection.value = true
  try {
    await portfolioEvaluationPublicityApi.submitObjection({
      evaluationTaskId: objectionTarget.value.evaluationTaskId,
      publicityId: objectionTarget.value.publicityId,
      objectionType: objectionForm.objectionType,
      ...(objectionForm.indicatorCode ? { indicatorCode: objectionForm.indicatorCode } : {}),
      objectionReason: reason,
      evidenceRef: objectionEvidenceFileNodeId.value || undefined,
    })
    if (evaluationRequestToken.value !== requestToken) {
      return
    }
    message.success('异议已提交')
    objectionModalOpen.value = false
    await loadPublicity()
    if (objectionTarget.value) {
      await loadResultSummary(objectionTarget.value.evaluationTaskId)
    }
  } catch (error) {
    if (evaluationRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '提交异议失败')
  } finally {
    if (evaluationRequestToken.value === requestToken) {
      submittingObjection.value = false
    }
  }
}

function goArchive() {
  void router.push({
    path: '/portfolio/teacher/archive',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

/** 组装评价待办行内操作。 */
function buildNoticeRowActions(record: PortfolioEvaluationTeacherNoticeVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [
    {
      key: 'preview',
      label: '预览材料',
      disabled: previewLoading.value || confirming.value,
    },
  ]
  if (record.noticeStatus !== PortfolioEvaluationTeacherNoticeStatusCode.CONFIRMED) {
    actions.push({
      key: 'confirm',
      label: '确认材料',
      tone: 'primary',
      disabled: confirming.value || previewLoading.value,
    })
  }
  return actions
}

function handleNoticeRowAction(key: string, record: PortfolioEvaluationTeacherNoticeVO): void {
  switch (key) {
    case 'preview':
      void loadPreview(record.id)
      break
    case 'confirm':
      selectedNoticeId.value = record.id
      void confirmSelected()
      break
  }
}

/** 组装评价公示行内操作。 */
function buildPublicityRowActions(
  record: PortfolioEvaluationPublicityListItemVO,
): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [
    {
      key: 'viewResult',
      label: '查看结果',
      disabled: resultLoading.value,
    },
  ]
  if (canViewerSubmitObjection(record)) {
    actions.push({ key: 'submitObjection', label: '提交异议' })
  }
  return actions
}

function handlePublicityRowAction(
  key: string,
  record: PortfolioEvaluationPublicityListItemVO,
): void {
  switch (key) {
    case 'viewResult':
      void loadResultSummary(record.evaluationTaskId)
      break
    case 'submitObjection':
      openObjectionModal(record)
      break
  }
}

usePortfolioScopedLoader(
  () => {
    resetEvaluationContext()
    pageNum.value = 1
    if (canPickTeachers.value && !targetTeacherId.value) {
      return
    }
    void loadNotices()
    void loadPublicity()
  },
  () => targetTeacherId.value,
)

watch(
  () => route.query.noticeId,
  (noticeId, previousNoticeId) => {
    if (noticeId === previousNoticeId) {
      return
    }
    pageNum.value = 1
    void loadNotices()
  },
)

watch(
  () => [pageNum.value, pageSize.value],
  ([currentPageNum, currentPageSize], [previousPageNum, previousPageSize]) => {
    if (currentPageNum === previousPageNum && currentPageSize === previousPageSize) {
      return
    }
    const routeNoticeId = typeof route.query.noticeId === 'string' ? route.query.noticeId : ''
    if (!routeNoticeId) {
      return
    }
    const matched = notices.value.some((item) => item.id === routeNoticeId)
    if (matched) {
      return
    }
    void router.replace({
      path: route.path,
      query: {
        ...route.query,
        noticeId: undefined,
      },
    })
  },
)

watch(
  () => route.query.evaluationTaskId,
  (evaluationTaskId, previousEvaluationTaskId) => {
    if (evaluationTaskId === previousEvaluationTaskId) {
      return
    }
    void loadPublicity()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="我的评价" description="参评材料确认、完整度预览与结果公示">
      <template #actions>
        <UiButton
          size="sm"
          variant="ghost"
          :disabled="canPickTeachers && !targetTeacherId"
          @click="goArchive"
        >
          查看档案
        </UiButton>
        <UiButton
          size="sm"
          :loading="loading || publicityLoading"
          :disabled="canPickTeachers && !targetTeacherId"
          @click="
            () => {
              void loadNotices()
              void loadPublicity()
            }
          "
        >
          刷新
        </UiButton>
      </template>
    </ContextBar>

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />

    <template v-else>
      <UiCard title="评价待办">
        <UiDataTable
          v-if="notices.length || loading"
          v-model:current="pageNum"
          v-model:page-size="pageSize"
          pagination-mode="server"
          :columns="noticeColumns"
          :data-source="notices"
          :loading="loading"
          :total="pageTotal"
          row-key="id"
          @page-change="() => void loadNotices()"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'noticeStatus'">
              <UiTag :tone="noticeStatusTone(record.noticeStatus)">
                {{ noticeStatusLabel(record.noticeStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildNoticeRowActions(record)"
                @action="(key) => handleNoticeRowAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
        <UiEmpty size="sm" v-else description="暂无评价待办" />
      </UiCard>

      <UiCard
        v-if="preview || previewLoading"
        title="材料清单预览"
        class="teacher-evaluation__block"
      >
        <UiSpin :spinning="previewLoading">
          <template v-if="preview">
            <p class="teacher-evaluation__meta">
              任务：{{ preview.taskName }} · 完整度 {{ preview.completenessPercent }}% · 必填分类
              {{ preview.requiredCategoryDone }} / {{ preview.requiredCategoryTotal
              }}{{ evaluationCourseArchiveMeta(preview) }}
            </p>
            <p v-if="preview.endTime" class="teacher-evaluation__meta">
              评价截止 {{ preview.endTime }}
            </p>
            <UiDataTable
              v-if="preview.categories?.length"
              :row-key="evaluationMaterialRowKey"
              size="sm"
              pagination-mode="none"
              :columns="categoryColumns"
              :data-source="preview.categories"
              :show-pagination="false"
              :sticky-header="false"
              flat
              class="teacher-evaluation__category-table"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'courseScope'">
                  {{ evaluationMaterialCourseScopeLabel(record) }}
                </template>
                <template v-else-if="column.key === 'completed'">
                  <UiTag :tone="record.completed ? 'green' : 'orange'">
                    {{ record.completed ? '已完成' : '未完成' }}
                  </UiTag>
                </template>
              </template>
            </UiDataTable>
            <UiEmpty size="sm" v-else description="暂无分类明细" />
          </template>
        </UiSpin>
      </UiCard>

      <UiCard title="评价公示" class="teacher-evaluation__block">
        <UiDataTable
          v-if="publicityRows.length || publicityLoading"
          :columns="publicityColumns"
          :data-source="publicityRows"
          :loading="publicityLoading"
          :row-key="publicityRowKey"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'publicityStatus'">
              <UiTag :tone="publicityStatusTone(record.publicityStatus)">
                {{ publicityStatusLabel(record.publicityStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'publicityWindow'">
              {{ record.startTime }} — {{ record.endTime }}
            </template>
            <template v-else-if="column.key === 'objectionStatus'">
              <template v-if="record.handleAction">
                <UiTag :tone="handleActionTone(record.handleAction)">
                  {{ handleActionLabel(record.handleAction) }}
                </UiTag>
                <p v-if="record.handleOpinion" class="teacher-evaluation__handle-opinion">
                  {{ record.handleOpinion }}
                </p>
              </template>
              <UiTag
                v-else-if="record.objectionStatus"
                :tone="objectionStatusTone(record.objectionStatus)"
              >
                {{ objectionStatusLabel(record.objectionStatus) }}
              </UiTag>
              <span v-else>—</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildPublicityRowActions(record)"
                @action="(key) => handlePublicityRowAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
        <UiEmpty size="sm" v-else description="暂无公示" />
      </UiCard>

      <UiCard
        v-if="resultSummary || resultLoading"
        title="评价结果与依据"
        class="teacher-evaluation__block"
      >
        <UiSpin :spinning="resultLoading">
          <template v-if="resultSummary">
            <p class="teacher-evaluation__meta">
              任务：{{ resultSummary.taskName }} · 条目 {{ resultSummary.entryCount ?? 0 }} 条
              <template v-if="resultSummary.averageScore != null">
                · 平均分 {{ resultSummary.averageScore }}
              </template>
              <template v-if="resultSummary.completenessPercent != null">
                · 完整度 {{ resultSummary.completenessPercent }}%
              </template>
              <template v-if="resultSummary.requiredCategoryTotal != null">
                · 必填分类 {{ resultSummary.requiredCategoryDone }} /
                {{ resultSummary.requiredCategoryTotal }}
              </template>
            </p>
            <UiDataTable
              v-if="resultSummary.entries?.length"
              row-key="entryId"
              size="sm"
              pagination-mode="none"
              :columns="resultColumns"
              :data-source="resultSummary.entries"
              :show-pagination="false"
              :sticky-header="false"
              flat
              class="teacher-evaluation__result-table"
            />
            <UiEmpty size="sm" v-else description="暂无评价依据明细" />
            <UiDataTable
              v-if="resultSummary.materialCategories?.length"
              :row-key="evaluationMaterialRowKey"
              size="small"
              pagination-mode="none"
              :columns="categoryColumns"
              :data-source="resultSummary.materialCategories"
              :show-pagination="false"
              :sticky-header="false"
              flat
              class="teacher-evaluation__category-table"
            />
          </template>
        </UiSpin>
      </UiCard>

      <UiDialog
        v-model:open="objectionModalOpen"
        title="提交公示异议"
        ok-text="提交"
        cancel-text="取消"
        :confirm-loading="submittingObjection"
        @ok="() => void submitObjection()"
      >
        <p v-if="objectionTarget" class="teacher-evaluation__meta">
          {{ objectionTarget.taskName }} · {{ objectionTarget.publicityTitle }}
        </p>
        <UiSelect
          v-model="objectionForm.objectionType"
          size="sm"
          class="teacher-evaluation__form-field"
          :options="PORTFOLIO_EVALUATION_OBJECTION_TYPE_OPTIONS"
          placeholder="异议类型"
          :disabled="submittingObjection"
        />
        <UiSelect
          v-if="showObjectionIndicatorSelect"
          v-model="objectionForm.indicatorCode"
          size="sm"
          class="teacher-evaluation__form-field"
          :options="objectionIndicatorOptions"
          placeholder="请选择争议指标"
          :disabled="submittingObjection"
        />
        <UiTextarea
          v-model="objectionForm.objectionReason"
          size="sm"
          class="teacher-evaluation__form-field"
          :rows="4"
          placeholder="异议理由"
          :disabled="submittingObjection"
        />
        <UiPlatformFileField
          v-model:file-node-id="objectionEvidenceFileNodeId"
          v-model:file-name="objectionEvidenceFileName"
          class="teacher-evaluation__form-field"
          :scene-key="FileUploadSceneKey.PORTFOLIO_MATERIAL"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          button-text="上传佐证材料"
          :disabled="submittingObjection"
        />
      </UiDialog>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.teacher-evaluation__block {
  margin-top: var(--dp-space-4);
}

.teacher-evaluation__meta {
  margin: 0;
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.teacher-evaluation__handle-opinion {
  margin: var(--dp-space-1) 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.teacher-evaluation__category-table {
  margin-top: var(--dp-space-3);
}

.teacher-evaluation__result-table {
  margin-top: var(--dp-space-3);
}

.teacher-evaluation__form-field {
  margin-bottom: var(--dp-space-3);
}
</style>
