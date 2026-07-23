<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { TreeProps } from 'ant-design-vue/es/tree'
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
import message from 'ant-design-vue/es/message'
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
  PortfolioArchiveTemplateVersionStatusCode,
  PortfolioArchiveTemplateVersionStatusDescription,
} from '@/apis/portfolio/enums'
import {
  PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_OPTIONS,
  PORTFOLIO_ARCHIVE_CATEGORY_STATUS_OPTIONS,
  PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_OPTIONS,
  PORTFOLIO_ARCHIVE_FIELD_TYPE_OPTIONS,
  PORTFOLIO_DEFAULT_AUDIT_FLOW_CODE,
} from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import UiTree from '@/components/ui-guide/ui/UiTree.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
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
    typeof value === 'object'
    && value !== null
    && 'key' in value
    && 'title' in value
    && 'raw' in value
  )
}

function isArchiveFieldRecord(record: unknown): record is PortfolioArchiveFieldDefVO {
  return (
    typeof record === 'object'
    && record !== null
    && 'id' in record
    && 'templateVersionId' in record
    && 'fieldCode' in record
    && 'fieldLabel' in record
    && 'fieldType' in record
    && 'sourceType' in record
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
    typeof record === 'object'
    && record !== null
    && 'id' in record
    && 'categoryId' in record
    && 'templateCode' in record
    && 'versionNo' in record
    && 'status' in record
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

const treeLoading = ref(false)
const fieldLoading = ref(false)
const historyLoading = ref(false)
const treeLoadError = ref('')
const fieldLoadError = ref('')
const historyLoadError = ref('')
const readinessLoadError = ref('')
const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const seeding = computed(() => operationKey.value === 'template:seed')
const treeData = ref<TreeNode[]>([])
const selectedNode = ref<TreeNode | null>(null)
const activeVersionId = ref<string | null>(null)
const fields = ref<PortfolioArchiveFieldDefVO[]>([])
const versionHistory = ref<PortfolioArchiveTemplateVersionVO[]>([])
const changeLogs = ref<PortfolioArchiveTemplateChangeLogVO[]>([])
const categoryRequestToken = ref(0)
const fieldRequestToken = ref(0)
const treeRequestToken = ref(0)
const readinessRequestToken = ref(0)
const historyRequestToken = ref(0)
const auditFlowRequestToken = ref(0)
const historyVisible = ref(false)
const auditFlowCode = ref('')
const auditFlowState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const auditFlowLoadedCategoryId = ref('')
const categoryVisible = ref(false)
const fieldVisible = ref(false)
const publishVisible = ref(false)
const fieldEditing = ref(false)
const categoryEditing = ref(false)
const publishSummary = ref('')
const scopeFilter = ref<PortfolioArchiveCategorySaveRequest['scope'] | undefined>(undefined)
const teacherReadiness = ref<PortfolioArchiveTeacherReadinessVO | null>(null)
const interactionLocked = computed(
  () => writing.value || categoryVisible.value || fieldVisible.value || publishVisible.value,
)

/** 模板治理状态写必须串行，避免分类、字段和版本状态被并发推进。 */
function beginOperation(key: string): boolean {
  if (writing.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}

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
    (item): { value: PortfolioArchiveTemplateVersionVO['id'], label: string } => ({
      value: item.id,
      label: `${item.versionNo} (${strictEnumLabel(PortfolioArchiveTemplateVersionStatusDescription, item.status, '模板版本状态')})`,
    }),
  ),
)

const canEditFields = computed(
  () =>
    activeVersion.value?.status === PortfolioArchiveTemplateVersionStatusCode.DRAFT
    || activeVersion.value?.status === PortfolioArchiveTemplateVersionStatusCode.TRIAL,
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
    diff: resolveDiffSummary(item.diffSummary),
  })),
)

function flattenCategoryOptions(nodes: TreeNode[], excludeId?: string) {
  const options: { value: string, label: string }[] = []
  for (const node of nodes) {
    if (excludeId && node.key === excludeId) continue
    options.push({ value: node.key, label: node.title })
    if (node.children?.length) options.push(...flattenCategoryOptions(node.children, excludeId))
  }
  return options
}

