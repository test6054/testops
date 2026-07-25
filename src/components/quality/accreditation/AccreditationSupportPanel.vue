<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { TeacherUserInfoDto } from '@/apis/platform/teacher-catalog'
import type {
  ProgramSupportProfileSaveRequest,
  ProgramSupportProfileVO,
} from '@/apis/quality/accreditation'
import type { FacultyProfileSaveRequest, FacultyProfileVO } from '@/apis/quality/faculty-profile'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { accreditationApi } from '@/apis/quality/accreditation'
import { facultyProfileApi } from '@/apis/quality/faculty-profile'
import TeacherSelector from '@/components/platform/TeacherSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { ProgramSupportProfileStatusCode } from '@/types/enums/program-support-profile-status-enum'
import { showUserError } from '@/utils/error-handler'

const props = defineProps<{
  programId: string
  trainingPlanId: string
}>()

const emit = defineEmits<{ refresh: [] }>()

const loading = ref(false)
const saving = ref(false)
const profile = ref<ProgramSupportProfileVO | null>(null)

const isProfileLocked = computed(
  () => profile.value?.profileStatus === ProgramSupportProfileStatusCode.CONFIRMED,
)
const facultyLoading = ref(false)
const facultySaving = ref(false)
const facultyDrawerOpen = ref(false)
const facultyDrawerTitle = ref('新增教师档案')
const selectedTeacherId = ref<string | null>(null)
const facultyProfiles = ref<FacultyProfileVO[]>([])
const facultyTotal = ref(0)

const form = reactive<ProgramSupportProfileSaveRequest>({
  programId: '',
  trainingPlanId: '',
  facultySummary: '',
  facultyStructureRemark: '',
  supportFacilitySummary: '',
  supportLibraryRemark: '',
  supportItRemark: '',
  industryCoopRemark: '',
  studentDevelopmentRemark: '',
  qualityAssuranceRemark: '',
})

const facultyQuery = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  department: '',
  title: '',
})

const facultyForm = reactive<FacultyProfileSaveRequest>({
  trainingPlanId: '',
  teacherUserId: '',
  teacherName: '',
  teacherNo: '',
  title: '',
  department: '',
  hasTeachingEthicsTraining: false,
  ethicsTrainingDate: '',
  teachingEvaluation: '',
  researchDirection: '',
  courses: '',
  engineeringPracticeExperience: '',
  engineeringAbilityEvidence: '',
  teacherDevelopmentRecord: '',
  teachingReformContribution: '',
  graduationDesignGuidance: '',
})

const facultyColumns: ColumnsType<FacultyProfileVO> = [
  { title: '教师', dataIndex: 'teacherName', key: 'teacher', width: 180, fixed: 'left' },
  { title: '院系', dataIndex: 'department', key: 'department', width: 150 },
  { title: '职称', dataIndex: 'title', key: 'title', width: 110 },
  {
    title: '师德师风培训',
    dataIndex: 'hasTeachingEthicsTraining',
    key: 'ethicsTraining',
    width: 130,
  },
  { title: '承担课程', dataIndex: 'courses', key: 'courses' },
  { title: '工程认证证据', key: 'engineeringEvidence', width: 220 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 160 },
]

function syncFormFromProfile(p: ProgramSupportProfileVO | null) {
  form.programId = props.programId
  form.trainingPlanId = props.trainingPlanId
  form.id = p?.id
  form.facultySummary = p?.facultySummary || ''
  form.facultyStructureRemark = p?.facultyStructureRemark || ''
  form.supportFacilitySummary = p?.supportFacilitySummary || ''
  form.supportLibraryRemark = p?.supportLibraryRemark || ''
  form.supportItRemark = p?.supportItRemark || ''
  form.industryCoopRemark = p?.industryCoopRemark || ''
  form.studentDevelopmentRemark = p?.studentDevelopmentRemark || ''
  form.qualityAssuranceRemark = p?.qualityAssuranceRemark || ''
}

