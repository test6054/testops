<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioPolicyDocumentCompareVO,
  PortfolioPolicyDocumentDetailVO,
  PortfolioPolicyDocumentVO,
  PortfolioPolicyIndicatorMappingVO,
} from '@/apis/portfolio/policy'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioPolicyApi } from '@/apis/portfolio/policy'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  ALL_PORTFOLIO_POLICY_DOCUMENT_STATUS_CODES,
  PortfolioPolicyDocumentStatusCode,
  PortfolioPolicyDocumentStatusDescription,
} from '@/types/enums/portfolio-policy-document-status-enum'
import {
  ALL_PORTFOLIO_POLICY_LEVEL_CODES,
  PortfolioPolicyLevelCode,
  PortfolioPolicyLevelDescription,
} from '@/types/enums/portfolio-policy-level-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const loadError = ref(false)
const pageRequestToken = ref(0)
const previewRequestToken = ref(0)
const detailRequestToken = ref(0)
const editorRequestToken = ref(0)
const rows = ref<PortfolioPolicyDocumentVO[]>([])
const total = ref(0)
const editorOpen = ref(false)
const previewOpen = ref(false)
const previewText = ref('')
const detailOpen = ref(false)
const supersedeOpen = ref(false)
const compareOpen = ref(false)
const compareLoading = ref(false)
const compareResult = ref<PortfolioPolicyDocumentCompareVO | null>(null)
const compareLeftId = ref('')
const compareRightId = ref('')
const detailLoading = ref(false)
const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const mappingSaving = computed(() => operationKey.value.startsWith('mapping:save:'))
const detail = ref<PortfolioPolicyDocumentDetailVO | null>(null)
const supersedeSourceId = ref('')
const editingId = ref<string | undefined>(undefined)
/** 含历史版本筛选：勾选后列表包含被替代/已废止版本。 */
const includeHistory = ref(false)

const filterForm = reactive({
  policyLevel: undefined as PortfolioPolicyLevelCode | undefined,
  documentStatus: undefined as PortfolioPolicyDocumentStatusCode | undefined,
  documentTitle: '',
})

const form = reactive({
  documentCode: '',
  documentTitle: '',
  policyLevel: PortfolioPolicyLevelCode.NATIONAL,
  topicCategory: '双师认定',
  publishOrg: '',
  publishDate: '',
  fullTextContent: '',
})

const supersedeForm = reactive({
  documentCode: '',
  documentTitle: '',
  policyLevel: PortfolioPolicyLevelCode.NATIONAL,
  topicCategory: '双师认定',
  publishOrg: '',
  publishDate: '',
  fullTextContent: '',
})

const mappingRows = ref<
  Array<{
    clauseCode: string
    clauseTitle: string
    indicatorCode: string
    materialRequirement: string
  }>
>([])

const filterModel = computed({
  get: () => filterForm,
  set: (v) => {
    Object.assign(filterForm, v)
  },
})

const filterFields = computed(() => [
  {
    key: 'policyLevel',
    type: 'select' as const,
    label: '层级',
    allowClear: true,
    width: 120,
    options: ALL_PORTFOLIO_POLICY_LEVEL_CODES.map((c) => ({
      value: c,
      label: PortfolioPolicyLevelDescription[c],
    })),
  },
  {
    key: 'documentStatus',
    type: 'select' as const,
    label: '状态',
    allowClear: true,
    width: 140,
    options: ALL_PORTFOLIO_POLICY_DOCUMENT_STATUS_CODES.map((c) => ({
      value: c,
      label: PortfolioPolicyDocumentStatusDescription[c],
    })),
  },
  { key: 'documentTitle', type: 'input' as const, label: '标题', width: 180 },
])

const query = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })

const columns: ColumnsType = [
  { title: '文号', dataIndex: 'documentCode', key: 'documentCode', width: 140 },
  { title: '标题', dataIndex: 'documentTitle', key: 'documentTitle' },
  { title: '层级', key: 'policyLevel', width: 80 },
  { title: '分类', dataIndex: 'topicCategory', key: 'topicCategory', width: 120 },
  { title: '状态', key: 'documentStatus', width: 100 },
  { title: '发布日期', dataIndex: 'publishDate', key: 'publishDate', width: 110 },
  { title: '操作', key: 'actions', width: 240 },
]

/** 政策发布、修订与指标映射写操作必须串行，避免同一政策被跨弹窗并发改写。 */
function beginOperation(key: string): boolean {
  if (writing.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}

function levelLabel(code: string) {
  return strictEnumLabel(
    PortfolioPolicyLevelDescription,
    code as PortfolioPolicyLevelCode,
    '政策层级',
  )
}

function statusLabel(code: string) {
  return strictEnumLabel(
    PortfolioPolicyDocumentStatusDescription,
    code as PortfolioPolicyDocumentStatusCode,
    '政策状态',
  )
}

async function loadPage() {
  const currentToken = pageRequestToken.value + 1
  pageRequestToken.value = currentToken
  const request = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    policyLevel: filterForm.policyLevel,
    documentStatus: filterForm.documentStatus,
    documentTitle: filterForm.documentTitle.trim() || undefined,
    includeHistory: includeHistory.value || undefined,
  }
  loading.value = true
  loadError.value = false
  try {
    const result = await portfolioPolicyApi.page(request)
    if (pageRequestToken.value !== currentToken) return
    rows.value = result.list ?? []
    total.value = result.total ?? 0
  } catch (error) {
    if (pageRequestToken.value !== currentToken) return
    rows.value = []
    total.value = 0
    loadError.value = true
    showUserError(error, '加载政策文件失败')
  } finally {
    if (pageRequestToken.value === currentToken) loading.value = false
  }
}

function openCreate() {
  if (writing.value) return
  editingId.value = undefined
  form.documentCode = ''
  form.documentTitle = ''
  form.policyLevel = PortfolioPolicyLevelCode.NATIONAL
  form.topicCategory = '双师认定'
  form.publishOrg = ''
  form.publishDate = new Date().toISOString().slice(0, 10)
  form.fullTextContent = ''
  editorOpen.value = true
}

async function openEdit(row: PortfolioPolicyDocumentVO) {
  if (writing.value) return
  const currentToken = editorRequestToken.value + 1
  editorRequestToken.value = currentToken
  try {
    const result = await portfolioPolicyApi.get({ id: row.id })
    if (editorRequestToken.value !== currentToken) return
    editingId.value = result.document.id
    form.documentCode = result.document.documentCode
    form.documentTitle = result.document.documentTitle
    form.policyLevel = result.document.policyLevel as PortfolioPolicyLevelCode
    form.topicCategory = result.document.topicCategory
    form.publishOrg = result.document.publishOrg ?? ''
    form.publishDate = result.document.publishDate
    form.fullTextContent = result.fullTextContent
    editorOpen.value = true
  } catch (error) {
    if (editorRequestToken.value !== currentToken) return
    showUserError(error, '加载政策草稿失败')
  }
}

async function saveDraft() {
  const documentCode = form.documentCode.trim()
  const documentTitle = form.documentTitle.trim()
  const topicCategory = form.topicCategory.trim()
  if (
    !documentCode
    || !documentTitle
    || !topicCategory
    || !form.publishDate
    || !form.fullTextContent.trim()
  ) {
    showFormValidationMessage('请完整填写文号、标题、主题分类、发布日期和政策全文')
    return
  }
  const operation = `document:save:${editingId.value || 'new'}`
  if (!beginOperation(operation)) return
  const request = {
    id: editingId.value,
    documentCode,
    documentTitle,
    policyLevel: form.policyLevel,
    topicCategory,
    publishOrg: form.publishOrg.trim() || undefined,
    publishDate: form.publishDate,
    fullTextContent: form.fullTextContent,
  }
  try {
    await portfolioPolicyApi.save(request)
    void message.success('政策草稿已保存')
    editorOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '保存政策失败')
  } finally {
    endOperation(operation)
  }
}

