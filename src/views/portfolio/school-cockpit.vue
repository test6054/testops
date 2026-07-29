<script setup lang="ts">
import type { PortfolioSchoolPortraitCockpitVO } from '@/apis/portfolio/analysis'
import type { PortfolioComplianceAlertTypeCode } from '@/types/enums/portfolio-compliance-alert-type-enum'
import type { PortfolioComplianceScopeTypeCode } from '@/types/enums/portfolio-compliance-scope-type-enum'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import { PortfolioOrgUnitTypeCode } from '@/apis/portfolio/enums'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import {
  PortfolioAlertStatusCode,
  PortfolioAlertStatusDescription,
} from '@/types/enums/portfolio-alert-status-enum'
import { PortfolioComplianceAlertTypeDescription } from '@/types/enums/portfolio-compliance-alert-type-enum'
import { PortfolioComplianceScopeTypeDescription } from '@/types/enums/portfolio-compliance-scope-type-enum'
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
const { loadTree, treeRoots } = usePortfolioOrgTree()
const loading = ref(false)
const loadError = ref(false)
const requestToken = ref(0)
const campusOrgId = ref('')
const cockpit = ref<PortfolioSchoolPortraitCockpitVO | null>(null)
const deepLinkTaskId = computed(() => readRouteStringParam(route.query.taskId))

const campusOptions = computed(() => {
  const options: { value: string, label: string }[] = [{ value: '', label: '全校（合并计算）' }]
  const walk = (nodes: typeof treeRoots.value, prefix = '') => {
    for (const node of nodes) {
      const label = prefix ? `${prefix} / ${node.name}` : node.name
      if (node.nodeType === PortfolioOrgUnitTypeCode.CAMPUS && node.portfolioOrgId) {
        options.push({ value: node.portfolioOrgId, label })
      }
      if (node.children?.length) {
        walk(node.children, label)
      }
    }
  }
  walk(treeRoots.value)
  return options
})

