<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveMaterialOcrStatusCode } from '@/apis/mark/archive-ocr-status'
import type { PortfolioMaterialStatusCode } from '@/apis/portfolio/enums'
import type {
  PortfolioMaterialSaveRequest,
  PortfolioMaterialSearchResponse,
  PortfolioMaterialVO,
} from '@/apis/portfolio/types'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { Input, message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_MATERIAL_OCR_STATUS_TONE,
  ArchiveMaterialOcrStatusDescription,
} from '@/apis/mark/archive-ocr-status'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  PORTFOLIO_MATERIAL_STATUS_OPTIONS,
  PORTFOLIO_MATERIAL_TYPE_OPTIONS,
  PortfolioMaterialStatusDescription,
  PortfolioMaterialTypeCode,
  PortfolioMaterialTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioMaterialApi } from '@/apis/portfolio/material'
import { PORTFOLIO_MATERIAL_STATUS_TONE } from '@/apis/portfolio/types'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { showUserError } from '@/utils/error-handler'
import {
  buildPortfolioIntakeReassignQuery,
  canReassignPortfolioMaterial,
} from '@/utils/portfolio-material-reassign'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const router = useRouter()
const { targetTeacherId } = usePortfolioPageScope()

interface MaterialFilterModel {
  materialType?: PortfolioMaterialTypeCode
  status?: PortfolioMaterialStatusCode
}

function materialTypeLabel(type: PortfolioMaterialTypeCode): string {
  return strictEnumLabel(PortfolioMaterialTypeDescription, type, '材料类型')
}

function materialStatusLabel(status: PortfolioMaterialStatusCode): string {
  return strictEnumLabel(PortfolioMaterialStatusDescription, status, '材料状态')
}

function materialStatusTone(status: PortfolioMaterialStatusCode) {
  return strictEnumTone(PORTFOLIO_MATERIAL_STATUS_TONE, status, '材料状态')
}

function ocrStatusLabel(status: ArchiveMaterialOcrStatusCode): string {
  return strictEnumLabel(ArchiveMaterialOcrStatusDescription, status, 'OCR 状态')
}

function ocrStatusTone(status: ArchiveMaterialOcrStatusCode) {
  return strictEnumTone(ARCHIVE_MATERIAL_OCR_STATUS_TONE, status, 'OCR 状态')
}

function isOcrStatusCode(value: string | undefined): value is ArchiveMaterialOcrStatusCode {
  return !!value && Object.hasOwn(ArchiveMaterialOcrStatusDescription, value)
}

const materialTypeOptions = PORTFOLIO_MATERIAL_TYPE_OPTIONS.map((item) => ({
  value: item.value,
  label: materialTypeLabel(item.value),
}))

const materialStatusOptions = PORTFOLIO_MATERIAL_STATUS_OPTIONS.map((item) => ({
  value: item.value,
  label: materialStatusLabel(item.value),
}))

const filterFields: FilterField[] = [
  { key: 'materialType', label: '材料类型', type: 'select', options: materialTypeOptions },
  { key: 'status', label: '状态', type: 'select', options: materialStatusOptions },
]

const listColumns: ColumnsType<PortfolioMaterialVO> = [
  { title: '标题', dataIndex: 'materialTitle', key: 'materialTitle' },
  { title: '类型', key: 'materialType', width: 120 },
  { title: '分类编码', dataIndex: 'categoryCode', key: 'categoryCode', width: 120 },
  { title: '状态', key: 'status', width: 100 },
  { title: 'OCR', key: 'ocrStatus', width: 100 },
  { title: '操作', key: 'actions', width: 280, fixed: 'right' },
]

const searchColumns: ColumnsType<PortfolioMaterialSearchResponse> = [
  { title: '标题', dataIndex: 'materialTitle', key: 'materialTitle' },
  { title: '类型', key: 'materialType', width: 120 },
  { title: '命中摘要', dataIndex: 'snippet', key: 'snippet' },
]

const loading = ref(false)
const saving = ref(false)
const searchLoading = ref(false)
const rows = ref<PortfolioMaterialVO[]>([])
const searchRows = ref<PortfolioMaterialSearchResponse[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)
const searchPageNum = ref(1)
const searchPageSize = ref(10)
const searchPageTotal = ref(0)
const filterModel = ref<MaterialFilterModel>({})
const searchKeyword = ref('')
const formModalOpen = ref(false)
const editingId = ref<string>()
const form = reactive<PortfolioMaterialSaveRequest>({
  materialType: PortfolioMaterialTypeCode.DOCUMENT,
  materialTitle: '',
  fileNodeId: '',
  categoryCode: '',
})
const attachmentFileName = ref<string>()

