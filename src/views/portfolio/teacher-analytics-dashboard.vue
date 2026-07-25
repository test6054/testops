<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioDualTeacherApplicationStatusCode,
  PortfolioKeyTeacherRegistryStatusCode,
  PortfolioKeyTeacherRegistryTypeCode,
} from '@/apis/portfolio/enums'
import type { PortfolioDeptStructureStatVO } from '@/apis/portfolio/teacher'
import type {
  PortfolioDoubleDutyAnalyticsVO,
  PortfolioDualTeacherAnalyticsVO,
  PortfolioExternalTeacherStatsVO,
  PortfolioKeyTeacherAnalyticsVO,
} from '@/apis/portfolio/teacher-platform'
import type { PortfolioCockpitSummaryVO } from '@/apis/portfolio/types'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioCockpitApi } from '@/apis/portfolio/cockpit'
import {
  PortfolioCompletenessLevelCode,
  PortfolioDualTeacherApplicationStatusDescription,
  PortfolioKeyTeacherRegistryStatusDescription,
  PortfolioKeyTeacherRegistryTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  portfolioDoubleDutyApi,
  portfolioDualTeacherApi,
  portfolioExternalTeacherApi,
  portfolioKeyTeacherApi,
} from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
/** 院系路由或非租户管理员：院系群体分析口径（PRD §7.12） */
const isDepartmentScoped = computed(
  () => route.path.includes('/department/') || !userStore.isTenantAdmin,
)
const pageTitle = '师资分析驾驶舱'
const pageSubtitle = '院系师资结构、双师与双岗、外聘教师统计'

const deptStats = ref<PortfolioDeptStructureStatVO | null>(null)
const schoolSummary = ref<PortfolioCockpitSummaryVO | null>(null)
const dualStats = ref<PortfolioDualTeacherAnalyticsVO | null>(null)
const doubleDutyStats = ref<PortfolioDoubleDutyAnalyticsVO | null>(null)
const keyTeacherStats = ref<PortfolioKeyTeacherAnalyticsVO | null>(null)
const externalStats = ref<PortfolioExternalTeacherStatsVO | null>(null)
const loadFailed = ref(false)
const requestToken = ref(0)

/** 顶部 KPI 摘要：专任教师总数、双师教师、双岗教师、外聘教师 */
const kpiStats = computed(() => {
  const items: Array<{ key: string, label: string, value: number, hint: string }> = []
  if (deptStats.value) {
    items.push({
      key: 'totalTeachers',
      label: '专任教师总数',
      value: deptStats.value.totalTeacherCount,
      hint: `${deptStats.value.departments.length} 个院系`,
    })
  }
  if (dualStats.value) {
    items.push({
      key: 'dualTeachers',
      label: '双师教师',
      value: dualStats.value.structureDualTeacherCount ?? 0,
      hint: `占比 ${dualStats.value.dualTeacherRatioPercent ?? 0}%`,
    })
  }
  if (doubleDutyStats.value) {
    items.push({
      key: 'doubleDutyTeachers',
      label: '双岗教师',
      value: doubleDutyStats.value.structureDoubleDutyCount ?? 0,
      hint: `占比 ${doubleDutyStats.value.doubleDutyRatioPercent ?? 0}%`,
    })
  }
  if (externalStats.value) {
    items.push({
      key: 'externalTeachers',
      label: '外聘教师',
      value: externalStats.value.totalCount ?? 0,
      hint: `在册有效 ${externalStats.value.activeCount ?? 0}`,
    })
  }
  return items
})

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

const dualDepartmentColumns: ColumnsType = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '在岗双师', dataIndex: 'count', key: 'count', width: 100, align: 'right' },
]

const dualCertYearColumns: ColumnsType = [
  { title: '认定年份', dataIndex: 'certYear', key: 'certYear' },
  { title: '通过教师数', dataIndex: 'count', key: 'count', width: 110, align: 'right' },
]

const doubleDutyStatusColumns: ColumnsType = [
  { title: '台账状态', dataIndex: 'registryStatus', key: 'registryStatus' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88, align: 'right' },
]

const appointYearColumns: ColumnsType = [
  { title: '任命年度', dataIndex: 'appointYear', key: 'appointYear' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88, align: 'right' },
]

const structureDepartmentColumns: ColumnsType = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '在岗人数', dataIndex: 'count', key: 'count', width: 100, align: 'right' },
]

