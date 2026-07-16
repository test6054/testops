<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioTitleCriteriaTemplateVO } from '@/apis/portfolio/title-promotion'
import type { PortfolioArchiveCategoryTreeNodeVO } from '@/apis/portfolio/types'
import type { PortfolioTitleJobCategoryCode } from '@/types/enums/portfolio-title-job-category-enum'
import { Input, InputNumber, message, Select, Switch } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import { portfolioTitlePromotionApi } from '@/apis/portfolio/title-promotion'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { PortfolioArchiveCategoryStatusCode } from '@/types/enums/portfolio-archive-category-status-enum'
import {
  ALL_PORTFOLIO_TITLE_CRITERIA_CHECK_TYPE_CODES,
  isEvidenceCategoryRequiredCheckType,
  PortfolioTitleCriteriaCheckTypeCode,
  PortfolioTitleCriteriaCheckTypeDescription,
} from '@/types/enums/portfolio-title-criteria-check-type-enum'
import {
  PortfolioTitleCriteriaGateKindCode,
  PortfolioTitleCriteriaGateKindDescription,
} from '@/types/enums/portfolio-title-criteria-gate-kind-enum'
import {
  PortfolioTitleCriteriaPathCode,
  PortfolioTitleCriteriaPathDescription,
} from '@/types/enums/portfolio-title-criteria-path-code-enum'
import {
  PortfolioTitleCriteriaSatisfyModeCode,
  PortfolioTitleCriteriaSatisfyModeDescription,
} from '@/types/enums/portfolio-title-criteria-satisfy-mode-enum'
import {
  ALL_PORTFOLIO_TITLE_JOB_CATEGORY_CODES,
  PortfolioTitleJobCategoryDescription,
} from '@/types/enums/portfolio-title-job-category-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const saving = ref(false)
const rows = ref<PortfolioTitleCriteriaTemplateVO[]>([])
const categoryOptions = ref<Array<{ value: string, label: string }>>([])
const total = ref(0)
const editorOpen = ref(false)
const editingId = ref<string | undefined>()
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()

const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  keyword: '',
})

const form = reactive({
  templateCode: '',
  templateTitle: '',
  criteriaDescription: '',
  gateKind: PortfolioTitleCriteriaGateKindCode.HARD,
  checkType: PortfolioTitleCriteriaCheckTypeCode.MIN_OFFICIAL_ARCHIVE,
  satisfyMode: PortfolioTitleCriteriaSatisfyModeCode.ALL,
  groupCode: '',
  groupMinimumCount: undefined as number | undefined,
  pathCode: PortfolioTitleCriteriaPathCode.COMMON,
  jobCategory: undefined as PortfolioTitleJobCategoryCode | undefined,
  expectedValue: '',
  evidenceCategoryCode: undefined as string | undefined,
  blockOnFail: true,
  enabled: true,
  sortNo: 10,
})

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'templateCode', key: 'templateCode', width: 160 },
  { title: '标题', dataIndex: 'templateTitle', key: 'templateTitle' },
  { title: '门槛', dataIndex: 'gateKind', key: 'gateKind', width: 100 },
  { title: '核验类型', dataIndex: 'checkType', key: 'checkType', width: 160 },
  { title: '路径', dataIndex: 'pathCode', key: 'pathCode', width: 110 },
  { title: '期望值', dataIndex: 'expectedValue', key: 'expectedValue', width: 100 },
  { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80 },
  { title: '操作', key: 'action', width: 160 },
]

async function loadData() {
  beginLoad()
  loading.value = true
  try {
    const page = await portfolioTitlePromotionApi.pageCriteriaTemplate({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
    })
    rows.value = page.list || []
    total.value = Number(page.total || 0)
    okLoad()
  }
  catch (error) {
    failLoad()
    showUserError(error, '加载条件模板失败')
  }
  finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = undefined
  form.templateCode = ''
  form.templateTitle = ''
  form.criteriaDescription = ''
  form.gateKind = PortfolioTitleCriteriaGateKindCode.HARD
  form.checkType = PortfolioTitleCriteriaCheckTypeCode.MIN_OFFICIAL_ARCHIVE
  form.satisfyMode = PortfolioTitleCriteriaSatisfyModeCode.ALL
  form.groupCode = ''
  form.groupMinimumCount = undefined
  form.pathCode = PortfolioTitleCriteriaPathCode.COMMON
  form.jobCategory = undefined
  form.expectedValue = ''
  form.evidenceCategoryCode = undefined
  form.blockOnFail = true
  form.enabled = true
  form.sortNo = 10
  editorOpen.value = true
}

