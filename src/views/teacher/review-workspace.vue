<template>
  <ReviewTaskHub v-if="!taskId" />
  <div v-else class="review-workspace grading-immersion-page grading-workspace-page">
    <ExamSelectGateStrip
      v-if="!examId"
      class="review-workspace__empty"
      body="缺少考试上下文，请从考试列表进入复核工作台"
    />

    <UiSkeletonState
      v-else-if="loading && !detail"
      variant="card"
      :card-count="2"
      compact
      class="review-workspace__loading"
    />

    <UiStateBlock
      size="sm"
      v-else-if="!loading && !detail"
      state="error"
      title="复核任务不可用"
      description="复核任务详情、正式影像或识别证据加载失败，当前页不能继续评分。"
      class="review-workspace__empty"
    >
      <template #actions>
        <UiButton size="sm" variant="outline" @click="goBack">返回复核任务</UiButton>
      </template>
    </UiStateBlock>

    <template v-else-if="detail">
      <UiAlertStrip
        v-if="detail.status === ReviewTaskStatusCode.INVALIDATED"
        tone="warning"
        title="复核任务已失效"
        description="原作答影像已补扫替换，待新复核任务生成后再处理"
        dense
        inline
        class="review-workspace__invalidated-banner"
      />
      <UiAlertStrip
        v-else-if="ownerOverrideMode"
        tone="warning"
        title="主考代办"
        description="该任务已被其他教师领取。提交确认或驳回时须填写代办原因，系统将强制审计。"
        dense
        inline
        class="review-workspace__owner-override-banner"
      />
      <UiAlertStrip
        v-else-if="claimBlockedByOther"
        tone="error"
        title="任务已被其他教师领取"
        description="仅认领人或主考可写分。请稍后再试，或联系主考代办。"
        dense
        inline
        class="review-workspace__claim-blocked-banner"
      />
      <UiAlertStrip
        v-else-if="needsExplicitClaim"
        tone="info"
        title="当前为浏览态"
        description="尚未领取本任务，可查看影像与建议分；开始复核后才会占用任务租期并允许写分。"
        dense
        inline
        class="review-workspace__claim-start-banner"
      >
        <template #actions>
          <UiButton
            size="sm"
            variant="primary"
            :loading="claiming"
            :disabled="!canManageReviewerWrites"
            @click="claimAndStartReview"
          >
            开始复核
          </UiButton>
        </template>
      </UiAlertStrip>
      <!-- B-7 流水线进度：当前任务在同题复核队列中的位次 -->
      <GradingWorkspaceLayout
        :confidential="isExamConfidential"
        :exam-label="examConfidentialLabel"
        :watermark-lines="watermarkLines"
      >
        <template #queue>
          <GradingImmersionChrome
            show-back
            :back-label="immersionBackLabel"
            :title="immersionTitle"
            :subtitle="immersionSubtitle"
            @back="goBack"
          >
            <template #status>
              <UiTag
                :tone="strictEnumTone(REVIEW_TASK_STATUS_TONE, detail.status, '复核任务状态')"
                size="sm"
              >
                {{ strictEnumLabel(ReviewTaskStatusDescription, detail.status, '复核任务状态') }}
              </UiTag>
              <span
                v-if="queueTotal > 0 && currentQueueIndex > 0"
                class="review-workspace__keyboard-hint"
              >
                Space/←/→ · 0-9 给分
              </span>
            </template>
          </GradingImmersionChrome>

          <UiAlertStrip
            v-if="reviewQueueLoadFailed"
            tone="error"
            title="同题复核队列加载失败"
            description="当前任务仍可单独提交，但队列跳转和“提交并取下一份”暂不可用。"
            dense
            inline
          />

          <div
            v-if="queueTotal > 0 && currentQueueIndex > 0"
            class="review-workspace__queue-progress"
          >
            <div class="review-workspace__queue-progress-meta">
              <span class="review-workspace__queue-progress-text">
                队列进度 {{ currentQueueIndex }}/{{ queueTotal }} · 后方
                {{ Math.max(0, queueTotal - currentQueueIndex) }} 份
              </span>
              <div class="review-workspace__queue-jump dp-space dp-space--tight">
                <span class="review-workspace__jump-label">跳至</span>
                <UiInputNumber
                  :value="jumpTarget ?? undefined"
                  :min="1"
                  :max="queueTotal"
                  size="sm"
                  class="review-workspace__queue-jump-input"
                  @update:value="
                    (value: number | string | null) => {
                      jumpTarget = typeof value === 'number' ? value : null
                    }
                  "
                  @keydown.enter="handleQueueJump"
                />
                <UiButton
                  size="sm"
                  variant="ghost"
                  :disabled="!jumpTarget"
                  @click="handleQueueJump"
                >
                  跳转
                </UiButton>
              </div>
            </div>
          </div>
        </template>

        <template #main>
          <GradingImmersionSection
            v-if="detail?.questionStem"
            :title="`题目题干 · 第 ${detail.questionNo} 题 · 满分 ${detail.fullScore}`"
          >
            <template #icon><FileTextOutlined /></template>
            <UiTypographyParagraph :ellipsis="{ rows: 4, expandable: true, symbol: '展开' }">
              {{ detail.questionStem }}
            </UiTypographyParagraph>
          </GradingImmersionSection>

          <GradingImmersionSection title="阅卷影像">
            <template #icon><FileImageOutlined /></template>
            <MarkingScanMaterialPanel
              :slice-file-id="detail?.sliceFileId"
              :source-scan-page="detail?.sourceScanPage"
              :layout-paper-page="detail?.layoutPaperPage"
              :confidential="isExamConfidential"
              :exam-label="examConfidentialLabel"
              :watermark-lines="watermarkLines"
            />
          </GradingImmersionSection>

          <GradingImmersionSection title="识别答案">
            <template #icon><FileTextOutlined /></template>
            <UiEmpty
              size="sm"
              v-if="!detail?.recognizedAnswer"
              description="本题暂无文字识别答案"
            />
            <div v-else class="review-workspace__text-block">{{ detail.recognizedAnswer }}</div>
          </GradingImmersionSection>

          <GradingImmersionSection v-if="detail?.standardAnswer" title="标准答案">
            <template #icon><CheckCircleOutlined /></template>
            <template #tags>
              <UiTag v-if="detail.comparePolicy" tone="blue" size="sm">
                {{
                  strictEnumLabel(
                    ObjectiveComparePolicyDescription,
                    detail.comparePolicy,
                    '客观题比较策略',
                  )
                }}
              </UiTag>
            </template>
            <div class="review-workspace__text-block review-workspace__standard-answer">
              {{ detail.standardAnswer }}
            </div>
          </GradingImmersionSection>

          <GradingImmersionSection title="智能复评说明">
            <template #icon><RobotOutlined /></template>
            <template #tags>
              <UiTag v-if="currentAiSourceLabel" :tone="currentAiSourceTone" size="sm">
                {{ currentAiSourceLabel }}
              </UiTag>
              <UiTag v-if="detail?.aiTraceId" tone="gray" size="sm">
                处理追踪编号 {{ detail.aiTraceId }}
              </UiTag>
              <UiTag v-if="detail?.aiLimited" tone="orange" size="sm">智能限流/阻断</UiTag>
              <ExperienceAssistBadge
                clickable
                :applied="lastExperienceAssistMeta?.applied"
                :source-exam-name="lastExperienceAssistMeta?.sourceExamName"
                :consistency-rate="lastExperienceAssistMeta?.consistencyRate"
                @open-ai-history="openExecutionsDrawer(detail?.aiTraceId)"
              />
            </template>
            <template #actions>
              <UiButton
                size="sm"
                variant="ghost"
                :loading="executionsLoading === true"
                :disabled="!detail"
                @click="() => openExecutionsDrawer()"
              >
                查看智能历史
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                :disabled="canRescoreByAi !== true"
                :loading="rescoring === true"
                @click="openRescoreConfirm"
              >
                <template #icon><RobotOutlined /></template>
                重新生成智能复评
              </UiButton>
            </template>
            <UiEmpty
              size="sm"
              v-if="!detail?.aiDiagnostic"
              :description="
                isHardJudgeSource
                  ? '客观题本地硬判无智能诊断；请核对识别结果后确认建议分或改人工给分'
                  : '暂无智能复评说明，可人工给分或重新生成智能复评'
              "
            />
            <div v-else class="review-workspace__text-block">
              {{ executionDiagnosticText(detail.aiDiagnostic) }}
            </div>
            <div class="review-workspace__ai-actions">
              <UiButton
                size="sm"
                variant="outline"
                :disabled="canAdoptAiSuggestion !== true"
                :loading="submitting === true"
                @click="adoptAiSuggestionAndSubmit"
              >
                {{ adoptSuggestionLabel }}
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                :disabled="canAdoptAiSuggestion !== true"
                @click="adoptAiSuggestion"
              >
                {{ fillSuggestionLabel }}
              </UiButton>
              <UiButton
                size="sm"
                variant="ghost"
                :disabled="canConfirm !== true"
                @click="clearAiSuggestionToManual"
              >
                {{ clearSuggestionLabel }}
              </UiButton>
            </div>
          </GradingImmersionSection>
        </template>

        <template #aside>
          <GradingImmersionSection title="教师给分">
            <template #icon><EditOutlined /></template>
            <UiForm
              ref="gradeFormRef"
              :model="gradeForm"
              :rules="gradeFormRules"
              layout="vertical"
              :disabled="canConfirm !== true"
            >
              <MarkScoreTriple
                class="review-workspace__score-triple"
                :ai-score="detail?.aiScore"
                :teacher-review-score="gradeForm.teacherReviewScore"
                :full-score="detail?.fullScore"
              />
              <UiFormItem label="教师复核评分" name="teacherReviewScore" required>
                <UiInputNumber
                  size="sm"
                  v-model="gradeForm.teacherReviewScore"
                  :min="0"
                  :max="detail.fullScore"
                  :step="0.5"
                  class="review-workspace__score-input"
                />
                <div class="review-workspace__hint">满分 {{ detail.fullScore }} 分</div>
                <!-- FIX-10: 快捷给分按钮 -->
                <div class="review-workspace__quick-scores dp-space dp-space--tight">
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="canConfirm !== true"
                    @click="setQuickScore(detail.fullScore)"
                  >
                    满分
                  </UiButton>
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="canConfirm !== true"
                    @click="setQuickScore(Math.round((detail.fullScore / 2) * 10) / 10)"
                  >
                    半分
                  </UiButton>
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="canConfirm !== true"
                    @click="setQuickScore(0)"
                  >
                    零分
                  </UiButton>
                  <UiButton
                    v-if="detail?.aiScore != null"
                    size="sm"
                    variant="outline"
                    :disabled="canConfirm !== true"
                    @click="setQuickScore(detail.aiScore)"
                  >
                    {{ isHardJudgeSource ? '填入硬判分' : '填入智能分' }}
                  </UiButton>
                </div>
              </UiFormItem>
              <UiFormItem label="评语（面向学生）" name="commentText">
                <UiTextarea
                  size="sm"
                  v-model="gradeForm.commentText"
                  placeholder="给学生的反馈评语（可选）"
                  :rows="3"
                  :maxlength="1000"
                  :show-count="true"
                />
              </UiFormItem>
              <UiFormItem label="批注（内部教研）" name="annotationText">
                <UiTextarea
                  size="sm"
                  v-model="gradeForm.annotationText"
                  placeholder="可记录采分点、疑点，内部可见（可选）"
                  :rows="3"
                  :maxlength="1000"
                  :show-count="true"
                />
              </UiFormItem>
            </UiForm>
          </GradingImmersionSection>

          <GradingImmersionSection title="批注历史">
            <template #icon><CommentOutlined /></template>
            <UiSkeletonState v-if="annotationsLoading" variant="card" compact />
            <UiStateBlock
              v-else-if="annotationsLoadFailed"
              state="error"
              size="sm"
              title="批注历史加载失败"
              description="当前批注证据不可用，已停止展示旧任务的批注。"
            />
            <UiEmpty size="sm" v-else-if="annotations.length === 0" description="暂无批注历史" />
            <template v-else>
              <UiList :data-source="annotations" size="small">
                <template #renderItem="{ item }">
                  <UiListItem>
                    <UiListItemMeta>
                      <template #title>
                        <UiTypographyText :content="item.annotationText || '（无批注正文）'" />
                      </template>
                      <template #description>
                        <span class="review-workspace__hint">{{
                          formatDateTime(item.createTime)
                        }}</span>
                      </template>
                    </UiListItemMeta>
                  </UiListItem>
                </template>
              </UiList>
              <UiPagination
                v-if="annotationPagination.total > annotationPagination.pageSize"
                v-model:current="annotationPagination.pageNum"
                v-model:page-size="annotationPagination.pageSize"
                class="review-workspace__annotation-pagination"
                :total="annotationPagination.total"
                :show-size-changer="false"
                size="small"
                @change="() => loadAnnotations()"
              />
            </template>
          </GradingImmersionSection>
        </template>

        <template #footer>
          <div class="review-workspace__sticky-left">
            <span class="review-workspace__hint">
              当前任务：{{ detail.paperDisplay.primaryText }} · 题 {{ detail.questionNo }}
            </span>
            <span v-if="queueTotal > 0" class="review-workspace__hint">
              · 同题剩余 {{ Math.max(0, queueTotal - 1) }} 份
            </span>
            <span v-else-if="reviewQueueLoadFailed" class="review-workspace__hint">
              · 同题队列不可用，不能自动取下一份
            </span>
          </div>
          <div class="review-workspace__sticky-actions">
            <UiButton
              :variant="queueTotal > 1 ? 'outline' : 'primary'"
              size="md"
              :disabled="canConfirm !== true"
              :loading="submitting === true"
              @click="openSubmitConfirm(false)"
            >
              {{ queueTotal > 1 ? '仅提交' : '提交复核' }}
            </UiButton>
            <UiButton
              v-if="canReject === true"
              variant="outline"
              size="md"
              :loading="rejecting === true"
              @click="openRejectConfirm"
            >
              驳回
            </UiButton>
            <UiButton
              v-if="queueTotal > 1"
              variant="primary"
              size="md"
              :disabled="canConfirm !== true || !detail.gradeResultId"
              :loading="submitting === true"
              @click="openSubmitConfirm(true)"
            >
              提交并取下一份
            </UiButton>
          </div>
        </template>
      </GradingWorkspaceLayout>
    </template>

    <MarkingAiAssistDrawer
      v-model:open="executionsDrawerOpen"
      :loading="executionsLoading === true"
      :load-failed="aiExecutionsLoadFailed"
      :executions="aiExecutions"
      :highlight-trace-id="highlightExecutionTraceId"
    />
  </div>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { AnnotationResponse } from '@/apis/mark/exam-annotation'
