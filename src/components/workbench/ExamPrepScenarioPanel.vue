<script lang="ts" setup>
import type { ExamPrepScenarioGuideResponse } from '@/apis/mark/exam'
import { computed, ref } from 'vue'
import UiCollapse from '@/components/ui-guide/ui/UiCollapse.vue'
import UiCollapsePanel from '@/components/ui-guide/ui/UiCollapsePanel.vue'

defineOptions({ name: 'ExamPrepScenarioPanel' })

const props = defineProps<{
  guide: ExamPrepScenarioGuideResponse
  /** 嵌在状态带内时压缩间距，去掉底部分割灰条 */
  compact?: boolean
}>()

const activeKeys = ref<string[]>([])

const expanded = computed(() => activeKeys.value.includes('guide'))

const tipLine = computed(() => {
  const parts: string[] = []
  if (props.guide.scanGuidance?.trim()) {
    parts.push(`扫描：${props.guide.scanGuidance.trim()}`)
  }
  if (props.guide.printGuidance?.trim()) {
    parts.push(`印刷：${props.guide.printGuidance.trim()}`)
  }
  return parts.join(' · ')
})
</script>

<template>
  <div class="exam-prep-scenario" :class="{ 'exam-prep-scenario--compact': compact }">
    <UiCollapse
      v-model:active-key="activeKeys"
      ghost
      :bordered="false"
      expand-icon-position="end"
      class="exam-prep-scenario__collapse"
    >
      <UiCollapsePanel key="guide">
        <template #header>
          <div class="exam-prep-scenario__header">
            <div class="exam-prep-scenario__title-row">
              <span class="exam-prep-scenario__title">{{ guide.scenarioTitle }}</span>
              <span class="exam-prep-scenario__expand-hint">
                {{ expanded ? '收起步骤' : '展开操作步骤' }}
              </span>
            </div>
            <span class="exam-prep-scenario__summary">{{ guide.scenarioSummary }}</span>
            <span v-if="tipLine && compact" class="exam-prep-scenario__tip-inline">{{
              tipLine
            }}</span>
          </div>
        </template>
        <ol class="exam-prep-scenario__steps">
          <li v-for="(step, index) in guide.operationalSteps" :key="index">
            <span class="exam-prep-scenario__step-index">{{ index + 1 }}</span>
            <span class="exam-prep-scenario__step-text">{{ step }}</span>
          </li>
        </ol>
      </UiCollapsePanel>
    </UiCollapse>
    <p v-if="tipLine && !compact" class="exam-prep-scenario__tip">{{ tipLine }}</p>
  </div>
</template>

<style scoped lang="scss">
.exam-prep-scenario {
  &--compact &__collapse :deep(.ant-collapse-header) {
    padding: 6px 12px 8px !important;
  }

  &--compact &__collapse :deep(.ant-collapse-content-box) {
    padding: 0 12px 8px !important;
  }

  &__collapse :deep(.ant-collapse-header) {
    align-items: flex-start !important;
    padding: 10px 12px 8px !important;
  }

  &__collapse :deep(.ant-collapse-content-box) {
    padding: 0 12px 8px !important;
  }

  &__header {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-right: 8px;
    min-width: 0;
  }

  &__title-row {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__title {
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    line-height: 1.35;
    color: var(--dp-text-primary);
  }

  &__expand-hint {
    font-size: var(--dp-font-size-xs);
    font-weight: 400;
    color: var(--dp-color-primary);
  }

  &__summary {
    font-size: var(--dp-font-size-xs);
    font-weight: 400;
    line-height: 1.45;
    color: var(--dp-text-secondary);
  }

  &__tip-inline {
    font-size: var(--dp-font-size-xs);
    line-height: 1.45;
    color: var(--dp-text-muted);
  }

  &__steps {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__steps li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: var(--dp-font-size-xs);
    line-height: 1.45;
    color: var(--dp-text-primary);
  }

  &__step-index {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: var(--dp-radius-xs);
    background: var(--dp-color-primary-bg);
    color: var(--dp-color-primary);
    font-size: var(--dp-font-size-xxs);
    font-weight: 600;
    line-height: 18px;
    text-align: center;
  }

  &__step-text {
    min-width: 0;
  }

  &__tip {
    margin: 0;
    padding: 8px 12px;
    border-top: 1px solid var(--dp-border);
    background: var(--dp-bg-layout);
    font-size: var(--dp-font-size-xs);
    line-height: 1.45;
    color: var(--dp-text-secondary);
  }
}
</style>
