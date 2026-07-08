<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue/es/form'
import ApplyScoreToRemainingModal from '@/components/mark/ApplyScoreToRemainingModal.vue'
import GradingWorkspaceLayout from '@/components/mark/GradingWorkspaceLayout.vue'
import MarkingAiAssistDrawer from '@/components/mark/MarkingAiAssistDrawer.vue'
import MarkingQuestionViewCard from '@/components/mark/MarkingQuestionViewCard.vue'
import MarkingScorePanel from '@/components/mark/MarkingScorePanel.vue'
import MarkingTaskInfoCard from '@/components/mark/MarkingTaskInfoCard.vue'
import MarkingTaskToolbar from '@/components/mark/MarkingTaskToolbar.vue'
import RevealAnonymousModal from '@/components/mark/RevealAnonymousModal.vue'
import WholePaperGallery from '@/components/mark/WholePaperGallery.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { useMarkingTaskDetailState } from '@/composables/useMarkingTaskDetailState'

defineOptions({ name: 'TeacherExamWorkspaceMarkingTaskDetail' })

const {
  taskId,
  task,
  loading,
  form,
  isExamConfidential,
  examConfidentialLabel,
  examWatermarkLines,
  isExamOwner,
  isReadOnly,
  isScoreReadOnly,
  taskRecycledBlocked,
  sessionPausedAlert,
  withdrawToastVisible,
  latestWithdrawable,
  withdrawWindowLabel,
  withdrawConfirmHint,
  recentList,
  canWithdrawEntry,
  handleWithdrawLatest,
  handleWithdrawEntry,
  dismissWithdrawToast,
  isWholePaperTask,
  usesWholePaperWorkspace,
  canSubmit,
  questionView,
  questionViewLoaded,
  questionViewLoading,
  questionViewHalfScoreLabel,
  isQuestionViewAiScorePending,
  scoreInputRef,
  wholePages,
  wholeQuestions,
  wholePagesLoaded,
  wholePagesLoading,
  wholePagesError,
  wholePageImageUrls,
  wholePageImageLoading,
  wholePageImageErrors,
  wholePageAnnotationForms,
  currentWholePageIndex,
  visibleWholePages,
  wholePageTopSpacerHeight,
  wholePageBottomSpacerHeight,
  expandedWholeQuestionKey,
  getWholeQuestionForm,
  reloadWholePaperView,
  handleWholePageGalleryScroll,
  handleGalleryViewportReady,
  revealOpen,
  revealedIdentity,
  executionsDrawerOpen,
  executionsLoading,
  aiExecutions,
  highlightExecutionTraceId,
  rescoringGradeResultId,
  lastExperienceAssistMeta,
  formRef,
  submitting,
  rules,
  submit,
  acceptAiScoreAndSubmit,
  applyModalOpen,
  applyModalCountdown,
  remainingSameQuestionCount,
  submittedScoreSnapshot,
  applyScoreToRemaining,
  dismissApplyModalAndContinue,
  navigation,
  loadTask,
  formatDateTime,
  taskStatusTone,
  taskStatusLabel,
  allocationUnitLabel,
  anonymityModeLabel,
  scanPageQualityLabel,
  scanPageQualityTone,
  calcHalfScore,
  isWholeQuestionScored,
  isWholeQuestionAiScorePending,
  canRescoreQuestionView,
  canRescoreWholeQuestion,
  setWholeQuestionScoreInputRef,
  handleWholeQuestionScoreEnter,
  fillWholeQuestionAiScore,
  acceptWholeQuestionAiScore,
  applyQuickScoreToWholeQuestion,
  focusWholeQuestionPage,
  openRescoreConfirmForQuestionView,
  openRescoreConfirmForWholeQuestion,
  openExecutionsDrawerForQuestionView,
  openExecutionsDrawerForWholeQuestion,
  openRevealDialog,
  handleAnonymousRevealed,
  aiAbilityLabel,
  aiAbilityTone,
  aiExecutionStatusLabel,
  aiExecutionStatusTone,
  aiExecutionTimelineColor,
} = useMarkingTaskDetailState()
</script>