async function publishRow(row: PortfolioPolicyDocumentVO) {
  const documentId = row.id
  const operation = `document:publish:${documentId}`
  if (!beginOperation(operation)) return
  if (
    !(await confirmAsync({
      title: '确认发布政策？',
      content: `发布「${row.documentTitle}」后将作为有效政策参与指标核验和教师问数。`,
      type: 'warning',
    }))
  ) {
    endOperation(operation)
    return
  }
  try {
    await portfolioPolicyApi.publish({ id: documentId })
    void message.success('政策已发布')
    await loadPage()
  } catch (error) {
    showUserError(error, '发布政策失败')
  } finally {
    endOperation(operation)
  }
}

async function previewRow(row: PortfolioPolicyDocumentVO) {
  const currentToken = previewRequestToken.value + 1
  previewRequestToken.value = currentToken
  previewText.value = ''
  try {
    const result = await portfolioPolicyApi.preview({ id: row.id })
    if (previewRequestToken.value !== currentToken) return
    previewText.value = result.fullTextContent
    previewOpen.value = true
  } catch (error) {
    if (previewRequestToken.value !== currentToken) return
    previewText.value = ''
    previewOpen.value = false
    showUserError(error, '预览政策失败')
  }
}

function resetMappingRows(items: PortfolioPolicyIndicatorMappingVO[] = []) {
  mappingRows.value = items.length
    ? items.map((item) => ({
        clauseCode: item.clauseCode,
        clauseTitle: item.clauseTitle,
        indicatorCode: item.indicatorCode,
        materialRequirement: item.materialRequirement ?? '',
      }))
    : [{ clauseCode: '', clauseTitle: '', indicatorCode: '', materialRequirement: '' }]
}

/** 切换政策详情目标时先清空旧详情，避免上一份政策内容残留到当前弹窗。 */
function resetDetailContext() {
  detail.value = null
  resetMappingRows()
}

async function openDetail(row: PortfolioPolicyDocumentVO) {
  const currentToken = detailRequestToken.value + 1
  detailRequestToken.value = currentToken
  const documentId = row.id
  resetDetailContext()
  detailLoading.value = true
  detailOpen.value = true
  try {
    const result = await portfolioPolicyApi.get({ id: documentId })
    if (detailRequestToken.value !== currentToken) return
    detail.value = result
    resetMappingRows(detail.value.mappings ?? [])
    const versions = detail.value.versionHistory
    compareRightId.value = detail.value.document.id
    compareLeftId.value = versions.find((item) => item.id !== compareRightId.value)?.id ?? ''
  } catch (error) {
    if (detailRequestToken.value !== currentToken) return
    resetDetailContext()
    detailOpen.value = false
    showUserError(error, '加载政策详情失败')
  } finally {
    if (detailRequestToken.value === currentToken) detailLoading.value = false
  }
}

async function compareVersions() {
  if (!compareLeftId.value || !compareRightId.value) {
    showFormValidationMessage('请选择左右两个政策版本')
    return
  }
  if (compareLeftId.value === compareRightId.value) {
    showFormValidationMessage('左右版本不能相同')
    return
  }
  compareLoading.value = true
  compareResult.value = null
  try {
    compareResult.value = await portfolioPolicyApi.compare({
      leftDocumentId: compareLeftId.value,
      rightDocumentId: compareRightId.value,
    })
    compareOpen.value = true
  } catch (error) {
    showUserError(error, '对比政策版本失败')
  } finally {
    compareLoading.value = false
  }
}

function addMappingRow() {
  mappingRows.value.push({
    clauseCode: '',
    clauseTitle: '',
    indicatorCode: '',
    materialRequirement: '',
  })
}

function removeMappingRow(index: number) {
  mappingRows.value.splice(index, 1)
  if (!mappingRows.value.length) resetMappingRows()
}

