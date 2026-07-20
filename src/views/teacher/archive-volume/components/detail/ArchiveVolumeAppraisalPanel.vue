<template>
  <WorkbenchSurfaceCard embedded class="archive-volume-appraisal-panel">
    <template #head>
      <div class="archive-volume-appraisal-panel__head">
        <span class="archive-volume-appraisal-panel__title">鉴定 / 销毁</span>
        <UiTag
          v-if="detail.volume.appraisalStatus"
          :tone="appraisalStatusTone(detail.volume.appraisalStatus)"
          size="sm"
        >
          {{ appraisalStatusLabel(detail.volume.appraisalStatus) }}
        </UiTag>
        <UiTag
          v-if="detail.volume.destructionStatus && detail.volume.destructionStatus !== 'NONE'"
          :tone="destructionStatusTone(detail.volume.destructionStatus)"
          size="sm"
        >
          {{ destructionStatusLabel(detail.volume.destructionStatus) }}
        </UiTag>
      </div>
    </template>

    <template #toolbar>
      <div class="archive-volume-appraisal-panel__actions">
        <UiButton
          v-if="canRequestAppraisal === true"
          size="sm"
          variant="primary"
          @click="handleRequestAppraisal"
        >
          发起鉴定
        </UiButton>
        <UiButton
          v-if="canRequestDestruction === true"
          size="sm"
          variant="outline"
          @click="openDestructionRequest"
        >
          申请销毁
        </UiButton>
        <UiButton
          v-if="canApproveDestructionAction === true"
          variant="primary"
          size="sm"
          @click="openDestructionApproval(ArchiveDestructionDecisionCode.APPROVED)"
        >
          批准销毁
        </UiButton>
        <UiButton
          v-if="canApproveDestructionAction === true"
          size="sm"
          variant="outline"
          @click="openDestructionApproval(ArchiveDestructionDecisionCode.REJECTED)"
        >
          驳回销毁
        </UiButton>
        <UiButton v-if="canExecuteDestruction === true" variant="primary" size="sm" @click="handleExecuteDestruction">
          执行销毁
        </UiButton>
        <UiButton
          v-if="canSuperviseDestruction === true"
          size="sm"
          variant="outline"
          @click="openSuperviseModal"
        >
          监销确认
        </UiButton>
      </div>
    </template>

    <UiAlertStrip
      v-if="canRequestAppraisal === true"
      tone="warning"
      title="保管期鉴定待启动"
      description="请发起鉴定申请；审批通过后记录续保或销毁决议，再进入销毁审批链。"
      dense
      class="archive-volume-appraisal-panel__guide"
    />

    <section class="archive-volume-appraisal-panel__section">
      <div class="archive-volume-appraisal-panel__section-head">
        <h3 class="archive-volume-appraisal-panel__section-title">鉴定流程</h3>
        <UiTag
          v-if="
            detail.volume.appraisalStatus
              && detail.volume.appraisalStatus !== ArchiveAppraisalStatusCode.NOT_DUE
          "
          :tone="appraisalStatusTone(detail.volume.appraisalStatus)"
          size="sm"
        >
          {{ appraisalStatusLabel(detail.volume.appraisalStatus) }}
        </UiTag>
        <UiTag v-else tone="gray" size="sm">未启动</UiTag>
        <div class="archive-volume-appraisal-panel__section-actions">
          <UiButton
            v-if="canRequestAppraisal === true"
            size="sm"
            variant="ghost"
            @click="handleRequestAppraisal"
          >
            发起鉴定
          </UiButton>
        </div>
      </div>

      <UiSkeletonState v-if="flowLoading" variant="card" compact />
      <div v-else-if="flowLoadFailed" class="archive-volume-appraisal-panel__load-error">
        <span>鉴定流程刷新失败，当前仍显示上次成功结果</span>
        <UiButton size="sm" variant="outline" @click="loadAppraisalFlowRecords">重试</UiButton>
      </div>
      <UiEmpty
        size="sm"
        v-if="!flowLoading && !flowLoadFailed && flowRecords.length === 0"
        description="保管期未到或尚未发起鉴定"
      />
      <div
        v-if="!flowLoading && flowRecords.length > 0"
        class="archive-volume-appraisal-panel__list"
      >
        <article
          v-for="record in flowRecords"
          :key="record.eventId ?? record.occurredAt"
          class="approval-card"
          :class="appraisalCardClass(record.appraisalStatus)"
        >
          <div class="approval-card__head">
            <span class="approval-card__title">{{ flowRecordTitle(record) }}</span>
            <UiTag
              v-if="record.appraisalStatus"
              :tone="appraisalStatusTone(record.appraisalStatus)"
              size="sm"
            >
              {{ appraisalStatusLabel(record.appraisalStatus) }}
            </UiTag>
          </div>
          <p
            v-if="record.reason && record.eventType !== 'APPRAISAL_REJECTED'"
            class="approval-card__remark"
          >
            {{ record.reason }}
          </p>
          <p class="approval-card__meta">{{ formatFlowRecordMeta(record) }}</p>
          <div v-if="showRecordActions(record)" class="approval-card__actions">
            <UiButton v-if="canApproveAppraisal === true" variant="primary" size="sm" @click="handleApproveAppraisal">
              鉴定审批通过
            </UiButton>
            <UiButton
              v-if="canRejectAppraisal === true"
              size="sm"
              variant="outline"
              @click="openRejectAppraisal"
            >
              鉴定驳回
            </UiButton>
            <UiButton
              v-if="canRecordAppraisalOpinion === true"
              size="sm"
              variant="outline"
              @click="openAppraisalOpinion"
            >
              记录意见
            </UiButton>
          </div>
        </article>
      </div>
    </section>

    <section
      class="archive-volume-appraisal-panel__section archive-volume-appraisal-panel__section--destruction"
    >
      <div class="archive-volume-appraisal-panel__section-head">
        <h3 class="archive-volume-appraisal-panel__section-title">销毁流程</h3>
        <span class="archive-volume-appraisal-panel__destruction-hint">L2-D3 两阶段物理删除</span>
        <UiTag
          v-if="detail.volume.destructionStatus && detail.volume.destructionStatus !== 'NONE'"
          :tone="destructionStatusTone(detail.volume.destructionStatus)"
          size="sm"
        >
          {{ destructionStatusLabel(detail.volume.destructionStatus) }}
        </UiTag>
      </div>
      <ArchiveLifecyclePipe
        :steps="destructionLifecycleSteps"
        class="archive-volume-appraisal-panel__pipe"
      />
      <UiSkeletonState v-if="destructionFlowLoading" variant="card" compact />
      <div v-else-if="destructionFlowLoadFailed" class="archive-volume-appraisal-panel__load-error">
        <span>销毁流程刷新失败，当前仍显示上次成功结果</span>
        <UiButton size="sm" variant="outline" @click="loadDestructionFlowRecords">重试</UiButton>
      </div>
      <UiEmpty
        v-if="
          !destructionFlowLoading
            && !destructionFlowLoadFailed
            && destructionFlowRecords.length === 0
        "
        size="sm" description="尚未发起销毁流程"
      />
      <div
        v-if="!destructionFlowLoading && destructionFlowRecords.length > 0"
        class="archive-volume-appraisal-panel__list"
      >
        <article
          v-for="record in destructionFlowRecords"
          :key="record.eventId ?? record.occurredAt"
          class="approval-card approval-card--destruction"
        >
          <div class="approval-card__head">
            <span class="approval-card__title">{{ destructionFlowRecordTitle(record) }}</span>
            <UiTag
              v-if="record.destructionStatus"
              :tone="destructionStatusTone(record.destructionStatus)"
              size="sm"
            >
              {{ destructionStatusLabel(record.destructionStatus) }}
            </UiTag>
          </div>
          <p v-if="record.reason" class="approval-card__remark">{{ record.reason }}</p>
          <p class="approval-card__meta">{{ formatDestructionFlowRecordMeta(record) }}</p>
        </article>
      </div>
      <ul class="archive-volume-appraisal-panel__destruction-steps">
        <li
          v-for="step in destructionStepDescriptions"
          :key="step.key"
          class="archive-volume-appraisal-panel__destruction-step"
        >
          <span class="archive-volume-appraisal-panel__destruction-step-label">{{
            step.label
          }}</span>
          <span class="archive-volume-appraisal-panel__destruction-step-desc">{{
            step.description
          }}</span>
        </li>
      </ul>
    </section>

    <UiDrawer
      :open="appraisalModalOpen"
      title="鉴定决议"
      :width="520"
      :confirm-loading="appraisalSubmitting"
      ok-text="提交"
      :hide-footer="false"
      @update:open="(v: boolean) => (appraisalModalOpen = v)"
      @close="appraisalModalOpen = false"
      @confirm="submitAppraisalOpinion"
    >
      <UiForm layout="vertical">
        <UiFormItem label="决议" required>
          <UiRadioGroup
            v-model="appraisalForm.decision"
            size="sm"
            :options="[
              { label: '继续保留', value: ArchiveAppraisalDecisionCode.RETAIN },
              { label: '可销毁', value: ArchiveAppraisalDecisionCode.DESTROY },
            ]"
          />
        </UiFormItem>
        <UiFormItem
          v-if="appraisalForm.decision === ArchiveAppraisalDecisionCode.RETAIN"
          label="延长保管（年）"
        >
          <UiInputNumber
            size="sm"
            :value="appraisalForm.retentionExtensionYears"
            :min="1"
            :disabled="appraisalForm.permanentRetention"
            style="width: 100%"
            @update:value="syncAppraisalRetentionYears"
          />
        </UiFormItem>
        <UiFormItem v-if="appraisalForm.decision === ArchiveAppraisalDecisionCode.RETAIN">
          <UiCheckbox v-model="appraisalForm.permanentRetention">永久保管</UiCheckbox>
        </UiFormItem>
        <UiFormItem label="备注">
          <UiTextarea size="sm" v-model="appraisalForm.remark" :rows="3" :maxlength="500" :show-count="true" />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="destructionModalOpen"
      title="申请销毁"
      :width="520"
      :confirm-loading="destructionSubmitting"
      ok-text="提交"
      :hide-footer="false"
      @update:open="(v: boolean) => (destructionModalOpen = v)"
      @close="destructionModalOpen = false"
      @confirm="submitDestructionRequest"
    >
      <UiForm layout="vertical">
        <UiFormItem label="销毁原因" required>
          <UiTextarea size="sm" v-model="destructionReason" :rows="3" :maxlength="500" :show-count="true" />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="rejectAppraisalOpen"
      title="鉴定驳回"
      :width="520"
      :confirm-loading="rejectAppraisalSubmitting"
      ok-text="确认驳回"
      :hide-footer="false"
      @update:open="(v: boolean) => (rejectAppraisalOpen = v)"
      @close="rejectAppraisalOpen = false"
      @confirm="submitRejectAppraisal"
    >
      <UiForm layout="vertical">
        <UiFormItem label="驳回原因" required>
          <UiTextarea size="sm" v-model="rejectAppraisalReason" :rows="3" :maxlength="500" :show-count="true" />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="destructionApprovalOpen"
      :title="destructionApprovalTitle"
      :width="520"
      :confirm-loading="destructionApprovalSubmitting"
      ok-text="提交"
      :hide-footer="false"
      @update:open="(v: boolean) => (destructionApprovalOpen = v)"
      @close="destructionApprovalOpen = false"
      @confirm="submitDestructionApproval"
    >
      <UiForm layout="vertical">
        <UiFormItem
          :label="
            destructionApprovalDecision === ArchiveDestructionDecisionCode.REJECTED
              ? '驳回原因'
              : '审批备注'
          "
          :required="destructionApprovalDecision === ArchiveDestructionDecisionCode.REJECTED"
        >
          <UiTextarea
            size="sm"
            v-model="destructionApprovalRemark"
            :rows="3"
            :maxlength="500"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="superviseModalOpen"
      title="监销确认"
      :width="520"
      :confirm-loading="superviseSubmitting"
      ok-text="确认"
      :hide-footer="false"
      @update:open="(v: boolean) => (superviseModalOpen = v)"
      @close="superviseModalOpen = false"
      @confirm="submitSupervise"
    >
      <UiForm layout="vertical">
        <UiFormItem label="见证人" required>
          <ArchiveDutyUserSelect
            v-model:value="superviseForm.witnessUserId"
            :excluded-user-ids="supervisionExcludedUserIds"
          />
        </UiFormItem>
        <UiFormItem label="销毁清册文件" required>
          <UiPlatformFileField
            v-model:file-node-id="superviseForm.registerFileId"
            v-model:file-name="superviseRegisterFileName"
            :scene-key="FileUploadSceneKey.MARK_ARCHIVE_VOLUME_MATERIAL"
            button-text="选择文件"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type {
  ArchiveVolumeAppraisalFlowRecordResponse,
  ArchiveVolumeAppraisalRequest,
  ArchiveVolumeDestructionFlowRecordResponse,
  ArchiveVolumeDetailResponse,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  approveArchiveVolumeAppraisal,
  approveArchiveVolumeDestruction,
  ARCHIVE_APPRAISAL_STATUS_TONE,
  ARCHIVE_DESTRUCTION_STATUS_TONE,
  ArchiveAppraisalStatusCode,
  ArchiveAppraisalStatusDescription,
  ArchiveDestructionStatusCode,
  ArchiveDestructionStatusDescription,
  ArchiveVolumeStatusCode,
  confirmArchiveVolumeDestructionSupervision,
  executeArchiveVolumeDestruction,
  listArchiveVolumeAppraisalFlowRecords,
  listArchiveVolumeDestructionFlowRecords,
  recordArchiveVolumeAppraisalOpinion,
  rejectArchiveVolumeAppraisal,
  requestArchiveVolumeAppraisal,
  requestArchiveVolumeDestruction,
} from '@/apis/mark/archive-volume'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import ArchiveLifecyclePipe from '@/components/archive-volume/ArchiveLifecyclePipe.vue'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { ArchiveAppraisalDecisionCode } from '@/types/enums/archive-appraisal-decision-enum'
import { ArchiveDestructionDecisionCode } from '@/types/enums/archive-destruction-decision-enum'
import {
  buildArchiveDestructionLifecycleSteps,
  getArchiveDestructionStepDescriptions,
} from '@/utils/archive-volume-lifecycle'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeAppraisalPanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
  canManageAppraisal: boolean
  canApproveDestruction: boolean
  currentUserId: string
}>()

