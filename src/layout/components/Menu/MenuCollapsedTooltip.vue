<template>
  <a-tooltip v-if="collapsed && label" :title="label" placement="right">
    <span class="menu-collapsed-tooltip__target">
      <slot />
    </span>
  </a-tooltip>
  <slot v-else />
</template>

<script lang="ts" setup>
defineOptions({ name: 'MenuCollapsedTooltip' })

defineProps<{
  collapsed: boolean
  label: string
}>()
</script>

<style scoped lang="scss">
.menu-collapsed-tooltip__target {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  color: inherit;
}
</style>
