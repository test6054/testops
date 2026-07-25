<template>
  <UiDialog
    :open="open"
    title="题目定标绑定"
    :width="640"
    :confirm-loading="saving"
    ok-text="保存绑定"
    @update:open="emit('update:open', $event)"
    @ok="handleSave"
    @cancel="emit('update:open', false)"
  >
    <p v-if="questionNo" class="binding-modal__meta">题号 {{ questionNo }}</p>
    <UiSkeletonState v-if="loading" variant="card" :card-count="1" compact />
    <UiEmpty
      v-else-if="candidates.length === 0"
      size="sm"
      description="暂无可用定标案例，请先完成有效性评估"
    />
    <div v-else class="binding-modal__list">
      <label v-for="item in candidates" :key="item.effectivenessEvalId" class="binding-modal__item">
        <input
          v-model="selectedEvalId"
          type="radio"
          name="binding-candidate"
          :value="item.effectivenessEvalId"
        />
        <div class="binding-modal__item-body">
          <div class="binding-modal__item-head">
            <span>{{ item.sourceExamName ?? item.sourceExamNo ?? '历史考试' }}</span>
            <UiTag v-if="item.recommendation" size="sm" tone="blue">{{
              recommendationLabel(item.recommendation)
            }}</UiTag>
          </div>
          <p class="binding-modal__summary">{{ item.experienceSummary ?? '—' }}</p>
          <span v-if="item.consistencyRate != null" class="binding-modal__rate">
            一致率 {{ formatRate(item.consistencyRate) }}
          </span>
        </div>
      </label>
    </div>
  </UiDialog>
</template>

<script lang="ts" setup>
import type { GradingExperienceAssistCandidateResponse } from '@/apis/mark/grading-experience-assist'
import type { ExperienceRecommendationCode } from '@/types/enums/experience-recommendation-enum'
import message from 'ant-design-vue/es/message'
import { ref, watch } from 'vue'
import {
  listExamExperienceAssistCandidates,
  saveExamExperienceAssistBinding,
} from '@/apis/mark/grading-experience-assist'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { ExperienceRecommendationDescription } from '@/types/enums/experience-recommendation-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'QuestionExperienceAssistBindingModal' })

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
  examId?: string
  layoutQuestionId?: string
  questionNo?: string
  /**
   * MVR-372：绑定与 canManageReviewerWrites（评阅写∧ACTIVE）同源。
   * 仅认 true；禁止缺声明默认放行。
   */
  canManageReviewerWrites?: boolean // MVR-940: optional BE 能力位写路径仅认 === true
  /**
   * MVR-931：正评冻结后禁止绑定写；仅认 true。
   */
  policyFrozen?: boolean
}>(),
  {
  canManageReviewerWrites: false,
  policyFrozen: false,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved'): void
}>()

const loading = ref(false)
const saving = ref(false)
const candidates = ref<GradingExperienceAssistCandidateResponse[]>([])
const selectedEvalId = ref<string>()

function formatRate(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`
}

function recommendationLabel(code: ExperienceRecommendationCode): string {
  return strictEnumLabel(ExperienceRecommendationDescription, code, '经验推荐')
}

async function loadCandidates(): Promise<void> {
  if (!props.examId || !props.layoutQuestionId) {
    candidates.value = []
    return
  }
  loading.value = true
  try {
    candidates.value = await listExamExperienceAssistCandidates(
      props.examId,
      props.layoutQuestionId,
    )
    selectedEvalId.value = candidates.value[0]?.effectivenessEvalId
  } catch (error) {
    candidates.value = []
    showUserError(error, '加载定标候选失败')
  } finally {
    loading.value = false
  }
}

async function handleSave(): Promise<void> {
  if (!props.examId || !props.layoutQuestionId || saving.value === true) return
  // MVR-372/931：写 handler 二次拦截；策略页仅隐藏入口不能替代
  if (props.policyFrozen === true) {
    void message.warning('经验辅助评阅策略已冻结，不可绑定题目定标')
    return
  }
  if (props.canManageReviewerWrites !== true) {
    void message.warning('仅本场阅卷组织成员或主考可绑定定标经验')
    return
  }
  const selected = candidates.value.find(
    (item) => item.effectivenessEvalId === selectedEvalId.value,
  )
  if (!selected) {
    void message.warning('请选择定标案例')
    return
  }
  saving.value = true
  try {
    await saveExamExperienceAssistBinding({
      examId: props.examId,
      layoutQuestionId: props.layoutQuestionId,
      experienceCaseId: selected.experienceCaseId,
      effectivenessEvalId: selected.effectivenessEvalId,
    })
    void message.success('题目定标已保存')
    open.value = false
    emit('saved')
  } catch (error) {
    showUserError(error, '保存绑定失败')
  } finally {
    saving.value = false
  }
}

watch(
  () => [open.value, props.examId, props.layoutQuestionId] as const,
  ([visible]) => {
    if (visible) void loadCandidates()
  },
)
</script>

<style lang="scss" scoped>
.binding-modal__meta {
  margin: 0 0 var(--dp-space-3);
  font-size: 13px;
  color: var(--dp-gray-600);
}

.binding-modal__list {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2);
  max-height: 360px;
  overflow: auto;
}

.binding-modal__item {
  display: flex;
  gap: var(--dp-space-2);
  padding: var(--dp-space-3);
  border: 1px solid var(--dp-gray-200);
  border-radius: 6px;
  cursor: pointer;

  &:has(input:checked) {
    border-color: var(--dp-primary-500);
    background: var(--dp-primary-50);
  }
}

.binding-modal__item-body {
  flex: 1;
  min-width: 0;
}

.binding-modal__item-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  font-size: 13px;
  font-weight: 600;
}

.binding-modal__summary {
  margin: var(--dp-space-1) 0 0;
  font-size: 13px;
  color: var(--dp-gray-700);
}

.binding-modal__rate {
  display: inline-block;
  margin-top: var(--dp-space-1);
  font-size: 12px;
  color: var(--dp-gray-500);
}
</style>
