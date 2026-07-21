<script setup lang="ts">
import type { Rule } from 'ant-design-vue/es/form'
import type { ClassInfoDto } from '@/apis/edu/class'
import type { ArchiveTenantTemplateSetResponse } from '@/apis/mark/archive-platform-template'
import type {
  ArchiveExamFormCode,
  ArchiveVolumeDetailResponse,
  ArchiveVolumeMaterialResponse,
  ArchiveVolumeTaskSettingsUpdateRequest,
} from '@/apis/mark/archive-volume'
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { CourseListVO, TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import type { UiOptionValue } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { listArchiveTenantTemplateSets } from '@/apis/mark/archive-platform-template'
import {
  ARCHIVE_EXAM_FORM_OPTIONS,
  ARCHIVE_SECURITY_LEVEL_OPTIONS,
  ArchiveMaterialSubmissionStatusCode,
  ArchiveMaterialTypeDescription,
  ArchiveScoreSourceDescription,
  ArchiveSecurityLevelCode,
  ArchiveVolumeSourceTypeDescription,
  updateArchiveVolumeTaskSettings,
} from '@/apis/mark/archive-volume'
import { pageExams } from '@/apis/mark/exam'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import { TeacherSelector } from '@/components/quality/selectors'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ArchiveScoreSourceCode } from '@/types/enums/archive-score-source-enum'
import { ArchiveVolumeMemberRoleCode } from '@/types/enums/archive-volume-member-role-enum'
import { ArchiveVolumeSourceTypeCode } from '@/types/enums/archive-volume-source-type-enum'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'
import { SemesterCode, SemesterOptions } from '@/types/enums/semester-enum'
import {
  composeAcademicYear,
  generateAcademicYearStartOptions,
  parseAcademicYearStart,
} from '@/utils/academic-year'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import {
  nullableStringToSelectValue,
  selectValueToNullableString,
} from '@/views/teacher/archive-volume/archive-task-create/select-value-bridge'

const props = defineProps<{
  detail: ArchiveVolumeDetailResponse
  canManageCollaborators: boolean
  canUpdateArchiveDueTime: boolean
}>()

const emit = defineEmits<{
  'open-materials': []
  "updated": []
}>()

const COURSE_ASSESSMENT_PLATFORM_CODES = new Set(['PLATFORM_PAPER_FULL', 'PLATFORM_NONPAPER_FULL'])

interface TaskSettingsForm {
  archiveTitle: string
  archiveNo: string
  courseId: string | null
  departmentId: string | null
  teachingClassId: string | null
  academicYearStartYear: number
  semester: SemesterCode
  relatedExamId: string | null
  templateSetCode: string | null
  scoreSource: ArchiveScoreSourceCode
  examForm: ArchiveExamFormCode | undefined
  securityLevel: ArchiveSecurityLevelCode
  retentionYears: number | undefined
  permanentRetention: boolean
  responsibleUserId: string | null
  archiveDueTime: string | undefined
  reason: string
}

const labelCol = { style: { width: '112px' } }
const wrapperCol = { flex: 1 }
const saving = ref(false)
const templateLoading = ref(false)
const departmentLoading = ref(false)
const relatedExamLoading = ref(false)
const departmentOptions = ref<Array<{ value: string, label: string }>>([])
const relatedExamOptions = ref<Array<{ value: string, label: string }>>([])
const templateSetOptions = ref<
  Array<{
    value: string
    label: string
    examForm?: ArchiveExamFormCode
    defaultPermanentRetention?: boolean
    defaultRetentionYears?: number
  }>
>([])

const form = reactive<TaskSettingsForm>({
  archiveTitle: '',
  archiveNo: '',
  courseId: null,
  departmentId: null,
  teachingClassId: null,
  academicYearStartYear: new Date().getFullYear(),
  semester: SemesterCode.SPRING,
  relatedExamId: null,
  templateSetCode: null,
  scoreSource: ArchiveScoreSourceCode.OFFLINE_CONFIRMED,
  examForm: undefined,
  securityLevel: ArchiveSecurityLevelCode.INTERNAL,
  retentionYears: 10,
  permanentRetention: false,
  responsibleUserId: null,
  archiveDueTime: undefined,
  reason: '',
})

