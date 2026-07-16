<template>
  <div class="review-task-detail-page grading-immersion-page grading-workspace-page">
    <UiEmpty
      v-if="!hasParams"
      description="缺少复核任务，请从复核列表进入"
      class="review-task-detail-page__empty"
    />

    <UiSkeletonState
      v-else-if="loading && !detail"
      variant="card"
      :card-count="2"
      compact
      class="review-task-detail-page__loading"
    />

    <UiEmpty
      v-else-if="!loading && !detail"
      description="复核任务加载失败或不存在"
      class="review-task-detail-page__empty"
    >
      <UiButton size="sm" variant="outline" @click="loadTask">重试</UiButton>
    </UiEmpty>

    <template v-else-if="detail">
      <div
        v-if="detail.status === ReviewTaskStatusCode.INVALIDATED"
        class="review-task-detail-page__invalidated-banner"
      >
        <div class="review-task-detail-page__invalidated-title">当前复核任务已失效</div>
        <div class="review-task-detail-page__invalidated-text">
          原作答影像已因补扫替换失效，系统正在重新执行识别与切片，请等待新复核任务生成。
        </div>
      </div>

      <GradingWorkspaceLayout
        :confidential="isExamConfidential"
        :exam-label="examConfidentialLabel"
        :watermark-lines="watermarkLines"
      >
        <template #queue>
          <GradingImmersionChrome>
            <template #status>
              <UiTag :tone="reviewStatusTone(detail.status)" size="sm">
                {{ reviewStatusLabel(detail.status) }}
              </UiTag>
              <UiTag tone="gray" size="sm">{{ detail.paperDisplay.primaryText }}</UiTag>
              <UiTag tone="blue" size="sm">
                题{{ detail.questionNo }} · 满分{{ detail.fullScore }}
              </UiTag>
            </template>
          </GradingImmersionChrome>
        </template>

        <template #main>
          <GradingImmersionSection
            v-if="detail.questionStem"
            :title="`题目题干 · 第 ${detail.questionNo} 题 · 满分 ${detail.fullScore}`"
          >
            <template #icon><FileTextOutlined /></template>
            <a-typography-paragraph :ellipsis="{ rows: 4, expandable: true, symbol: '展开' }">
              {{ detail.questionStem }}
            </a-typography-paragraph>
          </GradingImmersionSection>

          <GradingImmersionSection title="阅卷影像">
            <template #icon><PictureOutlined /></template>
            <UiEmpty
              v-if="!detail.sliceFileId && !detail.sourceScanPage"
              description="本题暂无阅卷影像"
            />
            <MarkingScanMaterialPanel
              v-else
              :slice-file-id="detail.sliceFileId"
              :source-scan-page="detail.sourceScanPage"
              :layout-paper-page="detail.layoutPaperPage"
              :confidential="isExamConfidential"
              :exam-label="examConfidentialLabel"
              :watermark-lines="watermarkLines"
            />
          </GradingImmersionSection>

          <GradingImmersionSection title="识别答案">
            <template #icon><FileTextOutlined /></template>
            <UiEmpty v-if="!detail.recognizedAnswer" description="本题暂无 OCR 识别答案" />
            <div v-else class="review-task-detail-page__text-block">
              {{ detail.recognizedAnswer }}
            </div>
          </GradingImmersionSection>

          <GradingImmersionSection title="AI 评分说明">
            <template #icon><RobotOutlined /></template>
            <template #tags>
              <UiTag v-if="currentAiSourceLabel" :tone="currentAiSourceTone" size="sm">
                {{ currentAiSourceLabel }}
              </UiTag>
              <UiTag v-if="detail.aiLimited" tone="orange" size="sm">AI 限流/阻断</UiTag>
              <ExperienceAssistBadge
                clickable
                :applied="lastExperienceAssistMeta?.applied"
                :source-exam-name="lastExperienceAssistMeta?.sourceExamName"
                :consistency-rate="lastExperienceAssistMeta?.consistencyRate"
                @open-ai-history="openExecutionsDrawer(detail.aiTraceId)"
              />
            </template>
            <template #actions>
              <UiButton
                size="sm"
                variant="ghost"
                :disabled="!detail.gradeResultId"
                :loading="executionsLoading"
                @click="() => openExecutionsDrawer()"
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
                重新 AI 复评
              </UiButton>
            </template>
            <UiEmpty v-if="!detail.aiDiagnostic" description="暂无 AI 复评说明" />
            <div v-else class="review-task-detail-page__text-block">
              {{ aiReviewDiagnosticText(detail.aiDiagnostic) }}
            </div>
          </GradingImmersionSection>
        </template>

        <template #aside>
          <GradingImmersionSection title="题目与评分摘要">
            <template #icon><ProfileOutlined /></template>
            <a-descriptions :column="1" :label-style="labelStyle" size="small" bordered>
              <a-descriptions-item label="答卷">
                {{ detail.paperDisplay.primaryText }}
              </a-descriptions-item>
              <a-descriptions-item label="题目">
                题{{ detail.questionNo }} · {{ questionTypeLabel(detail.questionType) }}
              </a-descriptions-item>
              <a-descriptions-item label="评分">
                <MarkScoreTriple
                  :ai-score="detail.aiScore"
                  :teacher-review-score="null"
                  :full-score="detail.fullScore"
                  compact
                />
              </a-descriptions-item>
              <a-descriptions-item label="处理追踪编号">
                <a-typography-text v-if="detail.aiTraceId" copyable>
                  {{ detail.aiTraceId }}
                </a-typography-text>
                <span v-else class="muted">-</span>
              </a-descriptions-item>
              <a-descriptions-item v-if="detail.evaluationCriteria" label="评分细则">
                <a-typography-text :content="detail.evaluationCriteria" />
              </a-descriptions-item>
              <a-descriptions-item v-if="detail.commentText" label="评语">
                <a-typography-text :content="detail.commentText" />
              </a-descriptions-item>
            </a-descriptions>
          </GradingImmersionSection>

          <GradingImmersionSection title="批注历史">
            <template #icon><CommentOutlined /></template>
            <UiSkeletonState v-if="annotationsLoading" variant="card" compact />
            <UiEmpty v-else-if="annotations.length === 0" description="暂无批注历史" />
            <template v-else>
              <a-list :data-source="annotations" size="small">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-list-item-meta>
                      <template #title>
                        <a-typography-text :content="item.annotationText || '（无批注正文）'" />
                      </template>
                      <template #description>
                        <span class="muted">{{ formatDateTime(item.createTime) }}</span>
                      </template>
                    </a-list-item-meta>
                  </a-list-item>
                </template>
              </a-list>
              <a-pagination
                v-if="annotationPagination.total > annotationPagination.pageSize"
                v-model:current="annotationPagination.pageNum"
                v-model:page-size="annotationPagination.pageSize"
                :total="annotationPagination.total"
                size="small"
                @change="loadAnnotations"
              />
            </template>
          </GradingImmersionSection>
        </template>

        <template #footer>
          <div class="review-task-detail-page__footer-main">
            <span class="review-task-detail-page__footer-hint">
              {{ detail.paperDisplay.primaryText }} · 题 {{ detail.questionNo }}
            </span>
          </div>
          <div class="review-task-detail-page__footer-actions">
            <UiButton variant="ghost" size="md" @click="goBack">返回</UiButton>
            <UiButton v-if="canEnterWorkspace" size="md" @click="goWorkspace">
              <template #icon><EditOutlined /></template>
              进入复核
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
import type { CSSProperties } from 'vue'
import type { AnnotationResponse } from '@/apis/mark/exam-annotation'
import type {
  AiAbilityCode,
  AiExecutionStatusCode,
  ExamQuestionAiExecutionItemResponse,
} from '@/apis/mark/exam-grade'
import type { ReviewTaskDetailResponse } from '@/apis/mark/exam-review-task'
import type { QuestionTypeCode } from '@/apis/mark/question-type'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import CommentOutlined from '@ant-design/icons-vue/CommentOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import PictureOutlined from '@ant-design/icons-vue/PictureOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listAnnotations } from '@/apis/mark/exam-annotation'
import {
  AI_ABILITY_TONE,
  AI_EXECUTION_STATUS_TONE,
  AiAbilityDescription,
  AiExecutionStatusDescription,
  listAiExecutionsForQuestion,
  rescoreQuestionByAi,
} from '@/apis/mark/exam-grade'
import {
  getReviewTaskDetail,
  REVIEW_TASK_STATUS_TONE,
  ReviewTaskStatusCode,
  ReviewTaskStatusDescription,
} from '@/apis/mark/exam-review-task'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import ExperienceAssistBadge from '@/components/mark/ExperienceAssistBadge.vue'
import GradingImmersionChrome from '@/components/mark/GradingImmersionChrome.vue'
import GradingImmersionSection from '@/components/mark/GradingImmersionSection.vue'
import GradingWorkspaceLayout from '@/components/mark/GradingWorkspaceLayout.vue'
import MarkingAiAssistDrawer from '@/components/mark/MarkingAiAssistDrawer.vue'
import MarkingScanMaterialPanel from '@/components/mark/MarkingScanMaterialPanel.vue'
import MarkScoreTriple from '@/components/mark/MarkScoreTriple.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { isExamConfidentialFlag, useExamConfidential } from '@/composables/useConfidentialWatermark'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceReviewTaskDetail' })

