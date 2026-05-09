<template>
  <section class="ui-chat-shell" v-bind="$attrs">
    <header class="ui-chat-shell__header">
      <div class="ui-chat-shell__header-main">
        <div class="ui-chat-shell__title-row">
          <h3 class="ui-chat-shell__title">{{ props.title }}</h3>
          <UiBadge
            v-if="props.statusLabel"
            :tone="props.statusTone"
            variant="soft"
            size="sm"
          >
            {{ props.statusLabel }}
          </UiBadge>
          <div v-if="$slots.meta" class="ui-chat-shell__meta">
            <slot name="meta" />
          </div>
        </div>

        <p v-if="props.subtitle" class="ui-chat-shell__subtitle">{{ props.subtitle }}</p>
      </div>

      <div v-if="$slots.actions" class="ui-chat-shell__actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="ui-chat-shell__body" :style="bodyStyle">
      <a-spin :spinning="props.loading" style="width: 100%;">
        <template v-if="props.empty">
          <slot name="empty">
            <UiEmpty
              title="暂无会话内容"
              :description="props.emptyText"
            />
          </slot>
        </template>

        <template v-else>
          <slot />
        </template>
      </a-spin>
    </div>

    <footer v-if="$slots.footer" class="ui-chat-shell__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script lang="ts" setup>
import type { BadgeTone } from './types'
import { computed } from 'vue'
import UiBadge from './Badge.vue'
import UiEmpty from './Empty.vue'

defineOptions({
  name: 'UiChatShell',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  statusLabel?: string
  statusTone?: BadgeTone
  loading?: boolean
  empty?: boolean
  emptyText?: string
  bodyMinHeight?: string | number
}>(), {
  subtitle: '',
  statusLabel: '',
  statusTone: 'blue',
  loading: false,
  empty: false,
  emptyText: '请从左侧选择会话，或者直接发送第一条消息。',
  bodyMinHeight: 420,
})

const normalizeCssSize = (value?: string | number) => {
  if (value === '' || value === undefined || value === null)
    return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const bodyStyle = computed(() => ({
  minHeight: normalizeCssSize(props.bodyMinHeight),
}))
</script>

<style scoped>
.ui-chat-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  height: 100%;
  padding: 18px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
  box-shadow: var(--dp-shadow-card, 0 10px 30px rgba(15, 23, 42, 0.06));
}

.ui-chat-shell__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--dp-border, #e5e7eb);
}

.ui-chat-shell__header-main {
  min-width: 0;
  flex: 1;
}

.ui-chat-shell__title-row,
.ui-chat-shell__meta,
.ui-chat-shell__actions,
.ui-chat-shell__footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ui-chat-shell__title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-chat-shell__subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--dp-text-secondary, #475569);
}

.ui-chat-shell__body {
  min-width: 0;
  flex: 1;
  overflow: auto;
}

.ui-chat-shell__footer {
  padding-top: 14px;
  border-top: 1px solid var(--dp-border, #e5e7eb);
}

@media (max-width: 768px) {
  .ui-chat-shell__header {
    flex-direction: column;
  }
}
</style>
