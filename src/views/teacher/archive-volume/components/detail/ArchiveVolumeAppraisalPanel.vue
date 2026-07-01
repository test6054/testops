<template>
  <section class="archive-volume-appraisal-panel">
    <a-descriptions
      bordered
      size="small"
      :column="2"
      class="archive-volume-appraisal-panel__lifecycle"
    >
      <a-descriptions-item label="鉴定状态">
        <UiTag
          v-if="detail.volume.appraisalStatus"
          :tone="appraisalStatusTone(detail.volume.appraisalStatus)"
          size="sm"
        >
          {{ appraisalStatusLabel(detail.volume.appraisalStatus) }}
        </UiTag>
        <span v-else>—</span>
      </a-descriptions-item>
      <a-descriptions-item label="销毁状态">
        <UiTag
          v-if="detail.volume.destructionStatus"
          :tone="destructionStatusTone(detail.volume.destructionStatus)"
          size="sm"
        >
          {{ destructionStatusLabel(detail.volume.destructionStatus) }}
        </UiTag>
        <span v-else>—</span>
      </a-descriptions-item>
      <a-descriptions-item label="密级">
        {{ securityLevelLabel(detail.volume.securityLevel) }}
      </a-descriptions-item>
      <a-descriptions-item label="保管期限">
        <span v-if="detail.volume.permanentRetention">永久保管</span>
        <span v-else-if="detail.volume.retentionUntil">至 {{ detail.volume.retentionUntil }}</span>
        <span v-else-if="detail.volume.retentionYears">{{ detail.volume.retentionYears }} 年</span>
        <span v-else>—</span>
      </a-descriptions-item>
    </a-descriptions>

    <ol class="archive-volume-appraisal-panel__steps">
      <li :class="{ done: appraisalStepDone('request') }">申请鉴定</li>
      <li :class="{ done: appraisalStepDone('approve') }">鉴定审批</li>
      <li :class="{ done: appraisalStepDone('opinion') }">记录鉴定决议</li>
      <li :class="{ done: destructionStepDone('request') }">申请销毁</li>
      <li :class="{ done: destructionStepDone('approve') }">销毁审批</li>
      <li :class="{ done: destructionStepDone('execute') }">执行销毁</li>
      <li :class="{ done: destructionStepDone('supervise') }">监销确认</li>
    </ol>

    <div class="archive-volume-appraisal-panel__actions">
      <UiButton
        v-if="canRequestAppraisal"
        size="sm"
        variant="primary"
        @click="handleRequestAppraisal"
      >
        申请鉴定
      </UiButton>
      <UiButton v-if="canApproveAppraisal" size="sm" @click="handleApproveAppraisal">
        鉴定审批通过
      </UiButton>
      <UiButton v-if="canRejectAppraisal" size="sm" variant="outline" @click="openRejectAppraisal">
        鉴定驳回
      </UiButton>
      <UiButton
        v-if="canRecordAppraisalOpinion"
        size="sm"
        variant="outline"
        @click="openAppraisalOpinion"
      >
        提交鉴定决议
      </UiButton>
      <UiButton
        v-if="canRequestDestruction"
        size="sm"
        variant="outline"
        @click="openDestructionRequest"
      >
        申请销毁
      </UiButton>
      <UiButton
        v-if="canApproveDestructionAction"
        size="sm"
        @click="openDestructionApproval('APPROVED')"
      >
        批准销毁
      </UiButton>
      <UiButton
        v-if="canApproveDestructionAction"
        size="sm"
        variant="outline"
        @click="openDestructionApproval('REJECTED')"
      >
        驳回销毁
      </UiButton>
      <UiButton v-if="canExecuteDestruction" size="sm" @click="handleExecuteDestruction">
        执行销毁
      </UiButton>
      <UiButton
        v-if="canSuperviseDestruction"
        size="sm"
        variant="outline"
        @click="openSuperviseModal"
      >
        监销确认
      </UiButton>
    </div>

    <a-modal
      v-model:open="appraisalModalOpen"
      title="鉴定决议"
      :confirm-loading="appraisalSubmitting"
      ok-text="提交"
      cancel-text="取消"
      @ok="submitAppraisalOpinion"
    >
      <a-form layout="vertical">
        <a-form-item label="决议" required>
          <a-radio-group v-model:value="appraisalForm.decision">
            <a-radio value="RETAIN">继续保留</a-radio>
            <a-radio value="DESTROY">可销毁</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="appraisalForm.decision === 'RETAIN'" label="延长保管（年）">
          <a-input-number
            :value="appraisalForm.retentionExtensionYears"
            :min="1"
            :disabled="appraisalForm.permanentRetention"
            style="width: 100%"
            @update:value="syncAppraisalRetentionYears"
          />
        </a-form-item>
        <a-form-item v-if="appraisalForm.decision === 'RETAIN'">
          <a-checkbox v-model:checked="appraisalForm.permanentRetention">永久保管</a-checkbox>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="appraisalForm.remark" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="destructionModalOpen"
      title="申请销毁"
      :confirm-loading="destructionSubmitting"
      ok-text="提交"
      cancel-text="取消"
      @ok="submitDestructionRequest"
    >
      <a-form layout="vertical">
        <a-form-item label="销毁原因" required>
          <a-textarea v-model:value="destructionReason" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="rejectAppraisalOpen"
      title="鉴定驳回"
      :confirm-loading="rejectAppraisalSubmitting"
      ok-text="确认驳回"
      cancel-text="取消"
      @ok="submitRejectAppraisal"
    >
      <a-form layout="vertical">
        <a-form-item label="驳回原因" required>
          <a-textarea v-model:value="rejectAppraisalReason" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="destructionApprovalOpen"
      title="销毁审批"
      :confirm-loading="destructionApprovalSubmitting"
      ok-text="提交"
      cancel-text="取消"
      @ok="submitDestructionApproval"
    >
      <a-form layout="vertical">
        <a-form-item label="审批备注">
          <a-textarea v-model:value="destructionApprovalRemark" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="superviseModalOpen"
      title="监销确认"
      :confirm-loading="superviseSubmitting"
      ok-text="确认"
      cancel-text="取消"
      @ok="submitSupervise"
    >
      <a-form layout="vertical">
        <a-form-item label="见证人" required>
          <ArchiveDutyUserSelect v-model:value="superviseForm.witnessUserId" />
        </a-form-item>
        <a-form-item label="监销登记文件">
          <UiPlatformFileField
            v-model:file-node-id="superviseForm.registerFileId"
            v-model:file-name="superviseRegisterFileName"
            :scene-key="FileUploadSceneKey.MARK_ARCHIVE_VOLUME_MATERIAL"
            button-text="选择文件"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import type {
  ArchiveAppraisalStatusCode,
  ArchiveDestructionStatusCode,
  ArchiveSecurityLevelCode,
  ArchiveVolumeAppraisalRequest,
  ArchiveVolumeDetailVO,
} from '@/apis/mark/archive-volume'
import {
  approveArchiveVolumeAppraisal,
  approveArchiveVolumeDestruction,
  ARCHIVE_APPRAISAL_STATUS_LABEL,
  ARCHIVE_APPRAISAL_STATUS_TONE,
  ARCHIVE_DESTRUCTION_STATUS_LABEL,
  ARCHIVE_DESTRUCTION_STATUS_TONE,
  ARCHIVE_SECURITY_LEVEL_LABEL,
  confirmArchiveVolumeDestructionSupervision,
  executeArchiveVolumeDestruction,
  recordArchiveVolumeAppraisalOpinion,
  rejectArchiveVolumeAppraisal,
  requestArchiveVolumeAppraisal,
  requestArchiveVolumeDestruction,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeAppraisalPanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailVO
  canManageAppraisal: boolean
  canApproveDestruction: boolean
  currentUserId: string
}>()

