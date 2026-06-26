<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDualTeacherApplicationVO } from '@/apis/portfolio/teacher-platform'
import type { PortfolioDualTeacherApplicationStatus } from '@/apis/portfolio/enums'
import { PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_LABEL } from '@/apis/portfolio/enums'
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

function statusLabel(status: string) {
  return strictEnumLabel(
    PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_LABEL,
    status as PortfolioDualTeacherApplicationStatus,
    '双师申请状态',
  )
}

const loading = ref(false)
const rows = ref<PortfolioDualTeacherApplicationVO[]>([])

const columns: ColumnsType = [
  { title: '申请单号', dataIndex: 'applicationNo', key: 'applicationNo' },
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 100 },
  { title: '状态', dataIndex: 'applicationStatus', key: 'applicationStatus', width: 120 },
  { title: '等级', dataIndex: 'certLevel', key: 'certLevel', width: 80 },
  { title: '操作', key: 'actions', width: 200 },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioDualTeacherApi.page({ pageNum: 1, pageSize: 50 })
    rows.value = readPageList(page)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function runWorkflow(
  action: 'submit' | 'collegeApprove' | 'collegeReturn' | 'academicApprove' | 'academicReject',
  id: string,
) {
  try {
    if (action === 'submit') {
      await portfolioDualTeacherApi.submit({ id })
    }
    else if (action === 'collegeApprove') {
      await portfolioDualTeacherApi.collegeApprove({ id })
    }
    else if (action === 'collegeReturn') {
      await portfolioDualTeacherApi.collegeReturn({ id })
    }
    else if (action === 'academicApprove') {
      await portfolioDualTeacherApi.academicApprove({ id })
    }
    else {
      await portfolioDualTeacherApi.academicReject({ id })
    }
    message.success('操作成功')
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
}

async function exportRoster() {
  try {
    const result = await portfolioDualTeacherApi.exportRoster()
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

onMounted(loadPage)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="双师认定台账" subtitle="院审→教务终审两级审核" />
    <UiCard>
      <div class="toolbar">
        <UiButton @click="loadPage">
          刷新
        </UiButton>
        <UiButton variant="primary" @click="exportRoster">
          导出台账
        </UiButton>
      </div>
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id" style="margin-top: 16px">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'applicationStatus'">
            {{ statusLabel(record.applicationStatus) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTextAction v-if="record.applicationStatus === 'DRAFT' || record.applicationStatus === 'COLLEGE_RETURNED' || record.applicationStatus === 'ACADEMIC_RETURNED'" @click="runWorkflow('submit', record.id)">
              提交
            </UiTextAction>
            <UiTextAction v-if="record.applicationStatus === 'COLLEGE_PENDING'" @click="runWorkflow('collegeApprove', record.id)">
              院审通过
            </UiTextAction>
            <UiTextAction v-if="record.applicationStatus === 'COLLEGE_PENDING'" @click="runWorkflow('collegeReturn', record.id)">
              院审退回
            </UiTextAction>
            <UiTextAction v-if="record.applicationStatus === 'ACADEMIC_PENDING'" @click="runWorkflow('academicApprove', record.id)">
              教务通过
            </UiTextAction>
            <UiTextAction v-if="record.applicationStatus === 'ACADEMIC_PENDING'" @click="runWorkflow('academicReject', record.id)">
              教务驳回
            </UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
}
</style>
