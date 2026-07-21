<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveMaterialOcrStatusCode } from '@/apis/mark/archive-ocr-status'
import type {
  PortfolioMaterialRefVO,
  PortfolioMaterialSaveRequest,
  PortfolioMaterialSearchResponse,
  PortfolioMaterialVersionVO,
  PortfolioMaterialVO,
} from '@/apis/portfolio/types'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_MATERIAL_OCR_STATUS_TONE,
  ArchiveMaterialOcrStatusDescription,
} from '@/apis/mark/archive-ocr-status'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  PORTFOLIO_MATERIAL_STATUS_OPTIONS,
  PORTFOLIO_MATERIAL_TYPE_OPTIONS,
  PortfolioMaterialRefFreezeStatusDescription,
  PortfolioMaterialRefScopeDescription,
  PortfolioMaterialStatusCode,
  PortfolioMaterialStatusDescription,
  PortfolioMaterialTypeCode,
  PortfolioMaterialTypeDescription,
  PortfolioMaterialVersionStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioMaterialApi } from '@/apis/portfolio/material'
import { PORTFOLIO_MATERIAL_STATUS_TONE } from '@/apis/portfolio/types'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSearchBox from '@/components/ui-guide/ui/SearchBox.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import {
  buildPortfolioIntakeReassignQuery,
  canReassignPortfolioMaterial,
} from '@/utils/portfolio-material-reassign'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard()

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

function materialVersionStatusLabel(status: PortfolioMaterialVersionVO['versionStatus']): string {
  return strictEnumLabel(PortfolioMaterialVersionStatusDescription, status, '材料版本状态')
}

function materialRefScopeLabel(scope: PortfolioMaterialRefVO['refScope']): string {
  return strictEnumLabel(PortfolioMaterialRefScopeDescription, scope, '材料引用范围')
}

function materialRefFreezeStatusLabel(status: PortfolioMaterialRefVO['freezeStatus']): string {
  return strictEnumLabel(PortfolioMaterialRefFreezeStatusDescription, status, '材料引用冻结状态')
}

function ocrStatusLabel(status: ArchiveMaterialOcrStatusCode): string {
  return strictEnumLabel(ArchiveMaterialOcrStatusDescription, status, '文字识别状态')
}

function ocrStatusTone(status: ArchiveMaterialOcrStatusCode) {
  return strictEnumTone(ARCHIVE_MATERIAL_OCR_STATUS_TONE, status, '文字识别状态')
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
  { title: '标题', dataIndex: 'materialTitle', key: 'materialTitle', fixed: 'left' },
  { title: '类型', key: 'materialType', width: 120 },
  { title: '分类编码', dataIndex: 'categoryCode', key: 'categoryCode', width: 120 },
  { title: '状态', key: 'status', width: 100 },
  { title: '文字识别', key: 'ocrStatus', width: 100 },
  { title: '版本', key: 'currentVersionNo', width: 80 },
  { title: '冻结引用', key: 'activeFreezeRefCount', width: 90 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '操作', key: 'actions', width: 300 },
]

const searchColumns: ColumnsType<PortfolioMaterialSearchResponse> = [
  { title: '标题', dataIndex: 'materialTitle', key: 'materialTitle', fixed: 'left' },
  { title: '类型', key: 'materialType', width: 120 },
  { title: '命中摘要', dataIndex: 'snippet', key: 'snippet' },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '操作', key: 'actions', width: 240 },
]

const loading = ref(false)
const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const saving = computed(() => operationKey.value.startsWith('save:'))
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
const versionModalOpen = ref(false)
const versionLoading = ref(false)
const versionRows = ref<PortfolioMaterialVersionVO[]>([])
const refRows = ref<PortfolioMaterialRefVO[]>([])
const versionMaterialTitle = ref('')
const form = reactive<PortfolioMaterialSaveRequest>({
  materialType: PortfolioMaterialTypeCode.DOCUMENT,
  materialTitle: '',
  fileNodeId: '',
  categoryCode: '',
})
const attachmentFileName = ref<string>()
const requestToken = ref(0)

const modalTitle = computed(() => (editingId.value ? '编辑材料' : '登记材料'))
const showSearchResults = computed(() => searchKeyword.value.trim().length > 0)

/** 教师作用域切换或关闭弹窗时必须清空旧材料编辑态，避免跨教师保存到错误对象。 */
function resetFormContext() {
  editingId.value = undefined
  form.materialType = PortfolioMaterialTypeCode.DOCUMENT
  form.materialTitle = ''
  form.fileNodeId = ''
  form.categoryCode = ''
  attachmentFileName.value = undefined
}

