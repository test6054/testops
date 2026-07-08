<template>
  <UiEntityCard
    class="ui-resource-card"
    :title="props.title"
    :description="props.subtitle"
    :clickable="props.clickable"
    :tone="props.coverTone"
    @click="emit('click')"
  >
    <template #cover>
      <div class="ui-resource-card__cover">
        <div class="ui-resource-card__cover-main">
          <span class="ui-resource-card__cover-eyebrow">{{ props.coverLabel || '资源卡片' }}</span>
          <div class="ui-resource-card__cover-title">{{ props.title }}</div>
        </div>
        <div class="ui-resource-card__cover-badges">
          <UiTag v-if="props.difficultyLabel" :tone="props.difficultyTone" variant="outline">
            {{ props.difficultyLabel }}
          </UiTag>
          <slot name="cover-badges" />
        </div>
      </div>
    </template>

    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>

    <template v-if="props.tags.length" #tags>
      <UiTag v-for="tag in props.tags" :key="tag" tone="gray" variant="outline">
        {{ tag }}
      </UiTag>
    </template>

    <template #meta>
      <div class="ui-resource-card__meta-list">
        <span
          v-for="(item, index) in props.metaItems"
          :key="`${item}-${index}`"
          class="ui-resource-card__meta-item"
        >
          {{ item }}
        </span>
      </div>
    </template>

    <template #footer>
      <div class="ui-resource-card__footer-main">
        <span v-if="props.creator" class="ui-resource-card__creator">{{ props.creator }}</span>
      </div>
      <div class="ui-resource-card__footer-actions">
        <UiButton
          v-if="props.secondaryActionText"
          size="sm"
          variant="outline"
          @click.stop="emit('secondary')"
        >
          {{ props.secondaryActionText }}
        </UiButton>
        <UiButton v-if="props.primaryActionText" size="sm" @click.stop="emit('primary')">
          {{ props.primaryActionText }}
        </UiButton>
      </div>
    </template>
  </UiEntityCard>
</template>

<script lang="ts" setup>
import type { BadgeTone } from './types'
import UiButton from './Button.vue'
import UiTag from './Tag.vue'
import UiEntityCard from './UiEntityCard.vue'

defineOptions({ name: 'UiResourceCard' })

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    coverLabel?: string
    coverTone?: BadgeTone
    difficultyLabel?: string
    difficultyTone?: BadgeTone
    tags?: string[]
    metaItems?: string[]
    creator?: string
    primaryActionText?: string
    secondaryActionText?: string
    clickable?: boolean
  }>(),
  {
    subtitle: '',
    coverLabel: '',
    coverTone: 'blue',
    difficultyLabel: '',
    difficultyTone: 'orange',
    tags: () => [],
    metaItems: () => [],
    creator: '',
    primaryActionText: '查看详情',
    secondaryActionText: '',
    clickable: true,
  },
)

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'primary'): void
  (e: 'secondary'): void
}>()
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.ui-resource-card__cover {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-height: 92px;
}

.ui-resource-card__cover-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ui-resource-card__cover-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dp-text-secondary);
}

.ui-resource-card__cover-title {
  font-size: 20px;
  line-height: 1.4;
  font-weight: 800;
  color: var(--dp-text-primary);
}

.ui-resource-card__cover-badges {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.ui-resource-card__meta-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ui-resource-card__meta-item,
.ui-resource-card__creator {
  font-size: 12px;
  font-weight: 600;
  color: var(--dp-text-secondary);
}

.ui-resource-card__footer-main,
.ui-resource-card__footer-actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: bp.$layout-mobile-max) {
  .ui-resource-card__cover,
  .ui-resource-card__footer-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
