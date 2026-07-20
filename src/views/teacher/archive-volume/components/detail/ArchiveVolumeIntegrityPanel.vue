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
            v-if="canRunIntegrity"
            size="sm"
            variant="primary"
            :loading="checkingIntegrity"
            @click="emit('run-integrity-check')"
          >
            执行完整性自检
          </UiButton>
          <UiButton
            v-if="canWaiveIntegrity"
            size="sm"
            variant="outline"
            :loading="waivingIntegrity"
            @click="openWaiveIntegrityModal"
          >
            授权豁免
          </UiButton>
        </div>
      </div>

      <div
        v-if="!displayedIntegrityResult"
        class="archive-quality-panel__empty"
      >
        <p class="archive-quality-panel__empty-title">尚未执行完整性自检</p>
        <p class="archive-quality-panel__empty-desc">
          对照必交材料清单检查缺件，通过后方可继续自检清单与四性检测。
        </p>
        <UiButton
          v-if="canRunIntegrity"
          size="sm"
          variant="primary"
          :loading="checkingIntegrity"
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
              v-if="canAllowMaterialDelay"
              tone="primary"
              @click="openDelayAllowModal(missingTableRow(record))"
            >
              延迟补交
            </UiTextAction>
            <UiTextAction
              v-if="canWaiveMaterialMissing"
              tone="primary"
              @click="openWaiveMissingModal(missingTableRow(record))"
            >
              缺失豁免
            </UiTextAction>
          </template>
        </template>
      </UiDataTable>

      <p v-else class="archive-quality-panel__pass-hint">
        完整性自检已通过，无缺项材料。
      </p>
    </section>

    <UiDrawer
      :open="delayAllowOpen"
      title="登记延迟补交"
      :width="520"
      :confirm-loading="delayAllowSubmitting"
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
      :open="waiveMissingOpen"
      title="材料缺失豁免"
      :width="520"
      :confirm-loading="waiveMissingSubmitting"
      ok-text="授权豁免"
      :hide-footer="false"
      @update:open="(v: boolean) => (waiveMissingOpen = v)"
      @close="waiveMissingOpen = false"
      @confirm="submitWaiveMissing"
    >
      <UiForm layout="vertical">
        <UiFormItem label="材料类型">
          {{ waiveMissingTarget ? materialTypeLabel(waiveMissingTarget.materialType) : '—' }}
        </UiFormItem>
        <UiFormItem label="豁免原因" required>
          <UiTextarea size="sm" v-model="waiveMissingReason" :maxlength="500" :rows="3" :show-count="true" />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="waiveIntegrityOpen"
      title="卷完整性豁免"
      :width="520"
      :confirm-loading="waivingIntegrity"
      ok-text="授权豁免"
      :hide-footer="false"
      @update:open="(v: boolean) => (waiveIntegrityOpen = v)"
      @close="waiveIntegrityOpen = false"
      @confirm="submitWaiveIntegrity"
    >
      <UiForm layout="vertical">
        <UiFormItem label="豁免原因" required>
          <UiTextarea size="sm" v-model="waiveIntegrityReason" :maxlength="500" :rows="3" :show-count="true" />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveIntegrityMissingItemVO,
  ArchiveMaterialTypeCode,
  ArchiveVolumeDetailResponse,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { reactive, ref } from 'vue'
import {
  allowArchiveMaterialDelay,
  ARCHIVE_INTEGRITY_STATUS_TONE,
  ArchiveIntegrityStatusDescription,
  ArchiveMaterialTypeDescription,
  waiveArchiveMaterialMissing,
  waiveArchiveVolumeIntegrity,
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

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
  displayedIntegrityResult: NonNullable<ArchiveVolumeDetailResponse['latestIntegrityCheck']> | null
  checkingIntegrity: boolean
  canRunIntegrity: boolean
  canAllowMaterialDelay: boolean
  canWaiveMaterialMissing: boolean
  canWaiveIntegrity: boolean
}>()

const emit = defineEmits<{
  'refreshed': []
  'run-integrity-check': []
}>()

