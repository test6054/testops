<template>
  <WorkbenchSurfaceCard embedded class="archive-quality-panel">
    <section v-if="detail.volume.securityLevel" class="archive-quality-panel__section">
      <div class="archive-quality-panel__section-head">
        <h3 class="archive-quality-panel__section-title">密级与定密</h3>
        <UiTag :tone="detail.volume.securityMarkPending ? 'orange' : 'green'" size="sm">
          {{ detail.volume.securityMarkPending ? '待确认' : '已确认' }}
        </UiTag>
        <div class="archive-quality-panel__section-actions">
          <UiButton
            v-if="detail.canConfirmSecurityMark === true"
            size="sm"
            variant="outline"
            :loading="confirmingSecurityMark"
            @click="openConfirmSecurityMarkModal"
          >
            确认密级定密
          </UiButton>
          <UiButton
            v-if="detail.canUpdateSecurityLevel === true"
            size="sm"
            variant="ghost"
            :loading="updatingSecurityLevel"
            @click="openUpdateSecurityLevelModal"
          >
            变更密级
          </UiButton>
        </div>
      </div>
      <ConfidentialStatusBar
        :title="securityBarTitle"
        :description="securityBarDescription"
      />
    </section>

    <section class="archive-quality-panel__section">
      <div class="archive-quality-panel__section-head">
        <h3 class="archive-quality-panel__section-title">四性检测</h3>
        <UiTag
          v-if="displayedFourProperty && !detail.fourPropertyStale"
          :tone="fourPropertySummary.passed === fourPropertySummary.total ? 'green' : 'orange'"
          size="sm"
        >
          {{ fourPropertySummary.passed }}/{{ fourPropertySummary.total }} 通过
        </UiTag>
        <p v-if="detail.fourPropertyStale" class="archive-quality-panel__stale-hint">
          结论已失效，请重新检测
        </p>
        <div class="archive-quality-panel__section-actions">
          <UiButton
            v-if="canRunFourProperty"
            size="sm"
            variant="primary"
            :loading="checkingFourProperty"
            @click="runFourPropertyCheck"
          >
            {{ displayedFourProperty || detail.latestFourPropertyCheck ? '重新执行四性检测' : '执行四性检测' }}
          </UiButton>
        </div>
      </div>

      <div v-if="!displayedFourProperty" class="archive-quality-panel__empty">
        <p class="archive-quality-panel__empty-title">尚未执行四性检测</p>
        <p class="archive-quality-panel__empty-desc">
          检测真实性、完整性、可用性、安全性；密级变更或材料变更后须重新执行。
        </p>
        <UiButton
          v-if="canRunFourProperty"
          size="sm"
          variant="primary"
          :loading="checkingFourProperty"
          @click="runFourPropertyCheck"
        >
          执行四性检测
        </UiButton>
      </div>
      <ArchiveFourPropertyGrid v-else :check="displayedFourProperty" />
    </section>

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
      <UiForm layout="vertical">
        <UiFormItem label="当前密级">
          {{ securityLevelLabel(detail.volume.securityLevel!) }}
        </UiFormItem>
        <UiFormItem label="确认说明" required>
          <UiTextarea
            size="sm"
            v-model="confirmSecurityMarkReason"
            :maxlength="500"
            :rows="3"
            placeholder="如：教学档案内部定密，卷内材料密级一致"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
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
      <UiForm layout="vertical">
        <UiFormItem label="新密级" required>
          <UiSelect
            size="sm"
            v-model="updateSecurityLevelForm.securityLevel"
            :options="ARCHIVE_SECURITY_LEVEL_OPTIONS"
            placeholder="选择密级"
          />
        </UiFormItem>
        <UiFormItem label="变更原因" required>
          <UiTextarea
            size="sm"
            v-model="updateSecurityLevelForm.reason"
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
import type {
  ArchiveSecurityLevelCode,
  ArchiveVolumeDetailResponse,
} from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import {
  ARCHIVE_SECURITY_LEVEL_OPTIONS,
  ArchiveSecurityLevelDescription,
  checkArchiveVolumeFourProperty,
  confirmArchiveVolumeSecurityMark,
  updateArchiveVolumeSecurityLevel,
} from '@/apis/mark/archive-volume'
import ConfidentialStatusBar from '@/components/mark/ConfidentialStatusBar.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import {
  buildFourPropertyDimensionViews,
  countFourPropertyPassed,
} from '@/utils/archive-four-property-diagnostic'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveFourPropertyGrid from '@/views/teacher/archive-volume/components/detail/ArchiveFourPropertyGrid.vue'