async function saveMappings() {
  if (!detail.value?.document.id) {
    return
  }
  const incomplete = mappingRows.value.some(
    (item) =>
      Boolean(
        item.clauseCode.trim()
        || item.clauseTitle.trim()
        || item.indicatorCode.trim()
        || item.materialRequirement.trim(),
      )
      && (!item.clauseCode.trim() || !item.clauseTitle.trim() || !item.indicatorCode.trim()),
  )
  if (incomplete) {
    showFormValidationMessage('每条指标映射必须完整填写条款编码、条款标题和指标编码')
    return
  }
  const policyDocumentId = detail.value.document.id
  const mappings = mappingRows.value
    .filter((item) => item.clauseCode.trim() && item.indicatorCode.trim())
    .map((item) => ({
      clauseCode: item.clauseCode.trim(),
      clauseTitle: item.clauseTitle.trim(),
      indicatorCode: item.indicatorCode.trim(),
      materialRequirement: item.materialRequirement.trim() || undefined,
    }))
  const operation = `mapping:save:${policyDocumentId}`
  if (!beginOperation(operation)) return
  try {
    await portfolioPolicyApi.saveMapping({
      policyDocumentId,
      mappings,
    })
    void message.success('指标映射已保存')
    const refreshed = await portfolioPolicyApi.get({ id: policyDocumentId })
    if (detail.value?.document.id === policyDocumentId) {
      detail.value = refreshed
      resetMappingRows(refreshed.mappings ?? [])
    }
    await loadPage()
  } catch (error) {
    showUserError(error, '保存指标映射失败')
  } finally {
    endOperation(operation)
  }
}

function openSupersede(row: PortfolioPolicyDocumentVO) {
  if (writing.value) return
  supersedeSourceId.value = row.id
  supersedeForm.documentCode = row.documentCode
  supersedeForm.documentTitle = `${row.documentTitle}（修订）`
  supersedeForm.policyLevel = row.policyLevel as PortfolioPolicyLevelCode
  supersedeForm.topicCategory = row.topicCategory
  supersedeForm.publishOrg = row.publishOrg ?? ''
  supersedeForm.publishDate = new Date().toISOString().slice(0, 10)
  supersedeForm.fullTextContent = ''
  supersedeOpen.value = true
}

async function submitSupersede() {
  if (!supersedeSourceId.value) {
    return
  }
  const sourceDocumentId = supersedeSourceId.value
  const documentCode = supersedeForm.documentCode.trim()
  const documentTitle = supersedeForm.documentTitle.trim()
  const topicCategory = supersedeForm.topicCategory.trim()
  if (
    !documentCode
    || !documentTitle
    || !topicCategory
    || !supersedeForm.publishDate
    || !supersedeForm.fullTextContent.trim()
  ) {
    showFormValidationMessage('请完整填写修订版文号、标题、主题分类、发布日期和全文')
    return
  }
  const operation = `document:supersede:${sourceDocumentId}`
  if (!beginOperation(operation)) return
  const request = {
    sourceDocumentId,
    documentCode,
    documentTitle,
    policyLevel: supersedeForm.policyLevel,
    topicCategory,
    publishOrg: supersedeForm.publishOrg.trim() || undefined,
    publishDate: supersedeForm.publishDate,
    fullTextContent: supersedeForm.fullTextContent,
  }
  try {
    await portfolioPolicyApi.supersede(request)
    void message.success('政策修订版已创建')
    supersedeOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '创建修订版失败')
  } finally {
    endOperation(operation)
  }
}

function onSearch() {
  query.pageNum = 1
  void loadPage()
}

function onPageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  void loadPage()
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="政策文件库" subtitle="四级政策维护与发布" />
    </template>
    <UiCard>
      <div class="policy-admin__toolbar">
        <UiFilterBar v-model="filterModel" :fields="filterFields" @search="onSearch" />
        <a-checkbox
          v-model:checked="includeHistory"
          class="policy-admin__history-toggle"
          @change="onSearch"
        >
          含历史版本
        </a-checkbox>
        <UiButton size="sm" variant="primary" :disabled="writing" @click="openCreate">
          新建政策
        </UiButton>
      </div>
      <UiDataTable
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        row-key="id"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        pagination-mode="server"
        :total="total"
        @page-change="onPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'policyLevel'">
            {{ levelLabel(record.policyLevel) }}
          </template>
          <template v-else-if="column.key === 'documentStatus'">
            <UiTag>{{ statusLabel(record.documentStatus) }}</UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[
                { key: 'detail', label: '详情', disabled: writing },
                { key: 'preview', label: '预览', disabled: writing },
                ...(record.documentStatus === PortfolioPolicyDocumentStatusCode.DRAFT
                  ? [
                    { key: 'edit', label: '编辑', disabled: writing },
                    { key: 'publish', label: '发布', disabled: writing },
                  ]
                  : []),
                ...(record.documentStatus === PortfolioPolicyDocumentStatusCode.EFFECTIVE
                  ? [{ key: 'supersede', label: '修订', disabled: writing }]
                  : []),
              ]"
              @action="
                (key) => {
                  if (key === 'publish') publishRow(record)
                  else if (key === 'edit') openEdit(record)
                  else if (key === 'detail') openDetail(record)
                  else if (key === 'supersede') openSupersede(record)
                  else previewRow(record)
                }
              "
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiDialog
      v-model:open="editorOpen"
      title="政策文件草稿"
      :confirm-loading="operationKey.startsWith('document:save:')"
      :closable="!writing"
      :mask-closable="!writing"
      @ok="saveDraft"
    >
      <UiInput
        size="sm"
        v-model="form.documentCode"
        placeholder="文号"
        class="policy-admin__field"
        :disabled="writing"
      />
      <UiInput
        size="sm"
        v-model="form.documentTitle"
        placeholder="标题"
        class="policy-admin__field"
        :disabled="writing"
      />
      <UiSelect
        size="sm"
        v-model="form.policyLevel"
        class="policy-admin__field"
        :options="
          ALL_PORTFOLIO_POLICY_LEVEL_CODES.map((c) => ({
            value: c,
            label: PortfolioPolicyLevelDescription[c],
          }))
        "
        :disabled="writing"
      />
      <UiInput
        size="sm"
        v-model="form.topicCategory"
        placeholder="主题分类"
        class="policy-admin__field"
        :disabled="writing"
      />
      <UiInput
        size="sm"
        v-model="form.publishOrg"
        placeholder="发布机构（可选）"
        class="policy-admin__field"
        :disabled="writing"
      />
      <UiInput
        size="sm"
        v-model="form.publishDate"
        placeholder="发布日期，年-月-日例如 2026-07-16"
        class="policy-admin__field"
        :disabled="writing"
      />
      <UiTextarea
        size="sm"
        v-model="form.fullTextContent"
        placeholder="全文内容"
        :rows="6"
        :disabled="writing"
      />
    </UiDialog>
    <UiDialog v-model:open="previewOpen" title="政策预览" hide-footer>
      <pre class="policy-admin__preview">{{ previewText }}</pre>
    </UiDialog>
    <UiDialog
      v-model:open="detailOpen"
      title="政策详情"
      width="760px"
      hide-footer
      :closable="!writing"
      :mask-closable="!writing"
      @cancel="resetDetailContext"
    >
      <UiSpin :spinning="detailLoading">
        <template v-if="detail">
          <dl class="policy-admin__detail-meta">
            <div>
              <dt>文号</dt>
              <dd>{{ detail.document.documentCode }}</dd>
            </div>
            <div>
              <dt>标题</dt>
              <dd>{{ detail.document.documentTitle }}</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>v{{ detail.document.versionNo }}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{{ statusLabel(detail.document.documentStatus) }}</dd>
            </div>
          </dl>
          <h4 class="policy-admin__section-title">指标映射</h4>
          <div v-for="(row, index) in mappingRows" :key="index" class="policy-admin__mapping-row">
            <UiInput
              size="sm"
              v-model="row.clauseCode"
              placeholder="条款编码"
              :disabled="writing"
            />
            <UiInput
              size="sm"
              v-model="row.clauseTitle"
              placeholder="条款标题"
              :disabled="writing"
            />
            <UiInput
              size="sm"
              v-model="row.indicatorCode"
              placeholder="指标编码"
              :disabled="writing"
            />
            <UiInput
              size="sm"
              v-model="row.materialRequirement"
              placeholder="材料要求"
              :disabled="writing"
            />
            <UiButton
              size="sm"
              status="danger"
              variant="ghost"
              :disabled="writing"
              @click="removeMappingRow(index)"
            >
              删除
            </UiButton>
          </div>
          <div class="policy-admin__mapping-actions">
            <UiButton variant="primary" size="sm" :disabled="writing" @click="addMappingRow">
              新增映射
            </UiButton>
            <UiButton
              size="sm"
              variant="primary"
              :loading="mappingSaving"
              :disabled="writing"
              @click="saveMappings"
            >
              保存映射
            </UiButton>
          </div>
          <h4 v-if="detail.versionHistory.length" class="policy-admin__section-title">版本历史</h4>
          <div v-if="detail.versionHistory.length > 1" class="policy-admin__compare-bar">
            <UiSelect
              size="sm"
              v-model="compareLeftId"
              :options="
                detail.versionHistory.map((item) => ({
                  value: item.id,
                  label: `v${item.versionNo} · ${item.documentTitle}`,
                }))
              "
              :disabled="compareLoading"
            />
            <span>对比</span>
            <UiSelect
              size="sm"
              v-model="compareRightId"
              :options="
                detail.versionHistory.map((item) => ({
                  value: item.id,
                  label: `v${item.versionNo} · ${item.documentTitle}`,
                }))
              "
              :disabled="compareLoading"
            />
            <UiButton size="sm" :loading="compareLoading" @click="compareVersions">
              查看差异
            </UiButton>
          </div>
          <ul v-if="detail.versionHistory.length" class="policy-admin__version-list">
            <li
              v-for="item in detail.versionHistory"
              :key="item.id"
              class="policy-admin__version-item"
            >
              <span
                class="policy-admin__version-badge"
                :class="{
                  'policy-admin__version-badge--muted':
                    item.documentStatus !== PortfolioPolicyDocumentStatusCode.EFFECTIVE,
                }"
              >
                v{{ item.versionNo }}
              </span>
              <UiTag
                size="sm"
                :tone="
                  item.documentStatus === PortfolioPolicyDocumentStatusCode.EFFECTIVE
                    ? 'green'
                    : 'gray'
                "
              >
                {{ statusLabel(item.documentStatus) }}
              </UiTag>
              <span class="policy-admin__version-title">{{ item.documentTitle }}</span>
            </li>
          </ul>
        </template>
      </UiSpin>
    </UiDialog>
    <UiDialog v-model:open="compareOpen" title="政策版本差异" :width="900" hide-footer>
      <template v-if="compareResult">
        <p class="policy-admin__compare-summary">
          v{{ compareResult.leftDocument.versionNo }} → v{{
            compareResult.rightDocument.versionNo
          }}， 变更 {{ compareResult.changedLineCount }} 行
        </p>
        <ol class="policy-admin__diff">
          <li
            v-for="(hunk, index) in compareResult.hunks"
            :key="`${hunk.changeType}-${hunk.leftLineNo}-${hunk.rightLineNo}-${index}`"
            :class="`policy-admin__diff--${hunk.changeType.toLowerCase()}`"
          >
            <span>{{ hunk.leftLineNo ?? '·' }}</span>
            <span>{{ hunk.rightLineNo ?? '·' }}</span>
            <code>{{ hunk.text || ' ' }}</code>
          </li>
        </ol>
      </template>
    </UiDialog>
    <UiDialog
      v-model:open="supersedeOpen"
      title="创建政策修订版"
      :confirm-loading="operationKey.startsWith('document:supersede:')"
      :closable="!writing"
      :mask-closable="!writing"
      @ok="submitSupersede"
    >
      <UiInput
        size="sm"
        v-model="supersedeForm.documentCode"
        placeholder="文号"
        class="policy-admin__field"
        :disabled="writing"
      />
      <UiInput
        size="sm"
        v-model="supersedeForm.documentTitle"
        placeholder="标题"
        class="policy-admin__field"
        :disabled="writing"
      />
      <UiSelect
        size="sm"
        v-model="supersedeForm.policyLevel"
        class="policy-admin__field"
        :options="
          ALL_PORTFOLIO_POLICY_LEVEL_CODES.map((c) => ({
            value: c,
            label: PortfolioPolicyLevelDescription[c],
          }))
        "
        :disabled="writing"
      />
      <UiInput
        size="sm"
        v-model="supersedeForm.topicCategory"
        placeholder="主题分类"
        class="policy-admin__field"
        :disabled="writing"
      />
      <UiInput
        size="sm"
        v-model="supersedeForm.publishOrg"
        placeholder="发布机构（可选）"
        class="policy-admin__field"
        :disabled="writing"
      />
      <UiInput
        size="sm"
        v-model="supersedeForm.publishDate"
        placeholder="发布日期，年-月-日例如 2026-07-16"
        class="policy-admin__field"
        :disabled="writing"
      />
      <UiTextarea
        size="sm"
        v-model="supersedeForm.fullTextContent"
        placeholder="修订全文"
        :rows="6"
        :disabled="writing"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.policy-admin__toolbar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.policy-admin__history-toggle {
  align-self: center;
  white-space: nowrap;
}
.policy-admin__field {
  display: block;
  width: 100%;
  margin-bottom: 8px;
}
.policy-admin__preview {
  white-space: pre-wrap;
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
  max-height: 420px;
  overflow: auto;
}
.policy-admin__detail-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  margin: 0 0 16px;
}
.policy-admin__detail-meta dt {
  margin: 0;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}
