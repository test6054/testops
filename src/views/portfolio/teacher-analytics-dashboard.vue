<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioDualTeacherApplicationStatusCode,
  PortfolioKeyTeacherRegistryStatusCode,
} from '@/apis/portfolio/enums'
import {
  PortfolioDualTeacherApplicationStatusDescription,
  PortfolioKeyTeacherRegistryStatusDescription,
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
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
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
