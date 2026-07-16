<script setup lang="ts">
import type { PortfolioAnalysisAnnualReportVO } from '@/apis/portfolio/analysis'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import type { PortfolioEvaluationTeacherNoticeVO } from '@/apis/portfolio/types'
import type { PortfolioAnnualReportTaskStatusCode } from '@/types/enums/portfolio-annual-report-task-status-enum'
import { PortfolioAnnualReportTaskStatusDescription } from '@/types/enums/portfolio-annual-report-task-status-enum'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  PortfolioEvaluationTeacherNoticeStatusCode,
  PortfolioEvaluationTeacherNoticeStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioEvaluationNoticeApi } from '@/apis/portfolio/evaluation-notice'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const reportYear = ref(String(new Date().getFullYear()))
const loading = ref(false)
const generating = ref(false)
const annualReport = ref<PortfolioAnalysisAnnualReportVO | null>(null)
const annualNotices = ref<PortfolioEvaluationTeacherNoticeVO[]>([])
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
        annualReport.value.taskStatus as PortfolioAnnualReportTaskStatusCode,
        '年度报告任务状态',
      )
    : '',
)

function annualNoticeStatusLabel(notice: PortfolioEvaluationTeacherNoticeVO): string {
  return strictEnumLabel(
    PortfolioEvaluationTeacherNoticeStatusDescription,
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
    annualReport.value = null
    return
  }
  loading.value = true
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
      scopeRequestToken.value !== currentScopeToken ||
      reportRequestToken.value !== currentToken
    ) {
      return
    }
    annualReport.value = page.list[0] ?? null
  } catch (error) {
    if (
      scopeRequestToken.value !== currentScopeToken ||
      reportRequestToken.value !== currentToken
    ) {
      return
    }
    annualReport.value = null
    showUserError(error, '加载失败')
  } finally {
    if (
      scopeRequestToken.value === currentScopeToken &&
      reportRequestToken.value === currentToken
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
    return
  }
  try {
    const requestTeacherId = targetTeacherId.value
    const page = await portfolioEvaluationNoticeApi.pageNotices({
      ...(requestTeacherId ? { teacherId: requestTeacherId } : {}),
      sceneCode: 'ANNUAL_REVIEW',
      activeWindowOnly: true,
      pageNum: 1,
      pageSize: 100,
    })
    if (
      scopeRequestToken.value !== currentScopeToken ||
      noticeRequestToken.value !== currentToken
    ) {
      return
    }
    annualNotices.value = page.list
  } catch (error) {
    if (
      scopeRequestToken.value !== currentScopeToken ||
      noticeRequestToken.value !== currentToken
    ) {
      return
    }
    annualNotices.value = []
    showUserError(error, '加载失败')
  }
}

/**
 * 确认当前年度考核材料；服务端原子校验任务仍为已发布且尚未超过截止时间。
 */
