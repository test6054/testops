<template>
  <AiAnalysisSection title="AI 跨考试趋势分析">
    <template #actions>
      <AiAnalysisHistorySelect v-model="historySelectedId" :rows="historyRows" :loading="loading" />
      <UiRadioGroup
        v-model="scopeMode"
        size="sm"
        :options="[
          { label: '课程维度', value: AnalysisScopeTypeCode.COURSE },
          { label: '班级维度', value: AnalysisScopeTypeCode.CLASS },
        ]"
      />
      <UiButton variant="outline" size="sm" :loading="loading" @click="reload"> 查看历史 </UiButton>
      <UiButton
        v-if="canManageReviewerWrites === true"
        variant="primary"
        size="sm"
        :loading="generating === true"
        @click="handleGenerate"
      >
        生成分析
      </UiButton>
    </template>

    <UiFilterBar
      v-model="trendFilterModel"
      :fields="trendFilterFields"
      variant="plain"
      show-labels
      search-text="应用"
      reset-text="清空考试"
      @search="() => {}"
      @reset="handleTrendFilterReset"
    >
      <template #field-commonClassId>
        <UiSelect
          v-model="form.classId"
          :options="classOptions"
          :loading="classLoading"
          placeholder="请选择所选考试共有班级"
          allow-search
        />
      </template>
      <template #field-examIds>
        <AnalysisExamMultiSelect
          v-model="form.examIds"
          :disabled="examSelectReady !== true"
          disabled-title="请先在上方范围栏选择学年与学期"
          :scope-course-id="examSelectScopeCourseId"
          :scope-academic-year="form.academicYear"
          :scope-semester="form.semester"
          :scope-class-id="examSelectScopeClassId"
          :scope-reference-department-id="examSelectScopeReferenceDepartmentId"
          :auto-select-largest-course-cluster-in-scope="examSelectAutoSelectLargestCluster"
          :placeholder="examSelectPlaceholder"
          @selected-exams-change="selectedExams = $event"
        />
      </template>
    </UiFilterBar>

    <UiSkeletonState v-if="loading || generating" variant="card" compact />
    <div v-else class="ai-analysis-section__body ai-analysis-section__body--flush">
      <p v-if="record?.trendSummary" class="ai-analysis-summary">{{ record.trendSummary }}</p>

      <MarkTrendSection
        title="考试得分趋势"
        :hint="examTrendHint"
        :point-count="examStatTrendPoints.length"
        :option="examTrendChartOption"
        height="320px"
        :last-value="examTrendLastValue"
        value-unit="%"
      />

      <div v-if="trendItems.length > 0" class="ai-profile-block">
        <h5 class="ai-profile-block__title">结构化趋势条目</h5>
        <div class="ai-profile-diagnosis-list">
          <div v-for="(item, index) in trendItems" :key="index" class="ai-profile-diagnosis-item">
            <div class="diagnosis-header">
              <span class="diagnosis-type">{{ item.dimension || '趋势条目' }}</span>
              <UiTag v-if="item.direction" size="sm" tone="blue">{{ item.direction }}</UiTag>
              <span v-if="item.changeRate != null" class="diagnosis-rate">
                变化 {{ formatPercent(item.changeRate) }}
              </span>
            </div>
            <p v-if="item.turningPoint" class="diagnosis-text diagnosis-text--muted">
              转折点：{{ item.turningPoint }}
            </p>
            <p v-if="item.description" class="diagnosis-text">{{ item.description }}</p>
            <p v-if="item.possibleCause" class="diagnosis-text">{{ item.possibleCause }}</p>
            <p v-if="item.suggestion" class="diagnosis-text diagnosis-text--hint">
              {{ item.suggestion }}
            </p>
          </div>
        </div>
      </div>

      <AiAnalysisMetaCollapse
        v-if="record"
        :record="record"
        failure-fallback="AI 跨考试趋势分析未完成，请核对考试范围后重新生成"
        :extra-items="metaExtraItems"
      />
    </div>
  </AiAnalysisSection>
