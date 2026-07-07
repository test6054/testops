<template>
  <StageWorkbenchShell class="stats-page">
    <template v-if="currentExamId" #signal>
      <UiSkeletonState
        v-if="paperAnalysisLoading"
        variant="card"
        :card-count="3"
        compact
      />
      <SignalBand v-else variant="tiles" compact :metrics="statsSignalMetrics" />
    </template>

    <UiEmpty v-if="!currentExamId" description="请选择考试" class="stats-page__empty" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiAlertStrip
        v-if="rosterLoadNotice"
        tone="warning"
        title="考生名册暂不可用"
        :description="rosterLoadNotice"
        dense
        class="stats-page__notice"
      />
      <UiAlertStrip
        v-if="paperAnalysisNotice"
        tone="info"
        title="整卷质量指标暂不可用"
        :description="paperAnalysisNotice"
        dense
        class="stats-page__notice"
      />

      <WorkbenchSurfaceCard class="stats-page__linkage-card">
        <template #toolbar>
          <div class="stats-page__linkage">
            <div class="stats-page__linkage-main">
              <span class="stats-page__linkage-label">联动范围</span>
              <a-select
                :value="activeClassId"
                class="stats-page__class-select"
                placeholder="全部班级"
                allow-clear
                show-search
                option-filter-prop="label"
                :options="classOptions"
                :loading="rosterLoading"
                @change="handleClassChange"
              />
              <UiTag v-if="activeClassName" tone="blue" size="sm">{{ activeClassName }}</UiTag>
              <UiTag v-if="activeStudentText" tone="blue" size="sm">{{ activeStudentText }}</UiTag>
              <MarkQualitySyncChip :exam="selectedExam" />
            </div>
            <div class="stats-page__linkage-actions">
              <UiButton
                variant="primary"
                size="sm"
                :disabled="!currentExamId"
                @click="exportTeachingLecture"
              >
                导出讲评讲义
              </UiButton>
              <UiButton
                variant="ghost"
                size="sm"
                :disabled="!hasLinkageContext"
                @click="clearLinkage"
              >
                清空联动
              </UiButton>
            </div>
          </div>
        </template>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard class="stats-page__section" flush>
        <template #head>
          <header class="stats-page__section-header">
            <div class="stats-page__section-copy">
              <h3 class="stats-page__section-title">考试统计与质量治理</h3>
              <p class="stats-page__section-desc">
                围绕本场考试的成绩分布、题目质量、重判计划与错因结构，支撑考后质量校准。
              </p>
            </div>
            <UiSectionTabs
              :model-value="activeTab"
              :items="tabItems"
              compact
              @update:model-value="handleTabChange"
            />
          </header>
        </template>
        <div class="stats-page__cards">
          <ScoreDistributionCard
            v-if="activeTab === 'score'"
            :exam-id="currentExamId"
            :reload-token="scoreDistToken"
            :class-id="activeClassId"
            :class-options="classOptions"
            :roster-loading="rosterLoading"
            @class-change="handleClassChange"
          />
          <template v-else-if="activeTab === 'question'">
            <PaperQualityCard
              :exam-id="currentExamId"
              :reload-token="paperQualityToken"
              :class-id="activeClassId"
              :show-signal-band="false"
            />
            <QuestionAnalysisCard
              :exam-id="currentExamId"
              :reload-token="qaToken"
              :class-id="activeClassId"
              @generated="onQuestionAnalysisGenerated"
            />
            <ExamQuestionCourseGoalMappingCard
              :exam-id="currentExamId"
              :reload-token="goalMappingToken"
            />
          </template>
          <RejudgePlanCard
            v-else-if="activeTab === 'rejudge'"
            :exam-id="currentExamId"
            :reload-token="rejudgeToken"
            @changed="onRejudgePlanChanged"
          />
          <ErrorCauseClusterCard
            v-else-if="activeTab === 'cluster'"
            :exam-id="currentExamId"
            :reload-token="errorCauseToken"
            :class-id="activeClassId"
          />
          <template v-else-if="activeTab === 'teaching'">
            <TeachingImprovementCard
              ref="teachingImprovementRef"
              :exam-id="currentExamId"
              :reload-token="improvementToken"
              :class-id="activeClassId"
            />
            <ClassWeaknessCard
              :exam-id="currentExamId"
              :reload-token="weaknessToken"
              :class-id="activeClassId"
              :class-options="classOptions"
              :roster-loading="rosterLoading"
              @class-change="handleClassChange"
            />
            <StudentLearningProfileCard
              :exam-id="currentExamId"
              :reload-token="profileToken"
              :class-id-hint="activeClassId"
              :student-options="studentOptions"
              :roster-loading="rosterLoading"
              @student-change="handleStudentChange"
            />
          </template>
        </div>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ExamPaperAnalysisResponse } from '@/apis/mark/question-analysis'
