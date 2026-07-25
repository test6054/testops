<script setup lang="ts">
import type { PortfolioDepartmentPortraitVO } from '@/apis/portfolio/analysis'
import type { PortfolioCockpitSummaryVO } from '@/apis/portfolio/types'
import type { PortfolioComplianceAlertTypeCode } from '@/types/enums/portfolio-compliance-alert-type-enum'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import { portfolioCockpitApi } from '@/apis/portfolio/cockpit'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { useUserStore } from '@/stores/modules/user'
import {
  PortfolioAlertStatusCode,
  PortfolioAlertStatusDescription,
} from '@/types/enums/portfolio-alert-status-enum'
import { PortfolioComplianceAlertTypeDescription } from '@/types/enums/portfolio-compliance-alert-type-enum'
import {
  PortfolioMetricRecomputeStatusCode,
} from '@/types/enums/portfolio-metric-recompute-status-enum'
import { showUserError } from '@/utils/error-handler'
import { portfolioMetricRecomputeStatusLabel } from '@/utils/portfolio-hr-band'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioCockpitAskPanel from '@/views/portfolio/components/PortfolioCockpitAskPanel.vue'
import PortfolioHrMetricDistributionSection from '@/views/portfolio/components/PortfolioHrMetricDistributionSection.vue'

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** 可选计数字段缺失显示 —，禁止冒充 0 */
function optionalMetric(value: number | null | undefined): string | number {
  return value == null ? '—' : value
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { loadTree, departmentOptions: loadDepartmentOptions } = usePortfolioOrgTree()
const departmentOptions = computed(() => loadDepartmentOptions())
const loading = ref(false)
const departmentId = ref('')
const deepLinkTaskId = ref(readRouteStringParam(route.query.taskId))
const summary = ref<PortfolioCockpitSummaryVO | null>(null)
const portrait = ref<PortfolioDepartmentPortraitVO | null>(null)
const departmentSyncToken = ref(0)
const summaryRequestToken = ref(0)

const signals = computed<SignalMetric[]>(() => {
  if (!summary.value) {
    return []
  }
  const row = summary.value
  const items: SignalMetric[] = [
    { key: 'teacher', label: '教师总数', value: optionalMetric(row.teacherCount), tone: 'blue' },
    { key: 'dual', label: '双师认定', value: optionalMetric(row.dualTeacherCount), tone: 'green' },
    { key: 'key', label: '骨干教师', value: optionalMetric(row.keyTeacherCount), tone: 'purple' },
    {
      key: 'achievement',
      label: '成果合计',
      value: optionalMetric(row.achievementTotalCount),
      tone: 'orange',
    },
    { key: 'honor', label: '荣誉合计', value: optionalMetric(row.honorTotalCount), tone: 'gray' },
    {
      key: 'indicator',
      label: '启用指标',
      value: optionalMetric(row.tenantEnabledIndicatorCount),
      tone: 'blue',
    },
  ]
  if (row.trainingCompletionRatePercent != null) {
    items.push({
      key: 'training',
      label: '培训达标率',
      value: row.trainingCompletionRatePercent,
      unit: '%',
      tone: row.trainingCompletionRatePercent >= 100 ? 'green' : 'orange',
    })
  }
  if (row.gapTaskOpenCount != null && row.gapTaskOpenCount > 0) {
    items.push({
      key: 'gap',
      label: '开放补采',
      value: row.gapTaskOpenCount,
      tone: 'orange',
    })
  }
  if (row.reviewTaskBacklogCount != null && row.reviewTaskBacklogCount > 0) {
    items.push({
      key: 'reviewBacklog',
      label: '审核积压',
      value: row.reviewTaskBacklogCount,
      tone: 'red',
    })
  }
  if (row.courseArchiveFrameworkSlotTotal != null && row.courseArchiveFrameworkSlotTotal > 0) {
    items.push({
      key: 'courseArchive',
      label: `${row.currentAcademicYear ?? '本学年'} 五框架`,
      value: optionalMetric(row.courseArchiveFrameworkSlotDone),
      unit: `/${row.courseArchiveFrameworkSlotTotal}`,
      tone:
        row.courseArchiveFrameworkSlotDone != null
        && row.courseArchiveFrameworkSlotDone >= row.courseArchiveFrameworkSlotTotal
          ? 'green'
          : 'orange',
      clickable: true,
      helper: '跳转部门一张表',
    })
  }
  if (row.currentAcademicYear) {
    items.push(
      {
        key: 'completenessComplete',
        label: '完整',
        value: optionalMetric(row.completenessCompleteCount),
        tone: 'green',
        clickable: true,
        helper: '筛选完整教师',
      },
      {
        key: 'completenessBasic',
        label: '基本完整',
        value: optionalMetric(row.completenessBasicCount),
        tone: 'blue',
        clickable: true,
        helper: '筛选基本完整教师',
      },
      {
        key: 'completenessPending',
        label: '待补充',
        value: optionalMetric(row.completenessPendingCount),
        tone: 'orange',
        clickable: true,
        helper: '筛选待补充教师',
      },
      {
        key: 'completenessSevere',
        label: '严重缺失',
        value: optionalMetric(row.completenessSevereCount),
        tone: 'red',
        clickable: true,
        helper: '筛选严重缺失教师',
      },
    )
  }
  return items
})

function goDeptOneTable(completenessLevel?: string) {
  if (!departmentId.value) {
    return
  }
  const query: Record<string, string> = { departmentId: departmentId.value }
  if (completenessLevel) {
    query.completenessLevel = completenessLevel
  }
  void router.push({ path: '/portfolio/department/dept-one-table', query })
}

function goTeacherAnalytics() {
  if (!departmentId.value) {
    return
  }
  void router.push({
    path: '/portfolio/department/teacher-analytics',
    query: { departmentId: departmentId.value },
  })
}

function handleSignalMetricClick(key: string) {
  const completenessLevelMap: Record<string, string> = {
    completenessComplete: 'COMPLETE',
    completenessBasic: 'BASIC',
    completenessPending: 'PENDING',
    completenessSevere: 'SEVERE',
  }
  const level = completenessLevelMap[key]
  if (level) {
    goDeptOneTable(level)
    return
  }
  if (key === 'courseArchive') {
    goTeacherAnalytics()
  }
}

const portraitStats = computed(() => {
  if (!portrait.value) {
    return []
  }
  const row = portrait.value
  return [
    { label: '有画像教师', value: String(row.portraitTeacherCount) },
    { label: '平均综合分', value: row.avgCompositeScore },
    { label: '平均教学分', value: row.avgTeachingScore },
    { label: '平均科研分', value: row.avgResearchScore },
    { label: '平均培训分', value: row.avgTrainingScore },
    { label: '平均实践分', value: row.avgPracticeScore },
  ]
})

const openComplianceAlerts = computed(() =>
  (portrait.value?.complianceAlerts ?? []).filter(
    (item) => item.alertStatus === PortfolioAlertStatusCode.OPEN,
  ),
)

function complianceTypeLabel(code: string): string {
  return strictEnumLabel(
    PortfolioComplianceAlertTypeDescription,
    code as PortfolioComplianceAlertTypeCode,
    '结构合规预警类型',
  )
}

function alertStatusLabel(code?: PortfolioAlertStatusCode): string {
  if (!code) return '—'
  return strictEnumLabel(PortfolioAlertStatusDescription, code, '预警状态')
}

async function loadSummary() {
  const currentToken = ++summaryRequestToken.value
  if (!departmentId.value) {
    summary.value = null
    portrait.value = null
    loading.value = false
    return
  }
  loading.value = true
  summary.value = null
  portrait.value = null
  try {
    const summaryResult = await portfolioCockpitApi.deptSummary({
      departmentId: departmentId.value,
    })
    if (currentToken !== summaryRequestToken.value) {
      return
    }
    summary.value = summaryResult
    try {
      portrait.value = await portfolioAnalysisApi.getDepartmentPortrait({
        departmentId: departmentId.value,
      })
    } catch (error) {
      if (currentToken !== summaryRequestToken.value) {
        return
      }
      portrait.value = null
      showUserError(error, '科室画像加载失败')
    }
  } catch (error) {
    if (currentToken !== summaryRequestToken.value) {
      return
    }
    summary.value = null
    portrait.value = null
    showUserError(error, '加载院系驾驶舱失败')
  } finally {
    if (currentToken === summaryRequestToken.value) {
      loading.value = false
    }
  }
}

/** 驾驶舱默认应定位到当前登录教师所属院系，而不是组织树首项。 */
async function syncDepartmentContext() {
  const currentToken = ++departmentSyncToken.value
  const queryDepartmentId = readRouteStringParam(route.query.departmentId)
  if (
    queryDepartmentId
    && departmentOptions.value.some((option) => option.value === queryDepartmentId)
  ) {
    departmentId.value = queryDepartmentId
    return
  }
  const currentUserId = userStore.userInfo.userId
  if (!currentUserId) {
    departmentId.value = ''
    return
  }
  try {
    const detail = await portfolioTeacherApi.get(currentUserId)
    if (currentToken !== departmentSyncToken.value) {
      return
    }
    // 未指定路由院系时，教师档案是当前用户所属院系的唯一业务依据。
    // 教师必须归属院系，缺失关联属于数据异常，不能静默降级为空范围。
    if (!detail.departmentId) {
      departmentId.value = ''
      showUserError(new Error('当前教师未关联院系'), '定位当前教师所属院系失败')
      return
    }
    departmentId.value = detail.departmentId
  } catch (error) {
    if (currentToken !== departmentSyncToken.value) {
      return
    }
    departmentId.value = ''
    showUserError(error, '定位当前教师所属院系失败')
  }
}

watch(departmentId, () => {
  void loadSummary()
})

onMounted(async () => {
  await loadTree()
  await syncDepartmentContext()
})

watch(
  () => route.query.taskId,
  (value) => {
    deepLinkTaskId.value = readRouteStringParam(value)
  },
)

watch(
  () => route.query.departmentId,
  () => {
    void syncDepartmentContext()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="院系驾驶舱"
        :subtitle="summary?.departmentName || portrait?.departmentName"
      >
        <template #actions>
          <UiButton size="sm" :disabled="!departmentId" @click="goDeptOneTable()">
            部门一张表
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard title="组织范围">
      <UiSelect
        size="sm"
        v-model="departmentId"
        class="dept-cockpit__field"
        placeholder="选择院系"
        :options="departmentOptions"
      />
    </UiCard>
    <template #signal>
      <SignalBand
        v-if="summary"
        :metrics="signals"
        variant="panel"
        compact
        @metric-click="handleSignalMetricClick"
      />
    </template>
    <UiSpin :spinning="loading">
      <UiAlertStrip
        v-if="!loading && !departmentId"
        tone="info"
        size="sm"
        dense
        inline
        :show-icon="false"
      >
        <template #default>
          <span class="dept-cockpit__gate-row">
            <UiTag tone="blue" size="sm">未选择院系</UiTag>
            <span>请在上方选择院系后查看驾驶舱</span>
          </span>
        </template>
      </UiAlertStrip>
      <UiEmpty size="sm" v-else-if="!loading && !summary" description="当前院系暂无驾驶舱数据" />
      <template v-else-if="summary">
        <UiAlertStrip
          v-if="summary.metricRecomputeStatus && summary.metricRecomputeStatus !== PortfolioMetricRecomputeStatusCode.READY"
          tone="warning"
          size="sm"
          dense
          inline
          :show-icon="false"
          class="dept-cockpit__metric-status"
        >
          指标快照{{ portfolioMetricRecomputeStatusLabel(summary.metricRecomputeStatus) }}
          <template v-if="summary.metricComputedTime">
            · 最近计算 {{ summary.metricComputedTime }}
          </template>
        </UiAlertStrip>
        <UiStatPanel
          v-if="portrait"
          title="院系画像均值"
          :items="portraitStats"
          compact
          class="dept-cockpit__portrait"
        />
        <PortfolioHrMetricDistributionSection
          class="dept-cockpit__hr"
          :political-affiliation-distribution="summary.politicalAffiliationDistribution"
          :education-degree-distribution="summary.educationDegreeDistribution"
          :age-band-distribution="summary.ageBandDistribution"
          :tenure-band-distribution="summary.tenureBandDistribution"
          :retirement-window-distribution="summary.retirementWindowDistribution"
          :post-category-distribution="summary.postCategoryDistribution"
        />
        <UiCard
          v-if="openComplianceAlerts.length"
          title="结构合规预警"
          class="dept-cockpit__compliance"
        >
          <ul class="dept-cockpit__alert-list">
            <li
              v-for="item in openComplianceAlerts"
              :key="item.id"
              class="dept-cockpit__alert-item"
            >
              <div class="dept-cockpit__alert-head">
                <strong>{{ complianceTypeLabel(item.alertType) }}</strong>
                <UiTag tone="red">
                  {{ alertStatusLabel(item.alertStatus) }}
                </UiTag>
              </div>
              <p>{{ item.alertSummary }}</p>
            </li>
          </ul>
        </UiCard>
        <PortfolioCockpitAskPanel
          :department-id="departmentId"
          :initial-task-id="deepLinkTaskId || undefined"
        />
      </template>
    </UiSpin>
  </StageWorkbenchShell>
</template>

<style scoped>
.dept-cockpit__field {
  width: 100%;
  max-width: 320px;
}

.dept-cockpit__gate-row {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  min-width: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.dept-cockpit__portrait,
.dept-cockpit__compliance,
.dept-cockpit__hr,
.dept-cockpit__metric-status {
  margin-top: var(--dp-space-block);
}

.dept-cockpit__alert-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.dept-cockpit__alert-item + .dept-cockpit__alert-item {
  margin-top: var(--dp-space-component);
  padding-top: var(--dp-space-component);
  border-top: 1px solid var(--dp-border);
}

.dept-cockpit__alert-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component-xs);
}
</style>
