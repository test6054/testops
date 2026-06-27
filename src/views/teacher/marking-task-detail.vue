<template>
  <div class="marking-task-detail-page">
    <div class="marking-task-detail-page__toolbar">
      <div class="marking-task-detail-page__toolbar-main">
        <UiButton variant="outline" size="sm" @click="goBackToTaskPool">
          <template #icon><LeftOutlined /></template>
          返回任务池
        </UiButton>
        <UiTag v-if="task" :tone="taskStatusTone(task.taskStatus)" size="sm">
          {{ taskStatusLabel(task.taskStatus) }}
        </UiTag>
        <UiTag v-if="task" tone="blue" size="sm">第 {{ task.reviewRound }} 轮</UiTag>
        <template v-if="task">
          <UiTag tone="purple" size="sm">{{ anonymityModeLabel(task.anonymityMode) }}</UiTag>
          <UiTag tone="gray" size="sm">{{ allocationUnitLabel(task.taskUnit) }}</UiTag>
          <UiTag tone="gray" size="sm">{{ task.paperDisplay.primaryText }}</UiTag>
          <UiTag v-if="task.paperDisplay.secondaryText" tone="blue" size="sm">
            {{ task.paperDisplay.secondaryText }}
          </UiTag>
          <UiTag v-if="isReadOnly" tone="green" size="sm">已定稿 · 只读查看</UiTag>
        </template>
        <template v-if="task?.anonymousToken">
          <UiTag v-if="revealedIdentity" tone="orange" size="sm">
            {{ revealedIdentity.studentName }}（{{ revealedIdentity.studentNo }}）
          </UiTag>
          <UiButton
            v-if="!revealedIdentity && isExamOwner"
            variant="outline"
            size="sm"
            @click="openRevealDialog"
          >
            <template #icon><UnlockOutlined /></template>
            解匿名
          </UiButton>
          <a-tooltip v-else-if="!revealedIdentity && !isExamOwner" title="当前为匿名阅卷模式，仅考试主考老师可解匿名查看学生身份">
            <UiTag tone="purple" size="sm">匿名保护中</UiTag>
          </a-tooltip>
        </template>
      </div>
      <div class="marking-task-detail-page__toolbar-actions">
        <template v-if="batchProgress">
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!prevTaskId"
            @click="goToTask(prevTaskId)"
          >
            <template #icon><LeftOutlined /></template>
            {{ navPrevLabel }}
          </UiButton>
          <span class="marking-task-detail-page__progress">
            {{ batchProgress.current }} / {{ batchProgress.total }}
          </span>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!nextTaskId"
            @click="goToTask(nextTaskId)"
          >
            {{ navNextLabel }}
            <template #icon><RightOutlined /></template>
          </UiButton>
        </template>
        <UiButton variant="outline" size="sm" :loading="loading" @click="loadTask">
          <template #icon><ReloadOutlined /></template>
          刷新
        </UiButton>
      </div>
    </div>

    <UiEmpty
      v-if="!taskId"
      description="暂无数据"
      class="marking-task-detail-page__empty"
    />



    <a-spin v-else :spinning="loading">
      <UiEmpty
        v-if="!loading && !task"
        description="暂无数据"
        class="marking-task-detail-page__empty"
      />



      <GradingWorkspaceLayout v-if="task">
        <template #main>
          <MarkingQuestionViewCard
            :show-whole-paper-placeholder="usesWholePaperWorkspace"
            :loading="questionViewLoading"
            :loaded="questionViewLoaded"
            :question-view="questionView"
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
            @reload="reloadWholePaperView"
            @scroll="handleWholePageGalleryScroll"
            @viewport-ready="handleGalleryViewportReady"
            @update:page-annotation="(pageId, value) => { wholePageAnnotationForms[pageId] = value }"
          />

          <UiCard class="info-card">
            <template #title>
              <ProfileOutlined />
              <span>任务详情</span>
            </template>

            <a-descriptions
              :column="{ xs: 1, sm: 2 }"
              size="middle"
              bordered
              class="task-descriptions"
            >
              <a-descriptions-item label="任务编号">
                <a-typography-text copyable>{{ task.id }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="正评会话编号">
                <a-typography-text copyable>{{ task.sessionId }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="题组编号">
                <a-typography-text v-if="task.groupId" copyable>
                  {{ task.groupId }}
                </a-typography-text>
                <UiTag v-else tone="gray" size="sm">组织级任务</UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="任务单元">
                {{ allocationUnitLabel(task.taskUnit) }}
              </a-descriptions-item>
              <a-descriptions-item label="匿名模式">
                {{ anonymityModeLabel(task.anonymityMode) }}
              </a-descriptions-item>
              <a-descriptions-item label="评阅轮次">
                第 {{ task.reviewRound }} 轮
              </a-descriptions-item>
              <a-descriptions-item label="任务状态">
                <UiTag :tone="taskStatusTone(task.taskStatus)" size="sm">
                  {{ taskStatusLabel(task.taskStatus) }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="分配时间">
                {{ formatDateTime(task.allocatedTime) }}
              </a-descriptions-item>
              <a-descriptions-item label="提交时间">
                {{ formatDateTime(task.submittedTime) }}
              </a-descriptions-item>
              <a-descriptions-item
                v-if="task.score !== undefined && task.score !== null"
                label="当前给分"
              >
                <a-typography-text strong>{{ task.score }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item v-if="task.annotationNote" label="既有批注" :span="2">
                <a-typography-paragraph :ellipsis="{ rows: 3, expandable: true, symbol: '展开' }">
                  {{ task.annotationNote }}
                </a-typography-paragraph>
              </a-descriptions-item>
            </a-descriptions>
          </UiCard>
        </template>

        <template #aside>
          <UiCard class="info-card">
            <template #title>
              <EditOutlined />
              <span>{{ usesWholePaperWorkspace ? '当前任务负责题目' : '批改提交' }}</span>
            </template>

            <a-form
              ref="formRef"
              :model="form"
              :rules="rules"
              layout="vertical"
              :disabled="!canSubmit"
            >
              <template v-if="usesWholePaperWorkspace">
                <UiEmpty
                  v-if="wholeQuestions.length === 0"
                  description="暂无数据"
                />
                <div
                  v-for="(question, questionIndex) in wholeQuestions"
                  :key="question.questionTemplateId"
                  class="whole-question-score"
                >
                  <div class="whole-question-score__header">
                    <UiTag tone="blue" size="sm">第 {{ question.questionNo }} 题</UiTag>
                    <UiTag tone="gray" size="sm">{{ question.questionTypeMessage }}</UiTag>
                    <UiTag tone="green" size="sm">满分 {{ question.fullScore }}</UiTag>
                    <UiButton
                      size="sm"
                      variant="outline"
                      :disabled="!question.pageId"
                      @click="focusWholeQuestionPage(question)"
                    >
                      定位答题页
                    </UiButton>
                  </div>
                  <a-typography-paragraph
                    v-if="question.recognizedAnswer"
                    class="whole-question-score__recognized-answer"
                    :ellipsis="{ rows: 3, expandable: true, symbol: '展开' }"
                  >
                    {{ question.recognizedAnswer }}
                  </a-typography-paragraph>
                  <a-typography-text
                    v-else
                    type="secondary"
                    class="whole-question-score__recognized-answer--empty"
                  >
                    正式 OCR 未识别出可展示答案
                  </a-typography-text>
                  <a-input-number
                    v-model:value="getWholeQuestionForm(question.questionTemplateId).score"
                    :ref="(el: unknown) => setWholeQuestionScoreInputRef(el, questionIndex)"
                    :min="0"
                    :max="question.fullScore"
                    :step="0.5"
                    :disabled="isReadOnly"
                    style="width: 100%; margin-bottom: 8px"
                    placeholder="本题给分"
                    @keydown.enter.prevent="handleWholeQuestionScoreEnter(questionIndex)"
                  />
                  <div v-if="question.aiScore != null" class="whole-question-score__ai">
                    <div class="whole-question-score__ai-text">
                      <span>AI 建议分：</span>
                      <strong>{{ question.aiScore }}</strong>
                      <span>/ {{ question.fullScore }}</span>
                    </div>
                    <a-space size="small" wrap>
                      <UiButton
                        size="sm"
                        variant="outline"
                        :disabled="isReadOnly"
                        @click="fillWholeQuestionAiScore(question)"
                      >
                        填入 AI 分
                      </UiButton>
                      <UiButton
                        size="sm"
                        variant="primary"
                        :disabled="isReadOnly || submitting || !canSubmit"
                        @click="acceptWholeQuestionAiScore(question, questionIndex)"
                      >
                        {{ questionIndex === wholeQuestions.length - 1 ? '采纳并提交' : '采纳并继续' }}
                      </UiButton>
                    </a-space>
                    <a-typography-paragraph
                      v-if="question.aiDiagnostic"
                      class="whole-question-score__ai-diagnostic"
                      :ellipsis="{ rows: 2, expandable: true, symbol: '展开' }"
                    >
                      {{ question.aiDiagnostic }}
                    </a-typography-paragraph>
                  </div>
                  <a-textarea
                    v-model:value="getWholeQuestionForm(question.questionTemplateId).annotationText"
                    :rows="3"
                    :maxlength="1000"
                    :disabled="isReadOnly"
                    placeholder="题目批注，可选"
                    show-count
                  />
                </div>
              </template>
              <a-form-item v-else label="教师给分" name="score" required>
                <a-input-number
                  ref="scoreInputRef"
                  v-model:value="form.score"
                  :min="0"
                  :max="questionView?.fullScore"
                  :step="0.5"
                  style="width: 100%"
                  placeholder="按题目满分给分"
                  @keydown.enter.prevent="submit"
                />
                <!-- FIX-10: 快捷给分 -->
                <a-space size="small" style="margin-top: 8px">
                  <UiButton size="sm" variant="outline" :disabled="isReadOnly" @click="form.score = questionView?.fullScore">满分</UiButton>
                  <UiButton size="sm" variant="outline" :disabled="isReadOnly" @click="form.score = Math.round((questionView?.fullScore ?? 0) / 2 * 10) / 10">半分</UiButton>
                  <UiButton size="sm" variant="outline" :disabled="isReadOnly" @click="form.score = 0">零分</UiButton>
                  <UiButton v-if="questionView?.aiScore != null" size="sm" variant="outline" :disabled="isReadOnly" @click="form.score = questionView.aiScore">填入 AI 分</UiButton>
                  <UiButton
                    v-if="questionView?.aiScore != null"
                    size="sm"
                    variant="primary"
                    :disabled="isReadOnly || submitting || !canSubmit"
                    @click="acceptAiScoreAndSubmit"
                  >
                    采纳并提交
                  </UiButton>
                </a-space>
                <p v-if="!usesWholePaperWorkspace" class="marking-task-detail-page__keyboard-hint">
                  J/K 或 ←/→ 切换任务 · 0-9 快捷给分 · Enter 提交
                </p>
              </a-form-item>
              <a-form-item v-if="!usesWholePaperWorkspace" label="批改批注" name="annotationNote">
                <a-textarea
                  v-model:value="form.annotationNote"
                  :rows="6"
                  :maxlength="1000"
                  placeholder="可选，记录采分点 / 扣分点 / 反馈意见"
                  show-count
                />
              </a-form-item>
              <a-form-item v-if="canSubmit">
                <UiButton block size="md" :loading="submitting" @click="submit">
                  确认给分并提交（Enter）· 自动切换{{ isWholePaperTask ? '下一份' : '下一题' }}
                </UiButton>
              </a-form-item>
            </a-form>
          </UiCard>
        </template>
      </GradingWorkspaceLayout>
    </a-spin>

    <RevealAnonymousModal
      v-if="task"
      v-model:open="revealOpen"
      :exam-id="task.examId"
      :task-id="task.id"
      @revealed="handleAnonymousRevealed"
    />
  </div>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { AnonymityModeCode } from '@/apis/mark/anonymity-mode'
import type {
  ExamDetailVO,
} from '@/apis/mark/exam'
import type { QualityDecisionCode } from '@/apis/mark/exam-scan'
import type { PaperInstanceDisplayVO } from '@/apis/mark/exam-score'
import type {
  AllocationUnitCode,
  AnonymousRevealVO,
  MarkingQuestionScoreSubmitItem,
  MarkingQuestionViewVO,
  MarkingTaskStatusCode,
  MarkingTaskSubmittedQuestionScoreVO,
  MarkingTaskVO,
  QuestionMarkingGroupQuestionVO,
} from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import LeftOutlined from '@ant-design/icons-vue/LeftOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import RightOutlined from '@ant-design/icons-vue/RightOutlined'
import UnlockOutlined from '@ant-design/icons-vue/UnlockOutlined'
import message from 'ant-design-vue/es/message'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ANONYMITY_MODE_LABEL } from '@/apis/mark/anonymity-mode'
import {
  getExamDetail,
} from '@/apis/mark/exam'
import {
  listAnnotations,
  validateAnnotationContract,
} from '@/apis/mark/exam-annotation'
import {
  QUALITY_DECISION_LABEL,
  QUALITY_DECISION_TONE,
} from '@/apis/mark/exam-scan'
import {
  ALLOCATION_UNIT_LABEL,
  getMarkingQuestionView,
  getMarkingTaskDetail,
  MARKING_TASK_STATUS_LABEL as STATUS_LABEL,
  MARKING_TASK_STATUS_TONE as STATUS_TONE,
  submitMarkingTask,
  validateMarkingTaskContract,
} from '@/apis/mark/marking-organization'
import GradingWorkspaceLayout from '@/components/mark/GradingWorkspaceLayout.vue'
import MarkingQuestionViewCard from '@/components/mark/MarkingQuestionViewCard.vue'
import RevealAnonymousModal from '@/components/mark/RevealAnonymousModal.vue'
import WholePaperGallery from '@/components/mark/WholePaperGallery.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { useExamOwnerPermission } from '@/composables/useExamOwnerPermission'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useWholePaperGallery } from '@/composables/useWholePaperGallery'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { isGradingEnterInputTarget, isGradingKeyboardInputTarget } from '@/utils/grading-keyboard'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceMarkingTaskDetail' })

const SUBMITTED_PAGE_ANNOTATION_PAGE_SIZE = 100
const route = useRoute()
const { refreshSnapshot } = useWorkspaceExamId()

function taskStatusTone(status: MarkingTaskStatusCode): BadgeTone {
  return strictEnumTone(STATUS_TONE, status, '阅卷任务状态')
}

function taskStatusLabel(status: MarkingTaskStatusCode): string {
  return strictEnumLabel(STATUS_LABEL, status, '阅卷任务状态')
}

function allocationUnitLabel(unit: AllocationUnitCode): string {
  return strictEnumLabel(ALLOCATION_UNIT_LABEL, unit, '批阅任务单元')
}

function anonymityModeLabel(mode: AnonymityModeCode): string {
  return strictEnumLabel(ANONYMITY_MODE_LABEL, mode, '匿名模式')
}

function scanPageQualityLabel(status: QualityDecisionCode): string {
  return strictEnumLabel(QUALITY_DECISION_LABEL, status, '扫描页质量判定')
}

function scanPageQualityTone(status: QualityDecisionCode): BadgeTone {
  return strictEnumTone(QUALITY_DECISION_TONE, status, '扫描页质量判定')
}

const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))

