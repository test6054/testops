<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 间接评价管理 - 问卷 + 题项 + 答卷
 *
 * 后端：
 * - /api/quality/indirect-forms       问卷 CRUD
 * - /api/quality/indirect-items       题项 CRUD
 * - /api/quality/indirect-responses   答卷 CRUD + 批量
 *
 * 设计：先选问卷 → 显示题项 → 选题项查看答卷
 */
import type {
  AchievementTargetType,
  IndirectEvaluationFormQueryRequest,
  IndirectEvaluationFormSaveRequest,
  IndirectEvaluationFormVO,
  IndirectEvaluationItemSaveRequest,
  IndirectEvaluationItemType,
  IndirectEvaluationItemVO,
  IndirectEvaluationResponseSaveRequest,
  IndirectEvaluationResponseVO,
  IndirectFormType,
  RespondentType,
  ScaleConversionRuleVO,
} from '@/apis/quality'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ACHIEVEMENT_TARGET_TYPE_LABEL,
  INDIRECT_FORM_TYPE_LABEL,
  indirectFormApi,
  indirectItemApi,
  indirectResponseApi,
  RESPONDENT_TYPE_LABEL,
  scaleConversionRuleApi,
} from '@/apis/quality'
import {
  ClassSelector,
  CourseGoalSelector,
  CourseSelector,
  GraduationRequirementSelector,
  ProgramSelector,
  RequirementIndicatorSelector,
  StudentSelector,
  TeacherSelector,
  TrainingObjectiveSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import { UiButton, UiDataTable, UiEmpty } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityStore } from '@/stores/modules/quality'
import { throwUserFacing } from '@/utils/contract-guard'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'
import ImportResponseDocumentModal from './components/ImportResponseDocumentModal.vue'
import ImportResponseExcelModal from './components/ImportResponseExcelModal.vue'

const ITEM_CONFIG_ERROR = '题项配置不完整，请检查后重试'
const RESPONSE_DATA_ERROR = '答卷数据异常，请刷新后重试'
const SCALE_CONVERSION_RULE_OPTION_PAGE_SIZE = 100

const qualityStore = useQualityStore()

const formColumns: ColumnsType = [
  { title: '编码', dataIndex: 'formCode', key: 'formCode', width: 120 },
  { title: '名称', dataIndex: 'formName', key: 'formName' },
  { title: '问卷类型', dataIndex: 'formType', key: 'formType', width: 140 },
  { title: '目标', dataIndex: 'targetType', key: 'targetType', width: 200 },
  { title: '期望样本', dataIndex: 'expectedSample', key: 'expectedSample', width: 100 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

const itemColumns: ColumnsType = [
  { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 100 },
  { title: '题面', dataIndex: 'itemText', key: 'itemText' },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 70 },
  { title: '有效样本', key: 'validCount', width: 100 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const responseColumns: ColumnsType = [
  { title: '应答人', dataIndex: 'respondentType', key: 'respondentType', width: 100 },
  { title: '答案', dataIndex: 'answerSummary', key: 'answerSummary', width: 180 },
  { title: '换算分', dataIndex: 'convertedScore', key: 'convertedScore', width: 80 },
  { title: '开放回答', dataIndex: 'openText', key: 'openText' },
  { title: '有效', dataIndex: 'validFlag', key: 'validFlag', width: 70 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

function targetTypeLabel(value: AchievementTargetType): string {
  return strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, value, '达成目标类型')
}

function respondentTypeLabel(value: RespondentType): string {
  return strictEnumLabel(RESPONDENT_TYPE_LABEL, value, '应答人类型')
}

const formTypeOptions: { value: IndirectFormType, label: string }[] = [
  {
    value: 'STUDENT_SELF',
    label: strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, 'STUDENT_SELF', '间接评价问卷类型'),
  },
  {
    value: 'GRADUATE_TRACKING',
    label: strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, 'GRADUATE_TRACKING', '间接评价问卷类型'),
  },
  {
    value: 'TEACHER_EVALUATION',
    label: strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, 'TEACHER_EVALUATION', '间接评价问卷类型'),
  },
  {
    value: 'EMPLOYER_FEEDBACK',
    label: strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, 'EMPLOYER_FEEDBACK', '间接评价问卷类型'),
  },
  {
    value: 'EXPERT_EVALUATION',
    label: strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, 'EXPERT_EVALUATION', '间接评价问卷类型'),
  },
  {
    value: 'SUPERVISOR_EVALUATION',
    label: strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, 'SUPERVISOR_EVALUATION', '间接评价问卷类型'),
  },
]

const targetTypeOptions: { value: AchievementTargetType, label: string }[] = [
  {
    value: 'COURSE_GOAL',
    label: strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, 'COURSE_GOAL', '达成目标类型'),
  },
  {
    value: 'REQUIREMENT_INDICATOR',
    label: strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, 'REQUIREMENT_INDICATOR', '达成目标类型'),
  },
  {
    value: 'GRADUATION_REQUIREMENT',
    label: strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, 'GRADUATION_REQUIREMENT', '达成目标类型'),
  },
  {
    value: 'TRAINING_OBJECTIVE',
    label: strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, 'TRAINING_OBJECTIVE', '达成目标类型'),
  },
  {
    value: 'PROGRAM_SUMMARY',
    label: strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, 'PROGRAM_SUMMARY', '达成目标类型'),
  },
  {
    value: 'CIVIC_GOAL_AGGREGATE',
    label: strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, 'CIVIC_GOAL_AGGREGATE', '达成目标类型'),
  },
  {
    value: 'COMPLEX_ENGINEERING_AGGREGATE',
    label: strictEnumLabel(
      ACHIEVEMENT_TARGET_TYPE_LABEL,
      'COMPLEX_ENGINEERING_AGGREGATE',
      '达成目标类型',
    ),
  },
]
const respondentTypeOptions: { value: RespondentType, label: string }[] = [
  { value: 'STUDENT', label: strictEnumLabel(RESPONDENT_TYPE_LABEL, 'STUDENT', '应答人类型') },
  { value: 'GRADUATE', label: strictEnumLabel(RESPONDENT_TYPE_LABEL, 'GRADUATE', '应答人类型') },
  { value: 'EMPLOYER', label: strictEnumLabel(RESPONDENT_TYPE_LABEL, 'EMPLOYER', '应答人类型') },
  { value: 'TEACHER', label: strictEnumLabel(RESPONDENT_TYPE_LABEL, 'TEACHER', '应答人类型') },
  { value: 'EXPERT', label: strictEnumLabel(RESPONDENT_TYPE_LABEL, 'EXPERT', '应答人类型') },
  {
    value: 'SUPERVISOR',
    label: strictEnumLabel(RESPONDENT_TYPE_LABEL, 'SUPERVISOR', '应答人类型'),
  },
]
const itemTypeOptions: { value: IndirectEvaluationItemType, label: string }[] = [
  { value: 'SCALE', label: '量表题' },
  { value: 'SINGLE_CHOICE', label: '单选题' },
  { value: 'MULTI_CHOICE', label: '多选题' },
  { value: 'OPEN_TEXT', label: '开放文本' },
]

