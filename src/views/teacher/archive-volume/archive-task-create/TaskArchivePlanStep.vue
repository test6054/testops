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
      <p class="section-desc">选定目录模板套、密级与成绩事实；模板决定材料目录与自查项。</p>

      <UiRow :gutter="24" class="create-form__split-row">
        <UiCol :span="12">
          <UiFormItem
            label="目录模板套"
            name="templateSetCode"
            required
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
            <template #extra>含平台母版与本校副本；创建任务后按此套解析材料目录与自查项。</template>
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

      <UiFormItem label="成绩事实源" name="scoreSource" required>
        <UiRadioGroup
          size="sm"
          block
          :model-value="planForm.scoreSource"
          :options="scoreSourceRadioOptions"
          @update:model-value="onScoreSourceSelect"
        />
      </UiFormItem>

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
          <UiFormItem label="保管年限" :label-col="labelCol" :wrapper-col="wrapperCol">
            <div class="retention-field">
              <UiInputNumber
                size="sm"
                :width="120"
                v-model="planForm.retentionYears"
                :min="1"
                :max="100"
                :disabled="planForm.permanentRetention === true"
              />
              <span class="retention-field__unit">年</span>
              <UiCheckbox v-model="planForm.permanentRetention">永久保管</UiCheckbox>
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

      <UiFormItem
        v-if="requiresScoreProof"
        label="成绩证明（线下确认时上传）"
        tooltip="线下成绩已核实时可上传成绩证明；未上传时任务保持待确认。"
      >
        <div class="score-proof-field">
          <UiUpload
            :show-upload-list="false"
            :before-upload="handleScoreProofBeforeUpload"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          >
            <UiButton size="sm" variant="outline" :loading="scoreProofUploading">
              {{ planForm.scoreProofFileId ? '重新上传' : '上传成绩证明' }}
            </UiButton>
          </UiUpload>
          <span v-if="planForm.scoreProofFileId" class="score-proof-field__id">
            文件编号：{{ planForm.scoreProofFileId }}
          </span>
        </div>
        <template #extra>支持 PDF / JPG / PNG / Word / Excel。</template>
      </UiFormItem>
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
  ArchiveScoreSourceDescription,
  discardArchiveTaskScoreProof,
} from '@/apis/mark/archive-volume'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import TeacherSelector from '@/components/platform/TeacherSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiUpload from '@/components/ui-guide/ui/UiUpload.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { ArchiveScoreSourceCode } from '@/types/enums/archive-score-source-enum'
import { ArchiveTaskProvenanceCode } from '@/types/enums/archive-task-provenance-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import { strictEnumLabel } from '@/utils/strict-enum'
import {
  useInjectedArchiveTaskCreatePlanForm,
  useInjectedArchiveTaskCreateWizardState,
} from './archive-task-create-context'
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
const wizardState = useInjectedArchiveTaskCreateWizardState()
const formRef = ref<FormInstance>()
const scoreProofUploading = ref(false)

const requiresScoreProof = computed(
  () => planForm.scoreSource === ArchiveScoreSourceCode.OFFLINE_CONFIRMED,
)

const scoreSourceCodes = computed((): ArchiveScoreSourceCode[] => {
  if (wizardState.provenance === ArchiveTaskProvenanceCode.CURRENT_TERM_OFFLINE) {
    return [ArchiveScoreSourceCode.OFFLINE_CONFIRMED, ArchiveScoreSourceCode.TEACHING_AFFAIRS]
  }
  if (wizardState.provenance === ArchiveTaskProvenanceCode.HISTORICAL_DIGITIZE) {
    return [
      ArchiveScoreSourceCode.NOT_REQUIRED,
      ArchiveScoreSourceCode.TEACHING_AFFAIRS,
      ArchiveScoreSourceCode.OFFLINE_CONFIRMED,
    ]
  }
  return []
})

const scoreSourceRadioOptions = computed(() =>
  scoreSourceCodes.value.map((value) => ({
    value,
    label: strictEnumLabel(ArchiveScoreSourceDescription, value, '成绩来源'),
  })),
)

async function handleScoreProofBeforeUpload(file: File): Promise<boolean> {
  scoreProofUploading.value = true
  try {
    const node = await stageBusinessFile(FileUploadSceneKey.MARK_ARCHIVE_VOLUME_MATERIAL, file)
    if (!node?.id) {
      showFormValidationMessage('上传未返回文件编号')
      return false
    }
    const previousFileId = planForm.scoreProofFileId
    if (previousFileId) {
      try {
        await discardArchiveTaskScoreProof(previousFileId)
      } catch (error) {
        try {
          await discardArchiveTaskScoreProof(node.id)
        } catch {
          // 旧证明清理失败时尽力回收本次暂存文件，避免残留
        }
        showUserError(error, '清理旧成绩证明失败')
        return false
      }
    }
    planForm.scoreProofFileId = node.id
    void message.success('成绩证明已上传')
  } catch (error) {
    showUserError(error, '成绩证明上传失败')
  } finally {
    scoreProofUploading.value = false
  }
  return false
}

async function handleScoreSourceChange(nextSource: ArchiveScoreSourceCode): Promise<void> {
  if (nextSource === planForm.scoreSource) return
  if (nextSource !== ArchiveScoreSourceCode.OFFLINE_CONFIRMED && planForm.scoreProofFileId) {
    try {
      await discardArchiveTaskScoreProof(planForm.scoreProofFileId)
      planForm.scoreProofFileId = null
    } catch (error) {
      showUserError(error, '清理临时成绩证明失败')
      return
    }
  }
  planForm.scoreSource = nextSource
}

function onScoreSourceSelect(value: UiOptionValue | boolean | undefined): void {
  if (value == null || typeof value === 'boolean') return
  void handleScoreSourceChange(String(value) as ArchiveScoreSourceCode)
}

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

watch(
  () => planForm.permanentRetention,
  (permanent) => {
    if (permanent) {
      planForm.retentionYears = undefined
    }
  },
)

watch(
  formRef,
  (form) => {
    emit('update:plan-form-ref', form)
  },
  { immediate: true },
)
</script>
