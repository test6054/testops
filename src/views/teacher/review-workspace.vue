<template>
  <ReviewTaskHub v-if="!taskId" />
  <div v-else class="review-workspace">
    <div class="review-workspace__toolbar">
      <UiButton variant="outline" size="sm" @click="goBack">返回</UiButton>
      <UiTag v-if="detail?.paperDisplay" tone="gray" size="sm">
        {{ detail.paperDisplay.primaryText }}
      </UiTag>
      <UiTag v-if="detail?.questionNo" tone="blue" size="sm"> 题 {{ detail.questionNo }} </UiTag>
      <UiTag v-if="detail?.status" :tone="reviewStatusTone(detail.status)" size="sm">
        {{ reviewStatusLabel(detail.status) }}
      </UiTag>
      <UiTag v-if="queueTotal > 0 && currentQueueIndex > 0" tone="purple" size="sm">
        同题进度 {{ currentQueueIndex }} / {{ queueTotal }}
      </UiTag>
      <UiButton
        variant="outline"
        size="sm"
        :disabled="!canSubmit"
        :loading="loading"
        @click="loadTask"
      >
        刷新
      </UiButton>
    </div>

    <UiEmpty v-if="!examId" description="缺少考试上下文" class="review-workspace__empty" />



    <a-spin v-else :spinning="loading" tip="正在加载任务...">
      <!-- B-7 流水线进度：当前任务在同题复核队列中的位次 -->
      <GradingWorkspaceLayout v-if="detail">
        <template #queue>
          <div v-if="queueTotal > 0 && currentQueueIndex > 0" class="review-workspace__queue-progress">
            <div class="review-workspace__queue-progress-meta">
              <span class="review-workspace__queue-progress-title">本题复核流水线</span>
              <span class="review-workspace__queue-progress-text">
                当前第 {{ currentQueueIndex }} 份，剩余
                {{ Math.max(0, queueTotal - currentQueueIndex) }} 份待复核
              </span>
              <span class="review-workspace__keyboard-hint">J/K 或 ←/→ 切换份数 · 0-9 快捷给分</span>
            </div>
            <a-progress
              :percent="queueProgressPercent"
              :show-info="true"
              size="small"
              :status="queueProgressPercent >= 100 ? 'success' : 'active'"
            />
            <a-space class="review-workspace__queue-jump" size="small">
              <span class="review-workspace__jump-label">跳转到第</span>
              <a-input-number
                :value="jumpTarget ?? undefined"
                :min="1"
                :max="queueTotal"
                size="small"
                style="width: 80px"
                @update:value="
                  (value) => {
                    jumpTarget = typeof value === 'number' ? value : null
                  }
                "
                @keydown.enter="handleQueueJump"
              />
              <span class="review-workspace__jump-label">份</span>
              <UiButton size="sm" :disabled="!jumpTarget" @click="handleQueueJump">跳转</UiButton>
            </a-space>
          </div>
        </template>

        <template #main>
          <!-- FIX-3: 题目题干 -->
          <UiCard v-if="detail?.questionStem" class="review-workspace__card">
            <template #title>
              <FileTextOutlined />
              <span>题目题干 · 第 {{ detail.questionNo }} 题 · 满分 {{ detail.fullScore }}</span>
            </template>
            <a-typography-paragraph :ellipsis="{ rows: 4, expandable: true, symbol: '展开' }">
              {{ detail.questionStem }}
            </a-typography-paragraph>
          </UiCard>

          <UiCard class="review-workspace__card">
            <template #title>
              <FileImageOutlined />
              <span>阅卷影像</span>
            </template>
            <UiEmpty
              v-if="
                !detail?.sliceFileId && !detail?.sourceScanPage && !detail?.masterPaperPage?.fileId
              "
              description="暂无数据"
            />
            <MarkingScanMaterialPanel
              v-else
              :slice-file-id="detail?.sliceFileId"
              :source-scan-page="detail?.sourceScanPage"
              :master-paper-page="detail?.masterPaperPage"
            />
          </UiCard>

          <UiCard class="review-workspace__card">
            <template #title>
              <FileTextOutlined />
              <span>识别答案</span>
            </template>
            <UiEmpty v-if="!detail?.recognizedAnswer" description="暂无数据" />
            <div v-else class="review-workspace__text-block">{{ detail.recognizedAnswer }}</div>
          </UiCard>

          <!-- FIX-3: 标准答案对照 -->
          <UiCard
            v-if="detail?.standardAnswer"
            class="review-workspace__card review-workspace__card--standard"
          >
            <template #title>
              <CheckCircleOutlined />
              <span>标准答案</span>
              <UiTag v-if="detail.comparePolicy" tone="blue" size="sm">
                {{ comparePolicyLabel(detail.comparePolicy) }}
              </UiTag>
            </template>
            <div class="review-workspace__text-block review-workspace__standard-answer">
              {{ detail.standardAnswer }}
            </div>
          </UiCard>

          <UiCard class="review-workspace__card">
            <template #title>
              <RobotOutlined />
              <span>AI 复评说明</span>
              <UiTag v-if="currentAiSourceLabel" :tone="currentAiSourceTone" size="sm">
                {{ currentAiSourceLabel }}
              </UiTag>
              <UiTag v-if="detail?.aiTraceId" tone="gray" size="sm" class="review-workspace__trace">
                处理追踪编号 {{ detail.aiTraceId }}
              </UiTag>
              <UiTag v-if="detail?.aiLimited" tone="orange" size="sm">AI 限流/阻断</UiTag>
            </template>
            <template #extra>
              <a-space>
                <UiButton
                  size="sm"
                  variant="ghost"
                  :loading="executionsLoading"
                  :disabled="!detail"
                  @click="openExecutionsDrawer"
                >
                  查看 AI 历史
                </UiButton>
                <UiButton
                  size="sm"
                  variant="outline"
                  :disabled="!canRescoreByAi"
                  :loading="rescoring"
                  @click="openRescoreConfirm"
                >
                  <template #icon><RobotOutlined /></template>
                  重新生成 AI 复评
                </UiButton>
              </a-space>
            </template>
            <UiEmpty v-if="!detail?.aiDiagnostic" description="暂无数据" />
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
                采纳评分并提交
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                :disabled="!canAdoptAiSuggestion"
                @click="adoptAiSuggestion"
              >
                填入表单（微调）
              </UiButton>
              <UiButton
                size="sm"
                variant="ghost"
                :disabled="!canConfirm"
                @click="clearAiSuggestionToManual"
              >
                清空 AI 评分改人工
              </UiButton>
            </div>
          </UiCard>

          <!-- AI 历次执行记录抽屉：教师复核异议决策时提供完整审计证据 -->
          <a-drawer
            v-model:open="executionsDrawerOpen"
            title="本题 AI 历次执行记录"
            width="720"
            placement="right"
            :closable="true"
            destroy-on-close
          >
            <a-spin :spinning="executionsLoading" tip="加载 AI 历史...">
              <UiEmpty
                v-if="!executionsLoading && aiExecutions.length === 0"
                description="暂无数据"
              />
              <a-timeline v-else>
                <a-timeline-item
                  v-for="(item, index) in aiExecutions"
                  :key="`${item.traceId}-${index}`"
                  :color="timelineColor(item.status)"
                >
                  <div class="review-workspace__execution-item">
                    <div class="review-workspace__execution-meta">
                      <UiTag :tone="abilityTone(item.abilityCode)" size="sm">
                        {{ abilityLabel(item.abilityCode) }}
                      </UiTag>
                      <UiTag :tone="statusTone(item.status)" size="sm">
                        {{ statusLabel(item.status) }}
                      </UiTag>
                      <span class="review-workspace__execution-time">
                        {{ formatDateTime(item.createTime) }}
                      </span>
                      <span
                        v-if="item.latencyMs != null"
                        class="review-workspace__execution-latency"
                      >
                        耗时 {{ item.latencyMs }} ms
                      </span>
                    </div>
                    <div v-if="item.traceId" class="review-workspace__execution-trace">
                      处理追踪编号：{{ item.traceId }}
                    </div>
                    <div v-if="item.modelName" class="review-workspace__execution-model">
                      模型：{{ item.modelName }}
                      <span> / {{ providerLabel(item.providerType) }}</span>
                    </div>
                    <div v-if="item.diagnostic" class="review-workspace__execution-diag">
                      <strong>处理说明：</strong>{{ executionDiagnosticText(item.diagnostic) }}
                    </div>
                    <div v-if="item.responseSummary" class="review-workspace__execution-summary">
                      <strong>响应摘要：</strong>{{ item.responseSummary }}
                    </div>
                  </div>
                </a-timeline-item>
              </a-timeline>
            </a-spin>
          </a-drawer>
        </template>

        <template #aside>
          <UiCard class="review-workspace__card">
            <template #title>
              <EditOutlined />
              <span>教师给分</span>
            </template>

            <a-form
              ref="gradeFormRef"
              :model="gradeForm"
              :rules="gradeFormRules"
              layout="vertical"
              :disabled="!canConfirm"
            >
              <a-form-item label="教师复核评分" name="teacherReviewScore" required>
                <a-input-number
                  v-model:value="gradeForm.teacherReviewScore"
                  :min="0"
                  :max="detail.fullScore"
                  :step="0.5"
                  class="review-workspace__score-input"
                />
                <div class="review-workspace__hint">满分 {{ detail.fullScore }} 分</div>
                <!-- FIX-10: 快捷给分按钮 -->
                <a-space size="small" class="review-workspace__quick-scores">
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
                    填入 AI 分
                  </UiButton>
                </a-space>
              </a-form-item>
              <a-form-item label="评语（面向学生）" name="commentText">
                <a-textarea
                  v-model:value="gradeForm.commentText"
                  placeholder="给学生的反馈评语（可选）"
                  :rows="3"
                  :maxlength="1000"
                  show-count
                />
              </a-form-item>
              <a-form-item label="批注（内部教研）" name="annotationText">
                <a-textarea
                  v-model:value="gradeForm.annotationText"
                  placeholder="可记录采分点、疑点，内部可见（可选）"
                  :rows="3"
                  :maxlength="1000"
                  show-count
                />
              </a-form-item>
            </a-form>
          </UiCard>

          <UiCard class="review-workspace__card">
            <template #title>
              <CommentOutlined />
              <span>批注历史</span>
            </template>
            <UiEmpty v-if="annotations.length === 0" description="暂无数据" />
            <a-list v-else :data-source="annotations" size="small">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta>
                    <template #title>
                      <a-typography-text :content="item.annotationText || '（无批注正文）'" />
                    </template>
                    <template #description>
                      <span class="review-workspace__hint">{{
                        formatDateTime(item.createTime)
                      }}</span>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </UiCard>
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
            <UiButton variant="ghost" size="md" @click="goBack"> 返回 </UiButton>
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
              variant="outline"
              size="md"
              :disabled="!canConfirm || !detail.gradeResultId"
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
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { AnnotationVO } from '@/apis/mark/exam-annotation'
import type {
  AiAbilityCode,
  AiExecutionStatusCode,
  AiProviderTypeCode,
  ExamQuestionAiExecutionItemVO,
} from '@/apis/mark/exam-grade'
import type {
  ReviewTaskDetailVO,
  ReviewTaskItemVO,
  ReviewTaskStatusCode,
} from '@/apis/mark/exam-review-task'
import type { ObjectiveComparePolicyCode } from '@/apis/mark/exam-standard-answer'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import CommentOutlined from '@ant-design/icons-vue/CommentOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listAnnotations, validateAnnotationContract } from '@/apis/mark/exam-annotation'
import {
  AI_ABILITY_LABEL,
  AI_ABILITY_TONE,
  AI_EXECUTION_STATUS_LABEL,
  AI_EXECUTION_STATUS_TONE,
  AI_PROVIDER_TYPE_LABEL,
  confirmQuestionGrade,
  listAiExecutionsForQuestion,
  rejectQuestionGrade,
  rescoreQuestionByAi,
} from '@/apis/mark/exam-grade'
import {
  claimReviewTask,
  getReviewTaskDetail,
  listReviewTasks,
  REVIEW_TASK_STATUS_LABEL,
  REVIEW_TASK_STATUS_TONE,
} from '@/apis/mark/exam-review-task'
import { OBJECTIVE_COMPARE_POLICY_OPTIONS } from '@/apis/mark/exam-standard-answer'
import GradingWorkspaceLayout from '@/components/mark/GradingWorkspaceLayout.vue'
import MarkingScanMaterialPanel from '@/components/mark/MarkingScanMaterialPanel.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { isGradingKeyboardInputTarget } from '@/utils/grading-keyboard'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ReviewTaskHub from '@/views/teacher/review-task-hub.vue'