const emit = defineEmits<{
  refreshed: [options?: { silent?: boolean }]
}>()

const appraisalSubmitting = ref(false)
const flowLoading = ref(false)
const flowLoadFailed = ref(false)
const flowRecords = ref<ArchiveVolumeAppraisalFlowRecordResponse[]>([])
const destructionFlowLoading = ref(false)
const destructionFlowLoadFailed = ref(false)
const destructionFlowRecords = ref<ArchiveVolumeDestructionFlowRecordResponse[]>([])
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
const destructionApprovalDecision = ref<ArchiveDestructionDecisionCode>(
  ArchiveDestructionDecisionCode.APPROVED,
)

interface ArchiveVolumeAppraisalFormModel {
  decision: ArchiveAppraisalDecisionCode
  retentionExtensionYears: ArchiveVolumeAppraisalRequest['retentionExtensionYears']
  permanentRetention: boolean
  remark: string
}

const appraisalForm = reactive<ArchiveVolumeAppraisalFormModel>({
  decision: ArchiveAppraisalDecisionCode.RETAIN,
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
  if (props.canManageAppraisal !== true) return false
  const status = vol.appraisalStatus
  if (!(
    status === ArchiveAppraisalStatusCode.NOT_DUE
    || status === ArchiveAppraisalStatusCode.REMINDER_SENT
    || status === ArchiveAppraisalStatusCode.REJECTED
  )) {
    return false
  }
  if (status === ArchiveAppraisalStatusCode.NOT_DUE) {
    if (vol.permanentRetention) return false
    if (!vol.retentionUntil) return false
    return vol.retentionUntil <= new Date().toISOString().slice(0, 10)
  }
  return true
})

