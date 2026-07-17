<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioDualTeacherApplicationStatusCode,
  PortfolioKeyTeacherRegistryStatusCode,
} from '@/apis/portfolio/enums'
import type { PortfolioDeptStructureStatVO } from '@/apis/portfolio/teacher'
import type {
  PortfolioDoubleDutyAnalyticsVO,
  PortfolioDualTeacherAnalyticsVO,
  PortfolioExternalTeacherStatsVO,
} from '@/apis/portfolio/teacher-platform'
import type { PortfolioCockpitSummaryVO } from '@/apis/portfolio/types'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioCockpitApi } from '@/apis/portfolio/cockpit'
import {
  PortfolioCompletenessLevelCode,
  PortfolioDualTeacherApplicationStatusDescription,
  PortfolioKeyTeacherRegistryStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  portfolioDoubleDutyApi,
  portfolioDualTeacherApi,
  portfolioExternalTeacherApi,
} from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const router = useRouter()
const deptStats = ref<PortfolioDeptStructureStatVO | null>(null)
const schoolSummary = ref<PortfolioCockpitSummaryVO | null>(null)
const dualStats = ref<PortfolioDualTeacherAnalyticsVO | null>(null)
const doubleDutyStats = ref<PortfolioDoubleDutyAnalyticsVO | null>(null)
const externalStats = ref<PortfolioExternalTeacherStatsVO | null>(null)
const loadFailed = ref(false)
const requestToken = ref(0)

const deptColumns: ColumnsType = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '教师数', dataIndex: 'teacherCount', key: 'teacherCount', width: 88, align: 'right' },
]

const statusColumns: ColumnsType = [
  { title: '状态', dataIndex: 'applicationStatus', key: 'applicationStatus' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88, align: 'right' },
]

const dimensionColumns: ColumnsType = [
  { title: '维度', dataIndex: 'dimensionCode', key: 'dimensionCode' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88, align: 'right' },
]

const certColumns: ColumnsType = [
  { title: '认定等级', dataIndex: 'certLevel', key: 'certLevel' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88, align: 'right' },
]

const doubleDutyStatusColumns: ColumnsType = [
  { title: '台账状态', dataIndex: 'registryStatus', key: 'registryStatus' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88, align: 'right' },
]

const appointYearColumns: ColumnsType = [
  { title: '任命年度', dataIndex: 'appointYear', key: 'appointYear' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88, align: 'right' },
]

function applicationStatusLabel(status: PortfolioDualTeacherApplicationStatusCode): string {
  return strictEnumLabel(
    PortfolioDualTeacherApplicationStatusDescription,
    status,
    '双师认定申请状态',
  )
}

function registryStatusLabel(status: PortfolioKeyTeacherRegistryStatusCode): string {
  return strictEnumLabel(PortfolioKeyTeacherRegistryStatusDescription, status, '台账状态')
}

const completenessDistributionRows: Array<{
  key: PortfolioCompletenessLevelCode
  label: string
  summaryKey:
    | 'completenessCompleteCount'
    | 'completenessBasicCount'
    | 'completenessPendingCount'
    | 'completenessSevereCount'
}> = [
  {
    key: PortfolioCompletenessLevelCode.COMPLETE,
    label: '完整',
    summaryKey: 'completenessCompleteCount',
  },
  {
    key: PortfolioCompletenessLevelCode.BASIC,
    label: '基本完整',
    summaryKey: 'completenessBasicCount',
  },
  {
    key: PortfolioCompletenessLevelCode.PENDING,
    label: '待补充',
    summaryKey: 'completenessPendingCount',
  },
  {
    key: PortfolioCompletenessLevelCode.SEVERE,
    label: '严重缺失',
    summaryKey: 'completenessSevereCount',
  },
]

function distributionCount(
  summary: PortfolioCockpitSummaryVO,
  key: (typeof completenessDistributionRows)[number]['summaryKey'],
): number {
  return summary[key] ?? 0
}