function formTypeLabel(value: IndirectFormType): string {
  return strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, value, '间接评价问卷类型')
}

/* ========== 问卷分页 ========== */

const forms = ref<IndirectEvaluationFormVO[]>([])
const formsTotal = ref(0)
const formsLoading = ref(false)
const formQuery = reactive<IndirectEvaluationFormQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  formType: undefined,
  targetType: undefined,
  enabled: undefined,
})
const selectedForm = ref<IndirectEvaluationFormVO | null>(null)
const formEditorQualityCourseId = ref('')
const formEditorTrainingPlanId = ref('')
const formEditorGraduationRequirementId = ref('')
const itemEditorQualityCourseId = ref('')
const itemEditorTrainingPlanId = ref('')
const itemEditorGraduationRequirementId = ref('')
const responseEditorClassId = ref('')
const responseIdentityName = ref('')
const responseIdentityOrganization = ref('')
const responseIdentityContact = ref('')

function handleFormTargetChange(value: string | null | undefined) {
  formEditor.targetId = value ?? ''
}

function handleFormTargetTypeChange() {
  formEditor.targetId = ''
  formEditorQualityCourseId.value = ''
  formEditorTrainingPlanId.value = ''
  formEditorGraduationRequirementId.value = ''
  if (
    formEditor.targetType === 'PROGRAM_SUMMARY'
    || formEditor.targetType === 'CIVIC_GOAL_AGGREGATE'
    || formEditor.targetType === 'COMPLEX_ENGINEERING_AGGREGATE'
  ) {
    formEditor.targetId = formEditor.programId || ''
  }
}

function handleFormCourseChange(value: string | null | undefined) {
  formEditorQualityCourseId.value = value ?? ''
  formEditor.targetId = ''
}

function handleFormTrainingPlanChange(value: string | null | undefined) {
  formEditorTrainingPlanId.value = value ?? ''
  formEditor.targetId = ''
  formEditorGraduationRequirementId.value = ''
}

function handleFormGraduationRequirementChange(value: string | null | undefined) {
  formEditorGraduationRequirementId.value = value ?? ''
  if (formEditor.targetType === 'GRADUATION_REQUIREMENT') {
    formEditor.targetId = value ?? ''
  } else {
    formEditor.targetId = ''
  }
}

function handleFormProgramChange(value: string | null | undefined) {
  const id = value ?? ''
  formEditor.programId = id
  formEditorTrainingPlanId.value = ''
  formEditorGraduationRequirementId.value = ''
  if (
    formEditor.targetType === 'PROGRAM_SUMMARY'
    || formEditor.targetType === 'CIVIC_GOAL_AGGREGATE'
    || formEditor.targetType === 'COMPLEX_ENGINEERING_AGGREGATE'
  ) {
    formEditor.targetId = id
  } else if (formEditor.targetType !== 'COURSE_GOAL') {
    formEditor.targetId = ''
  }
}

function handleItemTargetTypeChange() {
  itemEditor.value.targetId = ''
  itemEditorQualityCourseId.value = ''
  itemEditorTrainingPlanId.value = ''
  itemEditorGraduationRequirementId.value = ''
  if (
    itemEditor.value.targetType === 'PROGRAM_SUMMARY'
    || itemEditor.value.targetType === 'CIVIC_GOAL_AGGREGATE'
    || itemEditor.value.targetType === 'COMPLEX_ENGINEERING_AGGREGATE'
  ) {
    itemEditor.value.targetId = formEditor.programId || qualityStore.currentProgramId
  }
}

function handleItemCourseChange(value: string | null | undefined) {
  itemEditorQualityCourseId.value = value ?? ''
  itemEditor.value.targetId = ''
}

function handleItemTrainingPlanChange(value: string | null | undefined) {
  itemEditorTrainingPlanId.value = value ?? ''
  itemEditor.value.targetId = ''
  itemEditorGraduationRequirementId.value = ''
}

function handleItemGraduationRequirementChange(value: string | null | undefined) {
  itemEditorGraduationRequirementId.value = value ?? ''
  if (itemEditor.value.targetType === 'GRADUATION_REQUIREMENT') {
    itemEditor.value.targetId = value ?? ''
  } else {
    itemEditor.value.targetId = ''
  }
}

function handleItemTargetChange(value: string | null | undefined) {
  itemEditor.value.targetId = value ?? ''
}

function handleItemProgramChange(value: string | null | undefined) {
  itemEditorTrainingPlanId.value = ''
  itemEditorGraduationRequirementId.value = ''
  if (
    itemEditor.value.targetType === 'PROGRAM_SUMMARY'
    || itemEditor.value.targetType === 'CIVIC_GOAL_AGGREGATE'
    || itemEditor.value.targetType === 'COMPLEX_ENGINEERING_AGGREGATE'
  ) {
    itemEditor.value.targetId = value ?? ''
  } else if (itemEditor.value.targetType !== 'COURSE_GOAL') {
    itemEditor.value.targetId = ''
  }
}

function handleResponseClassChange(value: string | null | undefined) {
  responseEditorClassId.value = value ?? ''
  responseEditor.value.respondentId = ''
}

function handleResponseRespondentChange(value: string | string[] | null) {
  if (Array.isArray(value)) {
    message.warning('请单选应答人')
    return
  }
  responseEditor.value.respondentId = value ?? ''
}

function handleResponseRespondentTypeChange() {
  responseEditor.value.respondentId = ''
  responseEditorClassId.value = ''
  responseIdentityName.value = ''
  responseIdentityOrganization.value = ''
  responseIdentityContact.value = ''
}

async function loadForms() {
  formsLoading.value = true
  try {
    const page = await indirectFormApi.page({ ...formQuery })
    forms.value = readPageList(page, '间接评价问卷加载失败，请稍后重试')
    formsTotal.value = readPageTotal(page, '间接评价问卷加载失败，请稍后重试')
  } finally {
    formsLoading.value = false
  }
}

const formEditorVisible = ref(false)
const formEditorMode = ref<'create' | 'edit'>('create')
const formEditor = reactive<IndirectEvaluationFormSaveRequest>({
  formCode: '',
  formName: '',
  formType: 'STUDENT_SELF',
  targetType: 'COURSE_GOAL',
  targetId: '',
  programId: '',
  description: '',
  expectedSample: 30,
  enabled: true,
})

function openFormCreate() {
  formEditorMode.value = 'create'
  formEditorQualityCourseId.value = qualityStore.currentQualityCourseId
  formEditorTrainingPlanId.value = qualityStore.currentTrainingPlanId
  formEditorGraduationRequirementId.value = ''
  Object.assign(formEditor, {
    id: undefined,
    formCode: '',
    formName: '',
    formType: 'STUDENT_SELF',
    targetType: 'COURSE_GOAL',
    targetId: '',
    programId: qualityStore.currentProgramId,
    description: '',
    expectedSample: 30,
    enabled: true,
  })
  formEditorVisible.value = true
}

function openFormEdit(record: IndirectEvaluationFormVO) {
  formEditorMode.value = 'edit'
  formEditorQualityCourseId.value = qualityStore.currentQualityCourseId
  formEditorTrainingPlanId.value = qualityStore.currentTrainingPlanId
  formEditorGraduationRequirementId.value = ''
  Object.assign(formEditor, record)
  formEditorVisible.value = true
}

