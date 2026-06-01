<template>
  <a-card title="AI 班级薄弱题型分析" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-select
          v-model:value="selectedClassId"
          placeholder="选择班级"
          style="width: 240px"
          show-search
          option-filter-prop="label"
          allow-clear
          :options="props.classOptions"
          :loading="props.rosterLoading"
          :disabled="!props.examId"
          :not-found-content="props.rosterLoading ? '加载中…' : '该考试未关联班级'"
        />
        <a-button :loading="loading" :disabled="!selectedClassId" @click="reload">
          <template #icon><ReloadOutlined /></template>查看最新
        </a-button>
        <a-button
          type="primary"
          :loading="generating"
          :disabled="!selectedClassId"
          @click="handleGenerate"
        >
          重新生成
        </a-button>
      </a-space>
    </template>

    <a-spin :spinning="loading">
      <!-- D-9 错误态：AI 班级薄弱题型加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 班级薄弱题型加载失败"
        compact
        @retry="reload"
      />
      <a-empty v-else-if="!hasQueried" description="请选择班级后查看或生成。" />
      <a-empty v-else-if="!record" description="该班级暂无 AI 薄弱题型分析。" />
      <div v-else class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="班级编号">
            {{
              analysisScopeText(record)
            }}
          </a-descriptions-item>
          <a-descriptions-item label="生成时间">
            {{ analysisCreateTimeText(record) }}
          </a-descriptions-item>
          <a-descriptions-item label="生成耗时">
            {{
              analysisLatencyText(record)
            }}
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
          <strong>总体摘要：</strong>{{ record.overallSummary }}
        </a-typography-paragraph>

        <div v-if="weaknessItems.length > 0" class="ai-items">
          <strong>薄弱题型：</strong>
          <a-list size="small" :data-source="weaknessItems" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>
                <div class="analysis-item">
                  <div class="analysis-item__header">
                    <a-typography-text strong>第 {{ index + 1 }} 项</a-typography-text>
                    <span v-if="item.questionType" class="analysis-item__title">
                      {{ item.questionType }}
                    </span>
                    <a-tag v-if="item.rank != null">排名 {{ item.rank }}</a-tag>
                    <span v-if="item.avgScoreRate != null" class="analysis-item__metric">
                      平均得分率 {{ formatRate(item.avgScoreRate) }}
                    </span>
                  </div>
                  <a-typography-paragraph v-if="item.errorRate != null" class="analysis-item__text">
                    <strong>错误率：</strong>{{ formatRate(item.errorRate) }}
                  </a-typography-paragraph>
                  <a-typography-paragraph
                    v-if="item.affectedStudentCount != null"
                    class="analysis-item__text"
                  >
                    <strong>影响学生：</strong>{{ item.affectedStudentCount }} 人
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.causeAnalysis" class="analysis-item__text">
                    <strong>原因分析：</strong>{{ item.causeAnalysis }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.suggestion" class="analysis-item__text">
                    <strong>改进措施：</strong>{{ item.suggestion }}
                  </a-typography-paragraph>
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
import type {
  ClassWeaknessItemVO,
  ExamTeachingAnalysisRecordVO,
} from '@/apis/mark/teaching-analysis'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  aiAnalysisStatusColor,
  aiAnalysisStatusLabel,
  generateClassWeaknessAnalysis,
  getLatestClassWeaknessAnalysis,
} from '@/apis/mark/teaching-analysis'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'ClassWeaknessCard' })

const props = defineProps<{
  examId: string
  reloadToken: number
  /** 考试关联班级选项，由父级 useMarkExamRoster 从考生名册派生 */
  classOptions: MarkClassOption[]
  /** 考生名册加载状态，控制下拉框的 loading 提示 */
  rosterLoading: boolean
}>()

/**
 * B-12 联动：本卡每次成功查询/生成后，把当前 classId 上抛给父级 statistics.vue，
 * 由父级统一展示「联动上下文」并把同一 classId 提示到学生学情卡，避免子卡片成为孤岛。
 */
const emit = defineEmits<{ (e: 'class-change', classId: string): void }>()

const record = ref<ExamTeachingAnalysisRecordVO | null>(null)
const loading = ref(false)
// D-9 错误态：AI 班级薄弱题型加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<Error | null>(null)
const generating = ref(false)
// 选中的班级 ID（来自下拉选择器，避免教师手输）
const selectedClassId = ref<string | undefined>(undefined)
const hasQueried = ref(false)

const weaknessItems = computed<ClassWeaknessItemVO[]>(() => {
  return record.value?.weaknessItems ?? []
})

function analysisFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(errorMessage, 'AI 班级薄弱题型分析未完成，请稍后重新生成')
}

