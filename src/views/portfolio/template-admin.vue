<script setup lang="ts">
import type { TreeProps } from 'ant-design-vue'
import { message } from 'ant-design-vue'
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioArchiveCategorySaveRequest,
  PortfolioArchiveCategoryTreeNodeVO,
  PortfolioArchiveFieldDefSaveRequest,
  PortfolioArchiveFieldDefVO,
  PortfolioArchiveTeacherReadinessVO,
  PortfolioArchiveTemplateChangeLogVO,
  PortfolioArchiveTemplateDiffSummary,
  PortfolioArchiveTemplateVersionVO,
} from '@/apis/portfolio/types'
import {
  PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_OPTIONS,
  PORTFOLIO_ARCHIVE_CATEGORY_STATUS_OPTIONS,
  PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_OPTIONS,
  PORTFOLIO_ARCHIVE_FIELD_TYPE_OPTIONS,
  PORTFOLIO_DEFAULT_AUDIT_FLOW_CODE,
} from '@/apis/portfolio/types'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import {
  PortfolioArchiveCategoryScopeCode,
  PortfolioArchiveCategoryStatusCode,
  PortfolioArchiveCategoryStatusDescription,
  PortfolioArchiveFieldSourceTypeCode,
  PortfolioArchiveFieldSourceTypeDescription,
  PortfolioArchiveFieldTypeCode,
  PortfolioArchiveFieldTypeDescription,
  PortfolioArchiveTemplateVersionStatusDescription,
} from '@/apis/portfolio/enums'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { hasTeacherTenantPermission } from '@/utils/permission'
import { strictEnumLabel } from '@/utils/strict-enum'

interface TreeNode {
  key: string
  title: string
  raw: PortfolioArchiveCategoryTreeNodeVO
  children?: TreeNode[]
}

function isTreeNode(value: unknown): value is TreeNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    'key' in value &&
    'title' in value &&
    'raw' in value
  )
}

function isArchiveFieldRecord(record: unknown): record is PortfolioArchiveFieldDefVO {
  return (
    typeof record === 'object' &&
    record !== null &&
    'id' in record &&
    'templateVersionId' in record &&
    'fieldCode' in record &&
    'fieldLabel' in record &&
    'fieldType' in record &&
    'sourceType' in record
  )
}

function archiveFieldRecord(record: unknown): PortfolioArchiveFieldDefVO {
  if (!isArchiveFieldRecord(record)) {
    throw new Error('档案字段行契约异常')
  }
  return record
}

function isArchiveTemplateVersionRecord(
  record: unknown,
): record is PortfolioArchiveTemplateVersionVO {
  return (
    typeof record === 'object' &&
    record !== null &&
    'id' in record &&
    'categoryId' in record &&
    'templateCode' in record &&
    'versionNo' in record &&
    'status' in record
  )
}

function archiveTemplateVersionRecord(record: unknown): PortfolioArchiveTemplateVersionVO {
  if (!isArchiveTemplateVersionRecord(record)) {
    throw new Error('档案模板版本行契约异常')
  }
  return record
}

interface DiffParseError {
  message: string
}

const fieldColumns: ColumnsType = [
  { title: '字段编码', dataIndex: 'fieldCode', key: 'fieldCode', width: 140 },
  { title: '字段名称', dataIndex: 'fieldLabel', key: 'fieldLabel' },
  { title: '类型', dataIndex: 'fieldType', key: 'fieldType', width: 72 },
  { title: '必填', dataIndex: 'required', key: 'required', width: 56 },
  { title: '只读', dataIndex: 'readonly', key: 'readonly', width: 56 },
  { title: '来源', dataIndex: 'sourceType', key: 'sourceType', width: 88 },
  { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 56 },
  { title: '操作', key: 'actions', width: 120 },
]

const historyColumns: ColumnsType = [
  { title: '版本号', dataIndex: 'versionNo', key: 'versionNo', width: 160 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '发布时间', dataIndex: 'publishedTime', key: 'publishedTime', width: 180 },
  { title: '摘要', dataIndex: 'changeSummary', key: 'changeSummary', ellipsis: true },
  { title: '操作', key: 'actions', width: 80 },
]

