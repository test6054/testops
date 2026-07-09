<template>
  <WorkbenchSurfaceCard class="archive-volume-integrity-panel">
    <template #toolbar>
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
    </template>
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

    <section v-if="detail.volume.securityLevel" class="archive-volume-integrity-panel__security">
      <div class="archive-volume-integrity-panel__section-head">
        <h3 class="archive-volume-integrity-panel__section-title">密级与定密</h3>
        <UiTag :tone="detail.volume.securityMarkPending ? 'orange' : 'green'" size="sm">
          {{ detail.volume.securityMarkPending ? '待确认' : '已确认' }}
        </UiTag>
      </div>
      <p class="archive-volume-integrity-panel__security-level">
        当前密级：{{ securityLevelLabel(detail.volume.securityLevel) }}
      </p>
      <div class="archive-volume-integrity-panel__actions">
        <UiButton
          v-if="detail.canConfirmSecurityMark"
          size="sm"
          variant="outline"
          :loading="confirmingSecurityMark"
          @click="openConfirmSecurityMarkModal"
        >
          确认密级定密
        </UiButton>
        <UiButton
          v-if="detail.canUpdateSecurityLevel"
          size="sm"
          variant="outline"
          :loading="updatingSecurityLevel"
          @click="openUpdateSecurityLevelModal"
        >
          变更密级
        </UiButton>
      </div>
    </section>

    <section class="archive-volume-integrity-panel__four-property">
      <div class="archive-volume-integrity-panel__section-head">
        <h3 class="archive-volume-integrity-panel__section-title">四性检测</h3>
        <UiTag
          v-if="displayedFourProperty && !detail.fourPropertyStale"
          :tone="fourPropertySummary.passed === fourPropertySummary.total ? 'green' : 'orange'"
          size="sm"
        >
          {{ fourPropertySummary.passed }}/{{ fourPropertySummary.total }} 通过
        </UiTag>
        <p v-if="detail.fourPropertyStale" class="archive-volume-integrity-panel__stale-hint">
          结论已失效，请重新检测
        </p>
        <p
          v-else-if="!detail.latestFourPropertyCheck"
          class="archive-volume-integrity-panel__stale-hint"
        >
          尚未执行四性检测
        </p>
        <div class="archive-volume-integrity-panel__section-actions">
          <UiButton
            size="sm"
            variant="ghost"
            :loading="checkingFourProperty"
            @click="runFourPropertyCheck"
          >
            重新检测
          </UiButton>
          <UiButton
            v-if="canWaiveIntegrity"
            size="sm"
            variant="ghost"
            :loading="waivingIntegrity"
            @click="openWaiveIntegrityModal"
          >
            豁免
          </UiButton>
        </div>
      </div>
      <ArchiveFourPropertyGrid :check="displayedFourProperty" />
    </section>

    <ArchiveVolumeSelfCheckList
      :volume-id="volumeId"
      :self-check-status="detail.selfCheckStatus"
      :readonly="!canEditSelfCheck"
      embedded
      class="archive-volume-integrity-panel__self-check"
      @refreshed="emit('refreshed')"
      @open-sign-off="emit('open-sign-off')"
    />

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
      <a-form layout="vertical">
        <a-form-item label="材料类型">
          {{ waiveMissingTarget ? materialTypeLabel(waiveMissingTarget.materialType) : '—' }}
        </a-form-item>
        <a-form-item label="豁免原因" required>
          <a-textarea v-model:value="waiveMissingReason" :rows="3" />
        </a-form-item>
      </a-form>
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
      <a-form layout="vertical">
        <a-form-item label="豁免原因" required>
          <a-textarea v-model:value="waiveIntegrityReason" :rows="3" />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer
      :open="confirmSecurityMarkOpen"
      title="密级定密确认"
      :width="520"
      :confirm-loading="confirmingSecurityMark"
      ok-text="确认定密"
      :hide-footer="false"
      @update:open="(v: boolean) => (confirmSecurityMarkOpen = v)"
      @close="confirmSecurityMarkOpen = false"
      @confirm="submitConfirmSecurityMark"
    >
      <a-form layout="vertical">
        <a-form-item label="当前密级">
          {{ securityLevelLabel(detail.volume.securityLevel!) }}
        </a-form-item>
        <a-form-item label="确认说明">
          <a-textarea
            v-model:value="confirmSecurityMarkReason"
            :rows="3"
            placeholder="如：教学档案内部定密，卷内材料密级一致"
          />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer
      :open="updateSecurityLevelOpen"
      title="变更卷密级"
      :width="520"
      :confirm-loading="updatingSecurityLevel"
      ok-text="保存"
      :hide-footer="false"
      @update:open="(v: boolean) => (updateSecurityLevelOpen = v)"
      @close="updateSecurityLevelOpen = false"
      @confirm="submitUpdateSecurityLevel"
    >
      <a-form layout="vertical">
        <a-form-item label="新密级" required>
          <a-select
            v-model:value="updateSecurityLevelForm.securityLevel"
            :options="securityLevelOptions"
            placeholder="选择密级"
          />
        </a-form-item>
        <a-form-item label="变更原因" required>
          <a-textarea v-model:value="updateSecurityLevelForm.reason" :rows="3" />
        </a-form-item>
      </a-form>
    </UiDrawer>
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveIntegrityMissingItemVO,
  ArchiveMaterialTypeCode,
  ArchiveSecurityLevelCode,
  ArchiveVolumeDetailResponse,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'
