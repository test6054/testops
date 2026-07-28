<template>
  <WorkbenchSurfaceCard flush class="trial-workbench">
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
          v-if="createBlocked === true && prerequisiteEmpty"
          :model="prerequisiteEmpty"
        />
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'groupName'">
          <UiTypographyText strong>{{ record.groupName }}</UiTypographyText>
        </template>
        <template v-else-if="column.key === 'status'">
          <UiTag
            :tone="strictEnumTone(TRIAL_SESSION_STATUS_TONE, record.sessionStatus, '试评会话状态')"
            size="sm"
          >
            {{
              strictEnumLabel(TrialSessionStatusDescription, record.sessionStatus, '试评会话状态')
            }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'progress'">
          <span
            v-if="sessionProgressPercent(record.totalTaskCount, record.finalizedTaskCount) == null"
          >—</span>
          <UiProgressBar
            v-else
            :percent="sessionProgressPercent(record.totalTaskCount, record.finalizedTaskCount)!"
            size="sm"
            :color="
              record.finalizedTaskCount >= record.totalTaskCount && record.totalTaskCount > 0
                ? 'var(--dp-success)'
                : 'var(--dp-color-primary)'
            "
            :show-label="false"
          />
        </template>
        <template v-else-if="column.key === 'consistencyRate'">
          {{ record.consistencyRate == null ? '—' : `${record.consistencyRate}%` }}
        </template>
        <template v-else-if="column.key === 'divergentSampleCount'">
          {{ record.divergentSampleCount == null ? '—' : record.divergentSampleCount }}
        </template>
        <template v-else-if="column.key === 'calibrationSummary'">
          <UiEllipsisText :text="record.calibrationSummary" />
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(record.createTime) || '—' }}
        </template>
        <template v-else-if="column.key === 'closeTime'">
          {{ formatDateTime(record.closeTime) || '—' }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="buildRowActions(record)"
            split
            @action="(key) => handleSessionRowAction(key, record)"
          />
        </template>
      </template>
    </UiDataTable>

    <TrialSessionCalibrateDrawer
      v-model:open="calibrateOpen"
      :session="calibrateTarget"
      :can-manage="canManage"
      @success="emit('refresh')"
    />
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
// MVR-951：函数式 can*(...) 写入口仅认 === true
// MVR-945：canManage* 控制流仅认 === true
import type { ColumnType } from 'ant-design-vue/es/table'
import type { TrialSessionResponse } from '@/apis/mark/marking-organization'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { WorkflowPrerequisiteEmptyViewModel } from '@/components/workbench/workflow-readiness/types'
import type { MarkingOrgSessionFilterModel } from '@/composables/useMarkingOrgSessionWorkspace'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  deleteTrialSession,
  startTrialSession,
  TRIAL_SESSION_STATUS_TONE,
  TrialSessionStatusDescription,
} from '@/apis/mark/marking-organization'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEllipsisText from '@/components/ui-guide/ui/UiEllipsisText.vue'
import UiProgressBar from '@/components/ui-guide/ui/UiProgressBar.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import WorkflowPrerequisiteEmpty from '@/components/workbench/workflow-readiness/WorkflowPrerequisiteEmpty.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { QuestionMarkingGroupStatusCode } from '@/types/enums/question-marking-group-status-enum'
import { TrialSessionStatusCode } from '@/types/enums/trial-session-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import {
  buildMarkingSessionFilterFields,
  resolveSessionTableEmptyDescription,
} from '@/utils/marking-session-list-contract'
import { resolveTaskProgressPercent } from '@/utils/session-task-progress'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import TrialSessionCalibrateDrawer from './TrialSessionCalibrateDrawer.vue'

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

defineOptions({ name: 'TrialSessionWorkbench' })