const signals = computed<SignalMetric[]>(() => {
  if (!cockpit.value?.summary) {
    return []
  }
  const summary = cockpit.value.summary
  const items: SignalMetric[] = [
    { key: 'teacher', label: '教师总数', value: optionalMetric(summary.teacherCount), tone: 'blue' },
    { key: 'dual', label: '双师认定', value: optionalMetric(summary.dualTeacherCount), tone: 'green' },
    { key: 'key', label: '骨干教师', value: optionalMetric(summary.keyTeacherCount), tone: 'purple' },
    {
      key: 'achievement',
      label: '成果合计',
      value: optionalMetric(summary.achievementTotalCount),
      tone: 'orange',
    },
    { key: 'honor', label: '荣誉合计', value: optionalMetric(summary.honorTotalCount), tone: 'gray' },
    {
      key: 'indicator',
      label: '启用指标',
      value: optionalMetric(summary.tenantEnabledIndicatorCount),
      tone: 'blue',
    },
  ]
  if (summary.trainingCompletionRatePercent != null) {
    items.push({
      key: 'training',
      label: '培训达标率',
      value: summary.trainingCompletionRatePercent,
      unit: '%',
      tone: summary.trainingCompletionRatePercent >= 100 ? 'green' : 'orange',
    })
  }
  if (summary.gapTaskOpenCount != null && summary.gapTaskOpenCount > 0) {
    items.push({
      key: 'gap',
      label: '开放补采',
      value: summary.gapTaskOpenCount,
      tone: 'orange',
    })
  }
  if (summary.reviewTaskBacklogCount != null && summary.reviewTaskBacklogCount > 0) {
    items.push({
      key: 'reviewBacklog',
      label: '审核积压',
      value: summary.reviewTaskBacklogCount,
      tone: 'red',
    })
  }
  if (summary.crossCampusAppointmentTeacherCount != null
    && summary.crossCampusAppointmentTeacherCount > 0) {
    items.push({
      key: 'crossCampus',
      label: '跨校区兼课',
      value: summary.crossCampusAppointmentTeacherCount,
      tone: 'purple',
      helper: summary.campusName
        ? `当前校区「${summary.campusName}」内兼课教师`
        : '绑定两个及以上校区身份的教师',
    })
  }
  if (summary.courseArchiveFrameworkSlotTotal != null
    && summary.courseArchiveFrameworkSlotTotal > 0) {
    items.push({
      key: 'courseArchive',
      label: `${summary.currentAcademicYear ?? '本学年'} 五框架`,
      value: optionalMetric(summary.courseArchiveFrameworkSlotDone),
      unit: `/${summary.courseArchiveFrameworkSlotTotal}`,
      tone:
        summary.courseArchiveFrameworkSlotDone != null
        && summary.courseArchiveFrameworkSlotDone >= summary.courseArchiveFrameworkSlotTotal
          ? 'green'
          : 'orange',
      clickable: true,
      helper: '查看师资分析',
    })
  }
  if (summary.currentAcademicYear) {
    items.push(
      {
        key: 'completenessComplete',
        label: '完整',
        value: optionalMetric(summary.completenessCompleteCount),
        tone: 'green',
        clickable: true,
        helper: '查看全校完整度分布',
      },
      {
        key: 'completenessBasic',
        label: '基本完整',
        value: optionalMetric(summary.completenessBasicCount),
        tone: 'blue',
        clickable: true,
        helper: '查看全校完整度分布',
      },
      {
        key: 'completenessPending',
        label: '待补充',
        value: optionalMetric(summary.completenessPendingCount),
        tone: 'orange',
        clickable: true,
        helper: '查看全校完整度分布',
      },
      {
        key: 'completenessSevere',
        label: '严重缺失',
        value: optionalMetric(summary.completenessSevereCount),
        tone: 'red',
        clickable: true,
        helper: '查看全校完整度分布',
      },
    )
  }
  const priorityKeys = [
    'reviewBacklog',
    'gap',
    'completenessSevere',
    'completenessPending',
    'training',
    'teacher',
  ] as const
  function attentionValue(metric: SignalMetric): number {
    if (typeof metric.value === 'number') {
      return metric.value
    }
    if (typeof metric.value === 'string' && metric.value !== '—') {
      const n = Number(metric.value)
      return Number.isFinite(n) ? n : 0
    }
    return 0
  }
  const primaryBase
    = priorityKeys
      .map((key) => items.find((item) => item.key === key))
      .find((item) => {
        if (!item) {
          return false
        }
        if (item.key === 'teacher') {
          return true
        }
        if (item.key === 'training') {
          return typeof item.value === 'number' && item.value < 100
        }
        return attentionValue(item) > 0
      })
      ?? items[0]

  if (!primaryBase) {
    return []
  }

  const actionByKey: Record<string, string> = {
    reviewBacklog: '清审核积压',
    gap: '去补采',
    completenessSevere: '查严重缺失',
    completenessPending: '查待补充',
    training: '看培训',
    teacher: '教师名单',
  }

  return [
    {
      ...primaryBase,
      emphasis: 'primary',
      actionLabel: actionByKey[primaryBase.key] ?? '查看详情',
      clickable: primaryBase.clickable ?? true,
    },
    ...items
      .filter((item) => item.key !== primaryBase.key)
      .slice(0, 3)
      .map((item) => ({ ...item, emphasis: 'secondary' as const })),
  ]
})

function goTeacherAnalytics() {
  const query: Record<string, string> = {}
  if (campusOrgId.value) {
    query.campusOrgId = campusOrgId.value
  }
  void router.push({ path: '/portfolio/admin/teacher-analytics', query })
}

function handleSignalMetricClick(key: string) {
  if (key === 'courseArchive' || key.startsWith('completeness')) {
    goTeacherAnalytics()
  }
}