import {
  allowArchiveMaterialDelay,
  ARCHIVE_INTEGRITY_STATUS_TONE,
  ARCHIVE_SECURITY_LEVEL_OPTIONS,
  ArchiveIntegrityStatusDescription,
  ArchiveMaterialTypeDescription,
  ArchiveSecurityLevelDescription,
  checkArchiveVolumeFourProperty,
  checkArchiveVolumeIntegrity,
  confirmArchiveVolumeSecurityMark,
  updateArchiveVolumeSecurityLevel,
  waiveArchiveMaterialMissing,
  waiveArchiveVolumeIntegrity,
} from '@/apis/mark/archive-volume'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import {
  buildFourPropertyDimensionViews,
  countFourPropertyPassed,
} from '@/utils/archive-four-property-diagnostic'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveFourPropertyGrid from '@/views/teacher/archive-volume/components/detail/ArchiveFourPropertyGrid.vue'
import ArchiveVolumeSelfCheckList from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeSelfCheckList.vue'

defineOptions({ name: 'ArchiveVolumeIntegrityPanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
  displayedIntegrityResult: NonNullable<ArchiveVolumeDetailResponse['latestIntegrityCheck']> | null
  displayedFourProperty: NonNullable<ArchiveVolumeDetailResponse['latestFourPropertyCheck']> | null
  checkingIntegrity: boolean
  canAllowMaterialDelay: boolean
  canWaiveMaterialMissing: boolean
  canWaiveIntegrity: boolean
  canEditSelfCheck: boolean
}>()

const emit = defineEmits<{
  "refreshed": []
  'integrity-checked': [result: Awaited<ReturnType<typeof checkArchiveVolumeIntegrity>>]
  'four-property-checked': [result: Awaited<ReturnType<typeof checkArchiveVolumeFourProperty>>]
  'run-integrity-check': []
  'open-sign-off': []
}>()

const checkingFourProperty = ref(false)
const waivingIntegrity = ref(false)
const delayAllowOpen = ref(false)
const delayAllowSubmitting = ref(false)
const waiveMissingOpen = ref(false)
const waiveMissingSubmitting = ref(false)
const waiveIntegrityOpen = ref(false)
const confirmSecurityMarkOpen = ref(false)
const updateSecurityLevelOpen = ref(false)
const confirmingSecurityMark = ref(false)
const updatingSecurityLevel = ref(false)
const waiveMissingReason = ref('')
const waiveIntegrityReason = ref('')
const confirmSecurityMarkReason = ref('')
interface UpdateSecurityLevelForm {
  securityLevel?: ArchiveSecurityLevelCode
  reason: string
}

const updateSecurityLevelForm = reactive<UpdateSecurityLevelForm>({
  reason: '',
})
const securityLevelOptions = ARCHIVE_SECURITY_LEVEL_OPTIONS
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

const fourPropertySummary = computed(() =>
  countFourPropertyPassed(buildFourPropertyDimensionViews(props.displayedFourProperty)),
)

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

function securityLevelLabel(code: ArchiveSecurityLevelCode) {
  return strictEnumLabel(ArchiveSecurityLevelDescription, code, 'securityLevel')
}

function openConfirmSecurityMarkModal() {
  confirmSecurityMarkReason.value = ''
  confirmSecurityMarkOpen.value = true
}

async function submitConfirmSecurityMark() {
  confirmingSecurityMark.value = true
  try {
    await confirmArchiveVolumeSecurityMark({
      volumeId: props.volumeId,
      reason: confirmSecurityMarkReason.value.trim() || undefined,
    })
    message.success('密级定密已确认')
    confirmSecurityMarkOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  } finally {
    confirmingSecurityMark.value = false
  }
}

function openUpdateSecurityLevelModal() {
  updateSecurityLevelForm.securityLevel = props.detail.volume.securityLevel
  updateSecurityLevelForm.reason = ''
  updateSecurityLevelOpen.value = true
}

async function submitUpdateSecurityLevel() {
  if (!updateSecurityLevelForm.securityLevel) {
    message.warning('请选择新密级')
    return
  }
  if (!updateSecurityLevelForm.reason.trim()) {
    message.warning('请填写变更原因')
    return
  }
  updatingSecurityLevel.value = true
  try {
    await updateArchiveVolumeSecurityLevel({
      volumeId: props.volumeId,
      securityLevel: updateSecurityLevelForm.securityLevel,
      reason: updateSecurityLevelForm.reason.trim(),
    })
    message.success('密级已变更，请重新确认定密并执行四性检测')
    updateSecurityLevelOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  } finally {
    updatingSecurityLevel.value = false
  }
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
  gap: var(--dp-space-4);
}

.archive-volume-integrity-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.archive-volume-integrity-panel__missing-table {
  margin-top: var(--dp-space-3);
}

.archive-volume-integrity-panel__section-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  margin-bottom: var(--dp-space-3);
}

.archive-volume-integrity-panel__section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  margin-left: auto;
}

.archive-volume-integrity-panel__section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.archive-volume-integrity-panel__stale-hint {
  margin: 0;
  font-size: 13px;
  color: var(--dp-orange-700);
}

.archive-volume-integrity-panel__four-property {
  margin-top: var(--dp-space-4);
}

.archive-volume-integrity-panel__security {
  margin-top: var(--dp-space-4);
  padding-top: var(--dp-space-4);
  border-top: 1px solid var(--dp-border-light);
}

.archive-volume-integrity-panel__security-level {
  margin: 0 0 var(--dp-space-3);
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.archive-volume-integrity-panel__self-check {
  border-top: 1px solid var(--dp-border-light);
  padding-top: var(--dp-space-4);
}
</style>