defineOptions({ name: 'ArchiveVolumeFourPropertyPanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
  displayedFourProperty: NonNullable<ArchiveVolumeDetailResponse['latestFourPropertyCheck']> | null
  canRunFourProperty: boolean
}>()

const emit = defineEmits<{
  'refreshed': []
  'four-property-checked': [result: Awaited<ReturnType<typeof checkArchiveVolumeFourProperty>>]
}>()

const checkingFourProperty = ref(false)
const confirmSecurityMarkOpen = ref(false)
const updateSecurityLevelOpen = ref(false)
const confirmingSecurityMark = ref(false)
const updatingSecurityLevel = ref(false)
const confirmSecurityMarkReason = ref('')

interface UpdateSecurityLevelForm {
  securityLevel?: ArchiveSecurityLevelCode
  reason: string
}

const updateSecurityLevelForm = reactive<UpdateSecurityLevelForm>({
  reason: '',
})

const fourPropertySummary = computed(() =>
  countFourPropertyPassed(buildFourPropertyDimensionViews(props.displayedFourProperty)),
)

const securityLevelLabelText = computed(() => {
  const level = props.detail.volume.securityLevel
  if (!level) {
    return ''
  }
  return strictEnumLabel(ArchiveSecurityLevelDescription, level, 'securityLevel')
})

const securityBarTitle = computed(() => `卷密级：${securityLevelLabelText.value}`)

const securityBarDescription = computed(() => {
  if (props.detail.volume.securityMarkPending) {
    return '定密待确认，确认前不得视为密级已落实'
  }
  return '密级已确认，请勿截屏、复制或外传卷内材料'
})

function securityLevelLabel(code: ArchiveSecurityLevelCode) {
  return strictEnumLabel(ArchiveSecurityLevelDescription, code, 'securityLevel')
}

function openConfirmSecurityMarkModal() {
  confirmSecurityMarkReason.value = ''
  confirmSecurityMarkOpen.value = true
}

async function submitConfirmSecurityMark() {
  if (confirmingSecurityMark.value) {
    return
  }
  if (props.detail.canConfirmSecurityMark !== true) {
    message.warning('当前账号无定密确认权限')
    return
  }
  if (!confirmSecurityMarkReason.value.trim()) {
    showFormValidationMessage('请填写定密确认说明')
    return
  }
  confirmingSecurityMark.value = true
  try {
    await confirmArchiveVolumeSecurityMark({
      volumeId: props.volumeId,
      securityLevel: props.detail.volume.securityLevel!,
      reason: confirmSecurityMarkReason.value.trim(),
    })
    message.success('密级定密已确认')
    confirmSecurityMarkOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error, '确认定密失败')
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
  if (updatingSecurityLevel.value) {
    return
  }
  if (props.detail.canUpdateSecurityLevel !== true) {
    message.warning('当前账号无密级变更权限')
    return
  }
  if (!updateSecurityLevelForm.securityLevel) {
    showFormValidationMessage('请选择新密级')
    return
  }
  if (updateSecurityLevelForm.securityLevel === props.detail.volume.securityLevel) {
    showFormValidationMessage('新密级不能与当前密级相同')
    return
  }
  if (!updateSecurityLevelForm.reason.trim()) {
    showFormValidationMessage('请填写变更原因')
    return
  }
  updatingSecurityLevel.value = true
  try {
    await updateArchiveVolumeSecurityLevel({
      volumeId: props.volumeId,
      expectedSecurityLevel: props.detail.volume.securityLevel!,
      securityLevel: updateSecurityLevelForm.securityLevel,
      reason: updateSecurityLevelForm.reason.trim(),
    })
    message.success('密级已变更，请重新确认定密并执行四性检测')
    updateSecurityLevelOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error, '变更密级失败')
  } finally {
    updatingSecurityLevel.value = false
  }
}

async function runFourPropertyCheck() {
  // MVR-347：与 canRunFourProperty 同源二次拦截
  if (props.canRunFourProperty !== true) {
    message.warning('当前账号或卷状态不可执行四性检测')
    return
  }
  if (checkingFourProperty.value) return
  checkingFourProperty.value = true
  try {
    const result = await checkArchiveVolumeFourProperty(props.volumeId)
    emit('four-property-checked', result)
    message.success('四性检测完成')
    emit('refreshed')
  } catch (error) {
    showUserError(error, '四性检测失败')
  } finally {
    checkingFourProperty.value = false
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
  padding-top: var(--dp-space-4);
  border-top: 1px solid var(--dp-border-subtle);

  &:first-child {
    padding-top: 0;
    border-top: none;
  }
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

.archive-quality-panel__stale-hint {
  margin: 0;
  font-size: 12px;
  color: var(--dp-warning);
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
</style>