const loading = ref(false)
const seeding = ref(false)
const treeData = ref<TreeNode[]>([])
const selectedNode = ref<TreeNode | null>(null)
const activeVersionId = ref<string | null>(null)
const fields = ref<PortfolioArchiveFieldDefVO[]>([])
const versionHistory = ref<PortfolioArchiveTemplateVersionVO[]>([])
const changeLogs = ref<PortfolioArchiveTemplateChangeLogVO[]>([])
const historyVisible = ref(false)
const auditFlowCode = ref('')
const categoryVisible = ref(false)
const fieldVisible = ref(false)
const publishVisible = ref(false)
const fieldEditing = ref(false)
const categoryEditing = ref(false)
const publishSummary = ref('')
const scopeFilter = ref<PortfolioArchiveCategorySaveRequest['scope'] | undefined>(undefined)
const teacherReadiness = ref<PortfolioArchiveTeacherReadinessVO | null>(null)

const authStore = useAuthStore()
const userStore = useUserStore()
const canManageTenant = computed(() =>
  hasTeacherTenantPermission({
    roleKey: authStore.userRole,
    isTenantAdmin: userStore.isTenantAdmin,
  }),
)

const categoryEditor = reactive<PortfolioArchiveCategorySaveRequest>({
  categoryCode: '',
  categoryName: '',
  scope: PortfolioArchiveCategoryScopeCode.SCHOOL,
  status: PortfolioArchiveCategoryStatusCode.ACTIVE,
  sortOrder: 0,
})

const fieldEditor = reactive<PortfolioArchiveFieldDefSaveRequest>({
  templateVersionId: '',
  fieldCode: '',
  fieldLabel: '',
  fieldType: PortfolioArchiveFieldTypeCode.TEXT,
  required: false,
  readonly: false,
  sourceType: PortfolioArchiveFieldSourceTypeCode.MANUAL,
  sortOrder: 0,
})

const selectedCategory = computed(() => selectedNode.value?.raw ?? null)
const versionStatusLabel = computed(() => {
  const current = versionHistory.value.find((item) => item.id === activeVersionId.value)
  return current?.status
    ? strictEnumLabel(
        PortfolioArchiveTemplateVersionStatusDescription,
        current.status,
        '模板版本状态',
      )
    : '-'
})

const activeVersion = computed(
  () => versionHistory.value.find((item) => item.id === activeVersionId.value) ?? null,
)

const versionOptions = computed(() =>
  versionHistory.value.map(
    (item): { value: PortfolioArchiveTemplateVersionVO['id']; label: string } => ({
      value: item.id,
      label: `${item.versionNo} (${strictEnumLabel(PortfolioArchiveTemplateVersionStatusDescription, item.status, '模板版本状态')})`,
    }),
  ),
)

const canEditFields = computed(
  () => activeVersion.value?.status === 'DRAFT' || activeVersion.value?.status === 'TRIAL',
)

const canDeprecate = computed(() => activeVersion.value?.status === 'PUBLISHED')

const publishedVersionId = computed(() => selectedCategory.value?.publishedVersionId ?? null)

const canViewPublished = computed(
  () => publishedVersionId.value != null && activeVersionId.value !== publishedVersionId.value,
)

const fieldModalTitle = computed(() => (fieldEditing.value ? '编辑字段' : '新增字段'))

const categoryModalTitle = computed(() => {
  if (categoryEditing.value) return '编辑分类'
  return categoryEditor.parentId ? '新建子分类' : '新建根分类'
})

const parentCategoryOptions = computed(() => {
  const excludeId = categoryEditing.value ? categoryEditor.id : undefined
  return flattenCategoryOptions(treeData.value, excludeId)
})

const parsedChangeLogs = computed(() =>
  changeLogs.value.map((item) => ({
    item,
    diff: parseDiffSummary(item.diffSummaryJson),
  })),
)

function flattenCategoryOptions(nodes: TreeNode[], excludeId?: string) {
  const options: { value: string; label: string }[] = []
  for (const node of nodes) {
    if (excludeId && node.key === excludeId) continue
    options.push({ value: node.key, label: node.title })
    if (node.children?.length) options.push(...flattenCategoryOptions(node.children, excludeId))
  }
  return options
}

