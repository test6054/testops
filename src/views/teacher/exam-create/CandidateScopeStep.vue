<template>
  <section id="exam-create-candidates" class="form-section exam-create-form">
    <header class="section-header">
      <h2 class="section-title">考生范围</h2>
      <div
        v-if="rosterForm.scopeMode === ExamRosterScopeModeCode.BY_STUDENT"
        class="section-actions"
      >
        <UiButton size="sm" variant="outline" @click="openStudentDrawer"> 按学生选择 </UiButton>
      </div>
    </header>
    <p class="section-desc">选择参考班级与纳入方式；创建后仍可在工作台名册中调整。</p>

    <UiAlertStrip
      v-if="rosterPreviewError"
      tone="warning"
      title="名册预览失败"
      :description="rosterPreviewError"
      closable
      class="exam-create-form__preview-error"
      @close="rosterPreviewError = ''"
    />

    <a-form
      ref="formRef"
      :model="rosterForm"
      :rules="rosterRules"
      layout="vertical"
      class="exam-create-form__body"
    >
      <div class="exam-create-form__grid exam-create-form__grid--single">
        <a-form-item label="纳入方式" name="scopeMode">
          <a-segmented
            :value="rosterForm.scopeMode"
            :options="scopeModeOptions"
            block
            @change="handleScopeModeChange"
          />
        </a-form-item>
        <a-form-item label="院系" required>
          <a-select
            v-model:value="departmentId"
            placeholder="请选择院系"
            :options="departmentOptions"
            :loading="departmentLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="参考班级" name="classIds">
          <a-select
            v-model:value="rosterForm.classIds"
            mode="multiple"
            :placeholder="departmentId ? '选择参考班级（可多选）' : '请先选择院系'"
            :options="classSelectOptions"
            :loading="classOptionsLoading"
            :disabled="!departmentId"
            show-search
            option-filter-prop="label"
            allow-clear
            style="width: 100%"
          />
          <div class="exam-create-form__hint">
            <template v-if="rosterForm.scopeMode === ExamRosterScopeModeCode.BY_CLASS">
              正考场景：按院系选择班级后自动纳入该班全部在籍学生；可切换院系继续添加班级。
            </template>
            <template v-else>
              补考或部分考生：按院系选择班级后自动列出在籍学生，可移除不参加本场考试的学生，或通过「按学生选择」追加。
            </template>
          </div>
        </a-form-item>
      </div>
    </a-form>

    <UiEmpty
      v-if="!rosterForm.candidates.length && !classOptionsLoading"
      :description="emptyDescription"
    />
    <UiDataTable
      v-else
      :columns="columns"
      :data-source="rosterForm.candidates"
      :loading="classOptionsLoading || classScopeSyncing"
      row-key="studentUserId"
      size="middle"
      flat
      pagination-mode="client"
      class="candidate-preview-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'student'">
          <div class="roster-student">
            <span class="roster-student__name">{{ record.studentName }}</span>
            <span class="roster-student__no">{{ record.studentNo }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'className'">
          <span class="roster-cell roster-cell--muted">{{ record.className }}</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            v-if="rosterForm.scopeMode === ExamRosterScopeModeCode.BY_STUDENT"
            :items="[{ key: 'remove', label: '移除', tone: 'danger' }]"
            split
            @action="() => emit('remove-candidate', record.studentUserId)"
          />
          <span v-else class="roster-cell roster-cell--muted">整班纳入</span>
        </template>
      </template>
    </UiDataTable>

    <ClassStudentTreeSelectorDrawer
      v-model="studentDrawerOpen"
      title="选择考试考生"
      :allowed-class-ids="rosterForm.classIds"
      :excluded-student-ids="selectedStudentIds"
      @confirm="handleStudentsSelected"
    />
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamCandidateResponse } from '@/apis/mark/exam-scope'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, ref, toRef, watch } from 'vue'
import {
  EXAM_ROSTER_SCOPE_MODE_OPTIONS,
  ExamRosterScopeModeCode,
  previewCreateExamRoster,
} from '@/apis/mark/exam'
import ClassStudentTreeSelectorDrawer from '@/components/edu/ClassStudentTreeSelectorDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { useExamDepartmentClassScope } from '@/composables/useExamDepartmentClassScope'
import { readBusinessResultCode, showUserError } from '@/utils/error-handler'
import { useInjectedExamCreateRosterForm } from './exam-create-context'
import {
  buildRosterRequestsFromDrawerSelection,
  mergePreviewCandidates,
  requirePreviewCandidates,
} from './exam-create-roster'

