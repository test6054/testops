<template>
  <div v-if="loading && !snapshot" class="exam-workspace-chrome exam-workspace-chrome--loading">
    <UiSkeletonState :rows="2" compact />
    <UiSkeletonState
      :rows="1"
      compact
      class="exam-workspace-chrome__rail-skeleton"
    />
  </div>
  <div v-else-if="snapshot" class="exam-workspace-chrome">
    <ContextBar layout="workbench">
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
      variant="panel"
      class="exam-workspace-chrome__signal"
      @metric-click="navigateMetric"
    />
  </div>
</template>

<script lang="ts" setup>
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { storeToRefs } from 'pinia'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamJourneyRail from '@/components/workbench/ExamJourneyRail.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useExamJourneySteps } from '@/composables/useExamJourneySteps'
import {
  useExamWorkspaceChromeContext,
  useMarkWorkbenchContext,
} from '@/composables/useMarkWorkbenchContext'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { showUserError } from '@/utils/error-handler'

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
  primaryActionLabel,
  showPrimaryAction,
  examSignalMetrics,
  goSuggestedStage,
  onJourneySelect,
  navigateMetric,
  refreshChrome,
} = useExamWorkspaceChromeContext()

function handleRefresh(): void {
  void refreshChrome().catch((error) => {
    showUserError(error, '工作台刷新失败')
  })
}
</script>

<style lang="scss" scoped>
.exam-workspace-chrome {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: var(--dp-space-block);
  background: var(--dp-surface);
  border: none;
  border-bottom: 1px solid var(--dp-border);
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;

  :deep(.context-bar--workbench) {
    margin-bottom: 0;
    padding: var(--dp-space-block);
    border-bottom: 1px solid var(--dp-border);
  }

  :deep(.exam-journey-rail) {
    border-bottom: 1px solid var(--dp-border);
  }

  &__signal {
    padding: 0;
  }

  &--loading {
    padding: var(--dp-space-block);
    gap: var(--dp-space-component);
  }

  &__rail-skeleton {
    :deep(.ant-skeleton-paragraph) {
      margin-top: 0;
    }
  }
}
</style>
