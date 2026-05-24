<template>
  <a-modal
    :open="open"
    title="处置重复影像"
    :confirm-loading="submitting"
    :mask-closable="false"
    width="600px"
    @update:open="$emit('update:open', $event)"
    @ok="handleOk"
  >
    <a-form layout="vertical">
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 12px"
        message="教师需要在重复影像的两份试卷实例中选择保留一份，处置后未保留的试卷实例由教师在扫描异常页主动作废。"
      />
      <a-alert
        v-if="submitError"
        type="error"
        show-icon
        style="margin-bottom: 12px"
        :message="submitError"
      />
      <a-form-item label="页面哈希">
        <a-input :value="resolution?.pageHash ?? '-'" disabled />
      </a-form-item>
      <a-form-item label="基准扫描页 / 试卷实例">
        <a-input
          :value="`页ID=${resolution?.firstPageId ?? '-'}，试卷=${resolution?.firstPaperInstanceId ?? '-'}`"
          disabled
        />
      </a-form-item>
      <a-form-item label="重复扫描页 / 试卷实例">
        <a-input
          :value="`页ID=${resolution?.secondPageId ?? '-'}，试卷=${resolution?.secondPaperInstanceId ?? '-'}`"
          disabled
        />
      </a-form-item>
      <a-form-item label="保留的试卷实例" required>
        <a-radio-group v-model:value="selectedPaperInstanceId">
          <a-radio v-if="resolution?.firstPaperInstanceId" :value="resolution.firstPaperInstanceId">
            保留基准试卷实例 {{ resolution.firstPaperInstanceId }}
          </a-radio>
          <a-radio
            v-if="resolution?.secondPaperInstanceId"
            :value="resolution.secondPaperInstanceId"
          >
            保留重复试卷实例 {{ resolution.secondPaperInstanceId }}
          </a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="处置原因" required>
        <a-textarea v-model:value="resolutionReason" :rows="3" :max-length="200" show-count />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import type { ExamPaperDuplicateResolutionVO } from '@/apis/mark/image-ledger'
import message from 'ant-design-vue/es/message'
import { ref, watch } from 'vue'
import { resolveDuplicate } from '@/apis/mark/image-ledger'

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
      selectedPaperInstanceId.value = props.resolution?.firstPaperInstanceId ?? ''
      resolutionReason.value = ''
      submitError.value = ''
    }
  },
)

async function handleOk(): Promise<void> {
  const reason = resolutionReason.value.trim()
  if (!reason) {
    submitError.value = '请填写处置原因'
    message.warning('请填写处置原因')
    return
  }
  if (!selectedPaperInstanceId.value) {
    submitError.value = '请选择保留的试卷实例'
    message.warning('请选择保留的试卷实例')
    return
  }
  if (!props.examId || !props.resolution?.id) {
    submitError.value = '考试或重复记录信息缺失'
    message.warning('考试或重复记录信息缺失')
    return
  }
  const allowedIds = [
    props.resolution.firstPaperInstanceId,
    props.resolution.secondPaperInstanceId,
  ].filter((id): id is string => Boolean(id))
  if (allowedIds.length === 0) {
    submitError.value = '当前重复记录缺少可保留的试卷实例'
    message.warning('当前重复记录缺少可保留的试卷实例')
    return
  }
  if (!allowedIds.includes(selectedPaperInstanceId.value)) {
    submitError.value = '保留的试卷实例必须来自当前重复影像记录'
    message.warning('保留的试卷实例必须来自当前重复影像记录')
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
    submitError.value = e instanceof Error ? e.message : '处置提交失败'
    message.error(submitError.value)
  } finally {
    submitting.value = false
  }
}
</script>