</template>

<script lang="ts" setup>
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type { CrossExamTrendAnalysisResponse } from '@/apis/mark/cross-exam-analysis'
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  AnalysisScopeTypeCode,
  AnalysisScopeTypeDescription,
} from '@/apis/mark/analysis-scope-type'
import {
  generateClassTrend,
  generateCourseTrend,
  listCommonClassScopes,
  listTrends,
} from '@/apis/mark/cross-exam-analysis'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import AiAnalysisHistorySelect from '@/components/mark/analysis/AiAnalysisHistorySelect.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import AnalysisExamMultiSelect from '@/components/mark/AnalysisExamMultiSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { useAiAnalysisHistoryPicker } from '@/composables/useAiAnalysisHistoryPicker'
import { useExamSummariesReviewerWriteCapability } from '@/composables/useExamIdsReviewerWriteCapability'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { ensureRequiredAcademicYearSemester } from '@/utils/academic-year-semester-query'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { buildTrendChartInsight, mergeChartHint } from '@/utils/mark-chart-insights'
import { buildTrendLineChartOption } from '@/utils/mark-echarts-options'
import { examStatSnapshotsToTrendPoints } from '@/utils/mark-statistics-chart'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'CrossExamTrendCard' })

const props = withDefaults(
  defineProps<{
    drillClassId?: string | null
    drillClassLabel?: string
    scopeReferenceDepartmentId?: string | null
    scopeOrgCourseId?: string | null
    scopeOrgClassId?: string | null
    scopeAcademicYear?: string
    scopeSemester?: SemesterCode
    examScopeLocked?: boolean
    scopeTermLabel?: string
  }>(),
  {
    drillClassId: null,
    drillClassLabel: '',
    scopeReferenceDepartmentId: null,
    scopeOrgCourseId: null,
    scopeOrgClassId: null,
    scopeAcademicYear: undefined,
    scopeSemester: undefined,
    examScopeLocked: false,
    scopeTermLabel: '',
  },
)

const scopeMode = ref<AnalysisScopeTypeCode>(AnalysisScopeTypeCode.COURSE)

interface CrossExamTrendForm {
  academicYear: string | undefined
  semester: SemesterCode | undefined
  classId: string
  examIds: string[]
}

const form = reactive<CrossExamTrendForm>({
  academicYear: undefined,
  semester: undefined,
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
} = useAiAnalysisHistoryPicker<CrossExamTrendAnalysisResponse>()

const historyRows = computed(() =>
  historyRecords.value.map((item) => ({
    id: item.id,
    createTime: item.createTime,
    analysisStatus: item.analysisStatus,
    examCount: item.examCount,
    extraHint: `${scopeTypeLabel(item.scopeType)} · ${item.courseName?.trim() || '—'}`,
  })),
)

const selectedExams = ref<ExamSummaryResponse[]>([])
const classOptions = ref<{ label: string, value: string }[]>([])
const classLoading = ref(false)
const loading = ref(false)
const generating = ref(false)

const trendItems = computed(() => record.value?.trendItems ?? [])
const examStatTrendPoints = computed(() =>
  examStatSnapshotsToTrendPoints(record.value?.examStatSnapshots ?? []),
)

const examTrendHint = computed(() =>
  mergeChartHint('多考试得分率走势', buildTrendChartInsight(examStatTrendPoints.value)),
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
  if (scopeMode.value === AnalysisScopeTypeCode.CLASS && form.classId.trim()) {
    return form.classId.trim()
  }
  return undefined
})

const examSelectScopeCourseId = computed(() => props.scopeOrgCourseId?.trim() || undefined)

const examSelectScopeReferenceDepartmentId = computed(
  () => props.scopeReferenceDepartmentId?.trim() || undefined,
)

const effectiveClassId = computed(() => examSelectScopeClassId.value?.trim() || '')

