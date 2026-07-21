<template>
  <AiAnalysisSection title="AI 课程目标达成度分析">
    <template #actions>
      <AiAnalysisHistorySelect v-model="historySelectedId" :rows="historyRows" :loading="loading" />
      <UiButton variant="outline" size="sm" :loading="loading" @click="reload()">
        查看历史
      </UiButton>
      <UiButton
        v-if="canManageReviewerWrites === true"
        variant="primary"
        size="sm"
        :loading="generating"
        @click="handleGenerate"
      >
        生成达成度分析
      </UiButton>
    </template>

    <UiSkeletonState v-if="loading || generating" variant="card" compact />
    <div v-else class="ai-analysis-section__body ai-analysis-section__body--flush">
      <SignalBand v-if="record" :metrics="achievementSignalMetrics" compact variant="inline" />

      <p v-if="record?.achievementSummary" class="ai-analysis-summary">
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
        v-if="record"
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
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { UiStatPanelItem } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { AiAnalysisStatusCode } from '@/apis/mark/ai-analysis-status'
import {
  CourseObjectiveDimensionDescription,
  generateAchievement,
  listAchievements,
} from '@/apis/mark/cross-exam-analysis'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import AiAnalysisHistorySelect from '@/components/mark/analysis/AiAnalysisHistorySelect.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import AiObjectiveProgressRow from '@/components/mark/analysis/AiObjectiveProgressRow.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useAiAnalysisHistoryPicker } from '@/composables/useAiAnalysisHistoryPicker'
import { loadExamsForCourseAcademicYearSemester } from '@/composables/useCrossExamDefaultScope'
import { useExamSummariesReviewerWriteCapability } from '@/composables/useExamIdsReviewerWriteCapability'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { formatSemester } from '@/types/enums/semester-enum'
import {
  buildOptionalAcademicYearSemesterQuery,
  buildRequiredAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
  ensureRequiredAcademicYearSemester,
} from '@/utils/academic-year-semester-query'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
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
  }>(),
  {
    scopeReferenceDepartmentId: null,
    scopeOrgCourseId: null,
    scopeOrgClassId: null,
    scopeAcademicYear: undefined,
    scopeSemester: undefined,
  },
)

const effectiveCourseId = computed(() => props.scopeOrgCourseId?.trim() || '')
const effectiveAcademicYear = computed(() => props.scopeAcademicYear?.trim() || '')
const effectiveSemester = computed(() => props.scopeSemester)

const examSelectScopeClassId = computed(() => props.scopeOrgClassId?.trim() || undefined)

const examSelectScopeReferenceDepartmentId = computed(
  () => props.scopeReferenceDepartmentId?.trim() || undefined,
)

const scopedExamIds = ref<string[]>([])
const scopedExamSummaries = ref<ExamSummaryResponse[]>([])

const scopeReady = computed(() =>
  Boolean(effectiveCourseId.value && effectiveAcademicYear.value && effectiveSemester.value),
)

/** 按 Tab 范围同步本课程本学期全部考核环节。 */
async function syncScopedExams(): Promise<void> {
  const semester = effectiveSemester.value
  if (!scopeReady.value || !semester) {
    scopedExamSummaries.value = []
    scopedExamIds.value = []
    return
  }
  try {
    const exams = await loadExamsForCourseAcademicYearSemester(
      effectiveCourseId.value,
      effectiveAcademicYear.value,
      semester,
      {
        classId: examSelectScopeClassId.value,
        referenceDepartmentId: examSelectScopeReferenceDepartmentId.value,
      },
    )
    scopedExamSummaries.value = exams
    scopedExamIds.value = exams
      .map((exam) => exam.examId)
      .filter((examId): examId is string => Boolean(examId))
  } catch (error) {
    scopedExamSummaries.value = []
    scopedExamIds.value = []
    showUserError(error, '考核环节加载失败')
  }
}

const {
  records: historyRecords,
  selectedId: historySelectedId,
  record,
  clearHistory,
  applyLoadedList,
  adoptGenerated,
} = useAiAnalysisHistoryPicker<CourseObjectiveAchievementResponse>()

watch(
  () =>
    [
      props.scopeOrgCourseId,
      props.scopeAcademicYear,
      props.scopeSemester,
      props.scopeOrgClassId,
      props.scopeReferenceDepartmentId,
    ] as const,
  async () => {
    clearHistory()
    await syncScopedExams()
    if (scopeReady.value) {
      await reload({ silent: true })
    }
  },
  { immediate: true },
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

async function reload(options?: { silent?: boolean }): Promise<void> {
  if (!effectiveCourseId.value) {
    if (!options?.silent) {
      showFormValidationMessage('请先在上方范围栏选择课程')
    }
    return
  }
  if (!ensureAcademicYearSemesterPair(effectiveAcademicYear.value, effectiveSemester.value)) {
    if (!options?.silent) {
      showFormValidationMessage('请先在上方范围栏选择学年与学期')
    }
    return
  }
  const termQuery = buildOptionalAcademicYearSemesterQuery(
    effectiveAcademicYear.value,
    effectiveSemester.value,
  )
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
    if (!options?.silent && count === 0) {
      void message.info('暂无历史记录')
    }
  } catch (e) {
    showUserError(e, '课程达成度分析加载失败')
  } finally {
    loading.value = false
  }
}

/** MVR-286：默认拒绝假可写；所选考试均须 canManageReviewerWrites */
const { canManageReviewerWrites } = useExamSummariesReviewerWriteCapability(
  computed(() => scopedExamIds.value),
  computed(() => scopedExamSummaries.value),
)

async function handleGenerate(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    showUserError(null, '仅本场阅卷组织成员、主考或管理员可生成分析')
    return
  }
  const courseId = effectiveCourseId.value
  const examIds = scopedExamIds.value
  if (!courseId) {
    showFormValidationMessage('请先在上方范围栏选择课程')
    return
  }
  if (!ensureRequiredAcademicYearSemester(effectiveAcademicYear.value, effectiveSemester.value)) {
    return
  }
  const termQuery = buildRequiredAcademicYearSemesterQuery(
    effectiveAcademicYear.value,
    effectiveSemester.value,
  )
  if (!termQuery) {
    return
  }
  if (examIds.length < 2) {
    showFormValidationMessage('当前范围内考核环节不足 2 场，无法生成达成度分析')
    return
  }
  if (generating.value) return
  generating.value = true
  try {
    const generated = await generateAchievement({
      courseId,
      examIds,
      ...termQuery,
    })
    adoptGenerated(generated)
    void message.success('已生成达成度分析')
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
