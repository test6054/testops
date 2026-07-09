<script setup lang="ts">
import type { PortfolioAiAnalysisDetailVO, PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import { PortfolioMaterialTypeCode } from '@/apis/portfolio/enums'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  PORTFOLIO_REPORT_SCENE_OPTIONS,
  PortfolioAiTaskTypeCode,
  PortfolioReportSceneCode,
} from '@/apis/portfolio/types'
import { AiTaskStatusCode } from '@/apis/quality/types'
import { QUALITY_SELECTOR_PAGE_SIZE } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import {
  portfolioTeacherSelectOptionsFromSummaries,
  resolvePortfolioTeacherDisplayName,
} from '@/utils/portfolio-teacher-display'

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const route = useRoute()
const loading = ref(false)
const polling = ref(false)
const teachers = ref<PortfolioTeacherSummaryVO[]>([])
const reportDetail = ref<PortfolioAiAnalysisDetailVO | null>(null)
const form = reactive({
  teacherId: '',
  reportScene: PortfolioReportSceneCode.ANNUAL_SUMMARY,
  reportPeriodLabel: `${new Date().getFullYear()} 年度`,
})

const teacherSelectOptions = computed(() =>
  portfolioTeacherSelectOptionsFromSummaries(teachers.value),
)

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadTeachers() {
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
    })
    teachers.value = page.list
    if (!form.teacherId) {
      const firstOption = portfolioTeacherSelectOptionsFromSummaries(teachers.value)[0]
      if (firstOption) {
        form.teacherId = firstOption.value
      }
    }
  } catch (error) {
    showUserError(error)
  }
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
  for (let attempt = 0; attempt < 60; attempt++) {
    const task = await portfolioAiJobApi.get(taskId)
    if (task.status === 'SUCCEEDED') {
      return portfolioAiJobApi.getAnalysisByTask(taskId)
    }
    if (task.status === AiTaskStatusCode.FAILED || task.status === AiTaskStatusCode.CANCELLED) {
      showUserError(null, '报告生成失败，请稍后重试')
      return null
    }
    await sleep(2000)
  }
  showUserError(null, '报告生成超时，请稍后重试')
  return null
}

async function submitReport() {
  if (!form.teacherId) {
    message.warning('请选择教师')
    return
  }
  if (!form.reportPeriodLabel.trim()) {
    message.warning('请填写报告周期')
    return
  }
  loading.value = true
  polling.value = true
  reportDetail.value = null
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
    message.info('报告生成任务已提交，正在等待结果…')
    reportDetail.value = await pollAnalysis(submitResult.taskId)
    if (!reportDetail.value) {
      return
    }
    message.success('报告生成完成')
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
    polling.value = false
  }
}

function downloadMarkdown() {
  if (!reportDetail.value?.draftMarkdown) {
    message.warning('暂无可下载内容')
    return
  }
  const blob = new Blob([reportDetail.value.draftMarkdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${reportDetail.value.resultTitle || 'teacher-report'}.md`
  anchor.click()
  URL.revokeObjectURL(url)
}

async function bootstrapPage() {
  await loadTeachers()
  const taskId = readRouteStringParam(route.query.taskId)
  if (!taskId) {
    return
  }
  polling.value = true
  try {
    reportDetail.value = await pollAnalysis(taskId)
  } catch (error) {
    showUserError(error)
  } finally {
    polling.value = false
  }
}

onMounted(() => {
  void bootstrapPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="文本分析报告" />
    </template>
    <UiCard title="生成参数">
      <div class="toolbar">
        <a-select
          v-model:value="form.teacherId"
          :options="teacherSelectOptions"
          placeholder="选择教师"
          style="width: 180px"
          show-search
          option-filter-prop="label"
        />
        <a-select
          v-model:value="form.reportScene"
          :options="PORTFOLIO_REPORT_SCENE_OPTIONS"
          style="width: 160px"
        />
        <a-input
          v-model:value="form.reportPeriodLabel"
          placeholder="报告周期"
          style="width: 160px"
        />
        <UiButton variant="primary" :loading="loading" @click="submitReport">
          提交 AI 生成
        </UiButton>
      </div>
      <p v-if="polling" class="hint">任务执行中，请稍候…</p>
    </UiCard>
    <UiCard v-if="reportDetail" title="报告预览">
      <div class="report-meta">
        <span>{{ reportDetail.resultTitle }}</span>
        <UiButton size="sm" @click="downloadMarkdown"> 下载 Markdown </UiButton>
      </div>
      <pre class="markdown">{{ reportDetail.draftMarkdown }}</pre>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.report-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.markdown {
  margin: 0;
  padding: 12px;
  max-height: 480px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--ant-color-fill-quaternary);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
}
</style>
