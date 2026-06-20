<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
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
        </template>
        <template #actions>
          <UiTag v-if="batchTasksLoadError" tone="red" size="sm">上下题导航加载失败</UiTag>
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
        </template>
      </ContextBar>
    </template>

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
          <UiCard class="info-card">
            <template #title>
              <FileImageOutlined />
              <span>阅卷影像</span>
            </template>
            <UiEmpty
              v-if="usesWholePaperWorkspace"
              description="暂无数据"
            />
            <UiEmpty
              v-else-if="questionViewError"
              description="暂无数据"
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
                  :master-paper-page="questionView.masterPaperPage"
                />
                <!-- FIX-4: 标准答案对照 + AI 辅助参考 -->
                <template v-if="questionView.standardAnswer || questionView.aiScore != null">
                  <a-divider />
                  <UiAlertStrip
                    v-if="questionView.standardAnswer"
                    tone="info"
                    title="标准答案"
                    dense
                    class="marking-task-detail-page__standard-answer"
                  >
                    {{ questionView.standardAnswer }}
                    <template v-if="questionView.comparePolicy" #footer>
                      <UiTag tone="blue" size="sm">匹配策略：{{ questionView.comparePolicy }}</UiTag>
                    </template>
                  </UiAlertStrip>
                  <UiAlertStrip
                    v-if="questionView.evaluationCriteria"
                    tone="info"
                    title="评分细则"
                    :description="questionView.evaluationCriteria"
                    dense
                  />
                  <UiAlertStrip
                    v-if="questionView.recognizedAnswer"
                    tone="info"
                    title="OCR识别"
                    :description="questionView.recognizedAnswer"
                    dense
                  />
                  <UiAlertStrip
                    v-if="questionView.aiScore != null && questionView.aiDiagnostic"
                    tone="info"
                    title="AI 建议参考"
                    dense
                  >
                    <template #default>
                      AI 建议分：<strong>{{ questionView.aiScore }}</strong> / {{ questionView.fullScore }}
                    </template>
                    <template v-if="questionView.aiDiagnostic" #footer>
                      {{ questionView.aiDiagnostic }}
                    </template>
                  </UiAlertStrip>
                </template>
              </div>
            </a-spin>
          </UiCard>

          <UiCard v-if="usesWholePaperWorkspace" class="info-card">
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
                刷新影像
              </UiButton>
            </template>
            <UiEmpty
              v-if="!wholePagesLoaded && !wholePagesLoading"
              description="正在加载扫描页…"
            />
            <UiEmpty
              v-else-if="wholePagesError"
              description="暂无数据"
            />
            <a-spin v-else :spinning="wholePagesLoading" tip="加载扫描页中...">
              <UiEmpty
                v-if="wholePagesLoaded && wholePages.length === 0"
                description="暂无数据"
              />
              <div
                v-else
                ref="wholePageViewportRef"
                class="whole-paper-gallery"
                @scroll="handleWholePageGalleryScroll"
              >
                <div
                  v-if="wholePageTopSpacerHeight > 0"
                  class="whole-paper-gallery__spacer"
                  :style="{ height: `${wholePageTopSpacerHeight}px` }"
                />
                <div
                  v-for="item in visibleWholePages"
                  :key="item.page.pageId"
                  class="whole-paper-gallery__page"
                  :class="{ 'whole-paper-gallery__page--active': item.pageIndex === currentWholePageIndex }"
                >
                  <div class="whole-paper-gallery__page-header">
                    <UiTag tone="blue" size="sm">第 {{ item.page.pageSeq }} 页</UiTag>
                    <UiTag tone="gray" size="sm">模板页 {{ item.page.templatePageNo }}</UiTag>
                    <UiTag :tone="scanPageQualityTone(item.page.qualityStatus)" size="sm">
                      {{ scanPageQualityLabel(item.page.qualityStatus) }}
                    </UiTag>
                  </div>
                  <UiAlertStrip
                    v-if="item.page.qualityStatus === 'BLOCKED'"
                    tone="warning"
                    title="扫描页质量阻断"
                    description="暂无数据"
                    dense
                  />
                  <a-image
                    v-if="wholePageImageUrls[item.page.pageId]"
                    :src="wholePageImageUrls[item.page.pageId]"
                    :preview="{}"
                    class="whole-paper-gallery__image"
                  >
                    <template #previewMask>点击查看原始扫描页</template>
                  </a-image>
                  <UiEmpty
                    v-else-if="wholePageImageErrors[item.page.pageId]"
                    description="暂无数据"
                  />
                  <div v-else class="whole-paper-gallery__image-placeholder">
                    <a-spin :spinning="Boolean(wholePageImageLoading[item.page.pageId])" />
                    <span>扫描页图片加载中</span>
                  </div>
                  <a-textarea
                    v-if="isWholePaperTask"
                    v-model:value="wholePageAnnotationForms[item.page.pageId]"
                    :rows="3"
                    :maxlength="1000"
                    :disabled="isReadOnly"
                    class="whole-paper-gallery__annotation"
                    placeholder="页面级批注，可选"
                    show-count
                  />
                </div>
                <div
                  v-if="wholePageBottomSpacerHeight > 0"
                  class="whole-paper-gallery__spacer"
                  :style="{ height: `${wholePageBottomSpacerHeight}px` }"
                />
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
        </template>

        <template #aside>
          <UiCard class="info-card">
            <template #title>
              <EditOutlined />
              <span>{{ usesWholePaperWorkspace ? '当前任务负责题目' : '批改提交' }}</span>
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
                  </div>
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
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type {
  ExamDetailVO,
  PaperInstanceDisplayVO,
  QualityDecisionCode,
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
import {
  getExamDetail,
  listAnnotations,
  QUALITY_DECISION_LABEL,
  QUALITY_DECISION_TONE,
} from '@/apis/mark/exam'
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
import GradingWorkspaceLayout from '@/components/mark/GradingWorkspaceLayout.vue'
import MarkingScanMaterialPanel from '@/components/mark/MarkingScanMaterialPanel.vue'
import RevealAnonymousModal from '@/components/mark/RevealAnonymousModal.vue'
import {
  UiAlertStrip,
  UiButton,
  UiCard,
  UiEmpty,
  UiTag,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useExamOwnerPermission } from '@/composables/useExamOwnerPermission'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { useUserStore } from '@/stores/modules/user'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { isGradingEnterInputTarget, isGradingKeyboardInputTarget } from '@/utils/grading-keyboard'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceMarkingTaskDetail' })

const SUBMITTED_PAGE_ANNOTATION_PAGE_SIZE = 100
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
    taskLoadError.value = toUserError(error, '阅卷任务详情加载失败')
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
    questionView.value = await getMarkingQuestionView({
      examId: currentTask.examId,
      taskId: currentTask.id,
    })
    questionViewLoaded.value = true
    focusPrimaryScoreInput()
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
const wholePageImageLoading = reactive<Record<string, boolean>>({})
const wholePageImageErrors = reactive<Record<string, Error | null>>({})
const WHOLE_PAGE_ESTIMATED_HEIGHT = 1180
const WHOLE_PAGE_RENDER_BUFFER = 2
const WHOLE_PAGE_PRELOAD_BUFFER = 3

interface VisibleWholePage {
  page: ScannedPageRef
  pageIndex: number
}

interface WholeQuestionForm {
  score?: number
  annotationText: string
  correlationId: string
}

const wholeQuestionForms = reactive<Record<string, WholeQuestionForm>>({})
const wholePageAnnotationForms = reactive<Record<string, string>>({})
const scoreInputRef = ref<{ focus?: () => void } | null>(null)
const wholeQuestionScoreInputRefs = ref<Array<{ focus?: () => void } | null>>([])
const wholePageViewportRef = ref<HTMLElement | null>(null)
const wholePageScrollTop = ref(0)
const wholePageViewportHeight = ref(900)
const currentWholePageIndex = ref(0)
let wholePageImageLoadBatch = 0

function setWholeQuestionScoreInputRef(el: unknown, index: number): void {
  wholeQuestionScoreInputRefs.value[index] = (el as { focus?: () => void } | null) ?? null
}

const visibleWholePageRange = computed(() => {
  if (wholePages.value.length === 0) return { start: 0, end: -1 }
  const viewportStart = Math.floor(wholePageScrollTop.value / WHOLE_PAGE_ESTIMATED_HEIGHT)
  const viewportEnd = Math.ceil(
    (wholePageScrollTop.value + wholePageViewportHeight.value) / WHOLE_PAGE_ESTIMATED_HEIGHT,
  )
  return {
    start: Math.max(0, viewportStart - WHOLE_PAGE_RENDER_BUFFER),
    end: Math.min(wholePages.value.length - 1, viewportEnd + WHOLE_PAGE_RENDER_BUFFER),
  }
})

const visibleWholePages = computed<VisibleWholePage[]>(() => {
  const range = visibleWholePageRange.value
  if (range.end < range.start) return []
  return wholePages.value.slice(range.start, range.end + 1).map((page, offset) => ({
    page,
    pageIndex: range.start + offset,
  }))
})

const wholePageTopSpacerHeight = computed(() => (
  visibleWholePageRange.value.start * WHOLE_PAGE_ESTIMATED_HEIGHT
))

const wholePageBottomSpacerHeight = computed(() => {
  const range = visibleWholePageRange.value
  if (range.end < range.start) return 0
  return Math.max(0, (wholePages.value.length - range.end - 1) * WHOLE_PAGE_ESTIMATED_HEIGHT)
})

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

function scrollToWholePage(index: number): void {
  if (!usesWholePaperWorkspace.value || wholePages.value.length === 0) return
  const nextIndex = Math.min(Math.max(index, 0), wholePages.value.length - 1)
  currentWholePageIndex.value = nextIndex
  const nextScrollTop = nextIndex * WHOLE_PAGE_ESTIMATED_HEIGHT
  if (wholePageViewportRef.value) {
    wholePageViewportRef.value.scrollTo({ top: nextScrollTop, behavior: 'smooth' })
    return
  }
  wholePageScrollTop.value = nextScrollTop
  void preloadWholePageImagesForWindow()
}

function handleWholePageGalleryScroll(event: Event): void {
  if (!(event.currentTarget instanceof HTMLElement)) return
  wholePageScrollTop.value = event.currentTarget.scrollTop
  wholePageViewportHeight.value = event.currentTarget.clientHeight
  currentWholePageIndex.value = Math.min(
    Math.max(Math.round(event.currentTarget.scrollTop / WHOLE_PAGE_ESTIMATED_HEIGHT), 0),
    Math.max(wholePages.value.length - 1, 0),
  )
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
  if (key === 'j' || key === 'arrowleft') {
    if (prevTaskId.value) {
      event.preventDefault()
      goToTask(prevTaskId.value)
    }
    return
  }
  if (key === 'k' || key === 'arrowright') {
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

async function loadWholePageImageByPage(page: ScannedPageRef, batch = wholePageImageLoadBatch): Promise<void> {
  if (
    !task.value?.examId
    || !task.value?.id
    || wholePageImageUrls[page.pageId]
    || wholePageImageLoading[page.pageId]
  ) {
    return
  }
  wholePageImageLoading[page.pageId] = true
  wholePageImageErrors[page.pageId] = null
  try {
    const url = await loadWholePageImage(page, task.value.examId, task.value.id)
    if (batch !== wholePageImageLoadBatch) {
      URL.revokeObjectURL(url)
      return
    }
    wholePageImageUrls[page.pageId] = url
  } catch (error) {
    if (batch !== wholePageImageLoadBatch) return
    wholePageImageErrors[page.pageId] = toUserError(error, '扫描页图片加载失败')
  } finally {
    if (batch === wholePageImageLoadBatch) {
      wholePageImageLoading[page.pageId] = false
    }
  }
}

async function preloadWholePageImagesForWindow(): Promise<void> {
  const batch = wholePageImageLoadBatch
  const range = visibleWholePageRange.value
  if (range.end < range.start) return
  const start = Math.max(0, range.start - WHOLE_PAGE_PRELOAD_BUFFER)
  const end = Math.min(wholePages.value.length - 1, range.end + WHOLE_PAGE_PRELOAD_BUFFER)
  const queue = wholePages.value
    .slice(start, end + 1)
    .filter((page) => !wholePageImageUrls[page.pageId] && !wholePageImageLoading[page.pageId])
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length > 0) {
      if (batch !== wholePageImageLoadBatch) break
      const page = queue.shift()
      if (page) await loadWholePageImageByPage(page, batch)
    }
  })
  await Promise.all(workers)
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
    currentWholePageIndex.value = 0
    syncWholePaperForms(view.questions, view.pages)
    wholePagesLoaded.value = true
    focusPrimaryScoreInput()
    window.requestAnimationFrame(() => {
      if (wholePageViewportRef.value) {
        wholePageViewportHeight.value = wholePageViewportRef.value.clientHeight
      }
      void preloadWholePageImagesForWindow()
    })
  } catch (error) {
    wholePagesError.value = toUserError(error, '阅卷影像加载失败')
    showUserError(error, '影像工作区加载失败')
  } finally {
    wholePagesLoading.value = false
  }
}

