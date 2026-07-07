<template>
  <div class="exam-sidebar-exam-switch">
    <div class="exam-sidebar-exam-switch__title-row">
      <h3 class="exam-sidebar-exam-switch__name">{{ displayName }}</h3>
      <span
        v-if="examStatusLabel"
        class="exam-sidebar-exam-switch__status-dot"
        :class="statusDotClass"
        :title="examStatusLabel"
      />
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
  if (tone === 'green') return 'exam-sidebar-exam-switch__status-dot--active'
  if (tone === 'gray') return 'exam-sidebar-exam-switch__status-dot--closed'
  return 'exam-sidebar-exam-switch__status-dot--default'
})
</script>

<style lang="scss" scoped>
.exam-sidebar-exam-switch {
  &__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  &__name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--ant-color-text);
    word-break: break-word;
  }

  &__status-dot {
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;

    &--active {
      background: var(--ant-color-success);
      box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.15);
    }

    &--closed {
      background: var(--ant-color-text-quaternary);
    }

    &--default {
      background: var(--ant-color-primary);
    }
  }

  &__no {
    margin: 0 0 4px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--ant-color-text-tertiary);
    word-break: break-all;
  }

  &__context {
    margin: 0 0 8px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--ant-color-text-secondary);
    word-break: break-word;
  }
}
</style>
