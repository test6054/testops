<template>
  <div v-if="loading && !snapshot" class="exam-workspace-chrome exam-workspace-chrome--loading">
    <a-skeleton active :title="{ width: '40%' }" :paragraph="{ rows: 1, width: '60%' }" />
    <a-skeleton
      active
      :title="false"
      :paragraph="{ rows: 1 }"
      class="exam-workspace-chrome__rail-skeleton"
    />
  </div>
  <div v-else-if="snapshot" class="exam-workspace-chrome">
    <ContextBar layout="workbench" show-title :title="displayTitle" :subtitle="contextSubtitle">
      <template #status>
        <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
          {{ examStatusLabel }}
        </UiTag>
      </template>
      <template #actions>
        <UiButton v-if="showPrimaryAction" variant="primary" size="sm" @click="goSuggestedStage">
          {{ primaryActionLabel }}
        </UiButton>
        <UiButton variant="outline" size="sm" :loading="refreshing" @click="handleRefresh">
          <template #icon><ReloadOutlined /></template>
          刷新
        </UiButton>
      </template>
    </ContextBar>

    <ExamJourneyRail
      v-if="showJourneyRail"
      :stages="journeyStages"
      :active-key="activeJourneyKey === 'overview' ? '' : activeJourneyKey"
      @select="onJourneySelect"
    />

    <SignalBand
      v-if="showSignalBand && examSignalMetrics.length > 0"
      :metrics="examSignalMetrics"
      compact
      class="exam-workspace-chrome__signal"
      @metric-click="navigateMetric"
    />
  </div>
</template>

<script lang="ts" setup>
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamJourneyRail from '@/components/workbench/ExamJourneyRail.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useExamJourneySteps } from '@/composables/useExamJourneySteps'
import {
  useExamWorkspaceChromeContext,
  useMarkWorkbenchContext,
} from '@/composables/useMarkWorkbenchContext'
import { useMarkStageStore } from '@/stores/modules/markStage'

defineOptions({ name: 'ExamWorkspaceChrome' })

const props = withDefaults(
  defineProps<{
    /** 子页标题；未传时使用考试名称 */
    pageTitle?: string
    /** 侧栏已展示六段旅程时置 false，避免重复 JourneyRail */
    showJourneyRail?: boolean
    /** 子页自带 SignalBand 时置 false */
    showSignalBand?: boolean
  }>(),
  {
    pageTitle: '',
    showJourneyRail: false,
    showSignalBand: true,
  },
)

const { snapshot, loading, refreshing } = useMarkWorkbenchContext()
const markStageStore = useMarkStageStore()
const { orderedStages } = storeToRefs(markStageStore)
const { journeyStages, activeJourneyKey } = useExamJourneySteps(orderedStages)

const {
  contextTitle,
  contextSubtitle,
  examStatusLabel,
  examStatusTone,
  primaryActionLabel,
  showPrimaryAction,
  examSignalMetrics,
  goSuggestedStage,
  onJourneySelect,
  navigateMetric,
  refreshChrome,
} = useExamWorkspaceChromeContext()

const displayTitle = computed(() => props.pageTitle || contextTitle.value)

function handleRefresh(): void {
  void refreshChrome()
}
</script>

<style lang="scss" scoped>
.exam-workspace-chrome {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: var(--dp-space-4, 16px);
  background: var(--ant-color-bg-container);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-panel, 8px);
  overflow: hidden;

  :deep(.context-bar--workbench) {
    margin-bottom: 0;
    padding: var(--dp-space-4, 16px);
    border-bottom: 1px solid var(--ant-color-border-secondary);
  }

  :deep(.exam-journey-rail) {
    border-bottom: 1px solid var(--ant-color-border-secondary);
  }

  &__signal {
    padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
  }

  &--loading {
    padding: var(--dp-space-4, 16px);
    gap: var(--dp-space-3, 12px);
  }

  &__rail-skeleton {
    :deep(.ant-skeleton-paragraph) {
      margin-top: 0;
    }
  }
}
</style>
