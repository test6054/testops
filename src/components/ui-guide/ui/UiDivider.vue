<template>
  <a-divider
    class="ui-divider"
    :class="[
      `ui-divider--${props.orientation}`,
      { 'ui-divider--dashed': props.dashed, 'ui-divider--plain': props.plain },
    ]"
    :type="props.type"
    :dashed="props.dashed"
    :orientation="props.orientation === 'center' ? 'center' : props.orientation"
    :plain="props.plain"
    v-bind="$attrs"
  >
    <slot />
  </a-divider>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiDivider',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    type?: 'horizontal' | 'vertical'
    dashed?: boolean
    orientation?: 'left' | 'right' | 'center'
    plain?: boolean
  }>(),
  {
    type: 'horizontal',
    dashed: false,
    orientation: 'center',
    plain: false,
  },
)
</script>

<style lang="scss" scoped>
.ui-divider {
  border-color: var(--dp-border);
  margin: 12px 0;
  color: var(--dp-text-secondary);
  font-size: 13px;
}

.ui-divider :deep(.ant-divider-inner-text) {
  color: var(--dp-text-secondary);
  font-weight: 500;
}
</style>
