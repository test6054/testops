<template>
  <UiCard class="marking-score-panel info-card">
    <template #title>
      <EditOutlined />
      <span>{{ usesWholePaperWorkspace ? '当前任务负责题目' : '批改提交' }}</span>
    </template>

    <a-form
      ref="innerFormRef"
      :model="{ score: scoreModel, annotationNote: annotationNoteModel }"
      :rules="rules"
      layout="vertical"
      :disabled="!canSubmit"
    >
      <template v-if="usesWholePaperWorkspace">
        <UiEmpty v-if="wholeQuestions.length === 0" description="暂无数据" />
        <a-collapse
          v-else
          v-model:active-key="expandedWholeQuestionKeyModel"
          accordion
          class="marking-score-panel__accordion"
          expand-icon-position="end"
        >
          <a-collapse-panel
            v-for="(question, questionIndex) in wholeQuestions"
            :key="question.questionTemplateId"
          >
            <template #header>
              <div class="marking-score-panel__question-header">
                <UiTag tone="blue" size="sm">第 {{ question.questionNo }} 题</UiTag>
                <UiTag tone="gray" size="sm">{{ question.questionTypeMessage }}</UiTag>
                <UiTag tone="green" size="sm">满分 {{ question.fullScore }}</UiTag>
                <UiTag
                  v-if="isWholeQuestionScored(question.questionTemplateId)"
                  tone="green"
                  size="sm"
                >
                  已给 {{ getWholeQuestionForm(question.questionTemplateId).score }} 分
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
            <a-typography-paragraph
              v-if="question.recognizedAnswer"
              class="marking-score-panel__recognized-answer"
              :ellipsis="{ rows: 3, expandable: true, symbol: '展开' }"
            >
              {{ question.recognizedAnswer }}
            </a-typography-paragraph>
            <a-typography-text
              v-else
              type="secondary"
              class="marking-score-panel__recognized-answer--empty"
            >
              正式 OCR 未识别出可展示答案
            </a-typography-text>
            <a-input-number
              v-model:value="getWholeQuestionForm(question.questionTemplateId).score"
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
              <a-space size="small" wrap>
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
                  variant="primary"
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
              </a-space>
              <a-typography-paragraph
                v-if="question.aiDiagnostic"
                class="marking-score-panel__ai-diagnostic"
                :ellipsis="{ rows: 2, expandable: true, symbol: '展开' }"
              >
                {{ question.aiDiagnostic }}
              </a-typography-paragraph>
            </div>
            <div v-else-if="isWholeQuestionAiScorePending(question)" class="marking-score-panel__ai-pending">
              <a-typography-text type="secondary">AI 评分加载中...</a-typography-text>
            </div>
            <a-textarea
              v-model:value="getWholeQuestionForm(question.questionTemplateId).annotationText"
              :rows="3"
              :maxlength="1000"
              :disabled="isReadOnly"
              placeholder="题目批注，可选"
              show-count
            />
          </a-collapse-panel>
        </a-collapse>
        <p class="marking-score-panel__keyboard-hint">
          Enter 确认本题并展开下一题 · 0-9 快捷给分 · PageUp/PageDown 翻页 · J/K 切换任务
        </p>
      </template>

      <a-form-item v-else label="教师给分" name="score" required>
        <a-input-number
          ref="innerScoreInputRef"
          v-model:value="scoreModel"
          :min="0"
          :max="questionView?.fullScore"
          :step="0.5"
          class="marking-score-panel__score-input"
          placeholder="按题目满分给分"
          @keydown.enter.prevent="emit('submit')"
        />
        <a-space size="small" class="marking-score-panel__quick-actions">
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
          <UiButton size="sm" variant="outline" :disabled="isReadOnly" @click="emit('quick-zero-score')">
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
          <UiButton
            v-if="questionView?.aiScore != null"
            size="sm"
            variant="primary"
            :disabled="isReadOnly || submitting || !canSubmit"
            @click="emit('accept-ai-submit')"
          >
            采纳并提交
          </UiButton>
          <UiButton
            v-else-if="isQuestionViewAiScorePending"
            size="sm"
            variant="outline"
            disabled
          >
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
        </a-space>
        <div v-if="!isReadOnly && canSubmit && questionView?.fullScore != null" class="marking-score-panel__quick-digits">
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
          J/K 或 ←/→ 切换任务 · 0-9 快捷给分 · Enter 提交
        </p>
      </a-form-item>

      <a-form-item v-if="!usesWholePaperWorkspace" label="批改批注" name="annotationNote">
        <a-textarea
          v-model:value="annotationNoteModel"
          :rows="6"
          :maxlength="1000"
          placeholder="可选，记录采分点 / 扣分点 / 反馈意见"
          show-count
        />
      </a-form-item>

      <a-form-item v-if="canSubmit">
        <UiButton block size="md" :loading="submitting" @click="emit('submit')">
          确认给分并提交（Enter）· 自动切换{{ isWholePaperTask ? '下一份' : '下一题' }}
        </UiButton>
      </a-form-item>
    </a-form>
  </UiCard>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { MarkingQuestionViewVO, QuestionMarkingGroupQuestionVO } from '@/apis/mark/marking-organization'
