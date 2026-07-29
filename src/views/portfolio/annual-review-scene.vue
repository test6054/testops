<script setup lang="ts">
import type { PortfolioAnalysisAnnualReportVO } from '@/apis/portfolio/analysis'
import type {
  PortfolioAiAnalysisDetailVO,
  PortfolioEvaluationTeacherNoticeVO,
} from '@/apis/portfolio/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import {
  PortfolioEvaluationTeacherNoticeStatusDescription,
  PortfolioEvaluationTeacherNoticeStatusEnum,
} from '@/apis/portfolio/enums'
import { portfolioEvaluationNoticeApi } from '@/apis/portfolio/evaluation-notice'
import { PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_TONE } from '@/apis/portfolio/types'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import YearPicker from '@/components/ui-guide/ui/YearPicker.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { PortfolioAnnualReportTaskStatusCode, PortfolioAnnualReportTaskStatusDescription } from '@/types/enums/portfolio-annual-report-task-status-enum'
import { PortfolioEvaluationSceneCode } from '@/types/enums/portfolio-evaluation-scene-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const POLL_INTERVAL_MS = 3000

const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const { evaluationHeld, evaluationHoldBlockMessage, assertEvaluationParticipable }
  = usePortfolioArchiveWriteGuard()
const reportYear = ref(String(new Date().getFullYear()))
const loading = ref(false)
const generating = ref(false)
const selectionConfirmed = ref(false)
const annualReport = ref<PortfolioAnalysisAnnualReportVO | null>(null)
const annualNotices = ref<PortfolioEvaluationTeacherNoticeVO[]>([])
const reportLoadFailed = ref(false)
const noticeLoadFailed = ref(false)
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)
const pollRequestToken = ref(0)
const reportDetail = ref<PortfolioAiAnalysisDetailVO | null>(null)
const reportDetailLoading = ref(false)
const reportDetailFailed = ref(false)
const reportDetailToken = ref(0)

const hasPendingAnnualNotices = computed(() =>
  annualNotices.value.some(
    (notice) => notice.noticeStatus !== PortfolioEvaluationTeacherNoticeStatusEnum.CONFIRMED,
  ),
)
const submittingNoticeId = ref('')
const scopeRequestToken = ref(0)
const reportRequestToken = ref(0)
const noticeRequestToken = ref(0)

const canOperate = computed(() => Boolean(targetTeacherId.value) || !canPickTeachers.value)
const teacherRequest = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
)
const statusLabel = computed(() =>
  annualReport.value
    ? strictEnumLabel(
        PortfolioAnnualReportTaskStatusDescription,
        annualReport.value.taskStatus,
        '年度报告任务状态',
      )
    : '',
)
const canViewReportDetail = computed(
  () =>
    annualReport.value?.taskStatus === PortfolioAnnualReportTaskStatusCode.SUCCESS
    && Boolean(annualReport.value.aiTaskId),
)

/** 离开页或切范围时停止年度报告任务轮询。 */
function stopAnnualReportPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

/** RUNNING 任务由本页单一 owner 退避轮询；终态或离页停止。 */
function startAnnualReportPollingIfRunning() {
  stopAnnualReportPolling()
  if (annualReport.value?.taskStatus !== PortfolioAnnualReportTaskStatusCode.RUNNING) {
    return
  }
  pollTimer.value = setInterval(() => {
    void refreshAnnualReportTask()
  }, POLL_INTERVAL_MS)
}

/**
 * 按任务 ID 刷新年度报告状态；响应必须匹配当前 teacher/year/task，避免串写。
 */
async function refreshAnnualReportTask() {
  const task = annualReport.value
  if (!task?.id) {
    return
  }
  const taskId = task.id
  const teacherId = task.teacherId
  const year = task.reportYear
  const scopeToken = scopeRequestToken.value
  const currentToken = ++pollRequestToken.value
  try {
    const row = await portfolioAnalysisApi.getAnnualReport({ id: taskId })
    if (
      currentToken !== pollRequestToken.value
      || scopeRequestToken.value !== scopeToken
      || annualReport.value?.id !== taskId
      || targetTeacherId.value !== teacherId
      || reportYear.value !== year
    ) {
      return
    }
    if (row.teacherId !== teacherId || row.reportYear !== year || row.id !== taskId) {
      stopAnnualReportPolling()
      showUserError(null, '年度报告任务合同与当前教师/年度不一致')
      return
    }
    annualReport.value = row
    if (row.taskStatus !== PortfolioAnnualReportTaskStatusCode.RUNNING) {
      stopAnnualReportPolling()
    }
  } catch {
    // 轮询瞬时失败不打断页面；终态仍靠刷新工具栏与离开再进入恢复
  }
}

