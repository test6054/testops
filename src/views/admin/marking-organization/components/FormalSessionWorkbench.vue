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
          <UiTypographyText strong>{{ record.groupName }}</UiTypographyText>
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
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { WorkflowPrerequisiteEmptyViewModel } from '@/components/workbench/workflow-readiness/types'
import type { MarkingOrgSessionFilterModel } from '@/composables/useMarkingOrgSessionWorkspace'
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
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import WorkflowPrerequisiteEmpty from '@/components/workbench/workflow-readiness/WorkflowPrerequisiteEmpty.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { FormalSessionStatusCode } from '@/types/enums/formal-session-status-enum'
import { QuestionMarkingGroupStatusCode } from '@/types/enums/question-marking-group-status-enum'
import {
  getUserErrorMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import {
  formatFormalSessionGradeClosureProgress,
  formatFormalSessionQuestionScope,
  formatFormalSessionTaskProgress,
} from '@/utils/formal-session-display'
import { formatDateTime } from '@/utils/format'
import {
  buildMarkingSessionFilterFields,
  resolveSessionTableEmptyDescription,
} from '@/utils/marking-session-list-contract'
import { readFormalSessionStartBlocking } from '@/utils/marking-workflow-conflict'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import FormalSessionDetailDrawer from './FormalSessionDetailDrawer.vue'

interface GroupOption {
  value: string
  label: string
  /** MVR-402：题组状态，CLOSED/DRAFT 不可启动会话 */
  groupStatus?: string
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
  /** MVR-398：关闭归档仅主考、不叠 ACTIVE */
  canCloseMarkingSessions?: boolean
  createBlocked?: boolean
  prerequisiteEmpty?: WorkflowPrerequisiteEmptyViewModel
  /** 列表请求失败时禁止把失败伪装成「暂无」空态 */
  sessionsLoadFailed?: boolean
}>()

const emit = defineEmits<{
  "refresh": []
  "search": [model: Record<string, unknown>]
  "reset": []
  'page-change': [page: { current: number, pageSize: number }]
  'open-lifecycle': [action: 'pauseFormal' | 'closeFormal', sessionId: string]
}>()

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

const filterFields = computed(() => buildMarkingSessionFilterFields('formal', props.groupOptions))

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

const sessionTableEmptyDescription = computed(() =>
  resolveSessionTableEmptyDescription({
    phase: 'formal',
    loadFailed: Boolean(props.sessionsLoadFailed),
    total: props.pagination.total,
    filter: props.filterModel,
    createHint: props.createBlocked
      ? ''
      : props.canManage
        ? '暂无正评会话，点击顶部「创建正评」开始阅卷'
        : '暂无正评会话',
  }),
)

function emitSearch(model: Record<string, unknown>): void {
  emit('search', model)
}

function emitReset(): void {
  emit('reset')
}

function emitPageChange(page: { current: number, pageSize: number }): void {
  emit('page-change', page)
}

function isGroupStartable(groupId: string | undefined): boolean {
  if (!groupId) {
    return false
  }
  const option = props.groupOptions.find((item) => item.value === groupId)
  // MVR-402：仅 ACTIVE/CONFIGURED 可启动；缺状态默认拒绝
  return (
    option?.groupStatus === QuestionMarkingGroupStatusCode.GROUP_ACTIVE
    || option?.groupStatus === QuestionMarkingGroupStatusCode.GROUP_CONFIGURED
  )
}

function canStart(record: FormalSessionResponse): boolean {
  return (
    props.canManage && record.sessionStatus === FormalSessionStatusCode.SESSION_CREATED
    && isGroupStartable(record.groupId)
  )
}

function canComplete(record: FormalSessionResponse): boolean {
  return (
    props.canManage && record.sessionStatus === FormalSessionStatusCode.SESSION_ACTIVE
    // MVR-407：仅认 BE sessionTaskCompletionReady===true，缺省拒绝
    && record.sessionTaskCompletionReady === true
  )
}

function canPause(status: FormalSessionStatusCode): boolean {
  return props.canManage && status === FormalSessionStatusCode.SESSION_ACTIVE
}

function canResume(status: FormalSessionStatusCode): boolean {
  return props.canManage && status === FormalSessionStatusCode.SESSION_PAUSED
}

function canClose(status: FormalSessionStatusCode): boolean {
  // MVR-398：关闭归档认 canCloseMarkingSessions（主考，不叠 ACTIVE）
  return (
    props.canCloseMarkingSessions
    && (status === FormalSessionStatusCode.SESSION_ACTIVE
      || status === FormalSessionStatusCode.SESSION_PAUSED
      || status === FormalSessionStatusCode.SESSION_COMPLETED)
  )
}

function canDelete(status: FormalSessionStatusCode): boolean {
  return props.canManage && status === FormalSessionStatusCode.SESSION_CREATED
}

function buildRowActions(record: FormalSessionResponse): UiTableRowActionItem[] {
  // 行内仅 1 个 primary：启动 > 完成 > 恢复 > 关闭归档
  const actions: UiTableRowActionItem[] = [
    {
      key: 'start',
      label: '启动正评',
      hidden: !canStart(record),
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
  const primaryKey = canStart(record)
    ? 'start'
    : canComplete(record)
      ? 'complete'
      : canResume(record.sessionStatus)
        ? 'resume'
        : canClose(record.sessionStatus)
          && record.sessionStatus === FormalSessionStatusCode.SESSION_COMPLETED
          ? 'close'
          : undefined
  return actions.map((action) =>
    action.key === primaryKey && !action.hidden && action.tone !== 'danger'
      ? { ...action, tone: 'primary' as const }
      : action,
  )
}

function guardManageAction(): boolean {
  // MVR-377：仅认 BE canManageExamOwner===true（父层已叠 ACTIVE）
  if (props.canManage) {
    return true
  }
  showFormValidationMessage('仅考试主考老师可管理正评会话')
  return false
}

function handleFormalStartError(error: unknown): void {
  const detail = getUserErrorMessage(error, '无法启动正评会话')
  const blocking = readFormalSessionStartBlocking(error)
  if (blocking) {
    if (!props.examId || !blocking.workspaceRouteName) {
      showUserError(error, '无法启动正评：缺少考试上下文或修复路由，请从考试工作台重新进入')
      return
    }
    void confirmAsync({
      title: '无法启动正评',
      content: detail,
      type: 'warning',
      okText: blocking.actionLabel || '前往修复',
      cancelText: '关闭',
      onOk: () => {
        void router.push({
          name: blocking.workspaceRouteName!,
          params: { examId: props.examId },
        })
      },
    })
    return
  }
  showUserError(error, '启动正评会话失败')
}

async function submitStart(record: FormalSessionResponse): Promise<void> {
  if (!guardManageAction()) {
    return
  }
  // MVR-412：与 canStart 同源二次闸（主考∧ACTIVE∧SESSION_CREATED∧题组 ACTIVE/CONFIGURED）
  if (!canStart(record)) {
    showFormValidationMessage(
      isGroupStartable(record.groupId)
        ? '仅草稿正评会话可启动'
        : '题组已关闭或为草稿状态，不能启动正评会话',
    )
    return
  }
  if (startingId.value || completingId.value || resumingId.value || deletingId.value) {
    return
  }
  startingId.value = record.id
  try {
    await startFormalSession(record.id)
    void message.success('正评会话已启动')
    emit('refresh')
  } catch (error) {
    handleFormalStartError(error)
  } finally {
    startingId.value = null
  }
}

async function submitComplete(record: FormalSessionResponse): Promise<void> {
  if (!guardManageAction()) {
    return
  }
  // MVR-407：完成二次闸，与 canComplete / BE assertFormalSessionTasksReadyForCompletion 同源
  if (!canComplete(record)) {
    showFormValidationMessage('本场任务未全部定稿，不能完成正评会话')
    return
  }
  if (completingId.value || startingId.value || resumingId.value || deletingId.value) {
    return
  }
  completingId.value = record.id
  try {
    await completeFormalSession(record.id)
    void message.success('本场正评任务已标记完成')
    emit('refresh')
  } catch (error) {
    showUserError(error, '完成正评会话失败')
  } finally {
    completingId.value = null
  }
}

async function submitResume(record: FormalSessionResponse): Promise<void> {
  if (!guardManageAction()) {
    return
  }
  // MVR-408：恢复二次闸，与 canResume / BE SESSION_PAUSED 同源
  if (!canResume(record.sessionStatus)) {
    showFormValidationMessage('仅暂停中的正评会话可恢复')
    return
  }
  if (resumingId.value || startingId.value || completingId.value || deletingId.value) {
    return
  }
  resumingId.value = record.id
  try {
    await resumeFormalSession(record.id)
    void message.success('正评会话已恢复')
    emit('refresh')
  } catch (error) {
    showUserError(error, '恢复正评会话失败')
  } finally {
    resumingId.value = null
  }
}

async function submitDelete(record: FormalSessionResponse): Promise<void> {
  if (!guardManageAction()) {
    return
  }
  // MVR-408：删除二次闸，与 canDelete / BE SESSION_CREATED 同源
  if (!canDelete(record.sessionStatus)) {
    showFormValidationMessage('仅草稿正评会话可删除')
    return
  }
  if (deletingId.value || startingId.value || completingId.value || resumingId.value) {
    return
  }
  deletingId.value = record.id
  try {
    await deleteFormalSession(record.id)
    void message.success('正评草稿会话已删除')
    emit('refresh')
  } catch (error) {
    showUserError(error, '删除正评会话失败')
  } finally {
    deletingId.value = null
  }
}

async function handleSessionRowAction(key: string, record: FormalSessionResponse): Promise<void> {
  if (key === 'start') {
    await submitStart(record)
    return
  }
  if (key === 'complete') {
    await submitComplete(record)
    return
  }
  if (key === 'pause') {
    // MVR-397/408：打开暂停原因弹窗前叠 canPause（主考∧ACTIVE∧SESSION_ACTIVE）
    if (!canPause(record.sessionStatus)) {
      showFormValidationMessage('仅进行中的正评会话可暂停')
      return
    }
    emit('open-lifecycle', 'pauseFormal', record.id)
    return
  }
  if (key === 'resume') {
    await submitResume(record)
    return
  }
  if (key === 'detail') {
    detailTarget.value = record
    detailOpen.value = true
    return
  }
  if (key === 'close') {
    // MVR-398：关闭归档打开闸认 canCloseMarkingSessions，关考后仍可收口
    if (!props.canCloseMarkingSessions) {
      showFormValidationMessage('仅考试主考老师可关闭正评会话')
      return
    }
    emit('open-lifecycle', 'closeFormal', record.id)
    return
  }
  if (key === 'delete') {
    // MVR-397/408：删除确认前叠 canDelete（主考∧ACTIVE∧SESSION_CREATED）
    if (!canDelete(record.sessionStatus)) {
      showFormValidationMessage('仅草稿正评会话可删除')
      return
    }
    if (
      !(await confirmAsync({
        content: '确认删除该正评会话？正评草稿将被软删除，不可恢复。',
        okText: '删除',
        type: 'warning',
      }))
    ) {
      return
    }
    await submitDelete(record)
  }
}
</script>

<style lang="scss" scoped>
.formal-workbench {
  :deep(.dp-filter-bar) {
    width: 100%;
  }

  &__lifecycle {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }
}
</style>
