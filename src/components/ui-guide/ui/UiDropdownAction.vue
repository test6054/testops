<template>
  <span ref="dropdownRoot" class="ui-dropdown-action">
    <a-dropdown
      :trigger="props.trigger"
      :placement="props.placement"
      :get-popup-container="getPopupContainer"
      overlay-class-name="ui-dropdown-action-overlay"
      v-bind="$attrs"
    >
      <slot name="trigger">
        <UiButton
          v-if="props.triggerStyle === 'button'"
          size="sm"
          variant="outline"
          class="ui-dropdown-action__trigger"
          :disabled="props.disabled"
        >
          <template #icon>
            <MoreOutlined />
          </template>
          {{ props.buttonText }}
        </UiButton>
        <UiActionLink v-else :text="props.buttonText" :disabled="props.disabled">
          <template #suffix>
            <DownOutlined class="ui-dropdown-action__arrow" />
          </template>
        </UiActionLink>
      </slot>
      <template #overlay>
        <a-menu class="ui-dropdown-action__menu" @click="handleMenuClick">
          <template v-for="item in props.items" :key="item.key">
            <a-menu-divider v-if="item.type === 'divider'" />
            <a-menu-item v-else :key="item.key" :disabled="item.disabled" :danger="item.danger">
              {{ item.label }}
            </a-menu-item>
          </template>
        </a-menu>
      </template>
    </a-dropdown>
  </span>
</template>

<script lang="ts" setup>
import type { DropdownProps } from 'ant-design-vue/es/dropdown/dropdown'
import type { UiDropdownActionItem } from './types'
import { DownOutlined, MoreOutlined } from '@ant-design/icons-vue'
import { ref } from 'vue'
import UiButton from './Button.vue'
import { resolvePopupContainer } from './popup-container'
import UiActionLink from './UiActionLink.vue'

defineOptions({
  name: 'UiDropdownAction',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    items?: UiDropdownActionItem[]
    buttonText?: string
    disabled?: boolean
    trigger?: DropdownProps['trigger']
    triggerStyle?: 'text' | 'button'
    placement?: 'bottomLeft' | 'bottomCenter' | 'bottomRight' | 'topLeft' | 'topCenter' | 'topRight'
  }>(),
  {
    items: () => [],
    buttonText: '更多',
    disabled: false,
    trigger: () => ['click'],
    triggerStyle: 'text',
    placement: 'bottomRight',
  },
)

const emit = defineEmits<{
  (e: 'select', key: string): void
}>()

const dropdownRoot = ref<HTMLElement>()

const getPopupContainer = () => {
  if (typeof document !== 'undefined') {
    return document.body
  }
  return dropdownRoot.value ?? resolvePopupContainer()
}

const handleMenuClick = (info: { key: string | number }) => {
  emit('select', String(info.key))
}
</script>

<style scoped>
.ui-dropdown-action {
  position: relative;
  display: inline-flex;
  max-width: 100%;
}

.ui-dropdown-action__arrow {
  font-size: 14px;
}
.ui-dropdown-action-overlay .ant-dropdown-menu {
  padding: 6px;
  border-radius: var(--dp-radius-overlay);
  box-shadow: var(--dp-shadow-dropdown);
}

.ui-dropdown-action-overlay .ant-dropdown-menu-item {
  min-width: 140px;
  min-height: 36px;
  border-radius: var(--dp-radius-control-inner);
  font-size: 13px;
  line-height: 36px;
  color: var(--dp-text-primary);
}

.ui-dropdown-action-overlay .ant-dropdown-menu-item:hover {
  background: var(--dp-blue-50);
}
</style>
