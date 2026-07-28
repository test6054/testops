<template>
  <WorkbenchSurfaceCard embedded class="archive-quality-panel">
    <section class="archive-quality-panel__section">
      <div class="archive-quality-panel__section-head">
        <h3 class="archive-quality-panel__section-title">完整性自检</h3>
        <UiTag
          v-if="displayedIntegrityResult || detail.volume.integrityStatus"
          :tone="
            integrityStatusTone(
              displayedIntegrityResult?.integrityStatus ?? detail.volume.integrityStatus,
            )
          "
          size="sm"
        >
          {{
            integrityStatusLabel(
              displayedIntegrityResult?.integrityStatus ?? detail.volume.integrityStatus,
            )
          }}
        </UiTag>
        <div class="archive-quality-panel__section-actions">
          <UiButton
            v-if="canRunIntegrity === true"
            size="sm"
            variant="primary"
            :loading="checkingIntegrity === true"
            @click="emit('run-integrity-check')"
          >
            执行完整性自检
          </UiButton>
          <UiButton
            v-if="canRequestIntegrityWaive === true"
            size="sm"
            variant="outline"
            :loading="requestingIntegrityWaive === true"
            @click="openRequestIntegrityWaiveModal"
          >
            申请豁免
          </UiButton>
          <UiButton
            v-if="canApproveIntegrityWaive === true"
            size="sm"
            variant="primary"
            :loading="approvingIntegrityWaive === true"
            @click="submitApproveIntegrityWaive"
          >
            审批通过
          </UiButton>
          <UiButton
            v-if="canApproveIntegrityWaive === true"
            size="sm"
            variant="outline"
            :loading="rejectingIntegrityWaive === true"
            @click="openRejectIntegrityWaiveModal"
          >
            驳回申请
          </UiButton>
        </div>
      </div>

      <p
        v-if="detail.integrityWaivePending === true && canApproveIntegrityWaive !== true"
        class="archive-quality-panel__pass-hint"
      >
        完整性豁免申请待审批
      </p>

      <div v-if="!displayedIntegrityResult" class="archive-quality-panel__empty">
        <p class="archive-quality-panel__empty-title">尚未执行完整性自检</p>
        <p class="archive-quality-panel__empty-desc">
          对照必交材料清单检查缺件，通过后方可继续自检清单与四性检测。
        </p>
        <UiButton
          v-if="canRunIntegrity === true"
          size="sm"
          variant="primary"
          :loading="checkingIntegrity === true"
          @click="emit('run-integrity-check')"
        >
          执行完整性自检
        </UiButton>
      </div>

      <UiDataTable
        v-else-if="displayedIntegrityResult.missingItems?.length"
        pagination-mode="none"
        :columns="missingColumns"
        :data-source="displayedIntegrityResult.missingItems"
        :show-pagination="false"
        flat
        :row-key="missingRowKey"
        size="small"
        class="archive-quality-panel__table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'materialType'">
            {{ materialTypeLabel(missingTableRow(record).materialType) }}
          </template>
          <template v-else-if="column.key === 'missingActions'">
            <UiTextAction
              v-if="canAllowMaterialDelay === true"
              tone="primary"
              @click="openDelayAllowModal(missingTableRow(record))"
            >
              延迟补交
            </UiTextAction>
            <UiTextAction
              v-if="canShowRequestMaterialWaive(missingTableRow(record))"
              tone="primary"
              @click="openRequestMaterialWaiveModal(missingTableRow(record))"
            >
              申请缺失豁免
            </UiTextAction>
            <UiTextAction
              v-if="canShowApproveMaterialWaive(missingTableRow(record))"
              tone="primary"
              @click="submitApproveMaterialWaive(missingTableRow(record))"
            >
              审批豁免
            </UiTextAction>
            <UiTextAction
              v-if="canShowApproveMaterialWaive(missingTableRow(record))"
              tone="primary"
              @click="openRejectMaterialWaiveModal(missingTableRow(record))"
            >
              驳回
            </UiTextAction>
            <span
              v-if="findPendingMaterialWaive(missingTableRow(record)) && canShowApproveMaterialWaive(missingTableRow(record)) !== true"
              class="archive-quality-panel__pass-hint"
            >
              待审批
            </span>
          </template>
        </template>
      </UiDataTable>

      <p v-else class="archive-quality-panel__pass-hint">完整性自检已通过，无缺项材料。</p>
    </section>

    <UiDrawer
      :open="delayAllowOpen"
      title="登记延迟补交"
      :width="520"
      :confirm-loading="delayAllowSubmitting === true"
      ok-text="保存"
      :hide-footer="false"
      @update:open="(v: boolean) => (delayAllowOpen = v)"
      @close="delayAllowOpen = false"
      @confirm="submitDelayAllow"
    >
      <UiForm layout="vertical">
        <UiFormItem label="材料类型">
          {{ delayAllowTarget ? materialTypeLabel(delayAllowTarget.materialType) : '—' }}
        </UiFormItem>
        <UiFormItem label="补交截止" required>
          <UiDatePicker
            size="sm"
            v-model="delayAllowForm.deadline"
            :show-time="true"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </UiFormItem>
        <UiFormItem label="责任人" required>
          <ArchiveDutyUserSelect v-model:value="delayAllowForm.responsibleUserId" />
        </UiFormItem>
        <UiFormItem label="缺失说明" required>
          <UiTextarea
            size="sm"
            v-model="delayAllowForm.missingReason"
            :maxlength="500"
            :rows="2"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="requestMaterialWaiveOpen"
      title="申请材料缺失豁免"
      :width="520"
      :confirm-loading="requestingMaterialWaive === true"
      ok-text="提交申请"
      :hide-footer="false"
      @update:open="(v: boolean) => (requestMaterialWaiveOpen = v)"
      @close="requestMaterialWaiveOpen = false"
      @confirm="submitRequestMaterialWaive"
    >
      <UiForm layout="vertical">
        <UiFormItem label="材料类型">
          {{ materialWaiveTarget ? materialTypeLabel(materialWaiveTarget.materialType) : '—' }}
        </UiFormItem>
        <UiFormItem label="豁免原因" required>
          <UiTextarea
            size="sm"
            v-model="materialWaiveReason"
            :maxlength="500"
            :rows="3"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="rejectMaterialWaiveOpen"
      title="驳回材料缺失豁免"
      :width="520"
      :confirm-loading="rejectingMaterialWaive === true"
      ok-text="确认驳回"
      :hide-footer="false"
      @update:open="(v: boolean) => (rejectMaterialWaiveOpen = v)"
      @close="rejectMaterialWaiveOpen = false"
      @confirm="submitRejectMaterialWaive"
    >
      <UiForm layout="vertical">
        <UiFormItem label="材料类型">
          {{ materialWaiveTarget ? materialTypeLabel(materialWaiveTarget.materialType) : '—' }}
        </UiFormItem>
        <UiFormItem label="驳回原因" required>
          <UiTextarea
            size="sm"
            v-model="materialWaiveRejectReason"
            :maxlength="500"
            :rows="3"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="requestIntegrityWaiveOpen"
      title="申请卷完整性豁免"
      :width="520"
      :confirm-loading="requestingIntegrityWaive === true"
      ok-text="提交申请"
      :hide-footer="false"
      @update:open="(v: boolean) => (requestIntegrityWaiveOpen = v)"
      @close="requestIntegrityWaiveOpen = false"
      @confirm="submitRequestIntegrityWaive"
    >
      <UiForm layout="vertical">
        <UiFormItem label="豁免原因" required>
          <UiTextarea
            size="sm"
            v-model="integrityWaiveReason"
            :maxlength="500"
            :rows="3"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="rejectIntegrityWaiveOpen"
      title="驳回完整性豁免"
      :width="520"
      :confirm-loading="rejectingIntegrityWaive === true"
      ok-text="确认驳回"
      :hide-footer="false"
      @update:open="(v: boolean) => (rejectIntegrityWaiveOpen = v)"
      @close="rejectIntegrityWaiveOpen = false"
      @confirm="submitRejectIntegrityWaive"
    >
      <UiForm layout="vertical">
        <UiFormItem label="驳回原因" required>
          <UiTextarea
            size="sm"
            v-model="integrityWaiveRejectReason"
            :maxlength="500"
            :rows="3"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