const props = withDefaults(
  defineProps<{
  sessions: TrialSessionResponse[]
  groupOptions: GroupOption[]
  filterModel: MarkingOrgSessionFilterModel
  pagination: SessionPaginationState
  loading?: boolean
  canManage: boolean
  /** MVR-398：关闭试评仅主考、不叠 ACTIVE */
  canCloseMarkingSessions?: boolean // MVR-940: optional BE 能力位写路径仅认 === true
  createBlocked?: boolean
  prerequisiteEmpty?: WorkflowPrerequisiteEmptyViewModel
  /** 列表请求失败时禁止把失败伪装成「暂无」空态 */
  sessionsLoadFailed?: boolean
}>(),
  {
    canManage: false,
    canCloseMarkingSessions: false,
    createBlocked: false,
    loading: false,
  },
)
const emit = defineEmits<{
  "refresh": []
  "search": [model: Record<string, unknown>]
  "reset": []
  'page-change': [page: { current: number, pageSize: number }]
  'open-lifecycle': [action: 'closeTrial', sessionId: string]
}>()

const draftFilterModel = ref<Record<string, unknown>>({
  keyword: '',
  status: undefined,
  groupId: undefined,
})

const startingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const calibrateOpen = ref(false)
const calibrateTarget = ref<TrialSessionResponse | null>(null)

const sessionColumns: ColumnType<TrialSessionResponse>[] = [
  { title: '题组', key: 'groupName', dataIndex: 'groupName', width: 140, fixed: 'left' },
  { title: '状态', key: 'status', width: 120 },
  {
    title: '样卷数',
    dataIndex: 'totalTaskCount',
    key: 'totalTaskCount',
    width: 80,
    align: 'right',
  },
  {
    title: '已完成',
    dataIndex: 'finalizedTaskCount',
    key: 'finalizedTaskCount',
    width: 80,
    align: 'right',
  },
  { title: '进度', key: 'progress', width: 140 },
  {
    title: '一致性',
    key: 'consistencyRate',
    width: 88,
    align: 'right',
  },
  {
    title: '分歧',
    key: 'divergentSampleCount',
    width: 72,
    align: 'right',
  },
  { title: '校准结论', key: 'calibrationSummary', ellipsis: true },
  { title: '创建时间', key: 'createTime', width: 160 },
  { title: '关闭时间', key: 'closeTime', width: 160 },
  { title: '操作', key: 'actions', width: 200 },
]

const filterFields = computed(() => buildMarkingSessionFilterFields('trial', props.groupOptions))

const sessionTableEmptyDescription = computed(() =>
  resolveSessionTableEmptyDescription({
    phase: 'trial',
    loadFailed: props.sessionsLoadFailed === true,
    total: props.pagination.total,
    filter: props.filterModel,
    createHint: props.createBlocked === true
      ? ''
      : props.canManage === true
        ? '暂无试评会话，点击顶部「创建试评」开始定标'
        : '暂无试评会话',
  }),
)

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

function sessionProgressPercent(total: number, finalized: number): number | null {
  return resolveTaskProgressPercent(total, finalized)
}

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

function canStart(record: TrialSessionResponse): boolean {
  return (
    props.canManage === true && record.sessionStatus === TrialSessionStatusCode.TRIAL_CREATED
    && isGroupStartable(record.groupId)
  )
}

function canCalibrate(status: TrialSessionStatusCode): boolean {
  return (
    props.canManage === true && (status === TrialSessionStatusCode.TRIAL_ASSIGNED
      || status === TrialSessionStatusCode.TRIAL_SUBMITTED)
  )
}

function canClose(status: TrialSessionStatusCode): boolean {
  // MVR-398/967：关闭试评认 canCloseMarkingSessions===true（主考，不叠 ACTIVE）
  return (
    props.canCloseMarkingSessions === true
    && (status === TrialSessionStatusCode.TRIAL_ASSIGNED
      || status === TrialSessionStatusCode.TRIAL_SUBMITTED
      || status === TrialSessionStatusCode.CALIBRATED)
  )
}

function canDelete(status: TrialSessionStatusCode): boolean {
  return props.canManage === true && status === TrialSessionStatusCode.TRIAL_CREATED
}

