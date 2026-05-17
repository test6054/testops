<template>
  <GiPageLayout>
    <div class="marking-task-detail-page">
      <PageHeader title="阅卷工作台" back-route="/teacher/marking-task-pool">
        <template #tags>
          <UiTag v-if="task?.taskStatus" :tone="STATUS_TONE[task.taskStatus]" size="md">
            {{ STATUS_LABEL[task.taskStatus] }}
          </UiTag>
          <UiTag v-if="task" tone="blue" size="md">第 {{ task.reviewRound || 1 }} 轮</UiTag>
          <UiTag v-if="task?.anonymousToken" tone="gray" size="md">{{ task.anonymousToken }}</UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadTask">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </PageHeader>

      <UiEmpty v-if="!taskId" description="缺少必要参数 taskId" class="empty-block" />

      <a-spin v-else :spinning="loading">
        <UiEmpty v-if="!loading && !task" description="未找到匹配的阅卷任务" class="empty-block" />

        <a-row v-if="task" :gutter="16">
          <a-col :xs="24" :lg="14">
            <UiCard class="info-card">
              <template #title>
                <FileImageOutlined />
                <span>作答切片</span>
              </template>
              <UiEmpty v-if="!task.sliceFileId" description="该任务暂无切片文件" />
              <a-spin v-else :spinning="sliceLoading" tip="加载切片中...">
                <a-image
                  v-if="sliceImageUrl"
                  :src="sliceImageUrl"
                  :preview="{}"
                  class="slice-image"
                >
                  <template #previewMask>点击查看原图</template>
                </a-image>
                <UiEmpty v-else-if="!sliceLoading" description="切片加载失败" />
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
                  <a-typography-text copyable>{{ task.sessionId || '-' }}</a-typography-text>
                </a-descriptions-item>
                <a-descriptions-item label="题组ID">
                  <a-typography-text copyable>{{ task.groupId || '-' }}</a-typography-text>
                </a-descriptions-item>
                <a-descriptions-item label="题目模板ID">
                  <a-typography-text copyable>{{
                    task.questionTemplateId || '-'
                  }}</a-typography-text>
                </a-descriptions-item>
                <a-descriptions-item label="试卷实例ID">
                  <a-typography-text copyable>{{ task.paperInstanceId || '-' }}</a-typography-text>
                </a-descriptions-item>
                <a-descriptions-item label="评阅轮次"
                  >第 {{ task.reviewRound || 1 }} 轮</a-descriptions-item
                >
                <a-descriptions-item label="任务状态">
                  <UiTag :tone="task.taskStatus ? STATUS_TONE[task.taskStatus] : 'gray'" size="sm">
                    {{ task.taskStatus ? STATUS_LABEL[task.taskStatus] : '-' }}
                  </UiTag>
                </a-descriptions-item>
                <a-descriptions-item label="分配时间">{{
                  formatTime(task.allocatedAt)
                }}</a-descriptions-item>
                <a-descriptions-item label="提交时间">{{
                  formatTime(task.submittedAt)
                }}</a-descriptions-item>
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
                description="仅已分配 (ALLOCATED) 或批改中 (IN_PROGRESS) 状态可以提交批改。"
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
    </div>
  </GiPageLayout>
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
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'TeacherMarkingTaskDetail' })

const route = useRoute()

const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))

const task = ref<MarkingTaskVO | null>(null)
const loading = ref(false)

const canSubmit = computed(() => {
  // task.value?.taskStatus 本身就是 MarkingTaskStatusCode | undefined，无需任何 cast。
  const status = task.value?.taskStatus
  return status === 'ALLOCATED' || status === 'IN_PROGRESS'
})

async function loadTask(): Promise<void> {
  if (!taskId.value) return
  loading.value = true
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
  } catch (error) {
    task.value = null
    const errMsg = error instanceof Error ? error.message : '任务详情加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

const sliceImageUrl = ref<string | null>(null)
const sliceLoading = ref(false)

async function loadSliceImage(fileId: string): Promise<void> {
  releaseSliceImage()
  sliceLoading.value = true
  try {
    sliceImageUrl.value = await getImageBlobUrl(fileId)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '切片图加载失败'
    message.error(errMsg)
  } finally {
    sliceLoading.value = false
  }
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

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

watch(taskId, () => {
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
