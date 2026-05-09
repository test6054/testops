<template>
  <div class="dp-tabs-pill" :class="`dp-tabs-pill--justify-${justify}`">
    <div class="dp-tabs-pill__list">
      <button
        v-for="item in items"
        :key="item.value"
        type="button"
        class="dp-tabs-pill__tab"
        :class="{
          'dp-tabs-pill__tab--active': modelValue === item.value,
          'dp-tabs-pill__tab--disabled': item.disabled,
        }"
        :disabled="item.disabled"
        @click="modelValue = item.value"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
interface TabItem {
  label: string
  value: string | number
  disabled?: boolean
}

const modelValue = defineModel<string | number>()

const { items = [], justify = 'start' } = defineProps<{
  items?: TabItem[]
  justify?: 'start' | 'center' | 'end' | 'stretch'
}>()
</script>

<style scoped>
.dp-tabs-pill__list {
  display: inline-flex;
  gap: 2px;
  background-color: var(--ant-color-fill-tertiary);
  padding: 2px;
  border-radius: var(--ant-border-radius);
}

.dp-tabs-pill__tab {
  background: transparent;
  border: none;
  color: var(--ant-color-text-tertiary);
  border-radius: var(--dp-radius-xs);
  transition: color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  margin: 0;
  padding: 2px 8px;
  line-height: 1.4;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--dp-font-family);
}

.dp-tabs-pill__tab:hover:not(:disabled) {
  color: var(--ant-color-text);
}

.dp-tabs-pill__tab--active {
  background-color: var(--ant-color-bg-container);
  color: var(--ant-color-text);
  font-weight: 500;
  box-shadow: var(--dp-shadow-sm);
}

.dp-tabs-pill__tab--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* justify 变体 */
.dp-tabs-pill--justify-start .dp-tabs-pill__list {
  justify-content: flex-start;
}

.dp-tabs-pill--justify-center .dp-tabs-pill__list {
  justify-content: center;
  width: 100%;
}

.dp-tabs-pill--justify-end .dp-tabs-pill__list {
  justify-content: flex-end;
  width: 100%;
}

.dp-tabs-pill--justify-stretch .dp-tabs-pill__list {
  width: 100%;
  box-sizing: border-box;
}

.dp-tabs-pill--justify-stretch .dp-tabs-pill__tab {
  flex: 1;
  justify-content: center;
}
</style>