/**
 * 按 aiTaskId 加载发展建议正文；结果仅属当前 SUCCESS 任务，不作正式考核结论。
 */
async function loadAnnualReportDetail() {
  const task = annualReport.value
  const aiTaskId = task?.aiTaskId
  if (!task || !aiTaskId || task.taskStatus !== PortfolioAnnualReportTaskStatusCode.SUCCESS) {
    showFormValidationMessage('仅已成功的年度发展报告可查看正文')
    return
  }
  const token = ++reportDetailToken.value
  const scopeToken = scopeRequestToken.value
  const taskId = task.id
  reportDetailLoading.value = true
  reportDetailFailed.value = false
  reportDetail.value = null
  try {
    const detail = await portfolioAiJobApi.getAnnualReportAnalysisByTask(aiTaskId)
    if (
      reportDetailToken.value !== token
      || scopeRequestToken.value !== scopeToken
      || annualReport.value?.id !== taskId
    ) {
      return
    }
    if (detail.aiTaskId && detail.aiTaskId !== aiTaskId) {
      showUserError(null, '发展建议结果与当前年度报告任务不一致')
      reportDetailFailed.value = true
      return
    }
    reportDetail.value = detail
  } catch (error) {
    if (reportDetailToken.value !== token || scopeRequestToken.value !== scopeToken) {
      return
    }
    reportDetailFailed.value = true
    showUserError(error, '加载年度发展建议失败')
  } finally {
    if (reportDetailToken.value === token) {
      reportDetailLoading.value = false
    }
  }
}

function annualNoticeStatusLabel(notice: PortfolioEvaluationTeacherNoticeVO): string {
  return strictEnumLabel(
    PortfolioEvaluationTeacherNoticeStatusDescription,
    notice.noticeStatus,
    '年度考核材料状态',
  )
}

function annualNoticeStatusTone(notice: PortfolioEvaluationTeacherNoticeVO) {
  return strictEnumTone(
    PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_TONE,
    notice.noticeStatus,
    '年度考核材料状态',
  )
}

/**
 * 加载当前教师当前年度的真实年度报告任务；没有任务时保留空态，不推断或制造考核提交状态。
 */
async function loadAnnualReport() {
  const currentScopeToken = scopeRequestToken.value
  const currentToken = ++reportRequestToken.value
  if (!canOperate.value) {
    stopAnnualReportPolling()
    annualReport.value = null
    reportDetail.value = null
    reportDetailFailed.value = false
    reportLoadFailed.value = false
    return
  }
  loading.value = true
  reportLoadFailed.value = false
  try {
    const requestTeacherId = targetTeacherId.value
    const requestReportYear = reportYear.value
    const page = await portfolioAnalysisApi.pageAnnualReports({
      ...(requestTeacherId ? { teacherId: requestTeacherId } : {}),
      reportYear: requestReportYear,
      pageNum: 1,
      pageSize: 1,
    })
    if (
      scopeRequestToken.value !== currentScopeToken
      || reportRequestToken.value !== currentToken
    ) {
      return
    }
    annualReport.value = page.list[0] ?? null
    reportDetail.value = null
    reportDetailFailed.value = false
    startAnnualReportPollingIfRunning()
  } catch (error) {
    if (
      scopeRequestToken.value !== currentScopeToken
      || reportRequestToken.value !== currentToken
    ) {
      return
    }
    reportLoadFailed.value = true
    showUserError(error, '年度报告加载失败')
  } finally {
    if (
      scopeRequestToken.value === currentScopeToken
      && reportRequestToken.value === currentToken
    ) {
      loading.value = false
    }
  }
}

/**
 * 加载当前教师已发布的年度考核通知；场景码由任务配置决定，窗口状态不从任务名称或当前年份猜测。
 */
async function loadAnnualReviewNotices() {
  const currentScopeToken = scopeRequestToken.value
  const currentToken = ++noticeRequestToken.value
  if (!canOperate.value) {
    annualNotices.value = []
    noticeLoadFailed.value = false
    return
  }
  noticeLoadFailed.value = false
  try {
    const requestTeacherId = targetTeacherId.value
    const page = await portfolioEvaluationNoticeApi.pageNotices({
      ...(requestTeacherId ? { teacherId: requestTeacherId } : {}),
      sceneCode: PortfolioEvaluationSceneCode.ANNUAL_REVIEW,
      activeWindowOnly: true,
      pageNum: 1,
      pageSize: 100,
    })
    if (
      scopeRequestToken.value !== currentScopeToken
      || noticeRequestToken.value !== currentToken
    ) {
      return
    }
    annualNotices.value = page.list
  } catch (error) {
    if (
      scopeRequestToken.value !== currentScopeToken
      || noticeRequestToken.value !== currentToken
    ) {
      return
    }
    noticeLoadFailed.value = true
    showUserError(error, '年度考核窗口加载失败')
  }
}