const volume = computed(() => props.detail.volume)
const identityLocked = computed(
  () =>
    volume.value.sourceType === ArchiveVolumeSourceTypeCode.ONLINE_MARKING
    || Boolean(volume.value.examId),
)
const canEdit = computed(() => props.canManageCollaborators === true)
const canEditTemplate = computed(
  () => canEdit.value && volume.value.volumeStatus === ArchiveVolumeStatusCode.DRAFT,
)
const canEditDue = computed(() => props.canUpdateArchiveDueTime === true)

const academicYearStartOptions = generateAcademicYearStartOptions().map((year) => ({
  value: year,
  label: `${year} 年`,
}))
const academicYearEndYear = computed(() => String(form.academicYearStartYear + 1))
const resolvedAcademicYear = computed(() => composeAcademicYear(form.academicYearStartYear))

const departmentIdSelectValue = computed({
  get: () => nullableStringToSelectValue(form.departmentId),
  set: (value: UiOptionValue | UiOptionValue[] | undefined) => {
    form.departmentId = selectValueToNullableString(value)
  },
})
const templateSetCodeSelectValue = computed({
  get: () => nullableStringToSelectValue(form.templateSetCode),
  set: (value: UiOptionValue | UiOptionValue[] | undefined) => {
    form.templateSetCode = selectValueToNullableString(value)
  },
})
const relatedExamIdSelectValue = computed({
  get: () => nullableStringToSelectValue(form.relatedExamId),
  set: (value: UiOptionValue | UiOptionValue[] | undefined) => {
    form.relatedExamId = selectValueToNullableString(value)
  },
})

const sourceTypeLabel = computed(() =>
  strictEnumLabel(ArchiveVolumeSourceTypeDescription, volume.value.sourceType, 'sourceType'),
)

const scoreSourceCodes = computed((): ArchiveScoreSourceCode[] => {
  if (identityLocked.value) {
    return volume.value.scoreSource ? [volume.value.scoreSource] : []
  }
  if (volume.value.sourceType === ArchiveVolumeSourceTypeCode.HISTORY_IMPORT) {
    return [
      ArchiveScoreSourceCode.NOT_REQUIRED,
      ArchiveScoreSourceCode.TEACHING_AFFAIRS,
      ArchiveScoreSourceCode.OFFLINE_CONFIRMED,
    ]
  }
  return [ArchiveScoreSourceCode.OFFLINE_CONFIRMED, ArchiveScoreSourceCode.TEACHING_AFFAIRS]
})

const scoreSourceRadioOptions = computed(() =>
  scoreSourceCodes.value.map((value) => ({
    value,
    label: strictEnumLabel(ArchiveScoreSourceDescription, value, '成绩来源'),
  })),
)

const organizerFallbackId = computed(() => {
  const organizer = (props.detail.collaborators ?? []).find(
    (m) => m.memberRole === ArchiveVolumeMemberRoleCode.ORGANIZER,
  )
  return organizer?.userId || volume.value.responsibleUserId || null
})

const materialChecklist = computed(() => props.detail.materials ?? [])
const materialReadyCount = computed(
  () =>
    materialChecklist.value.filter(
      (row) => row.submissionStatus === ArchiveMaterialSubmissionStatusCode.SUBMITTED,
    ).length,
)