function reviewStatusTone(value: ReviewTaskStatusCode): BadgeTone {
  return strictEnumTone(REVIEW_TASK_STATUS_TONE, value, '复核任务状态')
}

function reviewStatusLabel(value: ReviewTaskStatusCode): string {
  return strictEnumLabel(ReviewTaskStatusDescription, value, '复核任务状态')
}

function questionTypeLabel(value: QuestionTypeCode): string {
  return strictEnumLabel(QuestionTypeDescription, value, '题型')
}

function aiReviewDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    'AI 评分暂未形成可展示说明，请按题目评分细则继续人工复核',
  )
}

const route = useRoute()
const router = useRouter()

const examId = computed(() => (route.params.examId ? String(route.params.examId) : ''))
const {
  confidential: examConfidentialRef,
  examLabel: examConfidentialLabelRef,
  watermarkLines,
} = useExamConfidential(examId)
const isExamConfidential = computed(() => isExamConfidentialFlag(examConfidentialRef.value))
const examConfidentialLabel = computed(() => examConfidentialLabelRef.value)
const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))
const hasParams = computed(() => !!examId.value && !!taskId.value)
const taskSource = computed(() => (route.query.source === 'arbitration' ? 'arbitration' : 'review'))

const detail = ref<ReviewTaskDetailResponse | null>(null)
const loading = ref(false)
const rescoring = ref(false)
const executionsDrawerOpen = ref(false)
const executionsLoading = ref(false)
const aiExecutions = ref<ExamQuestionAiExecutionItemResponse[]>([])
const highlightExecutionTraceId = ref<string | null>(null)
const lastExperienceAssistMeta = ref<{
  applied?: boolean
  sourceExamName?: string
  consistencyRate?: number
} | null>(null)

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

