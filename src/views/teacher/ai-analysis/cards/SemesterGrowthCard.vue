<template>
  <AiAnalysisSection title="AI 学期能力成长曲线">
    <template #actions>
      <AiAnalysisHistorySelect v-model="historySelectedId" :rows="historyRows" :loading="loading" />
      <UiButton variant="outline" size="sm" :loading="loading" @click="reload"> 查看历史 </UiButton>
      <UiButton variant="primary" size="sm" :loading="generating" @click="handleGenerate">
        生成成长曲线
      </UiButton>
    </template>

    <AiAnalysisConfigCollapse title="成长分析范围">
      <div class="ai-form">
        <a-form layout="inline" :model="form" size="small">
          <a-form-item label="开课学年">
            <AnalysisSemesterSelect
              v-model:academic-year="form.teachingAcademicYear"
              v-model:semester="form.teachingSemester"
              term-source="TEACHING"
              :allow-clear="false"
              :default-recent-semester-count="defaultRecentSemesterCount"
            />
          </a-form-item>
          <a-form-item label="考试范围">
            <a-radio-group v-model:value="form.examScopeMode" size="small">
              <a-radio-button value="AUTO">按开课学期自动选考</a-radio-button>
              <a-radio-button value="MANUAL">手动选择考试</a-radio-button>
            </a-radio-group>
          </a-form-item>
          <a-form-item v-if="form.examScopeMode === 'AUTO'" label="课程">
            <span v-if="scopeOrgCourseId?.trim()" class="scope-hint">{{
              scopeCourseLabel || form.courseId || '—'
            }}</span>
            <CatalogCourseSelector
              v-else
              v-model:value="form.courseId"
              placeholder="请选择课程"
              :allow-clear="false"
              width="240px"
            />
          </a-form-item>
          <a-form-item label="班级">
            <ClassSelector
              v-if="form.examScopeMode === 'AUTO'"
              v-model:value="form.classId"
              :department-id="examSelectScopeReferenceDepartmentId"
              placeholder="请选择班级"
              :allow-clear="false"
              width="240px"
            />
            <a-select
              v-else
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
          <a-form-item
            v-if="form.examScopeMode === 'MANUAL'"
            label="参与考试列表"
            style="flex: 1; min-width: 360px"
          >
            <AnalysisExamMultiSelect
              v-if="form.teachingAcademicYear && form.teachingSemester"
              v-model="form.examIds"
              :scope-course-id="examSelectScopeCourseId"
              :scope-teaching-academic-year="form.teachingAcademicYear"
              :scope-teaching-semester="form.teachingSemester"
              :scope-class-id="examSelectScopeClassId"
              :scope-reference-department-id="examSelectScopeReferenceDepartmentId"
              placeholder="请选择至少 2 场考试"
              @selected-exams-change="selectedExams = $event"
            />
            <span v-else class="text-muted">请先选择开课学年与学期</span>
          </a-form-item>
        </a-form>
      </div>
    </AiAnalysisConfigCollapse>

    <UiSkeletonState v-if="loading || generating" variant="card" compact />
    <UiEmpty v-else-if="!record" description="配置范围后生成或查看学期成长曲线" />
    <div v-else-if="record" class="ai-analysis-section__body ai-analysis-section__body--flush">
      <div v-if="record.growthSummary || record.growthTrend" class="ai-analysis-summary-row">
        <p v-if="record.growthSummary" class="ai-analysis-summary">{{ record.growthSummary }}</p>
        <UiTag v-if="record.growthTrend" :tone="trendColor(record.growthTrend)" size="sm">
          {{ trendLabel(record.growthTrend) }}
        </UiTag>
      </div>

      <MarkTrendSection
        title="学期考试得分走势"
        :hint="examTrendHint"
        :point-count="examStatTrendPoints.length"
        :option="examTrendChartOption"
        height="280px"
        :last-value="examTrendLastValue"
        value-unit="%"
      />

      <MarkBarSection
        title="能力点起止对比"
        :hint="growthBarHint"
        :item-count="growthBarItems.length"
        :option="growthBarChartOption"
        height="280px"
      />

      <div v-if="growthItems.length > 0" class="ai-profile-block">
        <h5 class="ai-profile-block__title">各阶段能力点</h5>
        <div class="ai-profile-diagnosis-list">
          <div v-for="(item, index) in growthItems" :key="index" class="ai-profile-diagnosis-item">
            <div class="diagnosis-header">
              <span class="diagnosis-type">{{
                item.dimensionLabel || item.dimension || '能力点'
              }}</span>
              <span v-if="item.changeRate != null" class="diagnosis-rate">
                变化 {{ formatRate(item.changeRate) }}
              </span>
            </div>
            <p v-if="item.description" class="diagnosis-text">{{ item.description }}</p>
            <p
              v-if="item.startValue != null || item.endValue != null"
              class="diagnosis-text diagnosis-text--muted"
            >
              起止值：{{ growthValueText(item.startValue) }} / {{ growthValueText(item.endValue) }}
            </p>
            <p v-if="item.improvementNote" class="diagnosis-text diagnosis-text--hint">
              {{ item.improvementNote }}
            </p>
            <p v-if="item.riskNote" class="diagnosis-text">{{ item.riskNote }}</p>
          </div>
        </div>
      </div>

      <AiAnalysisMetaCollapse
        :record="record"
        failure-fallback="AI 学期能力成长分析未完成，请稍后重新生成"
        :extra-items="metaExtraItems"
      />
    </div>
  </AiAnalysisSection>
