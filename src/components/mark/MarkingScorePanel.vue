<template>
  <UiCard class="marking-score-panel info-card">
    <template #title>
      <EditOutlined />
      <span>{{ usesWholePaperWorkspace ? '当前任务负责题目' : '批改提交' }}</span>
    </template>

    <UiForm
      ref="innerFormRef"
      :model="{ score: scoreModel, annotationNote: annotationNoteModel, reviewSuggestion: reviewSuggestionModel }"
      :rules="rules"
      layout="vertical"
      :disabled="!canSubmit"
    >
      <template v-if="usesWholePaperWorkspace">
        <UiEmpty size="sm" v-if="wholeQuestions.length === 0" description="当前任务暂无负责题目" />
        <UiCollapse
          v-else
          v-model:active-key="expandedWholeQuestionKeyModel"
          accordion
          class="marking-score-panel__accordion"
          expand-icon-position="end"
        >
          <UiCollapsePanel
            v-for="(question, questionIndex) in wholeQuestions"
            :key="question.layoutQuestionId"
          >
            <template #header>
              <div class="marking-score-panel__question-header">
                <UiTag tone="blue" size="sm">第 {{ question.questionNo }} 题</UiTag>
                <UiTag tone="gray" size="sm">{{ question.questionTypeMessage }}</UiTag>
                <UiTag tone="green" size="sm">满分 {{ question.fullScore }}</UiTag>
                <UiTag
                  v-if="isWholeQuestionScored(question.layoutQuestionId)"
                  tone="green"
                  size="sm"
                >
                  已给 {{ getWholeQuestionForm(question.layoutQuestionId).score }} 分
                </UiTag>
                <UiTag v-else tone="orange" size="sm">待评分</UiTag>
                <UiButton
                  size="sm"
                  variant="outline"
                  :disabled="!question.pageId"
                  @click.stop="emit('focus-page', question)"
                >
                  定位答题页
                </UiButton>
              </div>
            </template>
            <UiTypographyParagraph
              v-if="question.questionStem"
              class="marking-score-panel__question-stem"
              :ellipsis="{ rows: 3, expandable: true, symbol: '展开' }"
            >
              {{ question.questionStem }}
            </UiTypographyParagraph>
            <UiTypographyParagraph
              v-if="question.recognizedAnswer"
              class="marking-score-panel__recognized-answer"
              :ellipsis="{ rows: 3, expandable: true, symbol: '展开' }"
            >
              {{ question.recognizedAnswer }}
            </UiTypographyParagraph>
            <UiTypographyText
              v-else
              type="secondary"
              class="marking-score-panel__recognized-answer--empty"
            >
              正式 OCR 未识别出可展示答案
            </UiTypographyText>
            <UiInputNumber
              size="sm"
              v-model="getWholeQuestionForm(question.layoutQuestionId).score"
              :ref="(el: unknown) => emit('set-score-input-ref', el, questionIndex)"
              :min="0"
              :max="question.fullScore"
              :step="0.5"
              :disabled="isReadOnly"
              class="marking-score-panel__score-input"
              placeholder="本题给分"
              @keydown.enter.prevent="emit('whole-question-enter', questionIndex)"
            />
            <div v-if="!isReadOnly && canSubmit" class="marking-score-panel__quick-digits">
              <UiButton
                v-for="digit in quickDigitScores(question.fullScore)"
                :key="digit"
                size="sm"
                variant="outline"
                @click="emit('whole-quick-score', question, digit)"
              >
                {{ digit }}
              </UiButton>
            </div>
            <div v-if="question.aiScore != null" class="marking-score-panel__ai">
              <div class="marking-score-panel__ai-text">
                <span>AI 建议分：</span>
                <strong>{{ question.aiScore }}</strong>
                <span>/ {{ question.fullScore }}</span>
              </div>
              <div class="dp-space dp-space--wrap" style="--dp-space-gap: 8px">
                <UiButton
                  size="sm"
                  variant="outline"
                  :disabled="isReadOnly"
                  @click="emit('fill-ai-score', question)"
                >
                  填入 AI 分
                </UiButton>
                <UiButton
                  size="sm"
                  variant="outline"
                  :disabled="isReadOnly || submitting || !canSubmit"
                  @click="emit('accept-ai-score', question, questionIndex)"
                >
                  {{ questionIndex === wholeQuestions.length - 1 ? '采纳并提交' : '采纳并继续' }}
                </UiButton>
                <UiButton
                  size="sm"
                  variant="outline"
                  :disabled="!canRescoreWholeQuestion(question)"
                  :loading="rescoringGradeResultId === question.gradeResultId"
                  @click="emit('rescore-whole', question)"
                >
                  重新 AI 复评
                </UiButton>
                <ExperienceAssistBadge
                  clickable
                  :applied="question.referenceExperienceAudit?.referenceExperienceApplied"
                  :source-exam-name="
                    question.referenceExperienceAudit?.referenceExperienceSourceExamName
                  "
                  :consistency-rate="
                    question.referenceExperienceAudit?.referenceExperienceConsistencyRate
                  "
                  @open-ai-history="emit('open-ai-history-from-whole-question', question)"
                />
                <p
                  v-if="
                    question.referenceExperienceAudit?.referenceExperienceApplied
                      && question.referenceExperienceAudit?.referenceExperienceMatchMode
                  "
                  class="marking-score-panel__match-mode"
                >
                  定标方式：{{
                    matchModeLabel(question.referenceExperienceAudit.referenceExperienceMatchMode)
                  }}
                </p>
              </div>
              <UiTypographyParagraph
                v-if="question.aiDiagnostic"
                class="marking-score-panel__ai-diagnostic"
                :ellipsis="{ rows: 2, expandable: true, symbol: '展开' }"
              >
                {{ question.aiDiagnostic }}
              </UiTypographyParagraph>
            </div>
            <div
              v-else-if="isWholeQuestionAiScorePending(question)"
              class="marking-score-panel__ai-pending"
            >
              <UiTypographyText type="secondary">AI 评分加载中...</UiTypographyText>
            </div>
            <UiTextarea
              size="sm"
              v-model="getWholeQuestionForm(question.layoutQuestionId).annotationText"
              :rows="3"
              :maxlength="1000"
              :disabled="isReadOnly"
              placeholder="题目批注，可选"
              :show-count="true"
            />
            <UiTextarea
              size="sm"
              v-model="getWholeQuestionForm(question.layoutQuestionId).reviewSuggestion"
              :rows="3"
              :maxlength="1000"
              :disabled="isReadOnly"
              placeholder="面向学生的批阅建议，可选"
              :show-count="true"
            />
          </UiCollapsePanel>
        </UiCollapse>
        <p class="marking-score-panel__keyboard-hint">
          Enter 确认本题并展开下一题 · AI 分须手动填入 · 0-9 快捷 · PageUp/Down 翻页 · J/K 切换
        </p>
      </template>

      <MarkScoreTriple
        v-if="!usesWholePaperWorkspace && questionView"
        class="marking-score-panel__score-triple"
        :ai-score="questionView.aiScore"
        :teacher-review-score="scoreModel"
        :full-score="questionView.fullScore"
      />
      <UiFormItem v-if="!usesWholePaperWorkspace" label="教师给分" name="score" required>
        <div class="marking-score-panel__score-row">
          <UiInputNumber
            size="sm"
            ref="innerScoreInputRef"
            v-model="scoreModel"
            :min="0"
            :max="questionView?.fullScore"
            :step="0.5"
            class="marking-score-panel__score-input"
            placeholder="按题目满分给分"
            @keydown.enter.prevent="emit('submit')"
          />
          <span class="marking-score-panel__step-hint">步长 0.5 · 满分 {{ questionView?.fullScore ?? '—' }}</span>
        </div>
        <div class="marking-score-panel__quick-actions dp-space" style="--dp-space-gap: 8px">
          <UiButton
            size="sm"
            variant="outline"
            :disabled="isReadOnly"
            @click="emit('quick-full-score')"
          >
            满分
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="isReadOnly"
            @click="emit('quick-half-score')"
          >
            {{ questionViewHalfScoreLabel }}
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="isReadOnly"
            @click="emit('quick-zero-score')"
          >
            零分
          </UiButton>
          <UiButton
            v-if="questionView?.aiScore != null"
            size="sm"
            variant="outline"
            :disabled="isReadOnly"
            @click="emit('quick-ai-score')"
          >
            填入 AI 分
          </UiButton>
          <span
            v-if="questionView?.aiScore != null"
            class="marking-score-panel__ai-manual-hint"
          >AI 分不自动写入</span>
          <UiButton
            v-if="questionView?.aiScore != null"
            size="sm"
            variant="outline"
            :disabled="isReadOnly || submitting || !canSubmit"
            @click="emit('accept-ai-submit')"
          >
            采纳并提交
          </UiButton>
          <UiButton v-else-if="isQuestionViewAiScorePending" size="sm" variant="outline" disabled>
            AI 评分加载中...
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!canRescoreQuestionView"
            :loading="rescoringGradeResultId === questionView?.gradeResultId"
            @click="emit('rescore-question')"
          >
            重新 AI 复评
          </UiButton>
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="!questionView?.gradeResultId"
            @click="emit('open-ai-history')"
          >
            AI 历史
          </UiButton>
          <ExperienceAssistBadge
            clickable
            :applied="experienceAssistApplied"
            :source-exam-name="experienceAssistSourceExamName"
            :consistency-rate="experienceAssistConsistencyRate"
            @open-ai-history="emit('open-ai-history-from-badge')"
          />
          <p
            v-if="experienceAssistApplied && experienceAssistMatchMode"
            class="marking-score-panel__match-mode"
          >
            定标方式：{{ matchModeLabel(experienceAssistMatchMode) }}
          </p>
        </div>
        <div
          v-if="!isReadOnly && canSubmit && questionView?.fullScore != null"
          class="marking-score-panel__quick-digits"
        >
          <UiButton
            v-for="digit in quickDigitScores(questionView.fullScore)"
            :key="digit"
            size="sm"
            variant="outline"
            @click="emit('quick-digit-score', digit)"
          >
            {{ digit }}
          </UiButton>
        </div>
        <p class="marking-score-panel__keyboard-hint">
          Enter 提交并进入下一未阅 · AI 分须点「填入」或「采纳并提交」· J/K 切换 · 0-9 快捷
        </p>
      </UiFormItem>

      <UiFormItem v-if="!usesWholePaperWorkspace" label="批改批注" name="annotationNote">
        <UiTextarea
          size="sm"
          v-model="annotationNoteModel"
          :rows="6"
          :maxlength="1000"
          placeholder="可选，记录采分点 / 扣分点 / 反馈意见"
          :show-count="true"
        />
      </UiFormItem>
      <UiFormItem v-if="!usesWholePaperWorkspace" label="批阅建议" name="reviewSuggestion">
        <UiTextarea
          size="sm"
          v-model="reviewSuggestionModel"
          :rows="4"
          :maxlength="1000"
          placeholder="可选，面向学生给出改进建议"
          :show-count="true"
        />
      </UiFormItem>

      <UiFormItem v-if="canSubmit">
        <UiButton
          block
          size="sm"
          variant="primary"
          :loading="submitting"
          :disabled="isReadOnly || !canSubmit"
          @click="emit('submit')"
        >
          确认给分并提交（Enter）· 进入{{ isWholePaperTask ? '下一未阅份' : '下一未阅' }}
        </UiButton>
      </UiFormItem>
    </UiForm>
  </UiCard>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type {
  MarkingQuestionViewResponse,
  QuestionMarkingGroupQuestionResponse,
} from '@/apis/mark/marking-organization'
import type { WholeQuestionForm } from '@/composables/useWholePaperGallery'
import type { GradingExperienceReferenceMatchModeCode } from '@/types/enums/grading-experience-reference-match-mode-enum'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import { ref, watch } from 'vue'
import ExperienceAssistBadge from '@/components/mark/ExperienceAssistBadge.vue'
import MarkScoreTriple from '@/components/mark/MarkScoreTriple.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCollapse from '@/components/ui-guide/ui/UiCollapse.vue'
import UiCollapsePanel from '@/components/ui-guide/ui/UiCollapsePanel.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiTypographyParagraph from '@/components/ui-guide/ui/UiTypographyParagraph.vue'
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'
import { GradingExperienceReferenceMatchModeDescription } from '@/types/enums/grading-experience-reference-match-mode-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingScorePanel' })