async function loadPage() {
  const currentToken = requestToken.value
  loading.value = true
  try {
    const page = await portfolioMaterialApi.page({
      ...(targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}),
      materialType: filterModel.value.materialType,
      status: filterModel.value.status,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = page.list
    pageTotal.value = page.total
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    showUserError(error, '加载材料库失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

async function searchOcr() {
  const currentToken = requestToken.value
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
    if (requestToken.value !== currentToken) {
      return
    }
    searchRows.value = page.list
    searchPageTotal.value = page.total
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    showUserError(error, '文字识别检索失败')
  } finally {
    if (requestToken.value === currentToken) {
      searchLoading.value = false
    }
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
  if (writing.value) return
  if (!assertArchiveWritable()) return
  resetFormContext()
  formModalOpen.value = true
}

function openEditModal(row: PortfolioMaterialVO) {
  if (writing.value) return
  if (!assertArchiveWritable()) return
  editingId.value = row.id
  form.materialType = row.materialType
  form.materialTitle = row.materialTitle ?? ''
  form.fileNodeId = row.fileNodeId ?? ''
  form.categoryCode = row.categoryCode ?? ''
  attachmentFileName.value = row.materialTitle
  formModalOpen.value = true
}

async function submitForm() {
  if (writing.value) return

  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('保存材料'))) {
    return
  }
  if (!form.materialTitle.trim()) {
    showFormValidationMessage('请填写材料标题')
    return
  }
  if (!form.fileNodeId) {
    showFormValidationMessage('请上传材料文件')
    return
  }
  const scopeTeacherId = targetTeacherId.value
  const scopeToken = requestToken.value
  const targetId = editingId.value
  const operation = `save:${targetId ?? 'new'}`
  operationKey.value = operation
  try {
    await portfolioMaterialApi.save({
      ...(targetId ? { id: targetId } : {}),
      ...(scopeTeacherId ? { teacherId: scopeTeacherId } : {}),
      materialType: form.materialType,
      materialTitle: form.materialTitle.trim(),
      fileNodeId: form.fileNodeId,
      categoryCode: form.categoryCode?.trim() || undefined,
    })
    if (requestToken.value !== scopeToken || targetTeacherId.value !== scopeTeacherId) return
    void message.success(targetId ? '材料已更新' : '材料已登记')
    formModalOpen.value = false
    await loadPage()
  } catch (error) {
    if (requestToken.value !== scopeToken || targetTeacherId.value !== scopeTeacherId) return
    showUserError(error, '保存材料失败')
  } finally {
    if (operationKey.value === operation) operationKey.value = ''
  }
}

async function deleteMaterial(row: PortfolioMaterialVO) {
  if (writing.value) return

  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('删除材料'))) {
    return
  }
  const scopeTeacherId = targetTeacherId.value
  const scopeToken = requestToken.value
  const operation = `delete:${row.id}`
  operationKey.value = operation
  const confirmed = await confirmAsync({
    title: '删除材料',
    content: `确认删除「${row.materialTitle ?? row.id}」？删除后该材料不再出现在材料库、文字识别检索和后续智能复用中；已经挂入档案的支撑材料快照仍会保留。`,
    type: 'error',
  })
  if (!confirmed) {
    if (operationKey.value === operation) operationKey.value = ''
    return
  }
  try {
    await portfolioMaterialApi.delete(row.id)
    if (requestToken.value !== scopeToken || targetTeacherId.value !== scopeTeacherId) return
    void message.success('材料已删除')
    await loadPage()
  } catch (error) {
    if (requestToken.value !== scopeToken || targetTeacherId.value !== scopeTeacherId) return
    showUserError(error, '删除材料失败')
  } finally {
    if (operationKey.value === operation) operationKey.value = ''
  }
}

async function openVersionHistory(row: PortfolioMaterialVO) {
  versionMaterialTitle.value = row.materialTitle ?? row.id
  versionModalOpen.value = true
  versionLoading.value = true
  versionRows.value = []
  refRows.value = []
  try {
    const [versions, refs] = await Promise.all([
      portfolioMaterialApi.listVersions(row.id),
      portfolioMaterialApi.listRefs(row.id),
    ])
    versionRows.value = versions ?? []
    refRows.value = refs ?? []
  } catch (error) {
    showUserError(error, '加载材料版本失败')
    versionModalOpen.value = false
  } finally {
    versionLoading.value = false
  }
}

