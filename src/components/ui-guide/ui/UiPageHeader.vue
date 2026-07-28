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

/** 仅独立办理页页头（如改密）。工作台必须用 ContextBar，禁止与 ContextBar 双标题。 */
defineOptions({
  name: 'UiPageHeader',
})

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    showBack?: boolean
    backText?: string
    divided?: boolean
  }>(),
  {
    subtitle: '',
    showBack: false,
    backText: '返回',
    divided: false,
  },
)

const emit = defineEmits<{
  (e: 'back'): void
}>()
</script>

<style scoped>
.ui-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-block);
  padding-bottom: var(--dp-space-component-tight);
}

.ui-page-header--divided {
  padding-bottom: var(--dp-space-block);
  border-bottom: none;
  background-image: linear-gradient(
    90deg,
    var(--dp-border) 0%,
    var(--dp-border) 60%,
    transparent 100%
  );
  background-size: 100% 1px;
  background-position: 0 100%;
  background-repeat: no-repeat;
}

.ui-page-header__main {
  display: flex;
  align-items: flex-start;
  gap: var(--dp-space-component);
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
  gap: var(--dp-space-component);
}

.ui-page-header__title {
  margin: 0;
  font-size: var(--dp-font-size-2xl);
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--dp-text-primary);
}

.ui-page-header__badges,
.ui-page-header__extra-meta,
.ui-page-header__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component);
}

.ui-page-header__subtitle {
  margin: var(--dp-space-component-tight) 0 0;
  font-size: var(--dp-font-size-md);
  line-height: 1.7;
  color: var(--dp-text-secondary);
}
</style>