import { listAnnotations } from '@/apis/mark/exam-annotation'
import type { ExamQuestionAiExecutionItemResponse } from '@/apis/mark/exam-grade'
import {
  AI_ABILITY_TONE,
  AiAbilityDescription,
  confirmQuestionGrade,
  listAiExecutionsForQuestion,
  rejectQuestionGrade,
  rescoreQuestionByAi,
} from '@/apis/mark/exam-grade'
import type {
  ReviewTaskDetailResponse,
  ReviewTaskPipelineItemResponse,
} from '@/apis/mark/exam-review-task'
import {
  claimReviewTask,
  getReviewTaskDetail,
  getReviewTaskPipeline,
  GradeSourceCode,
  REVIEW_TASK_STATUS_TONE,
  ReviewTaskStatusCode,
  ReviewTaskStatusDescription,
  ReviewTaskTypeCode,
} from '@/apis/mark/exam-review-task'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import CommentOutlined from '@ant-design/icons-vue/CommentOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import message from 'ant-design-vue/es/message'
import {
  computed,
  inject,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { ObjectiveComparePolicyDescription } from '@/apis/mark/exam-standard-answer'
import ExperienceAssistBadge from '@/components/mark/ExperienceAssistBadge.vue'
import GradingImmersionChrome from '@/components/mark/GradingImmersionChrome.vue'
import GradingImmersionSection from '@/components/mark/GradingImmersionSection.vue'
import GradingWorkspaceLayout from '@/components/mark/GradingWorkspaceLayout.vue'
import MarkingAiAssistDrawer from '@/components/mark/MarkingAiAssistDrawer.vue'
import MarkingScanMaterialPanel from '@/components/mark/MarkingScanMaterialPanel.vue'
import MarkScoreTriple from '@/components/mark/MarkScoreTriple.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiList from '@/components/ui-guide/ui/UiList.vue'
import UiListItem from '@/components/ui-guide/ui/UiListItem.vue'
import UiListItemMeta from '@/components/ui-guide/ui/UiListItemMeta.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiStateBlock from '@/components/ui-guide/ui/UiStateBlock.vue'
import UiTypographyParagraph from '@/components/ui-guide/ui/UiTypographyParagraph.vue'
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import { isExamConfidentialFlag, useExamConfidential } from '@/composables/useConfidentialWatermark'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  EXAM_WORKSPACE_CHROME_KEY,
  MARK_WORKBENCH_CONTEXT_KEY,
  useWorkspaceExamId,
} from '@/composables/useMarkWorkbenchContext'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import { ResultCode } from '@/types/enums/result-code'
import { getUserErrorMessage, readBusinessResultCode, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { isShortcutBlockingTarget } from '@/utils/grading-keyboard'
import {
  isBusinessConflict,
  isFinalScoreConfirmLockConflict,
  isScoreWriteBlockedByFinalScoreGate,
} from '@/utils/marking-workflow-conflict'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ReviewTaskHub from '@/views/teacher/review-task-hub.vue'

defineOptions({ name: 'TeacherExamWorkspaceReviewWorkspace' })

const route = useRoute()
const router = useRouter()
const chrome = inject(EXAM_WORKSPACE_CHROME_KEY, null)
const workbench = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
const { refreshSnapshot } = useWorkspaceExamId()
const userStore = useUserStore()
/** MVR-327：仅认 BE ReviewTaskDetail.canManageOwnerReviewOverride===true */
const canManageOwnerReviewOverride = computed(
  () => detail.value?.canManageOwnerReviewOverride === true,
)

const examId = computed(() => (route.params.examId ? String(route.params.examId) : ''))
const {
  confidential: examConfidentialRef,
  examLabel: examConfidentialLabelRef,
  watermarkLines,
} = useExamConfidential(examId)
const isExamConfidential = computed(() => isExamConfidentialFlag(examConfidentialRef.value))
const examConfidentialLabel = computed(() => examConfidentialLabelRef.value)
const immersionTitle = computed(
  () => chrome?.contextTitle.value || examConfidentialLabel.value || '文字识别/智能复核',
)
const immersionBackLabel = computed(() =>
  taskSource.value === 'arbitration' ? '返回仲裁池' : '返回复核队列',
)
const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))
const taskSource = computed(() => (route.query.source === 'arbitration' ? 'arbitration' : 'review'))
/** 当前登录阅卷教师 ID，用于约束队列里可继续接手的 IN_PROGRESS 任务。 */
const currentUserId = computed(() => userStore.userInfo.userId || '')