defineProps<{
  rosterRules: Record<string, Rule[]>
}>()

const emit = defineEmits<{
  'update:roster-form-ref': [ref: FormInstance | undefined]
  'change-scope-mode': [mode: ExamRosterScopeModeCode]
  'sync-class-scope': [candidates: ExamCandidateResponse[], classIds: string[]]
  'roster-preview-syncing': [syncing: boolean]
  'add-candidates': [candidates: ExamCandidateResponse[]]
  'remove-candidate': [studentUserId: string]
}>()
const rosterForm = useInjectedExamCreateRosterForm()

const formRef = ref<FormInstance>()
const studentDrawerOpen = ref(false)
const classScopeSyncing = ref(false)
const rosterPreviewError = ref('')
let classScopeSyncSeq = 0
let studentPreviewSeq = 0
/** 上次已同步的参考班级，用于 BY_STUDENT 仅拉取新增班级学生，避免覆盖手动移除。 */
let trackedClassIds: string[] = []

const {
  departmentId,
  departmentLoading,
  departmentOptions,
  classOptionsLoading,
  classSelectOptions,
  loadDepartments,
} = useExamDepartmentClassScope({
  selectedClassIds: toRef(rosterForm, 'classIds'),
})

watch(departmentId, (id) => {
  rosterForm.referenceDepartmentId = id
})

const scopeModeOptions = EXAM_ROSTER_SCOPE_MODE_OPTIONS

const selectedStudentIds = computed(() => rosterForm.candidates.map((row) => row.studentUserId))

const emptyDescription = computed(() => {
  if (rosterForm.scopeMode === ExamRosterScopeModeCode.BY_CLASS) {
    return '选择参考班级后将自动纳入全部在籍学生'
  }
  if (rosterForm.classIds.length > 0) {
    return classScopeSyncing.value ? '正在加载所选班级学生…' : '所选班级暂无在籍学生'
  }
  return '选择参考班级后将自动列出在籍学生'
})

const columns: ColumnType<ExamCandidateResponse>[] = [
  { title: '考生', key: 'student', dataIndex: 'studentName' },
  { title: '班级', key: 'className', dataIndex: 'className', width: 180 },
  { title: '操作', key: 'actions', width: 88, align: 'center' },
]

/** 名册预览失败时仅在校验类错误（400）下清空已选班级；权限/服务类错误保留选择便于重试。 */
function shouldClearClassScopeOnPreviewError(error: unknown): boolean {
  return readBusinessResultCode(error) === 400
}

async function loadClassOptions(): Promise<void> {
  await loadDepartments()
}

function handleScopeModeChange(val: string | number): void {
  if (val !== ExamRosterScopeModeCode.BY_CLASS && val !== ExamRosterScopeModeCode.BY_STUDENT) {
    throw new Error(`无效考生纳入模式: ${String(val)}`)
  }
  const mode: ExamRosterScopeModeCode = val
  if (mode === rosterForm.scopeMode) return
  const hasDraft = rosterForm.candidates.length > 0 || rosterForm.classIds.length > 0
  if (!hasDraft) {
    emit('change-scope-mode', mode)
    return
  }
  Modal.confirm({
    title: '切换纳入方式',
    content: '切换后将清空已选参考班级与考生预览，是否继续？',
    okText: '继续切换',
    cancelText: '取消',
    onOk: () => emit('change-scope-mode', mode),
  })
}

function openStudentDrawer(): void {
  if (!rosterForm.classIds.length) {
    message.warning('请先选择参考班级')
    return
  }
  studentDrawerOpen.value = true
}

function isSameClassIdSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  const leftSet = new Set(left)
  return right.every((id) => leftSet.has(id))
}