async function voidMaterial(row: PortfolioMaterialVO) {
  if (writing.value) return
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('作废材料'))) {
    return
  }
  const operation = `void:${row.id}`
  operationKey.value = operation
  const confirmed = await confirmAsync({
    title: '作废材料（仅影响未来）',
    content: `确认作废「${row.materialTitle ?? row.id}」？历史评价/导出冻结引用将保留，未来任务不再使用该材料。`,
    type: 'warning',
  })
  if (!confirmed) {
    if (operationKey.value === operation) operationKey.value = ''
    return
  }
  try {
    await portfolioMaterialApi.voidForFuture(row.id)
    void message.success('材料已作废')
    await loadPage()
  } catch (error) {
    showUserError(error, '作废材料失败')
  } finally {
    if (operationKey.value === operation) operationKey.value = ''
  }
}

function openAiOrchestration(row: PortfolioMaterialVO, tab: 'ask' | 'policy' = 'ask') {
  if (!row.fileNodeId) {
    showFormValidationMessage('材料未关联文件')
    return
  }
  const teacherId = targetTeacherId.value ?? row.teacherId
  if (!teacherId) {
    showFormValidationMessage('请先选择教师')
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
    showFormValidationMessage('材料未关联文件')
    return
  }
  const teacherId = targetTeacherId.value ?? row.teacherId
  if (!teacherId) {
    showFormValidationMessage('请先选择教师')
    return
  }
  const query: Record<string, string> = {
    teacherId,
    materialId: row.id,
  }
  if (row.categoryId) {
    query.categoryId = row.categoryId
  }
  if (row.archiveRecordId) {
    query.recordId = row.archiveRecordId
  }
  void router.push({
    path: '/portfolio/teacher/intake',
    query,
  })
}

function openSearchHitAiExtract(row: PortfolioMaterialSearchResponse) {
  const teacherId = targetTeacherId.value ?? row.teacherId
  if (!teacherId) {
    showFormValidationMessage('请先选择教师')
    return
  }
  const query: Record<string, string> = {
    teacherId,
    materialId: row.materialId,
  }
  void router.push({
    path: '/portfolio/teacher/intake',
    query,
  })
}

function openSearchHitAiOrchestration(
  row: PortfolioMaterialSearchResponse,
  tab: 'ask' | 'policy' = 'ask',
) {
  const teacherId = targetTeacherId.value ?? row.teacherId
  if (!teacherId) {
    showFormValidationMessage('请先选择教师')
    return
  }
  void router.push({
    path: '/portfolio/ai-orchestration',
    query: {
      teacherId,
      materialId: row.materialId,
      tab,
    },
  })
}

function openIntakeReassign(row: PortfolioMaterialVO) {
  const teacherId = targetTeacherId.value ?? row.teacherId
  if (!teacherId) {
    showFormValidationMessage('请先选择教师')
    return
  }
  if (!canReassignPortfolioMaterial(row)) {
    showFormValidationMessage('当前材料不可重分类，仅草稿或退回修改中的档案记录可重分类')
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
    actions.push({ key: 'reassign', label: '重分类', disabled: writing.value })
  }
  actions.push(
    { key: 'aiExtract', label: '智能抽取', disabled: writing.value },
    { key: 'aiAsk', label: '智能问数', disabled: writing.value },
    { key: 'aiPolicy', label: '政策核验', disabled: writing.value },
    { key: 'edit', label: '编辑', disabled: writing.value },
    { key: 'versions', label: '版本历史', disabled: writing.value },
    {
      key: 'void',
      label: operationKey.value === `void:${row.id}` ? '作废中' : '作废',
      disabled: writing.value || row.status === PortfolioMaterialStatusCode.VOID,
    },
    {
      key: 'delete',
      label: operationKey.value === `delete:${row.id}` ? '删除中' : '删除',
      tone: 'danger',
      disabled: writing.value || (row.activeFreezeRefCount ?? 0) > 0,
    },
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
    case 'versions':
      void openVersionHistory(row)
      break
    case 'void':
      void voidMaterial(row)
      break
    case 'delete':
      void deleteMaterial(row)
      break
  }
}