import type { WholeQuestionForm } from '@/composables/useWholePaperGallery'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import { ref, watch } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'

defineOptions({ name: 'MarkingScorePanel' })

const scoreModel = defineModel<number | undefined>('score')
const annotationNoteModel = defineModel<string | undefined>('annotationNote')

const expandedWholeQuestionKeyModel = defineModel<string>('expandedWholeQuestionKey', { required: true })

const props = defineProps<{
  bindFormRef?: (el: FormInstance | null) => void
  bindScoreInputRef?: (el: { focus?: () => void } | null) => void
  rules: Record<string, Rule[]>
  usesWholePaperWorkspace: boolean
  isWholePaperTask: boolean
  isReadOnly: boolean
  canSubmit: boolean
  submitting: boolean
  questionView: MarkingQuestionViewVO | null
  questionViewHalfScoreLabel: string
  isQuestionViewAiScorePending: boolean
  canRescoreQuestionView: boolean
  wholeQuestions: QuestionMarkingGroupQuestionVO[]
  rescoringGradeResultId: string | null
  getWholeQuestionForm: (questionTemplateId: string) => WholeQuestionForm
  isWholeQuestionScored: (questionTemplateId: string) => boolean
  isWholeQuestionAiScorePending: (question: QuestionMarkingGroupQuestionVO) => boolean
  canRescoreWholeQuestion: (question: QuestionMarkingGroupQuestionVO) => boolean
}>()

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'accept-ai-submit'): void
  (e: 'quick-full-score'): void
  (e: 'quick-half-score'): void
  (e: 'quick-zero-score'): void
  (e: 'quick-ai-score'): void
  (e: 'quick-digit-score', digit: number): void
  (e: 'whole-quick-score', question: QuestionMarkingGroupQuestionVO, digit: number): void
  (e: 'rescore-question'): void
  (e: 'rescore-whole', question: QuestionMarkingGroupQuestionVO): void
  (e: 'open-ai-history'): void
  (e: 'fill-ai-score', question: QuestionMarkingGroupQuestionVO): void
  (e: 'accept-ai-score', question: QuestionMarkingGroupQuestionVO, index: number): void
  (e: 'focus-page', question: QuestionMarkingGroupQuestionVO): void
  (e: 'whole-question-enter', index: number): void
  (e: 'set-score-input-ref', el: unknown, index: number): void
}>()
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
  margin-bottom: 16px;

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
    color: var(--dp-text-muted, #64748b);
  }

  &__accordion {
    border: 1px solid var(--dp-border-subtle, #e2e8f0);
    border-radius: var(--dp-radius-panel, 8px);
    background: var(--ant-color-bg-container, #fff);
    overflow: hidden;

    :deep(.ant-collapse-item) {
      border-bottom: 1px solid var(--dp-border-subtle, #e2e8f0) !important;
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
    border: 1px solid var(--dp-border-subtle, #e2e8f0);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface-subtle, #f8fafc);
  }

  &__ai-text {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-size: 13px;
    color: var(--dp-text-secondary, #475569);

    strong {
      color: var(--ant-color-primary, #1677ff);
      font-size: 14px;
    }
  }

  &__ai-diagnostic {
    margin-bottom: 0;
    color: var(--dp-text-secondary, #475569);
    font-size: 13px;
  }

  &__ai-pending {
    margin-bottom: 8px;
    font-size: 13px;
  }
}
</style>
