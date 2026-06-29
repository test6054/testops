<template>
  <section class="ui-log-viewer" v-bind="$attrs">
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :divided="props.divided"
    >
      <template v-if="$slots.meta" #meta>
        <slot name="meta" />
      </template>

      <template #actions>
        <slot name="actions" />
        <UiButton
          v-if="props.allowWrapToggle && hasValue"
          size="sm"
          variant="outline"
          @click="toggleWrap"
        >
          {{ wrapEnabled ? '关闭换行' : '自动换行' }}
        </UiButton>
        <UiButton v-if="props.copyable && hasValue" size="sm" variant="outline" @click="handleCopy">
          {{ copyButtonText }}
        </UiButton>
      </template>
    </UiPanelHeader>

    <a-spin :spinning="props.loading" style="width: 100%">
      <div v-if="hasValue" class="ui-log-viewer__body" :style="bodyStyle">
        <div
          class="ui-log-viewer__viewport"
          :class="[
            `ui-log-viewer__viewport--${props.tone}`,
            { 'ui-log-viewer__viewport--wrap': wrapEnabled },
          ]"
        >
          <template v-if="props.showLineNumbers">
            <div
              v-for="(line, index) in lines"
              :key="`${index}-${line}`"
              class="ui-log-viewer__line"
            >
              <span class="ui-log-viewer__line-number">{{ index + 1 }}</span>
              <code class="ui-log-viewer__line-content">{{ line || '\u00A0' }}</code>
            </div>
          </template>

          <pre v-else class="ui-log-viewer__pre">{{ props.value }}</pre>
        </div>
      </div>

      <UiEmpty v-else size="sm" title="暂无日志内容" :description="props.emptyText" />
    </a-spin>

    <footer v-if="$slots.footer" class="ui-log-viewer__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script lang="ts" setup>
import type { UiLogViewerTone } from './types'
import { computed, onBeforeUnmount, ref, useSlots, watch } from 'vue'
import UiButton from './Button.vue'
import UiEmpty from './Empty.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiLogViewer',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    value?: string
    loading?: boolean
    emptyText?: string
    maxHeight?: string | number
    tone?: UiLogViewerTone
    wrap?: boolean
    copyable?: boolean
    allowWrapToggle?: boolean
    showLineNumbers?: boolean
    divided?: boolean
  }>(),
  {
    title: '',
    description: '',
    eyebrow: '',
    value: '',
    loading: false,
    emptyText: '请传入日志文本',
    maxHeight: 360,
    tone: 'default',
    wrap: false,
    copyable: true,
    allowWrapToggle: true,
    showLineNumbers: true,
    divided: true,
  },
)

const emit = defineEmits<{
  (e: 'copy', value: string): void
}>()

const slots = useSlots()
const wrapEnabled = ref(props.wrap)
const copyState = ref<'idle' | 'success' | 'error'>('idle')
let copyTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.wrap,
  (value) => (wrapEnabled.value = value),
)

const normalizeCssSize = (value?: string | number) => {
  if (value === '' || value === undefined || value === null) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const hasHeader = computed(() => {
  return (
    !!props.title
    || !!props.description
    || !!props.eyebrow
    || !!slots.meta
    || !!slots.actions
    || props.copyable
    || props.allowWrapToggle
  )
})

const hasValue = computed(() => props.value.length > 0)

const lines = computed(() => props.value.split('\n'))

const bodyStyle = computed(() => ({
  maxHeight: normalizeCssSize(props.maxHeight),
}))

const copyButtonText = computed(() => {
  if (copyState.value === 'success') return '已复制'
  if (copyState.value === 'error') return '复制失败'
  return '复制日志'
})

const clearCopyTimer = () => {
  if (copyTimer) {
    clearTimeout(copyTimer)
    copyTimer = null
  }
}

const resetCopyStateLater = () => {
  clearCopyTimer()
  copyTimer = setTimeout(() => {
    copyState.value = 'idle'
  }, 1800)
}

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

const handleCopy = async () => {
  if (!hasValue.value) return

  try {
    await copyText(props.value)
    copyState.value = 'success'
    emit('copy', props.value)
  } catch {
    copyState.value = 'error'
  } finally {
    resetCopyStateLater()
  }
}

const toggleWrap = () => {
  wrapEnabled.value = !wrapEnabled.value
}

onBeforeUnmount(() => {
  clearCopyTimer()
})
</script>

<style scoped>
.ui-log-viewer {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
  box-shadow: var(--dp-shadow-card, 0 10px 30px rgba(15, 23, 42, 0.06));
}

.ui-log-viewer__body {
  overflow: auto;
}

.ui-log-viewer__viewport {
  min-width: 0;
  overflow: auto;
  border: 1px solid rgba(30, 41, 59, 0.88);
  border-radius: var(--dp-radius-panel, 4px);
  background: #0f172a;
  color: #e2e8f0;
}

.ui-log-viewer__viewport--default {
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.12);
}

.ui-log-viewer__viewport--danger {
  border-color: rgba(220, 38, 38, 0.45);
  box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.18);
}

.ui-log-viewer__viewport--success {
  border-color: rgba(22, 163, 74, 0.45);
  box-shadow: inset 0 0 0 1px rgba(22, 163, 74, 0.18);
}

.ui-log-viewer__viewport--wrap .ui-log-viewer__line-content,
.ui-log-viewer__viewport--wrap .ui-log-viewer__pre {
  white-space: pre-wrap;
  word-break: break-word;
}

.ui-log-viewer__line {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  min-width: 0;
}

.ui-log-viewer__line:hover {
  background: rgba(148, 163, 184, 0.08);
}

.ui-log-viewer__line-number,
.ui-log-viewer__line-content,
.ui-log-viewer__pre {
  display: block;
  padding: 0 14px;
  font-family: var(--dp-font-family-code);
  font-size: 12px;
  line-height: 1.8;
}

.ui-log-viewer__line-number {
  user-select: none;
  text-align: right;
  color: #64748b;
  border-right: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.72);
}

.ui-log-viewer__line-content {
  min-width: 0;
  white-space: pre;
}

.ui-log-viewer__pre {
  margin: 0;
  padding: 16px;
  white-space: pre;
}

.ui-log-viewer__footer {
  padding-top: 14px;
  border-top: 1px solid var(--dp-border, #e5e7eb);
}
</style>
