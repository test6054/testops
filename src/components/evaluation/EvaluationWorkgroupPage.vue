<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { TeacherUserInfoDto } from '@/apis/platform/teacher-catalog'
/**
 * 校院两级评价工作组管理
 *
 * 后端：/api/quality/evaluation-workgroups
 * 工作组层级（对应后端 WorkgroupLevelEnum）：
 *   UNIVERSITY（学校级）/ COLLEGE（学院级）/ PROGRAM（专业级）/ INDUSTRY（行业企业专家组）。
 */
import type {
  EvaluationWorkgroupQueryRequest,
  EvaluationWorkgroupSaveRequest,
  EvaluationWorkgroupVO,
  WorkgroupMember,
} from '@/apis/quality/evaluation-workgroup'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import {
  evaluationWorkgroupApi,
  WORKGROUP_MEMBER_ROLE_OPTIONS,
  WorkgroupMemberRoleCode,
  WorkgroupMemberRoleDescription,
} from '@/apis/quality/evaluation-workgroup'
import {
  WORKGROUP_LEVEL_OPTIONS,
  WorkgroupLevelCode,
  WorkgroupLevelDescription,
} from '@/apis/quality/types'
import TeacherSelector from '@/components/platform/TeacherSelector.vue'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import { ProgramSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = withDefaults(
  defineProps<{
    domainShell?: 'portfolio' | 'quality'
  }>(),
  {
    domainShell: undefined,
  },
)

const route = useRoute()
/** 教学档案袋 /portfolio 域独立壳层；质量评价 /quality 仍走 OBE scope 加载 */
const isPortfolioDomain = computed(
  () =>
    props.domainShell === 'portfolio'
    || (props.domainShell !== 'quality' && Boolean(route.meta.portfolioDomain)),
)

interface EvaluationWorkgroupFilterModel {
  [key: string]: unknown
  programId?: string
  levelCode?: WorkgroupLevelCode
}

const filterForm = reactive<EvaluationWorkgroupFilterModel>({
  programId: undefined,
  levelCode: undefined,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields: FilterField[] = [
  {
    key: 'programId',
    type: 'custom',
    label: '专业大类',
    width: 200,
  },
  {
    key: 'levelCode',
    type: 'select',
    label: '层级',
    placeholder: '层级',
    allowClear: true,
    width: 130,
    options: WORKGROUP_LEVEL_OPTIONS,
  },
]

const columns: ColumnsType = [
  { title: '名称', dataIndex: 'workgroupName', key: 'workgroupName', fixed: 'left' },
  { title: '专业大类', dataIndex: 'programName', key: 'programName', width: 180 },
  { title: '层级', dataIndex: 'levelCode', key: 'levelCode', width: 100 },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 80 },
  { title: '召集人', dataIndex: 'convenerUserName', key: 'convenerUserName', width: 120 },
  { title: '成员数', key: 'memberCount', width: 90 },
  { title: '操作', key: 'actions', width: 260 },
]

function workgroupLevelLabel(value: WorkgroupLevelCode): string {
  return strictEnumLabel(WorkgroupLevelDescription, value, '评价工作组层级')
}

const list = ref<EvaluationWorkgroupVO[]>([])
const total = ref(0)
const loading = ref(false)
const loadError = ref(false)
const requestToken = ref(0)

const query = reactive<EvaluationWorkgroupQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  levelCode: undefined,
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
type EvaluationWorkgroupEditor = EvaluationWorkgroupSaveRequest & {
  programId: string
  members: WorkgroupMember[]
}
const editor = reactive<EvaluationWorkgroupEditor>({
  programId: '',
  workgroupCode: '',
  workgroupName: '',
  levelCode: WorkgroupLevelCode.PROGRAM,
  convenerUserId: '',
  members: [],
  responsibility: '',
  enabled: true,
})
const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const submitting = computed(() => operationKey.value.startsWith('save:'))

/** 工作组保存和删除必须串行，避免成员覆盖导入与表单提交交叉写入。 */
function beginOperation(key: string): boolean {
  if (writing.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}

function createEmptyMember(): WorkgroupMember {
  return {
    userCode: '',
    userName: '',
    role: WorkgroupMemberRoleCode.MEMBER,
    note: '',
  }
}

async function loadList() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const request = { ...query }
  loading.value = true
  loadError.value = false
  try {
    const page = await evaluationWorkgroupApi.page(request)
    if (requestToken.value !== currentToken) return
    list.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
    }
  } catch (error) {
    if (requestToken.value !== currentToken) return
    list.value = []
    total.value = 0
    loadError.value = true
    showUserError(error, '加载评价工作组失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

function syncFilterToQuery() {
  query.programId = filterForm.programId || undefined
  query.levelCode = filterForm.levelCode
}

function handleSearch() {
  query.pageNum = 1
  syncFilterToQuery()
  loadList()
}

function handleReset() {
  filterForm.programId = undefined
  filterForm.levelCode = undefined
  query.pageNum = 1
  syncFilterToQuery()
  loadList()
}

function handleFilterProgramChange(value: string | null) {
  filterForm.programId = value ?? undefined
}

function openCreate() {
  if (interactionLocked.value) return
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    programId: '',
    workgroupCode: '',
    workgroupName: '',
    levelCode: WorkgroupLevelCode.PROGRAM,
    convenerUserId: '',
    members: [createEmptyMember()],
    responsibility: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: EvaluationWorkgroupVO) {
  if (interactionLocked.value) return
  editorMode.value = 'edit'
  Object.assign(editor, {
    id: record.id,
    programId: record.programId ?? '',
    workgroupCode: record.workgroupCode,
    workgroupName: record.workgroupName,
    levelCode: record.levelCode,
    convenerUserId: record.convenerUserId,
    members: (record.members ?? []).map((member) => ({
      userId: member.userId,
      userCode: member.userCode,
      userName: member.userName,
      role: member.role,
      note: member.note ?? '',
    })),
    responsibility: record.responsibility ?? '',
    enabled: record.enabled ?? true,
  })
  if (editor.members.length === 0) {
    editor.members.push(createEmptyMember())
  }
  editorVisible.value = true
}

function handleEditorProgramChange(value: string | null) {
  editor.programId = value ?? ''
}

function getEditorConvenerId(): string | null {
  return (
    editor.members.find((member) => member.role === WorkgroupMemberRoleCode.CONVENER)?.userId
    ?? null
  )
}

function handleEditorConvenerChange(
  value: string | string[] | null,
  option?: TeacherUserInfoDto | TeacherUserInfoDto[],
) {
  if (Array.isArray(value)) {
    showFormValidationMessage('召集人只能单选，请重新选择')
    return
  }
  editor.members = editor.members.filter(
    (member) => member.role !== WorkgroupMemberRoleCode.CONVENER,
  )
  editor.convenerUserId = ''
  if (!value || Array.isArray(option) || !option) {
    return
  }
  const userCode = option.teacherNumber?.trim() || option.userName?.trim()
  const userName = option.nickName.trim()
  if (!userCode || !userName) {
    void message.error('召集人缺少工号或姓名，无法写入成员清单')
    return
  }
  const existingIndex = editor.members.findIndex((member) => member.userId === value)
  if (existingIndex >= 0) {
    editor.members[existingIndex] = {
      ...editor.members[existingIndex],
      userId: value,
      userCode,
      userName,
      role: WorkgroupMemberRoleCode.CONVENER,
    }
    editor.convenerUserId = value
    return
  }
  editor.members.unshift({
    userId: value,
    userCode,
    userName,
    role: WorkgroupMemberRoleCode.CONVENER,
    note: '',
  })
  editor.convenerUserId = value
}

function appendMember() {
  editor.members.push(createEmptyMember())
}

function removeMember(index: number) {
  editor.members.splice(index, 1)
  if (editor.members.length === 0) {
    editor.members.push(createEmptyMember())
  }
}

async function submitEditor() {
  if (!editor.programId || !editor.workgroupCode.trim() || !editor.workgroupName.trim()) {
    void message.error('请填写专业、编码、名称，并在成员清单中设置召集人')
    return
  }
  if (editor.members.length === 0) {
    void message.error('请至少填写一名工作组成员')
    return
  }
  const members: WorkgroupMember[] = []
  const userCodes = new Set<string>()
  for (let index = 0; index < editor.members.length; index += 1) {
    const member = editor.members[index]
    const userCode = member.userCode.trim()
    const userName = member.userName.trim()
    if (!userCode || !userName) {
      void message.error(`请完整填写第 ${index + 1} 名成员的工号和姓名`)
      return
    }
    if (userCodes.has(userCode)) {
      void message.error(`成员工号重复：${userCode}`)
      return
    }
    userCodes.add(userCode)
    members.push({
      userId: member.userId,
      userCode,
      userName,
      role: member.role,
      note: member.note ? member.note.trim() : '',
    })
  }
  const convenerMember = members.find((member) => member.role === WorkgroupMemberRoleCode.CONVENER)
  if (!convenerMember || !convenerMember.userId) {
    void message.error('召集人必须出现在成员清单中且角色为召集人')
    return
  }
  const request: EvaluationWorkgroupSaveRequest = {
    id: editor.id,
    programId: editor.programId,
    workgroupCode: editor.workgroupCode.trim(),
    workgroupName: editor.workgroupName.trim(),
    levelCode: editor.levelCode,
    convenerUserId: convenerMember.userId,
    members,
    responsibility: editor.responsibility?.trim() || undefined,
    enabled: editor.enabled,
  }
  const operation = `save:${editor.id || editor.workgroupCode}`
  if (!beginOperation(operation)) return
  try {
    if (editorMode.value === 'create') await evaluationWorkgroupApi.create(request)
    else await evaluationWorkgroupApi.update(request)
    void message.success('已保存')
    editorVisible.value = false
    await loadList()
  } catch (error) {
    showUserError(error, '保存评价工作组失败')
  } finally {
    endOperation(operation)
  }
}

function buildWorkgroupActions(_record: EvaluationWorkgroupVO): UiTableRowActionItem[] {
  return [
    { key: 'members', label: '成员', disabled: interactionLocked.value },
    { key: 'import', label: '表格文件导入', disabled: interactionLocked.value },
    { key: 'edit', label: '编辑', disabled: interactionLocked.value },
    { key: 'delete', label: '删除', tone: 'danger', disabled: interactionLocked.value },
  ]
}

function handleWorkgroupAction(key: string, record: EvaluationWorkgroupVO): void {
  switch (key) {
    case 'members':
      openMembersDrawer(record)
      break
    case 'import':
      openImportMembers(record)
      break
    case 'edit':
      openEdit(record)
      break
    case 'delete':
      void handleDelete(record)
      break
  }
}

async function handleDelete(record: EvaluationWorkgroupVO) {
  const workgroupId = record.id
  const operation = `delete:${workgroupId}`
  if (!beginOperation(operation)) return
  const confirmed = await confirmAsync({
    title: `删除工作组 ${record.workgroupName}？`,
    content: '删除后该工作组将不能再参与评价任务编组，已有业务引用会由后端阻止删除。',
    type: 'error',
  })
  if (!confirmed) {
    endOperation(operation)
    return
  }
  try {
    await evaluationWorkgroupApi.delete(workgroupId)
    void message.success('已删除')
    await loadList()
  } catch (error) {
    showUserError(error, '删除评价工作组失败')
  } finally {
    endOperation(operation)
  }
}

/* ========== 工作组成员 Excel 导入与查看 ========== */

const importVisible = ref(false)
const importTargetWorkgroup = ref<EvaluationWorkgroupVO | null>(null)
const membersDrawerVisible = ref(false)
const membersDrawerTarget = ref<EvaluationWorkgroupVO | null>(null)
const membersDrawerRows = computed(() => membersDrawerTarget.value?.members ?? [])
const interactionLocked = computed(
  () => writing.value || editorVisible.value || importVisible.value || membersDrawerVisible.value,
)

const memberColumns: ColumnsType = [
  { title: '工号', dataIndex: 'userCode', key: 'userCode', width: 140 },
  { title: '姓名', dataIndex: 'userName', key: 'userName', width: 120 },
  { title: '角色', dataIndex: 'role', key: 'role', width: 140 },
  { title: '备注', dataIndex: 'note', key: 'note' },
]

function memberRoleLabel(role?: WorkgroupMemberRoleCode): string {
  return strictEnumLabel(
    WorkgroupMemberRoleDescription,
    role ?? WorkgroupMemberRoleCode.MEMBER,
    '评价工作组成员角色',
  )
}

function memberCountOf(record: EvaluationWorkgroupVO): number {
  return record.members?.length ?? 0
}

function convenerNameOf(record: EvaluationWorkgroupVO): string {
  return (
    record.convenerUserName
    ?? record.members?.find((member) => member.role === WorkgroupMemberRoleCode.CONVENER)?.userName
    ?? '—'
  )
}

function openImportMembers(record: EvaluationWorkgroupVO) {
  if (interactionLocked.value) return
  importTargetWorkgroup.value = record
  importVisible.value = true
}

function openMembersDrawer(record: EvaluationWorkgroupVO) {
  if (interactionLocked.value) return
  membersDrawerTarget.value = record
  membersDrawerVisible.value = true
}

const importContext = computed(() => ({
  workgroupId: importTargetWorkgroup.value?.id,
}))

async function handleImportFinished() {
  await loadList()
}

/* ========== 信号指标：评价工作组健康度 ========== */

const signals = computed<SignalMetric[]>(() => {
  const byLevel: Record<string, number> = {}
  for (const w of list.value) {
    byLevel[w.levelCode] = (byLevel[w.levelCode] || 0) + 1
  }
  return [
    { key: 'page', label: '当前页记录', value: list.value.length, tone: 'blue' },
    { key: 'all-total', label: '工作组总数', value: total.value, tone: 'blue' },
    { key: 'university', label: '当前页·学校级', value: byLevel.UNIVERSITY || 0, tone: 'blue' },
    { key: 'college', label: '当前页·学院级', value: byLevel.COLLEGE || 0, tone: 'blue' },
    { key: 'program', label: '当前页·专业级', value: byLevel.PROGRAM || 0, tone: 'blue' },
    { key: 'industry', label: '当前页·行业专家组', value: byLevel.INDUSTRY || 0, tone: 'blue' },
  ]
})

if (!isPortfolioDomain.value) {
  useQualityScopedLoader(
    () => {
      void loadList()
    },
    { watchScope: true, immediate: false, reloadOnActivated: false },
  )
}

/** keep-alive 首次会同时触发 mounted 与 activated；只允许一个 bootstrap owner。 */
const listBootstrapped = ref(false)

onMounted(async () => {
  await loadList()
  listBootstrapped.value = true
})

onActivated(() => {
  if (!listBootstrapped.value) {
    return
  }
  void loadList()
})
</script>

<template>
  <StageWorkbenchShell>
    <template v-if="isPortfolioDomain" #context>
      <ContextBar title="评价工作组" subtitle="多元评价 · 维护评价任务成员编组与职责分工">
        <template #status>
          <UiTag tone="blue" size="sm"> 教学档案袋 </UiTag>
        </template>
        <template #actions>
          <UiButton variant="primary" size="sm" :disabled="interactionLocked" @click="openCreate">
            新建工作组
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <SignalBand :metrics="signals" compact class="ewg__signals" />

    <UiCard class="detail-table-card ewg__table-card">
      <template #title>工作组台账</template>
      <template v-if="!isPortfolioDomain" #extra>
        <UiButton variant="primary" size="sm" :disabled="interactionLocked" @click="openCreate">
          新建工作组
        </UiButton>
      </template>

      <UiFilterBar
        v-model="filterModel"
        :fields="filterFields"
        show-labels
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #field-programId>
          <ProgramSelector
            :value="filterForm.programId ?? null"
            placeholder="专业大类"
            :width="200"
            @change="handleFilterProgramChange"
          />
        </template>
      </UiFilterBar>

      <UiDataTable
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        :columns="columns"
        :data-source="list"
        :loading="loading"
        :load-error="loadError"
        pagination-mode="server"
        row-key="id"
        size="middle"
        :total="total"
        flat
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'programName'">
            {{ record.programName || '—' }}
          </template>
          <template v-else-if="column.key === 'levelCode'">
            <UiTag tone="gray" size="sm">{{ workgroupLevelLabel(record.levelCode) }}</UiTag>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <UiTag :tone="record.enabled ? 'green' : 'gray'" size="sm">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'convenerUserName'">
            {{ convenerNameOf(record) }}
          </template>
          <template v-else-if="column.key === 'memberCount'">
            <UiTag :tone="memberCountOf(record) > 0 ? 'blue' : 'gray'" size="sm">
              {{ memberCountOf(record) }} 人
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildWorkgroupActions(record)"
              split
              @action="(key) => handleWorkgroupAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiDialog
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建工作组' : '编辑工作组'"
      :confirm-loading="submitting"
      :closable="!writing"
      :mask-closable="!writing"
      :width="720"
      @ok="submitEditor"
    >
      <UiForm layout="vertical" :model="editor">
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="层级" required>
              <UiSelect
                size="sm"
                v-model="editor.levelCode"
                :options="WORKGROUP_LEVEL_OPTIONS"
                :disabled="editorMode === 'edit' || writing"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="启用状态">
              <UiSwitch size="sm" v-model="editor.enabled" :disabled="writing" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="编码" required>
          <UiInput
            size="sm"
            v-model="editor.workgroupCode"
            :maxlength="64"
            :disabled="editorMode === 'edit' || writing"
            placeholder="租户内唯一编码"
          />
        </UiFormItem>
        <UiFormItem label="名称" required>
          <UiInput size="sm" v-model="editor.workgroupName" :maxlength="128" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="专业大类" required>
          <ProgramSelector
            :value="editor.programId || null"
            :disabled="editorMode === 'edit' || writing"
            @change="handleEditorProgramChange"
          />
        </UiFormItem>
        <UiFormItem label="召集人" required>
          <TeacherSelector
            :value="getEditorConvenerId()"
            :disabled="writing"
            @change="handleEditorConvenerChange"
          />
        </UiFormItem>
        <UiFormItem label="职责说明">
          <UiTextarea
            size="sm"
            v-model="editor.responsibility"
            :maxlength="1000"
            :rows="3"
            :show-count="true"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="成员清单">
          <div class="ewg__member-editor">
            <div class="ewg__member-editor-header">
              <p class="ewg__member-editor-tip">支持逐行录入，也可在保存后通过 Excel 覆盖导入。</p>
              <UiButton variant="outline" size="sm" :disabled="writing" @click="appendMember">
                新增成员
              </UiButton>
            </div>
            <div
              v-for="(member, index) in editor.members"
              :key="`${editorMode}-${index}`"
              class="ewg__member-row"
            >
              <UiRow :gutter="12">
                <UiCol :span="5">
                  <UiInput
                    size="sm"
                    v-model="member.userCode"
                    :maxlength="64"
                    placeholder="工号"
                    :disabled="writing"
                  />
                </UiCol>
                <UiCol :span="5">
                  <UiInput
                    size="sm"
                    v-model="member.userName"
                    :maxlength="64"
                    placeholder="姓名"
                    :disabled="writing"
                  />
                </UiCol>
                <UiCol :span="5">
                  <UiSelect
                    size="sm"
                    v-model="member.role"
                    :options="WORKGROUP_MEMBER_ROLE_OPTIONS"
                    placeholder="角色"
                    :disabled="writing"
                  />
                </UiCol>
                <UiCol :span="7">
                  <UiInput
                    size="sm"
                    v-model="member.note"
                    :maxlength="255"
                    placeholder="备注：单位 / 联系方式 / 组织角色"
                    :disabled="writing"
                  />
                </UiCol>
                <UiCol :span="2" class="ewg__member-row-action">
                  <UiTextAction
                    tone="danger"
                    :disabled="editor.members.length === 1 || writing"
                    @click="removeMember(index)"
                  >
                    删除
                  </UiTextAction>
                </UiCol>
              </UiRow>
            </div>
          </div>
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <!-- Excel 批量导入成员 -->
    <UiPlatformExcelImportModal
      v-model:open="importVisible"
      :scene-key="ExcelImportSceneKey.QUALITY_WORKGROUP_MEMBER"
      entity-label="工作组成员"
      :context="importContext"
      :requirements="[
        '表格文件列顺序：工号 | 姓名 | 角色（召集人 / 成员 / 外部专家，留空默认成员） | 备注',
        '前两列必填。导入后将覆盖该工作组现有成员。',
      ]"
      @success="handleImportFinished"
    />

    <!-- 查看成员清单 -->
    <UiDrawer
      v-model:open="membersDrawerVisible"
      :title="`成员清单（${membersDrawerTarget?.workgroupName || ''}）`"
      :width="720"
      placement="right"
      :closable="!writing"
      :mask-closable="!writing"
    >
      <UiEmpty size="sm" v-if="!membersDrawerRows.length" description="该工作组尚无成员" />
      <UiDataTable
        pagination-mode="client"
        v-else
        :columns="memberColumns"
        :data-source="membersDrawerRows"
        row-key="userCode"
        size="middle"
        :total="membersDrawerRows.length"
        :page-size="20"
        flat
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'role'">
            <UiTag
              :tone="record.role === WorkgroupMemberRoleCode.CONVENER ? 'blue' : 'gray'"
              size="sm"
            >
              {{ memberRoleLabel(record.role) }}
            </UiTag>
          </template>
        </template>
      </UiDataTable>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ewg {
  &__signals {
    margin-bottom: var(--dp-space-component);
    padding: var(--dp-space-component) var(--dp-space-block);
    background: var(--dp-surface-chrome);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-component);
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__filter {
    width: 140px;
  }

  &__member-editor {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component);
    padding: var(--dp-space-component);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface-chrome);
  }

  &__member-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    flex-wrap: wrap;
  }

  &__member-editor-tip {
    margin: 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__member-row {
    padding: var(--dp-space-component);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface);
  }

  &__member-row-action {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
}
</style>
