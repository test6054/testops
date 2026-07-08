<template>
  <section
    class="ui-editor-card"
    :class="{
      'ui-editor-card--open': openModel,
      'ui-editor-card--collapsible': props.collapsible,
    }"
  >
    <header
      class="ui-editor-card__header"
      :class="{ 'is-clickable': props.collapsible }"
      @click="handleToggle"
    >
      <div class="ui-editor-card__leading">
        <div v-if="$slots.handle" class="ui-editor-card__handle" @click.stop>
          <slot name="handle" />
        </div>

        <button
          v-if="props.collapsible && props.togglePosition === 'left'"
          type="button"
          class="ui-editor-card__toggle"
          @click.stop="toggleOpen"
        >
          <component :is="RightOutlined" :class="{ 'is-expanded': openModel }" />
        </button>

        <div class="ui-editor-card__main">
          <div class="ui-editor-card__title-row">
            <div class="ui-editor-card__title-wrap">
              <slot name="title">
                <div class="ui-editor-card__title">{{ props.title }}</div>
              </slot>
              <div v-if="props.subtitle" class="ui-editor-card__subtitle">{{ props.subtitle }}</div>
            </div>

            <div v-if="$slots.meta" class="ui-editor-card__meta" @click.stop>
              <slot name="meta" />
            </div>
          </div>
        </div>
      </div>

      <div class="ui-editor-card__actions" @click.stop>
        <slot name="actions" />
        <button
          v-if="props.collapsible && props.togglePosition === 'right'"
          type="button"
          class="ui-editor-card__toggle"
          @click.stop="toggleOpen"
        >
          <component :is="RightOutlined" :class="{ 'is-expanded': openModel }" />
        </button>
      </div>
    </header>

    <div v-show="openModel" class="ui-editor-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" v-show="openModel" class="ui-editor-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script lang="ts" setup>
import { RightOutlined } from '@ant-design/icons-vue'

defineOptions({
  name: 'UiEditorCard',
})

const openModel = defineModel<boolean>('open', { default: true })

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    collapsible?: boolean
    togglePosition?: 'left' | 'right'
  }>(),
  {
    title: '',
    subtitle: '',
    collapsible: true,
    togglePosition: 'right',
  },
)

const emit = defineEmits<{
  (e: 'toggle', value: boolean): void
}>()

const toggleOpen = () => {
  if (!props.collapsible) return
  openModel.value = !openModel.value
  emit('toggle', openModel.value)
}

const handleToggle = () => {
  if (!props.collapsible) return
  toggleOpen()
}
</script>

<style scoped>
.ui-editor-card {
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.ui-editor-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  background: var(--dp-surface);
  border-bottom: 1px solid transparent;
}

.ui-editor-card__header.is-clickable {
  cursor: pointer;
}

.ui-editor-card--open .ui-editor-card__header {
  border-bottom-color: var(--dp-border);
}

.ui-editor-card__leading {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ui-editor-card__handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--dp-radius-control-inner);
  color: var(--dp-text-muted);
  background: var(--dp-surface-subtle);
  border: 1px solid var(--dp-border);
  flex-shrink: 0;
}

.ui-editor-card__main {
  min-width: 0;
  flex: 1;
}

.ui-editor-card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ui-editor-card__title-wrap {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.ui-editor-card__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--dp-text-primary);
}

.ui-editor-card__subtitle {
  font-size: 13px;
  color: var(--dp-text-muted);
}

.ui-editor-card__meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.ui-editor-card__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.ui-editor-card__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control-inner);
  background: #fff;
  color: var(--dp-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ui-editor-card__toggle :deep(.anticon.is-expanded) {
  transform: rotate(90deg);
}

.ui-editor-card__toggle:hover {
  border-color: var(--dp-border-strong);
  background: var(--dp-surface-subtle);
  color: var(--dp-text-primary);
}

.ui-editor-card__body {
  padding: 18px;
}

.ui-editor-card__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 18px 18px;
}

@media (max-width: 1080px) {
  .ui-editor-card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .ui-editor-card__leading,
  .ui-editor-card__actions {
    width: 100%;
  }

  .ui-editor-card__title-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .ui-editor-card__meta {
    justify-content: flex-start;
  }

  .ui-editor-card__actions {
    justify-content: flex-start;
  }
}
</style>