async function submitForm() {
  if (!formEditor.formCode.trim() || !formEditor.formName.trim() || !formEditor.targetId.trim()) {
    message.error('请填写问卷编码、名称，并选择评价对象')
    return
  }
  if (formEditorMode.value === 'create') await indirectFormApi.create(formEditor)
  else await indirectFormApi.update(formEditor)
  message.success('已保存')
  formEditorVisible.value = false
  await loadForms()
}

async function handleFormDelete(record: IndirectEvaluationFormVO) {
  void confirmAsync({
    title: `删除问卷 ${record.formCode}？`,
    type: 'error',
    onOk: async () => {
      await indirectFormApi.delete(record.id)
      message.success('已删除')
      if (selectedForm.value?.id === record.id) selectedForm.value = null
      await loadForms()
    },
  })
}

function handleFormPageChange(page: { current: number, pageSize: number }) {
  formQuery.pageNum = page.current
  formQuery.pageSize = page.pageSize
  loadForms()
}

/* ========== 题项 ========== */

const items = ref<IndirectEvaluationItemVO[]>([])
const itemsLoading = ref(false)
const selectedItem = ref<IndirectEvaluationItemVO | null>(null)
const scaleRules = ref<ScaleConversionRuleVO[]>([])

async function loadItems() {
  if (!selectedForm.value) {
    items.value = []
    return
  }
  itemsLoading.value = true
  try {
    items.value = await indirectItemApi.listByForm(selectedForm.value.id)
  } finally {
    itemsLoading.value = false
  }
}

async function loadScaleRules() {
  scaleRules.value = await readAllPages(
    (pageNum) => scaleConversionRuleApi.page({
      pageNum,
      pageSize: SCALE_CONVERSION_RULE_OPTION_PAGE_SIZE,
      enabled: true,
    }),
    '量表换算规则列表加载失败，请稍后重试',
  )
}

const itemEditorVisible = ref(false)
const itemEditorMode = ref<'create' | 'edit'>('create')
const itemEditor = ref<IndirectEvaluationItemSaveRequest>({
  formId: '',
  itemCode: '',
  itemText: '',
  targetType: 'COURSE_GOAL',
  targetId: '',
  scaleRuleId: undefined,
  weight: 1,
  sortOrder: 0,
  itemType: 'SCALE',
  scaleMin: 1,
  scaleMax: 5,
  scaleLabels: [
    { scaleValue: 1, label: '1分' },
    { scaleValue: 2, label: '2分' },
    { scaleValue: 3, label: '3分' },
    { scaleValue: 4, label: '4分' },
    { scaleValue: 5, label: '5分' },
  ],
  choiceOptions: [],
  required: true,
})

function defaultScaleLabels(min: number, max: number) {
  const labels = []
  for (let value = min; value <= max; value++) {
    labels.push({ scaleValue: value, label: `${value}分` })
  }
  return labels
}

function assertScaleLabelsComplete(record: IndirectEvaluationItemVO) {
  if (record.scaleMin == null || record.scaleMax == null || record.scaleMin >= record.scaleMax) {
    throwUserFacing(ITEM_CONFIG_ERROR)
  }
  const labels = record.scaleLabels
  if (!labels?.length) throwUserFacing(ITEM_CONFIG_ERROR)
  const values = new Set(labels.map((label) => label.scaleValue))
  for (let value = record.scaleMin; value <= record.scaleMax; value++) {
    if (!values.has(value)) throwUserFacing(ITEM_CONFIG_ERROR)
  }
}

function assertChoiceOptionsComplete(record: IndirectEvaluationItemVO) {
  const options = record.choiceOptions
  if (!options || options.length < 2) {
    throwUserFacing(ITEM_CONFIG_ERROR)
  }
  const values = new Set<string>()
  for (const option of options) {
    if (!option.optionValue.trim() || !option.optionLabel.trim()) {
      throwUserFacing(ITEM_CONFIG_ERROR)
    }
    if (values.has(option.optionValue.trim())) {
      throwUserFacing(ITEM_CONFIG_ERROR)
    }
    values.add(option.optionValue.trim())
  }
}

function assertEditableItemContract(record: IndirectEvaluationItemVO) {
  if (record.required == null) {
    throwUserFacing(ITEM_CONFIG_ERROR)
  }
  if (record.itemType === 'SCALE') {
    assertScaleLabelsComplete(record)
    return
  }
  if (record.itemType === 'SINGLE_CHOICE' || record.itemType === 'MULTI_CHOICE') {
    assertChoiceOptionsComplete(record)
  }
}

function openItemCreate() {
  if (!selectedForm.value) return
  itemEditorMode.value = 'create'
  itemEditorQualityCourseId.value
    = formEditorQualityCourseId.value || qualityStore.currentQualityCourseId
  itemEditorTrainingPlanId.value
    = formEditorTrainingPlanId.value || qualityStore.currentTrainingPlanId
  itemEditorGraduationRequirementId.value = formEditorGraduationRequirementId.value
  itemEditor.value = {
    formId: selectedForm.value.id,
    itemCode: '',
    itemText: '',
    targetType: selectedForm.value.targetType,
    targetId: selectedForm.value.targetId,
    scaleRuleId: undefined,
    weight: 1,
    sortOrder: (items.value.length + 1) * 10,
    itemType: 'SCALE',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: defaultScaleLabels(1, 5),
    choiceOptions: [],
    required: true,
  }
  itemEditorVisible.value = true
}

function openItemEdit(record: IndirectEvaluationItemVO) {
  assertEditableItemContract(record)
  itemEditorMode.value = 'edit'
  itemEditorQualityCourseId.value
    = formEditorQualityCourseId.value || qualityStore.currentQualityCourseId
  itemEditorTrainingPlanId.value
    = formEditorTrainingPlanId.value || qualityStore.currentTrainingPlanId
  itemEditorGraduationRequirementId.value = ''
  itemEditor.value = {
    ...record,
    itemType: record.itemType,
    scaleLabels: record.scaleLabels?.map((label) => ({ ...label })),
    choiceOptions: record.choiceOptions?.map((option) => ({ ...option })),
    required: record.required,
  }
  itemEditorVisible.value = true
}

function syncScaleLabels() {
  const v = itemEditor.value
  if (v.scaleMin == null || v.scaleMax == null || v.scaleMin >= v.scaleMax) {
    v.scaleLabels = []
    return
  }
  const min = v.scaleMin
  const max = v.scaleMax
  v.scaleLabels = defaultScaleLabels(min, max).map((label) => {
    const existing = v.scaleLabels?.find((item) => item.scaleValue === label.scaleValue)
    return { scaleValue: label.scaleValue, label: existing?.label ?? label.label }
  })
}

function addChoiceOption() {
  const options = itemEditor.value.choiceOptions ?? []
  const index = options.length + 1
  itemEditor.value.choiceOptions = [
    ...options,
    { optionValue: `option_${index}`, optionLabel: `选项${index}` },
  ]
}

