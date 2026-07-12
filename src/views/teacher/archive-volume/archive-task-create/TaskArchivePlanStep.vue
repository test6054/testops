<template>
  <a-form
    ref="formRef"
    :model="planForm"
    :rules="planRules"
    layout="horizontal"
    :label-col="labelCol"
    :wrapper-col="{ flex: 1 }"
    class="create-form"
  >
    <div id="archive-task-plan" class="form-section">
      <div class="section-header">
        <h3 class="section-title">归档方案</h3>
      </div>
      <p class="section-desc">选定目录模板套、密级与成绩事实；模板决定材料目录与自查项。</p>

      <a-form-item
        label="目录模板套"
        name="templateSetCode"
        required
        tooltip="含平台母版与本校副本；创建任务后按此套解析材料目录与自查项。"
      >
        <a-select
          v-model:value="templateSetCodeSelectValue"
          :options="templateSetOptions"
          :loading="templateLoading"
          placeholder="选择模板套"
          show-search
          option-filter-prop="label"
          @change="handleTemplateChange"
        />
      </a-form-item>

      <a-row :gutter="24" class="create-form__split-row">
        <a-col :span="12">
          <a-form-item label="考核形式" :label-col="labelCol" :wrapper-col="wrapperCol">
            <a-select
              v-model:value="planForm.examForm"
              :options="examFormOptions"
              allow-clear
              placeholder="可选"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="成绩事实源"
            name="scoreSource"
            required
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <a-select v-model:value="planForm.scoreSource" :options="scoreSourceOptions" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="24" class="create-form__split-row">
        <a-col :span="12">
          <a-form-item
            label="密级"
            name="securityLevel"
            required
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <a-select v-model:value="planForm.securityLevel" :options="securityLevelOptions" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
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
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="保管年限">
        <div class="retention-field">
          <a-input-number
            v-model:value="planForm.retentionYears"
            :min="1"
            :max="100"
            :disabled="planForm.permanentRetention"
          />
          <span class="retention-field__unit">年</span>
          <a-checkbox v-model:checked="planForm.permanentRetention">永久保管</a-checkbox>
        </div>
      </a-form-item>

      <a-form-item label="归档截止" tooltip="可选；留空时由租户归档时限策略自动计算。">
        <a-date-picker
          v-model:value="archiveDueOverrideValue"
          show-time
          format="YYYY-MM-DD HH:mm"
          placeholder="留空则按法规策略自动计算"
          style="width: 100%"
          allow-clear
        />
      </a-form-item>

      <a-form-item
        v-if="requiresScoreProof"
        label="成绩证明"
        tooltip="教务或线下确认成绩时须上传成绩证明文件。"
      >
        <div class="score-proof-field">
          <a-upload
            :show-upload-list="false"
            :before-upload="handleScoreProofBeforeUpload"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          >
            <UiButton size="sm" variant="outline" :loading="scoreProofUploading">
              {{ planForm.scoreProofFileId ? '重新上传' : '上传成绩证明' }}
            </UiButton>
          </a-upload>
          <span v-if="planForm.scoreProofFileId" class="score-proof-field__id">
            文件 ID：{{ planForm.scoreProofFileId }}
          </span>
        </div>
      </a-form-item>
    </div>
  </a-form>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { SelectValue } from 'ant-design-vue/es/select'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { ArchiveExamFormCode } from '@/apis/mark/archive-volume'
import {
  ARCHIVE_EXAM_FORM_OPTIONS,
  ARCHIVE_SECURITY_LEVEL_OPTIONS,
  ArchiveScoreSourceDescription,
} from '@/apis/mark/archive-volume'
import type { TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { TeacherSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { ArchiveScoreSourceCode } from '@/types/enums/archive-score-source-enum'
import { ArchiveTaskProvenanceCode } from '@/types/enums/archive-task-provenance-enum'
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
    retention?: { defaultPermanentRetention?: boolean; defaultRetentionYears?: number },
  ]
  'responsible-change': [userId: string | null, nickName: string]
  'update:plan-form-ref': [form: FormInstance | undefined]
}>()

const labelCol = { style: { width: '88px' } }
const wrapperCol = { flex: 1 }

const planForm = useInjectedArchiveTaskCreatePlanForm()
const wizardState = useInjectedArchiveTaskCreateWizardState()
const formRef = ref<FormInstance>()
const scoreProofUploading = ref(false)

const requiresScoreProof = computed(
  () =>
    planForm.scoreSource === ArchiveScoreSourceCode.TEACHING_AFFAIRS ||
    planForm.scoreSource === ArchiveScoreSourceCode.OFFLINE_CONFIRMED,
)

async function handleScoreProofBeforeUpload(file: File): Promise<boolean> {
  scoreProofUploading.value = true
  try {
    const node = await stageBusinessFile(FileUploadSceneKey.MARK_ARCHIVE_VOLUME_MATERIAL, file)
    if (!node?.id) {
      message.error('上传未返回文件 ID')
      return false
    }
    planForm.scoreProofFileId = node.id
    message.success('成绩证明已上传')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '上传失败')
  } finally {
    scoreProofUploading.value = false
  }
  return false
}

const archiveDueOverrideValue = computed({
  get: (): Dayjs | undefined => {
    if (!planForm.archiveDueTimeOverride) return undefined
    const parsed = dayjs(planForm.archiveDueTimeOverride)
    return parsed.isValid() ? parsed : undefined
  },
  set: (value: Dayjs | undefined | null) => {
    planForm.archiveDueTimeOverride = value?.isValid()
      ? value.format('YYYY-MM-DD HH:mm:ss')
      : undefined
  },
})

const templateSetCodeSelectValue = computed({
  get: () => nullableStringToSelectValue(planForm.templateSetCode),
  set: (value: SelectValue) => {
    planForm.templateSetCode = selectValueToNullableString(value)
  },
})

const examFormOptions = ARCHIVE_EXAM_FORM_OPTIONS
const securityLevelOptions = ARCHIVE_SECURITY_LEVEL_OPTIONS

const scoreSourceOptions = computed(() => {
  if (wizardState.provenance === ArchiveTaskProvenanceCode.CURRENT_TERM_OFFLINE) {
    return [ArchiveScoreSourceCode.TEACHING_AFFAIRS, ArchiveScoreSourceCode.OFFLINE_CONFIRMED].map(
      (value) => ({
        value,
        label: strictEnumLabel(ArchiveScoreSourceDescription, value, '成绩来源'),
      }),
    )
  }
  if (wizardState.provenance === ArchiveTaskProvenanceCode.HISTORICAL_DIGITIZE) {
    return [
      ArchiveScoreSourceCode.NOT_REQUIRED,
      ArchiveScoreSourceCode.TEACHING_AFFAIRS,
      ArchiveScoreSourceCode.OFFLINE_CONFIRMED,
    ].map((value) => ({
      value,
      label: strictEnumLabel(ArchiveScoreSourceDescription, value, '成绩来源'),
    }))
  }
  return []
})

function handleTemplateChange(value: SelectValue): void {
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