/** 并行刷新年度报告与考核窗口，避免模板内直接引用 Promise 全局。 */
async function refreshAnnualScene(): Promise<void> {
  await Promise.all([loadAnnualReport(), loadAnnualReviewNotices()])
}

/**
 * 确认当前年度考核材料；服务端原子校验任务仍为已发布且尚未超过截止时间。
 */
async function submitAnnualReviewNotice(notice: PortfolioEvaluationTeacherNoticeVO) {
  if (submittingNoticeId.value || !canOperate.value) {
    return
  }
  // 确认前冻结目标，避免确认对话框期间切教师/年份串写
  const actionContext = {
    noticeId: notice.id,
    teacherId: targetTeacherId.value,
    scopeToken: scopeRequestToken.value,
  }
  if (!(await confirmProxyWrite('确认年度考核材料'))) {
    return
  }
  if (
    scopeRequestToken.value !== actionContext.scopeToken
    || targetTeacherId.value !== actionContext.teacherId
  ) {
    showFormValidationMessage('确认期间教师或年度范围已变化，请重新操作')
    return
  }
  if (notice.evaluationHeld || !assertEvaluationParticipable('确认年度考核材料')) {
    return
  }

  submittingNoticeId.value = actionContext.noticeId
  try {
    await portfolioEvaluationNoticeApi.confirmMaterial({ noticeId: actionContext.noticeId })
    if (
      scopeRequestToken.value !== actionContext.scopeToken
      || targetTeacherId.value !== actionContext.teacherId
    ) {
      return
    }
    try {
      await loadAnnualReviewNotices()
    } catch (error) {
      showUserError(error, '材料确认已生效，窗口同步失败')
    }
  } catch (error) {
    if (
      scopeRequestToken.value !== actionContext.scopeToken
      || targetTeacherId.value !== actionContext.teacherId
    ) {
      return
    }
    showUserError(error, '提交失败')
  } finally {
    if (submittingNoticeId.value === actionContext.noticeId) {
      submittingNoticeId.value = ''
    }
  }
}

/**
 * 触发年度发展报告生成；服务端以教师范围和年度为唯一任务口径，并拒绝无权限代操作。
 */
async function generateAnnualReport() {
  if (!canOperate.value || generating.value || !targetTeacherId.value) {
    return
  }
  if (!selectionConfirmed.value) {
    void message.warning('生成前请确认：本年度材料已甄选，完整度不等于发展叙事质量')
    return
  }
  const actionContext = {
    teacherId: targetTeacherId.value,
    reportYear: reportYear.value,
    scopeToken: scopeRequestToken.value,
  }
  if (!(await confirmProxyWrite('生成年度报告'))) {
    return
  }
  if (
    scopeRequestToken.value !== actionContext.scopeToken
    || targetTeacherId.value !== actionContext.teacherId
    || reportYear.value !== actionContext.reportYear
  ) {
    showFormValidationMessage('确认期间教师或年度范围已变化，请重新操作')
    return
  }
  generating.value = true
  try {
    const result = await portfolioAnalysisApi.generateAnnualReport({
      teacherId: actionContext.teacherId,
      reportYear: actionContext.reportYear,
    })
    if (
      scopeRequestToken.value !== actionContext.scopeToken
      || targetTeacherId.value !== actionContext.teacherId
      || reportYear.value !== actionContext.reportYear
    ) {
      return
    }
    annualReport.value = result
    reportDetail.value = null
    reportDetailFailed.value = false
    startAnnualReportPollingIfRunning()
  } catch (error) {
    if (
      scopeRequestToken.value !== actionContext.scopeToken
      || targetTeacherId.value !== actionContext.teacherId
    ) {
      return
    }
    showUserError(error, '生成年度报告失败')
  } finally {
    if (
      scopeRequestToken.value === actionContext.scopeToken
      && targetTeacherId.value === actionContext.teacherId
    ) {
      generating.value = false
    }
  }
}

