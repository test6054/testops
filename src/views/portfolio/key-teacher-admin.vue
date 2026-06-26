<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioKeyTeacherRegistryVO } from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { portfolioKeyTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

const REGISTRY_TABS = [
  { key: 'PROGRAM_LEADER', label: '专业带头人' },
  { key: 'KEY_TEACHER', label: '骨干教师' },
] as const

type RegistryType = typeof REGISTRY_TABS[number]['key']

const activeType = ref<RegistryType>('PROGRAM_LEADER')
const loading = ref(false)
const rows = ref<PortfolioKeyTeacherRegistryVO[]>([])
const form = reactive({
  teacherUserId: '',
  specialtyName: '',
  majorGroupName: '',
  appointYear: '',
  dutyScope: '',
})

const columns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 100 },
  { title: '专业', dataIndex: 'specialtyName', key: 'specialtyName' },
  { title: '专业群', dataIndex: 'majorGroupName', key: 'majorGroupName', width: 120 },
  { title: '聘任年份', dataIndex: 'appointYear', key: 'appointYear', width: 96 },
  { title: '状态', dataIndex: 'registryStatus', key: 'registryStatus', width: 88 },
  { title: '操作', key: 'actions', width: 80 },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioKeyTeacherApi.page({
      pageNum: 1,
      pageSize: 50,
      registryType: activeType.value,
    })
    rows.value = readPageList(page)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function saveRegistry() {
  if (!form.teacherUserId.trim()) {
    message.warning('请填写教师用户 ID')
    return
  }
  try {
    await portfolioKeyTeacherApi.save({
      teacherUserId: form.teacherUserId.trim(),
      registryType: activeType.value,
      specialtyName: form.specialtyName.trim() || undefined,
      majorGroupName: form.majorGroupName.trim() || undefined,
      appointYear: form.appointYear.trim() || undefined,
      dutyScope: form.dutyScope.trim() || undefined,
    })
    message.success('已登记')
    form.teacherUserId = ''
    form.specialtyName = ''
    form.majorGroupName = ''
    form.appointYear = ''
    form.dutyScope = ''
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
}

async function revokeRegistry(id: string) {
  try {
    await portfolioKeyTeacherApi.revoke({ id })
    message.success('已作废')
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
}

async function exportRoster() {
  try {
    const result = await portfolioKeyTeacherApi.exportRoster({ registryType: activeType.value })
    const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.fileName
    link.click()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${result.rowCount} 条`)
  }
  catch (error) {
    showUserError(error)
  }
}

function switchType(key: RegistryType) {
  activeType.value = key
  loadPage()
}

onMounted(loadPage)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="骨干/带头人登记" subtitle="登记即生效，支持一键导出台账" />
    <UiCard>
      <a-tabs :active-key="activeType" @change="(k: string) => switchType(k as RegistryType)">
        <a-tab-pane v-for="tab in REGISTRY_TABS" :key="tab.key" :tab="tab.label" />
      </a-tabs>
      <div class="form-row">
        <a-input v-model:value="form.teacherUserId" placeholder="教师用户 ID" style="width: 140px" />
        <a-input v-model:value="form.specialtyName" placeholder="专业" style="width: 140px" />
        <a-input v-model:value="form.majorGroupName" placeholder="专业群" style="width: 140px" />
        <a-input v-model:value="form.appointYear" placeholder="聘任年份" style="width: 100px" />
        <a-input v-model:value="form.dutyScope" placeholder="职责范围" style="width: 180px" />
        <UiButton variant="primary" @click="saveRegistry">
          登记
        </UiButton>
        <UiButton @click="exportRoster">
          导出台账
        </UiButton>
      </div>
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id" style="margin-top: 16px">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions' && record.registryStatus === 'ACTIVE'">
            <UiTextAction @click="revokeRegistry(record.id)">
              作废
            </UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
</style>
