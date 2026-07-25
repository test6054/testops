<script setup lang="ts">
import type { PortfolioAiAnalysisDetailVO, PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import type {
  PortfolioAiAnalysisReviewStatusCode} from '@/types/enums/portfolio-ai-analysis-review-status-enum';
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import { PortfolioMaterialTypeCode } from '@/apis/portfolio/enums'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  PORTFOLIO_REPORT_SCENE_OPTIONS,
  PortfolioAiTaskTypeCode,
  PortfolioReportSceneCode,
  PortfolioReportSceneDescription,
} from '@/apis/portfolio/types'
import { AiTaskStatusCode } from '@/apis/quality/types'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  PortfolioAiAnalysisReviewStatusDescription,
} from '@/types/enums/portfolio-ai-analysis-review-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import {
  formatPortfolioTeacherDisplay,
  portfolioTeacherSelectOptionsFromSummaries,
  resolvePortfolioTeacherDisplayName,
} from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const route = useRoute()
const loading = ref(false)
const polling = ref(false)
const teachers = ref<PortfolioTeacherSummaryVO[]>([])
const reportDetail = ref<PortfolioAiAnalysisDetailVO | null>(null)
const reportRequestToken = ref(0)
const deepLinkedTaskId = computed(() => readRouteStringParam(route.query.taskId))
const deepLinkedTeacherId = computed(() => readRouteStringParam(route.query.teacherId))
const deepLinkedResultView = computed(() => Boolean(deepLinkedTaskId.value))
let teacherSearchTimer: ReturnType<typeof setTimeout> | null = null
const form = reactive({
  teacherId: '',
  reportScene: PortfolioReportSceneCode.ANNUAL_DEVELOPMENT,
  reportPeriodLabel: `${new Date().getFullYear()} 年度`,
})

const teacherSelectOptions = computed(() =>
  portfolioTeacherSelectOptionsFromSummaries(teachers.value),
)

const resolvedReportScene = computed(() => {
  const scene = reportDetail.value?.reportScene || form.reportScene
  if (!scene) {
    return ''
  }
  return PortfolioReportSceneDescription[scene]
})

const pageTitle = computed(() => resolvedReportScene.value || '文本分析报告')

const pageSubtitle = computed(() => {
  if (reportDetail.value?.reportPeriodLabel) {
    return reportDetail.value.reportPeriodLabel
  }
  if (deepLinkedTaskId.value) {
    return '按年度报告任务查看智能草稿'
  }
  return '按教师场景生成教学档案袋文本分析草稿（非正式结论）'
})

function reviewStatusLabel(status?: PortfolioAiAnalysisReviewStatusCode): string {
  if (!status) {
    return '—'
  }
  return strictEnumLabel(
    PortfolioAiAnalysisReviewStatusDescription,
    status,
    'AI 分析审核状态',
  )
}

function sanitizeDraftFileName(title: string | undefined): string {
  const raw = (title || '教学报告AI草稿').trim() || '教学报告AI草稿'
  const illegalNameChars = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])
  let cleaned = ''
  for (const ch of raw) {
    const code = ch.charCodeAt(0)
    if (code < 32 || illegalNameChars.has(ch) || /\s/.test(ch)) {
      cleaned += '_'
    } else {
      cleaned += ch
    }
  }
  cleaned = cleaned.replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 80)
  if (!cleaned) {
    cleaned = '教学报告AI草稿'
  }
  return cleaned.endsWith('.md') ? cleaned : `${cleaned}.md`
}

