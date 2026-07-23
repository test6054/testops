<template>
  <UiDrawer
    v-model:open="open"
    title="命题计划与试卷组"
    :width="960"
    :confirm-loading="saving"
    ok-text="保存命题资料"
    cancel-text="取消"
    @ok="handleSave"
  >
    <UiAlertStrip
      tone="info"
      title="当前考试资料"
      description="仅草稿或退回整改状态可修改。保存后必须重新完成规则核验和学院签审。"
      :closable="false"
    />
    <UiForm layout="vertical" class="paper-governance-drawer__form">
      <UiFormItem label="命题计划" required>
        <UiTextarea v-model="form.planContent" :rows="3" :maxlength="2000" show-count placeholder="说明课程目标、考核范围、题型安排与命题依据" />
      </UiFormItem>
      <div class="paper-governance-drawer__plan-grid">
        <UiFormItem label="归属学院" required><UiInput :model-value="departmentName" disabled /></UiFormItem>
        <UiFormItem label="考核方式" required>
          <a-select v-model:value="form.assessmentMode" :options="assessmentModeOptions" />
        </UiFormItem>
        <UiFormItem v-if="form.assessmentMode === ExamAssessmentModeCode.WRITTEN_EXAM" label="笔试方式" required>
          <a-select v-model:value="form.writtenExamMode" :options="writtenExamModeOptions" />
        </UiFormItem>
        <UiFormItem label="外审要求" required>
          <a-switch v-model:checked="form.externalReviewRequired" checked-children="启用" un-checked-children="不启用" />
        </UiFormItem>
        <UiFormItem label="指定校内审核教师" required>
          <TeacherSelector v-model:value="form.internalReviewerUserIds" mode="multiple" :department-id="referenceDepartmentId ?? null" placeholder="按实际工作安排选择审核教师" />
        </UiFormItem>
        <UiFormItem v-if="form.externalReviewRequired" label="指定外审教师" required>
          <TeacherSelector v-model:value="form.externalReviewerUserIds" mode="multiple" :department-id="referenceDepartmentId ?? null" placeholder="选择本场外审教师" />
        </UiFormItem>
        <UiFormItem label="试卷总分" required><UiInputNumber v-model="form.expectedTotalScore" :min="1" :max="1000" /></UiFormItem>
        <UiFormItem label="作答时长（分钟）" required><UiInputNumber v-model="form.expectedDurationMinutes" :min="1" :max="600" /></UiFormItem>
      </div>
      <div class="paper-governance-drawer__section-head">
        <div><h3>试卷组</h3><p>每套试卷必须配套试卷文件、参考答案、评分标准及逐题摘要。</p></div>
        <UiButton variant="outline" size="sm" @click="addPaperSet">新增试卷组</UiButton>
      </div>
      <section v-for="(paperSet, paperIndex) in form.paperSets" :key="paperSet.key" class="paper-governance-drawer__paper-set">
        <div class="paper-governance-drawer__paper-head">
          <strong>试卷组 {{ paperIndex + 1 }}</strong>
          <UiButton v-if="form.paperSets.length > 1" variant="ghost" size="sm" @click="removePaperSet(paperIndex)">移除</UiButton>
        </div>
        <div class="paper-governance-drawer__paper-grid">
          <UiFormItem label="用途编码" required><UiInput v-model="paperSet.paperCode" placeholder="A / B / RESERVE / MAKEUP" :maxlength="32" /></UiFormItem>
          <UiFormItem label="试卷名称" required><UiInput v-model="paperSet.paperName" placeholder="例如：2026 春季学期 A 卷" :maxlength="100" /></UiFormItem>
          <UiFormItem label="总分" required><UiInputNumber v-model="paperSet.totalScore" :min="1" :max="1000" /></UiFormItem>
          <UiFormItem label="时长（分钟）" required><UiInputNumber v-model="paperSet.durationMinutes" :min="1" :max="600" /></UiFormItem>
        </div>
        <div class="paper-governance-drawer__file-grid">
          <UiFormItem label="试卷文件" required><UiPlatformFileField v-model:file-node-id="paperSet.sourcePdfFileId" v-model:file-name="paperSet.sourcePdfFileName" :scene-key="FileUploadSceneKey.MARK_EXAM_TEMPLATE" accept=".pdf,.doc,.docx" button-text="上传试卷" tip="PDF / Word" /></UiFormItem>
          <UiFormItem label="参考答案" required><UiPlatformFileField v-model:file-node-id="paperSet.answerFileId" v-model:file-name="paperSet.answerFileName" :scene-key="FileUploadSceneKey.MARK_EXAM_TEMPLATE" accept=".pdf,.doc,.docx" button-text="上传答案" tip="PDF / Word" /></UiFormItem>
          <UiFormItem label="评分标准" required><UiPlatformFileField v-model:file-node-id="paperSet.scoringRubricFileId" v-model:file-name="paperSet.scoringRubricFileName" :scene-key="FileUploadSceneKey.MARK_EXAM_TEMPLATE" accept=".pdf,.doc,.docx" button-text="上传评分标准" tip="PDF / Word" /></UiFormItem>
        </div>
        <div class="paper-governance-drawer__question-head"><span>逐题摘要</span><UiButton variant="ghost" size="sm" @click="addQuestion(paperIndex)">新增题目</UiButton></div>
        <div v-for="(question, questionIndex) in paperSet.questions" :key="question.key" class="paper-governance-drawer__question-row">
          <UiInput v-model="question.questionNo" placeholder="题号" :maxlength="32" />
          <a-select
            v-model:value="question.questionType"
            :options="questionTypeOptions"
            placeholder="题型"
            allow-clear
          />
          <UiInputNumber v-model="question.fullScore" :min="0.5" :max="1000" :step="0.5" />
          <UiTextarea v-model="question.stemText" :rows="2" placeholder="填写与受控试卷文件一致的完整题干；系统自动核验并生成指纹" :maxlength="3000" />
          <UiTextarea v-model="question.answerInstruction" :rows="2" placeholder="填写与受控试卷一致的答题要求或特别作答说明" :maxlength="1000" />
          <UiButton v-if="paperSet.questions.length > 1" variant="ghost" size="sm" @click="removeQuestion(paperIndex, questionIndex)">移除</UiButton>
        </div>
      </section>
    </UiForm>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type {
  ExamPaperGovernanceResponse,
  ExamPaperGovernanceSaveRequest,
  ExamPaperQuestionTypeCode,
} from '@/apis/mark/paper-governance'
import { computed, reactive, watch } from 'vue'
import {
  ALL_EXAM_PAPER_QUESTION_TYPE_CODES,
  ExamAssessmentModeCode,
  ExamPaperQuestionTypeDescription,
  ExamPaperReviewStageCode,
  ExamWrittenExamModeCode,
} from '@/apis/mark/paper-governance'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import TeacherSelector from '@/components/platform/TeacherSelector.vue'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import { showFormValidationMessage } from '@/utils/error-handler'

