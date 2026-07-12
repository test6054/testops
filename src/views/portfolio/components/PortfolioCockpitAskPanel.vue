<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioAiAnalysisDetailVO,
  PortfolioAiAnalysisSummaryVO,
  PortfolioCockpitAskResultPayload,
  PortfolioCockpitAskTeacherRow,
} from '@/apis/portfolio/types'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import { portfolioCockpitApi } from '@/apis/portfolio/cockpit'
import { PortfolioAiAnalysisTypeCode } from '@/apis/portfolio/enums'
import { AiTaskStatusCode } from '@/apis/quality/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import { parsePortfolioCockpitAskPayload } from '@/utils/portfolio-cockpit-payload'

const props = defineProps<{
  departmentId?: string
  schoolScopeOnly?: boolean
  /** 通知深链携带的 AI 任务 ID，用于自动加载问数结果 */
  initialTaskId?: string
}>()

const router = useRouter()

const userQuestion = ref('')
const loading = ref(false)
const polling = ref(false)
const historyLoading = ref(false)
const analysisDetail = ref<PortfolioAiAnalysisDetailVO | null>(null)
const askPayload = ref<PortfolioCockpitAskResultPayload | null>(null)
const historyRows = ref<PortfolioAiAnalysisSummaryVO[]>([])
const historyRequestToken = ref(0)
const resultRequestToken = ref(0)

const teacherColumns: ColumnsType = [
  { title: '姓名', dataIndex: 'nickName', key: 'nickName', width: 100, fixed: 'left' },
  { title: '工号', dataIndex: 'teacherNumber', key: 'teacherNumber', width: 100 },
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName', width: 120 },
  { title: '指标', dataIndex: 'metricCode', key: 'metricCode', width: 88 },
  { title: '指标值', dataIndex: 'metricValue', key: 'metricValue', width: 120 },
]

const historyColumns: ColumnsType = [
  {
    title: '问数问题',
    dataIndex: 'reportScene',
    key: 'reportScene',
    ellipsis: true,
    fixed: 'left',
  },
  { title: '生成时间', dataIndex: 'generatedTime', key: 'generatedTime', width: 168 },
  { title: '操作', key: 'actions', width: 72 },
]

const teacherRows = computed<PortfolioCockpitAskTeacherRow[]>(
  () => askPayload.value?.teacherRows ?? [],
)

function teacherRowKey(record: unknown): string {
  const row = record as PortfolioCockpitAskTeacherRow
  return row.teacherUserId ?? row.teacherNumber ?? row.nickName ?? ''
}

function historyRowKey(record: unknown): string {
  const row = record as PortfolioAiAnalysisSummaryVO
  return row.aiTaskId ?? row.id
}

const refusalReason = computed(() => askPayload.value?.queryPlan?.refusalReason ?? '')

const issueItems = computed(() => analysisDetail.value?.issueItems ?? [])

const indicatorRefs = computed(() => askPayload.value?.indicatorRefs ?? [])

const drillLinks = computed(() => askPayload.value?.drillLinks ?? [])

function navigateDrillLink(link: string) {
  void router.push(link)
}

