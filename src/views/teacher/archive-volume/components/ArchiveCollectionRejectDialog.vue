<script setup lang="ts">
import { ref, watch } from 'vue'
import { rejectArchiveVolumeCollection } from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { showUserError } from '@/utils/error-handler'

const props = defineProps<{
  open: boolean
  volumeId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  rejected: []
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
  const trimmed = reason.value.trim()
  if (!trimmed) {
    showUserError(null, '请填写驳回原因')
    return
  }
  submitting.value = true
  try {
    await rejectArchiveVolumeCollection({ volumeId: props.volumeId, rejectReason: trimmed })
    emit('update:open', false)
    emit('rejected')
  } catch (error) {
    showUserError(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <a-modal
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
    <a-form-item label="驳回原因" required>
      <a-textarea
        v-model:value="reason"
        :rows="4"
        :maxlength="500"
        show-count
        placeholder="例如：缺页、扫描模糊、材料类型不符"
      />
    </a-form-item>
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
  </a-modal>
</template>

<style scoped>
.archive-collection-reject__hint {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--nybc-text-secondary, #666);
}
</style>
