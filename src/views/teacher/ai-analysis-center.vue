<script setup lang="ts">
import type { Key } from 'ant-design-vue/es/_util/type'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import type { SignalMetric } from '@/types/workbench'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
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
  reloadToken,
  selectedExamLabel,
  setClassScope,
  refreshAnalysis,
  examLocked,
} = useAiAnalysisScope()

const tabItems = [
  { key: 'teaching', label: '教学分析' },
  { key: 'trend', label: '趋势分析' },
  { key: 'cluster', label: '错因聚类' },
  { key: 'school', label: '校级质量' },
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
      tone: 'green',
    })
  }
  if (overview.value?.scopedCourseCount != null) {
    metrics.push({
      key: 'scoped-courses',
      label: '涉及课程',
      value: overview.value.scopedCourseCount,
      tone: 'blue',
    })
  }
  if (examId.value) {
    metrics.push({
      key: 'scope-exam',
      label: '选定考试',
      value: selectedExamLabel.value ?? '已选定',
      tone: 'green',
    })
  }
  metrics.push({
    key: 'active-tab',
    label: '当前视图',
    value: tabItems.find((item) => item.key === activeTab.value)?.label ?? '—',
    tone: 'blue',
  })
  return metrics
})

function handleTabChange(key: Key) {
  activeTab.value = parseTab(key)
}

function handleClassSelectChange(classIdValue?: string, option?: MarkClassOption) {
  setClassScope(classIdValue, option)
}

function handleClusterDataChanged(): void {
  refreshAnalysis()
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

    <UiEmpty size="sm" v-if="overviewLoadFailed" title="加载失败" />

    <template v-else>
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
          :reload-token="reloadToken"
          @class-change="handleClassSelectChange"
        />
        <AiAnalysisTrendTab v-else-if="activeTab === 'trend'" />
        <AiAnalysisClusterTab
          v-else-if="activeTab === 'cluster'"
          :reload-token="reloadToken"
          :cluster-signal="overview?.clusterSignal"
          @changed="handleClusterDataChanged"
        />
        <AiAnalysisSchoolTab v-else-if="activeTab === 'school'" />
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>