</template>

<script lang="ts" setup>
import type {
  SemesterAbilityGrowthResponse,
  SemesterGrowthTrendCode,
} from '@/apis/mark/cross-exam-analysis'
import {
  generateClassGrowth,
  listCommonClassScopes,
  listGrowth,
  SEMESTER_GROWTH_TREND_TONE,
  SemesterGrowthTrendDescription,
} from '@/apis/mark/cross-exam-analysis'
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  AnalysisScopeTypeCode,
  AnalysisScopeTypeDescription,
} from '@/apis/mark/analysis-scope-type'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import AiAnalysisConfigCollapse from '@/components/mark/analysis/AiAnalysisConfigCollapse.vue'
import AiAnalysisHistorySelect from '@/components/mark/analysis/AiAnalysisHistorySelect.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import AnalysisExamMultiSelect from '@/components/mark/AnalysisExamMultiSelect.vue'
import AnalysisSemesterSelect from '@/components/mark/AnalysisSemesterSelect.vue'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { useAiAnalysisHistoryPicker } from '@/composables/useAiAnalysisHistoryPicker'
import { useChartOption } from '@/hooks/modules/useChartOption'
import {
  buildRequiredAcademicYearSemesterQuery,
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
  examStatSnapshotsToTrendPoints,
  growthItemsToBarItems,
} from '@/utils/mark-statistics-chart'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'SemesterGrowthCard' })

