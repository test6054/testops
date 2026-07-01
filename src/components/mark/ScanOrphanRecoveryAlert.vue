<template>
  <div v-if="visible || failureItems.length > 0" class="scan-orphan-recovery">
    <UiAlertStrip
      v-if="visible"
      tone="warning"
      :closable="false"
      dense
      title="存在未绑定批次的扫描事件"
      :description="description"
    >
      <template v-if="isExamOwner" #actions>
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

    <UiAlertStrip
      v-if="failureItems.length > 0"
      tone="error"
      :closable="true"
      dense
      title="部分设备分组补救失败"
      class="scan-orphan-recovery__failure"
      @close="clearFailures"
    >
      <p class="scan-orphan-recovery__failure-summary">{{ failureSummary }}</p>
      <ul class="scan-orphan-recovery__failure-list">
        <li v-for="item in failureItems" :key="failureItemKey(item)">
          {{ formatFailureItem(item) }}
        </li>
      </ul>
    </UiAlertStrip>
  </div>
</template>

<script lang="ts" setup>
import type { ExamScannerBatchRecoverOrphanFailureVO } from '@/apis/mark/exam-scan'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { recoverOrphanScanEvents } from '@/apis/mark/exam-scan'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useExamOwnerPermission } from '@/composables/useExamOwnerPermission'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
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

const { selectedExam } = useMarkExamContext()
const { isExamOwner } = useExamOwnerPermission(selectedExam)

const recovering = ref(false)
const failureItems = ref<ExamScannerBatchRecoverOrphanFailureVO[]>([])

const visible = computed(() => props.orphanPendingEventCount > 0)

const canRecover = computed(() =>
  Boolean(props.examId) && props.orphanPendingEventCount > 0 && isExamOwner.value,
)

const description = computed(() => {
  const scope = `${props.orphanPendingEventCount} 条事件、${props.orphanPendingPageCount} 页尚未归入扫描批次`
  if (isExamOwner.value) {
    return `${scope}，可按扫描设备自动聚合补救。`
  }
  return `${scope}，请联系考试主考老师执行补救。`
})

const failureSummary = computed(() =>
  `${failureItems.value.length} 个设备分组未成功聚合，请检查 Agent 端点或扫描时间后重试。`,
)

watch(() => props.examId, () => {
  failureItems.value = []
})

function failureItemKey(item: ExamScannerBatchRecoverOrphanFailureVO): string {
  return `${item.scannerDeviceId}-${item.scannerStationId ?? ''}`
}

function formatFailureItem(item: ExamScannerBatchRecoverOrphanFailureVO): string {
  const deviceLabel = item.scannerStationId
    ? `${item.scannerDeviceId} / ${item.scannerStationId}`
    : item.scannerDeviceId
  const scopeText = item.eventCount != null
    ? `（${item.eventCount} 条事件${item.pageCount != null ? `，${item.pageCount} 页` : ''}）`
    : ''
  return `${deviceLabel}${scopeText}：${item.failureMessage}`
}

function clearFailures(): void {
  failureItems.value = []
}

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
    failureItems.value = response.failedGroups ?? []
    if (successCount > 0 && failCount > 0) {
      message.warning(`已补救 ${successCount} 个设备分组，${failCount} 个分组失败`)
    } else if (successCount > 0) {
      message.success(`已补救 ${successCount} 个扫描批次`)
    } else if (failCount > 0) {
      message.error(`补救失败：${failCount} 个设备分组无法聚合`)
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

<style lang="scss" scoped>
.scan-orphan-recovery__failure {
  margin-top: 8px;
}

.scan-orphan-recovery__failure-summary {
  margin: 0 0 4px;
  color: var(--ant-color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.scan-orphan-recovery__failure-list {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--ant-color-text);
  font-size: 13px;
  line-height: 1.6;
}
</style>
