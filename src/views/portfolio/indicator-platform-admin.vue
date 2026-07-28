<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { DataNode } from 'ant-design-vue/es/tree'
import type {
  PortfolioIndicatorDefinitionTreeNodeVO,
  PortfolioIndicatorDefinitionVO,
  PortfolioIndicatorPlatformSummaryVO,
  PortfolioIndicatorRuleTemplateVO,
  PortfolioIndicatorSourceMappingVO,
  PortfolioIndustryPackDefDto,
  PortfolioIndustryPackVO,
} from '@/apis/portfolio/indicator-types'
import type {
  PortfolioIndicatorDimensionL1Code} from '@/types/enums/portfolio-indicator-dimension-l1-code-enum';
import type { PortfolioIndustryPackDefForm } from '@/utils/indicator-industry-pack-def'
import type { PortfolioIndicatorTemplateParams } from '@/utils/indicator-template-params'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import { portfolioIndicatorPlatformApi } from '@/apis/portfolio/indicator'
import {
  PF_INDICATOR_DATA_SOURCE_CHANNEL_OPTIONS,
  PF_INDICATOR_STATUS_OPTIONS,
  PF_SCORE_RULE_TYPE_OPTIONS,
  PfIndicatorDataSourceChannelCode,
  PfIndicatorDataSourceChannelDescription,
  PfIndicatorStatusCode,
  PfIndicatorStatusDescription,
  PfScoreRuleTypeCode,
  PfScoreRuleTypeDescription,
  PORTFOLIO_INDICATOR_DIMENSION_L1_OPTIONS,
} from '@/apis/portfolio/indicator-types'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import PortfolioIndicatorTemplateParamsForm from '@/components/portfolio/PortfolioIndicatorTemplateParamsForm.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTree from '@/components/ui-guide/ui/UiTree.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  PORTFOLIO_INDICATOR_APPLICABILITY_OPTIONS,
  PortfolioIndicatorApplicabilityCode,
  PortfolioIndicatorApplicabilityDescription,
} from '@/types/enums/portfolio-indicator-applicability-code'
import { PortfolioIndicatorDefinitionTreeNodeTypeCode } from '@/types/enums/portfolio-indicator-definition-tree-node-type-enum'
import {
  PortfolioIndicatorDimensionL1Description,
} from '@/types/enums/portfolio-indicator-dimension-l1-code-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import {
  buildIndustryPackDefFromForm,
  toIndustryPackDefForm,
} from '@/utils/indicator-industry-pack-def'
import { defaultTemplateParams } from '@/utils/indicator-template-params'
import { strictEnumLabel } from '@/utils/strict-enum'

function dataSourceLabel(value: PfIndicatorDataSourceChannelCode): string {
  return strictEnumLabel(PfIndicatorDataSourceChannelDescription, value, '数据来源')
}

function indicatorStatusLabel(value: PfIndicatorStatusCode): string {
  return strictEnumLabel(PfIndicatorStatusDescription, value, '指标状态')
}

function dimensionL1Label(value: PortfolioIndicatorDimensionL1Code): string {
  return strictEnumLabel(PortfolioIndicatorDimensionL1Description, value, '一级维度')
}

function scoreRuleTypeLabel(value: PfScoreRuleTypeCode): string {
  return strictEnumLabel(PfScoreRuleTypeDescription, value, '规则类型')
}

function formatApplicability(codes?: PortfolioIndicatorApplicabilityCode[]): string {
  if (!codes?.length) return '不限'
  return codes
    .map((code) => strictEnumLabel(PortfolioIndicatorApplicabilityDescription, code, '指标适用对象'))
    .join('、')
}

const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const seeding = computed(() => operationKey.value === 'seed:import')
const saving = computed(() => operationKey.value.startsWith('save:'))
const loadState = reactive({
  summary: false,
  definitions: false,
  tree: false,
  templates: false,
  packs: false,
  mappings: false,
})
const loadError = reactive({
  summary: false,
  definitions: false,
  tree: false,
  templates: false,
  packs: false,
  mappings: false,
})
const requestToken = reactive({
  summary: 0,
  definitions: 0,
  tree: 0,
  templates: 0,
  packs: 0,
  mappings: 0,
  detail: 0,
})
const activeTab = ref('tree')
const indicatorPlatformTabItems = [
  { key: 'tree', label: '指标树' },
  { key: 'table', label: '指标表' },
  { key: 'template', label: '规则模板' },
  { key: 'pack', label: '行业包' },
  { key: 'import', label: '表格文件导入' },
  { key: 'mapping', label: '来源映射' },
]
const summary = ref<PortfolioIndicatorPlatformSummaryVO | null>(null)
const rows = ref<PortfolioIndicatorDefinitionVO[]>([])
const definitionTotal = ref(0)
const treeData = ref<PortfolioIndicatorDefinitionTreeNodeVO[]>([])
const templates = ref<PortfolioIndicatorRuleTemplateVO[]>([])
const templateTotal = ref(0)
const industryPacks = ref<PortfolioIndustryPackVO[]>([])
const sourceMappings = ref<PortfolioIndicatorSourceMappingVO[]>([])
const importModalOpen = ref(false)
const detailOpen = ref(false)
const detailLoading = ref(false)
const editMode = ref(false)
const detail = ref<PortfolioIndicatorDefinitionVO | null>(null)
const editForm = reactive({
  id: '',
  indicatorCode: '',
  indicatorName: '',
  levelNo: 3,
  dimensionL1Code: undefined as PortfolioIndicatorDimensionL1Code | undefined,
  dimensionL1Name: '',
  dimensionL2Name: '',
  definitionText: '',
  defaultDataSource: PfIndicatorDataSourceChannelCode.MANUAL_ENTRY,
  defaultRuleTemplateId: '',
  policyAlign: '',
  applicableTeachers: [] as PortfolioIndicatorApplicabilityCode[],
  auditRequired: false,
  redLineFlag: false,
  sortOrder: 0,
  status: PfIndicatorStatusCode.ACTIVE,
})
const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  indicatorCode: '',
  indicatorName: '',
})
interface TemplateQueryForm {
  pageNum: number
  pageSize: number
  templateCode: string
  ruleType?: PfScoreRuleTypeCode
  status?: PfIndicatorStatusCode
}

