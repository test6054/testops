<template>
  <a-card title="AI 教学改进方案" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-button type="primary" :loading="generating" @click="handleGenerate"> 重新生成 </a-button>
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新最新
        </a-button>
      </a-space>
    </template>

    <a-spin :spinning="loading">
      <!-- D-9 错误态：教学改进方案加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 教学改进方案加载失败"
        compact
        @retry="reload"
      />
      <a-empty v-else-if="!record" description="暂无 AI 教学改进方案，可点击重新生成。" />
      <div v-else class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="生成时间">
            {{ analysisCreateTimeText(record) }}
          </a-descriptions-item>
          <a-descriptions-item label="生成耗时">{{analysisLatencyText(record) }}</a-descriptions-item>
          <a-descriptions-item label="处理追踪编号" :span="3">
            <a-typography-text
              v-if="analysisTraceId(record)"
              :content="analysisTraceId(record)"
              copyable
            />
            <span v-else class="text-muted">{{ analysisTraceText(record) }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="分析处理说明" v-if="record.errorMessage" :span="3">
            <a-typography-text type="danger">
              {{ analysisFailureMessage(record.errorMessage) }}
            </a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <a-typography-paragraph v-if="record.overallSummary" class="ai-summary">
          <strong>总体摘要：</strong>{{ record.overallSummary }}
        </a-typography-paragraph>

        <div v-if="improvementItems.length > 0" class="ai-items">
          <strong>改进内容：</strong>
          <a-list size="small" :data-source="improvementItems" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>
                <div class="analysis-item">
                  <div class="analysis-item__header">
                    <a-typography-text strong>第 {{ index + 1 }} 项</a-typography-text>
                    <span class="analysis-item__title">
                      {{ item.questionType || '教学改进内容' }}
                    </span>
                    <a-tag v-if="item.severity">{{ item.severity }}</a-tag>
                  </div>
                  <a-typography-paragraph
                    v-if="item.problemDescription"
                    class="analysis-item__text"
                  >
                    <strong>问题：</strong>{{ item.problemDescription }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.suggestion" class="analysis-item__text">
                    <strong>改进措施：</strong>{{ item.suggestion }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.evidenceSummary" class="analysis-item__text">
                    <strong>依据：</strong>{{ item.evidenceSummary }}
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
  ExamTeachingAnalysisRecordVO,
  TeachingImprovementItemVO,
} from '@/apis/mark/teaching-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  aiAnalysisStatusColor,
  aiAnalysisStatusLabel,
  generateTeachingImprovement,
  getLatestTeachingImprovement,
} from '@/apis/mark/teaching-analysis'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'TeachingImprovementCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

const record = ref<ExamTeachingAnalysisRecordVO | null>(null)
const loading = ref(false)
const generating = ref(false)
// D-9 错误态：教学改进方案加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<Error | null>(null)

const improvementItems = computed<TeachingImprovementItemVO[]>(() => {
  return record.value?.improvementItems ?? []
})

function analysisFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(errorMessage, 'AI 教学改进方案未完成，请稍后重新生成')
}

function acceptTeachingImprovementRecord(
  value: ExamTeachingAnalysisRecordVO | null,
): ExamTeachingAnalysisRecordVO | null {
  if (!value) return null
  if (value.examId !== props.examId) throw new Error('AI 教学改进方案考试 ID 与当前考试不一致')
  if (value.analysisType !== 'TEACHING_IMPROVEMENT') {
    throw new Error('AI 教学改进方案分析类型不符合前后端契约')
  }
  if (value.scopeType !== 'EXAM') throw new Error('AI 教学改进方案范围类型不符合前后端契约')
  if (!value.createTime?.trim()) throw new Error('AI 教学改进方案缺失生成时间')
  if (value.analysisStatus === 'SUCCESS') {
    if (!value.aiTraceId?.trim()) throw new Error('AI 教学改进方案成功但缺失追踪编号')
    if (typeof value.latencyMs !== 'number') throw new Error('AI 教学改进方案成功但缺失生成耗时')
    if (!value.overallSummary?.trim()) throw new Error('AI 教学改进方案成功但缺失总体摘要')
    if (!value.improvementItems?.length) throw new Error('AI 教学改进方案成功但缺失改进明细')
  }
  if (
    (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED')
    && !value.errorMessage?.trim()
  ) {
    throw new Error('AI 教学改进方案失败但缺失处理说明')
  }
  return value
}

function analysisCreateTimeText(value: ExamTeachingAnalysisRecordVO): string {
  if (!value.createTime?.trim()) throw new Error('AI 教学改进方案缺失生成时间')
  return formatDateTime(value.createTime)
}

function analysisLatencyText(value: ExamTeachingAnalysisRecordVO): string {
  if (typeof value.latencyMs === 'number') return `${value.latencyMs} ms`
  if (value.analysisStatus === 'PENDING') return '处理中，尚未生成耗时'
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') return '分析未完成'
  throw new Error('AI 教学改进方案成功但缺失生成耗时')
}

function analysisTraceId(value: ExamTeachingAnalysisRecordVO): string | undefined {
  return value.aiTraceId?.trim() || undefined
}

function analysisTraceText(value: ExamTeachingAnalysisRecordVO): string {
  if (value.analysisStatus === 'PENDING') return '处理中，尚未生成追踪编号'
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') return '分析未完成'
  throw new Error('AI 教学改进方案成功但缺失追踪编号')
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    const latest = await getLatestTeachingImprovement(props.examId)
    record.value = acceptTeachingImprovementRecord(latest)
  } catch (e) {
    record.value = null
    loadError.value = toUserError(e, '教学改进方案加载失败')
    showUserError(e, '教学改进方案加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  generating.value = true
  loadError.value = null
  try {
    const generated = await generateTeachingImprovement(props.examId)
    record.value = acceptTeachingImprovementRecord(generated)
    message.success('已生成最新改进方案')
  } catch (e) {
    record.value = null
    loadError.value = toUserError(e, '教学改进方案生成失败')
    showUserError(e, '教学改进方案生成失败')
  } finally {
    generating.value = false
  }
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    if (props.examId) void reload()
  },
  { immediate: true },
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
.analysis-item__text {
  margin: 0;
  color: var(--gi-color-text-2, rgba(0, 0, 0, 0.75));
  line-height: 1.6;
}
.text-muted {
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
}
</style>
