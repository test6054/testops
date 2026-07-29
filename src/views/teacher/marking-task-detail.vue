<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue/es/form'
import { computed } from 'vue'
import { dualMarkRoleLabel } from '@/apis/mark/dual-mark-role'
import { MarkingTaskStatusCode } from '@/apis/mark/marking-organization'
import ApplyScoreToRemainingModal from '@/components/mark/ApplyScoreToRemainingModal.vue'
import GradingSessionProgressBand from '@/components/mark/GradingSessionProgressBand.vue'
import GradingWorkspaceLayout from '@/components/mark/GradingWorkspaceLayout.vue'
import MarkingAiAssistDrawer from '@/components/mark/MarkingAiAssistDrawer.vue'
import MarkingQuestionViewCard from '@/components/mark/MarkingQuestionViewCard.vue'
import MarkingScorePanel from '@/components/mark/MarkingScorePanel.vue'
import MarkingTaskInfoCard from '@/components/mark/MarkingTaskInfoCard.vue'
import MarkingTaskToolbar from '@/components/mark/MarkingTaskToolbar.vue'
import RevealAnonymousModal from '@/components/mark/RevealAnonymousModal.vue'
import WholePaperGallery from '@/components/mark/WholePaperGallery.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { useMarkingTaskDetailState } from '@/composables/useMarkingTaskDetailState'
import { GradeStatusCode } from '@/types/enums/grade-status-enum'

defineOptions({ name: 'TeacherExamWorkspaceMarkingTaskDetail' })

const {
  taskId,
  task,
  reviewRecords,
  reviewRecordsLoading,
  loading,
  form,
  isExamConfidential,
  examConfidentialLabel,
  examWatermarkLines,
  canManageOwnerIdentityReveal,
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
  applyPrimaryQuickScore,
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

const dualMarkWaitingDescription = computed(() => {
  const current = task.value
  if (!current?.dualMarkRole) {
    return ''
  }
  const role = dualMarkRoleLabel(current.dualMarkRole)
  if (current.dualMarkPeerTaskStatus) {
    return `当前为双评${role}，对端状态：${taskStatusLabel(current.dualMarkPeerTaskStatus)}。正式分需双方均提交后解算。`
  }
  return `当前为双评${role}，已提交本侧给分，等待对端完成后解算正式分。`
})
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
      v-if="taskRecycledBlocked === true"
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

    <UiAlertStrip
      v-if="task?.dualMarkRole
        && task.taskStatus === MarkingTaskStatusCode.FINALIZED
        && task.dualMarkPeerTaskStatus !== MarkingTaskStatusCode.FINALIZED"
      tone="info"
      title="双评等待对端"
      :description="dualMarkWaitingDescription"
      dense
    />

    <UiAlertStrip
      v-else-if="task?.dualMarkFormalGradeStatus === GradeStatusCode.NEED_REVIEW"
      tone="warning"
      title="双评分差已超阈值"
      description="双方给分已进入题目复核仲裁，正式分以仲裁结果为准。"
      dense
    />

    <UiAlertStrip
      v-else-if="task?.dualMarkFormalGradeStatus === GradeStatusCode.CONFIRMED && task?.dualMarkRole"
      tone="success"
      title="双评已合成正式分"
      description="双方给分在分差阈值内，系统已写入正式题分。"
      dense
    />

    <WorkbenchContextGateStrip
      v-if="!taskId"
      tag="缺少上下文"
      body="缺少阅卷任务，请从任务池进入"
      cta-label="返回任务池"
      list-route-name="TeacherExamWorkspaceMarkingTaskPool"
      class="marking-task-detail-page__empty"
    />

    <UiSkeletonState
      v-else-if="loading && !task"
      variant="card"
      :card-count="2"
      compact
      class="marking-task-detail-page__empty"
    />

    <WorkbenchContextGateStrip
      v-else-if="!loading && !task"
      tag="不可用"
      body="任务详情不可用，请从任务池重新进入"
      cta-label="返回任务池"
      list-route-name="TeacherExamWorkspaceMarkingTaskPool"
      tone="warning"
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
          :review-records="reviewRecords"
          :review-records-loading="reviewRecordsLoading"
          :loading="loading"
          :is-read-only="isScoreReadOnly"
          :can-manage-owner-identity-reveal="canManageOwnerIdentityReveal"
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
        <GradingSessionProgressBand
          :progress="navigation.batchProgress.value"
          :recent-submits="recentList"
          :unit-label="isWholePaperTask ? '份' : '题'"
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
          :read-only="isScoreReadOnly"
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
              // MVR-415：页批注与 isScoreReadOnly 同源，禁止关考/回收后假可写
              if (isScoreReadOnly === true) return
              wholePageAnnotationForms[pageId] = value
            }
          "
        />

        <MarkingTaskInfoCard
          :task="task"
          :review-records="reviewRecords"
          :review-records-loading="reviewRecordsLoading"
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
          v-model:review-suggestion="form.reviewSuggestion"
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
          @quick-full-score="applyPrimaryQuickScore(questionView?.fullScore)"
          @quick-half-score="applyPrimaryQuickScore(calcHalfScore(questionView?.fullScore))"
          @quick-zero-score="applyPrimaryQuickScore(0)"
          @quick-ai-score="applyPrimaryQuickScore(questionView?.aiScore ?? undefined)"
          @quick-digit-score="applyPrimaryQuickScore($event)"
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
            {{ navigation.batchProgress.value.total }}
            · 已完成 {{ navigation.batchProgress.value.completed }}
            · 剩余 {{ navigation.batchProgress.value.remaining }}
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
            :disabled="!navigation.nextNavTaskId.value"
            @click="navigation.goToTask(navigation.nextNavTaskId.value)"
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
      :can-manage-owner-identity-reveal="canManageOwnerIdentityReveal"
      @revealed="handleAnonymousRevealed"
    />

    <MarkingAiAssistDrawer
      v-model:open="executionsDrawerOpen"
      :loading="executionsLoading === true"
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
  gap: var(--dp-space-component);

  &__empty {
    padding: var(--dp-space-component) 0;
  }

  &__footer-main {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-component-tight) var(--dp-space-block);
    flex: 1;
    min-width: 0;
    font-size: var(--dp-font-size-sm);
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
    gap: var(--dp-space-component-tight);
  }
}
</style>
