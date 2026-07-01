<template>
  <section class="ui-conversation-panel" v-bind="$attrs">
    <div class="ui-conversation-panel__layout">
      <UiSessionListPanel
        class="ui-conversation-panel__sidebar"
        :title="props.sessionTitle"
        :description="props.sessionDescription"
        eyebrow="Conversation Sessions"
        :items="props.sessions"
        :current-id="props.currentSessionId"
        :loading="props.sessionLoading"
        :empty-text="props.sessionEmptyText"
        :removable="props.removable"
        :max-height="props.listMaxHeight"
        @select="emit('select-session', $event)"
        @remove="emit('remove-session', $event)"
      >
        <template v-if="$slots.sessionActions" #actions>
          <slot name="sessionActions" />
        </template>
      </UiSessionListPanel>

      <UiChatShell
        class="ui-conversation-panel__main"
        :title="props.title"
        :subtitle="props.subtitle"
        :status-label="props.statusLabel"
        :status-tone="props.statusTone"
        :loading="props.loading"
        :empty="props.empty"
        :empty-text="props.emptyText"
        :body-min-height="props.bodyMinHeight"
      >
        <template v-if="$slots.chatActions" #actions>
          <slot name="chatActions" />
        </template>

        <UiMessageThread
          :messages="props.messages"
          :loading="props.loading"
          :empty-text="props.emptyText"
          :max-height="props.threadMaxHeight"
        />

        <template v-if="!props.hideComposer" #footer>
          <slot name="composer">
            <UiCard bordered :hoverable="false">
              <div class="ui-conversation-panel__composer-title">{{ props.composerTitle }}</div>
              <div class="ui-conversation-panel__composer-row">
                <UiTextarea
                  v-model="draft"
                  :placeholder="props.composerPlaceholder"
                  :auto-size="{ minRows: 3, maxRows: 5 }"
                />
                <UiButton @click="handleSend">{{ props.sendText }}</UiButton>
              </div>
            </UiCard>
          </slot>
        </template>
      </UiChatShell>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiSessionListItem, UiThreadMessage } from './types'
import { computed } from 'vue'
import UiButton from './Button.vue'
import UiCard from './Card.vue'
import UiTextarea from './Textarea.vue'
import UiChatShell from './UiChatShell.vue'
import UiMessageThread from './UiMessageThread.vue'
import UiSessionListPanel from './UiSessionListPanel.vue'

defineOptions({
  name: 'UiConversationPanel',
  inheritAttrs: false,
})

const draft = defineModel<string>('draft', { default: '' })

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    statusLabel?: string
    statusTone?: BadgeTone
    sessions?: UiSessionListItem[]
    currentSessionId?: string | number
    sessionTitle?: string
    sessionDescription?: string
    messages?: UiThreadMessage[]
    loading?: boolean
    sessionLoading?: boolean
    empty?: boolean
    emptyText?: string
    sessionEmptyText?: string
    removable?: boolean
    hideComposer?: boolean
    composerTitle?: string
    composerPlaceholder?: string
    sendText?: string
    bodyMinHeight?: string | number
    threadMaxHeight?: string | number
    listMaxHeight?: string | number
  }>(),
  {
    subtitle: '',
    statusLabel: '',
    statusTone: 'blue',
    sessions: () => [],
    currentSessionId: undefined,
    sessionTitle: '会话列表',
    sessionDescription: '',
    messages: () => [],
    loading: false,
    sessionLoading: false,
    empty: false,
    emptyText: '请先从左侧选择会话，或者直接发起一条新消息。',
    sessionEmptyText: '暂无会话',
    removable: true,
    hideComposer: false,
    composerTitle: '统一输入区壳层',
    composerPlaceholder: '输入你的问题...',
    sendText: '发送',
    bodyMinHeight: 420,
    threadMaxHeight: 360,
    listMaxHeight: 420,
  },
)

const emit = defineEmits<{
  (e: 'select-session', item: UiSessionListItem): void
  (e: 'remove-session', item: UiSessionListItem): void
  (e: 'send', value: string): void
}>()

const hasMeaningfulDraft = computed(() => draft.value.trim())

const handleSend = () => {
  if (!hasMeaningfulDraft.value) return

  emit('send', draft.value)
  draft.value = ''
}
</script>

<style scoped>
.ui-conversation-panel {
  width: 100%;
}

.ui-conversation-panel__layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
}

.ui-conversation-panel__sidebar,
.ui-conversation-panel__main {
  min-width: 0;
}

.ui-conversation-panel__composer-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-conversation-panel__composer-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  margin-top: 12px;
  align-items: end;
}

@media (max-width: 960px) {
  .ui-conversation-panel__layout {
    grid-template-columns: 1fr;
  }

  .ui-conversation-panel__composer-row {
    grid-template-columns: 1fr;
  }
}
</style>
