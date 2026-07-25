<template>
  <UiCard title="评审流程（路径 / 岗位）">
    <div v-if="loading" class="title-promotion-flow-panel__loading">
      流程加载中…
    </div>
    <template v-else-if="flow">
      <div class="title-promotion-flow-panel__path-fork" role="group" aria-label="申报路径分叉">
        <div
          class="title-promotion-flow-panel__path-lane"
          :class="{ 'title-promotion-flow-panel__path-lane--active': !flow.exceptionPath }"
        >
          <strong>{{ strictEnumLabel(PortfolioTitleCriteriaPathDescription, PortfolioTitleCriteriaPathCode.NORMAL, '路径') }}</strong>
          <span>共用条件 + 正常路径条件</span>
        </div>
        <div class="title-promotion-flow-panel__path-merge" aria-hidden="true">→</div>
        <div
          class="title-promotion-flow-panel__path-lane"
          :class="{
            'title-promotion-flow-panel__path-lane--active': flow.exceptionPath,
            'title-promotion-flow-panel__path-lane--exception': flow.exceptionPath,
          }"
        >
          <strong>{{ strictEnumLabel(PortfolioTitleCriteriaPathDescription, PortfolioTitleCriteriaPathCode.EXCEPTION, '路径') }}</strong>
          <span>共用条件 + 破格专属条件</span>
        </div>
      </div>
      <p class="title-promotion-flow-panel__guidance">{{ flow.pathGuidance }}</p>
      <p class="title-promotion-flow-panel__guidance">{{ flow.jobGuidance }}</p>
      <div class="title-promotion-flow-panel__metrics">
        <UiTag>硬门槛 {{ flow.hardCriteriaCount }}</UiTag>
        <UiTag>业绩 {{ flow.performanceCriteriaCount }}</UiTag>
        <UiTag>共用 {{ flow.commonCriteriaCount }}</UiTag>
        <UiTag>路径专属 {{ flow.pathSpecificCriteriaCount }}</UiTag>
        <UiTag v-if="flow.jobCategoryRequired">岗位专属 {{ flow.jobSpecificCriteriaCount }}</UiTag>
        <UiTag v-if="flow.jobCategory">
          岗位 {{ strictEnumLabel(PortfolioTitleJobCategoryDescription, flow.jobCategory, '岗位类型') }}
        </UiTag>
      </div>
      <StageRail
        :stages="stageRailItems"
        :active-key="flow.activeStageKey"
        variant="arrow"
        compact
      />
      <div class="title-promotion-flow-panel__stage-notes">
        <div
          v-for="stage in flow.stages"
          :key="stage.stageKey"
          class="title-promotion-flow-panel__stage-note"
          :class="{ 'title-promotion-flow-panel__stage-note--emphasis': stage.exceptionEmphasis }"
        >
          <strong>{{ stage.title }}</strong>
          <UiTag v-if="stage.exceptionEmphasis" tone="orange">破格重点</UiTag>
          <span>{{ stage.description }}</span>
        </div>
      </div>
      <div v-if="flow.applicableCriteria.length" class="title-promotion-flow-panel__criteria">
        <div class="title-promotion-flow-panel__criteria-title">当前路径 / 岗位适用条件</div>
        <ul>
          <li v-for="item in flow.applicableCriteria" :key="item.taskCriteriaId">
            <span>{{ item.criteriaTitle }}</span>
            <UiTag>
              {{ strictEnumLabel(PortfolioTitleCriteriaGateKindDescription, item.gateKind, '门槛类型') }}
            </UiTag>
            <UiTag>
              {{ strictEnumLabel(PortfolioTitleCriteriaPathDescription, item.pathCode, '路径') }}
            </UiTag>
            <UiTag v-if="item.jobCategory">
              {{ strictEnumLabel(PortfolioTitleJobCategoryDescription, item.jobCategory, '岗位类型') }}
            </UiTag>
          </li>
        </ul>
      </div>
    </template>
    <UiEmpty size="sm" v-else description="选择任务与路径后可预览评审流程" />
  </UiCard>
