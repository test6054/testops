<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="task-detail-page__context">
        <div class="task-detail-page__context-left">
          <UiTag v-if="detail" :tone="reviewStatusTone(detail.status)" size="sm">
            {{ reviewStatusLabel(detail.status) }}
          </UiTag>
          <UiTag v-if="detail" tone="gray" size="sm">{{ detail.anonymousNo }}</UiTag>
          <UiTag v-if="detail" tone="blue" size="sm">
            题{{ detail.questionNo }} · 满分{{ detail.fullScore }}
          </UiTag>
        </div>
        <div class="task-detail-page__context-right">
          <UiButton v-if="canEnterWorkspace" size="sm" @click="goWorkspace">
            <template #icon><EditOutlined /></template>
            进入批阅
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!hasParams"
            :loading="loading"
            @click="loadTask"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!hasParams"
      description="缺少必要参数：examId / taskId"
      class="task-detail-page__empty"
    />

    <!-- D-9 错误态：任务详情加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-else-if="taskLoadError"
      :error="taskLoadError"
      title="复核任务详情加载失败"
      :helper="`任务 ID：${taskId} · 考试 ID：${examId}`"
      @retry="loadTask"
    />

    <a-spin v-else :spinning="loading" tip="正在加载任务...">
      <!-- 关联 ID 摘要 -->
      <UiCard v-if="detail" class="info-card">
        <template #title>
          <ProfileOutlined />
          <span>关联 ID 与评语</span>
        </template>
        <a-descriptions :column="{ xs: 1, sm: 2, md: 3 }" :label-style="labelStyle" size="small">
          <a-descriptions-item label="题目模板ID">
            {{ detail.questionTemplateId }}
          </a-descriptions-item>
          <a-descriptions-item label="试卷实例ID">
            {{ detail.paperInstanceId }}
          </a-descriptions-item>
          <a-descriptions-item label="批改结果ID">
            {{ detail.gradeResultId }}
          </a-descriptions-item>
          <a-descriptions-item label="评语" :span="3">
            <a-typography-text v-if="detail.commentText" :content="detail.commentText" />
            <span v-else class="muted">-</span>
          </a-descriptions-item>
        </a-descriptions>
      </UiCard>

      <a-row :gutter="16" class="detail-row">
        <a-col :xs="24" :lg="16">
          <UiCard class="info-card">
            <template #title>
              <PictureOutlined />
              <span>作答切片</span>
            </template>
            <UiEmpty v-if="!detail?.sliceFileId" description="该题目暂无切片图" />
            <div v-else class="slice-viewer">
              <a-spin :spinning="sliceLoading" tip="加载切片中...">
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
            </div>
          </UiCard>

          <UiCard class="info-card">
            <template #title>
              <FileTextOutlined />
              <span>识别答案</span>
            </template>
            <UiEmpty v-if="!detail?.recognizedAnswer" description="尚未产生识别答案" />
            <div v-else class="text-block">{{ detail.recognizedAnswer }}</div>
          </UiCard>

          <UiCard class="info-card">
            <template #title>
              <RobotOutlined />
              <span>AI 诊断</span>
            </template>
            <UiEmpty v-if="!detail?.aiDiagnostic" description="尚无 AI 诊断信息" />
            <div v-else class="text-block">{{ detail.aiDiagnostic }}</div>
          </UiCard>
        </a-col>

        <a-col :xs="24" :lg="8">
          <UiCard class="info-card">
            <template #title>
              <CommentOutlined />
              <span>批注历史</span>
              <UiBadge tone="blue">{{ annotations.length }}</UiBadge>
            </template>
            <UiEmpty v-if="annotations.length === 0" description="尚无批注记录" />
            <a-list v-else :data-source="annotations" size="small">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta>
                    <template #title>
                      <a-typography-text :content="item.annotationText || '（无批注正文）'" />
                    </template>
                    <template #description>
                      <div class="annotation-meta">
                        <span v-if="item.anchorText" class="muted">锚点：{{ item.anchorText }}</span>
                        <span class="muted">{{ formatDateTime(item.createTime) }}</span>
                      </div>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </UiCard>
        </a-col>
      </a-row>
    </a-spin>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import type { AnnotationVO, ReviewTaskDetailVO, ReviewTaskStatusCode } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import CommentOutlined from '@ant-design/icons-vue/CommentOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import PictureOutlined from '@ant-design/icons-vue/PictureOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import {
  getReviewTaskDetail,
  listAnnotations,
  REVIEW_TASK_STATUS_LABEL,
  REVIEW_TASK_STATUS_TONE,
} from '@/apis/mark/exam'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'TeacherReviewTaskDetail' })

