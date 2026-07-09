<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDualTeacherApplicationStatusCode } from '@/apis/portfolio/enums'
import { PortfolioDualTeacherApplicationStatusDescription } from '@/apis/portfolio/enums'
import type { PortfolioDualTeacherAnalyticsVO } from '@/apis/portfolio/teacher-platform'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import { onMounted, ref } from 'vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const stats = ref<PortfolioDualTeacherAnalyticsVO | null>(null)

const statusColumns: ColumnsType = [
  { title: '状态', dataIndex: 'applicationStatus', key: 'applicationStatus' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88, align: 'right' },
]

const certLevelColumns: ColumnsType = [
  { title: '等级', dataIndex: 'certLevel', key: 'certLevel' },
  { title: '数量', dataIndex: 'count', key: 'count', width: 88, align: 'right' },
]

function applicationStatusLabel(status: PortfolioDualTeacherApplicationStatusCode): string {
  return strictEnumLabel(
    PortfolioDualTeacherApplicationStatusDescription,
    status,
    '双师认定申请状态',
  )
}

async function loadStats() {
  loading.value = true
  try {
    stats.value = await portfolioDualTeacherApi.analyticsStats()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

onMounted(loadStats)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="双师认定分析" />
    </template>
    <a-spin :spinning="loading">
      <UiEmpty v-if="!loading && !stats" description="当前筛选无双师分析数据" />
      <div v-else-if="stats" class="grid">
        <UiCard title="概览">
          <p>申请总数 {{ stats.totalCount }}</p>
          <p>认定通过 {{ stats.approvedCount }}</p>
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
</style>
