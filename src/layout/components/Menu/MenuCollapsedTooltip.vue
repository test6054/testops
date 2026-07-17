<template>
  <span v-bind="$attrs" class="menu-collapsed-tooltip">
    <UiTooltip v-if="collapsed && label" :title="label" placement="right">
      <span class="menu-collapsed-tooltip__target">
        <slot />
      </span>
    </UiTooltip>
    <slot v-else />
  </span>
</template>

<script lang="ts" setup>
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'

defineOptions({
  name: 'MenuCollapsedTooltip',
  inheritAttrs: false,
})

defineProps<{
  collapsed: boolean
  label: string
}>()
</script>

<style scoped lang="scss">
.menu-collapsed-tooltip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
}

.menu-collapsed-tooltip__target {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  color: inherit;
}
</style>
