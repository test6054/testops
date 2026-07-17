<template>
  <ReviewTaskHub v-if="!taskId" />
  <div v-else class="review-workspace grading-immersion-page grading-workspace-page">
    <ExamSelectGateStrip v-if="!examId" class="review-workspace__empty" body="缺少考试上下文，请从考试列表进入复核工作台" />

    <UiSkeletonState
      v-else-if="loading && !detail"
      variant="card"
      :card-count="2"
      compact
      class="review-workspace__loading"
    />

    <UiEmpty
      size="sm"
      v-else-if="!loading && !detail"
      description="复核任务加载失败或不存在"
      class="review-workspace__empty"
    >
      <UiButton size="sm" variant="outline" @click="loadTask">重试</UiButton>
    </UiEmpty>

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
              <UiTag v-if="detail.paperDisplay" tone="gray" size="sm">
                {{ detail.paperDisplay.primaryText }}
              </UiTag>
              <UiTag v-if="detail.questionNo" tone="blue" size="sm">
                题 {{ detail.questionNo }}
              </UiTag>
              <UiTag :tone="reviewStatusTone(detail.status)" size="sm">
                {{ reviewStatusLabel(detail.status) }}
              </UiTag>
              <UiTag v-if="queueTotal > 0 && currentQueueIndex > 0" tone="blue" size="sm">
                同题进度 {{ currentQueueIndex }} / {{ queueTotal }}
              </UiTag>
            </template>
          </GradingImmersionChrome>

          <div
            v-if="queueTotal > 0 && currentQueueIndex > 0"
            class="review-workspace__queue-progress"
          >
            <div class="review-workspace__queue-progress-meta">
              <span class="review-workspace__queue-progress-title">本题复核流水线</span>
              <span class="review-workspace__queue-progress-text">
                当前第 {{ currentQueueIndex }} 份，剩余
                {{ Math.max(0, queueTotal - currentQueueIndex) }} 份待复核
              </span>
              <span class="review-workspace__keyboard-hint">J/K 或 ←/→ 切换份数 · 0-9 快捷给分</span>
            </div>
            <UiProgressBar
              :percent="queueProgressPercent"
              :show-label="true"
              size="sm"
              :color="queueProgressPercent >= 100 ? 'var(--dp-success)' : 'var(--dp-color-primary)'"
            />
            <div class="review-workspace__queue-jump dp-space" style="--dp-space-gap: 8px">
              <span class="review-workspace__jump-label">跳转到第</span>
              <UiInputNumber
                :value="jumpTarget ?? undefined"
                :min="1"
                :max="queueTotal"
                size="sm"
                style="width: 80px"
                @update:value="
                  (value: number | string | null) => {
                    jumpTarget = typeof value === 'number' ? value : null
                  }
                "
                @keydown.enter="handleQueueJump"
              />
              <span class="review-workspace__jump-label">份</span>
              <UiButton size="sm" :disabled="!jumpTarget" @click="handleQueueJump">跳转</UiButton>
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
            <UiEmpty
              size="sm"
              v-if="
                !detail?.sliceFileId && !detail?.sourceScanPage && !detail?.layoutPaperPage?.fileId
              "
              description="本题暂无阅卷影像"
            />
            <MarkingScanMaterialPanel
              v-else
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
            <UiEmpty size="sm" v-if="!detail?.recognizedAnswer" description="本题暂无文字识别答案" />
            <div v-else class="review-workspace__text-block">{{ detail.recognizedAnswer }}</div>
          </GradingImmersionSection>

          <GradingImmersionSection
            v-if="detail?.standardAnswer"
            title="标准答案"
            class="review-workspace__section--standard"
          >
            <template #icon><CheckCircleOutlined /></template>
            <template #tags>
              <UiTag v-if="detail.comparePolicy" tone="blue" size="sm">
                {{ comparePolicyLabel(detail.comparePolicy) }}
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
                :loading="executionsLoading"
                :disabled="!detail"
                @click="() => openExecutionsDrawer()"
              >
                查看智能历史
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                :disabled="!canRescoreByAi"
                :loading="rescoring"
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
                :disabled="!canAdoptAiSuggestion"
                :loading="submitting"
                @click="adoptAiSuggestionAndSubmit"
              >
                {{ adoptSuggestionLabel }}
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                :disabled="!canAdoptAiSuggestion"
                @click="adoptAiSuggestion"
              >
                {{ fillSuggestionLabel }}
              </UiButton>
              <UiButton
                size="sm"
                variant="ghost"
                :disabled="!canConfirm"
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
              :disabled="!canConfirm"
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
                <div class="review-workspace__quick-scores dp-space" style="--dp-space-gap: 8px">
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="!canConfirm"
                    @click="setQuickScore(detail.fullScore)"
                  >
                    满分
                  </UiButton>
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="!canConfirm"
                    @click="setQuickScore(Math.round((detail.fullScore / 2) * 10) / 10)"
                  >
                    半分
                  </UiButton>
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="!canConfirm"
                    @click="setQuickScore(0)"
                  >
                    零分
                  </UiButton>
                  <UiButton
                    v-if="detail?.aiScore != null"
                    size="sm"
                    variant="outline"
                    :disabled="!canConfirm"
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
                @change="loadAnnotations"
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
          </div>
          <div class="review-workspace__sticky-actions">
            <UiButton
              variant="outline"
              size="md"
              :disabled="!canConfirm"
              :loading="submitting"
              @click="openSubmitConfirm(false)"
            >
              仅提交
            </UiButton>
            <UiButton
              v-if="canReject"
              variant="outline"
              size="md"
              :loading="rejecting"
              @click="openRejectConfirm"
            >
              驳回
            </UiButton>
            <UiButton
              variant="primary"
              size="md"
              :disabled="!canConfirm || !detail.gradeResultId || queueTotal <= 1"
              :loading="submitting"
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
      :loading="executionsLoading"
      :executions="aiExecutions"
      :highlight-trace-id="highlightExecutionTraceId"
      :status-label="statusLabel"
      :status-tone="statusTone"
      :ability-label="abilityLabel"
      :ability-tone="abilityTone"
      :timeline-color="timelineColor"
    />
  </div>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { AnnotationResponse } from '@/apis/mark/exam-annotation'
