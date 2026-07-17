<template>
  <UiDialog
    :open="open"
    title="处置重复影像"
    :width="600"
    :confirm-loading="submitting"
    :mask-closable="false"
    ok-text="提交"
    @update:open="$emit('update:open', $event)"
    @ok="handleOk"
  >
    <UiForm v-if="resolution" layout="vertical">
      <UiFormItem label="重复判定">
        <UiInput size="sm" model-value="两份影像内容重复，需要选择保留的试卷" disabled />
      </UiFormItem>
      <UiFormItem label="基准影像">
        <UiInput size="sm" model-value="系统识别为基准试卷影像" disabled />
      </UiFormItem>
      <UiFormItem label="重复影像">
        <UiInput size="sm" model-value="系统识别为重复试卷影像" disabled />
      </UiFormItem>
      <UiFormItem label="保留的试卷" required>
        <UiRadioGroup v-model="selectedPaperInstanceId" size="sm" block>
          <UiRadio :value="resolution.firstPaperInstanceId">保留基准试卷</UiRadio>
          <UiRadio :value="resolution.secondPaperInstanceId">保留重复试卷</UiRadio>
        </UiRadioGroup>
      </UiFormItem>
      <UiFormItem label="处置原因" required>
        <UiTextarea size="sm" v-model="resolutionReason" :rows="3" :max-length="200" :show-count="true" />
      </UiFormItem>
    </UiForm>
  </UiDialog>
</template>

<script lang="ts" setup>
import type { ExamPaperDuplicateResolutionVO } from '@/apis/mark/image-ledger'
import message from 'ant-design-vue/es/message'
import { ref, watch } from 'vue'
import { resolveDuplicate } from '@/apis/mark/image-ledger'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRadio from '@/components/ui-guide/ui/UiRadio.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import { getUserErrorMessage, showFormValidationMessage, showUserError } from '@/utils/error-handler'

defineOptions({ name: 'DuplicateResolveModal' })

const props = defineProps<{
  open: boolean
  examId: string
  resolution: ExamPaperDuplicateResolutionVO | null
}>()
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submitted'): void
}>()

const submitting = ref(false)
const selectedPaperInstanceId = ref<string>('')
const resolutionReason = ref<string>('')
const submitError = ref('')

watch(
  () => props.open,
  (v) => {
    if (v) {
      selectedPaperInstanceId.value = props.resolution ? props.resolution.firstPaperInstanceId : ''
      resolutionReason.value = ''
      submitError.value = ''
    }
  },
)

async function handleOk(): Promise<void> {
  if (submitting.value) {
    return
  }
  const reason = resolutionReason.value.trim()
  if (!reason) {
    submitError.value = '请填写处置原因'
    showFormValidationMessage('请填写处置原因')
    return
  }
  if (!selectedPaperInstanceId.value) {
    submitError.value = '请选择要保留的试卷'
    showFormValidationMessage('请选择要保留的试卷')
    return
  }
  if (!props.resolution) {
    submitError.value = '重复影像记录未加载'
    message.warning('重复影像记录未加载')
    return
  }
  const allowedIds = [props.resolution.firstPaperInstanceId, props.resolution.secondPaperInstanceId]
  if (!allowedIds.includes(selectedPaperInstanceId.value)) {
    submitError.value = '保留的试卷必须来自当前重复影像记录'
    message.warning('保留的试卷必须来自当前重复影像记录')
    return
  }
  submitting.value = true
  submitError.value = ''
  try {
    await resolveDuplicate({
      examId: props.examId,
      resolutionId: props.resolution.id,
      selectedPaperInstanceId: selectedPaperInstanceId.value,
      resolutionReason: reason,
    })
    message.success('重复影像处置已提交')
    emit('update:open', false)
    emit('submitted')
  } catch (e) {
    submitError.value = getUserErrorMessage(e, '重复影像处置提交失败')
    showUserError(e, '重复影像处置提交失败')
  } finally {
    submitting.value = false
  }
}
</script>