const openComplianceAlerts = computed(() =>
  (cockpit.value?.complianceAlerts ?? []).filter(
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

function scopeTypeLabel(code: string): string {
  return strictEnumLabel(
    PortfolioComplianceScopeTypeDescription,
    code as PortfolioComplianceScopeTypeCode,
    '合规预警范围',
  )
}

async function loadCockpit() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  loading.value = true
  loadError.value = false
  cockpit.value = null
  try {
    const result = await portfolioAnalysisApi.getSchoolPortraitCockpit(
      campusOrgId.value ? { campusOrgId: campusOrgId.value } : {},
    )
    if (requestToken.value !== currentToken) return
    cockpit.value = result
  } catch (error) {
    if (requestToken.value !== currentToken) return
    cockpit.value = null
    loadError.value = true
    showUserError(error, '加载学校驾驶舱失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

watch(campusOrgId, () => {
  void loadCockpit()
})

onMounted(async () => {
  await loadTree()
  const queryCampus = readRouteStringParam(route.query.campusOrgId)
  if (queryCampus && campusOptions.value.some((item) => item.value === queryCampus)) {
    campusOrgId.value = queryCampus
  } else {
    void loadCockpit()
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="学校驾驶舱"
        :subtitle="
          campusOrgId
            ? `校区筛选 · 兼课教师按校区分别采集后合并计算`
            : '全校师资与结构合规概览 · 跨校区兼课按身份分校区采集'
        "
      >
        <template #toolbar>
          <UiSelect
            v-model="campusOrgId"
            :options="campusOptions"
            placeholder="按校区筛选"
            allow-clear
            style="min-width: 220px"
          />
        </template>
        <template #actions>
          <UiButton size="sm" @click="goTeacherAnalytics"> 师资分析看板 </UiButton>
          <UiButton size="sm" :loading="loading" @click="loadCockpit">刷新</UiButton>
        </template>
      </ContextBar>
    </template>
    <template #signal>
      <SignalBand
        v-if="cockpit?.summary"
        :metrics="signals"
        layout="spotlight"
        variant="panel"
        compact
        @metric-click="handleSignalMetricClick"
      />
    </template>
    <UiSpin :spinning="loading">
      <UiEmpty
        size="sm"
        v-if="!loading && !cockpit"
        :description="loadError ? '学校驾驶舱加载失败，请重试' : '暂无学校驾驶舱数据'"
      />
      <template v-else-if="cockpit">
        <UiAlertStrip
          v-if="
            cockpit.summary.metricRecomputeStatus
              && cockpit.summary.metricRecomputeStatus !== PortfolioMetricRecomputeStatusCode.READY
          "
          tone="warning"
          size="sm"
          dense
          inline
          :show-icon="false"
          class="school-cockpit__metric-status"
        >
          指标快照{{ portfolioMetricRecomputeStatusLabel(cockpit.summary.metricRecomputeStatus) }}
          <template v-if="cockpit.summary.metricComputedTime">
            · 最近计算 {{ cockpit.summary.metricComputedTime }}
          </template>
        </UiAlertStrip>
        <PortfolioHrMetricDistributionSection
          class="school-cockpit__hr"
          :political-affiliation-distribution="cockpit.summary.politicalAffiliationDistribution"
          :education-degree-distribution="cockpit.summary.educationDegreeDistribution"
          :age-band-distribution="cockpit.summary.ageBandDistribution"
          :tenure-band-distribution="cockpit.summary.tenureBandDistribution"
          :retirement-window-distribution="cockpit.summary.retirementWindowDistribution"
          :post-category-distribution="cockpit.summary.postCategoryDistribution"
        />
        <UiCard
          v-if="openComplianceAlerts.length"
          title="结构合规预警"
          class="school-cockpit__compliance"
        >
          <ul class="school-cockpit__alert-list">
            <li
              v-for="item in openComplianceAlerts"
              :key="item.id"
              class="school-cockpit__alert-item"
            >
              <div class="school-cockpit__alert-head">
                <div class="school-cockpit__alert-title">
                  <strong>{{ complianceTypeLabel(item.alertType) }}</strong>
                  <UiTag tone="blue">
                    {{ scopeTypeLabel(item.scopeType) }}
                  </UiTag>
                  <UiTag v-if="item.departmentName" tone="gray">
                    {{ item.departmentName }}
                  </UiTag>
                </div>
                <UiTag tone="red">
                  {{ alertStatusLabel(item.alertStatus) }}
                </UiTag>
              </div>
              <p>{{ item.alertSummary }}</p>
              <p class="school-cockpit__alert-meta">
                当前 {{ item.currentValue }} · 阈值 {{ item.thresholdValue }} ·
                {{ item.computedTime }}
              </p>
            </li>
          </ul>
        </UiCard>
        <PortfolioCockpitAskPanel
          :school-scope-only="true"
          :initial-task-id="deepLinkTaskId || undefined"
        />
      </template>
    </UiSpin>
  </StageWorkbenchShell>
</template>

<style scoped>
.school-cockpit__compliance,
.school-cockpit__hr,
.school-cockpit__metric-status {
  margin-bottom: var(--dp-space-block);
}

.school-cockpit__alert-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.school-cockpit__alert-item + .school-cockpit__alert-item {
  margin-top: var(--dp-space-component);
  padding-top: var(--dp-space-component);
  border-top: 1px solid var(--dp-border);
}

.school-cockpit__alert-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component-xs);
}

.school-cockpit__alert-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}

.school-cockpit__alert-meta {
  margin: var(--dp-space-component-xs) 0 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
</style>