function parseDiffSummary(json?: string): PortfolioArchiveTemplateDiffSummary | DiffParseError {
  if (!json?.trim()) return { message: '无变更摘要' }
  try {
    const parsed: unknown = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return { message: '变更摘要格式异常' }
    const readCodes = (key: string): string[] => {
      const val = Object.getOwnPropertyDescriptor(parsed, key)?.value
      if (!Array.isArray(val)) throw new Error(`diff.${key} 必须为数组`)
      return val.map((item) => {
        if (typeof item !== 'string') throw new Error(`diff.${key} 元素必须为字符串`)
        return item
      })
    }
    return {
      added: readCodes('added'),
      removed: readCodes('removed'),
      changed: readCodes('changed'),
    }
  } catch {
    return { message: '变更摘要 JSON 解析失败' }
  }
}

function isDiffSummary(
  value: PortfolioArchiveTemplateDiffSummary | DiffParseError,
): value is PortfolioArchiveTemplateDiffSummary {
  return !('message' in value)
}

function mapTree(nodes: PortfolioArchiveCategoryTreeNodeVO[]): TreeNode[] {
  return nodes.map((node) => ({
    key: node.id,
    title: `${node.categoryName} (${node.categoryCode})`,
    raw: node,
    children: node.children?.length ? mapTree(node.children) : undefined,
  }))
}

async function loadTree() {
  loading.value = true
  try {
    const res = await portfolioArchiveTemplateApi.listCategoryTree(
      scopeFilter.value ? { scope: scopeFilter.value } : undefined,
    )
    treeData.value = mapTree(res ?? [])
    if (selectedNode.value) {
      const refreshed = findTreeNode(treeData.value, selectedNode.value.key)
      if (refreshed) selectedNode.value = refreshed
    }
  } catch (error) {
    showUserError(error, '加载档案分类失败')
  } finally {
    loading.value = false
  }
}

function findTreeNode(nodes: TreeNode[], key: string): TreeNode | null {
  for (const node of nodes) {
    if (node.key === key) return node
    if (node.children?.length) {
      const found = findTreeNode(node.children, key)
      if (found) return found
    }
  }
  return null
}

async function selectCategory(node: TreeNode) {
  selectedNode.value = node
  activeVersionId.value = node.raw.draftVersionId ?? node.raw.publishedVersionId ?? null
  await loadHistory()
  await loadAuditFlowBinding()
  if (!activeVersionId.value && versionHistory.value.length)
    activeVersionId.value = versionHistory.value[0].id
  await loadFields()
}

async function loadAuditFlowBinding() {
  if (!selectedCategory.value) {
    auditFlowCode.value = ''
    return
  }
  try {
    const binding = await portfolioArchiveTemplateApi.getAuditFlowBinding({
      categoryId: selectedCategory.value.id,
    })
    auditFlowCode.value = binding?.auditFlowCode ?? ''
  } catch (error) {
    showUserError(error, '加载审核流绑定失败')
  }
}

async function bindAuditFlow() {
  if (!selectedCategory.value || !auditFlowCode.value.trim()) {
    message.error('请先填写审核流编码')
    return
  }
  try {
    await portfolioArchiveTemplateApi.bindAuditFlow({
      categoryId: selectedCategory.value.id,
      auditFlowCode: auditFlowCode.value.trim(),
    })
    message.success('审核流已绑定')
    await loadAuditFlowBinding()
  } catch (error) {
    showUserError(error, '绑定审核流失败')
  }
}

async function switchVersion(versionId: PortfolioArchiveTemplateVersionVO['id']) {
  activeVersionId.value = versionId
  await loadFields()
}

function onVersionSelect(value: SelectValue): void {
  if (value == null || Array.isArray(value)) return
  const versionId = typeof value === 'object' ? String(value.value) : String(value)
  if (!versionId) return
  void switchVersion(versionId)
}

function viewPublishedVersion() {
  if (publishedVersionId.value) switchVersion(publishedVersionId.value)
}

function selectVersionFromHistory(record: PortfolioArchiveTemplateVersionVO) {
  switchVersion(record.id)
  historyVisible.value = false
}

async function loadFields() {
  if (!activeVersionId.value) {
    fields.value = []
    return
  }
  try {
    fields.value =
      (await portfolioArchiveTemplateApi.listFieldDefs({
        templateVersionId: activeVersionId.value,
      })) ?? []
  } catch (error) {
    showUserError(error, '加载字段失败')
  }
}