const emit = defineEmits<{
  refreshed: [options?: { silent?: boolean }]
}>()

const appraisalSubmitting = ref(false)
const destructionSubmitting = ref(false)
const rejectAppraisalSubmitting = ref(false)
const destructionApprovalSubmitting = ref(false)
const superviseRegisterFileName = ref<string>()
const superviseSubmitting = ref(false)
const appraisalModalOpen = ref(false)
const destructionModalOpen = ref(false)
const rejectAppraisalOpen = ref(false)
const destructionApprovalOpen = ref(false)
const superviseModalOpen = ref(false)
const rejectAppraisalReason = ref('')
const destructionReason = ref('')
const destructionApprovalRemark = ref('')
const destructionApprovalDecision = ref<'APPROVED' | 'REJECTED'>('APPROVED')

interface ArchiveVolumeAppraisalFormModel {
  decision: ArchiveVolumeAppraisalRequest['decision']
  retentionExtensionYears: ArchiveVolumeAppraisalRequest['retentionExtensionYears']
  permanentRetention: boolean
  remark: string
}

const appraisalForm = reactive<ArchiveVolumeAppraisalFormModel>({
  decision: 'RETAIN',
  retentionExtensionYears: undefined,
  permanentRetention: false,
  remark: '',
})
const superviseForm = reactive({
  witnessUserId: '',
  registerFileId: '',
})