import type {
  AiAbilityCode,
  AiExecutionStatusCode,
  ExamQuestionAiExecutionItemResponse,
} from '@/apis/mark/exam-grade'
import type { ReviewTaskDetailResponse, ReviewTaskItemResponse } from '@/apis/mark/exam-review-task'
import type { ObjectiveComparePolicyCode } from '@/apis/mark/exam-standard-answer'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import CommentOutlined from '@ant-design/icons-vue/CommentOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import message from 'ant-design-vue/es/message'
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listAnnotations } from '@/apis/mark/exam-annotation'
import {
  AI_ABILITY_TONE,
  AI_EXECUTION_STATUS_TONE,
  AiAbilityDescription,
  AiExecutionStatusDescription,
  confirmQuestionGrade,
  listAiExecutionsForQuestion,
  rejectQuestionGrade,
  rescoreQuestionByAi,
} from '@/apis/mark/exam-grade'
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
import UiProgressBar from '@/components/ui-guide/ui/UiProgressBar.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTypographyParagraph from '@/components/ui-guide/ui/UiTypographyParagraph.vue'
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import { isExamConfidentialFlag, useExamConfidential } from '@/composables/useConfidentialWatermark'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useExamOwnerPermission } from '@/composables/useExamOwnerPermission'
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
import { isGradingKeyboardInputTarget } from '@/utils/grading-keyboard'
import {
  isBusinessConflict,
  isFinalScoreConfirmLockConflict,
  isScoreWriteBlockedByFinalScoreGate,
} from '@/utils/marking-workflow-conflict'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ReviewTaskHub from '@/views/teacher/review-task-hub.vue'

defineOptions({ name: 'TeacherExamWorkspaceReviewWorkspace' })

function reviewStatusTone(value: ReviewTaskStatusCode): BadgeTone {
  return strictEnumTone(REVIEW_TASK_STATUS_TONE, value, '复核任务状态')
}

function reviewStatusLabel(value: ReviewTaskStatusCode): string {
  return strictEnumLabel(ReviewTaskStatusDescription, value, '复核任务状态')
}

