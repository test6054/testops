<template>
  <UiCard title="AI 校级质量分析" compact>
    <div class="ai-form">
      <a-form layout="inline" :model="form" size="small">
        <a-form-item label="分析维度">
          <a-select v-model:value="form.analysisDimension" style="width: 140px">
            <a-select-option
              v-for="(label, code) in SCHOOL_QUALITY_DIMENSION_LABEL"
              :key="code"
              :value="code"
            >
              {{ label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="form.analysisDimension === 'COURSE'" label="课程">
          <CatalogCourseSelector
            v-model:value="form.dimensionId"
            placeholder="请选择课程"
            :allow-clear="false"
            width="220px"
          />
        </a-form-item>
        <a-form-item v-if="form.analysisDimension === 'CLASS'" label="班级">
          <ClassSelector
            v-model:value="form.dimensionId"
            placeholder="请选择班级"
            :allow-clear="false"
            width="220px"
          />
        </a-form-item>
        <a-form-item label="学年学期">
          <AnalysisSemesterSelect v-model="form.semesterCode" placeholder="请选择学年学期" />
        </a-form-item>
        <a-form-item label="参与考试列表" style="flex: 1; min-width: 320px">
          <AnalysisExamMultiSelect v-model="form.examIds" placeholder="请选择至少 2 场考试" />
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
      <!-- D-9 错误态：AI 校级质量加载失败时提供重试 + 上报入口 -->
      <UiEmpty
        v-if="!loading && !generating && !record"
        description="暂无数据"
      />
      <div v-else-if="record" class="ai-record">
        <UiStatPanel
          :items="qualityMetrics"
          :columns="3"
          variant="strip"
          compact
        />

        <a-descriptions :column="3" compact bordered>
          <a-descriptions-item label="状态">
            <UiTag :tone="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="维度">
            {{ schoolQualityDimensionLabel(record.analysisDimension) }} /
            {{ record.dimensionName }}
          </a-descriptions-item>
          <a-descriptions-item label="学年学期">
            <span v-if="record.semesterCode">{{
              formatAcademicTermCode(record.semesterCode)
            }}</span>
            <span v-else class="text-muted">未限定学年学期</span>
          </a-descriptions-item>
          <a-descriptions-item label="考试数">{{ record.examCount }}</a-descriptions-item>
          <a-descriptions-item label="生成耗时">{{ record.latencyMs }}</a-descriptions-item>
          <a-descriptions-item label="生成时间">
            {{ formatDateTime(record.createTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="处理追踪编号" :span="3">
            <a-typography-text v-if="record.aiTraceId" :content="record.aiTraceId" copyable />
            <span v-else class="text-muted">-</span>
          </a-descriptions-item>
          <a-descriptions-item label="考试范围" :span="3">
            <a-space v-if="record.exams?.length" wrap>
              <UiTag v-for="exam in record.exams" :key="exam.examId">
                {{ exam.examName }}{{ exam.examTime ? ` · ${formatDateTime(exam.examTime)}` : '' }}
              </UiTag>
            </a-space>
            <span v-else class="text-muted">-</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="record.errorMessage" label="分析处理说明" :span="3">
            <a-typography-text type="danger">
              {{ analysisFailureMessage(record.errorMessage) }}
            </a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <a-typography-paragraph v-if="record.qualitySummary" class="ai-summary">
          <strong>质量摘要：</strong>{{ record.qualitySummary }}
        </a-typography-paragraph>

        <MarkTrendSection
          v-if="record"
          title="参与考试得分走势"
          hint="多考试对比：得分率走势"
          :point-count="examStatTrendPoints.length"
          :option="examTrendChartOption"
          height="320px"
          :last-value="examTrendLastValue"
          value-unit="%"
        />

        <div v-if="qualityItems.length > 0" class="ai-items">
          <strong>分项评估：</strong>
          <a-list compact :data-source="qualityItems" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>
                <div class="analysis-item">
                  <div class="analysis-item__header">
                    <a-typography-text strong>第 {{ index + 1 }} 项</a-typography-text>
                    <span class="analysis-item__title">
                      {{ item.qualityDimension || item.metricName || '质量指标' }}
                    </span>
                    <UiTag v-if="item.rating" :tone="qualityRatingColor(item.rating)">
                      {{ qualityRatingLabel(item.rating) }}
                    </UiTag>
                    <span v-if="item.metricValue != null" class="analysis-item__metric">
                      {{ item.metricValue.toFixed(2) }}
                    </span>
                  </div>
                  <a-typography-paragraph v-if="item.description" class="analysis-item__text">
                    {{ item.description }}
                  </a-typography-paragraph>
                  <a-typography-paragraph
                    v-if="item.baselineComparison"
                    class="analysis-item__text"
                  >
                    <strong>基线对比：</strong>{{ item.baselineComparison }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.suggestion" class="analysis-item__text">
                    <strong>改进内容：</strong>{{ item.suggestion }}
                  </a-typography-paragraph>
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
import type {
  SchoolQualityAnalysisVO,
  SchoolQualityDimensionCode,
  SchoolQualityRatingCode,
} from '@/apis/mark/school-quality'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { UiStatPanelItem } from '@/components/ui-guide/ui/types'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  generateQualityAnalysis,
  listQualityAnalysis,
  SCHOOL_QUALITY_DIMENSION_LABEL,
  SCHOOL_QUALITY_RATING_COLOR,
  SCHOOL_QUALITY_RATING_LABEL,
} from '@/apis/mark/school-quality'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/teaching-analysis'
import AnalysisExamMultiSelect from '@/components/mark/AnalysisExamMultiSelect.vue'
import AnalysisSemesterSelect from '@/components/mark/AnalysisSemesterSelect.vue'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
import { MarkTrendSection } from '@/components/chart'
import { UiCard, UiEmpty, UiStatPanel, UiTag } from '@/components/ui-guide/ui'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { buildTrendLineChartOption } from '@/utils/mark-echarts-options'
import { formatAcademicTermCode } from '@/types/enums/semester-enum'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { examStatSnapshotsToTrendPoints } from '@/utils/mark-statistics-chart'
import { scoreTone } from '@/utils/score-tone'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'SchoolQualityCard' })

interface SchoolQualityForm {
  analysisDimension: SchoolQualityDimensionCode
  dimensionId: string
  semesterCode: string
  examIds: string[]
}
const form = reactive<SchoolQualityForm>({
  analysisDimension: 'COURSE',
  dimensionId: '',
  semesterCode: '',
  examIds: [],
})

const record = ref<SchoolQualityAnalysisVO | null>(null)
const loading = ref(false)
// D-9 错误态：AI 校级质量加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<Error | null>(null)
const generating = ref(false)

const qualityItems = computed(() => record.value?.qualityItems ?? [])
const examStatTrendPoints = computed(() =>
  examStatSnapshotsToTrendPoints(record.value?.examStatSnapshots ?? []),
)

const examTrendLastValue = computed(() => {
  const points = examStatTrendPoints.value
  if (points.length === 0) {
    return null
  }
  return Number(points[points.length - 1]?.value)
})

const { chartOption: examTrendChartOption } = useChartOption(() =>
  buildTrendLineChartOption(examStatTrendPoints.value, {
    yAxisName: '得分率 %',
    yMax: 100,
    area: true,
    emptyText: '至少需要 2 场考试才能展示走势',
  }),
)

const qualityMetrics = computed((): UiStatPanelItem[] => {
  if (!record.value) return []
  const data = record.value
  return [
    {
      key: 'teachingQualityScore',
      label: '教学质量',
      value: data.teachingQualityScore != null ? data.teachingQualityScore.toFixed(1) : '—',
      tone: data.teachingQualityScore != null ? scoreTone(data.teachingQualityScore) : 'gray',
    },
    {
      key: 'questionQualityScore',
      label: '命题质量',
      value: data.questionQualityScore != null ? data.questionQualityScore.toFixed(1) : '—',
      tone: data.questionQualityScore != null ? scoreTone(data.questionQualityScore) : 'gray',
    },
    {
      key: 'markingQualityScore',
      label: '阅卷质量',
      value: data.markingQualityScore != null ? data.markingQualityScore.toFixed(1) : '—',
      tone: data.markingQualityScore != null ? scoreTone(data.markingQualityScore) : 'gray',
    },
  ]
})

function qualityRatingLabel(rating: SchoolQualityRatingCode): string {
  return strictEnumLabel(SCHOOL_QUALITY_RATING_LABEL, rating, '校级质量评价等级')
}

function qualityRatingColor(rating: SchoolQualityRatingCode): BadgeTone {
  return strictEnumTone(SCHOOL_QUALITY_RATING_COLOR, rating, '校级质量评价等级')
}

watch(
  () => form.analysisDimension,
  () => {
    form.dimensionId = ''
  },
)

function analysisFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(
    errorMessage,
    'AI 校级质量分析未完成，请核对考试范围后重新生成',
  )
}

function schoolQualityDimensionLabel(value: SchoolQualityDimensionCode): string {
  return strictEnumLabel(SCHOOL_QUALITY_DIMENSION_LABEL, value, '校级质量分析维度')
}

async function reload(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const list = await listQualityAnalysis({
      analysisDimension: form.analysisDimension,
      semesterCode: form.semesterCode || undefined,
    })
    record.value = list[0] ?? null
    if (list.length === 0) message.info('暂无历史记录')
  } catch (e) {
    loadError.value = toUserError(e, '校级质量分析加载失败')
    showUserError(e, '校级质量分析加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  const examIds = form.examIds
  if (form.analysisDimension === 'COURSE' && !form.dimensionId) {
    message.warning('请选择课程')
    return
  }
  if (form.analysisDimension === 'CLASS' && !form.dimensionId) {
    message.warning('请选择班级')
    return
  }
  if (form.analysisDimension === 'SEMESTER' && !form.semesterCode) {
    message.warning('请选择学年学期')
    return
  }
  if (examIds.length < 2) {
    message.warning('至少需要选择 2 场考试')
    return
  }
  generating.value = true
  try {
    record.value = await generateQualityAnalysis({
      analysisDimension: form.analysisDimension,
      dimensionId: form.dimensionId || undefined,
      semesterCode: form.semesterCode || undefined,
      examIds,
    })
    message.success('已生成校级质量分析')
  } catch (e) {
    showUserError(e, '校级质量分析生成失败')
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
