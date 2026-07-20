<template>
  <WorkbenchSurfaceCard flush class="recycled-panel">
    <template #toolbar>
      <div class="recycled-panel__toolbar-row">
        <span class="recycled-panel__hint">回收任务需指定目标教师后再分配</span>
        <UiButton variant="outline" size="sm" :loading="loading" @click="loadTasks">刷新</UiButton>
      </div>
    </template>

    <UiSkeletonState v-if="loading" variant="table" :rows="4" compact />
    <UiEmpty size="sm" v-else-if="!loading && pagination.total === 0" description="暂无待分配回收任务" />
    <UiDataTable
      v-else
      v-model:current="pagination.current"
      v-model:page-size="pagination.pageSize"
      pagination-mode="server"
      :columns="columns"
      :data-source="tasks"
      row-key="id"
      size="middle"
      flat
      :loading="loading"
      :total="pagination.total"
      @page-change="handlePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'reviewer'">
          {{ record.reviewerName }}
        </template>
        <template v-else-if="column.key === 'recycledTime'">
          {{ record.recycledTime ? formatDateTime(record.recycledTime) : '—' }}
        </template>
        <template v-else-if="column.key === 'targetReviewer'">
          <UiSelect
            v-if="canReassign === true"
            size="sm"
            v-model="targetReviewerByTaskId[record.id]"
            placeholder="选择目标教师"
            :options="reviewerOptionsByGroupId[record.groupId ?? ''] ?? []"
            style="width: 100%"
          />
          <span v-else class="recycled-panel__muted">—</span>
        </template>
        <template v-else-if="column.key === 'action'">
          <UiTableActions
            v-if="canReassign === true"
            :items="buildReassignActions(record)"
            split
            @action="() => submitReassign(record)"
          />
          <span v-else class="recycled-panel__muted">—</span>
        </template>
      </template>
    </UiDataTable>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type {
  MarkingTaskResponse,
  QuestionMarkingGroupResponse,
} from '@/apis/mark/marking-organization'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { pageMarkingTasks, reassignRecycledMarkingTask } from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { MarkingTaskStatusCode } from '@/types/enums/marking-task-status-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'RecycledTaskReassignPanel' })

const props = defineProps<{
  examId: string
  groups: QuestionMarkingGroupResponse[]
  viewAllRecycled: boolean
  leaderGroupIds: string[]
  /** MVR-317：与父 canReassignRecycledTasks / BE requireRecycledTaskReassignPermission 同源 */
  canReassign?: boolean
}>()

const loading = ref(false)
const reassigningId = ref<string | null>(null)
const tasks = ref<MarkingTaskResponse[]>([])
const pagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})
const targetReviewerByTaskId = reactive<Record<string, string>>({})

const reviewerOptionsByGroupId = computed(() => {
  const map: Record<string, Array<{ value: string, label: string }>> = {}
  for (const group of props.groups) {
    map[group.id] = group.reviewers.map((reviewer) => ({
      value: reviewer.reviewerUserId,
      label: `${reviewer.reviewerUserName}（${reviewer.reviewerTeacherNo}）`,
    }))
  }
  return map
})

const columns = [
  { title: '题组', key: 'groupName', dataIndex: 'groupName', width: 140 },
  { title: '原阅卷教师', key: 'reviewer', width: 140 },
  { title: '回收时间', key: 'recycledTime', width: 170 },
  { title: '回收原因', key: 'recycleReason', dataIndex: 'recycleReason', ellipsis: true },
  { title: '目标教师', key: 'targetReviewer', width: 220 },
  { title: '操作', key: 'action', width: 100 },
]

/** MVR-392：再分配行操作仅 canReassign===true 时渲染，避免关考/无权限假可点 */
function buildReassignActions(record: MarkingTaskResponse): UiTableRowActionItem[] {
  return [
    {
      key: 'reassign',
      label: '再分配',
      disabled: !targetReviewerByTaskId[record.id] || reassigningId.value === record.id,
    },
  ]
}

async function loadTasks(): Promise<void> {
  if (!props.examId) {
    tasks.value = []
    pagination.total = 0
    return
  }
  loading.value = true
  try {
    const result = await pageMarkingTasks({
      examId: props.examId,
      taskStatus: MarkingTaskStatusCode.RECYCLED,
      groupIds: props.viewAllRecycled ? undefined : props.leaderGroupIds,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    tasks.value = result.list
    pagination.total = result.total
    pagination.current = result.pageNum ?? pagination.current
    pagination.pageSize = result.pageSize ?? pagination.pageSize
  } catch (error) {
    showUserError(error, '回收待分配任务加载失败')
    tasks.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void loadTasks()
}

async function submitReassign(task: MarkingTaskResponse): Promise<void> {
  // MVR-317：回收再分配二次拦截
  if (props.canReassign !== true) {
    message.warning('当前账号无权再分配回收任务')
    return
  }
  const targetReviewerUserId = targetReviewerByTaskId[task.id]
  if (!targetReviewerUserId) {
    return
  }
  if (reassigningId.value) {
    return
  }
  reassigningId.value = task.id
  try {
    await reassignRecycledMarkingTask({
      taskId: task.id,
      targetReviewerUserId,
    })
    message.success('任务已再分配')
    delete targetReviewerByTaskId[task.id]
    await loadTasks()
  } catch (error) {
    showUserError(error, '回收任务再分配失败')
  } finally {
    reassigningId.value = null
  }
}

watch(
  () => [props.examId, props.viewAllRecycled, props.leaderGroupIds.join(',')] as const,
  () => {
    pagination.current = 1
    void loadTasks()
  },
  { immediate: true },
)
</script>

<style scoped>
.recycled-panel__toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.recycled-panel__hint {
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.recycled-panel__muted {
  color: var(--dp-text-tertiary, #8c8c8c);
}
</style>
