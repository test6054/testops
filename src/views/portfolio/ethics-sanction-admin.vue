<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioEthicsConstraintStatusVO,
  PortfolioEthicsReviewLogVO,
  PortfolioEthicsSanctionVO,
} from '@/apis/portfolio/ethics-sanction'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioEthicsSanctionApi } from '@/apis/portfolio/ethics-sanction'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiRangePicker from '@/components/ui-guide/ui/RangePicker.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import PortfolioArchiveWriteGuardStrip from '@/components/portfolio/PortfolioArchiveWriteGuardStrip.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  ALL_PORTFOLIO_ETHICS_EVENT_TYPE_CODES,
  PortfolioEthicsEventTypeCode,
  PortfolioEthicsEventTypeDescription,
} from '@/types/enums/portfolio-ethics-event-type-enum'
import {
  ALL_PORTFOLIO_ETHICS_IMPACT_SCOPE_CODES,
  PortfolioEthicsImpactScopeCode,
  PortfolioEthicsImpactScopeDescription,
} from '@/types/enums/portfolio-ethics-impact-scope-enum'
import {
  ALL_PORTFOLIO_ETHICS_REVIEW_CONCLUSION_CODES,
  PortfolioEthicsReviewConclusionCode,
  PortfolioEthicsReviewConclusionDescription,
} from '@/types/enums/portfolio-ethics-review-conclusion-enum'
import {
  ALL_PORTFOLIO_ETHICS_SANCTION_STATUS_CODES,
  PortfolioEthicsSanctionStatusCode,
  PortfolioEthicsSanctionStatusDescription,
} from '@/types/enums/portfolio-ethics-sanction-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const loading = ref(false)
const deepLinkHint = ref('')
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const saving = ref(false)
const reviewing = ref(false)
const earlyReviewing = ref(false)
const uploadingDecisionFile = ref(false)
const rows = ref<PortfolioEthicsSanctionVO[]>([])
const total = ref(0)
const editorOpen = ref(false)
const reviewOpen = ref(false)
const detailOpen = ref(false)
const reviewTarget = ref<PortfolioEthicsSanctionVO | null>(null)
const detailRow = ref<PortfolioEthicsSanctionVO | null>(null)
const constraintStatus = ref<PortfolioEthicsConstraintStatusVO | null>(null)
const reviewLogs = ref<PortfolioEthicsReviewLogVO[]>([])
const requestToken = ref(0)
const detailRequestToken = ref(0)
const { teacherOptions, searchTeachers, rememberTeacherSelectLabel } = usePortfolioTeacherSearch()

const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  teacherId: undefined as string | undefined,
  sanctionStatus: undefined as PortfolioEthicsSanctionStatusCode | undefined,
})

const form = reactive({
  teacherId: undefined as string | undefined,
  eventType: PortfolioEthicsEventTypeCode.TEACHER_ETHICS_VIOLATION,
  handlingBasis: '',
  dateRange: undefined as [string, string] | undefined,
  impactScope: PortfolioEthicsImpactScopeCode.ALL,
  releaseCondition: '',
  reviewDepartment: '',
  publicSummary: '',
  detailDescription: '',
  decisionDocNo: '',
  decisionFileId: '',
  decisionFileName: '',
  decisionIssuingOrg: '',
  decisionDate: undefined as string | undefined,
})

const formTeacherId = computed(() => form.teacherId || undefined)
const {
  archiveWriteForbidden,
  archiveWriteCapabilityUnknown,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  loading: archiveWriteGuardLoading,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard({ teacherId: formTeacherId })

const reviewForm = reactive({
  reviewConclusion: PortfolioEthicsReviewConclusionCode.RELEASE,
  reviewOpinion: '',
  newSanctionEndDate: undefined as string | undefined,
})

const columns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherId', key: 'teacherId', width: 160 },
  { title: '事件', key: 'eventType', width: 110 },
  { title: '起止', key: 'dateRange', width: 200 },
  { title: '影响', key: 'impactScope', width: 120 },
  { title: '状态', key: 'sanctionStatus', width: 110 },
  { title: '约束', key: 'constraintActive', width: 80 },
  { title: '公开摘要', dataIndex: 'publicSummary', key: 'publicSummary', ellipsis: true },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
  { title: '操作', key: 'actions', width: 240 },
]

const writing = computed(() => saving.value || reviewing.value || earlyReviewing.value)

