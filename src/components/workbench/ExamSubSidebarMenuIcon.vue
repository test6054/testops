<template>
  <a-tooltip v-if="collapsed" :title="label" placement="right">
    <span class="exam-sub-sidebar-menu-icon">
      <component :is="resolvedIcon" />
    </span>
  </a-tooltip>
  <component v-else :is="resolvedIcon" />
</template>

<script lang="ts" setup>
import type { Component } from 'vue'
import AppstoreOutlined from '@ant-design/icons-vue/AppstoreOutlined'
import { computed } from 'vue'

defineOptions({ name: 'ExamSubSidebarMenuIcon' })

const props = defineProps<{
  icon: Component | undefined
  label: string
  collapsed: boolean
}>()

const resolvedIcon = computed(() => props.icon ?? AppstoreOutlined)
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