const canRequestAppraisal = computed(() => {
  const vol = props.detail.volume
  if (!props.canManageAppraisal) return false
  const status = vol.appraisalStatus
  if (!(status === 'NOT_DUE' || status === 'REMINDER_SENT' || status === 'REJECTED')) {
    return false
  }
  if (status === 'NOT_DUE') {
    if (vol.permanentRetention) return false
    if (!vol.retentionUntil) return false
    return vol.retentionUntil <= new Date().toISOString().slice(0, 10)
  }
  return true
})

const canApproveAppraisal = computed(
  () => props.canManageAppraisal && props.detail.volume.appraisalStatus === 'REQUESTED',
)

const canRejectAppraisal = computed(() => canApproveAppraisal.value)

const canRecordAppraisalOpinion = computed(
  () => props.canManageAppraisal && props.detail.volume.appraisalStatus === 'APPROVED',
)

const canRequestDestruction = computed(
  () =>
    props.canManageAppraisal &&
    props.detail.volume.appraisalStatus === 'OPINION_RECORDED' &&
    props.detail.appraisalDecision === 'DESTROY' &&
    (props.detail.volume.destructionStatus === 'NONE' ||
      props.detail.volume.destructionStatus === 'FAILED'),
)

const canApproveDestructionAction = computed(() => {
  if (!props.canApproveDestruction || props.detail.volume.destructionStatus !== 'REQUESTED') {
    return false
  }
  const requestUserId = props.detail.destructionRequestUserId
  return !(requestUserId && requestUserId === props.currentUserId)
})

const canExecuteDestruction = computed(
  () =>
    props.canApproveDestruction &&
    props.detail.volume.volumeStatus === 'STORED' &&
    props.detail.volume.destructionStatus === 'APPROVED',
)

const canSuperviseDestruction = computed(
  () => props.canApproveDestruction && props.detail.volume.destructionStatus === 'EXECUTED',
)

function appraisalStatusLabel(code: ArchiveAppraisalStatusCode) {
  return strictEnumLabel(ARCHIVE_APPRAISAL_STATUS_LABEL, code, 'appraisalStatus')
}

function appraisalStatusTone(code: ArchiveAppraisalStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_APPRAISAL_STATUS_TONE, code, 'appraisalStatus')
}

function destructionStatusLabel(code: ArchiveDestructionStatusCode) {
  return strictEnumLabel(ARCHIVE_DESTRUCTION_STATUS_LABEL, code, 'destructionStatus')
}

function destructionStatusTone(code: ArchiveDestructionStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_DESTRUCTION_STATUS_TONE, code, 'destructionStatus')
}