function reviewWorkspaceSourceQuery(): Record<string, string> | undefined {
  if (taskSource.value !== 'arbitration') {
    return undefined
  }
  return { source: 'arbitration' }
}

function resolveReviewTaskPoolRouteName():
  'TeacherExamWorkspaceMarkingArbitration' | 'TeacherExamWorkspaceReviewBatchConfirm' {
  return taskSource.value === 'arbitration'
    ? 'TeacherExamWorkspaceMarkingArbitration'
    : 'TeacherExamWorkspaceReviewBatchConfirm'
}

function goBack(): void {
  void leaveReviewWorkspace(() => {
    if (!examId.value) {
      void router.push({ name: 'TeacherExamList' })
      return
    }
    if (taskId.value) {
      void router.push({
        name: resolveReviewTaskPoolRouteName(),
        params: { examId: examId.value },
        query: reviewWorkspaceSourceQuery(),
      })
      return
    }
    void router.push({
      name: 'TeacherExamWorkspaceMarkingTaskPool',
      params: { examId: examId.value },
    })
  })
}

// ─── 复核任务详情 ──────────────────────────
const detail = ref<ReviewTaskDetailResponse | null>(null)
const loading = ref(false)
/** 主考打开他人已领取任务：允许写分但须带代办原因 */
const ownerOverrideMode = ref(false)
/** 非主考打开他人已领取任务：只读禁写 */
const claimBlockedByOther = ref(false)
/** 浏览 PENDING 任务时的显式领取进行中 */
const claiming = ref(false)
/** 丢弃过期的复核任务加载，避免 J/K 导航与 claim 并发覆盖 detail。 */
let loadTaskGeneration = 0
/** 隔离确认、驳回与智能复评写回，切任务后旧回执不得更新新任务界面。 */
let taskWriteGeneration = 0

/** 沉浸顶栏副标题：队列位次 + 试卷/题号/状态，避免 status 槽重复堆 Tag。 */
const immersionSubtitle = computed(() => {
  const task = detail.value
  if (!task) {
    return ''
  }
  const parts: string[] = []
  if (queueTotal.value > 0 && currentQueueIndex.value > 0) {
    parts.push(`第 ${currentQueueIndex.value}/${queueTotal.value} 份`)
  }
  if (task.paperDisplay?.primaryText) {
    parts.push(task.paperDisplay.primaryText)
  }
  if (task.questionNo) {
    parts.push(`题 ${task.questionNo}`)
  }
  if (task.status) {
    parts.push(strictEnumLabel(ReviewTaskStatusDescription, task.status, '复核任务状态'))
  }
  return parts.join(' · ')
})

const canSubmit = computed(() => Boolean(examId.value) && Boolean(taskId.value))

/** MVR-283：与 getReviewTaskDetail 下发的 canManageReviewerWrites 对齐（Service 门禁优先）。 */
const canManageReviewerWrites = computed(() => detail.value?.canManageReviewerWrites === true)

/**
 * 仅已领取（IN_PROGRESS）或主考代办可写分。
 * PENDING 浏览态必须先点「开始复核」领取，禁止页面加载副作用占用租期。
 */
const canConfirm = computed(() => {
  // MVR-283：无阅卷写能力位不得暴露确认/采纳/快捷给分；PENDING 须显式领取
  if (canManageReviewerWrites.value !== true) {
    return false
  }
  if (claimBlockedByOther.value === true) {
    return false
  }
  if (claiming.value || submitting.value || rejecting.value || rescoring.value) {
    return false
  }
  return detail.value?.status === ReviewTaskStatusCode.IN_PROGRESS
})

/** PENDING 且未被他人占用时，需要教师显式领取后才能写分。 */
const needsExplicitClaim = computed(() => {
  if (!detail.value || claimBlockedByOther.value === true || ownerOverrideMode.value === true) {
    return false
  }
  return detail.value.status === ReviewTaskStatusCode.PENDING
})

/** 仅首次复核任务可驳回升级仲裁；仲裁任务本身不可再次驳回。 */
const canReject = computed(() => {
  if (canConfirm.value !== true || !detail.value?.gradeResultId) return false
  return detail.value.reviewType !== ReviewTaskTypeCode.QUESTION_REVIEW_ARBITRATION
})

// ─── 批注列表 ─────────────────────────────
const annotations = ref<AnnotationResponse[]>([])
const annotationsLoading = ref(false)
const annotationsLoadFailed = ref(false)
let annotationsLoadGeneration = 0
const annotationPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })

/** 读取当前任务批注分页，并隔离翻页与切任务产生的过期响应。 */
async function loadAnnotations(expectedGeneration = loadTaskGeneration): Promise<void> {
  if (!examId.value || !detail.value) return
  const currentExamId = examId.value
  const currentTaskId = taskId.value
  const requestGeneration = ++annotationsLoadGeneration
  const { paperInstanceId, layoutQuestionId, gradeResultId } = detail.value
  annotationsLoading.value = true
  annotationsLoadFailed.value = false
  try {
    const page = await listAnnotations({
      examId: currentExamId,
      paperInstanceId,
      layoutQuestionId,
      gradeResultId,
      pageNum: annotationPagination.pageNum,
      pageSize: annotationPagination.pageSize,
    })
    if (
      expectedGeneration !== loadTaskGeneration ||
      requestGeneration !== annotationsLoadGeneration ||
      examId.value !== currentExamId ||
      taskId.value !== currentTaskId
    ) {
      return
    }
    annotations.value = page.list
    annotationPagination.total = page.total
    annotationPagination.pageNum = page.pageNum
    annotationPagination.pageSize = page.pageSize
  } catch (error) {
    if (
      expectedGeneration !== loadTaskGeneration ||
      requestGeneration !== annotationsLoadGeneration
    ) {
      return
    }
    annotations.value = []
    annotationPagination.total = 0
    annotationsLoadFailed.value = true
    showUserError(error, '批注记录加载失败')
  } finally {
    if (
      expectedGeneration === loadTaskGeneration &&
      requestGeneration === annotationsLoadGeneration
    ) {
      annotationsLoading.value = false
    }
  }
}

