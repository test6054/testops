<template>
  <WorkbenchSurfaceCard flush class="appeal-section">
    <template #head>
      <div class="appeal-section__header">
        <span class="appeal-section__flow-hint">{{ REVIEW_WINDOW_FLOW_HINT }}</span>
        <UiTag
          v-if="policy?.policyStatus"
          :tone="reviewWindowStatusColor(policy.policyStatus)"
          size="sm"
        >
          {{ reviewWindowStatusLabel(policy.policyStatus) }}
        </UiTag>
      </div>
    </template>

    <UiSkeletonState v-if="loading" variant="card" compact />
    <template v-else>
      <UiForm layout="vertical" :model="form">
        <UiRow :gutter="16">
          <UiCol :span="12">
            <UiFormItem label="开放时间" required>
              <UiDatePicker
                size="sm"
                v-model="form.openTime"
                :show-time="true"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
                :disabled="!canManageReviewerWrites"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="关闭时间" required>
              <UiDatePicker
                size="sm"
                v-model="form.closeTime"
                :show-time="true"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
                :disabled="!canManageReviewerWrites"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="16">
          <UiCol :span="8">
            <UiFormItem label="最大申请次数">
              <UiInputNumber
                size="sm"
                v-model="form.maxRequestCount"
                :min="1"
                :max="10"
                style="width: 100%"
                :disabled="!canManageReviewerWrites"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="可见材料范围">
              <UiSelect
                size="sm"
                v-model="form.visibleMaterialScope"
                :options="scopeOptions"
                :disabled="!canManageReviewerWrites"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="允许的原因类型">
              <UiSelect
                size="sm"
                v-model="form.allowedReasonTypes"
                mode="multiple"
                allow-clear
                :options="GRADE_REVIEW_REASON_TYPE_OPTIONS"
                :disabled="!canManageReviewerWrites"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
      </UiForm>

      <div v-if="canManageReviewerWrites" class="dp-space" style="--dp-space-gap: 8px">
        <UiButton size="sm" variant="primary" :loading="saving" @click="handleSave">
          保存策略
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          :loading="savingAndActivating"
          :disabled="!canActivateReviewWindow"
          :title="activateBlockReason || undefined"
          @click="handleSaveAndActivate"
        >
          保存并启用
        </UiButton>
        <UiButton
          size="sm"
          variant="ghost"
          :loading="activating"
          :disabled="!canActivateReviewWindow"
          :title="activateBlockReason || undefined"
          @click="handleActivate"
        >
          激活窗口
        </UiButton>
        <UiButton
          size="sm"
          status="danger"
          variant="outline"
          :loading="closing"
          :disabled="!hasPersistedPolicy || policy?.policyStatus === 'CLOSED'"
          @click="handleClose"
        >
          关闭窗口
        </UiButton>
      </div>
      <UiAlertStrip
        v-else
        tone="warning"
        title="当前账号仅可查看复核窗口策略，无保存/激活/关闭权限"
        style="margin-top: 8px"
      />
    </template>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { ArchiveVolumeExamGateResponse } from '@/apis/mark/archive-volume'
import type { ExamReviewWindowPolicy, GradeReviewReasonTypeCode } from '@/apis/mark/grade-review'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { getArchiveVolumeExamGate } from '@/apis/mark/archive-volume'
import {
  activateReviewWindow,
  closeReviewWindow,
  getReviewWindowPolicy,
  GRADE_REVIEW_REASON_TYPE_OPTIONS,
  REVIEW_WINDOW_FLOW_HINT,
  REVIEW_WINDOW_STATUS_TONE,
  ReviewWindowPolicyStatusCode,
  ReviewWindowPolicyStatusDescription,
  saveReviewWindowPolicy,
  VisibleMaterialScopeCode,
  VisibleMaterialScopeDescription,
} from '@/apis/mark/grade-review'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ReviewWindowPolicyCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

function reviewWindowStatusColor(status: ReviewWindowPolicyStatusCode): BadgeTone {
  return strictEnumTone(REVIEW_WINDOW_STATUS_TONE, status, '复核窗口状态')
}

function reviewWindowStatusLabel(status: ReviewWindowPolicyStatusCode): string {
  return strictEnumLabel(ReviewWindowPolicyStatusDescription, status, '复核窗口状态')
}