// MVR-949：props.can* 写控制流仅认 === true
// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveIntegrityMissingItemVO,
  ArchiveMaterialTypeCode,
  ArchiveMaterialWaivePendingItemVO,
  ArchiveVolumeDetailResponse,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { reactive, ref } from 'vue'
import {
  allowArchiveMaterialDelay,
  approveArchiveMaterialWaive,
  approveArchiveVolumeIntegrityWaive,
  ARCHIVE_INTEGRITY_STATUS_TONE,
  ArchiveIntegrityStatusDescription,
  ArchiveMaterialTypeDescription,
  rejectArchiveMaterialWaive,
  rejectArchiveVolumeIntegrityWaive,
  requestArchiveMaterialWaive,
  requestArchiveVolumeIntegrityWaive,
} from '@/apis/mark/archive-volume'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeIntegrityPanel' })

const props = withDefaults(
  defineProps<{
    volumeId: string
    detail: ArchiveVolumeDetailResponse
    displayedIntegrityResult: NonNullable<ArchiveVolumeDetailResponse['latestIntegrityCheck']> | null
    checkingIntegrity: boolean
    currentUserId?: string
    canRunIntegrity?: boolean
    canAllowMaterialDelay?: boolean
    canRequestIntegrityWaive?: boolean
    canApproveIntegrityWaive?: boolean
    canRequestMaterialWaive?: boolean
    canApproveMaterialWaive?: boolean
  }>(),
  {
    currentUserId: '',
    canRunIntegrity: false,
    canAllowMaterialDelay: false,
    canRequestIntegrityWaive: false,
    canApproveIntegrityWaive: false,
    canRequestMaterialWaive: false,
    canApproveMaterialWaive: false,
  },
)

