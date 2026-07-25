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
    <div v-else-if="detailLoadFailed" class="exam-edit-drawer__load-failed">
      <UiAlertStrip
        tone="error"
        title="考试详情加载失败"
        :description="detailLoadErrorMessage"
      />
      <p class="exam-edit-drawer__identity">
        考试 ID：{{ examId ?? '—' }}
      </p>
    </div>
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

        <div class="exam-edit-drawer__status-row" aria-label="阅卷策略">
          <div class="exam-edit-drawer__status-row-head">
            <span class="exam-edit-drawer__status-row-label">阅卷策略</span>
            <UiTag tone="blue" size="sm">本场固定</UiTag>
          </div>
          <p class="exam-edit-drawer__status-row-value">
            {{
              strictEnumLabel(
                ExamGradingStrategyDescription,
                ExamGradingStrategyCode.SINGLE,
                '阅卷策略',
              )
            }}
          </p>
          <p class="exam-edit-drawer__hint">
            策略在创建考试时确定，本页只读展示，不是权限不足或暂不可编辑。
          </p>
        </div>

        <UiFormItem label="成绩构成" name="scoreCompositionMode">
          <div
            class="exam-edit-drawer__composition"
            role="radiogroup"
            aria-label="成绩构成"
          >
            <button
              v-for="option in scoreCompositionOptions"
              :key="option.value"
              type="button"
              role="radio"
              class="exam-edit-drawer__composition-card"
              :class="{
                'exam-edit-drawer__composition-card--selected':
                  examForm.scoreCompositionMode === option.value,
              }"
              :aria-checked="examForm.scoreCompositionMode === option.value"
              @click="handleScoreCompositionSelect(option.value)"
            >
              <span class="exam-edit-drawer__composition-card-title">{{ option.title }}</span>
              <span class="exam-edit-drawer__composition-card-desc">{{ option.consequence }}</span>
            </button>
          </div>
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
          <div class="exam-edit-drawer__confidential">
            <div class="exam-edit-drawer__confidential-control">
              <UiSwitch
                size="sm"
                :model-value="examForm.confidential"
                :disabled="detailLoading || saving"
                @update:model-value="handleConfidentialChange"
              />
              <span class="exam-edit-drawer__confidential-state">
                {{ examForm.confidential ? '已开启涉密' : '普通场次' }}
              </span>
            </div>
            <ul class="exam-edit-drawer__consequence-list" aria-label="涉密场次影响范围">
              <li
                v-for="item in confidentialConsequenceItems"
                :key="item"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </UiFormItem>
      </section>
    </UiForm>
    <template #footer>
      <template v-if="detailLoadFailed">
        <UiButton size="sm" variant="outline" @click="emit('update:open', false)">
          关闭
        </UiButton>
      </template>
      <template v-else-if="!detailLoading">
        <UiButton size="sm" variant="outline" :disabled="saving" @click="emit('update:open', false)">
          取消
        </UiButton>
        <UiButton
          v-if="canManageOwnerExamLifecycleWrites"
          size="sm"
          variant="primary"
          :loading="saving"
          @click="handleSave"
        >
          保存
        </UiButton>
      </template>
    </template>
  </UiDrawer>
</template>

<script lang="ts" setup>
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
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
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

const scoreCompositionOptions: Array<{
  value: ExamScoreCompositionMode
  title: string
  consequence: string
}> = [
  {
    value: 'EXAM_ONLY',
    title: '仅计入考试成绩',
    consequence:
      '总评只含笔试分；确认与发布不要求平时分；学情统计按考试分口径，保存后立即约束本场成绩流程。',
  },
  {
    value: 'EXAM_WITH_DAILY',
    title: '期末考试 + 平时成绩合成',
    consequence:
      '总评=考试分+平时分；确认成绩须为每位考生录入平时分；发布与后续统计按合成分口径，保存后立即生效。',
  },
]

const confidentialConsequenceItems = [
  '卷面预览与导出材料叠加涉密水印',
  '成绩与影像批量下载、对外导出按涉密策略限制',
  '影像访问与工作台影像相关入口按涉密规则收紧',
]

const formRef = ref<FormInstance>()
const detailLoading = ref(false)
const detailLoadFailed = ref(false)
const detailLoadErrorMessage = ref('请关闭后重新打开编辑。')
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

function resolveDetailLoadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  return '网络或服务异常，详情未加载；抽屉保持打开，可关闭后重新打开编辑。'
}