const policy = ref<ExamReviewWindowPolicy | null>(null)
/** MVR-279：默认拒绝假可写，仅 BE 下发 canManageReviewerWrites=true 时可写 */
const canManageReviewerWrites = ref(false)
/** 已持久化策略（能力位壳无 policyStatus / id 时不算） */
const hasPersistedPolicy = computed(
  () => Boolean(policy.value?.id || policy.value?.policyStatus),
)
const loading = ref(false)
const saving = ref(false)
const savingAndActivating = ref(false)
const activating = ref(false)
const closing = ref(false)
/** MVR-210：未发布 BOUND 卷计数，与 BE countBoundPaperInstancesWithoutPublishedScore 同源 */
const unpublishedBoundPaperCount = ref<number | null>(null)

/** MVR-210：激活门禁与 BE activateReviewWindowUnderLock 同源（未全发布 / 关闭时间已过 / 状态）。 */
const canActivateReviewWindow = computed(() => {
  if (!props.examId) {
    return false
  }
  if (policy.value?.policyStatus === ReviewWindowPolicyStatusCode.ACTIVE) {
    return false
  }
  // MVR-210：门禁未查到时不得假可写；null 表示查询失败或未完成，仅 0 可激活。
  if (unpublishedBoundPaperCount.value === null || unpublishedBoundPaperCount.value > 0) {
    return false
  }
  const closeTime = form.closeTime || policy.value?.closeTime
  if (!closeTime) {
    return false
  }
  // 后端 LocalDateTime 按本地墙钟比较；前端用本地解析对齐「关闭时间已过」
  if (new Date(closeTime.replace(' ', 'T')).getTime() <= Date.now()) {
    return false
  }
  const openTime = form.openTime || policy.value?.openTime
  if (!openTime) {
    return false
  }
  if (openTime >= closeTime) {
    return false
  }
  return true
})

const activateBlockReason = computed(() => {
  if (policy.value?.policyStatus === ReviewWindowPolicyStatusCode.ACTIVE) {
    return ''
  }
  if (unpublishedBoundPaperCount.value === null) {
    return '未发布成绩门禁尚未就绪，请刷新后重试'
  }
  if (unpublishedBoundPaperCount.value > 0) {
    return `尚有 ${unpublishedBoundPaperCount.value} 份已绑定试卷未发布成绩，不能提前开放复核窗口`
  }
  const closeTime = form.closeTime || policy.value?.closeTime
  if (!closeTime) {
    return '请先配置复核窗口关闭时间'
  }
  if (new Date(closeTime.replace(' ', 'T')).getTime() <= Date.now()) {
    return '关闭时间已过，请先调整关闭时间后再激活'
  }
  const openTime = form.openTime || policy.value?.openTime
  if (!openTime) {
    return '请先配置复核窗口开放时间'
  }
  if (openTime >= closeTime) {
    return '开放时间必须早于关闭时间'
  }
  return ''
})


const form = reactive<{
  openTime: string
  closeTime: string
  maxRequestCount: number
  visibleMaterialScope: VisibleMaterialScopeCode
  allowedReasonTypes: GradeReviewReasonTypeCode[]
}>({
  openTime: '',
  closeTime: '',
  maxRequestCount: 1,
  visibleMaterialScope: VisibleMaterialScopeCode.SCORE_ONLY,
  allowedReasonTypes: [],
})

const scopeOptions: { label: string, value: VisibleMaterialScopeCode }[] = [
  {
    label: strictEnumLabel(
      VisibleMaterialScopeDescription,
      VisibleMaterialScopeCode.SCORE_ONLY,
      '复核可见材料范围',
    ),
    value: VisibleMaterialScopeCode.SCORE_ONLY,
  },
  {
    label: strictEnumLabel(
      VisibleMaterialScopeDescription,
      VisibleMaterialScopeCode.SCORE_AND_ANNOTATION,
      '复核可见材料范围',
    ),
    value: VisibleMaterialScopeCode.SCORE_AND_ANNOTATION,
  },
  {
    label: strictEnumLabel(
      VisibleMaterialScopeDescription,
      VisibleMaterialScopeCode.FULL,
      '复核可见材料范围',
    ),
    value: VisibleMaterialScopeCode.FULL,
  },
]

