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
          <UiTag v-if="selectedExamId && pendingCount > 0" tone="orange" size="sm">
            待保存 {{ pendingCount }}
          </UiTag>
        </div>
        <div class="roster-page__context-right">
          <UiButton size="sm" :disabled="!selectedExamId" :loading="saving" @click="handleSave">
            <template #icon><SaveOutlined /></template>
            保存名册
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty v-if="!selectedExamId" description="请选择需要维护的考试" class="roster-page__empty" />

    <UiErrorRetryPanel
      v-else-if="rosterLoadError"
      :error="rosterLoadError"
      title="考生名册加载失败"
      :helper="`考试 ID：${selectedExamId}`"
      @retry="loadRoster"
    />

    <a-spin v-else :spinning="loading">
      <UiAlertStrip
        v-if="showSetupGuide"
        type="info"
        title="请完成考生名册配置"
        description="① 选择参考班级 → ② 从学生库勾选、按班级同步，或 Excel 导入后同步 → ③ 保存名册"
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
          message="先选定参考班级；可从学生库勾选、按班级同步，或使用官方 Excel 模板导入租户学生库后再同步入名册（不支持表格复制粘贴）。"
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
            <UiButton size="sm" variant="outline" @click="showImportModal = true">
              <template #icon><UploadOutlined /></template>
              导入学生 Excel
            </UiButton>
            <UiButton
              size="sm"
              variant="outline"
              :disabled="!classIds.length"
              :loading="loading"
              @click="syncStudentsFromClassScope"
            >
              同步班级考生
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
                {{ displayClassName(record as CandidateRow) }}
              </span>
            </template>
            <template v-else-if="column.key === 'serverStatus'">
              <UiTag v-if="(record as CandidateRow).candidateRosterId" tone="green" size="sm">
                已保存
              </UiTag>
              <UiTag v-else tone="orange" size="sm">待保存</UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                size="sm"
                variant="ghost"
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
      @download-template="handleDownloadTemplate"
      @success="handleImportSuccess"
    />

    <a-modal
      v-model:open="singleAddOpen"
      title="添加考生"
      ok-text="加入名册"
      :destroy-on-close="true"
      width="520px"
      @ok="handleSingleAddSubmit"
    >
      <a-form layout="vertical">
        <a-form-item label="班级" required>
          <ClassSelector v-model:value="singleAddClassId" width="100%" />
        </a-form-item>
        <a-form-item label="学生" required>
          <StudentSelector
            v-model:value="singleAddStudentUserId"
            :class-id="singleAddClassId"
            width="100%"
            @change="handleSingleStudentChange"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { CandidateRow } from './candidate-roster/types'
import type { ExamCandidateRosterPayload } from '@/apis/mark/exam'
import type { UserDto } from '@/types/api-types.d'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import UserAddOutlined from '@ant-design/icons-vue/UserAddOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadUserImportTemplate, tenantBatchImportUsers } from '@/apis/edu/admin-user'
import { getAllClasses } from '@/apis/edu/class'
import { getExamDetail, listExamCandidates, saveExamScope } from '@/apis/mark/exam'
import BatchImportModal from '@/components/common/BatchImportModal.vue'
import ClassStudentTreeSelectorDrawer from '@/components/edu/ClassStudentTreeSelectorDrawer.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
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
import { RoleEnum } from '@/utils/permission'
import {
  mergeCandidateDrafts,
  removeCandidateByUserId,
  toCandidateRow,
} from './candidate-roster/roster-merge'
import { loadStudentDraftsFromClasses } from './candidate-roster/roster-sync'

defineOptions({ name: 'TeacherCandidateRoster' })

const route = useRoute()
const router = useRouter()
const setupDismissed = ref(false)

const importRequirements = [
  '请使用官方学生导入模板',
  '必填：姓名、学号、院系名称、班级名称；专业名称选填',
  '学号在租户内不可重复；导入成功后请再执行「同步班级考生」',
]

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const classIds = ref<string[]>([])
const classOptions = ref<Array<{ label: string, value: string }>>([])
const classOptionsLoading = ref(false)
const classNameById = ref<Record<string, string>>({})