import type { SignalMetric } from '@/types/workbench'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExamPaperAnalysis } from '@/apis/mark/question-analysis'
import MarkQualitySyncChip from '@/components/quality/MarkQualitySyncChip.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkExamRoster } from '@/composables/useMarkExamRoster'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useWorkspaceConfidentialContext } from '@/composables/useWorkspaceConfidentialContext'
import { getUserErrorMessage } from '@/utils/error-handler'
import mittBus from '@/utils/mitt'
import { buildPaperQualitySignalMetrics } from '@/utils/paper-quality-signals'
import ClassWeaknessCard from '@/views/teacher/ai-analysis/cards/ClassWeaknessCard.vue'
import ErrorCauseClusterCard from '@/views/teacher/ai-analysis/cards/ErrorCauseClusterCard.vue'
import ExamQuestionCourseGoalMappingCard from '@/views/teacher/ai-analysis/cards/ExamQuestionCourseGoalMappingCard.vue'
import PaperQualityCard from '@/views/teacher/ai-analysis/cards/PaperQualityCard.vue'
import QuestionAnalysisCard from '@/views/teacher/ai-analysis/cards/QuestionAnalysisCard.vue'
import RejudgePlanCard from '@/views/teacher/ai-analysis/cards/RejudgePlanCard.vue'
import ScoreDistributionCard from '@/views/teacher/ai-analysis/cards/ScoreDistributionCard.vue'
import StudentLearningProfileCard from '@/views/teacher/ai-analysis/cards/StudentLearningProfileCard.vue'
import TeachingImprovementCard from '@/views/teacher/ai-analysis/cards/TeachingImprovementCard.vue'

defineOptions({ name: 'TeacherStatistics' })

type StatsTab = 'score' | 'question' | 'rejudge' | 'cluster' | 'teaching'

const route = useRoute()
const router = useRouter()

const tabItems = [
  { key: 'score', label: '成绩分布' },
  { key: 'question', label: '题目质量' },
  { key: 'rejudge', label: '重判计划' },
  { key: 'cluster', label: '错因聚类' },
  { key: 'teaching', label: '教学改进' },
]

function parseTab(value: unknown): StatsTab {
  if (value === 'question' || value === 'rejudge' || value === 'cluster' || value === 'teaching') {
    return value
  }
  return 'score'
}

const activeTab = computed<StatsTab>({
  get: () => parseTab(route.query.tab),
  set: (tab) => {
    void router.replace({
      query: {
        ...route.query,
        tab,
      },
    })
  },
})

function handleTabChange(key: Key): void {
  activeTab.value = parseTab(key)
}

const { selectedExamId, selectedExam } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()
const { isExamConfidential } = useWorkspaceConfidentialContext()
const currentExamId = computed(() => selectedExamId.value || '')

// B-12 联动：考试切换后统一加载考生名册，派生班级 / 学生选项交给子卡片，避免教师手输 ID
const {
  classOptions,
  studentOptions,
  loading: rosterLoading, load: loadRoster,
  reset: resetRoster,
} = useMarkExamRoster()

const qaToken = ref(0)
const goalMappingToken = ref(0)
const scoreDistToken = ref(0)
const paperQualityToken = ref(0)
const rejudgeToken = ref(0)
const improvementToken = ref(0)
const weaknessToken = ref(0)
const errorCauseToken = ref(0)
const profileToken = ref(0)

const paperAnalysis = ref<ExamPaperAnalysisResponse | null>(null)
const paperAnalysisLoading = ref(false)
const rosterLoadNotice = ref('')
const paperAnalysisNotice = ref('')

const PAPER_QUALITY_SIGNAL_PLACEHOLDERS: SignalMetric[] = [
  { key: 'cronbachAlpha', label: 'Cronbach α', value: '—', tone: 'gray' },
  { key: 'paperDiscriminationIndex', label: '平均区分度', value: '—', tone: 'gray' },
  { key: 'paperDifficultyIndex', label: '平均难度', value: '—', tone: 'gray' },
]