function buildRowActions(record: TrialSessionResponse): UiTableRowActionItem[] {
  return [
    {
      key: 'start',
      label: '启动试评',
      hidden: canStart(record) !== true,
      disabled: startingId.value === record.id,
    },
    {
      key: 'calibrate',
      label: '提交校准',
      hidden: canCalibrate(record.sessionStatus) !== true,
    },
    {
      key: 'close',
      label: '关闭试评',
      hidden: canClose(record.sessionStatus) !== true,
    },
    {
      key: 'delete',
      label: '删除草稿',
      tone: 'danger',
      hidden: canDelete(record.sessionStatus) !== true,
      disabled: deletingId.value === record.id,
    },
  ]
}

function guardManageAction(): boolean {
  // MVR-377：仅认 BE canManageExamOwner===true（父层已叠 ACTIVE）
  if (props.canManage === true) {
    return true
  }
  showFormValidationMessage('仅考试主考老师可管理试评会话')
  return false
}

async function submitStart(record: TrialSessionResponse): Promise<void> {
  if (!guardManageAction()) {
    return
  }
  // MVR-412：与 canStart 同源二次闸（主考∧ACTIVE∧TRIAL_CREATED∧题组 ACTIVE/CONFIGURED）
  if (canStart(record) !== true) {
    showFormValidationMessage(
      isGroupStartable(record.groupId)
        ? '仅草稿试评会话可启动'
        : '题组已关闭或为草稿状态，不能启动试评会话',
    )
    return
  }
  if (Boolean(startingId.value) || Boolean(deletingId.value)) {
    return
  }
  startingId.value = record.id
  try {
    await startTrialSession(record.id)
    void message.success('试评会话已启动，教师可在试评任务池领取样本卷')
    emit('refresh')
  } catch (error) {
    showUserError(error, '启动试评会话失败')
  } finally {
    startingId.value = null
  }
}

async function submitDelete(record: TrialSessionResponse): Promise<void> {
  if (!guardManageAction()) {
    return
  }
  // MVR-408：删除二次闸，与 canDelete / BE TRIAL_CREATED 同源
  if (canDelete(record.sessionStatus) !== true) {
    showFormValidationMessage('仅草稿试评会话可删除')
    return
  }
  if (Boolean(deletingId.value) || Boolean(startingId.value)) {
    return
  }
  deletingId.value = record.id
  try {
    await deleteTrialSession(record.id)
    void message.success('试评草稿会话已删除')
    emit('refresh')
  } catch (error) {
    showUserError(error, '删除试评会话失败')
  } finally {
    deletingId.value = null
  }
}

async function handleSessionRowAction(key: string, record: TrialSessionResponse): Promise<void> {
  if (key === 'start') {
    await submitStart(record)
    return
  }
  if (key === 'calibrate') {
    // MVR-408：校准打开闸与 canCalibrate 同源
    if (canCalibrate(record.sessionStatus) !== true) {
      showFormValidationMessage('当前试评会话状态不可提交校准')
      return
    }
    calibrateTarget.value = record
    calibrateOpen.value = true
    return
  }
  if (key === 'close') {
    // MVR-398：关闭试评打开闸认 canCloseMarkingSessions，关考后仍可收口
    if (props.canCloseMarkingSessions !== true) {
      showFormValidationMessage('仅考试主考老师可关闭试评会话')
      return
    }
    emit('open-lifecycle', 'closeTrial', record.id)
    return
  }
  if (key === 'delete') {
    // MVR-397/408：删除确认前叠 canDelete（主考∧ACTIVE∧TRIAL_CREATED）
    if (canDelete(record.sessionStatus) !== true) {
      showFormValidationMessage('仅草稿试评会话可删除')
      return
    }
    if (
      !(await confirmAsync({
        content: '确认删除该试评会话？试评草稿将被软删除，不可恢复。',
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
.trial-workbench {
  :deep(.dp-filter-bar) {
    width: 100%;
  }
}
</style>
