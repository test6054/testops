<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioAiAnalysisDetailVO,
  PortfolioAiAnalysisSummaryVO,
  PortfolioAiJobContext,
} from '@/apis/portfolio/types'
import type { BadgeTone, UiSectionTabItem } from '@/components/ui-guide/ui/types'
import { computed, reactive, ref, watch } from 'vue'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import { PortfolioMaterialTypeCode } from '@/apis/portfolio/enums'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { AiTaskStatusCode } from '@/types/enums/ai-task-status-enum'
import {
  PortfolioAiAnalysisReviewStatusCode,
  PortfolioAiAnalysisReviewStatusDescription,
} from '@/types/enums/portfolio-ai-analysis-review-status-enum'
import {
  PortfolioAiAnalysisTypeCode,
  PortfolioAiAnalysisTypeDescription,
} from '@/types/enums/portfolio-ai-analysis-type-enum'
import { PortfolioAiTaskTypeCode } from '@/types/enums/portfolio-ai-task-type-enum'
import { showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import { strictEnumLabel } from '@/utils/strict-enum'

type AssistantKey = 'generate' | 'optimize' | 'effect' | 'development'

interface AssistantDefinition {
  key: AssistantKey
  label: string
  helper: string
  taskType: PortfolioAiTaskTypeCode
  analysisType: PortfolioAiAnalysisTypeCode
}

const ASSISTANTS: readonly AssistantDefinition[] = [
  {
    key: 'generate',
    label: '智能内容生成',
    helper: '生成教案框架、课程描述或教学反思提示，确认后写入通用文档草稿。',
    taskType: PortfolioAiTaskTypeCode.PORTFOLIO_CONTENT_GENERATE,
    analysisType: PortfolioAiAnalysisTypeCode.CONTENT_GENERATE,
  },
  {
    key: 'optimize',
    label: '内容优化建议',
    helper: '基于已有教学材料生成润色、结构与表达优化稿，确认后写入通用文档草稿。',
    taskType: PortfolioAiTaskTypeCode.PORTFOLIO_CONTENT_OPTIMIZE,
    analysisType: PortfolioAiAnalysisTypeCode.CONTENT_OPTIMIZE,
  },
  {
    key: 'effect',
    label: '教学效果分析',
    helper: '分析教学材料中的成效、优势与改进点，确认后写入通用文档草稿。',
    taskType: PortfolioAiTaskTypeCode.PORTFOLIO_TEACHING_EFFECT_ANALYSIS,
    analysisType: PortfolioAiAnalysisTypeCode.TEACHING_EFFECT_ANALYSIS,
  },
  {
    key: 'development',
    label: '个性化发展建议',
    helper: '结合当前教师档案与最新画像生成专业发展建议，确认后写入本年度发展规划。',
    taskType: PortfolioAiTaskTypeCode.PORTFOLIO_DEVELOPMENT_SUGGEST,
    analysisType: PortfolioAiAnalysisTypeCode.DEVELOPMENT_SUGGEST,
  },
]

const tabItems: UiSectionTabItem[] = ASSISTANTS.map((item) => ({
  key: item.key,
  label: item.label,
  helper: item.helper,
}))

const { targetTeacherId, canPickTeachers, currentUserId } = usePortfolioPageScope()
const { canManageTeacherAi } = usePortfolioTeacherAccess()
const activeKey = ref<AssistantKey>('generate')
const submitting = ref(false)
const historyLoading = ref(false)
const reviewLoading = ref(false)
const loadFailed = ref(false)
const historyRows = ref<PortfolioAiAnalysisSummaryVO[]>([])
const historyTotal = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const activeDetail = ref<PortfolioAiAnalysisDetailVO | null>(null)
const detailOpen = ref(false)
const pollToken = ref(0)
const historyToken = ref(0)
const reviewToken = ref(0)
const reviewForm = reactive({
  revisedDraftMarkdown: '',
  reviewOpinion: '',
})
const submitForm = reactive({
  generateScene: 'LESSON_PLAN_FRAME',
  generateBrief: '',
  sourceText: '',
  evaluationSummary: '',
  developmentFocusArea: '',
})

const currentAssistant = computed(
  () => ASSISTANTS.find((item) => item.key === activeKey.value) ?? ASSISTANTS[0],
)
const canOperate = computed(() =>
  Boolean(targetTeacherId.value && canManageTeacherAi(targetTeacherId.value)),
)
const pendingReview = computed(
  () => activeDetail.value?.reviewStatus === PortfolioAiAnalysisReviewStatusCode.PENDING_REVIEW,
)
const canReviewResult = computed(
  () => pendingReview.value && activeDetail.value?.teacherId === currentUserId.value,
)

const columns: ColumnsType<PortfolioAiAnalysisSummaryVO> = [
  { title: '结果', dataIndex: 'resultTitle', key: 'resultTitle', ellipsis: true },
  { title: '状态', key: 'reviewStatus', width: 100, align: 'center' },
  { title: '生成时间', dataIndex: 'generatedTime', key: 'generatedTime', width: 168 },
  { title: '操作', key: 'actions', width: 92, align: 'center' },
]

function reviewStatusTone(status: PortfolioAiAnalysisReviewStatusCode): BadgeTone {
  const tones: Record<PortfolioAiAnalysisReviewStatusCode, BadgeTone> = {
    [PortfolioAiAnalysisReviewStatusCode.PENDING_REVIEW]: 'orange',
    [PortfolioAiAnalysisReviewStatusCode.APPROVED]: 'green',
    [PortfolioAiAnalysisReviewStatusCode.REJECTED]: 'red',
  }
  return tones[status]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function resetTeacherContext(): void {
  pollToken.value += 1
  historyToken.value += 1
  reviewToken.value += 1
  submitting.value = false
  historyLoading.value = false
  reviewLoading.value = false
  historyRows.value = []
  historyTotal.value = 0
  pageNum.value = 1
  detailOpen.value = false
  activeDetail.value = null
}

function buildTaskContext(): PortfolioAiJobContext {
  if (activeKey.value === 'generate') {
    return {
      generateScene: submitForm.generateScene,
      generateBrief: submitForm.generateBrief.trim() || undefined,
      sourceText: submitForm.sourceText.trim() || undefined,
    }
  }
  if (activeKey.value === 'development') {
    return {
      evaluationSummary: submitForm.evaluationSummary.trim() || undefined,
      developmentFocusArea: submitForm.developmentFocusArea.trim() || undefined,
    }
  }
  if (activeKey.value === 'effect') {
    return {
      sourceText: submitForm.sourceText.trim(),
      evaluationSummary: submitForm.evaluationSummary.trim() || undefined,
    }
  }
  return { sourceText: submitForm.sourceText.trim() }
}

function validateSubmit(): boolean {
  if (!targetTeacherId.value) {
    message.warning('请先选择教师')
    return false
  }
  if (!canOperate.value) {
    message.error('无权为该教师使用 AI 助手')
    return false
  }
  if (
    (activeKey.value === 'optimize' || activeKey.value === 'effect') &&
    !submitForm.sourceText.trim()
  ) {
    message.warning('请填写待分析的教学材料正文')
    return false
  }
  return true
}

async function loadHistory(): Promise<void> {
  const assistant = currentAssistant.value
  const teacherId = targetTeacherId.value
  const token = ++historyToken.value
  if (!teacherId) {
    historyRows.value = []
    historyTotal.value = 0
    return
  }
  historyLoading.value = true
  loadFailed.value = false
  try {
    const page = await portfolioAiJobApi.pageAnalysis({
      teacherId,
      analysisType: assistant.analysisType,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    if (historyToken.value !== token || currentAssistant.value.key !== assistant.key) {
      return
    }
    historyRows.value = page.list
    historyTotal.value = page.total
  } catch (error) {
    if (historyToken.value !== token) {
      return
    }
    historyRows.value = []
    historyTotal.value = 0
    loadFailed.value = true
    showUserError(error, '加载 AI 助手历史结果失败')
  } finally {
    if (historyToken.value === token) {
      historyLoading.value = false
    }
  }
}

function applyDetail(detail: PortfolioAiAnalysisDetailVO): void {
  activeDetail.value = detail
  reviewForm.revisedDraftMarkdown = detail.draftMarkdown || detail.summary || ''
  reviewForm.reviewOpinion = ''
  detailOpen.value = true
}

async function openDetail(row: PortfolioAiAnalysisSummaryVO): Promise<void> {
  try {
    applyDetail(await portfolioAiJobApi.getAnalysis(row.id))
  } catch (error) {
    showUserError(error, '加载 AI 分析详情失败')
  }
}

async function pollTask(taskId: string, token: number): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (pollToken.value !== token) {
      return
    }
    const task = await portfolioAiJobApi.get(taskId)
    if (task.status === AiTaskStatusCode.SUCCEEDED) {
      const detail = await portfolioAiJobApi.getAnalysisByTask(taskId)
      if (pollToken.value !== token) {
        return
      }
      applyDetail(detail)
      await loadHistory()
      message.success('AI 结果已生成，请复核后确认采用')
      return
    }
    if (task.status === AiTaskStatusCode.FAILED || task.status === AiTaskStatusCode.CANCELLED) {
      throw new Error('AI 任务执行失败，请在历史任务中查看原因')
    }
    await sleep(2000)
  }
  throw new Error('AI 任务仍在执行，请稍后从历史结果查看')
}

async function submitTask(): Promise<void> {
  if (!validateSubmit()) {
    return
  }
  submitting.value = true
  const token = ++pollToken.value
  try {
    const result = await portfolioAiJobApi.submit({
      taskType: currentAssistant.value.taskType,
      teacherId: targetTeacherId.value!,
      materialType: PortfolioMaterialTypeCode.DOCUMENT,
      context: buildTaskContext(),
    })
    message.info('AI 任务已提交，正在生成结果')
    await pollTask(result.taskId, token)
  } catch (error) {
    if (pollToken.value === token) {
      showUserError(error, 'AI 助手任务失败')
    }
  } finally {
    if (pollToken.value === token) {
      submitting.value = false
    }
  }
}

async function reviewResult(reviewStatus: PortfolioAiAnalysisReviewStatusCode): Promise<void> {
  if (!activeDetail.value || !pendingReview.value || reviewLoading.value) {
    return
  }
  if (
    reviewStatus === PortfolioAiAnalysisReviewStatusCode.REJECTED &&
    !reviewForm.reviewOpinion.trim()
  ) {
    message.warning('请填写驳回原因')
    return
  }
  const target = activeDetail.value
  const targetId = target.id
  const targetTeacherScopeId = target.teacherId
  const targetAssistantKey = activeKey.value
  const token = ++reviewToken.value
  reviewLoading.value = true
  try {
    if (reviewStatus === PortfolioAiAnalysisReviewStatusCode.REJECTED) {
      const confirmed = await confirmAsync({
        title: '确认驳回 AI 结果？',
        content: '驳回后该结果进入终态，不会写入档案草稿或发展规划；驳回原因将保留用于审计。',
        type: 'warning',
        okText: '确认驳回',
      })
      if (!confirmed) return
    }
    const detail = await portfolioAiJobApi.reviewAnalysis({
      analysisResultId: targetId,
      reviewStatus,
      revisedDraftMarkdown:
        reviewStatus === PortfolioAiAnalysisReviewStatusCode.APPROVED
          ? reviewForm.revisedDraftMarkdown.trim() || undefined
          : undefined,
      reviewOpinion: reviewForm.reviewOpinion.trim() || undefined,
    })
    if (
      reviewToken.value !== token ||
      targetTeacherId.value !== targetTeacherScopeId ||
      activeKey.value !== targetAssistantKey
    ) {
      return
    }
    applyDetail(detail)
    await loadHistory()
    message.success(
      reviewStatus === PortfolioAiAnalysisReviewStatusCode.APPROVED
        ? activeKey.value === 'development'
          ? '建议已写入本年度发展规划'
          : '结果已写入通用文档草稿'
        : 'AI 结果已驳回',
    )
  } catch (error) {
    if (reviewToken.value !== token) return
    showUserError(error, '处理 AI 分析结果失败')
  } finally {
    if (reviewToken.value === token) reviewLoading.value = false
  }
}

function handlePageChange(page: { current: number; pageSize: number }): void {
  pageNum.value = page.current
  pageSize.value = page.pageSize
  void loadHistory()
}

watch(activeKey, () => {
  pollToken.value += 1
  submitting.value = false
  pageNum.value = 1
  detailOpen.value = false
  activeDetail.value = null
  void loadHistory()
})
watch(targetTeacherId, resetTeacherContext)
usePortfolioScopedLoader(loadHistory, () => targetTeacherId.value)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="AI 四类助手"
        subtitle="生成结果须由教师复核确认后，才会进入档案或发展规划"
      />
    </template>

    <UiEmpty
      v-if="canPickTeachers && !targetTeacherId"
      title="尚未选择教师"
      description="请从档案袋顶部教师范围中选择目标教师"
    />

    <template v-else>
      <UiSectionTabs v-model="activeKey" :items="tabItems" />

      <UiCard :title="currentAssistant.label" class="ai-assistants__form">
        <a-form layout="vertical">
          <a-form-item v-if="activeKey === 'generate'" label="生成场景" required>
            <a-select v-model:value="submitForm.generateScene">
              <a-select-option value="LESSON_PLAN_FRAME">教案框架</a-select-option>
              <a-select-option value="COURSE_DESCRIPTION">课程描述</a-select-option>
              <a-select-option value="REFLECTION_PROMPT">教学反思提示</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item v-if="activeKey === 'generate'" label="生成要求">
            <a-textarea
              v-model:value="submitForm.generateBrief"
              :rows="3"
              placeholder="补充课程、教学对象、课时或写作要求"
            />
          </a-form-item>
          <a-form-item
            v-if="activeKey === 'generate' || activeKey === 'optimize' || activeKey === 'effect'"
            :label="activeKey === 'generate' ? '参考正文' : '教学材料正文'"
            :required="activeKey !== 'generate'"
          >
            <a-textarea
              v-model:value="submitForm.sourceText"
              :rows="8"
              :placeholder="
                activeKey === 'generate'
                  ? '可选：粘贴已有内容作为生成参考'
                  : '粘贴需要处理的教学材料正文'
              "
            />
          </a-form-item>
          <a-form-item v-if="activeKey === 'effect'" label="评价数据摘要">
            <a-textarea
              v-model:value="submitForm.evaluationSummary"
              :rows="5"
              placeholder="可选：粘贴已归档的学生评教、督导意见或同行评议摘要；缺失时系统会明确标注证据不足"
            />
          </a-form-item>
          <template v-if="activeKey === 'development'">
            <a-form-item label="教学总结">
              <a-textarea
                v-model:value="submitForm.evaluationSummary"
                :rows="5"
                placeholder="可选：补充本学年教学总结；系统会同时读取教师档案与最新画像"
              />
            </a-form-item>
            <a-form-item label="发展关注方向">
              <a-input
                v-model:value="submitForm.developmentFocusArea"
                placeholder="如课程建设、教学研究、企业实践"
              />
            </a-form-item>
          </template>
          <UiButton :loading="submitting" :disabled="!canOperate" @click="submitTask">
            生成并进入复核
          </UiButton>
        </a-form>
      </UiCard>

      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        title="历史结果"
        :description="`仅展示当前教师的${currentAssistant.label}结果`"
        :columns="columns"
        :data-source="historyRows"
        :loading="historyLoading"
        :load-error="loadFailed"
        :total="historyTotal"
        pagination-mode="server"
        row-key="id"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'reviewStatus'">
            <UiTag :tone="reviewStatusTone(record.reviewStatus)">
              {{
                strictEnumLabel(
                  PortfolioAiAnalysisReviewStatusDescription,
                  record.reviewStatus,
                  'AI 分析审核状态',
                )
              }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton variant="ghost" size="sm" @click="openDetail(record)">查看</UiButton>
          </template>
        </template>
        <template #empty-action>
          <UiButton variant="outline" @click="loadHistory">重新加载</UiButton>
        </template>
      </UiDataTable>
    </template>
  </StageWorkbenchShell>

  <UiDrawer
    v-model:open="detailOpen"
    :title="activeDetail?.resultTitle || 'AI 分析结果'"
    width="720"
  >
    <template v-if="activeDetail">
      <div class="ai-assistants__detail-meta">
        <UiTag tone="blue">
          {{
            strictEnumLabel(
              PortfolioAiAnalysisTypeDescription,
              activeDetail.analysisType,
              'AI 分析类型',
            )
          }}
        </UiTag>
        <UiTag :tone="reviewStatusTone(activeDetail.reviewStatus)">
          {{
            strictEnumLabel(
              PortfolioAiAnalysisReviewStatusDescription,
              activeDetail.reviewStatus,
              'AI 分析审核状态',
            )
          }}
        </UiTag>
      </div>
      <p class="ai-assistants__summary">{{ activeDetail.summary }}</p>
      <a-form layout="vertical">
        <a-form-item label="结果正文">
          <a-textarea
            v-model:value="reviewForm.revisedDraftMarkdown"
            :disabled="!canReviewResult"
            :rows="16"
          />
        </a-form-item>
        <a-form-item label="复核意见">
          <a-textarea
            v-model:value="reviewForm.reviewOpinion"
            :disabled="!canReviewResult"
            :rows="3"
            placeholder="驳回时必须填写原因；确认采用时可选"
          />
        </a-form-item>
      </a-form>
      <p v-if="pendingReview && !canReviewResult" class="ai-assistants__review-hint">
        该结果须由教师本人确认或驳回。
      </p>
      <div v-if="canReviewResult" class="ai-assistants__review-actions">
        <UiButton
          variant="outline"
          status="danger"
          :loading="reviewLoading"
          @click="reviewResult(PortfolioAiAnalysisReviewStatusCode.REJECTED)"
        >
          驳回结果
        </UiButton>
        <UiButton
          :loading="reviewLoading"
          @click="reviewResult(PortfolioAiAnalysisReviewStatusCode.APPROVED)"
        >
          {{
            activeDetail.analysisType === PortfolioAiAnalysisTypeCode.DEVELOPMENT_SUGGEST
              ? '确认写入发展规划'
              : '确认写入档案草稿'
          }}
        </UiButton>
      </div>
    </template>
  </UiDrawer>
</template>

<style scoped lang="scss">
.ai-assistants__form {
  margin: var(--dp-space-4) 0;
}

.ai-assistants__detail-meta,
.ai-assistants__review-actions {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.ai-assistants__summary {
  margin: var(--dp-space-4) 0;
  color: var(--dp-text-secondary);
  line-height: 1.6;
}

.ai-assistants__review-hint {
  margin: 0;
  color: var(--dp-text-secondary);
  text-align: right;
}

.ai-assistants__review-actions {
  justify-content: flex-end;
}
</style>