function buildDraftDownloadContent(detail: PortfolioAiAnalysisDetailVO): string {
  const lines = [
    '<!-- AI 生成草稿 · 非正式结论 · 须人工审核后方可用于正式报告/报送 -->',
    `<!-- resultTitle: ${detail.resultTitle || ''} -->`,
    `<!-- reviewStatus: ${detail.reviewStatus || ''} -->`,
    `<!-- generatedTime: ${detail.generatedTime || detail.createTime || ''} -->`,
    `<!-- modelName: ${detail.modelName || ''} -->`,
    '',
    detail.draftMarkdown || '',
  ]
  return lines.join('\n')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resetGenerateForm(preserveTeacherId = false) {
  if (!preserveTeacherId) {
    form.teacherId = ''
  }
  form.reportScene = PortfolioReportSceneCode.ANNUAL_DEVELOPMENT
  form.reportPeriodLabel = `${new Date().getFullYear()} 年度`
}

/** 路由任务/教师范围变化时清理旧报告上下文，避免旧轮询与旧教师补水覆盖当前页。 */
function resetReportContext(preserveTeacherId = false) {
  reportDetail.value = null
  polling.value = false
  resetGenerateForm(preserveTeacherId)
}

function mergeTeacherOptions(rows: PortfolioTeacherSummaryVO[]) {
  const optionMap = new Map(teachers.value.map((item) => [item.userId, item]))
  for (const row of rows) {
    optionMap.set(row.userId, row)
  }
  teachers.value = Array.from(optionMap.values())
}

/** 深链教师必须进入选择器选项，避免“重新生成其他报告”默认落到错误教师。 */
async function ensureTeacherOptionLoaded(teacherId: string) {
  if (!teacherId) {
    return
  }
  if (teachers.value.some((item) => item.userId === teacherId)) {
    form.teacherId = teacherId
    return
  }
  const currentToken = reportRequestToken.value
  try {
    const detail = await portfolioTeacherApi.get(teacherId)
    if (currentToken !== reportRequestToken.value) {
      return
    }
    mergeTeacherOptions([
      {
        userId: detail.userId,
        userName: detail.userName,
        nickName: detail.nickName,
        teacherNumber: detail.teacherNumber,
        departmentId: detail.departmentId,
        departmentName: detail.departmentName,
        title: detail.title,
        status: detail.status,
      },
    ])
    form.teacherId = teacherId
  } catch (error) {
    showUserError(error, '加载报告所属教师失败')
  }
}

async function loadTeachers(keyword?: string) {
  const currentToken = reportRequestToken.value
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      searchText: keyword || undefined,
    })
    if (currentToken !== reportRequestToken.value) {
      return
    }
    mergeTeacherOptions(page.list)
  } catch (error) {
    showUserError(error, '加载教师名册失败')
  }
}

