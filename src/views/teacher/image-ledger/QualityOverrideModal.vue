<template>
  <a-modal
    :open="open" title="质检覆盖" :confirm-loading="submitting" :mask-closable="false"
    width="520px" @update:open="$emit('update:open', $event)" @ok="handleOk"
  >
    <a-form layout="vertical">
      <a-alert
        type="warning" show-icon style="margin-bottom: 12px"
        message="质检覆盖会强制放行或阻断目标，操作会落入审计日志。"
      />
      <a-form-item label="覆盖目标类型">
        <a-input :value="targetTypeLabel" disabled />
      </a-form-item>
      <a-form-item label="覆盖目标 ID">
        <a-input :value="targetId" disabled />
      </a-form-item>
      <a-form-item label="覆盖类型" required>
        <a-select v-model:value="form.overrideType" :options="overrideOptions" placeholder="请选择覆盖类型" />
      </a-form-item>
      <a-form-item label="风险原因" required>
        <a-textarea
          v-model:value="form.riskReason" :rows="3" :max-length="200" show-count
          placeholder="请填写风险原因"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import type { OverrideTargetType, OverrideType } from '@/apis/mark/image-ledger'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { submitQualityOverride } from '@/apis/mark/image-ledger'

defineOptions({ name: 'QualityOverrideModal' })

const props = defineProps<{
  open: boolean
  examId: string
  targetType: OverrideTargetType
  targetId: string
}>()
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submitted'): void
}>()

const submitting = ref(false)
const form = reactive<{ overrideType?: OverrideType, riskReason: string }>({
  overrideType: undefined,
  riskReason: '',
})

const overrideOptions: { label: string, value: OverrideType }[] = [
  { label: '质检通过 (QUALITY_PASS)', value: 'QUALITY_PASS' },
  { label: '强制推进 (FORCE_PROCEED)', value: 'FORCE_PROCEED' },
  { label: '阻断确认 (BLOCK_CONFIRM)', value: 'BLOCK_CONFIRM' },
]

const targetTypeLabelMap: Record<OverrideTargetType, string> = {
  PAGE: '扫描页',
  BATCH: '扫描批次',
  PAPER_INSTANCE: '试卷实例',
}
const targetTypeLabel = computed(() => targetTypeLabelMap[props.targetType] || props.targetType)

watch(() => props.open, (v) => {
  if (v) {
    form.overrideType = undefined
    form.riskReason = ''
  }
})

async function handleOk(): Promise<void> {
  if (!form.overrideType) {
    message.warning('请选择覆盖类型')
    return
  }
  const reason = form.riskReason.trim()
  if (!reason) {
    message.warning('请填写风险原因')
    return
  }
  if (!props.examId || !props.targetId) {
    message.warning('考试或目标信息缺失')
    return
  }
  submitting.value = true
  try {
    await submitQualityOverride({
      examId: props.examId,
      targetType: props.targetType,
      targetId: props.targetId,
      overrideType: form.overrideType,
      riskReason: reason,
    })
    message.success('质检覆盖已提交')
    emit('update:open', false)
    emit('submitted')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '覆盖提交失败')
  } finally {
    submitting.value = false
  }
}
</script>
