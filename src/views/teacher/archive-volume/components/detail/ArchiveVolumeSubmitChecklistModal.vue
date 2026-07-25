<script setup lang="ts">
// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
// MVR-943：can*/writeAllowed 控制流仅认 === true / !== true
import type {
  ArchiveVolumeSelfCheckConfirmRequest,
  ArchiveVolumeSignOffRoleCode,
  ArchiveVolumeSubmitChecklistResponse,
} from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  ALL_ARCHIVE_VOLUME_SIGN_OFF_ROLE_CODES,
  confirmArchiveVolumeSelfCheck,
  previewArchiveVolumeSubmitChecklist,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { ArchiveVolumeSubmitChecklistDimensionCode } from '@/types/enums/archive-volume-submit-checklist-dimension-enum'
import { showUserError } from '@/utils/error-handler'

import ArchiveVolumeSubmitTaskList from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitTaskList.vue'

const props = withDefaults(
  defineProps<{
  open: boolean
  volumeId: string
  /** MVR-305：与 capabilities.canSelfCheck 对齐 */
  canConfirmSelfCheck?: boolean // MVR-940: optional BE 能力位写路径仅认 === true
}>(),
  {
  canConfirmSelfCheck: false,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  "confirmed": []
}>()

const loading = ref(false)
const loadFailed = ref(false)
const submitting = ref(false)
const checklist = ref<ArchiveVolumeSubmitChecklistResponse | null>(null)
const materialCompleteConfirmed = ref(false)
const gradingNormConfirmed = ref(false)
const reason = ref('')
const signOffState = ref<
  Record<ArchiveVolumeSignOffRoleCode, { confirmed: boolean, signatoryName: string }>
>({
  PROPOSER: { confirmed: false, signatoryName: '' },
  REVIEWER: { confirmed: false, signatoryName: '' },
  GRADER: { confirmed: false, signatoryName: '' },
  SCORER: { confirmed: false, signatoryName: '' },
  RECHECKER: { confirmed: false, signatoryName: '' },
})
let loadSequence = 0

const baseBlockingItems = computed(
  () =>
    checklist.value?.blockingItems?.filter(
      (item) =>
        !item.passed
        && item.dimension !== ArchiveVolumeSubmitChecklistDimensionCode.DEPARTMENT_REVIEW,
    ) ?? [],
)

const formSignOffReady = computed(() => {
  const items = checklist.value?.signOffItems ?? []
  if (items.length !== ALL_ARCHIVE_VOLUME_SIGN_OFF_ROLE_CODES.length) return false
  return ALL_ARCHIVE_VOLUME_SIGN_OFF_ROLE_CODES.every(
    (role) =>
      signOffState.value[role].confirmed === true
      && signOffState.value[role].signatoryName.trim().length > 0,
  )
})

const sameScorerAndRechecker = computed(() => {
  const scorer = signOffState.value.SCORER.signatoryName.trim()
  const rechecker = signOffState.value.RECHECKER.signatoryName.trim()
  if (!scorer || !rechecker) return false
  return scorer.localeCompare(rechecker, undefined, { sensitivity: 'accent' }) === 0
})

const canConfirm = computed(() => {
  if (!checklist.value) return false
  if (checklist.value.baseReady !== true) return false
  if (materialCompleteConfirmed.value !== true || gradingNormConfirmed.value !== true) return false
  if (formSignOffReady.value !== true) return false
  if (sameScorerAndRechecker.value) return false
  return true
})

watch(
  () => [props.open, props.volumeId] as const,
  ([open, volumeId]) => {
    if (!open) {
      loadSequence += 1
      checklist.value = null
      loadFailed.value = false
      return
    }
    void loadChecklist(volumeId)
  },
)

async function loadChecklist(volumeId = props.volumeId) {
  const requestSequence = ++loadSequence
  loading.value = true
  loadFailed.value = false
  try {
    const data = await previewArchiveVolumeSubmitChecklist(volumeId)
    if (requestSequence !== loadSequence || !props.open || volumeId !== props.volumeId) return
    checklist.value = data
    resetFormFromChecklist(data)
  } catch (error) {
    if (requestSequence !== loadSequence || !props.open || volumeId !== props.volumeId) return
    checklist.value = null
    loadFailed.value = true
    showUserError(error, '加载提交自查清单失败')
  } finally {
    if (requestSequence === loadSequence) {
      loading.value = false
    }
  }
}

function resetFormFromChecklist(data: ArchiveVolumeSubmitChecklistResponse) {
  materialCompleteConfirmed.value = false
  gradingNormConfirmed.value = false
  reason.value = ''
  for (const role of ALL_ARCHIVE_VOLUME_SIGN_OFF_ROLE_CODES) {
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
  if (submitting.value === true) return
  // MVR-305：权限闸优先于表单就绪 canConfirm
  if (props.canConfirmSelfCheck !== true) {
    void message.warning('当前账号无提交前自查确认权限')
    return
  }
  if (canConfirm.value !== true) return
  if (!checklist.value?.checklistVersion) {
    void message.error('清单版本缺失，请重新打开')
    return
  }
  const request: ArchiveVolumeSelfCheckConfirmRequest = {
    volumeId: props.volumeId,
    checklistVersion: checklist.value.checklistVersion,
    materialCompleteConfirmed: materialCompleteConfirmed.value,
    gradingNormConfirmed: gradingNormConfirmed.value,
    reason: reason.value.trim() || undefined,
    signOffItems: ALL_ARCHIVE_VOLUME_SIGN_OFF_ROLE_CODES.map((role) => ({
      role,
      confirmed: signOffState.value[role].confirmed,
      signatoryName: signOffState.value[role].signatoryName.trim(),
    })),
  }
  submitting.value = true
  try {
    await confirmArchiveVolumeSelfCheck(request)
    void message.success('自查确认已保存')
    emit('confirmed')
    close()
  } catch (error) {
    showUserError(error, '保存自查确认失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UiDrawer
    :open="open"
    title="提交前自查与签字确认"
    :width="640"
    :hide-footer="false"
    @update:open="emit('update:open', $event)"
    @close="close"
  >
    <UiSkeletonState v-if="loading" variant="card" compact />
    <UiEmpty
      size="sm"
      v-else-if="loadFailed"
      title="提交自查清单加载失败"
      description="无法读取最新提交前置，请重新加载后再确认。"
      action-label="重新加载"
      @action="loadChecklist()"
    />
    <template v-else-if="checklist">
      <UiAlertStrip
        v-if="baseBlockingItems.length"
        tone="warning"
        title="以下项尚未满足提交前置"
        dense
        class="submit-checklist-modal__alert"
      />
      <ArchiveVolumeSubmitTaskList
        v-if="baseBlockingItems.length"
        :items="baseBlockingItems"
        readonly
        class="submit-checklist-modal__tasks"
      />
      <UiCheckbox v-model="materialCompleteConfirmed">材料齐全性已核对</UiCheckbox>
      <UiCheckbox v-model="gradingNormConfirmed" class="submit-checklist-modal__check">
        阅卷规范性已核对
      </UiCheckbox>
      <div class="submit-checklist-modal__signoff">
        <div
          v-for="item in checklist.signOffItems"
          :key="item.role"
          class="submit-checklist-modal__signoff-row"
        >
          <UiCheckbox v-model="signOffState[item.role].confirmed">
            {{ item.roleLabel }}签字齐全
          </UiCheckbox>
          <UiInput
            v-model="signOffState[item.role].signatoryName"
            placeholder="签字人姓名"
            size="sm"
            clearable
            :maxlength="64"
          />
        </div>
      </div>
      <UiAlertStrip
        v-if="sameScorerAndRechecker"
        tone="warning"
        title="统分人与复核人不得为同一人"
        dense
        class="submit-checklist-modal__alert"
      />
      <UiTextarea
        size="sm"
        v-model="reason"
        placeholder="自查说明（可选）"
        :rows="2"
        :maxlength="500"
        :show-count="true"
      />
    </template>
    <template #footer>
      <UiButton size="sm" variant="outline" @click="close">取消</UiButton>
      <UiButton
        size="sm"
        variant="primary"
        :loading="submitting === true"
        :disabled="loading === true || loadFailed === true || canConfirm !== true || canConfirmSelfCheck !== true"
        @click="handleConfirm"
      >
        确认自查
      </UiButton>
    </template>
  </UiDrawer>
</template>

<style scoped>
.submit-checklist-modal__alert {
  margin-bottom: 12px;
}

.submit-checklist-modal__tasks {
  margin-bottom: 12px;
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
