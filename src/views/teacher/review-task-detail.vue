<template>
  <div class="review-task-detail-page grading-immersion-page grading-workspace-page">
    <WorkbenchContextGateStrip
      v-if="hasContext !== true"
      tag="缺少上下文"
      body="缺少复核任务或合法来源，请从复核列表进入"
      cta-label="返回复核列表"
      :list-route-name="
        taskSource === 'arbitration'
          ? 'TeacherExamWorkspaceMarkingArbitration'
          : 'TeacherExamWorkspaceMarkingReview'
      "
      class="review-task-detail-page__empty"
    />

    <UiSkeletonState
      v-else-if="loading === true && !detail"
      variant="card"
      :card-count="2"
      compact
      class="review-task-detail-page__loading"
    />

    <UiStateBlock
      v-else-if="loading !== true && !detail"
      state="error"
      size="sm"
      title="复核证据不可用"
      :description="detailLoadErrorMessage"
      class="review-task-detail-page__empty"
    >
      <template #actions>
        <UiButton size="sm" variant="outline" @click="goBack">返回复核任务</UiButton>
      </template>
    </UiStateBlock>

    <template v-else-if="detail">
      <UiAlertStrip
        v-if="detail.status === ReviewTaskStatusCode.INVALIDATED"
        tone="warning"
        title="当前复核任务已失效"
        description="原作答影像已因补扫替换失效，系统正在重新执行识别与切片，请等待新复核任务生成。"
        dense
        inline
        class="review-task-detail-page__invalidated-banner"
      />

      <GradingWorkspaceLayout
        :confidential="isExamConfidential"
        :exam-label="examConfidentialLabel"
        :watermark-lines="watermarkLines"
      >
        <template #queue>
          <GradingImmersionChrome>
            <template #status>
              <UiTag
                :tone="strictEnumTone(REVIEW_TASK_STATUS_TONE, detail.status, '复核任务状态')"
                size="sm"
              >
                {{ strictEnumLabel(ReviewTaskStatusDescription, detail.status, '复核任务状态') }}
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
            <UiTypographyParagraph :ellipsis="{ rows: 4, expandable: true, symbol: '展开' }">
              {{ detail.questionStem }}
            </UiTypographyParagraph>
          </GradingImmersionSection>

          <GradingImmersionSection title="阅卷影像">
            <template #icon><PictureOutlined /></template>
            <MarkingScanMaterialPanel
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
            <UiEmpty
              size="sm"
              v-if="!detail.recognizedAnswer"
              description="本题暂无 OCR 识别答案"
            />
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
                :loading="executionsLoading === true"
                @click="() => openExecutionsDrawer()"
              >
                查看 AI 历史
              </UiButton>
            </template>
            <UiEmpty size="sm" v-if="!detail.aiDiagnostic" description="暂无 AI 复评说明" />
            <div v-else class="review-task-detail-page__text-block">
              {{
                getUserErrorMessage(
                  { message: detail.aiDiagnostic },
                  'AI 评分暂未形成可展示说明，请按题目评分细则继续人工复核',
                )
              }}
            </div>
          </GradingImmersionSection>
        </template>

        <template #aside>
          <GradingImmersionSection title="题目与评分摘要">
            <template #icon><ProfileOutlined /></template>
            <UiDescriptions
              class="review-task-detail-page__summary"
              :column="1"
              size="small"
              bordered
            >
              <UiDescriptionsItem label="答卷">
                {{ detail.paperDisplay.primaryText }}
              </UiDescriptionsItem>
              <UiDescriptionsItem label="题目">
                题{{ detail.questionNo }} ·
                {{ strictEnumLabel(QuestionTypeDescription, detail.questionType, '题型') }}
              </UiDescriptionsItem>
              <UiDescriptionsItem label="评分">
                <MarkScoreTriple
                  :ai-score="detail.aiScore"
                  :teacher-review-score="null"
                  :full-score="detail.fullScore"
                  compact
                />
              </UiDescriptionsItem>
              <UiDescriptionsItem label="处理追踪编号">
                <UiTypographyText v-if="detail.aiTraceId" copyable>
                  {{ detail.aiTraceId }}
                </UiTypographyText>
                <span v-else class="dp-text-muted">-</span>
              </UiDescriptionsItem>
              <UiDescriptionsItem v-if="detail.evaluationCriteria" label="评分细则">
                <UiTypographyText :content="detail.evaluationCriteria" />
              </UiDescriptionsItem>
              <UiDescriptionsItem v-if="detail.commentText" label="评语">
                <UiTypographyText :content="detail.commentText" />
              </UiDescriptionsItem>
            </UiDescriptions>
          </GradingImmersionSection>

          <GradingImmersionSection title="批注历史">
            <template #icon><CommentOutlined /></template>
            <UiSkeletonState v-if="annotationsLoading" variant="card" compact />
            <UiStateBlock
              v-else-if="annotationsLoadFailed"
              state="error"
              size="sm"
              title="批注历史加载失败"
              :description="annotationsLoadErrorMessage"
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
                        <span class="dp-text-muted">{{ formatDateTime(item.createTime) }}</span>
                      </template>
                    </UiListItemMeta>
                  </UiListItem>
                </template>
              </UiList>
              <UiPagination
                v-if="annotationPagination.total > annotationPagination.pageSize"
                v-model:current="annotationPagination.pageNum"
                v-model:page-size="annotationPagination.pageSize"
                :total="annotationPagination.total"
                :show-size-changer="false"
                size="small"
                @change="loadAnnotations()"
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
            <UiButton
              v-if="canEnterWorkspace === true"
              size="md"
              variant="primary"
              @click="goWorkspace"
            >
              <template #icon><EditOutlined /></template>
              进入复核
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
import type { AnnotationResponse } from '@/apis/mark/exam-annotation'
import { listAnnotations } from '@/apis/mark/exam-annotation'
import type { ExamQuestionAiExecutionItemResponse } from '@/apis/mark/exam-grade'
import {
  AI_ABILITY_TONE,
  AiAbilityDescription,
  listAiExecutionsForQuestion,
} from '@/apis/mark/exam-grade'
import type { ReviewTaskDetailResponse } from '@/apis/mark/exam-review-task'
import {
  getReviewTaskDetail,
  REVIEW_TASK_STATUS_TONE,
  ReviewTaskStatusCode,
  ReviewTaskStatusDescription,
} from '@/apis/mark/exam-review-task'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import CommentOutlined from '@ant-design/icons-vue/CommentOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import PictureOutlined from '@ant-design/icons-vue/PictureOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiList from '@/components/ui-guide/ui/UiList.vue'
import UiListItem from '@/components/ui-guide/ui/UiListItem.vue'
import UiListItemMeta from '@/components/ui-guide/ui/UiListItemMeta.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiStateBlock from '@/components/ui-guide/ui/UiStateBlock.vue'
import UiTypographyParagraph from '@/components/ui-guide/ui/UiTypographyParagraph.vue'
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'
import { isExamConfidentialFlag, useExamConfidential } from '@/composables/useConfidentialWatermark'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceReviewTaskDetail' })

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
const taskSource = computed<'arbitration' | 'review' | null>(() => {
  if (route.query.source === 'arbitration' || route.query.source === 'review') {
    return route.query.source
  }
  return null
})
const hasContext = computed(
  () => Boolean(examId.value) && Boolean(taskId.value) && taskSource.value !== null,
)