const canApproveAppraisal = computed(
  () =>
    props.canManageAppraisal === true
    && props.detail.volume.appraisalStatus === ArchiveAppraisalStatusCode.REQUESTED
    && Boolean(props.detail.appraisalRequestUserId)
    && props.detail.appraisalRequestUserId !== props.currentUserId,
)

const canRejectAppraisal = computed(() => canApproveAppraisal.value)

const canRecordAppraisalOpinion = computed(
  () =>
    props.canManageAppraisal === true
    && props.detail.volume.appraisalStatus === ArchiveAppraisalStatusCode.APPROVED,
)

const canRequestDestruction = computed(
  () =>
    props.canManageAppraisal === true
    && props.detail.volume.appraisalStatus === ArchiveAppraisalStatusCode.OPINION_RECORDED
    && props.detail.appraisalDecision === ArchiveAppraisalDecisionCode.DESTROY
    && (props.detail.volume.destructionStatus === ArchiveDestructionStatusCode.NONE
      || props.detail.volume.destructionStatus === ArchiveDestructionStatusCode.REJECTED),
)

const canApproveDestructionAction = computed(() => {
  if (
    props.canApproveDestruction !== true
    || props.detail.volume.destructionStatus !== ArchiveDestructionStatusCode.REQUESTED
  ) {
    return false
  }
  const requestUserId = props.detail.destructionRequestUserId
  return Boolean(requestUserId) && requestUserId !== props.currentUserId
})