interface EditableQuestion {
  key: string
  questionNo: string
  questionType: ExamPaperQuestionTypeCode | undefined
  fullScore: number | null
  stemText: string
  answerInstruction: string
  layoutQuestionId?: string
}
interface EditablePaperSet {
  key: string
  paperCode: string
  paperName: string
  totalScore: number | null
  durationMinutes: number | null
  sourcePdfFileId?: string
  sourcePdfFileName?: string
  answerFileId?: string
  answerFileName?: string
  scoringRubricFileId?: string
  scoringRubricFileName?: string
  questions: EditableQuestion[]
}
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  examId: string
  referenceDepartmentId?: string
  departmentName?: string
  governance: ExamPaperGovernanceResponse | null
  saving: boolean
}>()
const emit = defineEmits<{ save: [payload: ExamPaperGovernanceSaveRequest] }>()
const form = reactive<{
  planContent: string
  assessmentMode: ExamAssessmentModeCode
  writtenExamMode?: ExamWrittenExamModeCode
  externalReviewRequired: boolean
  internalReviewerUserIds: string[]
  externalReviewerUserIds: string[]
  expectedTotalScore: number | null
  expectedDurationMinutes: number | null
  paperSets: EditablePaperSet[]
}>({
  planContent: '',
  assessmentMode: ExamAssessmentModeCode.WRITTEN_EXAM,
  writtenExamMode: ExamWrittenExamModeCode.CLOSED_BOOK,
  externalReviewRequired: false,
  internalReviewerUserIds: [],
  externalReviewerUserIds: [],
  expectedTotalScore: 100,
  expectedDurationMinutes: 120,
  paperSets: [],
})
const assessmentModeOptions = [
  { value: ExamAssessmentModeCode.WRITTEN_EXAM, label: '笔试' },
  { value: ExamAssessmentModeCode.CASE_ANALYSIS, label: '案例分析' },
  { value: ExamAssessmentModeCode.COURSE_THESIS, label: '结课论文' },
]
const writtenExamModeOptions = [
  { value: ExamWrittenExamModeCode.CLOSED_BOOK, label: '闭卷' },
  { value: ExamWrittenExamModeCode.OPEN_BOOK, label: '开卷' },
]
const questionTypeOptions = ALL_EXAM_PAPER_QUESTION_TYPE_CODES.map((code) => ({
  value: code,
  label: ExamPaperQuestionTypeDescription[code],
}))
const departmentName = computed(() => props.departmentName || '未配置参考院系')
const nextKey = () => `${Date.now()}-${Math.random()}`
function emptyQuestion(): EditableQuestion {
  return { key: nextKey(), questionNo: '', questionType: undefined, fullScore: null, stemText: '', answerInstruction: '' }
}
function emptyPaperSet(code = 'A'): EditablePaperSet {
  return {
    key: nextKey(),
    paperCode: code,
    paperName: '',
    totalScore: form.expectedTotalScore,
    durationMinutes: form.expectedDurationMinutes,
    questions: [emptyQuestion()],
  }
}
function resetForm(): void {
  const source = props.governance
  form.planContent = source?.governance?.planContent ?? ''
  form.assessmentMode = source?.governance?.assessmentMode ?? ExamAssessmentModeCode.WRITTEN_EXAM
  form.writtenExamMode = source?.governance?.writtenExamMode ?? ExamWrittenExamModeCode.CLOSED_BOOK
  form.externalReviewRequired = source?.governance?.externalReviewRequired ?? false
  form.internalReviewerUserIds = (source?.reviewerAssignments ?? [])
    .filter((item) => item.reviewStage === ExamPaperReviewStageCode.INTERNAL)
    .sort((left, right) => left.reviewOrder - right.reviewOrder)
    .map((item) => item.reviewerUserId)
  form.externalReviewerUserIds = (source?.reviewerAssignments ?? [])
    .filter((item) => item.reviewStage === ExamPaperReviewStageCode.EXTERNAL)
    .sort((left, right) => left.reviewOrder - right.reviewOrder)
    .map((item) => item.reviewerUserId)
  form.expectedTotalScore = source?.governance?.expectedTotalScore ?? 100
  form.expectedDurationMinutes = source?.governance?.expectedDurationMinutes ?? 120
  form.paperSets = (source?.paperSets ?? []).map((item) => ({
    key: nextKey(),
    paperCode: item.paperCode,
    paperName: item.paperName,
    totalScore: item.totalScore,
    durationMinutes: item.durationMinutes,
    sourcePdfFileId: item.sourcePdfFileId,
    answerFileId: item.answerFileId,
    scoringRubricFileId: item.scoringRubricFileId,
    questions: (source?.questionsByPaperSetId?.[item.id] ?? []).map((question) => ({
      key: nextKey(),
      questionNo: question.questionNo,
      questionType: question.questionType,
      fullScore: question.fullScore,
      stemText: question.stemText,
      answerInstruction: question.answerInstruction,
      layoutQuestionId: question.layoutQuestionId,
    })),
  }))
  if (!form.paperSets.length) form.paperSets = [emptyPaperSet()]
}
watch(open, (value) => {
  if (value) resetForm()
})
function addPaperSet(): void {
  form.paperSets.push(emptyPaperSet(form.paperSets.some((item) => item.paperCode === 'A') ? 'B' : 'A'))
}
function removePaperSet(index: number): void {
  form.paperSets.splice(index, 1)
}
function addQuestion(index: number): void {
  form.paperSets[index].questions.push(emptyQuestion())
}
function removeQuestion(paperIndex: number, questionIndex: number): void {
  form.paperSets[paperIndex].questions.splice(questionIndex, 1)
}
function handleSave(): void {
  if (!props.referenceDepartmentId || !form.planContent.trim() || !form.expectedTotalScore || !form.expectedDurationMinutes
    || !form.internalReviewerUserIds.length || (form.externalReviewRequired && !form.externalReviewerUserIds.length)
    || (form.assessmentMode === ExamAssessmentModeCode.WRITTEN_EXAM && !form.writtenExamMode)) {
    showFormValidationMessage('请完整填写归属学院、考核方式、指定审核教师、命题计划、总分和作答时长')
    return
  }
  const paperSets: ExamPaperGovernanceSaveRequest['paperSets'] = []
  for (const item of form.paperSets) {
    const questions: ExamPaperGovernanceSaveRequest['paperSets'][number]['questions'] = []
    for (const question of item.questions) {
      if (!item.paperCode.trim() || !item.paperName.trim() || !item.sourcePdfFileId || !item.answerFileId
        || !item.scoringRubricFileId || !question.questionNo.trim() || !question.questionType
        || !question.fullScore || !question.stemText.trim() || !question.answerInstruction.trim()) {
        showFormValidationMessage('请完整填写试卷文件、答案、评分标准、题干和答题要求')
        return
      }
      questions.push({
        questionNo: question.questionNo.trim(),
        questionType: question.questionType,
        fullScore: question.fullScore,
        stemText: question.stemText.trim(),
        answerInstruction: question.answerInstruction.trim(),
        layoutQuestionId: question.layoutQuestionId,
      })
    }
    paperSets.push({
      paperCode: item.paperCode.trim(),
      paperName: item.paperName.trim(),
      sourcePdfFileId: item.sourcePdfFileId!,
      answerFileId: item.answerFileId!,
      scoringRubricFileId: item.scoringRubricFileId!,
      totalScore: item.totalScore ?? 0,
      durationMinutes: item.durationMinutes ?? 0,
      questions,
    })
  }
  emit('save', {
    examId: props.examId,
    departmentId: props.referenceDepartmentId,
    assessmentMode: form.assessmentMode,
    writtenExamMode: form.assessmentMode === ExamAssessmentModeCode.WRITTEN_EXAM ? form.writtenExamMode : undefined,
    externalReviewRequired: form.externalReviewRequired,
    planContent: form.planContent.trim(),
    expectedTotalScore: form.expectedTotalScore,
    expectedDurationMinutes: form.expectedDurationMinutes,
    paperSets,
    reviewers: [
      ...form.internalReviewerUserIds.map((reviewerUserId, index) => ({
        reviewerUserId,
        reviewStage: ExamPaperReviewStageCode.INTERNAL,
        reviewOrder: index + 1,
      })),
      ...form.externalReviewerUserIds.map((reviewerUserId, index) => ({
        reviewerUserId,
        reviewStage: ExamPaperReviewStageCode.EXTERNAL,
        reviewOrder: index + 1,
      })),
    ],
  })
}
</script>