async function loadHistory() {
  if (!selectedCategory.value) {
    versionHistory.value = []
    changeLogs.value = []
    return
  }
  try {
    const categoryId = selectedCategory.value.id
    versionHistory.value =
      (await portfolioArchiveTemplateApi.listVersionHistory({ categoryId })) ?? []
    changeLogs.value = (await portfolioArchiveTemplateApi.listChangeHistory({ categoryId })) ?? []
  } catch (error) {
    showUserError(error, '加载版本历史失败')
  }
}

function resetCategoryEditor() {
  Object.assign(categoryEditor, {
    id: undefined,
    categoryCode: '',
    categoryName: '',
    parentId: undefined,
    scope: 'SCHOOL',
    status: 'ACTIVE',
    sortOrder: 0,
  })
}

function openCreateCategory() {
  categoryEditing.value = false
  resetCategoryEditor()
  categoryVisible.value = true
}

function openCreateSubCategory() {
  if (!selectedCategory.value) {
    message.warning('请先选择父分类')
    return
  }
  categoryEditing.value = false
  resetCategoryEditor()
  categoryEditor.parentId = selectedCategory.value.id
  categoryVisible.value = true
}

function openEditCategory() {
  if (!selectedCategory.value) return
  categoryEditing.value = true
  Object.assign(categoryEditor, {
    id: selectedCategory.value.id,
    categoryCode: selectedCategory.value.categoryCode,
    categoryName: selectedCategory.value.categoryName,
    parentId: selectedCategory.value.parentId,
    scope: selectedCategory.value.scope,
    status: selectedCategory.value.status,
    sortOrder: selectedCategory.value.sortOrder ?? 0,
  })
  categoryVisible.value = true
}

async function deactivateCategory() {
  if (
    !selectedCategory.value ||
    selectedCategory.value.status === PortfolioArchiveCategoryStatusCode.INACTIVE
  )
    return
  if (
    !(await confirmAsync({
      content: `确认停用分类「${selectedCategory.value.categoryName}」？停用后 AI 将无法解析该分类。`,
    }))
  ) {
    return
  }
  try {
    await portfolioArchiveTemplateApi.saveCategory({
      id: selectedCategory.value.id,
      categoryCode: selectedCategory.value.categoryCode,
      categoryName: selectedCategory.value.categoryName,
      parentId: selectedCategory.value.parentId,
      scope: selectedCategory.value.scope,
      status: PortfolioArchiveCategoryStatusCode.INACTIVE,
      sortOrder: selectedCategory.value.sortOrder,
    })
    message.success('分类已停用')
    await loadTree()
    if (selectedNode.value) await selectCategory(selectedNode.value)
  } catch (error) {
    showUserError(error, '停用分类失败')
  }
}

async function deleteCategory() {
  if (!selectedCategory.value) return
  if (
    !(await confirmAsync({
      content: `确认删除分类「${selectedCategory.value.categoryName}」？存在子分类时无法删除。`,
    }))
  ) {
    return
  }
  try {
    await portfolioArchiveTemplateApi.deleteCategory({ categoryId: selectedCategory.value.id })
    message.success('分类已删除')
    selectedNode.value = null
    fields.value = []
    versionHistory.value = []
    changeLogs.value = []
    activeVersionId.value = null
    await loadTree()
  } catch (error) {
    showUserError(error, '删除分类失败')
  }
}

async function onScopeFilterChange() {
  selectedNode.value = null
  fields.value = []
  versionHistory.value = []
  changeLogs.value = []
  activeVersionId.value = null
  await loadTree()
}

async function submitCategory() {
  try {
    await portfolioArchiveTemplateApi.saveCategory({
      id: categoryEditor.id,
      categoryCode: categoryEditor.categoryCode.trim(),
      categoryName: categoryEditor.categoryName.trim(),
      parentId: categoryEditor.parentId,
      scope: categoryEditor.scope,
      sortOrder: categoryEditor.sortOrder,
      status: categoryEditor.status,
    })
    message.success('分类已保存')
    categoryVisible.value = false
    await loadTree()
  } catch (error) {
    showUserError(error, '保存分类失败')
  }
}