const task = ref<MarkingTaskVO | null>(null)
const examDetail = ref<ExamDetailVO | null>(null)
const { isExamOwner } = useExamOwnerPermission(examDetail)
const loading = ref(false)

const isReadOnly = computed(() => task.value?.taskStatus === 'FINALIZED')

const isWholePaperTask = computed(() => task.value?.taskUnit === 'WHOLE_PAPER')

const usesWholePaperWorkspace = computed(() => (
  task.value?.taskUnit === 'WHOLE_PAPER'
  || task.value?.taskUnit === 'SELECTED_QUESTIONS'
  || task.value?.taskUnit === 'RANDOM_QUESTIONS'
))

const canSubmit = computed(() => {
  const status = task.value?.taskStatus
  return status === 'ALLOCATED' || status === 'IN_PROGRESS'
})

const navPrevLabel = computed(() => (isWholePaperTask.value ? '上一份' : '上一题'))

const navNextLabel = computed(() => (isWholePaperTask.value ? '下一份' : '下一题'))

function resolvePaperInstanceId(display: PaperInstanceDisplayVO): string | undefined {
  if (display.displayMode === 'REAL_NAME' || display.displayMode === 'ANONYMOUS') {
    return display.paperInstanceId
  }
  return undefined
}

const paperInstanceId = computed(() => {
  if (!task.value) return undefined
  return resolvePaperInstanceId(task.value.paperDisplay)
})

