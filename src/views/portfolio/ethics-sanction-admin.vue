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
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
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
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const loading = ref(false)
const deepLinkHint = ref('')
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const saving = ref(false)
const reviewing = ref(false)
const rows = ref<PortfolioEthicsSanctionVO[]>([])
const total = ref(0)
const editorOpen = ref(false)
const reviewOpen = ref(false)
const detailOpen = ref(false)
const editingId = ref<string | undefined>()
const reviewTarget = ref<PortfolioEthicsSanctionVO | null>(null)
const detailRow = ref<PortfolioEthicsSanctionVO | null>(null)
const constraintStatus = ref<PortfolioEthicsConstraintStatusVO | null>(null)
const reviewLogs = ref<PortfolioEthicsReviewLogVO[]>([])
const requestToken = ref(0)
const detailRequestToken = ref(0)

const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  teacherId: '',
  sanctionStatus: undefined as PortfolioEthicsSanctionStatusCode | undefined,
})

const form = reactive({
  teacherId: '',
  eventType: PortfolioEthicsEventTypeCode.TEACHER_ETHICS_VIOLATION,
  handlingBasis: '',
  dateRange: undefined as [string, string] | undefined,
  impactScope: PortfolioEthicsImpactScopeCode.ALL,
  releaseCondition: '',
  reviewDepartment: '',
  publicSummary: '',
  detailDescription: '',
})

const formTeacherId = computed(() => form.teacherId || undefined)
const {
  archiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
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
  { title: '操作', key: 'actions', width: 200 },
]

const writing = computed(() => saving.value || reviewing.value)

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
  form.teacherId = ''
  form.eventType = PortfolioEthicsEventTypeCode.TEACHER_ETHICS_VIOLATION
  form.handlingBasis = ''
  form.dateRange = undefined
  form.impactScope = PortfolioEthicsImpactScopeCode.ALL
  form.releaseCondition = ''
  form.reviewDepartment = ''
  form.publicSummary = ''
  form.detailDescription = ''
}

function openCreate() {
  if (writing.value) return
  editingId.value = undefined
  resetForm()
  editorOpen.value = true
}

function openEdit(row: PortfolioEthicsSanctionVO) {
  if (writing.value) return
  if (row.sanctionStatus !== PortfolioEthicsSanctionStatusCode.IN_EFFECT) {
    showFormValidationMessage('仅处分期内记录可编辑')
    return
  }
  editingId.value = row.id
  form.teacherId = row.teacherId
  form.eventType = row.eventType
  form.handlingBasis = row.handlingBasis
  form.dateRange = [row.sanctionStartDate, row.sanctionEndDate]
  form.impactScope = row.impactScope
  form.releaseCondition = row.releaseCondition
  form.reviewDepartment = row.reviewDepartment
  form.publicSummary = row.publicSummary
  form.detailDescription = row.detailDescription ?? ''
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

function lifecycleTagTone(record: {
  lifecycleStatus?: string
}): 'green' | 'orange' | 'gray' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
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
    teacherId: query.teacherId.trim() || undefined,
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
  if (!form.teacherId.trim()) {
    showFormValidationMessage('请填写教师用户编号')
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
  ) {
    void message.error('请填写处理依据、解除条件、复核部门和公开摘要')
    return
  }
  saving.value = true
  try {
    await portfolioEthicsSanctionApi.save({
      id: editingId.value,
      teacherId: form.teacherId.trim(),
      eventType: form.eventType,
      handlingBasis: form.handlingBasis.trim(),
      sanctionStartDate: form.dateRange[0],
      sanctionEndDate: form.dateRange[1],
      impactScope: form.impactScope,
      releaseCondition: form.releaseCondition.trim(),
      reviewDepartment: form.reviewDepartment.trim(),
      publicSummary: form.publicSummary.trim(),
      detailDescription: form.detailDescription.trim() || undefined,
    })
    void message.success(editingId.value ? '处分已更新' : '处分已登记并进入约束')
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
    form.teacherId = String(reviewTarget.value.teacherId)
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
          <UiButton size="sm" variant="primary" @click="openCreate"> 登记处分 </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="mb-3"
    />
    <UiCard>
      <div class="ethics-admin__filters">
        <UiInput
          v-model="query.teacherId"
          size="sm"
          clearable
          placeholder="教师用户编号"
          style="width: 180px"
          @enter="search"
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
                @click="openEdit(record)"
              >
                编辑
              </UiButton>
              <UiButton
                v-if="record.sanctionStatus === PortfolioEthicsSanctionStatusCode.PENDING_REVIEW"
                size="sm"
                variant="primary"
                @click="openReview(record)"
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
      :title="editingId ? '编辑师德处分' : '新建师德处分'"
      width="520"
    >
      <div class="ethics-admin__form">
        <label>教师用户编号</label>
        <UiInput
          v-model="form.teacherId"
          size="sm"
          :disabled="!!editingId"
          placeholder="教师用户编号"
        />
        <label>事件类型</label>
        <UiSelect v-model="form.eventType" size="sm" :options="eventOptions" />
        <label>处理依据</label>
        <UiInput v-model="form.handlingBasis" size="sm" placeholder="决定文件/制度条款" />
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
        <UiButton size="sm" variant="primary" :loading="saving" @click="saveSanction">
          保存
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
        <UiButton size="sm" variant="primary" :loading="reviewing" @click="submitReview">
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
        <p>状态：{{ statusLabel(detailRow.sanctionStatus) }}</p>
        <p>事件：{{ eventLabel(detailRow.eventType) }}</p>
        <p>依据：{{ detailRow.handlingBasis }}</p>
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
  gap: 8px;
  margin-bottom: 16px;
  align-items: center;
}
.ethics-admin__form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ethics-admin__form label {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.ethics-admin__constraint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dp-border-subtle);
}
.ethics-admin__constraint p {
  flex-basis: 100%;
  margin: 0;
  color: var(--dp-text-secondary);
}
.ethics-admin__logs {
  margin: 0;
  padding-left: 16px;
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
}
</style>
