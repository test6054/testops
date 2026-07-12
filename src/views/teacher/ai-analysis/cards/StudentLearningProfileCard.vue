<template>
  <AiAnalysisCardShell :embedded="embedded" title="学生个体学情画像" card-class="stats-card">
    <template v-if="!embedded" #head>
      <h3 class="stats-card__title">AI 学生个体学情分析</h3>
    </template>
    <template v-if="!embedded" #toolbar>
      <div class="ai-analysis-card-toolbar">
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
          :filter-option="false"
          :not-found-content="props.rosterLoading ? '加载中…' : '该考试未关联考生'"
          @search="(keyword: string) => props.onStudentSearch?.(keyword)"
        />
        <UiButton
          variant="outline"
          size="sm"
          :loading="loading"
          :disabled="!selectedStudentUserId"
          @click="reload"
        >
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
      </div>
    </template>

    <template v-if="embedded" #actions>
      <div class="ai-analysis-card-toolbar ai-analysis-card-toolbar--student">
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
          :filter-option="false"
          :not-found-content="props.rosterLoading ? '加载中…' : '该考试未关联考生'"
          @search="(keyword: string) => props.onStudentSearch?.(keyword)"
        />
        <UiButton
          variant="outline"
          size="sm"
          :loading="loading"
          :disabled="!selectedStudentUserId"
          @click="reload"
        >
          刷新
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
      </div>
    </template>

    <AiAnalysisCardBody
      :loading="loading"
      :generating="generating"
      :has-content="record != null"
      :empty-description="emptyDescription"
      progress-title="AI 学生学情分析生成中"
      progress-waiting-text="正在等待后端返回该学生的真实学情画像。"
    >
      <div v-if="record != null" class="ai-analysis-section__body ai-analysis-section__body--flush">
        <p v-if="record.overallSummary" class="ai-analysis-summary">
          {{ record.overallSummary }}
        </p>

        <div v-if="record.scoreComposition" class="ai-profile-score-grid">
          <div class="ai-profile-score-item">
            <span class="ai-profile-score-label">卷面得分</span>
            <span class="ai-profile-score-value">
              {{ formatScore(record.scoreComposition.examScore) }}
              <span v-if="record.scoreComposition.paperFullScore != null" class="score-full">
                / {{ formatScore(record.scoreComposition.paperFullScore) }}
              </span>
            </span>
          </div>
          <div class="ai-profile-score-item">
            <span class="ai-profile-score-label">平时成绩</span>
            <span class="ai-profile-score-value">
              <template v-if="record.scoreComposition.dailyScoreFull != null">
                {{ formatScore(record.scoreComposition.dailyScore) }}
                <span class="score-full">
                  / {{ formatScore(record.scoreComposition.dailyScoreFull) }}
                </span>
              </template>
              <span v-else class="text-muted">未配置</span>
            </span>
          </div>
          <div class="ai-profile-score-item">
            <span class="ai-profile-score-label">总成绩</span>
            <span class="ai-profile-score-value">
              <template v-if="record.scoreComposition.totalScore != null">
                {{ formatScore(record.scoreComposition.totalScore) }} 分
                <UiTag
                  v-if="record.scoreComposition.finalScoreStatus"
                  size="sm"
                  :tone="finalScoreTone(record.scoreComposition.finalScoreStatus)"
                >
                  {{ finalScoreLabel(record.scoreComposition.finalScoreStatus) }}
                </UiTag>
              </template>
              <span v-else class="text-muted">未录入</span>
            </span>
          </div>
        </div>

        <div v-if="record.suggestions && record.suggestions.length > 0" class="ai-profile-block">
          <h5 class="ai-profile-block__title">学习建议</h5>
          <ul class="ai-profile-suggestion-list">
            <li v-for="(item, index) in record.suggestions" :key="index">{{ item }}</li>
          </ul>
        </div>

        <div
          v-if="record.diagnosisItems && record.diagnosisItems.length > 0"
          class="ai-profile-block"
        >
          <h5 class="ai-profile-block__title">知识掌握分析</h5>
          <div class="ai-profile-diagnosis-list">
            <div
              v-for="(item, index) in record.diagnosisItems"
              :key="index"
              class="ai-profile-diagnosis-item"
            >
              <div class="diagnosis-header">
                <UiTag :tone="masteryColor(item.masteryLevel)">
                  {{ masteryLabel(item.masteryLevel) }}
                </UiTag>
                <span v-if="item.questionType" class="diagnosis-type">
                  {{ questionTypeLabel(item.questionType) }}
                </span>
                <span class="diagnosis-rate">得分率 {{ formatRate(item.scoreRate) }}</span>
              </div>
              <p v-if="item.causeAnalysis" class="diagnosis-text">{{ item.causeAnalysis }}</p>
              <p v-if="item.suggestion" class="diagnosis-text diagnosis-text--hint">
                {{ item.suggestion }}
              </p>
              <p
                v-if="item.lostQuestionNos && item.lostQuestionNos.length"
                class="diagnosis-text diagnosis-text--muted"
              >
                失分题号：{{ item.lostQuestionNos.join('、') }}
              </p>
            </div>
          </div>
        </div>

        <AiAnalysisMetaCollapse
          :record="record"
          failure-fallback="AI 学生学情分析未完成，可重新生成"
        />
      </div>
    </AiAnalysisCardBody>
  </AiAnalysisCardShell>
