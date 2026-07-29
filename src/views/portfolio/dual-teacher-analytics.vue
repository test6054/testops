<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDualTeacherApplicationStatusCode } from '@/apis/portfolio/enums'
import type { PortfolioDualTeacherAnalyticsVO } from '@/apis/portfolio/teacher-platform'
import type { PortfolioDualTeacherCertLevelCode } from '@/types/enums/portfolio-dual-teacher-cert-level-enum'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { PortfolioDualTeacherApplicationStatusDescription } from '@/apis/portfolio/enums'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUserStore } from '@/stores/modules/user'
import { PORTFOLIO_DUAL_TEACHER_CERT_LEVEL_LABEL } from '@/types/enums/portfolio-dual-teacher-cert-level-enum'
import { showUserError } from '@/utils/error-handler'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'

const route = useRoute()
const userStore = useUserStore()
/** 院系路由或非租户管理员：本院系双师群体分析口径（PRD §7.12 / PF-P0-419） */
const isDepartmentScoped = computed(
  () => route.path.includes('/department/') || !userStore.isTenantAdmin,
)
const pageTitle = computed(() => (isDepartmentScoped.value ? '院系双师分析' : '双师认定分析'))
const loading = ref(false)
const stats = ref<PortfolioDualTeacherAnalyticsVO | null>(null)
const loadFailed = ref(false)
const requestToken = ref(0)

const DualTeacherAnalyticsSignalMetrics = computed<SignalMetric[]>(() => {
  if (loadFailed.value && !stats.value) {
    return []
  }
  if (!stats.value) {
    return []
  }
  const metrics: SignalMetric[] = [
    {
      key: 'total',
      label: '申请总数',
      value: stats.value.totalCount,
      clickable: true,
    },
    {
      key: 'approved',
      label: '认定通过',
      value: stats.value.approvedCount,
    },
  ]
  if (stats.value.dualTeacherRatioPercent != null) {
    metrics.push({
      key: 'ratio',
      label: '在岗双师占比',
      value: stats.value.dualTeacherRatioPercent,
      unit: '%',
    })
  }
  return applySpotlightEmphasis(metrics, {
    primaryKey: 'total',
    actionLabel: '刷新',
  })
})

const pageSubtitle = computed(() => {
  if (loadFailed.value) {
    return '加载失败'
  }
  if (!stats.value) {
    return loading.value ? '加载中' : '暂无数据'
  }
  return `申请 ${stats.value.totalCount} · 通过 ${stats.value.approvedCount}`
})

function onDualTeacherAnalyticsSignalClick(_key: string) {
  void loadStats()
}

const statusColumns: ColumnsType = [
  { title: '状态', dataIndex: 'applicationStatus', key: 'applicationStatus' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88, align: 'right' },
]

const certLevelColumns: ColumnsType = [
  { title: '等级', dataIndex: 'certLevel', key: 'certLevel' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88, align: 'right' },
]

const departmentColumns: ColumnsType = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '在岗双师', dataIndex: 'count', key: 'count', width: 100, align: 'right' },
]

const certYearColumns: ColumnsType = [
  { title: '认定年份', dataIndex: 'certYear', key: 'certYear' },
  { title: '通过教师数', dataIndex: 'count', key: 'count', width: 110, align: 'right' },
]

function applicationStatusLabel(status: PortfolioDualTeacherApplicationStatusCode): string {
  return strictEnumLabel(
    PortfolioDualTeacherApplicationStatusDescription,
    status,
    '双师认定申请状态',
  )
}

async function loadStats() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  loading.value = true
  loadFailed.value = false
  stats.value = null
  try {
    const nextStats = await portfolioDualTeacherApi.analyticsStats()
    if (requestToken.value !== currentToken) {
      return
    }
    stats.value = nextStats
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    loadFailed.value = true
    showUserError(error, '加载双师认定统计失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

onMounted(loadStats)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" :title="pageTitle" :subtitle="pageSubtitle">
        <template #actions>
          <UiButton size="sm" :loading="loading" @click="loadStats">刷新</UiButton>
        </template>
      </ContextBar>
    </template>
    <template v-if="DualTeacherAnalyticsSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="DualTeacherAnalyticsSignalMetrics"
        @metric-click="onDualTeacherAnalyticsSignalClick"
      />
    </template>
    <UiSpin :spinning="loading">
      <UiEmpty
        size="sm"
        v-if="!loading && !stats"
        :description="loadFailed ? '双师分析数据加载失败' : '暂无双师分析数据'"
      />
      <div v-else-if="stats" class="grid">
        <UiCard title="在岗结构双师比例">
          <p>在岗教师 {{ stats.structureTeacherCount ?? 0 }}</p>
          <p>在岗双师 {{ stats.structureDualTeacherCount ?? 0 }}</p>
          <p>双师比例 {{ stats.dualTeacherRatioPercent ?? 0 }}%</p>
        </UiCard>
        <UiCard title="按状态">
          <UiDataTable
            :columns="statusColumns"
            :data-source="stats.statusCounts"
            row-key="applicationStatus"
            size="small"
            flat
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :total="stats.statusCounts.length"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'applicationStatus'">
                {{ applicationStatusLabel(record.applicationStatus) }}
              </template>
            </template>
          </UiDataTable>
        </UiCard>
        <UiCard title="通过等级">
          <UiDataTable
            :columns="certLevelColumns"
            :data-source="stats.certLevelCounts"
            row-key="certLevel"
            size="small"
            flat
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :total="stats.certLevelCounts.length"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'certLevel'">
                {{
                  record.certLevel
                    ? (PORTFOLIO_DUAL_TEACHER_CERT_LEVEL_LABEL[record.certLevel as PortfolioDualTeacherCertLevelCode] ?? record.certLevel)
                    : '-'
                }}
              </template>
            </template>
          </UiDataTable>
        </UiCard>
        <UiCard title="院系分布（在岗）">
          <UiDataTable
            :columns="departmentColumns"
            :data-source="stats.departmentCounts || []"
            row-key="departmentId"
            size="small"
            flat
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :total="(stats.departmentCounts || []).length"
          />
        </UiCard>
        <UiCard title="认定年份变化">
          <UiDataTable
            :columns="certYearColumns"
            :data-source="stats.certYearCounts || []"
            row-key="certYear"
            size="small"
            flat
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :total="(stats.certYearCounts || []).length"
          />
        </UiCard>
      </div>
    </UiSpin>
  </StageWorkbenchShell>
</template>

<style scoped>
.grid {
  display: grid;
  gap: var(--dp-space-component);
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
</style>
