<template>
  <GiPageLayout>
    <div class="arbitration-page">
      <PageHeader title="仲裁复核">
        <template #tags>
          <UiTag :tone="tasks.length > 0 ? 'red' : 'green'" size="md">
            {{ tasks.length > 0 ? `${tasks.length} 条待仲裁` : '暂无驳回' }}
          </UiTag>
        </template>
        <template #actions>
          <a-select
            :value="selectedExamId"
            style="width: 280px"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadTasks"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </PageHeader>

      <UiEmpty
        v-if="!selectedExamId"
        description="请选择一场考试以查看驳回任务"
        class="empty-block"
      />

      <template v-else>
        <a-alert
          type="warning"
          show-icon
          message="仲裁说明"
          description="本页只展示状态为「已驳回」的复核任务，需要由仲裁教师重新进入批阅工作台再次判定最终给分。仲裁后任务最终状态由后端业务规则决定。"
        />

        <UiCard class="arbitration-page__list-card">
          <template #title>
            <ExclamationCircleOutlined />
            <span>已驳回任务</span>
            <UiBadge :tone="tasks.length > 0 ? 'red' : 'green'">
              {{ tasks.length }}
            </UiBadge>
          </template>

          <UiEmpty v-if="!loading && tasks.length === 0" description="当前无驳回任务" />

          <a-table
            v-else
            :columns="columns"
            :data-source="tasks"
            :loading="loading"
            :pagination="{ pageSize: 20, showTotal: (t: number) => `共 ${t} 条` }"
            row-key="reviewTaskId"
            size="middle"
            class="arbitration-table"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'anonymousNo'">
                <a-typography-text strong :content="tasks[index].anonymousNo || '-'" />
              </template>
              <template v-else-if="column.key === 'questionNo'">
                <UiTag tone="blue" size="sm">{{ tasks[index].questionNo || '-' }}</UiTag>
              </template>
              <template v-else-if="column.key === 'fullScore'">
                {{ tasks[index].fullScore ?? '-' }}
              </template>
              <template v-else-if="column.key === 'suggestedScore'">
                {{ tasks[index].suggestedScore ?? '-' }}
              </template>
              <template v-else-if="column.key === 'assignedTeacherUserId'">
                <span v-if="tasks[index].assignedTeacherUserId">
                  <UserOutlined class="mini-icon" />
                  {{
                    tasks[index].assignedTeacherUserId === currentUserId
                      ? '我'
                      : tasks[index].assignedTeacherUserId
                  }}
                </span>
                <span v-else class="muted">未指派</span>
              </template>
              <template v-else-if="column.key === 'updateTime'">
                {{ formatTime(tasks[index].updateTime) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <UiButton size="sm" @click="goWorkspace(tasks[index])">仲裁批阅</UiButton>
                  <UiButton size="sm" variant="ghost" @click="goDetail(tasks[index])">
                    详情
                  </UiButton>
                </a-space>
              </template>
            </template>
          </a-table>
        </UiCard>
      </template>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ReviewTaskItemVO } from '@/apis/mark/exam'
import ExclamationCircleOutlined from '@ant-design/icons-vue/ExclamationCircleOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listReviewTasks } from '@/apis/mark/exam'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useUserStore } from '@/stores/modules/user'

defineOptions({ name: 'TeacherReviewArbitration' })

const router = useRouter()
const userStore = useUserStore()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const currentUserId = computed(() => userStore.userInfo.userId || '')

const tasks = ref<ReviewTaskItemVO[]>([])
const loading = ref(false)

const columns: ColumnType<ReviewTaskItemVO>[] = [
  { title: '匿名号', key: 'anonymousNo', width: 140 },
  { title: '题号', key: 'questionNo', width: 100 },
  { title: '满分', key: 'fullScore', width: 80 },
  { title: 'AI 建议分', key: 'suggestedScore', width: 100 },
  { title: '指派教师', key: 'assignedTeacherUserId', width: 160 },
  { title: '更新时间', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    tasks.value = await listReviewTasks({
      examId: selectedExamId.value,
      status: 'REJECTED',
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '驳回任务加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

function goWorkspace(record: ReviewTaskItemVO): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherReviewWorkspace',
    query: { examId: selectedExamId.value, taskId: record.reviewTaskId },
  })
}

function goDetail(record: ReviewTaskItemVO): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherReviewTaskDetail',
    params: { taskId: record.reviewTaskId },
    query: { examId: selectedExamId.value },
  })
}

watch(selectedExamId, (value) => {
  if (value) {
    void loadTasks()
  } else {
    tasks.value = []
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadTasks()
  }
})
</script>

<style lang="scss" scoped>
.arbitration-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.arbitration-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.muted {
  color: var(--ant-color-text-tertiary);
}

.mini-icon {
  margin-right: 4px;
  color: var(--ant-color-text-tertiary);
}

.empty-block {
  padding: 60px 0;
}
</style>
