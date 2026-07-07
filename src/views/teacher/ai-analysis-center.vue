<script setup lang="ts">
import type { Key } from 'ant-design-vue/es/_util/type'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import type { SignalMetric } from '@/types/workbench'
import { computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AnalysisNextSteps from '@/components/mark/analysis/AnalysisNextSteps.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { AI_ANALYSIS_WORKSPACE_CHROME_KEY, useAiAnalysisScope } from '@/composables/useAiAnalysisScope'
import AiAnalysisClusterTab from './ai-analysis/AiAnalysisClusterTab.vue'
import AiAnalysisSchoolTab from './ai-analysis/AiAnalysisSchoolTab.vue'
import AiAnalysisTeachingTab from './ai-analysis/AiAnalysisTeachingTab.vue'
import AiAnalysisTrendTab from './ai-analysis/AiAnalysisTrendTab.vue'

defineOptions({ name: 'TeacherAiAnalysisCenter' })

type AiAnalysisTab = 'teaching' | 'trend' | 'cluster' | 'school'

const route = useRoute()
const router = useRouter()
const workspaceChrome = inject(AI_ANALYSIS_WORKSPACE_CHROME_KEY, null)
const contextTitle = computed(() => workspaceChrome?.value?.title ?? '教学质量智能分析')
const contextSubtitle = computed(() => workspaceChrome?.value?.subtitle ?? '质量监控 · 教学改进与趋势洞察')

const {
  academicYear,
  semester,
  courseId,
  examId,
  classId,
  examsLoading,
  overview,
  overviewLoadFailed,
  reloadToken,
  academicYearOptions,
  semesterOptions,
  courseOptions,
  examOptions,
  selectedExamLabel,
  scopeSummary,
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
  const metrics: SignalMetric[] = [
    {
      key: 'scope-year',
      label: '学年',
      value: academicYear.value,
      tone: 'blue',
    },
    {
      key: 'scope-semester',
      label: '学期',
      value: semesterOptions.value.find(item => item.value === semester.value)?.label ?? semester.value,
      tone: 'gray',
    },
  ]
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
  metrics.push(
    {
      key: 'scope-exam',
      label: '选定考试',
      value: examId.value
        ? (selectedExamLabel.value ?? '已选')
        : '未选',
      tone: examId.value ? 'green' : 'orange',
    },
    {
      key: 'active-tab',
      label: '当前视图',
      value: tabItems.find(item => item.key === activeTab.value)?.label ?? '—',
      tone: 'blue',
    },
  )
  return metrics
})

function handleTabChange(key: Key) {
  activeTab.value = parseTab(key)
}

function handleClassSelectChange(classIdValue?: string, option?: MarkClassOption) {
  setClassScope(classIdValue, option)
}

const scopeSelectClass = 'ai-analysis-center__scope-select'
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="contextTitle"
        :subtitle="contextSubtitle"
      >
        <template #status>
          <template v-if="examLocked">
            <UiTag tone="blue" size="sm">{{ selectedExamLabel ?? '当前考试' }}</UiTag>
          </template>
          <template v-else>
            <UiSelect
              v-model="academicYear"
              :class="[scopeSelectClass, `${scopeSelectClass}--year`]"
              :options="academicYearOptions"
              placeholder="学年"
              :allow-clear="false"
            />
            <UiSelect
              v-model="semester"
              :class="[scopeSelectClass, `${scopeSelectClass}--semester`]"
              :options="semesterOptions"
              placeholder="学期"
              :allow-clear="false"
            />
            <UiSelect
              v-model="courseId"
              :class="[scopeSelectClass, `${scopeSelectClass}--course`]"
              :options="courseOptions"
              placeholder="课程（可选）"
              allow-search
            />
            <UiSelect
              v-model="examId"
              :class="[scopeSelectClass, `${scopeSelectClass}--exam`]"
              :options="examOptions"
              :loading="examsLoading"
              placeholder="考试（教学/聚类必填）"
              allow-search
            />
          </template>
        </template>
        <template #actions>
          <UiButton size="sm" variant="outline" @click="refreshAnalysis">
            刷新分析
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand variant="tiles" compact :metrics="headerSignalMetrics" />
    </template>

    <UiEmpty
      v-if="overviewLoadFailed"
      description="AI 分析中心概览加载失败"
      action-label="重试"
      @action="refreshAnalysis"
    />

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

        <div
          v-if="activeTab === 'teaching' || activeTab === 'cluster'"
          class="ai-analysis-tab__scope-bar"
        >
          <p class="ai-analysis-tab__scope-summary">
            当前范围：{{ scopeSummary }}
          </p>
        </div>
        <div v-else-if="activeTab === 'trend'" class="ai-analysis-tab__scope-bar">
          <p class="ai-analysis-tab__scope-summary">
            趋势分析按卡片内考试范围独立配置；顶栏学年学期仅作租户可见域参考。
          </p>
        </div>

        <AiAnalysisTeachingTab
          v-if="activeTab === 'teaching'"
          :exam-id="examId"
          :exam-label="selectedExamLabel"
          :reload-token="reloadToken"
          :class-id="classId"
          @class-change="handleClassSelectChange"
        />
        <AiAnalysisTrendTab v-else-if="activeTab === 'trend'" />
        <AiAnalysisClusterTab
          v-else-if="activeTab === 'cluster'"
          :exam-id="examId"
          :exam-label="selectedExamLabel"
          :reload-token="reloadToken"
          :class-id="classId"
        />
        <AiAnalysisSchoolTab v-else-if="activeTab === 'school'" />

        <AnalysisNextSteps />
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>

<style lang="scss" scoped>
.ai-analysis-center__scope-select {
  &--year,
  &--semester {
    width: 120px;
  }

  &--course {
    width: 200px;
  }

  &--exam {
    width: 240px;
  }
}
</style>