function resetFacultyForm() {
  selectedTeacherId.value = null
  facultyForm.id = undefined
  facultyForm.trainingPlanId = props.trainingPlanId
  facultyForm.teacherUserId = ''
  facultyForm.teacherName = ''
  facultyForm.teacherNo = ''
  facultyForm.title = ''
  facultyForm.department = ''
  facultyForm.hasTeachingEthicsTraining = false
  facultyForm.ethicsTrainingDate = ''
  facultyForm.teachingEvaluation = ''
  facultyForm.researchDirection = ''
  facultyForm.courses = ''
  facultyForm.engineeringPracticeExperience = ''
  facultyForm.engineeringAbilityEvidence = ''
  facultyForm.teacherDevelopmentRecord = ''
  facultyForm.teachingReformContribution = ''
  facultyForm.graduationDesignGuidance = ''
}

async function loadProfile() {
  if (!props.trainingPlanId) {
    profile.value = null
    syncFormFromProfile(null)
    return
  }
  loading.value = true
  try {
    profile.value = await accreditationApi.currentSupportProfile({
      trainingPlanId: props.trainingPlanId,
    })
    syncFormFromProfile(profile.value)
  } catch (e) {
    showUserError(e, '师资与支持条件档案加载失败')
  } finally {
    loading.value = false
  }
}

async function loadFacultyProfiles() {
  if (!props.trainingPlanId) {
    facultyProfiles.value = []
    facultyTotal.value = 0
    return
  }
  facultyLoading.value = true
  try {
    const page = await facultyProfileApi.page({
      trainingPlanId: props.trainingPlanId,
      pageNum: facultyQuery.pageNum,
      pageSize: facultyQuery.pageSize,
      keyword: facultyQuery.keyword || undefined,
      department: facultyQuery.department || undefined,
      title: facultyQuery.title || undefined,
    })
    facultyProfiles.value = page.list
    facultyQuery.pageNum = page.pageNum
    facultyQuery.pageSize = page.pageSize
    facultyTotal.value = page.total
    if (facultyProfiles.value.length === 0 && facultyTotal.value > 0 && facultyQuery.pageNum > 1) {
      facultyQuery.pageNum -= 1
      await loadFacultyProfiles()
    }
  } catch (e) {
    showUserError(e, '教师档案列表加载失败')
  } finally {
    facultyLoading.value = false
  }
}

async function saveProfile() {
  if (isProfileLocked.value) {
    void message.error('已确认档案不可修改，如需调整请联系管理员退回后重编')
    return
  }
  saving.value = true
  try {
    const request: ProgramSupportProfileSaveRequest = {
      id: form.id,
      programId: form.programId,
      trainingPlanId: form.trainingPlanId,
      facultySummary: form.facultySummary?.trim() || undefined,
      facultyStructureRemark: form.facultyStructureRemark?.trim() || undefined,
      supportFacilitySummary: form.supportFacilitySummary?.trim() || undefined,
      supportLibraryRemark: form.supportLibraryRemark?.trim() || undefined,
      supportItRemark: form.supportItRemark?.trim() || undefined,
      industryCoopRemark: form.industryCoopRemark?.trim() || undefined,
      studentDevelopmentRemark: form.studentDevelopmentRemark?.trim() || undefined,
      qualityAssuranceRemark: form.qualityAssuranceRemark?.trim() || undefined,
    }
    form.id = await accreditationApi.saveSupportProfile(request)
    void message.success('师资与支持条件档案已保存')
    await loadProfile()
    emit('refresh')
  } catch (e) {
    showUserError(e, '师资与支持条件档案保存失败')
  } finally {
    saving.value = false
  }
}

async function confirmProfile() {
  if (!form.id) {
    void message.error('请先保存档案')
    return
  }
  try {
    await accreditationApi.confirmSupportProfile(form.id)
    void message.success('档案已确认，可供自评报告与专家包引用')
    await loadProfile()
    emit('refresh')
  } catch (e) {
    showUserError(e, '档案确认失败')
  }
}

