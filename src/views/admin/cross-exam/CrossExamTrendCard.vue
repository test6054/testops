<template>
  <a-card title="AI 跨考试趋势分析" :bordered="false" size="small">
    <template #extra>
      <a-radio-group v-model:value="scopeMode" size="small" button-style="solid">
        <a-radio-button value="COURSE">课程维度</a-radio-button>
        <a-radio-button value="CLASS">班级维度</a-radio-button>
      </a-radio-group>
    </template>

    <div class="ai-form">
      <a-form layout="inline" :model="form" size="small">
        <a-form-item v-if="scopeMode === 'CLASS'" label="班级">
          <a-select
            v-model:value="form.classId"
            :options="classOptions"
            :loading="classLoading"
            placeholder="请选择所选考试共有班级"
            show-search
            option-filter-prop="label"
            allow-clear
            style="width: 240px"
          />
        </a-form-item>
        <a-form-item label="参与考试列表" style="flex: 1; min-width: 360px">
          <AnalysisExamMultiSelect
            v-model="form.examIds"
            placeholder="请选择至少 2 场考试"
            @selected-exams-change="selectedExams = $event"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button :loading="loading" @click="reload">
              <template #icon><ReloadOutlined /></template>查看历史
            </a-button>
            <a-button type="primary" :loading="generating" @click="handleGenerate">
              生成分析
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <a-spin :spinning="loading || generating">
      <!-- D-9 错误态：AI 跨考试趋势加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 跨考试趋势加载失败"
        compact
        @retry="reload"
      />
      <a-empty v-else-if="!record" description="暂无趋势分析记录，请填写参数后生成。" />
      <div v-else class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="维度">
            {{ scopeTypeLabel(record.scopeType) }}
          </a-descriptions-item>
          <a-descriptions-item label="考试数">{{ record.examCount }}</a-descriptions-item>
          <a-descriptions-item label="课程">
            {{ record.courseName?.trim() || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="班级">{{ classNameText(record) }}</a-descriptions-item>
          <a-descriptions-item label="生成耗时">{{ latencyText(record) }}</a-descriptions-item>
          <a-descriptions-item label="生成时间" :span="2">
            {{ formatDateTime(record.createTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="处理追踪编号">
            <a-typography-text :content="record.aiTraceId" copyable />
          </a-descriptions-item>
          <a-descriptions-item label="考试范围" :span="3">
            <a-space v-if="record.exams.length" wrap>
              <a-tag v-for="exam in record.exams" :key="exam.examId">
                {{ exam.examName }}{{ exam.examTime ? ` · ${formatDateTime(exam.examTime)}` : '' }}
              </a-tag>
            </a-space>
            <span v-else class="text-muted">无考试范围</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="record.errorMessage" label="分析处理说明" :span="3">
            <a-typography-text type="danger">
              {{ analysisFailureMessage(record.errorMessage) }}
            </a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <div v-if="examStatChartOption" class="ai-chart">
          <div class="ai-chart__meta">
            <strong>考试得分趋势</strong>
            <span class="ai-chart__hint">得分率 / 及格率折线与平均分柱状对比</span>
          </div>
          <VChart class="ai-chart__canvas" :option="examStatChartOption" autoresize />
        </div>

        <a-typography-paragraph v-if="record.trendSummary" class="ai-summary">
          <strong>趋势摘要：</strong>{{ record.trendSummary }}
        </a-typography-paragraph>

        <div v-if="trendItems.length > 0" class="ai-items">
          <strong>结构化趋势条目：</strong>
          <a-list size="small" :data-source="trendItems" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>
                <div class="analysis-item">
                  <div class="analysis-item__header">
                    <a-typography-text strong>第 {{ index + 1 }} 项</a-typography-text>
                    <span class="analysis-item__title">
                      {{ item.dimension || '趋势条目' }}
                    </span>
                    <a-tag v-if="item.direction">{{ item.direction }}</a-tag>
                    <span v-if="item.changeRate != null" class="analysis-item__metric">
                      变化 {{ formatPercent(item.changeRate) }}
                    </span>
                  </div>
                  <div v-if="item.turningPoint" class="analysis-item__meta">
                    转折点：{{ item.turningPoint }}
                  </div>
                  <a-typography-paragraph v-if="item.description" class="analysis-item__text">
                    {{ item.description }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.possibleCause" class="analysis-item__text">
                    <strong>可能原因：</strong>{{ item.possibleCause }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.suggestion" class="analysis-item__text">
                    <strong>调整措施：</strong>{{ item.suggestion }}
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
import type { CrossExamTrendAnalysisVO } from '@/apis/mark/cross-exam-analysis'
import {
  ANALYSIS_SCOPE_TYPE_LABEL,
  generateClassTrend,
  generateCourseTrend,
  listTrends,
} from '@/apis/mark/cross-exam-analysis'
import type { ExamSummaryVO } from '@/apis/mark/exam'
import { getExamDetail } from '@/apis/mark/exam'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/teaching-analysis'
import AnalysisExamMultiSelect from '@/components/mark/AnalysisExamMultiSelect.vue'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { assertUserFacing } from '@/utils/contract-guard'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { buildExamStatTrendChartOption } from '@/utils/mark-statistics-chart'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'CrossExamTrendCard' })

const scopeMode = ref<'COURSE' | 'CLASS'>('COURSE')

const form = reactive({
  classId: '',
  examIds: [] as string[],
})

const record = ref<CrossExamTrendAnalysisVO | null>(null)
const selectedExams = ref<ExamSummaryVO[]>([])
const classOptions = ref<{ label: string; value: string }[]>([])
const classLoading = ref(false)
const loading = ref(false)
// D-9 错误态：AI 跨考试趋势加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<Error | null>(null)
const generating = ref(false)

const trendItems = computed(() => record.value?.trendItems ?? [])
const examStatChartOption = computed(() =>
  buildExamStatTrendChartOption(record.value?.examStatSnapshots ?? []),
)
const selectedCourseIds = computed(() =>
  Array.from(new Set(selectedExams.value.map((exam) => exam.courseId).filter(Boolean))),
)

watch(scopeMode, (mode) => {
  if (mode === 'COURSE') {
    form.classId = ''
    return
  }
  const examIds = form.examIds
  if (examIds.length === 0) return
  classLoading.value = true
  form.classId = ''
  classOptions.value = []
  Promise.all(examIds.map((examId) => getExamDetail(examId)))
    .then((details) => {
      const classCount = new Map<string, { className: string; count: number }>()
      for (const detail of details) {
        for (const classRef of detail.classRefs) {
          const current = classCount.get(classRef.classId)
          classCount.set(classRef.classId, {
            className: classRef.className,
            count: (current?.count ?? 0) + 1,
          })
        }
      }
      classOptions.value = Array.from(classCount.entries())
        .filter(([, classInfo]) => classInfo.count === details.length)
        .map(([classId, classInfo]) => ({
          value: classId,
          label: classInfo.className,
        }))
      if (classOptions.value.length === 0 && details.length > 0) {
        message.warning('所选考试没有共同班级，请调整考试范围')
      }
    })
    .catch((e) => {
      showUserError(e, '考试班级范围加载失败')
    })
    .finally(() => {
      classLoading.value = false
    })
})

watch(
  () => [...form.examIds],
  async (examIds) => {
    form.classId = ''
    classOptions.value = []
    if (scopeMode.value !== 'CLASS' || examIds.length === 0) return
    classLoading.value = true
    try {
      const details = await Promise.all(examIds.map((examId) => getExamDetail(examId)))
      const classCount = new Map<string, { className: string; count: number }>()
      for (const detail of details) {
        for (const classRef of detail.classRefs) {
          const current = classCount.get(classRef.classId)
          classCount.set(classRef.classId, {
            className: classRef.className,
            count: (current?.count ?? 0) + 1,
          })
        }
      }
      classOptions.value = Array.from(classCount.entries())
        .filter(([, classInfo]) => classInfo.count === details.length)
        .map(([classId, classInfo]) => ({
          value: classId,
          label: classInfo.className,
        }))
      if (classOptions.value.length === 0 && details.length > 0) {
        message.warning('所选考试没有共同班级，请调整考试范围')
      }
    } catch (e) {
      showUserError(e, '考试班级范围加载失败')
    } finally {
      classLoading.value = false
    }
  },
)

function analysisFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(
    errorMessage,
    'AI 跨考试趋势分析未完成，请核对考试范围后重新生成',
  )
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function scopeTypeLabel(scopeType: CrossExamTrendAnalysisVO['scopeType']): string {
  return strictEnumLabel(ANALYSIS_SCOPE_TYPE_LABEL, scopeType, '分析范围类型')
}

function classNameText(value: CrossExamTrendAnalysisVO): string {
  if (value.scopeType === 'COURSE') return '不限定班级'
  return value.className?.trim() || '—'
}

function latencyText(value: CrossExamTrendAnalysisVO): string {
  if (value.latencyMs != null) return `${value.latencyMs} ms`
  if (value.analysisStatus === 'PENDING') return '处理中，尚未生成耗时'
  return '分析未完成，暂无耗时'
}

function assertCrossExamTrendContract(value: CrossExamTrendAnalysisVO): void {
  const dataError = '跨考试趋势分析数据异常，请刷新后重试'
  assertUserFacing(Boolean(value.courseName?.trim()), dataError)
  assertUserFacing(Boolean(value.aiTraceId?.trim()), dataError)
  if (value.scopeType === 'CLASS') {
    assertUserFacing(Boolean(value.className?.trim()), dataError)
  }
  assertUserFacing(value.exams.length > 0, dataError)
  if (value.analysisStatus === 'SUCCESS') {
    assertUserFacing(value.latencyMs != null, dataError)
  }
}

function acceptCrossExamTrendRecord(value: CrossExamTrendAnalysisVO | null): void {
  if (value) {
    assertCrossExamTrendContract(value)
  }
  record.value = value
}

async function reload(): Promise<void> {
  if (selectedCourseIds.value.length > 1) {
    message.warning('请选择同一课程下的考试')
    return
  }
  const courseId = selectedCourseIds.value[0] ?? ''
  if (!courseId) {
    message.warning('请选择考试')
    return
  }
  loadError.value = null
  loading.value = true
  try {
    const list = await listTrends({ scopeType: scopeMode.value, courseId })
    acceptCrossExamTrendRecord(list[0] ?? null)
    if (list.length === 0) message.info('暂无历史记录')
  } catch (e) {
    loadError.value = toUserError(e, '跨考试趋势分析加载失败')
    showUserError(e, '跨考试趋势分析加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  if (selectedCourseIds.value.length > 1) {
    message.warning('请选择同一课程下的考试')
    return
  }
  const courseId = selectedCourseIds.value[0] ?? ''
  const examIds = form.examIds
  if (!courseId) {
    message.warning('请选择同一课程下的考试')
    return
  }
  if (examIds.length < 2) {
    message.warning('至少需要选择 2 场考试')
    return
  }
  if (scopeMode.value === 'CLASS' && !form.classId) {
    message.warning('班级维度需要选择班级')
    return
  }
  generating.value = true
  try {
    const generated =
      scopeMode.value === 'COURSE'
        ? await generateCourseTrend({ courseId, examIds })
        : await generateClassTrend({ courseId, classId: form.classId, examIds })
    acceptCrossExamTrendRecord(generated)
    message.success('已生成趋势分析')
  } catch (e) {
    showUserError(e, '跨考试趋势分析生成失败')
  } finally {
    generating.value = false
  }
}
</script>

<style lang="scss" scoped>
.ai-form {
  margin-bottom: 16px;
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
.ai-chart {
  padding: 12px 16px;
  border: 1px solid var(--dp-border, #e2e8f0);
  border-radius: var(--dp-radius-md, 6px);
  background: var(--dp-surface, #fff);
}
.ai-chart__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.ai-chart__hint {
  font-size: 12px;
  color: var(--dp-text-secondary, #475569);
}
.ai-chart__canvas {
  width: 100%;
  height: 320px;
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
.analysis-item__meta,
.analysis-item__text {
  margin: 0;
  color: var(--gi-color-text-2, rgba(0, 0, 0, 0.75));
  line-height: 1.6;
}
.text-muted {
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
}
</style>
