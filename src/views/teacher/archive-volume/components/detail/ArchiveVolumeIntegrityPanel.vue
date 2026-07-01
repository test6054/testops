<template>
  <section class="archive-volume-integrity-panel">
    <div class="archive-volume-integrity-panel__actions">
      <UiButton size="sm" :loading="checkingIntegrity" @click="emit('run-integrity-check')">
        完整性自检
      </UiButton>
      <UiButton size="sm" :loading="checkingFourProperty" @click="runFourPropertyCheck">
        四性检测
      </UiButton>
      <UiButton
        v-if="canWaiveIntegrity"
        size="sm"
        variant="outline"
        :loading="waivingIntegrity"
        @click="openWaiveIntegrityModal"
      >
        授权完整性豁免
      </UiButton>
    </div>
    <div v-if="displayedIntegrityResult" class="archive-volume-integrity-panel__result">
      <UiTag
        :tone="
          integrityStatusTone(
            displayedIntegrityResult.integrityStatus ?? detail.volume.integrityStatus,
          )
        "
        size="sm"
      >
        {{
          integrityStatusLabel(
            displayedIntegrityResult.integrityStatus ?? detail.volume.integrityStatus,
          )
        }}
      </UiTag>
      <UiDataTable
        v-if="displayedIntegrityResult.missingItems?.length"
        pagination-mode="none"
        :columns="missingColumns"
        :data-source="displayedIntegrityResult.missingItems"
        :show-pagination="false"
        flat
        :row-key="missingRowKey"
        size="small"
        class="archive-volume-integrity-panel__missing-table"
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
    </div>
    <div v-if="displayedFourProperty" class="archive-volume-integrity-panel__four-property">
      <p>真实性：{{ displayedFourProperty.authenticityPassed ? '通过' : '未通过' }}</p>
      <p>可靠性：{{ displayedFourProperty.reliabilityPassed ? '通过' : '未通过' }}</p>
      <p>完整性：{{ displayedFourProperty.integrityPassed ? '通过' : '未通过' }}</p>
      <p>可用性：{{ displayedFourProperty.usabilityPassed ? '通过' : '未通过' }}</p>
      <p v-if="detail.fourPropertyStale" class="archive-volume-integrity-panel__stale-hint">
        结论已失效，请重新检测
      </p>
      <p
        v-else-if="!detail.latestFourPropertyCheck"
        class="archive-volume-integrity-panel__stale-hint"
      >
        尚未执行四性检测
      </p>
    </div>

    <a-modal
      v-model:open="delayAllowOpen"
      title="登记延迟补交"
      :confirm-loading="delayAllowSubmitting"
      ok-text="保存"
      cancel-text="取消"
      @ok="submitDelayAllow"
    >
      <a-form layout="vertical">
        <a-form-item label="材料类型">
          {{ delayAllowTarget ? materialTypeLabel(delayAllowTarget.materialType) : '—' }}
        </a-form-item>
        <a-form-item label="补交截止" required>
          <a-date-picker
            v-model:value="delayAllowForm.deadline"
            show-time
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="责任人" required>
          <ArchiveDutyUserSelect v-model:value="delayAllowForm.responsibleUserId" />
        </a-form-item>
        <a-form-item label="缺失说明">
          <a-textarea v-model:value="delayAllowForm.missingReason" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="waiveMissingOpen"
      title="材料缺失豁免"
      :confirm-loading="waiveMissingSubmitting"
      ok-text="授权豁免"
      cancel-text="取消"
      @ok="submitWaiveMissing"
    >
      <a-form layout="vertical">
        <a-form-item label="材料类型">
          {{ waiveMissingTarget ? materialTypeLabel(waiveMissingTarget.materialType) : '—' }}
        </a-form-item>
        <a-form-item label="豁免原因" required>
          <a-textarea v-model:value="waiveMissingReason" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="waiveIntegrityOpen"
      title="卷完整性豁免"
      :confirm-loading="waivingIntegrity"
      ok-text="授权豁免"
      cancel-text="取消"
      @ok="submitWaiveIntegrity"
    >
      <a-form layout="vertical">
        <a-form-item label="豁免原因" required>
          <a-textarea v-model:value="waiveIntegrityReason" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveIntegrityMissingItemVO,
  ArchiveMaterialTypeCode,
  ArchiveVolumeDetailVO,
} from '@/apis/mark/archive-volume'
import {
  allowArchiveMaterialDelay,
  ARCHIVE_INTEGRITY_STATUS_LABEL,
  ARCHIVE_INTEGRITY_STATUS_TONE,
  ARCHIVE_MATERIAL_TYPE_LABEL,
  checkArchiveVolumeFourProperty,
  checkArchiveVolumeIntegrity,
  waiveArchiveMaterialMissing,
  waiveArchiveVolumeIntegrity,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeIntegrityPanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailVO
  displayedIntegrityResult: NonNullable<ArchiveVolumeDetailVO['latestIntegrityCheck']> | null
  displayedFourProperty: NonNullable<ArchiveVolumeDetailVO['latestFourPropertyCheck']> | null
  checkingIntegrity: boolean
  canAllowMaterialDelay: boolean
  canWaiveMaterialMissing: boolean
  canWaiveIntegrity: boolean
}>()

