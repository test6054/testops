<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioDevelopmentRecordStatus,
  PortfolioDevelopmentRecordType,
} from '@/apis/portfolio/enums'
import type { PortfolioDevelopmentRecordVO } from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  PORTFOLIO_DEVELOPMENT_RECORD_STATUS_LABEL,
  PORTFOLIO_DEVELOPMENT_RECORD_TYPE_LABEL,
} from '@/apis/portfolio/enums'
import { portfolioDevelopmentRecordApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const RECORD_TAB_KEYS: PortfolioDevelopmentRecordType[] = ['ACHIEVEMENT', 'POLICY']
const RECORD_TABS = RECORD_TAB_KEYS.map(key => ({
  key,
  label: PORTFOLIO_DEVELOPMENT_RECORD_TYPE_LABEL[key],
}))

type RecordType = typeof RECORD_TAB_KEYS[number]

const activeType = ref<RecordType>('ACHIEVEMENT')
const loading = ref(false)
const rows = ref<PortfolioDevelopmentRecordVO[]>([])
const form = reactive({ recordTitle: '', descriptionText: '' })

const columns: ColumnsType = [
  { title: '标题', dataIndex: 'recordTitle', key: 'recordTitle' },
  { title: '分类', dataIndex: 'categoryCode', key: 'categoryCode', width: 120 },
  { title: '状态', dataIndex: 'recordStatus', key: 'recordStatus', width: 88 },
  { title: '操作', key: 'actions', width: 120 },
]

const tabLabel = computed(() => RECORD_TABS.find(item => item.key === activeType.value)?.label ?? '')

function recordStatusLabel(status: PortfolioDevelopmentRecordStatus): string {
  return strictEnumLabel(PORTFOLIO_DEVELOPMENT_RECORD_STATUS_LABEL, status, '发展档案条目状态')
}

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioDevelopmentRecordApi.page({
      pageNum: 1,
      pageSize: 50,
      recordType: activeType.value,
    })
    rows.value = readPageList(page, '加载发展记录失败')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function saveRecord() {
  if (!form.recordTitle.trim()) {
    message.warning('请填写标题')
    return
  }
  try {
    await portfolioDevelopmentRecordApi.save({
      recordType: activeType.value,
      recordTitle: form.recordTitle.trim(),
      descriptionText: form.descriptionText.trim() || undefined,
    })
    message.success('已保存')
    form.recordTitle = ''
    form.descriptionText = ''
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
}

async function removeRecord(id: string) {
  try {
    await portfolioDevelopmentRecordApi.delete({ id })
    message.success('已删除')
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
}

async function exportExcel() {
  try {
    const result = await portfolioDevelopmentRecordApi.exportExcel({ recordType: activeType.value })
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  }
  catch (error) {
    showUserError(error)
  }
}

function switchTab(type: RecordType) {
  activeType.value = type
  void loadPage()
}

onMounted(loadPage)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar :title="tabLabel" subtitle="成果库 / 荣誉库 / 政策文件库" />
    <div class="tabs">
      <UiButton
        v-for="tab in RECORD_TABS"
        :key="tab.key"
        :variant="activeType === tab.key ? 'primary' : 'outline'"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </UiButton>
    </div>
    <UiCard title="新增条目">
      <div class="form-row">
        <input v-model="form.recordTitle" class="input input--wide" placeholder="标题">
        <UiButton variant="primary" @click="saveRecord">
          保存
        </UiButton>
      </div>
    </UiCard>
    <UiCard>
      <div class="toolbar">
        <UiButton @click="loadPage">
          刷新
        </UiButton>
        <UiButton @click="exportExcel">
          导出 Excel
        </UiButton>
      </div>
      <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无发展记录" />
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id" style="margin-top: 16px">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'recordStatus'">
            {{ recordStatusLabel(record.recordStatus) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton size="sm" @click="removeRecord(record.id)">
              删除
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.form-row,
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}
.input {
  padding: 6px 8px;
  border: 1px solid var(--ant-color-border);
  border-radius: 4px;
}
.input--wide {
  flex: 1;
  min-width: 200px;
}
</style>