// ─── B-7 同题剩余复核任务队列（用于「提交并取下一份」流水线接力） ─────
const reviewQueue = ref<ReviewTaskPipelineItemResponse[]>([])
const pipelineCurrentIndex = ref(0)
const reviewQueueLoadFailed = ref(false)
let reviewQueueLoadGeneration = 0

/**
 * 加载当前考试 + 当前题目下可继续复核的任务集合。
 * 只保留 PENDING 和当前教师自己已领取的 IN_PROGRESS 任务，避免把其他教师已领取任务误纳入“下一份”候选。
 */
async function loadReviewQueue(
  expectedGeneration = loadTaskGeneration,
  allowCurrentMissing = false,
): Promise<void> {
  if (
    !examId.value ||
    !detail.value?.layoutQuestionId ||
    !detail.value.reviewType ||
    !detail.value.gradeSource
  ) {
    reviewQueue.value = []
    reviewQueueLoadFailed.value = true
    return
  }
  if (!currentUserId.value) {
    reviewQueue.value = []
    reviewQueueLoadFailed.value = true
    showUserError(
      new Error('当前登录用户缺少 userId，无法加载复核队列'),
      '当前登录用户缺少 userId，无法加载复核队列',
    )
    return
  }
  const currentExamId = examId.value
  const currentTaskId = taskId.value
  const requestGeneration = ++reviewQueueLoadGeneration
  const { layoutQuestionId, reviewType, gradeSource } = detail.value
  try {
    reviewQueueLoadFailed.value = false
    const pipeline = await getReviewTaskPipeline({
      examId: currentExamId,
      layoutQuestionId,
      reviewType,
      gradeSource,
      excludeArbitration: reviewType !== ReviewTaskTypeCode.QUESTION_REVIEW_ARBITRATION,
      currentReviewTaskId: currentTaskId,
    })
    if (
      expectedGeneration !== loadTaskGeneration ||
      requestGeneration !== reviewQueueLoadGeneration ||
      examId.value !== currentExamId ||
      taskId.value !== currentTaskId
    ) {
      return
    }
    if (
      detail.value &&
      !allowCurrentMissing &&
      (detail.value.status === ReviewTaskStatusCode.PENDING ||
        detail.value.status === ReviewTaskStatusCode.IN_PROGRESS) &&
      pipeline.currentIndex < 1
    ) {
      throw new TypeError('复核流水线合同异常：开放任务未出现在当前队列')
    }
    reviewQueue.value = pipeline.items
    pipelineCurrentIndex.value = pipeline.currentIndex
  } catch (error) {
    if (
      expectedGeneration !== loadTaskGeneration ||
      requestGeneration !== reviewQueueLoadGeneration
    ) {
      return
    }
    showUserError(error, '同题复核队列加载失败，提交并取下一份暂不可用。')
    reviewQueue.value = []
    pipelineCurrentIndex.value = 0
    reviewQueueLoadFailed.value = true
  }
}

/**
 * 当前任务在同题复核队列中的 1-based 位次；0 表示当前任务已退出开放队列。
 */
const currentQueueIndex = computed<number>(() => pipelineCurrentIndex.value)

const queueTotal = computed<number>(() => reviewQueue.value.length)

/** P2-2: 队列快速跳转 */
const jumpTarget = ref<number | null>(null)

function handleQueueJump(): void {
  if (!jumpTarget.value || reviewQueue.value.length === 0) return
  const idx = jumpTarget.value
  if (idx < 1 || idx > reviewQueue.value.length) {
    void message.warning(`请输入 1～${reviewQueue.value.length} 之间的编号`)
    return
  }
  const targetTask = reviewQueue.value[idx - 1]
  if (targetTask) {
    void navigateToQueueTask(targetTask.reviewTaskId)
  }
}

/** 同题队列相对跳转：J/K 或方向键切换份数，不提交当前任务 */
function navigateQueueRelative(offset: -1 | 1): void {
  if (reviewQueue.value.length === 0) {
    return
  }
  const currentIdx = reviewQueue.value.findIndex((item) => item.reviewTaskId === taskId.value)
  if (currentIdx < 0) {
    return
  }
  const targetIdx = currentIdx + offset
  if (targetIdx < 0 || targetIdx >= reviewQueue.value.length) {
    void message.info(offset < 0 ? '已是第一份' : '已是最后一份')
    return
  }
  const targetTask = reviewQueue.value[targetIdx]
  void navigateToQueueTask(targetTask.reviewTaskId)
}

function handleReviewWorkspaceKeydown(event: KeyboardEvent): void {
  // 仅单题复核任务页抢键；列表路由 / 无 taskId 时不拦截
  if (!taskId.value) {
    return
  }
  if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) {
    return
  }
  // 与阅卷工作台同级：输入态与可激活控件均不抢单键
  if (isShortcutBlockingTarget(event.target)) {
    return
  }
  const key = event.key.toLowerCase()
  if (key === 'j' || key === 'arrowleft') {
    if (reviewQueue.value.length === 0) {
      return
    }
    event.preventDefault()
    navigateQueueRelative(-1)
    return
  }
  // Space / → / K：下一份
  if (event.key === ' ' || key === 'k' || key === 'arrowright') {
    if (reviewQueue.value.length === 0) {
      return
    }
    event.preventDefault()
    navigateQueueRelative(1)
    return
  }
  if (/^\d$/.test(event.key) && detail.value && canConfirm.value === true) {
    const digit = Number(event.key)
    if (digit <= detail.value.fullScore) {
      event.preventDefault()
      setQuickScore(digit)
    }
  }
}

const submitting = ref(false)
const rejecting = ref(false)

// 单题 AI 复评状态：docs/17 §整卷 AI 与单题复评；仅在教师异议阶段允许调用，服务端守门 CONFIRMED 不可复评
const rescoring = ref(false)
const lastExperienceAssistMeta = ref<{
  applied?: boolean
  sourceExamName?: string
  consistencyRate?: number
} | null>(null)

/** 从复核详情同步经验辅助徽标状态 */
function syncExperienceAssistMetaFromDetail(taskDetail: ReviewTaskDetailResponse | null): void {
  const audit = taskDetail?.referenceExperienceAudit
  if (audit?.referenceExperienceApplied && audit.referenceExperienceSourceExamName) {
    lastExperienceAssistMeta.value = {
      applied: true,
      sourceExamName: audit.referenceExperienceSourceExamName,
      consistencyRate: audit.referenceExperienceConsistencyRate,
    }
    return
  }
  lastExperienceAssistMeta.value = null
}

/** 是否可以调用单题 AI 复评，需同时满足：存在 gradeResultId、状态为 PENDING/IN_PROGRESS、未提交中 */
const canRescoreByAi = computed<boolean>(() => {
  // MVR-283：无阅卷写能力位不得暴露 AI 复评；浏览态 PENDING 未领取也不可复评
  if (canManageReviewerWrites.value !== true) return false
  if (canConfirm.value !== true) return false
  if (rescoring.value === true || submitting.value === true) return false
  if (!examId.value) return false
  if (!detail.value) return false
  return detail.value.status === ReviewTaskStatusCode.IN_PROGRESS
})

// ─── 加载主流程 ───────────────────────────
/** 读取当前复核任务正式证据，并在详情稳定后并行加载批注与同题队列。 */
async function loadTask(): Promise<void> {
  if (canSubmit.value !== true) return
  const expectedExamId = examId.value
  const expectedTaskId = taskId.value
  const generation = ++loadTaskGeneration
  loading.value = true
  try {
    const loadedDetail = await loadReviewTaskDetail(expectedExamId, expectedTaskId, generation)
    if (
      generation !== loadTaskGeneration ||
      expectedExamId !== examId.value ||
      expectedTaskId !== taskId.value
    ) {
      return
    }
    detail.value = loadedDetail
    syncExperienceAssistMetaFromDetail(detail.value)
    captureGradeBaseline()
    await Promise.all([loadAnnotations(generation), loadReviewQueue(generation)])
  } catch (error) {
    if (generation !== loadTaskGeneration) {
      return
    }
    detail.value = null
    annotations.value = []
    reviewQueue.value = []
    annotationsLoadFailed.value = false
    reviewQueueLoadFailed.value = false
    showUserError(error, '教师复核工作台任务加载失败')
  } finally {
    if (generation === loadTaskGeneration) {
      loading.value = false
    }
  }
}