function openEdit(row: PortfolioTitleCriteriaTemplateVO) {
  editingId.value = row.id
  form.templateCode = row.templateCode
  form.templateTitle = row.templateTitle
  form.criteriaDescription = row.criteriaDescription || ''
  form.gateKind = row.gateKind
  form.checkType = row.checkType
  form.satisfyMode = row.satisfyMode
  form.groupCode = row.groupCode || ''
  form.groupMinimumCount = row.groupMinimumCount
  form.pathCode = row.pathCode
  form.jobCategory = row.jobCategory || undefined
  form.expectedValue = row.expectedValue || ''
  form.evidenceCategoryCode = row.evidenceCategoryCode
  form.blockOnFail = row.blockOnFail
  form.enabled = row.enabled
  form.sortNo = row.sortNo || 0
  editorOpen.value = true
}

async function saveTemplate() {
  if (!form.templateCode.trim() || !form.templateTitle.trim()) {
    showFormValidationMessage('请填写模板编码与标题')
    return
  }
  if ((form.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.ANY_OF_GROUP
    || form.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP)
  && !form.groupCode.trim()) {
    showFormValidationMessage('组满足模式必须填写业绩组编码')
    return
  }
  if (form.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP
    && (!form.groupMinimumCount || form.groupMinimumCount < 1)) {
    showFormValidationMessage('请填写组内最低满足条数')
    return
  }
  if (isEvidenceCategoryRequiredCheckType(form.checkType) && !form.evidenceCategoryCode) {
    showFormValidationMessage('当前核验类型必须选择证据档案分类')
    return
  }
  saving.value = true
  try {
    await portfolioTitlePromotionApi.saveCriteriaTemplate({
      id: editingId.value,
      templateCode: form.templateCode.trim(),
      templateTitle: form.templateTitle.trim(),
      criteriaDescription: form.criteriaDescription || undefined,
      gateKind: form.gateKind,
      checkType: form.checkType,
      satisfyMode: form.satisfyMode,
      groupCode: form.groupCode || undefined,
      groupMinimumCount: form.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP
        ? form.groupMinimumCount
        : undefined,
      pathCode: form.pathCode,
      jobCategory: form.jobCategory || undefined,
      expectedValue: form.expectedValue || undefined,
      evidenceCategoryCode: form.evidenceCategoryCode,
      blockOnFail: form.blockOnFail,
      enabled: form.enabled,
      sortNo: form.sortNo,
    })
    message.success('条件模板已保存')
    editorOpen.value = false
    await loadData()
  }
  catch (error) {
    showUserError(error, '保存条件模板失败')
  }
  finally {
    saving.value = false
  }
}

async function loadCategoryOptions() {
  const tree = await portfolioArchiveTemplateApi.listCategoryTree()
  const options: Array<{ value: string, label: string }> = []
  const visit = (nodes: PortfolioArchiveCategoryTreeNodeVO[]) => {
    for (const node of nodes) {
      if (node.status === PortfolioArchiveCategoryStatusCode.ACTIVE) {
        options.push({ value: node.categoryCode, label: node.categoryName + '（' + node.categoryCode + '）' })
      }
      visit(node.children || [])
    }
  }
  visit(tree || [])
  categoryOptions.value = options
}

async function toggleEnabled(row: PortfolioTitleCriteriaTemplateVO, enabled: boolean) {
  try {
    await portfolioTitlePromotionApi.enableCriteriaTemplate({ id: row.id, enabled })
    message.success(enabled ? '已启用' : '已停用')
    await loadData()
  }
  catch (error) {
    showUserError(error, '启停失败')
  }
}