const emit = defineEmits<{
  refreshed: []
  'integrity-checked': [result: Awaited<ReturnType<typeof checkArchiveVolumeIntegrity>>]
  'four-property-checked': [result: Awaited<ReturnType<typeof checkArchiveVolumeFourProperty>>]
  'run-integrity-check': []
}>()

const checkingFourProperty = ref(false)
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
const delayAllowForm = reactive({
  deadline: undefined as string | undefined,
  responsibleUserId: undefined as string | undefined,
  missingReason: '',
})

const missingColumns: ColumnsType<ArchiveIntegrityMissingItemVO> = [
  { title: '缺项材料', key: 'materialType' },
  { title: '目录', dataIndex: 'catalogName' },
  { title: '操作', key: 'missingActions', width: 180 },
]

function missingRowKey(record: unknown): string {
  const row = record as ArchiveIntegrityMissingItemVO
  return `${row.materialType}-${row.catalogCode ?? ''}`
}

function missingTableRow(record: unknown): ArchiveIntegrityMissingItemVO {
  return record as ArchiveIntegrityMissingItemVO
}

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_TYPE_LABEL, code, 'materialType')
}

function integrityStatusLabel(code: ArchiveVolumeDetailVO['volume']['integrityStatus']) {
  return strictEnumLabel(ARCHIVE_INTEGRITY_STATUS_LABEL, code, 'integrityStatus')
}

function integrityStatusTone(code: ArchiveVolumeDetailVO['volume']['integrityStatus']): BadgeTone {
  return strictEnumTone(ARCHIVE_INTEGRITY_STATUS_TONE, code, 'integrityStatus')
}

async function runFourPropertyCheck() {
  checkingFourProperty.value = true
  try {
    const result = await checkArchiveVolumeFourProperty(props.volumeId)
    emit('four-property-checked', result)
    message.success('四性检测完成')
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  } finally {
    checkingFourProperty.value = false
  }
}

function openDelayAllowModal(item: ArchiveIntegrityMissingItemVO) {
  delayAllowTarget.value = item
  delayAllowForm.deadline = undefined
  delayAllowForm.responsibleUserId = props.detail.volume.responsibleUserId
  delayAllowForm.missingReason = ''
  delayAllowOpen.value = true
}

async function submitDelayAllow() {
  if (!delayAllowTarget.value) return
  if (!delayAllowForm.deadline) {
    message.warning('请选择补交截止时间')
    return
  }
  if (!delayAllowForm.responsibleUserId) {
    message.warning('请选择延迟补交责任人')
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
      missingReason: delayAllowForm.missingReason.trim() || undefined,
    })
    message.success('已登记延迟补交')
    delayAllowOpen.value = false
    emit('refreshed')
    const result = await checkArchiveVolumeIntegrity(props.volumeId)
    emit('integrity-checked', result)
  } catch (error) {
    showUserError(error)
  } finally {
    delayAllowSubmitting.value = false
  }
}

function openWaiveMissingModal(item: ArchiveIntegrityMissingItemVO) {
  waiveMissingTarget.value = item
  waiveMissingReason.value = ''
  waiveMissingOpen.value = true
}

async function submitWaiveMissing() {
  if (!waiveMissingTarget.value) return
  if (!waiveMissingReason.value.trim()) {
    message.warning('请填写豁免原因')
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
    const result = await checkArchiveVolumeIntegrity(props.volumeId)
    emit('integrity-checked', result)
  } catch (error) {
    showUserError(error)
  } finally {
    waiveMissingSubmitting.value = false
  }
}

function openWaiveIntegrityModal() {
  waiveIntegrityReason.value = ''
  waiveIntegrityOpen.value = true
}

async function submitWaiveIntegrity() {
  if (!waiveIntegrityReason.value.trim()) {
    message.warning('请填写豁免原因')
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
    showUserError(error)
  } finally {
    waivingIntegrity.value = false
  }
}
</script>

<style scoped>
.archive-volume-integrity-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-integrity-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-integrity-panel__missing-table {
  margin-top: var(--dp-space-3, 12px);
}

.archive-volume-integrity-panel__four-property p {
  margin: 4px 0;
  font-size: 14px;
}

.archive-volume-integrity-panel__stale-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--dp-orange-700, #c2410c);
}
</style>
