<template>
  <section id="archive-create-config" class="form-section archive-create-form">
    <header class="section-header">
      <h2 class="section-title">归档配置</h2>
    </header>
    <p class="section-desc">为本卷选定目录模板套、密级与保管策略；模板决定材料目录与自查项。</p>
    <a-form ref="formRef" :model="configForm" :rules="configRules" layout="vertical" class="archive-create-form__body">
      <div class="archive-create-form__grid">
        <a-form-item label="目录模板套" name="templateSetCode" class="archive-create-form__full">
          <a-select
            v-model:value="configForm.templateSetCode"
            :options="templateSetOptions"
            :loading="templateLoading"
            placeholder="选择模板套"
            show-search
            option-filter-prop="label"
            @change="handleTemplateChange"
          />
          <div class="archive-create-form__hint">
            含平台母版与本校副本；建卷后按此套解析材料目录与自查项。
          </div>
        </a-form-item>
        <a-form-item label="考核形式">
          <a-select
            v-model:value="configForm.examForm"
            :options="examFormOptions"
            allow-clear
            placeholder="可选，选定模板后可自动带出"
          />
        </a-form-item>
        <a-form-item label="成绩事实源" name="scoreSource">
          <a-select v-model:value="configForm.scoreSource" :options="scoreSourceOptions" />
        </a-form-item>
        <a-form-item label="密级" name="securityLevel">
          <a-select v-model:value="configForm.securityLevel" :options="securityLevelOptions" />
        </a-form-item>
        <a-form-item label="卷责任人" name="responsibleUserId" class="archive-create-form__full">
          <TeacherSelector
            :value="configForm.responsibleUserId"
            placeholder="默认当前用户"
            @change="handleResponsibleChange"
          />
          <div class="archive-create-form__hint">缺省为当前用户；责任人可登记材料并提交本卷。</div>
        </a-form-item>
        <a-form-item label="保管年限" class="archive-create-form__full">
          <a-space>
            <a-input-number
              v-model:value="configForm.retentionYears"
              :min="1"
              :max="100"
              :disabled="configForm.permanentRetention"
            />
            <a-checkbox v-model:checked="configForm.permanentRetention">永久保管</a-checkbox>
          </a-space>
        </a-form-item>
      </div>
    </a-form>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ArchiveExamFormCode } from '@/apis/mark/archive-volume'
import type { TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import { ref, watch } from 'vue'
import {
  ARCHIVE_EXAM_FORM_LABEL,
  ARCHIVE_SCORE_SOURCE_LABEL,
  ARCHIVE_SECURITY_LEVEL_LABEL,
} from '@/apis/mark/archive-volume'
import { TeacherSelector } from '@/components/quality/selectors'
import { useInjectedArchiveVolumeCreateConfigForm } from './archive-volume-create-context'

const props = defineProps<{
  configRules: Record<string, Rule[]>
  templateSetOptions: Array<{ value: string, label: string, examForm?: ArchiveExamFormCode }>
  templateLoading: boolean
}>()

const emit = defineEmits<{
  templateChange: [code: string | null, name: string, examForm?: ArchiveExamFormCode]
  responsibleChange: [userId: string | null, nickName: string]
  'update:configFormRef': [form: FormInstance | undefined]
}>()

const configForm = useInjectedArchiveVolumeCreateConfigForm()
const formRef = ref<FormInstance>()

const examFormOptions = Object.entries(ARCHIVE_EXAM_FORM_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const scoreSourceOptions = [
  { value: 'TEACHING_AFFAIRS', label: ARCHIVE_SCORE_SOURCE_LABEL.TEACHING_AFFAIRS },
  { value: 'OFFLINE_CONFIRMED', label: ARCHIVE_SCORE_SOURCE_LABEL.OFFLINE_CONFIRMED },
]

const securityLevelOptions = Object.entries(ARCHIVE_SECURITY_LEVEL_LABEL).map(([value, label]) => ({
  value,
  label,
}))

function handleTemplateChange(value: string) {
  const selected = props.templateSetOptions.find(item => item.value === value)
  emit('templateChange', value, selected?.label ?? value, selected?.examForm)
}

function handleResponsibleChange(
  value: string | string[] | null,
  option?: TeacherUserInfoDto | TeacherUserInfoDto[],
): void {
  const teacher = Array.isArray(option) ? option[0] : option
  const userId = typeof value === 'string' ? value : null
  emit('responsibleChange', userId, teacher?.nickName?.trim() ?? '')
}

watch(formRef, (form) => {
  emit('update:configFormRef', form)
}, { immediate: true })
</script>

<style scoped lang="scss">
.archive-create-form__hint {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #64748b);
}
</style>