function comparePolicyLabel(code: ObjectiveComparePolicyCode): string {
  return strictEnumLabel(ObjectiveComparePolicyDescription, code, '客观题比较策略')
}

const route = useRoute()
const router = useRouter()
const chrome = inject(EXAM_WORKSPACE_CHROME_KEY, null)
const workbench = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
const { refreshSnapshot } = useWorkspaceExamId()
const userStore = useUserStore()
const examOwnerSource = computed(() => workbench?.examDetail?.value ?? null)
const { isExamOwner } = useExamOwnerPermission(examOwnerSource)

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
}

// ─── 复核任务详情 ──────────────────────────
const detail = ref<ReviewTaskDetailResponse | null>(null)
const loading = ref(false)
/** 主考打开他人已领取任务：允许写分但须带代办原因 */
const ownerOverrideMode = ref(false)
/** 非主考打开他人已领取任务：只读禁写 */
const claimBlockedByOther = ref(false)
/** 丢弃过期的复核任务加载，避免 J/K 导航与 claim 并发覆盖 detail。 */
let loadTaskGeneration = 0

const immersionSubtitle = computed(() => {
  const task = detail.value
  if (!task) {
    return ''
  }
  const parts: string[] = []
  if (task.paperDisplay?.primaryText) {
    parts.push(task.paperDisplay.primaryText)
  }
  if (task.questionNo) {
    parts.push(`题 ${task.questionNo}`)
  }
  if (task.status) {
    parts.push(reviewStatusLabel(task.status))
  }
  return parts.join(' · ')
})

const canSubmit = computed(() => !!examId.value && !!taskId.value)

/** 当前任务是否允许提交复核（活跃态且具备写权限） */
const canConfirm = computed(() => {
  const status = detail.value?.status
  if (status !== ReviewTaskStatusCode.PENDING && status !== ReviewTaskStatusCode.IN_PROGRESS) {
    return false
  }
  if (claimBlockedByOther.value) {
    return false
  }
  return true
})

/** 仅首次复核任务可驳回升级仲裁；仲裁任务本身不可再次驳回。 */
const canReject = computed(() => {
  if (!canConfirm.value || !detail.value?.gradeResultId) return false
  return detail.value.reviewType !== ReviewTaskTypeCode.QUESTION_REVIEW_ARBITRATION
})

// ─── 批注列表 ─────────────────────────────
const annotations = ref<AnnotationResponse[]>([])
const annotationsLoading = ref(false)
const annotationPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })

async function loadAnnotations(): Promise<void> {
  if (!examId.value || !detail.value) return
  const currentExamId = examId.value
  const { paperInstanceId, layoutQuestionId, gradeResultId } = detail.value
  annotationsLoading.value = true
  try {
    const page = await listAnnotations({
      examId: currentExamId,
      paperInstanceId,
      layoutQuestionId,
      gradeResultId,
      pageNum: annotationPagination.pageNum,
      pageSize: annotationPagination.pageSize,
    })
    annotations.value = page.list
    annotationPagination.total = page.total
    annotationPagination.pageNum = page.pageNum
    annotationPagination.pageSize = page.pageSize
  } catch (error) {
    annotations.value = []
    annotationPagination.total = 0
    showUserError(error, '批注记录加载失败')
  } finally {
    annotationsLoading.value = false
  }
}

// ─── B-7 同题剩余复核任务队列（用于「提交并取下一份」流水线接力） ─────
const reviewQueue = ref<ReviewTaskItemResponse[]>([])
const pipelineCurrentIndex = ref(0)

/**
 * 加载当前考试 + 当前题目下可继续复核的任务集合。
 * 只保留 PENDING 和当前教师自己已领取的 IN_PROGRESS 任务，避免把其他教师已领取任务误纳入“下一份”候选。
 */
