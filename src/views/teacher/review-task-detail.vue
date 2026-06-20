<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag v-if="detail" :tone="reviewStatusTone(detail.status)" size="sm">
            {{ reviewStatusLabel(detail.status) }}
          </UiTag>
          <UiTag v-if="detail" tone="gray" size="sm">{{ detail.paperDisplay.primaryText }}</UiTag>
          <UiTag v-if="detail" tone="blue" size="sm">
            题{{ detail.questionNo }} · 满分{{ detail.fullScore }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton v-if="canEnterWorkspace" size="sm" @click="goWorkspace">
            <template #icon><EditOutlined /></template>
            进入复核
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
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!hasParams"
      description="暂无数据"
      class="task-detail-page__empty"
    />

    <UiEmpty v-else-if="taskLoadError" description="暂无数据" />

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
            <UiEmpty v-if="!detail?.sliceFileId && !detail?.sourceScanPage" description="暂无数据" />
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
            <UiEmpty v-if="!detail?.recognizedAnswer" description="暂无数据" />
            <div v-else class="text-block">{{ detail.recognizedAnswer }}</div>
          </UiCard>

          <UiCard class="info-card">
            <template #title>
              <RobotOutlined />
              <span>AI 评分说明</span>
            </template>
            <UiEmpty v-if="!detail?.aiDiagnostic" description="暂无数据" />
            <div v-else class="text-block">{{ aiReviewDiagnosticText(detail.aiDiagnostic) }}</div>
          </UiCard>
        </a-col>

        <a-col :xs="24" :lg="8">
          <UiCard class="info-card">
            <template #title>
              <CommentOutlined />
              <span>批注历史</span>
            </template>
            <UiEmpty v-if="annotations.length === 0" description="暂无数据" />
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
  UiButton,
  UiCard,
  UiEmpty,
  UiTag,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceReviewTaskDetail' })

const REVIEW_TASK_DETAIL_PAGE_SIZE = 100

function reviewStatusTone(value: ReviewTaskStatusCode): BadgeTone {
  return strictEnumTone(REVIEW_TASK_STATUS_TONE, value, '复核任务状态')
}

function reviewStatusLabel(value: ReviewTaskStatusCode): string {
  return strictEnumLabel(REVIEW_TASK_STATUS_LABEL, value, '复核任务状态')
}

/** 将 AI 评分诊断转为教师可处理的评分提示，避免展示模型或接口内部细节。 */
function aiReviewDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    'AI 评分暂未形成可展示说明，请按题目评分细则继续人工复核',
  )
}

const route = useRoute()
const router = useRouter()

const examId = computed(() => (route.params.examId ? String(route.params.examId) : ''))
const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))
const hasParams = computed(() => !!examId.value && !!taskId.value)

const detail = ref<ReviewTaskDetailVO | null>(null)
const loading = ref(false)
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
  const currentExamId = examId.value
  const { paperInstanceId, questionTemplateId, gradeResultId } = detail.value
  try {
    annotations.value = await readAllPages(
      (pageNum) => listAnnotations({
        examId: currentExamId,
        paperInstanceId,
        questionTemplateId,
        gradeResultId,
        pageNum,
        pageSize: REVIEW_TASK_DETAIL_PAGE_SIZE,
      }),
      '批注记录加载失败，请刷新后重试',
    )
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
    name: 'TeacherExamWorkspaceReviewWorkspace',
    params: { examId: examId.value, taskId: taskId.value },
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
  &__empty {
    padding: 60px 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
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
