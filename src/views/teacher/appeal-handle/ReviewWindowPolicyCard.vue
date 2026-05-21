<template>
  <a-card title="复核窗口策略" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-tag v-if="policy?.policyStatus" :color="REVIEW_WINDOW_STATUS_COLOR[policy.policyStatus]">
          {{ REVIEW_WINDOW_STATUS_LABEL[policy.policyStatus] }}
        </a-tag>
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </a-button>
      </a-space>
    </template>

    <!-- D-9 错误态：复核窗口加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="loadError"
      :error="loadError"
      title="复核窗口加载失败"
      compact
      @retry="reload"
    />
    <a-spin v-else :spinning="loading">
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
            <a-form-item label="允许的原因类型 JSON">
              <a-input
                v-model:value="form.allowedReasonTypes"
                placeholder="如 [&quot;SCORE_ERROR&quot;,&quot;RUBRIC&quot;]"
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
import type { ExamReviewWindowPolicyVO, VisibleMaterialScopeCode } from '@/apis/mark/grade-review'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
import {
  activateReviewWindow,
  closeReviewWindow,
  getReviewWindowPolicy,
  REVIEW_WINDOW_STATUS_COLOR,
  REVIEW_WINDOW_STATUS_LABEL,
  saveReviewWindowPolicy,
} from '@/apis/mark/grade-review'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'

defineOptions({ name: 'ReviewWindowPolicyCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

const policy = ref<ExamReviewWindowPolicyVO | null>(null)
const loading = ref(false)
// D-9 错误态：复核窗口加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<unknown>(null)
const saving = ref(false)
const activating = ref(false)
const closing = ref(false)

const form = reactive<{
  openTime: string
  closeTime: string
  maxRequestCount: number
  visibleMaterialScope: VisibleMaterialScopeCode
  allowedReasonTypes: string
}>({
  openTime: '',
  closeTime: '',
  maxRequestCount: 1,
  visibleMaterialScope: 'SCORE_ONLY',
  allowedReasonTypes: '',
})

const scopeOptions: { label: string, value: VisibleMaterialScopeCode }[] = [
  { label: '仅分数', value: 'SCORE_ONLY' },
  { label: '分数+批注', value: 'SCORE_AND_ANNOTATION' },
  { label: '完整材料', value: 'FULL' },
]

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    const data = await getReviewWindowPolicy(props.examId)
    policy.value = data
    if (data) {
      form.openTime = data.openTime || ''
      form.closeTime = data.closeTime || ''
      form.maxRequestCount = data.maxRequestCount ?? 1
      form.visibleMaterialScope = data.visibleMaterialScope || 'SCORE_ONLY'
      form.allowedReasonTypes = data.allowedReasonTypes || ''
    }
  } catch (e) {
    policy.value = null
    loadError.value = e
    message.error(e instanceof Error ? e.message : '复核窗口加载失败')
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
      allowedReasonTypes: form.allowedReasonTypes.trim() || undefined,
    })
    message.success('复核窗口策略已保存')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
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
  } catch (e) {
    message.error(e instanceof Error ? e.message : '激活失败')
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
  } catch (e) {
    message.error(e instanceof Error ? e.message : '关闭失败')
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
