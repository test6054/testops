<script setup lang="ts">
import type {
  PortfolioAiAnalysisDetailVO,
  PortfolioAiAnalysisSummaryVO,
  PortfolioAiJobContext,
} from '@/apis/portfolio/types'
import type { BadgeTone, UiSectionTabItem } from '@/components/ui-guide/ui/types'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import { PortfolioMaterialTypeCode } from '@/apis/portfolio/enums'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { AiTaskStatusCode } from '@/types/enums/ai-task-status-enum'
import {
  PortfolioAiAnalysisReviewStatusCode,
  PortfolioAiAnalysisReviewStatusDescription,
} from '@/types/enums/portfolio-ai-analysis-review-status-enum'
import { PortfolioAiAnalysisTypeCode } from '@/types/enums/portfolio-ai-analysis-type-enum'
import { PortfolioAiTaskTypeCode } from '@/types/enums/portfolio-ai-task-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
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

const route = useRoute()
const { targetTeacherId, canPickTeachers, currentUserId } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard()
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
/** 管理员代办：可生成草稿，不可替本人确认入库 */
const isProxyMode = computed(() =>
  Boolean(
    canPickTeachers.value && targetTeacherId.value && targetTeacherId.value !== currentUserId.value,
  ),
)
const pendingReview = computed(
  () => activeDetail.value?.reviewStatus === PortfolioAiAnalysisReviewStatusCode.PENDING_REVIEW,
)
const canReviewResult = computed(
  () => pendingReview.value && activeDetail.value?.teacherId === currentUserId.value,
)

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
    showFormValidationMessage('请先选择教师')
    return false
  }
  if (!canOperate.value) {
    showUserError(null, '无权为该教师使用智能助手')
    return false
  }
  if (
    (activeKey.value === 'optimize' || activeKey.value === 'effect')
    && !submitForm.sourceText.trim()
  ) {
    showFormValidationMessage('请填写待分析的教学材料正文')
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
    showUserError(error, '加载智能助手历史结果失败')
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
  // SHIP：草稿落主列单栏，不再默认弹抽屉第三栏
}

async function openDetail(row: PortfolioAiAnalysisSummaryVO): Promise<void> {
  try {
    applyDetail(await portfolioAiJobApi.getAnalysis(row.id))
  } catch (error) {
    showUserError(error, '加载智能分析详情失败')
  }
}

function readRouteStringParam(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim()
  }
  return ''
}

function isAssistantKey(value: string): value is AssistantKey {
  return ASSISTANTS.some((item) => item.key === value)
}

/**
 * PF-P0-286：站内信 jumpUrl 的 tab/taskId 深链；对齐四能力助手页，禁止落到编排页丢结果。
 */
async function applyAiAssistantDeepLink() {
  const tab = readRouteStringParam(route.query.tab)
  if (tab && isAssistantKey(tab)) {
    activeKey.value = tab
  }
  const taskId = readRouteStringParam(route.query.taskId)
  if (!taskId) {
    return
  }
  const token = ++pollToken.value
  submitting.value = true
  try {
    await pollTask(taskId, token)
  } catch (error) {
    if (pollToken.value === token) {
      showUserError(error, '加载智能助手任务结果失败')
    }
  } finally {
    if (pollToken.value === token) {
      submitting.value = false
    }
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
      void message.success('智能分析结果已生成，请复核后确认采用')
      return
    }
    if (task.status === AiTaskStatusCode.FAILED || task.status === AiTaskStatusCode.CANCELLED) {
      showUserError(null, '智能分析任务执行失败，请在历史任务中查看原因')
      return
    }
    await sleep(2000)
  }
  showUserError(null, '智能分析任务仍在执行，请稍后从历史结果查看')
}