function openFacultyCreate() {
  if (!props.trainingPlanId) {
    void message.error('请先选择培养方案')
    return
  }
  if (isProfileLocked.value) {
    void message.error('师资与支持条件档案已确认，不可再新增教师档案')
    return
  }
  facultyDrawerTitle.value = '新增教师档案'
  resetFacultyForm()
  facultyDrawerOpen.value = true
}

function openFacultyEdit(record: FacultyProfileVO) {
  if (isProfileLocked.value) {
    void message.error('师资与支持条件档案已确认，不可再编辑教师档案')
    return
  }
  facultyDrawerTitle.value = '编辑教师档案'
  selectedTeacherId.value = record.teacherUserId
  facultyForm.id = record.id
  facultyForm.trainingPlanId = record.trainingPlanId
  facultyForm.teacherUserId = record.teacherUserId
  facultyForm.teacherName = record.teacherName
  facultyForm.teacherNo = record.teacherNo
  facultyForm.title = record.title
  facultyForm.department = record.department
  facultyForm.hasTeachingEthicsTraining = record.hasTeachingEthicsTraining
  facultyForm.ethicsTrainingDate = record.ethicsTrainingDate
  facultyForm.teachingEvaluation = record.teachingEvaluation
  facultyForm.researchDirection = record.researchDirection
  facultyForm.courses = record.courses
  facultyForm.engineeringPracticeExperience = record.engineeringPracticeExperience
  facultyForm.engineeringAbilityEvidence = record.engineeringAbilityEvidence
  facultyForm.teacherDevelopmentRecord = record.teacherDevelopmentRecord
  facultyForm.teachingReformContribution = record.teachingReformContribution
  facultyForm.graduationDesignGuidance = record.graduationDesignGuidance
  facultyDrawerOpen.value = true
  validateFacultyForm()
}

function handleTeacherChange(
  value: string | string[] | null,
  option?: TeacherUserInfoDto | TeacherUserInfoDto[],
) {
  if (typeof value !== 'string') {
    facultyForm.teacherUserId = ''
    facultyForm.teacherName = ''
    facultyForm.teacherNo = ''
    facultyForm.department = ''
    facultyForm.title = ''
    return
  }
  facultyForm.teacherUserId = value
  if (!Array.isArray(option) && option) {
    facultyForm.teacherName = option.nickName
    facultyForm.teacherNo = option.teacherNumber || ''
    facultyForm.department = option.department || ''
    facultyForm.title = option.title || ''
  }
}

function validateFacultyForm() {
  const missing: string[] = []
  if (!facultyForm.teacherUserId) missing.push('教师')
  if (typeof facultyForm.teacherName !== 'string' || !facultyForm.teacherName.trim()) {
    missing.push('教师姓名')
  }
  if (typeof facultyForm.teacherNo !== 'string' || !facultyForm.teacherNo.trim()) {
    missing.push('教工号')
  }
  if (typeof facultyForm.department !== 'string' || !facultyForm.department.trim()) {
    missing.push('所属院系')
  }
  if (typeof facultyForm.title !== 'string' || !facultyForm.title.trim()) {
    missing.push('职称')
  }
  if (facultyForm.hasTeachingEthicsTraining !== true) missing.push('师德师风培训完成状态')
  if (
    typeof facultyForm.ethicsTrainingDate !== 'string'
    || !facultyForm.ethicsTrainingDate.trim()
  ) {
    missing.push('培训日期')
  }
  if (typeof facultyForm.courses !== 'string' || !facultyForm.courses.trim()) {
    missing.push('承担课程')
  }
  if (
    typeof facultyForm.teachingEvaluation !== 'string'
    || !facultyForm.teachingEvaluation.trim()
  ) {
    missing.push('教学评价结果')
  }
  if (
    typeof facultyForm.engineeringPracticeExperience !== 'string'
    || !facultyForm.engineeringPracticeExperience.trim()
  ) {
    missing.push('工程实践经历')
  }
  if (
    typeof facultyForm.engineeringAbilityEvidence !== 'string'
    || !facultyForm.engineeringAbilityEvidence.trim()
  ) {
    missing.push('工程能力支撑证据')
  }
  if (
    typeof facultyForm.teacherDevelopmentRecord !== 'string'
    || !facultyForm.teacherDevelopmentRecord.trim()
  ) {
    missing.push('教师发展记录')
  }
  if (
    typeof facultyForm.teachingReformContribution !== 'string'
    || !facultyForm.teachingReformContribution.trim()
  ) {
    missing.push('教学改革与持续改进记录')
  }
  if (
    typeof facultyForm.graduationDesignGuidance !== 'string'
    || !facultyForm.graduationDesignGuidance.trim()
  ) {
    missing.push('毕业设计或工程项目指导情况')
  }
  if (missing.length > 0) {
    void message.error(`师资档案缺少：${missing.join('、')}`)
    return false
  }
  return true
}

