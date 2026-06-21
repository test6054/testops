<template>
  <section class="recycled-panel">
    <UiAlertStrip
      tone="info"
      title="手动再分配"
      description="MANUAL 回收策略下超时任务进入 RECYCLED；正评进行中或暂停态均可指定 ACTIVE 教师再分配为 ALLOCATED。"
      dense
    />
    <div class="recycled-panel__toolbar">
      <UiButton variant="outline" size="sm" :loading="loading" @click="loadTasks">刷新</UiButton>
    </div>
    <UiErrorRetryPanel
      v-if="tasksLoadError"
      :error="tasksLoadError"
      @retry="loadTasks"
    />
    <a-spin :spinning="loading">
      <UiEmpty v-if="!loading && !tasksLoadError && !tasks.length" description="暂无待分配回收任务" />
      <UiDataTable
        v-else
        pagination-mode="none"
        :columns="columns"
        :data-source="tasks"
        row-key="id"
        size="middle"
        flat
        :show-pagination="false"
        :total="tasks.length"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'reviewer'">
            {{ record.reviewerName }}
          </template>
          <template v-else-if="column.key === 'recycledAt'">
            {{ record.recycledAt ? formatDateTime(record.recycledAt) : '—' }}
          </template>
          <template v-else-if="column.key === 'targetReviewer'">
            <a-select
              v-model:value="targetReviewerByTaskId[record.id]"
              placeholder="选择目标教师"
              :options="reviewerOptionsByGroupId[record.groupId ?? ''] ?? []"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <UiButton
              size="sm"
              :loading="reassigningId === record.id"
              :disabled="!targetReviewerByTaskId[record.id]"
              @click="submitReassign(record)"
            >
              再分配
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </a-spin>
  </section>
</template>

<script lang="ts" setup>
import type { MarkingTaskVO, QuestionMarkingGroupVO } from '@/apis/mark/marking-organization'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  pageMarkingTasks,
  reassignRecycledMarkingTask,
  validateMarkingTaskContract,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readAllPages } from '@/utils/page-result'

defineOptions({ name: 'RecycledTaskReassignPanel' })

const props = defineProps<{
  examId: string
  groups: QuestionMarkingGroupVO[]
  viewAllRecycled: boolean
  leaderGroupIds: string[]
}>()

const loading = ref(false)
const reassigningId = ref<string | null>(null)
const tasks = ref<MarkingTaskVO[]>([])
// D-9：回收待分配任务列表加载失败时展示可重试错误面板
const tasksLoadError = ref<Error | null>(null)
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
  { title: '回收时间', key: 'recycledAt', width: 170 },
  { title: '回收原因', key: 'recycleReason', dataIndex: 'recycleReason', ellipsis: true },
  { title: '目标教师', key: 'targetReviewer', width: 220 },
  { title: '操作', key: 'action', width: 100 },
]

async function loadTasks() {
  if (!props.examId) {
    tasks.value = []
    return
  }
  loading.value = true
  tasksLoadError.value = null
  try {
    if (props.viewAllRecycled) {
      tasks.value = (await readAllPages(
        (pageNum) => pageMarkingTasks({
          examId: props.examId,
          taskStatus: 'RECYCLED',
          pageNum,
          pageSize: 100,
        }),
        '回收待分配任务加载失败，请稍后重试',
      )).map((task) => {
        validateMarkingTaskContract(task)
        return task
      })
      return
    }
    const merged: MarkingTaskVO[] = []
    for (const groupId of props.leaderGroupIds) {
      const part = await readAllPages(
        (pageNum) => pageMarkingTasks({
          examId: props.examId,
          groupId,
          taskStatus: 'RECYCLED',
          pageNum,
          pageSize: 100,
        }),
        '回收待分配任务加载失败，请稍后重试',
      )
      for (const task of part) {
        validateMarkingTaskContract(task)
        merged.push(task)
      }
    }
    tasks.value = merged
  } catch (error) {
    tasksLoadError.value = toUserError(error, '回收待分配任务加载失败')
    showUserError(error, '回收待分配任务加载失败')
    tasks.value = []
  } finally {
    loading.value = false
  }
}

async function submitReassign(task: MarkingTaskVO) {
  const targetReviewerUserId = targetReviewerByTaskId[task.id]
  if (!targetReviewerUserId) {
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

watch(() => props.examId, () => {
  void loadTasks()
}, { immediate: true })
</script>

<style scoped>
.recycled-panel__toolbar {
  display: flex;
  justify-content: flex-end;
  margin: 8px 0 12px;
}
</style>
