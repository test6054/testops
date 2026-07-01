<template>
  <UiEditorCard
    v-model:open="openModel"
    :title="props.title"
    :subtitle="props.subtitle"
    :collapsible="props.collapsible"
    :toggle-position="props.togglePosition"
    class="ui-deliverable-item-editor"
    @toggle="emit('toggle', $event)"
  >
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>

    <template #meta>
      <slot name="meta">
        <UiTag v-if="props.typeLabel" :tone="props.typeTone" variant="outline">
          {{ props.typeLabel }}
        </UiTag>
        <UiTag v-if="props.formatSummary" tone="gray" variant="outline">
          {{ props.formatSummary }}
        </UiTag>
      </slot>
    </template>

    <template #actions>
      <slot name="actions" />
      <UiActionLink v-if="props.removable" danger @click="emit('remove')"> 删除 </UiActionLink>
    </template>

    <slot />

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UiEditorCard>
</template>

<script lang="ts" setup>
import type { BadgeTone } from './types'
import UiTag from './Tag.vue'
import UiActionLink from './UiActionLink.vue'
import UiEditorCard from './UiEditorCard.vue'

defineOptions({ name: 'UiDeliverableItemEditor' })

const openModel = defineModel<boolean>('open', { default: true })

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    typeLabel?: string
    typeTone?: BadgeTone
    formatSummary?: string
    collapsible?: boolean
    removable?: boolean
    togglePosition?: 'left' | 'right'
  }>(),
  {
    subtitle: '',
    typeLabel: '',
    typeTone: 'blue',
    formatSummary: '',
    collapsible: true,
    removable: false,
    togglePosition: 'right',
  },
)

const emit = defineEmits<{
  (e: 'toggle', value: boolean): void
  (e: 'remove'): void
}>()
</script>