function goTeacherDirectory(completenessLevel: PortfolioCompletenessLevelCode) {
  void router.push({
    path: '/portfolio/teachers',
    query: { completenessLevel },
  })
}

async function loadAll() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  loading.value = true
  loadFailed.value = false
  deptStats.value = null
  schoolSummary.value = null
  dualStats.value = null
  doubleDutyStats.value = null
  externalStats.value = null
  const sections: Array<{
    key: string
    label: string
    load: () => Promise<void>
  }> = [
    {
      key: 'dept',
      label: '院系结构统计',
      load: async () => {
        deptStats.value = await portfolioTeacherApi.deptStructureStats()
      },
    },
    {
      key: 'school',
      label: '全校档案汇总',
      load: async () => {
        schoolSummary.value = await portfolioCockpitApi.schoolSummary()
      },
    },
    {
      key: 'dual',
      label: '双师分析',
      load: async () => {
        dualStats.value = await portfolioDualTeacherApi.analyticsStats()
      },
    },
    {
      key: 'doubleDuty',
      label: '双肩挑分析',
      load: async () => {
        doubleDutyStats.value = await portfolioDoubleDutyApi.analyticsStats()
      },
    },
    {
      key: 'external',
      label: '外聘教师统计',
      load: async () => {
        externalStats.value = await portfolioExternalTeacherApi.stats()
      },
    },
  ]
  let anyFailed = false
  try {
    for (const section of sections) {
      try {
        await section.load()
        if (requestToken.value !== currentToken) {
          return
        }
      } catch (error) {
        if (requestToken.value !== currentToken) {
          return
        }
        anyFailed = true
        showUserError(error, `${section.label}加载失败`)
      }
    }
    if (requestToken.value === currentToken) {
      loadFailed.value = anyFailed
        && !deptStats.value
        && !schoolSummary.value
        && !dualStats.value
        && !doubleDutyStats.value
        && !externalStats.value
    }
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

onMounted(loadAll)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="师资分析看板" subtitle="院系结构 · 档案完整度 · 五框架 · 双师 · 外聘">
      <template #actions>
        <UiButton size="sm" :loading="loading" @click="loadAll">刷新</UiButton>
      </template>
    </ContextBar>
    <UiSpin :spinning="loading">
      <UiEmpty
        size="sm"
        v-if="!loading && !deptStats && !dualStats && !externalStats && !schoolSummary"
        :description="loadFailed ? '师资分析数据加载失败' : '暂无师资分析数据'"
      />
      <div v-else class="grid">
        <UiCard v-if="schoolSummary" title="全校档案完整度与五框架">
          <div class="analytics-completeness">
            <button
              v-for="item in completenessDistributionRows"
              :key="item.key"
              type="button"
              class="analytics-completeness__chip"
              @click="goTeacherDirectory(item.key)"
            >
              {{ item.label }} {{ distributionCount(schoolSummary, item.summaryKey) }}
            </button>
          </div>
          <UiStatPanel
            :items="[
              ...(schoolSummary.courseArchiveFrameworkSlotTotal
                ? [
                  {
                    key: 'framework',
                    label: `${schoolSummary.currentAcademicYear ?? '本学年'} 五框架`,
                    value: String(schoolSummary.courseArchiveFrameworkSlotDone ?? 0),
                    unit: `/${schoolSummary.courseArchiveFrameworkSlotTotal ?? 0}`,
                    tone: 'blue' as const,
                  },
                ]
                : []),
              ...(schoolSummary.courseArchiveFullyCompleteCount != null
                ? [
                  {
                    key: 'fullyComplete',
                    label: '齐备课程',
                    value: String(schoolSummary.courseArchiveFullyCompleteCount),
                    unit: '门',
                    tone: 'green' as const,
                  },
                ]
                : []),
            ]"
            :columns="2"
            variant="grid"
            compact
          />
        </UiCard>
        <UiCard v-if="deptStats" title="院系教师结构">
          <UiStatPanel
            :items="[
              {
                key: 'total',
                label: '教师总数',
                value: String(deptStats.totalTeacherCount),
                tone: 'blue',
              },
              { key: 'dept', label: '院系数', value: String(deptStats.departments.length) },
            ]"
            :columns="2"
            variant="grid"
            compact
          />
          <UiDataTable
            :columns="deptColumns"
            :data-source="deptStats.departments"
            row-key="departmentId"
            size="small"
            flat
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :total="deptStats.departments.length"
            style="margin-top: 16px"
          />
        </UiCard>
        <UiCard v-if="dualStats" title="双师认定">
          <UiStatPanel
            :items="[
              { key: 'total', label: '申请总数', value: String(dualStats.totalCount) },
              {
                key: 'approved',
                label: '认定通过',
                value: String(dualStats.approvedCount),
                tone: 'green',
              },
            ]"
            :columns="2"
            variant="grid"
            compact
          />
          <UiDataTable
            :columns="statusColumns"
            :data-source="dualStats.statusCounts"
            row-key="applicationStatus"
            size="small"
            flat
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :total="dualStats.statusCounts.length"
            style="margin-top: 16px"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'applicationStatus'">
                {{ applicationStatusLabel(record.applicationStatus) }}
              </template>
            </template>
          </UiDataTable>
          <UiDataTable
            v-if="dualStats.certLevelCounts.length"
            :columns="certColumns"
            :data-source="dualStats.certLevelCounts"
            row-key="certLevel"
            size="small"
            flat
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :total="dualStats.certLevelCounts.length"
            style="margin-top: 16px"
          />
        </UiCard>
        <UiCard v-if="doubleDutyStats" title="双肩挑台账">
          <UiStatPanel
            :items="[
              { key: 'total', label: '台账总数', value: String(doubleDutyStats.totalCount) },
              {
                key: 'active',
                label: '在册',
                value: String(doubleDutyStats.activeCount),
                tone: 'green',
              },
            ]"
            :columns="2"
            variant="grid"
            compact
          />
          <UiDataTable
            :columns="doubleDutyStatusColumns"
            :data-source="doubleDutyStats.statusCounts"
            row-key="registryStatus"
            size="small"
            flat
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :total="doubleDutyStats.statusCounts.length"
            style="margin-top: 16px"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'registryStatus'">
                {{ registryStatusLabel(record.registryStatus) }}
              </template>
            </template>
          </UiDataTable>
          <UiDataTable
            v-if="doubleDutyStats.appointYearCounts.length"
            :columns="appointYearColumns"
            :data-source="doubleDutyStats.appointYearCounts"
            row-key="appointYear"
            size="small"
            flat
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :total="doubleDutyStats.appointYearCounts.length"
            style="margin-top: 16px"
          />
        </UiCard>
        <UiCard v-if="externalStats" title="外聘教师">
          <UiDataTable
            :columns="dimensionColumns"
            :data-source="externalStats.contractStatusCounts"
            row-key="dimensionCode"
            size="small"
            flat
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :total="externalStats.contractStatusCounts.length"
            style="margin-bottom: 16px"
          />
          <UiDataTable
            :columns="dimensionColumns"
            :data-source="externalStats.teacherSourceCounts"
            row-key="dimensionCode"
            size="small"
            flat
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :total="externalStats.teacherSourceCounts.length"
          />
        </UiCard>
      </div>
    </UiSpin>
  </StageWorkbenchShell>
</template>

<style scoped>
.grid {
  display: grid;
  gap: var(--dp-space-3, 12px);
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.analytics-completeness {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.analytics-completeness__chip {
  padding: 4px 10px;
  border: 1px solid var(--dp-border);
  border-radius: 4px;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
}
.analytics-completeness__chip:hover {
  border-color: var(--dp-color-primary);
  color: var(--dp-color-primary);
}
</style>
