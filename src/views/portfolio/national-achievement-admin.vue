<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioNationalAchievementCatalogSaveRequest,
  PortfolioNationalAchievementCatalogVO,
  PortfolioNationalAchievementRequirementSaveItem,
} from '@/apis/portfolio/national-achievement'
import type { PortfolioDevelopmentRecordVO } from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'
import {
  PortfolioAchievementEvidenceTypeCode,
  PortfolioAchievementEvidenceTypeDescription,
  portfolioNationalAchievementApi,
} from '@/apis/portfolio/national-achievement'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  PortfolioHonorLevelCode,
  PortfolioHonorLevelDescription,
  PortfolioHonorLevelOptions,
} from '@/types/enums/portfolio-honor-level-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

interface CatalogFilter {
  keyword: string
  categoryCode: string
  levelCode?: PortfolioHonorLevelCode
  enabled?: 'true' | 'false'
}

interface CatalogForm extends Omit<PortfolioNationalAchievementCatalogSaveRequest, 'requirements'> {
  requirements: PortfolioNationalAchievementRequirementSaveItem[]
}

const activeTab = ref('catalog')
const achievementTabItems = [
  { key: 'catalog', label: '成果标准目录' },
  { key: 'records', label: '正式成果实例' },
]
const loading = ref(false)
const loadError = ref(false)
const requestToken = ref(0)
const rows = ref<PortfolioNationalAchievementCatalogVO[]>([])
const pageNum = ref(1)
const pageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const total = ref(0)
const recordLoading = ref(false)
const recordLoadError = ref(false)
const recordRequestToken = ref(0)
const recordRows = ref<PortfolioDevelopmentRecordVO[]>([])
const recordPageNum = ref(1)
const recordPageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const recordTotal = ref(0)
const operationKey = ref('')
const operating = computed(() => Boolean(operationKey.value))
const editorOpen = ref(false)
const editorLoading = ref(false)

const filter = reactive<CatalogFilter>({
  keyword: '',
  categoryCode: '',
  levelCode: undefined,
  enabled: undefined,
})
const recordFilter = reactive({ searchText: '', categoryCode: '' })
const form = reactive<CatalogForm>({
  id: undefined,
  categoryCode: '',
  levelCode: PortfolioHonorLevelCode.NATIONAL,
  catalogName: '',
  standardDescription: '',
  indicatorCode: undefined,
  buildCycleMonths: undefined,
  enabled: true,
  requirements: [],
})

const catalogColumns: ColumnsType = [
  { title: '成果目录', dataIndex: 'catalogName', key: 'catalogName' },
  { title: '分类编码', dataIndex: 'categoryCode', key: 'categoryCode', width: 130 },
  { title: '级别', key: 'levelCode', width: 90 },
  { title: '关联指标', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 120 },
  { title: '打造周期', key: 'buildCycleMonths', width: 100 },
  { title: '要求数', key: 'requirementCount', width: 80 },
  { title: '状态', key: 'enabled', width: 80 },
  { title: '操作', key: 'actions', width: 120 },
]
const recordColumns: ColumnsType = [
  { title: '成果名称', dataIndex: 'recordTitle', key: 'recordTitle' },
  { title: '教师编号', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 150 },
  { title: '分类', dataIndex: 'categoryCode', key: 'categoryCode', width: 130 },
  { title: '级别', key: 'levelCode', width: 90 },
  { title: '状态', dataIndex: 'recordStatus', key: 'recordStatus', width: 100 },
]
const evidenceTypeOptions = Object.values(PortfolioAchievementEvidenceTypeCode).map((value) => ({
  value,
  label: PortfolioAchievementEvidenceTypeDescription[value],
}))

function levelLabel(code: PortfolioHonorLevelCode): string {
  return strictEnumLabel(PortfolioHonorLevelDescription, code, '成果级别')
}