const teachingImprovementRef = ref<InstanceType<typeof TeachingImprovementCard> | null>(null)

// B-12 子卡片联动：跨卡片记录活跃的班级 / 学生上下文
const activeClassId = ref<string>('')
const activeStudentUserId = ref<string>('')

const hasLinkageContext = computed(() => !!activeClassId.value || !!activeStudentUserId.value)

const activeClassName = computed(() => {
  if (activeClassId.value) {
    const selectedClass = classOptions.value.find((opt) => opt.value === activeClassId.value)
    return selectedClass?.className ?? activeClassId.value
  }
  return ''
})

const activeStudentText = computed(() => {
  if (activeStudentUserId.value) {
    const selectedStudent = studentOptions.value.find(
      (opt) => opt.value === activeStudentUserId.value,
    )
    if (selectedStudent) {
      const studentText = `${selectedStudent.studentName} (${selectedStudent.studentNo})`
      return selectedStudent.className ? `${studentText} · ${selectedStudent.className}` : studentText
    } else {
      return activeStudentUserId.value
    }
  }
  return ''
})

const statsSignalMetrics = computed((): SignalMetric[] => {
  const metrics = buildPaperQualitySignalMetrics(paperAnalysis.value)
  return metrics.length > 0 ? metrics : PAPER_QUALITY_SIGNAL_PLACEHOLDERS
})

async function loadPaperAnalysis(): Promise<void> {
  if (!currentExamId.value) {
    paperAnalysis.value = null
    paperAnalysisLoading.value = false
    return
  }
  paperAnalysisLoading.value = true
  try {
    paperAnalysis.value = await getExamPaperAnalysis({
      examId: currentExamId.value,
    })
    paperAnalysisNotice.value = ''
  } catch (error) {
    paperAnalysis.value = null
    paperAnalysisNotice.value = getUserErrorMessage(error, '整卷质量指标暂不可用')
  } finally {
    paperAnalysisLoading.value = false
  }
}

function handleClassChange(value?: SelectValue): void {
  activeClassId.value = typeof value === 'string' ? value : ''
  if (
  activeStudentUserId.value
  && activeClassId.value
  && !studentOptions.value.some(
      (opt) => opt.value === activeStudentUserId.value && opt.classId === activeClassId.value,
    )
  ) {
    activeStudentUserId.value = ''
  }
}

function handleStudentChange(studentUserId: string): void {
  activeStudentUserId.value = studentUserId
}

function clearLinkage(): void {
  activeClassId.value = ''
  activeStudentUserId.value = ''
}

async function reloadAll(): Promise<void> {
  rosterLoadNotice.value = ''
  if (currentExamId.value) {
    try {
      await loadRoster(currentExamId.value)
    } catch (error) {
      rosterLoadNotice.value = getUserErrorMessage(error, '考生名册加载失败')
    }
    await loadPaperAnalysis()
  }
  scoreDistToken.value += 1
  paperQualityToken.value += 1
  qaToken.value += 1
  goalMappingToken.value += 1
  rejudgeToken.value += 1
  improvementToken.value += 1
  weaknessToken.value += 1
  errorCauseToken.value += 1
  profileToken.value += 1
}

function reloadRejudge(): void {
  rejudgeToken.value += 1
}

function onQuestionAnalysisGenerated(): void {
  reloadRejudge()
  goalMappingToken.value += 1
}

async function onRejudgePlanChanged(): Promise<void> {
  reloadAll()
  await refreshSnapshot()
}

async function exportTeachingLecture(): Promise<void> {
  if (isExamConfidential.value) {
    const confirmed = await confirmAsync({
      title: '导出涉密考试讲评材料',
      content: '该考试为涉密场次，导出讲评讲义可能包含成绩与作答分析。确认继续导出？',
      type: 'error',
      okText: '确认导出',
      cancelText: '取消',
    })
    if (!confirmed) {
      return
    }
  }
  if (activeTab.value !== 'teaching') {
    activeTab.value = 'teaching'
    await nextTick()
  }
  teachingImprovementRef.value?.exportRecordText()
}

watch(selectedExamId, (v) => {
  // 切换考试时清空联动上下文，避免跨考试串号
  clearLinkage()
  if (v) {
    void loadRoster(v)
    reloadAll()
  } else {
    resetRoster()
  }
}, { immediate: true })

