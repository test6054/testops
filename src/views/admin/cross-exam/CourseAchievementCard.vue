<template>
  <a-card title="AI 课程目标达成度分析" :bordered="false" size="small">
    <div class="ai-form">
      <a-form layout="inline" :model="form" size="small">
        <a-form-item label="学年学期">
          <AnalysisSemesterSelect v-model="form.semesterCode" placeholder="请选择学年学期" />
        </a-form-item>
        <a-form-item label="参与考试列表" style="flex: 1; min-width: 320px">
          <AnalysisExamMultiSelect
            v-model="form.examIds"
            placeholder="请选择至少 1 场考试"
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
      <!-- D-9 错误态：AI 课程达成度加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 课程达成度加载失败"
        compact
        @retry="reload"
      />
      <a-empty v-else-if="!record" description="暂无达成度分析，请填写参数后生成。" />
      <div v-else class="ai-record">
        <a-row :gutter="12" class="metric-row">
          <a-col :span="8">
            <a-statistic
              v-if="record.overallAchievementRate != null"
              title="整体达成率"
              :value="record.overallAchievementRate * 100"
              :precision="1"
              suffix="%"
              :value-style="achievementStyle(record.overallAchievementRate)"
            />
            <div v-else class="metric-text">
              <span class="metric-title">整体达成率</span>
              <span class="metric-value">—</span>
            </div>
          </a-col>
          <a-col :span="8">
            <a-statistic title="考试数" :value="record.examCount ?? 0" />
          </a-col>
          <a-col :span="8">
            <div class="metric-text">
              <span class="metric-title">生成耗时</span>
              <span class="metric-value">{{ latencyText(record) }}</span>
            </div>
          </a-col>
        </a-row>

        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </a-tag>
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

        <a-typography-paragraph v-if="record.achievementSummary" class="ai-summary">
          <strong>达成度摘要：</strong>{{ record.achievementSummary }}
        </a-typography-paragraph>

        <div v-if="examStatChartOption" class="ai-chart">
          <div class="ai-chart__meta">
            <strong>参与考试得分走势</strong>
          </div>
          <VChart class="ai-chart__canvas" :option="examStatChartOption" autoresize />
        </div>

        <div v-if="achievementBarOption" class="ai-chart">
          <div class="ai-chart__meta">
            <strong>分目标达成率</strong>
          </div>
          <VChart class="ai-chart__canvas" :option="achievementBarOption" autoresize />
        </div>

        <div v-if="achievementItems.length > 0" class="ai-items">
          <strong>分目标达成情况：</strong>
          <a-list size="small" :data-source="achievementItems" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>
                <div class="analysis-item">
                  <div class="analysis-item__header">
                    <a-typography-text strong>第 {{ index + 1 }} 项</a-typography-text>
                    <span class="analysis-item__title">
                      {{ objectiveDimensionLabel(item) }}
                    </span>
                    <a-tag v-if="item.status" :color="achievementStatusColor(item.status)">
                      {{ achievementStatusLabel(item.status) }}
                    </a-tag>
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
  </a-card>
</template>

<script lang="ts" setup>
import type {
  CourseAchievementItemVO,
  CourseAchievementStatusCode,
  CourseObjectiveAchievementVO,
} from '@/apis/mark/cross-exam-analysis'
import type { ExamSummaryVO } from '@/apis/mark/exam'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import VChart from 'vue-echarts'
import {
  COURSE_ACHIEVEMENT_STATUS_COLOR,
  COURSE_ACHIEVEMENT_STATUS_LABEL,
  COURSE_OBJECTIVE_DIMENSION_LABEL,
  generateAchievement,
  listAchievements,
} from '@/apis/mark/cross-exam-analysis'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/teaching-analysis'
import AnalysisExamMultiSelect from '@/components/mark/AnalysisExamMultiSelect.vue'
import AnalysisSemesterSelect from '@/components/mark/AnalysisSemesterSelect.vue'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { formatAcademicTermCode } from '@/types/enums/semester-enum'
import { assertUserFacing } from '@/utils/contract-guard'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import {
  buildAchievementBarOption,
  buildExamStatTrendChartOption,
} from '@/utils/mark-statistics-chart'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'CourseAchievementCard' })

const form = reactive({
  semesterCode: '',
  examIds: [] as string[],
})

const record = ref<CourseObjectiveAchievementVO | null>(null)
const selectedExams = ref<ExamSummaryVO[]>([])
const loading = ref(false)
// D-9 错误态：AI 课程达成度加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<Error | null>(null)
const generating = ref(false)

const achievementItems = computed(() => record.value?.achievementItems ?? [])
const examStatChartOption = computed(() =>
  buildExamStatTrendChartOption(record.value?.examStatSnapshots ?? []),
)
const achievementBarOption = computed(() =>
  buildAchievementBarOption(record.value?.achievementItems ?? []),
)
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
  loadError.value = null
  loading.value = true
  try {
    const list = await listAchievements({ courseId })
    acceptCourseAchievementRecord(list[0] ?? null)
    if (list.length === 0) message.info('暂无历史记录')
  } catch (e) {
    loadError.value = toUserError(e, '课程达成度分析加载失败')
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
    const generated = await generateAchievement({
      courseId,
      semesterCode: form.semesterCode || undefined,
      examIds,
    })
    acceptCourseAchievementRecord(generated)
    message.success('已生成达成度分析')
  } catch (e) {
    showUserError(e, '课程达成度分析生成失败')
  } finally {
    generating.value = false
  }
}

function achievementStyle(rate?: number): Record<string, string> {
  if (rate == null) return { color: 'inherit' }
  if (rate >= 0.8) return { color: '#52c41a' }
  if (rate >= 0.6) return { color: '#1677ff' }
  if (rate >= 0.4) return { color: '#faad14' }
  return { color: '#f5222d' }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function latencyText(value: CourseObjectiveAchievementVO): string {
  if (value.latencyMs != null) return `${value.latencyMs} ms`
  if (value.analysisStatus === 'PENDING') return '处理中，尚未生成耗时'
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

function achievementStatusColor(status: CourseAchievementStatusCode): string {
  return strictEnumTone(COURSE_ACHIEVEMENT_STATUS_COLOR, status, '课程目标达成状态')
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
  border-radius: var(--dp-radius-md, 6px);
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
.metric-row {
  background: var(--gi-color-bg-2, #f5f5f5);
  padding: 12px 8px;
  border-radius: 4px;
}
.metric-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.metric-title {
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
  font-size: 14px;
}
.metric-value {
  color: var(--gi-color-text-1, rgba(0, 0, 0, 0.88));
  font-size: 24px;
  line-height: 1.2;
}
.text-muted {
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
}
</style>