function openCollection() {
  void router.push({ path: '/portfolio/teacher/intake', query: teacherRequest.value })
}

function openReviewStatus() {
  void router.push({ path: '/portfolio/teacher/review-status', query: teacherRequest.value })
}

usePortfolioScopedLoader(
  async () => {
    stopAnnualReportPolling()
    pollRequestToken.value += 1
    reportDetailToken.value += 1
    scopeRequestToken.value += 1
    reportRequestToken.value += 1
    noticeRequestToken.value += 1
    loading.value = false
    generating.value = false
    submittingNoticeId.value = ''
    selectionConfirmed.value = false
    reportLoadFailed.value = false
    noticeLoadFailed.value = false
    reportDetailLoading.value = false
    reportDetailFailed.value = false
    annualReport.value = null
    annualNotices.value = []
    reportDetail.value = null
    await Promise.all([loadAnnualReport(), loadAnnualReviewNotices()])
  },
  () => `${targetTeacherId.value ?? ''}:${reportYear.value}`,
)

onUnmounted(() => {
  stopAnnualReportPolling()
  pollRequestToken.value += 1
  reportDetailToken.value += 1
})

const AnnualReviewSceneSignalMetrics = computed<SignalMetric[]>(() => {
  return applySpotlightEmphasis([
    {
      key: 'year',
      label: '考核年度',
      value: reportYear.value,
      clickable: true,
    },
  ], { primaryKey: 'year', actionLabel: '刷新' })
})

function onAnnualReviewSceneSignalClick(_key: string) {
  void loadAnnualReport()
}
</script>