const formRules: Record<string, Rule[]> = {
  archiveTitle: [{ required: true, message: '请填写归档标题' }],
  courseId: [{ required: true, message: '请选择课程' }],
  departmentId: [{ required: true, message: '请选择院系' }],
  teachingClassId: [{ required: true, message: '请选择授课班级' }],
  academicYearStartYear: [{ required: true, message: '请选择学年起始年' }],
  semester: [{ required: true, message: '请选择学期' }],
  templateSetCode: [{ required: true, message: '请选择目录模板套' }],
  scoreSource: [{ required: true, message: '请选择成绩事实源' }],
  securityLevel: [{ required: true, message: '请选择密级' }],
  responsibleUserId: [{ required: true, message: '请选择归档责任人' }],
  archiveDueTime: [{ required: true, message: '请选择归档截止时刻' }],
}

function isCourseAssessmentTemplateSet(item: ArchiveTenantTemplateSetResponse): boolean {
  const code = item.templateSetCode?.trim()
  if (!code) return false
  if (COURSE_ASSESSMENT_PLATFORM_CODES.has(code)) return true
  const fork = item.forkSourceSetCode?.trim()
  return Boolean(fork && COURSE_ASSESSMENT_PLATFORM_CODES.has(fork))
}

function syncFormFromDetail(): void {
  const v = volume.value
  form.archiveTitle = v.archiveTitle || ''
  form.archiveNo = v.archiveNo || ''
  form.courseId = v.courseId ?? null
  form.departmentId = v.departmentId ?? null
  form.teachingClassId = v.teachingClassId ?? null
  form.academicYearStartYear = parseAcademicYearStart(v.academicYear)!
  form.semester = v.semester
  form.relatedExamId = v.relatedExamId ?? null
  form.templateSetCode = v.templateSetCode ?? null
  form.scoreSource = v.scoreSource
  form.examForm = v.examForm
  form.securityLevel = v.securityLevel
  form.permanentRetention = v.permanentRetention === true
  form.retentionYears = form.permanentRetention ? undefined : v.retentionYears
  form.responsibleUserId = v.responsibleUserId ?? organizerFallbackId.value
  form.archiveDueTime = v.archiveDueTime || undefined
  form.reason = ''
  if (v.relatedExamId && v.relatedExamName) {
    relatedExamOptions.value = [
      {
        value: v.relatedExamId,
        label: v.relatedExamNo ? `${v.relatedExamName}（${v.relatedExamNo}）` : v.relatedExamName,
      },
    ]
  }
}

function materialRowLabel(row: ArchiveVolumeMaterialResponse): string {
  return strictEnumLabel(ArchiveMaterialTypeDescription, row.materialType, 'materialType')
}

function materialRowStatus(row: ArchiveVolumeMaterialResponse): string {
  if (row.submissionStatus === ArchiveMaterialSubmissionStatusCode.SUBMITTED) return '已登记'
  if (row.submissionStatus === ArchiveMaterialSubmissionStatusCode.DELAY_ALLOWED) return '可延迟'
  if (row.submissionStatus === ArchiveMaterialSubmissionStatusCode.OVERDUE) return '已逾期'
  if (row.submissionStatus === ArchiveMaterialSubmissionStatusCode.WAIVED_WITH_REASON)
    return '已豁免'
  return row.requiredFlag === false ? '选交' : '待登记'
}

async function loadDepartments(): Promise<void> {
  departmentLoading.value = true
  try {
    const rows = await departmentCatalogApi.list()
    departmentOptions.value = rows.map((item) => ({
      value: item.id,
      label: item.deptName,
    }))
  } catch (error) {
    showUserError(error, '加载院系列表失败')
    departmentOptions.value = []
  } finally {
    departmentLoading.value = false
  }
}

async function loadTemplateSets(): Promise<void> {
  templateLoading.value = true
  try {
    const rows = await listArchiveTenantTemplateSets()
    templateSetOptions.value = rows.filter(isCourseAssessmentTemplateSet).map((item) => ({
      value: item.templateSetCode,
      label: item.templateSetName || item.templateSetCode,
      examForm: item.examForm,
      defaultPermanentRetention: item.defaultPermanentRetention,
      defaultRetentionYears: item.defaultRetentionYears,
    }))
  } catch (error) {
    showUserError(error, '加载目录模板套失败')
  } finally {
    templateLoading.value = false
  }
}