function applySubmittedQuestionScores(scores: MarkingTaskSubmittedQuestionScoreVO[]): void {
  if (!scores.length) return
  if (usesWholePaperWorkspace.value) {
    for (const item of scores) {
      const questionForm = getWholeQuestionForm(item.questionTemplateId)
      questionForm.score = Number(item.score)
      questionForm.annotationText = item.annotationText || ''
    }
    return
  }
  const first = scores[0]
  form.score = Number(first.score)
  form.annotationNote = first.annotationText || ''
}

async function loadSubmittedPageAnnotations(): Promise<void> {
  const examId = task.value?.examId
  const paperId = paperInstanceId.value
  if (!examId || !paperId || !wholePages.value.length) return
  const pageAnnotations = await readAllPages(
    (pageNum) => listAnnotations({
      examId,
      paperInstanceId: paperId,
      pageNum,
      pageSize: SUBMITTED_PAGE_ANNOTATION_PAGE_SIZE,
    }),
    '批注列表加载失败，请刷新后重试',
  )
  for (const annotation of pageAnnotations) {
    validateAnnotationContract(annotation)
    if (annotation.annotationScope !== 'PAGE') continue
    if (!annotation.pageId || !annotation.annotationText) continue
    wholePageAnnotationForms[annotation.pageId] = annotation.annotationText
  }
}