async function submitFacultyProfile() {
  if (!validateFacultyForm()) return
  facultySaving.value = true
  try {
    const request: FacultyProfileSaveRequest = {
      id: facultyForm.id,
      trainingPlanId: props.trainingPlanId,
      teacherUserId: facultyForm.teacherUserId,
      teacherName: facultyForm.teacherName.trim(),
      teacherNo: facultyForm.teacherNo.trim(),
      title: facultyForm.title.trim(),
      department: facultyForm.department.trim(),
      hasTeachingEthicsTraining: facultyForm.hasTeachingEthicsTraining,
      ethicsTrainingDate: facultyForm.ethicsTrainingDate.trim(),
      teachingEvaluation: facultyForm.teachingEvaluation.trim(),
      researchDirection: facultyForm.researchDirection?.trim() || undefined,
      courses: facultyForm.courses.trim(),
      engineeringPracticeExperience: facultyForm.engineeringPracticeExperience.trim(),
      engineeringAbilityEvidence: facultyForm.engineeringAbilityEvidence.trim(),
      teacherDevelopmentRecord: facultyForm.teacherDevelopmentRecord.trim(),
      teachingReformContribution: facultyForm.teachingReformContribution.trim(),
      graduationDesignGuidance: facultyForm.graduationDesignGuidance.trim(),
    }
    if (facultyForm.id) {
      await facultyProfileApi.update(request)
      void message.success('教师档案已更新')
    } else {
      facultyForm.id = await facultyProfileApi.create(request)
      void message.success('教师档案已创建')
    }
    facultyDrawerOpen.value = false
    await loadFacultyProfiles()
    emit('refresh')
  } catch (e) {
    showUserError(e, '教师档案保存失败')
  } finally {
    facultySaving.value = false
  }
}

async function deleteFacultyProfile(record: FacultyProfileVO) {
  if (isProfileLocked.value) {
    void message.error('师资与支持条件档案已确认，不可删除教师档案')
    return
  }
  const ok = await confirmAsync({
    title: `确认删除 ${record.teacherName} 的认证师资档案？`,
  })
  if (!ok) return
  try {
    await facultyProfileApi.delete(record.id)
    await loadFacultyProfiles()
    emit('refresh')
  } catch (e) {
    showUserError(e, '教师档案删除失败')
  }
}

function handleFacultyRowAction(key: string, record: FacultyProfileVO) {
  if (key === 'edit') openFacultyEdit(record)
  else if (key === 'delete') void deleteFacultyProfile(record)
}

function searchFacultyProfiles() {
  facultyQuery.pageNum = 1
  loadFacultyProfiles()
}

function resetFacultyFilters() {
  facultyQuery.keyword = ''
  facultyQuery.department = ''
  facultyQuery.title = ''
  facultyQuery.pageNum = 1
  loadFacultyProfiles()
}

