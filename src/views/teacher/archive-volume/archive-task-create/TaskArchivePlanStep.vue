<template>
  <UiForm
    ref="formRef"
    :model="planForm"
    :rules="planRules"
    layout="horizontal"
    :label-col="labelCol"
    :wrapper-col="wrapperCol"
    class="create-form"
  >
    <div id="archive-task-plan" class="form-section">
      <div class="section-header">
        <h3 class="section-title">归档方案</h3>
      </div>
      <p class="section-desc">选定目录模板套与密级；模板决定材料目录（含成绩单等）与自查项。</p>

      <UiRow :gutter="24" class="create-form__split-row">
        <UiCol :span="12">
          <UiFormItem
            label="目录模板套"
            name="templateSetCode"
            required
            tooltip="含平台母版与本校副本；创建任务后按此套解析材料目录与自查项。"
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <UiSelect
              size="sm"
              v-model="templateSetCodeSelectValue"
              :options="templateSetOptions"
              :loading="templateLoading"
              placeholder="请选择目录模板套"
              allow-search
              option-filter-prop="label"
              @change="handleTemplateChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem label="考核形式" :label-col="labelCol" :wrapper-col="wrapperCol">
            <UiSelect
              size="sm"
              v-model="planForm.examForm"
              :options="ARCHIVE_EXAM_FORM_OPTIONS"
              allow-clear
              placeholder="可选"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>

      <UiRow :gutter="24" class="create-form__split-row">
        <UiCol :span="12">
          <UiFormItem
            label="密级"
            name="securityLevel"
            required
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <UiSelect
              size="sm"
              v-model="planForm.securityLevel"
              :options="ARCHIVE_SECURITY_LEVEL_OPTIONS"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem
            label="归档责任人"
            name="responsibleUserId"
            required
            tooltip="缺省为当前用户；责任人可登记材料并提交本任务。"
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <TeacherSelector
              :value="planForm.responsibleUserId"
              placeholder="默认当前用户"
              @change="handleResponsibleChange"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>

      <UiRow :gutter="24" class="create-form__split-row">
        <UiCol :span="12">
          <UiFormItem
            label="保管年限"
            tooltip="填写年限或勾选永久保管，二者择一。"
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <div class="retention-field">
              <UiInputNumber
                size="sm"
                :width="120"
                v-model="planForm.retentionYears"
                :min="1"
                :max="100"
                :disabled="planForm.permanentRetention"
                @update:model-value="onRetentionYearsChange"
              />
              <span class="retention-field__unit">年</span>
              <UiCheckbox
                :model-value="planForm.permanentRetention"
                @update:model-value="onPermanentRetentionChange"
              >
                永久保管
              </UiCheckbox>
            </div>
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem
            label="归档截止"
            tooltip="可选；留空时由租户归档时限策略自动计算。"
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <UiDatePicker
              size="sm"
              v-model="planForm.archiveDueTimeOverride"
              show-time
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="留空则按策略自动计算"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
    </div>
  </UiForm>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ArchiveExamFormCode } from '@/apis/mark/archive-volume'
import type { TeacherUserInfoDto } from '@/apis/platform/teacher-catalog'
import type { UiOptionValue } from '@/components/ui-guide/ui/types'
import { computed, ref, watch } from 'vue'
import {
  ARCHIVE_EXAM_FORM_OPTIONS,
  ARCHIVE_SECURITY_LEVEL_OPTIONS,
} from '@/apis/mark/archive-volume'
import TeacherSelector from '@/components/platform/TeacherSelector.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { useInjectedArchiveTaskCreatePlanForm } from './archive-task-create-context'
import { nullableStringToSelectValue, selectValueToNullableString } from './select-value-bridge'

const props = defineProps<{
  planRules: Record<string, Rule[]>
  templateSetOptions: Array<{
    value: string
    label: string
    examForm?: ArchiveExamFormCode
    defaultPermanentRetention?: boolean
    defaultRetentionYears?: number
  }>
  templateLoading: boolean
}>()

const emit = defineEmits<{
  'template-change': [
    code: string | null,
    name: string,
    examForm?: ArchiveExamFormCode,
    retention?: { defaultPermanentRetention?: boolean, defaultRetentionYears?: number },
  ]
  'responsible-change': [userId: string | null, nickName: string]
  'update:plan-form-ref': [form: FormInstance | undefined]
}>()

const labelCol = { style: { width: '112px' } }
const wrapperCol = { flex: 1 }

const planForm = useInjectedArchiveTaskCreatePlanForm()
const formRef = ref<FormInstance>()

const templateSetCodeSelectValue = computed({
  get: () => nullableStringToSelectValue(planForm.templateSetCode),
  set: (value: UiOptionValue | UiOptionValue[] | undefined) => {
    planForm.templateSetCode = selectValueToNullableString(value)
  },
})

function handleTemplateChange(value: UiOptionValue | UiOptionValue[] | undefined): void {
  const code = selectValueToNullableString(value)
  planForm.templateSetCode = code
  if (!code) {
    emit('template-change', null, '', undefined, undefined)
    return
  }
  const selected = props.templateSetOptions.find((item) => item.value === code)
  emit('template-change', code, selected?.label ?? code, selected?.examForm, {
    defaultPermanentRetention: selected?.defaultPermanentRetention,
    defaultRetentionYears: selected?.defaultRetentionYears,
  })
}

function handleResponsibleChange(
  value: string | string[] | null,
  option?: TeacherUserInfoDto | TeacherUserInfoDto[],
): void {
  const teacher = Array.isArray(option) ? option[0] : option
  const userId = typeof value === 'string' ? value : null
  emit('responsible-change', userId, teacher?.nickName?.trim() ?? '')
}

const DEFAULT_RETENTION_YEARS = 10

/** 勾选永久保管时清空年限；取消勾选时回填默认年限 */
function onPermanentRetentionChange(checked: boolean): void {
  planForm.permanentRetention = checked
  if (checked) {
    planForm.retentionYears = undefined
    return
  }
  if (planForm.retentionYears == null) {
    planForm.retentionYears = DEFAULT_RETENTION_YEARS
  }
}

/** 填写年限即退出永久保管，与永久勾选互斥 */
function onRetentionYearsChange(value: number | string | null | undefined): void {
  if (value == null || value === '') {
    return
  }
  if (planForm.permanentRetention) {
    planForm.permanentRetention = false
  }
}

watch(
  formRef,
  (form) => {
    emit('update:plan-form-ref', form)
  },
  { immediate: true },
)
</script>