/** 清空打分表单（流水线切换到下份复核任务前必须调用，避免上份分数残留） */
function resetGradeForm(): void {
  gradeForm.teacherReviewScore = undefined
  gradeForm.commentText = ''
  gradeForm.annotationText = ''
  captureGradeBaseline()
}

/** 路由切换或重新加载任务前清空上一份任务残留，避免表单/队列/批注串页。 */
function resetTaskState(): void {
  resetGradeForm()
  detail.value = null
  ownerOverrideMode.value = false
  claimBlockedByOther.value = false
  claiming.value = false
  submitting.value = false
  rejecting.value = false
  rescoring.value = false
  annotations.value = []
  annotationsLoading.value = false
  annotationPagination.pageNum = 1
  annotationPagination.total = 0
  annotationsLoadFailed.value = false
  reviewQueue.value = []
  pipelineCurrentIndex.value = 0
  reviewQueueLoadFailed.value = false
  executionsDrawerOpen.value = false
  executionsLoading.value = false
  aiExecutions.value = []
  aiExecutionsLoadFailed.value = false
  lastExperienceAssistMeta.value = null
}

function serializeGradeForm(): string {
  return JSON.stringify({
    score: gradeForm.teacherReviewScore ?? null,
    comment: (gradeForm.commentText ?? '').trim(),
    annotation: (gradeForm.annotationText ?? '').trim(),
  })
}

function captureGradeBaseline(): void {
  gradeFormBaseline.value = serializeGradeForm()
}

/** 当前任务表单偏离加载基线即视为草稿；权限并发收缩不能抹掉离页提醒。 */
const isGradeFormDirty = computed(
  () => detail.value != null && serializeGradeForm() !== gradeFormBaseline.value,
)

/** 允许一次受控离开后跳过重复确认（路由守卫与主动导航共用）。 */
let bypassDirtyLeaveGuard = false

const gradeFormBaseline = ref('')

/** 阻止写请求执行中离开，并在复核草稿未提交时要求教师明确确认。 */
async function confirmLeaveIfDirty(): Promise<boolean> {
  if (claiming.value || submitting.value || rejecting.value || rescoring.value) {
    void message.warning('当前复核操作正在提交，请等待服务端返回后再离开')
    return false
  }
  if (bypassDirtyLeaveGuard || !isGradeFormDirty.value) {
    return true
  }
  const confirmed = await confirmAsync({
    title: '尚未提交的复核内容将丢失',
    content: '尚未提交的教师复核分不会写入。确认离开当前任务？',
    type: 'warning',
    okText: '继续离开',
    cancelText: '留在当前任务',
  })
  if (confirmed) {
    bypassDirtyLeaveGuard = true
  }
  return confirmed
}

async function leaveReviewWorkspace(navigate: () => void): Promise<void> {
  if (!(await confirmLeaveIfDirty())) {
    return
  }
  navigate()
}

async function navigateToQueueTask(targetTaskId: string): Promise<void> {
  if (!examId.value || !targetTaskId || targetTaskId === taskId.value) {
    return
  }
  if (!(await confirmLeaveIfDirty())) {
    return
  }
  void router.replace({
    name: 'TeacherExamWorkspaceReviewWorkspace',
    params: { examId: examId.value, taskId: targetTaskId },
    query: reviewWorkspaceSourceQuery(),
  })
}

/**
 * 加载复核任务详情：PENDING 仅浏览不领取；IN_PROGRESS 按归属进入本人写 / 主考代办 / 只读。
 * 领取意图必须由「开始复核」或「提交并取下一份」显式触发。
 */
async function loadReviewTaskDetail(
  capturedExamId: string,
  capturedTaskId: string,
  expectedGeneration: number,
): Promise<ReviewTaskDetailResponse> {
  const preview = await getReviewTaskDetail({
    examId: capturedExamId,
    reviewTaskId: capturedTaskId,
  })
  if (
    expectedGeneration !== loadTaskGeneration ||
    examId.value !== capturedExamId ||
    taskId.value !== capturedTaskId
  ) {
    return preview
  }
  if (preview.status === ReviewTaskStatusCode.PENDING) {
    ownerOverrideMode.value = false
    claimBlockedByOther.value = false
    return preview
  }
  if (preview.status !== ReviewTaskStatusCode.IN_PROGRESS) {
    ownerOverrideMode.value = false
    claimBlockedByOther.value = false
    return preview
  }
  const heldByOther =
    !!preview.assignedTeacherUserId && preview.assignedTeacherUserId !== currentUserId.value
  if (heldByOther && preview.canManageOwnerReviewOverride === true) {
    ownerOverrideMode.value = true
    claimBlockedByOther.value = false
    return preview
  }
  if (heldByOther) {
    ownerOverrideMode.value = false
    claimBlockedByOther.value = true
    return preview
  }
  ownerOverrideMode.value = false
  claimBlockedByOther.value = false
  return preview
}

/** 浏览态显式领取：占用任务租期后才允许写分。 */
async function claimAndStartReview(): Promise<void> {
  if (claiming.value || !detail.value) {
    return
  }
  if (!canManageReviewerWrites.value) {
    void message.warning('当前账号无阅卷写权限，无法开始复核')
    return
  }
  if (detail.value.status !== ReviewTaskStatusCode.PENDING) {
    return
  }
  const expectedExamId = examId.value
  const expectedTaskId = taskId.value
  const generation = loadTaskGeneration
  claiming.value = true
  try {
    const claimed = await claimReviewTask({
      examId: expectedExamId,
      reviewTaskId: expectedTaskId,
    })
    if (
      generation !== loadTaskGeneration ||
      examId.value !== expectedExamId ||
      taskId.value !== expectedTaskId
    ) {
      return
    }
    if (claimed.assignedTeacherUserId !== currentUserId.value) {
      throw new TypeError('复核任务领取回执异常：认领教师与当前用户不一致')
    }
    detail.value = claimed
    ownerOverrideMode.value = false
    claimBlockedByOther.value = false
    syncExperienceAssistMetaFromDetail(claimed)
    captureGradeBaseline()
    await Promise.all([loadAnnotations(generation), loadReviewQueue(generation)])
  } catch (error) {
    if (generation !== loadTaskGeneration) {
      return
    }
    if (isBusinessConflict(error)) {
      claiming.value = false
      void message.warning(getUserErrorMessage(error, '复核任务已被其他教师领取'))
      await loadTask()
      return
    }
    showUserError(error, '开始复核失败')
  } finally {
    if (generation === loadTaskGeneration) {
      claiming.value = false
    }
  }
}

/** 主考代办写分前采集强制审计原因；非代办模式返回 undefined。 */
async function resolveOwnerOverrideReason(): Promise<string | undefined | null> {
  if (ownerOverrideMode.value !== true) {
    return undefined
  }
  return promptInputAsync({
    title: '主考代办原因（必填）',
    placeholder: '说明为何接管他人进行中的复核任务并直接写分',
    required: true,
    emptyErrorMessage: '主考代办须填写代办原因',
    okText: '确认代办写分',
    cancelText: '取消',
    type: 'warning',
  })
}

/** FIX-10: 快捷给分按钮 */
function setQuickScore(score: number): void {
  // MVR-416：与 canConfirm / canManageReviewerWrites 二次闸，禁止仅靠按钮 disabled
  if (canConfirm.value !== true) return
  gradeForm.teacherReviewScore = score
}

// ─── 打分表单 ─────────────────────────────
const gradeFormRef = ref<FormInstance>()
const gradeForm = reactive<{
  teacherReviewScore?: number
  commentText?: string
  annotationText?: string
}>({
  teacherReviewScore: undefined,
  commentText: '',
  annotationText: '',
})

