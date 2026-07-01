<template>
  <UiSidePanelCard
    :title="props.title"
    :description="props.description"
    :eyebrow="props.eyebrow"
    :count="props.total"
    :count-tone="props.countTone"
    :compact="props.compact"
    :body-scrollable="props.bodyScrollable"
    :body-max-height="props.bodyMaxHeight"
    v-bind="$attrs"
  >
    <template v-if="$slots.icon" #icon>
      <slot name="icon" />
    </template>

    <template #actions>
      <slot name="actions" />
    </template>

    <slot />

    <template v-if="showFooter" #footer>
      <slot name="footer">
        <UiActionLink
          v-if="props.showViewMore"
          :text="props.viewMoreText"
          @click="emit('view-more')"
        />
        <UiActionLink
          v-if="props.showReadAll"
          :text="props.readAllText"
          @click="emit('read-all')"
        />
      </slot>
    </template>
  </UiSidePanelCard>
</template>

<script lang="ts" setup>
import type { BadgeTone } from './types'
import { computed, useSlots } from 'vue'
import UiActionLink from './UiActionLink.vue'
import UiSidePanelCard from './UiSidePanelCard.vue'

defineOptions({
  name: 'UiInboxPanel',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    total?: string | number
    countTone?: BadgeTone
    compact?: boolean
    bodyScrollable?: boolean
    bodyMaxHeight?: string | number
    readAllText?: string
    viewMoreText?: string
    showReadAll?: boolean
    showViewMore?: boolean
  }>(),
  {
    title: '收件箱',
    description: '',
    eyebrow: '',
    total: undefined,
    countTone: 'blue',
    compact: false,
    bodyScrollable: false,
    bodyMaxHeight: '',
    readAllText: '全部已读',
    viewMoreText: '查看更多',
    showReadAll: true,
    showViewMore: true,
  },
)

const emit = defineEmits<{
  (e: 'read-all'): void
  (e: 'view-more'): void
}>()

const slots = useSlots()

const showFooter = computed(() => {
  return !!slots.footer || props.showReadAll || props.showViewMore
})
</script>