</template>

<script setup lang="ts">
import type { PortfolioTitlePromotionFlowViewVO } from '@/apis/portfolio/title-promotion'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import { computed } from 'vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import StageRail from '@/components/workbench/StageRail.vue'
import { PortfolioTitleCriteriaGateKindDescription } from '@/types/enums/portfolio-title-criteria-gate-kind-enum'
import {
  PortfolioTitleCriteriaPathCode,
  PortfolioTitleCriteriaPathDescription,
} from '@/types/enums/portfolio-title-criteria-path-code-enum'
import { PortfolioTitleJobCategoryDescription } from '@/types/enums/portfolio-title-job-category-enum'
import { PortfolioTitlePromotionFlowStageStatusCode } from '@/types/enums/portfolio-title-promotion-flow-stage-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({
  name: 'TitlePromotionFlowPanel',
})

const props = defineProps<{
  flow: PortfolioTitlePromotionFlowViewVO | null
  loading?: boolean
}>()

const STAGE_STATUS_MAP: Record<PortfolioTitlePromotionFlowStageStatusCode, WorkbenchStageStatus> = {
  [PortfolioTitlePromotionFlowStageStatusCode.PENDING]: 'pending',
  [PortfolioTitlePromotionFlowStageStatusCode.ACTIVE]: 'active',
  [PortfolioTitlePromotionFlowStageStatusCode.COMPLETED]: 'completed',
  [PortfolioTitlePromotionFlowStageStatusCode.WARNING]: 'warning',
  [PortfolioTitlePromotionFlowStageStatusCode.ERROR]: 'error',
}

const stageRailItems = computed<WorkbenchStage[]>(() => {
  if (!props.flow) {
    return []
  }
  return props.flow.stages.map(stage => ({
    key: stage.stageKey,
    title: stage.title,
    status: STAGE_STATUS_MAP[stage.stageStatus],
    statusText: stage.description,
  }))
})
</script>

<style lang="scss" scoped>
.title-promotion-flow-panel__loading {
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-md);
}
.title-promotion-flow-panel__path-fork {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: stretch;
  margin-bottom: var(--dp-space-component);
}
.title-promotion-flow-panel__path-lane {
  flex: 1 1 180px;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control);
  background: var(--dp-surface);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}
.title-promotion-flow-panel__path-lane--active {
  border-color: var(--dp-color-primary);
  color: var(--dp-text-primary);
  box-shadow: inset 0 0 0 1px var(--dp-color-primary);
}
.title-promotion-flow-panel__path-lane--exception.title-promotion-flow-panel__path-lane--active {
  border-color: var(--dp-warning);
  box-shadow: inset 0 0 0 1px var(--dp-warning);
}
.title-promotion-flow-panel__path-merge {
  display: flex;
  align-items: center;
  color: var(--dp-text-secondary);
  font-weight: 600;
}
.title-promotion-flow-panel__guidance {
  margin: 0 0 var(--dp-space-component-tight);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
}
.title-promotion-flow-panel__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component);
}
.title-promotion-flow-panel__stage-notes {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component);
}
.title-promotion-flow-panel__stage-note {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: baseline;
  padding: var(--dp-space-component-tight);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control);
  font-size: var(--dp-font-size-sm);
}
.title-promotion-flow-panel__stage-note--emphasis {
  border-color: var(--dp-warning);
  background: var(--dp-warning-bg);
}
.title-promotion-flow-panel__criteria {
  margin-top: var(--dp-space-component);
}
.title-promotion-flow-panel__criteria-title {
  margin-bottom: var(--dp-space-component-tight);
  font-weight: 600;
  font-size: var(--dp-font-size-sm);
}
.title-promotion-flow-panel__criteria ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.title-promotion-flow-panel__criteria li {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
  padding: var(--dp-space-component-tight) 0;
  border-bottom: 1px solid var(--dp-border);
  font-size: var(--dp-font-size-sm);
}
</style>
