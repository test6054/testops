<template>
  <AiAnalysisSection title="AI 课程目标达成度分析">
    <template #actions>
      <AiAnalysisHistorySelect v-model="historySelectedId" :rows="historyRows" :loading="loading" />
      <UiButton variant="outline" size="sm" :loading="loading" @click="reload"> 查看历史 </UiButton>
      <UiButton variant="primary" size="sm" :loading="generating" @click="handleGenerate">
        生成达成度分析
      </UiButton>
    </template>

    <AiAnalysisConfigCollapse title="达成度分析范围">
      <div class="ai-form">
        <a-form layout="inline" :model="form" size="small">
          <a-form-item label="课程">
            <span v-if="scopeOrgCourseId?.trim()" class="scope-hint">{{
              scopeCourseLabel || effectiveCourseId || '—'
            }}</span>
            <CatalogCourseSelector
              v-else
              v-model:value="form.courseId"
              placeholder="请选择课程"
              :allow-clear="false"
              width="220px"
            />
          </a-form-item>
          <a-form-item label="学年">
            <span v-if="scopeTermLabel" class="scope-hint">{{ scopeTermLabel }}</span>
            <AnalysisSemesterSelect
              v-else-if="effectiveCourseId"
              v-model:academic-year="form.academicYear"
              v-model:semester="form.semester"
              :course-id="effectiveCourseId"
              :class-id="examSelectScopeClassId"
              :reference-department-id="examSelectScopeReferenceDepartmentId"
              :default-recent-semester-count="1"
            />
            <span v-else class="scope-hint">请先选择课程</span>
          </a-form-item>
          <a-form-item label="考核环节" style="flex: 1; min-width: 320px">
            <template v-if="effectiveCourseId && form.academicYear && form.semester">
              <AnalysisExamMultiSelect
                v-model="form.examIds"
                :scope-course-id="effectiveCourseId"
                :scope-class-id="examSelectScopeClassId"
                :scope-reference-department-id="examSelectScopeReferenceDepartmentId"
                :scope-academic-year="form.academicYear"
                :scope-semester="form.semester"
                auto-select-scoped-exams
                placeholder="已自动纳入本课程本学期全部考试，可减选"
              />
              <p class="scope-hint">默认统计评价规则内已挂接的全部考核；可取消勾选以排除某次考试</p>
            </template>
            <span v-else class="scope-hint">选定课程与学年、学期后自动纳入考核环节</span>
          </a-form-item>
        </a-form>
      </div>
    </AiAnalysisConfigCollapse>

    <UiSkeletonState v-if="loading || generating" variant="card" compact />
    <UiEmpty v-else-if="!record" description="配置范围后生成或查看课程目标达成度" />
    <div v-else-if="record" class="ai-analysis-section__body ai-analysis-section__body--flush">
      <SignalBand :metrics="achievementSignalMetrics" compact variant="inline" />

      <p v-if="record.achievementSummary" class="ai-analysis-summary">
        {{ record.achievementSummary }}
      </p>

      <MarkTrendSection
        title="参与考试得分走势"
        :hint="examTrendHint"
        :point-count="examStatTrendPoints.length"
        :option="examTrendChartOption"
        height="280px"
        :last-value="examTrendLastValue"
        value-unit="%"
      />

      <MarkBarSection
        title="分目标达成率"
        :hint="achievementBarHint"
        :item-count="achievementBarItems.length"
        :option="achievementBarChartOption"
        height="280px"
      />

      <div v-if="achievementItems.length > 0" class="ai-profile-block">
        <h5 class="ai-profile-block__title">分目标达成情况</h5>
        <div class="ai-objective-list">
          <div v-for="(item, index) in achievementItems" :key="index" class="ai-objective-block">
            <AiObjectiveProgressRow
              :objective="objectiveDimensionLabel(item)"
              :achievement-rate="item.achievementRate"
              :status="item.status"
            />
            <p v-if="item.objectiveDescription" class="diagnosis-text">
              {{ item.objectiveDescription }}
            </p>
            <p v-if="item.evidenceNote" class="diagnosis-text diagnosis-text--muted">
              依据：{{ item.evidenceNote }}
            </p>
            <p v-if="item.suggestion" class="diagnosis-text diagnosis-text--hint">
              {{ item.suggestion }}
            </p>
          </div>
        </div>
      </div>

      <AiAnalysisMetaCollapse
        :record="record"
        failure-fallback="AI 课程目标达成度分析未完成，请核对考试范围后重新生成"
        :extra-items="metaExtraItems"
      />
    </div>
  </AiAnalysisSection>
