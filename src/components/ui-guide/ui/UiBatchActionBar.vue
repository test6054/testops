<template>
  <div class="ui-batch-action-bar" :class="{ 'ui-batch-action-bar--muted': props.muted }" v-bind="$attrs">
    <div class="ui-batch-action-bar__left">
      <slot name="left">
        <div class="ui-batch-action-bar__summary">
          <strong v-if="props.selectedCount !== undefined">{{ props.selectedCount }}</strong>
          <span v-if="props.selectedCount !== undefined">{{ props.selectionLabel }}</span>
          <span v-if="props.description" class="ui-batch-action-bar__description">{{ props.description }}</span>
        </div>
      </slot>
    </div>

    <div class="ui-batch-action-bar__right">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiBatchActionBar',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  selectedCount?: number
  selectionLabel?: string
  description?: string
  muted?: boolean
}>(), {
  selectedCount: undefined,
  selectionLabel: '项已选中',
  description: '',
  muted: false,
})
</script>

<style scoped>
.ui-batch-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: #fff;
}

.ui-batch-action-bar--muted {
  background: var(--dp-surface-subtle, #f8fafc);
}

.ui-batch-action-bar__left {
  min-width: 0;
  flex: 1;
}

.ui-batch-action-bar__summary {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 14px;
  color: var(--dp-text-secondary, #475569);
}

.ui-batch-action-bar__summary strong {
  font-size: 18px;
  line-height: 1;
  color: var(--dp-text-primary, #0f172a);
}

.ui-batch-action-bar__description {
  color: var(--dp-text-muted, #6b7280);
}

.ui-batch-action-bar__right {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .ui-batch-action-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .ui-batch-action-bar__right {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