const emit = defineEmits<{
  "refreshed": []
  'run-integrity-check': []
}>()

const requestingIntegrityWaive = ref(false)
const approvingIntegrityWaive = ref(false)
const rejectingIntegrityWaive = ref(false)
const delayAllowOpen = ref(false)
const delayAllowSubmitting = ref(false)
const requestMaterialWaiveOpen = ref(false)
const requestingMaterialWaive = ref(false)
const rejectingMaterialWaive = ref(false)
const rejectMaterialWaiveOpen = ref(false)
const requestIntegrityWaiveOpen = ref(false)
const rejectIntegrityWaiveOpen = ref(false)
const materialWaiveReason = ref('')
const materialWaiveRejectReason = ref('')
const integrityWaiveReason = ref('')
const integrityWaiveRejectReason = ref('')
const delayAllowTarget = ref<ArchiveIntegrityMissingItemVO | null>(null)
const materialWaiveTarget = ref<ArchiveIntegrityMissingItemVO | null>(null)

interface ArchiveIntegrityDelayAllowForm {
  deadline: string | undefined
  responsibleUserId: string | undefined
  missingReason: string
}

const delayAllowForm = reactive<ArchiveIntegrityDelayAllowForm>({
  deadline: undefined,
  responsibleUserId: undefined,
  missingReason: '',
})

const missingColumns: ColumnsType<ArchiveIntegrityMissingItemVO> = [
  { title: '缺项材料', key: 'materialType' },
  { title: '目录', dataIndex: 'catalogName' },
  { title: '操作', key: 'missingActions', width: 220 },
]

function isArchiveIntegrityMissingItem(record: unknown): record is ArchiveIntegrityMissingItemVO {
  return (
    typeof record === 'object'
    && record !== null
    && 'materialType' in record
    && 'catalogCode' in record
  )
}

function missingRowKey(record: unknown): string {
  const row = missingTableRow(record)
  return `${row.materialType}-${row.catalogCode ?? ''}`
}

function missingTableRow(record: unknown): ArchiveIntegrityMissingItemVO {
  if (!isArchiveIntegrityMissingItem(record)) {
    throw new Error('归档完整性缺项行契约异常')
  }
  return record
}

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ArchiveMaterialTypeDescription, code, 'materialType')
}

function integrityStatusLabel(code: ArchiveVolumeDetailResponse['volume']['integrityStatus']) {
  return strictEnumLabel(ArchiveIntegrityStatusDescription, code, 'integrityStatus')
}

function integrityStatusTone(
  code: ArchiveVolumeDetailResponse['volume']['integrityStatus'],
): BadgeTone {
  return strictEnumTone(ARCHIVE_INTEGRITY_STATUS_TONE, code, 'integrityStatus')
}

function findPendingMaterialWaive(
  item: ArchiveIntegrityMissingItemVO,
): ArchiveMaterialWaivePendingItemVO | undefined {
  const pendings = props.detail.pendingMaterialWaives
  if (!pendings?.length) {
    return undefined
  }
  return pendings.find(
    (pending) =>
      pending.materialType === item.materialType
      && (pending.catalogCode ?? '') === (item.catalogCode ?? ''),
  )
}

function canShowRequestMaterialWaive(item: ArchiveIntegrityMissingItemVO): boolean {
  return props.canRequestMaterialWaive === true && !findPendingMaterialWaive(item)
}