async function submitTask(): Promise<void> {
  if (!validateSubmit()) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('提交 AI 草稿任务'))) {
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
    void message.info('智能分析任务已提交，正在生成结果')
    await pollTask(result.taskId, token)
  } catch (error) {
    if (pollToken.value === token) {
      showUserError(error, '智能助手任务失败')
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
    reviewStatus === PortfolioAiAnalysisReviewStatusCode.APPROVED
    && archiveWriteForbidden.value
  ) {
    return
  }
  if (
    reviewStatus === PortfolioAiAnalysisReviewStatusCode.REJECTED
    && !reviewForm.reviewOpinion.trim()
  ) {
    showFormValidationMessage('请填写驳回原因')
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
        title: '确认驳回智能分析结果？',
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
      reviewToken.value !== token
      || targetTeacherId.value !== targetTeacherScopeId
      || activeKey.value !== targetAssistantKey
    ) {
      return
    }
    applyDetail(detail)
    await loadHistory()
    void message.success(
      reviewStatus === PortfolioAiAnalysisReviewStatusCode.APPROVED
        ? activeKey.value === 'development'
          ? '建议已写入本年度发展规划'
          : '结果已写入通用文档草稿'
        : '智能分析结果已驳回',
    )
  } catch (error) {
    if (reviewToken.value !== token) return
    showUserError(error, '处理智能分析结果失败')
  } finally {
    if (reviewToken.value === token) reviewLoading.value = false
  }
}

function loadMoreHistory(): void {
  pageSize.value = Math.min(pageSize.value + 10, 50)
  void loadHistory()
}

watch(activeKey, () => {
  pollToken.value += 1
  submitting.value = false
  pageNum.value = 1
  activeDetail.value = null
  void loadHistory()
})
watch(targetTeacherId, resetTeacherContext)

onMounted(() => {
  void applyAiAssistantDeepLink()
})

watch(
  () => [route.query.taskId, route.query.tab],
  (next, prev) => {
    if (prev && next[0] === prev[0] && next[1] === prev[1]) {
      return
    }
    void applyAiAssistantDeepLink()
  },
)