const props = withDefaults(
  defineProps<{
    defaultRecentSemesterCount?: number
    drillClassId?: string | null
    drillClassLabel?: string
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
    defaultRecentSemesterCount: 0,
    drillClassId: null,
    drillClassLabel: '',
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

interface SemesterGrowthForm {
  teachingAcademicYear: string | undefined
  teachingSemester: SemesterCode | undefined
  examScopeMode: 'AUTO' | 'MANUAL'
  courseId: string | null
  classId: string
  examIds: string[]
}

const form = reactive<SemesterGrowthForm>({
  teachingAcademicYear: undefined,
  teachingSemester: undefined,
  examScopeMode: 'AUTO',
  courseId: null,
  classId: '',
  examIds: [],
})

const {
  records: historyRecords,
  selectedId: historySelectedId,
  record,
  clearHistory,
  applyLoadedList,
  adoptGenerated,
} = useAiAnalysisHistoryPicker<SemesterAbilityGrowthResponse>()

const historyRows = computed(() =>
  historyRecords.value.map((item) => ({
    id: item.id,
    createTime: item.createTime,
    analysisStatus: item.analysisStatus,
    examCount: item.examCount,
    academicYear: item.academicYear,
    semester: item.semester,
    extraHint: item.scopeName?.trim() || undefined,
  })),
)

const selectedExams = ref<ExamSummaryResponse[]>([])
const classOptions = ref<{ label: string; value: string }[]>([])
const classLoading = ref(false)
const loading = ref(false)
const generating = ref(false)

const growthItems = computed(() => record.value?.growthItems ?? [])
const examStatTrendPoints = computed(() =>
  examStatSnapshotsToTrendPoints(record.value?.examStatSnapshots ?? []),
)
const growthBarItems = computed(() => growthItemsToBarItems(record.value?.growthItems ?? []))

const examTrendHint = computed(() =>
  mergeChartHint('按考试时间序列展示得分率', buildTrendChartInsight(examStatTrendPoints.value)),
)

const growthBarHint = computed(() =>
  mergeChartHint('各能力维度结束值，悬停查看起止对照', buildBarChartInsight(growthBarItems.value)),
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

const { chartOption: growthBarChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(growthBarItems.value, {
    orientation: 'vertical',
    yAxisName: '成长值',
    emptyText: '暂无学期成长数据',
  }),
)

const selectedCourseIds = computed(() => {
  const courseIds = new Set<string>()
  for (const examId of form.examIds) {
    const matched = selectedExams.value.find((exam) => exam.examId === examId)
    if (matched?.courseId) {
      courseIds.add(matched.courseId)
    }
  }
  return Array.from(courseIds)
})

const examSelectScopeClassId = computed(() => {
  const orgClassId = props.scopeOrgClassId?.trim()
  if (orgClassId) {
    return orgClassId
  }
  const drillId = props.drillClassId?.trim()
  if (drillId) {
    return drillId
  }
  if (form.classId.trim()) {
    return form.classId.trim()
  }
  return undefined
})

const examSelectScopeCourseId = computed(() => {
  const orgCourseId = props.scopeOrgCourseId?.trim()
  if (orgCourseId) {
    return orgCourseId
  }
  return form.courseId?.trim() || undefined
})

const examSelectScopeReferenceDepartmentId = computed(
  () => props.scopeReferenceDepartmentId?.trim() || undefined,
)

const effectiveClassId = computed(() => examSelectScopeClassId.value?.trim() || '')

const effectiveCourseId = computed(() => examSelectScopeCourseId.value?.trim() || '')

const metaExtraItems = computed(() => {
  const value = record.value
  if (!value) {
    return []
  }
  return [
    {
      label: '开课学年',
      value: value.academicYear?.trim() || '—',
    },
    {
      label: '开课学期',
      value: value.semester ? formatSemester(value.semester) : '—',
    },
    {
      label: '分析范围',
      value: `${scopeTypeLabel(value.scopeType)} · ${value.scopeName?.trim() || '—'}`,
    },
    { label: '考试数', value: String(value.examCount ?? '—') },
    { label: '考试范围', value: examScopeSummary(value) },
  ]
})

function examScopeSummary(value: SemesterAbilityGrowthResponse): string {
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

/** 将父级班级钻取同步到班级筛选，并在选项未加载时注入班级标签。 */
function applyDrillClassSelection(): void {
  const classId = props.drillClassId?.trim()
  if (!classId) {
    return
  }
  if (classOptions.value.some((option) => option.value === classId)) {
    form.classId = classId
    return
  }
  const label = props.drillClassLabel?.trim()
  if (label) {
    classOptions.value = [{ value: classId, label }, ...classOptions.value]
    form.classId = classId
  }
}

watch(
  () => props.scopeOrgCourseId,
  (courseId) => {
    if (!courseId?.trim()) {
      return
    }
    form.courseId = courseId.trim()
  },
  { immediate: true },
)

watch(
  () => props.drillClassId,
  (classId) => {
    if (!classId) {
      form.classId = ''
      return
    }
    applyDrillClassSelection()
  },
  { immediate: true },
)

watch(
  () => [form.teachingAcademicYear, form.teachingSemester],
  () => {
    clearHistory()
    if (form.examScopeMode !== 'MANUAL') {
      return
    }
    form.examIds = []
    selectedExams.value = []
  },
)

watch(
  () => form.examScopeMode,
  (mode) => {
    clearHistory()
    if (mode === 'AUTO') {
      form.examIds = []
      selectedExams.value = []
      classOptions.value = []
      classLoading.value = false
      return
    }
    form.courseId = null
    form.classId = ''
  },
)

watch(
  () => form.classId,
  () => {
    clearHistory()
  },
)

watch(
  () => [form.teachingAcademicYear, form.teachingSemester],
  () => {
    if (form.examScopeMode === 'AUTO') {
      form.courseId = null
    }
  },
)

watch(
  () => [...form.examIds],
  async (examIds) => {
    if (form.examScopeMode !== 'MANUAL') {
      return
    }
    form.classId = ''
    classOptions.value = []
    if (examIds.length === 0) return
    classLoading.value = true
    try {
      const classRefs = await listCommonClassScopes(examIds)
      classOptions.value = classRefs.map((classRef) => ({
        value: classRef.classId,
        label: classRef.className,
      }))
      if (classOptions.value.length === 0 && examIds.length > 0) {
        message.warning('所选考试没有共同班级，请调整考试范围')
      }
      applyDrillClassSelection()
    } catch (e) {
      showUserError(e, '考试班级范围加载失败')
    } finally {
      classLoading.value = false
    }
  },
)

async function reload(): Promise<void> {
  if (!ensureRequiredAcademicYearSemester(form.teachingAcademicYear, form.teachingSemester)) {
    return
  }
  const termQuery = buildRequiredAcademicYearSemesterQuery(
    form.teachingAcademicYear,
    form.teachingSemester,
  )
  if (!termQuery) {
    return
  }
  if (!effectiveClassId.value) {
    message.warning('请选择班级')
    return
  }
  loading.value = true
  try {
    const list = await listGrowth({
      teachingAcademicYear: termQuery.academicYear,
      teachingSemester: termQuery.semester,
      scopeType: AnalysisScopeTypeCode.CLASS,
      scopeId: effectiveClassId.value,
    })
    const count = applyLoadedList(list)
    if (count === 0) message.info('暂无历史记录')
  } catch (e) {
    showUserError(e, '学期成长曲线加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  if (!ensureRequiredAcademicYearSemester(form.teachingAcademicYear, form.teachingSemester)) {
    return
  }
  const termQuery = buildRequiredAcademicYearSemesterQuery(
    form.teachingAcademicYear,
    form.teachingSemester,
  )
  if (!termQuery) {
    return
  }
  if (!effectiveClassId.value) {
    message.warning('请选择班级')
    return
  }
  const { academicYear: teachingAcademicYear, semester: teachingSemester } = termQuery

  if (form.examScopeMode === 'AUTO') {
    if (!effectiveCourseId.value) {
      message.warning('请选择课程')
      return
    }
    generating.value = true
    try {
      const generated = await generateClassGrowth({
        teachingAcademicYear,
        teachingSemester,
        courseId: effectiveCourseId.value,
        classId: effectiveClassId.value,
        examIds: [],
        autoSelectExams: true,
      })
      adoptGenerated(generated)
      message.success('已按开课学期自动选考并生成成长曲线')
    } catch (e) {
      showUserError(e, '学期成长曲线生成失败')
    } finally {
      generating.value = false
    }
    return
  }

  if (selectedCourseIds.value.length > 1) {
    message.warning('请选择同一课程下的考试')
    return
  }
  const courseId = selectedCourseIds.value[0] ?? ''
  const classId = effectiveClassId.value
  const examIds = form.examIds
  if (!courseId) {
    message.warning('请选择同一课程下的考试')
    return
  }
  if (examIds.length < 2) {
    message.warning('至少需要选择 2 场考试')
    return
  }
  generating.value = true
  try {
    const generated = await generateClassGrowth({
      teachingAcademicYear,
      teachingSemester,
      courseId,
      classId,
      examIds,
      autoSelectExams: false,
    })
    adoptGenerated(generated)
    message.success('已生成成长曲线')
  } catch (e) {
    showUserError(e, '学期成长曲线生成失败')
  } finally {
    generating.value = false
  }
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

function trendLabel(trend: SemesterGrowthTrendCode): string {
  return strictEnumLabel(SemesterGrowthTrendDescription, trend, '学期能力成长趋势')
}

function trendColor(trend: SemesterGrowthTrendCode): BadgeTone {
  return strictEnumTone(SEMESTER_GROWTH_TREND_TONE, trend, '学期能力成长趋势')
}

function scopeTypeLabel(scopeType: SemesterAbilityGrowthResponse['scopeType']): string {
  return strictEnumLabel(AnalysisScopeTypeDescription, scopeType, '分析范围类型')
}

function growthValueText(value: number | undefined): string {
  return String(value)
}
</script>

<style lang="scss" scoped>
.ai-form {
  width: 100%;
}
.ai-analysis-summary-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}
.diagnosis-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.diagnosis-rate {
  margin-left: auto;
  font-size: 12px;
  color: var(--dp-text-secondary);
}
.diagnosis-type {
  font-size: 13px;
  font-weight: 600;
}
.diagnosis-text {
  margin: 4px 0 0;
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
.text-muted {
  color: var(--dp-text-muted);
}
</style>