const detail = ref<ReviewTaskDetailResponse | null>(null)
const loading = ref(false)
const detailLoadErrorMessage = ref(
  '复核任务详情、正式影像或识别证据加载失败，当前页不能展示审计证据。',
)
let loadTaskGeneration = 0
const executionsDrawerOpen = ref(false)
const executionsLoading = ref(false)
const aiExecutions = ref<ExamQuestionAiExecutionItemResponse[]>([])
const aiExecutionsLoadFailed = ref(false)
let aiExecutionsLoadGeneration = 0
const highlightExecutionTraceId = ref<string | null>(null)
const lastExperienceAssistMeta = computed(() => {
  const audit = detail.value?.referenceExperienceAudit
  if (audit?.referenceExperienceApplied && audit.referenceExperienceSourceExamName) {
    return {
      applied: true,
      sourceExamName: audit.referenceExperienceSourceExamName,
      consistencyRate: audit.referenceExperienceConsistencyRate,
    }
  }
  return null
})

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

const canManageReviewerWrites = computed(() => detail.value?.canManageReviewerWrites === true)

const canEnterWorkspace = computed(() => {
  const status = detail.value?.status
  return (
    canManageReviewerWrites.value === true &&
    (status === ReviewTaskStatusCode.PENDING || status === ReviewTaskStatusCode.IN_PROGRESS)
  )
})