// ─── P2 上下题快捷导航 ─────────────────────────────────
// 来源：markTaskStore.tasks（教师在该考试下已加载的本批阅卷任务列表）
// 当用户从 marking-task-pool 进入详情时，store 已含本批任务，直接渲染导航；
// 当用户刷新页面 / 复制链接 / 跨 tab 直链进入详情时，store 是空的，
// 由 ensureBatchLoaded() 在 task 加载成功后按 (examId + reviewerUserId)
// 拉取该批任务列表填充 store，让导航在所有进入路径下都可用。
const router = useRouter()
const userStore = useUserStore()
const markTaskStore = useMarkTaskStore()
const { tasks: batchTasks } = storeToRefs(markTaskStore)

interface BatchProgress {
  current: number
  total: number
}

const batchProgress = computed<BatchProgress | null>(() => {
  if (!task.value || batchTasks.value.length === 0) return null
  const idx = batchTasks.value.findIndex((t) => t.id === task.value!.id)
  if (idx < 0) return null
  return { current: idx + 1, total: batchTasks.value.length }
})

const prevTaskId = computed<string>(() => {
  if (!batchProgress.value) return ''
  const idx = batchProgress.value.current - 1
  return idx > 0 ? batchTasks.value[idx - 1].id : ''
})

const nextTaskId = computed<string>(() => {
  if (!batchProgress.value) return ''
  const idx = batchProgress.value.current - 1
  return idx < batchTasks.value.length - 1 ? batchTasks.value[idx + 1].id : ''
})