</template>

<script lang="ts" setup>
import type {
  CourseAchievementItemResponse,
  CourseObjectiveAchievementResponse,
} from '@/apis/mark/cross-exam-analysis'
import {
  CourseObjectiveDimensionDescription,
  generateAchievement,
  listAchievements,
} from '@/apis/mark/cross-exam-analysis'
import type { UiStatPanelItem } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { AiAnalysisStatusCode } from '@/apis/mark/ai-analysis-status'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import AiAnalysisConfigCollapse from '@/components/mark/analysis/AiAnalysisConfigCollapse.vue'
import AiAnalysisHistorySelect from '@/components/mark/analysis/AiAnalysisHistorySelect.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import AiObjectiveProgressRow from '@/components/mark/analysis/AiObjectiveProgressRow.vue'
import AnalysisExamMultiSelect from '@/components/mark/AnalysisExamMultiSelect.vue'
import AnalysisSemesterSelect from '@/components/mark/AnalysisSemesterSelect.vue'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useAiAnalysisHistoryPicker } from '@/composables/useAiAnalysisHistoryPicker'
import { useChartOption } from '@/hooks/modules/useChartOption'
import {
  buildOptionalAcademicYearSemesterQuery,
  buildRequiredAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
  ensureRequiredAcademicYearSemester,
} from '@/utils/academic-year-semester-query'
import { showUserError } from '@/utils/error-handler'
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
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'CourseAchievementCard' })

const props = withDefaults(
  defineProps<{
    scopeReferenceDepartmentId?: string | null
    scopeOrgCourseId?: string | null
    scopeOrgClassId?: string | null
    scopeAcademicYear?: string
    scopeSemester?: SemesterCode
    examScopeLocked?: boolean
    scopeTermLabel?: string
    scopeCourseLabel?: string
  }>(),
  {
    scopeReferenceDepartmentId: null,
    scopeOrgCourseId: null,
    scopeOrgClassId: null,
    scopeAcademicYear: undefined,
    scopeSemester: undefined,
    examScopeLocked: false,
    scopeTermLabel: '',
    scopeCourseLabel: '',
  },
)

interface CourseAchievementForm {
  courseId: string
  academicYear: string | undefined
  semester: SemesterCode | undefined
  examIds: string[]
}

const form = reactive<CourseAchievementForm>({
  courseId: '',
  academicYear: undefined,
  semester: undefined,
  examIds: [],
})

const effectiveCourseId = computed(
  () => form.courseId.trim() || props.scopeOrgCourseId?.trim() || '',
)

const examSelectScopeClassId = computed(() => props.scopeOrgClassId?.trim() || undefined)

const examSelectScopeReferenceDepartmentId = computed(
  () => props.scopeReferenceDepartmentId?.trim() || undefined,
)

const {
  records: historyRecords,
  selectedId: historySelectedId,
  record,
  clearHistory,
  applyLoadedList,
  adoptGenerated,
} = useAiAnalysisHistoryPicker<CourseObjectiveAchievementResponse>()

watch(
  () => [props.scopeOrgCourseId, props.scopeAcademicYear, props.scopeSemester] as const,
  ([courseId, year, semesterCode]) => {
    if (courseId?.trim()) {
      form.courseId = courseId.trim()
    }
    if (year) {
      form.academicYear = year
    }
    if (semesterCode) {
      form.semester = semesterCode
    }
  },
  { immediate: true },
)

watch(
  () => form.courseId,
  () => {
    form.academicYear = undefined
    form.semester = undefined
    form.examIds = []
    clearHistory()
  },
)

watch(
  () => props.scopeOrgCourseId,
  (courseId) => {
    if (courseId?.trim() && !form.courseId.trim()) {
      form.courseId = courseId.trim()
    }
  },
  { immediate: true },
)