async function runSeedDefaults() {
  if (
    !(await confirmAsync({
      content: '将初始化 CERTIFICATE / DOCUMENT 默认分类与已发布字段，已存在的跳过。',
    }))
  ) {
    return
  }
  seeding.value = true
  try {
    const result = await portfolioArchiveTemplateApi.seedDefaultTemplates()
    const created = result?.createdCategoryCodes?.length ?? 0
    const skipped = result?.skippedCategoryCodes?.length ?? 0
    message.success(`初始化完成：新建 ${created}，跳过 ${skipped}`)
    await loadTree()
  } catch (error) {
    showUserError(error, '初始化默认模板失败')
  } finally {
    seeding.value = false
  }
}

async function ensureDraftVersion() {
  if (!selectedCategory.value) return null
  const versionId = await portfolioArchiveTemplateApi.saveDraftVersion({
    categoryId: selectedCategory.value.id,
  })
  activeVersionId.value = versionId
  await loadTree()
  if (selectedNode.value) selectedNode.value.raw.draftVersionId = versionId
  return versionId
}

function openCreateField() {
  if (!activeVersionId.value) {
    message.warning('请先创建草稿版本')
    return
  }
  if (!canEditFields.value) {
    message.warning('仅草稿或试算版本可编辑字段')
    return
  }
  fieldEditing.value = false
  Object.assign(fieldEditor, {
    id: undefined,
    templateVersionId: activeVersionId.value,
    fieldCode: '',
    fieldLabel: '',
    fieldType: 'TEXT',
    required: false,
    readonly: false,
    enumRef: undefined,
    sourceType: 'MANUAL',
    sortOrder: fields.value.length,
  })
  fieldVisible.value = true
}

function openEditField(record: PortfolioArchiveFieldDefVO) {
  if (!canEditFields.value) {
    message.warning('仅草稿或试算版本可编辑字段')
    return
  }
  fieldEditing.value = true
  Object.assign(fieldEditor, {
    id: record.id,
    templateVersionId: record.templateVersionId,
    fieldCode: record.fieldCode,
    fieldLabel: record.fieldLabel,
    fieldType: record.fieldType,
    required: record.required ?? false,
    readonly: record.readonly ?? false,
    sourceType: record.sourceType,
    enumRef: record.enumRef,
    sortOrder: record.sortOrder ?? 0,
  })
  fieldVisible.value = true
}

async function removeField(record: PortfolioArchiveFieldDefVO) {
  if (!activeVersionId.value || !canEditFields.value) return
  if (!(await confirmAsync({ content: `确认删除字段「${record.fieldLabel}」？` }))) return
  try {
    await portfolioArchiveTemplateApi.deleteFieldDef({
      fieldId: record.id,
      templateVersionId: activeVersionId.value,
    })
    message.success('字段已删除')
    await loadFields()
  } catch (error) {
    showUserError(error, '删除字段失败')
  }
}

function handleArchiveFieldAction(key: string, record: PortfolioArchiveFieldDefVO) {
  if (key === 'edit') openEditField(record)
  else if (key === 'delete') void removeField(record)
}

async function submitField() {
  try {
    fieldEditor.templateVersionId = activeVersionId.value ?? fieldEditor.templateVersionId
    await portfolioArchiveTemplateApi.saveFieldDef({
      id: fieldEditor.id,
      templateVersionId: fieldEditor.templateVersionId,
      fieldCode: fieldEditor.fieldCode.trim(),
      fieldLabel: fieldEditor.fieldLabel.trim(),
      fieldType: fieldEditor.fieldType,
      required: fieldEditor.required,
      readonly: fieldEditor.readonly,
      enumRef: fieldEditor.enumRef?.trim() || undefined,
      sourceType: fieldEditor.sourceType,
      sortOrder: fieldEditor.sortOrder,
    })
    message.success('字段已保存')
    fieldVisible.value = false
    await loadFields()
  } catch (error) {
    showUserError(error, '保存字段失败')
  }
}

async function runTrial() {
  if (!selectedCategory.value || !activeVersionId.value) return
  try {
    await portfolioArchiveTemplateApi.trialVersion({
      categoryId: selectedCategory.value.id,
      templateVersionId: activeVersionId.value,
    })
    message.success('试算通过')
    await loadHistory()
    await loadFields()
  } catch (error) {
    showUserError(error, '试算失败')
  }
}

function openPublishModal() {
  if (!selectedCategory.value || !activeVersionId.value || !canEditFields.value) return
  publishSummary.value = ''
  publishVisible.value = true
}

