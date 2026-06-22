<template>
  <a-card title="复核窗口策略" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <UiTag v-if="policy?.policyStatus" :tone="reviewWindowStatusColor(policy.policyStatus)">
          {{ reviewWindowStatusLabel(policy.policyStatus) }}
        </UiTag>
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </a-button>
      </a-space>
    </template>

    <a-spin :spinning="loading">
      <a-form layout="vertical" :model="form">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="开放时间" required>
              <a-date-picker
                v-model:value="form.openTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="关闭时间" required>
              <a-date-picker
                v-model:value="form.closeTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="最大申请次数">
              <a-input-number
                v-model:value="form.maxRequestCount"
                :min="1"
                :max="10"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="可见材料范围">
              <a-select v-model:value="form.visibleMaterialScope" :options="scopeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="允许的原因类型">
              <a-select
                v-model:value="form.allowedReasonTypes"
                mode="multiple"
                allow-clear
                :options="reasonTypeOptions"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <a-space>
        <a-button type="primary" :loading="saving" @click="handleSave">保存策略</a-button>
        <a-button
          :loading="activating"
          :disabled="!policy || policy.policyStatus === 'ACTIVE'"
          @click="handleActivate"
        >
          激活窗口
        </a-button>
        <a-button
          danger
          :loading="closing"
          :disabled="!policy || policy.policyStatus === 'CLOSED'"
          @click="handleClose"
        >
          关闭窗口
        </a-button>
      </a-space>
    </a-spin>
  </a-card>
</template>

<script lang="ts" setup>
import type {
  ExamReviewWindowPolicyVO,
  GradeReviewReasonTypeCode,
  ReviewWindowPolicyStatusCode,
  VisibleMaterialScopeCode,
} from '@/apis/mark/grade-review'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
import {
  activateReviewWindow,
  closeReviewWindow,
  getReviewWindowPolicy,
  GRADE_REVIEW_REASON_TYPE_LABEL,
  REVIEW_WINDOW_STATUS_COLOR,
  REVIEW_WINDOW_STATUS_LABEL,
  saveReviewWindowPolicy,
} from '@/apis/mark/grade-review'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ReviewWindowPolicyCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

function reviewWindowStatusColor(status: ReviewWindowPolicyStatusCode): BadgeTone {
  return strictEnumTone(REVIEW_WINDOW_STATUS_COLOR, status, '复核窗口状态')
}

function reviewWindowStatusLabel(status: ReviewWindowPolicyStatusCode): string {
  return strictEnumLabel(REVIEW_WINDOW_STATUS_LABEL, status, '复核窗口状态')
}

const policy = ref<ExamReviewWindowPolicyVO | null>(null)
const loading = ref(false)
const saving = ref(false)
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
  visibleMaterialScope: 'SCORE_ONLY',
  allowedReasonTypes: [],
})

const scopeOptions: { label: string, value: VisibleMaterialScopeCode }[] = [
  { label: '仅分数', value: 'SCORE_ONLY' },
  { label: '分数+批注', value: 'SCORE_AND_ANNOTATION' },
  { label: '完整材料', value: 'FULL' },
]

const reasonTypeOptions: { label: string, value: GradeReviewReasonTypeCode }[] = [
  { label: GRADE_REVIEW_REASON_TYPE_LABEL.SCORE_ERROR, value: 'SCORE_ERROR' },
  { label: GRADE_REVIEW_REASON_TYPE_LABEL.RUBRIC, value: 'RUBRIC' },
  { label: GRADE_REVIEW_REASON_TYPE_LABEL.OBJECTIVE, value: 'OBJECTIVE' },
  { label: GRADE_REVIEW_REASON_TYPE_LABEL.OTHER, value: 'OTHER' },
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
  if (!form.openTime || !form.closeTime) {
    message.warning('请选择开放和关闭时间')
    return
  }
  if (form.openTime >= form.closeTime) {
    message.warning('关闭时间需晚于开放时间')
    return
  }
  saving.value = true
  try {
    policy.value = await saveReviewWindowPolicy({
      examId: props.examId,
      openTime: form.openTime,
      closeTime: form.closeTime,
      maxRequestCount: form.maxRequestCount,
      visibleMaterialScope: form.visibleMaterialScope,
      allowedReasonTypes: form.allowedReasonTypes.length > 0 ? form.allowedReasonTypes : undefined,
    })
    message.success('复核窗口策略已保存')
    emit('changed')
  } catch (e) {
    showUserError(e, '成绩复核窗口保存失败')
  } finally {
    saving.value = false
  }
}

async function handleActivate(): Promise<void> {
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