function resetAskResultContext() {
  resultRequestToken.value += 1
  analysisDetail.value = null
  askPayload.value = null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function applyAnalysisDetail(detail: PortfolioAiAnalysisDetailVO) {
  if (detail.analysisType !== PortfolioAiAnalysisTypeCode.COCKPIT_ASK) {
    showUserError(null, '该 AI 任务不属于驾驶舱智能问数')
    return
  }
  analysisDetail.value = detail
  askPayload.value = parsePortfolioCockpitAskPayload(detail.draftMarkdown)
}

async function loadHistory() {
  const currentToken = ++historyRequestToken.value
  historyLoading.value = true
  historyRows.value = []
  try {
    const page = await portfolioAiJobApi.pageAnalysis({
      pageNum: 1,
      pageSize: 10,
      analysisType: PortfolioAiAnalysisTypeCode.COCKPIT_ASK,
      departmentId: props.departmentId,
      schoolScopeOnly: props.schoolScopeOnly,
    })
    if (currentToken !== historyRequestToken.value) {
      return
    }
    historyRows.value = page.list
  } catch (error) {
    if (currentToken !== historyRequestToken.value) {
      return
    }
    historyRows.value = []
    showUserError(error, '加载驾驶舱问数历史失败')
  } finally {
    if (currentToken === historyRequestToken.value) {
      historyLoading.value = false
    }
  }
}

async function openHistoryRow(row: PortfolioAiAnalysisSummaryVO) {
  if (!row.aiTaskId) {
    return
  }
  const currentToken = ++resultRequestToken.value
  loading.value = true
  try {
    const detail = await portfolioAiJobApi.getAnalysisByTask(row.aiTaskId)
    if (currentToken !== resultRequestToken.value) {
      return
    }
    applyAnalysisDetail(detail)
  } catch (error) {
    if (currentToken !== resultRequestToken.value) {
      return
    }
    showUserError(error, '加载问数结果失败')
  } finally {
    if (currentToken === resultRequestToken.value) {
      loading.value = false
    }
  }
}

async function pollAnalysis(taskId: string, requestToken = resultRequestToken.value) {
  polling.value = true
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (requestToken !== resultRequestToken.value) {
        return
      }
      const task = await portfolioAiJobApi.get(taskId)
      if (requestToken !== resultRequestToken.value) {
        return
      }
      if (task.status === 'SUCCEEDED') {
        const detail = await portfolioAiJobApi.getAnalysisByTask(taskId)
        if (requestToken !== resultRequestToken.value) {
          return
        }
        applyAnalysisDetail(detail)
        await loadHistory()
        return
      }
      if (task.status === AiTaskStatusCode.FAILED || task.status === AiTaskStatusCode.CANCELLED) {
        if (requestToken !== resultRequestToken.value) {
          return
        }
        showUserError(null, 'AI 问数任务失败，请在问数历史查看原因后重新提交')
        return
      }
      await sleep(2000)
    }
    showUserError(null, 'AI 任务超时，请在问数历史中查看结果')
  } finally {
    if (requestToken === resultRequestToken.value) {
      polling.value = false
    }
  }
}

async function submitAsk() {
  const question = userQuestion.value.trim()
  if (!question) {
    message.warning('请输入指标问数问题')
    return
  }
  const currentToken = ++resultRequestToken.value
  loading.value = true
  analysisDetail.value = null
  askPayload.value = null
  try {
    const submitResult = await portfolioCockpitApi.ask({
      departmentId: props.departmentId,
      userQuestion: question,
    })
    if (currentToken !== resultRequestToken.value) {
      return
    }
    message.info('问数任务已提交，正在等待结果…')
    await pollAnalysis(submitResult.taskId, currentToken)
    if (currentToken !== resultRequestToken.value) {
      return
    }
    message.success('问数完成')
  } catch (error) {
    if (currentToken !== resultRequestToken.value) {
      return
    }
    showUserError(error, '提交驾驶舱问数失败')
  } finally {
    if (currentToken === resultRequestToken.value) {
      loading.value = false
    }
  }
}

onMounted(() => {
  void loadHistory()
  if (props.initialTaskId) {
    void openTaskResult(props.initialTaskId)
  }
})

watch(
  () => props.departmentId,
  () => {
    resetAskResultContext()
    void loadHistory()
    if (props.initialTaskId) {
      void openTaskResult(props.initialTaskId)
    }
  },
)

watch(
  () => props.initialTaskId,
  (taskId) => {
    if (taskId) {
      void openTaskResult(taskId)
      return
    }
    resetAskResultContext()
  },
)

