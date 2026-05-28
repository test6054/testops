<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="marking-task-detail-page__context">
        <div class="marking-task-detail-page__context-left">
          <UiTag v-if="task" :tone="STATUS_TONE[task.taskStatus]" size="sm">
            {{ STATUS_LABEL[task.taskStatus] }}
          </UiTag>
          <UiTag v-if="task" tone="blue" size="sm">第 {{ task.reviewRound }} 轮</UiTag>
          <UiTag v-if="task?.anonymousToken" tone="gray" size="sm">{{ task.anonymousToken }}</UiTag>
        </div>
        <div class="marking-task-detail-page__context-right">
          <template v-if="batchProgress">
            <UiButton
              size="sm"
              variant="outline"
              :disabled="!prevTaskId"
              @click="goToTask(prevTaskId)"
            >
              <template #icon><LeftOutlined /></template>
              上一题
            </UiButton>
            <span class="marking-task-detail-page__progress">
              {{ batchProgress.current }} / {{ batchProgress.total }}
            </span>
            <UiButton
              size="sm"
              variant="outline"
              :disabled="!nextTaskId"
              @click="goToTask(nextTaskId)"
            >
              下一题
              <template #icon><RightOutlined /></template>
            </UiButton>
          </template>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadTask">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!taskId"
      description="缺少必要参数 taskId"
      class="marking-task-detail-page__empty"
    />

    <!-- D-9 错误态：阅卷任务详情加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-else-if="taskLoadError"
      :error="taskLoadError"
      title="阅卷任务详情加载失败"
      :helper="`任务 ID：${taskId}`"
      @retry="loadTask"
    />

    <a-spin v-else :spinning="loading">
      <UiEmpty
        v-if="!loading && !task"
        description="未找到匹配的阅卷任务"
        class="marking-task-detail-page__empty"
      />

      <a-row v-if="task" :gutter="16">
        <a-col :xs="24" :lg="14">
          <UiCard class="info-card">
            <template #title>
              <FileImageOutlined />
              <span>作答切片</span>
            </template>
            <UiEmpty v-if="!task.sliceFileId" description="该任务暂无切片文件" />
            <a-spin v-else :spinning="sliceLoading" tip="加载切片中...">
              <a-image v-if="sliceImageUrl" :src="sliceImageUrl" :preview="{}" class="slice-image">
                <template #previewMask>点击查看原图</template>
              </a-image>
              <UiErrorRetryPanel
                v-else-if="!sliceLoading && sliceLoadError"
                :error="sliceLoadError"
                title="切片图加载失败"
                compact
                @retry="retryLoadSliceImage"
              />
            </a-spin>
          </UiCard>

          <UiCard class="info-card">
            <template #title>
              <ProfileOutlined />
              <span>任务详情</span>
            </template>

            <a-descriptions
              :column="{ xs: 1, sm: 2 }"
              size="middle"
              bordered
              class="task-descriptions"
            >
              <a-descriptions-item label="任务ID">
                <a-typography-text copyable>{{ task.id }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="正评会话ID">
                <a-typography-text copyable>{{ task.sessionId }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="题组ID">
                <a-typography-text copyable>{{ task.groupId }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="题目模板ID">
                <a-typography-text copyable>
                  {{ task.questionTemplateId }}
                </a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="试卷实例ID">
                <a-typography-text copyable>{{ task.paperInstanceId }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="评阅轮次"
                >第 {{ task.reviewRound }} 轮</a-descriptions-item
              >
              <a-descriptions-item label="任务状态">
                <UiTag :tone="STATUS_TONE[task.taskStatus]" size="sm">
                  {{ STATUS_LABEL[task.taskStatus] }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="分配时间">
                {{ formatDateTime(task.allocatedAt) }}
              </a-descriptions-item>
              <a-descriptions-item label="提交时间">
                {{ formatDateTime(task.submittedAt) }}
              </a-descriptions-item>
              <a-descriptions-item
                v-if="task.score !== undefined && task.score !== null"
                label="当前给分"
              >
                <a-typography-text strong>{{ task.score }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item v-if="task.annotationNote" label="既有批注" :span="2">
                <a-typography-paragraph :ellipsis="{ rows: 3, expandable: true, symbol: '展开' }">
                  {{ task.annotationNote }}
                </a-typography-paragraph>
              </a-descriptions-item>
            </a-descriptions>
          </UiCard>
        </a-col>

        <a-col :xs="24" :lg="10">
          <UiCard class="info-card">
            <template #title>
              <EditOutlined />
              <span>批改提交</span>
            </template>

            <a-alert
              v-if="!canSubmit"
              type="info"
              show-icon
              message="当前任务状态不允许提交"
              description="仅已分配或批改中状态可以提交批改。"
              style="margin-bottom: 12px"
            />

            <a-form
              ref="formRef"
              :model="form"
              :rules="rules"
              layout="vertical"
              :disabled="!canSubmit"
            >
              <a-form-item label="教师给分" name="score" required>
                <a-input-number
                  v-model:value="form.score"
                  :min="0"
                  :step="0.5"
                  style="width: 100%"
                  placeholder="按题目满分给分"
                />
              </a-form-item>
              <a-form-item label="批改批注" name="annotationNote">
                <a-textarea
                  v-model:value="form.annotationNote"
                  :rows="6"
                  :maxlength="1000"
                  placeholder="可选，记录采分点 / 扣分点 / 反馈意见"
                  show-count
                />
              </a-form-item>
              <a-form-item>
                <UiButton
                  block
                  size="md"
                  :disabled="!canSubmit"
                  :loading="submitting"
                  @click="submit"
                >
                  确认给分并提交
                </UiButton>
              </a-form-item>
            </a-form>
          </UiCard>
        </a-col>
      </a-row>
    </a-spin>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { MarkingTaskVO } from '@/apis/mark/marking-organization'
import {
  getMarkingTaskDetail,
  MARKING_TASK_STATUS_LABEL as STATUS_LABEL,
  MARKING_TASK_STATUS_TONE as STATUS_TONE,
  submitMarkingTask,
} from '@/apis/mark/marking-organization'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import LeftOutlined from '@ant-design/icons-vue/LeftOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import RightOutlined from '@ant-design/icons-vue/RightOutlined'
import message from 'ant-design-vue/es/message'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import { UiButton, UiCard, UiEmpty, UiErrorRetryPanel, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { useUserStore } from '@/stores/modules/user'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'TeacherMarkingTaskDetail' })

const route = useRoute()

const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))

const task = ref<MarkingTaskVO | null>(null)
const loading = ref(false)
// D-9 错误态：阅卷任务详情加载失败时 UiErrorRetryPanel 重试 + 上报
const taskLoadError = ref<unknown>(null)

const canSubmit = computed(() => {
  // task.value?.taskStatus 本身就是 MarkingTaskStatusCode | undefined，无需任何 cast。
  const status = task.value?.taskStatus
  return status === 'ALLOCATED' || status === 'IN_PROGRESS'
})

// ─── P2 上下题快捷导航 ─────────────────────────────────
// 来源：markTaskStore.tasks（教师在该考试下已加载的本批阅卷任务列表）
// 当用户从 marking-task-pool 进入详情时，store 已含本批任务，直接渲染导航；
// 当用户刷新页面 / 复制链接 / 跨 tab 直链进入详情时，store 是空的，
// 由 ensureBatchLoaded() 在 task 加载成功后兜底按 (examId + reviewerUserId)
// 拉取该批任务列表填充 store，让导航在所有进入路径下都可用。
const router = useRouter()
const userStore = useUserStore()
const markTaskStore = useMarkTaskStore()
const { tasks: batchTasks } = storeToRefs(markTaskStore)

interface BatchProgress {
  current: number
  total: number
}

const batchProgress = computed<BatchProgress | null>(() => {
  if (!task.value || batchTasks.value.length === 0) return null
  const idx = batchTasks.value.findIndex((t) => t.id === task.value!.id)
  if (idx < 0) return null
  return { current: idx + 1, total: batchTasks.value.length }
})

const prevTaskId = computed<string>(() => {
  if (!batchProgress.value) return ''
  const idx = batchProgress.value.current - 1
  return idx > 0 ? batchTasks.value[idx - 1].id : ''
})

const nextTaskId = computed<string>(() => {
  if (!batchProgress.value) return ''
  const idx = batchProgress.value.current - 1
  return idx < batchTasks.value.length - 1 ? batchTasks.value[idx + 1].id : ''
})

function goToTask(targetTaskId: string): void {
  if (!targetTaskId) return
  void router.push({
    name: 'TeacherMarkingTaskDetail',
    params: { taskId: targetTaskId },
    query: route.query,
  })
}

async function loadTask(): Promise<void> {
  if (!taskId.value) return
  loading.value = true
  taskLoadError.value = null
  try {
    const detail = await getMarkingTaskDetail({ taskId: taskId.value })
    task.value = detail
    if (form.score === undefined && detail.score !== undefined && detail.score !== null) {
      form.score = Number(detail.score)
    }
    if (!form.annotationNote && detail.annotationNote) {
      form.annotationNote = detail.annotationNote
    }
    if (detail.sliceFileId) {
      void loadSliceImage(detail.sliceFileId)
    }
    // 详情加载成功后兜底回灌本批任务到 store，让上下题导航在直链刷新场景下也可用
    void ensureBatchLoaded(detail.examId)
  } catch (error) {
    task.value = null
    taskLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '任务详情加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

/**
 * 兜底拉取当前考试 + 当前教师的本批阅卷任务列表填充 store。
 *
 * 触发条件：当前 store 已加载的 examId 与 task 所属考试不一致（含 store 为空）。
 * 静默失败：兜底失败仅意味着上下题导航不可用，不应阻断主任务详情显示，
 * 因此用 try/catch 吞错并保留 console 警告，便于排查但不打扰教师。
 */
async function ensureBatchLoaded(examId: string): Promise<void> {
  if (!examId) return
  if (markTaskStore.tasksLoadedExamId === examId && batchTasks.value.length > 0) return
  const reviewerUserId = userStore.userInfo.userId
  if (!reviewerUserId) return
  try {
    await markTaskStore.loadTasks({ examId, reviewerUserId })
  } catch (error) {
    // 兜底失败不影响主流程，仅丢失上下题导航能力
    console.warn('[marking-task-detail] 兜底加载本批任务列表失败：', error)
  }
}

const sliceImageUrl = ref<string | null>(null)
const sliceLoading = ref(false)
const sliceLoadError = ref<unknown>(null)

async function loadSliceImage(fileId: string): Promise<void> {
  releaseSliceImage()
  sliceLoading.value = true
  sliceLoadError.value = null
  try {
    sliceImageUrl.value = await getImageBlobUrl(fileId)
  } catch (error) {
    sliceLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '切片图加载失败'
    message.error(errMsg)
  } finally {
    sliceLoading.value = false
  }
}

function retryLoadSliceImage(): void {
  if (!task.value?.sliceFileId) return
  void loadSliceImage(task.value.sliceFileId)
}

function releaseSliceImage(): void {
  if (sliceImageUrl.value) {
    URL.revokeObjectURL(sliceImageUrl.value)
    sliceImageUrl.value = null
  }
}

const formRef = ref<FormInstance>()
const form = reactive<{ score?: number; annotationNote?: string }>({
  score: undefined,
  annotationNote: '',
})

const rules: Record<string, Rule[]> = {
  score: [
    { required: true, message: '请填写教师给分', trigger: 'change' },
    {
      validator(_rule, value) {
        if (value === undefined || value === null) return Promise.resolve()
        if (Number(value) < 0) return Promise.reject(new Error('给分不能为负'))
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
  annotationNote: [{ max: 1000, message: '批注最多 1000 字', trigger: 'blur' }],
}

const submitting = ref(false)

async function submit(): Promise<void> {
  if (!taskId.value || !formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    await submitMarkingTask({
      taskId: taskId.value,
      score: form.score!,
      annotationNote: form.annotationNote?.trim() || undefined,
    })
    message.success('阅卷任务已提交')
    await loadTask()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '提交阅卷任务失败'
    message.error(errMsg)
  } finally {
    submitting.value = false
  }
}

watch(taskId, () => {
  // 切题时清空上一题的表单状态与切片，避免误带入下一题
  form.score = undefined
  form.annotationNote = ''
  task.value = null
  sliceLoadError.value = null
  releaseSliceImage()
  void loadTask()
})

onMounted(() => {
  if (taskId.value) {
    void loadTask()
  }
})

onBeforeUnmount(() => {
  releaseSliceImage()
})
</script>

<style lang="scss" scoped>
.marking-task-detail-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__context-right {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__progress {
    font-size: 13px;
    font-weight: 500;
    color: var(--dp-text-secondary, #475569);
    padding: 0 4px;
    white-space: nowrap;
  }

  &__empty {
    padding: 60px 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-block {
  margin-top: 48px;
}

.info-card {
  margin-bottom: 16px;
}

.task-descriptions {
  :deep(.ant-descriptions-item-label) {
    width: 140px;
    color: #595959;
  }
}

.slice-image {
  width: 100%;
  border-radius: 4px;
}
</style>
