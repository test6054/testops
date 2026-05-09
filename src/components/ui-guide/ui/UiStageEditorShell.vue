<template>
  <UiEditorCard
    v-model:open="openModel"
    :title="props.title"
    :subtitle="props.subtitle"
    :collapsible="props.collapsible"
    :toggle-position="props.togglePosition"
    class="ui-stage-editor-shell"
    @toggle="emit('toggle', $event)"
  >
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>

    <template v-if="$slots.handle" #handle>
      <slot name="handle" />
    </template>

    <template #meta>
      <slot name="meta">
        <UiTag
          v-if="props.deliverableCount !== undefined"
          tone="gray"
          variant="outline"
        >
          {{ props.deliverableCount }} 个交付物
        </UiTag>
        <UiTag
          v-if="props.periodLabel"
          tone="gray"
          variant="outline"
        >
          {{ props.periodLabel }}
        </UiTag>
      </slot>
    </template>

    <template #actions>
      <slot name="actions" />
    </template>

    <div v-if="$slots.summary" class="ui-stage-editor-shell__summary">
      <slot name="summary" />
    </div>

    <slot />

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UiEditorCard>
</template>

<script lang="ts" setup>
import UiTag from './Tag.vue'
import UiEditorCard from './UiEditorCard.vue'

defineOptions({ name: 'UiStageEditorShell' })

const openModel = defineModel<boolean>('open', { default: true })

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  deliverableCount?: number
  periodLabel?: string
  collapsible?: boolean
  togglePosition?: 'left' | 'right'
}>(), {
  subtitle: '',
  deliverableCount: undefined,
  periodLabel: '',
  collapsible: true,
  togglePosition: 'right',
})

const emit = defineEmits<{
  (e: 'toggle', value: boolean): void
}>()
</script>

<style scoped>
.ui-stage-editor-shell__summary {
  margin-bottom: 18px;
}
</style>