const currentAiSourceLabel = computed(() => {
  const abilityCode = detail.value?.aiAbilityCode
  if (!abilityCode) return ''
  return strictEnumLabel(AiAbilityDescription, abilityCode, 'AI 能力编码')
})

const currentAiSourceTone = computed<BadgeTone>(() => {
  const abilityCode = detail.value?.aiAbilityCode
  if (!abilityCode) return 'gray'
  return strictEnumTone(AI_ABILITY_TONE, abilityCode, 'AI 能力编码')
})

const canRescoreByAi = computed(() => {
  if (rescoring.value || loading.value || !detail.value?.gradeResultId) return false
  return (
    detail.value.status === ReviewTaskStatusCode.PENDING
    || detail.value.status === ReviewTaskStatusCode.IN_PROGRESS
  )
})

const canEnterWorkspace = computed(() => {
  const status = detail.value?.status
  return status === ReviewTaskStatusCode.PENDING || status === ReviewTaskStatusCode.IN_PROGRESS
})

function executionDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    'AI 复评暂未生成可采纳评分，请按题目评分细则继续人工复核',
  )
}

function resolveReviewTaskPoolRouteName():
  'TeacherExamWorkspaceMarkingArbitration' | 'TeacherExamWorkspaceReviewBatchConfirm' {
  return taskSource.value === 'arbitration'
    ? 'TeacherExamWorkspaceMarkingArbitration'
    : 'TeacherExamWorkspaceReviewBatchConfirm'
}

function reviewTaskDetailSourceQuery(): Record<string, string> | undefined {
  if (taskSource.value !== 'arbitration') {
    return undefined
  }
  return { source: 'arbitration' }
}