const canExecuteDestruction = computed(
  () =>
    props.canApproveDestruction === true
    && props.detail.volume.volumeStatus === ArchiveVolumeStatusCode.STORED
    && props.detail.volume.destructionStatus === ArchiveDestructionStatusCode.APPROVED
    && Boolean(props.detail.destructionRequestUserId)
    && Boolean(props.detail.destructionApproverUserId)
    && props.detail.destructionRequestUserId !== props.currentUserId
    && props.detail.destructionApproverUserId !== props.currentUserId,
)

/** MVR-199：与 BE assertDestructionWitnessSeparated 同源，申请/审批/执行人不可见监销确认 */
const canSuperviseDestruction = computed(() => {
  if (
    props.canApproveDestruction !== true
    || props.detail.volume.destructionStatus !== ArchiveDestructionStatusCode.EXECUTED
    || !props.detail.destructionExecutionUserId
    || !props.currentUserId
  ) {
    return false
  }
  const selfId = props.currentUserId
  if (props.detail.destructionRequestUserId && props.detail.destructionRequestUserId === selfId) {
    return false
  }
  if (props.detail.destructionApproverUserId && props.detail.destructionApproverUserId === selfId) {
    return false
  }
  if (props.detail.destructionExecutionUserId === selfId) {
    return false
  }
  return true
})