async function loadDetail(examId: string): Promise<void> {
  detailLoading.value = true
  detailLoadFailed.value = false
  detailLoadErrorMessage.value = '请关闭后重新打开编辑。'
  resetForm()
  try {
    const detail = await getExamDetail(examId)
    canManageOwnerExamLifecycleWrites.value = detail.canManageOwnerExamLifecycleWrites === true
    if (!canManageOwnerExamLifecycleWrites.value) {
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
    detailLoadFailed.value = true
    detailLoadErrorMessage.value = resolveDetailLoadErrorMessage(error)
    showUserError(error, '考试详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

async function handleScoreCompositionSelect(mode: ExamScoreCompositionMode): Promise<void> {
  if (mode === examForm.scoreCompositionMode || saving.value || detailLoading.value) {
    return
  }
  const option = scoreCompositionOptions.find((item) => item.value === mode)
  if (!option) {
    showUserError(null, `未知成绩构成：${mode}`)
    return
  }
  const confirmed = await confirmAsync({
    title: `切换为「${option.title}」？`,
    content: `${option.consequence} 保存后立即按新构成约束本场确认、发布与统计。`,
    type: 'warning',
    okText: '切换构成',
    cancelText: '取消',
  })
  if (!confirmed) {
    return
  }
  examForm.scoreCompositionMode = mode
  if (mode === 'EXAM_ONLY') {
    examForm.dailyScoreFull = undefined
  }
}

async function handleConfidentialChange(next: boolean): Promise<void> {
  if (next === examForm.confidential || saving.value || detailLoading.value) {
    return
  }
  const confirmed = await confirmAsync({
    title: next ? '开启涉密场次？' : '关闭涉密场次？',
    content: next
      ? '开启后将：卷面与导出加水印；限制成绩/影像批量下载与对外导出；影像访问按涉密策略收紧。保存后对当前场次生效。'
      : '关闭后将恢复普通场次水印与导出规则；已按涉密限制的导出权限与影像访问策略随之放宽。保存后对当前场次生效。',
    type: 'warning',
    okText: next ? '开启涉密' : '关闭涉密',
    cancelText: '取消',
  })
  if (!confirmed) {
    return
  }
  examForm.confidential = next
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
  // MVR-428：仅认 BE 下发 canManageOwnerExamLifecycleWrites === true，禁止 truthy 回退
  if (!canManageOwnerExamLifecycleWrites.value) {
    void message.warning('仅考试主考可修改考试主信息')
    return
  }
  if (detailLoading.value || detailLoadFailed.value) {
    void message.warning('考试详情未就绪，请关闭后重新打开编辑再保存')
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
    if (!open) {
      detailLoadFailed.value = false
    }
  },
)
</script>

<style lang="scss" scoped>
.exam-edit-drawer__form {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
}

.exam-edit-drawer__section {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
  padding: var(--dp-space-block);
  border: 1px solid var(--dp-panel-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-xs);
}

.exam-edit-drawer__section-title {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-md);
  font-weight: var(--dp-font-weight-title);
  line-height: 1.4;
  letter-spacing: 0;
  color: var(--dp-text-primary);
}

.exam-edit-drawer__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--dp-space-component);
}

.exam-edit-drawer__half {
  margin-bottom: 0;
}

.exam-edit-drawer__hint {
  margin: var(--dp-space-component-tight) 0 0;
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
}

.exam-edit-drawer__status-row {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
  margin-bottom: var(--dp-space-component);
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control-inner);
  background: var(--dp-surface-chrome);
}

.exam-edit-drawer__status-row-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
}

.exam-edit-drawer__status-row-label {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.exam-edit-drawer__status-row-value {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.exam-edit-drawer__composition {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  width: 100%;
}

.exam-edit-drawer__composition-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--dp-space-component-xs);
  width: 100%;
  margin: 0;
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control-inner);
  background: var(--dp-surface);
  text-align: left;
  cursor: pointer;
  color: inherit;
}

.exam-edit-drawer__composition-card:focus-visible {
  outline: 2px solid var(--dp-focus-ring);
  outline-offset: 2px;
}

.exam-edit-drawer__composition-card--selected {
  border-color: var(--dp-color-primary-border, var(--dp-color-primary));
  background: color-mix(in srgb, var(--dp-color-primary) 6%, var(--dp-surface));
}

.exam-edit-drawer__composition-card-title {
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  line-height: 1.4;
  color: var(--dp-text-primary);
}

.exam-edit-drawer__composition-card-desc {
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-secondary);
}

.exam-edit-drawer__confidential {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}

.exam-edit-drawer__confidential-control {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
}

.exam-edit-drawer__confidential-state {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.exam-edit-drawer__consequence-list {
  margin: 0;
  padding: var(--dp-space-component-tight) var(--dp-space-block);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control-inner);
  background: var(--dp-surface-chrome);
  font-size: var(--dp-type-hint-size);
  line-height: 1.55;
  color: var(--dp-text-secondary);
}

.exam-edit-drawer__load-failed {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
}

.exam-edit-drawer__identity {
  margin: 0;
  font-family: var(--dp-font-family-code);
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}
</style>