const templateQuery = reactive<TemplateQueryForm>({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  templateCode: '',
})

const definitionColumns: ColumnsType = [
  { title: '编码', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 88 },
  { title: '名称', dataIndex: 'indicatorName', key: 'indicatorName' },
  { title: '一级维度', dataIndex: 'dimensionL1Name', key: 'dimensionL1Name', width: 140 },
  { title: '二级维度', dataIndex: 'dimensionL2Name', key: 'dimensionL2Name', width: 120 },
  { title: '数据来源', dataIndex: 'defaultDataSource', key: 'defaultDataSource', width: 160 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 72 },
  { title: '操作', key: 'actions', width: 100 },
]

const templateColumns: ColumnsType = [
  { title: '模板编码', dataIndex: 'templateCode', key: 'templateCode', width: 120 },
  { title: '模板名称', dataIndex: 'templateName', key: 'templateName' },
  { title: '规则类型', dataIndex: 'ruleType', key: 'ruleType', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 88 },
  { title: '操作', key: 'actions', width: 72 },
]

const packColumns: ColumnsType = [
  { title: '包编码', dataIndex: 'packCode', key: 'packCode', width: 120 },
  { title: '包名称', dataIndex: 'packName', key: 'packName' },
  { title: '版本', dataIndex: 'packVersion', key: 'packVersion', width: 88 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 88 },
  { title: '操作', key: 'actions', width: 72 },
]

const mappingColumns: ColumnsType = [
  { title: '编码', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 88 },
  { title: '名称', dataIndex: 'indicatorName', key: 'indicatorName' },
  { title: '采集通道', dataIndex: 'defaultDataSource', key: 'defaultDataSource', width: 160 },
  { title: '自动采集', dataIndex: 'autoCollectSupported', key: 'autoCollectSupported', width: 88 },
  { title: '范围外', dataIndex: 'outOfScope', key: 'outOfScope', width: 72 },
]

const templateDrawerOpen = ref(false)
const packDrawerOpen = ref(false)
const templateForm = reactive({
  id: '',
  templateCode: '',
  templateName: '',
  ruleType: PfScoreRuleTypeCode.THRESHOLD,
  description: '',
  status: PfIndicatorStatusCode.ACTIVE,
})
const templateParams = ref<PortfolioIndicatorTemplateParams>(
  defaultTemplateParams(PfScoreRuleTypeCode.THRESHOLD),
)
const packForm = reactive({
  id: '',
  packCode: '',
  packName: '',
  packVersion: '1.0.0',
  status: PfIndicatorStatusCode.ACTIVE,
})
const packDefBaseline = ref<PortfolioIndustryPackDefDto | null>(null)
const packDefForm = reactive<PortfolioIndustryPackDefForm>({
  packId: '',
  packName: '',
  version: '1.0.0',
  applicableMajorsText: '',
  materialRequiredText: '',
  materialOptionalText: '',
})
const interactionLocked = computed(
  () =>
    seeding.value
    || detailOpen.value
    || templateDrawerOpen.value
    || packDrawerOpen.value
    || importModalOpen.value,
)

