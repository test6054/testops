<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioGapTaskStatusCode } from '@/apis/portfolio/enums'
import type { PortfolioGapTaskSummaryVO } from '@/apis/portfolio/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PortfolioGapTaskStatusDescription } from '@/apis/portfolio/enums'
import { portfolioGapApi } from '@/apis/portfolio/gap'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag-tone'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

function gapStatusLabel(status: PortfolioGapTaskStatusCode): string {
  return strictEnumLabel(PortfolioGapTaskStatusDescription, status, '补采任务状态')
}

const router = useRouter()
const loading = ref(false)
const urgingId = ref('')
const extendingId = ref('')
const extendDialogOpen = ref(false)
const extendingTask = ref<PortfolioGapTaskSummaryVO | null>(null)
const extensionForm = reactive({ dueTime: '', reason: '' })
const rows = ref<PortfolioGapTaskSummaryVO[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)
const requestToken = ref(0)

const writing = computed(() => Boolean(urgingId.value || extendingId.value))

function gapCourseScopeLabel(row: PortfolioGapTaskSummaryVO): string {
  if (!row.courseCode) {
    return '—'
  }
  const parts = [row.courseCode]
  if (row.academicYear) {
    parts.push(row.academicYear)
  }
  if (row.semester) {
    parts.push(`第${row.semester}学期`)
  }
  return parts.join(' · ')
}
const columns: ColumnsType<PortfolioGapTaskSummaryVO> = [
  { title: '教师', dataIndex: 'teacherId', key: 'teacherId', width: 100, fixed: 'left' },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 140 },
  { title: '课程维度', key: 'courseScope', width: 160 },
  { title: '任务', dataIndex: 'taskTitle', key: 'taskTitle' },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
  { title: '截止', dataIndex: 'dueTime', key: 'dueTime', width: 170 },
  { title: '操作', key: 'actions', width: 140 },
]

async function loadPage() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const request = {
    openOnly: true,
    pageNum: pageNum.value,
    pageSize: pageSize.value,
  }
  loading.value = true
  try {
    const page = await portfolioGapApi.pageTasks(request)
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = page.list
    pageTotal.value = page.total
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = []
    pageTotal.value = 0
    showUserError(error, '加载补采任务失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

async function urgeTask(row: PortfolioGapTaskSummaryVO) {
  if (writing.value) {
    return
  }
  urgingId.value = row.id
  try {
    await portfolioGapApi.urgeTask({ gapTaskId: row.id })
    void message.success('已发送催办通知')
  } catch (error) {
    showUserError(error, '催办失败')
  } finally {
    urgingId.value = ''
  }
}

function openExtendDialog(row: PortfolioGapTaskSummaryVO) {
  extendingTask.value = row
  extensionForm.dueTime = ''
  extensionForm.reason = ''
  extendDialogOpen.value = true
}

async function extendTask() {
  if (!extendingTask.value || !extensionForm.dueTime || !extensionForm.reason.trim()) {
    showFormValidationMessage('请填写新的截止时间和延期理由')
    return
  }
  if (writing.value) {
    return
  }
  const gapTaskId = extendingTask.value.id
  const dueTime = extensionForm.dueTime
  const reason = extensionForm.reason.trim()
  extendingId.value = gapTaskId
  try {
    await portfolioGapApi.extendTask({
      gapTaskId,
      dueTime,
      reason,
    })
    void message.success('延期已生效，教师已收到新的补采期限')
    extendDialogOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '延期失败')
  } finally {
    extendingId.value = ''
  }
}

function openTask(row: PortfolioGapTaskSummaryVO) {
  void router.push({
    path: `/portfolio/teacher/gap/${row.id}`,
    query: { teacherId: row.teacherId },
  })
}

function handleGapRowAction(key: string, row: PortfolioGapTaskSummaryVO) {
  if (key === 'view') openTask(row)
  else if (key === 'urge') void urgeTask(row)
  else if (key === 'extend') openExtendDialog(row)
}

void loadPage()
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="补采督办"
        subtitle="院系补采任务催办与进度跟踪"
      >
        <template #actions>
          <UiButton size="sm" :loading="loading" @click="() => void loadPage()"> 刷新 </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiCard title="开放补采任务">
      <UiDataTable
        v-if="rows.length || loading"
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :total="pageTotal"
        row-key="id"
        @page-change="() => void loadPage()"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'courseScope'">
            {{ gapCourseScopeLabel(record) }}
          </template>
          <template v-else-if="column.key === 'taskStatus'">
            <UiTag>{{ gapStatusLabel(record.taskStatus) }}</UiTag>
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="portfolioLifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>

            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
              :row-key="record.id || record.teacherId || record.teacherUserId || record.userId"
            />
          </template>
          <template v-else-if="column.key === 'countsInCurrentFacultyStructure'">
            {{
              record.countsInCurrentFacultyStructure === true
                ? '是'
                : record.countsInCurrentFacultyStructure === false
                  ? '否'
                  : '—'
            }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[
                { key: 'view', label: '查看' },
                { key: 'urge', label: '催办', disabled: writing },
                { key: 'extend', label: '延期', disabled: writing },
              ]"
              split
              @action="(key) => handleGapRowAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
      <UiEmpty size="sm" v-else description="暂无开放补采任务" />
    </UiCard>
    <UiDialog
      v-model:open="extendDialogOpen"
      title="延期补采任务"
      :confirm-loading="Boolean(extendingId)"
      @ok="extendTask"
    >
      <UiForm layout="vertical">
        <UiFormItem label="新的截止时间" required>
          <UiDatePicker
            v-model="extensionForm.dueTime"
            show-time
            value-format="YYYY-MM-DD HH:mm:ss"
            size="sm"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="延期理由" required>
          <UiInput v-model="extensionForm.reason" size="sm" :maxlength="500" :disabled="writing" />
        </UiFormItem>
      </UiForm>
    </UiDialog>
  </StageWorkbenchShell>
</template>
