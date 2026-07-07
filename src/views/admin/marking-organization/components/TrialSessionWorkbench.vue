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
            :tone="strictEnumTone(TRIAL_SESSION_STATUS_TONE, record.sessionStatus, '试评会话状态')"
            size="sm"
          >
            {{
              strictEnumLabel(TrialSessionStatusDescription, record.sessionStatus, '试评会话状态')
            }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'progress'">
          <a-progress
            :percent="sessionProgressPercent(record.totalTaskCount, record.finalizedTaskCount)"
            size="small"
            :stroke-color="
              record.finalizedTaskCount >= record.totalTaskCount && record.totalTaskCount > 0
                ? '#52c41a'
                : '#1677ff'
            "
          />
        </template>
        <template v-else-if="column.key === 'calibrationSummary'">
          <span class="trial-workbench__ellipsis">{{ record.calibrationSummary || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(record.createTime) || '—' }}
        </template>
        <template v-else-if="column.key === 'closeTime'">
          {{ formatDateTime(record.closeTime) || '—' }}
        </template>
        <template v-else-if="column.key === 'action'">
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
import type { ColumnType } from 'ant-design-vue/es/table'
import type { TrialSessionResponse } from '@/apis/mark/marking-organization'
import {
  deleteTrialSession,
  startTrialSession,
  TRIAL_SESSION_STATUS_TONE,
  TrialSessionStatusDescription,
} from '@/apis/mark/marking-organization'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { WorkflowPrerequisiteEmptyViewModel } from '@/components/workbench/workflow-readiness/types'
import type { MarkingOrgSessionFilterModel } from '@/composables/useMarkingOrgSessionWorkspace'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import WorkflowPrerequisiteEmpty from '@/components/workbench/workflow-readiness/WorkflowPrerequisiteEmpty.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  ALL_TRIAL_SESSION_STATUS_CODES,
  TrialSessionStatusCode,
} from '@/types/enums/trial-session-status-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import TrialSessionCalibrateDrawer from './TrialSessionCalibrateDrawer.vue'

interface GroupOption {
  value: string
  label: string
}

interface SessionPaginationState {
  current: number
  pageSize: number
  total: number
}

defineOptions({ name: 'TrialSessionWorkbench' })

const props = defineProps<{
  sessions: TrialSessionResponse[]
  groupOptions: GroupOption[]
  filterModel: MarkingOrgSessionFilterModel
  pagination: SessionPaginationState
  loading?: boolean
  canManage: boolean
  createBlocked?: boolean
  prerequisiteEmpty?: WorkflowPrerequisiteEmptyViewModel
}>()

const emit = defineEmits<{
  refresh: []
  search: [model: Record<string, unknown>]
  reset: []
  'page-change': [page: { current: number; pageSize: number }]
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
  { title: '题组', key: 'groupName', dataIndex: 'groupName', width: 140 },
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
  { title: '校准结论', key: 'calibrationSummary', ellipsis: true },
  { title: '创建时间', key: 'createTime', width: 160 },
  { title: '关闭时间', key: 'closeTime', width: 160 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
]

const statusFilterOptions = computed(() =>
  ALL_TRIAL_SESSION_STATUS_CODES.map((status) => ({
    value: status,
    label: TrialSessionStatusDescription[status],
  })),
)

const filterFields = computed((): FilterField[] => [
  {
    key: 'keyword',
    type: 'input',
    inputPrefixIcon: 'search',
    placeholder: '搜索题组、状态、校准结论',
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

const hasActiveFilter = computed(
  () =>
    Boolean(props.filterModel.keyword.trim()) ||
    Boolean(props.filterModel.status) ||
    Boolean(props.filterModel.groupId),
)

const sessionTableEmptyDescription = computed(() => {
  if (props.pagination.total === 0 && !hasActiveFilter.value) {
    if (props.createBlocked) {
      return ''
    }
    return props.canManage ? '暂无试评会话，点击顶部「创建试评」开始定标' : '暂无试评会话'
  }
  if (props.pagination.total === 0 && hasActiveFilter.value) {
    return '未找到匹配会话，请调整筛选条件'
  }
  return '暂无试评会话'
})

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

function sessionProgressPercent(total: number, finalized: number): number {
  if (total <= 0) {
    return 0
  }
  return Math.round((finalized * 100) / total)
}

function emitSearch(model: Record<string, unknown>): void {
  emit('search', model)
}

function emitReset(): void {
  emit('reset')
}

function emitPageChange(page: { current: number; pageSize: number }): void {
  emit('page-change', page)
}

function canStart(status: TrialSessionStatusCode): boolean {
  return props.canManage && status === TrialSessionStatusCode.TRIAL_CREATED
}

function canCalibrate(status: TrialSessionStatusCode): boolean {
  return (
    props.canManage &&
    (status === TrialSessionStatusCode.TRIAL_ASSIGNED ||
      status === TrialSessionStatusCode.TRIAL_SUBMITTED)
  )
}

function canClose(status: TrialSessionStatusCode): boolean {
  return (
    props.canManage &&
    (status === TrialSessionStatusCode.TRIAL_ASSIGNED ||
      status === TrialSessionStatusCode.TRIAL_SUBMITTED ||
      status === TrialSessionStatusCode.CALIBRATED)
  )
}

function canDelete(status: TrialSessionStatusCode): boolean {
  return props.canManage && status === TrialSessionStatusCode.TRIAL_CREATED
}

function buildRowActions(record: TrialSessionResponse): UiTableRowActionItem[] {
  return [
    {
      key: 'start',
      label: '启动试评',
      hidden: !canStart(record.sessionStatus),
      disabled: startingId.value === record.id,
    },
    {
      key: 'calibrate',
      label: '提交校准',
      hidden: !canCalibrate(record.sessionStatus),
    },
    {
      key: 'close',
      label: '关闭试评',
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
  message.warning('仅考试主考老师可管理试评会话')
  return false
}

async function submitStart(sessionId: string): Promise<void> {
  if (!guardManageAction()) {
    return
  }
  startingId.value = sessionId
  try {
    await startTrialSession(sessionId)
    message.success('试评会话已启动，教师可在试评任务池领取样本卷')
    emit('refresh')
  } catch (error) {
    showUserError(error, '启动试评会话失败')
  } finally {
    startingId.value = null
  }
}

async function submitDelete(sessionId: string): Promise<void> {
  if (!guardManageAction()) {
    return
  }
  deletingId.value = sessionId
  try {
    await deleteTrialSession(sessionId)
    message.success('试评草稿会话已删除')
    emit('refresh')
  } catch (error) {
    showUserError(error, '删除试评会话失败')
  } finally {
    deletingId.value = null
  }
}

async function handleSessionRowAction(key: string, record: TrialSessionResponse): Promise<void> {
  if (key === 'start') {
    await submitStart(record.id)
    return
  }
  if (key === 'calibrate') {
    if (!guardManageAction()) {
      return
    }
    calibrateTarget.value = record
    calibrateOpen.value = true
    return
  }
  if (key === 'close') {
    emit('open-lifecycle', 'closeTrial', record.id)
    return
  }
  if (key === 'delete') {
    if (
      !(await confirmAsync({
        content: '确认删除该试评会话？试评草稿将被软删除，不可恢复。',
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
.trial-workbench {
  :deep(.dp-filter-bar) {
    width: 100%;
  }

  &__ellipsis {
    display: block;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
