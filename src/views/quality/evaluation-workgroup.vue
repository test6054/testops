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
  EvaluationWorkgroupQueryPayload,
  EvaluationWorkgroupSavePayload,
  EvaluationWorkgroupVO,
} from '@/apis/quality'
import type { MajorCategoryVO, TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { evaluationWorkgroupApi, WORKGROUP_LEVEL_LABEL } from '@/apis/quality'
import { majorCategoryCatalogApi, teacherCatalogApi } from '@/apis/quality/user-catalog'
import QualityImportPanel from '@/components/quality/import/QualityImportPanel.vue'
import { ProgramSelector, TeacherSelector } from '@/components/quality/selectors'
import { UiButton, UiDataTable, UiSearchForm } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'

const filterFields: FilterField[] = [
  { key: 'programId', label: '专业大类', type: 'custom', placeholder: '专业大类', width: 220 },
  {
    key: 'levelCode',
    label: '层级',
    type: 'select',
    placeholder: '层级',
    allowClear: true,
    options: [],
    width: 130,
  },
]

const filterModel = ref<Record<string, unknown>>({
  programId: undefined,
  levelCode: undefined,
})

type SearchFieldUpdate = (value: unknown) => void

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'workgroupCode', key: 'workgroupCode', width: 140 },
  { title: '名称', dataIndex: 'workgroupName', key: 'workgroupName' },
  { title: '专业大类', dataIndex: 'programId', key: 'programId', width: 160 },
  { title: '层级', dataIndex: 'levelCode', key: 'levelCode', width: 100 },
  { title: '召集人', dataIndex: 'convenerUserId', key: 'convenerUserId', width: 120 },
  { title: '成员数', key: 'memberCount', width: 90 },
  { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80 },
  { title: '操作', key: 'actions', width: 260, fixed: 'right' },
]

/**
 * 把后端返回的 levelCode（String）渲染成中文标签。
 * - 严格对齐后端 WorkgroupLevelEnum：UNIVERSITY / COLLEGE / PROGRAM / INDUSTRY
 * - 通过字面值比较让 TS 自动缩窄类型，避免使用 as 断言
 * - 若后端落库了枚举之外的非法值，原样回显
 */
function workgroupLevelLabel(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  if (
    value === 'UNIVERSITY'
    || value === 'COLLEGE'
    || value === 'PROGRAM'
    || value === 'INDUSTRY'
  ) {
    return WORKGROUP_LEVEL_LABEL[value]
  }
  return value
}

const list = ref<EvaluationWorkgroupVO[]>([])
const total = ref(0)
const loading = ref(false)
const programs = ref<MajorCategoryVO[]>([])
const teacherCache = ref<Map<string, TeacherUserInfoDto>>(new Map())

const query = reactive<EvaluationWorkgroupQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  levelCode: undefined,
  enabled: undefined,
})

