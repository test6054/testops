<template>
  <a-card title="AI 学生个体学情分析" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-select
          v-model:value="selectedStudentUserId"
          placeholder="选择学生"
          style="width: 280px"
          show-search
          option-filter-prop="label"
          allow-clear
          :options="filteredStudentOptions"
          :loading="props.rosterLoading"
          :disabled="!props.examId"
          :not-found-content="props.rosterLoading ? '加载中…' : '该考试未关联考生'"
        />
        <a-button :loading="loading" :disabled="!selectedStudentUserId" @click="reload">
          <template #icon><ReloadOutlined /></template>查看最新
        </a-button>
        <a-button
          type="primary"
          :loading="generating"
          :disabled="!selectedStudentUserId"
          @click="handleGenerate"
        >
          重新生成
        </a-button>
      </a-space>
    </template>

    <a-alert
      v-if="classIdHint"
      type="info"
      show-icon
      class="class-hint"
      :message="`联动提示：班级薄弱卡当前分析班级 ID = ${classIdHint}，学生下拉已自动过滤为该班考生。`"
    />

    <a-spin :spinning="loading">
      <!-- D-9 错误态：AI 学生个体学情加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 学生学情加载失败"
        compact
        @retry="reload"
      />
      <a-empty v-else-if="!hasQueried" description="请输入学生用户ID后查看或生成。" />
      <a-empty v-else-if="!record" description="该学生暂无 AI 学情分析。" />
      <div v-else class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="学生ID">{{ record.scopeId ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="生成时间">{{ formatDateTime(record.createTime) }}</a-descriptions-item>
          <a-descriptions-item label="耗时(ms)">{{ record.latencyMs ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="trace ID" :span="2">
            <a-typography-text v-if="record.aiTraceId" :content="record.aiTraceId" copyable />
            <span v-else class="text-muted">-</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="record.errorMessage" label="错误信息" :span="3">
            <a-typography-text type="danger">{{ record.errorMessage }}</a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <a-typography-paragraph v-if="parsedResponse?.overallSummary" class="ai-summary">
          <strong>整体表现：</strong>{{ parsedResponse.overallSummary }}
        </a-typography-paragraph>

        <div v-if="diagnosisItems.length > 0" class="ai-items">
          <strong>知识掌握诊断：</strong>
          <a-list size="small" :data-source="diagnosisItems" bordered>
            <template #renderItem="{ item }">
              <a-list-item>
                <div class="diagnosis-item">
                  <div class="diagnosis-header">
                    <a-tag :color="masteryColor(item.masteryLevel)">
                      {{ masteryLabel(item.masteryLevel) }}
                    </a-tag>
                    <span class="diagnosis-type">{{ item.questionType }}</span>
                    <span class="diagnosis-rate">得分率 {{ formatRate(item.scoreRate) }}</span>
                  </div>
                  <div v-if="item.causeAnalysis" class="diagnosis-text">
                    <strong>原因分析：</strong>{{ item.causeAnalysis }}
                  </div>
                  <div v-if="item.suggestion" class="diagnosis-text">
                    <strong>改进建议：</strong>{{ item.suggestion }}
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

        <div v-if="suggestions.length > 0" class="ai-items">
          <strong>个性化学习建议：</strong>
          <ol class="suggestion-list">
            <li v-for="(s, i) in suggestions" :key="i">{{ s }}</li>
          </ol>
        </div>

        <a-collapse v-if="record.evidenceSnapshot || record.aiRawResponse" :bordered="false">
          <a-collapse-panel v-if="record.evidenceSnapshot" key="evidence" header="证据快照 JSON">
            <pre class="raw-json">{{ record.evidenceSnapshot }}</pre>
          </a-collapse-panel>
          <a-collapse-panel v-if="record.aiRawResponse" key="raw" header="AI 原始响应">
            <pre class="raw-json">{{ record.aiRawResponse }}</pre>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </a-spin>
  </a-card>
</template>

<script lang="ts" setup>
import type { MasteryLevelCode } from '@/apis/mark/student-exam'
import type { ExamTeachingAnalysisRecordVO } from '@/apis/mark/teaching-analysis'
import type { MarkStudentOption } from '@/composables/useMarkExamRoster'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  MASTERY_LEVEL_LABEL,
  MASTERY_LEVEL_TONE,
} from '@/apis/mark/student-exam'
import {
  aiAnalysisStatusColor,
  aiAnalysisStatusLabel,
  generateStudentLearningProfile,
  getLatestStudentLearningProfile,
} from '@/apis/mark/teaching-analysis'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone, strictJsonObject } from '@/utils/strict-enum'

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

interface DiagnosisItem {
  questionType: string
  masteryLevel: MasteryLevelCode
  scoreRate: string
  lostQuestionNos?: Array<string | number>
  causeAnalysis?: string
  suggestion?: string
}

interface ProfileResponse {
  overallSummary?: string
  diagnosisItems?: DiagnosisItem[]
  suggestions?: string[]
}

const record = ref<ExamTeachingAnalysisRecordVO | null>(null)
const loading = ref(false)
// D-9 错误态：AI 学生学情加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<unknown>(null)
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

const parsedResponse = computed<ProfileResponse | null>(() => {
  return strictJsonObject<ProfileResponse>(record.value?.aiRawResponse, 'AI 学生学情原始响应')
})

const diagnosisItems = computed<DiagnosisItem[]>(() => {
  if (!parsedResponse.value) return []
  if (!Array.isArray(parsedResponse.value.diagnosisItems)) {
    throw new TypeError('AI 学生学情诊断项必须是数组')
  }
  return parsedResponse.value.diagnosisItems.map(validateDiagnosisItem)
})

const suggestions = computed<string[]>(() => {
  if (!parsedResponse.value) return []
  if (!Array.isArray(parsedResponse.value.suggestions)) {
    throw new TypeError('AI 学生学情建议必须是数组')
  }
  return parsedResponse.value.suggestions
})

async function reload(): Promise<void> {
  const studentUserId = selectedStudentUserId.value
  if (!props.examId || !studentUserId) return
  hasQueried.value = true
  loadError.value = null
  loading.value = true
  try {
    record.value = await getLatestStudentLearningProfile({ examId: props.examId, studentUserId })
    emit('student-change', studentUserId)
  } catch (e) {
    record.value = null
    loadError.value = e
    message.error(e instanceof Error ? e.message : '加载失败')
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
    record.value = await generateStudentLearningProfile({ examId: props.examId, studentUserId })
    message.success('已生成最新学情分析')
    emit('student-change', studentUserId)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    generating.value = false
  }
}


function formatRate(rate: string): string {
  return rate
}

function masteryLabel(level: MasteryLevelCode): string {
  return strictEnumLabel(MASTERY_LEVEL_LABEL, level, '掌握水平')
}

function masteryColor(level: MasteryLevelCode): string {
  return strictEnumTone(MASTERY_LEVEL_TONE, level, '掌握水平')
}

function validateDiagnosisItem(item: unknown, index: number): DiagnosisItem {
  // 不信任 ProfileResponse 的静态类型，JSON.parse 后必须在运行时运行逐字段收敛到 DiagnosisItem
  if (!item || typeof item !== 'object') {
    throw new TypeError(`AI 学生学情诊断项第 ${index + 1} 条不是对象结构`)
  }
  const candidate = item as Record<string, unknown>
  if (typeof candidate.questionType !== 'string' || !candidate.questionType.trim()) {
    throw new TypeError(`AI 学生学情诊断项第 ${index + 1} 条缺少题型`)
  }
  strictEnumLabel(MASTERY_LEVEL_LABEL, candidate.masteryLevel as MasteryLevelCode | undefined, '掌握水平')
  if (typeof candidate.scoreRate !== 'string' || !candidate.scoreRate.trim()) {
    throw new TypeError(`AI 学生学情诊断项第 ${index + 1} 条缺少得分率`)
  }
  if (
    candidate.lostQuestionNos !== undefined
    && candidate.lostQuestionNos !== null
    && !Array.isArray(candidate.lostQuestionNos)
  ) {
    throw new TypeError(`AI 学生学情诊断项第 ${index + 1} 条 lostQuestionNos 需为数组`)
  }
  return {
    questionType: candidate.questionType,
    masteryLevel: candidate.masteryLevel as MasteryLevelCode,
    scoreRate: candidate.scoreRate,
    lostQuestionNos: Array.isArray(candidate.lostQuestionNos)
      ? (candidate.lostQuestionNos as Array<string | number>)
      : undefined,
    causeAnalysis: typeof candidate.causeAnalysis === 'string' ? candidate.causeAnalysis : undefined,
    suggestion: typeof candidate.suggestion === 'string' ? candidate.suggestion : undefined,
  }
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
    if (selectedStudentUserId.value && !next.some((opt) => opt.value === selectedStudentUserId.value)) {
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
.diagnosis-type {
  font-weight: 600;
}
.diagnosis-rate {
  margin-left: auto;
  color: var(--gi-color-text-2, rgba(0, 0, 0, 0.65));
}
.diagnosis-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--gi-color-text-2, rgba(0, 0, 0, 0.75));
}
.suggestion-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.raw-json {
  margin: 0;
  padding: 8px;
  font-family: var(--gi-font-family-mono, monospace);
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--gi-color-bg-2, #f5f5f5);
}
.text-muted {
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
}
</style>