function removeChoiceOption(index: number) {
  itemEditor.value.choiceOptions = (itemEditor.value.choiceOptions ?? []).filter(
    (_, i) => i !== index,
  )
}

async function submitItem() {
  const v = itemEditor.value
  if (!v.itemCode.trim() || !v.itemText.trim()) {
    message.error('请填写编码和题面')
    return
  }
  if (v.itemType === 'SCALE') {
    if (v.scaleMin == null || v.scaleMax == null || v.scaleMin >= v.scaleMax) {
      message.error('量表最大值必须大于最小值')
      return
    }
    syncScaleLabels()
    v.choiceOptions = []
  } else if (v.itemType === 'SINGLE_CHOICE' || v.itemType === 'MULTI_CHOICE') {
    const options = v.choiceOptions ?? []
    if (
      options.length < 2
      || options.some((option) => !option.optionValue.trim() || !option.optionLabel.trim())
    ) {
      message.error('选择题至少配置 2 个完整选项')
      return
    }
    const optionValues = new Set(options.map((option) => option.optionValue.trim()))
    if (optionValues.size !== options.length) {
      message.error('选项值不能重复')
      return
    }
    v.scaleMin = undefined
    v.scaleMax = undefined
    v.scaleLabels = []
  } else if (v.itemType === 'OPEN_TEXT') {
    v.scaleMin = undefined
    v.scaleMax = undefined
    v.scaleLabels = []
    v.choiceOptions = []
  }
  if (itemEditorMode.value === 'create') await indirectItemApi.create(v)
  else await indirectItemApi.update(v)
  message.success('已保存')
  itemEditorVisible.value = false
  await loadItems()
}

async function deleteItem(record: IndirectEvaluationItemVO) {
  void confirmAsync({
    title: `删除题项 ${record.itemCode}？`,
    type: 'error',
    onOk: async () => {
      await indirectItemApi.delete(record.id)
      message.success('已删除')
      if (selectedItem.value?.id === record.id) selectedItem.value = null
      await loadItems()
    },
  })
}

/* ========== 答卷 ========== */

const responses = ref<IndirectEvaluationResponseVO[]>([])
const responsesLoading = ref(false)

async function loadResponses() {
  if (!selectedItem.value) {
    responses.value = []
    return
  }
  responsesLoading.value = true
  try {
    responses.value = await indirectResponseApi.listByItem(selectedItem.value.id)
  } finally {
    responsesLoading.value = false
  }
}

const responseEditorVisible = ref(false)
const responseEditorMode = ref<'create' | 'edit'>('create')
const responseMultiChoiceValues = ref<string[]>([])
const responseEditor = ref<IndirectEvaluationResponseSaveRequest>({
  formId: '',
  itemId: '',
  respondentType: 'STUDENT',
  respondentId: '',
  scaleValue: undefined,
  singleChoiceValue: '',
  answerSummary: '',
  multipleChoiceValues: [],
  identityValues: [],
  convertedScore: undefined,
  openText: '',
  validFlag: true,
  invalidReason: '',
})

function openResponseCreate() {
  if (!selectedItem.value || !selectedForm.value) return
  responseEditorMode.value = 'create'
  responseMultiChoiceValues.value = []
  responseEditorClassId.value = ''
  responseIdentityName.value = ''
  responseIdentityOrganization.value = ''
  responseIdentityContact.value = ''
  responseEditor.value = {
    formId: selectedForm.value.id,
    itemId: selectedItem.value.id,
    respondentType: 'STUDENT',
    respondentId: '',
    scaleValue: undefined,
    singleChoiceValue: '',
    answerSummary: '',
    multipleChoiceValues: [],
    identityValues: [],
    convertedScore: undefined,
    openText: '',
    validFlag: true,
    invalidReason: '',
  }
  responseEditorVisible.value = true
}

function openResponseEdit(record: IndirectEvaluationResponseVO) {
  responseEditorMode.value = 'edit'
  responseMultiChoiceValues.value
    = record.multipleChoiceValues?.map((option) => option.optionValue) ?? []
  responseEditorClassId.value = ''
  responseIdentityName.value
    = record.identityValues?.find((item) => item.fieldKey === 'name')?.fieldValue ?? ''
  responseIdentityOrganization.value
    = record.identityValues?.find((item) => item.fieldKey === 'organization')?.fieldValue ?? ''
  responseIdentityContact.value
    = record.identityValues?.find((item) => item.fieldKey === 'contact')?.fieldValue ?? ''
  responseEditor.value = {
    ...record,
    multipleChoiceValues: record.multipleChoiceValues?.map((option) => ({ ...option })) ?? [],
    identityValues: record.identityValues?.map((identity) => ({ ...identity })) ?? [],
  }
  responseEditorVisible.value = true
}

async function submitResponse() {
  const v = responseEditor.value
  if (!v.respondentType) {
    message.error('请选择应答人类型')
    return
  }
  if (
    (v.respondentType === 'STUDENT'
      || v.respondentType === 'TEACHER'
      || v.respondentType === 'EXPERT'
      || v.respondentType === 'SUPERVISOR')
    && !v.respondentId?.trim()
  ) {
    message.error('请选择应答人')
    return
  }
  if (v.respondentType === 'GRADUATE' || v.respondentType === 'EMPLOYER') {
    if (!responseIdentityName.value.trim()) {
      message.error('请填写应答人姓名')
      return
    }
    v.respondentId = undefined
    v.identityValues = [
      { fieldKey: 'name', fieldValue: responseIdentityName.value.trim() },
      { fieldKey: 'organization', fieldValue: responseIdentityOrganization.value.trim() },
      { fieldKey: 'contact', fieldValue: responseIdentityContact.value.trim() },
    ].filter((item) => item.fieldValue)
  } else {
    v.identityValues = []
  }
  if (!selectedItem.value) {
    message.warning('请先选择题项')
    return
  }
  if (selectedItem.value.itemType === 'SCALE' && v.scaleValue == null) {
    message.error('请填写量表分值')
    return
  }
  if (selectedItem.value.itemType === 'SINGLE_CHOICE' && !v.singleChoiceValue?.trim()) {
    message.error('请选择单选答案')
    return
  }
  if (
    selectedItem.value.itemType === 'MULTI_CHOICE'
    && responseMultiChoiceValues.value.length === 0
  ) {
    message.error('请至少选择一个多选答案')
    return
  }
  if (
    selectedItem.value.itemType === 'OPEN_TEXT'
    && selectedItem.value.required
    && !v.openText?.trim()
  ) {
    message.error('请填写开放回答')
    return
  }
  if (selectedItem.value.itemType === 'SCALE') {
    const scaleLabel = selectedItemScaleOptions().find(
      (option) => option.scaleValue === v.scaleValue,
    )?.label
    v.singleChoiceValue = undefined
    v.multipleChoiceValues = []
    v.openText = ''
    v.answerSummary = scaleLabel ?? (v.scaleValue == null ? '' : `${v.scaleValue}分`)
  } else if (selectedItem.value.itemType === 'SINGLE_CHOICE') {
    const selectedOption = selectedItemChoiceOptions().find(
      (option) => option.optionValue === v.singleChoiceValue,
    )
    v.scaleValue = undefined
    v.multipleChoiceValues = []
    v.openText = ''
    v.answerSummary = selectedOption?.optionLabel ?? v.singleChoiceValue ?? ''
  } else if (selectedItem.value.itemType === 'MULTI_CHOICE') {
    v.scaleValue = undefined
    v.singleChoiceValue = ''
    v.openText = ''
    v.multipleChoiceValues = selectedItemChoiceOptions().filter((option) =>
      responseMultiChoiceValues.value.includes(option.optionValue),
    )
    v.answerSummary = v.multipleChoiceValues.map((option) => option.optionLabel).join(' | ')
  } else {
    v.scaleValue = undefined
    v.singleChoiceValue = ''
    v.multipleChoiceValues = []
    v.answerSummary = ''
    v.openText = v.openText?.trim() ?? ''
  }
  if (responseEditorMode.value === 'create') await indirectResponseApi.create(v)
  else await indirectResponseApi.update(v)
  message.success('已保存')
  responseEditorVisible.value = false
  await loadResponses()
}

