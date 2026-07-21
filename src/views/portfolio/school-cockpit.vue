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
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioCockpitAskPanel from '@/views/portfolio/components/PortfolioCockpitAskPanel.vue'

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
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
    { key: 'teacher', label: '教师总数', value: summary.teacherCount ?? 0, tone: 'blue' },
    { key: 'dual', label: '双师认定', value: summary.dualTeacherCount ?? 0, tone: 'green' },
    { key: 'key', label: '骨干教师', value: summary.keyTeacherCount ?? 0, tone: 'purple' },
    {
      key: 'achievement',
      label: '成果合计',
      value: summary.achievementTotalCount ?? 0,
      tone: 'orange',
    },
    { key: 'honor', label: '荣誉合计', value: summary.honorTotalCount ?? 0, tone: 'gray' },
    {
      key: 'indicator',
      label: '启用指标',
      value: summary.tenantEnabledIndicatorCount ?? 0,
      tone: 'blue',
    },
  ]
  if ((summary.crossCampusAppointmentTeacherCount ?? 0) > 0) {
    items.push({
      key: 'crossCampus',
      label: '跨校区兼课',
      value: summary.crossCampusAppointmentTeacherCount ?? 0,
      tone: 'purple',
      helper: summary.campusName
        ? `当前校区「${summary.campusName}」内兼课教师`
        : '绑定两个及以上校区身份的教师',
    })
  }
  if ((summary.courseArchiveFrameworkSlotTotal ?? 0) > 0) {
    items.push({
      key: 'courseArchive',
      label: `${summary.currentAcademicYear ?? '本学年'} 五框架`,
      value: summary.courseArchiveFrameworkSlotDone ?? 0,
      unit: `/${summary.courseArchiveFrameworkSlotTotal ?? 0}`,
      tone:
        (summary.courseArchiveFrameworkSlotDone ?? 0)
        >= (summary.courseArchiveFrameworkSlotTotal ?? 0)
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
        value: summary.completenessCompleteCount ?? 0,
        tone: 'green',
        clickable: true,
        helper: '查看全校完整度分布',
      },
      {
        key: 'completenessBasic',
        label: '基本完整',
        value: summary.completenessBasicCount ?? 0,
        tone: 'blue',
        clickable: true,
        helper: '查看全校完整度分布',
      },
      {
        key: 'completenessPending',
        label: '待补充',
        value: summary.completenessPendingCount ?? 0,
        tone: 'orange',
        clickable: true,
        helper: '查看全校完整度分布',
      },
      {
        key: 'completenessSevere',
        label: '严重缺失',
        value: summary.completenessSevereCount ?? 0,
        tone: 'red',
        clickable: true,
        helper: '查看全校完整度分布',
      },
    )
  }
  return items
})

function goTeacherAnalytics() {
  void router.push({ path: '/portfolio/admin/teacher-analytics' })
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
.school-cockpit__compliance {
  margin-bottom: 16px;
}

.school-cockpit__alert-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.school-cockpit__alert-item + .school-cockpit__alert-item {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--dp-border);
}

.school-cockpit__alert-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.school-cockpit__alert-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.school-cockpit__alert-meta {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
</style>
