<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { DataNode } from 'ant-design-vue/es/tree'
import type {
  PortfolioIndicatorDefinitionTreeNodeVO,
  PortfolioIndicatorDefinitionVO,
  PortfolioIndicatorPlatformSummaryVO,
  PortfolioIndicatorRuleTemplateVO,
  PortfolioIndicatorSourceMappingVO,
  PortfolioIndustryPackVO,
} from '@/apis/portfolio/indicator-types'
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
} from '@/apis/portfolio/indicator-types'
import type { PortfolioIndustryPackDefForm } from '@/utils/indicator-industry-pack-def'
import {
  buildNewIndustryPackDefJson,
  mergeIndustryPackDefJson,
  parseIndustryPackDefJson,
} from '@/utils/indicator-industry-pack-def'
import type { PortfolioIndicatorTemplateParams } from '@/utils/indicator-template-params'
import {
  defaultTemplateParams,
  parseTemplateParamsJson,
  serializeTemplateParams,
} from '@/utils/indicator-template-params'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import { portfolioIndicatorPlatformApi } from '@/apis/portfolio/indicator'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import PortfolioIndicatorTemplateParamsForm from '@/components/portfolio/PortfolioIndicatorTemplateParamsForm.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { PortfolioIndicatorDefinitionTreeNodeTypeCode } from '@/types/enums/portfolio-indicator-definition-tree-node-type-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

function dataSourceLabel(value: PfIndicatorDataSourceChannelCode): string {
  return strictEnumLabel(PfIndicatorDataSourceChannelDescription, value, '数据来源')
}

function indicatorStatusLabel(value: PfIndicatorStatusCode): string {
  return strictEnumLabel(PfIndicatorStatusDescription, value, '指标状态')
}

function scoreRuleTypeLabel(value: PfScoreRuleTypeCode): string {
  return strictEnumLabel(PfScoreRuleTypeDescription, value, '规则类型')
}

const loading = ref(false)
const seeding = ref(false)
const saving = ref(false)
const activeTab = ref('tree')
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
  dimensionL1Name: '',
  dimensionL2Name: '',
  definitionText: '',
  defaultDataSource: PfIndicatorDataSourceChannelCode.MANUAL_ENTRY,
  defaultRuleTemplateId: '',
  policyAlign: '',
  applicableTeachers: '',
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
  { title: '默认来源', dataIndex: 'defaultDataSource', key: 'defaultDataSource', width: 160 },
  { title: '采集通道', dataIndex: 'channelLabel', key: 'channelLabel', width: 120 },
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
const packDefExistingJson = ref('{}')
const packDefForm = reactive<PortfolioIndustryPackDefForm>({
  packId: '',
  packName: '',
  version: '1.0.0',
  applicableMajorsText: '',
  materialRequiredText: '',
  materialOptionalText: '',
})

const treeFieldNames = { title: 'title', key: 'key', children: 'children' }

const treeNodes = computed<DataNode[]>(() => treeData.value.map(toIndicatorDataNode))

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

