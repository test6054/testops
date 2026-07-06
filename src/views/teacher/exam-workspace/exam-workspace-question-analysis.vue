<template>
  <StageWorkbenchShell class="exam-question-analysis">
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="contextBarTitle"
        :subtitle="contextBarSubtitle"
      />
    </template>

    <template v-if="currentExamId && paperSignalMetrics.length > 0" #signal>
      <SignalBand variant="tiles" compact :metrics="paperSignalMetrics" />
    </template>

    <UiEmpty v-if="!currentExamId" description="缺少考试上下文" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard class="exam-question-analysis__section">
        <template #head>
          <header class="exam-question-analysis__header">
            <div>
              <h3 class="exam-question-analysis__title">题目分析</h3>
              <p class="exam-question-analysis__desc">
                聚焦本场考试题目得分率、区分度与命题质量，支撑考后命题校准。
              </p>
            </div>
            <UiButton variant="ghost" size="sm" @click="goFullStatistics">
              查看完整成绩统计
            </UiButton>
          </header>
        </template>
        <div class="exam-question-analysis__cards">
          <PaperQualityCard
            :exam-id="currentExamId"
            :reload-token="reloadToken"
            :show-signal-band="false"
          />
          <QuestionAnalysisCard
            :exam-id="currentExamId"
            :reload-token="reloadToken"
            @generated="reloadToken += 1"
          />
          <ExamQuestionCourseGoalMappingCard
            :exam-id="currentExamId"
            :reload-token="reloadToken"
          />
        </div>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ExamPaperAnalysisResponse } from '@/apis/mark/question-analysis'
import type { SignalMetric } from '@/types/workbench'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getExamPaperAnalysis } from '@/apis/mark/question-analysis'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import { buildPaperQualitySignalMetrics } from '@/utils/paper-quality-signals'
import ExamQuestionCourseGoalMappingCard from '@/views/teacher/ai-analysis/cards/ExamQuestionCourseGoalMappingCard.vue'
import PaperQualityCard from '@/views/teacher/ai-analysis/cards/PaperQualityCard.vue'
import QuestionAnalysisCard from '@/views/teacher/ai-analysis/cards/QuestionAnalysisCard.vue'

defineOptions({ name: 'TeacherExamWorkspaceQuestionAnalysis' })

const router = useRouter()
const { examId } = useWorkspaceExamId()
const { contextBarTitle, contextBarSubtitle } = useExamJourneyContextBar('题目分析')
const reloadToken = ref(0)
const paperAnalysis = ref<ExamPaperAnalysisResponse | null>(null)

const currentExamId = computed(() => examId.value || '')

const paperSignalMetrics = computed((): SignalMetric[] =>
  buildPaperQualitySignalMetrics(paperAnalysis.value),
)

async function loadPaperAnalysis(): Promise<void> {
  if (!currentExamId.value) {
    paperAnalysis.value = null
    return
  }
  try {
    paperAnalysis.value = await getExamPaperAnalysis({ examId: currentExamId.value })
  } catch (error) {
    paperAnalysis.value = null
    showUserError(error, '整卷质量指标加载失败')
  }
}

watch(
  () => [currentExamId.value, reloadToken.value],
  () => {
    void loadPaperAnalysis()
  },
  { immediate: true },
)

function goFullStatistics() {
  void router.push({
    name: 'TeacherExamWorkspaceArchiveStatistics',
    params: { examId: examId.value },
  })
}
</script>

<style lang="scss" scoped>
.exam-question-analysis {
  &__section { margin-top: 0; }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--dp-space-3);
    width: 100%;
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  &__desc {
    margin: 4px 0 0;
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-4);
  }
}
</style>
