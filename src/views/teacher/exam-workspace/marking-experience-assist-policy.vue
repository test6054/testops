<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="经验辅助评阅" :subtitle="pageSubtitle" />
    </template>

    <ExamWorkspaceJourneySubNav />

    <UiEmpty v-if="!examId" description="缺少考试上下文" />
    <UiSkeletonState v-else-if="loading" variant="card" :card-count="2" compact />
    <template v-else>
      <UiAlertStrip
        v-if="policy?.policyStatus === 'FROZEN'"
        tone="warning"
        title="本场定标策略已冻结"
        description="正评任务已生成，不能再变更启用状态或题目绑定；已生效的定标经验仍会在 AI 复评中引用。"
        dense
        class="experience-assist-policy__alert"
      />
      <UiAlertStrip
        v-else-if="baselineMissingCount > 0 && !policy?.enabled"
        tone="warning"
        title="标答评分基线未锁定"
        :description="`共 ${baselineMissingCount} 道主观题须先在「标答与评分基线」确认生效，再启用经验辅助评阅。`"
        dense
        class="experience-assist-policy__alert"
      />
      <UiAlertStrip
        v-else-if="requiresExplicitBinding && unboundSubjectiveCount > 0 && !policy?.enabled"
        tone="warning"
        title="尚有主观题未完成定标绑定"
        :description="`共 ${unboundSubjectiveCount} 道主观题待绑定，完成后方可启用本场经验辅助评阅。`"
        dense
        class="experience-assist-policy__alert"
      />
      <UiAlertStrip
        v-else-if="!requiresExplicitBinding && needsExplicitBindingCount > 0 && policy?.enabled"
        tone="warning"
        title="部分主观题无法自动匹配定标"
        :description="`共 ${needsExplicitBindingCount} 道非相似题须显式绑定定标经验，否则正评前无法生成任务。`"
        dense
        class="experience-assist-policy__alert"
      />
      <UiAlertStrip
        v-else-if="requiresExplicitBinding"
        tone="info"
        title="本场须逐题显式定标"
        :description="explicitBindingHint"
        dense
        class="experience-assist-policy__alert"
      />

      <WorkbenchSurfaceCard>
        <template #head>
          <div class="experience-assist-policy__head">
            <h3 class="experience-assist-policy__title">本场策略</h3>
            <UiTag :tone="policyTone" size="sm">{{ policyStatusLabel }}</UiTag>
          </div>
        </template>

        <p v-if="!policy?.tenantExperienceAssistEnabled" class="experience-assist-policy__hint">
          租户未启用经验辅助评阅，请联系教务管理员在「租户阅卷策略」中开启后再回到本页配置。
        </p>
        <dl v-else class="experience-assist-policy__meta">
          <div><dt>一致率阈值</dt><dd>{{ formatRate(policy?.effectiveMinConsistencyRate) }}</dd></div>
          <div><dt>签名距离上限</dt><dd>{{ policy?.effectiveMaxHammingDistance ?? '—' }}</dd></div>
          <div><dt>经验条目上限</dt><dd>{{ policy?.effectiveMaxExperienceItems ?? '—' }}</dd></div>
        </dl>

        <div class="experience-assist-policy__actions">
          <p
            v-if="policy?.tenantExperienceAssistEnabled && unresolvedSubjectiveCount > 0"
            class="experience-assist-policy__hint"
          >
            <template v-if="baselineMissingCount > 0">
              尚有 {{ baselineMissingCount }} 道主观题标答基线未锁定，请先在「标答与评分基线」确认生效。
            </template>
            <template v-else-if="requiresExplicitBinding">
              尚有 {{ unboundSubjectiveCount }} 道主观题未绑定，完成全部绑定后可启用本场。
            </template>
            <template v-else>
              尚有 {{ needsExplicitBindingCount }} 道主观题无法自动匹配，须显式绑定定标经验后方可启用。
            </template>
          </p>
          <UiButton
            size="sm"
            :disabled="!canEnable || policy?.enabled"
            :loading="saving"
            @click="handleEnable"
          >
            启用本场
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!canDisable"
            :loading="saving"
            @click="handleDisable"
          >
            禁用本场
          </UiButton>
        </div>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard v-if="policy?.tenantExperienceAssistEnabled" class="experience-assist-policy__bindings">
        <template #head>
          <h3 class="experience-assist-policy__title">题目定标绑定</h3>
        </template>
        <p class="experience-assist-policy__hint">
          {{ bindingGuideText }}
        </p>
        <UiDataTable
          pagination-mode="client"
          :columns="bindingColumns"
          :data-source="bindings"
          :loading="bindingsLoading"
          flat
          row-key="layoutQuestionId"
          size="small"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'baselineReady'">
              <UiTag
                :tone="bindings[index].baselineReady ? 'green' : 'red'"
                size="sm"
              >
                {{ bindings[index].baselineReady ? '已锁定' : '未锁定' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'assistResolutionStatus'">
              <UiTag
                v-if="bindings[index].assistResolutionStatus"
                :tone="resolutionTone(bindings[index].assistResolutionStatus)"
                size="sm"
              >
                {{ resolutionLabel(bindings[index].assistResolutionStatus, bindings[index]) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'consistencyRate'">
              {{ formatRate(bindings[index].consistencyRate) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="experience-assist-policy__row-actions">
                <UiTextAction
                  :disabled="policy?.policyStatus === 'FROZEN'"
                  @click="openBindingModal(bindings[index])"
                >
                  {{ bindings[index].experienceCaseId ? '更换' : '绑定' }}
                </UiTextAction>
                <UiTextAction
                  v-if="bindings[index].experienceCaseId"
                  tone="danger"
                  :disabled="policy?.policyStatus === 'FROZEN' || unbindingQuestionId === bindings[index].layoutQuestionId"
                  @click="confirmUnbind(bindings[index])"
                >
                  解除绑定
                </UiTextAction>
              </div>
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
      @saved="handleBindingSaved"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamGradingExperienceAssistPolicyVO,
  ExamQuestionExperienceAssistBindingVO,
  GradingExperienceAssistReadinessVO,
} from '@/apis/mark/grading-experience-assist'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import {
  disableExamGradingExperienceAssistPolicy,
  enableExamGradingExperienceAssistPolicy,
  getExamGradingExperienceAssistPolicy,
  getExamGradingExperienceAssistReadiness,
  listExamExperienceAssistBindings,
  saveExamExperienceAssistBinding,
} from '@/apis/mark/grading-experience-assist'
import QuestionExperienceAssistBindingModal from '@/components/mark/QuestionExperienceAssistBindingModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkWorkbenchContext, useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { ExamKindDescription } from '@/types/enums/exam-kind-enum'
import {
  GradingExperienceAssistQuestionResolutionCode,
  GradingExperienceAssistQuestionResolutionDescription,
  GradingExperienceAssistQuestionResolutionTone,
  isGradingExperienceAssistQuestionReady,
} from '@/types/enums/grading-experience-assist-question-resolution-enum'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'TeacherExamWorkspaceMarkingExperienceAssistPolicy' })

const { examId } = useWorkspaceExamId()
const { snapshot, refreshSnapshot } = useMarkWorkbenchContext()
const loading = ref(false)
const saving = ref(false)
const bindingsLoading = ref(false)
const unbindingQuestionId = ref<string>()
const policy = ref<ExamGradingExperienceAssistPolicyVO | null>(null)
const readiness = ref<GradingExperienceAssistReadinessVO | null>(null)
const bindings = ref<ExamQuestionExperienceAssistBindingVO[]>([])
const bindingModalOpen = ref(false)
const bindingTarget = ref<ExamQuestionExperienceAssistBindingVO | null>(null)

const bindingColumns: ColumnType<ExamQuestionExperienceAssistBindingVO>[] = [
  { title: '题号', key: 'questionNo', dataIndex: 'questionNo', width: 80 },
  { title: '标答基线', key: 'baselineReady', width: 96 },
  { title: '定标状态', key: 'assistResolutionStatus', width: 108 },
  { title: '来源考试', key: 'sourceExamName', dataIndex: 'sourceExamName', width: 160 },
  { title: '经验摘要', key: 'experienceSummary', dataIndex: 'experienceSummary', width: 280 },
  { title: '一致率', key: 'consistencyRate', width: 88 },
  { title: '绑定时间', key: 'boundTime', width: 140 },
  { title: '操作', key: 'actions', width: 128, fixed: 'right' },
]

const requiresExplicitBinding = computed(() => policy.value?.autoMatchSupported === false)

const examKindLabel = computed(() => {
  const kind = policy.value?.examKind
  if (!kind) return '本场考试'
  return ExamKindDescription[kind]
})

const pageSubtitle = computed(() => {
  if (requiresExplicitBinding.value) {
    return `${examKindLabel.value}须在试评完成后、正评任务生成前完成逐题定标；正评启动后自动冻结`
  }
  return '试评完成后定标，正考同课相似题可自动匹配；正评任务生成后自动冻结'
})

const explicitBindingHint = computed(() =>
  `${examKindLabel.value}不支持相似题自动匹配。请为每道主观题绑定历史正考定标经验后再启用本场。`,
)

const bindingGuideText = computed(() => {
  if (requiresExplicitBinding.value) {
    return '补考/重修/缓考/重考须先锁定标答基线，再为每道主观题显式绑定历史期末考试正考经验，全部就绪后再启用本场。'
  }
  return '正考须先锁定标答基线；同课程相似题可自动匹配，非相似题须显式绑定。列表以本场主观题为准。'
})

const policyStatusLabel = computed(() => {
  const status = policy.value?.policyStatus
  if (status === 'FROZEN') return '已冻结'
  if (policy.value?.enabled) return '已启用'
  return '未启用'
})

const policyTone = computed((): BadgeTone => {
  if (policy.value?.policyStatus === 'FROZEN') return 'gray'
  return policy.value?.enabled ? 'green' : 'orange'
})

const canEnable = computed(() =>
  Boolean(
    policy.value?.tenantExperienceAssistEnabled
    && policy.value?.policyStatus !== 'FROZEN'
    && !bindingsLoading.value
    && unresolvedSubjectiveCount.value === 0,
  ),
)

const canDisable = computed(() =>
  Boolean(policy.value?.enabled && policy.value?.policyStatus !== 'FROZEN'),
)

const baselineMissingCount = computed(() =>
  readiness.value?.baselineMissingCount
  ?? bindings.value.filter((row) => row.baselineReady === false).length,
)

const unboundSubjectiveCount = computed(() =>
  readiness.value?.assistUnresolvedCount
  ?? bindings.value.filter((row) =>
    row.assistResolutionStatus === GradingExperienceAssistQuestionResolutionCode.NEEDS_EXPLICIT_BINDING,
  ).length,
)

const unresolvedSubjectiveCount = computed(() => {
  if (readiness.value) {
    return (readiness.value.baselineMissingCount ?? 0) + (readiness.value.assistUnresolvedCount ?? 0)
  }
  return bindings.value.filter((row) => !isGradingExperienceAssistQuestionReady(row.assistResolutionStatus)).length
})

const needsExplicitBindingCount = unboundSubjectiveCount

function resolutionLabel(
  status?: GradingExperienceAssistQuestionResolutionCode,
  row?: ExamQuestionExperienceAssistBindingVO,
): string {
  if (!status) return '—'
  if (
    status === GradingExperienceAssistQuestionResolutionCode.NEEDS_EXPLICIT_BINDING
    && row?.experienceCaseId
  ) {
    return '定标引用失效'
  }
  return GradingExperienceAssistQuestionResolutionDescription[status]
}

function resolutionTone(status?: GradingExperienceAssistQuestionResolutionCode) {
  if (!status) return 'gray' as const
  return GradingExperienceAssistQuestionResolutionTone[status]
}

function formatRate(rate?: number): string {
  if (rate == null) return '—'
  return `${Math.round(rate * 1000) / 10}%`
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
    bindings.value = []
    readiness.value = null
    return
  }
  bindingsLoading.value = true
  try {
    const [bindingRows, readinessRow] = await Promise.all([
      listExamExperienceAssistBindings(examId.value),
      getExamGradingExperienceAssistReadiness(examId.value),
    ])
    bindings.value = bindingRows
    readiness.value = readinessRow
    await syncWorkbenchPendingTodos()
  } catch (error) {
    bindings.value = []
    readiness.value = null
    showUserError(error, '加载题目绑定失败')
  } finally {
    bindingsLoading.value = false
  }
}

async function handleEnable(): Promise<void> {
  if (!examId.value) return
  saving.value = true
  try {
    policy.value = await enableExamGradingExperienceAssistPolicy(examId.value)
    await loadBindings()
    message.success('已启用本场经验辅助评阅')
  } catch (error) {
    showUserError(error, '启用失败')
  } finally {
    saving.value = false
  }
}

async function handleDisable(): Promise<void> {
  if (!examId.value) return
  saving.value = true
  try {
    policy.value = await disableExamGradingExperienceAssistPolicy(examId.value)
    await loadBindings()
    await syncWorkbenchPendingTodos()
    message.success('已禁用本场经验辅助评阅')
  } catch (error) {
    showUserError(error, '禁用失败')
  } finally {
    saving.value = false
  }
}

function openBindingModal(row: ExamQuestionExperienceAssistBindingVO): void {
  bindingTarget.value = row
  bindingModalOpen.value = true
}

function confirmUnbind(row: ExamQuestionExperienceAssistBindingVO): void {
  if (!examId.value || policy.value?.policyStatus === 'FROZEN') return
  void confirmAsync({
    title: '解除题目定标绑定？',
    content: `题号 ${row.questionNo ?? row.layoutQuestionId} 将不再引用显式定标经验。`,
    type: 'warning',
    okText: '解除绑定',
    cancelText: '取消',
    onOk: () => handleUnbind(row),
  })
}

async function handleUnbind(row: ExamQuestionExperienceAssistBindingVO): Promise<void> {
  if (!examId.value) return
  unbindingQuestionId.value = row.layoutQuestionId
  try {
    await saveExamExperienceAssistBinding({
      examId: examId.value,
      layoutQuestionId: row.layoutQuestionId,
    })
    message.success('题目定标已解除')
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

watch(examId, () => {
  void loadPolicy()
}, { immediate: true })
watch(policy, () => {
  void loadBindings()
})
watch(
  () => snapshot.value?.formalSessionActive,
  (active) => {
    if (active && policy.value?.policyStatus !== 'FROZEN') {
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
  gap: var(--dp-space-2);
}

.experience-assist-policy__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.experience-assist-policy__hint {
  margin: 0 0 var(--dp-space-3);
  color: var(--dp-gray-600);
  font-size: 13px;
}

.experience-assist-policy__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dp-space-3);
  margin: 0 0 var(--dp-space-4);

  dt {
    margin: 0;
    font-size: 12px;
    color: var(--dp-gray-500);
  }

  dd {
    margin: var(--dp-space-1) 0 0;
    font-size: 14px;
    font-weight: 600;
  }
}

.experience-assist-policy__actions {
  display: flex;
  gap: var(--dp-space-2);
}

.experience-assist-policy__bindings {
  margin-top: var(--dp-space-4);
}

.experience-assist-policy__row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}
</style>