defineOptions({ name: 'TeacherExamWorkspaceReviewWorkspace' })

const REVIEW_WORKSPACE_PAGE_SIZE = 100

function reviewStatusTone(value: ReviewTaskStatusCode): BadgeTone {
  return strictEnumTone(REVIEW_TASK_STATUS_TONE, value, '复核任务状态')
}

function reviewStatusLabel(value: ReviewTaskStatusCode): string {
  return strictEnumLabel(REVIEW_TASK_STATUS_LABEL, value, '复核任务状态')
}

/** 客观题比对策略文案，与后端 ObjectiveComparePolicy 枚举对齐 */
const COMPARE_POLICY_LABEL = Object.fromEntries(
  OBJECTIVE_COMPARE_POLICY_OPTIONS.map((item) => [item.value, item.label]),
) as Record<ObjectiveComparePolicyCode, string>

function comparePolicyLabel(code: ObjectiveComparePolicyCode): string {
  return strictEnumLabel(COMPARE_POLICY_LABEL, code, '客观题比较策略')
}

const route = useRoute()
const router = useRouter()
const { refreshSnapshot } = useWorkspaceExamId()

const examId = computed(() => (route.params.examId ? String(route.params.examId) : ''))
const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))

function goBack(): void {
  if (!examId.value) {
    void router.push({ name: 'TeacherExamList' })
    return
  }
  if (taskId.value) {
    void router.push({ name: 'TeacherExamWorkspaceReviewBatchConfirm', params: { examId: examId.value } })
    return
  }
  void router.push({ name: 'TeacherExamWorkspaceMarkingTaskPool', params: { examId: examId.value } })
}

