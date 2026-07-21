<template>
  <UiDialog
    :open="open"
    :title="dialogTitle"
    :confirm-loading="submitting"
    :width="720"
    ok-text="保存并生效"
    cancel-text="取消"
    destroy-on-close
    @ok="handleSubmit"
    @cancel="emit('close')"
  >
    <UiSpin :spinning="loading">
      <div class="question-answer-correction">
        <UiAlertStrip
          v-if="question"
          tone="info"
          dense
          :title="questionSummary"
          :description="
            question.questionStem?.trim()
              || '提交后会立即更新当前生效标准答案；已有确认成绩时将进入重判计划判定链。'
          "
          class="question-answer-correction__strip"
        />
        <UiAlertStrip
          v-if="effectiveConfigSummary"
          tone="warning"
          dense
          title="当前已有生效答案配置"
          :description="effectiveConfigSummary"
          class="question-answer-correction__strip"
        />

        <UiForm layout="vertical">
          <UiFormItem v-if="isObjectiveQuestion" label="比较策略" required>
            <UiSelect
              size="sm"
              v-model="form.comparePolicy"
              :options="OBJECTIVE_COMPARE_POLICY_OPTIONS"
              placeholder="请选择客观题比较策略"
            />
          </UiFormItem>

          <template v-if="showChoiceSetFields">
            <UiFormItem label="声明选项" required>
              <UiInput size="sm" v-model="form.declaredOptionsText" placeholder="A,B,C,D" />
            </UiFormItem>
            <UiFormItem label="正确选项" required>
              <UiInput size="sm" v-model="form.choiceOptionsText" placeholder="A 或 A,C" />
            </UiFormItem>
          </template>

          <template v-else-if="showNumericFields">
            <UiFormItem label="数值标准值" required>
              <UiInputNumber
                size="sm"
                v-model="form.numericExpectedValue"
                :min="0.000001"
                :step="0.1"
                style="width: 100%"
                placeholder="请输入标准值"
              />
            </UiFormItem>
            <UiFormItem label="允许误差">
              <UiInputNumber
                size="sm"
                v-model="form.numericTolerance"
                :min="0"
                :step="0.1"
                style="width: 100%"
                placeholder="允许误差可为空"
              />
            </UiFormItem>
            <UiFormItem label="单位">
              <UiInput size="sm" v-model="form.numericUnit" placeholder="例如 V、kg、m/s" />
            </UiFormItem>
          </template>

          <UiFormItem
            v-if="showStandardAnswerInput"
            label="标准答案"
            :required="requireStandardAnswer"
          >
            <UiTextarea
              size="sm"
              v-model="form.standardAnswer"
              :rows="3"
              placeholder="请输入标准答案"
            />
          </UiFormItem>

          <UiFormItem label="答案解析">
            <UiTextarea
              size="sm"
              v-model="form.answerExplain"
              :rows="3"
              placeholder="可选，供教师与质量分析回看"
            />
          </UiFormItem>

          <UiFormItem label="评分细则">
            <UiTextarea
              size="sm"
              v-model="form.gradingRubric"
              :rows="4"
              placeholder="AI 评分或主观题可补充评分依据"
            />
          </UiFormItem>

          <UiFormItem label="AI 评分提示">
            <UiTextarea
              size="sm"
              v-model="form.aiHint"
              :rows="3"
              placeholder="可选，供 AI 识别或评分链路参考"
            />
          </UiFormItem>
        </UiForm>
      </div>
    </UiSpin>
  </UiDialog>
</template>

<script lang="ts" setup>
import type {
  ExamQuestionDeclaredOptionRequest,
  ExamStandardAnswerResponse,
  ObjectiveComparePolicyCode,
} from '@/apis/mark/exam-standard-answer'
import type {
  AnswerEffectiveCorrectionRequest,
  ExamAnswerEffectiveConfig,
  ExamQuestionAnalysisRecordResponse,
} from '@/apis/mark/question-analysis'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  getStandardAnswer,
  OBJECTIVE_COMPARE_POLICY_OPTIONS,
  ObjectiveComparePolicyCode as ObjectiveComparePolicy,
  ObjectiveComparePolicyDescription,
} from '@/apis/mark/exam-standard-answer'
import {
  correctAnswerAndConfirmEffective,
  getEffectiveAnswerConfig,
} from '@/apis/mark/question-analysis'
import { QuestionTypeCode, QuestionTypeDescription } from '@/apis/mark/question-type'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'QuestionAnswerCorrectionDialog' })