<template>
  <div class="marking-task-detail-page grading-immersion-page grading-workspace-page">
    <UiAlertStrip
      v-if="sessionPausedAlert"
      tone="warning"
      title="正评会话已暂停"
      description="暂停期间无法领取新任务；已领取的进行中任务仍可提交。"
      dense
    />

    <UiAlertStrip
      v-if="taskRecycledBlocked"
      tone="error"
      title="该任务已被组长回收，当前批阅将无法提交"
      description="影像区仍可查看。请手动返回任务池。"
      dense
    >
      <template #actions>
        <UiButton variant="outline" size="sm" @click="navigation.goBackToTaskPool">
          回到任务池
        </UiButton>
      </template>
    </UiAlertStrip>

    <UiAlertStrip
      v-if="withdrawToastVisible && latestWithdrawable"
      tone="success"
      :title="`已提交第 ${latestWithdrawable.batchIndex ?? '-'}/${latestWithdrawable.batchTotal ?? '-'} 份 · 撤销 (Ctrl+Z)`"
      :description="withdrawWindowLabel ?? '撤回窗口加载中'"
      closable
      dense
      @close="dismissWithdrawToast"
    >
      <template #actions>
        <UiButton variant="outline" size="sm" @click="handleWithdrawLatest"> 撤销 </UiButton>
      </template>
    </UiAlertStrip>

    <UiEmpty v-if="!taskId" description="暂无数据" class="marking-task-detail-page__empty" />

    <UiSkeletonState
      v-else-if="loading && !task"
      variant="card"
      :card-count="2"
      compact
      class="marking-task-detail-page__empty"
    />

    <UiEmpty
      v-else-if="!loading && !task"
      description="暂无数据"
      class="marking-task-detail-page__empty"
    />

    <GradingWorkspaceLayout
      v-else-if="task"
      :confidential="isExamConfidential"
      :exam-label="examConfidentialLabel"
      :watermark-lines="examWatermarkLines"
    >
      <template #queue>
        <MarkingTaskToolbar
          :task="task"
          :loading="loading"
          :is-read-only="isScoreReadOnly"
          :is-exam-owner="isExamOwner"
          :revealed-identity="revealedIdentity"
          :navigation="navigation"
          :task-status-tone="taskStatusTone"
          :task-status-label="taskStatusLabel"
          :allocation-unit-label="allocationUnitLabel"
          :anonymity-mode-label="anonymityModeLabel"
          :recent-list="recentList"
          :can-withdraw-entry="canWithdrawEntry"
          hide-batch-nav
          @refresh="loadTask"
          @reveal="openRevealDialog"
          @withdraw-entry="handleWithdrawEntry"
        />
      </template>

      <template #main>
        <MarkingQuestionViewCard
          :show-whole-paper-placeholder="usesWholePaperWorkspace"
          :loading="questionViewLoading"
          :loaded="questionViewLoaded"
          :question-view="questionView"
          :confidential="isExamConfidential"
          :exam-label="examConfidentialLabel"
          :watermark-lines="examWatermarkLines"
        />

        <WholePaperGallery
          v-if="usesWholePaperWorkspace"
          :exam-id="task.examId"
          :task-id="task.id"
          :pages="wholePages"
          :loaded="wholePagesLoaded"
          :loading="wholePagesLoading"
          :error="wholePagesError"
          :visible-pages="visibleWholePages"
          :top-spacer-height="wholePageTopSpacerHeight"
          :bottom-spacer-height="wholePageBottomSpacerHeight"
          :current-page-index="currentWholePageIndex"
          :image-urls="wholePageImageUrls"
          :image-loading="wholePageImageLoading"
          :image-errors="wholePageImageErrors"
          :page-annotations="wholePageAnnotationForms"
          :show-page-annotations="isWholePaperTask"
          :read-only="isReadOnly"
          :quality-label="scanPageQualityLabel"
          :quality-tone="scanPageQualityTone"
          :confidential="isExamConfidential"
          :exam-label="examConfidentialLabel"
          :watermark-lines="examWatermarkLines"
          @reload="reloadWholePaperView"
          @scroll="handleWholePageGalleryScroll"
          @viewport-ready="handleGalleryViewportReady"
          @update:page-annotation="
            (pageId, value) => {
              wholePageAnnotationForms[pageId] = value
            }
          "
        />

        <MarkingTaskInfoCard
          :task="task"
          :format-date-time="formatDateTime"
          :task-status-tone="taskStatusTone"
          :task-status-label="taskStatusLabel"
          :allocation-unit-label="allocationUnitLabel"
          :anonymity-mode-label="anonymityModeLabel"
        />
      </template>

      <template #aside>
        <MarkingScorePanel
          v-model:score="form.score"
          v-model:annotation-note="form.annotationNote"
          v-model:expanded-whole-question-key="expandedWholeQuestionKey"
          :bind-form-ref="
            (el: FormInstance | null) => {
              formRef = el ?? undefined
            }
          "
          :bind-score-input-ref="
            (el: { focus?: () => void } | null) => {
              scoreInputRef = el
            }
          "
          :rules="rules"
          :uses-whole-paper-workspace="usesWholePaperWorkspace"
          :is-whole-paper-task="isWholePaperTask"
          :is-read-only="isScoreReadOnly"
          :can-submit="canSubmit"
          :submitting="submitting"
          :question-view="questionView"
          :question-view-half-score-label="questionViewHalfScoreLabel"
          :is-question-view-ai-score-pending="isQuestionViewAiScorePending"
          :can-rescore-question-view="canRescoreQuestionView"
          :whole-questions="wholeQuestions"
          :rescoring-grade-result-id="rescoringGradeResultId"
          :get-whole-question-form="getWholeQuestionForm"
          :is-whole-question-scored="isWholeQuestionScored"
          :is-whole-question-ai-score-pending="isWholeQuestionAiScorePending"
          :can-rescore-whole-question="canRescoreWholeQuestion"
          :experience-assist-applied="lastExperienceAssistMeta?.applied"
          :experience-assist-source-exam-name="lastExperienceAssistMeta?.sourceExamName"
          :experience-assist-consistency-rate="lastExperienceAssistMeta?.consistencyRate"
          :experience-assist-match-mode="lastExperienceAssistMeta?.matchMode"
          @submit="submit"
          @accept-ai-submit="acceptAiScoreAndSubmit"
          @quick-full-score="form.score = questionView?.fullScore"
          @quick-half-score="form.score = calcHalfScore(questionView?.fullScore)"
          @quick-zero-score="form.score = 0"
          @quick-ai-score="form.score = questionView?.aiScore ?? undefined"
          @quick-digit-score="form.score = $event"
          @whole-quick-score="applyQuickScoreToWholeQuestion"
          @rescore-question="openRescoreConfirmForQuestionView"
          @rescore-whole="openRescoreConfirmForWholeQuestion"
          @open-ai-history="openExecutionsDrawerForQuestionView()"
          @open-ai-history-from-badge="openExecutionsDrawerForQuestionView(questionView?.aiTraceId)"
          @open-ai-history-from-whole-question="openExecutionsDrawerForWholeQuestion"
          @fill-ai-score="fillWholeQuestionAiScore"
          @accept-ai-score="acceptWholeQuestionAiScore"
          @focus-page="focusWholeQuestionPage"
          @whole-question-enter="handleWholeQuestionScoreEnter"
          @set-score-input-ref="setWholeQuestionScoreInputRef"
        />
      </template>

      <template v-if="navigation.batchProgress.value" #footer>
        <div class="marking-task-detail-page__footer-main">
          <span class="marking-task-detail-page__footer-hint">
            {{ task.paperDisplay.primaryText }}
            <template v-if="task.paperDisplay.secondaryText">
              · {{ task.paperDisplay.secondaryText }}
            </template>
          </span>
          <span class="marking-task-detail-page__footer-progress">
            第 {{ navigation.batchProgress.value.current }} /
            {{ navigation.batchProgress.value.total }} 份
          </span>
        </div>
        <div class="marking-task-detail-page__footer-actions">
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!navigation.prevTaskId.value"
            @click="navigation.goToTask(navigation.prevTaskId.value)"
          >
            {{ navigation.navPrevLabel.value }}
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!navigation.nextTaskId.value"
            @click="navigation.goToTask(navigation.nextTaskId.value)"
          >
            {{ navigation.navNextLabel.value }}
          </UiButton>
        </div>
      </template>
    </GradingWorkspaceLayout>

    <RevealAnonymousModal
      v-if="task"
      v-model:open="revealOpen"
      :exam-id="task.examId"
      :task-id="task.id"
      @revealed="handleAnonymousRevealed"
    />

    <MarkingAiAssistDrawer
      v-model:open="executionsDrawerOpen"
      :loading="executionsLoading"
      :executions="aiExecutions"
      :highlight-trace-id="highlightExecutionTraceId"
      :status-label="aiExecutionStatusLabel"
      :status-tone="aiExecutionStatusTone"
      :ability-label="aiAbilityLabel"
      :ability-tone="aiAbilityTone"
      :timeline-color="aiExecutionTimelineColor"
    />

    <ApplyScoreToRemainingModal
      v-model:countdown="applyModalCountdown"
      :open="applyModalOpen"
      :score="submittedScoreSnapshot"
      :remaining-count="remainingSameQuestionCount"
      @apply="applyScoreToRemaining"
      @dismiss="dismissApplyModalAndContinue"
    />
  </div>
</template>

<style lang="scss" scoped>
.marking-task-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__empty {
    padding: 60px 0;
  }

  &__footer-main {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--dp-text-secondary);
  }

  &__footer-hint {
    min-width: 0;
  }

  &__footer-progress {
    font-weight: 500;
    white-space: nowrap;
  }

  &__footer-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
}
</style>
