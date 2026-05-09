<template>
  <GiPageLayout>
    <div class="workspace-page">
      <PageHeader title="批阅工作台" back-route="/teacher/review-assignment">
        <template #tags>
          <UiTag
            v-if="detail?.status"
            :tone="STATUS_TONE[detail.status as ReviewTaskStatusCode] || 'gray'"
            size="md"
          >
            {{ STATUS_LABEL[detail.status as ReviewTaskStatusCode] || detail.status }}
          </UiTag>
          <UiTag v-if="detail?.anonymousNo" tone="gray" size="md">{{ detail.anonymousNo }}</UiTag>
          <UiTag v-if="detail?.questionNo" tone="blue" size="md">
            题{{ detail.questionNo }} · 满分{{ detail.fullScore ?? '-' }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!canSubmit"
            :loading="loading"
            @click="loadTask"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </PageHeader>

      <UiEmpty
        v-if="!examId || !taskId"
        description="缺少必要参数：examId / taskId"
        class="empty-block"
      />

      <a-spin v-else :spinning="loading" tip="正在加载任务...">
        <a-row :gutter="16" class="workspace-row">
          <!-- 左：切片图 + 识别答案 + AI 诊断 -->
          <a-col :xs="24" :lg="16">
            <UiCard class="info-card">
              <template #title>
                <FileImageOutlined />
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
              <pre v-else class="code-block">{{ detail.recognizedAnswer }}</pre>
            </UiCard>

            <UiCard class="info-card">
              <template #title>
                <RobotOutlined />
                <span>AI 诊断</span>
              </template>
              <UiEmpty v-if="!detail?.aiDiagnostic" description="尚无 AI 诊断信息" />
              <pre v-else class="code-block">{{ detail.aiDiagnostic }}</pre>
            </UiCard>
          </a-col>

          <!-- 右：教师打分 + 批注列表 -->
          <a-col :xs="24" :lg="8">
            <UiCard class="info-card">
              <template #title>
                <EditOutlined />
                <span>教师给分</span>
              </template>

              <a-alert
                v-if="!canConfirm"
                type="info"
                show-icon
                message="当前任务状态不允许提交批改（仅 PENDING / IN_PROGRESS 可提交）。"
                style="margin-bottom: 12px"
              />
              <a-alert
                v-else-if="!detail?.gradeResultId"
                type="warning"
                show-icon
                message="任务缺少批改结果ID（gradeResultId），暂无法提交。"
                style="margin-bottom: 12px"
              />

              <a-form
                ref="gradeFormRef"
                :model="gradeForm"
                :rules="gradeFormRules"
                layout="vertical"
                :disabled="!canConfirm || !detail?.gradeResultId"
              >
                <a-form-item label="最终分" name="finalScore" required>
                  <a-input-number
                    v-model:value="gradeForm.finalScore"
                    :min="0"
                    :max="detail?.fullScore ?? 100"
                    :step="0.5"
                    style="width: 100%"
                  />
                  <div v-if="detail?.fullScore != null" class="hint">
                    满分 {{ detail.fullScore }} 分
                  </div>
                </a-form-item>
                <a-form-item label="评语（面向学生）" name="commentText">
                  <a-textarea
                    v-model:value="gradeForm.commentText"
                    placeholder="给学生的反馈评语（可选）"
                    :rows="3"
                    :maxlength="1000"
                    show-count
                  />
                </a-form-item>
                <a-form-item label="批注（内部教研）" name="annotationText">
                  <a-textarea
                    v-model:value="gradeForm.annotationText"
                    placeholder="可记录采分点、疑点，内部可见（可选）"
                    :rows="3"
                    :maxlength="1000"
                    show-count
                  />
                </a-form-item>
                <a-form-item label="锚点（可选，例如题内区域坐标）" name="anchorText">
                  <a-input
                    v-model:value="gradeForm.anchorText"
                    placeholder="例如 page=2,x=0.35,y=0.42"
                    :maxlength="200"
                  />
                </a-form-item>
                <a-form-item>
                  <UiButton
                    block
                    size="md"
                    :disabled="!canConfirm || !detail?.gradeResultId"
                    :loading="submitting"
                    @click="handleSubmit"
                  >
                    确认给分并关闭任务
                  </UiButton>
                </a-form-item>
              </a-form>
            </UiCard>

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
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { AnnotationVO, ReviewTaskDetailVO } from '@/apis/mark/exam'
import CommentOutlined from '@ant-design/icons-vue/CommentOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import { confirmQuestionGrade, getReviewTaskDetail, listAnnotations } from '@/apis/mark/exam'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'TeacherReviewWorkspace' })

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

const route = useRoute()
const router = useRouter()

const examId = computed(() => (route.query.examId ? String(route.query.examId) : ''))
const taskId = computed(() => (route.query.taskId ? String(route.query.taskId) : ''))

// ─── 任务详情 ─────────────────────────────
const detail = ref<ReviewTaskDetailVO | null>(null)
const loading = ref(false)

const canSubmit = computed(() => !!examId.value && !!taskId.value)

/** 当前任务是否允许提交批改（PENDING / IN_PROGRESS） */
const canConfirm = computed(() => {
  const status = detail.value?.status as ReviewTaskStatusCode | undefined
  return status === 'PENDING' || status === 'IN_PROGRESS'
})

// ─── 切片图像 ─────────────────────────────
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

// ─── 批注列表 ─────────────────────────────
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

// ─── 加载主流程 ───────────────────────────
async function loadTask(): Promise<void> {
  if (!canSubmit.value) return
  loading.value = true
  try {
    detail.value = await getReviewTaskDetail({
      examId: examId.value,
      reviewTaskId: taskId.value,
    })
    // 切片图
    if (detail.value?.sliceFileId) {
      void loadSliceImage(detail.value.sliceFileId)
    }
    // 批注
    await loadAnnotations()
    // 默认填充建议分
    if (
      gradeForm.finalScore === undefined
      && detail.value?.suggestedScore !== undefined
      && detail.value?.suggestedScore !== null
    ) {
      gradeForm.finalScore = detail.value.suggestedScore
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '任务详情加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

// ─── 打分表单 ─────────────────────────────
const gradeFormRef = ref<FormInstance>()
const gradeForm = reactive<{
  finalScore?: number
  commentText?: string
  annotationText?: string
  anchorText?: string
}>({
  finalScore: undefined,
  commentText: '',
  annotationText: '',
  anchorText: '',
})

const gradeFormRules: Record<string, Rule[]> = {
  finalScore: [
    { required: true, message: '请填写最终得分', trigger: 'change' },
    {
      validator(_rule: Rule, value: number) {
        if (value === undefined || value === null) return Promise.resolve()
        if (value < 0) return Promise.reject(new Error('最终得分不能为负'))
        const fullScore = detail.value?.fullScore
        if (fullScore !== undefined && fullScore !== null && value > fullScore) {
          return Promise.reject(new Error(`最终得分不能超过满分 ${fullScore}`))
        }
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
  commentText: [{ max: 1000, message: '评语最多 1000 字', trigger: 'blur' }],
  annotationText: [{ max: 1000, message: '批注最多 1000 字', trigger: 'blur' }],
  anchorText: [{ max: 200, message: '锚点最多 200 字', trigger: 'blur' }],
}

const submitting = ref(false)

async function handleSubmit(): Promise<void> {
  if (!examId.value || !detail.value?.gradeResultId) return
  if (!gradeFormRef.value) return
  try {
    await gradeFormRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    await confirmQuestionGrade({
      examId: examId.value,
      gradeResultId: detail.value.gradeResultId,
      finalScore: gradeForm.finalScore!,
      commentText: gradeForm.commentText?.trim() || undefined,
      annotationText: gradeForm.annotationText?.trim() || undefined,
      anchorText: gradeForm.anchorText?.trim() || undefined,
    })
    message.success('题目批改已确认并关闭任务')
    // 刷新任务与批注
    await loadTask()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '确认批改失败'
    message.error(errMsg)
  } finally {
    submitting.value = false
  }
}

// ─── 辅助函数 ─────────────────────────────
function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

function goBack(): void {
  void router.push({ name: 'TeacherReviewAssignment', query: { examId: examId.value } })
}

// ─── 生命周期 ─────────────────────────────
watch(
  () => [examId.value, taskId.value],
  () => {
    if (canSubmit.value) {
      void loadTask()
    }
  },
)

onMounted(() => {
  if (canSubmit.value) {
    void loadTask()
  }
})

onBeforeUnmount(() => {
  releaseSliceImage()
})
</script>

<style lang="scss" scoped>
.workspace-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.workspace-row {
  row-gap: 16px;
}

.info-card {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
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

.code-block {
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

.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
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
