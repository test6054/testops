<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDualTeacherApplicationStatusCode } from '@/apis/portfolio/enums'
import { PortfolioDualTeacherApplicationStatusDescription } from '@/apis/portfolio/enums'
import type { PortfolioDualTeacherAnalyticsVO } from '@/apis/portfolio/teacher-platform'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import { onMounted, ref } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const stats = ref<PortfolioDualTeacherAnalyticsVO | null>(null)
const loadFailed = ref(false)
const requestToken = ref(0)

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
    showUserError(error)
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
      <ContextBar show-title layout="workbench" title="双师认定分析">
        <template #actions>
          <UiButton :loading="loading" @click="loadStats">刷新</UiButton>
        </template>
      </ContextBar>
    </template>
    <a-spin :spinning="loading">
      <UiEmpty
        v-if="!loading && !stats"
        :description="loadFailed ? '双师分析数据加载失败' : '暂无双师分析数据'"
      />
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
