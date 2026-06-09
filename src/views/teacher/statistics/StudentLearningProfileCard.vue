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

    <a-spin :spinning="loading">
      <AiGenerationProgressPanel
        v-if="generating"
        title="AI 学生学情分析生成中"
        waiting-text="正在等待后端返回该学生的真实学情画像。"
      />
      <!-- D-9 错误态：AI 学生个体学情加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 学生学情加载失败"
        compact
        @retry="reload"
      />
      <a-empty v-else-if="!hasQueried" description="请选择学生后查看或生成学情画像。" />
      <a-empty v-else-if="!record" description="该学生暂无 AI 学情分析。" />
      <div v-else class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </a-tag>
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

        <div v-if="diagnosisItems.length > 0" class="ai-items">
          <strong>知识掌握分析：</strong>
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
  </a-card>
</template>

<script lang="ts" setup>
import type { MasteryLevelCode } from '@/apis/mark/student-exam'
import type { ExamTeachingAnalysisRecordVO } from '@/apis/mark/teaching-analysis'
import type { MarkStudentOption } from '@/composables/useMarkExamRoster'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { MASTERY_LEVEL_LABEL, MASTERY_LEVEL_TONE } from '@/apis/mark/student-exam'
import {
  aiAnalysisStatusColor,
  aiAnalysisStatusLabel,
  generateStudentLearningProfile,
  getLatestStudentLearningProfile,
} from '@/apis/mark/teaching-analysis'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { assertUserFacing } from '@/utils/contract-guard'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
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
// D-9 错误态：AI 学生学情加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<Error | null>(null)
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
  if (value.analysisStatus === 'PENDING') return '处理中，尚未生成耗时'
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') return '分析未完成'
  return '—'
}

function analysisTraceId(value: ExamTeachingAnalysisRecordVO): string | undefined {
  return value.aiTraceId?.trim() || undefined
}

function analysisTraceText(value: ExamTeachingAnalysisRecordVO): string {
  if (value.analysisStatus === 'PENDING') return '处理中，尚未生成追踪编号'
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') return '分析未完成'
  return value.aiTraceId?.trim() || '—'
}

async function reload(): Promise<void> {
  const studentUserId = selectedStudentUserId.value
  if (!props.examId || !studentUserId) return
  hasQueried.value = true
  loadError.value = null
  loading.value = true
  try {
    const latest = await getLatestStudentLearningProfile({ examId: props.examId, studentUserId })
    record.value = acceptStudentLearningProfileRecord(latest, studentUserId)
    emit('student-change', studentUserId)
  } catch (e) {
    record.value = null
    loadError.value = toUserError(e, '学生学情分析加载失败')
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
  loadError.value = null
  try {
    const generated = await generateStudentLearningProfile({ examId: props.examId, studentUserId })
    record.value = acceptStudentLearningProfileRecord(generated, studentUserId)
    message.success('已生成最新学情分析')
    emit('student-change', studentUserId)
  } catch (e) {
    record.value = null
    loadError.value = toUserError(e, '学生学情分析生成失败')
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

function masteryLabel(level: MasteryLevelCode): string {
  return strictEnumLabel(MASTERY_LEVEL_LABEL, level, '掌握水平')
}

function masteryColor(level: MasteryLevelCode): string {
  return strictEnumTone(MASTERY_LEVEL_TONE, level, '掌握水平')
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
.diagnosis-type {
  font-weight: 600;
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
.text-muted {
  color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
}
</style>