onMounted(() => {
  void loadData()
  void loadCategoryOptions().catch(error => showUserError(error, '加载档案分类失败'))
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="职称资格条件模板" description="租户标准库：基本条件与业绩条件模板，任务侧可导入" />
    <UiCard>
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <Input
          v-model:value="query.keyword"
          allow-clear
          placeholder="编码/标题"
          class="w-56"
          @press-enter="loadData"
        />
        <UiButton variant="primary" @click="loadData">
          查询
        </UiButton>
        <UiButton variant="primary" @click="openCreate">
          新建模板
        </UiButton>
      </div>
      <UiDataTable
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        :pagination="{
          current: query.pageNum,
          pageSize: query.pageSize,
          total,
          onChange: (page: number, pageSize: number) => {
            query.pageNum = page
            query.pageSize = pageSize
            loadData()
          },
        }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'gateKind'">
            {{ strictEnumLabel(PortfolioTitleCriteriaGateKindDescription, record.gateKind, '门槛类型') }}
          </template>
          <template v-else-if="column.key === 'checkType'">
            {{ strictEnumLabel(PortfolioTitleCriteriaCheckTypeDescription, record.checkType, '核验类型') }}
          </template>
          <template v-else-if="column.key === 'pathCode'">
            {{ strictEnumLabel(PortfolioTitleCriteriaPathDescription, record.pathCode, '路径') }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <UiTag :tone="record.enabled ? 'green' : 'gray'">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'action'">
            <div class="flex gap-2">
              <UiButton size="small" @click="openEdit(record as PortfolioTitleCriteriaTemplateVO)">
                编辑
              </UiButton>
              <Switch
                :checked="(record as PortfolioTitleCriteriaTemplateVO).enabled"
                size="small"
                @change="(checked: boolean | string | number) => toggleEnabled(record as PortfolioTitleCriteriaTemplateVO, Boolean(checked))"
              />
            </div>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiDrawer
      v-model:open="editorOpen"
      :title="editingId ? '编辑条件模板' : '新建条件模板'"
      width="520"
    >
      <div class="flex flex-col gap-3">
        <label class="text-sm">模板编码</label>
        <Input v-model:value="form.templateCode" :disabled="Boolean(editingId)" />
        <label class="text-sm">模板标题</label>
        <Input v-model:value="form.templateTitle" />
        <label class="text-sm">条件说明</label>
        <Input.TextArea v-model:value="form.criteriaDescription" :rows="3" />
        <label class="text-sm">门槛类型</label>
        <Select
          v-model:value="form.gateKind"
          :options="Object.values(PortfolioTitleCriteriaGateKindCode).map(code => ({
            value: code,
            label: PortfolioTitleCriteriaGateKindDescription[code],
          }))"
        />
        <label class="text-sm">核验类型</label>
        <Select
          v-model:value="form.checkType"
          :options="ALL_PORTFOLIO_TITLE_CRITERIA_CHECK_TYPE_CODES.map(code => ({
            value: code,
            label: PortfolioTitleCriteriaCheckTypeDescription[code],
          }))"
        />
        <label class="text-sm">满足模式</label>
        <Select
          v-model:value="form.satisfyMode"
          :options="Object.values(PortfolioTitleCriteriaSatisfyModeCode).map(code => ({
            value: code,
            label: PortfolioTitleCriteriaSatisfyModeDescription[code],
          }))"
        />
        <label class="text-sm">路径</label>
        <Select
          v-model:value="form.pathCode"
          :options="Object.values(PortfolioTitleCriteriaPathCode).map(code => ({
            value: code,
            label: PortfolioTitleCriteriaPathDescription[code],
          }))"
        />
        <label class="text-sm">业绩组编码</label>
        <Input v-model:value="form.groupCode" placeholder="组模式时填写" />
        <template v-if="form.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP">
          <label class="text-sm">组内最低满足条数</label>
          <InputNumber v-model:value="form.groupMinimumCount" :min="1" :precision="0" class="w-full" />
        </template>
        <label class="text-sm">岗位类型</label>
        <Select
          v-model:value="form.jobCategory"
          allow-clear
          placeholder="可空=全适用"
          :options="ALL_PORTFOLIO_TITLE_JOB_CATEGORY_CODES.map(code => ({
            value: code,
            label: PortfolioTitleJobCategoryDescription[code],
          }))"
        />
        <label class="text-sm">单条核验阈值</label>
        <Input v-model:value="form.expectedValue" placeholder="如数量、学时、年限或级别" />
        <label class="text-sm">证据档案分类</label>
        <Select
          v-model:value="form.evidenceCategoryCode"
          :options="categoryOptions"
          allow-clear
          show-search
          option-filter-prop="label"
          placeholder="需要按材料类型核验时选择"
        />
        <div class="flex items-center gap-2">
          <Switch v-model:checked="form.blockOnFail" />
          <span>不满足阻断提交</span>
        </div>
        <div class="flex items-center gap-2">
          <Switch v-model:checked="form.enabled" />
          <span>启用</span>
        </div>
        <div class="mt-2 flex justify-end gap-2">
          <UiButton @click="editorOpen = false">
            取消
          </UiButton>
          <UiButton variant="primary" :loading="saving" @click="saveTemplate">
            保存
          </UiButton>
        </div>
      </div>
    </UiDrawer>
  </StageWorkbenchShell>
</template>
