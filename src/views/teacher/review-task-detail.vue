<template>
  <GiPageLayout>
    <div class="task-detail-page">
      <PageHeader title="复核任务详情" back-route="/teacher/review-assignment">
        <template #tags>
          <UiTag v-if="detail?.status" :tone="reviewStatusTone(detail.status)" size="md">
            {{ reviewStatusLabel(detail.status) }}
          </UiTag>
          <UiTag v-if="detail?.anonymousNo" tone="gray" size="md">{{ detail.anonymousNo }}</UiTag>
          <UiTag v-if="detail?.questionNo" tone="blue" size="md">
            题{{ detail.questionNo }} · 满分{{ detail.fullScore ?? '-' }}
          </UiTag>
        </template>
        <template #actions>
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
        </template>
      </PageHeader>

      <UiEmpty v-if="!hasParams" description="缺少必要参数：examId / taskId" class="empty-block" />

      <a-spin v-else :spinning="loading" tip="正在加载任务...">
        <!-- 关联 ID 摘要 -->
        <UiCard v-if="detail" class="info-card">
          <template #title>
            <ProfileOutlined />
            <span>关联 ID 与评语</span>
          </template>
          <a-descriptions :column="{ xs: 1, sm: 2, md: 3 }" :label-style="labelStyle" size="small">
            <a-descriptions-item label="题目模板ID">
              {{ detail.questionTemplateId || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="试卷实例ID">
              {{ detail.paperInstanceId || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="批改结果ID">
              {{ detail.gradeResultId || '-' }}
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
              <pre v-else class="text-pre">{{ detail.recognizedAnswer }}</pre>
            </UiCard>

            <UiCard class="info-card">
              <template #title>
                <RobotOutlined />
                <span>AI 诊断</span>
              </template>
              <UiEmpty v-if="!detail?.aiDiagnostic" description="尚无 AI 诊断信息" />
              <pre v-else class="text-pre">{{ detail.aiDiagnostic }}</pre>
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
                          <span v-if="item.anchorText" class="muted"
                            >锚点：{{ item.anchorText }}</span
                          >
                          <span class="muted">{{ formatTime(item.createTime) }}</span>
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
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AnnotationVO, ReviewTaskDetailVO } from '@/apis/mark/exam'
import { getReviewTaskDetail, listAnnotations } from '@/apis/mark/exam'
import CommentOutlined from '@ant-design/icons-vue/CommentOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import PictureOutlined from '@ant-design/icons-vue/PictureOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { useRoute, useRouter } from 'vue-router'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'TeacherReviewTaskDetail' })

type ReviewTaskStatusCode = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'
type ToneCode = 'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

const STATUS_LABEL: Record<ReviewTaskStatusCode, string> = {
  PENDING: '待复核',
  IN_PROGRESS: '复核中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}

const STATUS_TONE: Record<ReviewTaskStatusCode, ToneCode> = {
  PENDING: 'orange',
  IN_PROGRESS: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
}

/**
 * 后端 ReviewTaskDetailResponse.status 是 String（宽类型），前端需在此狭化为 ReviewTaskStatusCode 才能查 LABEL/TONE。
 * 通过字面值 === 比较让 TS 自动缩窄类型，全程零 as 断言。
 */
function reviewStatusTone(value: unknown): ToneCode {
  if (typeof value !== 'string') return 'gray'
  if (
    value === 'PENDING' ||
    value === 'IN_PROGRESS' ||
    value === 'APPROVED' ||
    value === 'REJECTED'
  ) {
    return STATUS_TONE[value]
  }
  return 'gray'
}

function reviewStatusLabel(value: unknown): string {
  if (typeof value !== 'string') return ''
  if (
    value === 'PENDING' ||
    value === 'IN_PROGRESS' ||
    value === 'APPROVED' ||
    value === 'REJECTED'
  ) {
    return STATUS_LABEL[value]
  }
  return value
}

const route = useRoute()
const router = useRouter()

const examId = computed(() => (route.query.examId ? String(route.query.examId) : ''))
const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))
const hasParams = computed(() => !!examId.value && !!taskId.value)

const detail = ref<ReviewTaskDetailVO | null>(null)
const loading = ref(false)

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
    annotations.value = await listAnnotations({
      examId: examId.value,
      paperInstanceId: detail.value.paperInstanceId,
      questionTemplateId: detail.value.questionTemplateId,
      gradeResultId: detail.value.gradeResultId,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '批注记录加载失败'
    message.error(errMsg)
  }
}

async function loadTask(): Promise<void> {
  if (!hasParams.value) return
  loading.value = true
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
    const errMsg = error instanceof Error ? error.message : '任务详情加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
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

.text-pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
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
