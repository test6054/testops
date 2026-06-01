<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="roster-page__context">
        <div class="roster-page__context-left">
          <a-select
            :value="selectedExamId"
            class="roster-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
          <UiTag v-if="selectedExamId" tone="blue" size="sm">{{ candidates.length }} 名考生</UiTag>
        </div>
      </div>
    </template>

    <UiEmpty v-if="!selectedExamId" description="请选择需要维护的考试" class="roster-page__empty" />

    <UiErrorRetryPanel
      v-else-if="rosterLoadError"
      :error="rosterLoadError"
      title="考生名册加载失败"
      :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
      @retry="loadRoster"
    />

    <a-spin v-else :spinning="loading">
      <UiAlertStrip
        v-if="showSetupGuide"
        type="info"
        title="请完成考生名册配置"
        description="① 选择参考班级 → ② 从学生库勾选或批量导入学生后勾选 → ③ 单个添加"
        closable
        class="roster-setup-guide"
        @close="dismissSetupGuide"
      />
      <UiCard class="info-card">
        <template #title>
          <TeamOutlined />
          <span>班级范围</span>
          <UiBadge tone="blue">{{ classIds.length }}</UiBadge>
        </template>
        <a-alert
          type="info"
          show-icon
          message="选定参考班级后立即保存；名册增删即时落库，无需再点保存名册。"
          class="info-card__hint"
        />
        <a-select
          v-model:value="classIds"
          mode="multiple"
          placeholder="选择参考班级（可多选）"
          :options="classOptions"
          :loading="classOptionsLoading"
          show-search
          option-filter-prop="label"
          allow-clear
          class="info-card__class-select"
        />
      </UiCard>

      <UiCard class="info-card">
        <template #title>
          <UserOutlined />
          <span>考生名册</span>
          <UiBadge tone="blue">{{ candidates.length }}</UiBadge>
        </template>
        <template #extra>
          <a-space>
            <UiButton
              size="sm"
              variant="outline"
              :disabled="!classIds.length"
              @click="openSelectDrawer"
            >
              <template #icon><UserAddOutlined /></template>
              从学生库选择
            </UiButton>
            <UiButton size="sm" variant="outline" @click="openBatchImportModal">
              <template #icon><UploadOutlined /></template>
              批量导入
            </UiButton>
            <UiButton size="sm" @click="openSingleAddModal">
              <template #icon><PlusOutlined /></template>
              添加单个
            </UiButton>
          </a-space>
        </template>

        <UiDataTable
          :columns="columns"
          :data-source="candidates"
          :show-pagination="false"
          flat
          :total="candidates.length"
          row-key="rowKey"
          size="middle"
          class="roster-table"
          bordered
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'student'">
              <div class="roster-student">
                <span class="roster-student__name">{{ (record as CandidateRow).studentName }}</span>
                <span class="roster-student__no">{{ (record as CandidateRow).studentNo }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'className'">
              <span class="roster-cell roster-cell--muted">
                {{ (record as CandidateRow).className }}
              </span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                size="sm"
                variant="ghost"
                :loading="removingStudentUserId === (record as CandidateRow).studentUserId"
                @click="removeCandidate((record as CandidateRow).studentUserId)"
              >
                移除
              </UiButton>
            </template>
          </template>
        </UiDataTable>

        <div class="roster-summary">共 {{ candidates.length }} 名考生</div>
      </UiCard>
    </a-spin>

    <ClassStudentTreeSelectorDrawer
      v-model="selectDrawerOpen"
      title="选择考试考生"
      :exam-id="selectedExamId ?? undefined"
      :allowed-class-ids="classIds"
      :excluded-student-ids="rosterStudentUserIds"
      @confirm="handleStudentsSelected"
    />
    <BatchImportModal
      v-model:open="showImportModal"
      title="批量导入学生"
      entity-label="学生"
      :import-handler="handleImportStudents"
      :requirements="importRequirements"
      @download-template="handleDownloadImportTemplate"
      @success="handleImportSuccess"
    />

    <a-modal
      v-model:open="singleAddOpen"
      title="添加考生"
      ok-text="加入名册"
      :confirm-loading="singleAddSubmitting"
      :destroy-on-close="true"
      width="520px"
      @ok="handleSingleAddSubmit"
    >
      <a-form layout="vertical">
        <a-form-item label="班级" required>
          <a-select
            v-model:value="singleAddClassId"
            placeholder="请选择班级"
            :options="classOptions"
            show-search
            option-filter-prop="label"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="学生" required>
          <StudentSelector
            v-model:value="singleAddStudentUserId"
            :class-id="singleAddClassId"
            :exam-id="selectedExamId"
            width="100%"
            @change="handleSingleStudentChange"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { CandidateRow } from './candidate-roster/types'
import type { ExamCandidateRosterRequest } from '@/apis/mark/exam'
import type { UserDto } from '@/types/api-types.d'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import UserAddOutlined from '@ant-design/icons-vue/UserAddOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadUserImportTemplate, tenantBatchImportUsers } from '@/apis/edu/admin-user'
import {
  getExamDetail,
  listExamCandidates,
  listExamClassOptions,
  mergeExamCandidates,
  previewExamCandidates,
  removeExamCandidates,
  saveExamClassScope,
} from '@/apis/mark/exam'
import BatchImportModal from '@/components/common/BatchImportModal.vue'
import ClassStudentTreeSelectorDrawer from '@/components/edu/ClassStudentTreeSelectorDrawer.vue'
import StudentSelector from '@/components/quality/selectors/StudentSelector.vue'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { RoleEnum } from '@/types/enums'
import { showUserError, toUserError } from '@/utils/error-handler'
import { toCandidateRow } from './candidate-roster/roster-merge'

defineOptions({ name: 'TeacherCandidateRoster' })

const route = useRoute()
const router = useRouter()
const setupDismissed = ref(false)

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const classIds = ref<string[]>([])
const classOptions = ref<Array<{ label: string, value: string }>>([])
const classOptionsLoading = ref(false)
const classScopeHydrating = ref(false)
const lastSavedClassIds = ref<string[]>([])
let classScopeSaveTimer: ReturnType<typeof setTimeout> | null = null

const candidates = reactive<CandidateRow[]>([])
const loading = ref(false)
const rosterLoadError = ref<Error | null>(null)
const removingStudentUserId = ref<string | null>(null)
const singleAddSubmitting = ref(false)

const selectDrawerOpen = ref(false)
const showImportModal = ref(false)
const singleAddOpen = ref(false)
const singleAddClassId = ref<string | undefined>(undefined)
const singleAddStudentUserId = ref<string | null>(null)
const singleAddStudent = ref<UserDto | null>(null)

const rosterStudentUserIds = computed(() => candidates.map((c) => c.studentUserId))
const showSetupGuide = computed(
  () => !setupDismissed.value && route.query.setup === '1' && Boolean(selectedExamId.value),
)

const importRequirements: string[] = [
  '请使用官方模板格式',
  '只保留姓名、学号、院系名称、班级名称四列',
  '学号不能重复；班级按院系名称匹配',
]

function dismissSetupGuide(): void {
  setupDismissed.value = true
  if (route.query.setup) {
    const { setup: _setup, ...rest } = route.query
    void router.replace({ query: rest })
  }
}

const columns: ColumnType<CandidateRow>[] = [
  { title: '考生', key: 'student', width: 220 },
  { title: '班级', key: 'className', width: 200 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' },
]

async function loadClassOptionsForExam(examId: string): Promise<void> {
  classOptionsLoading.value = true
  try {
    const list = await listExamClassOptions(examId)
    classOptions.value = list.map((item) => ({
      label: item.className,
      value: item.classId,
    }))
  } catch (error) {
    showUserError(error, '班级范围加载失败')
  } finally {
    classOptionsLoading.value = false
  }
}

async function loadRoster(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  loading.value = true
  rosterLoadError.value = null
  classScopeHydrating.value = true
  try {
    const [detail, list] = await Promise.all([
      getExamDetail(selectedExamId.value),
      listExamCandidates(selectedExamId.value),
    ])
    await loadClassOptionsForExam(selectedExamId.value)
    classIds.value = [...(detail.classIds ?? [])]
    lastSavedClassIds.value = [...classIds.value]
    candidates.splice(0, candidates.length)
    for (const item of list) {
      candidates.push(
        toCandidateRow(
          {
            studentNo: item.studentNo,
            studentName: item.studentName,
            studentUserId: item.studentUserId,
            classId: item.classId ?? '',
            className: item.className,
          },
          item.candidateRosterId,
        ),
      )
    }
  } catch (error) {
    rosterLoadError.value = toUserError(error, '考生名册加载失败')
    showUserError(error, '考生名册加载失败')
  } finally {
    classScopeHydrating.value = false
    loading.value = false
  }
}

function handleExamChange(
  value: SelectValue,
  option: DefaultOptionType | DefaultOptionType[],
): void {
  onExamChange(value, option)
  if (selectedExamId.value) {
    void loadRoster()
  } else {
    classIds.value = []
    candidates.splice(0, candidates.length)
    classOptions.value = []
  }
}

function openSelectDrawer(): void {
  if (!classIds.value.length) {
    message.warning('请先选择班级范围')
    return
  }
  selectDrawerOpen.value = true
}

function openBatchImportModal(): void {
  showImportModal.value = true
}

async function handleImportStudents(file: File) {
  return await tenantBatchImportUsers(file, RoleEnum.SCH_STU)
}

function handleDownloadImportTemplate(): void {
  void downloadUserImportTemplate(RoleEnum.SCH_STU)
}

function handleImportSuccess(): void {
  message.success('学生已导入租户库，请从学生库勾选后纳入本次考试名册')
  if (classIds.value.length) {
    selectDrawerOpen.value = true
    return
  }
  message.warning('请先选择班级范围后再从学生库勾选')
}

async function mergeCandidatesWithPreview(
  candidates: ExamCandidateRosterRequest[],
): Promise<number> {
  if (!selectedExamId.value || !candidates.length) {
    return 0
  }
  await previewExamCandidates({
    examId: selectedExamId.value,
    classIds: [...classIds.value],
    candidates,
  })
  await mergeExamCandidates({ examId: selectedExamId.value, candidates })
  return candidates.length
}

function buildMergeRequest(
  rows: Array<{ id: string, classId?: string }>,
): ExamCandidateRosterRequest[] {
  const existing = new Set(rosterStudentUserIds.value)
  const request: ExamCandidateRosterRequest[] = []
  for (const row of rows) {
    const studentUserId = row.id.trim()
    const classId = String(row.classId ?? '').trim()
    if (!studentUserId || !classId || existing.has(studentUserId)) {
      continue
    }
    request.push({ studentUserId, classId })
  }
  return request
}

async function handleStudentsSelected(selection: {
  students: string[]
  studentsInfo: Array<{
    id: string
    name: string
    classId?: string
    className?: string
    studentNumber?: string
  }>
}): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  const mergeRequest = buildMergeRequest(selection.studentsInfo)
  if (!mergeRequest.length) {
    message.warning('所选学生均已在名册中或缺少班级信息')
    return
  }
  loading.value = true
  try {
    const mergedCount = await mergeCandidatesWithPreview(mergeRequest)
    message.success(`已纳入 ${mergedCount} 名考生`)
    dismissSetupGuide()
    await loadRoster()
  } catch (error) {
    showUserError(error, '纳入考生失败')
  } finally {
    loading.value = false
  }
}

function openSingleAddModal(): void {
  singleAddClassId.value = classIds.value[0]
  singleAddStudentUserId.value = null
  singleAddStudent.value = null
  singleAddOpen.value = true
}

function handleSingleStudentChange(_userId: string | null, option?: UserDto): void {
  singleAddStudent.value = option ?? null
}

async function handleSingleAddSubmit(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  if (!singleAddClassId.value) {
    message.warning('请选择班级')
    return
  }
  const student = singleAddStudent.value
  if (!student?.id) {
    message.warning('请选择学生')
    return
  }
  const studentUserId = String(student.id).trim()
  if (rosterStudentUserIds.value.includes(studentUserId)) {
    message.warning('该学生已在名册中')
    return
  }
  singleAddSubmitting.value = true
  try {
    await mergeCandidatesWithPreview([{ classId: singleAddClassId.value, studentUserId }])
    message.success('已加入名册')
    singleAddOpen.value = false
    dismissSetupGuide()
    await loadRoster()
  } catch (error) {
    showUserError(error, '加入考生失败')
  } finally {
    singleAddSubmitting.value = false
  }
}

async function removeCandidate(studentUserId: string): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  removingStudentUserId.value = studentUserId
  try {
    await removeExamCandidates({
      examId: selectedExamId.value,
      studentUserIds: [studentUserId],
    })
    message.success('已移除')
    await loadRoster()
  } catch (error) {
    showUserError(error, '移除考生失败')
  } finally {
    removingStudentUserId.value = null
  }
}

