<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">线下纯归档建卷</UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goBack">返回列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <UiCard>
      <template #title>建卷信息</template>
      <a-form layout="vertical" class="archive-volume-create__form">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="归档标题" required>
              <a-input v-model:value="form.archiveTitle" placeholder="如 2024-2025 高等数学期末考查" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="档案编号（可选）">
              <a-input v-model:value="form.archiveNo" placeholder="不填则自动生成" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="课程 ID" required>
              <a-input v-model:value="form.courseId" placeholder="课程主键" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学年" required>
              <a-input v-model:value="form.academicYear" placeholder="2024-2025" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学期" required>
              <a-select v-model:value="form.semester" :options="semesterOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="考核形式">
              <a-select v-model:value="form.examForm" :options="examFormOptions" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="成绩事实源" required>
              <a-select v-model:value="form.scoreSource" :options="scoreSourceOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="密级" required>
              <a-select v-model:value="form.securityLevel" :options="securityLevelOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="授课班级名称">
              <a-input v-model:value="form.teachingClassName" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="院系名称">
              <a-input v-model:value="form.departmentName" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="考次">
              <a-input v-model:value="form.examRound" placeholder="期末 / 补考" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="保管年限">
              <a-space>
                <a-input-number
                  v-model:value="form.retentionYears"
                  :min="1"
                  :max="100"
                  :disabled="form.permanentRetention"
                />
                <a-checkbox v-model:checked="form.permanentRetention">永久保管</a-checkbox>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
        <UiFormActions>
          <UiButton variant="primary" :loading="submitting" @click="handleSubmit">
            创建归档卷
          </UiButton>
        </UiFormActions>
      </a-form>
    </UiCard>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type {
  ArchiveExamFormCode,
  ArchiveScoreSourceCode,
  ArchiveSecurityLevelCode,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_EXAM_FORM_LABEL,
  ARCHIVE_SCORE_SOURCE_LABEL,
  ARCHIVE_SECURITY_LEVEL_LABEL,
  createOfflineArchiveVolume,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiFormActions from '@/components/ui-guide/ui/UiFormActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'TeacherArchiveVolumeCreateOffline' })

const router = useRouter()
const submitting = ref(false)

const form = reactive({
  archiveTitle: '',
  archiveNo: '',
  courseId: '',
  academicYear: '',
  semester: '1',
  examForm: undefined as ArchiveExamFormCode | undefined,
  scoreSource: 'OFFLINE_CONFIRMED' as ArchiveScoreSourceCode,
  securityLevel: 'INTERNAL' as ArchiveSecurityLevelCode,
  teachingClassName: '',
  departmentName: '',
  examRound: '',
  retentionYears: 10,
  permanentRetention: false,
})

const semesterOptions = [
  { value: '1', label: '秋季学期' },
  { value: '2', label: '春季学期' },
]

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

async function handleSubmit() {
  if (!form.archiveTitle.trim() || !form.courseId.trim() || !form.academicYear.trim()) {
    message.warning('请填写必填项')
    return
  }
  submitting.value = true
  try {
    const volumeId = await createOfflineArchiveVolume({
      archiveTitle: form.archiveTitle.trim(),
      archiveNo: form.archiveNo.trim() || undefined,
      courseId: form.courseId.trim(),
      academicYear: form.academicYear.trim(),
      semester: form.semester,
      examForm: form.examForm,
      scoreSource: form.scoreSource,
      securityLevel: form.securityLevel,
      teachingClassName: form.teachingClassName.trim() || undefined,
      departmentName: form.departmentName.trim() || undefined,
      examRound: form.examRound.trim() || undefined,
      retentionYears: form.permanentRetention ? undefined : form.retentionYears,
      permanentRetention: form.permanentRetention,
    })
    message.success('归档卷创建成功')
    void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId } })
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    submitting.value = false
  }
}

function goBack() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}
</script>

<style scoped>
.archive-volume-create__form {
  max-width: 960px;
}
</style>