async function loadRelatedExamOptions(keyword?: string): Promise<void> {
  if (identityLocked.value || !form.courseId || !form.semester) {
    return
  }
  relatedExamLoading.value = true
  try {
    const result = await pageExams({
      pageNum: 1,
      pageSize: 50,
      courseId: form.courseId,
      academicYear: resolvedAcademicYear.value,
      semester: form.semester,
      keyword: keyword?.trim() || undefined,
    })
    relatedExamOptions.value = result.list.map((exam: ExamSummaryResponse) => ({
      value: exam.examId,
      label: exam.examNo ? `${exam.examName}（${exam.examNo}）` : exam.examName,
    }))
  } catch (error) {
    showUserError(error, '加载关联考试失败')
  } finally {
    relatedExamLoading.value = false
  }
}

function handleCourseChange(courseId: string | null, option?: CourseListVO): void {
  form.courseId = courseId
  void option
  form.relatedExamId = null
  void loadRelatedExamOptions()
}

function handleDepartmentChange(value: UiOptionValue | UiOptionValue[] | undefined): void {
  form.departmentId = selectValueToNullableString(value)
  form.teachingClassId = null
}

function handleClassChange(classId: string | null, option?: ClassInfoDto): void {
  form.teachingClassId = classId
  if (option?.departmentId) {
    form.departmentId = option.departmentId
  }
}

function handleTemplateChange(value: UiOptionValue | UiOptionValue[] | undefined): void {
  const code = selectValueToNullableString(value)
  form.templateSetCode = code
  if (!code) return
  const selected = templateSetOptions.value.find((item) => item.value === code)
  if (selected?.examForm) {
    form.examForm = selected.examForm
  }
  if (selected?.defaultPermanentRetention != null) {
    form.permanentRetention = selected.defaultPermanentRetention === true
    form.retentionYears = form.permanentRetention
      ? undefined
      : (selected.defaultRetentionYears ?? form.retentionYears)
  }
}

function handleResponsibleChange(
  value: string | string[] | null,
  _option?: TeacherUserInfoDto | TeacherUserInfoDto[],
): void {
  form.responsibleUserId = typeof value === 'string' ? value : null
}

function onScoreSourceSelect(value: UiOptionValue | boolean | undefined): void {
  if (value == null || typeof value === 'boolean') return
  form.scoreSource = String(value) as ArchiveScoreSourceCode
}

function buildRequest(): ArchiveVolumeTaskSettingsUpdateRequest | null {
  if (!form.courseId || !form.departmentId || !form.teachingClassId) {
    showFormValidationMessage('请完整填写课程、院系与授课班级')
    return null
  }
  if (!form.templateSetCode) {
    showFormValidationMessage('请选择目录模板套')
    return null
  }
  if (!form.responsibleUserId) {
    showFormValidationMessage('请选择归档责任人')
    return null
  }
  if (!form.archiveDueTime) {
    showFormValidationMessage('请选择归档截止时刻')
    return null
  }
  const title = form.archiveTitle.trim()
  if (!title) {
    showFormValidationMessage('归档标题不能为空')
    return null
  }
  if (!form.permanentRetention && (form.retentionYears == null || form.retentionYears < 1)) {
    showFormValidationMessage('非永久保管须填写保管年限')
    return null
  }
  const dueChanged = form.archiveDueTime !== (volume.value.archiveDueTime || undefined)
  if (dueChanged && !form.reason.trim()) {
    showFormValidationMessage('修改归档截止须填写覆盖原因')
    return null
  }
  return {
    volumeId: volume.value.volumeId,
    archiveTitle: title,
    archiveNo: form.archiveNo.trim() || undefined,
    courseId: form.courseId,
    teachingClassId: form.teachingClassId,
    departmentId: form.departmentId,
    academicYear: resolvedAcademicYear.value,
    semester: form.semester,
    relatedExamId: form.relatedExamId,
    templateSetCode: form.templateSetCode,
    scoreSource: form.scoreSource,
    examForm: form.examForm ?? null,
    securityLevel: form.securityLevel,
    retentionYears: form.permanentRetention ? undefined : form.retentionYears,
    permanentRetention: form.permanentRetention,
    responsibleUserId: form.responsibleUserId,
    expectedArchiveDueTime: volume.value.archiveDueTime ?? null,
    archiveDueTime: form.archiveDueTime,
    reason: dueChanged ? form.reason.trim() : undefined,
  }
}