// ─── 复核任务详情 ──────────────────────────
const detail = ref<ReviewTaskDetailVO | null>(null)
const loading = ref(false)

const canSubmit = computed(() => !!examId.value && !!taskId.value)

/** 当前任务是否允许提交复核（PENDING / IN_PROGRESS） */
const canConfirm = computed(() => {
  const status = detail.value?.status
  return status === 'PENDING' || status === 'IN_PROGRESS'
})

// ─── 批注列表 ─────────────────────────────
const annotations = ref<AnnotationVO[]>([])

async function loadAnnotations(): Promise<void> {
  if (!examId.value || !detail.value) return
  const currentExamId = examId.value
  const { paperInstanceId, questionTemplateId, gradeResultId } = detail.value
  try {
    annotations.value = await readAllPages(
      (pageNum) =>
        listAnnotations({
          examId: currentExamId,
          paperInstanceId,
          questionTemplateId,
          gradeResultId,
          pageNum,
          pageSize: REVIEW_WORKSPACE_PAGE_SIZE,
        }),
      '批注记录加载失败，请刷新后重试',
    )
    annotations.value.forEach(validateAnnotationContract)
  } catch (error) {
    showUserError(error, '批注记录加载失败')
  }
}

// ─── B-7 同题剩余复核任务队列（用于「提交并取下一份」流水线接力） ─────
const reviewQueue = ref<ReviewTaskItemVO[]>([])