const levelOptions = Object.entries(WORKGROUP_LEVEL_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<EvaluationWorkgroupSavePayload>({
  programId: '',
  workgroupCode: '',
  workgroupName: '',
  levelCode: 'PROGRAM',
  convenerUserId: '',
  members: '',
  responsibility: '',
  enabled: true,
})
const submitting = ref(false)

async function loadList() {
  loading.value = true
  try {
    const page = await evaluationWorkgroupApi.page({ ...query })
    list.value = page.list
    total.value = page.total
    // 预热召集人姓名
    const ids = Array.from(new Set(list.value.map((w) => w.convenerUserId).filter(Boolean)))
    for (const uid of ids) {
      if (teacherCache.value.has(uid)) continue
      const res = await teacherCatalogApi.userList({
        pageNum: 1,
        pageSize: 1,
        searchText: uid,
      })
      const t = res.list?.find((x) => String(x.id) === uid)
      if (t) teacherCache.value.set(uid, t)
    }
  } finally {
    loading.value = false
  }
}

async function loadDicts() {
  programs.value = await majorCategoryCatalogApi.listAll()
}

function handlePageChange(payload: { current: number, pageSize: number }) {
  query.pageNum = payload.current
  query.pageSize = payload.pageSize
  loadList()
}

function syncFilterToQuery() {
  const programIdRaw = filterModel.value.programId
  query.programId = typeof programIdRaw === 'string' && programIdRaw ? programIdRaw : undefined
  const levelRaw = filterModel.value.levelCode
  query.levelCode = typeof levelRaw === 'string' && levelRaw ? levelRaw : undefined
}

function handleSearch() {
  query.pageNum = 1
  syncFilterToQuery()
  loadList()
}

function handleResetSearch() {
  filterModel.value = { programId: undefined, levelCode: undefined }
  query.pageNum = 1
  query.enabled = undefined
  syncFilterToQuery()
  loadList()
}

function handleFilterProgramChange(value: string | null, update: SearchFieldUpdate) {
  update(value ?? undefined)
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
    members: '',
    responsibility: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: EvaluationWorkgroupVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

function handleEditorProgramChange(value: string | null) {
  editor.programId = value ?? ''
}

function handleEditorConvenerChange(value: string | null) {
  editor.convenerUserId = value ?? ''
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
  submitting.value = true
  try {
    if (editorMode.value === 'create') await evaluationWorkgroupApi.create(editor)
    else await evaluationWorkgroupApi.update(editor)
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

function convenerDisplay(uid: string) {
  const t = teacherCache.value.get(uid)
  return t ? t.nickName || t.userName : uid
}

/* ========== 工作组成员 Excel 导入与查看 ========== */

const importVisible = ref(false)
const importTargetWorkgroup = ref<EvaluationWorkgroupVO | null>(null)
const membersDrawerVisible = ref(false)
const membersDrawerTarget = ref<EvaluationWorkgroupVO | null>(null)
const membersDrawerRows = computed(() => membersDrawerTarget.value?.parsedMembers ?? [])

const memberColumns: ColumnsType = [
  { title: '工号/编号', dataIndex: 'userCode', key: 'userCode', width: 140 },
  { title: '姓名', dataIndex: 'userName', key: 'userName', width: 120 },
  { title: '角色', dataIndex: 'role', key: 'role', width: 140 },
  { title: '备注', dataIndex: 'note', key: 'note' },
]

type WorkgroupMemberRole = 'CONVENER' | 'MEMBER' | 'EXTERNAL_EXPERT'

const ROLE_LABEL: Record<WorkgroupMemberRole, string> = {
  CONVENER: '召集人',
  MEMBER: '成员',
  EXTERNAL_EXPERT: '外部专家',
}

function isWorkgroupMemberRole(role: unknown): role is WorkgroupMemberRole {
  return role === 'CONVENER' || role === 'MEMBER' || role === 'EXTERNAL_EXPERT'
}

function memberRoleLabel(role: unknown): string {
  if (typeof role !== 'string' || !role) return '-'
  if (isWorkgroupMemberRole(role)) return ROLE_LABEL[role]
  return role
}

function memberCountOf(record: EvaluationWorkgroupVO): number {
  return Array.isArray(record.parsedMembers) ? record.parsedMembers.length : 0
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
  await Promise.all([loadList(), loadDicts()])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="ewg__context">
        <div class="ewg__context-info">
          <h2 class="ewg__title">校院两级评价工作组</h2>
        </div>
      </div>
    </template>

    <SignalBand :metrics="signals" compact class="ewg__signals" />

    <section class="ewg__panel">
      <header class="ewg__panel-header">
        <h3 class="ewg__panel-title">工作组台账</h3>
        <div class="ewg__panel-actions">
          <UiButton variant="primary" size="sm" @click="openCreate"> 新建工作组 </UiButton>
        </div>
      </header>

      <UiSearchForm
        v-model="filterModel"
        :fields="filterFields"
        :show-labels="false"
        class="ewg__search-form"
        @search="handleSearch"
        @reset="handleResetSearch"
      >
        <template #field-programId="{ value, update }">
          <ProgramSelector
            :value="typeof value === 'string' ? value : null"
            placeholder="专业大类"
            :width="200"
            @change="handleFilterProgramChange($event, update)"
          />
        </template>
        <template #field-levelCode="{ value, update }">
          <a-select
            :value="value"
            placeholder="层级"
            allow-clear
            class="ewg__filter"
            :options="levelOptions"
            @update:value="(v: unknown) => update(v)"
          />
        </template>
      </UiSearchForm>

      <UiDataTable
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
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'programId'">
            {{ programs.find((p) => p.id === text)?.majorCategoryName || text }}
          </template>
          <template v-else-if="column.key === 'levelCode'">
            <a-tag>{{ workgroupLevelLabel(text) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'convenerUserId'">
            {{ convenerDisplay(text) }}
          </template>
          <template v-else-if="column.key === 'memberCount'">
            <a-tag :color="memberCountOf(record) > 0 ? 'blue' : 'default'">
              {{ memberCountOf(record) }} 人
            </a-tag>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <UiButton variant="ghost" size="sm" @click="openMembersDrawer(record)">
                成员
              </UiButton>
              <UiButton variant="ghost" size="sm" @click="openImportMembers(record)">
                Excel 导入
              </UiButton>
              <UiButton variant="ghost" size="sm" @click="openEdit(record)"> 编辑 </UiButton>
              <UiButton variant="ghost" status="danger" size="sm" @click="handleDelete(record)">
                删除
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </section>

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
          <a-alert
            type="info"
            show-icon
            message="成员清单通过 Excel 导入维护"
            description="保存当前工作组后，在「工作组台账」操作列点击「Excel 导入」上传成员名单。模板可在导入弹窗中下载。"
          />
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
      description="Excel 列顺序：工号/编号 | 姓名 | 角色（CONVENER / MEMBER / EXTERNAL_EXPERT，留空默认 MEMBER） | 备注。前两列必填。导入后将覆盖该工作组现有成员。"
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
      <a-empty
        v-if="!membersDrawerTarget?.parsedMembers?.length"
        description="该工作组尚无成员，请通过「Excel 导入」上传"
      />
      <UiDataTable
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
            <a-tag :color="record.role === 'CONVENER' ? 'blue' : 'default'">
              {{ memberRoleLabel(record.role) }}
            </a-tag>
          </template>
        </template>
      </UiDataTable>
    </a-drawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ewg {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 240px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

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
}
</style>
