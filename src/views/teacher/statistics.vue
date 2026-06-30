<template>
  <div class="stats-page">
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
        <UiTag v-if="activeStudentText" tone="purple" size="sm">{{ activeStudentText }}</UiTag>
      </div>
      <UiButton
        variant="ghost"
        size="sm"
        :disabled="!hasLinkageContext"
        @click="clearLinkage"
      >
        清空联动
      </UiButton>
    </div>



    <div v-if="currentExamId" class="stats-page__export-bar">
      <span class="stats-page__export-label">考后讲评</span>
      <MarkQualitySyncChip :exam="selectedExam" />
      <UiButton variant="primary" size="sm" @click="exportTeachingLecture">
        导出讲评讲义
      </UiButton>
      <UiButton variant="ghost" size="sm" @click="scrollToTeachingImprovement">
        定位到教学改进方案
      </UiButton>
    </div>

    <div class="stats-page__sections">
      <section class="stats-page__section">
        <header class="stats-page__section-header">
          <div class="stats-page__section-copy">
            <h3 class="stats-page__section-title">考试统计与质量治理</h3>
            <p class="stats-page__section-desc">
              围绕本场考试的成绩分布、题目质量、重判计划与错因结构，支撑考后质量校准。
            </p>
          </div>
          <UiTag tone="blue" size="sm">考试后治理</UiTag>
        </header>
        <div class="stats-page__cards">
          <ScoreDistributionCard
            :exam-id="currentExamId"
            :reload-token="scoreDistToken"
            :class-id="activeClassId"
            :class-options="classOptions"
            :roster-loading="rosterLoading"
            @class-change="handleClassChange"
          />
          <PaperQualityCard
            :exam-id="currentExamId"
            :reload-token="paperQualityToken"
            :class-id="activeClassId"
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
          <RejudgePlanCard
            :exam-id="currentExamId"
            :reload-token="rejudgeToken"
            @changed="onRejudgePlanChanged"
          />
          <ErrorCauseClusterCard
            :exam-id="currentExamId"
            :reload-token="errorCauseToken"
            :class-id="activeClassId"
          />
        </div>
      </section>

      <section class="stats-page__section">
        <header class="stats-page__section-header">
          <div class="stats-page__section-copy">
            <h3 class="stats-page__section-title">教学改进与学情洞察</h3>
            <p class="stats-page__section-desc">
              围绕班级薄弱点、学生个体画像与教学建议，支持教师把考试结果转化为后续教学动作。
            </p>
          </div>
          <UiTag tone="purple" size="sm">教学支持</UiTag>
        </header>
        <div class="stats-page__cards">
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
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MarkQualitySyncChip from '@/components/quality/MarkQualitySyncChip.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkExamRoster } from '@/composables/useMarkExamRoster'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useWorkspaceConfidentialContext } from '@/composables/useWorkspaceConfidentialContext'
import mittBus from '@/utils/mitt'
import ClassWeaknessCard from './statistics/ClassWeaknessCard.vue'
import ExamQuestionCourseGoalMappingCard from './statistics/ExamQuestionCourseGoalMappingCard.vue'
import ErrorCauseClusterCard from './statistics/ErrorCauseClusterCard.vue'
import PaperQualityCard from './statistics/PaperQualityCard.vue'
import QuestionAnalysisCard from './statistics/QuestionAnalysisCard.vue'
import RejudgePlanCard from './statistics/RejudgePlanCard.vue'
import ScoreDistributionCard from './statistics/ScoreDistributionCard.vue'
import StudentLearningProfileCard from './statistics/StudentLearningProfileCard.vue'
import TeachingImprovementCard from './statistics/TeachingImprovementCard.vue'

defineOptions({ name: 'TeacherStatistics' })

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

function reloadAll(): void {
  if (currentExamId.value) {
    void loadRoster(currentExamId.value)
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
  teachingImprovementRef.value?.exportRecordText()
}

function scrollToTeachingImprovement(): void {
  teachingImprovementRef.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  &__linkage {
    position: sticky;
    top: var(--dp-space-3, 12px);
    z-index: var(--dp-z-sticky, 1020);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
    padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
    border: 1px solid var(--dp-border, #e5e7eb);
    border-radius: var(--dp-radius-panel, 8px);
    background: var(--dp-surface, #fff);
  }

  &__linkage-main {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-2, 8px);
    min-width: 0;
  }

  &__linkage-label {
    color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
    font-size: var(--dp-font-size-sm, 13px);
    font-weight: var(--dp-font-weight-title, 600);
  }

  &__class-select {
    width: 240px;
  }

  &__export-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
    padding: 10px 12px;
    border: 1px solid var(--ant-color-primary-border);
    border-radius: var(--dp-radius-panel, 8px);
    background: var(--ant-color-primary-bg);
  }

  &__export-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--ant-color-primary);
    margin-right: 4px;
  }

  &__sections {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  &__section {
    padding-top: 4px;
  }

  &__section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--dp-border, #e5e7eb);
  }

  &__section-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
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

    :deep(.stats-card.dp-card--compact .dp-card__header) {
      padding: var(--dp-space-4, 16px) var(--dp-space-5, 20px);
    }

    :deep(.stats-card.dp-card--compact .dp-card__body) {
      padding: var(--dp-space-4, 16px) var(--dp-space-5, 20px);
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
