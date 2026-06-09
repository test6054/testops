<template>
  <a-card title="AI 教学改进方案" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-button type="primary" :loading="generating" @click="handleGenerate"> 重新生成 </a-button>
        <a-button :disabled="!canShareRecord" @click="copyShareText">复制分享内容</a-button>
        <a-button :disabled="!canShareRecord" @click="exportRecordText">导出文本</a-button>
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新最新
        </a-button>
      </a-space>
    </template>

    <a-spin :spinning="loading">
      <AiGenerationProgressPanel
        v-if="generating"
        title="AI 教学改进方案生成中"
        :waiting-text="props.classId ? '正在等待后端返回当前班级的真实教学改进方案。' : '正在等待后端返回本场考试的真实教学改进方案。'"
      />
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
          <a-descriptions-item label="生成耗时">
            {{
              analysisLatencyText(record)
            }}
          </a-descriptions-item>
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
import { assertUserFacing } from '@/utils/contract-guard'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import AiGenerationProgressPanel from './AiGenerationProgressPanel.vue'

defineOptions({ name: 'TeachingImprovementCard' })

const props = defineProps<{ examId: string, reloadToken: number, classId?: string }>()

const record = ref<ExamTeachingAnalysisRecordVO | null>(null)
const loading = ref(false)
const generating = ref(false)
// D-9 错误态：教学改进方案加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<Error | null>(null)

const improvementItems = computed<TeachingImprovementItemVO[]>(() => {
  return record.value?.improvementItems ?? []
})

const canShareRecord = computed(() => record.value?.analysisStatus === 'SUCCESS')

function analysisFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(errorMessage, 'AI 教学改进方案未完成，请稍后重新生成')
}

function acceptTeachingImprovementRecord(
  value: ExamTeachingAnalysisRecordVO | null,
): ExamTeachingAnalysisRecordVO | null {
  if (!value) return null
  const dataError = 'AI 教学改进方案数据异常，请刷新后重试'
  assertUserFacing(value.examId === props.examId, dataError)
  assertUserFacing(value.analysisType === 'TEACHING_IMPROVEMENT', dataError)
  assertUserFacing(value.scopeType === (props.classId ? 'CLASS' : 'EXAM'), dataError)
  assertUserFacing(props.classId ? value.scopeId === props.classId : !value.scopeId, dataError)
  assertUserFacing(Boolean(value.createTime?.trim()), dataError)
  if (value.analysisStatus === 'SUCCESS') {
    assertUserFacing(Boolean(value.aiTraceId?.trim()), dataError)
    assertUserFacing(typeof value.latencyMs === 'number', dataError)
    assertUserFacing(Boolean(value.overallSummary?.trim()), dataError)
    assertUserFacing(Boolean(value.improvementItems?.length), dataError)
  }
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') {
    assertUserFacing(Boolean(value.errorMessage?.trim()), dataError)
  }
  return value
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
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    const latest = await getLatestTeachingImprovement(props.examId, props.classId || undefined)
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
    const generated = await generateTeachingImprovement(props.examId, props.classId || undefined)
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

function buildShareText(): string {
  const current = record.value
  assertUserFacing(Boolean(current) && current?.analysisStatus === 'SUCCESS', '暂无可分享的 AI 教学改进方案')
  const lines = [
    'AI 教学改进方案',
    `考试编号：${current!.examId}`,
    `生成时间：${analysisCreateTimeText(current!)}`,
    `处理追踪编号：${analysisTraceId(current!)}`,
    '',
    '总体摘要：',
    current!.overallSummary,
  ]
  improvementItems.value.forEach((item, index) => {
    lines.push(
      '',
      `第 ${index + 1} 项：${item.questionType || '教学改进内容'}`,
      `问题：${item.problemDescription || '无'}`,
      `改进措施：${item.suggestion || '无'}`,
      `依据：${item.evidenceSummary || '无'}`,
    )
  })
  return lines.join('\n')
}

async function copyShareText(): Promise<void> {
  await navigator.clipboard.writeText(buildShareText())
  message.success('已复制教学改进方案')
}

function exportRecordText(): void {
  const blob = new Blob([buildShareText()], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `teaching-improvement-${props.examId}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

watch(
  () => [props.examId, props.reloadToken, props.classId],
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
  color: var(--dp-text-secondary, rgba(0, 0, 0, 0.75));
  line-height: 1.6;
}
.text-muted {
  color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
}
</style>