function canShowApproveMaterialWaive(item: ArchiveIntegrityMissingItemVO): boolean {
  if (props.canApproveMaterialWaive !== true) {
    return false
  }
  const pending = findPendingMaterialWaive(item)
  if (!pending) {
    return false
  }
  if (!props.currentUserId || !pending.requestUserId) {
    return true
  }
  return String(pending.requestUserId) !== String(props.currentUserId)
}

function openDelayAllowModal(item: ArchiveIntegrityMissingItemVO) {
  if (props.canAllowMaterialDelay !== true) {
    void message.warning('当前账号无延迟补交登记权限')
    return
  }
  delayAllowTarget.value = item
  delayAllowForm.deadline = undefined
  delayAllowForm.responsibleUserId = props.detail.volume.responsibleUserId
  delayAllowForm.missingReason = ''
  delayAllowOpen.value = true
}

async function submitDelayAllow() {
  if (delayAllowSubmitting.value === true) {
    return
  }
  if (props.canAllowMaterialDelay !== true) {
    void message.warning('当前账号无延迟补交登记权限')
    return
  }
  if (!delayAllowTarget.value) return
  if (!delayAllowForm.deadline) {
    showFormValidationMessage('请选择补交截止时间')
    return
  }
  if (!delayAllowForm.responsibleUserId) {
    showFormValidationMessage('请选择延迟补交责任人')
    return
  }
  if (!delayAllowForm.missingReason.trim()) {
    showFormValidationMessage('请填写缺失说明')
    return
  }
  delayAllowSubmitting.value = true
  try {
    await allowArchiveMaterialDelay({
      volumeId: props.volumeId,
      materialType: delayAllowTarget.value.materialType,
      catalogCode: delayAllowTarget.value.catalogCode,
      delayAllowedTime: delayAllowForm.deadline,
      delayResponsibleUserId: delayAllowForm.responsibleUserId,
      missingReason: delayAllowForm.missingReason.trim(),
    })
    void message.success('已登记延迟补交')
    delayAllowOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error, '登记延迟补交失败')
  } finally {
    delayAllowSubmitting.value = false
  }
}

function openRequestMaterialWaiveModal(item: ArchiveIntegrityMissingItemVO) {
  if (canShowRequestMaterialWaive(item) !== true) {
    void message.warning('当前账号不可申请材料缺失豁免')
    return
  }
  materialWaiveTarget.value = item
  materialWaiveReason.value = ''
  requestMaterialWaiveOpen.value = true
}

async function submitRequestMaterialWaive() {
  if (requestingMaterialWaive.value === true) {
    return
  }
  if (!materialWaiveTarget.value) return
  if (canShowRequestMaterialWaive(materialWaiveTarget.value) !== true) {
    void message.warning('当前账号不可申请材料缺失豁免')
    return
  }
  if (!materialWaiveReason.value.trim()) {
    showFormValidationMessage('请填写豁免原因')
    return
  }
  requestingMaterialWaive.value = true
  try {
    await requestArchiveMaterialWaive({
      volumeId: props.volumeId,
      materialType: materialWaiveTarget.value.materialType,
      catalogCode: materialWaiveTarget.value.catalogCode,
      reason: materialWaiveReason.value.trim(),
    })
    void message.success('已提交材料缺失豁免申请')
    requestMaterialWaiveOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error, '申请材料缺失豁免失败')
  } finally {
    requestingMaterialWaive.value = false
  }
}

async function submitApproveMaterialWaive(item: ArchiveIntegrityMissingItemVO) {
  if (canShowApproveMaterialWaive(item) !== true) {
    void message.warning('当前账号不可审批材料缺失豁免')
    return
  }
  try {
    await approveArchiveMaterialWaive({
      volumeId: props.volumeId,
      materialType: item.materialType,
      catalogCode: item.catalogCode,
    })
    void message.success('已审批通过材料缺失豁免')
    emit('refreshed')
  } catch (error) {
    showUserError(error, '审批材料缺失豁免失败')
  }
}

function openRejectMaterialWaiveModal(item: ArchiveIntegrityMissingItemVO) {
  if (canShowApproveMaterialWaive(item) !== true) {
    void message.warning('当前账号不可驳回材料缺失豁免')
    return
  }
  materialWaiveTarget.value = item
  materialWaiveRejectReason.value = ''
  rejectMaterialWaiveOpen.value = true
}