/**
 * 加载当前考试 + 当前题目下仍可复核的任务集合（PENDING + IN_PROGRESS）。
 * 当前任务自身会包含在内，用于精确计算「我在第几份 / 共几份」。
 */
async function loadReviewQueue(): Promise<void> {
  if (!examId.value || !detail.value?.questionTemplateId) {
    reviewQueue.value = []
    return
  }
  const currentExamId = examId.value
  const { questionTemplateId } = detail.value
  try {
    // 后端 ReviewTaskQueryRequest.status 可选；同题下分别拉 PENDING / IN_PROGRESS 后合并去重。
    const [pendingItems, inProgressItems] = await Promise.all([
      readAllPages(
        (pageNum) =>
          listReviewTasks({
            examId: currentExamId,
            questionTemplateId,
            status: 'PENDING',
            pageNum,
            pageSize: REVIEW_WORKSPACE_PAGE_SIZE,
          }),
        '同题复核队列加载失败，请刷新后重试',
      ),
      readAllPages(
        (pageNum) =>
          listReviewTasks({
            examId: currentExamId,
            questionTemplateId,
            status: 'IN_PROGRESS',
            pageNum,
            pageSize: REVIEW_WORKSPACE_PAGE_SIZE,
          }),
        '同题复核队列加载失败，请刷新后重试',
      ),
    ])
    const merged = new Map<string, ReviewTaskItemVO>()
    for (const item of [...pendingItems, ...inProgressItems]) {
      merged.set(item.reviewTaskId, item)
    }
    reviewQueue.value = Array.from(merged.values())
  } catch (error) {
    showUserError(error, '同题复核队列加载失败，提交并取下一份暂不可用。')
    reviewQueue.value = []
  }
}