async function refreshUnpublishedBoundGate(): Promise<void> {
  if (!props.examId) {
    unpublishedBoundPaperCount.value = null
    return
  }
  try {
    const gate: ArchiveVolumeExamGateResponse = await getArchiveVolumeExamGate(props.examId)
    unpublishedBoundPaperCount.value = gate.unpublishedBoundPaperCount ?? 0
  }
  catch (error) {
    unpublishedBoundPaperCount.value = null
    showUserError(error, '未发布成绩门禁查询失败')
  }
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    // MVR-210：先刷新未发布 BOUND 门禁，再加载策略；二者独立，不可互相覆盖。
    await refreshUnpublishedBoundGate()
    const data = await getReviewWindowPolicy(props.examId)
    // MVR-279：无 id/policyStatus 的能力位壳不当作已配置策略
    const persisted = Boolean(data?.id || data?.policyStatus)
    policy.value = persisted ? data : null
    canManageReviewerWrites.value = data?.canManageReviewerWrites === true
    if (persisted && data) {
      form.openTime = data.openTime || ''
      form.closeTime = data.closeTime || ''
      form.maxRequestCount = data.maxRequestCount ?? 1
      form.visibleMaterialScope = data.visibleMaterialScope || VisibleMaterialScopeCode.SCORE_ONLY
      form.allowedReasonTypes = data.allowedReasonTypes || []
    }
  } catch (e) {
    policy.value = null
    canManageReviewerWrites.value = false
    showUserError(e, '成绩复核窗口加载失败')
  } finally {
    loading.value = false
  }
}

async function handleSave(): Promise<void> {
  await persistPolicy(false)
}

async function handleSaveAndActivate(): Promise<void> {
  await persistPolicy(true)
}

async function persistPolicy(activateImmediately: boolean): Promise<void> {
  if (!canManageReviewerWrites.value) {
    message.warning('当前账号无复核窗口写权限')
    return
  }
  if (saving.value || savingAndActivating.value) {
    return
  }
  if (!form.openTime || !form.closeTime) {
    showFormValidationMessage('请选择开放和关闭时间')
    return
  }
  if (form.openTime >= form.closeTime) {
    message.warning('关闭时间需晚于开放时间')
    return
  }
  // MVR-211：已 ACTIVE 时不得把关闭时间改到当前之前（对齐 BE assertReviewWindowPolicyTimesValid）
  if (
    policy.value?.policyStatus === ReviewWindowPolicyStatusCode.ACTIVE
    && new Date(form.closeTime.replace(' ', 'T')).getTime() <= Date.now()
  ) {
    message.warning('复核窗口已激活，关闭时间不得早于当前时间；如需结束请使用关闭窗口')
    return
  }
  if (activateImmediately && !canActivateReviewWindow.value) {
    message.warning(activateBlockReason.value || '当前不能启用复核窗口')
    return
  }
  if (activateImmediately) {
    savingAndActivating.value = true
  } else {
    saving.value = true
  }
  try {
    const saved = await saveReviewWindowPolicy({
      examId: props.examId,
      openTime: form.openTime,
      closeTime: form.closeTime,
      maxRequestCount: form.maxRequestCount,
      visibleMaterialScope: form.visibleMaterialScope,
      allowedReasonTypes: form.allowedReasonTypes.length > 0 ? form.allowedReasonTypes : undefined,
      activateImmediately,
    })
    policy.value = saved
    canManageReviewerWrites.value = saved.canManageReviewerWrites === true
    message.success(activateImmediately ? '复核窗口已保存并启用' : '复核窗口策略已保存')
    emit('changed')
  } catch (e) {
    showUserError(e, activateImmediately ? '保存并启用失败' : '成绩复核窗口保存失败')
  } finally {
    saving.value = false
    savingAndActivating.value = false
  }
}

async function handleActivate(): Promise<void> {
  if (!canManageReviewerWrites.value) {
    message.warning('当前账号无复核窗口写权限')
    return
  }
  if (activating.value || saving.value || savingAndActivating.value || closing.value) {
    return
  }
  if (!canActivateReviewWindow.value) {
    message.warning(activateBlockReason.value || '当前不能激活复核窗口')
    return
  }
  activating.value = true
  try {
    await activateReviewWindow(props.examId)
    message.success('已激活')
    await reload()
    emit('changed')
  } catch (e) {
    showUserError(e, '成绩复核窗口开启失败')
  } finally {
    activating.value = false
  }
}

async function handleClose(): Promise<void> {
  if (!canManageReviewerWrites.value) {
    message.warning('当前账号无复核窗口写权限')
    return
  }
  if (closing.value || activating.value || saving.value || savingAndActivating.value) {
    return
  }
  closing.value = true
  try {
    await closeReviewWindow(props.examId)
    message.success('已关闭')
    await reload()
    emit('changed')
  } catch (e) {
    showUserError(e, '成绩复核窗口关闭失败')
  } finally {
    closing.value = false
  }
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    if (props.examId) void reload()
  },
  { immediate: true },
)
</script>