function beginOperation(key: string): boolean {
  if (operating.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}

async function loadCatalogs() {
  const currentToken = ++requestToken.value
  const request = {
    pageNum: pageNum.value,
    pageSize: pageSize.value,
    keyword: filter.keyword.trim() || undefined,
    categoryCode: filter.categoryCode.trim() || undefined,
    levelCode: filter.levelCode,
    enabled: filter.enabled === undefined ? undefined : filter.enabled === 'true',
  }
  loading.value = true
  loadError.value = false
  try {
    const result = await portfolioNationalAchievementApi.pageCatalog(request)
    if (requestToken.value !== currentToken) return
    rows.value = result.list ?? []
    total.value = result.total ?? 0
  } catch (error) {
    if (requestToken.value !== currentToken) return
    rows.value = []
    total.value = 0
    loadError.value = true
    showUserError(error, '加载成果目录失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

async function loadRecords() {
  const currentToken = ++recordRequestToken.value
  recordLoading.value = true
  recordLoadError.value = false
  try {
    const result = await portfolioNationalAchievementApi.pageRecord({
      pageNum: recordPageNum.value,
      pageSize: recordPageSize.value,
      searchText: recordFilter.searchText.trim() || undefined,
      categoryCode: recordFilter.categoryCode.trim() || undefined,
      levelCode: PortfolioHonorLevelCode.NATIONAL,
    })
    if (recordRequestToken.value !== currentToken) return
    recordRows.value = result.list ?? []
    recordTotal.value = result.total ?? 0
  } catch (error) {
    if (recordRequestToken.value !== currentToken) return
    recordRows.value = []
    recordTotal.value = 0
    recordLoadError.value = true
    showUserError(error, '加载国家级成果实例失败')
  } finally {
    if (recordRequestToken.value === currentToken) recordLoading.value = false
  }
}

function createRequirement(index: number): PortfolioNationalAchievementRequirementSaveItem {
  return {
    requirementCode: `R${String(index + 1).padStart(2, '0')}`,
    requirementTitle: '',
    evidenceType: PortfolioAchievementEvidenceTypeCode.DEV_RECORD_LEVEL,
    evidenceMatchValue: PortfolioHonorLevelCode.NATIONAL,
    weight: '100',
    sortOrder: index,
  }
}

function resetForm() {
  Object.assign(form, {
    id: undefined,
    categoryCode: '',
    levelCode: PortfolioHonorLevelCode.NATIONAL,
    catalogName: '',
    standardDescription: '',
    indicatorCode: undefined,
    buildCycleMonths: undefined,
    enabled: true,
    requirements: [createRequirement(0)],
  })
}

function openCreate() {
  if (operating.value) return
  resetForm()
  editorOpen.value = true
}

async function openEdit(row: PortfolioNationalAchievementCatalogVO) {
  if (operating.value) return
  const currentId = row.id
  editorOpen.value = true
  editorLoading.value = true
  try {
    const detail = await portfolioNationalAchievementApi.getCatalog({ id: currentId })
    if (!editorOpen.value) return
    Object.assign(form, {
      id: detail.id,
      categoryCode: detail.categoryCode,
      levelCode: detail.levelCode as PortfolioHonorLevelCode,
      catalogName: detail.catalogName,
      standardDescription: detail.standardDescription,
      indicatorCode: detail.indicatorCode,
      buildCycleMonths: detail.buildCycleMonths,
      enabled: detail.enabled,
      requirements: detail.requirements.map((item, index) => ({
        requirementCode: item.requirementCode,
        requirementTitle: item.requirementTitle,
        evidenceType: item.evidenceType as PortfolioAchievementEvidenceTypeCode,
        evidenceMatchValue: item.evidenceMatchValue,
        weight: item.weight,
        sortOrder: item.sortOrder ?? index,
      })),
    })
  } catch (error) {
    editorOpen.value = false
    showUserError(error, '加载成果目录详情失败')
  } finally {
    editorLoading.value = false
  }
}

function addRequirement() {
  form.requirements.push(createRequirement(form.requirements.length))
}

function removeRequirement(index: number) {
  if (form.requirements.length <= 1) {
    showFormValidationMessage('成果目录至少保留一项标准要求')
    return
  }
  form.requirements.splice(index, 1)
}

async function saveCatalog() {
  const requirements = form.requirements.map((item, index) => ({
    ...item,
    requirementCode: item.requirementCode.trim(),
    requirementTitle: item.requirementTitle.trim(),
    evidenceMatchValue: item.evidenceMatchValue.trim(),
    sortOrder: index,
  }))
  if (!form.categoryCode.trim() || !form.catalogName.trim() || !form.standardDescription.trim()) {
    showFormValidationMessage('请填写分类编码、目录名称和标准描述')
    return
  }
  if (
    requirements.some(
      (item) => !item.requirementCode || !item.requirementTitle || !item.evidenceMatchValue,
    )
  ) {
    showFormValidationMessage('请完整填写所有标准要求')
    return
  }
  const totalWeight = requirements.reduce((sum, item) => sum + Number(item.weight), 0)
  if (!Number.isFinite(totalWeight) || Math.abs(totalWeight - 100) > 0.0001) {
    showFormValidationMessage('标准要求权重合计必须等于 100')
    return
  }
  const operation = `catalog:save:${form.id ?? 'new'}`
  if (!beginOperation(operation)) return
  try {
    await portfolioNationalAchievementApi.saveCatalog({
      id: form.id,
      categoryCode: form.categoryCode.trim(),
      levelCode: form.levelCode,
      catalogName: form.catalogName.trim(),
      standardDescription: form.standardDescription.trim(),
      indicatorCode: form.indicatorCode?.trim() || undefined,
      buildCycleMonths: form.buildCycleMonths,
      enabled: form.enabled,
      requirements,
    })
    message.success('成果目录已保存')
    editorOpen.value = false
    await loadCatalogs()
  } catch (error) {
    showUserError(error, '保存成果目录失败')
  } finally {
    endOperation(operation)
  }
}

async function deleteCatalog(row: PortfolioNationalAchievementCatalogVO) {
  const operation = `catalog:delete:${row.id}`
  if (!beginOperation(operation)) return
  const confirmed = await confirmAsync({
    title: '确认删除成果目录？',
    content: `将删除「${row.catalogName}」及全部标准要求；已被发展规划引用时系统会拒绝删除。`,
    type: 'error',
  })
  if (!confirmed) {
    endOperation(operation)
    return
  }
  try {
    await portfolioNationalAchievementApi.deleteCatalog({ id: row.id })
    message.success('成果目录已删除')
    await loadCatalogs()
  } catch (error) {
    showUserError(error, '删除成果目录失败')
  } finally {
    endOperation(operation)
  }
}

function onTabChange(key: string | number) {
  if (key === 'catalog') void loadCatalogs()
  if (key === 'records') void loadRecords()
}

void loadCatalogs()
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        show-title
        layout="workbench"
        title="国家级成果"
        subtitle="成果标准目录、正式成果实例与规划目标的统一治理"
      >
        <template #actions>
          <UiButton
            size="sm"
            v-if="activeTab === 'catalog'"
            variant="primary"
            :disabled="operating"
            @click="openCreate"
          >
            新建目录
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard>
      <UiSectionTabs
        v-model="activeTab"
        :items="achievementTabItems"
        compact
        divided
        @change="onTabChange"
      />
      <template v-if="activeTab === 'catalog'">
        <div class="achievement-admin__toolbar">
          <UiInput
            size="sm" v-model="filter.keyword" clearable placeholder="目录名称或标准描述"
          />
          <UiInput
            size="sm" v-model="filter.categoryCode" clearable placeholder="分类编码"
          />
          <UiSelect
            v-model="filter.levelCode"
            size="sm"
            allow-clear
            placeholder="成果级别"
            :options="PortfolioHonorLevelOptions"
          />
          <UiSelect
            v-model="filter.enabled"
            size="sm"
            allow-clear
            placeholder="启用状态"
            :options="[
              { value: 'true', label: '已启用' },
              { value: 'false', label: '已停用' },
            ]"
          />
          <UiButton
            size="sm"
            @click="
              pageNum = 1
              loadCatalogs()
            "
          >
            查询
          </UiButton>
        </div>
        <UiDataTable
          v-model:current="pageNum"
          v-model:page-size="pageSize"
          :columns="catalogColumns"
          :data-source="rows"
          :loading="loading"
          :load-error="loadError"
          :total="total"
          pagination-mode="server"
          row-key="id"
          @page-change="
            (page) => {
              pageNum = page.current
              pageSize = page.pageSize
              loadCatalogs()
            }
          "
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'levelCode'">
              {{
                levelLabel(record.levelCode)
              }}
            </template>
            <template v-else-if="column.key === 'buildCycleMonths'">
              {{
                record.buildCycleMonths ? `${record.buildCycleMonths} 个月` : '—'
              }}
            </template>
            <template v-else-if="column.key === 'requirementCount'">
              {{
                record.requirements.length
              }}
            </template>
            <template v-else-if="column.key === 'enabled'">
              <UiTag :tone="record.enabled ? 'green' : 'gray'">
                {{
                  record.enabled ? '启用' : '停用'
                }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[
                  { key: 'edit', label: '编辑', disabled: operating },
                  { key: 'delete', label: '删除', tone: 'danger', disabled: operating },
                ]"
                @action="(key) => (key === 'edit' ? openEdit(record) : deleteCatalog(record))"
              />
            </template>
          </template>
        </UiDataTable>
      </template>
      <template v-else-if="activeTab === 'records'">
        <div class="achievement-admin__toolbar">
          <UiInput
            size="sm"
            v-model="recordFilter.searchText"
            clearable
            placeholder="成果名称或教师"
          />
          <UiInput
            size="sm" v-model="recordFilter.categoryCode" clearable placeholder="分类编码"
          />
          <UiButton
            size="sm"
            @click="
              recordPageNum = 1
              loadRecords()
            "
          >
            查询
          </UiButton>
        </div>
        <UiDataTable
          v-model:current="recordPageNum"
          v-model:page-size="recordPageSize"
          :columns="recordColumns"
          :data-source="recordRows"
          :loading="recordLoading"
          :load-error="recordLoadError"
          :total="recordTotal"
          pagination-mode="server"
          row-key="id"
          @page-change="
            (page) => {
              recordPageNum = page.current
              recordPageSize = page.pageSize
              loadRecords()
            }
          "
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'levelCode'">
              {{
                levelLabel(record.levelCode)
              }}
            </template>
          </template>
        </UiDataTable>
      </template>
    </UiCard>
    <UiDialog
      v-model:open="editorOpen"
      :title="form.id ? '编辑成果目录' : '新建成果目录'"
      width="860px"
      :confirm-loading="operating"
      :closable="!operating"
      :mask-closable="!operating"
      @ok="saveCatalog"
    >
      <UiSpin :spinning="editorLoading">
        <UiForm layout="vertical">
          <div class="achievement-admin__form-grid">
            <UiFormItem label="分类编码" required>
              <UiInput
                size="sm" v-model="form.categoryCode" :disabled="operating"
              />
            </UiFormItem>
            <UiFormItem label="成果级别" required>
              <UiSelect
                v-model="form.levelCode"
                size="sm"
                :options="PortfolioHonorLevelOptions"
                :disabled="operating"
              />
            </UiFormItem>
            <UiFormItem label="目录名称" required>
              <UiInput
                size="sm" v-model="form.catalogName" :disabled="operating"
              />
            </UiFormItem>
            <UiFormItem label="关联指标">
              <UiInput
                size="sm" v-model="form.indicatorCode" :disabled="operating"
              />
            </UiFormItem>
            <UiFormItem label="打造周期（月）">
              <UiInputNumber
                size="sm"
                v-model="form.buildCycleMonths"
                :min="1"
                style="width: 100%"
                :disabled="operating"
              />
            </UiFormItem>
            <UiFormItem label="启用">
              <UiSwitch size="sm" v-model="form.enabled" :disabled="operating" />
            </UiFormItem>
          </div>
          <UiFormItem label="标准描述" required>
            <UiTextarea size="sm" v-model="form.standardDescription" :rows="3" :disabled="operating" />
          </UiFormItem>
          <div class="achievement-admin__requirements-head">
            <strong>标准要求（权重合计 100）</strong><UiButton size="sm" :disabled="operating" @click="addRequirement">新增要求</UiButton>
          </div>
          <div
            v-for="(requirement, index) in form.requirements"
            :key="index"
            class="achievement-admin__requirement-row"
          >
            <UiInput
              size="sm"
              v-model="requirement.requirementCode"
              placeholder="要求编码"
              :disabled="operating"
            />
            <UiInput
              size="sm"
              v-model="requirement.requirementTitle"
              placeholder="要求标题"
              :disabled="operating"
            />
            <UiSelect
              v-model="requirement.evidenceType"
              size="sm"
              :options="evidenceTypeOptions"
              :disabled="operating"
            />
            <UiInput
              size="sm"
              v-model="requirement.evidenceMatchValue"
              placeholder="证据匹配值"
              :disabled="operating"
            />
            <UiInputNumber
              size="sm"
              v-model="requirement.weight"
              string-mode
              :min="0.0001"
              :max="100"
              placeholder="权重"
              :disabled="operating"
            />
            <UiButton
              size="sm"
              variant="outline"
              status="danger"
              :disabled="operating"
              @click="removeRequirement(index)"
            >
              删除
            </UiButton>
          </div>
        </UiForm>
      </UiSpin>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.achievement-admin__toolbar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 160px 140px 120px auto;
  gap: 8px;
  margin-bottom: 12px;
}
.achievement-admin__form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 16px;
}
.achievement-admin__requirements-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.achievement-admin__requirement-row {
  display: grid;
  grid-template-columns: 100px 1fr 160px 150px 90px auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
@media (max-width: 900px) {
  .achievement-admin__toolbar,
  .achievement-admin__form-grid,
  .achievement-admin__requirement-row {
    grid-template-columns: 1fr;
  }
}
</style>