usePortfolioScopedLoader(loadHistory, () => targetTeacherId.value)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="AI 四助手"
        subtitle="AI 只出草稿 · 教师本人确认后才写入档案或发展规划"
      />
    </template>
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="mb-3"
    />

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />

    <template v-else>
      <UiSectionTabs v-model="activeKey" :items="tabItems" />

      <UiAlertStrip
        v-if="isProxyMode"
        dense
        tone="warning"
        title="代办中 · 草稿须教师本人确认入库"
        description="管理员可代为生成与润色草稿，不可替本人确认写入档案。"
        class="ai-assistants__proxy"
      />

      <section class="ai-assistants__params" aria-label="生成参数">
        <div class="ai-assistants__params-head">
          <span class="ai-assistants__params-title">{{ currentAssistant.label }}</span>
          <span class="ai-assistants__params-meta">来源：已确认材料 · AI 草稿未入库</span>
          <UiButton
            size="sm"
            variant="primary"
            class="ai-assistants__params-cta"
            :loading="submitting"
            :disabled="!canOperate"
            @click="submitTask"
          >
            {{ activeDetail ? '重新生成' : '生成草稿' }}
          </UiButton>
        </div>
        <UiForm layout="vertical" class="ai-assistants__params-form">
          <UiFormItem v-if="activeKey === 'generate'" label="生成场景" required>
            <UiSelect
              v-model="submitForm.generateScene"
              size="sm"
              :options="[
                { value: 'LESSON_PLAN_FRAME', label: '教案框架' },
                { value: 'COURSE_DESCRIPTION', label: '课程描述' },
                { value: 'REFLECTION_PROMPT', label: '教学反思提示' },
              ]"
            />
          </UiFormItem>
          <UiFormItem v-if="activeKey === 'generate'" label="生成要求">
            <UiTextarea
              size="sm"
              v-model="submitForm.generateBrief"
              :rows="2"
              placeholder="补充课程、教学对象、课时或写作要求"
            />
          </UiFormItem>
          <UiFormItem
            v-if="activeKey === 'generate' || activeKey === 'optimize' || activeKey === 'effect'"
            :label="activeKey === 'generate' ? '参考正文' : '教学材料正文'"
            :required="activeKey !== 'generate'"
          >
            <UiTextarea
              size="sm"
              v-model="submitForm.sourceText"
              :rows="4"
              :placeholder="
                activeKey === 'generate'
                  ? '可选：粘贴已有内容作为生成参考'
                  : '粘贴需要处理的教学材料正文'
              "
            />
          </UiFormItem>
          <UiFormItem v-if="activeKey === 'effect'" label="评价数据摘要">
            <UiTextarea
              size="sm"
              v-model="submitForm.evaluationSummary"
              :rows="3"
              placeholder="可选：评教/督导/同行摘要；缺失时系统会标注证据不足"
            />
          </UiFormItem>
          <template v-if="activeKey === 'development'">
            <UiFormItem label="教学总结">
              <UiTextarea
                size="sm"
                v-model="submitForm.evaluationSummary"
                :rows="3"
                placeholder="可选：本学年教学总结"
              />
            </UiFormItem>
            <UiFormItem label="发展关注方向">
              <UiInput
                size="sm"
                v-model="submitForm.developmentFocusArea"
                placeholder="如课程建设、教学研究、企业实践"
              />
            </UiFormItem>
          </template>
        </UiForm>
      </section>

      <section v-if="activeDetail" class="ai-assistants__draft" aria-label="草稿面">
        <div class="ai-assistants__draft-bar">
          <div class="ai-assistants__draft-titles">
            <h3 class="ai-assistants__draft-title">
              {{ activeDetail.resultTitle || `${currentAssistant.label} · 草稿` }}
            </h3>
            <UiTag :tone="reviewStatusTone(activeDetail.reviewStatus)" size="sm">
              {{
                strictEnumLabel(
                  PortfolioAiAnalysisReviewStatusDescription,
                  activeDetail.reviewStatus,
                  '智能分析审核状态',
                )
              }}
            </UiTag>
          </div>
          <div v-if="canReviewResult" class="ai-assistants__draft-actions">
            <UiButton
              variant="outline"
              status="danger"
              size="sm"
              :loading="reviewLoading"
              @click="reviewResult(PortfolioAiAnalysisReviewStatusCode.REJECTED)"
            >
              驳回
            </UiButton>
            <UiButton
              size="sm"
              variant="primary"
              :loading="reviewLoading"
              :disabled="archiveWriteForbidden"
              @click="reviewResult(PortfolioAiAnalysisReviewStatusCode.APPROVED)"
            >
              {{
                activeDetail.analysisType === PortfolioAiAnalysisTypeCode.DEVELOPMENT_SUGGEST
                  ? '确认写入发展规划'
                  : '确认写入档案'
              }}
            </UiButton>
          </div>
          <p v-else-if="pendingReview" class="ai-assistants__draft-hint">
            该结果须由教师本人确认或驳回
          </p>
        </div>
        <p v-if="activeDetail.summary" class="ai-assistants__summary">{{ activeDetail.summary }}</p>
        <UiForm layout="vertical" class="ai-assistants__draft-form">
          <UiFormItem label="草稿正文">
            <UiTextarea
              size="sm"
              v-model="reviewForm.revisedDraftMarkdown"
              :disabled="!canReviewResult"
              :rows="14"
            />
          </UiFormItem>
          <UiFormItem v-if="canReviewResult || pendingReview" label="复核意见">
            <UiTextarea
              size="sm"
              v-model="reviewForm.reviewOpinion"
              :disabled="!canReviewResult"
              :rows="2"
              placeholder="驳回时必须填写原因；确认采用时可选"
            />
          </UiFormItem>
        </UiForm>
      </section>

      <section v-else class="ai-assistants__draft-empty" aria-label="草稿空态">
        <span>生成后草稿显示在此 · 确认写入前不会进入档案</span>
        <UiButton v-if="loadFailed" size="sm" variant="outline" @click="loadHistory">
          重新加载历史
        </UiButton>
      </section>

      <section class="ai-assistants__versions" aria-label="版本历史">
        <div class="ai-assistants__versions-head">
          <span class="ai-assistants__versions-label">历史版本</span>
          <UiButton size="sm" variant="ghost" :loading="historyLoading" @click="loadHistory">
            刷新
          </UiButton>
        </div>
        <div v-if="historyRows.length" class="ai-assistants__chips">
          <button
            v-for="row in historyRows"
            :key="row.id"
            type="button"
            class="ai-assistants__chip"
            :class="{ 'ai-assistants__chip--active': activeDetail?.id === row.id }"
            @click="openDetail(row)"
          >
            <span class="ai-assistants__chip-title">{{ row.resultTitle || '未命名结果' }}</span>
            <UiTag :tone="reviewStatusTone(row.reviewStatus)" size="sm">
              {{
                strictEnumLabel(
                  PortfolioAiAnalysisReviewStatusDescription,
                  row.reviewStatus,
                  '智能分析审核状态',
                )
              }}
            </UiTag>
            <span class="ai-assistants__chip-time">{{ row.generatedTime }}</span>
          </button>
        </div>
        <p v-else-if="!historyLoading" class="ai-assistants__versions-empty">
          {{ loadFailed ? '历史加载失败' : '暂无历史版本' }}
        </p>
        <UiButton
          size="sm"
          v-if="historyTotal > historyRows.length"
          variant="outline"
          :loading="historyLoading"
          @click="loadMoreHistory"
        >
          加载更多（{{ historyRows.length }}/{{ historyTotal }}）
        </UiButton>
      </section>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ai-assistants__proxy {
  margin-bottom: var(--dp-space-3);
}

