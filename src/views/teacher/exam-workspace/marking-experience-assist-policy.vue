<template>
  <StageWorkbenchShell>
    <ExamWorkspaceJourneySubNav />

    <ExamSelectGateStrip v-if="!examId" body="缺少考试上下文，请先进入考试工作台" />
    <UiSkeletonState v-else-if="loading" variant="card" :card-count="2" compact />
    <template v-else>
      <UiAlertStrip
        v-if="policyAlert"
        :tone="policyAlert.tone"
        :title="policyAlert.title"
        :description="policyAlert.description"
        dense
        inline
        class="experience-assist-policy__alert"
      />

      <WorkbenchSurfaceCard>
        <template #head>
          <div class="experience-assist-policy__head">
            <div class="experience-assist-policy__head-main">
              <h3 class="experience-assist-policy__title">经验辅助评阅策略</h3>
              <UiTag :tone="policyTone" size="sm">{{ policyStatusLabel }}</UiTag>
            </div>
            <div
              v-if="
                policy?.tenantExperienceAssistEnabled
                  && (canManageReviewerWrites === true || canDisableExperienceAssist === true)
              "
              class="experience-assist-policy__head-actions"
            >
              <UiButton
                v-if="canManageReviewerWrites === true"
                variant="primary"
                size="sm"
                :disabled="canEnable !== true || policy?.enabled"
                @click="openPolicyConfigModal('enable')"
              >
                启用本场
              </UiButton>
              <UiButton
                v-if="canEditConfig === true"
                size="sm"
                variant="outline"
                @click="openPolicyConfigModal('edit')"
              >
                编辑配置
              </UiButton>
              <UiButton
                v-if="canDisableExperienceAssist === true"
                size="sm"
                variant="outline"
                :disabled="canDisable !== true"
                :loading="saving === true"
                @click="handleDisable"
              >
                禁用本场
              </UiButton>
            </div>
          </div>
        </template>

        <p v-if="!policy?.tenantExperienceAssistEnabled" class="experience-assist-policy__hint">
          租户未启用经验辅助评阅，请联系教务管理员在「租户阅卷策略」中开启后再回到本页配置。
        </p>
        <template v-else>
          <p v-if="unresolvedSubjectiveCount > 0" class="experience-assist-policy__hint">
            <template v-if="baselineMissingCount > 0">
              尚有
              {{ baselineMissingCount }} 道主观题标答基线未锁定，请先在「标答与评分基线」确认生效。
            </template>
            <template v-else-if="requiresExplicitBinding">
              尚有 {{ unboundSubjectiveCount }} 道主观题未绑定，完成全部绑定后可启用本场。
            </template>
            <template v-else>
              尚有
              {{ needsExplicitBindingCount }} 道主观题无法自动匹配，须显式绑定定标经验后方可启用。
            </template>
          </p>
          <dl class="experience-assist-policy__meta">
            <div>
              <dt>一致率阈值</dt>
              <dd>{{ formatRate(policy?.effectiveMinConsistencyRate) }}</dd>
            </div>
            <div>
              <dt>签名距离上限</dt>
              <dd>{{ policy?.effectiveMaxHammingDistance ?? '—' }}</dd>
            </div>
            <div>
              <dt>经验条目上限</dt>
              <dd>{{ policy?.effectiveMaxExperienceItems ?? '—' }}</dd>
            </div>
          </dl>
        </template>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard
        v-if="policy?.tenantExperienceAssistEnabled"
        class="experience-assist-policy__bindings"
      >
        <template #head>
          <h3 class="experience-assist-policy__title">题目定标绑定</h3>
        </template>
        <p class="experience-assist-policy__hint">
          {{ bindingGuideText }}
        </p>
        <UiFilterBar
          :model-value="bindingFilterModel"
          :fields="bindingFilterFields"
          variant="plain"
          show-labels
          search-text="查询"
          class="experience-assist-policy__binding-filter"
          @update:model-value="syncBindingFilterForm"
          @search="handleBindingFilterSearch"
          @reset="handleBindingFilterReset"
        />
        <UiDataTable
          v-model:current="bindingPageNum"
          v-model:page-size="bindingPageSize"
          pagination-mode="server"
          :columns="bindingColumns"
          :data-source="bindings"
          :loading="bindingsLoading"
          :load-error="bindingsLoadError"
          :total="bindingPageTotal"
          flat
          row-key="layoutQuestionId"
          size="small"
          @page-change="handleBindingPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'baselineReady'">
              <UiTag :tone="record.baselineReady === true ? 'green' : 'red'" size="sm">
                {{ record.baselineReady === true ? '已锁定' : '未锁定' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'assistResolutionStatus'">
              <UiTag
                v-if="record.assistResolutionStatus"
                :tone="resolutionTone(record.assistResolutionStatus)"
                size="sm"
              >
                {{ resolutionLabel(record.assistResolutionStatus, record) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'consistencyRate'">
              {{ formatRate(record.consistencyRate) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildBindingRowActions(record)"
                split
                @action="(key) => handleBindingRowAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
    </template>

    <QuestionExperienceAssistBindingModal
      v-model:open="bindingModalOpen"
      :exam-id="examId"
      :layout-question-id="bindingTarget?.layoutQuestionId"
      :question-no="bindingTarget?.questionNo"
      :can-manage-reviewer-writes="canManageReviewerWrites"
      :policy-frozen="policy?.policyStatus === GradingExperienceAssistPolicyStatusCode.FROZEN"
      @saved="handleBindingSaved"
    />
    <ExamExperienceAssistPolicyEnableModal
      v-model:open="policyConfigModalOpen"
      :mode="policyConfigModalMode"
      :exam-id="examId"
      :effective-min-consistency-rate="policy?.effectiveMinConsistencyRate"
      :effective-max-hamming-distance="policy?.effectiveMaxHammingDistance"
      :effective-max-experience-items="policy?.effectiveMaxExperienceItems"
      :can-manage-reviewer-writes="canManageReviewerWrites"
      :policy-frozen="policy?.policyStatus === GradingExperienceAssistPolicyStatusCode.FROZEN"
      @saved="handlePolicySaved"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamGradingExperienceAssistPolicyResponse,
  ExamQuestionExperienceAssistBindingResponse,
  GradingExperienceAssistReadinessResponse,
} from '@/apis/mark/grading-experience-assist'
import type { ExamExperienceAssistPolicyConfigMode } from '@/components/mark/ExamExperienceAssistPolicyEnableModal.vue'
import type {
  BadgeTone,
  FilterField,
  UiAlertStripTone,
  UiTableRowActionItem,
} from '@/components/ui-guide/ui/types'
import type { ExperienceAssistBindingFilterQuery } from '@/utils/experience-assist-binding-filter'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  disableExamGradingExperienceAssistPolicy,
  getExamGradingExperienceAssistPolicy,
  getExamGradingExperienceAssistReadiness,
  pageExamExperienceAssistBindings,
  saveExamExperienceAssistBinding,
} from '@/apis/mark/grading-experience-assist'
import ExamExperienceAssistPolicyEnableModal from '@/components/mark/ExamExperienceAssistPolicyEnableModal.vue'
import QuestionExperienceAssistBindingModal from '@/components/mark/QuestionExperienceAssistBindingModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkWorkbenchContext, useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useQueryTable } from '@/composables/useQueryTable'
import { ExamKindDescription } from '@/types/enums/exam-kind-enum'
import {
  GradingExperienceAssistPolicyStatusCode,
  GradingExperienceAssistPolicyStatusDescription,
} from '@/types/enums/grading-experience-assist-policy-status-enum'
import {
  GradingExperienceAssistQuestionResolutionCode,
  GradingExperienceAssistQuestionResolutionDescription,
  GradingExperienceAssistQuestionResolutionTone,
} from '@/types/enums/grading-experience-assist-question-resolution-enum'
import { showUserError } from '@/utils/error-handler'
import { buildEmptyPageResult } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceMarkingExperienceAssistPolicy' })

const { examId } = useWorkspaceExamId()
const { snapshot, refreshSnapshot } = useMarkWorkbenchContext()
const loading = ref(false)
const saving = ref(false)
const unbindingQuestionId = ref<string>()
const policy = ref<ExamGradingExperienceAssistPolicyResponse | null>(null)
const readiness = ref<GradingExperienceAssistReadinessResponse | null>(null)
const bindingModalOpen = ref(false)
const bindingTarget = ref<ExamQuestionExperienceAssistBindingResponse | null>(null)
const policyConfigModalOpen = ref(false)
const policyConfigModalMode = ref<ExamExperienceAssistPolicyConfigMode>('enable')

const bindingFilterForm = reactive<ExperienceAssistBindingFilterQuery>({
  keyword: '',
  assistResolutionStatus: undefined,
})

const {
  loading: bindingsLoading,
  rows: bindings,
  pageNum: bindingPageNum,
  pageSize: bindingPageSize,
  pageTotal: bindingPageTotal,
  filters: bindingFilters,
  loadError: bindingsLoadError,
  handlePageChange: handleBindingPageChange,
  search: searchBindings,
  loadPage: loadBindingPage,
} = useQueryTable<ExamQuestionExperienceAssistBindingResponse, ExperienceAssistBindingFilterQuery>(
  (params) => {
    if (!examId.value) {
      return Promise.resolve(
        buildEmptyPageResult<ExamQuestionExperienceAssistBindingResponse>(
          params.pageNum,
          params.pageSize,
        ),
      )
    }
    const { keyword, assistResolutionStatus, ...pageParams } = params
    return pageExamExperienceAssistBindings({
      examId: examId.value,
      keyword: keyword?.trim() || undefined,
      assistResolutionStatus,
      ...pageParams,
    })
  },
  { immediate: false, errorMessage: '加载题目绑定失败' },
)

const bindingFilterModel = computed<Record<string, unknown>>({
  get: () => bindingFilterForm,
  set: (value) => {
    Object.assign(bindingFilterForm, value)
  },
})

const bindingResolutionOptions = Object.values(GradingExperienceAssistQuestionResolutionCode).map(
  (code) => ({
    label: strictEnumLabel(
      GradingExperienceAssistQuestionResolutionDescription,
      code,
      '经验辅助题目定标状态',
    ),
    value: code,
  }),
)

const bindingFilterFields: FilterField[] = [
  {
    key: 'keyword',
    type: 'input',
    label: '关键词',
    placeholder: '题号 / 来源考试 / 经验摘要',
    allowClear: true,
    width: 260,
    inputPrefixIcon: 'search',
    triggerSearchOnChange: false,
  },
  {
    key: 'assistResolutionStatus',
    type: 'select',
    label: '定标状态',
    placeholder: '全部状态',
    allowClear: true,
    width: 160,
    options: bindingResolutionOptions,
  },
]

const bindingColumns: ColumnType<ExamQuestionExperienceAssistBindingResponse>[] = [
  { title: '题号', key: 'questionNo', dataIndex: 'questionNo', width: 80, fixed: 'left' },
  { title: '标答基线', key: 'baselineReady', width: 96 },
  { title: '定标状态', key: 'assistResolutionStatus', width: 108 },
  { title: '来源考试', key: 'sourceExamName', dataIndex: 'sourceExamName', width: 160 },
  { title: '经验摘要', key: 'experienceSummary', dataIndex: 'experienceSummary', width: 280 },
  { title: '一致率', key: 'consistencyRate', width: 88 },
  { title: '绑定时间', key: 'boundTime', width: 140 },
  { title: '操作', key: 'actions', width: 128 },
]

const requiresExplicitBinding = computed(() => policy.value?.autoMatchSupported === false)

const examKindLabel = computed(() => {
  const kind = policy.value?.examKind
  if (!kind) return '本场考试'
  return strictEnumLabel(ExamKindDescription, kind, '考试类型')
})

const explicitBindingHint = computed(
  () =>
    `${examKindLabel.value}不支持相似题自动匹配。请为每道主观题绑定历史正考定标经验后再启用本场。`,
)

const bindingGuideText = computed(() => {
  if (requiresExplicitBinding.value === true) {
    return '补考/重修/缓考/重考须先锁定标答基线，再为每道主观题显式绑定历史期末考试正考经验，全部就绪后再启用本场。'
  }
  return '正考须先锁定标答基线；同课程相似题可自动匹配，非相似题须显式绑定。列表以本场主观题为准。'
})

const policyStatusLabel = computed(() => {
  const status = policy.value?.policyStatus
  if (status === GradingExperienceAssistPolicyStatusCode.FROZEN) {
    return strictEnumLabel(
      GradingExperienceAssistPolicyStatusDescription,
      status,
      '经验辅助策略状态',
    )
  }
  if (policy.value?.enabled === true) {
    return strictEnumLabel(
      GradingExperienceAssistPolicyStatusDescription,
      GradingExperienceAssistPolicyStatusCode.ENABLED,
      '经验辅助策略状态',
    )
  }
  return strictEnumLabel(
    GradingExperienceAssistPolicyStatusDescription,
    GradingExperienceAssistPolicyStatusCode.DISABLED,
    '经验辅助策略状态',
  )
})

const policyTone = computed((): BadgeTone => {
  if (policy.value?.policyStatus === GradingExperienceAssistPolicyStatusCode.FROZEN) return 'gray'
  return policy.value?.enabled === true ? 'green' : 'orange'
})

/**
 * MVR-277/362：启用/改阈/绑定仅认 canManageReviewerWrites===true（评阅写 ∧ ACTIVE）。
 * 禁用仅认 canDisableExperienceAssist===true（评阅写，关考后仍可关）。
 */
const canManageReviewerWrites = computed(() => policy.value?.canManageReviewerWrites === true)
const canDisableExperienceAssist = computed(() => policy.value?.canDisableExperienceAssist === true)

const canEnable = computed(() =>
  canManageReviewerWrites.value === true
  && policy.value?.tenantExperienceAssistEnabled === true
  && policy.value?.policyStatus !== GradingExperienceAssistPolicyStatusCode.FROZEN
  && bindingsLoading.value !== true
  && unresolvedSubjectiveCount.value === 0,
)

const canDisable = computed(() =>
  canDisableExperienceAssist.value === true
  && policy.value?.enabled === true
  && policy.value?.policyStatus !== GradingExperienceAssistPolicyStatusCode.FROZEN,
)

const canEditConfig = computed(() =>
  canManageReviewerWrites.value === true
  && policy.value?.tenantExperienceAssistEnabled === true
  && policy.value?.enabled === true
  && policy.value?.policyStatus !== GradingExperienceAssistPolicyStatusCode.FROZEN,
)

const baselineMissingCount = computed(() => readiness.value?.baselineMissingCount ?? 0)

const unboundSubjectiveCount = computed(() => readiness.value?.assistUnresolvedCount ?? 0)

const unresolvedSubjectiveCount = computed(
  () =>
    (readiness.value?.baselineMissingCount ?? 0) + (readiness.value?.assistUnresolvedCount ?? 0),
)

const needsExplicitBindingCount = unboundSubjectiveCount

const subjectiveQuestionCount = computed(() => readiness.value?.subjectiveQuestionCount ?? 0)

/** 单行策略摘要：多条件互斥，避免多条 warning 叠占笔记本屏 */
const policyAlert = computed(
  (): { tone: UiAlertStripTone, title: string, description: string } | null => {
    if (policy.value?.policyStatus === GradingExperienceAssistPolicyStatusCode.FROZEN) {
      return {
        tone: 'warning',
        title: '本场定标策略已冻结',
        description:
          '正评任务已生成，不能再变更启用状态或题目绑定；已生效的定标经验仍会在 AI 复评中引用。',
      }
    }
    if (subjectiveQuestionCount.value === 0 && policy.value?.enabled === true) {
      return {
        tone: 'warning',
        title: '待主观题入库',
        description:
          '本场已启用经验辅助评阅，但尚无主观题；请完成制卷录入或扫描推导后再做定标绑定。',
      }
    }
    if (baselineMissingCount.value > 0 && policy.value?.enabled !== true) {
      return {
        tone: 'warning',
        title: '标答评分基线未锁定',
        description: `共 ${baselineMissingCount.value} 道主观题须先在「标答与评分基线」确认生效，再启用经验辅助评阅。`,
      }
    }
    if (
      requiresExplicitBinding.value
      && unboundSubjectiveCount.value > 0
      && policy.value?.enabled !== true
    ) {
      return {
        tone: 'warning',
        title: '尚有主观题未完成定标绑定',
        description: `共 ${unboundSubjectiveCount.value} 道主观题待绑定，完成后方可启用本场经验辅助评阅。`,
      }
    }
    if (
      requiresExplicitBinding.value !== true
      && needsExplicitBindingCount.value > 0
      && policy.value?.enabled === true
    ) {
      return {
        tone: 'warning',
        title: '部分主观题无法自动匹配定标',
        description: `共 ${needsExplicitBindingCount.value} 道非相似题须显式绑定定标经验，否则正评前无法生成任务。`,
      }
    }
    if (requiresExplicitBinding.value === true) {
      return {
        tone: 'info',
        title: '本场须逐题显式定标',
        description: explicitBindingHint.value,
      }
    }
    return null
  },
)

function resolutionLabel(
  status?: GradingExperienceAssistQuestionResolutionCode,
  row?: ExamQuestionExperienceAssistBindingResponse,
): string {
  if (!status) return '—'
  if (
    status === GradingExperienceAssistQuestionResolutionCode.NEEDS_EXPLICIT_BINDING
    && row?.experienceCaseId
  ) {
    return '定标引用失效'
  }
  return strictEnumLabel(
    GradingExperienceAssistQuestionResolutionDescription,
    status,
    '经验辅助题目定标状态',
  )
}

function resolutionTone(status?: GradingExperienceAssistQuestionResolutionCode) {
  if (!status) return 'gray' as const
  return GradingExperienceAssistQuestionResolutionTone[status]
}

function formatRate(rate?: number): string {
  if (rate == null) return '—'
  return `${Math.round(rate * 1000) / 10}%`
}

function openPolicyConfigModal(mode: ExamExperienceAssistPolicyConfigMode): void {
  // MVR-927：与 canEnable / canEditConfig 按钮 disabled 同源二次闸（写权∧租户开∧非 FROZEN∧业务前置）
  if (mode === 'enable') {
    if (canEnable.value !== true) {
      void message.warning(
        canManageReviewerWrites.value === true
          ? '当前不可启用经验辅助评阅（租户未开、策略冻结或仍有未解析主观题）'
          : '仅本场阅卷组织成员或主考可配置经验辅助评阅',
      )
      return
    }
  } else if (canEditConfig.value !== true) {
    void message.warning(
      canManageReviewerWrites.value === true
        ? '当前不可修改经验辅助评阅配置（未启用、租户未开或策略冻结）'
        : '仅本场阅卷组织成员或主考可配置经验辅助评阅',
    )
    return
  }
  policyConfigModalMode.value = mode
  policyConfigModalOpen.value = true
}

function syncBindingFilterForm(next: Record<string, unknown>): void {
  Object.assign(bindingFilterForm, next)
}

function handleBindingFilterSearch(): void {
  bindingFilters.value = {
    keyword: bindingFilterForm.keyword,
    assistResolutionStatus: bindingFilterForm.assistResolutionStatus,
  }
  searchBindings()
}

function handleBindingFilterReset(): void {
  bindingFilterForm.keyword = ''
  bindingFilterForm.assistResolutionStatus = undefined
  bindingFilters.value = {}
  searchBindings()
}

async function syncWorkbenchPendingTodos(): Promise<void> {
  await refreshSnapshot()
}

async function loadPolicy(): Promise<void> {
  if (!examId.value) return
  loading.value = true
  try {
    policy.value = await getExamGradingExperienceAssistPolicy(examId.value)
  } catch (error) {
    showUserError(error, '加载经验辅助策略失败')
  } finally {
    loading.value = false
  }
}

async function loadBindings(): Promise<void> {
  if (!examId.value || !policy.value?.tenantExperienceAssistEnabled) {
    readiness.value = null
    return
  }
  try {
    readiness.value = await getExamGradingExperienceAssistReadiness(examId.value)
    await loadBindingPage()
    await syncWorkbenchPendingTodos()
  } catch (error) {
    readiness.value = null
    showUserError(error, '加载题目绑定失败')
  }
}

async function handlePolicySaved(
  nextPolicy: ExamGradingExperienceAssistPolicyResponse,
): Promise<void> {
  policy.value = nextPolicy
  if (policyConfigModalMode.value === 'enable') {
    await loadBindings()
  }
}

async function handleDisable(): Promise<void> {
  if (!examId.value || saving.value === true) return
  // MVR-362/927：与 canDisable / 按钮 disabled 同源二次闸（治理权∧已启用∧非 FROZEN）
  if (canDisable.value !== true) {
    void message.warning(
      canDisableExperienceAssist.value === true
        ? '当前不可禁用经验辅助评阅（未启用或策略冻结）'
        : '仅本场阅卷组织成员或主考可禁用经验辅助评阅',
    )
    return
  }
  saving.value = true
  try {
    policy.value = await disableExamGradingExperienceAssistPolicy(examId.value)
    await loadBindings()
    await syncWorkbenchPendingTodos()
    void message.success('已禁用本场经验辅助评阅')
  } catch (error) {
    showUserError(error, '禁用失败')
  } finally {
    saving.value = false
  }
}

function buildBindingRowActions(
  row: ExamQuestionExperienceAssistBindingResponse,
): UiTableRowActionItem[] {
  const frozen = policy.value?.policyStatus === GradingExperienceAssistPolicyStatusCode.FROZEN
  const writeBlocked = canManageReviewerWrites.value !== true
  const actions: UiTableRowActionItem[] = [
    {
      key: 'bind',
      label: row.experienceCaseId ? '更换' : '绑定',
      disabled: frozen === true || writeBlocked === true,
    },
  ]
  if (row.experienceCaseId) {
    actions.push({
      key: 'unbind',
      label: '解除绑定',
      tone: 'danger',
      disabled: frozen === true || writeBlocked === true || unbindingQuestionId.value === row.layoutQuestionId,
    })
  }
  return actions
}

function handleBindingRowAction(
  key: string,
  row: ExamQuestionExperienceAssistBindingResponse,
): void {
  if (key === 'bind') {
    openBindingModal(row)
    return
  }
  if (key === 'unbind') {
    confirmUnbind(row)
  }
}

function openBindingModal(row: ExamQuestionExperienceAssistBindingResponse): void {
  // MVR-927：与行内 disabled（FROZEN ∨ 无写权）同源二次闸
  if (policy.value?.policyStatus === GradingExperienceAssistPolicyStatusCode.FROZEN) {
    void message.warning('经验辅助评阅策略已冻结，不可绑定题目定标')
    return
  }
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员或主考可绑定题目经验')
    return
  }
  bindingTarget.value = row
  bindingModalOpen.value = true
}

function confirmUnbind(row: ExamQuestionExperienceAssistBindingResponse): void {
  if (!examId.value) {
    return
  }
  // MVR-927：与行内 disabled（FROZEN ∨ 无写权）同源二次闸
  if (policy.value?.policyStatus === GradingExperienceAssistPolicyStatusCode.FROZEN) {
    void message.warning('经验辅助评阅策略已冻结，不可解除题目定标')
    return
  }
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员或主考可解除题目经验绑定')
    return
  }
  void confirmAsync({
    title: '解除题目定标绑定？',
    content: `题号 ${row.questionNo ?? row.layoutQuestionId} 将不再引用显式定标经验。`,
    type: 'warning',
    okText: '解除绑定',
    cancelText: '取消',
    onOk: () => handleUnbind(row),
  })
}

async function handleUnbind(row: ExamQuestionExperienceAssistBindingResponse): Promise<void> {
  if (!examId.value || unbindingQuestionId.value != null) return
  // MVR-927：写提交再认 FROZEN ∧ 写权，避免确认后状态漂移仍发写
  if (policy.value?.policyStatus === GradingExperienceAssistPolicyStatusCode.FROZEN) {
    void message.warning('经验辅助评阅策略已冻结，不可解除题目定标')
    return
  }
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员或主考可解除题目经验绑定')
    return
  }
  unbindingQuestionId.value = row.layoutQuestionId
  try {
    await saveExamExperienceAssistBinding({
      examId: examId.value,
      layoutQuestionId: row.layoutQuestionId,
    })
    void message.success('题目定标已解除')
    await loadBindings()
  } catch (error) {
    showUserError(error, '解除绑定失败')
  } finally {
    unbindingQuestionId.value = undefined
  }
}

async function handleBindingSaved(): Promise<void> {
  await loadBindings()
}

watch(
  examId,
  () => {
    bindingFilterForm.keyword = ''
    bindingFilterForm.assistResolutionStatus = undefined
    bindingFilters.value = {}
    void loadPolicy()
  },
  { immediate: true },
)
watch(policy, () => {
  void loadBindings()
})
watch(
  () => snapshot.value?.formalSessionActive,
  (active) => {
    if (active && policy.value?.policyStatus !== GradingExperienceAssistPolicyStatusCode.FROZEN) {
      void loadPolicy()
    }
  },
)
</script>

<style lang="scss" scoped>
.experience-assist-policy__alert {
  margin-bottom: var(--dp-space-3);
}

.experience-assist-policy__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
  width: 100%;
}

.experience-assist-policy__head-main {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  min-width: 0;
}

.experience-assist-policy__head-actions {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  margin-left: auto;
  flex-shrink: 0;
}

.experience-assist-policy__title {
  margin: 0;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}

.experience-assist-policy__hint {
  margin: 0 0 var(--dp-space-3);
  color: var(--dp-gray-600);
  font-size: var(--dp-font-size-sm);
}

.experience-assist-policy__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dp-space-3);
  margin: 0;

  dt {
    margin: 0;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-gray-500);
  }

  dd {
    margin: var(--dp-space-1) 0 0;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }
}

.experience-assist-policy__bindings {
  margin-top: var(--dp-space-4);
}

.experience-assist-policy__binding-filter {
  margin-bottom: var(--dp-space-3);
}

.experience-assist-policy__row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}
</style>