const examSelectAutoSelectLargestCluster = computed(
  () => scopeMode.value === AnalysisScopeTypeCode.COURSE || Boolean(examSelectScopeClassId.value),
)

const examSelectReady = computed(() => Boolean(form.academicYear?.trim() && form.semester))

const examSelectPlaceholder = computed(() => {
  if (scopeMode.value === AnalysisScopeTypeCode.CLASS && !examSelectScopeClassId.value) {
    return '请先手动选择考试，再选共有班级'
  }
  return '已自动纳入同学期同课程考试（≥2 场），可减选'
})

const showCommonClassField = computed(
  () =>
    scopeMode.value === AnalysisScopeTypeCode.CLASS
    && !props.scopeOrgClassId?.trim()
    && !props.drillClassId?.trim(),
)

const trendFilterFields = computed<FilterField[]>(() => {
  const fields: FilterField[] = []
  if (showCommonClassField.value) {
    fields.push({
      key: 'commonClassId',
      type: 'custom',
      label: '共有班级',
      width: 200,
      minWidth: 180,
      maxWidth: 240,
    })
  }
  fields.push({
    key: 'examIds',
    type: 'custom',
    label: '参与考试',
    flex: 1,
    minWidth: 360,
    maxWidth: 9999,
  })
  return fields
})

const trendFilterModel = computed<Record<string, unknown>>({
  get: () => ({
    commonClassId: form.classId,
    examIds: form.examIds,
  }),
  set: (value) => {
    if (value.commonClassId !== undefined) {
      form.classId = String(value.commonClassId ?? '')
    }
    if (Array.isArray(value.examIds)) {
      form.examIds = value.examIds.map((item) => String(item))
    }
  },
})

function handleTrendFilterReset(): void {
  form.examIds = []
  selectedExams.value = []
  if (!props.scopeOrgClassId?.trim() && !props.drillClassId?.trim()) {
    form.classId = ''
  }
  clearHistory()
}

const metaExtraItems = computed(() => {
  const value = record.value
  if (!value) {
    return []
  }
  return [
    { label: '分析维度', value: scopeTypeLabel(value.scopeType) },
    { label: '考试数', value: String(value.examCount ?? '—') },
    { label: '课程', value: value.courseName?.trim() || '—' },
    { label: '班级', value: classNameText(value) },
    { label: '考试范围', value: examScopeSummary(value) },
  ]
})