function goToTask(targetTaskId: string): void {
  if (!targetTaskId) return
  const examId = String(route.params.examId || task.value?.examId || '')
  if (!examId) return
  void router.push({
    name: 'TeacherExamWorkspaceMarkingTaskDetail',
    params: { examId, taskId: targetTaskId },
  })
}

/** P2-4: 返回阅卷任务池 */
function goBackToTaskPool(): void {
  if (task.value?.examId) {
    void router.push({ name: 'TeacherExamWorkspaceMarkingTaskPool', params: { examId: task.value.examId } })
  } else {
    void router.push({ name: 'TeacherExamList' })
  }
}

async function loadTask(): Promise<void> {
  if (!taskId.value) return
  loading.value = true
  try {
    const detail = await getMarkingTaskDetail({ taskId: taskId.value })
    validateMarkingTaskContract(detail)
    task.value = detail
    examDetail.value = await getExamDetail(detail.examId)
    if (form.score === undefined && detail.score !== undefined && detail.score !== null) {
      form.score = Number(detail.score)
    }
    if (!form.annotationNote && detail.annotationNote) {
      form.annotationNote = detail.annotationNote
    }
    // 详情加载成功后回灌本批任务到 store，让上下题导航在直链刷新场景下也可用
    void ensureBatchLoaded(detail.examId)
    if (detail.submittedQuestionScores?.length) {
      applySubmittedQuestionScores(detail.submittedQuestionScores)
    }
    if (usesWholePaperWorkspace.value) {
      await openWholePaperView()
      if (isWholePaperTask.value && detail.taskStatus === 'FINALIZED') {
        await loadSubmittedPageAnnotations()
      }
    } else {
      await openQuestionView(detail)
    }
  } catch (error) {
    task.value = null
    showUserError(error, '阅卷任务详情加载失败')
  } finally {
    loading.value = false
  }
}

/**
 * 拉取当前考试 + 当前教师的本批阅卷任务列表填充 store。
 *
 * 触发条件：当前 store 已加载的 examId 与 task 所属考试不一致（含 store 为空）。
 * 加载失败不阻断主任务详情显示，但必须在导航区域显式暴露错误。
 */