/** 返回进入详情前的复核任务池，并保留仲裁来源。 */
function goBack(): void {
  if (!examId.value) {
    void router.push({ name: 'TeacherExamList' })
    return
  }
  void router.push({
    name:
      taskSource.value === 'arbitration'
        ? 'TeacherExamWorkspaceMarkingArbitration'
        : 'TeacherExamWorkspaceMarkingReview',
    params: { examId: examId.value },
    query: taskSource.value ? { source: taskSource.value } : undefined,
  })
}

/** 打开当前题目的只读 AI 执行审计，并可定位指定追踪记录。 */
function openExecutionsDrawer(highlightTraceId?: string | null): void {
  if (!detail.value?.gradeResultId) return
  highlightExecutionTraceId.value = highlightTraceId ?? detail.value.aiTraceId ?? null
  executionsDrawerOpen.value = true
  void loadAiExecutions()
}

/** 读取当前题 AI 执行审计，并隔离重复打开或切任务产生的过期响应。 */
async function loadAiExecutions(expectedTaskGeneration = loadTaskGeneration): Promise<void> {
  if (!examId.value || !detail.value) return
  const expectedExamId = examId.value
  const expectedTaskId = taskId.value
  const expectedGradeResultId = detail.value.gradeResultId
  const requestGeneration = ++aiExecutionsLoadGeneration
  executionsLoading.value = true
  aiExecutionsLoadFailed.value = false
  try {
    const executions = await listAiExecutionsForQuestion({
      examId: expectedExamId,
      gradeResultId: expectedGradeResultId,
    })
    if (
      expectedTaskGeneration !== loadTaskGeneration ||
      requestGeneration !== aiExecutionsLoadGeneration ||
      examId.value !== expectedExamId ||
      taskId.value !== expectedTaskId ||
      detail.value?.gradeResultId !== expectedGradeResultId
    ) {
      return
    }
    aiExecutions.value = executions
  } catch (error) {
    if (
      expectedTaskGeneration !== loadTaskGeneration ||
      requestGeneration !== aiExecutionsLoadGeneration
    ) {
      return
    }
    showUserError(error, '智能复评历史加载失败')
    aiExecutions.value = []
    aiExecutionsLoadFailed.value = true
  } finally {
    if (
      expectedTaskGeneration === loadTaskGeneration &&
      requestGeneration === aiExecutionsLoadGeneration
    ) {
      executionsLoading.value = false
    }
  }
}

const annotations = ref<AnnotationResponse[]>([])
const annotationsLoading = ref(false)
const annotationsLoadFailed = ref(false)
const annotationsLoadErrorMessage = ref('当前批注证据不可用，已停止展示旧任务的批注。')
let annotationsLoadGeneration = 0
const annotationPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })

/** 读取当前任务批注分页，并隔离翻页与切任务产生的过期响应。 */
async function loadAnnotations(expectedTaskGeneration = loadTaskGeneration): Promise<void> {
  if (!examId.value || !detail.value) return
  const expectedExamId = examId.value
  const expectedTaskId = taskId.value
  const { paperInstanceId, layoutQuestionId, gradeResultId } = detail.value
  const requestGeneration = ++annotationsLoadGeneration
  annotationsLoading.value = true
  annotationsLoadFailed.value = false
  try {
    const page = await listAnnotations({
      examId: expectedExamId,
      paperInstanceId,
      layoutQuestionId,
      gradeResultId,
      pageNum: annotationPagination.pageNum,
      pageSize: annotationPagination.pageSize,
    })
    if (
      expectedTaskGeneration !== loadTaskGeneration ||
      requestGeneration !== annotationsLoadGeneration ||
      examId.value !== expectedExamId ||
      taskId.value !== expectedTaskId ||
      detail.value?.gradeResultId !== gradeResultId
    ) {
      return
    }
    annotations.value = page.list
    annotationPagination.total = page.total
    annotationPagination.pageNum = page.pageNum
    annotationPagination.pageSize = page.pageSize
  } catch (error) {
    if (
      expectedTaskGeneration !== loadTaskGeneration ||
      requestGeneration !== annotationsLoadGeneration
    ) {
      return
    }
    annotations.value = []
    annotationPagination.total = 0
    annotationsLoadFailed.value = true
    annotationsLoadErrorMessage.value = getUserErrorMessage(
      error,
      '当前批注证据不可用，已停止展示旧任务的批注。',
    )
    showUserError(error, '批注记录加载失败')
  } finally {
    if (
      expectedTaskGeneration === loadTaskGeneration &&
      requestGeneration === annotationsLoadGeneration
    ) {
      annotationsLoading.value = false
    }
  }
}

/** 读取当前复核任务的正式证据，详情稳定后再加载任务范围内的批注。 */
async function loadTask(): Promise<void> {
  if (hasContext.value !== true) return
  const expectedExamId = examId.value
  const expectedTaskId = taskId.value
  const expectedSource = taskSource.value
  const requestGeneration = ++loadTaskGeneration
  loading.value = true
  try {
    const loadedDetail = await getReviewTaskDetail({
      examId: expectedExamId,
      reviewTaskId: expectedTaskId,
    })
    if (
      requestGeneration !== loadTaskGeneration ||
      examId.value !== expectedExamId ||
      taskId.value !== expectedTaskId ||
      taskSource.value !== expectedSource
    ) {
      return
    }
    detail.value = loadedDetail
    await loadAnnotations(requestGeneration)
  } catch (error) {
    if (requestGeneration !== loadTaskGeneration) return
    detail.value = null
    annotations.value = []
    detailLoadErrorMessage.value = getUserErrorMessage(
      error,
      '复核任务详情、正式影像或识别证据加载失败，当前页不能展示审计证据。',
    )
    showUserError(error, '复核任务详情加载失败')
  } finally {
    if (requestGeneration === loadTaskGeneration) {
      loading.value = false
    }
  }
}

/** 从只读证据页进入同一任务的可写复核工作台。 */
function goWorkspace(): void {
  if (hasContext.value !== true || canEnterWorkspace.value !== true) return
  void router.push({
    name: 'TeacherExamWorkspaceReviewWorkspace',
    params: { examId: examId.value, taskId: taskId.value },
    query: { source: taskSource.value },
  })
}

watch(
  () => [examId.value, taskId.value, taskSource.value],
  () => {
    loadTaskGeneration += 1
    annotationsLoadGeneration += 1
    aiExecutionsLoadGeneration += 1
    detail.value = null
    loading.value = false
    executionsDrawerOpen.value = false
    executionsLoading.value = false
    aiExecutions.value = []
    aiExecutionsLoadFailed.value = false
    highlightExecutionTraceId.value = null
    annotations.value = []
    annotationsLoading.value = false
    annotationsLoadFailed.value = false
    annotationPagination.pageNum = 1
    annotationPagination.total = 0
    if (hasContext.value === true) void loadTask()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.review-task-detail-page {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
  min-width: 0;

  &__empty {
    padding: var(--dp-space-component) 0;
  }

  &__invalidated-banner {
    margin-bottom: var(--dp-space-component);
  }

  &__text-block {
    margin: 0;
    font-size: var(--dp-font-size-sm);
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: var(--dp-text-primary);
    background: var(--dp-fill-quaternary);
    padding: var(--dp-space-component);
    border-radius: var(--dp-radius-panel);
  }

  &__footer-main {
    flex: 1;
    min-width: 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__footer-hint {
    display: block;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  &__footer-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__summary :deep(.ant-descriptions-item-content) {
    min-width: 0;
    overflow-wrap: anywhere;
  }
}
</style>