/**
 * 当前任务在同题复核队列中的 1-based 位次，找不到时回退为 1（流水线尚未刷新到当前任务）。
 */
const currentQueueIndex = computed<number>(() => {
  if (!detail.value || reviewQueue.value.length === 0) {
    return 0
  }
  const idx = reviewQueue.value.findIndex((item) => item.reviewTaskId === taskId.value)
  return idx >= 0 ? idx + 1 : 0
})

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

// ─── 加载主流程 ───────────────────────────
async function loadTask(): Promise<void> {
  if (!canSubmit.value) return
  loading.value = true
  try {
    detail.value = await loadReviewTaskDetail()
    await Promise.all([loadAnnotations(), loadReviewQueue()])
    // 默认填充 AI 评分（仅当表单空时；避免覆盖教师正在编辑的值）
    if (
      gradeForm.teacherReviewScore === undefined
      && detail.value?.aiScore !== undefined
      && detail.value?.aiScore !== null
    ) {
      gradeForm.teacherReviewScore = detail.value.aiScore
    }
  } catch (error) {
    showUserError(error, '教师复核工作台任务加载失败')
  } finally {
    loading.value = false
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
  annotations.value = []
  reviewQueue.value = []
  executionsDrawerOpen.value = false
  aiExecutions.value = []
}

/**
 * 加载复核任务详情：活跃态任务先 claim 绑定当前教师，只读态（APPROVED/REJECTED 已关闭）走 detail。
 */
async function loadReviewTaskDetail(): Promise<ReviewTaskDetailVO> {
  const preview = await getReviewTaskDetail({
    examId: examId.value,
    reviewTaskId: taskId.value,
  })
  if (
    preview.status === 'PENDING'
    || preview.status === 'REJECTED'
    || preview.status === 'IN_PROGRESS'
  ) {
    return claimReviewTask({
      examId: examId.value,
      reviewTaskId: taskId.value,
    })
  }
  return preview
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

const submitting = ref(false)
const rejecting = ref(false)

// 单题 AI 复评状态：17B 文档设定仅在教师异议阶段允许调用，服务端守门 CONFIRMED 不可复评
const rescoring = ref(false)

/** 是否可以调用单题 AI 复评，需同时满足：存在 gradeResultId、状态为 PENDING/IN_PROGRESS、未提交中 */
const canRescoreByAi = computed<boolean>(() => {
  if (rescoring.value || submitting.value) return false
  if (!examId.value) return false
  if (!detail.value) return false
  return detail.value.status === 'PENDING' || detail.value.status === 'IN_PROGRESS'
})

/**
 * 二次确认 → 调用 rescoreQuestionByAi → 成功后 loadTask 刷新详情。
 * 后端只会重写 AI 评分 / aiTraceId / aiDiagnostic / aiLimited 等辅助字段，
 * gradeStatus 保持 NEED_REVIEW、teacherReviewScore 置空；教师复核评分仍需教师提交复核入口写入。
 */
function openRescoreConfirm(): void {
  if (!canRescoreByAi.value) return
  void confirmAsync({
    title: '重新生成单题 AI 复评？',
    content: '系统会重新生成单题 AI 复评结果。复评只更新 AI 评分和评分说明，不会写入教师复核评分。',
    type: 'info',
    okText: '生成 AI 复评',
    cancelText: '取消',
    onOk: () => doRescoreByAi(),
  })
}

/** 实际发起调用，成功后由 loadTask 重拉全量详情以同步重写后的 AI 评分和诊断 */
async function doRescoreByAi(): Promise<void> {
  if (!canRescoreByAi.value || !examId.value || !detail.value) return
  rescoring.value = true
  try {
    const result = await rescoreQuestionByAi({
      examId: examId.value,
      gradeResultId: detail.value.gradeResultId,
    })
    if (Boolean(result.scored) && result.aiScore != null) {
      message.success(`AI 复评完成，AI 评分 ${result.aiScore} 分`)
    } else {
      message.warning(executionDiagnosticText(result.diagnostic))
    }
    await loadTask()
    if (executionsDrawerOpen.value) {
      void loadAiExecutions()
    }
  } catch (error) {
    showUserError(error, 'AI 复评调用失败')
  } finally {
    rescoring.value = false
  }
}

// ─── AI 评分采纳 / 清空 / 历史分支 ──────────────────────────────

/** 当前 AI 评分来源文案：使用后端返回的 AI 能力编码，不从 traceId 推断。 */
const currentAiSourceLabel = computed<string>(() => {
  const abilityCode = detail.value?.aiAbilityCode
  if (!abilityCode) return ''
  return strictEnumLabel(AI_ABILITY_LABEL, abilityCode, 'AI 能力编码')
})

/** 当前 AI 评分来源色调，与 currentAiSourceLabel 保持一致区分 */
const currentAiSourceTone = computed<BadgeTone>(() => {
  const abilityCode = detail.value?.aiAbilityCode
  if (!abilityCode) return 'gray'
  return strictEnumTone(AI_ABILITY_TONE, abilityCode, 'AI 能力编码')
})

/** 将 AI 执行诊断转为阅卷员可理解的业务提示，避免直接暴露接口或模型内部细节。 */
function executionDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    'AI 复评暂未生成可采纳评分，请按题目评分细则继续人工复核',
  )
}

