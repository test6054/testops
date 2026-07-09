<template>
  <span v-bind="$attrs" class="menu-collapsed-tooltip">
    <a-tooltip v-if="collapsed && label" :title="label" placement="right">
      <span class="menu-collapsed-tooltip__target">
        <slot />
      </span>
    </a-tooltip>
    <slot v-else />
  </span>
</template>

<script lang="ts" setup>
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