const gradeFormRules: Record<string, Rule[]> = {
  teacherReviewScore: [
    { required: true, message: '请填写教师复核评分', trigger: 'change' },
    {
      validator(_rule: Rule, value: number) {
        if (value === undefined || value === null) return Promise.resolve()
        if (value < 0) return Promise.reject(new Error('教师复核评分不能为负'))
        if (!detail.value) return Promise.reject(new Error('复核任务尚未加载'))
        const fullScore = detail.value.fullScore
        if (value > fullScore) {
          return Promise.reject(new Error(`教师复核评分不能超过满分 ${fullScore}`))
        }
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
  commentText: [{ max: 1000, message: '评语最多 1000 字', trigger: 'blur' }],
  annotationText: [{ max: 1000, message: '批注最多 1000 字', trigger: 'blur' }],
}

/**
 * 二次确认 → 调用 rescoreQuestionByAi → 成功后 loadTask 刷新详情。
 * 后端只会重写 AI 评分 / aiTraceId / aiDiagnostic / aiLimited 等辅助字段，
 * gradeStatus 保持 NEED_REVIEW、teacherReviewScore 置空；教师复核评分仍需教师提交复核入口写入。
 */
function openRescoreConfirm(): void {
  if (canRescoreByAi.value !== true) return
  const expectedExamId = examId.value
  const expectedTaskId = taskId.value
  const expectedGradeResultId = detail.value?.gradeResultId
  void confirmAsync({
    title: '重新生成单题智能复评？',
    content: '系统会重新生成单题智能复评结果。复评只更新智能评分和评分说明，不会写入教师复核评分。',
    type: 'info',
    okText: '生成智能复评',
    cancelText: '取消',
    onOk: () => {
      if (
        examId.value !== expectedExamId ||
        taskId.value !== expectedTaskId ||
        detail.value?.gradeResultId !== expectedGradeResultId
      ) {
        void message.warning('复核任务已切换，请在当前任务重新发起智能复评')
        return
      }
      return doRescoreByAi()
    },
  })
}

/** 实际发起调用，成功后由 loadTask 重拉全量详情以同步重写后的 AI 评分和诊断 */
async function doRescoreByAi(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无阅卷写权限')
    return
  }

  if (rescoring.value === true) return
  if (canRescoreByAi.value !== true || !examId.value || !detail.value) return
  const expectedExamId = examId.value
  const expectedTaskId = taskId.value
  const gradeResultId = detail.value.gradeResultId
  const generation = ++taskWriteGeneration
  rescoring.value = true
  try {
    const result = await rescoreQuestionByAi({
      examId: expectedExamId,
      gradeResultId,
    })
    if (
      generation !== taskWriteGeneration ||
      examId.value !== expectedExamId ||
      taskId.value !== expectedTaskId
    ) {
      return
    }
    if (result.aiScore != null && result.aiScore > detail.value.fullScore) {
      throw new TypeError('单题智能复评合同异常：智能评分超过当前题满分')
    }
    syncExperienceAssistMetaFromDetail({
      ...detail.value,
      referenceExperienceAudit: result.referenceExperienceAudit,
    })
    if (Boolean(result.scored) && result.aiScore != null) {
      void message.success(`智能复评完成，智能评分 ${result.aiScore} 分`)
    } else {
      void message.warning(executionDiagnosticText(result.diagnostic))
    }
    await loadTask()
    if (executionsDrawerOpen.value) {
      void loadAiExecutions()
    }
  } catch (error) {
    if (
      generation !== taskWriteGeneration ||
      examId.value !== expectedExamId ||
      taskId.value !== expectedTaskId
    ) {
      return
    }
    showUserError(error, '智能复评调用失败')
  } finally {
    if (generation === taskWriteGeneration) {
      rescoring.value = false
    }
  }
}

// ─── AI 评分采纳 / 清空 / 历史分支 ──────────────────────────────

/** 当前 AI 评分来源文案：使用后端返回的 AI 能力编码，不从 traceId 推断。 */
const currentAiSourceLabel = computed<string>(() => {
  const abilityCode = detail.value?.aiAbilityCode
  if (!abilityCode) return ''
  return strictEnumLabel(AiAbilityDescription, abilityCode, '智能能力编码')
})

/** 当前 AI 评分来源色调，与 currentAiSourceLabel 保持一致区分 */
const currentAiSourceTone = computed<BadgeTone>(() => {
  const abilityCode = detail.value?.aiAbilityCode
  if (!abilityCode) return 'gray'
  return strictEnumTone(AI_ABILITY_TONE, abilityCode, '智能能力编码')
})

/** 将 AI 执行诊断转为阅卷员可理解的业务提示，避免直接暴露接口或模型内部细节。 */
function executionDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    '智能复评暂未生成可采纳评分，请按题目评分细则继续人工复核',
  )
}

/** 当前题是否为客观题硬判来源（系统建议分，非模型 AI） */
const isHardJudgeSource = computed<boolean>(() => {
  return detail.value?.gradeSource === GradeSourceCode.AUTO_OBJECTIVE
})

/** 是否可采纳系统建议分（AI 或硬判）：任务可提交且存在 aiScore */
const canAdoptAiSuggestion = computed<boolean>(() => {
  if (canConfirm.value !== true) return false
  return detail.value?.aiScore != null
})

/** 采纳按钮文案：硬判与模型 AI 区分 */
const adoptSuggestionLabel = computed(() =>
  isHardJudgeSource.value ? '确认硬判分并提交' : '采纳智能评分并提交',
)
const fillSuggestionLabel = computed(() =>
  isHardJudgeSource.value ? '填入硬判分（微调）' : '填入表单（微调）',
)
const clearSuggestionLabel = computed(() =>
  isHardJudgeSource.value ? '清空建议分改人工' : '清空智能评分改人工',
)

/** 一键采纳系统建议分到教师复核评分表单 */
function adoptAiSuggestion(): void {
  if (canAdoptAiSuggestion.value !== true) return
  const aiScore = detail.value?.aiScore
  if (aiScore == null) return
  gradeForm.teacherReviewScore = aiScore
  void gradeFormRef.value?.validateFields(['teacherReviewScore'])
  void message.success(
    isHardJudgeSource.value
      ? `已填入硬判建议分 ${aiScore}，确认后才计入最终成绩`
      : `已填入智能评分 ${aiScore}，可微调后提交`,
  )
}

/** 采纳建议分并立即提交教师复核结论 */
async function adoptAiSuggestionAndSubmit(): Promise<void> {
  if (canAdoptAiSuggestion.value !== true) return
  const aiScore = detail.value?.aiScore
  if (aiScore == null) return
  gradeForm.teacherReviewScore = aiScore
  try {
    await gradeFormRef.value?.validate()
  } catch {
    return
  }
  const ok = await submitGrade()
  if (!ok) return
  void message.success(
    isHardJudgeSource.value
      ? '已确认硬判分并提交，正在为你取下一份…'
      : '已采纳智能评分并提交，正在为你取下一份…',
  )
  await takeNextTask()
}

/** 清空建议分转人工评分，仅重置表单 */
function clearAiSuggestionToManual(): void {
  // MVR-416：与 canConfirm 二次闸，禁止只读/无写权态假可清空写分表单
  if (canConfirm.value !== true) return
  gradeForm.teacherReviewScore = undefined
  void message.info(
    isHardJudgeSource.value
      ? '已清空硬判建议分，请手工输入教师复核评分'
      : '已清空智能评分，请按题目原则手工输入教师复核评分',
  )
}

// AI 历史执行记录抽屉状态
const executionsDrawerOpen = ref<boolean>(false)
const executionsLoading = ref<boolean>(false)
const aiExecutions = ref<ExamQuestionAiExecutionItemResponse[]>([])
const aiExecutionsLoadFailed = ref(false)
let aiExecutionsLoadGeneration = 0
const highlightExecutionTraceId = ref<string | null>(null)

/** 打开抽屉后拉取历史记录，可选定位当前 AI trace */
function openExecutionsDrawer(highlightTraceId?: string | null): void {
  if (!detail.value || !examId.value) return
  highlightExecutionTraceId.value = highlightTraceId ?? detail.value.aiTraceId ?? null
  executionsDrawerOpen.value = true
  void loadAiExecutions()
}