const statusFilterOptions = ALL_PORTFOLIO_ETHICS_SANCTION_STATUS_CODES.map((code) => ({
  value: code,
  label: PortfolioEthicsSanctionStatusDescription[code],
}))

const eventOptions = ALL_PORTFOLIO_ETHICS_EVENT_TYPE_CODES.map((code) => ({
  value: code,
  label: PortfolioEthicsEventTypeDescription[code],
}))

const impactOptions = ALL_PORTFOLIO_ETHICS_IMPACT_SCOPE_CODES.map((code) => ({
  value: code,
  label: PortfolioEthicsImpactScopeDescription[code],
}))

const conclusionOptions = ALL_PORTFOLIO_ETHICS_REVIEW_CONCLUSION_CODES.map((code) => ({
  value: code,
  label: PortfolioEthicsReviewConclusionDescription[code],
}))

function statusLabel(code: PortfolioEthicsSanctionStatusCode) {
  return strictEnumLabel(PortfolioEthicsSanctionStatusDescription, code, '处分状态')
}

function eventLabel(code: PortfolioEthicsEventTypeCode) {
  return strictEnumLabel(PortfolioEthicsEventTypeDescription, code, '事件类型')
}

function impactLabel(code: PortfolioEthicsImpactScopeCode) {
  return strictEnumLabel(PortfolioEthicsImpactScopeDescription, code, '影响范围')
}

function conclusionLabel(code: PortfolioEthicsReviewConclusionCode) {
  return strictEnumLabel(PortfolioEthicsReviewConclusionDescription, code, '复核结论')
}

function statusTone(code: PortfolioEthicsSanctionStatusCode) {
  if (code === PortfolioEthicsSanctionStatusCode.PENDING_REVIEW) return 'yellow'
  if (code === PortfolioEthicsSanctionStatusCode.RELEASED) return 'green'
  return 'red'
}

function resetForm() {
  form.teacherId = undefined
  form.eventType = PortfolioEthicsEventTypeCode.TEACHER_ETHICS_VIOLATION
  form.handlingBasis = ''
  form.dateRange = undefined
  form.impactScope = PortfolioEthicsImpactScopeCode.ALL
  form.releaseCondition = ''
  form.reviewDepartment = ''
  form.publicSummary = ''
  form.detailDescription = ''
  form.decisionDocNo = ''
  form.decisionFileId = ''
  form.decisionFileName = ''
  form.decisionIssuingOrg = ''
  form.decisionDate = undefined
}

function openCreate() {
  if (writing.value) return
  resetForm()
  editorOpen.value = true
}

function openReview(row: PortfolioEthicsSanctionVO) {
  if (writing.value) return
  if (row.sanctionStatus !== PortfolioEthicsSanctionStatusCode.PENDING_REVIEW) {
    showFormValidationMessage('仅期满待复核记录可提交结论')
    return
  }
  reviewTarget.value = row
  reviewForm.reviewConclusion = PortfolioEthicsReviewConclusionCode.RELEASE
  reviewForm.reviewOpinion = ''
  reviewForm.newSanctionEndDate = undefined
  reviewOpen.value = true
}

async function requestEarlyReview(row: PortfolioEthicsSanctionVO) {
  if (writing.value) return
  if (row.sanctionStatus !== PortfolioEthicsSanctionStatusCode.IN_EFFECT) {
    showFormValidationMessage('仅处分期内记录可提前进入待复核')
    return
  }
  form.teacherId = row.teacherId
  await reloadLifecycleState()
  if (!assertArchiveWritable('提前进入待复核')) {
    return
  }
  earlyReviewing.value = true
  try {
    await portfolioEthicsSanctionApi.requestEarlyReview({
      sanctionId: row.id,
      statusVersion: row.statusVersion,
    })
    void message.success('已进入待复核，请提交解除/延长/维持结论')
    await loadPage()
  } catch (error) {
    showUserError(error, '提前进入待复核失败')
  } finally {
    earlyReviewing.value = false
  }
}

async function onDecisionFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || uploadingDecisionFile.value) {
    return
  }
  uploadingDecisionFile.value = true
  try {
    const uploaded = await stageBusinessFile(FileUploadSceneKey.PORTFOLIO_MATERIAL, file)
    form.decisionFileId = uploaded.id
    form.decisionFileName = uploaded.nodeName
  } catch (error) {
    showUserError(error, '上传决定文件失败')
  } finally {
    uploadingDecisionFile.value = false
  }
}


