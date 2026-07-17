<template>
  <a-row
    class="ui-row"
    :class="{ 'ui-row--dense': props.dense }"
    :gutter="resolvedGutter"
    v-bind="$attrs"
  >
    <slot />
  </a-row>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

defineOptions({
  name: 'UiRow',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 栅格间距；未传时 dense 默认 12，否则 16 */
    gutter?: number | [number, number] | object
    /** 笔记本 densify：默认更紧 gutter */
    dense?: boolean
  }>(),
  {
    gutter: undefined,
    dense: true,
  },
)

const resolvedGutter = computed(() => {
  if (props.gutter !== undefined) return props.gutter
  return props.dense ? 12 : 16
})
</script>

<style lang="scss" scoped>
.ui-row {
  width: 100%;
}
</style>