function responseChoiceValues(record: IndirectEvaluationResponseVO): string {
  if (!record.multipleChoiceValues?.length) {
    return '未作答'
  }
  return record.multipleChoiceValues.map((option) => option.optionLabel).join(' | ')
}

function responseScaleAnswerText(record: IndirectEvaluationResponseVO): string {
  if (record.answerSummary?.trim()) return record.answerSummary
  if (record.scaleValue != null) return `${record.scaleValue}分`
  return '未作答'
}

function responseSingleChoiceAnswerText(record: IndirectEvaluationResponseVO): string {
  if (record.answerSummary?.trim()) return record.answerSummary
  if (record.singleChoiceValue?.trim()) return record.singleChoiceValue
  return '未作答'
}

function responseOpenText(record: IndirectEvaluationResponseVO): string {
  const text = record.openText?.trim()
  if (text) return text
  return '未填写开放文本'
}

function selectedItemScaleOptions() {
  if (!selectedItem.value) {
    return []
  }
  if (selectedItem.value.scaleLabels?.length) {
    return selectedItem.value.scaleLabels
  }
  if (selectedItem.value.scaleMin == null || selectedItem.value.scaleMax == null) {
    return []
  }
  const labels = []
  for (let value = selectedItem.value.scaleMin; value <= selectedItem.value.scaleMax; value++) {
    labels.push({ scaleValue: value, label: `${value}分` })
  }
  return labels
}

function selectedItemChoiceOptions() {
  return selectedItem.value?.choiceOptions ?? []
}

async function deleteResponse(record: IndirectEvaluationResponseVO) {
  void confirmAsync({
    title: '删除该答卷？',
    type: 'error',
    onOk: async () => {
      await indirectResponseApi.delete(record.id)
      message.success('已删除')
      await loadResponses()
    },
  })
}

/* ========== Excel 导入答卷（弹窗封装在 ImportResponseExcelModal） ========== */

const importExcelVisible = ref(false)

function openImportExcel() {
  if (!selectedForm.value) return
  importExcelVisible.value = true
}

async function handleImportExcelDone() {
  await loadResponses()
  await refreshValidCounts()
}

/* ========== PDF / DOCX / 图片 AI 异步导入（弹窗封装在 ImportResponseDocumentModal） ========== */

const importDocumentVisible = ref(false)

async function handleAiDocParseDone() {
  await loadResponses()
  await refreshValidCounts()
}

function openImportDocument() {
  if (!selectedForm.value) return
  importDocumentVisible.value = true
}

/* ========== 题项有效样本统计 ========== */

const validCountMap = ref<Map<string, string>>(new Map())
const validCountLoading = ref(false)

function countTextToNumber(value: string): number {
  const count = Number(value)
  if (!Number.isFinite(count)) {
    throwUserFacing(RESPONSE_DATA_ERROR)
  }
  return count
}

function validCountText(itemId: string): string {
  const count = validCountMap.value.get(itemId)
  if (count === undefined) {
    if (validCountLoading.value) return '加载中'
    return '—'
  }
  return count
}

async function refreshValidCounts() {
  if (!items.value.length) return
  validCountLoading.value = true
  try {
    const results = await Promise.all(
      items.value.map((item) =>
        indirectResponseApi
          .countValidByItem(item.id)
          .then((count): [string, string] => [item.id, count]),
      ),
    )
    validCountMap.value = new Map(results)
  } finally {
    validCountLoading.value = false
  }
}

/* ========== 信号指标：问卷 + 题项 + 答卷健康度 ========== */

const signals = computed<SignalMetric[]>(() => {
  const enabledForms = forms.value.filter((f) => f.enabled).length
  const totalItems = items.value.length
  const totalValid = Array.from(validCountMap.value.values()).reduce(
    (sum, n) => sum + countTextToNumber(n),
    0,
  )
  const expectedSampleSum = forms.value.reduce((sum, f) => sum + (f.expectedSample ?? 0), 0)
  const validResponses = responses.value.filter((r) => r.validFlag).length
  const invalidResponses = responses.value.filter((r) => !r.validFlag).length
  const sampleRatio
    = expectedSampleSum > 0 ? Number((totalValid / expectedSampleSum).toFixed(2)) : 0

  return [
    { key: 'forms-total', label: '问卷总数', value: forms.value.length, tone: 'blue' },
    {
      key: 'forms-enabled',
      label: '启用问卷',
      value: enabledForms,
      tone: enabledForms > 0 ? 'green' : 'gray',
    },
    { key: 'items-total', label: '题项总数', value: totalItems, tone: 'blue' },
    {
      key: 'valid-total',
      label: '有效样本',
      value: totalValid,
      tone: totalValid > 0 ? 'green' : 'gray',
    },
    {
      key: 'sample-ratio',
      label: '样本达成率',
      value: sampleRatio,
      tone: sampleRatio >= 1 ? 'green' : sampleRatio > 0 ? 'orange' : 'gray',
    },
    {
      key: 'responses-valid',
      label: '当前题项有效',
      value: validResponses,
      tone: validResponses > 0 ? 'green' : 'gray',
    },
    {
      key: 'responses-invalid',
      label: '当前题项无效',
      value: invalidResponses,
      tone: invalidResponses > 0 ? 'red' : 'gray',
    },
  ]
})

/* ========== 联动 ========== */

watch(selectedForm, async () => {
  selectedItem.value = null
  responses.value = []
  await loadItems()
  await refreshValidCounts()
})

watch(selectedItem, () => loadResponses())

onMounted(async () => {
  await Promise.all([loadForms(), loadScaleRules()])
})
</script>