onMounted(() => {
  mittBus.on('exam-workbench:refresh', reloadAll)
})

onBeforeUnmount(() => {
  mittBus.off('exam-workbench:refresh', reloadAll)
})
</script>

<style lang="scss" scoped>
.stats-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  &__empty {
    padding: 60px 0;
  }

  &__notice {
    margin-bottom: 0;
  }

  &__linkage {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  &__linkage-main {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-2, 8px);
    min-width: 0;
    flex: 1 1 auto;
  }

  &__linkage-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: var(--dp-space-2, 8px);
    flex-shrink: 0;
  }

  &__linkage-label {
    color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
    font-size: var(--dp-font-size-sm, 13px);
    font-weight: var(--dp-font-weight-title, 600);
  }

  &__class-select {
    width: 240px;
  }

  &__section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    flex-wrap: wrap;
  }

  &__section-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1 1 240px;
  }

  &__section-title {
    margin: 0;
    color: var(--dp-text-primary, rgba(0, 0, 0, 0.88));
    font-size: 18px;
    font-weight: var(--dp-font-weight-title, 600);
    line-height: 1.5;
  }

  &__section-desc {
    margin: 0;
    color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
    font-size: 14px;
    line-height: 1.6;
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-4, 16px);

    :deep(.stats-card) {
      box-shadow: var(--dp-shadow-sm);
    }

    :deep(.stats-card__title) {
      margin: 0;
      font-size: 16px;
      font-weight: var(--dp-font-weight-title, 600);
      line-height: 1.5;
    }

    :deep(.stats-card .stats-card__select--class) {
      width: 200px;
    }

    :deep(.stats-card .stats-card__select--class-wide) {
      width: 240px;
    }

    :deep(.stats-card .stats-card__select--question),
    :deep(.stats-card .stats-card__select--student) {
      width: 280px;
    }

    :deep(.stats-card .stats-card__select--status) {
      width: 160px;
    }

    :deep(.stats-card .question-analysis-card) {
      display: flex;
      flex-direction: column;
      gap: var(--dp-space-3, 12px);
    }

    :deep(.stats-card .score-dist),
    :deep(.stats-card .ai-record) {
      display: flex;
      flex-direction: column;
      gap: var(--dp-space-3, 12px);
    }

    :deep(.stats-card .score-dist__chart),
    :deep(.stats-card .question-analysis-card__chart),
    :deep(.stats-card .ai-chart__canvas) {
      width: 100%;
      height: 300px;
    }

    :deep(.stats-card .score-dist__metrics) {
      padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
      background: var(--dp-surface-subtle);
      border-radius: var(--dp-radius-control-inner, 4px);
    }

    :deep(.stats-card .score-dist__chart-wrap),
    :deep(.stats-card .question-analysis-card__chart-wrap),
    :deep(.stats-card .ai-chart) {
      padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
      border: 1px solid var(--dp-border, #e2e8f0);
      border-radius: var(--dp-radius-panel, 6px);
      background: var(--dp-surface, #fff);
    }

    :deep(.stats-card .score-dist__chart-meta),
    :deep(.stats-card .question-analysis-card__chart-meta),
    :deep(.stats-card .ai-chart__meta) {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--dp-space-3, 12px);
      margin-bottom: var(--dp-space-2, 8px);

      strong {
        font-size: var(--dp-font-size-md, 14px);
        font-weight: var(--dp-font-weight-title, 600);
      }
    }

    :deep(.stats-card .score-dist__chart-hint),
    :deep(.stats-card .question-analysis-card__chart-hint) {
      font-size: var(--dp-font-size-xs, 12px);
      color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
    }

    :deep(.stats-card .analysis-item__title),
    :deep(.stats-card .diagnosis-type) {
      font-weight: var(--dp-font-weight-emphasis, 500);
    }

    :deep(.stats-card .ai-items > strong),
    :deep(.stats-card .ai-summary strong) {
      font-weight: var(--dp-font-weight-title, 600);
    }

    :deep(.stats-card .analysis-item__metric),
    :deep(.stats-card .analysis-item__text),
    :deep(.stats-card .diagnosis-rate),
    :deep(.stats-card .diagnosis-text),
    :deep(.stats-card .text-muted) {
      color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
    }

    :deep(.stats-card .text-muted),
    :deep(.stats-card .diagnosis-rate) {
      color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
    }
  }
}
</style>