function resolveDiffSummary(
  summary?: PortfolioArchiveTemplateDiffSummary,
): PortfolioArchiveTemplateDiffSummary | DiffParseError {
  if (!summary) return { message: '无变更摘要' }
  return {
    added: summary.added ?? [],
    removed: summary.removed ?? [],
    changed: summary.changed ?? [],
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
  const currentToken = treeRequestToken.value + 1
  treeRequestToken.value = currentToken
  const request = scopeFilter.value ? { scope: scopeFilter.value } : undefined
  treeLoading.value = true
  treeLoadError.value = ''
  try {
    const res = await portfolioArchiveTemplateApi.listCategoryTree(request)
    if (treeRequestToken.value !== currentToken) return
    treeData.value = mapTree(res ?? [])
    if (selectedNode.value) {
      const refreshed = findTreeNode(treeData.value, selectedNode.value.key)
      if (refreshed) {
        selectedNode.value = refreshed
      } else {
        categoryRequestToken.value += 1
        fieldRequestToken.value += 1
        selectedNode.value = null
        activeVersionId.value = null
        fields.value = []
        versionHistory.value = []
        changeLogs.value = []
        auditFlowCode.value = ''
        auditFlowLoadedCategoryId.value = ''
        auditFlowState.value = 'idle'
      }
    }
  } catch (error) {
    if (treeRequestToken.value !== currentToken) return
    treeData.value = []
    categoryRequestToken.value += 1
    fieldRequestToken.value += 1
    selectedNode.value = null
    activeVersionId.value = null
    fields.value = []
    versionHistory.value = []
    changeLogs.value = []
    auditFlowCode.value = ''
    auditFlowLoadedCategoryId.value = ''
    auditFlowState.value = 'idle'
    treeLoadError.value = '档案分类加载失败，请重试'
    showUserError(error, '加载档案分类失败')
  } finally {
    if (treeRequestToken.value === currentToken) treeLoading.value = false
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
  const currentToken = ++categoryRequestToken.value
  selectedNode.value = node
  auditFlowCode.value = ''
  auditFlowLoadedCategoryId.value = ''
  auditFlowState.value = 'loading'
  activeVersionId.value = node.raw.draftVersionId ?? node.raw.publishedVersionId ?? null
  fields.value = []
  await loadHistory(currentToken)
  if (currentToken !== categoryRequestToken.value) return
  await loadAuditFlowBinding(currentToken)
  if (currentToken !== categoryRequestToken.value) return
  if (!activeVersionId.value && versionHistory.value.length)
    activeVersionId.value = versionHistory.value[0].id
  await loadFields()
}

async function loadAuditFlowBinding(expectedToken = categoryRequestToken.value) {
  const currentToken = auditFlowRequestToken.value + 1
  auditFlowRequestToken.value = currentToken
  if (!selectedCategory.value) {
    auditFlowCode.value = ''
    auditFlowLoadedCategoryId.value = ''
    auditFlowState.value = 'idle'
    return
  }
  const categoryId = selectedCategory.value.id
  auditFlowCode.value = ''
  auditFlowLoadedCategoryId.value = ''
  auditFlowState.value = 'loading'
  try {
    const binding = await portfolioArchiveTemplateApi.getAuditFlowBinding({
      categoryId,
    })
    if (
      expectedToken !== categoryRequestToken.value
      || auditFlowRequestToken.value !== currentToken
    ) {
      return
    }
    auditFlowCode.value = binding?.auditFlowCode ?? ''
    auditFlowLoadedCategoryId.value = categoryId
    auditFlowState.value = 'ready'
  } catch (error) {
    if (
      expectedToken !== categoryRequestToken.value
      || auditFlowRequestToken.value !== currentToken
    ) {
      return
    }
    auditFlowCode.value = ''
    auditFlowLoadedCategoryId.value = ''
    auditFlowState.value = 'error'
    showUserError(error, '加载审核流绑定失败')
  }
}

async function bindAuditFlow() {
  if (
    !selectedCategory.value
    || auditFlowState.value !== 'ready'
    || auditFlowLoadedCategoryId.value !== selectedCategory.value.id
  ) {
    void message.error('当前分类审核流尚未就绪，请先重新加载')
    return
  }
  if (!auditFlowCode.value.trim()) {
    void message.error('请先填写审核流编码')
    return
  }
  const categoryId = selectedCategory.value.id
  const auditFlowCodeValue = auditFlowCode.value.trim()
  const operation = `audit-flow:bind:${categoryId}`
  if (!beginOperation(operation)) return
  try {
    await portfolioArchiveTemplateApi.bindAuditFlow({
      categoryId,
      auditFlowCode: auditFlowCodeValue,
    })
    void message.success('审核流已绑定')
    await loadAuditFlowBinding()
  } catch (error) {
    showUserError(error, '绑定审核流失败')
  } finally {
    endOperation(operation)
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
  const currentToken = ++fieldRequestToken.value
  if (!activeVersionId.value) {
    fields.value = []
    fieldLoadError.value = ''
    return
  }
  const versionId = activeVersionId.value
  fields.value = []
  fieldLoading.value = true
  fieldLoadError.value = ''
  try {
    const nextFields = await portfolioArchiveTemplateApi.listFieldDefs({
      templateVersionId: versionId,
    })
    if (currentToken !== fieldRequestToken.value || activeVersionId.value !== versionId) return
    fields.value = nextFields ?? []
  } catch (error) {
    if (currentToken !== fieldRequestToken.value || activeVersionId.value !== versionId) return
    fields.value = []
    fieldLoadError.value = '模板字段加载失败，请重试'
    showUserError(error, '加载字段失败')
  } finally {
    if (currentToken === fieldRequestToken.value) fieldLoading.value = false
  }
}

async function loadHistory(expectedToken = categoryRequestToken.value) {
  const currentToken = historyRequestToken.value + 1
  historyRequestToken.value = currentToken
  if (!selectedCategory.value) {
    versionHistory.value = []
    changeLogs.value = []
    historyLoadError.value = ''
    return
  }
  const categoryId = selectedCategory.value.id
  historyLoading.value = true
  historyLoadError.value = ''
  try {
    const nextVersionHistory = await portfolioArchiveTemplateApi.listVersionHistory({ categoryId })
    if (
      expectedToken !== categoryRequestToken.value
      || historyRequestToken.value !== currentToken
    ) {
      return
    }
    versionHistory.value = nextVersionHistory ?? []
    try {
      const nextChangeLogs = await portfolioArchiveTemplateApi.listChangeHistory({ categoryId })
      if (
        expectedToken !== categoryRequestToken.value
        || historyRequestToken.value !== currentToken
      ) {
        return
      }
      changeLogs.value = nextChangeLogs ?? []
    } catch (error) {
      if (
        expectedToken !== categoryRequestToken.value
        || historyRequestToken.value !== currentToken
      ) {
        return
      }
      changeLogs.value = []
      showUserError(error, '加载模板变更历史失败')
    }
  } catch (error) {
    if (
      expectedToken !== categoryRequestToken.value
      || historyRequestToken.value !== currentToken
    ) {
      return
    }
    versionHistory.value = []
    changeLogs.value = []
    historyLoadError.value = '模板版本历史加载失败，请重试'
    showUserError(error, '加载版本历史失败')
  } finally {
    if (
      expectedToken === categoryRequestToken.value
      && historyRequestToken.value === currentToken
    ) {
      historyLoading.value = false
    }
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
  if (interactionLocked.value) return
  categoryEditing.value = false
  resetCategoryEditor()
  categoryVisible.value = true
}

function openCreateSubCategory() {
  if (interactionLocked.value) return
  if (!selectedCategory.value) {
    showFormValidationMessage('请先选择父分类')
    return
  }
  categoryEditing.value = false
  resetCategoryEditor()
  categoryEditor.parentId = selectedCategory.value.id
  categoryVisible.value = true
}

function openEditCategory() {
  if (interactionLocked.value) return
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
    !selectedCategory.value
    || selectedCategory.value.status === PortfolioArchiveCategoryStatusCode.INACTIVE
  ) {
    return
  }
  const category = { ...selectedCategory.value }
  const operation = `category:deactivate:${category.id}`
  if (!beginOperation(operation)) return
  if (
    !(await confirmAsync({
      content: `确认停用分类「${category.categoryName}」？停用后智能分析将无法解析该分类。`,
    }))
  ) {
    endOperation(operation)
    return
  }
  try {
    await portfolioArchiveTemplateApi.saveCategory({
      id: category.id,
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      parentId: category.parentId,
      scope: category.scope,
      status: PortfolioArchiveCategoryStatusCode.INACTIVE,
      sortOrder: category.sortOrder,
    })
    void message.success('分类已停用')
    await loadTree()
    if (selectedNode.value) await selectCategory(selectedNode.value)
  } catch (error) {
    showUserError(error, '停用分类失败')
  } finally {
    endOperation(operation)
  }
}

async function deleteCategory() {
  if (!selectedCategory.value) return
  const categoryId = selectedCategory.value.id
  const categoryName = selectedCategory.value.categoryName
  const operation = `category:delete:${categoryId}`
  if (!beginOperation(operation)) return
  if (
    !(await confirmAsync({
      content: `确认删除分类「${categoryName}」？存在子分类、模板版本或档案引用时无法删除。`,
      type: 'error',
    }))
  ) {
    endOperation(operation)
    return
  }
  try {
    await portfolioArchiveTemplateApi.deleteCategory({ categoryId })
    void message.success('分类已删除')
    categoryRequestToken.value += 1
    fieldRequestToken.value += 1
    selectedNode.value = null
    fields.value = []
    versionHistory.value = []
    changeLogs.value = []
    activeVersionId.value = null
    await loadTree()
  } catch (error) {
    showUserError(error, '删除分类失败')
  } finally {
    endOperation(operation)
  }
}

async function onScopeFilterChange() {
  categoryRequestToken.value += 1
  fieldRequestToken.value += 1
  selectedNode.value = null
  fields.value = []
  versionHistory.value = []
  changeLogs.value = []
  activeVersionId.value = null
  await loadTree()
}

async function submitCategory() {
  const categoryCode = categoryEditor.categoryCode.trim()
  const categoryName = categoryEditor.categoryName.trim()
  if (!categoryCode || !categoryName) {
    showFormValidationMessage('请填写分类编码和分类名称')
    return
  }
  const targetId = categoryEditor.id || 'new'
  const operation = `category:save:${targetId}`
  if (!beginOperation(operation)) return
  const request: PortfolioArchiveCategorySaveRequest = {
    id: categoryEditor.id,
    categoryCode,
    categoryName,
    parentId: categoryEditor.parentId,
    scope: categoryEditor.scope,
    sortOrder: categoryEditor.sortOrder,
    status: categoryEditor.status,
  }
  try {
    await portfolioArchiveTemplateApi.saveCategory(request)
    void message.success('分类已保存')
    categoryVisible.value = false
    await loadTree()
  } catch (error) {
    showUserError(error, '保存分类失败')
  } finally {
    endOperation(operation)
  }
}

async function runSeedDefaults() {
  const operation = 'template:seed'
  if (!beginOperation(operation)) return
  if (
    !(await confirmAsync({
      content: '将初始化 CERTIFICATE / DOCUMENT 默认分类与已发布字段，已存在的跳过。',
    }))
  ) {
    endOperation(operation)
    return
  }
  try {
    const result = await portfolioArchiveTemplateApi.seedDefaultTemplates()
    const created = result?.createdCategoryCodes?.length ?? 0
    const skipped = result?.skippedCategoryCodes?.length ?? 0
    void message.success(`初始化完成：新建 ${created}，跳过 ${skipped}`)
    await loadTree()
  } catch (error) {
    showUserError(error, '初始化默认模板失败')
  } finally {
    endOperation(operation)
  }
}

async function ensureDraftVersion() {
  if (!selectedCategory.value) return null
  const categoryId = selectedCategory.value.id
  const operation = `version:draft:${categoryId}`
  if (!beginOperation(operation)) return null
  try {
    const versionId = await portfolioArchiveTemplateApi.saveDraftVersion({ categoryId })
    activeVersionId.value = versionId
    await loadTree()
    if (selectedNode.value?.key === categoryId) selectedNode.value.raw.draftVersionId = versionId
    await loadHistory()
    await loadFields()
    return versionId
  } catch (error) {
    showUserError(error, '创建草稿版本失败')
    return null
  } finally {
    endOperation(operation)
  }
}

function openCreateField() {
  if (interactionLocked.value) return
  if (!activeVersionId.value) {
    showFormValidationMessage('请先创建草稿版本')
    return
  }
  if (!canEditFields.value) {
    showFormValidationMessage('仅草稿或试算版本可编辑字段')
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
  if (interactionLocked.value) return
  if (!canEditFields.value) {
    showFormValidationMessage('仅草稿或试算版本可编辑字段')
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
  const templateVersionId = activeVersionId.value
  const fieldId = record.id
  const operation = `field:delete:${fieldId}`
  if (!beginOperation(operation)) return
  if (
    !(await confirmAsync({
      content: `确认删除字段「${record.fieldLabel}」？删除后草稿试算将不再包含该字段。`,
      type: 'error',
    }))
  ) {
    endOperation(operation)
    return
  }
  try {
    await portfolioArchiveTemplateApi.deleteFieldDef({
      fieldId,
      templateVersionId,
    })
    void message.success('字段已删除')
    await loadFields()
  } catch (error) {
    showUserError(error, '删除字段失败')
  } finally {
    endOperation(operation)
  }
}

function handleArchiveFieldAction(key: string, record: PortfolioArchiveFieldDefVO) {
  if (key === 'edit') openEditField(record)
  else if (key === 'delete') void removeField(record)
}

async function submitField() {
  const templateVersionId = activeVersionId.value ?? fieldEditor.templateVersionId
  const fieldCode = fieldEditor.fieldCode.trim()
  const fieldLabel = fieldEditor.fieldLabel.trim()
  const enumRef = fieldEditor.enumRef?.trim() || undefined
  if (!templateVersionId || !fieldCode || !fieldLabel) {
    showFormValidationMessage('请填写字段编码和字段名称，并确认当前草稿版本')
    return
  }
  if (fieldEditor.fieldType === PortfolioArchiveFieldTypeCode.ENUM && !enumRef) {
    showFormValidationMessage('枚举字段必须填写字典编码')
    return
  }
  const targetId = fieldEditor.id || 'new'
  const operation = `field:save:${targetId}`
  if (!beginOperation(operation)) return
  const request: PortfolioArchiveFieldDefSaveRequest = {
    id: fieldEditor.id,
    templateVersionId,
    fieldCode,
    fieldLabel,
    fieldType: fieldEditor.fieldType,
    required: fieldEditor.required,
    readonly: fieldEditor.readonly,
    enumRef,
    sourceType: fieldEditor.sourceType,
    sortOrder: fieldEditor.sortOrder,
  }
  try {
    await portfolioArchiveTemplateApi.saveFieldDef(request)
    void message.success('字段已保存')
    fieldVisible.value = false
    await loadFields()
  } catch (error) {
    showUserError(error, '保存字段失败')
  } finally {
    endOperation(operation)
  }
}

async function runTrial() {
  if (!selectedCategory.value || !activeVersionId.value) return
  const categoryId = selectedCategory.value.id
  const templateVersionId = activeVersionId.value
  const operation = `version:trial:${templateVersionId}`
  if (!beginOperation(operation)) return
  try {
    await portfolioArchiveTemplateApi.trialVersion({
      categoryId,
      templateVersionId,
    })
    void message.success('试算通过')
    await loadHistory()
    await loadFields()
  } catch (error) {
    showUserError(error, '试算失败')
  } finally {
    endOperation(operation)
  }
}

function openPublishModal() {
  if (interactionLocked.value) return
  if (!selectedCategory.value || !activeVersionId.value || !canEditFields.value) return
  publishSummary.value = ''
  publishVisible.value = true
}

async function submitPublish() {
  if (!selectedCategory.value || !activeVersionId.value) return
  if (!publishSummary.value.trim()) {
    showFormValidationMessage('请填写发布变更摘要')
    return
  }
  const categoryId = selectedCategory.value.id
  const templateVersionId = activeVersionId.value
  const changeSummary = publishSummary.value.trim()
  const operation = `version:publish:${templateVersionId}`
  if (!beginOperation(operation)) return
  try {
    await portfolioArchiveTemplateApi.publishVersion({
      categoryId,
      templateVersionId,
      changeSummary,
    })
    void message.success('发布成功')
    publishVisible.value = false
    await loadTree()
    if (selectedNode.value) await selectCategory(selectedNode.value)
  } catch (error) {
    showUserError(error, '发布失败')
  } finally {
    endOperation(operation)
  }
}

async function runDeprecate() {
  if (!selectedCategory.value || !activeVersionId.value || !canDeprecate.value) return
  const categoryId = selectedCategory.value.id
  const templateVersionId = activeVersionId.value
  const operation = `version:deprecate:${templateVersionId}`
  if (!beginOperation(operation)) return
  if (
    !(await confirmAsync({
      content: '确认停用当前已发布版本？停用后智能分析将无法读取该版本字段。',
    }))
  ) {
    endOperation(operation)
    return
  }
  try {
    await portfolioArchiveTemplateApi.deprecateVersion({
      categoryId,
      templateVersionId,
    })
    void message.success('版本已停用')
    await loadTree()
    if (selectedNode.value) await selectCategory(selectedNode.value)
  } catch (error) {
    showUserError(error, '停用版本失败')
  } finally {
    endOperation(operation)
  }
}

const onTreeSelect: TreeProps['onSelect'] = (_keys, info) => {
  if (interactionLocked.value) return
  if (!info.node) {
    return
  }
  if (!isTreeNode(info.node)) {
    throw new Error('档案模板分类树节点契约异常')
  }
  selectCategory(info.node)
}

async function loadTeacherReadiness() {
  const currentToken = readinessRequestToken.value + 1
  readinessRequestToken.value = currentToken
  readinessLoadError.value = ''
  try {
    const result = await portfolioArchiveTemplateApi.getTeacherReadiness()
    if (readinessRequestToken.value !== currentToken) return
    teacherReadiness.value = result
  } catch (error) {
    if (readinessRequestToken.value !== currentToken) return
    teacherReadiness.value = null
    readinessLoadError.value = '教师端模板就绪状态加载失败，请刷新重试'
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
      v-if="readinessLoadError"
      tone="error"
      :closable="false"
      title="模板就绪状态读取失败"
      :description="readinessLoadError"
    />
    <UiAlertStrip
      v-else-if="teacherReadiness && !teacherReadiness.templatePublished"
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
      <UiCard class="tree-panel" title="档案分类" :loading="treeLoading">
        <div class="toolbar scope-filter">
          <span class="filter-label">适用范围</span>
          <UiSelect
            size="sm"
            v-model="scopeFilter"
            allow-clear
            placeholder="全部"
            :options="PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_OPTIONS"
            :disabled="interactionLocked"
            style="min-width: 140px"
            @change="onScopeFilterChange"
          />
        </div>
        <div v-if="canManageTenant" class="toolbar">
          <UiButton
            size="sm"
            variant="primary"
            :disabled="interactionLocked"
            @click="openCreateCategory"
          >
            新建根分类
          </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :disabled="!selectedCategory || interactionLocked"
            @click="openCreateSubCategory"
          >
            新建子分类
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!selectedCategory || interactionLocked"
            @click="openEditCategory"
          >
            编辑分类
          </UiButton>
          <UiButton
            size="sm"
            :loading="operationKey.startsWith('category:deactivate:')"
            :disabled="
              !selectedCategory || selectedCategory?.status === 'INACTIVE' || interactionLocked
            "
            @click="deactivateCategory"
          >
            停用分类
          </UiButton>
          <UiButton
            size="sm"
            :loading="operationKey.startsWith('category:delete:')"
            :disabled="!selectedCategory || interactionLocked"
            status="danger"
            @click="deleteCategory"
          >
            删除分类
          </UiButton>
          <UiButton
            size="sm"
            variant="ghost"
            :loading="seeding"
            :disabled="interactionLocked"
            @click="runSeedDefaults"
          >
            初始化默认模板
          </UiButton>
        </div>
        <UiAlertStrip
          v-if="treeLoadError"
          tone="error"
          :closable="false"
          title="档案分类读取失败"
          :description="treeLoadError"
        />
        <UiTree
          v-if="!treeLoadError && treeData.length"
          :tree-data="treeData"
          block-node
          default-expand-all
          :disabled="interactionLocked"
          @select="onTreeSelect"
        />
        <WorkbenchContextGateStrip
          v-else-if="!treeLoadError"
          tag="未配置"
          body="暂无分类，可初始化默认模板或新建根分类"
          cta-label="初始化默认模板"
          @cta="runSeedDefaults"
        />
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
            <UiSelect
              size="sm"
              v-if="versionOptions.length"
              :model-value="activeVersionId ?? undefined"
              :options="versionOptions"
              :disabled="interactionLocked"
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
            <UiInput
              size="sm"
              v-model="auditFlowCode"
              placeholder="审核流编码"
              style="width: 220px"
              :disabled="writing || auditFlowState !== 'ready'"
            />
            <UiButton
              variant="primary"
              size="sm"
              :loading="operationKey.startsWith('audit-flow:bind:')"
              :disabled="writing || auditFlowState !== 'ready'"
              @click="bindAuditFlow"
            >
              绑定
            </UiButton>
            <UiButton
              size="sm"
              :disabled="writing || auditFlowState !== 'ready'"
              @click="auditFlowCode = PORTFOLIO_DEFAULT_AUDIT_FLOW_CODE"
            >
              使用默认
            </UiButton>
          </div>
          <UiAlertStrip
            v-if="canManageTenant && auditFlowState === 'error'"
            dense
            tone="error"
            title="当前分类审核流加载失败，已禁止绑定"
          >
            <template #actions>
              <UiButton size="sm" variant="outline" @click="loadAuditFlowBinding()">
                重新加载
              </UiButton>
            </template>
          </UiAlertStrip>
          <div v-if="canManageTenant" class="toolbar">
            <UiButton
              v-if="canViewPublished"
              size="sm"
              variant="outline"
              :disabled="writing"
              @click="viewPublishedVersion"
            >
              查看已发布
            </UiButton>
            <UiButton
              variant="primary"
              size="sm"
              :loading="operationKey.startsWith('version:draft:')"
              :disabled="writing"
              @click="ensureDraftVersion"
            >
              创建/获取草稿
            </UiButton>
            <UiButton
              size="sm"
              variant="outline"
              :disabled="!canEditFields || writing"
              @click="openCreateField"
            >
              新增字段
            </UiButton>
            <UiButton
              size="sm"
              :loading="operationKey.startsWith('version:trial:')"
              :disabled="!canEditFields || writing"
              @click="runTrial"
            >
              试算
            </UiButton>
            <UiButton
              size="sm"
              variant="primary"
              :disabled="!canEditFields || writing"
              @click="openPublishModal"
            >
              发布
            </UiButton>
            <UiButton
              size="sm"
              :loading="operationKey.startsWith('version:deprecate:')"
              :disabled="!canDeprecate || writing"
              @click="runDeprecate"
            >
              停用版本
            </UiButton>
            <UiTextAction :disabled="writing" @click="historyVisible = true">
              版本历史
            </UiTextAction>
          </div>
          <div v-else-if="selectedCategory" class="toolbar">
            <UiTextAction :disabled="writing" @click="historyVisible = true">
              版本历史
            </UiTextAction>
          </div>
          <UiDataTable
            :columns="fieldColumns"
            :data-source="fields"
            row-key="id"
            :loading="fieldLoading"
            :load-error="Boolean(fieldLoadError)"
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
                    { key: 'edit', label: '编辑', disabled: writing },
                    { key: 'delete', label: '删除', tone: 'danger', disabled: writing },
                  ]"
                  split
                  @action="(key) => handleArchiveFieldAction(key, archiveFieldRecord(record))"
                />
              </template>
            </template>
          </UiDataTable>
        </template>
        <UiAlertStrip v-else tone="info" size="sm" dense inline :show-icon="false">
          <template #default>
            <span style="display: inline-flex; align-items: center; gap: 8px">
              <UiTag tone="blue" size="sm">未选择分类</UiTag>
              <span>请在左侧选择档案分类后再维护模板</span>
            </span>
          </template>
        </UiAlertStrip>
      </UiCard>
    </div>

    <UiDialog
      v-model:open="categoryVisible"
      :title="categoryModalTitle"
      :confirm-loading="operationKey.startsWith('category:save:')"
      :closable="!writing"
      :mask-closable="!writing"
      ok-text="保存"
      @ok="submitCategory"
    >
      <UiForm layout="vertical">
        <UiFormItem v-if="parentCategoryOptions.length" label="父分类">
          <UiSelect
            size="sm"
            v-model="categoryEditor.parentId"
            allow-clear
            placeholder="留空为根分类"
            :options="parentCategoryOptions"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="分类编码" required>
          <UiInput
            size="sm"
            v-model="categoryEditor.categoryCode"
            :disabled="!!categoryEditor.id || writing"
          />
        </UiFormItem>
        <UiFormItem label="分类名称" required>
          <UiInput size="sm" v-model="categoryEditor.categoryName" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="适用范围">
          <UiSelect
            size="sm"
            v-model="categoryEditor.scope"
            :options="PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_OPTIONS"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="状态">
          <UiSelect
            size="sm"
            v-model="categoryEditor.status"
            :options="PORTFOLIO_ARCHIVE_CATEGORY_STATUS_OPTIONS"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="排序">
          <UiInputNumber
            size="sm"
            v-model="categoryEditor.sortOrder"
            :min="0"
            style="width: 100%"
            :disabled="writing"
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <UiDialog
      v-model:open="fieldVisible"
      :title="fieldModalTitle"
      :confirm-loading="operationKey.startsWith('field:save:')"
      :closable="!writing"
      :mask-closable="!writing"
      ok-text="保存"
      @ok="submitField"
    >
      <UiForm layout="vertical">
        <UiFormItem label="字段编码" required>
          <UiInput
            size="sm"
            v-model="fieldEditor.fieldCode"
            :disabled="!!fieldEditor.id || writing"
          />
        </UiFormItem>
        <UiFormItem label="字段名称" required>
          <UiInput size="sm" v-model="fieldEditor.fieldLabel" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="字段类型">
          <UiSelect
            size="sm"
            v-model="fieldEditor.fieldType"
            :options="PORTFOLIO_ARCHIVE_FIELD_TYPE_OPTIONS"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="来源类型">
          <UiSelect
            size="sm"
            v-model="fieldEditor.sourceType"
            :options="PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_OPTIONS"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem v-if="fieldEditor.fieldType === 'ENUM'" label="枚举引用">
          <UiInput
            size="sm"
            v-model="fieldEditor.enumRef"
            placeholder="字典编码"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="排序">
          <UiInputNumber
            size="sm"
            v-model="fieldEditor.sortOrder"
            :min="0"
            style="width: 100%"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="必填">
          <UiSwitch size="sm" v-model="fieldEditor.required" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="只读">
          <UiSwitch size="sm" v-model="fieldEditor.readonly" :disabled="writing" />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <UiDialog
      v-model:open="publishVisible"
      title="发布模板版本"
      ok-text="确认发布"
      :confirm-loading="operationKey.startsWith('version:publish:')"
      :closable="!writing"
      :mask-closable="!writing"
      @ok="submitPublish"
    >
      <UiForm layout="vertical">
        <UiFormItem label="变更摘要" required>
          <UiTextarea
            size="sm"
            v-model="publishSummary"
            :rows="3"
            placeholder="说明本次发布变更内容"
            :disabled="writing"
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <UiDrawer
      v-model:open="historyVisible"
      title="版本历史"
      :width="720"
      :closable="!writing"
      :mask-closable="!writing"
    >
      <UiDataTable
        :columns="historyColumns"
        :data-source="versionHistory"
        :loading="historyLoading"
        :load-error="Boolean(historyLoadError)"
        row-key="id"
      >
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
              :items="[{ key: 'view', label: '查看', disabled: writing }]"
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
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.template-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--dp-space-3, 12px);
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
  font-size: var(--dp-font-size-md);
  color: var(--dp-text-secondary);
}
.audit-flow-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.audit-flow-label {
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-md);
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
  font-size: var(--dp-font-size-md);
  color: var(--dp-text-secondary);
}
.change-log {
  margin-top: 16px;
}
.change-log h4 {
  margin: 0 0 12px;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}
.change-log-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--dp-border-subtle);
}
.change-log-meta {
  margin-bottom: 8px;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
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
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}
.diff-error {
  margin: 0;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-error);
}
</style>