const destructionApprovalTitle = computed(() =>
  destructionApprovalDecision.value === ArchiveDestructionDecisionCode.REJECTED
    ? '驳回销毁申请'
    : '批准销毁申请',
)

const supervisionExcludedUserIds = computed(() =>
  [
    props.currentUserId,
    props.detail.destructionRequestUserId,
    props.detail.destructionApproverUserId,
    props.detail.destructionExecutionUserId,
  ].filter((userId): userId is string => Boolean(userId)),
)

const destructionLifecycleSteps = computed(() =>
  buildArchiveDestructionLifecycleSteps(
    props.detail.volume.destructionStatus ?? ArchiveDestructionStatusCode.NONE,
  ),
)

const destructionStepDescriptions = getArchiveDestructionStepDescriptions()

const retentionDisplayText = computed(() => {
  const vol = props.detail.volume
  if (vol.permanentRetention) return '永久保管'
  if (vol.retentionUntil) return vol.retentionUntil
  if (vol.retentionYears) return `${vol.retentionYears} 年`
  return '—'
})

function flowRecordTitle(record: ArchiveVolumeAppraisalFlowRecordResponse): string {
  const title = props.detail.volume.archiveTitle || props.detail.volume.archiveNo || '案卷'
  return `${title} · ${record.actionLabel || '鉴定'}`
}

function formatFlowRecordMeta(record: ArchiveVolumeAppraisalFlowRecordResponse): string {
  const actor
    = record.operatorNickName || (record.eventType === 'RETENTION_REMINDER' ? '系统自动' : '—')
  const time = record.occurredAt ? formatDateTime(record.occurredAt) : '—'
  const parts: string[] = []
  if (record.eventType === 'RETENTION_REMINDER' || record.eventType === 'APPRAISAL_REQUESTED') {
    parts.push(`保管到期: ${retentionDisplayText.value}`)
  }
  if (props.detail.appraisalDecision && record.eventType === 'APPRAISAL_OPINION_RECORDED') {
    parts.push(
      `决议: ${props.detail.appraisalDecision === ArchiveAppraisalDecisionCode.RETAIN ? '继续保留' : '建议销毁'}`,
    )
  }
  parts.push(`${actor} · ${time}`)
  if (record.eventType === 'APPRAISAL_REJECTED' && record.reason) {
    parts.push(record.reason)
  }
  return parts.join(' · ')
}

function isLatestFlowRecord(record: ArchiveVolumeAppraisalFlowRecordResponse): boolean {
  const records = flowRecords.value
  if (!records.length || !record.eventId) return false
  return records[records.length - 1]?.eventId === record.eventId
}

function showRecordActions(record: ArchiveVolumeAppraisalFlowRecordResponse): boolean {
  if (!isLatestFlowRecord(record)) return false
  if (
    record.appraisalStatus === ArchiveAppraisalStatusCode.REQUESTED
    && props.detail.volume.appraisalStatus === ArchiveAppraisalStatusCode.REQUESTED
  ) {
    return canApproveAppraisal.value || canRejectAppraisal.value
  }
  if (
    record.appraisalStatus === ArchiveAppraisalStatusCode.APPROVED
    && props.detail.volume.appraisalStatus === ArchiveAppraisalStatusCode.APPROVED
  ) {
    return canRecordAppraisalOpinion.value
  }
  return false
}

