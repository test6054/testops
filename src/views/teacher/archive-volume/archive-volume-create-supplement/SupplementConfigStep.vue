<template>
  <div id="archive-create-config" class="archive-create-step">
    <WorkbenchSurfaceCard flush class="archive-create-form">
      <template #head>
        <div class="archive-create-step__head">
          <h2 class="archive-create-step__title">归档配置</h2>
          <p class="archive-create-step__desc">
            选择补录来源与密级；历史补录适用于纸质档案电子化，线下阅卷适用于非线上主链考试归档。
          </p>
        </div>
      </template>
      <a-form
        ref="formRef"
        :model="configForm"
        :rules="props.configRules"
        layout="vertical"
        class="archive-create-form__body"
      >
        <div class="archive-create-form__grid">
          <a-form-item label="归档来源" name="sourceType" class="archive-create-form__full">
            <a-select v-model:value="configForm.sourceType" :options="sourceTypeOptions" />
          </a-form-item>
          <a-form-item label="考核形式">
            <a-select
              v-model:value="configForm.examForm"
              :options="examFormOptions"
              allow-clear
              placeholder="可选"
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
    </WorkbenchSurfaceCard>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import { ref, watch } from 'vue'
import {
  ARCHIVE_EXAM_FORM_OPTIONS,
  ARCHIVE_SECURITY_LEVEL_OPTIONS,
  ArchiveScoreSourceDescription,
} from '@/apis/mark/archive-volume'
import { TeacherSelector } from '@/components/quality/selectors'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ArchiveScoreSourceCode } from '@/types/enums/archive-score-source-enum'
import {
  ArchiveVolumeSourceTypeCode,
  ArchiveVolumeSourceTypeDescription,
} from '@/types/enums/archive-volume-source-type-enum'
import {
  useInjectedArchiveVolumeSupplementConfigForm,
} from './archive-volume-create-supplement-context'

const props = defineProps<{
  configRules: Record<string, Rule[]>
}>()

const emit = defineEmits<{
  'responsible-change': [userId: string | null, nickName: string]
  'update:config-form-ref': [form: FormInstance | undefined]
}>()

const configForm = useInjectedArchiveVolumeSupplementConfigForm()
const formRef = ref<FormInstance>()

watch(formRef, (value) => {
  emit('update:config-form-ref', value)
}, { immediate: true })

const sourceTypeOptions = [
  ArchiveVolumeSourceTypeCode.HISTORY_IMPORT,
  ArchiveVolumeSourceTypeCode.OFFLINE_MARKED,
].map((value) => ({
  value,
  label: ArchiveVolumeSourceTypeDescription[value],
}))

const examFormOptions = ARCHIVE_EXAM_FORM_OPTIONS
const securityLevelOptions = ARCHIVE_SECURITY_LEVEL_OPTIONS

const scoreSourceOptions = [
  ArchiveScoreSourceCode.NOT_REQUIRED,
  ArchiveScoreSourceCode.TEACHING_AFFAIRS,
  ArchiveScoreSourceCode.OFFLINE_CONFIRMED,
  ArchiveScoreSourceCode.MARK_INTERNAL,
].map((value) => ({
  value,
  label: ArchiveScoreSourceDescription[value],
}))

function handleResponsibleChange(user: TeacherUserInfoDto | null): void {
  const userId = user?.userId != null ? String(user.userId) : null
  emit('responsible-change', userId, user?.nickName ?? '')
}

defineExpose({ formRef })
</script>
