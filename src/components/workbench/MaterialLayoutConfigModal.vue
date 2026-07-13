<script lang="ts" setup>
import { computed } from 'vue'
import { EXAM_PRINT_SOURCE_MODE_OPTIONS, ExamMaterialLayoutModeCode, ExamPrintSourceModeCode } from '@/apis/mark/exam'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'

defineOptions({ name: 'MaterialLayoutConfigModal' })

const open = defineModel<boolean>('open', { required: true })
const draftLayoutMode = defineModel<ExamMaterialLayoutModeCode | undefined>('draftLayoutMode')
const draftPrintSource = defineModel<ExamPrintSourceModeCode | undefined>('draftPrintSource')

const props = defineProps<{
  layoutModeLocked: boolean
  layoutDirty: boolean
  layoutSaving: boolean
  materialLayoutSaved: boolean
  advisoryReason?: string
  description?: string
  statusText?: string
}>()

const emit = defineEmits<{
  save: []
}>()

const printSourceOptions = EXAM_PRINT_SOURCE_MODE_OPTIONS

const printSourceHint = computed(() => {
  if (draftLayoutMode.value !== ExamMaterialLayoutModeCode.FULL_PAPER) {
    return ''
  }
  if (draftPrintSource.value === ExamPrintSourceModeCode.SYSTEM_PRINT) {
    return '按考生名册生成个性化印刷包，送指定保密印刷厂加印个人信息与防伪码。'
  }
  if (draftPrintSource.value === ExamPrintSourceModeCode.EXTERNAL_PRINT) {
    return '试卷已线下印制完成，系统只上传同款 PDF 母版用于扫描对齐，不生成印刷包。'
  }
  return '整卷作答须选择系统制卷或外带已印试卷。'
})

function handleSave(): void {
  emit('save')
}
</script>

<template>
  <UiDialog v-model:open="open" title="制卷形态" :width="640">
    <p v-if="description" class="material-layout-modal__desc">{{ description }}</p>
    <div class="material-layout-modal__mode-options">
      <button
        type="button"
        class="material-layout-modal__mode-option"
        :class="{
          'material-layout-modal__mode-option--active':
            draftLayoutMode === ExamMaterialLayoutModeCode.ANSWER_SHEET,
        }"
        :disabled="layoutModeLocked"
        @click="draftLayoutMode = ExamMaterialLayoutModeCode.ANSWER_SHEET"
      >
        <span class="material-layout-modal__mode-option-title">独立答卷页（教考分离）</span>
        <span class="material-layout-modal__mode-option-desc">
          试题卷教研室命题、教务处审核后外印；系统只配置答题卡，考后仅扫描答题卡入库。
        </span>
      </button>
      <button
        type="button"
        class="material-layout-modal__mode-option"
        :class="{
          'material-layout-modal__mode-option--active':
            draftLayoutMode === ExamMaterialLayoutModeCode.FULL_PAPER,
        }"
        :disabled="layoutModeLocked"
        @click="draftLayoutMode = ExamMaterialLayoutModeCode.FULL_PAPER"
      >
        <span class="material-layout-modal__mode-option-title">整卷作答</span>
        <span class="material-layout-modal__mode-option-desc">
          试题与作答在同一卷面；上传整卷 PDF 母版，配置身份区与客观填涂区后扫描或送印。
        </span>
      </button>
    </div>
    <a-form
      v-if="draftLayoutMode === ExamMaterialLayoutModeCode.FULL_PAPER"
      layout="inline"
      class="material-layout-modal__print-form"
    >
      <a-form-item label="印刷来源">
        <a-select
          v-model:value="draftPrintSource"
          :disabled="layoutModeLocked"
          placeholder="选择印刷来源"
          :options="printSourceOptions"
          style="width: 200px"
        />
      </a-form-item>
    </a-form>
    <p v-if="printSourceHint" class="material-layout-modal__hint">{{ printSourceHint }}</p>
    <p v-if="layoutModeLocked" class="material-layout-modal__hint">
      已开印或已扫描，制卷形态不可修改
    </p>
    <p v-else-if="!materialLayoutSaved" class="material-layout-modal__hint">
      保存形态后解锁名册、制卷设计与印刷包配置
    </p>
    <p v-if="advisoryReason" class="material-layout-modal__advisory">{{ advisoryReason }}</p>
    <template #footer>
      <UiButton variant="outline" @click="open = false">关闭</UiButton>
      <UiButton
        v-if="!layoutModeLocked"
        :variant="layoutDirty ? 'primary' : 'outline'"
        :disabled="!draftLayoutMode || !layoutDirty"
        :loading="layoutSaving"
        @click="handleSave"
      >
        保存制卷形态
      </UiButton>
    </template>
  </UiDialog>
</template>

<style scoped lang="scss">
.material-layout-modal {
  &__desc {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--dp-text-muted);
  }

  &__mode-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }

  &__mode-option {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 88px;
    padding: 12px 16px;
    text-align: left;
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease;

    &:hover:not(:disabled) {
      border-color: var(--ant-color-primary, #1677ff);
      background: var(--dp-surface-subtle);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    &--active {
      border-color: var(--ant-color-primary, #1677ff);
      background: var(--ant-color-primary-bg, #eff6ff);
    }
  }

  &__mode-option-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__mode-option-desc {
    font-size: 13px;
    line-height: 1.5;
    color: var(--dp-text-secondary);
  }

  &__print-form {
    margin-bottom: 8px;
  }

  &__hint {
    margin: 0;
    font-size: 13px;
    color: var(--dp-text-muted);
  }

  &__advisory {
    margin: 8px 0 0;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--ant-color-warning, #d97706);
    background: var(--ant-color-warning-bg, #fffbeb);
    border-radius: 6px;
  }
}

@media (max-width: 640px) {
  .material-layout-modal__mode-options {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
