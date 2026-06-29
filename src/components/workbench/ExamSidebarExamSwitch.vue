<template>
  <div class="exam-sidebar-exam-switch">
    <h3 class="exam-sidebar-exam-switch__name">{{ displayName }}</h3>
    <p v-if="displayNo" class="exam-sidebar-exam-switch__no">编号 {{ displayNo }}</p>
    <div v-if="examStatusLabel" class="exam-sidebar-exam-switch__meta">
      <UiTag :tone="examStatusTone" size="sm">{{ examStatusLabel }}</UiTag>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'

defineOptions({
  name: 'ExamSidebarExamSwitch',
})

const props = defineProps<{
  examDisplayName?: string
  examDisplayNo?: string
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
</script>

<style lang="scss" scoped>
.exam-sidebar-exam-switch {
  &__name {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--ant-color-text);
    word-break: break-word;
  }

  &__no {
    margin: 0 0 8px;
    font-size: 13px;
    line-height: 1.4;
    color: var(--ant-color-text-secondary);
    word-break: break-all;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