/** 读取当前题智能执行审计，并隔离重复打开抽屉产生的过期响应。 */
async function loadAiExecutions(expectedGeneration = loadTaskGeneration): Promise<void> {
  if (!examId.value || !detail.value) return
  const currentExamId = examId.value
  const currentTaskId = taskId.value
  const requestGeneration = ++aiExecutionsLoadGeneration
  executionsLoading.value = true
  aiExecutionsLoadFailed.value = false
  try {
    const list = await listAiExecutionsForQuestion({
      examId: currentExamId,
      gradeResultId: detail.value.gradeResultId,
    })
    if (
      expectedGeneration !== loadTaskGeneration ||
      requestGeneration !== aiExecutionsLoadGeneration ||
      examId.value !== currentExamId ||
      taskId.value !== currentTaskId
    ) {
      return
    }
    aiExecutions.value = list
  } catch (error) {
    if (
      expectedGeneration !== loadTaskGeneration ||
      requestGeneration !== aiExecutionsLoadGeneration
    ) {
      return
    }
    showUserError(error, '智能复评历史加载失败')
    aiExecutions.value = []
    aiExecutionsLoadFailed.value = true
  } finally {
    if (
      expectedGeneration === loadTaskGeneration &&
      requestGeneration === aiExecutionsLoadGeneration
    ) {
      executionsLoading.value = false
    }
  }
}

/**
 * 确认提交：先走表单校验，再弹出二次确认 modal（防误提）。
 * advanceToNext=true 时进入"提交并取下一份"流水线，提示文案会区分。
 */
async function openSubmitConfirm(advanceToNext: boolean): Promise<void> {
  // MVR-418：与 canConfirm / 按钮 disabled 同源二次闸（写权∧PENDING/IN_PROGRESS∧非他人领取）
  if (canConfirm.value !== true) {
    void message.warning(
      canManageReviewerWrites.value === true
        ? '当前任务不可提交复核（状态不可写或已被他人领取）'
        : '当前账号无阅卷写权限',
    )
    return
  }

  if (!examId.value || !detail.value) return
  if (!gradeFormRef.value) return
  try {
    await gradeFormRef.value.validate()
  } catch {
    return
  }
  const fullScore = detail.value.fullScore
  const teacherReviewScore = gradeForm.teacherReviewScore
  const ratio =
    fullScore && fullScore > 0 && typeof teacherReviewScore === 'number'
      ? `${Math.round((teacherReviewScore / fullScore) * 100)}%`
      : '-'
  // 取下一份模式下额外提示队列剩余信息，让教师清楚复核会继续
  const remaining = Math.max(0, queueTotal.value - 1)
  const tailHint = advanceToNext
    ? remaining > 0
      ? `提交后将自动取同题剩余 ${remaining} 份中的下一份继续复核。`
      : '提交后同题剩余任务为 0，将自动返回。'
    : '提交后任务将被关闭，不可撤销。'
  const expectedExamId = examId.value
  const expectedTaskId = taskId.value
  const expectedGradeResultId = detail.value.gradeResultId
  void confirmAsync({
    title: advanceToNext ? '确认提交并继续下一份复核？' : '确认提交该题复核？',
    content: `教师复核评分：${teacherReviewScore} / ${fullScore}（${ratio}）。${tailHint}`,
    type: 'info',
    okText: advanceToNext ? '提交并取下一份' : '确认提交',
    cancelText: '取消',
    onOk: () => {
      if (
        examId.value !== expectedExamId ||
        taskId.value !== expectedTaskId ||
        detail.value?.gradeResultId !== expectedGradeResultId
      ) {
        void message.warning('复核任务已切换，请重新核对当前任务后提交')
        return
      }
      return advanceToNext ? handleSubmitAndNext() : handleSubmit()
    },
  })
}

/** 提交核心：仅提交教师复核给分，成功返回 true；失败已提示并返回 false */
async function submitGrade(): Promise<boolean> {
  // MVR-418：与 canConfirm / BE ensureWritableReviewTask 同源二次闸
  if (canConfirm.value !== true) {
    void message.warning(
      canManageReviewerWrites.value === true
        ? '当前任务不可提交复核（状态不可写或已被他人领取）'
        : '当前账号无阅卷写权限',
    )
    return false
  }
  if (!examId.value || !detail.value) return false
  if (submitting.value === true || rejecting.value === true) {
    return false
  }
  const expectedExamId = examId.value
  const expectedTaskId = taskId.value
  const gradeResultId = detail.value.gradeResultId
  const ownerOverrideReason = await resolveOwnerOverrideReason()
  if (ownerOverrideReason === null) {
    return false
  }
  if (
    canConfirm.value !== true ||
    examId.value !== expectedExamId ||
    taskId.value !== expectedTaskId ||
    detail.value?.gradeResultId !== gradeResultId
  ) {
    return false
  }
  const generation = ++taskWriteGeneration
  submitting.value = true
  try {
    await confirmQuestionGrade({
      examId: expectedExamId,
      gradeResultId,
      teacherReviewScore: gradeForm.teacherReviewScore!,
      commentText: gradeForm.commentText?.trim() || undefined,
      annotationText: gradeForm.annotationText?.trim() || undefined,
      ownerOverrideReason,
    })
    if (
      generation !== taskWriteGeneration ||
      examId.value !== expectedExamId ||
      taskId.value !== expectedTaskId
    ) {
      return false
    }
    ownerOverrideMode.value = false
    captureGradeBaseline()
    try {
      await refreshSnapshot()
    } catch (error) {
      if (
        generation === taskWriteGeneration &&
        examId.value === expectedExamId &&
        taskId.value === expectedTaskId
      ) {
        showUserError(error, '复核分已写入，但考试工作台状态刷新失败')
      }
    }
    return true
  } catch (error) {
    if (
      generation !== taskWriteGeneration ||
      examId.value !== expectedExamId ||
      taskId.value !== expectedTaskId
    ) {
      return false
    }
    if (isFinalScoreConfirmLockConflict(error)) {
      void message.warning('处理中')
      return false
    }
    if (isScoreWriteBlockedByFinalScoreGate(error)) {
      void message.warning('最终成绩已确认/发布/更正，不能再改题分')
      return false
    }
    if (
      readBusinessResultCode(error) === ResultCode.PARAM_ERROR &&
      getUserErrorMessage(error, '').includes('主考代办')
    ) {
      void message.warning(getUserErrorMessage(error, '主考代办须填写代办原因'))
      return false
    }
    if (isBusinessConflict(error) && getUserErrorMessage(error, '').includes('已被其他教师领取')) {
      void message.warning(getUserErrorMessage(error, '复核任务已被其他教师领取'))
      await loadTask()
      return false
    }
    showUserError(error, '确认复核失败')
    return false
  } finally {
    if (generation === taskWriteGeneration) {
      submitting.value = false
    }
  }
}

/** 采集独立仲裁原因后执行驳回，禁止复用学生评语或补造默认原因。 */
async function openRejectConfirm(): Promise<void> {
  // MVR-418：与 canReject 同源二次闸（可确认且非仲裁任务）
  if (canReject.value !== true) {
    void message.warning(
      canManageReviewerWrites.value === true
        ? '当前任务不可驳回（状态不可写、已被他人领取或仲裁任务不可再驳回）'
        : '当前账号无阅卷写权限',
    )
    return
  }
  if (!examId.value || !detail.value?.gradeResultId) return
  const expectedExamId = examId.value
  const expectedTaskId = taskId.value
  const expectedGradeResultId = detail.value.gradeResultId
  const rejectReason = await promptInputAsync({
    title: '驳回并转入仲裁',
    placeholder: '请说明评分证据、识别结果或评分建议存在的具体问题',
    required: true,
    emptyErrorMessage: '请填写驳回原因，供仲裁教师核对',
    type: 'warning',
    okText: '确认驳回并转入仲裁',
    cancelText: '取消',
  })
  if (rejectReason === null) {
    return
  }
  if (
    examId.value !== expectedExamId ||
    taskId.value !== expectedTaskId ||
    detail.value?.gradeResultId !== expectedGradeResultId
  ) {
    void message.warning('复核任务已切换，请在当前任务重新填写驳回原因')
    return
  }
  await handleReject(rejectReason)
}

