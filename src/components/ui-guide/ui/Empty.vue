<template>
  <div class="ui-empty" :class="`ui-empty--${props.size}`" v-bind="$attrs">
    <div class="ui-empty__icon">
      <slot name="image">
        <svg
          class="ui-empty__default-icon"
          viewBox="0 0 64 41"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="translate(0 1)" fill="none" fill-rule="evenodd">
            <ellipse fill="#e8eef8" cx="32" cy="33" rx="32" ry="7" />
            <g fill-rule="nonzero" stroke="#cbd5e1">
              <path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
              <path
                d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z"
                fill="#fff"
              />
            </g>
          </g>
        </svg>
      </slot>
    </div>
    <div v-if="props.title || $slots.title" class="ui-empty__title">
      <slot name="title">{{ props.title }}</slot>
    </div>
    <div class="ui-empty__description">
      <slot>{{ props.description }}</slot>
    </div>
    <div v-if="$slots.action" class="ui-empty__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiEmpty' })

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  size?: 'sm' | 'md'
}>(), {
  title: '',
  description: '暂无数据',
  size: 'md',
})
</script>

<style scoped>
.ui-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 16px;
}

.ui-empty--sm {
  padding: 24px 12px;
}

.ui-empty--md {
  padding: 40px 20px;
}

.ui-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  margin-bottom: 16px;
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface-subtle, #f8fafc);
}

.ui-empty__default-icon {
  width: 64px;
  height: 41px;
}

.ui-empty__title {
  margin-bottom: 6px;
  font-size: 16px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-empty__description {
  max-width: 420px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--dp-text-muted, #6b7280);
}

.ui-empty__action {
  margin-top: 16px;
}
</style>