/** 平台指标资产写操作必须串行，避免定义、模板、行业包和种子导入并发改写全租户真源。 */
function beginOperation(key: string): boolean {
  if (writing.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}

const treeFieldNames = { title: 'title', key: 'key', children: 'children' }

const treeNodes = computed<DataNode[]>(() => treeData.value.map(toIndicatorDataNode))

/** 详情抽屉切换目标或关闭时必须清空旧详情，避免加载失败后仍展示上一个指标。 */
function resetDetailContext() {
  requestToken.detail++
  detail.value = null
  detailLoading.value = false
  editMode.value = false
}

function toIndicatorDataNode(node: PortfolioIndicatorDefinitionTreeNodeVO): DataNode {
  return {
    key: node.nodeKey,
    title: node.nodeTitle,
    children: node.children?.map(toIndicatorDataNode),
  }
}

const observationCount = computed(() => {
  let count = 0
  function walk(nodes: PortfolioIndicatorDefinitionTreeNodeVO[]) {
    for (const node of nodes) {
      if (node.nodeType === PortfolioIndicatorDefinitionTreeNodeTypeCode.OBSERVATION) {
        count++
      }
      if (node.children?.length) {
        walk(node.children)
      }
    }
  }
  walk(treeData.value)
  return count
})

async function loadSummary(options?: { errorMessage?: string }) {
  const currentToken = ++requestToken.summary
  loadState.summary = true
  loadError.summary = false
  try {
    const result = await portfolioIndicatorPlatformApi.definitionSummary()
    if (requestToken.summary !== currentToken) return
    summary.value = result
  } catch (error) {
    if (requestToken.summary !== currentToken) return
    loadError.summary = true
    showUserError(error, options?.errorMessage ?? '加载平台指标概览失败')
  } finally {
    if (requestToken.summary === currentToken) loadState.summary = false
  }
}

async function loadPage(options?: { errorMessage?: string }) {
  const currentToken = ++requestToken.definitions
  const request = { ...query }
  loadState.definitions = true
  loadError.definitions = false
  try {
    const page = await portfolioIndicatorPlatformApi.pageDefinition(request)
    if (requestToken.definitions !== currentToken) return
    rows.value = page.list
    definitionTotal.value = page.total
  } catch (error) {
    if (requestToken.definitions !== currentToken) return
    loadError.definitions = true
    showUserError(error, options?.errorMessage ?? '加载平台指标失败')
  } finally {
    if (requestToken.definitions === currentToken) loadState.definitions = false
  }
}

async function loadTree(options?: { errorMessage?: string }) {
  const currentToken = ++requestToken.tree
  loadState.tree = true
  loadError.tree = false
  try {
    const result = await portfolioIndicatorPlatformApi.definitionTree()
    if (requestToken.tree !== currentToken) return
    treeData.value = result
  } catch (error) {
    if (requestToken.tree !== currentToken) return
    loadError.tree = true
    showUserError(error, options?.errorMessage ?? '加载指标树失败')
  } finally {
    if (requestToken.tree === currentToken) loadState.tree = false
  }
}

async function loadTemplates(options?: { errorMessage?: string }) {
  const currentToken = ++requestToken.templates
  const request = { ...templateQuery }
  loadState.templates = true
  loadError.templates = false
  try {
    const page = await portfolioIndicatorPlatformApi.pageTemplate(request)
    if (requestToken.templates !== currentToken) return
    templates.value = page.list
    templateTotal.value = page.total
  } catch (error) {
    if (requestToken.templates !== currentToken) return
    loadError.templates = true
    showUserError(error, options?.errorMessage ?? '加载规则模板失败')
  } finally {
    if (requestToken.templates === currentToken) loadState.templates = false
  }
}

function handleDefinitionPageChange(event: { current: number, pageSize: number }) {
  query.pageNum = event.current
  query.pageSize = event.pageSize
  void loadPage()
}

function handleTemplatePageChange(event: { current: number, pageSize: number }) {
  templateQuery.pageNum = event.current
  templateQuery.pageSize = event.pageSize
  void loadTemplates()
}

async function loadIndustryPacks(options?: { errorMessage?: string }) {
  const currentToken = ++requestToken.packs
  loadState.packs = true
  loadError.packs = false
  try {
    const result = await portfolioIndicatorPlatformApi.listIndustryPack()
    if (requestToken.packs !== currentToken) return
    industryPacks.value = result
  } catch (error) {
    if (requestToken.packs !== currentToken) return
    loadError.packs = true
    showUserError(error, options?.errorMessage ?? '加载行业包失败')
  } finally {
    if (requestToken.packs === currentToken) loadState.packs = false
  }
}

async function loadSourceMappings(options?: { errorMessage?: string }) {
  const currentToken = ++requestToken.mappings
  loadState.mappings = true
  loadError.mappings = false
  try {
    const result = await portfolioIndicatorPlatformApi.listSourceMapping()
    if (requestToken.mappings !== currentToken) return
    sourceMappings.value = result
  } catch (error) {
    if (requestToken.mappings !== currentToken) return
    loadError.mappings = true
    showUserError(error, options?.errorMessage ?? '加载来源映射失败')
  } finally {
    if (requestToken.mappings === currentToken) loadState.mappings = false
  }
}

async function handleIndicatorImportSuccess() {
  importModalOpen.value = false
  await Promise.all([
    loadSummary({ errorMessage: '表格导入已完成，概览刷新失败' }),
    reloadTab({ errorMessage: '表格导入已完成，当前页签刷新失败' }),
  ])
}

async function reloadTab(options?: { errorMessage?: string }) {
  if (activeTab.value === 'tree') {
    await loadTree(options)
  } else if (activeTab.value === 'table') {
    await loadPage(options)
  } else if (activeTab.value === 'template') {
    await loadTemplates(options)
  } else if (activeTab.value === 'pack') {
    await loadIndustryPacks(options)
  } else if (activeTab.value === 'mapping') {
    await loadSourceMappings(options)
  }
}

async function openDetail(indicatorCode: string, openAsEdit = false) {
  if (interactionLocked.value) return
  resetDetailContext()
  const currentToken = ++requestToken.detail
  detailOpen.value = true
  detailLoading.value = true
  try {
    const result = await portfolioIndicatorPlatformApi.getDefinition({ indicatorCode })
    if (requestToken.detail !== currentToken) return
    detail.value = result
    fillEditForm(detail.value)
    editMode.value = openAsEdit
  } catch (error) {
    if (requestToken.detail !== currentToken) return
    detailOpen.value = false
    showUserError(error, '加载指标定义失败')
  } finally {
    if (requestToken.detail === currentToken) detailLoading.value = false
  }
}

function handleIndicatorRowAction(key: string, indicatorCode: string) {
  if (key === 'detail') void openDetail(indicatorCode)
  else if (key === 'edit') void openDetail(indicatorCode, true)
}

function fillEditForm(record: PortfolioIndicatorDefinitionVO) {
  editForm.id = record.id
  editForm.indicatorCode = record.indicatorCode
  editForm.indicatorName = record.indicatorName
  editForm.levelNo = record.levelNo ?? 3
  editForm.dimensionL1Code = record.dimensionL1Code
  editForm.dimensionL1Name = record.dimensionL1Name
  editForm.dimensionL2Name = record.dimensionL2Name
  editForm.definitionText = record.definitionText
  editForm.defaultDataSource = record.defaultDataSource
  editForm.defaultRuleTemplateId = record.defaultRuleTemplateId ?? ''
  editForm.policyAlign = record.policyAlign ?? ''
  editForm.applicableTeachers = [...(record.applicableTeachers ?? [])]
  editForm.auditRequired = record.auditRequired
  editForm.redLineFlag = record.redLineFlag
  editForm.sortOrder = record.sortOrder
  editForm.status = record.status
}

function startEdit() {
  if (detail.value) {
    fillEditForm(detail.value)
  }
  editMode.value = true
}

async function saveDefinition() {
  const indicatorCode = editForm.indicatorCode.trim()
  const indicatorName = editForm.indicatorName.trim()
  if (
    !indicatorCode
    || !indicatorName
    || !editForm.dimensionL1Code
    || !editForm.dimensionL2Name.trim()
  ) {
    showFormValidationMessage('请完整填写指标编码、名称、一级维度正式码和二级维度')
    return
  }
  if (
    editForm.applicableTeachers.includes(PortfolioIndicatorApplicabilityCode.ALL_TEACHERS)
    && editForm.applicableTeachers.length > 1
  ) {
    showFormValidationMessage('全体教师不能与其他适用对象同时选择')
    return
  }
  const operation = `save:definition:${editForm.id || indicatorCode}`
  if (!beginOperation(operation)) return
  const request = {
    id: editForm.id || undefined,
    indicatorCode,
    indicatorName,
    levelNo: editForm.levelNo,
    dimensionL1Code: editForm.dimensionL1Code,
    dimensionL2Name: editForm.dimensionL2Name.trim(),
    definitionText: editForm.definitionText.trim(),
    defaultDataSource: editForm.defaultDataSource,
    defaultRuleTemplateId: editForm.defaultRuleTemplateId || undefined,
    policyAlign: editForm.policyAlign.trim() || undefined,
    applicableTeachers: [...editForm.applicableTeachers],
    auditRequired: editForm.auditRequired,
    redLineFlag: editForm.redLineFlag,
    sortOrder: editForm.sortOrder,
    status: editForm.status,
  }
  try {
    await portfolioIndicatorPlatformApi.saveDefinition(request)
    void message.success('指标已保存')
    editMode.value = false
  } catch (error) {
    showUserError(error, '保存指标定义失败')
    return
  } finally {
    endOperation(operation)
  }
  try {
    detail.value = await portfolioIndicatorPlatformApi.getDefinition({
      indicatorCode,
    })
    fillEditForm(detail.value)
  } catch (error) {
    showUserError(error, '指标已保存，详情刷新失败')
  }
  await Promise.all([
    loadSummary({ errorMessage: '指标已保存，概览刷新失败' }),
    reloadTab({ errorMessage: '指标已保存，列表刷新失败' }),
  ])
}

function openNewIndicator() {
  if (interactionLocked.value) return
  resetDetailContext()
  editForm.id = ''
  editForm.indicatorCode = ''
  editForm.indicatorName = ''
  editForm.levelNo = 3
  editForm.dimensionL1Code = undefined
  editForm.dimensionL1Name = ''
  editForm.dimensionL2Name = ''
  editForm.definitionText = ''
  editForm.defaultDataSource = PfIndicatorDataSourceChannelCode.MANUAL_ENTRY
  editForm.defaultRuleTemplateId = ''
  editForm.policyAlign = ''
  editForm.applicableTeachers = []
  editForm.auditRequired = false
  editForm.redLineFlag = false
  editForm.sortOrder = 0
  editForm.status = PfIndicatorStatusCode.ACTIVE
  detailOpen.value = true
  editMode.value = true
}

function openTemplateEdit(record?: PortfolioIndicatorRuleTemplateVO) {
  if (interactionLocked.value) return
  if (record) {
    templateForm.id = record.id
    templateForm.templateCode = record.templateCode
    templateForm.templateName = record.templateName
    templateForm.ruleType = record.ruleType
    templateParams.value = record.params ?? defaultTemplateParams(record.ruleType)
    templateForm.description = ''
    templateForm.status = record.status
  } else {
    templateForm.id = ''
    templateForm.templateCode = ''
    templateForm.templateName = ''
    templateForm.ruleType = PfScoreRuleTypeCode.THRESHOLD
    templateParams.value = defaultTemplateParams(PfScoreRuleTypeCode.THRESHOLD)
    templateForm.description = ''
    templateForm.status = PfIndicatorStatusCode.ACTIVE
  }
  templateDrawerOpen.value = true
}

async function saveTemplateForm() {
  const templateCode = templateForm.templateCode.trim()
  const templateName = templateForm.templateName.trim()
  if (!templateCode || !templateName) {
    showFormValidationMessage('请填写模板编码和模板名称')
    return
  }
  const operation = `save:template:${templateForm.id || templateCode}`
  if (!beginOperation(operation)) return
  const request = {
    id: templateForm.id || undefined,
    templateCode,
    templateName,
    ruleType: templateForm.ruleType,
    params: templateParams.value,
    description: templateForm.description.trim() || undefined,
    status: templateForm.status,
  }
  try {
    await portfolioIndicatorPlatformApi.saveTemplate(request)
    void message.success('规则模板已保存')
    templateDrawerOpen.value = false
  } catch (error) {
    showUserError(error, '保存规则模板失败')
    return
  } finally {
    endOperation(operation)
  }
  await loadTemplates({ errorMessage: '规则模板已保存，列表刷新失败' })
}

function openPackEdit(record?: PortfolioIndustryPackVO) {
  if (interactionLocked.value) return
  if (record) {
    packForm.id = record.id
    packForm.packCode = record.packCode
    packForm.packName = record.packName
    packForm.packVersion = record.packVersion ?? '1.0.0'
    packDefBaseline.value = record.packDef
    Object.assign(packDefForm, toIndustryPackDefForm(record.packDef))
    packForm.status = record.status
  } else {
    packForm.id = ''
    packForm.packCode = ''
    packForm.packName = ''
    packForm.packVersion = '1.0.0'
    packDefBaseline.value = null
    Object.assign(packDefForm, {
      packId: '',
      packName: '',
      version: '1.0.0',
      applicableMajorsText: '',
      materialRequiredText: '',
      materialOptionalText: '',
    })
    packForm.status = PfIndicatorStatusCode.ACTIVE
  }
  packDrawerOpen.value = true
}

async function savePackForm() {
  const packCode = packForm.packCode.trim()
  const packName = packForm.packName.trim()
  const packVersion = packForm.packVersion.trim()
  if (!packCode || !packName || !packVersion) {
    showFormValidationMessage('请填写行业包编码、名称和版本')
    return
  }
  const packDef = buildIndustryPackDefFromForm(
    {
      ...packDefForm,
      packId: packCode,
      packName,
      version: packVersion,
    },
    packDefBaseline.value,
  )
  if (!packDef) return
  const operation = `save:pack:${packForm.id || packCode}`
  if (!beginOperation(operation)) return
  try {
    await portfolioIndicatorPlatformApi.saveIndustryPack({
      id: packForm.id || undefined,
      packCode,
      packName,
      packVersion,
      packDef,
      status: packForm.status,
    })
    void message.success('行业包已保存')
    packDrawerOpen.value = false
  } catch (error) {
    showUserError(error, '保存行业包失败')
    return
  } finally {
    endOperation(operation)
  }
  await Promise.all([
    loadIndustryPacks({ errorMessage: '行业包已保存，列表刷新失败' }),
    loadSummary({ errorMessage: '行业包已保存，概览刷新失败' }),
  ])
}

async function importSeed() {
  const operation = 'seed:import'
  if (!beginOperation(operation)) return
  const confirmed = await confirmAsync({
    title: '确认导入全量平台种子？',
    content: '将更新平台指标与行业包真源，并使所有租户场景已有试算结果失效。',
    type: 'warning',
  })
  if (!confirmed) {
    endOperation(operation)
    return
  }
  try {
    const result = await portfolioIndicatorPlatformApi.importSeed()
    void message.success(
      `种子导入完成：指标 ${result.totalIndicatorCount} 项，行业包 ${result.totalIndustryPackCount} 个`,
    )
  } catch (error) {
    showUserError(error, '导入平台种子失败')
    return
  } finally {
    endOperation(operation)
  }
  await Promise.all([
    loadSummary({ errorMessage: '种子已导入，概览刷新失败' }),
    reloadTab({ errorMessage: '种子已导入，当前页签刷新失败' }),
  ])
}

function onTabChange(key: string | number) {
  if (seeding.value) return
  activeTab.value = String(key)
  reloadTab()
}

onMounted(async () => {
  await Promise.all([loadSummary(), loadTree()])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="平台指标资产">
        <template #actions>
          <UiButton
            size="sm"
            variant="primary"
            :loading="seeding"
            :disabled="interactionLocked"
            @click="importSeed"
          >
            导入全量种子
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiAlertStrip
      v-if="summary"
      :tone="summary.t001T100Ready ? 'success' : 'warning'"
      :title="`平台指标 ${summary.platformIndicatorCount} 项已就绪，行业包 ${summary.industryPackCount} 个`"
      style="margin-bottom: var(--dp-space-component)"
    />
    <UiAlertStrip
      v-else-if="loadError.summary"
      tone="error"
      title="平台指标概览加载失败"
      :closable="false"
      style="margin-bottom: var(--dp-space-component)"
    />
    <UiCard>
      <UiSectionTabs
        :model-value="activeTab"
        :items="indicatorPlatformTabItems"
        compact
        divided
        @change="onTabChange"
      />
      <template v-if="activeTab === 'tree'">
        <UiEmpty size="sm" v-if="loadError.tree" description="指标树加载失败，请重试" />
        <UiTree
          v-else
          :tree-data="treeNodes"
          :field-names="treeFieldNames"
          default-expand-all
          block-node
        >
          <template #title="{ nodeTitle, nodeType, defaultDataSource, indicatorCode, status }">
            <span>{{ nodeTitle }}</span>
            <span
              v-if="nodeType === PortfolioIndicatorDefinitionTreeNodeTypeCode.OBSERVATION"
              class="obs-meta"
            >
              {{ indicatorCode }} ·
              {{ defaultDataSource ? dataSourceLabel(defaultDataSource) : '—' }} ·
              {{ status ? indicatorStatusLabel(status) : '—' }}
              <a v-if="indicatorCode" class="detail-link" @click.stop="openDetail(indicatorCode)">详情</a>
            </span>
          </template>
        </UiTree>
        <div class="tree-foot">观测点 {{ observationCount }} 项</div>
      </template>
      <template v-else-if="activeTab === 'table'">
        <div class="toolbar">
          <UiInput
            size="sm"
            v-model="query.indicatorCode"
            placeholder="指标编码"
            style="width: 120px"
            :disabled="seeding"
            @press-enter="loadPage"
          />
          <UiInput
            size="sm"
            v-model="query.indicatorName"
            placeholder="指标名称"
            style="width: 160px"
            :disabled="seeding"
            @press-enter="loadPage"
          />
          <UiButton
            size="sm"
            :loading="loadState.definitions"
            :disabled="seeding"
            @click="() => { void loadPage() }"
          >
            查询
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="interactionLocked"
            @click="openNewIndicator"
          >
            新建指标
          </UiButton>
        </div>
        <UiEmpty
          size="sm"
          v-if="!loadState.definitions && !loadError.definitions && rows.length === 0"
          description="当前筛选无平台指标"
        />
        <UiDataTable
          v-model:current="query.pageNum"
          v-model:page-size="query.pageSize"
          pagination-mode="server"
          :columns="definitionColumns"
          :data-source="rows"
          :loading="loadState.definitions"
          :load-error="loadError.definitions"
          :total="definitionTotal"
          row-key="id"
          @page-change="handleDefinitionPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'defaultDataSource'">
              {{ dataSourceLabel(record.defaultDataSource) }}
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="record.status === PfIndicatorStatusCode.ACTIVE ? 'green' : 'gray'">
                {{ indicatorStatusLabel(record.status) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[
                  { key: 'detail', label: '详情', disabled: interactionLocked },
                  { key: 'edit', label: '编辑', disabled: interactionLocked },
                ]"
                split
                @action="(key) => handleIndicatorRowAction(key, record.indicatorCode)"
              />
            </template>
          </template>
        </UiDataTable>
      </template>
      <template v-else-if="activeTab === 'template'">
        <div class="toolbar">
          <UiInput
            size="sm"
            v-model="templateQuery.templateCode"
            placeholder="模板编码"
            style="width: 120px"
            :disabled="seeding"
            @press-enter="loadTemplates"
          />
          <UiSelect
            size="sm"
            v-model="templateQuery.ruleType"
            allow-clear
            placeholder="规则类型"
            style="width: 140px"
            :options="PF_SCORE_RULE_TYPE_OPTIONS"
            :disabled="seeding"
          />
          <UiSelect
            size="sm"
            v-model="templateQuery.status"
            allow-clear
            placeholder="状态"
            style="width: 100px"
            :options="PF_INDICATOR_STATUS_OPTIONS"
            :disabled="seeding"
          />
          <UiButton
            size="sm"
            :loading="loadState.templates"
            :disabled="seeding"
            @click="() => { void loadTemplates() }"
          >
            查询
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="interactionLocked"
            @click="openTemplateEdit()"
          >
            新建模板
          </UiButton>
        </div>
        <UiDataTable
          v-model:current="templateQuery.pageNum"
          v-model:page-size="templateQuery.pageSize"
          pagination-mode="server"
          :columns="templateColumns"
          :data-source="templates"
          :loading="loadState.templates"
          :load-error="loadError.templates"
          :total="templateTotal"
          row-key="id"
          @page-change="handleTemplatePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'ruleType'">
              {{ scoreRuleTypeLabel(record.ruleType) }}
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="record.status === PfIndicatorStatusCode.ACTIVE ? 'green' : 'gray'">
                {{ indicatorStatusLabel(record.status) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[{ key: 'edit', label: '编辑', disabled: interactionLocked }]"
                split
                @action="() => openTemplateEdit(record)"
              />
            </template>
          </template>
        </UiDataTable>
      </template>
      <template v-else-if="activeTab === 'pack'">
        <div class="toolbar">
          <UiButton
            size="sm"
            variant="outline"
            :disabled="interactionLocked"
            @click="openPackEdit()"
          >
            新建行业包
          </UiButton>
        </div>
        <UiDataTable
          :columns="packColumns"
          :data-source="industryPacks"
          :loading="loadState.packs"
          :load-error="loadError.packs"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <UiTag :tone="record.status === PfIndicatorStatusCode.ACTIVE ? 'green' : 'gray'">
                {{ indicatorStatusLabel(record.status) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[{ key: 'edit', label: '编辑', disabled: interactionLocked }]"
                split
                @action="() => openPackEdit(record)"
              />
            </template>
          </template>
        </UiDataTable>
      </template>
      <template v-else-if="activeTab === 'import'">
        <p class="hint">请先下载模板，填写后上传表格文件批量导入指标定义。</p>
        <UiButton
          size="sm"
          variant="primary"
          :disabled="interactionLocked"
          @click="importModalOpen = true"
        >
          表格文件批量导入
        </UiButton>
      </template>
      <template v-else>
        <UiDataTable
          :columns="mappingColumns"
          :data-source="sourceMappings"
          :loading="loadState.mappings"
          :load-error="loadError.mappings"
          row-key="indicatorCode"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'defaultDataSource'">
              {{ dataSourceLabel(record.defaultDataSource) }}
            </template>
            <template v-else-if="column.key === 'autoCollectSupported'">
              {{ record.autoCollectSupported ? '是' : '否' }}
            </template>
            <template v-else-if="column.key === 'outOfScope'">
              <UiTag :tone="record.outOfScope ? 'gray' : 'green'">
                {{ record.outOfScope ? '不实现' : '本域' }}
              </UiTag>
            </template>
          </template>
        </UiDataTable>
      </template>
    </UiCard>
    <UiDrawer
      v-model:open="detailOpen"
      title="指标详情"
      width="520"
      :closable="!writing"
      :mask-closable="!writing"
      @close="resetDetailContext"
    >
      <UiSpin :spinning="detailLoading">
        <template v-if="detail && !editMode">
          <p>
            <strong>{{ detail.indicatorCode }}</strong> {{ detail.indicatorName }}
          </p>
          <p class="meta">{{ detail.dimensionL1Name }} / {{ detail.dimensionL2Name }}</p>
          <p>{{ detail.definitionText }}</p>
          <div class="detail-tags">
            <UiTag tone="blue">
              {{ dataSourceLabel(detail.defaultDataSource) }}
            </UiTag>
            <UiTag :tone="detail.status === PfIndicatorStatusCode.ACTIVE ? 'green' : 'gray'">
              {{ indicatorStatusLabel(detail.status) }}
            </UiTag>
            <UiTag v-if="detail.redLineFlag" tone="red"> 红线 </UiTag>
            <UiTag v-if="detail.auditRequired" tone="orange"> 需审核 </UiTag>
          </div>
          <p class="meta">适用：{{ formatApplicability(detail.applicableTeachers) }}</p>
          <p v-if="detail.policyAlign" class="meta">政策对齐：{{ detail.policyAlign }}</p>
          <UiButton size="sm" style="margin-top: var(--dp-space-component)" :disabled="writing" @click="startEdit">
            编辑
          </UiButton>
        </template>
        <UiForm v-else-if="editMode" layout="vertical">
          <UiFormItem label="指标编码">
            <UiInput
              size="sm"
              v-model="editForm.indicatorCode"
              :disabled="Boolean(editForm.id) || writing"
            />
          </UiFormItem>
          <UiFormItem label="指标名称">
            <UiInput size="sm" v-model="editForm.indicatorName" :disabled="writing" />
          </UiFormItem>
          <UiFormItem label="一级维度正式码">
            <UiSelect
              size="sm"
              v-model="editForm.dimensionL1Code"
              :options="PORTFOLIO_INDICATOR_DIMENSION_L1_OPTIONS"
              :disabled="writing"
              placeholder="选择一级维度正式码"
            />
          </UiFormItem>
          <UiFormItem label="二级维度">
            <UiInput size="sm" v-model="editForm.dimensionL2Name" :disabled="writing" />
          </UiFormItem>
          <UiFormItem label="定义说明">
            <UiTextarea size="sm" v-model="editForm.definitionText" :rows="3" :disabled="writing" />
          </UiFormItem>
          <UiFormItem label="数据来源">
            <UiSelect
              size="sm"
              v-model="editForm.defaultDataSource"
              :options="PF_INDICATOR_DATA_SOURCE_CHANNEL_OPTIONS"
              :disabled="writing"
            />
          </UiFormItem>
          <UiFormItem label="规则模板编号">
            <UiInput
              size="sm"
              v-model="editForm.defaultRuleTemplateId"
              placeholder="绑定 Score 模板主键"
              :disabled="writing"
            />
          </UiFormItem>
          <UiFormItem label="适用对象">
            <UiSelect
              size="sm"
              mode="multiple"
              v-model="editForm.applicableTeachers"
              :options="PORTFOLIO_INDICATOR_APPLICABILITY_OPTIONS"
              placeholder="未选择时不限适用对象"
              :disabled="writing"
            />
          </UiFormItem>
          <UiFormItem label="政策对齐">
            <UiInput size="sm" v-model="editForm.policyAlign" :disabled="writing" />
          </UiFormItem>
          <UiFormItem label="状态">
            <UiSelect
              size="sm"
              v-model="editForm.status"
              :options="PF_INDICATOR_STATUS_OPTIONS"
              :disabled="writing"
            />
          </UiFormItem>
          <UiFormItem label="红线指标">
            <UiSwitch size="sm" v-model="editForm.redLineFlag" :disabled="writing" />
          </UiFormItem>
          <UiFormItem label="需审核">
            <UiSwitch size="sm" v-model="editForm.auditRequired" :disabled="writing" />
          </UiFormItem>
          <div class="drawer-actions">
            <UiButton size="sm" :disabled="writing" @click="editMode = false"> 取消 </UiButton>
            <UiButton
              size="sm"
              variant="primary"
              :loading="operationKey.startsWith('save:definition:')"
              :disabled="writing"
              @click="saveDefinition"
            >
              保存
            </UiButton>
          </div>
        </UiForm>
      </UiSpin>
    </UiDrawer>
    <UiDrawer
      v-model:open="templateDrawerOpen"
      title="规则模板"
      width="480"
      :closable="!writing"
      :mask-closable="!writing"
    >
      <UiForm layout="vertical">
        <UiFormItem label="模板编码">
          <UiInput
            size="sm"
            v-model="templateForm.templateCode"
            :disabled="Boolean(templateForm.id) || writing"
          />
        </UiFormItem>
        <UiFormItem label="模板名称">
          <UiInput size="sm" v-model="templateForm.templateName" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="规则类型">
          <UiSelect
            size="sm"
            v-model="templateForm.ruleType"
            :options="PF_SCORE_RULE_TYPE_OPTIONS"
            :disabled="writing"
          />
        </UiFormItem>
        <PortfolioIndicatorTemplateParamsForm
          :rule-type="templateForm.ruleType"
          :params="templateParams"
          :disabled="writing"
          @update:params="templateParams = $event"
        />
        <UiFormItem label="状态">
          <UiSelect
            size="sm"
            v-model="templateForm.status"
            :options="PF_INDICATOR_STATUS_OPTIONS"
            :disabled="writing"
          />
        </UiFormItem>
        <UiButton
          size="sm"
          variant="primary"
          :loading="operationKey.startsWith('save:template:')"
          :disabled="writing"
          @click="saveTemplateForm"
        >
          保存
        </UiButton>
      </UiForm>
    </UiDrawer>
    <UiDrawer
      v-model:open="packDrawerOpen"
      title="行业包"
      width="480"
      :closable="!writing"
      :mask-closable="!writing"
    >
      <UiForm layout="vertical">
        <UiFormItem label="包编码">
          <UiInput
            size="sm"
            v-model="packForm.packCode"
            :disabled="Boolean(packForm.id) || writing"
          />
        </UiFormItem>
        <UiFormItem label="包名称">
          <UiInput size="sm" v-model="packForm.packName" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="版本">
          <UiInput size="sm" v-model="packForm.packVersion" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="适用专业（每行一个）">
          <UiTextarea
            size="sm"
            v-model="packDefForm.applicableMajorsText"
            :rows="4"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="权重 · 企业实践">
          <UiInputNumber
            size="sm"
            v-model="packDefForm.weightEnterprisePractice"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 100%"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="权重 · 职业资格">
          <UiInputNumber
            size="sm"
            v-model="packDefForm.weightQualification"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 100%"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="权重 · 行业项目">
          <UiInputNumber
            size="sm"
            v-model="packDefForm.weightIndustryProject"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 100%"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="权重 · 教学贡献">
          <UiInputNumber
            size="sm"
            v-model="packDefForm.weightTeachingContribution"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 100%"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="权重 · 社会服务">
          <UiInputNumber
            size="sm"
            v-model="packDefForm.weightSocialService"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 100%"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="权重 · 培训发展">
          <UiInputNumber
            size="sm"
            v-model="packDefForm.weightTrainingDevelopment"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 100%"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="必交材料（每行一项）">
          <UiTextarea
            size="sm"
            v-model="packDefForm.materialRequiredText"
            :rows="4"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="选交材料（每行一项）">
          <UiTextarea
            size="sm"
            v-model="packDefForm.materialOptionalText"
            :rows="3"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="状态">
          <UiSelect
            size="sm"
            v-model="packForm.status"
            :options="PF_INDICATOR_STATUS_OPTIONS"
            :disabled="writing"
          />
        </UiFormItem>
        <UiButton
          size="sm"
          variant="primary"
          :loading="operationKey.startsWith('save:pack:')"
          :disabled="writing"
          @click="savePackForm"
        >
          保存
        </UiButton>
      </UiForm>
    </UiDrawer>
  </StageWorkbenchShell>
  <UiPlatformExcelImportModal
    v-model:open="importModalOpen"
    :scene-key="ExcelImportSceneKey.PORTFOLIO_INDICATOR_DEFINITION"
    entity-label="平台指标定义"
    @success="handleIndicatorImportSuccess"
  />
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-block);
  flex-wrap: wrap;
  align-items: center;
}
.obs-meta {
  margin-left: var(--dp-space-component-tight);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
}
.detail-link {
  margin-left: var(--dp-space-component-tight);
}
.tree-foot {
  margin-top: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.meta {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.detail-tags {
  display: flex;
  gap: var(--dp-space-component-tight);
  flex-wrap: wrap;
  margin: var(--dp-space-component) 0;
}
.drawer-actions {
  display: flex;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component-tight);
}
</style>