const modalTitle = computed(() => (editingId.value ? '编辑材料' : '登记材料'))
const showSearchResults = computed(() => searchKeyword.value.trim().length > 0)

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioMaterialApi.page({
      ...(targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}),
      materialType: filterModel.value.materialType,
      status: filterModel.value.status,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    rows.value = page.list
    pageTotal.value = page.total
  } catch (error) {
    showUserError(error, '加载材料库失败')
  } finally {
    loading.value = false
  }
}

async function searchOcr() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    searchRows.value = []
    searchPageTotal.value = 0
    return
  }
  searchLoading.value = true
  try {
    const page = await portfolioMaterialApi.searchOcr({
      keyword,
      ...(targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}),
      materialType: filterModel.value.materialType,
      pageNum: searchPageNum.value,
      pageSize: searchPageSize.value,
    })
    searchRows.value = page.list
    searchPageTotal.value = page.total
  } catch (error) {
    showUserError(error, 'OCR 检索失败')
  } finally {
    searchLoading.value = false
  }
}

function handleSearch() {
  pageNum.value = 1
  searchPageNum.value = 1
  void loadPage()
  if (searchKeyword.value.trim()) {
    void searchOcr()
  }
}

function openCreateModal() {
  editingId.value = undefined
  form.materialType = PortfolioMaterialTypeCode.DOCUMENT
  form.materialTitle = ''
  form.fileNodeId = ''
  form.categoryCode = ''
  attachmentFileName.value = undefined
  formModalOpen.value = true
}

function openEditModal(row: PortfolioMaterialVO) {
  editingId.value = row.id
  form.materialType = row.materialType
  form.materialTitle = row.materialTitle ?? ''
  form.fileNodeId = row.fileNodeId ?? ''
  form.categoryCode = row.categoryCode ?? ''
  attachmentFileName.value = row.materialTitle
  formModalOpen.value = true
}

async function submitForm() {
  if (!form.materialTitle.trim()) {
    message.warning('请填写材料标题')
    return
  }
  if (!form.fileNodeId) {
    message.warning('请上传材料文件')
    return
  }
  saving.value = true
  try {
    await portfolioMaterialApi.save({
      ...(editingId.value ? { id: editingId.value } : {}),
      ...(targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}),
      materialType: form.materialType,
      materialTitle: form.materialTitle.trim(),
      fileNodeId: form.fileNodeId,
      categoryCode: form.categoryCode?.trim() || undefined,
    })
    message.success(editingId.value ? '材料已更新' : '材料已登记')
    formModalOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '保存材料失败')
  } finally {
    saving.value = false
  }
}

async function deleteMaterial(row: PortfolioMaterialVO) {
  const confirmed = await confirmAsync({
    title: '删除材料',
    content: `确认删除「${row.materialTitle ?? row.id}」？`,
    type: 'error',
  })
  if (!confirmed) {
    return
  }
  try {
    await portfolioMaterialApi.delete(row.id)
    message.success('材料已删除')
    await loadPage()
  } catch (error) {
    showUserError(error, '删除材料失败')
  }
}

function openAiOrchestration(row: PortfolioMaterialVO, tab: 'ask' | 'policy' = 'ask') {
  if (!row.fileNodeId) {
    message.warning('材料未关联文件')
    return
  }
  const teacherId = targetTeacherId.value ?? row.teacherId
  if (!teacherId) {
    message.warning('请先选择教师')
    return
  }
  void router.push({
    path: '/portfolio/ai-orchestration',
    query: {
      teacherId,
      materialId: row.id,
      tab,
    },
  })
}

function openAiExtract(row: PortfolioMaterialVO) {
  if (!row.fileNodeId) {
    message.warning('材料未关联文件')
    return
  }
  const teacherId = targetTeacherId.value ?? row.teacherId
  if (!teacherId) {
    message.warning('请先选择教师')
    return
  }
  void router.push({
    path: '/portfolio/ai-candidate-confirm',
    query: {
      teacherId,
      materialId: row.id,
    },
  })
}

function openIntakeReassign(row: PortfolioMaterialVO) {
  const teacherId = targetTeacherId.value ?? row.teacherId
  if (!teacherId) {
    message.warning('请先选择教师')
    return
  }
  if (!canReassignPortfolioMaterial(row)) {
    message.warning('当前材料不可重分类，仅草稿或退回修改中的档案记录可重分类')
    return
  }
  void router.push({
    path: '/portfolio/teacher/intake',
    query: buildPortfolioIntakeReassignQuery(row, teacherId),
  })
}