async function submitPublish() {
  if (!selectedCategory.value || !activeVersionId.value) return
  if (!publishSummary.value.trim()) {
    message.warning('请填写发布变更摘要')
    return
  }
  try {
    await portfolioArchiveTemplateApi.publishVersion({
      categoryId: selectedCategory.value.id,
      templateVersionId: activeVersionId.value,
      changeSummary: publishSummary.value.trim(),
    })
    message.success('发布成功')
    publishVisible.value = false
    await loadTree()
    if (selectedNode.value) await selectCategory(selectedNode.value)
  } catch (error) {
    showUserError(error, '发布失败')
  }
}

async function runDeprecate() {
  if (!selectedCategory.value || !activeVersionId.value || !canDeprecate.value) return
  if (
    !(await confirmAsync({ content: '确认停用当前已发布版本？停用后 AI 将无法读取该版本字段。' }))
  )
    return
  try {
    await portfolioArchiveTemplateApi.deprecateVersion({
      categoryId: selectedCategory.value.id,
      templateVersionId: activeVersionId.value,
    })
    message.success('版本已停用')
    await loadTree()
    if (selectedNode.value) await selectCategory(selectedNode.value)
  } catch (error) {
    showUserError(error, '停用版本失败')
  }
}

const onTreeSelect: TreeProps['onSelect'] = (_keys, info) => {
  if (!info.node) {
    return
  }
  if (!isTreeNode(info.node)) {
    throw new Error('档案模板分类树节点契约异常')
  }
  selectCategory(info.node)
}

async function loadTeacherReadiness() {
  try {
    teacherReadiness.value = await portfolioArchiveTemplateApi.getTeacherReadiness()
  } catch (error) {
    teacherReadiness.value = null
    showUserError(error, '加载教师端模板就绪状态失败')
  }
}