async function ensureBatchLoaded(examId: string): Promise<void> {
  if (!examId) return
  if (markTaskStore.tasksLoadedExamId === examId && batchTasks.value.length > 0) return
  const reviewerUserId = userStore.userInfo.userId
  if (!reviewerUserId) return
  try {
    await markTaskStore.loadTasks({ examId, reviewerUserId })
  } catch (error) {
    showUserError(error, '上下题导航任务列表加载失败')
  }
}

function retryBatchLoad(): void {
  const examId = task.value?.examId
  if (!examId) return
  void ensureBatchLoaded(examId)
}

// ─── 题目级批阅视图 ───────────────────────────────────
const questionView = ref<MarkingQuestionViewVO | null>(null)
const questionViewLoaded = ref(false)
const questionViewLoading = ref(false)

async function openQuestionView(currentTask = task.value): Promise<void> {
  if (!currentTask?.examId || !currentTask.id) {
    return
  }
  questionViewLoading.value = true
  try {
    questionView.value = await getMarkingQuestionView({
      examId: currentTask.examId,
      taskId: currentTask.id,
    })
    questionViewLoaded.value = true
    focusPrimaryScoreInput()
  } catch (error) {
    questionView.value = null
    questionViewLoaded.value = false
    showUserError(error, '题目级批阅视图加载失败')
  } finally {
    questionViewLoading.value = false
  }
}

async function reloadQuestionView(): Promise<void> {
  questionView.value = null
  questionViewLoaded.value = false
  await openQuestionView()
}

// ─── P1.5 整卷视图（composable + 子组件）─────────────────
const wholePaper = useWholePaperGallery({
  getExamId: () => task.value?.examId,
  getTaskId: () => task.value?.id,
  isWholePaperTask: () => task.value?.taskUnit === 'WHOLE_PAPER',
  onViewReady: () => focusPrimaryScoreInput(),
})

const {
  wholePages,
  wholeQuestions,
  wholePagesLoaded,
  wholePagesLoading,
  wholePagesError,
  wholePageImageUrls,
  wholePageImageLoading,
  wholePageImageErrors,
  wholePageAnnotationForms,
  wholePageViewportRef,
  currentWholePageIndex,
  visibleWholePages,
  wholePageTopSpacerHeight,
  wholePageBottomSpacerHeight,
  getWholeQuestionForm,
  openWholePaperView,
  reloadWholePaperView,
  resetWholePaperState,
  handleWholePageGalleryScroll,
  scrollToWholePage,
  buildWholePaperSubmitRequest,
} = wholePaper

const scoreInputRef = ref<{ focus?: () => void } | null>(null)
const wholeQuestionScoreInputRefs = ref<Array<{ focus?: () => void } | null>>([])

function setWholeQuestionScoreInputRef(el: unknown, index: number): void {
  wholeQuestionScoreInputRefs.value[index] = (el as { focus?: () => void } | null) ?? null
}

function handleGalleryViewportReady(element: HTMLElement | null): void {
  wholePageViewportRef.value = element
}

function focusPrimaryScoreInput(): void {
  window.requestAnimationFrame(() => {
    if (usesWholePaperWorkspace.value) {
      focusWholeQuestionScoreInput(0)
      return
    }
    scoreInputRef.value?.focus?.()
  })
}

function focusWholeQuestionScoreInput(index: number): void {
  window.requestAnimationFrame(() => {
    wholeQuestionScoreInputRefs.value[index]?.focus?.()
  })
}

function focusWholeQuestionPage(question: QuestionMarkingGroupQuestionVO): void {
  const pageIndex = wholePages.value.findIndex((page) => page.pageId === question.pageId)
  if (pageIndex < 0) {
    message.error(`第 ${question.questionNo} 题未找到对应答题页`)
    return
  }
  scrollToWholePage(pageIndex)
}

function handleWorkspaceKeydown(event: KeyboardEvent): void {
  if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return
  if (event.key === 'Enter') {
    if (submitting.value || !canSubmit.value || isGradingEnterInputTarget(event.target)) return
    event.preventDefault()
    void submit()
    return
  }
  if (isGradingKeyboardInputTarget(event.target)) {
    return
  }
  const key = event.key.toLowerCase()
  if (key === 'j' || event.key === 'ArrowLeft') {
    if (prevTaskId.value) {
      event.preventDefault()
      goToTask(prevTaskId.value)
    }
    return
  }
  if (key === 'k' || event.key === 'ArrowRight') {
    if (nextTaskId.value) {
      event.preventDefault()
      goToTask(nextTaskId.value)
    }
    return
  }
  if (
    /^\d$/.test(event.key)
    && !usesWholePaperWorkspace.value
    && canSubmit.value
    && !isReadOnly.value
  ) {
    const digit = Number(event.key)
    const fullScore = questionView.value?.fullScore
    if (fullScore != null && digit <= fullScore) {
      event.preventDefault()
      form.score = digit
    }
    return
  }
  if (event.key === 'PageDown' && usesWholePaperWorkspace.value) {
    event.preventDefault()
    scrollToWholePage(currentWholePageIndex.value + 1)
    return
  }
  if (event.key === 'PageUp' && usesWholePaperWorkspace.value) {
    event.preventDefault()
    scrollToWholePage(currentWholePageIndex.value - 1)
  }
}

