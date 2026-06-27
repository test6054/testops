<template>
  <UiCard class="stats-card" compact>
    <template #title>AI 学生个体学情分析</template>
    <template #extra>
      <a-space>
        <a-select
          v-model:value="selectedStudentUserId"
          placeholder="选择学生"
          class="stats-card__select stats-card__select--student"
          show-search
          option-filter-prop="label"
          allow-clear
          :options="filteredStudentOptions"
          :loading="props.rosterLoading"
          :disabled="!props.examId"
          :not-found-content="props.rosterLoading ? '加载中…' : '该考试未关联考生'"
        />
        <UiButton variant="outline" size="sm" :loading="loading" :disabled="!selectedStudentUserId" @click="reload">
          <template #icon><ReloadOutlined /></template>查看最新
        </UiButton>
        <UiButton
          variant="outline"
          size="sm"
          :loading="generating"
          :disabled="!selectedStudentUserId"
          @click="handleGenerate"
        >
          重新生成
        </UiButton>
      </a-space>
    </template>

    <a-spin :spinning="loading">
      <AiGenerationProgressPanel
        v-if="generating"
        title="AI 学生学情分析生成中"
        waiting-text="正在等待后端返回该学生的真实学情画像。"
      />

      <UiEmpty
        v-else-if="!loading && !generating && !record"
        description="暂无数据"
      />
      <div v-else-if="record" class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <UiTag :tone="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="学生编号">
            {{ analysisScopeText(record) }}
          </a-descriptions-item>
          <a-descriptions-item label="生成时间">
            {{ analysisCreateTimeText(record) }}
          </a-descriptions-item>
          <a-descriptions-item label="生成耗时">
            {{ analysisLatencyText(record) }}
          </a-descriptions-item>
          <a-descriptions-item label="处理追踪编号" :span="2">
            <a-typography-text
              v-if="analysisTraceId(record)"
              :content="analysisTraceId(record)"
              copyable
            />
            <span v-else class="text-muted">{{ analysisTraceText(record) }}</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="record.errorMessage" label="分析处理说明" :span="3">
            <a-typography-text type="danger">
              {{ analysisFailureMessage(record.errorMessage) }}
            </a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <a-typography-paragraph v-if="record.overallSummary" class="ai-summary">
          <strong>整体表现：</strong>{{ record.overallSummary }}
        </a-typography-paragraph>

        <div v-if="scoreComposition" class="ai-items">
          <strong>成绩构成：</strong>
          <a-descriptions :column="3" size="small" bordered>
            <a-descriptions-item label="卷面得分">
              {{ formatScore(scoreComposition.examScore) }}
              <span v-if="scoreComposition.paperFullScore != null" class="score-full">
                / {{ formatScore(scoreComposition.paperFullScore) }}
              </span>
            </a-descriptions-item>
            <a-descriptions-item label="平时成绩">
              <template v-if="hasDailyScoreConfig">
                {{ formatScore(scoreComposition.dailyScore) }}
                <span v-if="scoreComposition.dailyScoreFull != null" class="score-full">
                  / {{ formatScore(scoreComposition.dailyScoreFull) }}
                </span>
              </template>
              <span v-else class="text-muted">未配置</span>
            </a-descriptions-item>
            <a-descriptions-item label="总成绩">
              <template v-if="scoreComposition.totalScore != null">
                {{ formatScore(scoreComposition.totalScore) }} 分
                <UiTag v-if="scoreComposition.finalScoreStatus" size="sm" :tone="finalScoreTone(scoreComposition.finalScoreStatus)">
                  {{ finalScoreLabel(scoreComposition.finalScoreStatus) }}
                </UiTag>
              </template>
              <span v-else class="text-muted">未录入</span>
            </a-descriptions-item>
            <a-descriptions-item label="班级卷面均分">
              {{ formatScore(scoreComposition.classAvgExamScore) }}
            </a-descriptions-item>
            <a-descriptions-item label="班级平时均分">
              {{ hasDailyScoreConfig ? formatScore(scoreComposition.classAvgDailyScore) : '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="班级总成绩均分">
              {{ formatScore(scoreComposition.classAvgTotalScore) }}
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <div v-if="suggestions.length > 0" class="ai-items">
          <strong>学习建议：</strong>
          <a-list size="small" :data-source="suggestions" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>{{ index + 1 }}. {{ item }}</a-list-item>
            </template>
          </a-list>
        </div>

        <div v-if="diagnosisItems.length > 0" class="ai-items">
          <strong>知识掌握分析：</strong>
          <a-list size="small" :data-source="diagnosisItems" bordered>
            <template #renderItem="{ item }">
              <a-list-item>
                <div class="diagnosis-item">
                  <div class="diagnosis-header">
                    <UiTag :tone="masteryColor(item.masteryLevel)">
                      {{ masteryLabel(item.masteryLevel) }}
                    </UiTag>
                    <span v-if="item.questionType" class="diagnosis-type">{{ questionTypeLabel(item.questionType) }}</span>
                    <span class="diagnosis-rate">得分率 {{ formatRate(item.scoreRate) }}</span>
                  </div>
                  <div v-if="item.causeAnalysis" class="diagnosis-text">
                    <strong>原因分析：</strong>{{ item.causeAnalysis }}
                  </div>
                  <div v-if="item.suggestion" class="diagnosis-text">
                    <strong>改进内容：</strong>{{ item.suggestion }}
                  </div>
                  <div
                    v-if="item.lostQuestionNos && item.lostQuestionNos.length"
                    class="diagnosis-text"
                  >
                    <strong>失分题号：</strong>{{ item.lostQuestionNos.join(', ') }}
                  </div>
                </div>
              </a-list-item>
            </template>
          </a-list>
        </div>
      </div>
    </a-spin>
  </UiCard>
</template>

<script lang="ts" setup>
import type { FinalScoreStatusCode } from '@/apis/mark/final-score-status'
import type { MasteryLevelCode } from '@/apis/mark/student-mastery-level'
import type { ExamTeachingAnalysisRecordVO } from '@/apis/mark/teaching-analysis'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { MarkStudentOption } from '@/composables/useMarkExamRoster'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/ai-analysis-status'
import { FINAL_SCORE_STATUS_LABEL, FINAL_SCORE_STATUS_TONE } from '@/apis/mark/final-score-status'
import { QUESTION_TYPE_LABEL } from '@/apis/mark/question-type'
import { MASTERY_LEVEL_LABEL, MASTERY_LEVEL_TONE } from '@/apis/mark/student-mastery-level'
import {
  generateStudentLearningProfile,
  getLatestStudentLearningProfile,
} from '@/apis/mark/teaching-analysis'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { assertUserFacing } from '@/utils/contract-guard'
import { getUserProcessFailureMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import AiGenerationProgressPanel from './AiGenerationProgressPanel.vue'

defineOptions({ name: 'StudentLearningProfileCard' })

const props = defineProps<{
  examId: string
  reloadToken: number
  /** B-12 联动：来自班级薄弱卡片的活跃班级 ID，用于提示与过滤学生下拉 */
  classIdHint?: string
  /** 考试考生选项，由父级 useMarkExamRoster 从考生名册派生 */
  studentOptions: MarkStudentOption[]
  /** 考生名册加载状态，控制下拉框的 loading 提示 */
  rosterLoading: boolean
}>()

/** B-12 联动：每次成功查询/生成后回写活跃 studentUserId，供父级展示 */
const emit = defineEmits<{ (e: 'student-change', studentUserId: string): void }>()

const record = ref<ExamTeachingAnalysisRecordVO | null>(null)
const loading = ref(false)
const generating = ref(false)
// 选中的学生用户 ID（来自下拉选择器，避免教师手输）
const selectedStudentUserId = ref<string | undefined>(undefined)
const hasQueried = ref(false)

const filteredStudentOptions = computed<MarkStudentOption[]>(() => {
  // 如果班级联动提示生效，只列该班考生，避免大考场下拉过长
  if (props.classIdHint) {
    return props.studentOptions.filter((opt) => opt.classId === props.classIdHint)
  }
  return props.studentOptions
})

const diagnosisItems = computed(() => record.value?.diagnosisItems ?? [])
const scoreComposition = computed(() => record.value?.scoreComposition)
const suggestions = computed(() => record.value?.suggestions ?? [])
const hasDailyScoreConfig = computed(() => scoreComposition.value?.dailyScoreFull != null)

function analysisFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(errorMessage, 'AI 学生学情分析未完成，请稍后重新生成')
}

function acceptStudentLearningProfileRecord(
  value: ExamTeachingAnalysisRecordVO | null,
  expectedStudentUserId: string,
): ExamTeachingAnalysisRecordVO | null {
  if (!value) return null
  const dataError = 'AI 学生学情数据异常，请刷新后重试'
  assertUserFacing(value.examId === props.examId, dataError)
  assertUserFacing(value.analysisType === 'STUDENT_LEARNING_PROFILE', dataError)
  assertUserFacing(value.scopeType === 'STUDENT', dataError)
  assertUserFacing(value.scopeId === expectedStudentUserId, dataError)
  assertUserFacing(Boolean(value.createTime?.trim()), dataError)
  if (value.analysisStatus === 'SUCCESS') {
    assertUserFacing(Boolean(value.aiTraceId?.trim()), dataError)
    assertUserFacing(typeof value.latencyMs === 'number', dataError)
    assertUserFacing(Boolean(value.overallSummary?.trim()), dataError)
    assertUserFacing(Boolean(value.diagnosisItems?.length), dataError)
    assertUserFacing(value.scoreComposition != null, dataError)
    assertUserFacing(Boolean(value.suggestions?.length), dataError)
  }
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') {
    assertUserFacing(Boolean(value.errorMessage?.trim()), dataError)
  }
  return value
}

function analysisScopeText(value: ExamTeachingAnalysisRecordVO): string {
  return value.scopeId?.trim() || '—'
}

function analysisCreateTimeText(value: ExamTeachingAnalysisRecordVO): string {
  if (!value.createTime?.trim()) return '—'
  return formatDateTime(value.createTime)
}

function analysisLatencyText(value: ExamTeachingAnalysisRecordVO): string {
  if (typeof value.latencyMs === 'number') return `${value.latencyMs} ms`
  if (value.analysisStatus === 'PENDING') return '待分析，尚未生成耗时'
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') return '分析未完成'
  return '—'
}

function analysisTraceId(value: ExamTeachingAnalysisRecordVO): string | undefined {
  return value.aiTraceId?.trim() || undefined
}

function analysisTraceText(value: ExamTeachingAnalysisRecordVO): string {
  if (value.analysisStatus === 'PENDING') return '待分析，尚未生成追踪编号'
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') return '分析未完成'
  return value.aiTraceId?.trim() || '—'
}

async function reload(): Promise<void> {
  const studentUserId = selectedStudentUserId.value
  if (!props.examId || !studentUserId) return
  hasQueried.value = true
  loading.value = true
  try {
    const latest = await getLatestStudentLearningProfile({ examId: props.examId, studentUserId })
    record.value = acceptStudentLearningProfileRecord(latest, studentUserId)
    emit('student-change', studentUserId)
  } catch (e) {
    record.value = null
    showUserError(e, '学生学情分析加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  const studentUserId = selectedStudentUserId.value
  if (!studentUserId) {
    message.warning('请先选择学生')
    return
  }
  hasQueried.value = true
  generating.value = true
  try {
    const generated = await generateStudentLearningProfile({ examId: props.examId, studentUserId })
    record.value = acceptStudentLearningProfileRecord(generated, studentUserId)
    message.success('已生成最新学情分析')
    emit('student-change', studentUserId)
  } catch (e) {
    record.value = null
    showUserError(e, '学生学情分析生成失败')
  } finally {
    generating.value = false
  }
}

function formatRate(rate: string): string {
  const value = Number(rate)
  if (!Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(1)}%`
}

function formatScore(score?: number): string {
  if (score == null || !Number.isFinite(score)) return '—'
  return `${score}`
}

function finalScoreLabel(status: FinalScoreStatusCode): string {
  return strictEnumLabel(FINAL_SCORE_STATUS_LABEL, status, '最终成绩状态')
}

function finalScoreTone(status: FinalScoreStatusCode): BadgeTone {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, status, '最终成绩状态')
}

function masteryLabel(level: MasteryLevelCode): string {
  return strictEnumLabel(MASTERY_LEVEL_LABEL, level, '掌握水平')
}

function masteryColor(level: MasteryLevelCode): BadgeTone {
  return strictEnumTone(MASTERY_LEVEL_TONE, level, '掌握水平')
}

function questionTypeLabel(value: NonNullable<ExamTeachingAnalysisRecordVO['diagnosisItems']>[number]['questionType']): string {
  return strictEnumLabel(QUESTION_TYPE_LABEL, value, '题目类型')
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    hasQueried.value = false
    record.value = null
    selectedStudentUserId.value = undefined
  },
)

watch(
  () => props.studentOptions,
  (next) => {
    // 考试名册变化后，如果当前选中学生不在范围内，重置选择避免跨考试串号
    if (
      selectedStudentUserId.value
      && !next.some((opt) => opt.value === selectedStudentUserId.value)
    ) {
      selectedStudentUserId.value = undefined
      hasQueried.value = false
      record.value = null
    }
  },
)

watch(
  () => props.classIdHint,
  () => {
    // 班级联动变化时，如果当前学生不在新班级范围内，需重置选择
    if (
      selectedStudentUserId.value
      && !filteredStudentOptions.value.some((opt) => opt.value === selectedStudentUserId.value)
    ) {
      selectedStudentUserId.value = undefined
      hasQueried.value = false
      record.value = null
    }
  },
)
</script>

<style lang="scss" scoped>
.class-hint {
  margin-bottom: 12px;
}

.ai-record {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-summary {
  margin: 0;
}
.ai-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.diagnosis-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}
.diagnosis-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.diagnosis-rate {
  margin-left: auto;
  color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
}
.diagnosis-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary, rgba(0, 0, 0, 0.75));
}
.score-full {
  color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
}
.text-muted {
  color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
}
</style>
