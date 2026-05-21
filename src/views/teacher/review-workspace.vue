<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="review-workspace__context">
        <div class="review-workspace__context-info">
          <UiButton variant="ghost" size="sm" @click="goBack"> 返回 </UiButton>
          <h2 class="review-workspace__title">阅卷交付 - 沉浸式批阅工作区</h2>
          <UiTag v-if="detail?.anonymousNo" tone="gray" size="sm">
            {{ detail.anonymousNo }}
          </UiTag>
          <UiTag v-if="detail?.questionNo" tone="blue" size="sm">
            题 {{ detail.questionNo }}
          </UiTag>
          <UiTag v-if="detail?.status" :tone="reviewStatusTone(detail.status)" size="sm">
            {{ reviewStatusLabel(detail.status) }}
          </UiTag>
          <UiTag v-if="queueTotal > 0" tone="purple" size="sm">
            同题进度 {{ currentQueueIndex }} / {{ queueTotal }}
          </UiTag>
        </div>
        <div class="review-workspace__context-actions">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!canSubmit"
            :loading="loading"
            @click="loadTask"
          >
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!examId || !taskId"
      description="缺少必要参数：examId / taskId"
      class="review-workspace__empty"
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
      <UiStatPanel
        v-if="detail"
        :items="statMetrics"
        :columns="3"
        variant="grid"
        compact
        class="review-workspace__signals"
      />

      <!-- B-7 流水线进度：当前任务在同题队列中的位次 -->
      <div v-if="queueTotal > 0" class="review-workspace__queue-progress">
        <div class="review-workspace__queue-progress-meta">
          <span class="review-workspace__queue-progress-title">本题批阅流水线</span>
          <span class="review-workspace__queue-progress-text">
            当前第 {{ currentQueueIndex }} 份，剩余
            {{ Math.max(0, queueTotal - currentQueueIndex) }} 份待批
          </span>
        </div>
        <a-progress
          :percent="queueProgressPercent"
          :show-info="true"
          size="small"
          :status="queueProgressPercent >= 100 ? 'success' : 'active'"
        />
      </div>
      <UiAlertStrip
        v-if="queueLoadError"
        tone="error"
        title="同题流水线加载失败"
        :description="queueLoadError"
        dense
        class="review-workspace__alert"
      />

      <a-row :gutter="16" class="review-workspace__row">
        <!-- 左：切片图 + 识别答案 + AI 诊断 -->
        <a-col :xs="24" :lg="16">
          <UiCard class="review-workspace__card">
            <template #title>
              <FileImageOutlined />
              <span>作答切片</span>
            </template>
            <UiEmpty v-if="!detail?.sliceFileId" description="该题目暂无切片图" />
            <div v-else class="review-workspace__slice-viewer">
              <a-spin :spinning="sliceLoading" tip="加载切片中...">
                <a-image
                  v-if="sliceImageUrl"
                  :src="sliceImageUrl"
                  :preview="{}"
                  class="review-workspace__slice-image"
                >
                  <template #previewMask>点击查看原图</template>
                </a-image>
                <UiEmpty v-else-if="!sliceLoading" description="切片加载失败" />
              </a-spin>
            </div>
          </UiCard>

          <UiCard class="review-workspace__card">
            <template #title>
              <FileTextOutlined />
              <span>识别答案</span>
            </template>
            <UiEmpty v-if="!detail?.recognizedAnswer" description="尚未产生识别答案" />
            <pre v-else class="review-workspace__code-block">{{ detail.recognizedAnswer }}</pre>
          </UiCard>

          <UiCard class="review-workspace__card">
            <template #title>
              <RobotOutlined />
              <span>AI 诊断</span>
            </template>
            <UiEmpty v-if="!detail?.aiDiagnostic" description="尚无 AI 诊断信息" />
            <pre v-else class="review-workspace__code-block">{{ detail.aiDiagnostic }}</pre>
          </UiCard>

          <!-- B-1 题目质量参考：注入题目难度/区分度/分布，辅助评分尺度 -->
          <UiCard class="review-workspace__card">
            <template #title>
              <BarChartOutlined />
              <span>题目质量参考</span>
              <UiBadge v-if="difficultyBadge" :tone="difficultyBadge.tone">
                {{ difficultyBadge.label }}
              </UiBadge>
              <UiBadge v-if="discriminationBadge" :tone="discriminationBadge.tone">
                {{ discriminationBadge.label }}
              </UiBadge>
            </template>
            <a-spin :spinning="analysisLoading">
              <UiAlertStrip
                v-if="analysisLoadError"
                tone="error"
                title="题目质量参考加载失败"
                :description="analysisLoadError"
                dense
              />
              <UiAlertStrip
                v-else-if="!analysisLoading && !questionAnalysis"
                tone="info"
                title="尚未生成本题质量分析"
                description="教师可在「成绩统计 → 题目质量分析」中为本场考试一键生成；生成后此处会展示难度、区分度与分数分布。"
                dense
              />
              <a-descriptions
                v-else-if="questionAnalysis"
                :column="{ xs: 1, sm: 2, md: 3 }"
                size="small"
                bordered
              >
                <a-descriptions-item label="已批人数">
                  {{ questionAnalysis.totalCount ?? '-' }}
                </a-descriptions-item>
                <a-descriptions-item label="均分">
                  {{ formatNum(questionAnalysis.avgScore) }}
                  <span class="review-workspace__hint"
                    >/ {{ questionAnalysis.fullScore ?? '-' }}</span
                  >
                </a-descriptions-item>
                <a-descriptions-item label="标准差">
                  {{ formatNum(questionAnalysis.scoreStddev) }}
                </a-descriptions-item>
                <a-descriptions-item label="难度系数">
                  {{ formatNum(questionAnalysis.difficultyIndex) }}
                </a-descriptions-item>
                <a-descriptions-item label="区分度">
                  {{ formatNum(questionAnalysis.discriminationIndex) }}
                </a-descriptions-item>
                <a-descriptions-item label="满分 / 零分">
                  {{ questionAnalysis.fullScoreCount ?? 0 }} /
                  {{ questionAnalysis.zeroScoreCount ?? 0 }}
                </a-descriptions-item>
              </a-descriptions>
            </a-spin>
          </UiCard>
        </a-col>

        <!-- 右：教师打分 + 批注列表 -->
        <a-col :xs="24" :lg="8">
          <UiCard class="review-workspace__card">
            <template #title>
              <EditOutlined />
              <span>教师给分</span>
            </template>

            <UiAlertStrip
              v-if="!canConfirm"
              tone="info"
              title="任务状态限制"
              description="当前任务状态不允许提交批改（仅 PENDING / IN_PROGRESS 可提交）。"
              dense
              class="review-workspace__alert"
            />
            <UiAlertStrip
              v-else-if="!detail?.gradeResultId"
              tone="warning"
              title="任务缺少 gradeResultId"
              description="任务缺少批改结果ID（gradeResultId），暂无法提交。"
              dense
              class="review-workspace__alert"
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
                  class="review-workspace__score-input"
                />
                <div v-if="detail?.fullScore != null" class="review-workspace__hint">
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
            </a-form>
          </UiCard>

          <UiCard class="review-workspace__card">
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
                      <div class="review-workspace__annotation-meta">
                        <span v-if="item.anchorText" class="review-workspace__hint"
                          >锚点：{{ item.anchorText }}</span
                        >
                        <span class="review-workspace__hint">{{
                          formatTime(item.createTime)
                        }}</span>
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

    <!-- 底部 sticky 操作条（流水线批阅主入口） -->
    <footer v-if="detail" class="review-workspace__sticky">
      <div class="review-workspace__sticky-left">
        <span class="review-workspace__hint">
          当前任务：{{ detail.anonymousNo || '-' }} · 题 {{ detail.questionNo ?? '-' }}
        </span>
        <span v-if="queueTotal > 0" class="review-workspace__hint">
          · 同题剩余 {{ Math.max(0, queueTotal - 1) }} 份
        </span>
      </div>
      <div class="review-workspace__sticky-actions">
        <UiButton variant="ghost" size="md" @click="goBack"> 返回 </UiButton>
        <UiButton
          variant="outline"
          size="md"
          :disabled="!canConfirm || !detail?.gradeResultId"
          :loading="submitting"
          @click="openSubmitConfirm(false)"
        >
          仅提交
        </UiButton>
        <UiButton
          variant="primary"
          size="md"
          :disabled="!canConfirm || !detail?.gradeResultId || queueTotal <= 1"
          :loading="submitting"
          @click="openSubmitConfirm(true)"
        >
          提交并取下一份
        </UiButton>
      </div>
    </footer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { AnnotationVO, ReviewTaskDetailVO, ReviewTaskItemVO } from '@/apis/mark/exam'