const waivingIntegrity = ref(false)
const delayAllowOpen = ref(false)
const delayAllowSubmitting = ref(false)
const waiveMissingOpen = ref(false)
const waiveMissingSubmitting = ref(false)
const waiveIntegrityOpen = ref(false)
const waiveMissingReason = ref('')
const waiveIntegrityReason = ref('')
const delayAllowTarget = ref<ArchiveIntegrityMissingItemVO | null>(null)
const waiveMissingTarget = ref<ArchiveIntegrityMissingItemVO | null>(null)

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
  { title: '操作', key: 'missingActions', width: 180 },
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

function openDelayAllowModal(item: ArchiveIntegrityMissingItemVO) {
  // MVR-348：与 canAllowMaterialDelay 同源二次拦截
  if (props.canAllowMaterialDelay !== true) {
    message.warning('当前账号无延迟补交登记权限')
    return
  }
  delayAllowTarget.value = item
  delayAllowForm.deadline = undefined
  delayAllowForm.responsibleUserId = props.detail.volume.responsibleUserId
  delayAllowForm.missingReason = ''
  delayAllowOpen.value = true
}

async function submitDelayAllow() {
  if (delayAllowSubmitting.value) {
    return
  }
  if (props.canAllowMaterialDelay !== true) {
    message.warning('当前账号无延迟补交登记权限')
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
    message.success('已登记延迟补交')
    delayAllowOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error, '登记延迟补交失败')
  } finally {
    delayAllowSubmitting.value = false
  }
}

function openWaiveMissingModal(item: ArchiveIntegrityMissingItemVO) {
  // MVR-348：与 canWaiveMaterialMissing 同源二次拦截
  if (props.canWaiveMaterialMissing !== true) {
    message.warning('当前账号无材料缺失豁免权限')
    return
  }
  waiveMissingTarget.value = item
  waiveMissingReason.value = ''
  waiveMissingOpen.value = true
}

async function submitWaiveMissing() {
  if (waiveMissingSubmitting.value) {
    return
  }
  if (props.canWaiveMaterialMissing !== true) {
    message.warning('当前账号无材料缺失豁免权限')
    return
  }
  if (!waiveMissingTarget.value) return
  if (!waiveMissingReason.value.trim()) {
    showFormValidationMessage('请填写豁免原因')
    return
  }
  waiveMissingSubmitting.value = true
  try {
    await waiveArchiveMaterialMissing({
      volumeId: props.volumeId,
      materialType: waiveMissingTarget.value.materialType,
      catalogCode: waiveMissingTarget.value.catalogCode,
      reason: waiveMissingReason.value.trim(),
    })
    message.success('已授权材料缺失豁免')
    waiveMissingOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error, '材料缺失豁免失败')
  } finally {
    waiveMissingSubmitting.value = false
  }
}

function openWaiveIntegrityModal() {
  // MVR-348：与 canWaiveIntegrity 同源二次拦截
  if (props.canWaiveIntegrity !== true) {
    message.warning('当前账号无完整性豁免权限')
    return
  }
  waiveIntegrityReason.value = ''
  waiveIntegrityOpen.value = true
}

async function submitWaiveIntegrity() {
  if (waivingIntegrity.value) {
    return
  }
  if (props.canWaiveIntegrity !== true) {
    message.warning('当前账号无完整性豁免权限')
    return
  }
  if (!waiveIntegrityReason.value.trim()) {
    showFormValidationMessage('请填写豁免原因')
    return
  }
  waivingIntegrity.value = true
  try {
    await waiveArchiveVolumeIntegrity({
      volumeId: props.volumeId,
      reason: waiveIntegrityReason.value.trim(),
    })
    message.success('已授权完整性豁免')
    waiveIntegrityOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error, '完整性豁免失败')
  } finally {
    waivingIntegrity.value = false
  }
}
</script>

<style scoped lang="scss">
.archive-quality-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
  padding: var(--dp-space-3) var(--dp-space-4);
}

.archive-quality-panel__section {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
}

.archive-quality-panel__section-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.archive-quality-panel__section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  margin-left: auto;
}

.archive-quality-panel__section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.archive-quality-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--dp-space-2);
  padding: var(--dp-space-4);
  border: 1px dashed var(--dp-border);
  border-radius: var(--dp-radius-control);
  background: var(--dp-surface-subtle);
}

.archive-quality-panel__empty-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-quality-panel__empty-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.archive-quality-panel__pass-hint {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.archive-quality-panel__table {
  min-width: 0;
}
</style>