async function saveTaskSettings(): Promise<void> {
  if (saving.value) return
  if (!canEdit.value) {
    void message.warning('当前账号无任务设置维护权限')
    return
  }
  const request = buildRequest()
  if (!request) return
  saving.value = true
  try {
    await updateArchiveVolumeTaskSettings(request)
    void message.success('任务设置已保存')
    emit('updated')
  } catch (error) {
    showUserError(error, '保存任务设置失败')
  } finally {
    saving.value = false
  }
}

watch(
  () => props.detail.volume.volumeId,
  () => {
    syncFormFromDetail()
  },
  { immediate: true },
)

watch(
  () => [
    props.detail.volume.archiveTitle,
    props.detail.volume.archiveDueTime,
    props.detail.volume.templateSetCode,
    props.detail.volume.courseId,
    props.detail.volume.teachingClassId,
  ],
  () => {
    if (!saving.value) {
      syncFormFromDetail()
    }
  },
)

watch(
  () => form.permanentRetention,
  (permanent) => {
    if (permanent) {
      form.retentionYears = undefined
    } else if (form.retentionYears == null) {
      form.retentionYears = 10
    }
  },
)

onMounted(() => {
  void loadDepartments()
  void loadTemplateSets()
  void loadRelatedExamOptions()
})
</script>

