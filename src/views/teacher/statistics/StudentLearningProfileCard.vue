<template>
  <a-card title="AI 学生个体学情分析" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-input
          v-model:value="studentInput"
          placeholder="请输入学生用户ID"
          style="width: 200px"
          allow-clear
        />
        <a-button :loading="loading" :disabled="!studentInput" @click="reload">
          <template #icon><ReloadOutlined /></template>查看最新
        </a-button>
        <a-button
          type="primary"
          :loading="generating"
          :disabled="!studentInput"
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
      :message="`联动提示：班级薄弱卡当前分析班级 ID = ${classIdHint}。如本卡查询的学生不在该班，请相应调整。`"
    />

    <a-spin :spinning="loading">
      <a-empty v-if="!hasQueried" description="请输入学生用户ID后查看或生成。" />
      <a-empty v-else-if="!record" description="该学生暂无 AI 学情分析。" />
      <div v-else class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="AI_ANALYSIS_STATUS_COLOR[record.analysisStatus || 'PENDING']">
              {{ AI_ANALYSIS_STATUS_LABEL[record.analysisStatus || 'PENDING'] }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="学生ID">{{ record.scopeId ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="生成时间">{{ fmt(record.createTime) }}</a-descriptions-item>
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
                    <span class="diagnosis-type">{{ item.questionType ?? '未知题型' }}</span>
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
import type { ExamTeachingAnalysisRecordVO } from '@/apis/mark/teaching-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'
import {
  AI_ANALYSIS_STATUS_COLOR,
  AI_ANALYSIS_STATUS_LABEL,
  generateStudentLearningProfile,
  getLatestStudentLearningProfile,
} from '@/apis/mark/teaching-analysis'

defineOptions({ name: 'StudentLearningProfileCard' })

const props = defineProps<{
  examId: string
  reloadToken: number
  /** B-12 联动：来自班级薄弱卡片的活跃班级 ID，用于显示「正在该班级范围分析」提示 */
  classIdHint?: string
}>()

/** B-12 联动：每次成功查询/生成后回写活跃 studentUserId，供父级展示 */
const emit = defineEmits<{ (e: 'student-change', studentUserId: string): void }>()

interface DiagnosisItem {
  questionType?: string
  masteryLevel?: string
  scoreRate?: number
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
const generating = ref(false)
const studentInput = ref('')
const hasQueried = ref(false)

const parsedResponse = computed<ProfileResponse | null>(() => {
  if (!record.value?.aiRawResponse) return null
  try {
    return JSON.parse(record.value.aiRawResponse) as ProfileResponse
  } catch {
    return null
  }
})

const diagnosisItems = computed<DiagnosisItem[]>(() => {
  return parsedResponse.value?.diagnosisItems ?? []
})

const suggestions = computed<string[]>(() => {
  return parsedResponse.value?.suggestions ?? []
})

async function reload(): Promise<void> {
  const studentUserId = studentInput.value.trim()
  if (!props.examId || !studentUserId) return
  hasQueried.value = true
  loading.value = true
  try {
    record.value = await getLatestStudentLearningProfile({ examId: props.examId, studentUserId })
    emit('student-change', studentUserId)
  } catch (e) {
    record.value = null
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  const studentUserId = studentInput.value.trim()
  if (!studentUserId) {
    message.warning('请输入学生用户ID')
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

function fmt(v?: string): string {
  if (!v) return '-'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}

function formatRate(rate?: number): string {
  if (rate == null) return '-'
  return `${(rate * 100).toFixed(1)}%`
}

function masteryLabel(level?: string): string {
  switch (level) {
    case 'EXCELLENT':
      return '优秀'
    case 'GOOD':
      return '良好'
    case 'MEDIUM':
      return '中等'
    case 'WEAK':
      return '薄弱'
    case 'CRITICAL':
      return '危急'
    default:
      return level ?? '-'
  }
}

function masteryColor(level?: string): string {
  switch (level) {
    case 'EXCELLENT':
      return 'green'
    case 'GOOD':
      return 'cyan'
    case 'MEDIUM':
      return 'blue'
    case 'WEAK':
      return 'orange'
    case 'CRITICAL':
      return 'red'
    default:
      return 'default'
  }
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    hasQueried.value = false
    record.value = null
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