<template>
  <StageWorkbenchShell>
    <UiAlertStrip
      v-if="evaluationHeld"
      tone="warning"
      title="评价参评已 hold"
      :description="evaluationHoldBlockMessage"
      class="dp-mb-component"
    />
    <template #context>
      <ContextBar show-title layout="workbench" title="年度考核准备" :subtitle="`${reportYear} 年`">
        <template #actions>
          <YearPicker v-model="reportYear" size="sm" />
          <UiButton
            size="sm"
            :loading="loading"
            :disabled="!canOperate"
            @click="() => void refreshAnnualScene()"
          >
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <template v-if="AnnualReviewSceneSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="AnnualReviewSceneSignalMetrics"
        @metric-click="onAnnualReviewSceneSignalClick"
      />
    </template>

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />
    <template v-else>
      <UiCard title="年度材料准备">
        <div class="annual-review__actions">
          <UiButton size="sm" variant="outline" @click="openCollection">采集与确认材料</UiButton>
          <UiButton size="sm" variant="outline" @click="openReviewStatus">查看审核进度</UiButton>
        </div>
      </UiCard>

      <UiCard title="年度考核窗口" class="annual-review__notice-card">
        <UiAlertStrip
          v-if="noticeLoadFailed"
          tone="error"
          title="年度考核窗口加载失败"
          class="dp-mb-component"
        />
        <template v-if="annualNotices.length">
          <div v-for="notice in annualNotices" :key="notice.id" class="annual-review__notice-row">
            <div>
              <strong>{{ notice.taskTitle }}</strong>
              <p class="annual-review__hint">
                {{ notice.taskStartTime || '未设置开始时间' }} 至
                {{ notice.dueTime || '未设置截止时间' }}
              </p>
              <p v-if="notice.returnReason" class="annual-review__error">
                退回意见：{{ notice.returnReason }}
              </p>
            </div>
            <div class="annual-review__notice-actions">
              <UiTag size="sm" :tone="annualNoticeStatusTone(notice)">
                {{ annualNoticeStatusLabel(notice) }}
              </UiTag>
              <UiButton
                size="sm"
                v-if="notice.noticeStatus !== PortfolioEvaluationTeacherNoticeStatusEnum.CONFIRMED"
                variant="primary"
                :loading="submittingNoticeId === notice.id"
                :disabled="
                  Boolean(submittingNoticeId) || Boolean(notice.evaluationHeld) || evaluationHeld
                "
                @click="submitAnnualReviewNotice(notice)"
              >
                提交考核材料
              </UiButton>
            </div>
          </div>
        </template>
        <UiEmpty
          v-else-if="!noticeLoadFailed"
          size="sm"
          description="当前无年度考核窗口"
        />
      </UiCard>

      <UiCard title="年度发展报告" class="annual-review__report">
        <template #extra>
          <UiCheckbox v-model="selectionConfirmed" class="annual-review__selection">
            本年度材料已甄选
          </UiCheckbox>
          <UiButton
            size="sm"
            :variant="hasPendingAnnualNotices ? 'outline' : 'primary'"
            :loading="generating"
            :disabled="!canOperate || !selectionConfirmed"
            @click="generateAnnualReport"
          >
            生成年度报告
          </UiButton>
        </template>
        <UiAlertStrip
          tone="info"
          title="发展建议，非正式考核结论"
          description="本区为 AI 年度发展报告；正式考核以「年度考核窗口」材料确认为准。"
          class="dp-mb-component"
        />
        <UiAlertStrip
          v-if="reportLoadFailed"
          tone="error"
          title="年度报告加载失败"
          class="dp-mb-component"
        />
        <template v-if="annualReport">
          <p class="annual-review__hint">
            {{ annualReport.reportYear }} 年度发展报告任务
            <template v-if="annualReport.aiTaskId"> · AI 任务 {{ annualReport.aiTaskId }}</template>
          </p>
          <div class="annual-review__report-status">
            <UiTag
              size="sm"
              :tone="
                annualReport.taskStatus === PortfolioAnnualReportTaskStatusCode.SUCCESS
                  ? 'green'
                  : annualReport.taskStatus === PortfolioAnnualReportTaskStatusCode.FAILED
                    ? 'red'
                    : 'blue'
              "
            >
              {{ statusLabel }}
            </UiTag>
            <UiButton
              v-if="canViewReportDetail"
              size="sm"
              variant="outline"
              :loading="reportDetailLoading"
              @click="loadAnnualReportDetail"
            >
              查看发展建议
            </UiButton>
          </div>
          <p
            v-if="annualReport.taskStatus === PortfolioAnnualReportTaskStatusCode.RUNNING"
            class="annual-review__hint"
          >
            生成中，本页自动同步任务状态…
          </p>
          <p v-if="annualReport.errorSummary" class="annual-review__error">
            {{ annualReport.errorSummary }}
          </p>
          <UiAlertStrip
            v-if="reportDetailFailed"
            tone="error"
            title="发展建议正文加载失败"
            description="任务已成功；切换年度或点「查看发展建议」前请先刷新范围。"
            class="dp-mt-component"
          />
          <div v-else-if="reportDetail" class="annual-review__detail">
            <p class="annual-review__hint">
              {{ reportDetail.resultTitle || '年度发展建议' }}
              <template v-if="reportDetail.generatedTime"> · {{ reportDetail.generatedTime }}</template>
              <template v-if="reportDetail.modelName"> · {{ reportDetail.modelName }}</template>
            </p>
            <p v-if="reportDetail.summary" class="annual-review__detail-summary">
              {{ reportDetail.summary }}
            </p>
            <pre
              v-if="reportDetail.draftMarkdown"
              class="annual-review__detail-markdown"
            >{{ reportDetail.draftMarkdown }}</pre>
          </div>
        </template>
        <UiEmpty
          size="sm"
          v-else-if="!loading && !reportLoadFailed"
          description="暂无年度报告任务"
        />
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped>
.annual-review__hint,
.annual-review__error {
  margin: 0 0 var(--dp-space-component);
  color: var(--dp-text-secondary);
}

.annual-review__error {
  color: var(--dp-error);
}

.annual-review__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component);
}

.annual-review__report {
  margin-top: var(--dp-space-block);
}

.annual-review__notice-card {
  margin-top: var(--dp-space-block);
}

.annual-review__notice-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-block);
  padding: var(--dp-space-component) 0;
  border-bottom: 1px solid var(--dp-border-subtle);
}

.annual-review__notice-row:last-child {
  border-bottom: 0;
}

.annual-review__notice-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--dp-space-component);
}

@media (max-width: 640px) {
  .annual-review__notice-row {
    flex-direction: column;
  }
}

.annual-review-scene__select-hint {
  margin: 0 0 var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
  background: var(--dp-surface-subtle);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
  line-height: 1.45;
}

.annual-review__selection {
  margin-right: var(--dp-space-component);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.annual-review__report-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component);
  margin-bottom: var(--dp-space-component);
}

.annual-review__detail {
  margin-top: var(--dp-space-component);
  padding-top: var(--dp-space-component);
  border-top: 1px solid var(--dp-border-subtle);
}

.annual-review__detail-summary {
  margin: 0 0 var(--dp-space-component);
  color: var(--dp-text-primary);
  line-height: 1.5;
}

.annual-review__detail-markdown {
  margin: 0;
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
  background: var(--dp-surface-subtle);
  color: var(--dp-text-primary);
  font-family: inherit;
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