async function openDetail(row: PortfolioEthicsSanctionVO) {
  const currentToken = detailRequestToken.value + 1
  detailRequestToken.value = currentToken
  detailOpen.value = true
  detailRow.value = null
  constraintStatus.value = null
  reviewLogs.value = []
  try {
    const nextDetail = await portfolioEthicsSanctionApi.get({ id: row.id })
    if (detailRequestToken.value !== currentToken) {
      return
    }
    detailRow.value = nextDetail
    try {
      constraintStatus.value = await portfolioEthicsSanctionApi.getConstraint({
        teacherId: row.teacherId,
      })
    } catch (error) {
      if (detailRequestToken.value !== currentToken) {
        return
      }
      constraintStatus.value = null
      showUserError(error, '加载处分约束状态失败')
    }
    try {
      reviewLogs.value = await portfolioEthicsSanctionApi.listReviewLogs({ id: row.id })
    } catch (error) {
      if (detailRequestToken.value !== currentToken) {
        return
      }
      reviewLogs.value = []
      showUserError(error, '加载处分复核记录失败')
    }
  } catch (error) {
    if (detailRequestToken.value !== currentToken) {
      return
    }
    detailRow.value = null
    constraintStatus.value = null
    reviewLogs.value = []
    showUserError(error, '加载处分详情失败')
    detailOpen.value = false
  }
}

async function loadPage() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const request = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    teacherId: query.teacherId || undefined,
    sanctionStatus: query.sanctionStatus,
  }
  beginLoad()
  loading.value = true
  try {
    const result = await portfolioEthicsSanctionApi.page(request)
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = result.list ?? []
    total.value = result.total ?? 0
    for (const row of rows.value) {
      if (row.teacherName && row.teacherNumber) {
        rememberTeacherSelectLabel(
          row.teacherId,
          formatPortfolioTeacherDisplay(row.teacherName, row.teacherNumber),
        )
      }
    }
    okLoad()
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = []
    total.value = 0
    failLoad()
    showUserError(error, '加载师德处分失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

async function saveSanction() {
  if (!assertArchiveWritable('登记师德处分')) {
    return
  }
  if (writing.value) return
  if (!form.teacherId) {
    showFormValidationMessage('请选择教师')
    return
  }
  if (!form.dateRange?.[0] || !form.dateRange?.[1]) {
    void message.error('请选择处分起止日期')
    return
  }
  if (
    !form.handlingBasis.trim()
    || !form.releaseCondition.trim()
    || !form.reviewDepartment.trim()
    || !form.publicSummary.trim()
    || !form.decisionDocNo.trim()
    || !form.decisionFileId
    || !form.decisionIssuingOrg.trim()
    || !form.decisionDate
  ) {
    void message.error('请填写处理依据、解除条件、复核部门、公开摘要与决定文号/文件/签发组织/决定日期')
    return
  }
  saving.value = true
  try {
    await portfolioEthicsSanctionApi.save({
      teacherId: form.teacherId,
      eventType: form.eventType,
      handlingBasis: form.handlingBasis.trim(),
      sanctionStartDate: form.dateRange[0],
      sanctionEndDate: form.dateRange[1],
      impactScope: form.impactScope,
      releaseCondition: form.releaseCondition.trim(),
      reviewDepartment: form.reviewDepartment.trim(),
      publicSummary: form.publicSummary.trim(),
      detailDescription: form.detailDescription.trim() || undefined,
      decisionDocNo: form.decisionDocNo.trim(),
      decisionFileId: form.decisionFileId,
      decisionIssuingOrg: form.decisionIssuingOrg.trim(),
      decisionDate: form.decisionDate,
    })
    void message.success('处分已登记并进入约束')
    editorOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '保存师德处分失败')
  } finally {
    saving.value = false
  }
}

async function submitReview() {
  if (reviewTarget.value?.teacherId) {
    form.teacherId = reviewTarget.value.teacherId
    await reloadLifecycleState()
  }
  if (!assertArchiveWritable('师德处分复核')) {
    return
  }
  if (!reviewTarget.value || writing.value) return
  if (
    (reviewForm.reviewConclusion === PortfolioEthicsReviewConclusionCode.EXTEND
      || reviewForm.reviewConclusion === PortfolioEthicsReviewConclusionCode.MAINTAIN)
    && !reviewForm.newSanctionEndDate
  ) {
    void message.error(
      reviewForm.reviewConclusion === PortfolioEthicsReviewConclusionCode.EXTEND
        ? '延长处分须选择新的结束日期'
        : '维持约束须设定下一次复核截止日期',
    )
    return
  }
  reviewing.value = true
  try {
    await portfolioEthicsSanctionApi.submitReview({
      sanctionId: reviewTarget.value.id,
      reviewConclusion: reviewForm.reviewConclusion,
      reviewOpinion: reviewForm.reviewOpinion.trim() || undefined,
      newSanctionEndDate: reviewForm.newSanctionEndDate,
      statusVersion: reviewTarget.value.statusVersion,
    })
    void message.success('复核结论已提交')
    reviewOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '提交复核失败')
  } finally {
    reviewing.value = false
  }
}

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  void loadPage()
}

