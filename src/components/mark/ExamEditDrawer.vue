<template>
  <UiDrawer
    :open="open"
    title="编辑考试"
    :width="640"
    :confirm-loading="saving"
    :mask-closable="false"
    ok-text="保存"
    :hide-footer="false"
    class="exam-edit-drawer"
    @update:open="(v: boolean) => emit('update:open', v)"
    @close="emit('update:open', false)"
    @confirm="handleSave"
  >
    <UiSkeletonState v-if="detailLoading" variant="card" compact />
    <UiForm
      v-else
      ref="formRef"
      :model="examForm"
      :rules="examFormRules"
      layout="vertical"
      class="exam-edit-drawer__form"
    >
      <section class="exam-edit-drawer__section">
        <h3 class="exam-edit-drawer__section-title">基本信息</h3>
        <UiFormItem label="课程" name="courseId">
          <CatalogCourseSelector
            v-model:value="examForm.courseId"
            placeholder="选择课程"
            :allow-clear="false"
          />
        </UiFormItem>
        <UiFormItem label="院系" name="referenceDepartmentId">
          <DepartmentSelector
            v-model:value="examForm.referenceDepartmentId"
            placeholder="选择参考院系"
            :allow-clear="false"
          />
        </UiFormItem>
        <UiFormItem label="考试名称" name="examName">
          <UiInput
            size="sm"
            v-model="examForm.examName"
            placeholder="例如：2026 春《工程制图》期末"
            :maxlength="100"
          />
        </UiFormItem>
        <UiFormItem label="考务编号" name="examNo">
          <UiInput
            size="sm"
            v-model="examForm.examNo"
            placeholder="教务系统编号或自定义编号"
            :maxlength="64"
          />
        </UiFormItem>
      </section>

      <section class="exam-edit-drawer__section">
        <h3 class="exam-edit-drawer__section-title">学期与时间</h3>
        <div class="exam-edit-drawer__row">
          <UiFormItem label="学年" name="academicYear" class="exam-edit-drawer__half">
            <UiInput
              size="sm"
              v-model="examForm.academicYear"
              placeholder="2024-2025"
              :maxlength="9"
            />
          </UiFormItem>
          <UiFormItem label="学期" name="semester" class="exam-edit-drawer__half">
            <UiSelect
              size="sm"
              v-model="examForm.semester"
              placeholder="选择学期"
              allow-clear
              :options="SemesterOptions"
            />
          </UiFormItem>
        </div>
        <UiFormItem label="考试时间窗" name="examWindow">
          <UiRangePicker
            v-model="examForm.examWindow"
            show-time
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            :placeholder="['开始时间', '结束时间']"
            style="width: 100%"
          />
        </UiFormItem>
      </section>

      <section class="exam-edit-drawer__section">
        <h3 class="exam-edit-drawer__section-title">成绩与策略</h3>
        <UiFormItem label="阅卷策略" name="gradingStrategy">
          <UiInput
            size="sm"
            :value="
              strictEnumLabel(
                ExamGradingStrategyDescription,
                ExamGradingStrategyCode.SINGLE,
                '阅卷策略',
              )
            "
            disabled
          />
        </UiFormItem>
        <UiFormItem label="成绩构成" name="scoreCompositionMode">
          <UiRadioGroup
            v-model="examForm.scoreCompositionMode"
            size="sm"
            block
            :options="[
              { label: '仅计入考试成绩（期末笔试）', value: 'EXAM_ONLY' },
              { label: '期末考试 + 平时成绩合成', value: 'EXAM_WITH_DAILY' },
            ]"
          />
          <p class="exam-edit-drawer__hint">
            平时成绩指出勤、作业、课堂表现等；选择合成后，成绩确认时需为每位考生录入平时分，总成绩=考试分+平时分。
          </p>
        </UiFormItem>
        <UiFormItem
          v-if="examForm.scoreCompositionMode === 'EXAM_WITH_DAILY'"
          label="平时成绩满分"
          name="dailyScoreFull"
        >
          <UiInputNumber
            size="sm"
            v-model="examForm.dailyScoreFull"
            :min="0.01"
            :max="1000"
            :precision="2"
            style="width: 100%"
            placeholder="例如 30（与培养方案中平时分满分一致）"
          />
        </UiFormItem>
        <UiFormItem label="备注" name="remark">
          <UiTextarea
            size="sm"
            v-model="examForm.remark"
            :rows="3"
            placeholder="可填写考试用途、班级范围说明等"
            :maxlength="500"
            :show-count="true"
          />
        </UiFormItem>
        <UiFormItem label="涉密场次" name="confidential">
          <UiSwitch size="sm" v-model="examForm.confidential" :disabled="detailLoading === true" />
        </UiFormItem>
      </section>
    </UiForm>
    <template #footer>
      <UiButton size="sm" variant="outline" :disabled="saving" @click="emit('update:open', false)">
        取消
      </UiButton>
      <UiButton
        v-if="canManageOwnerExamLifecycleWrites === true"
        size="sm"
        variant="primary"
        :loading="saving"
        :disabled="detailLoading === true"
        @click="handleSave"
      >
        保存
      </UiButton>
    </template>
  </UiDrawer>