function goBack(): void {
  if (!examId.value) {
    void router.push({ name: 'TeacherExamList' })
    return
  }
  void router.push({
    name: resolveReviewTaskPoolRouteName(),
    params: { examId: examId.value },
    query: reviewTaskDetailSourceQuery(),
  })
}

function openRescoreConfirm(): void {
  if (!canRescoreByAi.value) return
  void confirmAsync({
    title: '重新生成单题 AI 复评？',
    content: '系统会重新生成单题 AI 复评结果，不会直接写入教师复核评分。',
    type: 'info',
    okText: '生成 AI 复评',
    cancelText: '取消',
    onOk: () => doRescoreByAi(),
  })
}

async function doRescoreByAi(): Promise<void> {
  if (!canRescoreByAi.value || !examId.value || !detail.value) return
  rescoring.value = true
  try {
    const result = await rescoreQuestionByAi({
      examId: examId.value,
      gradeResultId: detail.value.gradeResultId,
    })
    if (Boolean(result.scored) && result.aiScore != null) {
      message.success(`智能复评完成，智能评分 ${result.aiScore} 分`)
    } else {
      message.warning(executionDiagnosticText(result.diagnostic))
    }
    await loadTask()
    if (executionsDrawerOpen.value) {
      await loadAiExecutions()
    }
  } catch (error) {
    showUserError(error, '智能复评调用失败')
  } finally {
    rescoring.value = false
  }
}

function openExecutionsDrawer(highlightTraceId?: string | null): void {
  if (!detail.value?.gradeResultId) return
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
    aiExecutions.value.forEach((record) => {
      strictEnumLabel(AiAbilityDescription, record.abilityCode, 'AI 能力编码')
      strictEnumLabel(AiExecutionStatusDescription, record.status, 'AI 执行状态')
    })
  } catch (error) {
    showUserError(error, '智能复评历史加载失败')
    aiExecutions.value = []
  } finally {
    executionsLoading.value = false
  }
}

function abilityLabel(code: AiAbilityCode): string {
  return strictEnumLabel(AiAbilityDescription, code, 'AI 能力编码')
}

function abilityTone(code: AiAbilityCode): BadgeTone {
  return strictEnumTone(AI_ABILITY_TONE, code, 'AI 能力编码')
}

function statusLabel(status: AiExecutionStatusCode): string {
  return strictEnumLabel(AiExecutionStatusDescription, status, 'AI 执行状态')
}

function statusTone(status: AiExecutionStatusCode): BadgeTone {
  return strictEnumTone(AI_EXECUTION_STATUS_TONE, status, 'AI 执行状态')
}

function timelineColor(status: AiExecutionStatusCode): string {
  return strictEnumTone(AI_EXECUTION_STATUS_TONE, status, 'AI 执行状态')
}

const labelStyle: CSSProperties = { color: 'var(--ant-color-text-tertiary)', width: '100px' }

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

async function loadTask(): Promise<void> {
  if (!hasParams.value) return
  loading.value = true
  try {
    detail.value = await getReviewTaskDetail({
      examId: examId.value,
      reviewTaskId: taskId.value,
    })
    syncExperienceAssistMetaFromDetail(detail.value)
    await loadAnnotations()
  } catch (error) {
    detail.value = null
    annotations.value = []
    showUserError(error, '复核任务详情加载失败')
  } finally {
    loading.value = false
  }
}

function goWorkspace(): void {
  if (!hasParams.value) return
  void router.push({
    name: 'TeacherExamWorkspaceReviewWorkspace',
    params: { examId: examId.value, taskId: taskId.value },
    query: reviewTaskDetailSourceQuery(),
  })
}

watch(
  () => [examId.value, taskId.value],
  () => {
    if (hasParams.value) void loadTask()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.review-task-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  &__empty {
    padding: 60px 0;
  }

  &__invalidated-banner {
    margin-bottom: 12px;
    padding: 12px 16px;
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    background: var(--dp-surface-soft);
  }

  &__invalidated-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__invalidated-text {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--dp-text-secondary);
  }

  &__text-block {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: var(--ant-color-text);
    background: var(--ant-color-fill-quaternary);
    padding: 12px;
    border-radius: var(--dp-radius-panel);
  }

  &__footer-main {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--dp-text-secondary);
  }

  &__footer-hint {
    min-width: 0;
  }

  &__footer-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__execution-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
}

.muted {
  color: var(--ant-color-text-tertiary);
}
</style>
