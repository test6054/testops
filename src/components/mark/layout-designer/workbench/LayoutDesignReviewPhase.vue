<script setup lang="ts">
import type { ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import { LayoutDesignPhaseCode } from '@/types/enums/layout-design-phase-enum'
import { validateLayoutDocumentForSave } from '@/utils/exam-layout-designer'

const props = defineProps<{
  document: ExamLayoutDocument | null
  saveBlockingReasons: string[]
  saving?: boolean
  previewing?: boolean
  previewDisabled?: boolean
  saveDisabled?: boolean
  saveTooltip?: string
}>()

const emit = defineEmits<{
  save: []
  preview: []
  navigate: [phase: LayoutDesignPhaseCode]
}>()

const checklist = computed(() => {
  const reasons = props.saveBlockingReasons.length > 0
    ? props.saveBlockingReasons
    : validateLayoutDocumentForSave(props.document)
  if (reasons.length === 0) {
    return [{ tone: 'green' as const, text: '制卷设计校验通过，可以保存并预览 PDF' }]
  }
  return reasons.map((text) => ({ tone: 'orange' as const, text }))
})

function resolveNavigatePhase(reason: string): LayoutDesignPhaseCode | null {
  if (reason.includes('身份') || reason.includes('ROI') || reason.includes('作答区')) {
    return LayoutDesignPhaseCode.LAYOUT
  }
  if (reason.includes('答案') || reason.includes('题目')) {
    return LayoutDesignPhaseCode.QUESTIONS
  }
  if (reason.includes('页') || reason.includes('源文件') || reason.includes('PDF')) {
    return LayoutDesignPhaseCode.SOURCE
  }
  return null
}
</script>

<template>
  <section class="layout-design-review-phase">
    <div class="layout-design-review-phase__header">
      <h2 class="layout-design-review-phase__title">校验清单</h2>
      <div class="layout-design-review-phase__actions">
        <UiButton
          size="sm"
          variant="outline"
          :loading="previewing"
          :disabled="previewDisabled"
          @click="emit('preview')"
        >
          预览 PDF
        </UiButton>
        <UiTooltip :title="saveTooltip">
          <UiButton
            size="sm"
            variant="primary"
            :loading="saving"
            :disabled="saveDisabled"
            @click="emit('save')"
          >
            保存设计
          </UiButton>
        </UiTooltip>
      </div>
    </div>
    <ul class="layout-design-review-phase__list">
      <li
        v-for="(item, index) in checklist"
        :key="`${item.text}-${index}`"
        class="layout-design-review-phase__item"
      >
        <UiTag :tone="item.tone" size="sm">{{ item.tone === 'green' ? '通过' : '待处理' }}</UiTag>
        <span class="layout-design-review-phase__text">{{ item.text }}</span>
        <UiButton
          v-if="item.tone !== 'green'"
          size="sm"
          variant="ghost"
          @click="emit('navigate', resolveNavigatePhase(item.text) ?? LayoutDesignPhaseCode.SOURCE)"
        >
          前往处理
        </UiButton>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.layout-design-review-phase {
  padding: var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface, var(--dp-bg-container));

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-2, 8px);
    margin-bottom: var(--dp-space-2, 8px);
  }

  &__title {
    margin: 0;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid var(--dp-border-subtle);
  }

  &__text {
    flex: 1;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-primary);
  }
}
</style>
