<template>
  <WorkbenchSurfaceCard flush class="formal-workbench">
    <template #toolbar>
      <UiFilterBar
        v-model="draftFilterModel"
        :fields="filterFields"
        variant="plain"
        search-text="查询"
        reset-text="重置"
        actions-align="end"
        @search="emitSearch"
        @reset="emitReset"
      />
    </template>

    <UiDataTable
      :current="pagination.current"
      :page-size="pagination.pageSize"
      pagination-mode="server"
      :columns="sessionColumns"
      :data-source="sessions"
      row-key="id"
      size="middle"
      flat
      :loading="loading"
      :total="pagination.total"
      :empty-description="sessionTableEmptyDescription"
      @page-change="emitPageChange"
    >
      <template #empty>
        <WorkflowPrerequisiteEmpty
          v-if="createBlocked && prerequisiteEmpty"
          :model="prerequisiteEmpty"
        />
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'groupName'">
          <a-typography-text strong>{{ record.groupName }}</a-typography-text>
        </template>
        <template v-else-if="column.key === 'status'">
          <UiTag
            :tone="strictEnumTone(FORMAL_SESSION_STATUS_TONE, record.sessionStatus, '正评会话状态')"
            size="sm"
          >
            {{
              strictEnumLabel(FormalSessionStatusDescription, record.sessionStatus, '正评会话状态')
            }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'allocationUnit'">
          {{ strictEnumLabel(AllocationUnitDescription, record.allocationUnit, '批阅任务单元') }}
        </template>
        <template v-else-if="column.key === 'questionScope'">
          <UiEllipsisText :text="formatFormalSessionQuestionScope(record)" />
        </template>
        <template v-else-if="column.key === 'taskProgress'">
          {{ formatFormalSessionTaskProgress(record) }}
        </template>
        <template v-else-if="column.key === 'gradeClosure'">
          {{ formatFormalSessionGradeClosureProgress(record) }}
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(record.createTime) || '—' }}
        </template>
        <template v-else-if="column.key === 'lifecycleTime'">
          <span class="formal-workbench__lifecycle">
            <template v-if="record.startTime">开始 {{ formatDateTime(record.startTime) }}</template>
            <template v-else>—</template>
            <template v-if="record.endTime"> · 结束 {{ formatDateTime(record.endTime) }}</template>
          </span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="buildRowActions(record)"
            :max-visible="4"
            split
            @action="(key) => handleSessionRowAction(key, record)"
          />
        </template>
      </template>
    </UiDataTable>

    <FormalSessionDetailDrawer v-model:open="detailOpen" :session="detailTarget" />
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { FormalSessionResponse } from '@/apis/mark/marking-organization'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { WorkflowPrerequisiteEmptyViewModel } from '@/components/workbench/workflow-readiness/types'
import type { MarkingOrgSessionFilterModel } from '@/composables/useMarkingOrgSessionWorkspace'
import { Modal } from 'ant-design-vue'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  AllocationUnitDescription,
  completeFormalSession,
  deleteFormalSession,
  FORMAL_SESSION_STATUS_TONE,
  FormalSessionStatusDescription,
  resumeFormalSession,
  startFormalSession,
} from '@/apis/mark/marking-organization'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEllipsisText from '@/components/ui-guide/ui/UiEllipsisText.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import WorkflowPrerequisiteEmpty from '@/components/workbench/workflow-readiness/WorkflowPrerequisiteEmpty.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  ALL_FORMAL_SESSION_STATUS_CODES,
  FormalSessionStatusCode,
} from '@/types/enums/formal-session-status-enum'
import { ResultCode } from '@/types/enums/result-code'
import { getUserErrorMessage, readBusinessResultCode, showFormValidationMessage, showUserError } from '@/utils/error-handler'
import {
  formatFormalSessionGradeClosureProgress,
  formatFormalSessionQuestionScope,
  formatFormalSessionTaskProgress,
} from '@/utils/formal-session-display'
import { formatDateTime } from '@/utils/format'
import { isFormalStartPendingReviewConflict } from '@/utils/marking-workflow-conflict'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import FormalSessionDetailDrawer from './FormalSessionDetailDrawer.vue'

interface GroupOption {
  value: string
  label: string
}

interface SessionPaginationState {
  current: number
  pageSize: number
  total: number
}

defineOptions({ name: 'FormalSessionWorkbench' })

const props = defineProps<{
  organizationId: string
  examId?: string
  sessions: FormalSessionResponse[]
  groupOptions: GroupOption[]
  filterModel: MarkingOrgSessionFilterModel
  pagination: SessionPaginationState
  loading?: boolean
  canManage: boolean
  createBlocked?: boolean
  prerequisiteEmpty?: WorkflowPrerequisiteEmptyViewModel
}>()

