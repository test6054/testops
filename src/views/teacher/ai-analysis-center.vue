<script setup lang="ts">
import type { Key } from 'ant-design-vue/es/_util/type'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import type { SignalMetric } from '@/types/workbench'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
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
  academicYear,
  semester,
  examFilterCourseId,
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
      value: examId.value ? '已选定' : '未选',
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

const showTeachingScopeFilters = computed(() =>
  activeTab.value === 'teaching' || activeTab.value === 'cluster',
)

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
    <template v-if="!examLocked" #context>
      <ContextBar layout="workbench">
        <template #toolbar>
          <div class="ai-analysis-center__toolbar">
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
            <template v-if="showTeachingScopeFilters">
              <UiSelect
                v-model="examFilterCourseId"
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
          </div>
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

        <AiAnalysisTeachingTab
          v-if="activeTab === 'teaching'"
          :exam-id="examId"
          :reload-token="reloadToken"
          :class-id="classId"
          @class-change="handleClassSelectChange"
        />
        <AiAnalysisTrendTab v-else-if="activeTab === 'trend'" />
        <AiAnalysisClusterTab
          v-else-if="activeTab === 'cluster'"
          :exam-id="examId"
          :reload-token="reloadToken"
          :class-id="classId"
        />
        <AiAnalysisSchoolTab v-else-if="activeTab === 'school'" />
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>

<style lang="scss" scoped>
.ai-analysis-center__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

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