async function submitRejectMaterialWaive() {
  if (rejectingMaterialWaive.value === true) {
    return
  }
  if (!materialWaiveTarget.value) return
  if (canShowApproveMaterialWaive(materialWaiveTarget.value) !== true) {
    void message.warning('当前账号不可驳回材料缺失豁免')
    return
  }
  if (!materialWaiveRejectReason.value.trim()) {
    showFormValidationMessage('请填写驳回原因')
    return
  }
  rejectingMaterialWaive.value = true
  try {
    await rejectArchiveMaterialWaive({
      volumeId: props.volumeId,
      materialType: materialWaiveTarget.value.materialType,
      catalogCode: materialWaiveTarget.value.catalogCode,
      rejectReason: materialWaiveRejectReason.value.trim(),
    })
    void message.success('已驳回材料缺失豁免申请')
    rejectMaterialWaiveOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error, '驳回材料缺失豁免失败')
  } finally {
    rejectingMaterialWaive.value = false
  }
}

function openRequestIntegrityWaiveModal() {
  if (props.canRequestIntegrityWaive !== true) {
    void message.warning('当前账号不可申请完整性豁免')
    return
  }
  integrityWaiveReason.value = ''
  requestIntegrityWaiveOpen.value = true
}

async function submitRequestIntegrityWaive() {
  if (requestingIntegrityWaive.value === true) {
    return
  }
  if (props.canRequestIntegrityWaive !== true) {
    void message.warning('当前账号不可申请完整性豁免')
    return
  }
  if (!integrityWaiveReason.value.trim()) {
    showFormValidationMessage('请填写豁免原因')
    return
  }
  requestingIntegrityWaive.value = true
  try {
    await requestArchiveVolumeIntegrityWaive({
      volumeId: props.volumeId,
      reason: integrityWaiveReason.value.trim(),
    })
    void message.success('已提交完整性豁免申请')
    requestIntegrityWaiveOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error, '申请完整性豁免失败')
  } finally {
    requestingIntegrityWaive.value = false
  }
}

async function submitApproveIntegrityWaive() {
  if (approvingIntegrityWaive.value === true) {
    return
  }
  if (props.canApproveIntegrityWaive !== true) {
    void message.warning('当前账号不可审批完整性豁免')
    return
  }
  approvingIntegrityWaive.value = true
  try {
    await approveArchiveVolumeIntegrityWaive(props.volumeId)
    void message.success('已审批通过完整性豁免')
    emit('refreshed')
  } catch (error) {
    showUserError(error, '审批完整性豁免失败')
  } finally {
    approvingIntegrityWaive.value = false
  }
}

function openRejectIntegrityWaiveModal() {
  if (props.canApproveIntegrityWaive !== true) {
    void message.warning('当前账号不可驳回完整性豁免')
    return
  }
  integrityWaiveRejectReason.value = ''
  rejectIntegrityWaiveOpen.value = true
}

async function submitRejectIntegrityWaive() {
  if (rejectingIntegrityWaive.value === true) {
    return
  }
  if (props.canApproveIntegrityWaive !== true) {
    void message.warning('当前账号不可驳回完整性豁免')
    return
  }
  if (!integrityWaiveRejectReason.value.trim()) {
    showFormValidationMessage('请填写驳回原因')
    return
  }
  rejectingIntegrityWaive.value = true
  try {
    await rejectArchiveVolumeIntegrityWaive({
      volumeId: props.volumeId,
      rejectReason: integrityWaiveRejectReason.value.trim(),
    })
    void message.success('已驳回完整性豁免申请')
    rejectIntegrityWaiveOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error, '驳回完整性豁免失败')
  } finally {
    rejectingIntegrityWaive.value = false
  }
}
</script>

<style scoped lang="scss">
.archive-quality-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
  padding: var(--dp-space-component) var(--dp-space-block);
}

.archive-quality-panel__section {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}

.archive-quality-panel__section-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}

.archive-quality-panel__section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-left: auto;
}

.archive-quality-panel__section-title {
  margin: 0;
  font-size: var(--dp-type-panel-title-size);
  font-weight: 600;
  letter-spacing: 0;
}

.archive-quality-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-block);
  border: 1px dashed var(--dp-border);
  border-radius: var(--dp-radius-control);
  background: var(--dp-surface-subtle);
}

.archive-quality-panel__empty-title {
  margin: 0;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-quality-panel__empty-desc {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.archive-quality-panel__pass-hint {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.archive-quality-panel__table {
  min-width: 0;
}
</style>