watch(
  () => [form.academicYear, form.semester],
  () => {
    form.examIds = []
    clearHistory()
  },
)

const historyRows = computed(() =>
  historyRecords.value.map((item) => ({
    id: item.id,
    createTime: item.createTime,
    analysisStatus: item.analysisStatus,
    examCount: item.examCount,
    academicYear: item.academicYear,
    semester: item.semester,
  })),
)

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

const achievementSignalMetrics = computed<SignalMetric[]>(() => {
  const scoreRateTrend = computeTrendPointDelta(examStatTrendPoints.value)
  return toSignalMetrics(achievementMetrics.value).map((metric) =>
    metric.key === 'overallAchievementRate'
      ? { ...metric, trend: scoreRateTrend, trendPolarity: 'positive' }
      : metric,
  )
})

const metaExtraItems = computed(() => {
  const value = record.value
  if (!value) {
    return []
  }
  return [
    { label: '课程', value: value.courseName?.trim() || '—' },
    {
      label: '学年',
      value: value.academicYear?.trim() || '未限定',
    },
    {
      label: '学期',
      value: value.semester ? formatSemester(value.semester) : '未限定',
    },
    { label: '考试范围', value: examScopeSummary(value) },
  ]
})

function examScopeSummary(value: CourseObjectiveAchievementResponse): string {
  if (!value.exams.length) {
    return '无考试范围'
  }
  return value.exams
    .map(
      (exam) =>
        `${exam.examName ?? exam.examId}${exam.examTime ? ` · ${formatDateTime(exam.examTime)}` : ''}`,
    )
    .join('；')
}

async function reload(): Promise<void> {
  if (!effectiveCourseId.value) {
    message.warning('请选择课程')
    return
  }
  if (!ensureAcademicYearSemesterPair(form.academicYear, form.semester)) {
    return
  }
  const termQuery = buildOptionalAcademicYearSemesterQuery(form.academicYear, form.semester)
  if (termQuery === null) {
    return
  }
  loading.value = true
  try {
    const list = await listAchievements({
      courseId: effectiveCourseId.value,
      ...termQuery,
    })
    const count = applyLoadedList(list)
    if (count === 0) message.info('暂无历史记录')
  } catch (e) {
    showUserError(e, '课程达成度分析加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  const courseId = effectiveCourseId.value
  const examIds = form.examIds
  if (!courseId) {
    message.warning('请选择课程')
    return
  }
  if (!ensureRequiredAcademicYearSemester(form.academicYear, form.semester)) {
    return
  }
  const termQuery = buildRequiredAcademicYearSemesterQuery(form.academicYear, form.semester)
  if (!termQuery) {
    return
  }
  if (examIds.length < 2) {
    message.warning('课程目标达成度分析至少需要 2 场考核')
    return
  }
  generating.value = true
  try {
    const generated = await generateAchievement({
      courseId,
      examIds,
      ...termQuery,
    })
    adoptGenerated(generated)
    message.success('已生成达成度分析')
  } catch (e) {
    showUserError(e, '课程达成度分析生成失败')
  } finally {
    generating.value = false
  }
}

function latencyText(value: CourseObjectiveAchievementResponse): string {
  if (value.latencyMs != null) return `${value.latencyMs} ms`
  if (value.analysisStatus === AiAnalysisStatusCode.PENDING) return '待分析，尚未生成耗时'
  return '分析未完成，暂无耗时'
}

function objectiveDimensionLabel(item: CourseAchievementItemResponse): string {
  if (item.objectiveDimension) {
    return strictEnumLabel(
      CourseObjectiveDimensionDescription,
      item.objectiveDimension,
      '课程目标维度',
    )
  }
  return item.objectiveDescription?.trim() || '—'
}
</script>

<style lang="scss" scoped>
.ai-form {
  width: 100%;
}
.ai-objective-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-objective-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.diagnosis-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary);
}
.diagnosis-text--hint {
  color: var(--dp-text-primary);
}
.diagnosis-text--muted {
  font-size: 12px;
  color: var(--dp-text-muted);
}
.scope-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--dp-text-muted);
  line-height: 1.5;
}
</style>
