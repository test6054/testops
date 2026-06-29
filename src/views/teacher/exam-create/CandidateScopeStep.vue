<template>
  <section id="exam-create-candidates" class="form-section exam-create-form">
    <header class="section-header">
      <h2 class="section-title">考生范围</h2>
      <div v-if="rosterForm.scopeMode === 'BY_STUDENT'" class="section-actions">
        <UiButton size="sm" variant="outline" @click="openStudentDrawer">
          按学生选择
        </UiButton>
      </div>
    </header>

    <a-form ref="formRef" :model="rosterForm" :rules="rosterRules" layout="vertical">
      <a-form-item label="纳入方式" name="scopeMode">
        <a-segmented
          :value="rosterForm.scopeMode"
          :options="scopeModeOptions"
          block
          @change="handleScopeModeChange"
        />
      </a-form-item>
      <a-form-item label="参考班级" name="classIds">
        <a-select
          v-model:value="rosterForm.classIds"
          mode="multiple"
          placeholder="选择参考班级（可多选）"
          :options="classSelectOptions"
          :loading="classTreeLoading"
          show-search
          option-filter-prop="label"
          allow-clear
          style="width: 100%"
        />
        <div class="exam-create-form__hint">
          <template v-if="rosterForm.scopeMode === 'BY_CLASS'">
            正考场景：选择班级后自动纳入该班全部在籍学生；创建后仍可在工作台名册中编辑。
          </template>
          <template v-else>
            补考或部分考生：先选参考班级，再通过「按学生选择」精确勾选；创建后仍可在工作台名册中编辑。
          </template>
        </div>
      </a-form-item>
    </a-form>

    <UiEmpty
      v-if="!rosterForm.candidates.length && !classTreeLoading"
      :description="emptyDescription"
    />
    <UiDataTable
      v-else
      :columns="columns"
      :data-source="rosterForm.candidates"
      :loading="classTreeLoading || classScopeSyncing"
      row-key="studentUserId"
      size="middle"
      flat
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
          <button
            v-if="rosterForm.scopeMode === 'BY_STUDENT'"
            type="button"
            class="op-link op-link--danger"
            @click="emit('remove-candidate', record.studentUserId)"
          >
            移除
          </button>
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
import type { ColumnType } from 'ant-design-vue/es/table'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ClassStudentTreeNode } from '@/apis/edu/class'
import type { ExamRosterScopeMode } from '@/apis/mark/exam'
import type { ExamCreateCandidateRow, ExamRosterForm } from './useExamCreate'
import { EXAM_ROSTER_SCOPE_MODE_LABEL } from './useExamCreate'
import { computed, onMounted, ref, watch } from 'vue'
import { Modal } from 'ant-design-vue'
import message from 'ant-design-vue/es/message'
import { getClassStudentTree } from '@/apis/edu/class'
import ClassStudentTreeSelectorDrawer from '@/components/edu/ClassStudentTreeSelectorDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { previewCreateExamRoster } from '@/apis/mark/exam'
import { showUserError } from '@/utils/error-handler'
import { mergeCandidateRows, mapSelectedStudentsToCandidateRows } from './candidate-tree-utils'

const props = defineProps<{
  rosterForm: ExamRosterForm
  rosterRules: Record<string, Rule[]>
}>()

const emit = defineEmits<{
  'update:roster-form-ref': [ref: FormInstance | undefined]
  'change-scope-mode': [mode: ExamRosterScopeMode]
  'sync-class-scope': [rows: ExamCreateCandidateRow[], classIds: string[]]
  'add-candidates': [rows: ExamCreateCandidateRow[]]
  'remove-candidate': [studentUserId: string]
}>()

const formRef = ref<FormInstance>()
const classTreeLoading = ref(false)
const classTree = ref<ClassStudentTreeNode[]>([])
const studentDrawerOpen = ref(false)
const classScopeSyncing = ref(false)

const scopeModeOptions = [
  { label: EXAM_ROSTER_SCOPE_MODE_LABEL.BY_CLASS, value: 'BY_CLASS' as const },
  { label: EXAM_ROSTER_SCOPE_MODE_LABEL.BY_STUDENT, value: 'BY_STUDENT' as const },
]

const classSelectOptions = computed(() => flattenClassOptions(classTree.value))
const selectedStudentIds = computed(() => props.rosterForm.candidates.map(row => row.studentUserId))

const emptyDescription = computed(() => {
  if (props.rosterForm.scopeMode === 'BY_CLASS') {
    return '选择参考班级后将自动纳入全部在籍学生'
  }
  return '选择参考班级后，通过「按学生选择」纳入补考或部分考生'
})

const columns: ColumnType[] = [
  { title: '考生', key: 'student', dataIndex: 'studentName' },
  { title: '班级', key: 'className', dataIndex: 'className', width: 180 },
  { title: '操作', key: 'actions', width: 88, align: 'center' },
]

async function loadClassTree(): Promise<void> {
  classTreeLoading.value = true
  try {
    classTree.value = await getClassStudentTree()
  } catch (error) {
    showUserError(error, '班级学生树加载失败')
  } finally {
    classTreeLoading.value = false
  }
}

function handleScopeModeChange(mode: ExamRosterScopeMode): void {
  if (mode === props.rosterForm.scopeMode) return
  const hasDraft = props.rosterForm.candidates.length > 0 || props.rosterForm.classIds.length > 0
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
  if (!props.rosterForm.classIds.length) {
    message.warning('请先选择参考班级')
    return
  }
  studentDrawerOpen.value = true
}

function syncByClassScope(): void {
  if (props.rosterForm.scopeMode !== 'BY_CLASS' || classScopeSyncing.value) return
  const classIds = props.rosterForm.classIds
  if (!classIds.length) {
    emit('sync-class-scope', [], [])
    return
  }
  classScopeSyncing.value = true
  void previewCreateExamRoster({
    scopeMode: 'BY_CLASS',
    classIds,
  })
    .then((preview) => {
      const rows: ExamCreateCandidateRow[] = preview.candidates.map(candidate => ({
        studentUserId: String(candidate.studentUserId),
        classId: String(candidate.classId),
        className: candidate.className ?? '',
        studentNo: candidate.studentNo ?? '',
        studentName: candidate.studentName ?? '',
      }))
      emit('sync-class-scope', rows, [...classIds])
    })
    .catch((error) => {
      showUserError(error, '名册预览失败')
      emit('sync-class-scope', [], [...classIds])
    })
    .finally(() => {
      classScopeSyncing.value = false
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
  const rows = mapSelectedStudentsToCandidateRows(data.studentsInfo)
  if (!rows?.length) {
    message.error('所选学生缺少班级或姓名信息，无法纳入')
    return
  }
  emit('add-candidates', rows)
}

watch(
  () => [props.rosterForm.scopeMode, props.rosterForm.classIds] as const,
  () => syncByClassScope(),
  { deep: true },
)

onMounted(() => {
  emit('update:roster-form-ref', formRef.value)
  void loadClassTree()
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