.ai-assistants__params {
  margin: var(--dp-space-3) 0;
  padding: var(--dp-space-3) var(--dp-space-4);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-subtle);
}

.ai-assistants__params-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2);
  margin-bottom: var(--dp-space-2);
}

.ai-assistants__params-title {
  font-weight: 600;
  color: var(--dp-text-primary);
}

.ai-assistants__params-meta {
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.ai-assistants__params-cta {
  margin-left: auto;
}

.ai-assistants__params-form {
  margin: 0;
}

.ai-assistants__draft {
  margin: var(--dp-space-3) 0;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.ai-assistants__draft-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2);
  padding: var(--dp-space-3) var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border-subtle);
  background: color-mix(in srgb, var(--dp-primary) 4%, var(--dp-surface));
}

.ai-assistants__draft-titles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2);
  min-width: 0;
}

.ai-assistants__draft-title {
  margin: 0;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}

.ai-assistants__draft-actions {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  margin-left: auto;
}

.ai-assistants__draft-hint {
  margin: 0 0 0 auto;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.ai-assistants__draft-form {
  padding: 0 var(--dp-space-4) var(--dp-space-3);
}

.ai-assistants__summary {
  margin: var(--dp-space-3) var(--dp-space-4) 0;
  color: var(--dp-text-secondary);
  line-height: 1.6;
}

.ai-assistants__draft-empty {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
  min-height: 48px;
  margin: var(--dp-space-3) 0;
  padding: 0 var(--dp-space-4);
  border: 1px dashed var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
  background: var(--dp-surface-subtle);
}

.ai-assistants__versions {
  margin-top: var(--dp-space-4);
  padding-top: var(--dp-space-3);
  border-top: 1px solid var(--dp-border-subtle);
}

.ai-assistants__versions-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--dp-space-2);
}

.ai-assistants__versions-label {
  font-weight: 600;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-primary);
}

.ai-assistants__versions-empty {
  margin: 0;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.ai-assistants__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  margin-bottom: var(--dp-space-2);
}

.ai-assistants__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--dp-border-subtle);
  border-radius: 999px;
  background: var(--dp-surface);
  color: var(--dp-text-primary);
  cursor: pointer;
  text-align: left;

  &:hover {
    border-color: var(--dp-primary-light);
    background: color-mix(in srgb, var(--dp-primary) 4%, var(--dp-surface));
  }

  &--active {
    border-color: var(--dp-primary-light);
    background: color-mix(in srgb, var(--dp-primary) 8%, var(--dp-surface));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dp-primary) 16%, transparent);
  }
}

.ai-assistants__chip-title {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--dp-font-size-sm);
}

.ai-assistants__chip-time {
  color: var(--dp-text-secondary);
  font-size: 12px;
  white-space: nowrap;
}
</style>
