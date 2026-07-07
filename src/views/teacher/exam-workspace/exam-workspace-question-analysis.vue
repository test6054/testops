<template>
  <StageWorkbenchShell class="exam-question-analysis">
    <UiEmpty v-if="!currentExamId" description="缺少考试上下文" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard class="exam-question-analysis__section" flush>
        <template #head>
          <header class="exam-question-analysis__header">
            <div class="exam-question-analysis__header-copy">
              <h3 class="exam-question-analysis__title">题目分析</h3>
              <p class="exam-question-analysis__desc">
                聚焦本场考试题目得分率、区分度与命题质量，支撑考后命题校准。
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
        <template #toolbar>
          <UiButton variant="ghost" size="sm" @click="goFullStatistics">
            查看完整成绩统计
          </UiButton>
        </template>

        <div class="exam-question-analysis__tab-panel">
          <PaperQualityCard
            v-if="activeTab === 'paper'"
            :exam-id="currentExamId"
            :reload-token="reloadToken"
          />
          <QuestionAnalysisCard
            v-else-if="activeTab === 'question'"
            :exam-id="currentExamId"
            :reload-token="reloadToken"
            @generated="onQuestionAnalysisGenerated"
          />
          <ExamQuestionCourseGoalMappingCard
            v-else-if="activeTab === 'goal'"
            :exam-id="currentExamId"
            :reload-token="goalMappingReloadToken"
          />
        </div>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import ExamQuestionCourseGoalMappingCard from '@/views/teacher/ai-analysis/cards/ExamQuestionCourseGoalMappingCard.vue'
import PaperQualityCard from '@/views/teacher/ai-analysis/cards/PaperQualityCard.vue'
import QuestionAnalysisCard from '@/views/teacher/ai-analysis/cards/QuestionAnalysisCard.vue'

defineOptions({ name: 'TeacherExamWorkspaceQuestionAnalysis' })

type QuestionAnalysisTab = 'paper' | 'question' | 'goal'

const route = useRoute()
const router = useRouter()
const { examId } = useWorkspaceExamId()
useExamJourneyContextBar('题目分析')

const reloadToken = ref(0)
const goalMappingReloadToken = ref(0)

const currentExamId = computed(() => examId.value || '')

const tabItems = [
  { key: 'paper', label: '整卷测量学质量' },
  { key: 'question', label: '题目质量分析' },
  { key: 'goal', label: '试题-课程目标映射' },
]

function parseTab(value: unknown): QuestionAnalysisTab {
  if (value === 'question' || value === 'goal') {
    return value
  }
  return 'paper'
}

const activeTab = computed<QuestionAnalysisTab>({
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

function handleTabChange(tab: Key): void {
  activeTab.value = parseTab(tab)
}

function onQuestionAnalysisGenerated(): void {
  reloadToken.value += 1
  goalMappingReloadToken.value += 1
}

function goFullStatistics(): void {
  void router.push({
    name: 'TeacherExamWorkspaceArchiveStatistics',
    params: { examId: examId.value },
  })
}
</script>

<style lang="scss" scoped>
.exam-question-analysis {
  &__section {
    margin-top: 0;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--dp-space-4);
    width: 100%;
    flex-wrap: wrap;
  }

  &__header-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1 1 240px;
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  &__desc {
    margin: 0;
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
  }

  &__tab-panel {
    padding-top: var(--dp-space-2);
  }
}
</style>
