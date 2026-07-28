<script setup lang="ts">
import type { QualityLongFormDraftStatus } from '@/composables/useQualityLongFormDraftSession'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { formatTimeOfDay } from '@/utils/format'

defineOptions({ name: 'QualityFormDraftStatusStrip' })

const props = withDefaults(
  defineProps<{
    status: QualityLongFormDraftStatus
    visible?: boolean
    localSavedAt?: number | null
    serverSavedAt?: number | null
    errorMessage?: string
    saving?: boolean
  }>(),
  {
    visible: false,
    localSavedAt: null,
    serverSavedAt: null,
    errorMessage: '',
    saving: false,
  },
)

const emit = defineEmits<{
  'save-now': []
}>()

const tone = computed(() => {
  if (props.status === 'server_saved') return 'success'
  if (props.status === 'local_saved') return 'warning'
  if (props.status === 'error') return 'error'
  return 'info'
})

const title = computed(() => {
  switch (props.status) {
    case 'dirty':
      return '内容已修改'
    case 'saving_local':
      return '正在保存到本机'
    case 'local_saved':
      return '已暂存到本机'
    case 'saving_server':
      return '正在同步服务端'
    case 'server_saved':
      return '已同步服务端'
    case 'error':
      return '草稿同步失败'
    default:
      return ''
  }
})

const description = computed(() => {
  if (props.errorMessage) return props.errorMessage
  if (props.status === 'dirty') return '即将自动保存'
  if (props.status === 'local_saved') {
    return props.localSavedAt
      ? `本机保存于 ${formatTimeOfDay(props.localSavedAt)}`
      : '本机草稿已保留，尚未同步服务端'
  }
  if (props.status === 'server_saved') {
    return props.serverSavedAt
      ? `服务端保存于 ${formatTimeOfDay(props.serverSavedAt)}`
      : '服务端草稿已更新'
  }
  if (props.status === 'error' && props.localSavedAt) {
    return `本机草稿保留于 ${formatTimeOfDay(props.localSavedAt)}`
  }
  return ''
})

const canSaveNow = computed(() =>
  props.status === 'dirty'
  || props.status === 'local_saved'
  || props.status === 'error',
)
</script>

<template>
  <UiAlertStrip
    v-if="visible && status !== 'idle'"
    class="quality-form-draft-status"
    :tone="tone"
    :title="title"
    :description="description"
    size="sm"
    dense
    aria-live="polite"
  >
    <template v-if="canSaveNow" #actions>
      <UiButton
        size="sm"
        variant="outline"
        :loading="saving"
        @click="emit('save-now')"
      >
        <template #icon><SaveOutlined /></template>
        立即保存
      </UiButton>
    </template>
  </UiAlertStrip>
</template>

<style scoped>
.quality-form-draft-status {
  margin-bottom: var(--dp-space-component);
}
</style>