const candidates = reactive<CandidateRow[]>([])
const loading = ref(false)
const saving = ref(false)
const rosterLoadError = ref<unknown>(null)

const selectDrawerOpen = ref(false)
const showImportModal = ref(false)
const singleAddOpen = ref(false)
const singleAddClassId = ref<string | null>(null)
const singleAddStudentUserId = ref<string | null>(null)
const singleAddStudent = ref<UserDto | null>(null)

const pendingCount = computed(() => candidates.filter((c) => !c.candidateRosterId).length)
const rosterStudentUserIds = computed(() => candidates.map((c) => c.studentUserId))
const showSetupGuide = computed(
  () => !setupDismissed.value && route.query.setup === '1' && Boolean(selectedExamId.value),
)

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
  { title: '名册状态', key: 'serverStatus', width: 96 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' },
]

function displayClassName(row: CandidateRow): string {
  if (row.className) {
    return row.className
  }
  if (row.classId && classNameById.value[row.classId]) {
    return classNameById.value[row.classId]
  }
  return row.classId ? `班级 ${row.classId}` : '—'
}

async function loadClassOptions(): Promise<void> {
  classOptionsLoading.value = true
  try {
    const list = await getAllClasses()
    const nameMap: Record<string, string> = {}
    classOptions.value = (list ?? [])
      .filter((item) => item.id)
      .map((item) => {
        const id = String(item.id)
        const label = item.className ?? id
        nameMap[id] = item.className ?? id
        return { label, value: id }
      })
    classNameById.value = nameMap
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载班级列表失败')
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
  try {
    const [detail, list] = await Promise.all([
      getExamDetail(selectedExamId.value),
      listExamCandidates(selectedExamId.value),
    ])
    classIds.value = [...(detail.classIds ?? [])]
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
    rosterLoadError.value = error
    message.error(error instanceof Error ? error.message : '加载名册失败')
  } finally {
    loading.value = false
  }
}

function handleExamChange(value: unknown, option: unknown): void {
  onExamChange(value as never, option as never)
  if (selectedExamId.value) {
    void loadRoster()
  } else {
    classIds.value = []
    candidates.splice(0, candidates.length)
  }
}

function openSelectDrawer(): void {
  if (!classIds.value.length) {
    message.warning('请先选择班级范围')
    return
  }
  selectDrawerOpen.value = true
}

function handleStudentsSelected(payload: {
  students: string[]
  studentsInfo: Array<{
    id: string
    name: string
    classId?: string
    className?: string
    studentNumber?: string
  }>
}): void {
  const drafts = payload.studentsInfo.map((info) => ({
    studentUserId: info.id,
    studentName: info.name,
    studentNo: info.studentNumber ?? '',
    classId: info.classId ?? '',
    className: info.className,
  }))
  const { rows, added, skipped } = mergeCandidateDrafts([...candidates], drafts)
  candidates.splice(0, candidates.length, ...rows)
  if (added > 0) {
    message.success(`已加入 ${added} 名考生${skipped ? `，${skipped} 名已在名册中` : ''}`)
  } else {
    message.warning('所选学生均已在名册中')
  }
}

async function handleImportStudents(file: File) {
  return tenantBatchImportUsers(file, RoleEnum.SCH_STU)
}

function handleDownloadTemplate(): void {
  void downloadUserImportTemplate(RoleEnum.SCH_STU)
}

async function handleImportSuccess(): Promise<void> {
  if (!classIds.value.length) {
    message.info('学生已导入租户库；请选择班级范围后点击「同步班级考生」或从学生库勾选')
    return
  }
  await syncStudentsFromClassScope()
}

async function syncStudentsFromClassScope(): Promise<void> {
  if (!classIds.value.length) {
    message.warning('请先选择班级范围')
    return
  }
  loading.value = true
  try {
    const drafts = await loadStudentDraftsFromClasses(classIds.value)
    const { rows, added, skipped } = mergeCandidateDrafts([...candidates], drafts)
    candidates.splice(0, candidates.length, ...rows)
    if (added > 0) {
      message.success(`已同步 ${added} 名考生${skipped ? `，${skipped} 名已在名册中` : ''}`)
    } else {
      message.warning('班级范围内没有可加入的新考生')
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '同步班级考生失败')
  } finally {
    loading.value = false
  }
}

function openSingleAddModal(): void {
  singleAddClassId.value = classIds.value[0] ?? null
  singleAddStudentUserId.value = null
  singleAddStudent.value = null
  singleAddOpen.value = true
}

function handleSingleStudentChange(_userId: string | null, option?: UserDto): void {
  singleAddStudent.value = option ?? null
}

function handleSingleAddSubmit(): void {
  if (!singleAddClassId.value) {
    message.warning('请选择班级')
    return
  }
  const student = singleAddStudent.value
  if (!student?.id) {
    message.warning('请选择学生')
    return
  }
  const studentNo = String(student.studentNumber ?? student.stuId ?? '').trim()
  const studentName = String(student.nickName ?? '').trim()
  if (!studentNo || !studentName) {
    message.error('所选学生缺少学号或姓名，请先在学生管理中完善')
    return
  }
  const { rows, added } = mergeCandidateDrafts(
    [...candidates],
    [
      {
        studentUserId: String(student.id),
        studentNo,
        studentName,
        classId: singleAddClassId.value,
        className: student.className,
      },
    ],
  )
  if (added === 0) {
    message.warning('该学生已在名册中')
    return
  }
  candidates.splice(0, candidates.length, ...rows)
  message.success('已加入名册')
  singleAddOpen.value = false
}

function removeCandidate(studentUserId: string): void {
  const next = removeCandidateByUserId([...candidates], studentUserId)
  candidates.splice(0, candidates.length, ...next)
}

function validateAndBuildPayload(): ExamCandidateRosterPayload[] | null {
  const payload: ExamCandidateRosterPayload[] = []
  const seenNo = new Set<string>()
  for (let i = 0; i < candidates.length; i += 1) {
    const row = candidates[i]
    const no = row.studentNo.trim()
    const name = row.studentName.trim()
    const userId = row.studentUserId.trim()
    const classId = row.classId.trim()
    if (!no || !name || !userId) {
      message.error(`第 ${i + 1} 行：学号、姓名不能为空`)
      return null
    }
    if (!/^\d+$/.test(userId)) {
      message.error(`第 ${i + 1} 行：学生主键无效，请从学生库重新选择`)
      return null
    }
    if (classId && !/^\d+$/.test(classId)) {
      message.error(`第 ${i + 1} 行：班级 ID 无效`)
      return null
    }
    if (seenNo.has(no)) {
      message.error(`第 ${i + 1} 行：学号 ${no} 重复`)
      return null
    }
    seenNo.add(no)
    payload.push({
      studentNo: no,
      studentName: name,
      studentUserId: userId,
      classId: classId || undefined,
    })
  }
  return payload
}

async function handleSave(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  const candidatePayload = validateAndBuildPayload()
  if (candidatePayload === null) {
    return
  }
  saving.value = true
  try {
    await saveExamScope({
      examId: selectedExamId.value,
      classIds: classIds.value.length ? [...classIds.value] : undefined,
      candidates: candidatePayload.length ? candidatePayload : undefined,
    })
    message.success('名册已保存')
    dismissSetupGuide()
    await loadRoster()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存名册失败')
  } finally {
    saving.value = false
  }
}

watch(selectedExamId, (value) => {
  if (value) {
    void loadRoster()
  } else {
    classIds.value = []
    candidates.splice(0, candidates.length)
  }
})

onMounted(async () => {
  await Promise.all([initExamSelector(), loadClassOptions()])
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

  &__context-right {
    flex-shrink: 0;
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
