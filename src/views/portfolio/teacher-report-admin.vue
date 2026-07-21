<script setup lang="ts">
import type { PortfolioAiAnalysisDetailVO, PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import {
  PORTFOLIO_REPORT_SCENE_OPTIONS,
  PortfolioAiTaskTypeCode,
  PortfolioReportSceneCode,
  PortfolioReportSceneDescription,
} from '@/apis/portfolio/types'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import { PortfolioMaterialTypeCode } from '@/apis/portfolio/enums'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import { AiTaskStatusCode } from '@/apis/quality/types'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import {
  portfolioTeacherSelectOptionsFromSummaries,
  resolvePortfolioTeacherDisplayName,
} from '@/utils/portfolio-teacher-display'
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
  if (scene in PortfolioReportSceneDescription) {
    return PortfolioReportSceneDescription[scene as PortfolioReportSceneCode]
  }
  return scene
})

const pageTitle = computed(() => resolvedReportScene.value || '文本分析报告')

const pageSubtitle = computed(() => {
  if (reportDetail.value?.reportPeriodLabel) {
    return reportDetail.value.reportPeriodLabel
  }
  if (deepLinkedTaskId.value) {
    return '按年度报告任务查看智能结果'
  }
  return '按教师场景生成教学档案袋文本分析结果'
})

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
    if (task.status === 'SUCCEEDED') {
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
  const blob = new Blob([reportDetail.value.draftMarkdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${reportDetail.value.resultTitle || '教学报告'}.md`
  anchor.click()
  URL.revokeObjectURL(url)
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
        form.reportScene = reportDetail.value.reportScene as PortfolioReportSceneCode
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
    <UiCard v-if="reportDetail" title="报告预览">
      <div class="report-meta">
        <div class="report-meta__summary">
          <span>{{ reportDetail.resultTitle }}</span>
          <span
            v-if="reportDetail.reportScene || reportDetail.reportPeriodLabel"
            class="report-meta__extra"
          >
            {{ resolvedReportScene
            }}<template v-if="reportDetail.reportPeriodLabel">
              · {{ reportDetail.reportPeriodLabel }}</template
            >
          </span>
          <span
            v-if="
              reportDetail.teacherName || reportDetail.teacherNumber || reportDetail.departmentName
            "
            class="report-meta__extra"
          >
            {{ reportDetail.teacherName || `教师编号 ${reportDetail.teacherId}` }}
            <template v-if="reportDetail.teacherNumber">
              · {{ reportDetail.teacherNumber }}</template
            >
            <template v-if="reportDetail.departmentName">
              · {{ reportDetail.departmentName }}</template
            >
          </span>
          <div
            v-if="reportDetail.lifecycleStatus || reportDetail.ownerIdentityLayers?.length"
            class="report-meta__identity"
          >
            <UiTag
              v-if="reportDetail.lifecycleStatus"
              size="sm"
              :tone="
                reportDetail.lifecycleStatus === 'ACTIVE'
                  ? 'green'
                  : reportDetail.lifecycleStatus === 'TEMP_HOLD'
                    ? 'orange'
                    : reportDetail.lifecycleStatus === 'SEALED' ||
                        reportDetail.lifecycleStatus === 'TRANSFERRED'
                      ? 'red'
                      : 'gray'
              "
            >
              {{ reportDetail.lifecycleStatusLabel || reportDetail.lifecycleStatus }}
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
        <UiButton size="sm" @click="downloadMarkdown"> 下载文稿 </UiButton>
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
.report-meta__summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.report-meta__extra {
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.report-meta__identity {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
}
.markdown {
  margin: 0;
  padding: 12px;
  max-height: 480px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--dp-fill-quaternary);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
}
</style>