function examScopeSummary(value: CrossExamTrendAnalysisResponse): string {
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

/** 将父级班级钻取同步到班级维度筛选，并在选项未加载时注入班级标签。 */
function applyDrillClassSelection(): void {
  const classId = props.drillClassId?.trim()
  if (!classId) {
    return
  }
  scopeMode.value = AnalysisScopeTypeCode.CLASS
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

function mapClassRefsToOptions(classRefs: Array<{ classId: string, className: string }>) {
  return classRefs.map((classRef) => ({
    value: classRef.classId,
    label: classRef.className,
  }))
}

/** 班级维度下根据已选考试刷新共有班级选项；钻取班级时跳过详情 N+1。 */
async function refreshCommonClassOptions(): Promise<void> {
  const drillId = props.drillClassId?.trim()
  if (drillId) {
    applyDrillClassSelection()
    return
  }
  if (scopeMode.value === AnalysisScopeTypeCode.COURSE) {
    form.classId = ''
    classOptions.value = []
    return
  }
  const examIds = form.examIds
  form.classId = ''
  classOptions.value = []
  if (examIds.length === 0) {
    return
  }
  classLoading.value = true
  try {
    const classRefs = await listCommonClassScopes(examIds)
    classOptions.value = mapClassRefsToOptions(classRefs)
    if (classOptions.value.length === 0) {
      showFormValidationMessage('所选考试没有共同班级，请调整考试范围')
    }
    applyDrillClassSelection()
  } catch {
    classOptions.value = []
  } finally {
    classLoading.value = false
  }
}

watch(
  () => [props.scopeAcademicYear, props.scopeSemester] as const,
  ([year, semesterCode]) => {
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
  () => props.drillClassId,
  (classId) => {
    if (!classId && scopeMode.value === AnalysisScopeTypeCode.CLASS) {
      form.classId = ''
    }
  },
)

watch(
  () => [form.academicYear, form.semester],
  () => {
    form.examIds = []
    selectedExams.value = []
    clearHistory()
  },
)

watch(
  () => [scopeMode.value, [...form.examIds], props.drillClassId] as const,
  () => {
    clearHistory()
    void refreshCommonClassOptions()
  },
  { immediate: true },
)

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function scopeTypeLabel(scopeType: CrossExamTrendAnalysisResponse['scopeType']): string {
  return strictEnumLabel(AnalysisScopeTypeDescription, scopeType, '分析范围类型')
}

function classNameText(value: CrossExamTrendAnalysisResponse): string {
  if (value.scopeType === AnalysisScopeTypeCode.COURSE) return '不限定班级'
  return value.className?.trim() || '—'
}

async function reload(): Promise<void> {
  if (selectedCourseIds.value.length > 1) {
    showFormValidationMessage('请选择同一课程下的考试')
    return
  }
  const courseId = selectedCourseIds.value[0] ?? ''
  if (!courseId) {
    showFormValidationMessage('请选择考试')
    return
  }
  if (scopeMode.value === AnalysisScopeTypeCode.CLASS && !effectiveClassId.value) {
    void message.warning('班级维度需要选择班级')
    return
  }
  loading.value = true
  try {
    const list = await listTrends({
      scopeType: scopeMode.value,
      courseId,
      ...(scopeMode.value === AnalysisScopeTypeCode.CLASS
        ? { classId: effectiveClassId.value }
        : {}),
    })
    const count = applyLoadedList(list)
    if (count === 0) void message.info('暂无历史记录')
  } catch {
    /* 拦截器已统一 Message 提示 */
  } finally {
    loading.value = false
  }
}

/** MVR-286：默认拒绝假可写；所选考试均须 canManageReviewerWrites */
const { canManageReviewerWrites } = useExamSummariesReviewerWriteCapability(
  computed(() => form.examIds),
  computed(() => selectedExams.value),
)

async function handleGenerate(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    showUserError(null, '仅本场阅卷组织成员、主考或管理员可生成分析')
    return
  }
  if (generating.value === true) return
  if (!ensureRequiredAcademicYearSemester(form.academicYear, form.semester)) {
    return
  }
  if (selectedCourseIds.value.length > 1) {
    showFormValidationMessage('请选择同一课程下的考试')
    return
  }
  const courseId = selectedCourseIds.value[0] ?? ''
  const examIds = form.examIds
  if (!courseId) {
    showFormValidationMessage('请选择同一课程下的考试')
    return
  }
  if (examIds.length < 2) {
    void message.warning('至少需要选择 2 场考试')
    return
  }
  const academicYear = form.academicYear
  const semester = form.semester
  if (!academicYear || !semester) {
    showFormValidationMessage('请选择学年学期')
    return
  }
  const classId = effectiveClassId.value
  if (scopeMode.value === AnalysisScopeTypeCode.CLASS && !classId) {
    void message.warning('班级维度需要选择班级')
    return
  }
  generating.value = true
  try {
    const generated
      = scopeMode.value === AnalysisScopeTypeCode.COURSE
        ? await generateCourseTrend({
            courseId,
            academicYear,
            semester,
            examIds,
          })
        : await generateClassTrend({
            courseId,
            classId,
            academicYear,
            semester,
            examIds,
          })
    adoptGenerated(generated)
    void message.success('已生成趋势分析')
  } catch {
    /* 拦截器已统一 Message 提示 */
  } finally {
    generating.value = false
  }
}
</script>

<style lang="scss" scoped>
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
  color: var(--dp-text-primary);
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
.scope-hint {
  font-size: 12px;
  color: var(--dp-text-muted);
  line-height: 32px;
}
</style>