async function loadAppraisalFlowRecords() {
  flowLoading.value = true
  flowLoadFailed.value = false
  try {
    flowRecords.value = await listArchiveVolumeAppraisalFlowRecords(props.volumeId)
  } catch (error) {
    showUserError(error, '加载鉴定流转记录失败')
    flowLoadFailed.value = true
  } finally {
    flowLoading.value = false
  }
}

function destructionFlowRecordTitle(record: ArchiveVolumeDestructionFlowRecordResponse): string {
  const title = props.detail.volume.archiveTitle || props.detail.volume.archiveNo || '案卷'
  return `${title} · ${record.actionLabel || '销毁'}`
}

function formatDestructionFlowRecordMeta(
  record: ArchiveVolumeDestructionFlowRecordResponse,
): string {
  const actor = record.operatorNickName || '—'
  const time = record.occurredAt ? formatDateTime(record.occurredAt) : '—'
  return `${actor} · ${time}`
}

async function loadDestructionFlowRecords() {
  destructionFlowLoading.value = true
  destructionFlowLoadFailed.value = false
  try {
    destructionFlowRecords.value = await listArchiveVolumeDestructionFlowRecords(props.volumeId)
  } catch (error) {
    showUserError(error, '加载销毁流转记录失败')
    destructionFlowLoadFailed.value = true
  } finally {
    destructionFlowLoading.value = false
  }
}

async function loadFlowRecords() {
  await Promise.all([loadAppraisalFlowRecords(), loadDestructionFlowRecords()])
}

function refreshPanel() {
  emit('refreshed')
  void loadFlowRecords()
}

function appraisalCardClass(status?: ArchiveAppraisalStatusCode): string {
  if (
    status === ArchiveAppraisalStatusCode.APPROVED
    || status === ArchiveAppraisalStatusCode.OPINION_RECORDED
  ) {
    return 'approval-card--approved'
  }
  if (
    status === ArchiveAppraisalStatusCode.REQUESTED
    || status === ArchiveAppraisalStatusCode.REMINDER_SENT
  ) {
    return 'approval-card--pending'
  }
  if (status === ArchiveAppraisalStatusCode.REJECTED) return 'approval-card--rejected'
  return ''
}

function appraisalStatusLabel(code: ArchiveAppraisalStatusCode) {
  return strictEnumLabel(ArchiveAppraisalStatusDescription, code, 'appraisalStatus')
}

function appraisalStatusTone(code: ArchiveAppraisalStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_APPRAISAL_STATUS_TONE, code, 'appraisalStatus')
}

function destructionStatusLabel(code: ArchiveDestructionStatusCode) {
  return strictEnumLabel(ArchiveDestructionStatusDescription, code, 'destructionStatus')
}

function destructionStatusTone(code: ArchiveDestructionStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_DESTRUCTION_STATUS_TONE, code, 'destructionStatus')
}

async function handleApproveAppraisal() {
  if (appraisalSubmitting.value) return
  // MVR-301：与 canApproveAppraisal 同源二次拦截
  if (canApproveAppraisal.value !== true) {
    message.warning('当前账号无鉴定审批通过权限')
    return
  }
  appraisalSubmitting.value = true
  try {
    await approveArchiveVolumeAppraisal(props.volumeId)
    message.success('鉴定审批通过')
    refreshPanel()
  } catch (error) {
    showUserError(error, '通过鉴定审批失败')
  } finally {
    appraisalSubmitting.value = false
  }
}

function openRejectAppraisal() {
  // MVR-301：与 canRejectAppraisal 同源二次拦截
  if (canRejectAppraisal.value !== true) {
    message.warning('当前账号无鉴定驳回权限')
    return
  }
  rejectAppraisalReason.value = ''
  rejectAppraisalOpen.value = true
}

async function submitRejectAppraisal() {
  if (rejectAppraisalSubmitting.value) return
  // MVR-301：与 canRejectAppraisal 同源二次拦截
  if (canRejectAppraisal.value !== true) {
    message.warning('当前账号无鉴定驳回权限')
    return
  }
  if (!rejectAppraisalReason.value.trim()) {
    showFormValidationMessage('请填写驳回原因')
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
    refreshPanel()
  } catch (error) {
    showUserError(error, '驳回鉴定失败')
  } finally {
    rejectAppraisalSubmitting.value = false
  }
}

