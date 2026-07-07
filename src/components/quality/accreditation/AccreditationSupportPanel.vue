<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ProgramSupportProfileSaveRequest,
  ProgramSupportProfileVO,
} from '@/apis/quality/accreditation'
import type { FacultyProfileSaveRequest, FacultyProfileVO } from '@/apis/quality/faculty-profile'
import type { TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { accreditationApi } from '@/apis/quality/accreditation'
import { facultyProfileApi } from '@/apis/quality/faculty-profile'
import { TeacherSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'

const props = defineProps<{
  programId: string
  trainingPlanId: string
}>()

const emit = defineEmits<{ refresh: [] }>()

const loading = ref(false)
const saving = ref(false)
const profile = ref<ProgramSupportProfileVO | null>(null)

const isProfileLocked = computed(() => profile.value?.profileStatus === 'CONFIRMED')
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
  { title: '教师', dataIndex: 'teacherName', key: 'teacher', width: 180 },
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
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
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
    profile.value = await accreditationApi.currentSupportProfile({ trainingPlanId: props.trainingPlanId })
    syncFormFromProfile(profile.value)
  } catch (e) {
    showUserError(e)
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
    facultyTotal.value = Number(page.total)
    if (facultyProfiles.value.length === 0 && facultyTotal.value > 0 && facultyQuery.pageNum > 1) {
      facultyQuery.pageNum -= 1
      await loadFacultyProfiles()
    }
  } catch (e) {
    showUserError(e)
  } finally {
    facultyLoading.value = false
  }
}

async function saveProfile() {
  if (isProfileLocked.value) {
    message.error('已确认档案不可修改，如需调整请联系管理员退回后重编')
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
    message.success('师资与支持条件档案已保存')
    await loadProfile()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  } finally {
    saving.value = false
  }
}

async function confirmProfile() {
  if (!form.id) {
    message.error('请先保存档案')
    return
  }
  try {
    await accreditationApi.confirmSupportProfile(form.id)
    message.success('档案已确认，可供自评报告与专家包引用')
    await loadProfile()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  }
}

function openFacultyCreate() {
  if (!props.trainingPlanId) {
    message.error('请先选择培养方案')
    return
  }
  if (isProfileLocked.value) {
    message.error('师资与支持条件档案已确认，不可再新增教师档案')
    return
  }
  facultyDrawerTitle.value = '新增教师档案'
  resetFacultyForm()
  facultyDrawerOpen.value = true
}

function openFacultyEdit(record: FacultyProfileVO) {
  if (isProfileLocked.value) {
    message.error('师资与支持条件档案已确认，不可再编辑教师档案')
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
    message.error(`师资档案缺少：${missing.join('、')}`)
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
      message.success('教师档案已更新')
    } else {
      facultyForm.id = await facultyProfileApi.create(request)
      message.success('教师档案已创建')
    }
    facultyDrawerOpen.value = false
    await loadFacultyProfiles()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  } finally {
    facultySaving.value = false
  }
}

