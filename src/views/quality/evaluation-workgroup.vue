<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
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
  WorkgroupLevel,
  WorkgroupMember,
  WorkgroupMemberRole,
} from '@/apis/quality'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  evaluationWorkgroupApi,
  WORKGROUP_LEVEL_LABEL,
  WORKGROUP_LEVEL_OPTIONS,
  WORKGROUP_MEMBER_ROLE_LABEL,
} from '@/apis/quality'
import QualityImportPanel from '@/components/quality/import/QualityImportPanel.vue'
import { ProgramSelector, TeacherSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

interface EvaluationWorkgroupFilterModel {
  programId?: string
  levelCode?: WorkgroupLevel
}

const filterForm = reactive<EvaluationWorkgroupFilterModel>({
  programId: undefined,
  levelCode: undefined,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
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
  { title: '编码', dataIndex: 'workgroupCode', key: 'workgroupCode', width: 140 },
  { title: '名称', dataIndex: 'workgroupName', key: 'workgroupName' },
  { title: '专业大类', dataIndex: 'programName', key: 'programName', width: 160 },
  { title: '层级', dataIndex: 'levelCode', key: 'levelCode', width: 100 },
  { title: '召集人', dataIndex: 'convenerUserName', key: 'convenerUserName', width: 120 },
  { title: '成员数', key: 'memberCount', width: 90 },
  { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80 },
  { title: '操作', key: 'actions', width: 260, fixed: 'right' },
]

function workgroupLevelLabel(value: WorkgroupLevel): string {
  return strictEnumLabel(WORKGROUP_LEVEL_LABEL, value, '评价工作组层级')
}

const list = ref<EvaluationWorkgroupVO[]>([])
const total = ref(0)
const loading = ref(false)

const query = reactive<EvaluationWorkgroupQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  levelCode: undefined,
  enabled: undefined,
})

const levelOptions = WORKGROUP_LEVEL_OPTIONS

const memberRoleOptions = [
  { value: 'CONVENER', label: '召集人' },
  { value: 'MEMBER', label: '成员' },
  { value: 'EXTERNAL_EXPERT', label: '外部专家' },
]

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<EvaluationWorkgroupSaveRequest>({
  programId: '',
  workgroupCode: '',
  workgroupName: '',
  levelCode: 'PROGRAM',
  convenerUserId: '',
  members: [],
  responsibility: '',
  enabled: true,
})
const submitting = ref(false)

function createEmptyMember(): WorkgroupMember {
  return {
    userCode: '',
    userName: '',
    role: 'MEMBER',
    note: '',
  }
}

