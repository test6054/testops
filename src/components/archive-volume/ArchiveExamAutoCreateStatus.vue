<script lang="ts" setup>
import type { ArchiveVolumeExamGateResponse } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { useExamArchiveGateHint } from '@/composables/useExamArchiveGateHint'

defineOptions({ name: 'ArchiveExamAutoCreateStatus' })

const props = defineProps<{
  examGate: ArchiveVolumeExamGateResponse | null
  pollTimedOut: boolean
  hasAutoCreateFailure: boolean
  autoCreateFailedDescription: string
  showRetryAutoCreate: boolean
  pendingRetryDescription: string
  showNonOwnerHint: boolean
  autoCreateFailedNeedsClassScope: boolean
  retrying: boolean
  polling: boolean
}>()

const emit = defineEmits<{
  retry: []
  'go-candidate-roster': []
}>()

const gateRef = computed(() => props.examGate)
const { gateAnomaly } = useExamArchiveGateHint(gateRef)

const activeAlert = computed(() => {
  if (gateAnomaly.value) {
    return {
      tone: 'error' as const,
      title: '考试状态异常',
      description: '考试已关考但成绩未全部发布，请联系管理员处理。',
      showRetry: false,
      showRoster: false,
    }
  }
  if (props.hasAutoCreateFailure) {
    return {
      tone: 'error' as const,
      title: '自动建卷失败',
      description: props.autoCreateFailedDescription,
      showRetry: props.showRetryAutoCreate && !props.autoCreateFailedNeedsClassScope,
      showRoster: props.autoCreateFailedNeedsClassScope,
    }
  }
  if (props.pollTimedOut) {
    return {
      tone: 'warning' as const,
      title: '建卷仍在进行',
      description: '系统仍在后台创建归档卷，可点击刷新查看进度。',
      showRetry: false,
      showRoster: false,
    }
  }
  if (props.showRetryAutoCreate) {
    return {
      tone: 'warning' as const,
      title: '自动建卷待处理',
      description: props.pendingRetryDescription,
      showRetry: true,
      showRoster: false,
    }
  }
  if (props.showNonOwnerHint) {
    return {
      tone: 'info' as const,
      title: '等待主考处理',
      description: '自动建卷需由考试主考老师重新触发，请联系主考老师处理。',
      showRetry: false,
      showRoster: false,
    }
  }
  return null
})
</script>

<template>
  <UiAlertStrip
    v-if="activeAlert"
    :tone="activeAlert.tone"
    :title="activeAlert.title"
    :description="activeAlert.description"
    dense
    class="archive-exam-auto-create-status"
  >
    <template v-if="activeAlert.showRoster" #actions>
      <UiButton variant="primary" size="sm" @click="emit('go-candidate-roster')">
        前往考生名册修正班级
      </UiButton>
    </template>
    <template v-else-if="activeAlert.showRetry" #actions>
      <UiButton variant="primary" size="sm" :loading="retrying || polling" @click="emit('retry')">
        重新触发自动建卷
      </UiButton>
    </template>
  </UiAlertStrip>
</template>

<style scoped>
.archive-exam-auto-create-status {
  margin-top: var(--dp-space-3);
}
</style>