<template>
  <StageWorkbenchShell>
    <SignalBand :metrics="signals" compact class="ie__signals" />

    <a-card :bordered="false" class="detail-table-card ie__form-card">
      <template #title>间接评价问卷台账</template>

      <div class="filter-card">
        <a-form layout="inline" class="filter-form filter-form--toolbar" @submit.prevent="loadForms">
          <a-form-item label="问卷类型">
            <a-select
              v-model:value="formQuery.formType"
              placeholder="问卷类型"
              allow-clear
              style="width: 140px"
              :options="formTypeOptions"
            />
          </a-form-item>
          <a-form-item label="目标类型">
            <a-select
              v-model:value="formQuery.targetType"
              placeholder="目标类型"
              allow-clear
              style="width: 160px"
              :options="targetTypeOptions"
            />
          </a-form-item>
          <a-form-item class="filter-form__actions">
            <a-space class="filter-form__action-group">
              <UiButton size="sm" :loading="formsLoading" @click="loadForms">查询</UiButton>
              <UiButton variant="outline" size="sm" :loading="formsLoading" @click="loadForms">刷新</UiButton>
              <UiButton size="sm" @click="openFormCreate">新建问卷</UiButton>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <UiDataTable
        class="student-detail-table__data-table"
        v-model:current="formQuery.pageNum"
        v-model:page-size="formQuery.pageSize"
        :columns="formColumns"
        :data-source="forms"
        :loading="formsLoading"
        row-key="id"
        size="middle"
        :total="formsTotal"
        flat
        @page-change="handleFormPageChange"
        :row-class-name="
          (r: IndirectEvaluationFormVO) => (selectedForm?.id === r.id ? 'ie__row-selected' : '')
        "
        :custom-row="
          (record: IndirectEvaluationFormVO) => ({
            onClick: () => (selectedForm = record),
            style: 'cursor: pointer',
          })
        "
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'formType'">
            {{ formTypeLabel(record.formType) }}
          </template>
          <template v-else-if="column.key === 'targetType'">
            {{ targetTypeLabel(record.targetType) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <span class="op-link" role="button" @click.stop="openFormEdit(record)">编辑</span>
              <span class="op-link danger" role="button" @click.stop="handleFormDelete(record)">
                删除
              </span>
            </div>
          </template>
        </template>
      </UiDataTable>
    </a-card>

    <a-row v-if="selectedForm" :gutter="12" class="ie__split">
      <a-col :span="12">
        <a-card :bordered="false" class="detail-table-card ie__item-card">
          <template #title>题项</template>

          <div class="filter-card">
            <a-form layout="inline" class="filter-form filter-form--toolbar">
              <a-form-item class="filter-form__actions">
                <UiButton variant="primary" size="sm" @click="openItemCreate">新建题项</UiButton>
              </a-form-item>
            </a-form>
          </div>

          <UiDataTable
            class="student-detail-table__data-table"
            :columns="itemColumns"
            :data-source="items"
            :loading="itemsLoading"
            row-key="id"
            size="middle"
            :show-pagination="false"
            flat
            :total="items.length"
            :row-class-name="
              (r: IndirectEvaluationItemVO) => (selectedItem?.id === r.id ? 'ie__row-selected' : '')
            "
            :custom-row="
              (record: IndirectEvaluationItemVO) => ({
                onClick: () => (selectedItem = record),
                style: 'cursor: pointer',
              })
            "
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'weight'">
                {{ record.weight.toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'validCount'">
                <span
                  :class="
                    countTextToNumber(validCountText(record.id)) > 0
                      ? 'ie__count-strong'
                      : 'ie__count-muted'
                  "
                >
                  {{ validCountText(record.id) }}
                </span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="operations-cell" @click.stop>
                  <span class="op-link" role="button" @click.stop="openItemEdit(record)">编辑</span>
                  <span class="op-link danger" role="button" @click.stop="deleteItem(record)">
                    删除
                  </span>
                </div>
              </template>
            </template>
          </UiDataTable>
        </a-card>
      </a-col>

      <a-col :span="12">
        <UiEmpty v-if="!selectedItem" description="请在左侧选择题项查看答卷" class="ie__empty" />

        <a-card v-else :bordered="false" class="detail-table-card ie__response-card">
          <template #title>
            「{{ selectedItem.itemCode }} · {{ selectedItem.itemText.substring(0, 24) }}…」答卷
          </template>

          <div class="filter-card">
            <a-form layout="inline" class="filter-form filter-form--toolbar">
              <a-form-item class="filter-form__actions">
                <a-space class="filter-form__action-group">
                  <UiButton variant="outline" size="sm" @click="openImportExcel">Excel 导入</UiButton>
                  <UiButton variant="outline" size="sm" @click="openImportDocument">
                    PDF / Word / 图片
                  </UiButton>
                  <UiButton variant="primary" size="sm" @click="openResponseCreate">新增答卷</UiButton>
                </a-space>
              </a-form-item>
            </a-form>
          </div>

          <UiDataTable
            class="student-detail-table__data-table"
            :columns="responseColumns"
            :data-source="responses"
            :loading="responsesLoading"
            row-key="id"
            size="middle"
            :page-size="10"
            :total="responses.length"
            flat
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'respondentType'">
                {{ respondentTypeLabel(record.respondentType) }}
              </template>
              <template v-else-if="column.key === 'answerSummary'">
                <span v-if="selectedItem?.itemType === 'SCALE'">
                  {{ responseScaleAnswerText(record) }}
                </span>
                <span v-else-if="selectedItem?.itemType === 'SINGLE_CHOICE'">
                  {{ responseSingleChoiceAnswerText(record) }}
                </span>
                <span v-else-if="selectedItem?.itemType === 'MULTI_CHOICE'">
                  {{ responseChoiceValues(record) }}
                </span>
                <span v-else class="ie__sub-desc">
                  {{ responseOpenText(record) }}
                </span>
              </template>
              <template v-else-if="column.key === 'convertedScore'">
                {{ record.convertedScore == null ? '-' : record.convertedScore.toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'openText'">
                <span class="ie__sub-desc">{{ responseOpenText(record) }}</span>
              </template>
              <template v-else-if="column.key === 'validFlag'">
                <a-tag :color="record.validFlag ? 'green' : 'red'">
                  {{ record.validFlag ? '有效' : '无效' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="operations-cell" @click.stop>
                  <span class="op-link" role="button" @click="openResponseEdit(record)">编辑</span>
                  <span class="op-link danger" role="button" @click="deleteResponse(record)">删除</span>
                </div>
              </template>
            </template>
          </UiDataTable>
        </a-card>
      </a-col>
    </a-row>

    <!-- 问卷编辑 -->
    <a-modal
      v-model:open="formEditorVisible"
      :title="formEditorMode === 'create' ? '新建问卷' : '编辑问卷'"
      width="720px"
      @ok="submitForm"
    >
      <a-form layout="vertical" :model="formEditor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="formEditor.formCode" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="问卷类型" required>
              <a-select v-model:value="formEditor.formType" :options="formTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="期望样本">
              <a-input-number
                v-model:value="formEditor.expectedSample"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="formEditor.formName" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="目标类型" required>
              <a-select
                v-model:value="formEditor.targetType"
                :options="targetTypeOptions"
                @change="handleFormTargetTypeChange"
              />
            </a-form-item>
          </a-col>
          <a-col
            v-if="
              formEditor.targetType === 'COURSE_GOAL'
                || formEditor.targetType === 'GRADUATION_REQUIREMENT'
                || formEditor.targetType === 'REQUIREMENT_INDICATOR'
                || formEditor.targetType === 'TRAINING_OBJECTIVE'
            "
            :span="8"
          >
            <a-form-item
              :label="formEditor.targetType === 'COURSE_GOAL' ? '评价课程' : '培养方案'"
              required
            >
              <CourseSelector
                v-if="formEditor.targetType === 'COURSE_GOAL'"
                :value="formEditorQualityCourseId || null"
                :program-id="formEditor.programId || null"
                placeholder="选择评价课程"
                @change="handleFormCourseChange"
              />
              <TrainingPlanSelector
                v-else
                :value="formEditorTrainingPlanId || null"
                :program-id="formEditor.programId || null"
                placeholder="选择培养方案"
                @change="handleFormTrainingPlanChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item
              :label="
                formEditor.targetType === 'PROGRAM_SUMMARY'
                  || formEditor.targetType === 'CIVIC_GOAL_AGGREGATE'
                  || formEditor.targetType === 'COMPLEX_ENGINEERING_AGGREGATE'
                  ? '所属专业'
                  : '目标对象'
              "
              required
            >
              <CourseGoalSelector
                v-if="formEditor.targetType === 'COURSE_GOAL'"
                :quality-course-id="formEditorQualityCourseId"
                :value="formEditor.targetId || null"
                placeholder="选择课程目标"
                @change="handleFormTargetChange"
              />
              <GraduationRequirementSelector
                v-else-if="formEditor.targetType === 'GRADUATION_REQUIREMENT'"
                :training-plan-id="formEditorTrainingPlanId"
                :value="formEditor.targetId || null"
                placeholder="选择毕业要求"
                @change="handleFormGraduationRequirementChange"
              />
              <template v-else-if="formEditor.targetType === 'REQUIREMENT_INDICATOR'">
                <GraduationRequirementSelector
                  :training-plan-id="formEditorTrainingPlanId"
                  :value="formEditorGraduationRequirementId || null"
                  placeholder="选择毕业要求"
                  @change="handleFormGraduationRequirementChange"
                />
                <RequirementIndicatorSelector
                  :requirement-id="formEditorGraduationRequirementId"
                  :value="formEditor.targetId || null"
                  placeholder="选择观测点"
                  class="ie__selector-stack"
                  @change="handleFormTargetChange"
                />
              </template>
              <TrainingObjectiveSelector
                v-else-if="formEditor.targetType === 'TRAINING_OBJECTIVE'"
                :training-plan-id="formEditorTrainingPlanId"
                :value="formEditor.targetId || null"
                placeholder="选择培养目标"
                @change="handleFormTargetChange"
              />
              <ProgramSelector
                v-else
                :value="formEditor.programId || null"
                placeholder="选择专业"
                @change="handleFormProgramChange"
              />
            </a-form-item>
          </a-col>
          <a-col
            v-if="
              formEditor.targetType !== 'PROGRAM_SUMMARY'
                && formEditor.targetType !== 'CIVIC_GOAL_AGGREGATE'
                && formEditor.targetType !== 'COMPLEX_ENGINEERING_AGGREGATE'
            "
            :span="8"
          >
            <a-form-item label="所属专业">
              <ProgramSelector
                :value="formEditor.programId || null"
                @change="handleFormProgramChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="说明">
          <a-textarea v-model:value="formEditor.description" :rows="3" />
        </a-form-item>
        <a-checkbox v-model:checked="formEditor.enabled">启用</a-checkbox>
      </a-form>
    </a-modal>

    <!-- 题项编辑 -->
    <a-modal
      v-model:open="itemEditorVisible"
      :title="itemEditorMode === 'create' ? '新建题项' : '编辑题项'"
      width="640px"
      @ok="submitItem"
    >
      <a-form layout="vertical" :model="itemEditor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="itemEditor.itemCode" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="权重">
              <a-input-number
                v-model:value="itemEditor.weight"
                :min="0"
                :step="0.1"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="排序">
              <a-input-number v-model:value="itemEditor.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="题型" required>
              <a-select v-model:value="itemEditor.itemType" :options="itemTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="必填">
              <a-switch v-model:checked="itemEditor.required" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="题面" required>
          <a-textarea v-model:value="itemEditor.itemText" :rows="3" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="目标类型" required>
              <a-select
                v-model:value="itemEditor.targetType"
                :options="targetTypeOptions"
                @change="handleItemTargetTypeChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              :label="itemEditor.targetType === 'COURSE_GOAL' ? '评价课程' : '培养方案'"
              required
            >
              <CourseSelector
                v-if="itemEditor.targetType === 'COURSE_GOAL'"
                :value="itemEditorQualityCourseId || null"
                :program-id="formEditor.programId || null"
                placeholder="选择评价课程"
                @change="handleItemCourseChange"
              />
              <ProgramSelector
                v-else-if="
                  itemEditor.targetType === 'PROGRAM_SUMMARY'
                    || itemEditor.targetType === 'CIVIC_GOAL_AGGREGATE'
                    || itemEditor.targetType === 'COMPLEX_ENGINEERING_AGGREGATE'
                "
                :value="itemEditor.targetId || null"
                placeholder="选择专业"
                @change="handleItemProgramChange"
              />
              <TrainingPlanSelector
                v-else
                :value="itemEditorTrainingPlanId || null"
                :program-id="formEditor.programId || null"
                placeholder="选择培养方案"
                @change="handleItemTrainingPlanChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item
          v-if="
            itemEditor.targetType === 'COURSE_GOAL'
              || itemEditor.targetType === 'GRADUATION_REQUIREMENT'
              || itemEditor.targetType === 'REQUIREMENT_INDICATOR'
              || itemEditor.targetType === 'TRAINING_OBJECTIVE'
          "
          label="目标对象"
          required
        >
          <div class="ie__target-picker">
            <CourseGoalSelector
              v-if="itemEditor.targetType === 'COURSE_GOAL'"
              :quality-course-id="itemEditorQualityCourseId"
              :value="itemEditor.targetId || null"
              placeholder="选择课程目标"
              @change="handleItemTargetChange"
            />
            <GraduationRequirementSelector
              v-else-if="itemEditor.targetType === 'GRADUATION_REQUIREMENT'"
              :training-plan-id="itemEditorTrainingPlanId"
              :value="itemEditor.targetId || null"
              placeholder="选择毕业要求"
              @change="handleItemGraduationRequirementChange"
            />
            <template v-else-if="itemEditor.targetType === 'REQUIREMENT_INDICATOR'">
              <GraduationRequirementSelector
                :training-plan-id="itemEditorTrainingPlanId"
                :value="itemEditorGraduationRequirementId || null"
                placeholder="选择毕业要求"
                @change="handleItemGraduationRequirementChange"
              />
              <RequirementIndicatorSelector
                :requirement-id="itemEditorGraduationRequirementId"
                :value="itemEditor.targetId || null"
                placeholder="选择观测点"
                @change="handleItemTargetChange"
              />
            </template>
            <TrainingObjectiveSelector
              v-else
              :training-plan-id="itemEditorTrainingPlanId"
              :value="itemEditor.targetId || null"
              placeholder="选择培养目标"
              @change="handleItemTargetChange"
            />
          </div>
        </a-form-item>
        <a-form-item label="量表换算规则">
          <a-select
            v-model:value="itemEditor.scaleRuleId"
            allow-clear
            show-search
            option-filter-prop="label"
          >
            <a-select-option
              v-for="r in scaleRules"
              :key="r.id"
              :value="r.id"
              :label="`${r.ruleCode} · ${r.ruleName}`"
            >
              {{ r.ruleCode }} · {{ r.ruleName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <template v-if="itemEditor.itemType === 'SCALE'">
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="量表最小值" required>
                <a-input-number
                  v-model:value="itemEditor.scaleMin"
                  :min="0"
                  style="width: 100%"
                  @change="syncScaleLabels"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="量表最大值" required>
                <a-input-number
                  v-model:value="itemEditor.scaleMax"
                  :min="1"
                  style="width: 100%"
                  @change="syncScaleLabels"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="量表标签">
            <div class="ie__config-list">
              <div
                v-for="label in itemEditor.scaleLabels"
                :key="label.scaleValue"
                class="ie__config-row"
              >
                <a-input-number :value="label.scaleValue" disabled class="ie__config-value" />
                <a-input v-model:value="label.label" placeholder="标签" />
              </div>
            </div>
          </a-form-item>
        </template>
        <a-form-item
          v-if="itemEditor.itemType === 'SINGLE_CHOICE' || itemEditor.itemType === 'MULTI_CHOICE'"
          label="选项配置"
          required
        >
          <div class="ie__config-list">
            <div
              v-for="(option, optionIndex) in itemEditor.choiceOptions"
              :key="optionIndex"
              class="ie__config-row"
            >
              <a-input v-model:value="option.optionValue" placeholder="选项值" />
              <a-input v-model:value="option.optionLabel" placeholder="选项文案" />
              <span class="op-link danger" role="button" @click="removeChoiceOption(optionIndex)">删除</span>
            </div>
            <UiButton variant="outline" size="sm" @click="addChoiceOption">新增选项</UiButton>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 答卷新增 / 编辑 -->
    <a-modal
      v-model:open="responseEditorVisible"
      :title="responseEditorMode === 'create' ? '新增答卷' : '编辑答卷'"
      @ok="submitResponse"
    >
      <a-form layout="vertical" :model="responseEditor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="应答人类型" required>
              <a-select
                v-model:value="responseEditor.respondentType"
                :options="respondentTypeOptions"
                @change="handleResponseRespondentTypeChange"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="responseEditor.respondentType === 'STUDENT'" :span="12">
            <a-form-item label="班级" required>
              <ClassSelector
                :value="responseEditorClassId || null"
                placeholder="选择班级"
                @change="handleResponseClassChange"
              />
            </a-form-item>
          </a-col>
          <a-col
            v-else-if="
              responseEditor.respondentType === 'TEACHER'
                || responseEditor.respondentType === 'EXPERT'
                || responseEditor.respondentType === 'SUPERVISOR'
            "
            :span="12"
          >
            <a-form-item label="应答人" required>
              <TeacherSelector
                :value="responseEditor.respondentId || null"
                placeholder="选择人员"
                @change="handleResponseRespondentChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item v-if="responseEditor.respondentType === 'STUDENT'" label="应答学生" required>
          <StudentSelector
            :class-id="responseEditorClassId"
            :value="responseEditor.respondentId || null"
            placeholder="选择在校学生"
            @change="handleResponseRespondentChange"
          />
        </a-form-item>
        <a-row
          v-if="
            responseEditor.respondentType === 'GRADUATE'
              || responseEditor.respondentType === 'EMPLOYER'
          "
          :gutter="12"
        >
          <a-col :span="8">
            <a-form-item label="姓名" required>
              <a-input v-model:value="responseIdentityName" placeholder="填写姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="单位">
              <a-input v-model:value="responseIdentityOrganization" placeholder="填写单位名称" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="联系方式">
              <a-input v-model:value="responseIdentityContact" placeholder="填写联系方式" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="答案" required>
              <a-radio-group
                v-if="selectedItem?.itemType === 'SCALE'"
                v-model:value="responseEditor.scaleValue"
                class="ie__answer-group"
              >
                <a-radio
                  v-for="option in selectedItemScaleOptions()"
                  :key="option.scaleValue"
                  :value="option.scaleValue"
                >
                  {{ option.label }}
                </a-radio>
              </a-radio-group>
              <a-radio-group
                v-else-if="selectedItem?.itemType === 'SINGLE_CHOICE'"
                v-model:value="responseEditor.singleChoiceValue"
                class="ie__answer-group"
              >
                <a-radio
                  v-for="option in selectedItemChoiceOptions()"
                  :key="option.optionValue"
                  :value="option.optionValue"
                >
                  {{ option.optionLabel }}
                </a-radio>
              </a-radio-group>
              <a-checkbox-group
                v-else-if="selectedItem?.itemType === 'MULTI_CHOICE'"
                v-model:value="responseMultiChoiceValues"
                class="ie__answer-group"
              >
                <a-row :gutter="[8, 8]">
                  <a-col
                    v-for="option in selectedItemChoiceOptions()"
                    :key="option.optionValue"
                    :span="12"
                  >
                    <a-checkbox :value="option.optionValue">
                      {{ option.optionLabel }}
                    </a-checkbox>
                  </a-col>
                </a-row>
              </a-checkbox-group>
              <a-textarea
                v-else
                v-model:value="responseEditor.openText"
                :rows="3"
                placeholder="填写开放回答"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="换算分（0~1）">
              <a-input-number
                v-model:value="responseEditor.convertedScore"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="有效">
              <a-switch v-model:checked="responseEditor.validFlag" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="无效原因">
              <a-input
                v-model:value="responseEditor.invalidReason"
                :disabled="responseEditor.validFlag"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- Excel 批量导入答卷 -->
    <ImportResponseExcelModal
      v-model:open="importExcelVisible"
      :form-id="selectedForm?.id ?? null"
      @imported="handleImportExcelDone"
    />

    <!-- PDF / DOCX / 图片 文档抽取 -->
    <ImportResponseDocumentModal
      v-model:open="importDocumentVisible"
      :form-id="selectedForm?.id ?? null"
      @refresh="handleAiDocParseDone"
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ie {
  &__filter {
    width: 140px;

    &--md {
      width: 180px;
    }
  }

  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__split {
    margin-top: 0;
  }

  &__empty {
    margin-top: 32px;
  }

  &__sub-desc {
    margin-left: 4px;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__count-strong {
    color: var(--dp-success, #16a34a);
    font-weight: 500;
  }

  &__count-muted {
    color: var(--dp-text-muted, #94a3b8);
  }

  &__config-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__target-picker,
  &__selector-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__config-row {
    display: grid;
    grid-template-columns: minmax(96px, 1fr) minmax(160px, 2fr) auto;
    gap: 8px;
    align-items: center;

    &:has(.ie__config-value) {
      grid-template-columns: 96px 1fr;
    }
  }

  &__config-value {
    width: 100%;
  }

  &__answer-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
  }
}

:deep(.ie__row-selected) td {
  background-color: var(--ant-color-primary-bg) !important;
}
</style>
