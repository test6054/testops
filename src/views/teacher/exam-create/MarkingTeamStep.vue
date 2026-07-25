<template>
  <UiForm
    ref="formRef"
    :model="markingTeamForm"
    :rules="markingTeamRules"
    layout="horizontal"
    :label-col="labelCol"
    :wrapper-col="{ flex: 1 }"
    class="create-form"
  >
    <div id="exam-create-marking-team" class="form-section">
      <div class="section-header">
        <h3 class="section-title">阅卷队伍</h3>
      </div>
      <p class="section-desc">指定主考与阅卷教师；主考须同时属于阅卷名单。</p>

      <UiRow :gutter="24" class="create-form__split-row">
        <UiCol :span="12">
          <UiFormItem
            label="主考教师"
            name="chiefExaminerUserId"
            required
            tooltip="默认为当前创建人，须同时出现在阅卷教师名单中。"
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <TeacherSelector
              :value="markingTeamForm.chiefExaminerUserId"
              placeholder="默认当前创建人，可调整"
              @change="handleChiefSelect"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem
            label="匿名阅卷"
            name="anonymousMode"
            :tooltip="anonymousModeTip"
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <div class="create-form__switch-row">
              <UiSwitch size="sm" v-model="markingTeamForm.anonymousMode" />
              <span class="create-form__switch-label">
                {{ markingTeamForm.anonymousMode === true ? '启用匿名' : '关闭匿名' }}
              </span>
            </div>
          </UiFormItem>
        </UiCol>
      </UiRow>

      <UiFormItem label="阅卷教师" name="reviewerUserIds" required>
        <TeacherSelector
          v-model:value="markingTeamForm.reviewerUserIds"
          mode="multiple"
          placeholder="选择参与阅卷的教师（须包含主考）"
          @change="handleReviewersChange"
        />
      </UiFormItem>

      <UiFormItem label="队伍备注" name="remark">
        <UiTextarea
          size="sm"
          v-model="markingTeamForm.remark"
          :rows="2"
          placeholder="可填写阅卷分工说明（可选）"
          :maxlength="200"
          :show-count="true"
        />
      </UiFormItem>
    </div>
  </UiForm>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { TeacherUserInfoDto } from '@/apis/platform/teacher-catalog'
import { computed, onMounted, ref, watch } from 'vue'
import TeacherSelector from '@/components/platform/TeacherSelector.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import { useInjectedExamCreateMarkingTeamForm } from './exam-create-context'

defineProps<{
  markingTeamRules: Record<string, Rule[]>
}>()

const emit = defineEmits<{
  'update:marking-team-form-ref': [ref: FormInstance | undefined]
  'chief-change': [userId: string | null, nickName: string]
  'reviewers-change': [nickNames: string[]]
}>()

const labelCol = { style: { width: '88px' } }
const wrapperCol = { flex: 1 }
const markingTeamForm = useInjectedExamCreateMarkingTeamForm()
const formRef = ref<FormInstance>()
const anonymousModeTip = computed(() =>
  markingTeamForm.anonymousMode
    ? '阅卷页已隐藏考生姓名与学号。'
    : '启用后阅卷页不展示考生姓名与学号。',
)

function handleReviewersChange(
  _value: string | string[] | null,
  option?: TeacherUserInfoDto | TeacherUserInfoDto[],
): void {
  const teachers = Array.isArray(option) ? option : option ? [option] : []
  emit('reviewers-change', teachers.map((teacher) => teacher.nickName).filter(Boolean))
}

function handleChiefSelect(
  value: string | string[] | null,
  option?: TeacherUserInfoDto | TeacherUserInfoDto[],
): void {
  const rawChiefId = Array.isArray(value) ? (value[0] ?? null) : value
  const chiefId = rawChiefId == null || rawChiefId === '' ? null : String(rawChiefId)
  const teacher = Array.isArray(option) ? option[0] : option
  if (!chiefId) {
    emit('chief-change', null, '')
    return
  }
  emit('chief-change', chiefId, teacher?.nickName?.trim() ?? '')
}

onMounted(() => {
  emit('update:marking-team-form-ref', formRef.value)
})

watch(formRef, (value) => {
  emit('update:marking-team-form-ref', value)
})
</script>