function securityLevelLabel(code?: ArchiveSecurityLevelCode) {
  if (!code) return '—'
  return strictEnumLabel(ARCHIVE_SECURITY_LEVEL_LABEL, code, 'securityLevel')
}

function appraisalStepDone(step: 'request' | 'approve' | 'opinion') {
  const status = props.detail.volume.appraisalStatus
  if (!status) return false
  if (step === 'request') {
    return status !== 'NOT_DUE'
  }
  if (step === 'approve') {
    return status === 'APPROVED' || status === 'OPINION_RECORDED'
  }
  return status === 'OPINION_RECORDED'
}

function destructionStepDone(step: 'request' | 'approve' | 'execute' | 'supervise') {
  const status = props.detail.volume.destructionStatus
  if (!status || status === 'NONE') return false
  if (step === 'request') {
    return true
  }
  if (step === 'approve') {
    return (
      status === 'APPROVED' ||
      status === 'EXECUTING' ||
      status === 'EXECUTED' ||
      status === 'SUPERVISED' ||
      status === 'LEDGER_ARCHIVED' ||
      status === 'FAILED'
    )
  }
  if (step === 'execute') {
    return (
      status === 'EXECUTING' ||
      status === 'EXECUTED' ||
      status === 'SUPERVISED' ||
      status === 'LEDGER_ARCHIVED'
    )
  }
  return status === 'LEDGER_ARCHIVED' || status === 'SUPERVISED'
}

async function handleApproveAppraisal() {
  try {
    await approveArchiveVolumeAppraisal(props.volumeId)
    message.success('鉴定审批通过')
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  }
}

function openRejectAppraisal() {
  rejectAppraisalReason.value = ''
  rejectAppraisalOpen.value = true
}

async function submitRejectAppraisal() {
  if (!rejectAppraisalReason.value.trim()) {
    message.warning('请填写驳回原因')
    return
  }
  rejectAppraisalSubmitting.value = true
  try {
    await rejectArchiveVolumeAppraisal({
      volumeId: props.volumeId,
      rejectReason: rejectAppraisalReason.value.trim(),
    })
    message.success('鉴定已驳回')
    rejectAppraisalOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  } finally {
    rejectAppraisalSubmitting.value = false
  }
}

function openDestructionApproval(decision: 'APPROVED' | 'REJECTED') {
  destructionApprovalDecision.value = decision
  destructionApprovalRemark.value = ''
  destructionApprovalOpen.value = true
}

async function submitDestructionApproval() {
  destructionApprovalSubmitting.value = true
  try {
    await approveArchiveVolumeDestruction({
      volumeId: props.volumeId,
      decision: destructionApprovalDecision.value,
      remark: destructionApprovalRemark.value.trim() || undefined,
    })
    message.success('销毁审批已提交')
    destructionApprovalOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  } finally {
    destructionApprovalSubmitting.value = false
  }
}

async function handleExecuteDestruction() {
  const confirmed = await confirmAsync({
    title: '确认执行销毁？',
    content: '销毁执行后不可撤销，请确认已完成审批与备份。',
    type: 'error',
    okText: '执行销毁',
  })
  if (!confirmed) return
  try {
    await executeArchiveVolumeDestruction(props.volumeId)
    message.success('销毁执行已发起')
    emit('refreshed')
    startDestructionPollIfNeeded()
  } catch (error) {
    showUserError(error)
  }
}

let destructionPollTimer: ReturnType<typeof setInterval> | null = null

const shouldPollDestruction = computed(() => props.detail.volume.destructionStatus === 'EXECUTING')

watch(
  shouldPollDestruction,
  (shouldPoll) => {
    if (shouldPoll && !destructionPollTimer) {
      destructionPollTimer = setInterval(() => {
        emit('refreshed', { silent: true })
      }, 5000)
    } else if (!shouldPoll && destructionPollTimer) {
      clearInterval(destructionPollTimer)
      destructionPollTimer = null
    }
  },
  { immediate: true },
)