/** 驳回当前复核任务并按当前任务代际刷新真实占用与工作台状态。 */
async function handleReject(rejectReason: string): Promise<void> {
  // MVR-418：与 canReject / openRejectConfirm 同源二次闸
  if (canReject.value !== true) {
    void message.warning(
      canManageReviewerWrites.value === true
        ? '当前任务不可驳回（状态不可写、已被他人领取或仲裁任务不可再驳回）'
        : '当前账号无阅卷写权限',
    )
    return
  }
  if (!examId.value || !detail.value?.gradeResultId) return
  if (rejecting.value === true || submitting.value === true) {
    return
  }
  const expectedExamId = examId.value
  const expectedTaskId = taskId.value
  const gradeResultId = detail.value.gradeResultId
  const ownerOverrideReason = await resolveOwnerOverrideReason()
  if (ownerOverrideReason === null) {
    return
  }
  if (
    canReject.value !== true ||
    examId.value !== expectedExamId ||
    taskId.value !== expectedTaskId ||
    detail.value?.gradeResultId !== gradeResultId
  ) {
    return
  }
  const generation = ++taskWriteGeneration
  let rejected = false
  rejecting.value = true
  try {
    await rejectQuestionGrade({
      examId: expectedExamId,
      gradeResultId,
      rejectReason,
      ownerOverrideReason,
    })
    if (
      generation !== taskWriteGeneration ||
      examId.value !== expectedExamId ||
      taskId.value !== expectedTaskId
    ) {
      return
    }
    ownerOverrideMode.value = false
    captureGradeBaseline()
    void message.success('已驳回，任务已进入仲裁队列')
    try {
      await refreshSnapshot()
    } catch (error) {
      if (
        generation === taskWriteGeneration &&
        examId.value === expectedExamId &&
        taskId.value === expectedTaskId
      ) {
        showUserError(error, '复核任务已驳回，但考试工作台状态刷新失败')
      }
    }
    rejected = true
  } catch (error) {
    if (
      generation !== taskWriteGeneration ||
      examId.value !== expectedExamId ||
      taskId.value !== expectedTaskId
    ) {
      return
    }
    if (isFinalScoreConfirmLockConflict(error)) {
      void message.warning('处理中')
      return
    }
    if (isScoreWriteBlockedByFinalScoreGate(error)) {
      void message.warning('最终成绩已确认/发布/更正，不能再改题分')
      return
    }
    if (
      readBusinessResultCode(error) === ResultCode.PARAM_ERROR &&
      getUserErrorMessage(error, '').includes('主考代办')
    ) {
      void message.warning(getUserErrorMessage(error, '主考代办须填写代办原因'))
      return
    }
    if (isBusinessConflict(error) && getUserErrorMessage(error, '').includes('已被其他教师领取')) {
      void message.warning(getUserErrorMessage(error, '复核任务已被其他教师领取'))
      await loadTask()
      return
    }
    showUserError(error, '驳回复核失败')
  } finally {
    if (generation === taskWriteGeneration) {
      rejecting.value = false
    }
  }
  if (rejected) {
    goBack()
  }
}

/** 仅提交：保留在当前任务页（任务状态会变为 APPROVED/REJECTED） */
async function handleSubmit(): Promise<void> {
  const ok = await submitGrade()
  if (!ok) return
  void message.success('题目复核已确认并关闭任务')
  await loadTask()
}

/** 流水线模式：提交成功 → 从同题队列取下一份 → 领取并跳转 */
async function handleSubmitAndNext(): Promise<void> {
  const ok = await submitGrade()
  if (!ok) return
  void message.success('已提交，正在为你取下一份…')
  await takeNextTask()
}

/**
 * 从同题复核队列中挑选下一份 PENDING 任务领取并跳转。
 * 找不到下一份时返回考试工作台，提示教师本题复核已完成。
 */
async function takeNextTask(): Promise<void> {
  // MVR-317：领取下一份复核与 canManageReviewerWrites / BE 评阅写门禁同源
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无阅卷写权限，无法领取复核任务')
    return
  }
  const expectedExamId = examId.value
  if (!expectedExamId) return
  const generation = loadTaskGeneration
  const currentTaskId = taskId.value
  try {
    // 重新拉一次队列，确保不包含刚提交的任务（后端可能已变状态）
    await loadReviewQueue(generation, true)
    if (generation !== loadTaskGeneration || examId.value !== expectedExamId) {
      return
    }
    const candidate = reviewQueue.value.find(
      (item) => item.reviewTaskId !== currentTaskId && item.status === ReviewTaskStatusCode.PENDING,
    )
    if (!candidate) {
      void message.success('同题剩余任务复核完毕，返回考试工作台')
      bypassDirtyLeaveGuard = true
      void router.push({
        name: resolveReviewTaskPoolRouteName(),
        params: { examId: expectedExamId },
        query: reviewWorkspaceSourceQuery(),
      })
      return
    }
    // 领取下一份；后端会把状态推进到处理中并绑定到当前教师
    await claimReviewTask({
      examId: expectedExamId,
      reviewTaskId: candidate.reviewTaskId,
    })
    if (generation !== loadTaskGeneration || examId.value !== expectedExamId) {
      void message.info('下一份复核任务已领取，请从本人任务列表继续')
      return
    }
    // 切换路由前清空表单 + 释放上一份切片图，避免视觉残留
    bypassDirtyLeaveGuard = true
    resetGradeForm()
    void router.replace({
      name: 'TeacherExamWorkspaceReviewWorkspace',
      params: { examId: expectedExamId, taskId: candidate.reviewTaskId },
      query: reviewWorkspaceSourceQuery(),
    })
    // watch(examId, taskId) 会自动触发 loadTask，无需手动调用
  } catch (error) {
    if (generation !== loadTaskGeneration || examId.value !== expectedExamId) {
      return
    }
    showUserError(error, '取下一份复核任务失败')
  }
}

// ─── 生命周期 ─────────────────────────────
watch(
  () => [examId.value, taskId.value, taskSource.value],
  () => {
    loadTaskGeneration += 1
    taskWriteGeneration += 1
    annotationsLoadGeneration += 1
    reviewQueueLoadGeneration += 1
    aiExecutionsLoadGeneration += 1
    bypassDirtyLeaveGuard = false
    resetTaskState()
    if (canSubmit.value === true) {
      void loadTask()
    }
  },
  { immediate: true },
)

onBeforeRouteLeave(async () => {
  return confirmLeaveIfDirty()
})

onBeforeRouteUpdate(async () => {
  return confirmLeaveIfDirty()
})

let reviewKeyboardBound = false

function bindReviewWorkspaceKeyboard(): void {
  if (reviewKeyboardBound) {
    return
  }
  window.addEventListener('keydown', handleReviewWorkspaceKeydown)
  reviewKeyboardBound = true
}

function unbindReviewWorkspaceKeyboard(): void {
  if (!reviewKeyboardBound) {
    return
  }
  window.removeEventListener('keydown', handleReviewWorkspaceKeydown)
  reviewKeyboardBound = false
}

onMounted(bindReviewWorkspaceKeyboard)
onBeforeUnmount(unbindReviewWorkspaceKeyboard)
onActivated(bindReviewWorkspaceKeyboard)
onDeactivated(unbindReviewWorkspaceKeyboard)
</script>

<style lang="scss" scoped>
.review-workspace {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
  min-width: 0;

  &__queue-progress {
    margin: 0;
    padding: 0;
    background: transparent;
    border: 0;
    border-radius: 0;
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
  }

  &__invalidated-banner {
    margin-bottom: var(--dp-space-component-tight);
  }

  &__queue-progress-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--dp-space-component-tight) var(--dp-space-component);
  }

  &__keyboard-hint {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__queue-progress-text {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }

  &__queue-jump-input {
    width: 4.5rem;
  }

  &__text-block {
    margin: 0;
    font-size: var(--dp-font-size-sm);
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: var(--dp-text-primary);
    background: var(--dp-surface-subtle);
    padding: var(--dp-space-component);
    border-radius: var(--dp-radius-panel);
  }

  &__score-input {
    width: 100%;
  }

  &__hint {
    margin-top: var(--dp-space-component-xs);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__empty {
    padding: var(--dp-space-component) 0;
  }

  &__sticky-left {
    flex: 1;
    min-width: 0;
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-sm);
    overflow-wrap: anywhere;
  }

  &__sticky-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--dp-space-component-tight);
  }

  &__ai-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--dp-space-component-tight);
    margin-top: var(--dp-space-component);
    padding-top: var(--dp-space-component);
    border-top: 1px dashed var(--dp-border);
  }
}

.review-workspace__score-triple {
  margin-bottom: var(--dp-space-component);
}
</style>
