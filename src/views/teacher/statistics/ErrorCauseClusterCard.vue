<template>
  <UiCard class="stats-card" compact>
    <template #title>AI 错因聚类分析</template>
    <template #extra>
      <a-space>
        <UiButton variant="outline" size="sm" :loading="generating" @click="handleGenerate">
          重新生成
        </UiButton>
        <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新最新
        </UiButton>
      </a-space>
    </template>

    <a-spin :spinning="loading">
      <AiGenerationProgressPanel
        v-if="generating"
        title="AI 错因聚类分析生成中"
        :waiting-text="props.classId ? '正在等待后端返回当前班级的真实错因聚类结果。' : '正在等待后端返回本场考试的真实错因聚类结果。'"
      />
      <UiEmpty
        v-if="!loading && !generating && !record"
        description="暂无数据"
      />
      <div v-else-if="record" class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <UiTag :tone="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="聚类数">{{ clusterCountText(record) }}</a-descriptions-item>
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
          <strong>总体摘要：</strong>{{ record.overallSummary }}
        </a-typography-paragraph>

        <MarkBarSection
          v-if="record"
          title="错因占比分布"
          hint="悬停查看各错因占比与说明"
          :item-count="clusterBarItems.length"
          :option="clusterChartOption"
          height="300px"
        />

        <div v-if="clusterItems.length > 0" class="ai-items">
          <strong>错因聚类：</strong>
          <a-list size="small" :data-source="clusterItems" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>
                <div class="analysis-item">
                  <div class="analysis-item__header">
                    <a-typography-text strong>第 {{ index + 1 }} 项</a-typography-text>
                    <span class="analysis-item__title">
                      {{ item.causeName || item.questionType || '错因聚类' }}
                    </span>
                    <span v-if="item.affectedCount != null" class="analysis-item__metric">
                      涉及学生 {{ item.affectedCount }} 人
                    </span>
                  </div>
                  <a-typography-paragraph v-if="item.causeDescription" class="analysis-item__text">
                    <strong>原因描述：</strong>{{ item.causeDescription }}
                  </a-typography-paragraph>
                  <a-typography-paragraph
                    v-if="item.proportion != null"
                    class="analysis-item__text"
                  >
                    <strong>占比：</strong>{{ formatPercent(item.proportion) }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.suggestion" class="analysis-item__text">
                    <strong>改进内容：</strong>{{ item.suggestion }}
                  </a-typography-paragraph>
                  <div
                    v-if="item.typicalExamples && item.typicalExamples.length > 0"
                    class="analysis-item__text"
                  >
                    <strong>典型样例：</strong>{{ item.typicalExamples.join('；') }}
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
import type { ExamErrorCauseClusterVO } from '@/apis/mark/error-cause-cluster'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  generateErrorCauseCluster,
  getLatestErrorCauseCluster,
} from '@/apis/mark/error-cause-cluster'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/teaching-analysis'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { assertUserFacing } from '@/utils/contract-guard'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { buildCategoryBarChartOption } from '@/utils/mark-echarts-options'
import { errorCauseToBarItems } from '@/utils/mark-statistics-chart'
import AiGenerationProgressPanel from './AiGenerationProgressPanel.vue'

defineOptions({ name: 'ErrorCauseClusterCard' })

const props = defineProps<{ examId: string, reloadToken: number, classId?: string }>()

const record = ref<ExamErrorCauseClusterVO | null>(null)
const loading = ref(false)
const generating = ref(false)
const loadError = ref<Error | null>(null)

const clusterItems = computed(() => record.value?.clusterItems ?? [])
const clusterBarItems = computed(() => errorCauseToBarItems(record.value?.clusterItems ?? []))

const { chartOption: clusterChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(clusterBarItems.value, {
    orientation: 'horizontal',
    maxValue: 100,
    xAxisName: '占比 %',
    unit: '%',
    emptyText: '暂无错因占比数据',
  }),
)

function analysisFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(errorMessage, 'AI 错因聚类分析未完成，请稍后重新生成')
}

function acceptErrorCauseClusterRecord(
  value: ExamErrorCauseClusterVO | null,
): ExamErrorCauseClusterVO | null {
  if (!value) return null
  const dataError = 'AI 错因聚类数据异常，请刷新后重试'
  assertUserFacing(value.examId === props.examId, dataError)
  assertUserFacing(value.scopeType === (props.classId ? 'CLASS' : 'EXAM'), dataError)
  assertUserFacing(props.classId ? value.scopeId === props.classId : !value.scopeId, dataError)
  assertUserFacing(Boolean(value.createTime?.trim()), dataError)
  if (value.analysisStatus === 'SUCCESS') {
    assertUserFacing(Boolean(value.aiTraceId?.trim()), dataError)
    assertUserFacing(typeof value.latencyMs === 'number', dataError)
    assertUserFacing(typeof value.clusterCount === 'number', dataError)
    assertUserFacing(Boolean(value.overallSummary?.trim()), dataError)
    assertUserFacing(Boolean(value.clusterItems?.length), dataError)
  }
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') {
    assertUserFacing(Boolean(value.errorMessage?.trim()), dataError)
  }
  return value
}

function clusterCountText(value: ExamErrorCauseClusterVO): string {
  if (typeof value.clusterCount === 'number') return String(value.clusterCount)
  if (value.analysisStatus === 'PENDING') return '处理中，尚未生成聚类'
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') return '分析未完成'
  return '—'
}

function analysisCreateTimeText(value: ExamErrorCauseClusterVO): string {
  if (!value.createTime?.trim()) return '—'
  return formatDateTime(value.createTime)
}

function analysisLatencyText(value: ExamErrorCauseClusterVO): string {
  if (typeof value.latencyMs === 'number') return `${value.latencyMs} ms`
  if (value.analysisStatus === 'PENDING') return '处理中，尚未生成耗时'
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') return '分析未完成'
  return '—'
}

function analysisTraceId(value: ExamErrorCauseClusterVO): string | undefined {
  return value.aiTraceId?.trim() || undefined
}

function analysisTraceText(value: ExamErrorCauseClusterVO): string {
  if (value.analysisStatus === 'PENDING') return '处理中，尚未生成追踪编号'
  if (value.analysisStatus === 'FAILED' || value.analysisStatus === 'BLOCKED') return '分析未完成'
  return value.aiTraceId?.trim() || '—'
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    const latest = await getLatestErrorCauseCluster(props.examId, props.classId || undefined)
    record.value = acceptErrorCauseClusterRecord(latest)
  } catch (e) {
    record.value = null
    loadError.value = toUserError(e, '错因聚类分析加载失败')
    showUserError(e, '错因聚类分析加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  generating.value = true
  loadError.value = null
  try {
    const generated = await generateErrorCauseCluster(props.examId, props.classId || undefined)
    record.value = acceptErrorCauseClusterRecord(generated)
    message.success('已生成最新错因聚类')
  } catch (e) {
    record.value = null
    loadError.value = toUserError(e, '错因聚类分析生成失败')
    showUserError(e, '错因聚类分析生成失败')
  } finally {
    generating.value = false
  }
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
.ai-summary {
  margin: 0;
}
.ai-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-chart__canvas {
  width: 100%;
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
.analysis-item__metric {
  margin-left: auto;
}
</style>