import {
  claimReviewTask,
  confirmQuestionGrade,
  getReviewTaskDetail,
  listAnnotations,
  listReviewTasks,
} from '@/apis/mark/exam'
import type { ExamQuestionAnalysisRecordVO } from '@/apis/mark/question-analysis'
import { listQuestionAnalysis } from '@/apis/mark/question-analysis'
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import CommentOutlined from '@ant-design/icons-vue/CommentOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'

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
const taskId = computed(() => (route.query.taskId ? String(route.query.taskId) : ''))

function goBack(): void {
  if (window.history.length > 1) {
    router.back()
  } else {
    void router.push({ name: 'TeacherMarkingOverview' })
  }
}

// ─── 任务详情 ─────────────────────────────
const detail = ref<ReviewTaskDetailVO | null>(null)
const loading = ref(false)
const taskLoadError = ref<unknown>(null)

const canSubmit = computed(() => !!examId.value && !!taskId.value)

/** 当前任务是否允许提交批改（PENDING / IN_PROGRESS） */
const canConfirm = computed(() => {
  // detail.value?.status 是 string | undefined，字面值 === 比较会自动缩窄类型，无需 cast。
  const status = detail.value?.status
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

// ─── B-7 同题剩余任务队列（用于「提交并取下一份」流水线接力） ────────
const reviewQueue = ref<ReviewTaskItemVO[]>([])
const queueLoading = ref(false)
const queueLoadError = ref('')

/**
 * 加载当前考试 + 当前题目下仍可批阅的任务集合（PENDING + IN_PROGRESS）。
 * 当前任务自身会包含在内，用于精确计算「我在第几份 / 共几份」。
 */
async function loadReviewQueue(): Promise<void> {
  if (!examId.value || !detail.value?.questionTemplateId) {
    reviewQueue.value = []
    return
  }
  queueLoading.value = true
  queueLoadError.value = ''
  try {
    // 后端 ReviewTaskQueryPayload.status 可选；同题下分别拉 PENDING / IN_PROGRESS 后合并去重
    const [pending, inProgress] = await Promise.all([
      listReviewTasks({
        examId: examId.value,
        questionTemplateId: detail.value.questionTemplateId,
        status: 'PENDING',
      }),
      listReviewTasks({
        examId: examId.value,
        questionTemplateId: detail.value.questionTemplateId,
        status: 'IN_PROGRESS',
      }),
    ])
    const merged = new Map<string, ReviewTaskItemVO>()
    for (const item of [...pending, ...inProgress]) {
      merged.set(item.reviewTaskId, item)
    }
    reviewQueue.value = Array.from(merged.values())
  } catch (error) {
    queueLoadError.value =
      error instanceof Error ? error.message : '同题流水线加载失败，提交并取下一份暂不可用。'
    reviewQueue.value = []
  } finally {
    queueLoading.value = false
  }
}

/**
 * 当前任务在同题队列中的 1-based 位次，找不到时回退为 1（流水线尚未刷新到当前任务）。
 */
const currentQueueIndex = computed<number>(() => {
  if (!detail.value || reviewQueue.value.length === 0) return 0
  const idx = reviewQueue.value.findIndex((item) => item.reviewTaskId === taskId.value)
  return idx >= 0 ? idx + 1 : 1
})

const queueTotal = computed<number>(() => reviewQueue.value.length)

/**
 * 流水线进度百分比（0-100）。
 * 当前任务一旦提交（APPROVED/REJECTED）会从队列中消失，下次刷新位次自然推进。
 */
const queueProgressPercent = computed<number>(() => {
  if (queueTotal.value === 0) return 0
  // 当前任务尚在队列内意味着尚未完成；以"已完成 = total - 剩余"计算更直观
  const remaining = queueTotal.value
  const completedInWindow = Math.max(0, currentQueueIndex.value - 1)
  return Math.min(100, Math.round((completedInWindow / Math.max(remaining, 1)) * 100))
})

// ─── B-1 题目质量参考（注入批改决策环节） ────────────────────────
const questionAnalysis = ref<ExamQuestionAnalysisRecordVO | null>(null)
const analysisLoading = ref(false)
const analysisLoadError = ref('')

/**
 * 加载当前题目的质量分析快照（难度/区分度/均分/分布）。
 * 教师批改时实时参考该题在全场的统计特征，避免评分尺度偏离均值。
 * 数据由教师在「成绩统计」页面通过 generateAllQuestionAnalysis 生成。
 */
async function loadQuestionAnalysis(): Promise<void> {
  if (!examId.value || !detail.value?.questionTemplateId) {
    questionAnalysis.value = null
    return
  }
  analysisLoading.value = true
  analysisLoadError.value = ''
  try {
    const list = await listQuestionAnalysis({
      examId: examId.value,
      questionTemplateId: detail.value.questionTemplateId,
    })
    // 后端按 questionTemplateId 过滤返回最多一条；取第一条作为当前题快照
    questionAnalysis.value = list[0] ?? null
  } catch (error) {
    analysisLoadError.value = error instanceof Error ? error.message : '题目质量参考加载失败'
    questionAnalysis.value = null
  } finally {
    analysisLoading.value = false
  }
}

/** 难度系数文案 + 色调（难度区间参照教育测量学经验阈值） */
const difficultyBadge = computed<{ label: string; tone: ToneCode } | null>(() => {
  const v = questionAnalysis.value?.difficultyIndex
  if (v == null) return null
  if (v < 0.3) return { label: '偏难', tone: 'red' }
  if (v > 0.8) return { label: '偏易', tone: 'orange' }
  return { label: '适中', tone: 'green' }
})

/** 区分度文案 + 色调（区分度 < 0.2 视为不足） */
const discriminationBadge = computed<{ label: string; tone: ToneCode } | null>(() => {
  const v = questionAnalysis.value?.discriminationIndex
  if (v == null) return null
  if (v < 0.2) return { label: '区分度不足', tone: 'red' }
  if (v < 0.4) return { label: '一般', tone: 'orange' }
  return { label: '良好', tone: 'green' }
})

// ─── 加载主流程 ───────────────────────────
async function loadTask(): Promise<void> {
  if (!canSubmit.value) return
  loading.value = true
  taskLoadError.value = null
  try {
    detail.value = await getReviewTaskDetail({
      examId: examId.value,
      reviewTaskId: taskId.value,
    })
    // 切片图
    if (detail.value?.sliceFileId) {
      void loadSliceImage(detail.value.sliceFileId)
    }
    // 批注 + 题目质量分析 + 同题队列：并行加载，互不阻塞
    await Promise.all([loadAnnotations(), loadQuestionAnalysis(), loadReviewQueue()])
    // 默认填充建议分（仅当表单空时；avoid 覆盖教师正在编辑的值）
    if (
      gradeForm.finalScore === undefined &&
      detail.value?.suggestedScore !== undefined &&
      detail.value?.suggestedScore !== null
    ) {
      gradeForm.finalScore = detail.value.suggestedScore
    }
  } catch (error) {
    taskLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '任务详情加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

/** 清空打分表单（流水线切换到下份任务前必须调用，避免上份分数残留） */
function resetGradeForm(): void {
  gradeForm.finalScore = undefined
  gradeForm.commentText = ''
  gradeForm.annotationText = ''
  gradeForm.anchorText = ''
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

/**
 * 确认提交：先走表单校验，再弹出二次确认 modal（防误提）。
 * advanceToNext=true 时进入"提交并取下一份"流水线，提示文案会区分。
 */
async function openSubmitConfirm(advanceToNext: boolean): Promise<void> {
  if (!examId.value || !detail.value?.gradeResultId) return
  if (!gradeFormRef.value) return
  try {
    await gradeFormRef.value.validate()
  } catch {
    return
  }
  const fullScore = detail.value.fullScore
  const finalScore = gradeForm.finalScore
  const ratio =
    fullScore && fullScore > 0 && typeof finalScore === 'number'
      ? `${Math.round((finalScore / fullScore) * 100)}%`
      : '-'
  // 取下一份模式下额外提示队列剩余信息，让教师清楚批阅会继续
  const remaining = Math.max(0, queueTotal.value - 1)
  const tailHint = advanceToNext
    ? remaining > 0
      ? `提交后将自动取同题剩余 ${remaining} 份中的下一份继续批阅。`
      : '提交后同题剩余任务为 0，将自动返回。'
    : '提交后任务将被关闭，不可撤销。'
  void confirmAsync({
    title: advanceToNext ? '确认提交并继续下一份？' : '确认提交该题批改？',
    content: `最终得分：${finalScore} / ${fullScore ?? '-'}（${ratio}）。${tailHint}`,
    type: 'info',
    okText: advanceToNext ? '提交并取下一份' : '确认提交',
    cancelText: '取消',
    onOk: () => (advanceToNext ? handleSubmitAndNext() : handleSubmit()),
  })
}

/** 提交核心：仅提交给分，成功返回 true；失败已 message.error 并返回 false */
async function submitGrade(): Promise<boolean> {
  if (!examId.value || !detail.value?.gradeResultId) return false
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
    return true
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '确认批改失败'
    message.error(errMsg)
    return false
  } finally {
    submitting.value = false
  }
}

/** 仅提交：保留在当前任务页（任务状态会变为 APPROVED/REJECTED） */
async function handleSubmit(): Promise<void> {
  const ok = await submitGrade()
  if (!ok) return
  message.success('题目批改已确认并关闭任务')
  await loadTask()
}

/** 流水线模式：提交成功 → 从同题队列取下一份 → 领取并跳转 */
async function handleSubmitAndNext(): Promise<void> {
  const ok = await submitGrade()
  if (!ok) return
  message.success('已提交，正在为你取下一份…')
  await takeNextTask()
}

/**
 * 从同题队列中挑选下一份 PENDING 任务领取并跳转。
 * 找不到下一份时返回阅卷概览页，提示教师本题批阅已完成。
 */
async function takeNextTask(): Promise<void> {
  if (!examId.value) return
  try {
    // 重新拉一次队列，确保不包含刚提交的任务（后端可能已变状态）
    await loadReviewQueue()
    const currentTaskId = taskId.value
    const candidate = reviewQueue.value.find(
      (item) =>
        item.reviewTaskId !== currentTaskId &&
        (item.status === 'PENDING' || item.status === 'IN_PROGRESS'),
    )
    if (!candidate) {
      message.success('同题剩余任务批阅完毕，返回阅卷概览')
      void router.push({ name: 'TeacherMarkingOverview', query: { examId: examId.value } })
      return
    }
    // 领取下一份；后端会把状态推进到 IN_PROGRESS 并绑定到当前教师
    await claimReviewTask({
      examId: examId.value,
      reviewTaskId: candidate.reviewTaskId,
    })
    // 切换路由前清空表单 + 释放上一份切片图，避免视觉残留
    resetGradeForm()
    releaseSliceImage()
    void router.replace({
      query: {
        ...route.query,
        examId: examId.value,
        taskId: candidate.reviewTaskId,
      },
    })
    // watch(examId, taskId) 会自动触发 loadTask，无需手动调用
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '取下一份任务失败'
    message.error(errMsg)
  }
}

const statMetrics = computed(() => {
  const d = detail.value
  if (!d) return []
  return [
    { label: '题号', value: d.questionNo ?? '-', tone: 'blue' as const },
    { label: '满分', value: d.fullScore ?? '-', unit: '分', tone: 'gray' as const },
    {
      label: '建议得分',
      value: d.suggestedScore ?? '-',
      unit: '分',
      tone: (d.suggestedScore != null ? 'purple' : 'gray') as 'purple' | 'gray',
    },
    {
      label: '当前填入',
      value: gradeForm.finalScore ?? '-',
      unit: '分',
      tone: (gradeForm.finalScore != null ? 'green' : 'orange') as 'green' | 'orange',
    },
    {
      label: '批注记录',
      value: annotations.value.length,
      unit: '条',
      tone: (annotations.value.length > 0 ? 'blue' : 'gray') as 'blue' | 'gray',
    },
    { label: '状态', value: reviewStatusLabel(d.status) || '-', tone: reviewStatusTone(d.status) },
  ]
})

// ─── 辅助函数 ─────────────────────────────
function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

/** 题目质量参考卡片用：null/undefined 显示 -，其余保留两位小数 */
function formatNum(value: number | null | undefined): string {
  if (value == null) return '-'
  return value.toFixed(2)
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
.review-workspace {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 280px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__signals {
    margin-bottom: 12px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__queue-progress {
    margin-bottom: 12px;
    padding: 12px 16px;
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__queue-progress-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__queue-progress-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__queue-progress-text {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__row {
    row-gap: 16px;
  }

  &__card {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__slice-viewer {
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--dp-surface-soft, #f8fafc);
    border-radius: var(--dp-radius-md, 6px);
    padding: 16px;
  }

  &__slice-image {
    max-width: 100%;
    max-height: 800px;
    object-fit: contain;
  }

  &__code-block {
    margin: 0;
    font-family: 'Monaco', 'Menlo', Consolas, monospace;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--dp-text-primary, #0f172a);
    background: var(--dp-surface-soft, #f8fafc);
    padding: 12px;
    border-radius: var(--dp-radius-md, 6px);
  }

  &__alert {
    margin-bottom: 12px;
  }

  &__score-input {
    width: 100%;
  }

  &__hint {
    margin-top: 4px;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__annotation-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
  }

  &__empty {
    padding: 60px 0;
  }

  &__sticky {
    position: sticky;
    bottom: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    margin: 16px -12px -12px;
    background: var(--dp-surface, #fff);
    border-top: 1px solid var(--dp-border, #e2e8f0);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
  }

  &__sticky-left {
    flex: 1;
    color: var(--dp-text-secondary, #475569);
    font-size: 13px;
  }

  &__sticky-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