</template>

<script lang="ts" setup>
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ExamUpdateRequest } from '@/apis/mark/exam'
import type { SemesterCode } from '@/types/enums/semester-enum'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
import {
  ExamGradingStrategyCode,
  ExamGradingStrategyDescription,
  getExamDetail,
  updateExam,
} from '@/apis/mark/exam'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import DepartmentSelector from '@/components/quality/selectors/DepartmentSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiRangePicker from '@/components/ui-guide/ui/RangePicker.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ExamEditDrawer' })

const props = defineProps<{
  open: boolean
  examId: string | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  "saved": []
}>()

type ExamScoreCompositionMode = 'EXAM_ONLY' | 'EXAM_WITH_DAILY'

const formRef = ref<FormInstance>()
const detailLoading = ref(false)
const saving = ref(false)
/** MVR-328：仅认 BE getExamDetail.canManageOwnerExamLifecycleWrites===true */
const canManageOwnerExamLifecycleWrites = ref(false)

const examForm = reactive<{
  courseId: string | null
  referenceDepartmentId: string | null
  examName: string
  examNo: string
  academicYear?: string
  semester?: SemesterCode
  examWindow?: [string, string]
  scoreCompositionMode: ExamScoreCompositionMode
  dailyScoreFull?: number
  confidential: boolean
  remark?: string
}>({
  courseId: null,
  referenceDepartmentId: null,
  examName: '',
  examNo: '',
  academicYear: '',
  semester: undefined,
  examWindow: undefined,
  scoreCompositionMode: 'EXAM_ONLY',
  dailyScoreFull: undefined,
  confidential: false,
  remark: '',
})

function rejectFormValidation(messageText: string): Promise<void> {
  return Promise.reject(new Error(messageText))
}

const examFormRules: Record<string, Rule[]> = {
  courseId: [{ required: true, message: '请选择课程', trigger: 'change' }],
  referenceDepartmentId: [{ required: true, message: '请选择院系', trigger: 'change' }],
  examName: [
    { required: true, message: '请输入考试名称', trigger: 'blur' },
    { max: 100, message: '考试名称最多 100 个字符', trigger: 'blur' },
  ],
  examNo: [
    { required: true, message: '请输入考务编号', trigger: 'blur' },
    { max: 64, message: '考务编号最多 64 个字符', trigger: 'blur' },
  ],
  academicYear: [
    {
      validator: async (): Promise<void> => {
        const academicYear = examForm.academicYear?.trim()
        if (!academicYear && !examForm.semester) return
        if (!academicYear || !examForm.semester) {
          return rejectFormValidation('学年与学期必须同时填写或同时留空')
        }
        const match = /^(\d{4})-(\d{4})$/.exec(academicYear)
        if (!match || Number(match[2]) !== Number(match[1]) + 1) {
          return rejectFormValidation('学年格式应为 2024-2025')
        }
      },
      trigger: 'blur',
    },
  ],
  semester: [
    {
      validator: async (): Promise<void> => {
        const academicYear = examForm.academicYear?.trim()
        if (!academicYear && !examForm.semester) return
        if (!academicYear || !examForm.semester) {
          return rejectFormValidation('学年与学期必须同时填写或同时留空')
        }
      },
      trigger: 'change',
    },
  ],
  examWindow: [
    {
      validator: async (): Promise<void> => {
        const [startTime, endTime] = examForm.examWindow ?? []
        if (!startTime || !endTime) {
          return rejectFormValidation('请选择考试时间窗')
        }
      },
      trigger: 'change',
    },
  ],
  dailyScoreFull: [
    {
      validator: async (): Promise<void> => {
        if (examForm.scoreCompositionMode !== 'EXAM_WITH_DAILY') return
        const value = examForm.dailyScoreFull
        if (value == null || value <= 0) {
          return rejectFormValidation('请填写平时成绩满分（须大于 0）')
        }
        if (value > 1000) {
          return rejectFormValidation('平时成绩满分不能超过 1000')
        }
      },
      trigger: 'change',
    },
  ],
}