/** 是否可采纳 AI 评分：同时要求任务可提交、存在 AI 评分 */
const canAdoptAiSuggestion = computed<boolean>(() => {
  if (!canConfirm.value) return false
  return detail.value?.aiScore != null
})
computed(() => {
  const aiScore = detail.value?.aiScore
  if (aiScore == null) return '采纳 AI 评分（AI 尚未给分）'
  return `采纳 AI 评分 (${aiScore} 分)`
})
/** 一键采纳当前 AI 评分到教师复核评分表单，并重走表单校验 */
function adoptAiSuggestion(): void {
  if (!canAdoptAiSuggestion.value) return
  const aiScore = detail.value?.aiScore
  if (aiScore == null) return
  gradeForm.teacherReviewScore = aiScore
  void gradeFormRef.value?.validateFields(['teacherReviewScore'])
  message.success(`已填入 AI 评分 ${aiScore}，可微调后提交`)
}

/** 采纳当前 AI 评分并立即提交教师复核结论，成功后进入下一份流水线。 */
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
  message.success('已采纳 AI 评分并提交，正在为你取下一份…')
  await takeNextTask()
}

/** 清空 AI 评分转人工评分，仅重置表单不会反向写库 */
function clearAiSuggestionToManual(): void {
  gradeForm.teacherReviewScore = undefined
  message.info('已清空 AI 评分，请按题目原则手工输入教师复核评分')
}

// AI 历史执行记录抽屉状态
const executionsDrawerOpen = ref<boolean>(false)
const executionsLoading = ref<boolean>(false)
const aiExecutions = ref<ExamQuestionAiExecutionItemVO[]>([])

/** 打开抽屉后拉取历史记录 */
function openExecutionsDrawer(): void {
  if (!detail.value || !examId.value) return
  executionsDrawerOpen.value = true
  void loadAiExecutions()
}

async function loadAiExecutions(): Promise<void> {
  if (!examId.value || !detail.value) return
  executionsLoading.value = true
  try {
    const records = await listAiExecutionsForQuestion({
      examId: examId.value,
      gradeResultId: detail.value.gradeResultId,
    })
    validateAiExecutionContracts(records)
    aiExecutions.value = records
  } catch (error) {
    showUserError(error, 'AI 复评历史加载失败')
    aiExecutions.value = []
  } finally {
    executionsLoading.value = false
  }
}

