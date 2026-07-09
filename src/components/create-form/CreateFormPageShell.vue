<template>
  <div class="create-form-page">
    <div class="create-form-page__header">
      <div class="create-form-page__header-inner">
        <div class="create-form-page__header-left">
          <UiButton variant="ghost" size="sm" @click="emit('back')">
            <template #icon><ArrowLeftOutlined /></template>
            返回
          </UiButton>
          <div class="create-form-page__heading">
            <h1 class="create-form-page__title">{{ title }}</h1>
            <p v-if="subtitle" class="create-form-page__subtitle">{{ subtitle }}</p>
          </div>
        </div>
      </div>
    </div>

    <div ref="scrollContainerRef" class="create-form-page__scroll">
      <div class="create-form-page__body">
        <div class="create-layout">
          <aside class="create-layout__aside">
            <div class="create-layout__aside-sticky">
              <UiSidebarNav
                :items="navItems"
                :active-key="activeKey"
                @select="(item) => emit('nav-select', String(item.key))"
              />
            </div>
          </aside>
          <div class="create-layout__main">
            <slot />
          </div>
        </div>
      </div>
    </div>

    <footer v-if="$slots.footer" class="create-form-page__footer">
      <div class="create-form-page__footer-inner">
        <slot name="footer" />
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { UiSidebarNavItem } from '@/components/ui-guide/ui/UiSidebarNav.vue'
import ArrowLeftOutlined from '@ant-design/icons-vue/ArrowLeftOutlined'
import { provide, ref } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiSidebarNav from '@/components/ui-guide/ui/UiSidebarNav.vue'
import { createFormScrollContainerKey } from './create-form-context'

defineOptions({ name: 'CreateFormPageShell' })

defineProps<{
  title: string
  subtitle?: string
  navItems: UiSidebarNavItem[]
  activeKey: string
}>()

const emit = defineEmits<{
  "back": []
  'nav-select': [sectionKey: string]
}>()

const scrollContainerRef = ref<HTMLElement | null>(null)
provide(createFormScrollContainerKey, scrollContainerRef)
</script>

<style lang="scss">
@import '@/styles/create-form-page.scss';
</style>