/** 按通知深链 taskId 加载问数结果；任务未完成时轮询直至成功或失败。 */
async function openTaskResult(taskId: string) {
  const currentToken = ++resultRequestToken.value
  loading.value = true
  analysisDetail.value = null
  askPayload.value = null
  try {
    const task = await portfolioAiJobApi.get(taskId)
    if (currentToken !== resultRequestToken.value) {
      return
    }
    if (task.status === 'SUCCEEDED') {
      const detail = await portfolioAiJobApi.getAnalysisByTask(taskId)
      if (currentToken !== resultRequestToken.value) {
        return
      }
      applyAnalysisDetail(detail)
      return
    }
    if (task.status === AiTaskStatusCode.FAILED || task.status === AiTaskStatusCode.CANCELLED) {
      if (currentToken !== resultRequestToken.value) {
        return
      }
      showUserError(null, 'AI 问数任务失败，请在问数历史查看原因后重新提交')
      return
    }
    await pollAnalysis(taskId, currentToken)
  } catch (error) {
    if (currentToken !== resultRequestToken.value) {
      return
    }
    analysisDetail.value = null
    askPayload.value = null
    showUserError(error, '加载问数结果失败')
  } finally {
    if (currentToken === resultRequestToken.value) {
      loading.value = false
    }
  }
}
</script>

<template>
  <UiCard title="指标智能问数">
    <a-textarea
      v-model:value="userQuestion"
      class="cockpit-ask__field"
      :rows="3"
      placeholder="例如：近三年企业实践不足 30 天的教师有哪些？"
    />
    <UiButton variant="primary" :loading="loading || polling" @click="() => void submitAsk()">
      提交问数
    </UiButton>
  </UiCard>

  <UiCard title="问数历史">
    <UiDataTable
      :row-key="historyRowKey"
      pagination-mode="none"
      :columns="historyColumns"
      :data-source="historyRows"
      :loading="historyLoading"
      :show-pagination="false"
      size="small"
      :sticky-header="false"
      flat
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'actions'">
          <UiTableActions
            :items="[{ key: 'view', label: '查看' }]"
            split
            @action="() => void openHistoryRow(record)"
          />
        </template>
      </template>
    </UiDataTable>
  </UiCard>

  <UiCard v-if="analysisDetail" title="问数结果">
    <p class="cockpit-ask__title">{{ analysisDetail.resultTitle }}</p>
    <p v-if="analysisDetail.reportScene" class="cockpit-ask__meta">
      问题：{{ analysisDetail.reportScene }}
    </p>
    <pre class="cockpit-ask__summary">{{ analysisDetail.summary }}</pre>
    <section v-if="issueItems.length" class="cockpit-ask__section">
      <h4 class="cockpit-ask__section-title">提示</h4>
      <ul class="cockpit-ask__list">
        <li v-for="(item, index) in issueItems" :key="`issue-${index}`">
          {{ item.issueTitle }}：{{ item.issueDescription }}
        </li>
      </ul>
    </section>
    <section v-if="indicatorRefs.length" class="cockpit-ask__section">
      <h4 class="cockpit-ask__section-title">指标口径</h4>
      <ul class="cockpit-ask__list">
        <li v-for="(indicatorRef, index) in indicatorRefs" :key="`ref-${index}`">
          {{ indicatorRef }}
        </li>
      </ul>
    </section>
    <section v-if="drillLinks.length" class="cockpit-ask__section">
      <h4 class="cockpit-ask__section-title">下钻入口</h4>
      <ul class="cockpit-ask__list">
        <li v-for="(link, index) in drillLinks" :key="`link-${index}`">
          <a class="cockpit-ask__link" @click="navigateDrillLink(link)">{{ link }}</a>
        </li>
      </ul>
    </section>
    <a-result v-if="refusalReason" status="warning" title="问数未执行" :sub-title="refusalReason" />
    <UiDataTable
      v-else
      :row-key="teacherRowKey"
      pagination-mode="none"
      :columns="teacherColumns"
      :data-source="teacherRows"
      :show-pagination="false"
      size="small"
      :sticky-header="false"
      flat
    />
  </UiCard>
</template>

<style scoped>
.cockpit-ask__field {
  display: block;
  width: 100%;
  max-width: 640px;
  margin-bottom: 12px;
}
.cockpit-ask__title {
  margin: 0 0 8px;
  font-weight: 600;
}
.cockpit-ask__meta {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.cockpit-ask__summary {
  margin: 0 0 12px;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--ant-color-fill-quaternary);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
}
.cockpit-ask__section {
  margin-bottom: 12px;
}
.cockpit-ask__section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.cockpit-ask__list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.6;
}
.cockpit-ask__link {
  color: var(--ant-color-primary);
  cursor: pointer;
}
</style>
