<template>
  <div class="ui-message-thread">
    <a-spin :spinning="props.loading" style="width: 100%;">
      <div v-if="props.messages.length" class="ui-message-thread__list" :style="listStyle">
        <template v-for="message in props.messages" :key="message.id">
          <div
            v-if="message.role === 'system'"
            class="ui-message-thread__system"
          >
            <UiBadge
              :tone="message.statusTone || 'gray'"
              variant="soft"
              size="sm"
            >
              {{ message.text }}
            </UiBadge>
          </div>

          <div
            v-else
            class="ui-message-thread__row"
            :class="`ui-message-thread__row--${message.role}`"
          >
            <div v-if="message.role === 'other'" class="ui-message-thread__avatar">
              {{ message.sender?.slice(0, 1) || '师' }}
            </div>

            <div class="ui-message-thread__main">
              <div class="ui-message-thread__meta">
                <span v-if="message.sender" class="ui-message-thread__sender">
                  {{ message.sender }}
                </span>
                <span v-if="message.time" class="ui-message-thread__time">{{ message.time }}</span>
              </div>

              <div class="ui-message-thread__bubble">
                <div v-if="message.text" class="ui-message-thread__text">
                  {{ message.text }}
                </div>

                <div
                  v-if="message.attachments?.length"
                  class="ui-message-thread__attachments"
                >
                  <div
                    v-for="attachment in message.attachments"
                    :key="attachment.id"
                    class="ui-message-thread__attachment"
                  >
                    <UiTag v-if="attachment.tag" tone="blue" size="sm" variant="outline">
                      {{ attachment.tag }}
                    </UiTag>
                    <span class="ui-message-thread__attachment-name">{{ attachment.name }}</span>
                    <span v-if="attachment.size" class="ui-message-thread__attachment-size">
                      {{ attachment.size }}
                    </span>
                    <UiTag v-if="attachment.deleted" tone="gray" size="sm">已删除</UiTag>
                  </div>
                </div>

                <div
                  v-if="message.helper || message.statusLabel"
                  class="ui-message-thread__helper-row"
                >
                  <span v-if="message.helper" class="ui-message-thread__helper">
                    {{ message.helper }}
                  </span>
                  <UiTag
                    v-if="message.statusLabel"
                    :tone="message.statusTone || 'blue'"
                    size="sm"
                  >
                    {{ message.statusLabel }}
                  </UiTag>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <UiEmpty v-else size="sm" :description="props.emptyText" />
    </a-spin>

    <div v-if="$slots.footer" class="ui-message-thread__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import type { UiThreadMessage } from './types'
import { computed } from 'vue'
import UiBadge from './Badge.vue'
import UiEmpty from './Empty.vue'
import UiTag from './Tag.vue'

defineOptions({
  name: 'UiMessageThread',
})

const props = withDefaults(defineProps<{
  messages?: UiThreadMessage[]
  loading?: boolean
  emptyText?: string
  maxHeight?: string | number
}>(), {
  messages: () => [],
  loading: false,
  emptyText: '暂无消息',
  maxHeight: 420,
})

const normalizeCssSize = (value?: string | number) => {
  if (value === '' || value === undefined || value === null)
    return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const listStyle = computed<CSSProperties>(() => {
  const maxHeight = normalizeCssSize(props.maxHeight)
  return {
    maxHeight,
    overflowY: 'auto',
  }
})
</script>

<style scoped>
.ui-message-thread {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ui-message-thread__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ui-message-thread__system {
  display: flex;
  justify-content: center;
}

.ui-message-thread__row {
  display: flex;
  gap: 10px;
}

.ui-message-thread__row--mine {
  justify-content: flex-end;
}

.ui-message-thread__row--other {
  justify-content: flex-start;
}

.ui-message-thread__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-blue-50, #eff6ff);
  color: var(--dp-blue-700, #1d4ed8);
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}

.ui-message-thread__main {
  display: grid;
  gap: 6px;
  min-width: 0;
  max-width: min(78%, 640px);
}

.ui-message-thread__row--mine .ui-message-thread__main {
  justify-items: end;
}

.ui-message-thread__meta {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-message-thread__sender {
  font-weight: 700;
}

.ui-message-thread__bubble {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 14px 16px;
  border-radius: var(--dp-radius-panel, 4px);
  border: 1px solid var(--dp-border, #e5e7eb);
  background: #fff;
}

.ui-message-thread__row--mine .ui-message-thread__bubble {
  background: var(--dp-blue-50, #eff6ff);
  border-color: var(--dp-blue-200, #bfdbfe);
}

.ui-message-thread__text {
  font-size: 13px;
  line-height: 1.8;
  color: var(--dp-text-primary, #0f172a);
  white-space: pre-wrap;
}

.ui-message-thread__attachments {
  display: grid;
  gap: 8px;
}

.ui-message-thread__attachment {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: rgba(255, 255, 255, 0.72);
}

.ui-message-thread__attachment-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-message-thread__attachment-size,
.ui-message-thread__helper {
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-message-thread__helper-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ui-message-thread__footer {
  padding-top: 12px;
  border-top: 1px solid var(--dp-border, #e5e7eb);
}
</style>
