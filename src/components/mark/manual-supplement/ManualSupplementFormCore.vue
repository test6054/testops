<template>
  <a-form ref="formRef" :model="model" :rules="formRules" layout="vertical">
    <template v-if="mode === 'direct'">
      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="网页补录工位" name="deviceKey" required>
            <a-select
              v-model:value="directModel.deviceKey"
              placeholder="选择已启用的网页补录工位"
              :options="deviceOptions"
              :loading="deviceLoading"
              show-search
              option-filter-prop="label"
              @change="emit('device-change')"
            />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="起始模板页号" name="startTemplatePageNo">
            <a-input-number
              v-model:value="directModel.startTemplatePageNo"
              :min="1"
              placeholder="默认从第 1 页起"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="扫描来源文件（便携文档或多页图片）" name="sourceFileId" required>
        <UiPlatformFileField
          v-model:file-node-id="directModel.sourceFileId"
          v-model:file-name="directModel.sourceFileName"
          :scene-key="FileUploadSceneKey.MARK_EXAM_SCAN_SOURCE"
          accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff"
          button-text="选择文件"
        />
      </a-form-item>
    </template>

    <template v-else>
      <a-row :gutter="16">
        <a-col v-if="showPaperSelect" :xs="24" :md="12">
          <a-form-item label="补扫试卷" name="paperInstanceId" required>
            <a-select
              v-model:value="supplementModel.paperInstanceId"
              placeholder="选择本设备已绑定试卷"
              :options="boundPaperOptions"
              :loading="prepareLoading"
              :disabled="prepareLoading || paperSelectDisabled"
              show-search
              option-filter-prop="label"
              allow-clear
            />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="showPaperSelect ? 6 : 8">
          <a-form-item label="补扫目标页" name="targetPageNo" required>
            <a-select
              v-if="targetPageOptions.length > 0"
              v-model:value="supplementModel.targetPageNo"
              placeholder="选择模板页号"
              :options="targetPageOptions"
              :disabled="targetPageDisabled"
              show-search
              option-filter-prop="label"
            />
            <a-input-number
              v-else
              v-model:value="supplementModel.targetPageNo"
              :min="1"
              placeholder="模板页号"
              style="width: 100%"
              :disabled="targetPageDisabled"
            />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="showPaperSelect ? 6 : 16">
          <a-form-item label="补扫原因" name="supplementReason" required>
            <a-input
              v-model:value="supplementModel.supplementReason"
              placeholder="说明补扫原因"
              :maxlength="255"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item v-if="showReplaceCheckbox" name="replaceTargetPage">
        <a-checkbox v-model:checked="supplementModel.replaceTargetPage" :disabled="replaceForced">
          替换目标页（勾选后旧页标记为 SUPERSEDED）
        </a-checkbox>
      </a-form-item>

      <a-form-item label="补扫文件（单张图片）" name="sourceFileId" required>
        <UiPlatformFileField
          v-model:file-node-id="supplementModel.sourceFileId"
          v-model:file-name="supplementModel.sourceFileName"
          :scene-key="FileUploadSceneKey.MARK_EXAM_SCAN_SOURCE"
          accept=".png,.jpg,.jpeg,.tif,.tiff"
          button-text="选择文件"
        />
      </a-form-item>
    </template>

    <p v-if="prepareBlockDescription" class="manual-supplement-form-core__warn muted">
      {{ prepareBlockDescription }}
    </p>
    <p v-if="classScopeWarning" class="manual-supplement-form-core__warn muted">
      {{ classScopeWarning }}
    </p>
  </a-form>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { computed, ref } from 'vue'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'

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
  color: var(--ant-color-text-tertiary);
  font-size: 13px;
}
</style>