function openDestructionApproval(decision: ArchiveDestructionDecisionCode) {
  // MVR-301：与 canApproveDestructionAction 同源二次拦截
  if (canApproveDestructionAction.value !== true) {
    message.warning('当前账号无销毁审批权限')
    return
  }
  destructionApprovalDecision.value = decision
  destructionApprovalRemark.value = ''
  destructionApprovalOpen.value = true
}

async function submitDestructionApproval() {
  if (destructionApprovalSubmitting.value) return
  // MVR-301：与 canApproveDestructionAction 同源二次拦截
  if (canApproveDestructionAction.value !== true) {
    message.warning('当前账号无销毁审批权限')
    return
  }
  if (
    destructionApprovalDecision.value === ArchiveDestructionDecisionCode.REJECTED
    && !destructionApprovalRemark.value.trim()
  ) {
    showFormValidationMessage('请填写驳回原因')
    return
  }
  destructionApprovalSubmitting.value = true
  try {
    await approveArchiveVolumeDestruction({
      volumeId: props.volumeId,
      decision: destructionApprovalDecision.value,
      remark: destructionApprovalRemark.value.trim() || undefined,
    })
    message.success('销毁审批已提交')
    destructionApprovalOpen.value = false
    refreshPanel()
  } catch (error) {
    showUserError(error, '提交销毁审批失败')
  } finally {
    destructionApprovalSubmitting.value = false
  }
}

async function handleExecuteDestruction() {
  if (destructionSubmitting.value) return
  // MVR-301：与 canExecuteDestruction 同源二次拦截
  if (canExecuteDestruction.value !== true) {
    message.warning('当前账号无执行销毁权限')
    return
  }
  const confirmed = await confirmAsync({
    title: '确认执行销毁？',
    content: '销毁执行后不可撤销，请确认已完成审批与备份。',
    type: 'error',
    okText: '执行销毁',
  })
  if (!confirmed) return
  destructionSubmitting.value = true
  try {
    await executeArchiveVolumeDestruction(props.volumeId)
    message.success('销毁执行已发起')
    emit('refreshed')
    startDestructionPollIfNeeded()
  } catch (error) {
    showUserError(error, '执行销毁失败')
  } finally {
    destructionSubmitting.value = false
  }
}

let destructionPollTimer: ReturnType<typeof setInterval> | null = null

const shouldPollDestruction = computed(
  () => props.detail.volume.destructionStatus === ArchiveDestructionStatusCode.EXECUTING,
)

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
  // MVR-301：与 canSuperviseDestruction 同源二次拦截
  if (canSuperviseDestruction.value !== true) {
    message.warning('当前账号无监销确认权限')
    return
  }
  superviseForm.witnessUserId = ''
  superviseForm.registerFileId = ''
  superviseRegisterFileName.value = undefined
  superviseModalOpen.value = true
}

async function submitSupervise() {
  if (superviseSubmitting.value) return
  // MVR-301：与 canSuperviseDestruction 同源二次拦截
  if (canSuperviseDestruction.value !== true) {
    message.warning('当前账号无监销确认权限')
    return
  }
  if (!superviseForm.witnessUserId.trim()) {
    showFormValidationMessage('请选择见证人')
    return
  }
  if (!superviseForm.registerFileId.trim()) {
    showFormValidationMessage('请选择销毁清册文件')
    return
  }
  superviseSubmitting.value = true
  try {
    await confirmArchiveVolumeDestructionSupervision({
      volumeId: props.volumeId,
      witnessUserId: superviseForm.witnessUserId.trim(),
      registerFileId: superviseForm.registerFileId.trim(),
    })
    message.success('监销确认完成')
    superviseModalOpen.value = false
    refreshPanel()
  } catch (error) {
    showUserError(error, '确认监销失败')
  } finally {
    superviseSubmitting.value = false
  }
}

async function handleRequestAppraisal() {
  if (appraisalSubmitting.value) return
  // MVR-301：与 canRequestAppraisal 同源二次拦截
  if (canRequestAppraisal.value !== true) {
    message.warning('当前账号无发起鉴定权限')
    return
  }
  appraisalSubmitting.value = true
  try {
    await requestArchiveVolumeAppraisal(props.volumeId)
    message.success('鉴定申请已提交')
    refreshPanel()
  } catch (error) {
    showUserError(error, '提交鉴定申请失败')
  } finally {
    appraisalSubmitting.value = false
  }
}

