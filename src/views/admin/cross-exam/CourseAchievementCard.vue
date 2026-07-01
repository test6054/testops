<template>
  <UiCard title="AI 课程目标达成度分析" compact>
    <div class="ai-form">
      <a-form layout="inline" :model="form" size="small">
        <a-form-item label="学年学期">
          <AnalysisSemesterSelect
            v-model="form.semesterCode"
            placeholder="请选择学年学期"
            :default-recent-semester-count="defaultRecentSemesterCount"
          />
        </a-form-item>
        <a-form-item label="参与考试列表" style="flex: 1; min-width: 320px">
          <AnalysisExamMultiSelect
            v-model="form.examIds"
            placeholder="请选择至少 1 场考试"
            :default-recent-semester-count="defaultRecentSemesterCount"
            @selected-exams-change="selectedExams = $event"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button :loading="loading" @click="reload">
              <template #icon><ReloadOutlined /></template>查看历史
            </a-button>
            <a-button type="primary" :loading="generating" @click="handleGenerate">
              生成达成度分析
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <a-spin :spinning="loading || generating">
      <UiEmpty v-if="!loading && !generating && !record" description="暂无数据" />
      <div v-else-if="record" class="ai-record">
        <SignalBand :metrics="achievementSignalMetrics" compact variant="inline" />

        <a-descriptions :column="3" compact bordered>
          <a-descriptions-item label="状态">
            <UiTag :tone="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="课程">
            {{ record.courseName?.trim() || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="学年学期">
            {{
              record.semesterCode ? formatAcademicTermCode(record.semesterCode) : '未限定学年学期'
            }}
          </a-descriptions-item>
          <a-descriptions-item label="生成时间" :span="2">
            {{ formatDateTime(record.createTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="处理追踪编号">
            <a-typography-text :content="record.aiTraceId" copyable />
          </a-descriptions-item>
          <a-descriptions-item label="考试范围" :span="3">
            <a-space v-if="record.exams.length" wrap>
              <UiTag v-for="exam in record.exams" :key="exam.examId">
                {{ exam.examName }}{{ exam.examTime ? ` · ${formatDateTime(exam.examTime)}` : '' }}
              </UiTag>
            </a-space>
            <span v-else class="text-muted">无考试范围</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="record.errorMessage" label="分析处理说明" :span="3">
            <a-typography-text type="danger">
              {{ analysisFailureMessage(record.errorMessage) }}
            </a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <a-typography-paragraph v-if="record.achievementSummary" class="ai-summary">
          <strong>达成度摘要：</strong>{{ record.achievementSummary }}
        </a-typography-paragraph>

        <MarkTrendSection
          v-if="record"
          title="参与考试得分走势"
          :hint="examTrendHint"
          :point-count="examStatTrendPoints.length"
          :option="examTrendChartOption"
          height="280px"
          :last-value="examTrendLastValue"
          value-unit="%"
        />

        <MarkBarSection
          v-if="record"
          title="分目标达成率"
          :hint="achievementBarHint"
          :item-count="achievementBarItems.length"
          :option="achievementBarChartOption"
          height="280px"
        />

        <div v-if="achievementItems.length > 0" class="ai-items">
          <strong>分目标达成情况：</strong>
          <a-list compact :data-source="achievementItems" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>
                <div class="analysis-item">
                  <div class="analysis-item__header">
                    <a-typography-text strong>第 {{ index + 1 }} 项</a-typography-text>
                    <span class="analysis-item__title">
                      {{ objectiveDimensionLabel(item) }}
                    </span>
                    <UiTag v-if="item.status" :tone="achievementStatusColor(item.status)">
                      {{ achievementStatusLabel(item.status) }}
                    </UiTag>
                    <span v-if="item.achievementRate != null" class="analysis-item__metric">
                      达成率 {{ formatPercent(item.achievementRate) }}
                    </span>
                  </div>
                  <a-typography-paragraph
                    v-if="item.objectiveDescription"
                    class="analysis-item__text"
                  >
                    {{ item.objectiveDescription }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.evidenceNote" class="analysis-item__text">
                    <strong>依据：</strong>{{ item.evidenceNote }}
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
  CourseAchievementItemVO,
  CourseAchievementStatusCode,
  CourseObjectiveAchievementVO,
} from '@/apis/mark/cross-exam-analysis'
import {
  COURSE_ACHIEVEMENT_STATUS_LABEL,
  COURSE_ACHIEVEMENT_STATUS_TONE,
  COURSE_OBJECTIVE_DIMENSION_LABEL,
  generateAchievement,
  listAchievements,
} from '@/apis/mark/cross-exam-analysis'
import type { ExamSummaryVO } from '@/apis/mark/exam'
import type { BadgeTone, UiStatPanelItem } from '@/components/ui-guide/ui/types'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/ai-analysis-status'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import AnalysisExamMultiSelect from '@/components/mark/AnalysisExamMultiSelect.vue'
import AnalysisSemesterSelect from '@/components/mark/AnalysisSemesterSelect.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useChartOption } from '@/hooks/modules/useChartOption'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { formatAcademicTermCode } from '@/types/enums/semester-enum'
import { parseAcademicYearSemesterValue } from '@/utils/academic-year'
import { assertUserFacing } from '@/utils/contract-guard'
import { getUserProcessFailureMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import {
  buildBarChartInsight,
  buildTrendChartInsight,
  mergeChartHint,
} from '@/utils/mark-chart-insights'
import {
  buildCategoryBarChartOption,
  buildTrendLineChartOption,
} from '@/utils/mark-echarts-options'
import {
  achievementItemsToBarItems,
  examStatSnapshotsToTrendPoints,
} from '@/utils/mark-statistics-chart'
import { rateTone } from '@/utils/score-tone'
import { computeTrendPointDelta, toSignalMetrics } from '@/utils/stat-metric-helpers'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'CourseAchievementCard' })

withDefaults(
  defineProps<{
    defaultRecentSemesterCount?: number
  }>(),
  {
    defaultRecentSemesterCount: 0,
  },
)

const form = reactive({
  semesterCode: '',
  examIds: [] as string[],
})

const record = ref<CourseObjectiveAchievementVO | null>(null)
const selectedExams = ref<ExamSummaryVO[]>([])
const loading = ref(false)
const generating = ref(false)

const achievementItems = computed(() => record.value?.achievementItems ?? [])
const examStatTrendPoints = computed(() =>
  examStatSnapshotsToTrendPoints(record.value?.examStatSnapshots ?? []),
)
const achievementBarItems = computed(() =>
  achievementItemsToBarItems(record.value?.achievementItems ?? []),
)

const examTrendHint = computed(() => buildTrendChartInsight(examStatTrendPoints.value))

const achievementBarHint = computed(() =>
  mergeChartHint(
    '悬停查看各目标达成率与说明',
    buildBarChartInsight(achievementBarItems.value, { passLine: 60, passLineLabel: '达标线' }),
  ),
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

const { chartOption: achievementBarChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(achievementBarItems.value, {
    orientation: 'vertical',
    maxValue: 100,
    yAxisName: '达成率 %',
    unit: '%',
    emptyText: '暂无分目标达成率数据',
  }),
)

const achievementMetrics = computed((): UiStatPanelItem[] => {
  if (!record.value) return []
  const data = record.value
  const rate = data.overallAchievementRate
  return [
    {
      key: 'overallAchievementRate',
      label: '整体达成率',
      value: rate != null ? `${(rate * 100).toFixed(1)}` : '—',
      unit: rate != null ? '%' : '',
      tone: rate != null ? rateTone(rate) : 'gray',
    },
    {
      key: 'examCount',
      label: '考试数',
      value: data.examCount ?? 0,
      unit: '场',
    },
    {
      key: 'latency',
      label: '生成耗时',
      value: latencyText(data),
    },
  ]
})

const achievementSignalMetrics = computed(() => {
  const scoreRateTrend = computeTrendPointDelta(examStatTrendPoints.value)
  return toSignalMetrics(achievementMetrics.value).map((metric) =>
    metric.key === 'overallAchievementRate'
      ? { ...metric, trend: scoreRateTrend, trendPolarity: 'positive' as const }
      : metric,
  )
})

const selectedCourseIds = computed(() =>
  Array.from(new Set(selectedExams.value.map((exam) => exam.courseId).filter(Boolean))),
)

function analysisFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(
    errorMessage,
    'AI 课程目标达成度分析未完成，请核对考试范围后重新生成',
  )
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
  loading.value = true
  try {
    const list = await listAchievements({ courseId })
    acceptCourseAchievementRecord(list[0] ?? null)
    if (list.length === 0) message.info('暂无历史记录')
  } catch (e) {
    showUserError(e, '课程达成度分析加载失败')
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
  if (examIds.length === 0) {
    message.warning('至少需要选择 1 场考试')
    return
  }
  generating.value = true
  try {
    const achievementParams: {
      courseId: string
      examIds: string[]
      academicYear?: string
      semester?: SemesterCode
    } = { courseId, examIds }
    if (form.semesterCode) {
      const parsed = parseAcademicYearSemesterValue(form.semesterCode)
      achievementParams.academicYear = parsed.academicYear
      achievementParams.semester = parsed.semester
    }
    const generated = await generateAchievement(achievementParams)
    acceptCourseAchievementRecord(generated)
    message.success('已生成达成度分析')
  } catch (e) {
    showUserError(e, '课程达成度分析生成失败')
  } finally {
    generating.value = false
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function latencyText(value: CourseObjectiveAchievementVO): string {
  if (value.latencyMs != null) return `${value.latencyMs} ms`
  if (value.analysisStatus === 'PENDING') return '待分析，尚未生成耗时'
  return '分析未完成，暂无耗时'
}

function assertCourseAchievementContract(value: CourseObjectiveAchievementVO): void {
  const dataError = '课程目标达成度分析数据异常，请刷新后重试'
  assertUserFacing(Boolean(value.courseName?.trim()), dataError)
  assertUserFacing(Boolean(value.aiTraceId?.trim()), dataError)
  assertUserFacing(value.exams.length > 0, dataError)
  if (value.analysisStatus === 'SUCCESS') {
    assertUserFacing(value.latencyMs != null, dataError)
  }
}

function acceptCourseAchievementRecord(value: CourseObjectiveAchievementVO | null): void {
  if (value) {
    assertCourseAchievementContract(value)
  }
  record.value = value
}

function achievementStatusLabel(status: CourseAchievementStatusCode): string {
  return strictEnumLabel(COURSE_ACHIEVEMENT_STATUS_LABEL, status, '课程目标达成状态')
}

function achievementStatusColor(status: CourseAchievementStatusCode): BadgeTone {
  return strictEnumTone(COURSE_ACHIEVEMENT_STATUS_TONE, status, '课程目标达成状态')
}

function objectiveDimensionLabel(item: CourseAchievementItemVO): string {
  if (item.objectiveDimension) {
    return strictEnumLabel(
      COURSE_OBJECTIVE_DIMENSION_LABEL,
      item.objectiveDimension,
      '课程目标维度',
    )
  }
  return item.objectiveDescription?.trim() || '—'
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
  border-radius: var(--dp-radius-panel, 6px);
  background: var(--dp-surface, #fff);
}
.ai-chart__meta {
  margin-bottom: 8px;
}
.ai-chart__canvas {
  width: 100%;
  height: 280px;
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
