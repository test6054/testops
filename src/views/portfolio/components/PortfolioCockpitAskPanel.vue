<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioAiAnalysisDetailVO,
  PortfolioAiAnalysisSummaryVO,
  PortfolioCockpitAskResultPayload,
  PortfolioCockpitAskTeacherRow,
} from '@/apis/portfolio/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import { portfolioCockpitApi } from '@/apis/portfolio/cockpit'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { assertPortfolioAiAnalysisType } from '@/utils/portfolio-ai-analysis-contract'
import { parsePortfolioCockpitAskPayload } from '@/utils/portfolio-cockpit-payload'

const props = defineProps<{
  departmentId?: string
}>()

const router = useRouter()

const userQuestion = ref('')
const loading = ref(false)
const polling = ref(false)
const historyLoading = ref(false)
const analysisDetail = ref<PortfolioAiAnalysisDetailVO | null>(null)
const askPayload = ref<PortfolioCockpitAskResultPayload | null>(null)
const historyRows = ref<PortfolioAiAnalysisSummaryVO[]>([])

const teacherColumns: ColumnsType = [
  { title: '姓名', dataIndex: 'nickName', key: 'nickName', width: 100 },
  { title: '工号', dataIndex: 'teacherNumber', key: 'teacherNumber', width: 100 },
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName', width: 120 },
  { title: '指标', dataIndex: 'metricCode', key: 'metricCode', width: 88 },
  { title: '指标值', dataIndex: 'metricValue', key: 'metricValue', width: 120 },
]

const historyColumns: ColumnsType = [
  { title: '问数问题', dataIndex: 'reportScene', key: 'reportScene', ellipsis: true },
  { title: '生成时间', dataIndex: 'generatedTime', key: 'generatedTime', width: 168 },
  { title: '操作', key: 'action', width: 72 },
]

const teacherRows = computed<PortfolioCockpitAskTeacherRow[]>(() => askPayload.value?.teacherRows ?? [])

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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function applyAnalysisDetail(detail: PortfolioAiAnalysisDetailVO) {
  assertPortfolioAiAnalysisType(detail, 'COCKPIT_ASK')
  analysisDetail.value = detail
  askPayload.value = parsePortfolioCockpitAskPayload(detail.draftMarkdown)
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const page = await portfolioAiJobApi.pageAnalysis({
      pageNum: 1,
      pageSize: 10,
      analysisType: 'COCKPIT_ASK',
      departmentId: props.departmentId,
    })
    historyRows.value = readPageList(page, '加载驾驶舱问数历史失败')
  }
  catch (error) {
    showUserError(error, '加载驾驶舱问数历史失败')
  }
  finally {
    historyLoading.value = false
  }
}

async function openHistoryRow(row: PortfolioAiAnalysisSummaryVO) {
  if (!row.aiTaskId) {
    return
  }
  loading.value = true
  try {
    const detail = await portfolioAiJobApi.getAnalysisByTask(row.aiTaskId)
    applyAnalysisDetail(detail)
  }
  catch (error) {
    showUserError(error, '加载问数结果失败')
  }
  finally {
    loading.value = false
  }
}

async function pollAnalysis(taskId: string) {
  polling.value = true
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      const task = await portfolioAiJobApi.get(taskId)
      if (task.status === 'SUCCEEDED') {
        const detail = await portfolioAiJobApi.getAnalysisByTask(taskId)
        applyAnalysisDetail(detail)
        await loadHistory()
        return
      }
      if (task.status === 'FAILED' || task.status === 'CANCELLED') {
        throw new Error(`AI 任务失败：${task.status}`)
      }
      await sleep(2000)
    }
    throw new Error('AI 任务超时，请稍后在问数历史中查看')
  }
  finally {
    polling.value = false
  }
}

async function submitAsk() {
  const question = userQuestion.value.trim()
  if (!question) {
    message.warning('请输入指标问数问题')
    return
  }
  loading.value = true
  analysisDetail.value = null
  askPayload.value = null
  try {
    const submitResult = await portfolioCockpitApi.ask({
      departmentId: props.departmentId,
      userQuestion: question,
    })
    message.info('问数任务已提交，正在等待结果…')
    await pollAnalysis(submitResult.taskId)
    message.success('问数完成')
  }
  catch (error) {
    showUserError(error, '提交驾驶舱问数失败')
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadHistory()
})

watch(() => props.departmentId, () => {
  void loadHistory()
})
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
      :columns="historyColumns"
      :data-source="historyRows"
      :loading="historyLoading"
      :pagination="false"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <a class="cockpit-ask__link" @click="() => void openHistoryRow(record as PortfolioAiAnalysisSummaryVO)">查看</a>
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
        <li v-for="(indicatorRef, index) in indicatorRefs" :key="`ref-${index}`">{{ indicatorRef }}</li>
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
    <a-result
      v-if="refusalReason"
      status="warning"
      title="问数未执行"
      :sub-title="refusalReason"
    />
    <UiDataTable
      v-else
      :row-key="teacherRowKey"
      :columns="teacherColumns"
      :data-source="teacherRows"
      :pagination="false"
      size="small"
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