<style lang="scss" scoped>
.paper-governance-drawer__form { margin-top: var(--dp-space-4); }
.paper-governance-drawer__plan-grid, .paper-governance-drawer__paper-grid, .paper-governance-drawer__file-grid { display: grid; gap: var(--dp-space-3); grid-template-columns: repeat(2, minmax(0, 1fr)); }
.paper-governance-drawer__file-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.paper-governance-drawer__section-head, .paper-governance-drawer__paper-head, .paper-governance-drawer__question-head { display: flex; justify-content: space-between; align-items: center; gap: var(--dp-space-3); }
.paper-governance-drawer__section-head { margin: var(--dp-space-5) 0 var(--dp-space-3); }
.paper-governance-drawer__section-head h3 { margin: 0; font-size: var(--dp-font-size-md); }
.paper-governance-drawer__section-head p { margin: var(--dp-space-1) 0 0; color: var(--dp-text-secondary); }
.paper-governance-drawer__paper-set { padding: var(--dp-space-4); margin-bottom: var(--dp-space-4); border: 1px solid var(--dp-border-subtle); border-radius: var(--dp-radius-panel); }
.paper-governance-drawer__question-head { margin-top: var(--dp-space-2); }
.paper-governance-drawer__question-row { display: grid; grid-template-columns: 100px 180px 120px minmax(0, 1fr) minmax(0, 1fr) auto; gap: var(--dp-space-2); margin-top: var(--dp-space-2); }
@media (max-width: 900px) { .paper-governance-drawer__file-grid, .paper-governance-drawer__question-row { grid-template-columns: 1fr; } }
</style>