function search() {
  query.pageNum = 1
  void loadPage()
}

/**
 * PF-P0-389：消费 sanctionId 深链提示目标处分，站内信可行动。
 */
async function applySanctionDeepLink() {
  const sanctionId = typeof route.query.sanctionId === 'string' ? route.query.sanctionId.trim() : ''
  if (!sanctionId) {
    deepLinkHint.value = ''
    return
  }
  const inPage = rows.value.find((item) => item.id === sanctionId)
  if (inPage) {
    deepLinkHint.value = `深链处分 #${sanctionId}：${inPage.publicSummary || ''}（${statusLabel(inPage.sanctionStatus)}）`
    return
  }
  try {
    const detail = await portfolioEthicsSanctionApi.get({ id: sanctionId })
    deepLinkHint.value = `深链处分 #${sanctionId}：${detail.publicSummary || ''}（${statusLabel(detail.sanctionStatus)}），请按教师筛选或翻页定位处理`
  } catch {
    deepLinkHint.value = ''
  }
}

onMounted(async () => {
  await loadPage()
  await applySanctionDeepLink()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="师德处分"
        subtitle="登记处分、期满复核；约束结果按有效状态实时生效"
      >
        <template #actions>
          <UiButton size="sm" variant="primary" :disabled="writing || archiveWriteGuardLoading" @click="openCreate"> 登记处分 </UiButton>
        </template>
      </ContextBar>
    </template>
    <PortfolioArchiveWriteGuardStrip
      :blocked="archiveWriteForbidden"
      :capability-unknown="archiveWriteCapabilityUnknown"
      :message="archiveWriteBlockMessage"
      :loading="archiveWriteGuardLoading"
      @confirm="() => void reloadLifecycleState()"
    />
    <UiCard>
      <div class="ethics-admin__filters">
        <UiSelect
          v-model="query.teacherId"
          size="sm"
          allow-search
          allow-clear
          placeholder="搜索教师姓名或工号"
          style="width: 220px"
          :options="teacherOptions"
          @search="searchTeachers"
        />
        <UiSelect
          v-model="query.sanctionStatus"
          size="sm"
          allow-clear
          placeholder="处分状态"
          style="width: 160px"
          :options="statusFilterOptions"
        />
        <UiButton size="sm" variant="soft" @click="search"> 查询 </UiButton>
      </div>
      <UiSpin :spinning="loading">
        <a-alert
          v-if="deepLinkHint"
          type="info"
          show-icon
          class="mb-3"
          :description="deepLinkHint"
        />
        <WorkbenchContextGateStrip
          v-if="!loading && !rows.length"
          tag="未登记"
          body="暂无师德处分记录，请先登记处分"
          cta-label="登记处分"
          @cta="openCreate"
        />
        <UiDataTable
          v-model:current="query.pageNum"
          v-model:page-size="query.pageSize"
          :load-error="loadError"
          v-else
          row-key="id"
          :columns="columns"
          :data-source="rows"
          pagination-mode="server"
          :total="total"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'teacherId'">
              {{ formatPortfolioTeacherDisplay(record.teacherName, record.teacherNumber) }}
            </template>
            <template v-else-if="column.key === 'eventType'">
              {{ eventLabel(record.eventType) }}
            </template>
            <template v-else-if="column.key === 'dateRange'">
              {{ record.sanctionStartDate }} ~ {{ record.sanctionEndDate }}
            </template>
            <template v-else-if="column.key === 'impactScope'">
              {{ impactLabel(record.impactScope) }}
            </template>
            <template v-else-if="column.key === 'sanctionStatus'">
              <UiTag :tone="statusTone(record.sanctionStatus)">
                {{ statusLabel(record.sanctionStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'constraintActive'">
              <UiTag :tone="record.constraintActive ? 'red' : 'gray'">
                {{ record.constraintActive ? '约束中' : '已解除' }}
              </UiTag>
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
              <UiButton size="sm" variant="soft" @click="openDetail(record)"> 详情 </UiButton>
              <UiButton
                v-if="record.sanctionStatus === PortfolioEthicsSanctionStatusCode.IN_EFFECT"
                size="sm"
                variant="soft"
                :loading="earlyReviewing"
                @click="requestEarlyReview(record)"
                :disabled="writing || archiveWriteForbidden || archiveWriteCapabilityUnknown"
              >
                提前复核
              </UiButton>
              <UiButton
                v-if="record.sanctionStatus === PortfolioEthicsSanctionStatusCode.PENDING_REVIEW"
                size="sm"
                variant="primary"
                @click="openReview(record)"
                :disabled="writing || archiveWriteForbidden || archiveWriteCapabilityUnknown"
              >
                复核
              </UiButton>
            </template>
          </template>
        </UiDataTable>
      </UiSpin>
    </UiCard>

    <UiDrawer
      v-model:open="editorOpen"
      title="新建师德处分"
      width="520"
    >
      <div class="ethics-admin__form">
        <label>教师</label>
        <UiSelect
          v-model="form.teacherId"
          size="sm"
          allow-search
          allow-clear
          placeholder="搜索教师姓名或工号"
          :options="teacherOptions"
          @search="searchTeachers"
        />
        <label>事件类型</label>
        <UiSelect v-model="form.eventType" size="sm" :options="eventOptions" />
        <label>处理依据</label>
        <UiInput v-model="form.handlingBasis" size="sm" placeholder="决定文件/制度条款" />
        <label>决定文号</label>
        <UiInput v-model="form.decisionDocNo" size="sm" placeholder="正式决定文号" />
        <label>签发组织</label>
        <UiInput v-model="form.decisionIssuingOrg" size="sm" placeholder="签发组织" />
        <label>决定日期</label>
        <UiDatePicker v-model="form.decisionDate" size="sm" />
        <label>决定文件</label>
        <div class="ethics-admin__file">
          <input type="file" :disabled="uploadingDecisionFile" @change="onDecisionFileChange" />
          <span>{{ form.decisionFileName || (form.decisionFileId ? `文件 #${form.decisionFileId}` : '未上传') }}</span>
        </div>
        <label>处分起止</label>
        <UiRangePicker v-model="form.dateRange" size="sm" />
        <label>影响范围</label>
        <UiSelect v-model="form.impactScope" size="sm" :options="impactOptions" />
        <label>解除条件</label>
        <UiInput v-model="form.releaseCondition" size="sm" />
        <label>复核部门</label>
        <UiInput v-model="form.reviewDepartment" size="sm" />
        <label>公开摘要（画像可见）</label>
        <UiInput v-model="form.publicSummary" size="sm" placeholder="不含敏感细节" />
        <label>敏感明细（仅管理端）</label>
        <UiTextarea v-model="form.detailDescription" size="sm" :rows="3" />
      </div>
      <template #footer>
        <UiButton size="sm" variant="soft" @click="editorOpen = false"> 取消 </UiButton>
        <UiButton size="sm" variant="primary" :loading="saving" :disabled="writing || archiveWriteForbidden || archiveWriteCapabilityUnknown" @click="saveSanction">
          登记
        </UiButton>
      </template>
    </UiDrawer>

    <UiDrawer v-model:open="reviewOpen" title="期满复核" width="480">
      <div v-if="reviewTarget" class="ethics-admin__form">
        <p>
          {{ formatPortfolioTeacherDisplay(reviewTarget.teacherName, reviewTarget.teacherNumber) }}
          · 原结束日 {{ reviewTarget.sanctionEndDate }}
        </p>
        <label>复核结论</label>
        <UiSelect v-model="reviewForm.reviewConclusion" size="sm" :options="conclusionOptions" />
        <label
          v-if="
            reviewForm.reviewConclusion === PortfolioEthicsReviewConclusionCode.EXTEND
              || reviewForm.reviewConclusion === PortfolioEthicsReviewConclusionCode.MAINTAIN
          "
        >
          {{
            reviewForm.reviewConclusion === PortfolioEthicsReviewConclusionCode.EXTEND
              ? '新结束日期'
              : '下一次复核截止日期'
          }}
        </label>
        <UiDatePicker
          v-if="
            reviewForm.reviewConclusion === PortfolioEthicsReviewConclusionCode.EXTEND
              || reviewForm.reviewConclusion === PortfolioEthicsReviewConclusionCode.MAINTAIN
          "
          v-model="reviewForm.newSanctionEndDate"
          size="sm"
        />
        <label>复核意见</label>
        <UiTextarea v-model="reviewForm.reviewOpinion" size="sm" :rows="3" />
      </div>
      <template #footer>
        <UiButton size="sm" variant="soft" @click="reviewOpen = false"> 取消 </UiButton>
        <UiButton size="sm" variant="primary" :loading="reviewing" :disabled="writing || archiveWriteForbidden || archiveWriteCapabilityUnknown" @click="submitReview">
          提交结论
        </UiButton>
      </template>
    </UiDrawer>

    <UiDrawer v-model:open="detailOpen" title="处分详情" width="560">
      <div v-if="detailRow" class="ethics-admin__form">
        <section v-if="constraintStatus" class="ethics-admin__constraint">
          <strong>教师当前聚合约束</strong>
          <UiTag :tone="constraintStatus.constrained ? 'red' : 'green'">
            {{ constraintStatus.constrained ? '约束生效' : '当前无约束' }}
          </UiTag>
          <span>有效处分 {{ constraintStatus.activeSanctionCount }} 条</span>
          <span>红线系数 {{ constraintStatus.redlineCoefficient }}</span>
          <PortfolioOwnerIdentityLayersCell
            :layers="constraintStatus.ownerIdentityLayers"
            :note="constraintStatus.ownerMultiIdentityNote"
            show-note
          />
          <p v-if="constraintStatus.publicSummary">{{ constraintStatus.publicSummary }}</p>
        </section>
        <p>状态：{{ statusLabel(detailRow.sanctionStatus) }} · 版本 {{ detailRow.statusVersion }}</p>
        <p>事件：{{ eventLabel(detailRow.eventType) }}</p>
        <p>依据：{{ detailRow.handlingBasis }}</p>
        <p>决定文号：{{ detailRow.decisionDocNo || '—' }}</p>
        <p>签发组织：{{ detailRow.decisionIssuingOrg || '—' }}</p>
        <p>决定日期：{{ detailRow.decisionDate || '—' }}</p>
        <p>决定文件：{{ detailRow.decisionFileId || '—' }}</p>
        <p>证据指纹：{{ detailRow.evidenceFingerprint || '—' }}</p>
        <p>起止：{{ detailRow.sanctionStartDate }} ~ {{ detailRow.sanctionEndDate }}</p>
        <p>影响：{{ impactLabel(detailRow.impactScope) }}</p>
        <p>解除条件：{{ detailRow.releaseCondition }}</p>
        <p>复核部门：{{ detailRow.reviewDepartment }}</p>
        <p>公开摘要：{{ detailRow.publicSummary }}</p>
        <p>敏感明细：{{ detailRow.detailDescription || '—' }}</p>
        <p v-if="detailRow.lastReviewConclusion">
          最近结论：{{ conclusionLabel(detailRow.lastReviewConclusion) }} ·
          {{ detailRow.lastReviewOpinion || '无意见' }}
        </p>
        <h4>复核历史</h4>
        <UiEmpty v-if="!reviewLogs.length" size="sm" description="尚无复核记录" />
        <ul v-else class="ethics-admin__logs">
          <li v-for="log in reviewLogs" :key="log.id">
            {{ log.createTime }} · {{ conclusionLabel(log.reviewConclusion) }} ·
            {{ statusLabel(log.fromStatus) }} → {{ statusLabel(log.toStatus) }}
            <span v-if="log.newEndDate"> · 结束日 {{ log.newEndDate }}</span>
          </li>
        </ul>
      </div>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.ethics-admin__filters {
  display: flex;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-block);
  align-items: center;
}
.ethics-admin__form {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}
.ethics-admin__form label {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.ethics-admin__constraint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-tight) var(--dp-space-component);
  padding-bottom: var(--dp-space-component);
  border-bottom: 1px solid var(--dp-border-subtle);
}
.ethics-admin__constraint p {
  flex-basis: 100%;
  margin: 0;
  color: var(--dp-text-secondary);
}
.ethics-admin__file {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.ethics-admin__logs {
  margin: 0;
  padding-left: var(--dp-space-block);
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
}
</style>