async function submitAnnualReviewNotice(notice: PortfolioEvaluationTeacherNoticeVO) {
  if (submittingNoticeId.value || !canOperate.value) {
    return
  }
  const currentScopeToken = scopeRequestToken.value
  submittingNoticeId.value = notice.id
  try {
    await portfolioEvaluationNoticeApi.confirmMaterial({ noticeId: notice.id })
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    await loadAnnualReviewNotices()
  } catch (error) {
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    showUserError(error, '提交失败')
  } finally {
    if (scopeRequestToken.value === currentScopeToken) {
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
  const currentScopeToken = scopeRequestToken.value
  const requestTeacherId = targetTeacherId.value
  const requestReportYear = reportYear.value
  generating.value = true
  try {
    const result = await portfolioAnalysisApi.generateAnnualReport({
      teacherId: requestTeacherId,
      reportYear: requestReportYear,
    })
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    annualReport.value = result
  } catch (error) {
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    showUserError(error, '生成年度报告失败')
  } finally {
    if (scopeRequestToken.value === currentScopeToken) {
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
    scopeRequestToken.value += 1
    reportRequestToken.value += 1
    noticeRequestToken.value += 1
    loading.value = false
    generating.value = false
    submittingNoticeId.value = ''
    annualReport.value = null
    annualNotices.value = []
    await Promise.all([loadAnnualReport(), loadAnnualReviewNotices()])
  },
  () => `${targetTeacherId.value ?? ''}:${reportYear.value}`,
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="年度考核准备">
        <template #actions>
          <a-date-picker v-model:value="reportYear" picker="year" value-format="YYYY" />
          <UiButton :loading="loading" :disabled="!canOperate" @click="loadAnnualReport"
            >刷新</UiButton
          >
        </template>
      </ContextBar>
    </template>

    <UiEmpty v-if="canPickTeachers && !targetTeacherId" title="暂无内容" />
    <template v-else>
      <UiCard title="年度材料准备">
        <p class="annual-review__hint">
          先完成材料采集与确认，再通过审核进度核对可入档的正式记录。
        </p>
        <div class="annual-review__actions">
          <UiButton variant="primary" @click="openCollection">采集与确认材料</UiButton>
          <UiButton variant="outline" @click="openReviewStatus">查看审核进度</UiButton>
        </div>
      </UiCard>

      <UiCard title="年度考核窗口" class="annual-review__notice-card">
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
              <UiTag
                size="sm"
                :tone="
                  notice.noticeStatus === PortfolioEvaluationTeacherNoticeStatusCode.CONFIRMED
                    ? 'green'
                    : notice.noticeStatus ===
                        PortfolioEvaluationTeacherNoticeStatusCode.RETURNED_SUPPLEMENT
                      ? 'orange'
                      : 'blue'
                "
              >
                {{ annualNoticeStatusLabel(notice) }}
              </UiTag>
              <UiButton
                v-if="notice.noticeStatus !== PortfolioEvaluationTeacherNoticeStatusCode.CONFIRMED"
                variant="primary"
                :loading="submittingNoticeId === notice.id"
                :disabled="Boolean(submittingNoticeId)"
                @click="submitAnnualReviewNotice(notice)"
              >
                提交考核材料
              </UiButton>
            </div>
          </div>
        </template>
        <UiEmpty v-else title="暂无内容" />
      </UiCard>

      <UiCard title="年度发展报告" class="annual-review__report">
        <template #extra>
          <UiButton
            variant="primary"
            :loading="generating"
            :disabled="!canOperate"
            @click="generateAnnualReport"
            >生成年度报告</UiButton
          >
        </template>
        <template v-if="annualReport">
          <p class="annual-review__hint">{{ annualReport.reportYear }} 年度报告任务</p>
          <UiTag
            size="sm"
            :tone="
              annualReport.taskStatus === 'SUCCESS'
                ? 'green'
                : annualReport.taskStatus === 'FAILED'
                  ? 'red'
                  : 'blue'
            "
          >
            {{ statusLabel }}
          </UiTag>
          <p v-if="annualReport.errorSummary" class="annual-review__error">
            {{ annualReport.errorSummary }}
          </p>
        </template>
        <UiEmpty v-else-if="!loading" title="暂无内容" />
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped>
.annual-review__hint,
.annual-review__error {
  margin: 0 0 var(--dp-space-3);
  color: var(--dp-text-secondary);
}

.annual-review__error {
  color: var(--ant-color-error);
}

.annual-review__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-3);
}

.annual-review__report {
  margin-top: var(--dp-space-4);
}

.annual-review__notice-card {
  margin-top: var(--dp-space-4);
}

.annual-review__notice-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-4);
  padding: var(--dp-space-3) 0;
  border-bottom: 1px solid var(--ant-color-border-secondary);
}

.annual-review__notice-row:last-child {
  border-bottom: 0;
}

.annual-review__notice-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--dp-space-3);
}

@media (max-width: 640px) {
  .annual-review__notice-row {
    flex-direction: column;
  }
}
</style>