function startDestructionPollIfNeeded() {
  if (shouldPollDestruction.value && !destructionPollTimer) {
    destructionPollTimer = setInterval(() => {
      emit('refreshed', { silent: true })
    }, 5000)
  }
}

function openSuperviseModal() {
  superviseForm.witnessUserId = ''
  superviseForm.registerFileId = ''
  superviseRegisterFileName.value = undefined
  superviseModalOpen.value = true
}

async function submitSupervise() {
  if (!superviseForm.witnessUserId.trim()) {
    message.warning('请选择见证人')
    return
  }
  superviseSubmitting.value = true
  try {
    const registerFileId = superviseForm.registerFileId.trim() || undefined
    await confirmArchiveVolumeDestructionSupervision({
      volumeId: props.volumeId,
      witnessUserId: superviseForm.witnessUserId.trim(),
      registerFileId,
    })
    message.success('监销确认完成')
    superviseModalOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  } finally {
    superviseSubmitting.value = false
  }
}

async function handleRequestAppraisal() {
  try {
    await requestArchiveVolumeAppraisal(props.volumeId)
    message.success('鉴定申请已提交')
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  }
}

function openAppraisalOpinion() {
  appraisalForm.decision = 'RETAIN'
  appraisalForm.retentionExtensionYears = undefined
  appraisalForm.permanentRetention = false
  appraisalForm.remark = ''
  appraisalModalOpen.value = true
}

function syncAppraisalRetentionYears(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    appraisalForm.retentionExtensionYears = undefined
    return
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  if (Number.isFinite(parsed) && parsed >= 1) {
    appraisalForm.retentionExtensionYears = parsed
  }
}

async function submitAppraisalOpinion() {
  if (
    appraisalForm.decision === 'RETAIN' &&
    !appraisalForm.permanentRetention &&
    !appraisalForm.retentionExtensionYears
  ) {
    message.warning('请填写延长保管年限或勾选永久保管')
    return
  }
  appraisalSubmitting.value = true
  try {
    await recordArchiveVolumeAppraisalOpinion({
      volumeId: props.volumeId,
      decision: appraisalForm.decision,
      retentionExtensionYears:
        appraisalForm.decision === 'RETAIN' && !appraisalForm.permanentRetention
          ? appraisalForm.retentionExtensionYears
          : undefined,
      permanentRetention:
        appraisalForm.decision === 'RETAIN' ? appraisalForm.permanentRetention : undefined,
      remark: appraisalForm.remark.trim() || undefined,
    })
    message.success('鉴定决议已记录')
    appraisalModalOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  } finally {
    appraisalSubmitting.value = false
  }
}

function openDestructionRequest() {
  destructionReason.value = ''
  destructionModalOpen.value = true
}

async function submitDestructionRequest() {
  if (!destructionReason.value.trim()) {
    message.warning('请填写销毁原因')
    return
  }
  destructionSubmitting.value = true
  try {
    await requestArchiveVolumeDestruction({
      volumeId: props.volumeId,
      reason: destructionReason.value.trim(),
    })
    message.success('销毁申请已提交')
    destructionModalOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  } finally {
    destructionSubmitting.value = false
  }
}

onUnmounted(() => {
  if (destructionPollTimer) {
    clearInterval(destructionPollTimer)
    destructionPollTimer = null
  }
})
</script>

<style scoped>
.archive-volume-appraisal-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-appraisal-panel__lifecycle {
  margin-bottom: var(--dp-space-3, 12px);
}

.archive-volume-appraisal-panel__steps {
  margin: 0 0 var(--dp-space-4, 16px);
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--dp-space-2, 8px);
}

.archive-volume-appraisal-panel__steps li {
  padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel);
  font-size: 13px;
  color: var(--dp-text-muted, #64748b);
}

.archive-volume-appraisal-panel__steps li.done {
  border-color: var(--ant-color-primary-border, #91caff);
  color: var(--dp-text-primary, #1e293b);
  background: var(--dp-surface-subtle, #fafafa);
}

.archive-volume-appraisal-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}
</style>
