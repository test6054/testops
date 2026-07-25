<script setup lang="ts">
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'

defineOptions({ name: 'PortfolioArchiveWriteGuardStrip' })

const props = withDefaults(
  defineProps<{
    blocked: boolean
    capabilityUnknown?: boolean
    message: string
    loading?: boolean
  }>(),
  {
    capabilityUnknown: false,
    loading: false,
  },
)

const emit = defineEmits<{
  confirm: []
}>()
</script>

<template>
  <UiAlertStrip
    v-if="props.blocked"
    tone="warning"
    :title="props.capabilityUnknown ? '教师状态未知 · 写操作已阻断' : '档案已封存写禁'"
    :description="props.message"
    class="mb-3"
  >
    <template v-if="props.capabilityUnknown" #actions>
      <UiButton
        size="sm"
        variant="outline"
        :loading="props.loading"
        @click="emit('confirm')"
      >
        重新确认教师状态
      </UiButton>
    </template>
  </UiAlertStrip>
</template>
