<script setup lang="ts">
import type { PortfolioDualTeacherAnalyticsVO } from '@/apis/portfolio/teacher-platform'
import { onMounted, ref } from 'vue'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'

const loading = ref(false)
const stats = ref<PortfolioDualTeacherAnalyticsVO | null>(null)

async function loadStats() {
  loading.value = true
  try {
    stats.value = await portfolioDualTeacherApi.analyticsStats()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

onMounted(loadStats)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="双师认定分析" subtitle="申请状态分布与通过等级结构" />
    <a-spin :spinning="loading">
      <div v-if="stats" class="grid">
        <UiCard title="概览">
          <p>申请总数 {{ stats.totalCount }}</p>
          <p>认定通过 {{ stats.approvedCount }}</p>
        </UiCard>
        <UiCard title="按状态">
          <a-table
            size="small"
            :pagination="false"
            row-key="applicationStatus"
            :data-source="stats.statusCounts"
            :columns="[
              { title: '状态', dataIndex: 'applicationStatus', key: 'applicationStatus' },
              { title: '数量', dataIndex: 'count', key: 'count', width: 88 },
            ]"
          />
        </UiCard>
        <UiCard title="通过等级">
          <a-table
            size="small"
            :pagination="false"
            row-key="certLevel"
            :data-source="stats.certLevelCounts"
            :columns="[
              { title: '等级', dataIndex: 'certLevel', key: 'certLevel' },
              { title: '数量', dataIndex: 'count', key: 'count', width: 88 },
            ]"
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