function releaseWholePageImages(): void {
  wholePageImageLoadBatch += 1
  for (const url of Object.values(wholePageImageUrls)) {
    URL.revokeObjectURL(url)
  }
  for (const key of Object.keys(wholePageImageUrls)) {
    delete wholePageImageUrls[key]
  }
  for (const key of Object.keys(wholePageImageLoading)) {
    delete wholePageImageLoading[key]
  }
  for (const key of Object.keys(wholePageImageErrors)) {
    delete wholePageImageErrors[key]
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

function buildWholePaperSubmitRequest(): {
  questionScores: MarkingQuestionScoreSubmitItem[]
  pageAnnotations: MarkingPageAnnotationSubmitItem[]
} {
  if (wholeQuestions.value.length === 0) {
    throw new Error('当前任务负责题目未加载，请刷新后重试')
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
  const pageAnnotations: MarkingPageAnnotationSubmitItem[] = isWholePaperTask.value
    ? wholePages.value
        .map(
          (page): MarkingPageAnnotationSubmitItem => ({
            pageId: page.pageId,
            annotationText: wholePageAnnotationForms[page.pageId]?.trim() || '',
            correlationId: createCorrelationId('page', page.pageId),
          }),
        )
        .filter((item) => item.annotationText.length > 0)
    : []
  return { questionScores, pageAnnotations }
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
  questionViewError.value = null
  releaseWholePageImages()
  wholePages.value = []
  wholeQuestions.value = []
  wholeQuestionScoreInputRefs.value = []
  wholePageScrollTop.value = 0
  wholePageViewportHeight.value = 900
  currentWholePageIndex.value = 0
  clearWholePaperForms()
  wholePagesLoaded.value = false
  wholePagesLoading.value = false
  wholePagesError.value = null
  clearRevealedIdentity()
  revealOpen.value = false
  void loadTask()
})

watch(
  () => [
    visibleWholePageRange.value.start,
    visibleWholePageRange.value.end,
    wholePages.value.length,
  ],
  () => {
    void preloadWholePageImagesForWindow()
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleWorkspaceKeydown)
  if (taskId.value) {
    void loadTask()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWorkspaceKeydown)
  clearRevealedIdentity()
  releaseWholePageImages()
})
</script>

<style lang="scss" scoped>
.marking-task-detail-page {
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