</template>

<script lang="ts" setup>
import type { FinalScoreStatusCode } from '@/apis/mark/final-score-status'
import {
  FINAL_SCORE_STATUS_TONE,
  FinalScoreStatusDescription,
} from '@/apis/mark/final-score-status'
import type { MasteryLevelCode } from '@/apis/mark/student-mastery-level'
import { MASTERY_LEVEL_TONE, MasteryLevelDescription } from '@/apis/mark/student-mastery-level'
import type { TeachingAnalysisRecordResponse } from '@/apis/mark/teaching-analysis'
import {
  generateStudentLearningProfile,
  getLatestStudentLearningProfile,
} from '@/apis/mark/teaching-analysis'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { MarkStudentOption } from '@/composables/useMarkExamRoster'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import AiAnalysisCardBody from '@/components/mark/analysis/AiAnalysisCardBody.vue'
import AiAnalysisCardShell from '@/components/mark/analysis/AiAnalysisCardShell.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { useAiAnalysisGenerationFeedback } from '@/composables/useAiAnalysisGenerationFeedback'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'StudentLearningProfileCard' })

const props = withDefaults(
  defineProps<{
    examId: string
    reloadToken: number
    classIdHint?: string
    studentOptions: MarkStudentOption[]
    rosterLoading: boolean
    onStudentSearch?: (keyword: string) => void | Promise<void>
    examLabel?: string
    embedded?: boolean
  }>(),
  { embedded: false },
)

const emit = defineEmits<{ (e: 'student-change', studentUserId: string): void }>()

const record = ref<TeachingAnalysisRecordResponse | null>(null)
const loading = ref(false)
const { generating, runGeneration } = useAiAnalysisGenerationFeedback()
const selectedStudentUserId = ref<string | undefined>(undefined)
const hasQueried = ref(false)

const filteredStudentOptions = computed<MarkStudentOption[]>(() => {
  if (props.classIdHint) {
    return props.studentOptions.filter((opt) => opt.classId === props.classIdHint)
  }
  return props.studentOptions
})

const emptyDescription = computed(() =>
  selectedStudentUserId.value ? '暂无学情分析，可点击重新生成' : '请选择学生后查看学情分析',
)

async function reload(): Promise<void> {
  const studentUserId = selectedStudentUserId.value
  if (!props.examId || !studentUserId) return
  hasQueried.value = true
  loading.value = true
  try {
    record.value = await getLatestStudentLearningProfile({ examId: props.examId, studentUserId })
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
  await runGeneration(
    () => generateStudentLearningProfile({ examId: props.examId, studentUserId }),
    {
      successMessage: '已生成最新学情分析',
      onSuccess: (generated) => {
        record.value = generated
        emit('student-change', studentUserId)
      },
      onFailure: () => {
        record.value = null
      },
    },
  )
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
  return strictEnumLabel(FinalScoreStatusDescription, status, '最终成绩状态')
}

function finalScoreTone(status: FinalScoreStatusCode): BadgeTone {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, status, '最终成绩状态')
}

function masteryLabel(level: MasteryLevelCode): string {
  return strictEnumLabel(MasteryLevelDescription, level, '掌握水平')
}

function masteryColor(level: MasteryLevelCode): BadgeTone {
  return strictEnumTone(MASTERY_LEVEL_TONE, level, '掌握水平')
}

function questionTypeLabel(
  value: NonNullable<TeachingAnalysisRecordResponse['diagnosisItems']>[number]['questionType'],
): string {
  return strictEnumLabel(QuestionTypeDescription, value, '题目类型')
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
    if (
      selectedStudentUserId.value &&
      !next.some((opt) => opt.value === selectedStudentUserId.value)
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
    if (
      selectedStudentUserId.value &&
      !filteredStudentOptions.value.some((opt) => opt.value === selectedStudentUserId.value)
    ) {
      selectedStudentUserId.value = undefined
      hasQueried.value = false
      record.value = null
    }
  },
)

watch(selectedStudentUserId, (studentUserId) => {
  if (studentUserId) {
    void reload()
  } else {
    record.value = null
  }
})
</script>

<style lang="scss" scoped>
.diagnosis-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.diagnosis-rate {
  margin-left: auto;
  color: var(--dp-text-secondary);
  font-size: 12px;
}
.diagnosis-type {
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.diagnosis-text {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary);
}
.diagnosis-text--hint {
  color: var(--dp-text-primary);
}
.diagnosis-text--muted {
  font-size: 12px;
  color: var(--dp-text-muted);
}
.score-full {
  color: var(--dp-text-muted);
}
.text-muted {
  color: var(--dp-text-muted);
}
</style>
