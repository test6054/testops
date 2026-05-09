<template>
  <a-modal
    :open="open" title="提交影像修复" :confirm-loading="submitting" :mask-closable="false"
    width="520px" @update:open="$emit('update:open', $event)" @ok="handleOk"
  >
    <a-form layout="vertical">
      <a-alert
        type="info" show-icon style="margin-bottom: 12px"
        message="提交修复后会落库 ExamRepairAction 并保留原图哈希链。"
      />
      <a-form-item label="扫描页 ID">
        <a-input :value="pageId" disabled />
      </a-form-item>
      <a-form-item label="修复类型" required>
        <a-select v-model:value="form.repairType" :options="typeOptions" placeholder="请选择修复类型" />
      </a-form-item>
      <a-form-item label="修复后文件 ID">
        <a-input v-model:value="form.afterFileId" placeholder="重扫 / 处理后的文件 ID（可选）" />
      </a-form-item>
      <a-form-item label="修复原因" required>
        <a-textarea
          v-model:value="form.repairReason" :rows="3" :max-length="200" show-count
          placeholder="请填写修复原因"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import type { RepairTypeCode } from '@/apis/mark/image-ledger'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
import { REPAIR_TYPE_LABEL, submitRepairAction } from '@/apis/mark/image-ledger'

defineOptions({ name: 'RepairModal' })

const props = defineProps<{ open: boolean, examId: string, pageId: string }>()
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submitted'): void
}>()

const submitting = ref(false)
const form = reactive<{ repairType?: RepairTypeCode, afterFileId?: string, repairReason: string }>({
  repairType: undefined,
  afterFileId: '',
  repairReason: '',
})

const typeOptions = (Object.keys(REPAIR_TYPE_LABEL) as RepairTypeCode[]).map(c => ({
  label: REPAIR_TYPE_LABEL[c],
  value: c,
}))

watch(() => props.open, (v) => {
  if (v) {
    form.repairType = undefined
    form.afterFileId = ''
    form.repairReason = ''
  }
})

async function handleOk(): Promise<void> {
  if (!form.repairType) {
    message.warning('请选择修复类型')
    return
  }
  const reason = form.repairReason.trim()
  if (!reason) {
    message.warning('请填写修复原因')
    return
  }
  if (!props.examId || !props.pageId) {
    message.warning('考试或页面信息缺失')
    return
  }
  submitting.value = true
  try {
    await submitRepairAction({
      examId: props.examId,
      pageId: props.pageId,
      repairType: form.repairType,
      afterFileId: form.afterFileId?.trim() || undefined,
      repairReason: reason,
    })
    message.success('修复动作已提交')
    emit('update:open', false)
    emit('submitted')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '修复提交失败')
  } finally {
    submitting.value = false
  }
}
</script>
