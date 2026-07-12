<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioPolicyDocumentDetailVO,
  PortfolioPolicyDocumentVO,
  PortfolioPolicyIndicatorMappingVO,
} from '@/apis/portfolio/policy'
import type { UiDataTableChangeEvent } from '@/components/ui-guide/ui/data-table'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioPolicyApi } from '@/apis/portfolio/policy'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import { readUiDataTablePagination } from '@/components/ui-guide/ui/data-table'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
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
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const rows = ref<PortfolioPolicyDocumentVO[]>([])
const total = ref(0)
const editorOpen = ref(false)
const previewOpen = ref(false)
const previewText = ref('')
const detailOpen = ref(false)
const supersedeOpen = ref(false)
const detailLoading = ref(false)
const mappingSaving = ref(false)
const detail = ref<PortfolioPolicyDocumentDetailVO | null>(null)
const supersedeSourceId = ref('')
const editingId = ref<string | undefined>(undefined)

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

const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  total: total.value,
  showSizeChanger: true,
}))

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
  loading.value = true
  try {
    const result = await portfolioPolicyApi.page({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      policyLevel: filterForm.policyLevel,
      documentStatus: filterForm.documentStatus,
      documentTitle: filterForm.documentTitle.trim() || undefined,
    })
    rows.value = result.list ?? []
    total.value = result.total ?? 0
  } catch (error) {
    showUserError(error, '加载政策文件失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
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

async function saveDraft() {
  try {
    await portfolioPolicyApi.save({
      id: editingId.value,
      documentCode: form.documentCode.trim(),
      documentTitle: form.documentTitle.trim(),
      policyLevel: form.policyLevel,
      topicCategory: form.topicCategory.trim(),
      publishOrg: form.publishOrg.trim() || undefined,
      publishDate: form.publishDate,
      fullTextContent: form.fullTextContent,
    })
    message.success('政策草稿已保存')
    editorOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '保存政策失败')
  }
}

async function publishRow(row: PortfolioPolicyDocumentVO) {
  try {
    await portfolioPolicyApi.publish({ id: row.id })
    message.success('政策已发布')
    await loadPage()
  } catch (error) {
    showUserError(error, '发布政策失败')
  }
}

async function previewRow(row: PortfolioPolicyDocumentVO) {
  try {
    const result = await portfolioPolicyApi.preview({ id: row.id })
    previewText.value = result.fullTextContent
    previewOpen.value = true
  } catch (error) {
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
  resetDetailContext()
  detailLoading.value = true
  detailOpen.value = true
  try {
    detail.value = await portfolioPolicyApi.get({ id: row.id })
    resetMappingRows(detail.value.mappings ?? [])
  } catch (error) {
    resetDetailContext()
    detailOpen.value = false
    showUserError(error, '加载政策详情失败')
  } finally {
    detailLoading.value = false
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

async function saveMappings() {
  if (!detail.value?.document.id) {
    return
  }
  const mappings = mappingRows.value
    .filter((item) => item.clauseCode.trim() && item.indicatorCode.trim())
    .map((item) => ({
      clauseCode: item.clauseCode.trim(),
      clauseTitle: item.clauseTitle.trim(),
      indicatorCode: item.indicatorCode.trim(),
      materialRequirement: item.materialRequirement.trim() || undefined,
    }))
  mappingSaving.value = true
  try {
    await portfolioPolicyApi.saveMapping({
      policyDocumentId: detail.value.document.id,
      mappings,
    })
    message.success('指标映射已保存')
    detail.value = await portfolioPolicyApi.get({ id: detail.value.document.id })
    resetMappingRows(detail.value.mappings ?? [])
    await loadPage()
  } catch (error) {
    showUserError(error, '保存指标映射失败')
  } finally {
    mappingSaving.value = false
  }
}

function openSupersede(row: PortfolioPolicyDocumentVO) {
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
  try {
    await portfolioPolicyApi.supersede({
      sourceDocumentId: supersedeSourceId.value,
      documentCode: supersedeForm.documentCode.trim(),
      documentTitle: supersedeForm.documentTitle.trim(),
      policyLevel: supersedeForm.policyLevel,
      topicCategory: supersedeForm.topicCategory.trim(),
      publishOrg: supersedeForm.publishOrg.trim() || undefined,
      publishDate: supersedeForm.publishDate,
      fullTextContent: supersedeForm.fullTextContent,
    })
    message.success('政策修订版已创建')
    supersedeOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '创建修订版失败')
  }
}

function onSearch() {
  query.pageNum = 1
  void loadPage()
}

function onTableChange(changeEvent: UiDataTableChangeEvent) {
  const { pageNum, pageSize } = readUiDataTablePagination(changeEvent, DEFAULT_LIST_PAGE_SIZE)
  query.pageNum = pageNum
  query.pageSize = pageSize
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
        <UiButton @click="openCreate"> 新建政策 </UiButton>
      </div>
      <UiDataTable
        row-key="id"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="pagination"
        @change="onTableChange"
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
                { key: 'detail', label: '详情' },
                { key: 'preview', label: '预览' },
                ...(record.documentStatus === PortfolioPolicyDocumentStatusCode.DRAFT
                  ? [{ key: 'publish', label: '发布' }]
                  : []),
                ...(record.documentStatus === PortfolioPolicyDocumentStatusCode.EFFECTIVE
                  ? [{ key: 'supersede', label: '修订' }]
                  : []),
              ]"
              @action="
                (key) => {
                  if (key === 'publish') publishRow(record)
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
    <a-modal v-model:open="editorOpen" title="政策文件草稿" @ok="saveDraft">
      <a-input v-model:value="form.documentCode" placeholder="文号" class="policy-admin__field" />
      <a-input v-model:value="form.documentTitle" placeholder="标题" class="policy-admin__field" />
      <a-select
        v-model:value="form.policyLevel"
        class="policy-admin__field"
        :options="
          ALL_PORTFOLIO_POLICY_LEVEL_CODES.map((c) => ({
            value: c,
            label: PortfolioPolicyLevelDescription[c],
          }))
        "
      />
      <a-input
        v-model:value="form.topicCategory"
        placeholder="主题分类"
        class="policy-admin__field"
      />
      <a-input
        v-model:value="form.publishDate"
        placeholder="发布日期 YYYY-MM-DD"
        class="policy-admin__field"
      />
      <a-textarea v-model:value="form.fullTextContent" placeholder="全文内容" :rows="6" />
    </a-modal>
    <a-modal v-model:open="previewOpen" title="政策预览" :footer="null">
      <pre class="policy-admin__preview">{{ previewText }}</pre>
    </a-modal>
    <a-modal
      v-model:open="detailOpen"
      title="政策详情"
      width="760px"
      :footer="null"
      @cancel="resetDetailContext"
    >
      <a-spin :spinning="detailLoading">
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
            <a-input v-model:value="row.clauseCode" placeholder="条款编码" />
            <a-input v-model:value="row.clauseTitle" placeholder="条款标题" />
            <a-input v-model:value="row.indicatorCode" placeholder="指标编码" />
            <a-input v-model:value="row.materialRequirement" placeholder="材料要求" />
          </div>
          <div class="policy-admin__mapping-actions">
            <UiButton @click="addMappingRow">新增映射</UiButton>
            <UiButton :loading="mappingSaving" @click="saveMappings">保存映射</UiButton>
          </div>
          <h4 v-if="detail.versionHistory.length" class="policy-admin__section-title">版本历史</h4>
          <ul v-if="detail.versionHistory.length" class="policy-admin__version-list">
            <li v-for="item in detail.versionHistory" :key="item.id">
              v{{ item.versionNo }} · {{ item.documentTitle }} ·
              {{ statusLabel(item.documentStatus) }}
            </li>
          </ul>
        </template>
      </a-spin>
    </a-modal>
    <a-modal v-model:open="supersedeOpen" title="创建政策修订版" @ok="submitSupersede">
      <a-input
        v-model:value="supersedeForm.documentCode"
        placeholder="文号"
        class="policy-admin__field"
      />
      <a-input
        v-model:value="supersedeForm.documentTitle"
        placeholder="标题"
        class="policy-admin__field"
      />
      <a-select
        v-model:value="supersedeForm.policyLevel"
        class="policy-admin__field"
        :options="
          ALL_PORTFOLIO_POLICY_LEVEL_CODES.map((c) => ({
            value: c,
            label: PortfolioPolicyLevelDescription[c],
          }))
        "
      />
      <a-input
        v-model:value="supersedeForm.topicCategory"
        placeholder="主题分类"
        class="policy-admin__field"
      />
      <a-input
        v-model:value="supersedeForm.publishDate"
        placeholder="发布日期 YYYY-MM-DD"
        class="policy-admin__field"
      />
      <a-textarea v-model:value="supersedeForm.fullTextContent" placeholder="修订全文" :rows="6" />
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped>
.policy-admin__toolbar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.policy-admin__field {
  display: block;
  width: 100%;
  margin-bottom: 8px;
}
.policy-admin__preview {
  white-space: pre-wrap;
  font-size: 13px;
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
  font-size: 12px;
  color: var(--dp-text-secondary, #666);
}
.policy-admin__detail-meta dd {
  margin: 4px 0 0;
}
.policy-admin__section-title {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.policy-admin__mapping-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}
.policy-admin__mapping-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.policy-admin__version-list {
  margin: 0;
  padding-left: 16px;
  font-size: 13px;
}
</style>
