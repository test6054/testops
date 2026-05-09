<template>
  <header class="ui-page-header" :class="{ 'ui-page-header--divided': props.divided }">
    <div class="ui-page-header__main">
      <div v-if="props.showBack" class="ui-page-header__back">
        <UiButton size="sm" variant="ghost" @click="emit('back')">
          <template #icon>
            <ArrowLeftOutlined />
          </template>
          {{ props.backText }}
        </UiButton>
      </div>
      <div class="ui-page-header__meta">
        <div class="ui-page-header__title-row">
          <h1 class="ui-page-header__title">{{ props.title }}</h1>
          <div v-if="$slots.badges" class="ui-page-header__badges">
            <slot name="badges" />
          </div>
        </div>
        <p v-if="props.subtitle" class="ui-page-header__subtitle">{{ props.subtitle }}</p>
        <div v-if="$slots.meta" class="ui-page-header__extra-meta">
          <slot name="meta" />
        </div>
      </div>
    </div>
    <div v-if="$slots.actions" class="ui-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script lang="ts" setup>
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import UiButton from './Button.vue'

defineOptions({
  name: 'UiPageHeader',
})

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  showBack?: boolean
  backText?: string
  divided?: boolean
}>(), {
  subtitle: '',
  showBack: false,
  backText: '返回',
  divided: false,
})

const emit = defineEmits<{
  (e: 'back'): void
}>()
</script>

<style scoped>
.ui-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 4px;
}

.ui-page-header--divided {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--dp-border, #e5e7eb);
}

.ui-page-header__main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.ui-page-header__meta {
  min-width: 0;
  flex: 1;
}

.ui-page-header__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ui-page-header__title {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-page-header__badges,
.ui-page-header__extra-meta,
.ui-page-header__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ui-page-header__subtitle {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--dp-text-secondary, #475569);
}
</style>
