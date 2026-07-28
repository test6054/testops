<template>
  <UiTooltip v-if="collapsed" :title="label" placement="right">
    <span class="exam-sub-sidebar-menu-icon" :aria-label="label">
      <component :is="resolvedIcon" aria-hidden="true" />
    </span>
  </UiTooltip>
  <component v-else :is="resolvedIcon" />
</template>

<script lang="ts" setup>
import type { Component } from 'vue'
import AppstoreOutlined from '@ant-design/icons-vue/AppstoreOutlined'
import { computed } from 'vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'

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