async function loadReviewQueue(): Promise<void> {
  if (
    !examId.value
    || !detail.value?.layoutQuestionId
    || !detail.value.reviewType
    || !detail.value.gradeSource
  ) {
    reviewQueue.value = []
    return
  }
  if (!currentUserId.value) {
    reviewQueue.value = []
    showUserError(
      new Error('当前登录用户缺少 userId，无法加载复核队列'),
      '当前登录用户缺少 userId，无法加载复核队列',
    )
    return
  }
  const currentExamId = examId.value
  const { layoutQuestionId, reviewType, gradeSource } = detail.value
  try {
    const pipeline = await getReviewTaskPipeline({
      examId: currentExamId,
      layoutQuestionId,
      reviewType,
      gradeSource,
      excludeArbitration: reviewType !== ReviewTaskTypeCode.QUESTION_REVIEW_ARBITRATION,
      currentReviewTaskId: taskId.value,
    })
    reviewQueue.value = pipeline.items
    pipelineCurrentIndex.value = pipeline.currentIndex
  } catch (error) {
    showUserError(error, '同题复核队列加载失败，提交并取下一份暂不可用。')
    reviewQueue.value = []
    pipelineCurrentIndex.value = 0
  }
}

/**
 * 当前任务在同题复核队列中的 1-based 位次，找不到时回退为 1（流水线尚未刷新到当前任务）。
 */
const currentQueueIndex = computed<number>(() => pipelineCurrentIndex.value)

const queueTotal = computed<number>(() => reviewQueue.value.length)

/**
 * 复核流水线进度百分比（0-100）。
 * 当前任务一旦提交（APPROVED/REJECTED）会从队列中消失，下次刷新位次自然推进。
 */
const queueProgressPercent = computed<number>(() => {
  if (queueTotal.value === 0) return 0
  const remaining = queueTotal.value
  const completedInWindow = Math.max(0, currentQueueIndex.value - 1)
  return Math.min(100, Math.round((completedInWindow / Math.max(remaining, 1)) * 100))
})

/** P2-2: 队列快速跳转 */
const jumpTarget = ref<number | null>(null)

function handleQueueJump(): void {
  if (!jumpTarget.value || reviewQueue.value.length === 0) return
  const idx = jumpTarget.value
  if (idx < 1 || idx > reviewQueue.value.length) {
    message.warning(`请输入 1～${reviewQueue.value.length} 之间的编号`)
    return
  }
  const targetTask = reviewQueue.value[idx - 1]
  if (targetTask) {
    resetGradeForm()
    void router.replace({
      name: 'TeacherExamWorkspaceReviewWorkspace',
      params: { examId: examId.value, taskId: targetTask.reviewTaskId },
      query: reviewWorkspaceSourceQuery(),
    })
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
    message.info(offset < 0 ? '已是第一份' : '已是最后一份')
    return
  }
  const targetTask = reviewQueue.value[targetIdx]
  resetGradeForm()
  void router.replace({
    name: 'TeacherExamWorkspaceReviewWorkspace',
    params: { examId: examId.value, taskId: targetTask.reviewTaskId },
    query: reviewWorkspaceSourceQuery(),
  })
}

function handleReviewWorkspaceKeydown(event: KeyboardEvent): void {
  if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) {
    return
  }
  if (isGradingKeyboardInputTarget(event.target)) {
    return
  }
  const key = event.key.toLowerCase()
  if (key === 'j' || key === 'arrowleft') {
    event.preventDefault()
    navigateQueueRelative(-1)
    return
  }
  if (key === 'k' || key === 'arrowright') {
    event.preventDefault()
    navigateQueueRelative(1)
    return
  }
  if (/^\d$/.test(event.key) && detail.value && canConfirm.value) {
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
  if (rescoring.value || submitting.value) return false
  if (!examId.value) return false
  if (!detail.value) return false
  return (
    detail.value.status === ReviewTaskStatusCode.PENDING
    || detail.value.status === ReviewTaskStatusCode.IN_PROGRESS
  )
})