<template>
  <WorkbenchSurfaceCard embedded class="av-task-settings">
    <UiForm
      layout="horizontal"
      :model="form"
      :rules="formRules"
      :label-col="labelCol"
      :wrapper-col="wrapperCol"
      class="create-form"
    >
      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">任务信息</h3>
        </div>
        <p class="section-desc">
          与创建页同构，维护建卷身份与归档标题。
          {{
            identityLocked
              ? '线上阅卷卷的课程/学年学期等由考试锚定，不可改。'
              : '草稿与收材阶段可完整编辑。'
          }}
        </p>

        <UiFormItem label="课程" name="courseId" required>
          <CatalogCourseSelector
            v-model:value="form.courseId"
            class="av-task-settings__control-grow"
            placeholder="请选择课程"
            :allow-clear="false"
            :disabled="!canEdit || identityLocked"
            @change="handleCourseChange"
          />
        </UiFormItem>

        <UiFormItem label="归档标题" name="archiveTitle" required>
          <UiInput
            v-model="form.archiveTitle"
            size="sm"
            placeholder="例如：2024-2025 高等数学期末考查"
            :maxlength="512"
            :disabled="!canEdit"
          />
        </UiFormItem>

        <UiRow :gutter="24" class="create-form__split-row">
          <UiCol :span="12">
            <UiFormItem
              label="院系"
              name="departmentId"
              required
              :label-col="labelCol"
              :wrapper-col="wrapperCol"
            >
              <UiSelect
                size="sm"
                v-model="departmentIdSelectValue"
                :options="departmentOptions"
                :loading="departmentLoading"
                placeholder="请选择院系"
                allow-search
                option-filter-prop="label"
                :disabled="!canEdit || identityLocked"
                @change="handleDepartmentChange"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem
              label="授课班级"
              name="teachingClassId"
              required
              :label-col="labelCol"
              :wrapper-col="wrapperCol"
            >
              <ClassSelector
                v-model:value="form.teachingClassId"
                :department-id="form.departmentId"
                :disabled="!canEdit || identityLocked || !form.departmentId"
                placeholder="请选择授课班级"
                @change="handleClassChange"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>

        <UiRow :gutter="24" class="create-form__split-row">
          <UiCol :span="12">
            <UiFormItem
              label="学年起始年"
              name="academicYearStartYear"
              required
              :label-col="labelCol"
              :wrapper-col="wrapperCol"
            >
              <UiSelect
                size="sm"
                v-model="form.academicYearStartYear"
                :options="academicYearStartOptions"
                placeholder="请选择起始年"
                :disabled="!canEdit || identityLocked"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="学年结束年" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiInput size="sm" :model-value="academicYearEndYear" disabled />
            </UiFormItem>
          </UiCol>
        </UiRow>

        <UiRow :gutter="24" class="create-form__split-row">
          <UiCol :span="12">
            <UiFormItem
              label="学期"
              name="semester"
              required
              :label-col="labelCol"
              :wrapper-col="wrapperCol"
            >
              <UiSelect
                size="sm"
                v-model="form.semester"
                :options="SemesterOptions"
                placeholder="请选择学期"
                :disabled="!canEdit || identityLocked"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="档案编号" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiInput
                size="sm"
                v-model="form.archiveNo"
                placeholder="不填则保持原编号"
                :maxlength="64"
                :disabled="!canEdit"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>

        <UiRow :gutter="24" class="create-form__split-row">
          <UiCol :span="12">
            <UiFormItem label="建卷来源" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiInput size="sm" :model-value="sourceTypeLabel" disabled />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="关联考试" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiSelect
                size="sm"
                v-model="relatedExamIdSelectValue"
                :options="relatedExamOptions"
                :loading="relatedExamLoading"
                placeholder="可选，选择关联考试"
                allow-search
                allow-clear
                option-filter-prop="label"
                :disabled="!canEdit || identityLocked"
                @search="loadRelatedExamOptions"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
      </div>

      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">归档方案</h3>
        </div>
        <p class="section-desc">
          模板套、密级、保管期限与责任人可在本页维护；更换模板套仅草稿且无已登记材料时允许。
        </p>

        <UiFormItem label="目录模板套" name="templateSetCode" required>
          <UiSelect
            size="sm"
            v-model="templateSetCodeSelectValue"
            :options="templateSetOptions"
            :loading="templateLoading"
            placeholder="请选择模板套"
            allow-search
            option-filter-prop="label"
            :disabled="!canEditTemplate"
            @change="handleTemplateChange"
          />
        </UiFormItem>

        <UiFormItem label="成绩事实源" name="scoreSource" required>
          <UiRadioGroup
            size="sm"
            block
            :model-value="form.scoreSource"
            :options="scoreSourceRadioOptions"
            :disabled="!canEdit || identityLocked"
            @update:model-value="onScoreSourceSelect"
          />
        </UiFormItem>

        <UiRow :gutter="24" class="create-form__split-row">
          <UiCol :span="12">
            <UiFormItem label="考核形式" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiSelect
                size="sm"
                v-model="form.examForm"
                :options="ARCHIVE_EXAM_FORM_OPTIONS"
                allow-clear
                placeholder="可选"
                :disabled="!canEdit"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem
              label="密级"
              name="securityLevel"
              required
              :label-col="labelCol"
              :wrapper-col="wrapperCol"
            >
              <UiSelect
                size="sm"
                v-model="form.securityLevel"
                :options="ARCHIVE_SECURITY_LEVEL_OPTIONS"
                :disabled="!canEdit"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>

        <UiFormItem label="归档责任人" name="responsibleUserId" required>
          <TeacherSelector
            :value="form.responsibleUserId"
            placeholder="请选择归档责任人"
            :disabled="!canEdit"
            @change="handleResponsibleChange"
          />
        </UiFormItem>

        <UiRow :gutter="24" class="create-form__split-row">
          <UiCol :span="12">
            <UiFormItem label="保管年限" :label-col="labelCol" :wrapper-col="wrapperCol">
              <div class="retention-field">
                <UiInputNumber
                  size="sm"
                  :width="120"
                  v-model="form.retentionYears"
                  :min="1"
                  :max="100"
                  :disabled="!canEdit || form.permanentRetention"
                />
                <span class="retention-field__unit">年</span>
                <UiCheckbox v-model="form.permanentRetention" :disabled="!canEdit">
                  永久保管
                </UiCheckbox>
              </div>
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem
              label="归档截止"
              name="archiveDueTime"
              required
              :label-col="labelCol"
              :wrapper-col="wrapperCol"
            >
              <UiDatePicker
                size="sm"
                v-model="form.archiveDueTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="选择归档截止时刻"
                :disabled="!canEditDue"
                class="av-task-settings__control-grow"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>

        <UiFormItem
          v-if="canEditDue && form.archiveDueTime !== (volume.archiveDueTime || undefined)"
          label="覆盖原因"
          required
        >
          <UiInput
            size="sm"
            v-model="form.reason"
            placeholder="覆盖原因（必填，写入审计）"
            :maxlength="200"
          />
        </UiFormItem>

        <div class="av-task-settings__actions">
          <UiButton
            size="sm"
            variant="primary"
            :loading="saving"
            :disabled="!canEdit"
            @click="saveTaskSettings"
          >
            保存任务设置
          </UiButton>
        </div>
      </div>

      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">
            材料清单
            <span class="av-task-settings__count">
              {{ materialReadyCount }}/{{ materialChecklist.length }} 已登记
            </span>
          </h3>
          <UiButton size="sm" variant="ghost" @click="emit('open-materials')">去登记材料</UiButton>
        </div>
        <p class="section-desc">只读预览模板套解析出的材料槽位；登记请到「材料收集」。</p>
        <ul v-if="materialChecklist.length > 0" class="av-task-settings__material-list">
          <li
            v-for="row in materialChecklist"
            :key="row.materialId"
            class="av-task-settings__material-item"
          >
            <span class="av-task-settings__material-name">{{ materialRowLabel(row) }}</span>
            <span class="av-task-settings__material-status">{{ materialRowStatus(row) }}</span>
          </li>
        </ul>
        <p v-else class="av-task-settings__empty">暂无材料槽位，请确认任务已绑定模板套。</p>
      </div>
    </UiForm>
  </WorkbenchSurfaceCard>