async function loadSummary() {
  try {
    summary.value = await portfolioIndicatorPlatformApi.definitionSummary()
  } catch (error) {
    showUserError(error)
  }
}

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioIndicatorPlatformApi.pageDefinition(query)
    rows.value = page.list
    definitionTotal.value = page.total
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadTree() {
  loading.value = true
  try {
    treeData.value = await portfolioIndicatorPlatformApi.definitionTree()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadTemplates() {
  loading.value = true
  try {
    const page = await portfolioIndicatorPlatformApi.pageTemplate(templateQuery)
    templates.value = page.list
    templateTotal.value = page.total
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

function handleDefinitionPageChange(event: { current: number; pageSize: number }) {
  query.pageNum = event.current
  query.pageSize = event.pageSize
  void loadPage()
}

function handleTemplatePageChange(event: { current: number; pageSize: number }) {
  templateQuery.pageNum = event.current
  templateQuery.pageSize = event.pageSize
  void loadTemplates()
}

async function loadIndustryPacks() {
  loading.value = true
  try {
    industryPacks.value = await portfolioIndicatorPlatformApi.listIndustryPack()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadSourceMappings() {
  loading.value = true
  try {
    sourceMappings.value = await portfolioIndicatorPlatformApi.listSourceMapping()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function handleIndicatorImportSuccess() {
  importModalOpen.value = false
  await Promise.all([loadSummary(), reloadTab()])
}

async function reloadTab() {
  if (activeTab.value === 'tree') {
    await loadTree()
  } else if (activeTab.value === 'table') {
    await loadPage()
  } else if (activeTab.value === 'template') {
    await loadTemplates()
  } else if (activeTab.value === 'pack') {
    await loadIndustryPacks()
  } else if (activeTab.value === 'mapping') {
    await loadSourceMappings()
  }
}

async function openDetail(indicatorCode: string, openAsEdit = false) {
  detailOpen.value = true
  detailLoading.value = true
  editMode.value = false
  try {
    detail.value = await portfolioIndicatorPlatformApi.getDefinition({ indicatorCode })
    fillEditForm(detail.value)
    editMode.value = openAsEdit
  } catch (error) {
    showUserError(error)
  } finally {
    detailLoading.value = false
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
  editForm.dimensionL1Name = record.dimensionL1Name
  editForm.dimensionL2Name = record.dimensionL2Name
  editForm.definitionText = record.definitionText
  editForm.defaultDataSource = record.defaultDataSource
  editForm.defaultRuleTemplateId = record.defaultRuleTemplateId ?? ''
  editForm.policyAlign = record.policyAlign ?? ''
  editForm.applicableTeachers = record.applicableTeachers
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
  saving.value = true
  try {
    await portfolioIndicatorPlatformApi.saveDefinition({
      id: editForm.id || undefined,
      indicatorCode: editForm.indicatorCode,
      indicatorName: editForm.indicatorName,
      levelNo: editForm.levelNo,
      dimensionL1Name: editForm.dimensionL1Name,
      dimensionL2Name: editForm.dimensionL2Name,
      definitionText: editForm.definitionText,
      defaultDataSource: editForm.defaultDataSource,
      defaultRuleTemplateId: editForm.defaultRuleTemplateId || undefined,
      policyAlign: editForm.policyAlign || undefined,
      applicableTeachers: editForm.applicableTeachers,
      auditRequired: editForm.auditRequired,
      redLineFlag: editForm.redLineFlag,
      sortOrder: editForm.sortOrder,
      status: editForm.status,
    })
    if (editForm.defaultRuleTemplateId) {
      await portfolioIndicatorPlatformApi.saveBinding({
        indicatorCode: editForm.indicatorCode,
        templateId: editForm.defaultRuleTemplateId,
        bindingPriority: 0,
      })
    }
    message.success('指标已保存')
    editMode.value = false
    detail.value = await portfolioIndicatorPlatformApi.getDefinition({
      indicatorCode: editForm.indicatorCode,
    })
    fillEditForm(detail.value)
    await Promise.all([loadSummary(), reloadTab()])
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

function openNewIndicator() {
  detail.value = null
  editForm.id = ''
  editForm.indicatorCode = ''
  editForm.indicatorName = ''
  editForm.levelNo = 3
  editForm.dimensionL1Name = ''
  editForm.dimensionL2Name = ''
  editForm.definitionText = ''
  editForm.defaultDataSource = PfIndicatorDataSourceChannelCode.MANUAL_ENTRY
  editForm.defaultRuleTemplateId = ''
  editForm.policyAlign = ''
  editForm.applicableTeachers = ''
  editForm.auditRequired = false
  editForm.redLineFlag = false
  editForm.sortOrder = 0
  editForm.status = PfIndicatorStatusCode.ACTIVE
  detailOpen.value = true
  editMode.value = true
}

function openTemplateEdit(record?: PortfolioIndicatorRuleTemplateVO) {
  if (record) {
    templateForm.id = record.id
    templateForm.templateCode = record.templateCode
    templateForm.templateName = record.templateName
    templateForm.ruleType = record.ruleType
    templateParams.value =
      parseTemplateParamsJson(record.paramsJson) ?? defaultTemplateParams(record.ruleType)
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
  saving.value = true
  try {
    await portfolioIndicatorPlatformApi.saveTemplate({
      id: templateForm.id || undefined,
      templateCode: templateForm.templateCode,
      templateName: templateForm.templateName,
      ruleType: templateForm.ruleType,
      paramsJson: serializeTemplateParams(templateParams.value),
      description: templateForm.description || undefined,
      status: templateForm.status,
    })
    message.success('规则模板已保存')
    templateDrawerOpen.value = false
    await loadTemplates()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

function openPackEdit(record?: PortfolioIndustryPackVO) {
  if (record) {
    packForm.id = record.id
    packForm.packCode = record.packCode
    packForm.packName = record.packName
    packForm.packVersion = record.packVersion ?? '1.0.0'
    packDefExistingJson.value = record.packDefJson ?? '{}'
    const parsedPackDef = parseIndustryPackDefJson(
      record.packCode,
      record.packName,
      record.packVersion ?? '1.0.0',
      packDefExistingJson.value,
    )
    if (!parsedPackDef) {
      return
    }
    Object.assign(packDefForm, parsedPackDef)
    packForm.status = record.status
  } else {
    packForm.id = ''
    packForm.packCode = ''
    packForm.packName = ''
    packForm.packVersion = '1.0.0'
    packDefExistingJson.value = '{}'
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
  saving.value = true
  try {
    const packDefJson = packForm.id
      ? mergeIndustryPackDefJson(
          {
            ...packDefForm,
            packId: packForm.packCode,
            packName: packForm.packName,
            version: packForm.packVersion,
          },
          packDefExistingJson.value,
        )
      : buildNewIndustryPackDefJson({
          ...packDefForm,
          packId: packForm.packCode,
          packName: packForm.packName,
          version: packForm.packVersion,
        })
    if (!packDefJson) {
      return
    }
    await portfolioIndicatorPlatformApi.saveIndustryPack({
      id: packForm.id || undefined,
      packCode: packForm.packCode,
      packName: packForm.packName,
      packVersion: packForm.packVersion,
      packDefJson,
      status: packForm.status,
    })
    message.success('行业包已保存')
    packDrawerOpen.value = false
    await loadIndustryPacks()
    await loadSummary()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

async function importSeed() {
  seeding.value = true
  try {
    const result = await portfolioIndicatorPlatformApi.importSeed()
    message.success(
      `种子导入完成：指标 ${result.totalIndicatorCount} 项，行业包 ${result.totalIndustryPackCount} 个`,
    )
    await Promise.all([loadSummary(), reloadTab()])
  } catch (error) {
    showUserError(error)
  } finally {
    seeding.value = false
  }
}

function onTabChange(key: string | number) {
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
          <UiButton variant="primary" :loading="seeding" @click="importSeed">
            导入全量种子
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <a-alert
      v-if="summary"
      :type="summary.t001T100Ready ? 'success' : 'warning'"
      show-icon
      :message="`平台指标 ${summary.platformIndicatorCount} 项已就绪，行业包 ${summary.industryPackCount} 个`"
      style="margin-bottom: 16px"
    />
    <UiCard>
      <a-tabs :active-key="activeTab" @change="onTabChange">
        <a-tab-pane key="tree" tab="指标树">
          <a-tree
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
                <a v-if="indicatorCode" class="detail-link" @click.stop="openDetail(indicatorCode)"
                  >详情</a
                >
              </span>
            </template>
          </a-tree>
          <div class="tree-foot">观测点 {{ observationCount }} 项</div>
        </a-tab-pane>
        <a-tab-pane key="table" tab="指标表">
          <div class="toolbar">
            <a-input
              v-model:value="query.indicatorCode"
              placeholder="指标编码"
              style="width: 120px"
              @press-enter="loadPage"
            />
            <a-input
              v-model:value="query.indicatorName"
              placeholder="指标名称"
              style="width: 160px"
              @press-enter="loadPage"
            />
            <UiButton @click="loadPage"> 查询 </UiButton>
            <UiButton variant="outline" @click="openNewIndicator"> 新建指标 </UiButton>
          </div>
          <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无平台指标" />
          <UiDataTable
            v-model:current="query.pageNum"
            v-model:page-size="query.pageSize"
            pagination-mode="server"
            :columns="definitionColumns"
            :data-source="rows"
            :loading="loading"
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
                    { key: 'detail', label: '详情' },
                    { key: 'edit', label: '编辑' },
                  ]"
                  split
                  @action="(key) => handleIndicatorRowAction(key, record.indicatorCode)"
                />
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
        <a-tab-pane key="template" tab="规则模板">
          <div class="toolbar">
            <a-input
              v-model:value="templateQuery.templateCode"
              placeholder="模板编码"
              style="width: 120px"
              @press-enter="loadTemplates"
            />
            <a-select
              v-model:value="templateQuery.ruleType"
              allow-clear
              placeholder="规则类型"
              style="width: 140px"
              :options="PF_SCORE_RULE_TYPE_OPTIONS"
            />
            <a-select
              v-model:value="templateQuery.status"
              allow-clear
              placeholder="状态"
              style="width: 100px"
              :options="PF_INDICATOR_STATUS_OPTIONS"
            />
            <UiButton @click="loadTemplates"> 查询 </UiButton>
            <UiButton variant="outline" @click="openTemplateEdit()"> 新建模板 </UiButton>
          </div>
          <UiDataTable
            v-model:current="templateQuery.pageNum"
            v-model:page-size="templateQuery.pageSize"
            pagination-mode="server"
            :columns="templateColumns"
            :data-source="templates"
            :loading="loading"
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
                  :items="[{ key: 'edit', label: '编辑' }]"
                  split
                  @action="() => openTemplateEdit(record)"
                />
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
        <a-tab-pane key="pack" tab="行业包">
          <div class="toolbar">
            <UiButton variant="outline" @click="openPackEdit()"> 新建行业包 </UiButton>
          </div>
          <UiDataTable
            :columns="packColumns"
            :data-source="industryPacks"
            :loading="loading"
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
                  :items="[{ key: 'edit', label: '编辑' }]"
                  split
                  @action="() => openPackEdit(record)"
                />
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
        <a-tab-pane key="import" tab="Excel 导入">
          <p class="hint">请先下载模板，填写后上传 Excel 文件批量导入指标定义。</p>
          <UiButton @click="importModalOpen = true"> Excel 批量导入 </UiButton>
        </a-tab-pane>
        <a-tab-pane key="mapping" tab="来源映射">
          <UiDataTable
            :columns="mappingColumns"
            :data-source="sourceMappings"
            :loading="loading"
            row-key="indicatorCode"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'autoCollectSupported'">
                {{ record.autoCollectSupported ? '是' : '否' }}
              </template>
              <template v-else-if="column.key === 'outOfScope'">
                <UiTag :tone="record.outOfScope ? 'gray' : 'green'">
                  {{ record.outOfScope ? '不实现' : '本域' }}
                </UiTag>
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
      </a-tabs>
    </UiCard>
    <a-drawer v-model:open="detailOpen" title="指标详情" width="520" @close="editMode = false">
      <a-spin :spinning="detailLoading">
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
          <p v-if="detail.applicableTeachers" class="meta">适用：{{ detail.applicableTeachers }}</p>
          <p v-if="detail.policyAlign" class="meta">政策对齐：{{ detail.policyAlign }}</p>
          <UiButton style="margin-top: 12px" @click="startEdit"> 编辑 </UiButton>
        </template>
        <a-form v-else-if="editMode" layout="vertical">
          <a-form-item label="指标编码">
            <a-input v-model:value="editForm.indicatorCode" :disabled="Boolean(editForm.id)" />
          </a-form-item>
          <a-form-item label="指标名称">
            <a-input v-model:value="editForm.indicatorName" />
          </a-form-item>
          <a-form-item label="一级维度">
            <a-input v-model:value="editForm.dimensionL1Name" />
          </a-form-item>
          <a-form-item label="二级维度">
            <a-input v-model:value="editForm.dimensionL2Name" />
          </a-form-item>
          <a-form-item label="定义说明">
            <a-textarea v-model:value="editForm.definitionText" :rows="3" />
          </a-form-item>
          <a-form-item label="数据来源">
            <a-select
              v-model:value="editForm.defaultDataSource"
              :options="PF_INDICATOR_DATA_SOURCE_CHANNEL_OPTIONS"
            />
          </a-form-item>
          <a-form-item label="规则模板 ID">
            <a-input
              v-model:value="editForm.defaultRuleTemplateId"
              placeholder="绑定 Score 模板主键"
            />
          </a-form-item>
          <a-form-item label="适用对象">
            <a-input v-model:value="editForm.applicableTeachers" />
          </a-form-item>
          <a-form-item label="状态">
            <a-select v-model:value="editForm.status" :options="PF_INDICATOR_STATUS_OPTIONS" />
          </a-form-item>
          <a-form-item label="红线指标">
            <a-switch v-model:checked="editForm.redLineFlag" />
          </a-form-item>
          <a-form-item label="需审核">
            <a-switch v-model:checked="editForm.auditRequired" />
          </a-form-item>
          <div class="drawer-actions">
            <UiButton @click="editMode = false"> 取消 </UiButton>
            <UiButton variant="primary" :loading="saving" @click="saveDefinition"> 保存 </UiButton>
          </div>
        </a-form>
      </a-spin>
    </a-drawer>
    <a-drawer v-model:open="templateDrawerOpen" title="规则模板" width="480">
      <a-form layout="vertical">
        <a-form-item label="模板编码">
          <a-input v-model:value="templateForm.templateCode" :disabled="Boolean(templateForm.id)" />
        </a-form-item>
        <a-form-item label="模板名称">
          <a-input v-model:value="templateForm.templateName" />
        </a-form-item>
        <a-form-item label="规则类型">
          <a-select v-model:value="templateForm.ruleType" :options="PF_SCORE_RULE_TYPE_OPTIONS" />
        </a-form-item>
        <PortfolioIndicatorTemplateParamsForm
          :rule-type="templateForm.ruleType"
          :params="templateParams"
          @update:params="templateParams = $event"
        />
        <a-form-item label="状态">
          <a-select v-model:value="templateForm.status" :options="PF_INDICATOR_STATUS_OPTIONS" />
        </a-form-item>
        <UiButton variant="primary" :loading="saving" @click="saveTemplateForm"> 保存 </UiButton>
      </a-form>
    </a-drawer>
    <a-drawer v-model:open="packDrawerOpen" title="行业包" width="480">
      <a-form layout="vertical">
        <a-form-item label="包编码">
          <a-input v-model:value="packForm.packCode" :disabled="Boolean(packForm.id)" />
        </a-form-item>
        <a-form-item label="包名称">
          <a-input v-model:value="packForm.packName" />
        </a-form-item>
        <a-form-item label="版本">
          <a-input v-model:value="packForm.packVersion" />
        </a-form-item>
        <a-form-item label="适用专业（每行一个）">
          <a-textarea v-model:value="packDefForm.applicableMajorsText" :rows="4" />
        </a-form-item>
        <a-form-item label="权重 · 企业实践">
          <a-input-number
            v-model:value="packDefForm.weightEnterprisePractice"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="权重 · 职业资格">
          <a-input-number
            v-model:value="packDefForm.weightQualification"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="权重 · 行业项目">
          <a-input-number
            v-model:value="packDefForm.weightIndustryProject"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="权重 · 教学贡献">
          <a-input-number
            v-model:value="packDefForm.weightTeachingContribution"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="权重 · 社会服务">
          <a-input-number
            v-model:value="packDefForm.weightSocialService"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="权重 · 培训发展">
          <a-input-number
            v-model:value="packDefForm.weightTrainingDevelopment"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="必交材料（每行一项）">
          <a-textarea v-model:value="packDefForm.materialRequiredText" :rows="4" />
        </a-form-item>
        <a-form-item label="选交材料（每行一项）">
          <a-textarea v-model:value="packDefForm.materialOptionalText" :rows="3" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="packForm.status" :options="PF_INDICATOR_STATUS_OPTIONS" />
        </a-form-item>
        <UiButton variant="primary" :loading="saving" @click="savePackForm"> 保存 </UiButton>
      </a-form>
    </a-drawer>
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
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.obs-meta {
  margin-left: 8px;
  color: var(--ant-color-text-secondary);
  font-size: 12px;
}
.detail-link {
  margin-left: 8px;
}
.tree-foot {
  margin-top: 8px;
  font-size: 13px;
  color: var(--ant-color-text-secondary);
}
.meta {
  font-size: 13px;
  color: var(--ant-color-text-secondary);
}
.detail-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 12px 0;
}
.drawer-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