/** 能力编码 -> 来源文案 */
function abilityLabel(code: AiAbilityCode): string {
  return strictEnumLabel(AI_ABILITY_LABEL, code, 'AI 能力编码')
}

/** 能力编码 -> 来源色调 */
function abilityTone(code: AiAbilityCode): BadgeTone {
  return strictEnumTone(AI_ABILITY_TONE, code, 'AI 能力编码')
}

/** 状态编码 -> 文案 */
function statusLabel(status: AiExecutionStatusCode): string {
  return strictEnumLabel(AI_EXECUTION_STATUS_LABEL, status, 'AI 执行状态')
}

/** 状态编码 -> 色调 */
function statusTone(status: AiExecutionStatusCode): BadgeTone {
  return strictEnumTone(AI_EXECUTION_STATUS_TONE, status, 'AI 执行状态')
}

/** AI 供应商类型 -> 中文文案 */
function providerLabel(providerType: AiProviderTypeCode): string {
  return strictEnumLabel(AI_PROVIDER_TYPE_LABEL, providerType, 'AI 供应商类型')
}

/** 时间线节点色彩，与状态一致 */
function timelineColor(status: AiExecutionStatusCode): string {
  return strictEnumTone(AI_EXECUTION_STATUS_TONE, status, 'AI 执行状态')
}

function validateAiExecutionContracts(records: ExamQuestionAiExecutionItemVO[]): void {
  records.forEach((record) => {
    strictEnumLabel(AI_ABILITY_LABEL, record.abilityCode, 'AI 能力编码')
    strictEnumLabel(AI_EXECUTION_STATUS_LABEL, record.status, 'AI 执行状态')
    strictEnumLabel(AI_PROVIDER_TYPE_LABEL, record.providerType, 'AI 供应商类型')
  })
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
  submitting.value = true
  try {
    await confirmQuestionGrade({
      examId: examId.value,
      gradeResultId: detail.value.gradeResultId,
      teacherReviewScore: gradeForm.teacherReviewScore!,
      commentText: gradeForm.commentText?.trim() || undefined,
      annotationText: gradeForm.annotationText?.trim() || undefined,
    })
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
    return true
  } catch (error) {
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
  rejecting.value = true
  try {
    await rejectQuestionGrade({
      examId: examId.value,
      gradeResultId: detail.value.gradeResultId,
      rejectReason: gradeForm.commentText?.trim() || '教师驳回复核结论',
    })
    message.success('已驳回，任务已进入仲裁队列')
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
    goBack()
  } catch (error) {
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
      (item) =>
        item.reviewTaskId !== currentTaskId
        && (item.status === 'PENDING' || item.status === 'IN_PROGRESS'),
    )
    if (!candidate) {
      message.success('同题剩余任务复核完毕，返回考试工作台')
      void router.push({
        name: 'TeacherExamWorkspaceReviewBatchConfirm',
        params: { examId: examId.value },
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
  gap: 16px;
  min-width: 0;

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__signals {
    margin-bottom: 12px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__queue-progress {
    margin-bottom: 12px;
    padding: 12px 16px;
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__queue-progress-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 16px;
  }

  &__keyboard-hint {
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__queue-progress-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__queue-progress-text {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__row {
    row-gap: 16px;
  }

  &__card {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__slice-viewer {
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--dp-surface-soft, #f8fafc);
    border-radius: var(--dp-radius-md, 6px);
    padding: 16px;
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
    color: var(--dp-text-primary, #0f172a);
    background: var(--dp-surface-soft, #f8fafc);
    padding: 12px;
    border-radius: var(--dp-radius-md, 6px);
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
    color: var(--dp-text-muted, #64748b);
  }

  &__annotation-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
  }

  &__empty {
    padding: 60px 0;
  }

  &__sticky-left {
    flex: 1;
    color: var(--dp-text-secondary, #475569);
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
    border-top: 1px dashed var(--dp-border, #e2e8f0);
  }

  &__ai-actions-hint {
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
    margin-left: 8px;
  }

  &__execution-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__execution-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__execution-time {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__execution-latency {
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__execution-trace {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
    word-break: break-all;
  }

  &__execution-model,
  &__execution-diag,
  &__execution-summary {
    font-size: 13px;
    line-height: 1.6;
    color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  }
}
</style>
