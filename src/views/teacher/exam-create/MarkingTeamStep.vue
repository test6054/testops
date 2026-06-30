<template>
  <section id="exam-create-marking-team" class="form-section exam-create-form">
    <header class="section-header">
      <h2 class="section-title">阅卷队伍</h2>
    </header>
    <a-form ref="formRef" :model="markingTeamForm" :rules="markingTeamRules" layout="vertical">
      <a-form-item label="主考教师" name="chiefExaminerUserId" required>
        <TeacherSelector
          :value="markingTeamForm.chiefExaminerUserId"
          placeholder="默认当前创建人，可调整"
          @change="handleChiefSelect"
        />
        <div class="exam-create-form__hint">主考默认为创建人，须同时属于阅卷教师名单。</div>
      </a-form-item>
      <a-form-item label="匿名阅卷" name="anonymousMode">
        <a-switch v-model:checked="markingTeamForm.anonymousMode" />
        <div class="exam-create-form__hint">
          启用后，阅卷教师查看答卷时不显示考生姓名与学号。
        </div>
      </a-form-item>
      <a-form-item label="阅卷教师" name="reviewerUserIds" required>
        <TeacherSelector
          v-model:value="markingTeamForm.reviewerUserIds"
          mode="multiple"
          placeholder="选择参与阅卷的教师（须包含主考）"
          @change="handleReviewersChange"
        />
      </a-form-item>
      <a-form-item label="队伍备注" name="remark">
        <a-textarea
          v-model:value="markingTeamForm.remark"
          :rows="2"
          placeholder="可填写阅卷分工说明（可选）"
          :maxlength="200"
          show-count
        />
      </a-form-item>
    </a-form>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import { onMounted, ref, watch } from 'vue'
import { TeacherSelector } from '@/components/quality/selectors'
import { useInjectedExamCreateMarkingTeamForm } from './exam-create-context'

defineProps<{
  markingTeamRules: Record<string, Rule[]>
}>()

const emit = defineEmits<{
  'update:marking-team-form-ref': [ref: FormInstance | undefined]
  'chief-change': [userId: string | null, nickName: string]
  'reviewers-change': [nickNames: string[]]
}>()
const markingTeamForm = useInjectedExamCreateMarkingTeamForm()

const formRef = ref<FormInstance>()

function handleReviewersChange(
  _value: string | string[] | null,
  option?: TeacherUserInfoDto | TeacherUserInfoDto[],
): void {
  const teachers = Array.isArray(option) ? option : option ? [option] : []
  emit('reviewers-change', teachers.map(teacher => teacher.nickName).filter(Boolean))
}

function handleChiefSelect(
  value: string | string[] | null,
  option?: TeacherUserInfoDto | TeacherUserInfoDto[],
): void {
  const chiefId = Array.isArray(value) ? value[0] ?? null : value
  const teacher = Array.isArray(option) ? option[0] : option
  if (!chiefId || !teacher?.nickName) {
    emit('chief-change', null, '')
    return
  }
  emit('chief-change', chiefId, teacher.nickName)
}

onMounted(() => {
  emit('update:marking-team-form-ref', formRef.value)
})

watch(formRef, (value) => {
  emit('update:marking-team-form-ref', value)
})
</script>

<style scoped lang="scss">
.exam-create-form__hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #64748b);
}
</style>