.policy-admin__detail-meta dd {
  margin: 4px 0 0;
}
.policy-admin__section-title {
  margin: 16px 0 8px;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}
.policy-admin__mapping-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  gap: 8px;
  margin-bottom: 8px;
}
.policy-admin__mapping-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.policy-admin__version-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--dp-font-size-sm);
}
.policy-admin__version-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
}
.policy-admin__version-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 32px;
  height: 22px;
  padding: 0 8px;
  border-radius: var(--dp-radius-full);
  background: var(--dp-blue-50);
  color: var(--dp-blue-600);
  font-size: var(--dp-font-size-xs);
  font-weight: 600;
}
.policy-admin__version-badge--muted {
  background: var(--dp-gray-100);
  color: var(--dp-gray-600);
}
.policy-admin__version-title {
  color: var(--dp-text-secondary);
}
.policy-admin__compare-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.policy-admin__compare-summary {
  margin: 0 0 10px;
  color: var(--dp-text-secondary);
}
.policy-admin__diff {
  max-height: 560px;
  padding: 0;
  margin: 0;
  overflow: auto;
  font-size: var(--dp-font-size-xs);
  list-style: none;
}
.policy-admin__diff li {
  display: grid;
  grid-template-columns: 44px 44px minmax(0, 1fr);
  min-height: 28px;
  border-bottom: 1px solid var(--dp-border);
}
.policy-admin__diff li > * {
  padding: 5px 8px;
  overflow-wrap: anywhere;
}
.policy-admin__diff--insert {
  background: var(--dp-green-50, var(--dp-success-bg));
}
.policy-admin__diff--delete {
  background: var(--dp-red-50, var(--dp-error-bg));
}
@media (max-width: 720px) {
  .policy-admin__compare-bar {
    grid-template-columns: 1fr;
  }
}
</style>