function resetForm(): void {
  examForm.courseId = null
  examForm.referenceDepartmentId = null
  examForm.examName = ''
  examForm.examNo = ''
  examForm.academicYear = ''
  examForm.semester = undefined
  examForm.examWindow = undefined
  examForm.scoreCompositionMode = 'EXAM_ONLY'
  examForm.dailyScoreFull = undefined
  examForm.confidential = false
  examForm.remark = ''
}

async function loadDetail(examId: string): Promise<void> {
  detailLoading.value = true
  resetForm()
  try {
    const detail = await getExamDetail(examId)
    canManageOwnerExamLifecycleWrites.value = detail.canManageOwnerExamLifecycleWrites === true
    if (canManageOwnerExamLifecycleWrites.value !== true) {
      void message.warning('仅考试主考可修改考试主信息')
      emit('update:open', false)
      return
    }
    examForm.courseId = detail.courseId ?? null
    examForm.referenceDepartmentId = detail.referenceDepartmentId ?? null
    examForm.examName = detail.examName
    examForm.examNo = detail.examNo
    examForm.academicYear = detail.academicYear ?? ''
    examForm.semester = detail.semester
    examForm.examWindow
      = detail.examStartTime && detail.examEndTime
        ? [detail.examStartTime, detail.examEndTime]
        : undefined
    examForm.scoreCompositionMode = detail.dailyScoreFull != null ? 'EXAM_WITH_DAILY' : 'EXAM_ONLY'
    examForm.dailyScoreFull = detail.dailyScoreFull ?? undefined
    examForm.remark = detail.remark ?? ''
    examForm.confidential = detail.confidential === true
  } catch (error) {
    canManageOwnerExamLifecycleWrites.value = false
    showUserError(error, '考试详情加载失败')
    emit('update:open', false)
  } finally {
    detailLoading.value = false
  }
}

function buildUpdateRequest(): ExamUpdateRequest | null {
  const [startTime, endTime] = examForm.examWindow ?? []
  if (
    !props.examId
    || !examForm.courseId
    || !examForm.referenceDepartmentId
    || !startTime
    || !endTime
  ) {
    return null
  }
  const academicYear = examForm.academicYear?.trim()
  return {
    examId: props.examId,
    courseId: examForm.courseId,
    examName: examForm.examName.trim(),
    examNo: examForm.examNo.trim(),
    academicYear: academicYear || undefined,
    semester: examForm.semester || undefined,
    examStartTime: startTime,
    examEndTime: endTime,
    gradingStrategy: ExamGradingStrategyCode.SINGLE,
    dailyScoreFull:
      examForm.scoreCompositionMode === 'EXAM_WITH_DAILY' ? examForm.dailyScoreFull : null,
    confidential: examForm.confidential,
    referenceDepartmentId: examForm.referenceDepartmentId,
    remark: examForm.remark?.trim() || undefined,
  }
}

async function handleSave(): Promise<void> {
  // MVR-970：保存防重入，避免连点并发 updateExam
  if (saving.value === true) {
    return
  }
  // MVR-428：仅认 BE 下发 canManageOwnerExamLifecycleWrites === true，禁止 truthy 回退
  if (canManageOwnerExamLifecycleWrites.value !== true) {
    void message.warning('仅考试主考可修改考试主信息')
    return
  }
  if (detailLoading.value === true) {
    void message.warning('考试详情加载中，请稍候再保存')
    return
  }
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  const request = buildUpdateRequest()
  if (!request) {
    void message.warning('请完整填写必填项')
    return
  }
  saving.value = true
  try {
    await updateExam(request)
    void message.success('考试已更新')
    emit('update:open', false)
    emit('saved')
  } catch (error) {
    showUserError(error, '保存考试失败')
  } finally {
    saving.value = false
  }
}

watch(
  () => [props.open, props.examId] as const,
  ([open, examId]) => {
    if (open && examId) {
      void loadDetail(examId)
    }
  },
)

defineExpose({
  openForExam: (examId: string) => {
    emit('update:open', true)
    void loadDetail(examId)
  },
})
</script>

<style lang="scss" scoped>
.exam-edit-drawer__form {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-5);
}

.exam-edit-drawer__section {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-1);
  padding: var(--dp-space-4);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-xs);
}

.exam-edit-drawer__section-title {
  margin: 0 0 var(--dp-space-2);
  font-size: var(--dp-font-size-md);
  font-weight: var(--dp-font-weight-title);
  line-height: 1.4;
  letter-spacing: -0.02em;
  color: var(--dp-text-primary);
}

.exam-edit-drawer__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--dp-space-3);
}

.exam-edit-drawer__half {
  margin-bottom: 0;
}

.exam-edit-drawer__hint {
  margin: var(--dp-space-2) 0 0;
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
}
</style>
