<template>
  <div
    class="ui-table-actions"
    :class="[`ui-table-actions--${props.align}`]"
    :style="{ '--ui-table-actions-gap': `${props.gap}px` }"
  >
    <slot />
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiTableActions',
})

const props = withDefaults(defineProps<{
  align?: 'start' | 'center' | 'end'
  gap?: number
}>(), {
  align: 'center',
  gap: 12,
})
</script>

<style scoped>
.ui-table-actions {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: var(--ui-table-actions-gap, 12px);
  white-space: nowrap;
}

.ui-table-actions--start {
  justify-content: flex-start;
}

.ui-table-actions--center {
  justify-content: center;
}

.ui-table-actions--end {
  justify-content: flex-end;
}
</style>