function reviewStatusTone(value: ReviewTaskStatusCode): BadgeTone {
  return REVIEW_TASK_STATUS_TONE[value]
}

function reviewStatusLabel(value: ReviewTaskStatusCode): string {
  return REVIEW_TASK_STATUS_LABEL[value]
}

const route = useRoute()
const router = useRouter()

const examId = computed(() => (route.query.examId ? String(route.query.examId) : ''))
const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))
const hasParams = computed(() => !!examId.value && !!taskId.value)

const detail = ref<ReviewTaskDetailVO | null>(null)
const loading = ref(false)
// D-9 错误态：任务详情加载失败时 UiErrorRetryPanel 重试 + 上报
const taskLoadError = ref<unknown>(null)

const labelStyle: CSSProperties = { color: 'var(--ant-color-text-tertiary)', width: '100px' }

const canEnterWorkspace = computed(() => {
  // detail.value?.status 是 string | undefined，字面值 === 比较会自动缩窄类型，无需 cast。
  const status = detail.value?.status
  return status === 'PENDING' || status === 'IN_PROGRESS'
})

// 切片图
const sliceImageUrl = ref<string | null>(null)
const sliceLoading = ref(false)

async function loadSliceImage(fileId: string): Promise<void> {
  releaseSliceImage()
  sliceLoading.value = true
  try {
    sliceImageUrl.value = await getImageBlobUrl(fileId)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '切片图像加载失败'
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

// 批注
const annotations = ref<AnnotationVO[]>([])

async function loadAnnotations(): Promise<void> {
  if (!examId.value || !detail.value) return
  try {
    const page = await listAnnotations({
      examId: examId.value,
      paperInstanceId: detail.value.paperInstanceId,
      questionTemplateId: detail.value.questionTemplateId,
      gradeResultId: detail.value.gradeResultId,
      pageNum: 1,
      pageSize: 200,
    })
    annotations.value = page.list
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '批注记录加载失败'
    message.error(errMsg)
  }
}

async function loadTask(): Promise<void> {
  if (!hasParams.value) return
  loading.value = true
  taskLoadError.value = null
  try {
    detail.value = await getReviewTaskDetail({
      examId: examId.value,
      reviewTaskId: taskId.value,
    })
    if (detail.value?.sliceFileId) {
      void loadSliceImage(detail.value.sliceFileId)
    }
    await loadAnnotations()
  } catch (error) {
    taskLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '任务详情加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

function goWorkspace(): void {
  if (!hasParams.value) return
  void router.push({
    name: 'TeacherReviewWorkspace',
    query: { examId: examId.value, taskId: taskId.value },
  })
}

watch(
  () => [examId.value, taskId.value],
  () => {
    if (hasParams.value) void loadTask()
  },
)

onMounted(() => {
  if (hasParams.value) void loadTask()
})

onBeforeUnmount(() => {
  releaseSliceImage()
})
</script>

<style lang="scss" scoped>
.task-detail-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__context-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__empty {
    padding: 60px 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.info-card {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.detail-row {
  row-gap: 16px;
}

.slice-viewer {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ant-color-fill-quaternary);
  border-radius: var(--dp-radius-md, 6px);
  padding: 16px;
}

.slice-image {
  max-width: 100%;
  max-height: 800px;
  object-fit: contain;
}

.text-block {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--ant-color-text);
  background: var(--ant-color-fill-quaternary);
  padding: 12px;
  border-radius: var(--dp-radius-md, 6px);
}

.annotation-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.muted {
  color: var(--ant-color-text-tertiary);
}

.empty-block {
  padding: 60px 0;
}
</style>
