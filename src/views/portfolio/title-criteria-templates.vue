<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioTitleCriteriaTemplateVO } from '@/apis/portfolio/title-promotion'
import { portfolioTitlePromotionApi } from '@/apis/portfolio/title-promotion'
import type { PortfolioArchiveCategoryTreeNodeVO } from '@/apis/portfolio/types'
import type { PortfolioTitleJobCategoryCode } from '@/types/enums/portfolio-title-job-category-enum'
import {
  ALL_PORTFOLIO_TITLE_JOB_CATEGORY_CODES,
  PortfolioTitleJobCategoryDescription,
} from '@/types/enums/portfolio-title-job-category-enum'
import message from 'ant-design-vue/es/message'
import { onMounted, reactive, ref, watch } from 'vue'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { PortfolioArchiveCategoryStatusCode } from '@/types/enums/portfolio-archive-category-status-enum'
import { isPortfolioHonorLevelCode } from '@/types/enums/portfolio-honor-level-enum'
import {
  ALL_PORTFOLIO_TITLE_CRITERIA_CHECK_TYPE_CODES,
  isEvidenceCategoryRequiredCheckType,
  PortfolioTitleCriteriaCheckTypeCode,
  PortfolioTitleCriteriaCheckTypeDescription,
  requiresPositiveExpectedValueCheckType,
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
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const saving = ref(false)
const rows = ref<PortfolioTitleCriteriaTemplateVO[]>([])
const categoryOptions = ref<Array<{ value: string; label: string }>>([])
const total = ref(0)
const editorOpen = ref(false)
const editingId = ref<string | undefined>()
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()

interface CriteriaTemplateForm {
  templateCode: string
  templateTitle: string
  criteriaDescription: string
  gateKind: PortfolioTitleCriteriaGateKindCode
  checkType: PortfolioTitleCriteriaCheckTypeCode
  satisfyMode: PortfolioTitleCriteriaSatisfyModeCode
  groupCode: string
  groupMinimumCount?: number
  pathCode: PortfolioTitleCriteriaPathCode
  jobCategory?: PortfolioTitleJobCategoryCode
  expectedValue: string
  evidenceCategoryCode?: string
  blockOnFail: boolean
  enabled: boolean
  sortNo: number
}

const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  keyword: '',
})

