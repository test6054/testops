<template>
  <UiForm ref="formRef" :model="model" :rules="formRules" layout="vertical">
    <template v-if="mode === 'direct'">
      <UiRow :gutter="16">
        <UiCol :xs="24" :md="12">
          <UiFormItem label="网页补录工位" name="deviceKey" required>
            <UiSelect
              size="sm"
              v-model="directModel.deviceKey"
              placeholder="选择已启用的网页补录工位"
              :options="deviceOptions"
              :loading="deviceLoading"
              allow-search
              option-filter-prop="label"
              @change="emit('device-change')"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :xs="24" :md="12">
          <UiFormItem label="起始模板页号" name="startTemplatePageNo">
            <UiInputNumber
              size="sm"
              v-model="directModel.startTemplatePageNo"
              :min="1"
              placeholder="默认从第 1 页起"
              style="width: 100%"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiFormItem label="扫描来源文件（便携文档或多页图片）" name="sourceFileId" required>
        <UiPlatformFileField
          v-model:file-node-id="directModel.sourceFileId"
          v-model:file-name="directModel.sourceFileName"
          :scene-key="FileUploadSceneKey.MARK_EXAM_SCAN_SOURCE"
          accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff"
          button-text="选择文件"
        />
      </UiFormItem>
    </template>

    <template v-else>
      <UiRow :gutter="16">
        <UiCol v-if="showPaperSelect" :xs="24" :md="12">
          <UiFormItem label="补扫试卷" name="paperInstanceId" required>
            <UiSelect
              size="sm"
              v-model="supplementModel.paperInstanceId"
              placeholder="选择本设备已绑定试卷"
              :options="boundPaperOptions"
              :loading="prepareLoading"
              :disabled="prepareLoading || paperSelectDisabled"
              allow-search
              option-filter-prop="label"
              allow-clear
            />
          </UiFormItem>
        </UiCol>
        <UiCol :xs="24" :md="showPaperSelect ? 6 : 8">
          <UiFormItem label="补扫目标页" name="targetPageNo" required>
            <UiSelect
              size="sm"
              v-if="targetPageOptions.length > 0"
              v-model="supplementModel.targetPageNo"
              placeholder="选择模板页号"
              :options="targetPageOptions"
              :disabled="targetPageDisabled"
              allow-search
              option-filter-prop="label"
            />
            <UiInputNumber
              size="sm"
              v-else
              v-model="supplementModel.targetPageNo"
              :min="1"
              placeholder="模板页号"
              style="width: 100%"
              :disabled="targetPageDisabled"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :xs="24" :md="showPaperSelect ? 6 : 16">
          <UiFormItem label="补扫原因" name="supplementReason" required>
            <UiInput
              size="sm"
              v-model="supplementModel.supplementReason"
              placeholder="说明补扫原因"
              :maxlength="255"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>

      <UiFormItem v-if="showReplaceCheckbox" name="replaceTargetPage">
        <UiCheckbox v-model="supplementModel.replaceTargetPage" :disabled="replaceForced">
          替换目标页（勾选后旧页标记为 SUPERSEDED）
        </UiCheckbox>
      </UiFormItem>

      <UiFormItem label="补扫文件（单张图片）" name="sourceFileId" required>
        <UiPlatformFileField
          v-model:file-node-id="supplementModel.sourceFileId"
          v-model:file-name="supplementModel.sourceFileName"
          :scene-key="FileUploadSceneKey.MARK_EXAM_SCAN_SOURCE"
          accept=".png,.jpg,.jpeg,.tif,.tiff"
          button-text="选择文件"
        />
      </UiFormItem>
    </template>

    <p v-if="prepareBlockDescription" class="manual-supplement-form-core__warn muted">
      {{ prepareBlockDescription }}
    </p>
    <p v-if="classScopeWarning" class="manual-supplement-form-core__warn muted">
      {{ classScopeWarning }}
    </p>
  </UiForm>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { computed, ref } from 'vue'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'

defineOptions({ name: 'ManualSupplementFormCore' })

const props = withDefaults(
  defineProps<{
    mode: 'direct' | 'supplement'
    model: ManualSupplementDirectFormModel | ManualSupplementSupplementFormModel
    deviceOptions?: Array<{ value: string, label: string }>
    deviceLoading?: boolean
    boundPaperOptions?: Array<{ value: string, label: string }>
    prepareLoading?: boolean
    prepareBlockDescription?: string
    classScopeWarning?: string
    showPaperSelect?: boolean
    paperSelectDisabled?: boolean
    targetPageDisabled?: boolean
    targetPageOptions?: Array<{ value: number, label: string }>
    showReplaceCheckbox?: boolean
    replaceForced?: boolean
  }>(),
  {
    deviceOptions: () => [],
    boundPaperOptions: () => [],
    deviceLoading: false,
    prepareLoading: false,
    prepareBlockDescription: '',
    classScopeWarning: '',
    showPaperSelect: true,
    paperSelectDisabled: false,
    targetPageDisabled: false,
    targetPageOptions: () => [],
    showReplaceCheckbox: true,
    replaceForced: false,
  },
)

const emit = defineEmits<{
  'device-change': []
}>()

export interface ManualSupplementDirectFormModel {
  deviceKey: string | undefined
  startTemplatePageNo: number | undefined
  sourceFileId: string | undefined
  sourceFileName: string | undefined
}

export interface ManualSupplementSupplementFormModel {
  paperInstanceId: string | undefined
  targetPageNo: number | undefined
  supplementReason: string
  replaceTargetPage: boolean
  sourceFileId: string | undefined
  sourceFileName: string | undefined
}

const formRef = ref<FormInstance>()

const directModel = computed(() => props.model as ManualSupplementDirectFormModel)
const supplementModel = computed(() => props.model as ManualSupplementSupplementFormModel)

const formRules = computed((): Record<string, Rule[]> => {
  if (props.mode === 'direct') {
    return {
      deviceKey: [{ required: true, message: '请选择网页补录工位' }],
      sourceFileId: [
        {
          validator: async () => {
            if (!directModel.value.sourceFileId) {
              return Promise.reject(new Error('请选择扫描来源文件'))
            }
          },
        },
      ],
    }
  }
  return {
    paperInstanceId: props.showPaperSelect ? [{ required: true, message: '请选择已绑定试卷' }] : [],
    targetPageNo: [{ required: true, type: 'number', min: 1, message: '请填写补扫目标页号' }],
    supplementReason: [{ required: true, message: '请填写补扫原因' }],
    sourceFileId: [
      {
        validator: async () => {
          if (!supplementModel.value.sourceFileId) {
            return Promise.reject(new Error('请选择补扫文件'))
          }
        },
      },
    ],
  }
})

async function validate(): Promise<void> {
  await formRef.value?.validate()
}

defineExpose({ validate })
</script>

<style lang="scss" scoped>
.manual-supplement-form-core__warn {
  margin-top: 8px;
}

.muted {
  color: var(--dp-text-tertiary);
  font-size: var(--dp-font-size-sm);
}
</style>