const scoreModel = defineModel<number | undefined>('score')
const annotationNoteModel = defineModel<string | undefined>('annotationNote')
const reviewSuggestionModel = defineModel<string | undefined>('reviewSuggestion')

const expandedWholeQuestionKeyModel = defineModel<string>('expandedWholeQuestionKey', {
  required: true,
})

const props = defineProps<{
  bindFormRef?: (el: FormInstance | null) => void
  bindScoreInputRef?: (el: { focus?: () => void } | null) => void
  rules: Record<string, Rule[]>
  usesWholePaperWorkspace: boolean
  isWholePaperTask: boolean
  isReadOnly: boolean
  canSubmit: boolean
  submitting: boolean
  questionView: MarkingQuestionViewResponse | null
  questionViewHalfScoreLabel: string
  isQuestionViewAiScorePending: boolean
  canRescoreQuestionView: boolean
  wholeQuestions: QuestionMarkingGroupQuestionResponse[]
  rescoringGradeResultId: string | null
  getWholeQuestionForm: (layoutQuestionId: string) => WholeQuestionForm
  isWholeQuestionScored: (layoutQuestionId: string) => boolean
  isWholeQuestionAiScorePending: (question: QuestionMarkingGroupQuestionResponse) => boolean
  canRescoreWholeQuestion: (question: QuestionMarkingGroupQuestionResponse) => boolean
  experienceAssistApplied?: boolean
  experienceAssistSourceExamName?: string
  experienceAssistConsistencyRate?: number
  experienceAssistMatchMode?: GradingExperienceReferenceMatchModeCode
}>()

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'accept-ai-submit'): void
  (e: 'quick-full-score'): void
  (e: 'quick-half-score'): void
  (e: 'quick-zero-score'): void
  (e: 'quick-ai-score'): void
  (e: 'quick-digit-score', digit: number): void
  (e: 'whole-quick-score', question: QuestionMarkingGroupQuestionResponse, digit: number): void
  (e: 'rescore-question'): void
  (e: 'rescore-whole', question: QuestionMarkingGroupQuestionResponse): void
  (e: 'open-ai-history'): void
  (e: 'open-ai-history-from-badge'): void
  (e: 'open-ai-history-from-whole-question', question: QuestionMarkingGroupQuestionResponse): void
  (e: 'fill-ai-score', question: QuestionMarkingGroupQuestionResponse): void
  (e: 'accept-ai-score', question: QuestionMarkingGroupQuestionResponse, index: number): void
  (e: 'focus-page', question: QuestionMarkingGroupQuestionResponse): void
  (e: 'whole-question-enter', index: number): void
  (e: 'set-score-input-ref', el: unknown, index: number): void
}>()

