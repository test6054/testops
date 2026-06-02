<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="marking-task-detail-page__context">
        <div class="marking-task-detail-page__context-left">
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
          </template>
        </div>
        <div class="marking-task-detail-page__context-right">
          <UiTag v-if="batchTasksLoadError" tone="red" size="sm"> 上下题导航加载失败 </UiTag>
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
    </template>

    <UiEmpty
      v-if="!taskId"
      description="未找到本次批阅任务，请从任务列表重新进入"
      class="marking-task-detail-page__empty"
    />

    <!-- D-9 错误态：阅卷任务详情加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-else-if="taskLoadError"
      :error="taskLoadError"
      title="阅卷任务详情加载失败"
      :helper="`批改任务编号：${taskId}`"
      @retry="loadTask"
    />

    <a-spin v-else :spinning="loading">
      <UiEmpty
        v-if="!loading && !task"
        description="未找到匹配的阅卷任务"
        class="marking-task-detail-page__empty"
      />

      <a-row v-if="task" :gutter="16">
        <a-col :xs="24" :lg="14">
          <UiCard class="info-card">
            <template #title>
              <FileImageOutlined />
              <span>阅卷影像</span>
            </template>
            <UiEmpty v-if="isWholePaperTask" description="整卷批阅在下方原始扫描页区域查看与给分" />
            <UiErrorRetryPanel
              v-else-if="questionViewError"
              :error="questionViewError"
              title="题目级批阅视图加载失败"
              compact
              @retry="reloadQuestionView"
            />
            <a-spin v-else :spinning="questionViewLoading" tip="加载题目信息中...">
              <UiEmpty
                v-if="!questionViewLoaded && !questionViewLoading"
                description="题目信息尚未加载"
              />
              <div v-else-if="questionView" class="question-viewer">
                <div class="question-viewer__header">
                  <UiTag tone="blue" size="sm">第 {{ questionView.questionNo }} 题</UiTag>
                  <UiTag tone="gray" size="sm">{{ questionView.questionTypeMessage }}</UiTag>
                  <UiTag tone="green" size="sm">满分 {{ questionView.fullScore }}</UiTag>
                </div>
                <a-typography-paragraph
                  class="question-viewer__stem"
                  :ellipsis="{ rows: 3, expandable: true, symbol: '展开' }"
                >
                  {{ questionView.questionStem }}
                </a-typography-paragraph>
                <MarkingScanMaterialPanel
                  :slice-file-id="questionView.sliceFileId"
                  :source-scan-page="questionView.sourceScanPage"
                />
              </div>
            </a-spin>
          </UiCard>

          <UiCard v-if="isWholePaperTask" class="info-card">
            <template #title>
              <FileImageOutlined />
              <span>原始扫描页</span>
            </template>
            <template #extra>
              <UiButton
                size="sm"
                variant="outline"
                :loading="wholePagesLoading"
                :disabled="!task.id || !task.examId"
                @click="reloadWholePaperView"
              >
                <template #icon><ReloadOutlined /></template>
                刷新整卷
              </UiButton>
            </template>
            <UiEmpty
              v-if="!wholePagesLoaded && !wholePagesLoading"
              description="正在加载整卷扫描页…"
            />
            <UiErrorRetryPanel
              v-else-if="wholePagesError"
              :error="wholePagesError"
              title="整卷视图加载失败"
              compact
              @retry="reloadWholePaperView"
            />
            <a-spin v-else :spinning="wholePagesLoading" tip="加载扫描页中...">
              <UiEmpty
                v-if="wholePagesLoaded && wholePages.length === 0"
                description="该试卷暂无 ACTIVE 扫描页"
              />
              <div v-else class="whole-paper-gallery">
                <div
                  v-for="page in wholePages"
                  :key="page.pageId"
                  class="whole-paper-gallery__page"
                >
                  <div class="whole-paper-gallery__page-header">
                    <UiTag tone="blue" size="sm">第 {{ page.pageSeq }} 页</UiTag>
                    <UiTag tone="gray" size="sm">模板页 {{ page.templatePageNo }}</UiTag>
                    <UiTag :tone="scanPageQualityTone(page.qualityStatus)" size="sm">
                      {{ scanPageQualityLabel(page.qualityStatus) }}
                    </UiTag>
                  </div>
                  <UiAlertStrip
                    v-if="page.qualityStatus === 'BLOCKED'"
                    tone="warning"
                    title="扫描页质量阻断"
                    description="该页扫描质量未通过自动检测，请结合原始影像谨慎批阅。"
                    dense
                  />
                  <a-image
                    v-if="wholePageImageUrls[page.pageId]"
                    :src="wholePageImageUrls[page.pageId]"
                    :preview="{}"
                    class="whole-paper-gallery__image"
                  >
                    <template #previewMask>点击查看原始扫描页</template>
                  </a-image>
                  <UiEmpty v-else description="扫描页图片加载中..." />
                  <a-textarea
                    v-model:value="wholePageAnnotationForms[page.pageId]"
                    :rows="3"
                    :maxlength="1000"
                    :disabled="isReadOnly"
                    class="whole-paper-gallery__annotation"
                    placeholder="页面级批注，可选"
                    show-count
                  />
                </div>
              </div>
            </a-spin>
          </UiCard>

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
                {{ formatDateTime(task.allocatedAt) }}
              </a-descriptions-item>
              <a-descriptions-item label="提交时间">
                {{ formatDateTime(task.submittedAt) }}
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
        </a-col>

        <a-col :xs="24" :lg="10">
          <UiCard class="info-card">
            <template #title>
              <EditOutlined />
              <span>批改提交</span>
            </template>

            <a-alert
              v-if="isReadOnly"
              type="success"
              show-icon
              message="阅卷已提交，当前为只读查看"
              :description="readOnlyHint"
              style="margin-bottom: 12px"
            />
            <a-form
              ref="formRef"
              :model="form"
              :rules="rules"
              layout="vertical"
              :disabled="!canSubmit"
            >
              <template v-if="isWholePaperTask">
                <UiEmpty
                  v-if="wholeQuestions.length === 0"
                  description="请先加载整卷扫描页和题目清单后再提交"
                />
                <div
                  v-for="question in wholeQuestions"
                  :key="question.questionTemplateId"
                  class="whole-question-score"
                >
                  <div class="whole-question-score__header">
                    <UiTag tone="blue" size="sm">第 {{ question.questionNo }} 题</UiTag>
                    <UiTag tone="gray" size="sm">{{ question.questionTypeMessage }}</UiTag>
                    <UiTag tone="green" size="sm">满分 {{ question.fullScore }}</UiTag>
                  </div>
                  <a-input-number
                    v-model:value="getWholeQuestionForm(question.questionTemplateId).score"
                    :min="0"
                    :max="question.fullScore"
                    :step="0.5"
                    :disabled="isReadOnly"
                    style="width: 100%; margin-bottom: 8px"
                    placeholder="本题给分"
                  />
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
                  v-model:value="form.score"
                  :min="0"
                  :max="questionView?.fullScore"
                  :step="0.5"
                  style="width: 100%"
                  placeholder="按题目满分给分"
                />
              </a-form-item>
              <a-form-item v-if="!isWholePaperTask" label="批改批注" name="annotationNote">
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
                  确认给分并提交
                </UiButton>
              </a-form-item>
            </a-form>
          </UiCard>
        </a-col>
      </a-row>
    </a-spin>

    <RevealAnonymousModal
      v-if="task"
      v-model:open="revealOpen"
      :exam-id="task.examId"
      :task-id="task.id"
      @revealed="handleAnonymousRevealed"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type {
  AnnotationVO,
  ExamDetailVO,
  PaperInstanceDisplayVO,
  QualityDecisionCode,
} from '@/apis/mark/exam'
import {
  getExamDetail,
  listAnnotations,
  QUALITY_DECISION_LABEL,
  QUALITY_DECISION_TONE,
} from '@/apis/mark/exam'
import type {
  AllocationUnitCode,
  AnonymityModeCode,
  AnonymousRevealVO,
  MarkingPageAnnotationSubmitItem,
  MarkingQuestionScoreSubmitItem,
  MarkingQuestionViewVO,
  MarkingTaskStatusCode,
  MarkingTaskSubmittedQuestionScoreVO,
  MarkingTaskVO,
  QuestionMarkingGroupQuestionVO,
  ScannedPageRef,
} from '@/apis/mark/marking-organization'
import {
  ALLOCATION_UNIT_LABEL,
  ANONYMITY_MODE_LABEL,
  getMarkingQuestionView,
  getMarkingScanPageDisplayBlobUrl,
  getMarkingTaskDetail,
  getWholePaperView,
  MARKING_TASK_STATUS_LABEL as STATUS_LABEL,
  MARKING_TASK_STATUS_TONE as STATUS_TONE,
  submitMarkingTask,
} from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import LeftOutlined from '@ant-design/icons-vue/LeftOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import RightOutlined from '@ant-design/icons-vue/RightOutlined'
import UnlockOutlined from '@ant-design/icons-vue/UnlockOutlined'
import message from 'ant-design-vue/es/message'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import MarkingScanMaterialPanel from '@/components/mark/MarkingScanMaterialPanel.vue'
import RevealAnonymousModal from '@/components/mark/RevealAnonymousModal.vue'
import {
  UiAlertStrip,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useExamOwnerPermission } from '@/composables/useExamOwnerPermission'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { useUserStore } from '@/stores/modules/user'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherMarkingTaskDetail' })

