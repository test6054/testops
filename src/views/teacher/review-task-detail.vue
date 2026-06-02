<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="task-detail-page__context">
        <div class="task-detail-page__context-left">
          <UiTag v-if="detail" :tone="reviewStatusTone(detail.status)" size="sm">
            {{ reviewStatusLabel(detail.status) }}
          </UiTag>
          <UiTag v-if="detail" tone="gray" size="sm">{{ detail.paperDisplay.primaryText }}</UiTag>
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
      description="未找到本次批阅任务，请从任务列表重新进入"
      class="task-detail-page__empty"
    />

    <!-- D-9 错误态：任务详情加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-else-if="taskLoadError"
      :error="taskLoadError"
      title="复核任务详情加载失败"
      helper="请从批阅任务列表重新进入后重试"
      @retry="loadTask"
    />

    <a-spin v-else :spinning="loading" tip="正在加载任务...">
      <UiCard v-if="detail" class="info-card">
        <template #title>
          <ProfileOutlined />
          <span>题目与评分摘要</span>
        </template>
        <a-descriptions :column="{ xs: 1, sm: 2, md: 3 }" :label-style="labelStyle" size="small">
          <a-descriptions-item label="答卷">
            {{ detail.paperDisplay.primaryText }}
          </a-descriptions-item>
          <a-descriptions-item label="题目">
            题{{ detail.questionNo }} · {{ detail.questionType }}
          </a-descriptions-item>
          <a-descriptions-item label="满分">
            {{ detail.fullScore }}
          </a-descriptions-item>
          <a-descriptions-item label="AI 评分">
            <span v-if="detail.aiScore !== undefined && detail.aiScore !== null">
              {{ detail.aiScore }}
            </span>
            <span v-else class="muted">-</span>
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
              <span>阅卷影像</span>
            </template>
            <UiEmpty v-if="!detail?.sliceFileId && !detail?.sourceScanPage" description="该题目暂无阅卷影像" />
            <MarkingScanMaterialPanel
              v-else
              :slice-file-id="detail?.sliceFileId"
              :source-scan-page="detail?.sourceScanPage"
            />
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
              <span>AI 复评说明</span>
            </template>
            <UiEmpty v-if="!detail?.aiDiagnostic" description="尚无 AI 复评说明" />
            <div v-else class="text-block">{{ aiReviewDiagnosticText(detail.aiDiagnostic) }}</div>
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
                      <span class="muted">{{ formatDateTime(item.createTime) }}</span>
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getReviewTaskDetail,
  listAnnotations,
  REVIEW_TASK_STATUS_LABEL,
  REVIEW_TASK_STATUS_TONE,
} from '@/apis/mark/exam'
import MarkingScanMaterialPanel from '@/components/mark/MarkingScanMaterialPanel.vue'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherReviewTaskDetail' })

function reviewStatusTone(value: ReviewTaskStatusCode): BadgeTone {
  return strictEnumTone(REVIEW_TASK_STATUS_TONE, value, '复核任务状态')
}

function reviewStatusLabel(value: ReviewTaskStatusCode): string {
  return strictEnumLabel(REVIEW_TASK_STATUS_LABEL, value, '复核任务状态')
}

/** 将 AI 复评诊断转为教师可处理的评分提示，避免展示模型或接口内部细节。 */
function aiReviewDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    'AI 复评暂未形成可展示说明，请按题目评分细则继续人工复核',
  )
}

const route = useRoute()
const router = useRouter()

const examId = computed(() => (route.query.examId ? String(route.query.examId) : ''))
const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))
const hasParams = computed(() => !!examId.value && !!taskId.value)

const detail = ref<ReviewTaskDetailVO | null>(null)
const loading = ref(false)
// D-9 错误态：任务详情加载失败时 UiErrorRetryPanel 重试 + 上报
const taskLoadError = ref<Error | null>(null)

const labelStyle: CSSProperties = { color: 'var(--ant-color-text-tertiary)', width: '100px' }

const canEnterWorkspace = computed(() => {
  // detail.value?.status 是 string | undefined，字面值 === 比较会自动缩窄类型，无需 cast。
  const status = detail.value?.status
  return status === 'PENDING' || status === 'IN_PROGRESS'
})

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
    showUserError(error, '批注记录加载失败')
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
    await loadAnnotations()
  } catch (error) {
    taskLoadError.value = toUserError(error, '复核任务详情加载失败')
    showUserError(error, '复核任务详情加载失败')
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