</template>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;

.av-task-settings {
  padding: var(--dp-space-4);
  max-width: 920px;
  background: var(--dp-bg-container);
}

.form-section {
  margin-bottom: var(--dp-space-6);
  padding-bottom: var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border-subtle);

  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
  margin-bottom: var(--dp-space-2);
}

.section-title {
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.section-desc {
  margin: 0 0 var(--dp-space-4);
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.create-form {
  width: 100%;
}

.create-form__split-row {
  width: 100%;
}

.retention-field {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  flex-wrap: wrap;
}

.retention-field__unit {
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.av-task-settings__control-grow {
  width: 100%;
  max-width: 480px;
}

.av-task-settings__actions {
  margin-top: var(--dp-space-4);
}

.av-task-settings__count {
  font-size: 12px;
  font-weight: 500;
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
}

.av-task-settings__material-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control, 6px);
  background: var(--dp-surface);
  overflow: hidden;
}

.av-task-settings__material-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--dp-border-subtle);

  &:last-child {
    border-bottom: none;
  }
}

.av-task-settings__material-name {
  color: var(--dp-text-primary);
}

.av-task-settings__material-status {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--dp-text-muted);
}

.av-task-settings__empty {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-muted);
}

@media (max-width: bp.$ant-grid-md) {
  .av-task-settings__control-grow {
    max-width: none;
  }
}
</style>