function openAppraisalOpinion() {
  // MVR-301：与 canRecordAppraisalOpinion 同源二次拦截
  if (canRecordAppraisalOpinion.value !== true) {
    message.warning('当前账号无记录鉴定决议权限')
    return
  }
  appraisalForm.decision = ArchiveAppraisalDecisionCode.RETAIN
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
  if (appraisalSubmitting.value) return
  // MVR-301：与 canRecordAppraisalOpinion 同源二次拦截
  if (canRecordAppraisalOpinion.value !== true) {
    message.warning('当前账号无记录鉴定决议权限')
    return
  }
  if (
    appraisalForm.decision === ArchiveAppraisalDecisionCode.RETAIN
    && !appraisalForm.permanentRetention
    && !appraisalForm.retentionExtensionYears
  ) {
    showFormValidationMessage('请填写延长保管年限或勾选永久保管')
    return
  }
  appraisalSubmitting.value = true
  try {
    await recordArchiveVolumeAppraisalOpinion({
      volumeId: props.volumeId,
      decision: appraisalForm.decision,
      retentionExtensionYears:
        appraisalForm.decision === ArchiveAppraisalDecisionCode.RETAIN
        && !appraisalForm.permanentRetention
          ? appraisalForm.retentionExtensionYears
          : undefined,
      permanentRetention:
        appraisalForm.decision === ArchiveAppraisalDecisionCode.RETAIN
          ? appraisalForm.permanentRetention
          : undefined,
      remark: appraisalForm.remark.trim() || undefined,
    })
    message.success('鉴定决议已记录')
    appraisalModalOpen.value = false
    refreshPanel()
  } catch (error) {
    showUserError(error, '记录鉴定决议失败')
  } finally {
    appraisalSubmitting.value = false
  }
}

function openDestructionRequest() {
  // MVR-301：与 canRequestDestruction 同源二次拦截
  if (canRequestDestruction.value !== true) {
    message.warning('当前账号无发起销毁申请权限')
    return
  }
  destructionReason.value = ''
  destructionModalOpen.value = true
}

async function submitDestructionRequest() {
  if (destructionSubmitting.value) return
  // MVR-301：与 canRequestDestruction 同源二次拦截
  if (canRequestDestruction.value !== true) {
    message.warning('当前账号无发起销毁申请权限')
    return
  }
  if (!destructionReason.value.trim()) {
    showFormValidationMessage('请填写销毁原因')
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
    refreshPanel()
  } catch (error) {
    showUserError(error, '提交销毁申请失败')
  } finally {
    destructionSubmitting.value = false
  }
}

onMounted(() => {
  void loadFlowRecords()
})

watch(
  () => props.volumeId,
  () => {
    void loadFlowRecords()
  },
)

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
  gap: var(--dp-space-4);
}

.archive-volume-appraisal-panel__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.archive-volume-appraisal-panel__load-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
  min-height: 48px;
  color: var(--dp-color-text-secondary);
}

.archive-volume-appraisal-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-volume-appraisal-panel__guide {
  margin-bottom: var(--dp-space-2);
}

.archive-volume-appraisal-panel__section-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  margin-bottom: var(--dp-space-2);
}

.archive-volume-appraisal-panel__section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  margin-left: auto;
}

.archive-volume-appraisal-panel__section-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-volume-appraisal-panel__destruction-hint {
  font-size: 12px;
  color: var(--dp-text-secondary);
}

.archive-volume-appraisal-panel__destruction-steps {
  margin: var(--dp-space-2) 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--dp-space-2);
}

.archive-volume-appraisal-panel__destruction-step {
  display: flex;
  gap: var(--dp-space-3);
  font-size: 12px;
}

.archive-volume-appraisal-panel__destruction-step-label {
  min-width: 60px;
  font-weight: 600;
  color: var(--dp-text-secondary);
}

.archive-volume-appraisal-panel__destruction-step-desc {
  color: var(--dp-text-primary);
}

.archive-volume-appraisal-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2);
}

.archive-volume-appraisal-panel__section {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
}

.archive-volume-appraisal-panel__section--destruction {
  padding-top: var(--dp-space-3);
  border-top: 1px solid var(--dp-border-subtle);
}

.archive-volume-appraisal-panel__section-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-volume-appraisal-panel__pipe {
  margin-bottom: var(--dp-space-4);
}

.archive-volume-appraisal-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  width: 100%;
}
</style>
