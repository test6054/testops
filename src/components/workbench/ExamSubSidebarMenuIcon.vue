<template>
  <a-tooltip v-if="collapsed" :title="label" placement="right">
    <span class="exam-sub-sidebar-menu-icon">
      <component :is="icon" />
    </span>
  </a-tooltip>
  <component v-else :is="icon" />
</template>

<script lang="ts" setup>
import type { Component } from 'vue'

defineOptions({ name: 'ExamSubSidebarMenuIcon' })

defineProps<{
  icon: Component
  label: string
  collapsed: boolean
}>()
</script>

<style scoped lang="scss">
.exam-sub-sidebar-menu-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  color: inherit;
}
</style>