/** 组装材料行内操作：重分类与 AI 链路收入「更多」。 */
function buildMaterialRowActions(row: PortfolioMaterialVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (canReassignPortfolioMaterial(row)) {
    actions.push({ key: 'reassign', label: '重分类' })
  }
  actions.push(
    { key: 'aiExtract', label: 'AI 抽取' },
    { key: 'aiAsk', label: '智能问数' },
    { key: 'aiPolicy', label: '政策核验' },
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除', tone: 'danger' },
  )
  return actions
}

function handleMaterialRowAction(key: string, row: PortfolioMaterialVO): void {
  switch (key) {
    case 'reassign':
      openIntakeReassign(row)
      break
    case 'aiExtract':
      openAiExtract(row)
      break
    case 'aiAsk':
      openAiOrchestration(row, 'ask')
      break
    case 'aiPolicy':
      openAiOrchestration(row, 'policy')
      break
    case 'edit':
      openEditModal(row)
      break
    case 'delete':
      void deleteMaterial(row)
      break
  }
}

usePortfolioScopedLoader(
  () => {
    pageNum.value = 1
    void loadPage()
  },
  () => targetTeacherId.value,
)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="材料库" description="教师佐证材料登记、OCR 检索与复用">
      <template #actions>
        <UiButton variant="primary" @click="openCreateModal"> 登记材料 </UiButton>
        <UiButton :loading="loading" @click="() => void loadPage()"> 刷新 </UiButton>
      </template>
    </ContextBar>

    <UiFilterBar v-model="filterModel" :fields="filterFields" @search="handleSearch">
      <template #extra>
        <Input.Search
          v-model:value="searchKeyword"
          allow-clear
          placeholder="OCR 全文检索"
          @search="handleSearch"
        />
      </template>
    </UiFilterBar>

    <UiCard :title="showSearchResults ? 'OCR 检索结果' : '材料列表'">
      <UiDataTable
        v-if="showSearchResults && (searchRows.length || searchLoading)"
        v-model:current="searchPageNum"
        v-model:page-size="searchPageSize"
        pagination-mode="server"
        :columns="searchColumns"
        :data-source="searchRows"
        :loading="searchLoading"
        :total="searchPageTotal"
        row-key="materialId"
        @page-change="() => void searchOcr()"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'materialType'">
            {{ materialTypeLabel(record.materialType) }}
          </template>
        </template>
      </UiDataTable>
      <UiDataTable
        v-else-if="rows.length || loading"
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="listColumns"
        :data-source="rows"
        :loading="loading"
        :total="pageTotal"
        row-key="id"
        @page-change="() => void loadPage()"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'materialType'">
            {{ materialTypeLabel(record.materialType) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <UiTag v-if="record.status" :tone="materialStatusTone(record.status)">
              {{ materialStatusLabel(record.status) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'ocrStatus'">
            <UiTag v-if="isOcrStatusCode(record.ocrStatus)" :tone="ocrStatusTone(record.ocrStatus)">
              {{ ocrStatusLabel(record.ocrStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildMaterialRowActions(record)"
              @action="(key) => handleMaterialRowAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
      <UiEmpty v-else :description="showSearchResults ? '未命中 OCR 结果' : '暂无材料'" />
    </UiCard>

    <a-modal
      v-model:open="formModalOpen"
      :title="modalTitle"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="saving"
      @ok="() => void submitForm()"
    >
      <Input
        v-model:value="form.materialTitle"
        class="teacher-materials__field"
        placeholder="材料标题"
      />
      <a-select
        v-model:value="form.materialType"
        class="teacher-materials__field teacher-materials__select"
        :options="materialTypeOptions"
        placeholder="材料类型"
      />
      <Input
        v-model:value="form.categoryCode"
        class="teacher-materials__field"
        placeholder="关联分类编码（可选）"
      />
      <UiPlatformFileField
        v-model:file-node-id="form.fileNodeId"
        v-model:file-name="attachmentFileName"
        :scene-key="FileUploadSceneKey.PORTFOLIO_MATERIAL"
        label="材料文件"
      />
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.teacher-materials__field {
  display: block;
  width: 100%;
  margin-bottom: var(--dp-space-3);
}

.teacher-materials__select {
  width: 100%;
}
</style>
