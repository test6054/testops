<script setup lang="ts">
import type {
  ArchiveVolumeSelfCheckConfirmRequest,
  ArchiveVolumeSignOffRoleCode,
  ArchiveVolumeSubmitChecklistVO,
} from '@/apis/mark/archive-volume'
import {
  confirmArchiveVolumeSelfCheck,
  previewArchiveVolumeSubmitChecklist,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { showUserError } from '@/utils/error-handler'

const props = defineProps<{
  open: boolean
  volumeId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirmed: []
}>()

const loading = ref(false)
const submitting = ref(false)
const checklist = ref<ArchiveVolumeSubmitChecklistVO | null>(null)
const materialCompleteConfirmed = ref(false)
const gradingNormConfirmed = ref(false)
const reason = ref('')
const signOffState = ref<
  Record<ArchiveVolumeSignOffRoleCode, { confirmed: boolean; signatoryName: string }>
>({
  PROPOSER: { confirmed: false, signatoryName: '' },
  REVIEWER: { confirmed: false, signatoryName: '' },
  GRADER: { confirmed: false, signatoryName: '' },
  SCORER: { confirmed: false, signatoryName: '' },
  RECHECKER: { confirmed: false, signatoryName: '' },
})

const blockingItems = computed(
  () => checklist.value?.blockingItems?.filter((item) => !item.passed) ?? [],
)

const formSignOffReady = computed(() => {
  const items = checklist.value?.signOffItems ?? []
  if (items.length === 0) return true
  return items.every((item) => signOffState.value[item.role].confirmed)
})

const canConfirm = computed(() => {
  if (!checklist.value) return false
  if (checklist.value.baseReady === false) return false
  if (blockingItems.value.length > 0) return false
  if (!materialCompleteConfirmed.value || !gradingNormConfirmed.value) return false
  return formSignOffReady.value
})

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    loading.value = true
    try {
      checklist.value = await previewArchiveVolumeSubmitChecklist(props.volumeId)
      resetFormFromChecklist(checklist.value)
    } catch (error) {
      showUserError(error)
      emit('update:open', false)
    } finally {
      loading.value = false
    }
  },
)

function resetFormFromChecklist(data: ArchiveVolumeSubmitChecklistVO) {
  materialCompleteConfirmed.value = false
  gradingNormConfirmed.value = false
  reason.value = ''
  for (const role of Object.keys(signOffState.value) as ArchiveVolumeSignOffRoleCode[]) {
    signOffState.value[role] = { confirmed: false, signatoryName: '' }
  }
  for (const item of data.signOffItems ?? []) {
    signOffState.value[item.role] = {
      confirmed: item.confirmed === true,
      signatoryName: item.signatoryName ?? '',
    }
  }
}

function close() {
  emit('update:open', false)
}

async function handleConfirm() {
  if (!canConfirm.value) return
  if (!checklist.value?.checklistVersion) {
    message.error('清单版本缺失，请重新打开')
    return
  }
  const request: ArchiveVolumeSelfCheckConfirmRequest = {
    volumeId: props.volumeId,
    checklistVersion: checklist.value.checklistVersion,
    materialCompleteConfirmed: materialCompleteConfirmed.value,
    gradingNormConfirmed: gradingNormConfirmed.value,
    reason: reason.value.trim() || undefined,
    signOffItems: (Object.keys(signOffState.value) as ArchiveVolumeSignOffRoleCode[]).map(
      (role) => ({
        role,
        confirmed: signOffState.value[role].confirmed,
        signatoryName: signOffState.value[role].signatoryName.trim() || undefined,
      }),
    ),
  }
  submitting.value = true
  try {
    await confirmArchiveVolumeSelfCheck(request)
    message.success('自查确认已保存')
    emit('confirmed')
    close()
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
    title="提交前自查与签字确认"
    width="640px"
    :confirm-loading="submitting"
    ok-text="确认自查"
    cancel-text="取消"
    :ok-button-props="{ disabled: !canConfirm }"
    @cancel="close"
    @ok="handleConfirm"
  >
    <a-skeleton v-if="loading" active :paragraph="{ rows: 6 }" />
    <template v-else-if="checklist">
      <UiAlertStrip
        v-if="blockingItems.length"
        tone="warning"
        title="以下项尚未满足提交前置"
        dense
        class="submit-checklist-modal__alert"
      />
      <ul v-if="blockingItems.length" class="submit-checklist-modal__list">
        <li v-for="(item, index) in blockingItems" :key="index">{{ item.message }}</li>
      </ul>
      <a-checkbox v-model:checked="materialCompleteConfirmed">材料齐全性已核对</a-checkbox>
      <a-checkbox v-model:checked="gradingNormConfirmed" class="submit-checklist-modal__check">
        阅卷规范性已核对
      </a-checkbox>
      <div class="submit-checklist-modal__signoff">
        <div
          v-for="item in checklist.signOffItems"
          :key="item.role"
          class="submit-checklist-modal__signoff-row"
        >
          <a-checkbox v-model:checked="signOffState[item.role].confirmed">
            {{ item.roleLabel }}签字齐全
          </a-checkbox>
          <a-input
            v-model:value="signOffState[item.role].signatoryName"
            placeholder="签字人姓名"
            size="small"
            allow-clear
          />
        </div>
      </div>
      <a-textarea v-model:value="reason" placeholder="自查说明（可选）" :rows="2" />
    </template>
  </a-modal>
</template>

<style scoped>
.submit-checklist-modal__alert {
  margin-bottom: 12px;
}
.submit-checklist-modal__list {
  margin: 0 0 12px;
  padding-left: 18px;
  font-size: 14px;
  color: var(--nybc-text-secondary);
}
.submit-checklist-modal__check {
  display: block;
  margin-top: 8px;
}
.submit-checklist-modal__signoff {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.submit-checklist-modal__signoff-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 8px;
  align-items: center;
}
</style>
