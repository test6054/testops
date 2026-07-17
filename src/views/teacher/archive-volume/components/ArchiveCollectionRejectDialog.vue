<script setup lang="ts">
import { ref, watch } from 'vue'
import { rejectArchiveVolumeCollection } from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'

const props = defineProps<{
  open: boolean
  volumeId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "rejected": []
}>()

const reason = ref('')
const submitting = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) reason.value = ''
  },
)

async function submit() {
  if (submitting.value) return
  const trimmed = reason.value.trim()
  if (!trimmed) {
    showFormValidationMessage('请填写驳回原因')
    return
  }
  submitting.value = true
  try {
    await rejectArchiveVolumeCollection({ volumeId: props.volumeId, rejectReason: trimmed })
    emit('update:open', false)
    emit('rejected')
  } catch (error) {
    showUserError(error, '驳回收材失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UiDialog
    :open="open"
    title="驳回收材"
    ok-text="确认驳回"
    cancel-text="取消"
    :confirm-loading="submitting"
    destroy-on-close
    @update:open="emit('update:open', $event)"
    @ok="submit"
  >
    <p class="archive-collection-reject__hint">
      驳回后卷将回到收集中，协作组成员会收到站内信通知并需补扫补交后重新提交。
    </p>
    <UiFormItem label="驳回原因" required>
      <UiTextarea
        size="sm"
        v-model="reason"
        :rows="4"
        :maxlength="500"
        :show-count="true"
        placeholder="例如：缺页、扫描模糊、材料类型不符"
      />
    </UiFormItem>
    <template #footer>
      <UiButton
        size="sm"
        variant="outline"
        :disabled="submitting"
        @click="emit('update:open', false)"
      >
        取消
      </UiButton>
      <UiButton size="sm" variant="primary" :loading="submitting" @click="submit">
        确认驳回
      </UiButton>
    </template>
  </UiDialog>
</template>

<style scoped>
.archive-collection-reject__hint {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
}
</style>