async function deleteFacultyProfile(record: FacultyProfileVO) {
  if (isProfileLocked.value) {
    message.error('师资与支持条件档案已确认，不可删除教师档案')
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
    showUserError(e)
  }
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
    <section class="support-section">
      <div class="status-bar">
        <div>
          <p class="section-kicker">标准 6 / 标准 7</p>
          <h3 class="section-title">师资与支持条件概述档案</h3>
        </div>
        <div class="status-actions">
          <span v-if="profile?.profileStatus === 'CONFIRMED'" class="confirmed">已确认</span>
          <span v-else-if="profile" class="draft">草稿</span>
          <span v-else class="draft">尚未建档</span>
          <div class="actions">
            <UiButton
              variant="outline"
              :loading="saving"
              :disabled="isProfileLocked"
              @click="saveProfile"
            >
              保存
            </UiButton>
            <UiButton
              variant="primary"
              :disabled="!form.id || isProfileLocked"
              @click="confirmProfile"
            >
              确认档案
            </UiButton>
          </div>
        </div>
      </div>
      <a-form layout="vertical" class="form-grid">
        <a-form-item label="师资队伍概况（标准 6）">
          <a-textarea v-model:value="form.facultySummary" :rows="4" :disabled="isProfileLocked" />
        </a-form-item>
        <a-form-item label="师资结构说明">
          <a-textarea
            v-model:value="form.facultyStructureRemark"
            :rows="3"
            :disabled="isProfileLocked"
          />
        </a-form-item>
        <a-form-item label="实验与工程训练设施（标准 7）">
          <a-textarea
            v-model:value="form.supportFacilitySummary"
            :rows="4"
            :disabled="isProfileLocked"
          />
        </a-form-item>
        <a-form-item label="图书与文献资源">
          <a-textarea
            v-model:value="form.supportLibraryRemark"
            :rows="3"
            :disabled="isProfileLocked"
          />
        </a-form-item>
        <a-form-item label="信息化与计算资源">
          <a-textarea v-model:value="form.supportItRemark" :rows="3" :disabled="isProfileLocked" />
        </a-form-item>
        <a-form-item label="产学合作与实习基地">
          <a-textarea
            v-model:value="form.industryCoopRemark"
            :rows="3"
            :disabled="isProfileLocked"
          />
        </a-form-item>
        <a-form-item label="学生发展与支持">
          <a-textarea
            v-model:value="form.studentDevelopmentRemark"
            :rows="3"
            :disabled="isProfileLocked"
          />
        </a-form-item>
        <a-form-item label="质量保障体系">
          <a-textarea
            v-model:value="form.qualityAssuranceRemark"
            :rows="3"
            :disabled="isProfileLocked"
          />
        </a-form-item>
      </a-form>
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
          variant="primary"
          :disabled="!trainingPlanId || isProfileLocked"
          @click="openFacultyCreate"
        >
          新增教师档案
        </UiButton>
      </div>

      <div class="faculty-toolbar">
        <a-input
          v-model:value="facultyQuery.keyword"
          class="faculty-search"
          allow-clear
          placeholder="搜索教师姓名、工号或研究方向"
          @press-enter="searchFacultyProfiles"
        />
        <a-input
          v-model:value="facultyQuery.department"
          class="faculty-filter"
          allow-clear
          placeholder="院系"
          @press-enter="searchFacultyProfiles"
        />
        <a-input
          v-model:value="facultyQuery.title"
          class="faculty-filter"
          allow-clear
          placeholder="职称"
          @press-enter="searchFacultyProfiles"
        />
        <UiButton variant="outline" @click="searchFacultyProfiles">查询</UiButton>
        <UiButton variant="ghost" @click="resetFacultyFilters">重置</UiButton>
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
            <UiButton
              size="sm"
              variant="outline"
              :disabled="isProfileLocked"
              @click="openFacultyEdit(record)"
            >
              编辑
            </UiButton>
            <UiButton
              size="sm"
              status="danger"
              variant="ghost"
              :disabled="isProfileLocked"
              @click="deleteFacultyProfile(record)"
            >
              删除
            </UiButton>
          </template>
        </template>
        <template #empty>
          <UiEmpty description="尚未为当前培养方案建立教师粒度师资档案" />
        </template>
      </UiDataTable>
    </section>

    <UiEmpty v-if="!trainingPlanId" description="请选择培养方案" />

    <UiDrawer
      v-model:open="facultyDrawerOpen"
      :title="facultyDrawerTitle"
      width="560"
      :hide-footer="false"
      :confirm-loading="facultySaving"
      ok-text="保存"
      @ok="submitFacultyProfile"
    >
      <a-form layout="vertical">
        <a-form-item label="教师" required>
          <TeacherSelector
            v-model:value="selectedTeacherId"
            placeholder="从教师目录选择"
            @change="handleTeacherChange"
          />
        </a-form-item>
        <a-form-item label="教师姓名" required>
          <a-input v-model:value="facultyForm.teacherName" disabled />
        </a-form-item>
        <a-form-item label="教工号" required>
          <a-input v-model:value="facultyForm.teacherNo" disabled />
        </a-form-item>
        <a-form-item label="所属院系" required>
          <a-input v-model:value="facultyForm.department" disabled />
        </a-form-item>
        <a-form-item label="职称" required>
          <a-input v-model:value="facultyForm.title" disabled />
        </a-form-item>
        <a-form-item label="师德师风培训" required>
          <a-switch v-model:checked="facultyForm.hasTeachingEthicsTraining" />
        </a-form-item>
        <a-form-item label="培训日期" required>
          <a-input v-model:value="facultyForm.ethicsTrainingDate" placeholder="如 2025-09-10" />
        </a-form-item>
        <a-form-item label="承担课程" required>
          <a-textarea v-model:value="facultyForm.courses" :rows="2" />
        </a-form-item>
        <a-form-item label="科研方向">
          <a-textarea v-model:value="facultyForm.researchDirection" :rows="2" />
        </a-form-item>
        <a-form-item label="教学评价结果" required>
          <a-textarea v-model:value="facultyForm.teachingEvaluation" :rows="3" />
        </a-form-item>
        <a-form-item label="工程实践经历" required>
          <a-textarea
            v-model:value="facultyForm.engineeringPracticeExperience"
            :rows="3"
            placeholder="填写企业实践、工程项目、行业服务或工程训练经历"
          />
        </a-form-item>
        <a-form-item label="工程能力支撑证据" required>
          <a-textarea
            v-model:value="facultyForm.engineeringAbilityEvidence"
            :rows="3"
            placeholder="填写工程设计、工程实现、工程问题解决能力的证明材料"
          />
        </a-form-item>
        <a-form-item label="教师发展记录" required>
          <a-textarea
            v-model:value="facultyForm.teacherDevelopmentRecord"
            :rows="3"
            placeholder="填写教师发展培训、职业发展、教学能力提升记录"
          />
        </a-form-item>
        <a-form-item label="教学改革与持续改进记录" required>
          <a-textarea
            v-model:value="facultyForm.teachingReformContribution"
            :rows="3"
            placeholder="填写教学研究、课程改革、达成度改进任务参与情况"
          />
        </a-form-item>
        <a-form-item label="毕业设计或工程项目指导情况" required>
          <a-textarea
            v-model:value="facultyForm.graduationDesignGuidance"
            :rows="3"
            placeholder="填写毕业设计、课程设计、工程项目或竞赛指导情况"
          />
        </a-form-item>
      </a-form>
    </UiDrawer>
  </div>
</template>

<style scoped>
.support-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.support-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface-subtle);
}

.status-bar,
.faculty-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.status-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-kicker {
  margin: 0 0 4px;
  color: var(--dp-blue-600);
  font-size: 12px;
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
  margin: 6px 0 0;
  color: var(--dp-text-muted);
  font-size: 13px;
}

.confirmed {
  color: var(--ant-color-success);
  font-weight: 600;
}

.draft {
  color: var(--dp-text-muted);
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
}

.form-grid {
  max-width: 760px;
}

.faculty-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
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
  font-size: 12px;
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
  color: var(--ant-color-success);
  font-weight: 600;
}

.training-no {
  color: var(--ant-color-warning);
  font-weight: 600;
}

.loading {
  padding: 24px;
  color: rgba(0, 0, 0, 0.45);
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