function handleFacultyPageChange(pageEvent: { current: number, pageSize: number }) {
  facultyQuery.pageNum = pageEvent.current
  facultyQuery.pageSize = pageEvent.pageSize
  loadFacultyProfiles()
}

async function reloadPanel() {
  await Promise.all([loadProfile(), loadFacultyProfiles()])
}

watch(() => [props.programId, props.trainingPlanId], reloadPanel, { immediate: true })

defineExpose({ loadProfile, loadFacultyProfiles, reloadPanel })
</script>

<template>
  <div v-if="loading" class="loading">加载中...</div>
  <div v-else class="support-panel">
    <UiAlertStrip v-if="!trainingPlanId" tone="info" size="sm" dense inline :show-icon="false">
      <template #default>
        <span style="display: inline-flex; align-items: center; gap: var(--dp-space-component-tight)">
          <UiTag tone="blue" size="sm">未选择培养方案</UiTag>
          <span>请先在页面上方选择培养方案后再维护支撑与师资档案</span>
        </span>
      </template>
    </UiAlertStrip>

    <template v-else>
      <section class="support-section">
        <div class="status-bar">
          <div>
            <p class="section-kicker">标准 6 / 标准 7</p>
            <h3 class="section-title">师资与支持条件概述档案</h3>
          </div>
          <div class="status-actions">
            <span
              v-if="profile?.profileStatus === ProgramSupportProfileStatusCode.CONFIRMED"
              class="confirmed"
            >已确认</span>
            <span v-else-if="profile" class="draft">草稿</span>
            <span v-else class="draft">尚未建档</span>
            <div class="actions">
              <UiButton
                size="sm"
                variant="outline"
                :loading="saving"
                :disabled="isProfileLocked"
                @click="saveProfile"
              >
                保存
              </UiButton>
              <UiButton
                size="sm"
                variant="primary"
                :disabled="!form.id || isProfileLocked"
                @click="confirmProfile"
              >
                确认档案
              </UiButton>
            </div>
          </div>
        </div>
        <UiForm layout="vertical" class="form-grid">
          <UiFormItem label="师资队伍概况（标准 6）">
            <UiTextarea
              size="sm"
              v-model="form.facultySummary"
              :rows="4"
              :disabled="isProfileLocked"
            />
          </UiFormItem>
          <UiFormItem label="师资结构说明">
            <UiTextarea
              size="sm"
              v-model="form.facultyStructureRemark"
              :rows="3"
              :disabled="isProfileLocked"
            />
          </UiFormItem>
          <UiFormItem label="实验与工程训练设施（标准 7）">
            <UiTextarea
              size="sm"
              v-model="form.supportFacilitySummary"
              :rows="4"
              :disabled="isProfileLocked"
            />
          </UiFormItem>
          <UiFormItem label="图书与文献资源">
            <UiTextarea
              size="sm"
              v-model="form.supportLibraryRemark"
              :rows="3"
              :disabled="isProfileLocked"
            />
          </UiFormItem>
          <UiFormItem label="信息化与计算资源">
            <UiTextarea
              size="sm"
              v-model="form.supportItRemark"
              :rows="3"
              :disabled="isProfileLocked"
            />
          </UiFormItem>
          <UiFormItem label="产学合作与实习基地">
            <UiTextarea
              size="sm"
              v-model="form.industryCoopRemark"
              :rows="3"
              :disabled="isProfileLocked"
            />
          </UiFormItem>
          <UiFormItem label="学生发展与支持">
            <UiTextarea
              size="sm"
              v-model="form.studentDevelopmentRemark"
              :rows="3"
              :disabled="isProfileLocked"
            />
          </UiFormItem>
          <UiFormItem label="质量保障体系">
            <UiTextarea
              size="sm"
              v-model="form.qualityAssuranceRemark"
              :rows="3"
              :disabled="isProfileLocked"
            />
          </UiFormItem>
        </UiForm>
      </section>

      <section class="support-section">
        <div class="faculty-header">
          <div>
            <p class="section-kicker">培养方案维度</p>
            <h3 class="section-title">教师粒度师资档案</h3>
            <p class="section-desc">
              每位教师按当前培养方案建档，供自评报告、专家材料包和标准 6 师资举证引用。
            </p>
          </div>
          <UiButton
            size="sm"
            variant="primary"
            :disabled="!trainingPlanId || isProfileLocked"
            @click="openFacultyCreate"
          >
            新增教师档案
          </UiButton>
        </div>

        <div class="faculty-toolbar">
          <UiInput
            size="sm"
            v-model="facultyQuery.keyword"
            class="faculty-search"
            clearable
            placeholder="搜索教师姓名、工号或研究方向"
            @press-enter="searchFacultyProfiles"
          />
          <UiInput
            size="sm"
            v-model="facultyQuery.department"
            class="faculty-filter"
            clearable
            placeholder="院系"
            @press-enter="searchFacultyProfiles"
          />
          <UiInput
            size="sm"
            v-model="facultyQuery.title"
            class="faculty-filter"
            clearable
            placeholder="职称"
            @press-enter="searchFacultyProfiles"
          />
          <UiButton size="sm" variant="outline" @click="searchFacultyProfiles">查询</UiButton>
          <UiButton size="sm" variant="ghost" @click="resetFacultyFilters">重置</UiButton>
        </div>

        <UiDataTable
          v-model:current="facultyQuery.pageNum"
          v-model:page-size="facultyQuery.pageSize"
          :columns="facultyColumns"
          :data-source="facultyProfiles"
          :loading="facultyLoading"
          :total="facultyTotal"
          row-key="id"
          @page-change="handleFacultyPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'teacher'">
              <div class="teacher-cell">
                <strong>{{ record.teacherName }}</strong>
                <span>工号 {{ record.teacherNo }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'ethicsTraining'">
              <span :class="record.hasTeachingEthicsTraining ? 'training-yes' : 'training-no'">
                {{ record.hasTeachingEthicsTraining ? '已完成' : '未完成' }}
              </span>
              <span class="training-date">
                {{ record.ethicsTrainingDate }}
              </span>
            </template>
            <template v-else-if="column.key === 'engineeringEvidence'">
              <div class="evidence-cell">
                <span>实践：{{ record.engineeringPracticeExperience }}</span>
                <span>能力：{{ record.engineeringAbilityEvidence }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[
                  { key: 'edit', label: '编辑', disabled: isProfileLocked },
                  { key: 'delete', label: '删除', tone: 'danger', disabled: isProfileLocked },
                ]"
                split
                @action="(key) => handleFacultyRowAction(key, record)"
              />
            </template>
          </template>
          <template #empty>
            <UiEmpty size="sm" description="尚未为当前培养方案建立教师粒度师资档案" />
          </template>
        </UiDataTable>
      </section>
    </template>

    <UiDrawer
      v-model:open="facultyDrawerOpen"
      :title="facultyDrawerTitle"
      width="560"
      :hide-footer="false"
      :confirm-loading="facultySaving"
      ok-text="保存"
      @ok="submitFacultyProfile"
    >
      <UiForm layout="vertical">
        <UiFormItem label="教师" required>
          <TeacherSelector
            v-model:value="selectedTeacherId"
            placeholder="从教师目录选择"
            @change="handleTeacherChange"
          />
        </UiFormItem>
        <UiFormItem label="教师姓名" required>
          <UiInput size="sm" v-model="facultyForm.teacherName" disabled />
        </UiFormItem>
        <UiFormItem label="教工号" required>
          <UiInput size="sm" v-model="facultyForm.teacherNo" disabled />
        </UiFormItem>
        <UiFormItem label="所属院系" required>
          <UiInput size="sm" v-model="facultyForm.department" disabled />
        </UiFormItem>
        <UiFormItem label="职称" required>
          <UiInput size="sm" v-model="facultyForm.title" disabled />
        </UiFormItem>
        <UiFormItem label="师德师风培训" required>
          <UiSwitch size="sm" v-model="facultyForm.hasTeachingEthicsTraining" />
        </UiFormItem>
        <UiFormItem label="培训日期" required>
          <UiInput size="sm" v-model="facultyForm.ethicsTrainingDate" placeholder="如 2025-09-10" />
        </UiFormItem>
        <UiFormItem label="承担课程" required>
          <UiTextarea size="sm" v-model="facultyForm.courses" :rows="2" />
        </UiFormItem>
        <UiFormItem label="科研方向">
          <UiTextarea size="sm" v-model="facultyForm.researchDirection" :rows="2" />
        </UiFormItem>
        <UiFormItem label="教学评价结果" required>
          <UiTextarea size="sm" v-model="facultyForm.teachingEvaluation" :rows="3" />
        </UiFormItem>
        <UiFormItem label="工程实践经历" required>
          <UiTextarea
            size="sm"
            v-model="facultyForm.engineeringPracticeExperience"
            :rows="3"
            placeholder="填写企业实践、工程项目、行业服务或工程训练经历"
          />
        </UiFormItem>
        <UiFormItem label="工程能力支撑证据" required>
          <UiTextarea
            size="sm"
            v-model="facultyForm.engineeringAbilityEvidence"
            :rows="3"
            placeholder="填写工程设计、工程实现、工程问题解决能力的证明材料"
          />
        </UiFormItem>
        <UiFormItem label="教师发展记录" required>
          <UiTextarea
            size="sm"
            v-model="facultyForm.teacherDevelopmentRecord"
            :rows="3"
            placeholder="填写教师发展培训、职业发展、教学能力提升记录"
          />
        </UiFormItem>
        <UiFormItem label="教学改革与持续改进记录" required>
          <UiTextarea
            size="sm"
            v-model="facultyForm.teachingReformContribution"
            :rows="3"
            placeholder="填写教学研究、课程改革、达成度改进任务参与情况"
          />
        </UiFormItem>
        <UiFormItem label="毕业设计或工程项目指导情况" required>
          <UiTextarea
            size="sm"
            v-model="facultyForm.graduationDesignGuidance"
            :rows="3"
            placeholder="填写毕业设计、课程设计、工程项目或竞赛指导情况"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
  </div>
</template>

<style scoped>
.support-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}

.support-section {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-subtle);
}

