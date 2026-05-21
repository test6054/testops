<template>
  <a-modal
    v-model:open="visible"
    :title="modalTitle"
    :width="640"
    :footer="null"
    @cancel="handleCancel"
  >
    <!-- 发布配置表单 -->
    <template v-if="!publishResult">
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        @finish="handlePublish"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="填写开始时间" name="startTime">
              <a-date-picker
                v-model:value="formState.startTime"
                show-time
                format="YYYY-MM-DD HH:mm:ss"
                placeholder="选择开始时间"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="填写截止时间" name="endTime">
              <a-date-picker
                v-model:value="formState.endTime"
                show-time
                format="YYYY-MM-DD HH:mm:ss"
                placeholder="选择截止时间"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="访问模式" name="accessMode">
          <a-radio-group v-model:value="formState.accessMode">
            <a-radio value="PUBLIC_LINK">公开链接</a-radio>
            <a-radio value="AUTHENTICATED">登录用户</a-radio>
            <a-radio value="BOTH">两者兼备</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="允许匿名提交" name="allowAnonymous">
          <a-switch v-model:checked="formState.allowAnonymous" />
        </a-form-item>

        <a-form-item label="每人最大提交次数" name="maxSubmissionsPerRespondent">
          <a-input-number
            v-model:value="formState.maxSubmissionsPerRespondent"
            :min="1"
            :max="100"
            style="width: 120px"
          />
        </a-form-item>

        <a-form-item label="欢迎语" name="welcomeMessage">
          <a-textarea
            v-model:value="formState.welcomeMessage"
            :rows="2"
            placeholder="问卷顶部显示的欢迎语"
            :maxlength="500"
          />
        </a-form-item>

        <a-form-item label="提交后感谢语" name="thankYouMessage">
          <a-textarea
            v-model:value="formState.thankYouMessage"
            :rows="2"
            placeholder="提交后显示的感谢语"
            :maxlength="500"
          />
        </a-form-item>

        <div style="text-align: right; margin-top: 16px">
          <a-button style="margin-right: 8px" @click="handleCancel">取消</a-button>
          <a-button type="primary" html-type="submit" :loading="publishing">发布问卷</a-button>
        </div>
      </a-form>
    </template>

    <!-- 发布成功结果 -->
    <template v-else>
      <a-result status="success" title="问卷发布成功">
        <template #extra>
          <div class="publish-result">
            <div class="publish-result-item">
              <span class="label">公开链接：</span>
              <a-input :value="publicUrl" readonly class="publish-url-input">
                <template #addonAfter>
                  <a-button type="link" size="small" @click="copyUrl">复制</a-button>
                </template>
              </a-input>
            </div>
            <div class="publish-result-item qr-section">
              <span class="label">二维码：</span>
              <a-qrcode :value="publicUrl" :size="200" />
            </div>
            <div style="text-align: center; margin-top: 16px">
              <a-button type="primary" @click="handleCancel">完成</a-button>
            </div>
          </div>
        </template>
      </a-result>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type dayjs from 'dayjs'
import type {
  IndirectEvaluationFormVO,
  IndirectEvaluationPublishResultVO,
} from '@/apis/quality/indirect-evaluation'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { indirectFormApi } from '@/apis/quality/indirect-evaluation'

const props = defineProps<{
  open: boolean
  form: IndirectEvaluationFormVO | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'published'): void
}>()

const visible = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
})

const modalTitle = computed(() => {
  return publishResult.value ? '发布成功' : `发布问卷 - ${props.form?.formName || ''}`
})

const formRef = ref<FormInstance>()
const publishing = ref(false)
const publishResult = ref<IndirectEvaluationPublishResultVO | null>(null)

interface PublishFormState {
  startTime?: dayjs.Dayjs
  endTime?: dayjs.Dayjs
  accessMode: string
  allowAnonymous: boolean
  maxSubmissionsPerRespondent: number
  welcomeMessage: string
  thankYouMessage: string
}

const formState = reactive<PublishFormState>({
  startTime: undefined,
  endTime: undefined,
  accessMode: 'PUBLIC_LINK',
  allowAnonymous: false,
  maxSubmissionsPerRespondent: 1,
  welcomeMessage: '',
  thankYouMessage: '感谢您的参与！',
})

const rules: Record<string, Rule[]> = {
  startTime: [{ required: true, message: '请选择开始时间' }],
  endTime: [{ required: true, message: '请选择截止时间' }],
}

const publicUrl = computed(() => {
  return publishResult.value?.publicUrl || ''
})

watch(
  () => props.open,
  (val) => {
    if (!val) {
      publishResult.value = null
    }
  },
)

async function handlePublish() {
  if (!props.form) return

  if (formState.startTime && formState.endTime && formState.endTime.isBefore(formState.startTime)) {
    message.warning('截止时间不能早于开始时间')
    return
  }

  publishing.value = true
  try {
    publishResult.value = await indirectFormApi.publish({
      id: props.form.id,
      startTime: formState.startTime!.format('YYYY-MM-DD HH:mm:ss'),
      endTime: formState.endTime!.format('YYYY-MM-DD HH:mm:ss'),
      accessMode: formState.accessMode,
      allowAnonymous: formState.allowAnonymous,
      requireIdentityFields: formState.allowAnonymous
        ? []
        : [
            { fieldKey: 'name', fieldLabel: '姓名', fieldType: 'TEXT', required: true },
            { fieldKey: 'contact', fieldLabel: '联系方式', fieldType: 'TEXT', required: false },
          ],
      maxSubmissionsPerRespondent: formState.maxSubmissionsPerRespondent,
      welcomeMessage: formState.welcomeMessage || undefined,
      thankYouMessage: formState.thankYouMessage || undefined,
    })
    emit('published')
  } catch (err: unknown) {
    const errMessage = typeof err === 'object' && err ? Reflect.get(err, 'message') : undefined
    message.error(typeof errMessage === 'string' && errMessage ? errMessage : '发布失败')
  } finally {
    publishing.value = false
  }
}

function copyUrl() {
  if (!publicUrl.value) return
  navigator.clipboard
    .writeText(publicUrl.value)
    .then(() => {
      message.success('链接已复制')
    })
    .catch(() => {
      message.warning('复制失败，请手动复制')
    })
}

function handleCancel() {
  visible.value = false
}
</script>

<style scoped lang="scss">
.publish-result {
  text-align: left;
}

.publish-result-item {
  margin-bottom: 16px;

  .label {
    display: block;
    font-weight: 500;
    margin-bottom: 4px;
    color: #333;
  }
}

.publish-url-input {
  font-size: 13px;
}

.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-container {
  margin-top: 8px;
  padding: 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}
</style>