watch(classIds, (ids) => {
  if (classScopeHydrating.value || !selectedExamId.value) {
    return
  }
  if (classScopeSaveTimer) {
    clearTimeout(classScopeSaveTimer)
  }
  const previous = [...lastSavedClassIds.value]
  classScopeSaveTimer = setTimeout(() => {
    void saveExamClassScope({
      examId: selectedExamId.value!,
      classIds: [...ids],
    })
      .then(async () => {
        lastSavedClassIds.value = [...ids]
        await loadRoster()
      })
      .catch((error) => {
        classScopeHydrating.value = true
        classIds.value = [...previous]
        classScopeHydrating.value = false
        showUserError(error, '保存班级范围失败')
      })
  }, 400)
})

watch(selectedExamId, (value) => {
  if (value) {
    void loadRoster()
  } else {
    classIds.value = []
    candidates.splice(0, candidates.length)
    classOptions.value = []
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadRoster()
  }
})
</script>

<style lang="scss" scoped>
.roster-setup-guide {
  margin-bottom: 12px;
}

.roster-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: 60px 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.info-card {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  &__hint {
    margin-bottom: 12px;
  }

  &__class-select {
    width: 100%;
  }
}

.roster-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.roster-summary {
  margin-top: 12px;
  font-size: 13px;
  color: var(--ant-color-text-secondary);
  text-align: right;
}

.roster-cell--muted {
  color: var(--ant-color-text-secondary);
}

.roster-student {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__name {
    font-weight: 500;
    color: var(--ant-color-text);
  }

  &__no {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }
}
</style>
