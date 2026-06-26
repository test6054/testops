<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDevelopmentRecordVO, PortfolioHonorStatsVO } from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { portfolioDevelopmentRecordApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { readPageList } from '@/utils/page-result'

const loading = ref(false)
const rows = ref<PortfolioDevelopmentRecordVO[]>([])
const stats = ref<PortfolioHonorStatsVO | null>(null)
const query = reactive({
  levelCode: '',
  awardUnit: '',
  recordDateFrom: '',
  recordDateTo: '',
  categoryCode: '',
})
const form = reactive({
  recordTitle: '',
  teacherUserId: '',
  levelCode: '',
  awardUnit: '',
  recordDate: '',
  categoryCode: '',
  descriptionText: '',
})

const columns: ColumnsType = [
  { title: '标题', dataIndex: 'recordTitle', key: 'recordTitle' },
  { title: '等级', dataIndex: 'levelCode', key: 'levelCode', width: 88 },
  { title: '授予单位', dataIndex: 'awardUnit', key: 'awardUnit', width: 140 },
  { title: '日期', dataIndex: 'recordDate', key: 'recordDate', width: 110 },
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 100 },
  { title: '操作', key: 'actions', width: 80 },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioDevelopmentRecordApi.page({
      pageNum: 1,
      pageSize: 50,
      recordType: 'HONOR',
      levelCode: query.levelCode || undefined,
      awardUnit: query.awardUnit || undefined,
      recordDateFrom: query.recordDateFrom || undefined,
      recordDateTo: query.recordDateTo || undefined,
      categoryCode: query.categoryCode || undefined,
    })
    rows.value = readPageList(page, '加载荣誉库失败')
    stats.value = await portfolioDevelopmentRecordApi.honorStats({
      levelCode: query.levelCode || undefined,
      awardUnit: query.awardUnit || undefined,
      recordDateFrom: query.recordDateFrom || undefined,
      recordDateTo: query.recordDateTo || undefined,
      categoryCode: query.categoryCode || undefined,
    })
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
    message.warning('请填写荣誉标题')
    return
  }
  try {
    await portfolioDevelopmentRecordApi.save({
      recordType: 'HONOR',
      recordTitle: form.recordTitle.trim(),
      teacherUserId: form.teacherUserId.trim() || undefined,
      levelCode: form.levelCode.trim() || undefined,
      awardUnit: form.awardUnit.trim() || undefined,
      recordDate: form.recordDate || undefined,
      categoryCode: form.categoryCode.trim() || undefined,
      descriptionText: form.descriptionText.trim() || undefined,
    })
    message.success('已保存')
    form.recordTitle = ''
    form.teacherUserId = ''
    form.levelCode = ''
    form.awardUnit = ''
    form.recordDate = ''
    form.categoryCode = ''
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

async function exportHonor() {
  try {
    const result = await portfolioDevelopmentRecordApi.honorExport({
      levelCode: query.levelCode || undefined,
      awardUnit: query.awardUnit || undefined,
      recordDateFrom: query.recordDateFrom || undefined,
      recordDateTo: query.recordDateTo || undefined,
      categoryCode: query.categoryCode || undefined,
    })
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  }
  catch (error) {
    showUserError(error)
  }
}

onMounted(loadPage)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="荣誉库" subtitle="荣誉综合查询、统计与导出" />
    <UiCard>
      <div v-if="stats" class="stats">
        <span v-for="item in stats.levelCounts" :key="item.levelCode">
          {{ item.levelCode || '未分级' }}：{{ item.count }}
        </span>
        <span v-for="item in stats.yearCounts" :key="item.year">
          {{ item.year }}年：{{ item.count }}
        </span>
      </div>
      <div class="toolbar">
        <a-input v-model:value="query.levelCode" placeholder="等级" style="width: 100px" />
        <a-input v-model:value="query.awardUnit" placeholder="授予单位" style="width: 140px" />
        <a-input v-model:value="query.categoryCode" placeholder="分类" style="width: 100px" />
        <a-date-picker v-model:value="query.recordDateFrom" value-format="YYYY-MM-DD" placeholder="起始日期" />
        <a-date-picker v-model:value="query.recordDateTo" value-format="YYYY-MM-DD" placeholder="截止日期" />
        <UiButton @click="loadPage">
          查询
        </UiButton>
        <UiButton @click="exportHonor">
          导出
        </UiButton>
      </div>
      <div class="form-row">
        <a-input v-model:value="form.recordTitle" placeholder="荣誉标题" style="width: 180px" />
        <a-input v-model:value="form.teacherUserId" placeholder="教师 ID" style="width: 120px" />
        <a-input v-model:value="form.levelCode" placeholder="等级" style="width: 88px" />
        <a-input v-model:value="form.awardUnit" placeholder="授予单位" style="width: 140px" />
        <a-date-picker v-model:value="form.recordDate" value-format="YYYY-MM-DD" placeholder="日期" />
        <UiButton variant="primary" @click="saveRecord">
          新增
        </UiButton>
      </div>
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id" style="margin-top: 16px">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <UiTextAction @click="removeRecord(record.id)">
              删除
            </UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar,
.form-row,
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.stats span {
  font-size: 13px;
  color: var(--text-secondary, #666);
}
</style>