function syncByClassScope(addedClassIds: string[]): void {
  if (classScopeSyncing.value) return
  const classIds = [...rosterForm.classIds]
  const syncSeq = ++classScopeSyncSeq
  if (!classIds.length) {
    trackedClassIds = []
    classScopeSyncing.value = false
    rosterPreviewError.value = ''
    emit('roster-preview-syncing', false)
    if (rosterForm.candidates.length > 0) {
      emit('sync-class-scope', [], [])
    }
    return
  }
  const scopeMode = rosterForm.scopeMode
  if (scopeMode === ExamRosterScopeModeCode.BY_STUDENT && addedClassIds.length === 0) {
    return
  }
  const fetchClassIds = scopeMode === ExamRosterScopeModeCode.BY_CLASS ? classIds : addedClassIds
  classScopeSyncing.value = true
  rosterPreviewError.value = ''
  emit('roster-preview-syncing', true)
  void previewCreateExamRoster({
    scopeMode: ExamRosterScopeModeCode.BY_CLASS,
    classIds: fetchClassIds,
  })
    .then((preview) => {
      if (syncSeq !== classScopeSyncSeq) return
      const previewCandidates = requirePreviewCandidates(preview.candidates)
      const nextCandidates =
        scopeMode === ExamRosterScopeModeCode.BY_CLASS
          ? previewCandidates
          : mergePreviewCandidates(rosterForm.candidates, previewCandidates)
      emit('sync-class-scope', nextCandidates, [...classIds])
    })
    .catch((error) => {
      if (syncSeq !== classScopeSyncSeq) return
      const message = error instanceof Error ? error.message : '名册预览失败'
      rosterPreviewError.value = shouldClearClassScopeOnPreviewError(error)
        ? `${message}。参考班级已清空，请重新选择。`
        : `${message}。请稍后重试或重新选择班级。`
      showUserError(error, '名册预览失败')
      if (shouldClearClassScopeOnPreviewError(error)) {
        emit('sync-class-scope', [], [])
      }
    })
    .finally(() => {
      if (syncSeq !== classScopeSyncSeq) return
      classScopeSyncing.value = false
      emit('roster-preview-syncing', false)
      if (!isSameClassIdSet(classIds, rosterForm.classIds)) {
        const pendingAddedClassIds = rosterForm.classIds.filter(
          (id) => !trackedClassIds.includes(id),
        )
        syncByClassScope(pendingAddedClassIds)
      }
    })
}

function handleStudentsSelected(data: {
  students: string[]
  studentsInfo: Array<{
    id: string
    name: string
    classId?: string
    className?: string
    studentNumber?: string
  }>
}): void {
  const rosterRequests = buildRosterRequestsFromDrawerSelection(data.studentsInfo)
  if (!rosterRequests?.length) {
    void message.error('所选学生缺少班级或姓名信息，无法纳入')
    return
  }
  const syncSeq = ++studentPreviewSeq
  rosterPreviewError.value = ''
  emit('roster-preview-syncing', true)
  void previewCreateExamRoster({
    scopeMode: ExamRosterScopeModeCode.BY_STUDENT,
    classIds: rosterForm.classIds,
    candidates: rosterRequests,
  })
    .then((preview) => {
      if (syncSeq !== studentPreviewSeq) return
      rosterPreviewError.value = ''
      emit('add-candidates', requirePreviewCandidates(preview.candidates))
    })
    .catch((error) => {
      if (syncSeq !== studentPreviewSeq) return
      const message = error instanceof Error ? error.message : '名册预览失败'
      rosterPreviewError.value = `${message}。请重新选择考生后重试。`
      showUserError(error, '名册预览失败')
    })
    .finally(() => {
      if (syncSeq !== studentPreviewSeq) return
      emit('roster-preview-syncing', false)
    })
}

watch(
  () => rosterForm.scopeMode,
  () => {
    trackedClassIds = []
    studentPreviewSeq += 1
  },
)

watch(
  () => `${rosterForm.scopeMode}:${[...rosterForm.classIds].sort().join(',')}`,
  () => {
    if (classScopeSyncing.value) return
    const currentClassIds = [...rosterForm.classIds]
    const addedClassIds = currentClassIds.filter((id) => !trackedClassIds.includes(id))
    trackedClassIds = [...currentClassIds]
    syncByClassScope(addedClassIds)
  },
)

onMounted(() => {
  emit('update:roster-form-ref', formRef.value)
  void loadClassOptions()
})

watch(formRef, (value) => {
  emit('update:roster-form-ref', value)
})
</script>

<style scoped lang="scss">
.section-actions {
  display: flex;
  gap: 8px;
}

.exam-create-form__hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #64748b);
}

.exam-create-form__preview-error {
  margin-bottom: 16px;
}

.candidate-preview-table {
  margin-top: 16px;
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
    color: var(--dp-text-secondary, #64748b);
  }
}

.roster-cell--muted {
  color: var(--dp-text-secondary, #64748b);
}
</style>