const form = reactive<CriteriaTemplateForm>({
  templateCode: '',
  templateTitle: '',
  criteriaDescription: '',
  gateKind: PortfolioTitleCriteriaGateKindCode.HARD,
  checkType: PortfolioTitleCriteriaCheckTypeCode.MIN_OFFICIAL_ARCHIVE,
  satisfyMode: PortfolioTitleCriteriaSatisfyModeCode.ALL,
  groupCode: '',
  groupMinimumCount: undefined,
  pathCode: PortfolioTitleCriteriaPathCode.COMMON,
  jobCategory: undefined,
  expectedValue: '',
  evidenceCategoryCode: undefined,
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
  } catch (error) {
    failLoad()
    showUserError(error, '加载条件模板失败')
  } finally {
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
  form.blockOnFail =
    row.gateKind === PortfolioTitleCriteriaGateKindCode.HARD ? true : row.blockOnFail
  form.enabled = row.enabled
  form.sortNo = row.sortNo || 0
  editorOpen.value = true
}

/** 校验表格插槽记录属于条件模板合同，避免把 unknown 行直接强转为业务对象。 */
function isTemplateRecord(record: unknown): record is PortfolioTitleCriteriaTemplateVO {
  return (
    typeof record === 'object' &&
    record !== null &&
    'id' in record &&
    'templateCode' in record &&
    'enabled' in record
  )
}

watch(
  () => form.gateKind,
  (gateKind) => {
    if (gateKind === PortfolioTitleCriteriaGateKindCode.HARD) {
      form.blockOnFail = true
    }
  },
)

watch(
  () => form.satisfyMode,
  (satisfyMode) => {
    if (satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.ALL) {
      form.groupCode = ''
    }
    if (satisfyMode !== PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP) {
      form.groupMinimumCount = undefined
    }
  },
)

async function saveTemplate() {
  if (!form.templateCode.trim() || !form.templateTitle.trim()) {
    showFormValidationMessage('请填写模板编码与标题')
    return
  }
  if (
    (form.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.ANY_OF_GROUP ||
      form.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP) &&
    !form.groupCode.trim()
  ) {
    showFormValidationMessage('组满足模式必须填写业绩组编码')
    return
  }
  if (
    form.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP &&
    (!form.groupMinimumCount || form.groupMinimumCount < 1)
  ) {
    showFormValidationMessage('请填写组内最低满足条数')
    return
  }
  if (isEvidenceCategoryRequiredCheckType(form.checkType) && !form.evidenceCategoryCode) {
    showFormValidationMessage('当前核验类型必须选择证据档案分类')
    return
  }
  if (
    requiresPositiveExpectedValueCheckType(form.checkType) &&
    !/^[1-9]\d*$/.test(form.expectedValue.trim())
  ) {
    showFormValidationMessage('当前核验类型必须填写正整数阈值')
    return
  }
  if (
    form.checkType === PortfolioTitleCriteriaCheckTypeCode.DEGREE_REQUIREMENT &&
    !form.expectedValue.trim()
  ) {
    showFormValidationMessage('学历学位要求必须填写期望值')
    return
  }
  if (
    form.checkType === PortfolioTitleCriteriaCheckTypeCode.HONOR_LEVEL &&
    !isPortfolioHonorLevelCode(form.expectedValue.trim())
  ) {
    showFormValidationMessage('获奖级别必须填写有效级别编码')
    return
  }
  if (form.gateKind === PortfolioTitleCriteriaGateKindCode.HARD && !form.blockOnFail) {
    showFormValidationMessage('硬门槛模板必须开启「不满足阻断提交」')
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
      groupCode:
        form.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.ALL
          ? undefined
          : form.groupCode || undefined,
      groupMinimumCount:
        form.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP
          ? form.groupMinimumCount
          : undefined,
      pathCode: form.pathCode,
      jobCategory: form.jobCategory || undefined,
      expectedValue: form.expectedValue || undefined,
      evidenceCategoryCode: form.evidenceCategoryCode,
      blockOnFail:
        form.gateKind === PortfolioTitleCriteriaGateKindCode.HARD ? true : form.blockOnFail,
      enabled: form.enabled,
      sortNo: form.sortNo,
    })
    void message.success('条件模板已保存')
    editorOpen.value = false
    await loadData()
  } catch (error) {
    showUserError(error, '保存条件模板失败')
  } finally {
    saving.value = false
  }
}

