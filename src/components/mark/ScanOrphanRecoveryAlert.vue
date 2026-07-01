<template>
  <UiAlertStrip
    v-if="visible"
    tone="warning"
    :closable="false"
    dense
    title="存在未绑定批次的扫描事件"
    :description="description"
  >
    <template #actions>
      <UiButton
        size="sm"
        variant="primary"
        :loading="recovering"
        :disabled="!canRecover"
        @click="handleRecover"
      >
        一键补救
      </UiButton>
    </template>
  </UiAlertStrip>
</template>

<script lang="ts" setup>
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { recoverOrphanScanEvents } from '@/apis/mark/exam-scan'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'ScanOrphanRecoveryAlert' })

const props = defineProps<{
  examId: string
  orphanPendingEventCount: number
  orphanPendingPageCount: number
}>()

const emit = defineEmits<{
  recovered: []
}>()

const recovering = ref(false)

const visible = computed(() => props.orphanPendingEventCount > 0)

const canRecover = computed(() => Boolean(props.examId) && props.orphanPendingEventCount > 0)

const description = computed(() =>
  `${props.orphanPendingEventCount} 条事件、${props.orphanPendingPageCount} 页尚未归入扫描批次，可按扫描设备自动聚合补救。`,
)

async function handleRecover(): Promise<void> {
  if (!canRecover.value) {
    return
  }
  const confirmed = await confirmAsync({
    title: '一键补救 orphan 扫描事件',
    content: `将按扫描设备时间窗自动创建批次，聚合 ${props.orphanPendingEventCount} 条 orphan 事件（共 ${props.orphanPendingPageCount} 页）。确认继续？`,
    okText: '确认补救',
    cancelText: '取消',
    type: 'warning',
  })
  if (!confirmed) {
    return
  }
  recovering.value = true
  try {
    const response = await recoverOrphanScanEvents({ examId: props.examId })
    const successCount = response.recoveredBatches?.length ?? 0
    const failCount = response.failedGroups?.length ?? 0
    if (successCount > 0 && failCount > 0) {
      message.warning(`已补救 ${successCount} 个设备分组，${failCount} 个分组失败`)
    } else if (successCount > 0) {
      message.success(`已补救 ${successCount} 个扫描批次`)
    } else if (failCount > 0) {
      const firstFailure = response.failedGroups?.[0]?.failureMessage
      message.error(firstFailure ? `补救失败：${firstFailure}` : `补救失败：${failCount} 个设备分组无法聚合`)
    } else {
      message.info('未发现可补救的 orphan 事件')
    }
    emit('recovered')
  } catch (error) {
    showUserError(error, 'orphan 扫描事件补救失败')
  } finally {
    recovering.value = false
  }
}
</script>