usePortfolioScopedLoader(
  () => {
    requestToken.value += 1
    pageNum.value = 1
    void loadPage()
  },
  () => targetTeacherId.value,
)
watch(
  () => targetTeacherId.value,
  () => {
    requestToken.value += 1
    formModalOpen.value = false
    resetFormContext()
    searchRows.value = []
    searchPageTotal.value = 0
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="材料库"
        subtitle="教师佐证材料登记、文字识别检索与复用"
      >
        <template #actions>
          <UiButton
            size="sm"
            variant="primary"
            :disabled="writing || archiveWriteForbidden"
            @click="openCreateModal"
          >
            登记材料
          </UiButton>
          <UiButton size="sm" :loading="loading" :disabled="writing" @click="() => void loadPage()">
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />
    <template v-else>
      <UiAlertStrip
        v-if="archiveWriteForbidden"
        tone="warning"
        title="档案已封存写禁"
        :description="archiveWriteBlockMessage"
        class="mb-3"
      />

      <UiFilterBar v-model="filterModel" :fields="filterFields" @search="handleSearch">
        <UiSearchBox
          v-model="searchKeyword"
          placeholder="文字识别全文检索"
          @search="handleSearch"
        />
      </UiFilterBar>

      <UiCard :title="showSearchResults ? '文字识别检索结果' : '材料列表'">
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
            <template v-else-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="record.ownerIdentityLayers"
                :note="record.ownerMultiIdentityNote"
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[
                  { key: 'aiExtract', label: '智能抽取' },
                  { key: 'aiAsk', label: '智能问数' },
                  { key: 'aiPolicy', label: '政策核验' },
                ]"
                @action="
                  (key) => {
                    if (key === 'aiExtract') {
                      openSearchHitAiExtract(record)
                      return
                    }
                    if (key === 'aiAsk') {
                      openSearchHitAiOrchestration(record, 'ask')
                      return
                    }
                    openSearchHitAiOrchestration(record, 'policy')
                  }
                "
              />
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
              <UiTag :tone="materialStatusTone(record.status)">
                {{ materialStatusLabel(record.status) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'ocrStatus'">
              <UiTag v-if="record.ocrStatus" :tone="ocrStatusTone(record.ocrStatus)">
                {{ ocrStatusLabel(record.ocrStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'currentVersionNo'">
              v{{ record.currentVersionNo ?? '-' }}
            </template>
            <template v-else-if="column.key === 'activeFreezeRefCount'">
              <UiTag :tone="(record.activeFreezeRefCount ?? 0) > 0 ? 'orange' : 'gray'">
                {{ record.activeFreezeRefCount ?? 0 }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="record.ownerIdentityLayers"
                :note="record.ownerMultiIdentityNote"
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildMaterialRowActions(record)"
                @action="(key) => handleMaterialRowAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
        <UiEmpty
          v-else
          size="sm"
          :description="showSearchResults ? '未命中文字识别结果' : '暂无材料'"
        />
      </UiCard>

      <UiDialog
        v-model:open="formModalOpen"
        :title="modalTitle"
        ok-text="保存"
        cancel-text="取消"
        :confirm-loading="saving"
        :closable="!writing"
        :mask-closable="!writing"
        @ok="() => void submitForm()"
        @cancel="resetFormContext"
      >
        <UiInput
          v-model="form.materialTitle"
          size="sm"
          class="teacher-materials__field"
          placeholder="材料标题"
        />
        <UiSelect
          v-model="form.materialType"
          size="sm"
          class="teacher-materials__field teacher-materials__select"
          :options="materialTypeOptions"
          placeholder="材料类型"
        />
        <UiInput
          v-model="form.categoryCode"
          size="sm"
          class="teacher-materials__field"
          placeholder="关联分类编码（可选）"
        />
        <UiPlatformFileField
          v-model:file-node-id="form.fileNodeId"
          v-model:file-name="attachmentFileName"
          :scene-key="FileUploadSceneKey.PORTFOLIO_MATERIAL"
          label="材料文件"
        />
      </UiDialog>

      <UiDialog
        v-model:open="versionModalOpen"
        :title="`版本与引用 · ${versionMaterialTitle}`"
        ok-text="关闭"
        hide-cancel
        :confirm-loading="versionLoading"
        @ok="versionModalOpen = false"
      >
        <UiCard title="版本历史（§8.51）">
          <ul v-if="versionRows.length" class="teacher-materials__version-list">
            <li v-for="item in versionRows" :key="item.id">
              <strong>v{{ item.versionNo }}</strong>
              <span>{{ materialVersionStatusLabel(item.versionStatus) }}</span>
              <span>材料文件已关联</span>
              <UiTag v-if="item.freezeReferenced" tone="orange">冻结引用中</UiTag>
            </li>
          </ul>
          <UiEmpty v-else size="sm" description="暂无版本" />
        </UiCard>
        <UiCard title="业务引用" style="margin-top: 12px">
          <ul v-if="refRows.length" class="teacher-materials__version-list">
            <li v-for="item in refRows" :key="item.id">
              <strong>{{ materialRefScopeLabel(item.refScope) }}</strong>
              <span>v{{ item.versionNo }}</span>
              <span>{{ materialRefFreezeStatusLabel(item.freezeStatus) }}</span>
              <span>{{ item.refLabel || item.refBusinessId }}</span>
            </li>
          </ul>
          <UiEmpty v-else size="sm" description="暂无业务引用" />
        </UiCard>
      </UiDialog>
    </template>
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
.teacher-materials__version-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.teacher-materials__version-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--dp-border-subtle);
  font-size: var(--dp-font-size-sm);
}
</style>