async function loadList() {
  loading.value = true
  try {
    const page = await evaluationWorkgroupApi.page({ ...query })
    list.value = readPageList(page, '评价工作组加载失败，请稍后重试')
    total.value = readPageTotal(page, '评价工作组加载失败，请稍后重试')
  } finally {
    loading.value = false
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
  query.enabled = undefined
  syncFilterToQuery()
  loadList()
}

function handleFilterProgramChange(value: string | null) {
  filterForm.programId = value ?? undefined
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    programId: '',
    workgroupCode: '',
    workgroupName: '',
    levelCode: 'PROGRAM',
    convenerUserId: '',
    members: [createEmptyMember()],
    responsibility: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: EvaluationWorkgroupVO) {
  editorMode.value = 'edit'
  Object.assign(editor, {
    id: record.id,
    programId: record.programId,
    workgroupCode: record.workgroupCode,
    workgroupName: record.workgroupName,
    levelCode: record.levelCode,
    convenerUserId: record.convenerUserId,
    members: record.members.map((member) => ({
      userId: member.userId,
      userCode: member.userCode,
      userName: member.userName,
      role: member.role,
      note: member.note ?? '',
    })),
    responsibility: record.responsibility || '',
    enabled: record.enabled,
  })
  if (editor.members.length === 0) {
    editor.members.push(createEmptyMember())
  }
  editorVisible.value = true
}

function handleEditorProgramChange(value: string | null) {
  editor.programId = value ?? ''
}

function handleEditorConvenerChange(value: string | string[] | null) {
  if (Array.isArray(value)) {
    showUserError(null, '召集人只能单选，请重新选择')
    return
  }
  editor.convenerUserId = value ?? ''
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
  if (
    !editor.programId
    || !editor.workgroupCode.trim()
    || !editor.workgroupName.trim()
    || !editor.convenerUserId
  ) {
    message.error('请填写专业、编码、名称、召集人')
    return
  }
  if (editor.members.length === 0) {
    message.error('请至少填写一名工作组成员')
    return
  }
  const members: WorkgroupMember[] = []
  for (let index = 0; index < editor.members.length; index += 1) {
    const member = editor.members[index]
    const userCode = member.userCode.trim()
    const userName = member.userName.trim()
    if (!userCode || !userName) {
      message.error(`请完整填写第 ${index + 1} 名成员的工号和姓名`)
      return
    }
    members.push({
      userId: member.userId,
      userCode,
      userName,
      role: member.role,
      note: member.note ? member.note.trim() : '',
    })
  }
  const request: EvaluationWorkgroupSaveRequest = {
    id: editor.id,
    programId: editor.programId,
    workgroupCode: editor.workgroupCode.trim(),
    workgroupName: editor.workgroupName.trim(),
    levelCode: editor.levelCode,
    convenerUserId: editor.convenerUserId,
    members,
    responsibility: editor.responsibility ? editor.responsibility.trim() : '',
    enabled: editor.enabled,
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await evaluationWorkgroupApi.create(request)
    else await evaluationWorkgroupApi.update(request)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: EvaluationWorkgroupVO) {
  void confirmAsync({
    title: `删除工作组 ${record.workgroupCode}？`,
    type: 'error',
    onOk: async () => {
      await evaluationWorkgroupApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

/* ========== 工作组成员 Excel 导入与查看 ========== */

const importVisible = ref(false)
const importTargetWorkgroup = ref<EvaluationWorkgroupVO | null>(null)
const membersDrawerVisible = ref(false)
const membersDrawerTarget = ref<EvaluationWorkgroupVO | null>(null)
const membersDrawerRows = computed(() => membersDrawerTarget.value?.members ?? [])

const memberColumns: ColumnsType = [
  { title: '工号', dataIndex: 'userCode', key: 'userCode', width: 140 },
  { title: '姓名', dataIndex: 'userName', key: 'userName', width: 120 },
  { title: '角色', dataIndex: 'role', key: 'role', width: 140 },
  { title: '备注', dataIndex: 'note', key: 'note' },
]

function memberRoleLabel(role: WorkgroupMemberRole): string {
  return strictEnumLabel(WORKGROUP_MEMBER_ROLE_LABEL, role, '评价工作组成员角色')
}

function memberCountOf(record: EvaluationWorkgroupVO): number {
  return record.members.length
}

function openImportMembers(record: EvaluationWorkgroupVO) {
  importTargetWorkgroup.value = record
  importVisible.value = true
}

function openMembersDrawer(record: EvaluationWorkgroupVO) {
  membersDrawerTarget.value = record
  membersDrawerVisible.value = true
}

function importTemplateApi() {
  return evaluationWorkgroupApi.downloadMembersTemplate()
}

function importUploadApi(file: File) {
  if (!importTargetWorkgroup.value) {
    return Promise.reject(new Error('未选定工作组'))
  }
  return evaluationWorkgroupApi.importMembersExcel(importTargetWorkgroup.value.id, file)
}

async function handleImportFinished() {
  await loadList()
}

/* ========== 信号指标：评价工作组健康度 ========== */

const signals = computed<SignalMetric[]>(() => {
  const enabled = list.value.filter((w) => w.enabled).length
  const disabled = list.value.filter((w) => !w.enabled).length
  const byLevel: Record<string, number> = {}
  for (const w of list.value) {
    byLevel[w.levelCode] = (byLevel[w.levelCode] || 0) + 1
  }
  return [
    { key: 'page', label: '当前页记录', value: list.value.length, tone: 'blue' },
    { key: 'all-total', label: '工作组总数', value: total.value, tone: 'blue' },
    { key: 'enabled', label: '启用', value: enabled, tone: enabled > 0 ? 'green' : 'gray' },
    { key: 'disabled', label: '停用', value: disabled, tone: disabled > 0 ? 'orange' : 'gray' },
    { key: 'university', label: '学校级', value: byLevel.UNIVERSITY || 0, tone: 'blue' },
    { key: 'college', label: '学院级', value: byLevel.COLLEGE || 0, tone: 'blue' },
    { key: 'program', label: '专业级', value: byLevel.PROGRAM || 0, tone: 'blue' },
    { key: 'industry', label: '行业企业专家组', value: byLevel.INDUSTRY || 0, tone: 'blue' },
  ]
})


onMounted(async () => {
  await loadList()
})
</script>

<template>
  <StageWorkbenchShell>
    <SignalBand :metrics="signals" compact class="ewg__signals" />

    <UiCard class="detail-table-card ewg__table-card">
      <template #title>工作组台账</template>
      <template #extra>
        <UiButton variant="primary" size="sm" @click="openCreate">新建工作组</UiButton>
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
        class="student-detail-table__data-table"
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        :columns="columns"
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :total="total"
        flat
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'programName'">
            {{ record.programName }}
          </template>
          <template v-else-if="column.key === 'levelCode'">
            <UiTag tone="gray" size="sm">{{ workgroupLevelLabel(record.levelCode) }}</UiTag>
          </template>
          <template v-else-if="column.key === 'convenerUserName'">
            {{ record.convenerUserName }}
          </template>
          <template v-else-if="column.key === 'memberCount'">
            <UiTag :tone="memberCountOf(record) > 0 ? 'blue' : 'gray'" size="sm">
              {{ memberCountOf(record) }} 人
            </UiTag>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <UiTag :tone="record.enabled ? 'green' : 'gray'" size="sm">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiTextAction @click="openMembersDrawer(record)">成员</UiTextAction>
              <UiTextAction @click="openImportMembers(record)">Excel 导入</UiTextAction>
              <UiTextAction @click="openEdit(record)">编辑</UiTextAction>
              <UiTextAction tone="danger" @click="handleDelete(record)">删除</UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建工作组' : '编辑工作组'"
      :confirm-loading="submitting"
      width="720px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.workgroupCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="层级" required>
              <a-select v-model:value="editor.levelCode" :options="levelOptions" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="editor.workgroupName" />
        </a-form-item>
        <a-form-item label="专业大类" required>
          <ProgramSelector :value="editor.programId || null" @change="handleEditorProgramChange" />
        </a-form-item>
        <a-form-item label="召集人" required>
          <TeacherSelector
            :value="editor.convenerUserId || null"
            @change="handleEditorConvenerChange"
          />
        </a-form-item>
        <a-form-item label="成员清单">
          <div class="ewg__member-editor">
            <div class="ewg__member-editor-header">
              <p class="ewg__member-editor-tip">支持逐行录入，也可在保存后通过 Excel 覆盖导入。</p>
              <UiButton variant="outline" size="sm" @click="appendMember">新增成员</UiButton>
            </div>
            <div
              v-for="(member, index) in editor.members"
              :key="`${editorMode}-${index}`"
              class="ewg__member-row"
            >
              <a-row :gutter="12">
                <a-col :span="5">
                  <a-input v-model:value="member.userCode" :maxlength="64" placeholder="工号" />
                </a-col>
                <a-col :span="5">
                  <a-input v-model:value="member.userName" :maxlength="64" placeholder="姓名" />
                </a-col>
                <a-col :span="5">
                  <a-select
                    v-model:value="member.role"
                    :options="memberRoleOptions"
                    placeholder="角色"
                  />
                </a-col>
                <a-col :span="7">
                  <a-input
                    v-model:value="member.note"
                    :maxlength="255"
                    placeholder="备注：单位 / 联系方式 / 组织角色"
                  />
                </a-col>
                <a-col :span="2" class="ewg__member-row-action">
                  <UiTextAction
                    tone="danger"
                    :disabled="editor.members.length !== 1"
                    @click="removeMember(index)"
                  >
                    删除
                  </UiTextAction>
                </a-col>
              </a-row>
            </div>
          </div>
        </a-form-item>
        <a-form-item label="职责">
          <a-textarea v-model:value="editor.responsibility" :rows="3" />
        </a-form-item>
        <a-checkbox v-model:checked="editor.enabled">启用</a-checkbox>
      </a-form>
    </a-modal>

    <!-- Excel 批量导入成员 -->
    <QualityImportPanel
      v-model:open="importVisible"
      :title="`Excel 导入工作组成员（${importTargetWorkgroup?.workgroupName || ''}）`"
      accept=".xlsx,.xls"
      accept-hint="支持 .xlsx / .xls 格式"
      description-title="模板说明"
      description="Excel 列顺序：工号 | 姓名 | 角色（召集人 / 成员 / 外部专家，留空默认成员） | 备注。前两列必填。导入后将覆盖该工作组现有成员。"
      template-button-label="下载工作组成员模板"
      template-file-name="工作组成员导入模板.xlsx"
      :template-api="importTemplateApi"
      :upload-api="importUploadApi"
      @imported="handleImportFinished"
    />

    <!-- 查看成员清单 -->
    <a-drawer
      v-model:open="membersDrawerVisible"
      :title="`成员清单（${membersDrawerTarget?.workgroupName || ''}）`"
      :width="720"
      placement="right"
    >
      <UiEmpty v-if="!membersDrawerRows.length" description="该工作组尚无成员" />
      <UiDataTable
        pagination-mode="client"
        class="student-detail-table__data-table"
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
            <UiTag :tone="record.role === 'CONVENER' ? 'blue' : 'gray'" size="sm">
              {{ memberRoleLabel(record.role) }}
            </UiTag>
          </template>
        </template>
      </UiDataTable>
    </a-drawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ewg {
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

  &__filter {
    width: 140px;
  }

  &__member-editor {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    background: var(--dp-surface-elevated, #f8fafc);
  }

  &__member-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__member-editor-tip {
    margin: 0;
    font-size: 13px;
    color: var(--dp-text-secondary, #475569);
  }

  &__member-row {
    padding: 12px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    background: var(--dp-surface, #ffffff);
  }

  &__member-row-action {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
}
</style>
