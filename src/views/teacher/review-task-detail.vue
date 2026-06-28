<template>
  <div class="task-detail-page">
    <div class="task-detail-page__toolbar">
      <div class="task-detail-page__toolbar-main">
        <UiTag v-if="detail" :tone="reviewStatusTone(detail.status)" size="sm">
          {{ reviewStatusLabel(detail.status) }}
        </UiTag>
        <UiTag v-if="detail" tone="gray" size="sm">{{ detail.paperDisplay.primaryText }}</UiTag>
        <UiTag v-if="detail" tone="blue" size="sm">
          题{{ detail.questionNo }} · 满分{{ detail.fullScore }}
        </UiTag>
      </div>
      <div class="task-detail-page__toolbar-actions">
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
      </div>
    </div>

    <UiEmpty
      v-if="!hasParams"
      description="暂无数据"
      class="task-detail-page__empty"
    />



    <a-spin v-else :spinning="loading" tip="正在加载任务...">
      <UiAlertStrip
        v-if="isExamConfidential"
        tone="error"
        title="涉密资料，禁止传播"
        description="涉密页面，请勿截屏外传"
        :closable="false"
        dense
        class="task-detail-page__confidential-strip"
      />
      <div v-if="detail?.status === 'INVALIDATED'" class="task-detail-page__invalidated-banner">
        <div class="task-detail-page__invalidated-title">当前复核任务已失效</div>
        <div class="task-detail-page__invalidated-text">
          原作答影像已因补扫替换失效，系统正在重新执行识别与切片，请等待新复核任务生成。
        </div>
      </div>
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
              :master-paper-page="detail?.masterPaperPage"
              :confidential="isExamConfidential"
              :exam-label="examConfidentialLabel"
              :watermark-lines="watermarkLines"
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
  </div>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import type { AnnotationVO } from '@/apis/mark/exam-annotation'
import type { ReviewTaskDetailVO, ReviewTaskStatusCode } from '@/apis/mark/exam-review-task'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import CommentOutlined from '@ant-design/icons-vue/CommentOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import PictureOutlined from '@ant-design/icons-vue/PictureOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  listAnnotations,
  validateAnnotationContract,
} from '@/apis/mark/exam-annotation'
import {
  getReviewTaskDetail,
  REVIEW_TASK_STATUS_LABEL,
  REVIEW_TASK_STATUS_TONE,
} from '@/apis/mark/exam-review-task'
import MarkingScanMaterialPanel from '@/components/mark/MarkingScanMaterialPanel.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { useExamConfidential } from '@/composables/useConfidentialWatermark'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
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
const {
  confidential: examConfidentialRef,
  examLabel: examConfidentialLabelRef,
  watermarkLines,
} = useExamConfidential(examId)
const isExamConfidential = computed(() => examConfidentialRef.value)
const examConfidentialLabel = computed(() => examConfidentialLabelRef.value)
const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))
const hasParams = computed(() => !!examId.value && !!taskId.value)
const taskSource = computed(() => (route.query.source === 'arbitration' ? 'arbitration' : 'review'))

const detail = ref<ReviewTaskDetailVO | null>(null)
const loading = ref(false)

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
    annotations.value.forEach(validateAnnotationContract)
  } catch (error) {
    showUserError(error, '批注记录加载失败')
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
    await loadAnnotations()
  } catch (error) {
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
    query: { source: taskSource.value },
  })
}

watch(
  () => [examId.value, taskId.value],
  () => {
    if (hasParams.value) void loadTask()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.task-detail-page {
  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border: 1px solid var(--ant-color-border-secondary);
    border-radius: var(--dp-radius-md);
    background: var(--ant-color-bg-container);
  }

  &__toolbar-main,
  &__toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__empty {
    padding: 60px 0;
  }

  &__confidential-strip {
    margin-bottom: 16px;
  }

  &__invalidated-banner {
    padding: 12px 16px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    background: var(--dp-surface-soft, #f8fafc);
  }

  &__invalidated-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__invalidated-text {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--dp-text-secondary, #475569);
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