const props = defineProps<{
  open: boolean
  examId: string
  question: Pick<
    ExamQuestionAnalysisRecordResponse,
    'layoutQuestionId' | 'questionNo' | 'questionType' | 'questionStem' | 'fullScore'
  > | null
  /**
   * MVR-372：与 BE canManageReviewerWrites / requireActiveExam 同源。
   * 仅认 ===true；禁止缺声明默认放行。
   */
  canManageReviewerWrites?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'corrected'): void
}>()

interface CorrectionFormState {
  comparePolicy?: ObjectiveComparePolicyCode
  standardAnswer: string
  declaredOptionsText: string
  choiceOptionsText: string
  answerExplain: string
  numericExpectedValue?: number
  numericTolerance?: number
  numericUnit: string
  gradingRubric: string
  aiHint: string
}

const loading = ref(false)
const submitting = ref(false)
const effectiveConfig = ref<ExamAnswerEffectiveConfig | null>(null)
const form = reactive<CorrectionFormState>({
  comparePolicy: undefined,
  standardAnswer: '',
  declaredOptionsText: '',
  choiceOptionsText: '',
  answerExplain: '',
  numericExpectedValue: undefined,
  numericTolerance: undefined,
  numericUnit: '',
  gradingRubric: '',
  aiHint: '',
})

let loadSequence = 0

const dialogTitle = computed(() =>
  props.question ? `修正题 ${props.question.questionNo} 答案并生效` : '修正答案并生效',
)

const isObjectiveQuestion = computed(
  () => props.question?.questionType === QuestionTypeCode.OBJECTIVE,
)

const showChoiceSetFields = computed(() => form.comparePolicy === ObjectiveComparePolicy.CHOICE_SET)

const showNumericFields = computed(
  () => form.comparePolicy === ObjectiveComparePolicy.NUMERIC_TOLERANCE,
)

const showStandardAnswerInput = computed(() => {
  if (!props.question) {
    return false
  }
  if (!isObjectiveQuestion.value) {
    return true
  }
  return (
    form.comparePolicy !== undefined
    && form.comparePolicy !== ObjectiveComparePolicy.CHOICE_SET
    && form.comparePolicy !== ObjectiveComparePolicy.NUMERIC_TOLERANCE
    && form.comparePolicy !== ObjectiveComparePolicy.AI_GRADE
  )
})

const requireStandardAnswer = computed(() => {
  if (!showStandardAnswerInput.value) {
    return false
  }
  return !isObjectiveQuestion.value || form.comparePolicy !== ObjectiveComparePolicy.AI_GRADE
})

const questionSummary = computed(() => {
  if (!props.question) {
    return ''
  }
  return `题 ${props.question.questionNo} · ${questionTypeLabel(props.question.questionType)} · ${formatFullScore(props.question.fullScore)} 分`
})

const effectiveConfigSummary = computed(() => {
  if (!effectiveConfig.value) {
    return ''
  }
  const pieces = [`当前策略：${comparePolicyLabel(effectiveConfig.value.comparePolicy)}`]
  if (effectiveConfig.value.confirmedTime) {
    pieces.push(`确认时间：${formatDateTime(effectiveConfig.value.confirmedTime)}`)
  }
  return pieces.join('；')
})

