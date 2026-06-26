<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PfSceneCode,
  PortfolioPublishImpactReportVO,
  PortfolioRulePublishSnapshotVO,
} from '@/apis/portfolio/indicator-types'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import { PF_SCENE_CODE_OPTIONS } from '@/apis/portfolio/indicator-types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioIndicatorExcelExport } from '@/utils/portfolio-excel-export'
import { readPageList, readPageTotal } from '@/utils/page-result'

const router = useRouter()
const activeTab = ref('history')
const sceneCode = ref<PfSceneCode>('PERFORMANCE')
const loading = ref(false)
const rows = ref<PortfolioRulePublishSnapshotVO[]>([])
const impactRows = ref<PortfolioPublishImpactReportVO[]>([])
const impactTotal = ref(0)
const retroactive = ref<PortfolioRulePublishSnapshotVO | null>(null)
const impactDetail = ref<PortfolioPublishImpactReportVO | null>(null)
const selectedSnapshotId = ref('')
const diffSnapshotIdB = ref('')
const impactQuery = reactive({ pageNum: 1, pageSize: 20 })

const columns: ColumnsType = [
  { title: '版本', dataIndex: 'versionNo', key: 'versionNo', width: 64 },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 120 },
  { title: '状态', dataIndex: 'modelStatus', key: 'modelStatus', width: 100 },
  { title: '发布时间', dataIndex: 'publishedTime', key: 'publishedTime', width: 180 },
  { title: '快照 ID', dataIndex: 'id', key: 'id' },
  { title: '操作', key: 'actions', width: 120 },
]

const impactColumns: ColumnsType = [
  { title: '场景', dataIndex: 'sceneCode', key: 'sceneCode', width: 100 },
  { title: '状态', dataIndex: 'reportStatus', key: 'reportStatus', width: 100 },
  { title: '过期', dataIndex: 'expiredTime', key: 'expiredTime', width: 160 },
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: '操作', key: 'actions', width: 120 },
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

async function loadImpactReports() {
  loading.value = true
  try {
    const page = await portfolioIndicatorTenantApi.pageImpactReport(impactQuery)
    impactRows.value = readPageList(page, '影响报告加载失败')
    impactTotal.value = readPageTotal(page)
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

async function loadImpactDetail(id: string) {
  try {
    impactDetail.value = await portfolioIndicatorTenantApi.getImpactReport({ id })
  }
  catch (error) {
    showUserError(error)
  }
}

async function exportDiff(snapshotIdA: string) {
  if (!diffSnapshotIdB.value) {
    message.warning('请填写对比快照 B ID')
    return
  }
  try {
    const result = await portfolioIndicatorTenantApi.exportSnapshotDiff({
      snapshotIdA,
      snapshotIdB: diffSnapshotIdB.value,
    })
    await downloadPortfolioIndicatorExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条差异`)
  }
  catch (error) {
    showUserError(error)
  }
}

async function exportImpact(id: string) {
  try {
    const result = await portfolioIndicatorTenantApi.exportImpactReport({ id })
    await downloadPortfolioIndicatorExcelExport(result)
    message.success('影响报告已导出')
  }
  catch (error) {
    showUserError(error)
  }
}

function goOps(snapshotId: string) {
  router.push({ name: 'PortfolioIndicatorOps', query: { snapshotId } })
}

function onTabChange(key: string | number) {
  activeTab.value = String(key)
  if (activeTab.value === 'impact') {
    loadImpactReports()
  }
  else {
    loadHistory()
  }
}

watch(sceneCode, () => {
  if (activeTab.value === 'history') {
    loadHistory()
  }
})
onMounted(loadHistory)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="规则快照与影响报告" subtitle="F6 · 历史版本 · retroactive · 影响分析">
      <template #actions>
        <UiButton @click="router.push({ name: 'PortfolioIndicatorOps' })">
          计分与审计
        </UiButton>
      </template>
    </ContextBar>
    <UiCard>
      <a-tabs :active-key="activeTab" @change="onTabChange">
        <a-tab-pane key="history" tab="快照历史">
          <div class="toolbar">
            <a-select v-model:value="sceneCode" :options="PF_SCENE_CODE_OPTIONS" style="width: 140px" />
            <a-input v-model:value="selectedSnapshotId" placeholder="快照 ID" style="width: 200px" />
            <UiButton @click="loadRetroactive">
              retroactive 查询
            </UiButton>
            <a-input v-model:value="diffSnapshotIdB" placeholder="对比快照 B ID" style="width: 200px" />
          </div>
          <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <a style="margin-right: 8px" @click="selectedSnapshotId = record.id; loadRetroactive()">查看</a>
                <a style="margin-right: 8px" @click="exportDiff(record.id)">导出 diff</a>
                <a @click="goOps(record.id)">计分</a>
              </template>
            </template>
          </UiDataTable>
          <pre v-if="retroactive" class="json-block">{{ retroactive.snapshotSummaryJson }}</pre>
        </a-tab-pane>
        <a-tab-pane key="impact" tab="影响报告">
          <UiDataTable :columns="impactColumns" :data-source="impactRows" :loading="loading" row-key="id">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <a style="margin-right: 8px" @click="loadImpactDetail(record.id)">详情</a>
                <a @click="exportImpact(record.id)">导出</a>
              </template>
            </template>
          </UiDataTable>
          <a-pagination
            v-model:current="impactQuery.pageNum"
            :total="impactTotal"
            :page-size="impactQuery.pageSize"
            style="margin-top: 12px"
            @change="loadImpactReports"
          />
          <pre v-if="impactDetail" class="json-block">{{ impactDetail.indicatorSummaryJson }}</pre>
        </a-tab-pane>
      </a-tabs>
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
.json-block {
  margin-top: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
  font-size: 12px;
  overflow: auto;
}
</style>