const keyTeacherTypeColumns: ColumnsType = [
  { title: '类型', dataIndex: 'registryType', key: 'registryType' },
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

function registryTypeLabel(type: PortfolioKeyTeacherRegistryTypeCode): string {
  return strictEnumLabel(PortfolioKeyTeacherRegistryTypeDescription, type, '重点教师名录类型')
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
  keyTeacherStats.value = null
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
      label: isDepartmentScoped.value ? '院系档案汇总' : '全校档案汇总',
      load: async () => {
        if (isDepartmentScoped.value) {
          schoolSummary.value = await portfolioCockpitApi.deptSummary({})
        } else {
          schoolSummary.value = await portfolioCockpitApi.schoolSummary()
        }
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
      key: 'keyTeacher',
      label: '骨干/带头人分析',
      load: async () => {
        keyTeacherStats.value = await portfolioKeyTeacherApi.analyticsStats()
      },
    },
    {
      key: 'external',
      label: '外聘教师统计',
      load: async () => {
        // 外聘台账 stats 仍为 tenantWide 管理口径；院系看板不请求以免越权失败整页红
        if (isDepartmentScoped.value) {
          externalStats.value = null
          return
        }
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
        && !keyTeacherStats.value
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
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="pageTitle"
        :subtitle="pageSubtitle"
      >
        <template #actions>
          <UiButton size="sm" :loading="loading" @click="loadAll">刷新</UiButton>
        </template>
      </ContextBar>
    </template>
    <UiSpin :spinning="loading">
      <UiEmpty
        size="sm"
        v-if="!loading && !deptStats && !dualStats && !doubleDutyStats && !keyTeacherStats && !externalStats && !schoolSummary"
        :description="loadFailed ? '师资分析数据加载失败' : '暂无师资分析数据'"
      />
      <template v-else>
        <!-- 顶部 KPI 摘要 -->
        <div v-if="kpiStats.length" class="kpi-strip">
          <div v-for="item in kpiStats" :key="item.key" class="kpi-panel">
            <div class="kpi-panel__label">{{ item.label }}</div>
            <div class="kpi-panel__value">{{ item.value }}</div>
            <div class="kpi-panel__hint">{{ item.hint }}</div>
          </div>
        </div>
        <div class="grid">
          <UiCard v-if="schoolSummary" :title="isDepartmentScoped ? '院系档案完整度与五框架' : '全校档案完整度与五框架'">
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
          <UiCard v-if="deptStats" title="院系师资结构">
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
            />
          </UiCard>
          <UiCard v-if="dualStats" title="双师认定等级分布">
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
            />
            <UiEmpty v-else size="sm" description="暂无认定等级数据" />
          </UiCard>
          <UiCard v-if="dualStats" title="双师申请状态">
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
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'applicationStatus'">
                  {{ applicationStatusLabel(record.applicationStatus) }}
                </template>
              </template>
            </UiDataTable>
          </UiCard>
          <UiCard v-if="dualStats && (dualStats.certYearCounts || []).length" title="双师认定年份趋势">
            <UiDataTable
              :columns="dualCertYearColumns"
              :data-source="dualStats.certYearCounts || []"
              row-key="certYear"
              size="small"
              flat
              pagination-mode="none"
              :show-pagination="false"
              :sticky-header="false"
              :total="(dualStats.certYearCounts || []).length"
            />
          </UiCard>
          <UiCard v-if="dualStats && (dualStats.departmentCounts || []).length" title="各院系在岗双师">
            <UiDataTable
              :columns="dualDepartmentColumns"
              :data-source="dualStats.departmentCounts || []"
              row-key="departmentId"
              size="small"
              flat
              pagination-mode="none"
              :show-pagination="false"
              :sticky-header="false"
              :total="(dualStats.departmentCounts || []).length"
            />
          </UiCard>
          <UiCard v-if="doubleDutyStats" title="双岗教师台账状态">
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
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'registryStatus'">
                  {{ registryStatusLabel(record.registryStatus) }}
                </template>
              </template>
            </UiDataTable>
          </UiCard>
          <UiCard v-if="doubleDutyStats && doubleDutyStats.appointYearCounts.length" title="双岗任命年度趋势">
            <UiDataTable
              :columns="appointYearColumns"
              :data-source="doubleDutyStats.appointYearCounts"
              row-key="appointYear"
              size="small"
              flat
              pagination-mode="none"
              :show-pagination="false"
              :sticky-header="false"
              :total="doubleDutyStats.appointYearCounts.length"
            />
          </UiCard>
          <UiCard v-if="doubleDutyStats && (doubleDutyStats.departmentCounts || []).length" title="各院系在岗双岗">
            <UiDataTable
              :columns="structureDepartmentColumns"
              :data-source="doubleDutyStats.departmentCounts || []"
              row-key="departmentId"
              size="small"
              flat
              pagination-mode="none"
              :show-pagination="false"
              :sticky-header="false"
              :total="(doubleDutyStats.departmentCounts || []).length"
            />
          </UiCard>
          <UiCard v-if="keyTeacherStats" title="骨干 / 专业带头人">
            <UiStatPanel
              :items="[
                { key: 'total', label: '台账总数', value: String(keyTeacherStats.totalCount) },
                {
                  key: 'active',
                  label: '在册',
                  value: String(keyTeacherStats.activeCount),
                  tone: 'green',
                },
                {
                  key: 'structureTeachers',
                  label: '在岗教师',
                  value: String(keyTeacherStats.structureTeacherCount ?? 0),
                },
                {
                  key: 'structureKey',
                  label: '在岗骨干',
                  value: String(keyTeacherStats.structureKeyTeacherCount ?? 0),
                  tone: 'green',
                },
                {
                  key: 'keyRatio',
                  label: '骨干比例%',
                  value: String(keyTeacherStats.keyTeacherRatioPercent ?? 0),
                  tone: 'blue',
                },
                {
                  key: 'structureLeader',
                  label: '在岗带头人',
                  value: String(keyTeacherStats.structureProgramLeaderCount ?? 0),
                  tone: 'green',
                },
                {
                  key: 'leaderRatio',
                  label: '带头人比例%',
                  value: String(keyTeacherStats.programLeaderRatioPercent ?? 0),
                  tone: 'blue',
                },
              ]"
              :columns="3"
              variant="grid"
              compact
            />
            <UiDataTable
              :columns="doubleDutyStatusColumns"
              :data-source="keyTeacherStats.statusCounts"
              row-key="registryStatus"
              size="small"
              flat
              pagination-mode="none"
              :show-pagination="false"
              :sticky-header="false"
              :total="keyTeacherStats.statusCounts.length"
              style="margin-top: 16px"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'registryStatus'">
                  {{ registryStatusLabel(record.registryStatus) }}
                </template>
              </template>
            </UiDataTable>
            <UiDataTable
              v-if="(keyTeacherStats.typeCounts || []).length"
              :columns="keyTeacherTypeColumns"
              :data-source="keyTeacherStats.typeCounts || []"
              row-key="registryType"
              size="small"
              flat
              pagination-mode="none"
              :show-pagination="false"
              :sticky-header="false"
              :total="(keyTeacherStats.typeCounts || []).length"
              style="margin-top: 16px"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'registryType'">
                  {{ registryTypeLabel(record.registryType) }}
                </template>
              </template>
            </UiDataTable>
            <UiDataTable
              v-if="(keyTeacherStats.keyTeacherDepartmentCounts || []).length"
              :columns="structureDepartmentColumns"
              :data-source="keyTeacherStats.keyTeacherDepartmentCounts || []"
              row-key="departmentId"
              size="small"
              flat
              pagination-mode="none"
              :show-pagination="false"
              :sticky-header="false"
              :total="(keyTeacherStats.keyTeacherDepartmentCounts || []).length"
              style="margin-top: 16px"
            />
          </UiCard>
          <UiCard v-if="externalStats" title="外聘教师">
            <UiStatPanel
              :items="[
                {
                  key: 'total',
                  label: '筛选总数',
                  value: String(externalStats.totalCount ?? 0),
                },
                {
                  key: 'active',
                  label: '在册有效',
                  value: String(externalStats.activeCount ?? 0),
                  tone: 'green',
                },
                {
                  key: 'avgContribution',
                  label: '贡献度均值',
                  value: String(externalStats.avgContributionScore ?? 0),
                  tone: 'blue',
                },
                {
                  key: 'campusTitle',
                  label: '校内职称可用',
                  value: externalStats.usableForCampusTitleEvaluation === false ? '否' : '—',
                },
              ]"
              :columns="2"
              variant="grid"
              compact
            />
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
              style="margin-top: 16px; margin-bottom: 16px"
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
      </template>
    </UiSpin>
  </StageWorkbenchShell>
</template>

<style scoped>
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--dp-space-4, 16px);
  margin-bottom: var(--dp-space-4, 16px);
}
.kpi-panel {
  background: var(--dp-surface, #fff);
  border: 1px solid var(--dp-border-subtle, #eef0f2);
  border-radius: var(--dp-radius-panel, 8px);
  box-shadow: var(--dp-shadow-xs, 0 1px 2px rgba(26, 35, 50, 0.04));
  padding: var(--dp-space-4, 16px) var(--dp-space-5, 20px);
}
.kpi-panel__label {
  font-size: var(--dp-font-size-xs, 12px);
  color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
}
.kpi-panel__value {
  font-size: 22px;
  font-weight: 700;
  color: var(--dp-text-primary, rgba(0, 0, 0, 0.88));
  line-height: 1.2;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}
.kpi-panel__hint {
  font-size: var(--dp-font-size-xxs);
  color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
  margin-top: 4px;
}
.grid {
  display: grid;
  gap: var(--dp-space-4, 16px);
  grid-template-columns: repeat(2, 1fr);
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
  border-radius: var(--dp-radius-xs);
  background: transparent;
  font-size: var(--dp-font-size-sm);
  cursor: pointer;
}
.analytics-completeness__chip:hover {
  border-color: var(--dp-color-primary);
  color: var(--dp-color-primary);
}
</style>