.status-bar,
.faculty-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-component);
}

.status-actions {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component);
}

.section-kicker {
  margin: 0 0 var(--dp-space-component-xs);
  color: var(--dp-blue-600);
  font-size: var(--dp-font-size-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
}

.section-title {
  margin: 0;
  color: var(--dp-text-primary);
  font-size: 17px;
  font-weight: 600;
}

.section-desc {
  margin: var(--dp-space-component-tight) 0 0;
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-sm);
}

.confirmed {
  color: var(--dp-success);
  font-weight: 600;
}

.draft {
  color: var(--dp-text-muted);
  font-weight: 600;
}

.actions {
  display: flex;
  gap: var(--dp-space-component-tight);
}

.form-grid {
  max-width: 760px;
}

.faculty-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component);
}

.faculty-search {
  width: min(320px, 100%);
}

.faculty-filter {
  width: 160px;
}

.teacher-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.teacher-cell span,
.training-date,
.evidence-cell span {
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-xs);
}

.evidence-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 220px;
}

.evidence-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.training-yes {
  color: var(--dp-success);
  font-weight: 600;
}

.training-no {
  color: var(--dp-warning);
  font-weight: 600;
}

.loading {
  padding: var(--dp-space-component);
  color: var(--dp-text-muted);
}

@media (max-width: 720px) {
  .status-bar,
  .faculty-header,
  .status-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .faculty-search,
  .faculty-filter {
    width: 100%;
  }
}
</style>
