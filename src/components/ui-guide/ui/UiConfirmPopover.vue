<template>
  <UiPopoverPanel
    :open="mergedOpen"
    :title="props.title"
    :description="props.description"
    :trigger="props.disabled ? [] : props.trigger"
    :placement="props.placement"
    :max-width="props.maxWidth"
    compact
    @update:open="setOpen"
  >
    <slot />

    <template v-if="$slots.content" #content>
      <div class="ui-confirm-popover__content">
        <slot name="content" />
      </div>
    </template>

    <template #footer>
      <UiButton size="sm" variant="outline" @click="handleCancel">
        {{ props.cancelText }}
      </UiButton>
      <UiButton
        size="sm"
        :status="props.danger ? 'danger' : 'normal'"
        :loading="props.confirmLoading"
        @click="handleConfirm"
      >
        {{ props.confirmText }}
      </UiButton>
    </template>
  </UiPopoverPanel>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import UiButton from './Button.vue'
import UiPopoverPanel from './UiPopoverPanel.vue'

type PopoverTrigger = 'hover' | 'focus' | 'click' | 'contextmenu'
type PopoverPlacement
  = | 'topLeft'
    | 'top'
    | 'topRight'
    | 'leftTop'
    | 'left'
    | 'leftBottom'
    | 'rightTop'
    | 'right'
    | 'rightBottom'
    | 'bottomLeft'
    | 'bottom'
    | 'bottomRight'

defineOptions({
  name: 'UiConfirmPopover',
})

const props = withDefaults(
  defineProps<{
    open?: boolean
    title?: string
    description?: string
    confirmText?: string
    cancelText?: string
    confirmLoading?: boolean
    danger?: boolean
    disabled?: boolean
    trigger?: PopoverTrigger[]
    placement?: PopoverPlacement
    maxWidth?: string | number
    autoCloseOnConfirm?: boolean
  }>(),
  {
    open: undefined,
    title: '请确认操作',
    description: '',
    confirmText: '确认',
    cancelText: '取消',
    confirmLoading: false,
    danger: false,
    disabled: false,
    trigger: () => ['click'],
    placement: 'top',
    maxWidth: 320,
    autoCloseOnConfirm: true,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const uncontrolledOpen = ref(false)

const mergedOpen = computed(() => {
  return props.open ?? uncontrolledOpen.value
})

const setOpen = (value: boolean) => {
  if (props.open === undefined) uncontrolledOpen.value = value

  emit('update:open', value)
}

const handleCancel = () => {
  setOpen(false)
  emit('cancel')
}

const handleConfirm = () => {
  emit('confirm')

  if (props.autoCloseOnConfirm && !props.confirmLoading) setOpen(false)
}
</script>

<style scoped>
.ui-confirm-popover__content {
  font-size: 13px;
  line-height: 1.7;
  color: var(--dp-text-secondary, #475569);
}
</style>