watch(
  () => [props.open, props.examId, props.question?.layoutQuestionId] as const,
  async ([open, examId, layoutQuestionId]) => {
    if (!open || !examId || !layoutQuestionId) {
      return
    }
    const currentLoad = ++loadSequence
    loading.value = true
    try {
      const answer = await getStandardAnswer({ examId, layoutQuestionId })
      if (currentLoad !== loadSequence) {
        return
      }
      applyAnswerToForm(answer)
      try {
        effectiveConfig.value = await getEffectiveAnswerConfig({ examId, layoutQuestionId })
      } catch (error) {
        if (currentLoad !== loadSequence) {
          return
        }
        effectiveConfig.value = null
        showUserError(error, '题目答案生效配置加载失败')
      }
    } catch (error) {
      if (currentLoad !== loadSequence) {
        return
      }
      effectiveConfig.value = null
      resetForm()
      showUserError(error, '题目标准答案加载失败')
    } finally {
      if (currentLoad === loadSequence) {
        loading.value = false
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.open,
  (open) => {
    if (open) {
      return
    }
    loadSequence += 1
    loading.value = false
    submitting.value = false
    effectiveConfig.value = null
    resetForm()
  },
)

function resetForm(): void {
  form.comparePolicy = undefined
  form.standardAnswer = ''
  form.declaredOptionsText = ''
  form.choiceOptionsText = ''
  form.answerExplain = ''
  form.numericExpectedValue = undefined
  form.numericTolerance = undefined
  form.numericUnit = ''
  form.gradingRubric = ''
  form.aiHint = ''
}

function applyAnswerToForm(answer: ExamStandardAnswerResponse | null): void {
  resetForm()
  if (!answer) {
    return
  }
  form.comparePolicy = answer.comparePolicy
  form.standardAnswer = answer.standardAnswer ?? ''
  form.declaredOptionsText = formatOptions(answer.declaredOptions)
  form.choiceOptionsText = formatOptions(answer.choiceOptions)
  form.answerExplain = answer.answerExplain ?? ''
  form.numericExpectedValue = answer.numericExpectedValue ?? undefined
  form.numericTolerance = answer.numericTolerance ?? undefined
  form.numericUnit = answer.numericUnit ?? ''
  form.gradingRubric = answer.gradingRubric ?? ''
  form.aiHint = answer.aiHint ?? ''
}

function formatOptions(options?: Array<{ optionLabel: string, sortNo: number }>): string {
  return (options ?? [])
    .slice()
    .sort((left, right) => left.sortNo - right.sortNo)
    .map((item) => item.optionLabel)
    .join(',')
}

function parseOptions(text: string): ExamQuestionDeclaredOptionRequest[] | undefined {
  const values = text
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (!values.length) {
    return undefined
  }
  return values.map((optionLabel, index) => ({
    optionLabel,
    sortNo: index + 1,
  }))
}

function trimToUndefined(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed || undefined
}

function validateForm(): boolean {
  if (!props.question) {
    showUserError(null, '缺少题目上下文，无法修正答案')
    return false
  }
  if (isObjectiveQuestion.value && !form.comparePolicy) {
    showUserError(null, '客观题必须选择比较策略')
    return false
  }
  if (showChoiceSetFields.value) {
    if (!trimToUndefined(form.declaredOptionsText)) {
      showUserError(null, '当前策略必须填写声明选项')
      return false
    }
    if (!trimToUndefined(form.choiceOptionsText)) {
      showUserError(null, '当前策略必须填写正确选项')
      return false
    }
  }
  if (showNumericFields.value && form.numericExpectedValue == null) {
    showUserError(null, '数值题必须填写标准值')
    return false
  }
  if (
    form.comparePolicy === ObjectiveComparePolicy.AI_GRADE
    && !trimToUndefined(form.gradingRubric)
  ) {
    showFormValidationMessage('智能评分策略必须填写评分细则')
    return false
  }
  if (requireStandardAnswer.value && !trimToUndefined(form.standardAnswer)) {
    showUserError(null, '请填写标准答案')
    return false
  }
  return true
}

async function handleSubmit(): Promise<void> {
  if (submitting.value) {
    return
  }
  // MVR-372：写 handler 二次拦截；父卡仅隐藏入口不能替代
  if (props.canManageReviewerWrites !== true) {
    showUserError(null, '仅本场阅卷组织成员或主考可修正答案并生效')
    return
  }
  if (!props.question || !validateForm()) {
    return
  }
  const request: AnswerEffectiveCorrectionRequest = {
    examId: props.examId,
    layoutQuestionId: props.question.layoutQuestionId,
    standardAnswer: trimToUndefined(form.standardAnswer),
    declaredOptions: showChoiceSetFields.value ? parseOptions(form.declaredOptionsText) : undefined,
    choiceOptions: showChoiceSetFields.value ? parseOptions(form.choiceOptionsText) : undefined,
    answerExplain: trimToUndefined(form.answerExplain),
    comparePolicy: isObjectiveQuestion.value ? form.comparePolicy : undefined,
    numericExpectedValue: showNumericFields.value ? form.numericExpectedValue : undefined,
    numericTolerance: showNumericFields.value ? form.numericTolerance : undefined,
    numericUnit: showNumericFields.value ? trimToUndefined(form.numericUnit) : undefined,
    gradingRubric: trimToUndefined(form.gradingRubric),
    aiHint: trimToUndefined(form.aiHint),
  }
  submitting.value = true
  try {
    await correctAnswerAndConfirmEffective(request)
    void message.success('标准答案已修正并生效')
    emit('corrected')
    emit('close')
  } catch (error) {
    showUserError(error, '标准答案修正失败')
  } finally {
    submitting.value = false
  }
}

function questionTypeLabel(code: ExamQuestionAnalysisRecordResponse['questionType']): string {
  return strictEnumLabel(QuestionTypeDescription, code, '题型')
}

function comparePolicyLabel(code?: ObjectiveComparePolicyCode): string {
  if (!code) {
    return '未配置'
  }
  return strictEnumLabel(ObjectiveComparePolicyDescription, code, '客观题比较策略')
}

function formatFullScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1)
}
</script>

<style scoped lang="scss">
.question-answer-correction {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);

  &__strip {
    margin-bottom: 0;
  }
}
</style>