function acceptClassWeaknessRecord(
  value: ExamTeachingAnalysisRecordVO | null,
  expectedClassId: string,
): ExamTeachingAnalysisRecordVO | null {
  if (!value) return null
  if (value.examId !== props.examId) throw new Error('AI 班级薄弱题型分析考试 ID 与当前考试不一致')
  if (value.analysisType !== 'CLASS_WEAKNESS') {
    throw new Error('AI 班级薄弱题型分析类型不符合前后端契约')
  }
  if (value.scopeType !== 'CLASS') throw new Error('AI 班级薄弱题型分析范围类型不符合前后端契约')
  if (value.scopeId !== expectedClassId)
    throw new Error('AI 班级薄弱题型分析班级 ID 与当前选择不一致')
  if (!value.createTime?.trim()) throw new Error('AI 班级薄弱题型分析缺失生成时间')
  if (value.analysisStatus === 'SUCCESS') {
    if (!value.aiTraceId?.trim()) throw new Error('AI 班级薄弱题型分析成功但缺失追踪编号')
    if (typeof value.latencyMs !== 'number')
      throw new Error('AI 班级薄弱题型分析成功但缺失生成耗时')
    if (!value.overallSummary?.trim()) throw new Error('AI 班级薄弱题型分析成功但缺失总体摘要')
    if (!value.weaknessItems?.length) throw new Error('AI 班级薄弱题型分析成功但缺失薄弱题型明细')
  }
  if (
    (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED')
    && !value.errorMessage?.trim()
  ) {
    throw new Error('AI 班级薄弱题型分析失败但缺失处理说明')
  }
  return value
}

function analysisScopeText(value: ExamTeachingAnalysisRecordVO): string {
  if (!value.scopeId?.trim()) throw new Error('AI 班级薄弱题型分析缺失班级编号')
  return value.scopeId
}

function analysisCreateTimeText(value: ExamTeachingAnalysisRecordVO): string {
  if (!value.createTime?.trim()) throw new Error('AI 班级薄弱题型分析缺失生成时间')
  return formatDateTime(value.createTime)
}

function analysisLatencyText(value: ExamTeachingAnalysisRecordVO): string {
  if (typeof value.latencyMs === 'number') return `${value.latencyMs} ms`
  if (value.analysisStatus === 'PENDING') return '处理中，尚未生成耗时'
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') return '分析未完成'
  throw new Error('AI 班级薄弱题型分析成功但缺失生成耗时')
}

function analysisTraceId(value: ExamTeachingAnalysisRecordVO): string | undefined {
  return value.aiTraceId?.trim() || undefined
}

function analysisTraceText(value: ExamTeachingAnalysisRecordVO): string {
  if (value.analysisStatus === 'PENDING') return '处理中，尚未生成追踪编号'
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') return '分析未完成'
  throw new Error('AI 班级薄弱题型分析成功但缺失追踪编号')
}

async function reload(): Promise<void> {
  const classId = selectedClassId.value
  if (!props.examId || !classId) return
  hasQueried.value = true
  loadError.value = null
  loading.value = true
  try {
    const latest = await getLatestClassWeaknessAnalysis({ examId: props.examId, classId })
    record.value = acceptClassWeaknessRecord(latest, classId)
    // B-12 联动：广播当前班级，便于学生学情卡显示同班级上下文
    emit('class-change', classId)
  } catch (e) {
    record.value = null
    loadError.value = toUserError(e, '班级薄弱题型分析加载失败')
    showUserError(e, '班级薄弱题型分析加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  const classId = selectedClassId.value
  if (!classId) {
    message.warning('请先选择班级')
    return
  }
  hasQueried.value = true
  generating.value = true
  loadError.value = null
  try {
    const generated = await generateClassWeaknessAnalysis({ examId: props.examId, classId })
    record.value = acceptClassWeaknessRecord(generated, classId)
    message.success('已生成最新分析')
    emit('class-change', classId)
  } catch (e) {
    record.value = null
    loadError.value = toUserError(e, '班级薄弱题型分析生成失败')
    showUserError(e, '班级薄弱题型分析生成失败')
  } finally {
    generating.value = false
  }
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    // 切换考试或外部刷新时清空当前结果，等待用户重新指定班级
    hasQueried.value = false
    record.value = null
    selectedClassId.value = undefined
  },
)

watch(
  () => props.classOptions,
  (next) => {
    // 考试名册变化后，如果当前选中的班级不再在范围内，需重置选择以保证业务一致性
    if (selectedClassId.value && !next.some((opt) => opt.value === selectedClassId.value)) {
      selectedClassId.value = undefined
      hasQueried.value = false
      record.value = null
    }
  },
)
</script>

<style lang="scss" scoped>
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
.analysis-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.analysis-item__header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.analysis-item__title {
  font-weight: 600;
}
.analysis-item__metric {
  margin-left: auto;
  color: var(--gi-color-text-2, rgba(0, 0, 0, 0.65));
}
.analysis-item__text {
  margin: 0;
  color: var(--gi-color-text-2, rgba(0, 0, 0, 0.75));
  line-height: 1.6;
}
.text-muted {
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
}
</style>