function handleWholeQuestionScoreEnter(questionIndex: number): void {
  if (submitting.value || !canSubmit.value) return
  if (questionIndex < wholeQuestions.value.length - 1) {
    focusWholeQuestionScoreInput(questionIndex + 1)
    return
  }
  void submit()
}

function fillWholeQuestionAiScore(question: QuestionMarkingGroupQuestionVO): void {
  if (question.aiScore == null) return
  getWholeQuestionForm(question.questionTemplateId).score = question.aiScore
  message.success(`已填入第 ${question.questionNo} 题 AI 建议分`)
}

async function acceptWholeQuestionAiScore(
  question: QuestionMarkingGroupQuestionVO,
  questionIndex: number,
): Promise<void> {
  if (question.aiScore == null || submitting.value) return
  getWholeQuestionForm(question.questionTemplateId).score = question.aiScore
  if (questionIndex < wholeQuestions.value.length - 1) {
    focusWholeQuestionScoreInput(questionIndex + 1)
    message.success(`已采纳第 ${question.questionNo} 题 AI 分`)
    return
  }
  await submit()
}

const revealOpen = ref(false)
const revealedIdentity = ref<AnonymousRevealVO | null>(null)
let revealExpireTimer: ReturnType<typeof window.setTimeout> | null = null

function openRevealDialog(): void {
  revealOpen.value = true
}

/** 清除临时解匿名身份，保证 5 分钟查看期结束后不继续展示真实学生信息。 */
function clearRevealedIdentity(): void {
  if (revealExpireTimer) {
    window.clearTimeout(revealExpireTimer)
    revealExpireTimer = null
  }
  revealedIdentity.value = null
}

function handleAnonymousRevealed(result: AnonymousRevealVO): void {
  revealedIdentity.value = result
  if (revealExpireTimer) {
    window.clearTimeout(revealExpireTimer)
    revealExpireTimer = null
  }
  const expireAt = Date.parse(result.revealExpireTime)
  if (!Number.isFinite(expireAt)) {
    showUserError(null, '身份查看时间异常，请稍后重试')
    return
  }
  revealExpireTimer = window.setTimeout(clearRevealedIdentity, Math.max(expireAt - Date.now(), 0))
}

const formRef = ref<FormInstance>()
const form = reactive<{ score?: number, annotationNote?: string }>({
  score: undefined,
  annotationNote: '',
})