// ─── 加载主流程 ───────────────────────────
async function loadTask(): Promise<void> {
  if (!canSubmit.value) return
  const expectedExamId = examId.value
  const expectedTaskId = taskId.value
  const generation = ++loadTaskGeneration
  loading.value = true
  try {
    const loadedDetail = await loadReviewTaskDetail()
    if (
      generation !== loadTaskGeneration
      || expectedExamId !== examId.value
      || expectedTaskId !== taskId.value
    ) {
      return
    }
    detail.value = loadedDetail
    syncExperienceAssistMetaFromDetail(detail.value)
    await Promise.all([loadAnnotations(), loadReviewQueue()])
  } catch (error) {
    if (generation !== loadTaskGeneration) {
      return
    }
    detail.value = null
    annotations.value = []
    reviewQueue.value = []
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
}

/** 路由切换或重新加载任务前清空上一份任务残留，避免表单/队列/批注串页。 */
function resetTaskState(): void {
  resetGradeForm()
  detail.value = null
  ownerOverrideMode.value = false
  claimBlockedByOther.value = false
  annotations.value = []
  annotationPagination.pageNum = 1
  annotationPagination.total = 0
  reviewQueue.value = []
  pipelineCurrentIndex.value = 0
  executionsDrawerOpen.value = false
  aiExecutions.value = []
  lastExperienceAssistMeta.value = null
}

/**
 * 加载复核任务详情：活跃态任务先 claim 绑定当前教师；
 * 他人已领取时主考进入代办模式，非主考只读禁写。
 */
async function loadReviewTaskDetail(): Promise<ReviewTaskDetailResponse> {
  const preview = await getReviewTaskDetail({
    examId: examId.value,
    reviewTaskId: taskId.value,
  })
  if (
    preview.status !== ReviewTaskStatusCode.PENDING
    && preview.status !== ReviewTaskStatusCode.IN_PROGRESS
  ) {
    return preview
  }
  try {
    const claimed = await claimReviewTask({
      examId: examId.value,
      reviewTaskId: taskId.value,
    })
    ownerOverrideMode.value = false
    claimBlockedByOther.value = false
    return claimed
  } catch (error) {
    if (!isBusinessConflict(error)) {
      throw error
    }
    const heldByOther
      = preview.status === ReviewTaskStatusCode.IN_PROGRESS
        && !!preview.assignedTeacherUserId
        && preview.assignedTeacherUserId !== currentUserId.value
    if (heldByOther && isExamOwner.value) {
      ownerOverrideMode.value = true
      claimBlockedByOther.value = false
      return preview
    }
    if (heldByOther) {
      ownerOverrideMode.value = false
      claimBlockedByOther.value = true
      return preview
    }
    throw error
  }
}

/** 主考代办写分前采集强制审计原因；非代办模式返回 undefined。 */
async function resolveOwnerOverrideReason(): Promise<string | undefined | null> {
  if (!ownerOverrideMode.value) {
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
  if (!canRescoreByAi.value) return
  void confirmAsync({
    title: '重新生成单题智能复评？',
    content: '系统会重新生成单题智能复评结果。复评只更新智能评分和评分说明，不会写入教师复核评分。',
    type: 'info',
    okText: '生成智能复评',
    cancelText: '取消',
    onOk: () => doRescoreByAi(),
  })
}

/** 实际发起调用，成功后由 loadTask 重拉全量详情以同步重写后的 AI 评分和诊断 */
async function doRescoreByAi(): Promise<void> {
  if (rescoring.value) return
  if (!canRescoreByAi.value || !examId.value || !detail.value) return
  rescoring.value = true
  try {
    const result = await rescoreQuestionByAi({
      examId: examId.value,
      gradeResultId: detail.value.gradeResultId,
    })
    syncExperienceAssistMetaFromDetail({
      ...detail.value,
      referenceExperienceAudit: result.referenceExperienceAudit,
    })
    if (Boolean(result.scored) && result.aiScore != null) {
      message.success(`智能复评完成，智能评分 ${result.aiScore} 分`)
    } else {
      message.warning(executionDiagnosticText(result.diagnostic))
    }
    await loadTask()
    if (executionsDrawerOpen.value) {
      void loadAiExecutions()
    }
  } catch (error) {
    showUserError(error, '智能复评调用失败')
  } finally {
    rescoring.value = false
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
  if (!canConfirm.value) return false
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
  if (!canAdoptAiSuggestion.value) return
  const aiScore = detail.value?.aiScore
  if (aiScore == null) return
  gradeForm.teacherReviewScore = aiScore
  void gradeFormRef.value?.validateFields(['teacherReviewScore'])
  message.success(
    isHardJudgeSource.value
      ? `已填入硬判建议分 ${aiScore}，确认后才计入最终成绩`
      : `已填入智能评分 ${aiScore}，可微调后提交`,
  )
}

/** 采纳建议分并立即提交教师复核结论 */
async function adoptAiSuggestionAndSubmit(): Promise<void> {
  if (!canAdoptAiSuggestion.value) return
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
  message.success(
    isHardJudgeSource.value
      ? '已确认硬判分并提交，正在为你取下一份…'
      : '已采纳智能评分并提交，正在为你取下一份…',
  )
  await takeNextTask()
}

/** 清空建议分转人工评分，仅重置表单 */
function clearAiSuggestionToManual(): void {
  gradeForm.teacherReviewScore = undefined
  message.info(
    isHardJudgeSource.value
      ? '已清空硬判建议分，请手工输入教师复核评分'
      : '已清空智能评分，请按题目原则手工输入教师复核评分',
  )
}

// AI 历史执行记录抽屉状态
const executionsDrawerOpen = ref<boolean>(false)
const executionsLoading = ref<boolean>(false)
const aiExecutions = ref<ExamQuestionAiExecutionItemResponse[]>([])
const highlightExecutionTraceId = ref<string | null>(null)

/** 打开抽屉后拉取历史记录，可选定位当前 AI trace */
function openExecutionsDrawer(highlightTraceId?: string | null): void {
  if (!detail.value || !examId.value) return
  highlightExecutionTraceId.value = highlightTraceId ?? detail.value.aiTraceId ?? null
  executionsDrawerOpen.value = true
  void loadAiExecutions()
}

async function loadAiExecutions(): Promise<void> {
  if (!examId.value || !detail.value) return
  executionsLoading.value = true
  try {
    aiExecutions.value = await listAiExecutionsForQuestion({
      examId: examId.value,
      gradeResultId: detail.value.gradeResultId,
    })
  } catch (error) {
    showUserError(error, '智能复评历史加载失败')
    aiExecutions.value = []
  } finally {
    executionsLoading.value = false
  }
}

/** 能力编码 -> 来源文案 */
function abilityLabel(code: AiAbilityCode): string {
  return strictEnumLabel(AiAbilityDescription, code, '智能能力编码')
}

/** 能力编码 -> 来源色调 */
function abilityTone(code: AiAbilityCode): BadgeTone {
  return strictEnumTone(AI_ABILITY_TONE, code, '智能能力编码')
}

/** 状态编码 -> 文案 */
function statusLabel(status: AiExecutionStatusCode): string {
  return strictEnumLabel(AiExecutionStatusDescription, status, '智能执行状态')
}

/** 状态编码 -> 色调 */
function statusTone(status: AiExecutionStatusCode): BadgeTone {
  return strictEnumTone(AI_EXECUTION_STATUS_TONE, status, '智能执行状态')
}

/** 时间线节点色彩，与状态一致 */
function timelineColor(status: AiExecutionStatusCode): string {
  return strictEnumTone(AI_EXECUTION_STATUS_TONE, status, '智能执行状态')
}

/**
 * 确认提交：先走表单校验，再弹出二次确认 modal（防误提）。
 * advanceToNext=true 时进入"提交并取下一份"流水线，提示文案会区分。
 */
async function openSubmitConfirm(advanceToNext: boolean): Promise<void> {
  if (!examId.value || !detail.value) return
  if (!gradeFormRef.value) return
  try {
    await gradeFormRef.value.validate()
  } catch {
    return
  }
  const fullScore = detail.value.fullScore
  const teacherReviewScore = gradeForm.teacherReviewScore
  const ratio
    = fullScore && fullScore > 0 && typeof teacherReviewScore === 'number'
      ? `${Math.round((teacherReviewScore / fullScore) * 100)}%`
      : '-'
  // 取下一份模式下额外提示队列剩余信息，让教师清楚复核会继续
  const remaining = Math.max(0, queueTotal.value - 1)
  const tailHint = advanceToNext
    ? remaining > 0
      ? `提交后将自动取同题剩余 ${remaining} 份中的下一份继续复核。`
      : '提交后同题剩余任务为 0，将自动返回。'
    : '提交后任务将被关闭，不可撤销。'
  void confirmAsync({
    title: advanceToNext ? '确认提交并继续下一份复核？' : '确认提交该题复核？',
    content: `教师复核评分：${teacherReviewScore} / ${fullScore}（${ratio}）。${tailHint}`,
    type: 'info',
    okText: advanceToNext ? '提交并取下一份' : '确认提交',
    cancelText: '取消',
    onOk: () => (advanceToNext ? handleSubmitAndNext() : handleSubmit()),
  })
}

/** 提交核心：仅提交教师复核给分，成功返回 true；失败已提示并返回 false */
async function submitGrade(): Promise<boolean> {
  if (!examId.value || !detail.value) return false
  if (submitting.value || rejecting.value) {
    return false
  }
  const ownerOverrideReason = await resolveOwnerOverrideReason()
  if (ownerOverrideReason === null) {
    return false
  }
  submitting.value = true
  try {
    await confirmQuestionGrade({
      examId: examId.value,
      gradeResultId: detail.value.gradeResultId,
      teacherReviewScore: gradeForm.teacherReviewScore!,
      commentText: gradeForm.commentText?.trim() || undefined,
      annotationText: gradeForm.annotationText?.trim() || undefined,
      ownerOverrideReason,
    })
    ownerOverrideMode.value = false
    try {
      await refreshSnapshot()
    } catch (error) {
      showUserError(error, '考试工作台状态刷新失败')
    }
    return true
  } catch (error) {
    if (isFinalScoreConfirmLockConflict(error)) {
      message.warning('处理中')
      return false
    }
    if (isScoreWriteBlockedByFinalScoreGate(error)) {
      message.warning('最终成绩已确认/发布/更正，不能再改题分')
      return false
    }
    if (
      readBusinessResultCode(error) === ResultCode.PARAM_ERROR
      && getUserErrorMessage(error, '').includes('主考代办')
    ) {
      message.warning(getUserErrorMessage(error, '主考代办须填写代办原因'))
      return false
    }
    if (isBusinessConflict(error) && getUserErrorMessage(error, '').includes('已被其他教师领取')) {
      claimBlockedByOther.value = !isExamOwner.value
      ownerOverrideMode.value = isExamOwner.value
      message.warning(getUserErrorMessage(error, '复核任务已被其他教师领取'))
      return false
    }
    showUserError(error, '确认复核失败')
    return false
  } finally {
    submitting.value = false
  }
}

function openRejectConfirm(): void {
  if (!examId.value || !detail.value?.gradeResultId) return
  void confirmAsync({
    title: '确认驳回复核？',
    content: '驳回后任务进入仲裁队列，需仲裁教师重新处理。',
    type: 'error',
    okText: '确认驳回',
    cancelText: '取消',
    onOk: () => handleReject(),
  })
}

async function handleReject(): Promise<void> {
  if (!examId.value || !detail.value?.gradeResultId) return
  if (rejecting.value || submitting.value) {
    return
  }
  const ownerOverrideReason = await resolveOwnerOverrideReason()
  if (ownerOverrideReason === null) {
    return
  }
  rejecting.value = true
  try {
    await rejectQuestionGrade({
      examId: examId.value,
      gradeResultId: detail.value.gradeResultId,
      rejectReason: gradeForm.commentText?.trim() || '教师驳回复核结论',
      ownerOverrideReason,
    })
    ownerOverrideMode.value = false
    message.success('已驳回，任务已进入仲裁队列')
    try {
      await refreshSnapshot()
    } catch (error) {
      showUserError(error, '考试工作台状态刷新失败')
    }
    goBack()
  } catch (error) {
    if (isFinalScoreConfirmLockConflict(error)) {
      message.warning('处理中')
      return
    }
    if (isScoreWriteBlockedByFinalScoreGate(error)) {
      message.warning('最终成绩已确认/发布/更正，不能再改题分')
      return
    }
    if (
      readBusinessResultCode(error) === ResultCode.PARAM_ERROR
      && getUserErrorMessage(error, '').includes('主考代办')
    ) {
      message.warning(getUserErrorMessage(error, '主考代办须填写代办原因'))
      return
    }
    if (isBusinessConflict(error) && getUserErrorMessage(error, '').includes('已被其他教师领取')) {
      claimBlockedByOther.value = !isExamOwner.value
      ownerOverrideMode.value = isExamOwner.value
      message.warning(getUserErrorMessage(error, '复核任务已被其他教师领取'))
      return
    }
    showUserError(error, '驳回复核失败')
  } finally {
    rejecting.value = false
  }
}

/** 仅提交：保留在当前任务页（任务状态会变为 APPROVED/REJECTED） */
async function handleSubmit(): Promise<void> {
  const ok = await submitGrade()
  if (!ok) return
  message.success('题目复核已确认并关闭任务')
  await loadTask()
}

/** 流水线模式：提交成功 → 从同题队列取下一份 → 领取并跳转 */
async function handleSubmitAndNext(): Promise<void> {
  const ok = await submitGrade()
  if (!ok) return
  message.success('已提交，正在为你取下一份…')
  await takeNextTask()
}

/**
 * 从同题复核队列中挑选下一份 PENDING 任务领取并跳转。
 * 找不到下一份时返回考试工作台，提示教师本题复核已完成。
 */
async function takeNextTask(): Promise<void> {
  if (!examId.value) return
  try {
    // 重新拉一次队列，确保不包含刚提交的任务（后端可能已变状态）
    await loadReviewQueue()
    const currentTaskId = taskId.value
    const candidate = reviewQueue.value.find(
      (item) => item.reviewTaskId !== currentTaskId && item.status === ReviewTaskStatusCode.PENDING,
    )
    if (!candidate) {
      message.success('同题剩余任务复核完毕，返回考试工作台')
      void router.push({
        name: resolveReviewTaskPoolRouteName(),
        params: { examId: examId.value },
        query: reviewWorkspaceSourceQuery(),
      })
      return
    }
    // 领取下一份；后端会把状态推进到处理中并绑定到当前教师
    await claimReviewTask({
      examId: examId.value,
      reviewTaskId: candidate.reviewTaskId,
    })
    // 切换路由前清空表单 + 释放上一份切片图，避免视觉残留
    resetGradeForm()
    void router.replace({
      name: 'TeacherExamWorkspaceReviewWorkspace',
      params: { examId: examId.value, taskId: candidate.reviewTaskId },
      query: reviewWorkspaceSourceQuery(),
    })
    // watch(examId, taskId) 会自动触发 loadTask，无需手动调用
  } catch (error) {
    showUserError(error, '取下一份复核任务失败')
  }
}

// ─── 生命周期 ─────────────────────────────
watch(
  () => [examId.value, taskId.value],
  () => {
    resetTaskState()
    if (canSubmit.value) {
      void loadTask()
    }
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('keydown', handleReviewWorkspaceKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleReviewWorkspaceKeydown)
})
</script>

<style lang="scss" scoped>
.review-workspace {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 12px);
  min-width: 0;

  &__section--standard {
    border-color: var(--dp-success-border);
  }

  &__queue-progress {
    margin-bottom: 12px;
    padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-2, 8px);
  }

  &__invalidated-banner {
    margin-bottom: 8px;
  }

  &__queue-progress-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
  }

  &__keyboard-hint {
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__queue-progress-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__queue-progress-text {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__row {
    row-gap: var(--dp-space-3, 12px);
  }

  &__slice-viewer {
    min-height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--dp-surface-soft);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-3, 12px);
  }

  &__slice-image {
    max-width: 100%;
    max-height: 800px;
    object-fit: contain;
  }

  &__text-block {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: var(--dp-text-primary);
    background: var(--dp-surface-soft);
    padding: 12px;
    border-radius: var(--dp-radius-panel);
  }

  &__alert {
    margin-bottom: 12px;
  }

  &__score-input {
    width: 100%;
  }

  &__hint {
    margin-top: 4px;
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__annotation-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
  }

  &__empty {
    padding: var(--dp-space-3, 12px) 0;
  }

  &__sticky-left {
    flex: 1;
    color: var(--dp-text-secondary);
    font-size: 13px;
  }

  &__sticky-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__ai-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--dp-border);
  }

  &__ai-actions-hint {
    font-size: 12px;
    color: var(--dp-text-muted);
    margin-left: 8px;
  }
}

.review-workspace__score-triple {
  margin-bottom: 10px;
}

.review-workspace__invalidated-banner {
  margin-bottom: 8px;
}
</style>
