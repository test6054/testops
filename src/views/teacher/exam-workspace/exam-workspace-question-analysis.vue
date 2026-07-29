<template>
  <StageWorkbenchShell class="exam-question-analysis">
    <template v-if="currentExamId" #context>
      <ContextBar layout="workbench" show-title title="题目分析" :subtitle="contextBarSubtitle">
        <template #actions>
          <UiButton variant="outline" size="sm" @click="goFullStatistics">
            完整成绩统计
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <template v-if="QuestionAnalysisSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="QuestionAnalysisSignalMetrics"
        @metric-click="onQuestionAnalysisSignalClick"
      />
    </template>

    <ExamSelectGateStrip v-if="!currentExamId" body="缺少考试上下文，请先进入考试工作台" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard class="exam-question-analysis__section" flush>
        <template #head>
          <UiSectionTabs
            :model-value="activeTab"
            :items="tabItems"
            compact
            @update:model-value="handleTabChange"
          />
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
import type { SignalMetric } from '@/types/workbench'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import ExamQuestionCourseGoalMappingCard from '@/views/teacher/ai-analysis/cards/ExamQuestionCourseGoalMappingCard.vue'
import PaperQualityCard from '@/views/teacher/ai-analysis/cards/PaperQualityCard.vue'
import QuestionAnalysisCard from '@/views/teacher/ai-analysis/cards/QuestionAnalysisCard.vue'

defineOptions({ name: 'TeacherExamWorkspaceQuestionAnalysis' })

type QuestionAnalysisTab = 'paper' | 'question' | 'goal'

const route = useRoute()
const router = useRouter()
const { examId } = useWorkspaceExamId()
const { contextBarSubtitle } = useExamJourneyContextBar('题目分析')

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

const QuestionAnalysisSignalMetrics = computed<SignalMetric[]>(() => {
  return applySpotlightEmphasis([
    {
      key: 'analysis',
      label: '题目分析',
      value: contextBarSubtitle.value || '当前考试',
      clickable: true,
    },
  ], { primaryKey: 'analysis', actionLabel: '查看' })
})

function onQuestionAnalysisSignalClick(_key: string) {
  // 分析页由 exam workspace 上下文驱动
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
    gap: var(--dp-space-block);
    width: 100%;
    flex-wrap: wrap;
  }

  &__header-copy {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-xs);
    min-width: 0;
    flex: 1 1 240px;
  }

  &__title {
    margin: 0;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }

  &__desc {
    margin: 0;
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
  }

  &__tab-panel {
    padding-top: var(--dp-space-component-tight);
  }
}
</style>