const emit = defineEmits<{
  "refresh": []
  "search": [model: Record<string, unknown>]
  "reset": []
  'page-change': [page: { current: number, pageSize: number }]
  'open-lifecycle': [action: 'pauseFormal' | 'closeFormal', sessionId: string]
}>()

const EXPERIENCE_ASSIST_BASELINE_BLOCKING_PREFIX = '标答评分基线未锁定'
const EXPERIENCE_ASSIST_BINDING_BLOCKING_PREFIX = '经验辅助评阅定标未完成'

const router = useRouter()
const draftFilterModel = ref<Record<string, unknown>>({
  keyword: '',
  status: undefined,
  groupId: undefined,
})

const startingId = ref<string | null>(null)
const completingId = ref<string | null>(null)
const resumingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const detailOpen = ref(false)
const detailTarget = ref<FormalSessionResponse | null>(null)

const sessionColumns: ColumnType<FormalSessionResponse>[] = [
  { title: '题组', key: 'groupName', dataIndex: 'groupName', width: 120, fixed: 'left' },
  { title: '状态', key: 'status', width: 100 },
  { title: '批阅单元', key: 'allocationUnit', width: 100 },
  { title: '题目范围', key: 'questionScope', ellipsis: true },
  { title: '任务进度', key: 'taskProgress', width: 160 },
  { title: '成绩闭环', key: 'gradeClosure', width: 120 },
  { title: '创建时间', key: 'createTime', width: 152 },
  { title: '起止时间', key: 'lifecycleTime', width: 200 },
  { title: '操作', key: 'actions', width: 220 },
]

const statusFilterOptions = computed(() =>
  ALL_FORMAL_SESSION_STATUS_CODES.map((status) => ({
    value: status,
    label: strictEnumLabel(FormalSessionStatusDescription, status, '正评会话状态'),
  })),
)

const filterFields = computed((): FilterField[] => [
  {
    key: 'keyword',
    type: 'input',
    inputPrefixIcon: 'search',
    placeholder: '搜索题组、状态、题目范围',
    width: 260,
    triggerSearchOnChange: false,
  },
  {
    key: 'status',
    type: 'select',
    placeholder: '全部状态',
    options: statusFilterOptions.value,
    width: 140,
    triggerSearchOnChange: false,
  },
  {
    key: 'groupId',
    type: 'select',
    placeholder: '全部题组',
    options: props.groupOptions.map((item) => ({ label: item.label, value: item.value })),
    width: 160,
    triggerSearchOnChange: false,
  },
])

watch(
  () => props.filterModel,
  (model) => {
    draftFilterModel.value = {
      keyword: model.keyword,
      status: model.status,
      groupId: model.groupId,
    }
  },
  { immediate: true, deep: true },
)

const hasActiveFilter = computed(
  () =>
    Boolean(props.filterModel.keyword.trim())
    || Boolean(props.filterModel.status)
    || Boolean(props.filterModel.groupId),
)

const sessionTableEmptyDescription = computed(() => {
  if (props.pagination.total === 0 && !hasActiveFilter.value) {
    if (props.createBlocked) {
      return ''
    }
    return props.canManage ? '暂无正评会话，点击顶部「创建正评」开始阅卷' : '暂无正评会话'
  }
  if (props.pagination.total === 0 && hasActiveFilter.value) {
    return '未找到匹配会话，请调整筛选条件'
  }
  return '暂无正评会话'
})

function emitSearch(model: Record<string, unknown>): void {
  emit('search', model)
}

function emitReset(): void {
  emit('reset')
}

function emitPageChange(page: { current: number, pageSize: number }): void {
  emit('page-change', page)
}

function canStart(status: FormalSessionStatusCode): boolean {
  return props.canManage && status === FormalSessionStatusCode.SESSION_CREATED
}

function canComplete(record: FormalSessionResponse): boolean {
  return (
    props.canManage
    && record.sessionStatus === FormalSessionStatusCode.SESSION_ACTIVE
    && record.sessionTaskCompletionReady
  )
}

function canPause(status: FormalSessionStatusCode): boolean {
  return props.canManage && status === FormalSessionStatusCode.SESSION_ACTIVE
}

function canResume(status: FormalSessionStatusCode): boolean {
  return props.canManage && status === FormalSessionStatusCode.SESSION_PAUSED
}

function canClose(status: FormalSessionStatusCode): boolean {
  return (
    props.canManage
    && (status === FormalSessionStatusCode.SESSION_ACTIVE
      || status === FormalSessionStatusCode.SESSION_PAUSED
      || status === FormalSessionStatusCode.SESSION_COMPLETED)
  )
}

function canDelete(status: FormalSessionStatusCode): boolean {
  return props.canManage && status === FormalSessionStatusCode.SESSION_CREATED
}

