<script setup lang="ts">
import type { Key } from 'ant-design-vue/es/_util/type'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import type { SignalMetric } from '@/types/workbench'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useAiAnalysisScope } from '@/composables/useAiAnalysisScope'
import AiAnalysisClusterTab from './ai-analysis/AiAnalysisClusterTab.vue'
import AiAnalysisSchoolTab from './ai-analysis/AiAnalysisSchoolTab.vue'
import AiAnalysisTeachingTab from './ai-analysis/AiAnalysisTeachingTab.vue'
import AiAnalysisTrendTab from './ai-analysis/AiAnalysisTrendTab.vue'

defineOptions({ name: 'TeacherAiAnalysisCenter' })

type AiAnalysisTab = 'teaching' | 'trend' | 'cluster' | 'school'

const route = useRoute()
const router = useRouter()

const {
  examId,
  overview,
  overviewLoadFailed,
  teachingReloadToken,
  clusterReloadToken,
  selectedExamLabel,
  setClassScope,
  refreshClusterAnalysis,
  examLocked,
} = useAiAnalysisScope()

const tabItems = [
  { key: 'teaching', label: '教学分析' },
  { key: 'trend', label: '趋势分析' },
  { key: 'cluster', label: '错因聚类' },
  { key: 'school', label: '考试质量' },
]

function parseTab(value: unknown): AiAnalysisTab {
  if (value === 'trend' || value === 'cluster' || value === 'school') {
    return value
  }
  return 'teaching'
}

const activeTab = computed<AiAnalysisTab>({
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

const headerSignalMetrics = computed<SignalMetric[]>(() => {
  const metrics: SignalMetric[] = []

  if (overview.value?.scopedExamCount != null) {
    metrics.push({
      key: 'scoped-exams',
      label: '范围内考试',
      value: overview.value.scopedExamCount,
      unit: '场',
      tone: 'green',
      iconTone: 'green',
      helper: examId.value
        ? `已选定：${selectedExamLabel.value ?? '单场分析'}`
        : '当前筛选范围合计',
    })
  }

  if (overview.value?.scopedCourseCount != null) {
    metrics.push({
      key: 'scoped-courses',
      label: '涉及课程',
      value: overview.value.scopedCourseCount,
      unit: '门',
      tone: 'blue',
      iconTone: 'blue',
      helper: (overview.value.scopedCourseCount ?? 0) > 1
        ? '跨课程汇总分析'
        : '单课程深度分析',
    })
  }

  const signal = overview.value?.clusterSignal
  const analyzed = signal?.questionQualityAnalyzedCount
  const total = signal?.totalLayoutQuestionCount
  if (analyzed != null && total != null && total > 0) {
    const rate = Math.round((analyzed / total) * 100)
    metrics.push({
      key: 'quality-coverage',
      label: '题目分析覆盖',
      value: rate,
      unit: '%',
      // 覆盖率仅作参考进度，禁止用红/绿暗示正式质量结论（非正式 OBE）
      tone: 'blue',
      iconTone: 'blue',
      helper: `参考覆盖 ${analyzed}/${total} 题（非正式质量结论）`,
    })
  }

  return metrics
})

function handleTabChange(key: Key) {
  activeTab.value = parseTab(key)
}

function handleClassSelectChange(classIdValue?: string, option?: MarkClassOption) {
  setClassScope(classIdValue, option)
}

function handleClusterDataChanged(): void {
  refreshClusterAnalysis()
}
</script>

<template>
  <StageWorkbenchShell>
    <template v-if="!examLocked" #context>
      <ContextBar layout="workbench" show-title title="AI 分析中心" />
    </template>

    <template #signal>
      <SignalBand compact variant="panel" :metrics="headerSignalMetrics" />
    </template>

    <UiAlertStrip
      v-if="overviewLoadFailed"
      tone="warning"
      title="分析概览加载失败"
      class="ai-analysis-center__overview-alert"
    />

    <ExamWorkspaceJourneySubNav v-if="examLocked" />

    <WorkbenchSurfaceCard flush>
      <template #head>
        <UiSectionTabs
          :model-value="activeTab"
          :items="tabItems"
          compact
          divided
          @update:model-value="handleTabChange"
        />
      </template>

      <AiAnalysisTeachingTab
        v-if="activeTab === 'teaching'"
        :reload-token="teachingReloadToken"
        @class-change="handleClassSelectChange"
      />
      <AiAnalysisTrendTab v-else-if="activeTab === 'trend'" />
      <AiAnalysisClusterTab
        v-else-if="activeTab === 'cluster'"
        :reload-token="clusterReloadToken"
        :cluster-signal="overview?.clusterSignal"
        @changed="handleClusterDataChanged"
      />
      <AiAnalysisSchoolTab v-else-if="activeTab === 'school'" />
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ai-analysis-center__overview-alert {
  margin-bottom: var(--dp-space-component);
}
</style>
