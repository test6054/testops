<template>
  <UiCard title="AI 学期能力成长曲线" compact>
    <div class="ai-form">
      <a-form layout="inline" :model="form" size="small">
        <a-form-item label="学年学期">
          <AnalysisSemesterSelect
            v-model="form.semesterCode"
            placeholder="请选择学年学期"
            :allow-clear="false"
            :default-recent-semester-count="defaultRecentSemesterCount"
          />
        </a-form-item>
        <a-form-item label="班级">
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
              生成成长曲线
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <a-spin :spinning="loading || generating">
      <UiEmpty
        v-if="!loading && !generating && !record"
        description="暂无数据"
      />
      <div v-else-if="record" class="ai-record">
        <a-descriptions :column="3" compact bordered>
          <a-descriptions-item label="状态">
            <UiTag :tone="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="学年学期">
            {{ formatAcademicTermCode(record.semesterCode) }}
          </a-descriptions-item>
          <a-descriptions-item label="范围">
            {{ scopeTypeLabel(record.scopeType) }} ·
            {{ record.scopeName?.trim() || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="考试数">{{ record.examCount }}</a-descriptions-item>
          <a-descriptions-item label="趋势">
            <UiTag :tone="trendColor(record.growthTrend)">
              {{ trendLabel(record.growthTrend) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="生成耗时">{{ latencyText(record) }}</a-descriptions-item>
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

        <MarkTrendSection
          v-if="record"
          title="学期考试得分走势"
          hint="按考试时间序列展示得分率"
          :point-count="examStatTrendPoints.length"
          :option="examTrendChartOption"
          height="280px"
          :last-value="examTrendLastValue"
          value-unit="%"
        />

        <MarkBarSection
          v-if="record"
          title="能力点起止对比"
          hint="各能力维度结束值，悬停查看起止对照"
          :item-count="growthBarItems.length"
          :option="growthBarChartOption"
          height="280px"
        />

        <a-typography-paragraph v-if="record.growthSummary" class="ai-summary">
          <strong>成长摘要：</strong>{{ record.growthSummary }}
        </a-typography-paragraph>

        <div v-if="growthItems.length > 0" class="ai-items">
          <strong>各阶段能力点：</strong>
          <a-list compact :data-source="growthItems" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>
                <div class="analysis-item">
                  <div class="analysis-item__header">
                    <a-typography-text strong>第 {{ index + 1 }} 项</a-typography-text>
                    <span class="analysis-item__title">
                      {{ item.dimensionLabel || item.dimension || '能力点' }}
                    </span>
                    <span v-if="item.changeRate != null" class="analysis-item__metric">
                      变化 {{ formatRate(item.changeRate) }}
                    </span>
                  </div>
                  <a-typography-paragraph v-if="item.description" class="analysis-item__text">
                    {{ item.description }}
                  </a-typography-paragraph>
                  <a-typography-paragraph
                    v-if="item.startValue != null || item.endValue != null"
                    class="analysis-item__text"
                  >
                    <strong>起止值：</strong>{{ growthValueText(item.startValue) }} /
                    {{ growthValueText(item.endValue) }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.improvementNote" class="analysis-item__text">
                    <strong>提升说明：</strong>{{ item.improvementNote }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.riskNote" class="analysis-item__text">
                    <strong>风险提示：</strong>{{ item.riskNote }}
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
  SemesterAbilityGrowthVO,
  SemesterGrowthTrendCode,
} from '@/apis/mark/cross-exam-analysis'
import type { ExamSummaryVO } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { ANALYSIS_SCOPE_TYPE_LABEL } from '@/apis/mark/analysis-scope-type'
import {
  generateClassGrowth,
  listGrowth,
  SEMESTER_GROWTH_TREND_TONE,
  SEMESTER_GROWTH_TREND_LABEL,
} from '@/apis/mark/cross-exam-analysis'
import { getExamDetail } from '@/apis/mark/exam'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/ai-analysis-status'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import AnalysisExamMultiSelect from '@/components/mark/AnalysisExamMultiSelect.vue'
import AnalysisSemesterSelect from '@/components/mark/AnalysisSemesterSelect.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { formatAcademicTermCode } from '@/types/enums/semester-enum'
import { assertUserFacing } from '@/utils/contract-guard'
import { getUserProcessFailureMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { buildCategoryBarChartOption, buildTrendLineChartOption } from '@/utils/mark-echarts-options'
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
  }>(),
  {
    defaultRecentSemesterCount: 0,
    drillClassId: null,
    drillClassLabel: '',
  },
)

const form = reactive({
  semesterCode: '',
  classId: '',
  examIds: [] as string[],
})

const record = ref<SemesterAbilityGrowthVO | null>(null)
const selectedExams = ref<ExamSummaryVO[]>([])
const classOptions = ref<{ label: string, value: string }[]>([])
const classLoading = ref(false)
const loading = ref(false)
const generating = ref(false)

const growthItems = computed(() => record.value?.growthItems ?? [])
const examStatTrendPoints = computed(() =>
  examStatSnapshotsToTrendPoints(record.value?.examStatSnapshots ?? []),
)
const growthBarItems = computed(() =>
  growthItemsToBarItems(record.value?.growthItems ?? []),
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

const selectedCourseIds = computed(() =>
  Array.from(new Set(selectedExams.value.map((exam) => exam.courseId).filter(Boolean))),
)

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
  () => [...form.examIds],
  async (examIds) => {
    form.classId = ''
    classOptions.value = []
    if (examIds.length === 0) return
    classLoading.value = true
    try {
      const details = await Promise.all(examIds.map((examId) => getExamDetail(examId)))
      const classCount = new Map<string, { className: string, count: number }>()
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
      applyDrillClassSelection()
    } catch (e) {
      showUserError(e, '考试班级范围加载失败')
    } finally {
      classLoading.value = false
    }
  },
)

function analysisFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(errorMessage, 'AI 学期能力成长分析未完成，请稍后重新生成')
}

async function reload(): Promise<void> {
  if (!form.semesterCode) {
    message.warning('请选择学年学期')
    return
  }
  if (!form.classId) {
    message.warning('请选择班级')
    return
  }
  loading.value = true
  try {
    const list = await listGrowth({
      semesterCode: form.semesterCode,
      scopeType: 'CLASS',
      scopeId: form.classId,
    })
    acceptSemesterGrowthRecord(list[0] ?? null)
    if (list.length === 0) message.info('暂无历史记录')
  } catch (e) {
    showUserError(e, '学期成长曲线加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  const semesterCode = form.semesterCode
  if (selectedCourseIds.value.length > 1) {
    message.warning('请选择同一课程下的考试')
    return
  }
  const courseId = selectedCourseIds.value[0] ?? ''
  const classId = form.classId
  const examIds = form.examIds
  if (!semesterCode) {
    message.warning('请选择学年学期')
    return
  }
  if (!courseId) {
    message.warning('请选择同一课程下的考试')
    return
  }
  if (!classId) {
    message.warning('请选择班级')
    return
  }
  if (examIds.length < 2) {
    message.warning('至少需要选择 2 场考试')
    return
  }
  generating.value = true
  try {
    const generated = await generateClassGrowth({ semesterCode, courseId, classId, examIds })
    acceptSemesterGrowthRecord(generated)
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

function trendLabel(trend: SemesterGrowthTrendCode | undefined): string {
  return strictEnumLabel(SEMESTER_GROWTH_TREND_LABEL, trend, '学期能力成长趋势')
}

function trendColor(trend: SemesterGrowthTrendCode | undefined): BadgeTone {
  return strictEnumTone(SEMESTER_GROWTH_TREND_TONE, trend, '学期能力成长趋势')
}

function scopeTypeLabel(scopeType: SemesterAbilityGrowthVO['scopeType']): string {
  return strictEnumLabel(ANALYSIS_SCOPE_TYPE_LABEL, scopeType, '分析范围类型')
}

function latencyText(value: SemesterAbilityGrowthVO): string {
  if (value.latencyMs != null) return `${value.latencyMs} ms`
  if (value.analysisStatus === 'PENDING') return '待分析，尚未生成耗时'
  return '分析未完成，暂无耗时'
}

function assertSemesterGrowthContract(value: SemesterAbilityGrowthVO): void {
  const dataError = '学期能力成长分析数据异常，请刷新后重试'
  assertUserFacing(Boolean(value.scopeName?.trim()), dataError)
  assertUserFacing(Boolean(value.aiTraceId?.trim()), dataError)
  assertUserFacing(value.exams.length > 0, dataError)
  if (value.analysisStatus === 'SUCCESS') {
    assertUserFacing(value.latencyMs != null, dataError)
    for (const item of value.growthItems ?? []) {
      assertUserFacing(item.startValue != null && item.endValue != null, dataError)
    }
  }
}

function acceptSemesterGrowthRecord(value: SemesterAbilityGrowthVO | null): void {
  if (value) {
    assertSemesterGrowthContract(value)
  }
  record.value = value
}

function growthValueText(value: number | undefined): string {
  return String(value)
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
