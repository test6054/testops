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
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="可见材料范围">
              <UiSelect
                size="sm" v-model="form.visibleMaterialScope" :options="scopeOptions"
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
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
      </UiForm>

      <div class="dp-space" style="--dp-space-gap: 8px">
        <UiButton size="sm" variant="primary" :loading="saving" @click="handleSave">
          保存策略
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          :loading="savingAndActivating"
          @click="handleSaveAndActivate"
        >
          保存并启用
        </UiButton>
        <UiButton
          size="sm"
          variant="ghost"
          :loading="activating"
          :disabled="!policy || policy.policyStatus === ReviewWindowPolicyStatusCode.ACTIVE"
          @click="handleActivate"
        >
          激活窗口
        </UiButton>
        <UiButton
          size="sm"
          status="danger"
          variant="outline"
          :loading="closing"
          :disabled="!policy || policy.policyStatus === 'CLOSED'"
          @click="handleClose"
        >
          关闭窗口
        </UiButton>
      </div>
    </template>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { ExamReviewWindowPolicy, GradeReviewReasonTypeCode } from '@/apis/mark/grade-review'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
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
const loading = ref(false)
const saving = ref(false)
const savingAndActivating = ref(false)
const activating = ref(false)
const closing = ref(false)

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

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    const data = await getReviewWindowPolicy(props.examId)
    policy.value = data
    if (data) {
      form.openTime = data.openTime
      form.closeTime = data.closeTime
      form.maxRequestCount = data.maxRequestCount
      form.visibleMaterialScope = data.visibleMaterialScope
      form.allowedReasonTypes = data.allowedReasonTypes || []
    }
  } catch (e) {
    policy.value = null
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
  if (activateImmediately) {
    savingAndActivating.value = true
  } else {
    saving.value = true
  }
  try {
    policy.value = await saveReviewWindowPolicy({
      examId: props.examId,
      openTime: form.openTime,
      closeTime: form.closeTime,
      maxRequestCount: form.maxRequestCount,
      visibleMaterialScope: form.visibleMaterialScope,
      allowedReasonTypes: form.allowedReasonTypes.length > 0 ? form.allowedReasonTypes : undefined,
      activateImmediately,
    })
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
  if (activating.value || saving.value || savingAndActivating.value || closing.value) {
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
