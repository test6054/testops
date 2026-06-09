<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <a-select
            :value="selectedExamId"
            class="stats-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiTag v-if="selectedExamId" tone="blue" size="sm">已选考试</UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :disabled="!selectedExamId" @click="reloadAll">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择一场考试以查看考试统计与教学改进"
      class="stats-page__empty"
    />

    <template v-else>
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
              :exam-id="selectedExamId"
              :reload-token="scoreDistToken"
              :class-id="activeClassId"
              :class-options="classOptions"
              :roster-loading="rosterLoading"
              @class-change="handleClassChange"
            />
            <QuestionAnalysisCard
              :exam-id="selectedExamId"
              :reload-token="qaToken"
              :class-id="activeClassId"
              @generated="reloadRejudge"
            />
            <RejudgePlanCard :exam-id="selectedExamId" :reload-token="rejudgeToken" />
            <ErrorCauseClusterCard
              :exam-id="selectedExamId"
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
              :exam-id="selectedExamId"
              :reload-token="improvementToken"
              :class-id="activeClassId"
            />
            <ClassWeaknessCard
              :exam-id="selectedExamId"
              :reload-token="weaknessToken"
              :class-id="activeClassId"
              :class-options="classOptions"
              :roster-loading="rosterLoading"
              @class-change="handleClassChange"
            />
            <StudentLearningProfileCard
              :exam-id="selectedExamId"
              :reload-token="profileToken"
              :class-id-hint="activeClassId"
              :student-options="studentOptions"
              :roster-loading="rosterLoading"
              @student-change="handleStudentChange"
            />
          </div>
        </section>
      </div>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, onMounted, ref, watch } from 'vue'
import { UiButton, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamRoster } from '@/composables/useMarkExamRoster'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import ClassWeaknessCard from './statistics/ClassWeaknessCard.vue'
import ErrorCauseClusterCard from './statistics/ErrorCauseClusterCard.vue'
import QuestionAnalysisCard from './statistics/QuestionAnalysisCard.vue'
import RejudgePlanCard from './statistics/RejudgePlanCard.vue'
import ScoreDistributionCard from './statistics/ScoreDistributionCard.vue'
import StudentLearningProfileCard from './statistics/StudentLearningProfileCard.vue'
import TeachingImprovementCard from './statistics/TeachingImprovementCard.vue'

defineOptions({ name: 'TeacherStatistics' })

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

// B-12 联动：考试切换后统一加载考生名册，派生班级 / 学生选项交给子卡片，避免教师手输 ID
const {
  classOptions,
  studentOptions,
  loading: rosterLoading,
  load: loadRoster,
  reset: resetRoster,
} = useMarkExamRoster()

const qaToken = ref(0)
const scoreDistToken = ref(0)
const rejudgeToken = ref(0)
const improvementToken = ref(0)
const weaknessToken = ref(0)
const errorCauseToken = ref(0)
const profileToken = ref(0)

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
    activeStudentUserId.value &&
    activeClassId.value &&
    !studentOptions.value.some(
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
  scoreDistToken.value += 1
  qaToken.value += 1
  rejudgeToken.value += 1
  improvementToken.value += 1
  weaknessToken.value += 1
  errorCauseToken.value += 1
  profileToken.value += 1
}

function reloadRejudge(): void {
  rejudgeToken.value += 1
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
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    void loadRoster(selectedExamId.value)
    reloadAll()
  }
})
</script>

<style lang="scss" scoped>
.stats-page {
  &__exam-select {
    width: 280px;
  }

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
    font-weight: 600;
  }

  &__class-select {
    width: 240px;
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
    font-weight: 600;
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
    gap: 16px;
  }
}
</style>
