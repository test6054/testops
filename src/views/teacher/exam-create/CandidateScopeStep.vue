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

    <UiAlertStrip
      v-if="rosterPreviewError"
      tone="warning"
      title="名册预览失败"
      :description="rosterPreviewError"
      closable
      class="exam-create-form__preview-error"
      @close="rosterPreviewError = ''"
    />

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
          :loading="classOptionsLoading"
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
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamRosterScopeMode } from '@/apis/mark/exam'
import type { ExamCandidateVO } from '@/apis/mark/exam-scope'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { listCreateExamClassOptions, previewCreateExamRoster } from '@/apis/mark/exam'
import ClassStudentTreeSelectorDrawer from '@/components/edu/ClassStudentTreeSelectorDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { readBusinessResultCode, showUserError } from '@/utils/error-handler'
import {
  EXAM_ROSTER_SCOPE_MODE_LABEL,
  useInjectedExamCreateRosterForm,
} from './exam-create-context'
import {
  buildRosterRequestsFromDrawerSelection,
  requirePreviewCandidates,
} from './exam-create-roster'

defineProps<{
  rosterRules: Record<string, Rule[]>
}>()

const emit = defineEmits<{
  'update:roster-form-ref': [ref: FormInstance | undefined]
  'change-scope-mode': [mode: ExamRosterScopeMode]
  'sync-class-scope': [candidates: ExamCandidateVO[], classIds: string[]]
  'roster-preview-syncing': [syncing: boolean]
  'add-candidates': [candidates: ExamCandidateVO[]]
  'remove-candidate': [studentUserId: string]
}>()
const rosterForm = useInjectedExamCreateRosterForm()

const formRef = ref<FormInstance>()
const classOptionsLoading = ref(false)
const classSelectOptions = ref<Array<{ label: string, value: string }>>([])
const studentDrawerOpen = ref(false)
const classScopeSyncing = ref(false)
const rosterPreviewError = ref('')
let classScopeSyncSeq = 0
let studentPreviewSeq = 0

const scopeModeOptions: Array<{ label: string, value: ExamRosterScopeMode }> = [
  { label: EXAM_ROSTER_SCOPE_MODE_LABEL.BY_CLASS, value: 'BY_CLASS' },
  { label: EXAM_ROSTER_SCOPE_MODE_LABEL.BY_STUDENT, value: 'BY_STUDENT' },
]

const selectedStudentIds = computed(() => rosterForm.candidates.map(row => row.studentUserId))

const emptyDescription = computed(() => {
  if (rosterForm.scopeMode === 'BY_CLASS') {
    return '选择参考班级后将自动纳入全部在籍学生'
  }
  return '选择参考班级后，通过「按学生选择」纳入补考或部分考生'
})

const columns: ColumnType<ExamCandidateVO>[] = [
  { title: '考生', key: 'student', dataIndex: 'studentName' },
  { title: '班级', key: 'className', dataIndex: 'className', width: 180 },
  { title: '操作', key: 'actions', width: 88, align: 'center' },
]

/** 名册预览业务失败（权限/校验）时清空已选班级；网络等瞬时错误保留选择。 */
function shouldClearClassScopeOnPreviewError(error: unknown): boolean {
  const code = readBusinessResultCode(error)
  return code === 403 || code === 400
}

async function loadClassOptions(): Promise<void> {
  classOptionsLoading.value = true
  try {
    const options = await listCreateExamClassOptions()
    classSelectOptions.value = options.map(option => ({
      label: option.className,
      value: option.classId,
    }))
  } catch (error) {
    classSelectOptions.value = []
    showUserError(error, '参考班级加载失败')
  } finally {
    classOptionsLoading.value = false
  }
}

function handleScopeModeChange(val: string | number): void {
  if (val !== 'BY_CLASS' && val !== 'BY_STUDENT') {
    throw new Error(`无效考生纳入模式: ${String(val)}`)
  }
  const mode: ExamRosterScopeMode = val
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
  return right.every(id => leftSet.has(id))
}

function syncByClassScope(): void {
  if (rosterForm.scopeMode !== 'BY_CLASS') {
    classScopeSyncing.value = false
    rosterPreviewError.value = ''
    emit('roster-preview-syncing', false)
    return
  }
  const classIds = rosterForm.classIds
  const syncSeq = ++classScopeSyncSeq
  if (!classIds.length) {
    classScopeSyncing.value = false
    rosterPreviewError.value = ''
    emit('roster-preview-syncing', false)
    emit('sync-class-scope', [], [])
    return
  }
  classScopeSyncing.value = true
  rosterPreviewError.value = ''
  emit('roster-preview-syncing', true)
  emit('sync-class-scope', [], [...classIds])
  void previewCreateExamRoster({
    scopeMode: 'BY_CLASS',
    classIds,
  })
    .then((preview) => {
      if (syncSeq !== classScopeSyncSeq) return
      emit('sync-class-scope', requirePreviewCandidates(preview.candidates), [...classIds])
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
        syncByClassScope()
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
    scopeMode: 'BY_STUDENT',
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
    studentPreviewSeq += 1
  },
)

watch(
  [() => rosterForm.scopeMode, () => rosterForm.classIds],
  () => syncByClassScope(),
  { deep: true },
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
