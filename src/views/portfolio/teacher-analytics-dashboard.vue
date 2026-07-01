<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioDualTeacherApplicationStatus,
  PortfolioKeyTeacherRegistryStatus,
} from '@/apis/portfolio/enums'
import {
  PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_LABEL,
  PORTFOLIO_KEY_TEACHER_REGISTRY_STATUS_LABEL,
} from '@/apis/portfolio/enums'
import type { PortfolioDeptStructureStatVO } from '@/apis/portfolio/teacher'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import type {
  PortfolioDoubleDutyAnalyticsVO,
  PortfolioDualTeacherAnalyticsVO,
  PortfolioExternalTeacherStatsVO,
} from '@/apis/portfolio/teacher-platform'
import {
  portfolioDoubleDutyApi,
  portfolioDualTeacherApi,
  portfolioExternalTeacherApi,
} from '@/apis/portfolio/teacher-platform'
import { onMounted, ref } from 'vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const deptStats = ref<PortfolioDeptStructureStatVO | null>(null)
const dualStats = ref<PortfolioDualTeacherAnalyticsVO | null>(null)
const doubleDutyStats = ref<PortfolioDoubleDutyAnalyticsVO | null>(null)
const externalStats = ref<PortfolioExternalTeacherStatsVO | null>(null)

const deptColumns: ColumnsType = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '教师数', dataIndex: 'teacherCount', key: 'teacherCount', width: 88 },
]

const statusColumns: ColumnsType = [
  { title: '状态', dataIndex: 'applicationStatus', key: 'applicationStatus' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88 },
]

const dimensionColumns: ColumnsType = [
  { title: '维度', dataIndex: 'dimensionCode', key: 'dimensionCode' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88 },
]

const certColumns: ColumnsType = [
  { title: '认定等级', dataIndex: 'certLevel', key: 'certLevel' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88 },
]

const doubleDutyStatusColumns: ColumnsType = [
  { title: '台账状态', dataIndex: 'registryStatus', key: 'registryStatus' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88 },
]

const appointYearColumns: ColumnsType = [
  { title: '任命年度', dataIndex: 'appointYear', key: 'appointYear' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88 },
]

function applicationStatusLabel(status: PortfolioDualTeacherApplicationStatus): string {
  return strictEnumLabel(
    PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_LABEL,
    status,
    '双师认定申请状态',
  )
}

function registryStatusLabel(status: PortfolioKeyTeacherRegistryStatus): string {
  return strictEnumLabel(PORTFOLIO_KEY_TEACHER_REGISTRY_STATUS_LABEL, status, '台账状态')
}

async function loadAll() {
  loading.value = true
  try {
    const [dept, dual, doubleDuty, external] = await Promise.all([
      portfolioTeacherApi.deptStructureStats(),
      portfolioDualTeacherApi.analyticsStats(),
      portfolioDoubleDutyApi.analyticsStats(),
      portfolioExternalTeacherApi.stats(),
    ])
    deptStats.value = dept
    dualStats.value = dual
    doubleDutyStats.value = doubleDuty
    externalStats.value = external
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="师资分析看板" subtitle="院系结构 · 双师认定 · 双肩挑 · 外聘教师" />
    <a-spin :spinning="loading">
      <UiEmpty
        v-if="!loading && !deptStats && !dualStats && !externalStats"
        description="暂无师资分析数据"
      />
      <div v-else class="grid">
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
          <a-table
            size="small"
            :pagination="false"
            row-key="departmentId"
            :data-source="deptStats.departments"
            :columns="deptColumns"
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
          <a-table
            size="small"
            :pagination="false"
            row-key="applicationStatus"
            :data-source="dualStats.statusCounts"
            :columns="statusColumns"
            style="margin-top: 16px"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'applicationStatus'">
                {{ applicationStatusLabel(record.applicationStatus) }}
              </template>
            </template>
          </a-table>
          <a-table
            v-if="dualStats.certLevelCounts.length"
            size="small"
            :pagination="false"
            row-key="certLevel"
            :data-source="dualStats.certLevelCounts"
            :columns="certColumns"
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
          <a-table
            size="small"
            :pagination="false"
            row-key="registryStatus"
            :data-source="doubleDutyStats.statusCounts"
            :columns="doubleDutyStatusColumns"
            style="margin-top: 16px"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'registryStatus'">
                {{ registryStatusLabel(record.registryStatus) }}
              </template>
            </template>
          </a-table>
          <a-table
            v-if="doubleDutyStats.appointYearCounts.length"
            size="small"
            :pagination="false"
            row-key="appointYear"
            :data-source="doubleDutyStats.appointYearCounts"
            :columns="appointYearColumns"
            style="margin-top: 16px"
          />
        </UiCard>
        <UiCard v-if="externalStats" title="外聘教师">
          <a-table
            size="small"
            :pagination="false"
            row-key="dimensionCode"
            :data-source="externalStats.contractStatusCounts"
            :columns="dimensionColumns"
            style="margin-bottom: 16px"
          />
          <a-table
            size="small"
            :pagination="false"
            row-key="dimensionCode"
            :data-source="externalStats.teacherSourceCounts"
            :columns="dimensionColumns"
          />
        </UiCard>
      </div>
    </a-spin>
  </StageWorkbenchShell>
</template>

<style scoped>
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
</style>
