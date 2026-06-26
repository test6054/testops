<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PfSceneCode, PortfolioRulePublishSnapshotVO } from '@/apis/portfolio/indicator-types'
import { onMounted, ref, watch } from 'vue'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import { PF_SCENE_CODE_OPTIONS } from '@/apis/portfolio/indicator-types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'

const sceneCode = ref<PfSceneCode>('PERFORMANCE')
const loading = ref(false)
const rows = ref<PortfolioRulePublishSnapshotVO[]>([])
const retroactive = ref<PortfolioRulePublishSnapshotVO | null>(null)
const selectedSnapshotId = ref('')

const columns: ColumnsType = [
  { title: '版本', dataIndex: 'versionNo', key: 'versionNo', width: 64 },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 120 },
  { title: '状态', dataIndex: 'modelStatus', key: 'modelStatus', width: 100 },
  { title: '发布时间', dataIndex: 'publishedTime', key: 'publishedTime', width: 180 },
  { title: '快照 ID', dataIndex: 'id', key: 'id' },
]

async function loadHistory() {
  loading.value = true
  try {
    rows.value = await portfolioIndicatorTenantApi.ruleHistory({ sceneCode: sceneCode.value })
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function loadRetroactive() {
  if (!selectedSnapshotId.value) {
    return
  }
  try {
    retroactive.value = await portfolioIndicatorTenantApi.retroactiveGet({
      sceneCode: sceneCode.value,
      snapshotId: selectedSnapshotId.value,
    })
  }
  catch (error) {
    showUserError(error)
  }
}

watch(sceneCode, loadHistory)
onMounted(loadHistory)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="规则快照历史" subtitle="历史版本与 retroactive 只读查询" />
    <UiCard>
      <div class="toolbar">
        <a-select v-model:value="sceneCode" :options="PF_SCENE_CODE_OPTIONS" style="width: 140px" />
        <a-input v-model:value="selectedSnapshotId" placeholder="快照 ID" style="width: 200px" />
        <UiButton @click="loadRetroactive">
          retroactive 查询
        </UiButton>
      </div>
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id" />
      <pre v-if="retroactive" class="retro">{{ retroactive.snapshotSummaryJson }}</pre>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.retro {
  margin-top: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
  font-size: 12px;
  overflow: auto;
}
</style>