function matchModeLabel(mode: GradingExperienceReferenceMatchModeCode): string {
  return strictEnumLabel(GradingExperienceReferenceMatchModeDescription, mode, '定标匹配方式')
}

const innerFormRef = ref<FormInstance>()
const innerScoreInputRef = ref<{ focus?: () => void } | null>(null)

watch(innerFormRef, (el) => {
  props.bindFormRef?.(el ?? null)
})

watch(innerScoreInputRef, (el) => {
  props.bindScoreInputRef?.(el)
})

/** 0-9 快捷给分：仅展示不超过满分的数字键 */
function quickDigitScores(fullScore: number): number[] {
  const max = Math.min(9, Math.floor(fullScore))
  return Array.from({ length: max + 1 }, (_, index) => index)
}
</script>

<style lang="scss" scoped>
.marking-score-panel {
  margin-bottom: var(--dp-space-3, 12px);

  &__score-input {
    width: 100%;
    margin-bottom: 8px;
  }

  &__quick-actions {
    margin-top: 8px;
  }

  &__quick-digits {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  &__keyboard-hint {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__accordion {
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface);
    overflow: hidden;

    :deep(.ant-collapse-item) {
      border-bottom: 1px solid var(--dp-border-subtle) !important;
    }

    :deep(.ant-collapse-item:last-child) {
      border-bottom: none !important;
    }

    :deep(.ant-collapse-header) {
      align-items: flex-start !important;
      padding: 12px 16px !important;
    }

    :deep(.ant-collapse-content-box) {
      padding: 0 16px 16px !important;
    }
  }

  &__question-header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    width: 100%;
  }

  &__question-stem {
    margin: 0 0 8px;
    padding: 8px 10px;
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-panel);
    color: var(--dp-text-primary);
    background: var(--dp-surface);
  }

  &__recognized-answer {
    margin-bottom: 8px;
  }

  &__recognized-answer--empty {
    display: block;
    margin-bottom: 8px;
  }

  &__ai {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0 0 8px;
    padding: 8px;
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface-subtle);
  }

  &__ai-text {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-size: 13px;
    color: var(--dp-text-secondary);

    strong {
      color: var(--dp-color-primary);
      font-size: 14px;
    }
  }

  &__ai-diagnostic {
    margin-bottom: 0;
    color: var(--dp-text-secondary);
    font-size: 13px;
  }

  &__ai-pending {
    margin-bottom: 8px;
    font-size: 13px;
  }

  &__match-mode {
    margin: 0;
    font-size: 12px;
    color: var(--dp-text-secondary);
  }
}

.marking-score-panel__score-triple {
  margin-bottom: 10px;
}
</style>