function buildRowActions(record: FormalSessionResponse): UiTableRowActionItem[] {
  return [
    {
      key: 'start',
      label: '启动正评',
      hidden: !canStart(record.sessionStatus),
      disabled: startingId.value === record.id,
    },
    {
      key: 'complete',
      label: '完成正评',
      hidden: !canComplete(record),
      disabled: completingId.value === record.id,
    },
    {
      key: 'pause',
      label: '暂停',
      hidden: !canPause(record.sessionStatus),
    },
    {
      key: 'resume',
      label: '恢复',
      hidden: !canResume(record.sessionStatus),
      disabled: resumingId.value === record.id,
    },
    {
      key: 'detail',
      label: '详情',
    },
    {
      key: 'close',
      label: '关闭归档',
      hidden: !canClose(record.sessionStatus),
    },
    {
      key: 'delete',
      label: '删除草稿',
      tone: 'danger',
      hidden: !canDelete(record.sessionStatus),
      disabled: deletingId.value === record.id,
    },
  ]
}

function guardManageAction(): boolean {
  if (props.canManage) {
    return true
  }
  showFormValidationMessage('仅考试主考老师可管理正评会话')
  return false
}

function handleFormalStartError(error: unknown): void {
  const detail = getUserErrorMessage(error, '')
  const isConflict = readBusinessResultCode(error) === ResultCode.CONFLICT
  const isExperienceAssistBlock
    = isConflict
      && (detail.includes(EXPERIENCE_ASSIST_BASELINE_BLOCKING_PREFIX)
        || detail.includes(EXPERIENCE_ASSIST_BINDING_BLOCKING_PREFIX))
  if (isExperienceAssistBlock && props.examId) {
    Modal.warning({
      title: '无法启动正评',
      content: detail,
      okText: '前往经验辅助评阅',
      onOk: () =>
        router.push({
          name: 'TeacherExamWorkspaceMarkingExperienceAssistPolicy',
          params: { examId: props.examId },
        }),
    })
    return
  }
  if (isFormalStartPendingReviewConflict(error) && props.examId) {
    Modal.warning({
      title: '无法启动正评',
      content: detail,
      okText: '前往识别复核',
      onOk: () =>
        router.push({
          name: 'TeacherExamWorkspaceReviewBatchConfirm',
          params: { examId: props.examId },
        }),
    })
    return
  }
  showUserError(error, '启动正评会话失败')
}

async function submitStart(sessionId: string): Promise<void> {
  if (!guardManageAction()) {
    return
  }
  startingId.value = sessionId
  try {
    await startFormalSession(sessionId)
    message.success('正评会话已启动')
    emit('refresh')
  } catch (error) {
    handleFormalStartError(error)
  } finally {
    startingId.value = null
  }
}

async function submitComplete(sessionId: string): Promise<void> {
  if (!guardManageAction()) {
    return
  }
  completingId.value = sessionId
  try {
    await completeFormalSession(sessionId)
    message.success('本场正评任务已标记完成')
    emit('refresh')
  } catch (error) {
    showUserError(error, '完成正评会话失败')
  } finally {
    completingId.value = null
  }
}

async function submitResume(sessionId: string): Promise<void> {
  if (!guardManageAction()) {
    return
  }
  resumingId.value = sessionId
  try {
    await resumeFormalSession(sessionId)
    message.success('正评会话已恢复')
    emit('refresh')
  } catch (error) {
    showUserError(error, '恢复正评会话失败')
  } finally {
    resumingId.value = null
  }
}

async function submitDelete(sessionId: string): Promise<void> {
  if (!guardManageAction()) {
    return
  }
  deletingId.value = sessionId
  try {
    await deleteFormalSession(sessionId)
    message.success('正评草稿会话已删除')
    emit('refresh')
  } catch (error) {
    showUserError(error, '删除正评会话失败')
  } finally {
    deletingId.value = null
  }
}

async function handleSessionRowAction(key: string, record: FormalSessionResponse): Promise<void> {
  if (key === 'start') {
    await submitStart(record.id)
    return
  }
  if (key === 'complete') {
    await submitComplete(record.id)
    return
  }
  if (key === 'pause') {
    emit('open-lifecycle', 'pauseFormal', record.id)
    return
  }
  if (key === 'resume') {
    await submitResume(record.id)
    return
  }
  if (key === 'detail') {
    detailTarget.value = record
    detailOpen.value = true
    return
  }
  if (key === 'close') {
    emit('open-lifecycle', 'closeFormal', record.id)
    return
  }
  if (key === 'delete') {
    if (
      !(await confirmAsync({
        content: '确认删除该正评会话？正评草稿将被软删除，不可恢复。',
        okText: '删除',
        type: 'warning',
      }))
    ) {
      return
    }
    await submitDelete(record.id)
  }
}
</script>

<style lang="scss" scoped>
.formal-workbench {
  :deep(.dp-filter-bar) {
    width: 100%;
  }

  &__lifecycle {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }
}
</style>