function handleTeacherSearch(value: string) {
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
  }
  teacherSearchTimer = setTimeout(() => {
    void loadTeachers(value.trim())
  }, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

function selectedTeacherName(): string | null {
  const teacher = teachers.value.find((item) => item.userId === form.teacherId)
  if (!teacher) {
    showUserError(null, '所选教师不存在')
    return null
  }
  const displayName = resolvePortfolioTeacherDisplayName(teacher)
  if (!displayName) {
    showUserError(null, '所选教师缺少可展示姓名')
    return null
  }
  return displayName
}

async function pollAnalysis(taskId: string): Promise<PortfolioAiAnalysisDetailVO | null> {
  const currentToken = reportRequestToken.value
  for (let attempt = 0; attempt < 60; attempt++) {
    if (currentToken !== reportRequestToken.value) {
      return null
    }
    const task = await portfolioAiJobApi.get(taskId)
    if (currentToken !== reportRequestToken.value) {
      return null
    }
    if (task.status === AiTaskStatusCode.COMPLETED) {
      const detail = await portfolioAiJobApi.getAnnualReportAnalysisByTask(taskId)
      if (currentToken !== reportRequestToken.value) {
        return null
      }
      return detail
    }
    if (task.status === AiTaskStatusCode.FAILED || task.status === AiTaskStatusCode.CANCELLED) {
      if (currentToken !== reportRequestToken.value) {
        return null
      }
      showUserError(null, '报告生成失败，请查看任务状态后重新发起')
      return null
    }
    await sleep(2000)
  }
  showUserError(null, '报告生成超时，请在任务列表查看结果')
  return null
}

async function submitReport() {
  if (loading.value) {
    return
  }
  if (!form.teacherId) {
    showFormValidationMessage('请选择教师')
    return
  }
  if (!form.reportPeriodLabel.trim()) {
    showFormValidationMessage('请填写报告周期')
    return
  }
  loading.value = true
  polling.value = true
  reportDetail.value = null
  const currentToken = ++reportRequestToken.value
  try {
    const teacherName = selectedTeacherName()
    if (!teacherName) {
      return
    }
    const submitResult = await portfolioAiJobApi.submit({
      taskType: PortfolioAiTaskTypeCode.PORTFOLIO_REPORT_GENERATE,
      teacherId: form.teacherId,
      materialType: PortfolioMaterialTypeCode.REPORT,
      context: {
        reportScene: form.reportScene,
        reportPeriodLabel: form.reportPeriodLabel.trim(),
        teacherName,
      },
    })
    if (currentToken !== reportRequestToken.value) {
      return
    }
    void message.info('报告生成任务已提交，正在等待结果…')
    reportDetail.value = await pollAnalysis(submitResult.taskId)
    if (currentToken !== reportRequestToken.value) {
      return
    }
    if (!reportDetail.value) {
      return
    }
    void message.success('报告生成完成')
  } catch (error) {
    showUserError(error, '提交报告生成失败')
  } finally {
    if (currentToken === reportRequestToken.value) {
      loading.value = false
      polling.value = false
    }
  }
}

function downloadMarkdown() {
  if (!reportDetail.value?.draftMarkdown) {
    showFormValidationMessage('暂无可下载内容')
    return
  }
  const blob = new Blob([buildDraftDownloadContent(reportDetail.value)], {
    type: 'text/markdown;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = sanitizeDraftFileName(reportDetail.value.resultTitle)
  anchor.click()
  URL.revokeObjectURL(url)
  void message.info('已下载 AI 草稿文稿（非正式结论）')
}

async function bootstrapPage() {
  const currentToken = ++reportRequestToken.value
  const taskId = deepLinkedTaskId.value
  if (taskId) {
    resetReportContext(Boolean(deepLinkedTeacherId.value))
    polling.value = true
    try {
      reportDetail.value = await pollAnalysis(taskId)
      if (currentToken !== reportRequestToken.value) {
        return
      }
      const teacherId = reportDetail.value?.teacherId || deepLinkedTeacherId.value
      if (teacherId) {
        await ensureTeacherOptionLoaded(teacherId)
        if (currentToken !== reportRequestToken.value) {
          return
        }
      }
      if (reportDetail.value?.reportScene) {
        form.reportScene = reportDetail.value.reportScene
      }
      if (reportDetail.value?.reportPeriodLabel) {
        form.reportPeriodLabel = reportDetail.value.reportPeriodLabel
      }
    } catch (error) {
      if (currentToken !== reportRequestToken.value) {
        return
      }
      showUserError(error, '加载报告详情失败')
    } finally {
      if (currentToken === reportRequestToken.value) {
        polling.value = false
      }
    }
    return
  }
  resetReportContext(Boolean(deepLinkedTeacherId.value))
  await loadTeachers()
  if (currentToken !== reportRequestToken.value) {
    return
  }
  if (deepLinkedTeacherId.value) {
    await ensureTeacherOptionLoaded(deepLinkedTeacherId.value)
  }
}

onMounted(() => {
  void bootstrapPage()
})

onUnmounted(() => {
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
    teacherSearchTimer = null
  }
})

watch(
  () => [route.query.taskId, route.query.teacherId],
  ([taskId, teacherId], [previousTaskId, previousTeacherId]) => {
    if (taskId === previousTaskId && teacherId === previousTeacherId) {
      return
    }
    void bootstrapPage()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" :title="pageTitle" :subtitle="pageSubtitle" />
    </template>
    <UiCard :title="deepLinkedResultView ? '重新生成其他报告' : '生成参数'">
      <div class="toolbar">
        <UiSelect
          size="sm"
          v-model="form.teacherId"
          :options="teacherSelectOptions"
          placeholder="选择教师"
          style="width: 180px"
          allow-search
          :filter-option="false"
          option-label-prop="label"
          @focus="
            () => {
              void loadTeachers()
            }
          "
          @search="handleTeacherSearch"
        />
        <UiSelect
          size="sm"
          v-model="form.reportScene"
          :options="PORTFOLIO_REPORT_SCENE_OPTIONS"
          style="width: 160px"
        />
        <UiInput
          size="sm"
          v-model="form.reportPeriodLabel"
          placeholder="报告周期"
          style="width: 160px"
        />
        <UiButton size="sm" variant="primary" :loading="loading" @click="submitReport">
          提交智能生成
        </UiButton>
      </div>
      <p v-if="polling" class="hint">任务执行中，请稍候…</p>
    </UiCard>
    <UiCard v-if="reportDetail" title="AI 草稿预览">
      <UiAlertStrip
        tone="warning"
        class="report-draft-notice"
        description="当前为 AI 生成草稿，非正式结论；须人工审核通过后方可用于正式报告或报送。本地下载仅保留草稿副本。"
      />
      <div class="report-meta">
        <div class="report-meta__summary">
          <span>{{ reportDetail.resultTitle }}</span>
          <span class="report-meta__extra">
            审核状态：{{ reviewStatusLabel(reportDetail.reviewStatus) }}
            <template v-if="reportDetail.generatedTime || reportDetail.createTime">
              · 生成时间 {{ reportDetail.generatedTime || reportDetail.createTime }}
            </template>
            <template v-if="reportDetail.modelName">
              · 模型 {{ reportDetail.modelName }}
            </template>
          </span>
          <span
            v-if="reportDetail.reportScene || reportDetail.reportPeriodLabel"
            class="report-meta__extra"
          >
            {{ resolvedReportScene
            }}<template v-if="reportDetail.reportPeriodLabel">
              · {{ reportDetail.reportPeriodLabel }}</template>
          </span>
          <span v-if="reportDetail.teacherId" class="report-meta__extra">
            {{
              formatPortfolioTeacherDisplay(reportDetail.teacherName, reportDetail.teacherNumber)
            }}
            <template v-if="reportDetail.departmentName">
              · {{ reportDetail.departmentName }}</template>
          </span>
          <div
            v-if="reportDetail.lifecycleStatus || reportDetail.ownerIdentityLayers?.length"
            class="report-meta__identity"
          >
            <UiTag
              v-if="reportDetail.lifecycleStatus"
              size="sm"
              :tone="
                portfolioLifecycleTagTone(reportDetail.lifecycleStatus)
              "
            >
              {{ portfolioLifecycleStatusDisplay(reportDetail.lifecycleStatus) }}
            </UiTag>
            <UiTag v-if="reportDetail.evaluationHeld" size="sm" tone="orange">参评 hold</UiTag>
            <PortfolioOwnerIdentityLayersCell
              v-if="reportDetail.ownerIdentityLayers?.length"
              :layers="reportDetail.ownerIdentityLayers"
              :note="reportDetail.ownerMultiIdentityNote"
              :row-key="reportDetail.id || reportDetail.teacherId"
              show-note
            />
          </div>
        </div>
        <UiButton size="sm" @click="downloadMarkdown">下载 AI 草稿</UiButton>
      </div>
      <pre class="markdown">{{ reportDetail.draftMarkdown }}</pre>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: var(--dp-space-component-tight);
  align-items: center;
  flex-wrap: wrap;
}
.hint {
  margin: var(--dp-space-component) 0 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.report-draft-notice {
  margin-bottom: var(--dp-space-component);
}
.report-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component);
}
.report-meta__summary {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
}
.report-meta__extra {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.report-meta__identity {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component-tight);
}
.markdown {
  margin: 0;
  padding: var(--dp-space-component);
  max-height: 480px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--dp-fill-quaternary);
  border-radius: var(--dp-radius-xs);
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
}
</style>
