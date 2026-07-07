<template>
  <UiDialog
    :open="open"
    :title="dialogTitle"
    :width="480"
    :confirm-loading="saving"
    :ok-text="okText"
    @update:open="emit('update:open', $event)"
    @ok="handleConfirm"
    @cancel="emit('update:open', false)"
  >
    <p class="policy-config-modal__hint">{{ dialogHint }}</p>
    <div class="policy-config-modal__form">
      <label class="policy-config-modal__field">
        <span>一致率阈值</span>
        <a-input-number
          v-model:value="consistencyPercent"
          :min="50"
          :max="100"
          :step="1"
          :precision="1"
          addon-after="%"
        />
      </label>
      <label class="policy-config-modal__field">
        <span>签名距离上限</span>
        <a-input-number v-model:value="form.maxHammingDistance" :min="0" :max="16" />
      </label>
      <label class="policy-config-modal__field">
        <span>经验条目上限</span>
        <a-input-number v-model:value="form.maxExperienceItems" :min="1" :max="10" />
      </label>
    </div>
  </UiDialog>
</template>

<script lang="ts" setup>
import type { ExamGradingExperienceAssistPolicyResponse } from '@/apis/mark/grading-experience-assist'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import {
  enableExamGradingExperienceAssistPolicy,
  saveExamGradingExperienceAssistPolicy,
} from '@/apis/mark/grading-experience-assist'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'ExamExperienceAssistPolicyEnableModal' })

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    examId?: string
    mode?: ExamExperienceAssistPolicyConfigMode
    effectiveMinConsistencyRate?: number
    effectiveMaxHammingDistance?: number
    effectiveMaxExperienceItems?: number
  }>(),
  { mode: 'enable' },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved', policy: ExamGradingExperienceAssistPolicyResponse): void
}>()

export type ExamExperienceAssistPolicyConfigMode = 'enable' | 'edit'

const saving = ref(false)

interface PolicyThresholdForm {
  minConsistencyRate: number
  maxHammingDistance: number
  maxExperienceItems: number
}

const form = reactive<PolicyThresholdForm>({
  minConsistencyRate: 0.75,
  maxHammingDistance: 16,
  maxExperienceItems: 5,
})

const consistencyPercent = computed({
  get: () => Math.round(form.minConsistencyRate * 1000) / 10,
  set: (value: number | null) => {
    if (value == null) return
    form.minConsistencyRate = Math.round(value * 10) / 1000
  },
})

const dialogTitle = computed(() =>
  props.mode === 'edit' ? '编辑本场定标阈值' : '启用本场经验辅助评阅',
)

const okText = computed(() => (props.mode === 'edit' ? '保存配置' : '确认启用'))

const dialogHint = computed(() =>
  props.mode === 'edit'
    ? '调整本场定标阈值；正评任务生成后将自动冻结，不能再变更。'
    : '确认本场定标阈值后启用；正评任务生成后将自动冻结，不能再变更。',
)

function syncFormFromProps(): void {
  form.minConsistencyRate = props.effectiveMinConsistencyRate ?? 0.75
  form.maxHammingDistance = props.effectiveMaxHammingDistance ?? 16
  form.maxExperienceItems = props.effectiveMaxExperienceItems ?? 5
}

watch(open, (visible) => {
  if (visible) {
    syncFormFromProps()
  }
})

async function handleConfirm(): Promise<void> {
  if (!props.examId) return
  saving.value = true
  const payload = {
    examId: props.examId,
    minConsistencyRate: form.minConsistencyRate,
    maxHammingDistance: form.maxHammingDistance,
    maxExperienceItems: form.maxExperienceItems,
  }
  try {
    const policy
      = props.mode === 'edit'
        ? await saveExamGradingExperienceAssistPolicy(payload)
        : await enableExamGradingExperienceAssistPolicy(payload)
    message.success(props.mode === 'edit' ? '本场定标阈值已保存' : '已启用本场经验辅助评阅')
    open.value = false
    emit('saved', policy)
  } catch (error) {
    showUserError(error, props.mode === 'edit' ? '保存失败' : '启用失败')
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.policy-config-modal__hint {
  margin: 0 0 var(--dp-space-3);
  color: var(--dp-gray-600);
  font-size: 13px;
}

.policy-config-modal__form {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
}

.policy-config-modal__field {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-1);
  font-size: 12px;
  color: var(--dp-gray-500);
}
</style>
