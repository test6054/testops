<script setup lang="ts">
import type { PortfolioSchoolPortraitCockpitVO } from '@/apis/portfolio/analysis'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import type { PortfolioComplianceAlertTypeCode } from '@/types/enums/portfolio-compliance-alert-type-enum'
import { PortfolioComplianceAlertTypeDescription } from '@/types/enums/portfolio-compliance-alert-type-enum'
import type { PortfolioComplianceScopeTypeCode } from '@/types/enums/portfolio-compliance-scope-type-enum'
import { PortfolioComplianceScopeTypeDescription } from '@/types/enums/portfolio-compliance-scope-type-enum'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  PortfolioAlertStatusCode,
  PortfolioAlertStatusDescription,
} from '@/types/enums/portfolio-alert-status-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioCockpitAskPanel from '@/views/portfolio/components/PortfolioCockpitAskPanel.vue'

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const loadError = ref(false)
const requestToken = ref(0)
const cockpit = ref<PortfolioSchoolPortraitCockpitVO | null>(null)
const deepLinkTaskId = computed(() => readRouteStringParam(route.query.taskId))

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
  if ((summary.courseArchiveFrameworkSlotTotal ?? 0) > 0) {
    items.push({
      key: 'courseArchive',
      label: `${summary.currentAcademicYear ?? '本学年'} 五框架`,
      value: summary.courseArchiveFrameworkSlotDone ?? 0,
      unit: `/${summary.courseArchiveFrameworkSlotTotal ?? 0}`,
      tone:
        (summary.courseArchiveFrameworkSlotDone ?? 0) >=
        (summary.courseArchiveFrameworkSlotTotal ?? 0)
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

function alertStatusLabel(code: string): string {
  return strictEnumLabel(
    PortfolioAlertStatusDescription,
    code as PortfolioAlertStatusCode,
    '预警状态',
  )
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
    const result = await portfolioAnalysisApi.getSchoolPortraitCockpit()
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

onMounted(() => {
  void loadCockpit()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="学校驾驶舱"
        subtitle="全校师资与结构合规概览"
      >
        <template #actions>
          <UiButton @click="goTeacherAnalytics"> 师资分析看板 </UiButton>
          <UiButton :loading="loading" @click="loadCockpit">刷新</UiButton>
        </template>
      </ContextBar>
    </template>
    <template #signal>
      <SignalBand
        v-if="cockpit?.summary"
        :metrics="signals"
        compact
        @metric-click="handleSignalMetricClick"
      />
    </template>
    <a-spin :spinning="loading">
      <UiEmpty
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
    </a-spin>
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
  border-top: 1px solid var(--dp-border, #f0f0f0);
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
  color: var(--dp-text-secondary, #666);
}
</style>