async function loadCategoryOptions() {
  const tree = await portfolioArchiveTemplateApi.listCategoryTree()
  const options: Array<{ value: string; label: string }> = []
  const visit = (nodes: PortfolioArchiveCategoryTreeNodeVO[]) => {
    for (const node of nodes) {
      if (node.status === PortfolioArchiveCategoryStatusCode.ACTIVE) {
        options.push({
          value: node.categoryCode,
          label: node.categoryName + '（' + node.categoryCode + '）',
        })
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
    void message.success(enabled ? '已启用' : '已停用')
    await loadData()
  } catch (error) {
    showUserError(error, '启停失败')
  }
}

onMounted(() => {
  void loadData()
  void loadCategoryOptions().catch((error) => showUserError(error, '加载档案分类失败'))
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="职称资格条件模板" />
    </template>
    <UiCard>
      <div class="title-criteria__toolbar">
        <UiInput
          v-model="query.keyword"
          size="sm"
          clearable
          placeholder="编码/标题"
          class="title-criteria__keyword"
          @enter="loadData"
        />
        <UiButton size="sm" variant="outline" @click="loadData"> 查询 </UiButton>
        <UiButton size="sm" variant="primary" @click="openCreate"> 新建模板 </UiButton>
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
            {{
              strictEnumLabel(
                PortfolioTitleCriteriaGateKindDescription,
                record.gateKind,
                '门槛类型',
              )
            }}
          </template>
          <template v-else-if="column.key === 'checkType'">
            {{
              strictEnumLabel(
                PortfolioTitleCriteriaCheckTypeDescription,
                record.checkType,
                '核验类型',
              )
            }}
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
            <div class="title-criteria__row-actions">
              <UiButton v-if="isTemplateRecord(record)" size="sm" @click="openEdit(record)">
                编辑
              </UiButton>
              <UiSwitch
                v-if="isTemplateRecord(record)"
                :model-value="Boolean(record.enabled)"
                size="sm"
                @change="(checked) => toggleEnabled(record, Boolean(checked))"
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
      <div class="title-criteria__drawer-form">
        <label class="title-criteria__field-label">模板编码</label>
        <UiInput v-model="form.templateCode" size="sm" :disabled="Boolean(editingId)" />
        <label class="title-criteria__field-label">模板标题</label>
        <UiInput v-model="form.templateTitle" size="sm" />
        <label class="title-criteria__field-label">条件说明</label>
        <UiTextarea v-model="form.criteriaDescription" size="sm" :rows="3" />
        <label class="title-criteria__field-label">门槛类型</label>
        <UiSelect
          size="sm"
          v-model="form.gateKind"
          :options="
            Object.values(PortfolioTitleCriteriaGateKindCode).map((code) => ({
              value: code,
              label: PortfolioTitleCriteriaGateKindDescription[code],
            }))
          "
          @change="
            () => {
              if (form.gateKind === PortfolioTitleCriteriaGateKindCode.HARD) {
                form.blockOnFail = true
              }
            }
          "
        />
        <label class="title-criteria__field-label">核验类型</label>
        <UiSelect
          size="sm"
          v-model="form.checkType"
          :options="
            ALL_PORTFOLIO_TITLE_CRITERIA_CHECK_TYPE_CODES.map((code) => ({
              value: code,
              label: PortfolioTitleCriteriaCheckTypeDescription[code],
            }))
          "
        />
        <label class="title-criteria__field-label">满足模式</label>
        <UiSelect
          size="sm"
          v-model="form.satisfyMode"
          :options="
            Object.values(PortfolioTitleCriteriaSatisfyModeCode).map((code) => ({
              value: code,
              label: PortfolioTitleCriteriaSatisfyModeDescription[code],
            }))
          "
        />
        <label class="title-criteria__field-label">路径</label>
        <UiSelect
          size="sm"
          v-model="form.pathCode"
          :options="
            Object.values(PortfolioTitleCriteriaPathCode).map((code) => ({
              value: code,
              label: PortfolioTitleCriteriaPathDescription[code],
            }))
          "
        />
        <label class="title-criteria__field-label">业绩组编码</label>
        <UiInput v-model="form.groupCode" size="sm" placeholder="组模式时填写" />
        <template
          v-if="form.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP"
        >
          <label class="title-criteria__field-label">组内最低满足条数</label>
          <UiInputNumber v-model="form.groupMinimumCount" size="sm" :min="1" :precision="0" />
        </template>
        <label class="title-criteria__field-label">岗位类型</label>
        <UiSelect
          size="sm"
          v-model="form.jobCategory"
          allow-clear
          placeholder="可空=全适用"
          :options="
            ALL_PORTFOLIO_TITLE_JOB_CATEGORY_CODES.map((code) => ({
              value: code,
              label: PortfolioTitleJobCategoryDescription[code],
            }))
          "
        />
        <label class="title-criteria__field-label">单条核验阈值</label>
        <UiInput v-model="form.expectedValue" size="sm" placeholder="如数量、学时、年限或级别" />
        <label class="title-criteria__field-label">证据档案分类</label>
        <UiSelect
          size="sm"
          v-model="form.evidenceCategoryCode"
          :options="categoryOptions"
          allow-clear
          allow-search
          option-filter-prop="label"
          placeholder="需要按材料类型核验时选择"
        />
        <div class="title-criteria__switch-row">
          <UiSwitch
            v-model="form.blockOnFail"
            :disabled="form.gateKind === PortfolioTitleCriteriaGateKindCode.HARD"
          />
          <span
            >不满足阻断提交{{
              form.gateKind === PortfolioTitleCriteriaGateKindCode.HARD ? '（硬门槛强制）' : ''
            }}</span
          >
        </div>
        <div class="title-criteria__switch-row">
          <UiSwitch v-model="form.enabled" />
          <span>启用</span>
        </div>
        <div class="title-criteria__drawer-actions">
          <UiButton size="sm" @click="editorOpen = false"> 取消 </UiButton>
          <UiButton size="sm" variant="primary" :loading="saving" @click="saveTemplate">
            保存
          </UiButton>
        </div>
      </div>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.title-criteria__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2);
  margin-bottom: var(--dp-space-3);
}

.title-criteria__keyword {
  width: 14rem;
}

.title-criteria__row-actions {
  display: flex;
  gap: var(--dp-space-2);
}

.title-criteria__drawer-form {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
}

.title-criteria__field-label {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.title-criteria__switch-row {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.title-criteria__drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--dp-space-2);
  margin-top: var(--dp-space-2);
}
</style>