const rules: Record<string, Rule[]> = {
  score: [
    { required: true, message: '请填写教师给分', trigger: 'change' },
    {
      validator(_rule, value) {
        if (value === undefined || value === null) return Promise.resolve()
        if (Number(value) < 0) return Promise.reject(new Error('给分不能为负'))
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
  annotationNote: [{ max: 1000, message: '批注最多 1000 字', trigger: 'blur' }],
}

const submitting = ref(false)

function createCorrelationId(scope: 'question' | 'page', id: string): string {
  return `${scope}-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function buildQuestionSubmitRequest(): MarkingQuestionScoreSubmitItem {
  if (!questionView.value) {
    throw new Error('题目视图未加载，请刷新后重试')
  }
  if (form.score === undefined) {
    throw new Error('请填写教师给分')
  }
  return {
    questionTemplateId: questionView.value.questionTemplateId,
    score: form.score,
    annotationText: form.annotationNote?.trim() || undefined,
    correlationId: createCorrelationId('question', questionView.value.questionTemplateId),
  }
}

async function submit(): Promise<void> {
  if (!taskId.value || !task.value || !formRef.value) return
  if (!usesWholePaperWorkspace.value) {
    try {
      await formRef.value.validate()
    } catch {
      return
    }
  }
  submitting.value = true
  try {
    const submitRequest = usesWholePaperWorkspace.value
      ? buildWholePaperSubmitRequest()
      : {
          questionScores: [buildQuestionSubmitRequest()],
          pageAnnotations: [],
        }
    await submitMarkingTask({ taskId: taskId.value, ...submitRequest })
    await refreshSnapshot()
    if (nextTaskId.value) {
      message.success(`阅卷任务已提交，已切换到${isWholePaperTask.value ? '下一份' : '下一题'}`)
      goToTask(nextTaskId.value)
      return
    }
    message.success(`阅卷任务已提交，当前批次已到最后${isWholePaperTask.value ? '一份' : '一题'}`)
    await loadTask()
  } catch (error) {
    showUserError(error, '提交阅卷任务失败')
  } finally {
    submitting.value = false
  }
}

async function acceptAiScoreAndSubmit(): Promise<void> {
  if (questionView.value?.aiScore == null || submitting.value) return
  form.score = questionView.value.aiScore
  await submit()
}

watch(taskId, () => {
  // 切题时清空上一题的表单状态，避免误带入下一题
  form.score = undefined
  form.annotationNote = ''
  task.value = null
  examDetail.value = null
  // 切题时同步重置视图 + 解匿名状态，防止跨试卷数据串扰
  questionView.value = null
  questionViewLoaded.value = false
  questionViewLoading.value = false
  resetWholePaperState()
  wholeQuestionScoreInputRefs.value = []
  clearRevealedIdentity()
  revealOpen.value = false
  void loadTask()
}, { immediate: true })

onMounted(() => {
  window.addEventListener('keydown', handleWorkspaceKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWorkspaceKeydown)
  clearRevealedIdentity()
})
</script>

<style lang="scss" scoped>
.marking-task-detail-page {
  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border: 1px solid var(--ant-color-border-secondary);
    border-radius: var(--dp-radius-md);
    background: var(--ant-color-bg-container);
  }

  &__toolbar-main,
  &__toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__progress {
    font-size: 13px;
    font-weight: 500;
    color: var(--dp-text-secondary, #475569);
    padding: 0 4px;
    white-space: nowrap;
  }

  &__keyboard-hint {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__empty {
    padding: 60px 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-block {
  margin-top: 48px;
}

.info-card {
  margin-bottom: 16px;
}

.task-descriptions {
  :deep(.ant-descriptions-item-label) {
    width: 140px;
    color: #595959;
  }
}

.whole-paper-gallery {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: min(72vh, 960px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;

  &__spacer {
    flex: 0 0 auto;
  }

  &__page {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 1120px;
    padding: 8px;
    border: 1px solid transparent;
    border-radius: var(--dp-radius-panel, 8px);
    transition: border-color 200ms ease, box-shadow 200ms ease;
  }

  &__page--active {
    border-color: var(--ant-color-primary, #1677ff);
    box-shadow: 0 0 0 3px var(--dp-focus-ring, rgba(22, 119, 255, 0.18));
  }

  &__page-header {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  &__image {
    width: 100%;
    min-height: 920px;
    border-radius: 4px;
    border: 1px solid var(--dp-border-subtle, #e2e8f0);
  }

  &__image-placeholder {
    min-height: 920px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    justify-content: center;
    color: var(--dp-text-secondary, #475569);
    border: 1px dashed var(--dp-border-subtle, #e2e8f0);
    border-radius: 4px;
    background: var(--dp-surface-subtle, #f8fafc);
  }
}

.whole-question-score {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--dp-border-subtle, #e2e8f0);

  &__header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  &__ai {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0 0 8px;
    padding: 8px;
    border: 1px solid var(--dp-border-subtle, #e2e8f0);
    border-radius: var(--dp-radius-control, 8px);
    background: var(--dp-surface-subtle, #f8fafc);
  }

  &__ai-text {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-size: var(--dp-font-size-sm, 13px);
    color: var(--dp-text-secondary, #475569);

    strong {
      color: var(--ant-color-primary, #1677ff);
      font-size: var(--dp-font-size-md, 14px);
    }
  }

  &__ai-diagnostic {
    margin-bottom: 0;
    color: var(--dp-text-secondary, #475569);
    font-size: var(--dp-font-size-sm, 13px);
  }
}

.question-viewer {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  &__stem {
    margin-bottom: 0;
    color: var(--dp-text-secondary, #475569);
  }

  &__image {
    width: 100%;
    border-radius: 4px;
    border: 1px solid var(--dp-border-subtle, #e2e8f0);
  }
}
</style>