const route = useRoute()

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
// D-9 错误态：阅卷任务详情加载失败时 UiErrorRetryPanel 重试 + 上报
const taskLoadError = ref<Error | null>(null)

const isReadOnly = computed(() => task.value?.taskStatus === 'FINALIZED')

const isWholePaperTask = computed(() => task.value?.taskUnit === 'WHOLE_PAPER')

const canSubmit = computed(() => {
  const status = task.value?.taskStatus
  return status === 'ALLOCATED' || status === 'IN_PROGRESS'
})

const navPrevLabel = computed(() => (isWholePaperTask.value ? '上一份' : '上一题'))

const navNextLabel = computed(() => (isWholePaperTask.value ? '下一份' : '下一题'))

const readOnlyHint = computed(() => {
  if (!task.value?.submittedAt) return '可查看扫描页、逐题给分与页面批注，不可再次修改。'
  return `提交于 ${formatDateTime(task.value.submittedAt)}，可查看扫描页、逐题给分与页面批注，不可再次修改。`
})

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
  if (isWholePaperTask.value) {
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
  const page = await listAnnotations({
    examId,
    paperInstanceId: paperId,
    pageNum: 1,
    pageSize: 500,
  })
  const pageAnnotations = readPageList(page, '批注列表加载失败，请刷新后重试').filter(
    (item: AnnotationVO) => item.annotationScope === 'PAGE',
  )
  for (const annotation of pageAnnotations) {
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
const batchTasksLoadError = ref<Error | null>(null)

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
  void router.push({
    name: 'TeacherMarkingTaskDetail',
    params: { taskId: targetTaskId },
    query: route.query,
  })
}

async function loadTask(): Promise<void> {
  if (!taskId.value) return
  loading.value = true
  taskLoadError.value = null
  try {
    const detail = await getMarkingTaskDetail({ taskId: taskId.value })
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
    if (detail.taskUnit === 'WHOLE_PAPER') {
      await openWholePaperView()
      if (detail.taskStatus === 'FINALIZED') {
        await loadSubmittedPageAnnotations()
      }
    } else {
      await openQuestionView(detail)
    }
  } catch (error) {
    task.value = null
    taskLoadError.value = toUserError(error, '批阅任务详情加载失败')
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
  batchTasksLoadError.value = null
  try {
    await markTaskStore.loadTasks({ examId, reviewerUserId })
  } catch (error) {
    batchTasksLoadError.value = toUserError(error, '上下题导航任务列表加载失败')
  }
}

// ─── 题目级批阅视图 ───────────────────────────────────
const questionView = ref<MarkingQuestionViewVO | null>(null)
const questionViewLoaded = ref(false)
const questionViewLoading = ref(false)
const questionViewError = ref<Error | null>(null)

async function openQuestionView(currentTask = task.value): Promise<void> {
  if (!currentTask?.examId || !currentTask.id) {
    return
  }
  questionViewLoading.value = true
  questionViewError.value = null
  try {
    const view = await getMarkingQuestionView({
      examId: currentTask.examId,
      taskId: currentTask.id,
    })
    questionView.value = view
    questionViewLoaded.value = true
  } catch (error) {
    questionViewError.value = toUserError(error, '题目视图加载失败')
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

// ─── P1.5 整卷视图 ─────────────────────────────────────
const wholePages = ref<ScannedPageRef[]>([])
const wholeQuestions = ref<QuestionMarkingGroupQuestionVO[]>([])
const wholePagesLoaded = ref(false)
const wholePagesLoading = ref(false)
const wholePagesError = ref<Error | null>(null)
const wholePageImageUrls = reactive<Record<string, string>>({})
interface WholeQuestionForm {
  score?: number
  annotationText: string
  correlationId: string
}

const wholeQuestionForms = reactive<Record<string, WholeQuestionForm>>({})
const wholePageAnnotationForms = reactive<Record<string, string>>({})

async function loadWholePageImage(
  page: ScannedPageRef,
  examId: string,
  taskId: string,
): Promise<string> {
  if (page.identityMaskedView) {
    return getMarkingScanPageDisplayBlobUrl({
      examId,
      taskId,
      pageId: page.pageId,
    })
  }
  if (!page.fileId) {
    throw new Error('扫描页缺少展示文件ID')
  }
  return getImageBlobUrl(page.fileId)
}

async function openWholePaperView(): Promise<void> {
  if (!task.value?.examId || !task.value?.id) {
    return
  }
  wholePagesLoading.value = true
  wholePagesError.value = null
  try {
    const view = await getWholePaperView({
      examId: task.value.examId,
      taskId: task.value.id,
    })
    wholePages.value = view.pages
    wholeQuestions.value = view.questions
    syncWholePaperForms(view.questions, view.pages)
    await Promise.all(
      view.pages.map(async (page) => {
        wholePageImageUrls[page.pageId] = await loadWholePageImage(
          page,
          task.value!.examId,
          task.value!.id,
        )
      }),
    )
    wholePagesLoaded.value = true
  } catch (error) {
    wholePagesError.value = toUserError(error, '整卷影像加载失败')
    showUserError(error, '整卷视图加载失败')
  } finally {
    wholePagesLoading.value = false
  }
}

function releaseWholePageImages(): void {
  for (const url of Object.values(wholePageImageUrls)) {
    URL.revokeObjectURL(url)
  }
  for (const key of Object.keys(wholePageImageUrls)) {
    delete wholePageImageUrls[key]
  }
}

function syncWholePaperForms(
  questions: QuestionMarkingGroupQuestionVO[],
  pages: ScannedPageRef[],
): void {
  for (const question of questions) {
    getWholeQuestionForm(question.questionTemplateId)
  }
  for (const page of pages) {
    if (wholePageAnnotationForms[page.pageId] === undefined) {
      wholePageAnnotationForms[page.pageId] = ''
    }
  }
}

function getWholeQuestionForm(questionTemplateId: string): WholeQuestionForm {
  if (!wholeQuestionForms[questionTemplateId]) {
    wholeQuestionForms[questionTemplateId] = {
      score: undefined,
      annotationText: '',
      correlationId: createCorrelationId('question', questionTemplateId),
    }
  }
  return wholeQuestionForms[questionTemplateId]
}

function clearWholePaperForms(): void {
  for (const key of Object.keys(wholeQuestionForms)) {
    delete wholeQuestionForms[key]
  }
  for (const key of Object.keys(wholePageAnnotationForms)) {
    delete wholePageAnnotationForms[key]
  }
}

async function reloadWholePaperView(): Promise<void> {
  releaseWholePageImages()
  wholePages.value = []
  wholeQuestions.value = []
  clearWholePaperForms()
  wholePagesLoaded.value = false
  await openWholePaperView()
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
const form = reactive<{ score?: number; annotationNote?: string }>({
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

function buildWholePaperSubmitRequest(): {
  questionScores: MarkingQuestionScoreSubmitItem[]
  pageAnnotations: MarkingPageAnnotationSubmitItem[]
} {
  if (wholeQuestions.value.length === 0) {
    throw new Error('整卷题目清单未加载，请刷新后重试')
  }
  const questionScores: MarkingQuestionScoreSubmitItem[] = wholeQuestions.value.map((question) => {
    const questionForm = getWholeQuestionForm(question.questionTemplateId)
    if (questionForm.score === undefined) {
      throw new Error(`请填写第 ${question.questionNo} 题给分`)
    }
    return {
      questionTemplateId: question.questionTemplateId,
      score: questionForm.score,
      annotationText: questionForm.annotationText.trim() || undefined,
      correlationId: questionForm.correlationId,
    }
  })
  const pageAnnotations: MarkingPageAnnotationSubmitItem[] = wholePages.value
    .map(
      (page): MarkingPageAnnotationSubmitItem => ({
        pageId: page.pageId,
        annotationText: wholePageAnnotationForms[page.pageId]?.trim() || '',
        correlationId: createCorrelationId('page', page.pageId),
      }),
    )
    .filter((item) => item.annotationText.length > 0)
  return { questionScores, pageAnnotations }
}

async function submit(): Promise<void> {
  if (!taskId.value || !task.value || !formRef.value) return
  if (!isWholePaperTask.value) {
    try {
      await formRef.value.validate()
    } catch {
      return
    }
  }
  submitting.value = true
  try {
    const submitRequest = isWholePaperTask.value
      ? buildWholePaperSubmitRequest()
      : {
          questionScores: [buildQuestionSubmitRequest()],
          pageAnnotations: [],
        }
    await submitMarkingTask({ taskId: taskId.value, ...submitRequest })
    message.success('阅卷任务已提交')
    await loadTask()
  } catch (error) {
    showUserError(error, '提交阅卷任务失败')
  } finally {
    submitting.value = false
  }
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
  questionViewError.value = null
  releaseWholePageImages()
  wholePages.value = []
  wholeQuestions.value = []
  clearWholePaperForms()
  wholePagesLoaded.value = false
  wholePagesLoading.value = false
  wholePagesError.value = null
  clearRevealedIdentity()
  revealOpen.value = false
  void loadTask()
})

onMounted(() => {
  if (taskId.value) {
    void loadTask()
  }
})

onBeforeUnmount(() => {
  clearRevealedIdentity()
  releaseWholePageImages()
})
</script>

<style lang="scss" scoped>
.marking-task-detail-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__context-right {
    flex-shrink: 0;
    display: flex;
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

  &__page {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__page-header {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  &__image {
    width: 100%;
    border-radius: 4px;
    border: 1px solid var(--dp-border-subtle, #e2e8f0);
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