onMounted(async () => {
  await loadTree()
  await loadTeacherReadiness()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="档案模板" />
    </template>
    <UiAlertStrip
      v-if="teacherReadiness && !teacherReadiness.templatePublished"
      tone="warning"
      :closable="false"
      :title="teacherReadiness.blockingReason || '教师端档案模板尚未发布'"
      :description="teacherReadiness.adminContactHint"
    />
    <UiAlertStrip
      v-else-if="teacherReadiness?.templatePublished"
      tone="success"
      :title="`教师端模板已就绪 · 启用分类 ${teacherReadiness.categoryCount} 个`"
    />
    <div class="template-layout">
      <UiCard class="tree-panel" title="档案分类">
        <div class="toolbar scope-filter">
          <span class="filter-label">适用范围</span>
          <a-select
            v-model:value="scopeFilter"
            allow-clear
            placeholder="全部"
            :options="PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_OPTIONS"
            style="min-width: 140px"
            @change="onScopeFilterChange"
          />
        </div>
        <div v-if="canManageTenant" class="toolbar">
          <UiButton variant="primary" @click="openCreateCategory"> 新建根分类 </UiButton>
          <UiButton :disabled="!selectedCategory" @click="openCreateSubCategory">
            新建子分类
          </UiButton>
          <UiButton :disabled="!selectedCategory" @click="openEditCategory"> 编辑分类 </UiButton>
          <UiButton
            :disabled="!selectedCategory || selectedCategory?.status === 'INACTIVE'"
            @click="deactivateCategory"
          >
            停用分类
          </UiButton>
          <UiButton :disabled="!selectedCategory" status="danger" @click="deleteCategory">
            删除分类
          </UiButton>
          <UiButton :loading="seeding" @click="runSeedDefaults"> 初始化默认模板 </UiButton>
        </div>
        <a-tree
          v-if="treeData.length"
          :tree-data="treeData"
          block-node
          default-expand-all
          @select="onTreeSelect"
        />
        <UiEmpty v-else description="暂无分类，可初始化默认模板或新建根分类" />
      </UiCard>
      <UiCard class="detail-panel" :title="selectedCategory?.categoryName ?? '字段配置'">
        <template v-if="selectedCategory">
          <div class="meta-row">
            <UiTag>{{ selectedCategory.categoryCode }}</UiTag>
            <UiTag>
              {{
                strictEnumLabel(
                  PortfolioArchiveCategoryStatusDescription,
                  selectedCategory.status,
                  '分类状态',
                )
              }}
            </UiTag>
            <UiTag tone="blue"> 当前版本：{{ versionStatusLabel }} </UiTag>
            <a-select
              v-if="versionOptions.length"
              :value="activeVersionId ?? undefined"
              :options="versionOptions"
              style="min-width: 200px"
              placeholder="切换版本"
              @change="onVersionSelect"
            />
          </div>
          <p v-if="!canManageTenant" class="readonly-hint">
            当前为只读模式，可查看分类、字段与版本历史，不可编辑或发布。
          </p>
          <p v-else-if="activeVersion && !canEditFields" class="readonly-hint">
            当前版本只读，可查看字段；编辑请创建草稿或切换到草稿/试算版本。
          </p>
          <div v-if="canManageTenant" class="audit-flow-row">
            <span class="audit-flow-label">审核流</span>
            <a-input v-model:value="auditFlowCode" placeholder="审核流编码" style="width: 220px" />
            <UiButton size="sm" @click="bindAuditFlow"> 绑定 </UiButton>
            <UiButton size="sm" @click="auditFlowCode = PORTFOLIO_DEFAULT_AUDIT_FLOW_CODE">
              使用默认
            </UiButton>
          </div>
          <div v-if="canManageTenant" class="toolbar">
            <UiButton v-if="canViewPublished" @click="viewPublishedVersion"> 查看已发布 </UiButton>
            <UiButton @click="ensureDraftVersion"> 创建/获取草稿 </UiButton>
            <UiButton :disabled="!canEditFields" @click="openCreateField"> 新增字段 </UiButton>
            <UiButton :disabled="!canEditFields" @click="runTrial"> 试算 </UiButton>
            <UiButton variant="primary" :disabled="!canEditFields" @click="openPublishModal">
              发布
            </UiButton>
            <UiButton :disabled="!canDeprecate" @click="runDeprecate"> 停用版本 </UiButton>
            <UiTextAction @click="historyVisible = true"> 版本历史 </UiTextAction>
          </div>
          <div v-else-if="selectedCategory" class="toolbar">
            <UiTextAction @click="historyVisible = true"> 版本历史 </UiTextAction>
          </div>
          <UiDataTable
            :columns="fieldColumns"
            :data-source="fields"
            row-key="id"
            :loading="loading"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'fieldType'">
                {{
                  strictEnumLabel(
                    PortfolioArchiveFieldTypeDescription,
                    archiveFieldRecord(record).fieldType,
                    '档案字段类型',
                  )
                }}
              </template>
              <template v-else-if="column.key === 'sourceType'">
                {{
                  strictEnumLabel(
                    PortfolioArchiveFieldSourceTypeDescription,
                    archiveFieldRecord(record).sourceType,
                    '档案字段来源',
                  )
                }}
              </template>
              <template v-else-if="column.key === 'required'">
                {{ archiveFieldRecord(record).required ? '是' : '否' }}
              </template>
              <template v-else-if="column.key === 'readonly'">
                {{ archiveFieldRecord(record).readonly ? '是' : '否' }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  v-if="canManageTenant && canEditFields"
                  :items="[
                    { key: 'edit', label: '编辑' },
                    { key: 'delete', label: '删除', tone: 'danger' },
                  ]"
                  split
                  @action="(key) => handleArchiveFieldAction(key, archiveFieldRecord(record))"
                />
              </template>
            </template>
          </UiDataTable>
        </template>
        <UiEmpty v-else description="请选择左侧分类" />
      </UiCard>
    </div>

    <a-modal v-model:open="categoryVisible" :title="categoryModalTitle" @ok="submitCategory">
      <a-form layout="vertical">
        <a-form-item v-if="parentCategoryOptions.length" label="父分类">
          <a-select
            v-model:value="categoryEditor.parentId"
            allow-clear
            placeholder="留空为根分类"
            :options="parentCategoryOptions"
          />
        </a-form-item>
        <a-form-item label="分类编码" required>
          <a-input v-model:value="categoryEditor.categoryCode" :disabled="!!categoryEditor.id" />
        </a-form-item>
        <a-form-item label="分类名称" required>
          <a-input v-model:value="categoryEditor.categoryName" />
        </a-form-item>
        <a-form-item label="适用范围">
          <a-select
            v-model:value="categoryEditor.scope"
            :options="PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_OPTIONS"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="categoryEditor.status"
            :options="PORTFOLIO_ARCHIVE_CATEGORY_STATUS_OPTIONS"
          />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model:value="categoryEditor.sortOrder" :min="0" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="fieldVisible" :title="fieldModalTitle" @ok="submitField">
      <a-form layout="vertical">
        <a-form-item label="字段编码" required>
          <a-input v-model:value="fieldEditor.fieldCode" :disabled="!!fieldEditor.id" />
        </a-form-item>
        <a-form-item label="字段名称" required>
          <a-input v-model:value="fieldEditor.fieldLabel" />
        </a-form-item>
        <a-form-item label="字段类型">
          <a-select
            v-model:value="fieldEditor.fieldType"
            :options="PORTFOLIO_ARCHIVE_FIELD_TYPE_OPTIONS"
          />
        </a-form-item>
        <a-form-item label="来源类型">
          <a-select
            v-model:value="fieldEditor.sourceType"
            :options="PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_OPTIONS"
          />
        </a-form-item>
        <a-form-item v-if="fieldEditor.fieldType === 'ENUM'" label="枚举引用">
          <a-input v-model:value="fieldEditor.enumRef" placeholder="字典编码" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model:value="fieldEditor.sortOrder" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="必填">
          <a-switch v-model:checked="fieldEditor.required" />
        </a-form-item>
        <a-form-item label="只读">
          <a-switch v-model:checked="fieldEditor.readonly" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="publishVisible"
      title="发布模板版本"
      ok-text="确认发布"
      @ok="submitPublish"
    >
      <a-form layout="vertical">
        <a-form-item label="变更摘要" required>
          <a-textarea v-model:value="publishSummary" :rows="3" placeholder="说明本次发布变更内容" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="historyVisible" title="版本历史" width="720">
      <UiDataTable :columns="historyColumns" :data-source="versionHistory" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            {{
              strictEnumLabel(
                PortfolioArchiveTemplateVersionStatusDescription,
                archiveTemplateVersionRecord(record).status,
                '模板版本状态',
              )
            }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[{ key: 'view', label: '查看' }]"
              split
              @action="() => selectVersionFromHistory(archiveTemplateVersionRecord(record))"
            />
          </template>
        </template>
      </UiDataTable>
      <div v-if="changeLogs.length" class="change-log">
        <h4>发布变更</h4>
        <div v-for="{ item, diff } in parsedChangeLogs" :key="item.id" class="change-log-item">
          <div class="change-log-meta">
            版本 {{ item.toVersionId }}
            <span v-if="item.createTime"> · {{ item.createTime }}</span>
          </div>
          <template v-if="isDiffSummary(diff)">
            <div v-if="diff.added.length" class="diff-row">
              <span class="diff-label">新增</span>
              <UiTag v-for="code in diff.added" :key="`a-${item.id}-${code}`" tone="blue">
                {{ code }}
              </UiTag>
            </div>
            <div v-if="diff.removed.length" class="diff-row">
              <span class="diff-label">删除</span>
              <UiTag v-for="code in diff.removed" :key="`r-${item.id}-${code}`" tone="red">
                {{ code }}
              </UiTag>
            </div>
            <div v-if="diff.changed.length" class="diff-row">
              <span class="diff-label">变更</span>
              <UiTag v-for="code in diff.changed" :key="`c-${item.id}-${code}`">
                {{ code }}
              </UiTag>
            </div>
          </template>
          <p v-else class="diff-error">
            {{ diff.message }}
          </p>
        </div>
      </div>
    </a-drawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.template-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.scope-filter {
  align-items: center;
}
.filter-label {
  font-size: 14px;
  color: var(--ant-color-text-secondary);
}
.audit-flow-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.audit-flow-label {
  color: var(--dp-text-secondary);
  font-size: 14px;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.readonly-hint {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--ant-color-text-secondary);
}
.change-log {
  margin-top: 16px;
}
.change-log h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}
.change-log-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--ant-color-border-secondary);
}
.change-log-meta {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}
.diff-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.diff-label {
  min-width: 32px;
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}
.diff-error {
  margin: 0;
  font-size: 12px;
  color: var(--ant-color-error);
}
</style>
