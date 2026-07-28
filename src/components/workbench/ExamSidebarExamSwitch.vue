<template>
  <div class="exam-sidebar-exam-switch">
    <div class="exam-sidebar-exam-switch__title-row">
      <h3 class="exam-sidebar-exam-switch__name">{{ displayName }}</h3>
      <span
        v-if="examStatusLabel"
        class="exam-sidebar-exam-switch__status"
        :class="statusDotClass"
      >
        <span class="exam-sidebar-exam-switch__status-dot" aria-hidden="true" />
        <span class="exam-sidebar-exam-switch__status-text">{{ examStatusLabel }}</span>
      </span>
    </div>
    <p v-if="displayNo" class="exam-sidebar-exam-switch__no">编号 {{ displayNo }}</p>
    <p v-if="examContextLine" class="exam-sidebar-exam-switch__context">{{ examContextLine }}</p>
  </div>
</template>

<script lang="ts" setup>
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'

defineOptions({
  name: 'ExamSidebarExamSwitch',
})

const props = defineProps<{
  examDisplayName?: string
  examDisplayNo?: string
  examContextLine?: string
  examStatusLabel: string
  examStatusTone: BadgeTone | undefined
}>()

const displayName = computed(() => {
  if (props.examDisplayName?.trim()) {
    return props.examDisplayName.trim()
  }
  return '未选择考试'
})

const displayNo = computed(() => props.examDisplayNo?.trim() ?? '')

const statusDotClass = computed(() => {
  const tone = props.examStatusTone
  if (tone === 'green') return 'exam-sidebar-exam-switch__status--active'
  if (tone === 'gray') return 'exam-sidebar-exam-switch__status--closed'
  return 'exam-sidebar-exam-switch__status--default'
})
</script>

<style lang="scss" scoped>
.exam-sidebar-exam-switch {
  &__title-row {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component-xs);
  }

  &__name {
    margin: 0;
    font-size: var(--dp-font-size-lg);
    font-weight: 600;
    line-height: 1.5;
    color: var(--dp-text-primary);
    word-break: break-word;
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-component-xs);
    flex-shrink: 0;
  }

  &__status-dot {
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--dp-color-primary);
  }

  &__status--active &__status-dot {
    background: var(--dp-success);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--dp-success) 18%, transparent);
  }

  &__status--closed &__status-dot {
    background: var(--dp-text-quaternary);
  }

  &__status-text {
    font-size: var(--dp-font-size-xs);
    line-height: 1.4;
    color: var(--dp-text-secondary);
    white-space: nowrap;
  }

  &__status--active &__status-text {
    color: var(--dp-success);
  }

  &__status--closed &__status-text {
    color: var(--dp-text-muted);
  }

  &__no {
    margin: 0 0 var(--dp-space-component-xs);
    font-size: var(--dp-font-size-xs);
    line-height: 1.4;
    color: var(--dp-text-muted);
    word-break: break-all;
  }

  &__context {
    margin: 0 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    line-height: 1.4;
    color: var(--dp-text-secondary);
    word-break: break-word;
  }
}
</style>
