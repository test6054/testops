<template>
  <div class="archive-template-sets-panel">
    <UiSectionTabs
      v-model="activeScopeTab"
      :items="scopeTabItems"
      compact
      class="archive-template-sets-panel__tabs"
    />

    <section v-if="activeScopeTab === 'PLATFORM'" class="archive-template-sets-panel__section">
      <WorkbenchSurfaceCard flush>
        <UiEmpty
          size="sm"
          v-if="templateSetsLoadFailed"
          description="归档模板套加载失败"
          action-label="重新加载"
          @action="loadTemplateSets"
        />
        <UiDataTable
          v-else
          pagination-mode="none"
          :columns="platformColumns"
          :data-source="platformSets"
          :loading="templateSetsLoading"
          :show-pagination="false"
          flat
          row-key="templateSetCode"
          size="middle"
          empty-description="暂无平台模板套"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'templateScope'">
              <UiTag :tone="archiveTemplateScopeTone(record.templateScope)" size="sm">
                {{ archiveTemplateScopeLabel(record.templateScope) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'examForm'">
              {{ examFormLabel(record.examForm) }}
            </template>
            <template v-else-if="column.key === 'retention'">
              {{ retentionLabel(record) }}
            </template>
            <template v-else-if="column.key === 'releaseTag'">
              <UiTag v-if="record.releaseTag" tone="blue" size="sm">{{ record.releaseTag }}</UiTag>
              <span v-else>—</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildPlatformTemplateRowActions(record)"
                split
                @action="(key) => handlePlatformTemplateRowAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
        <div v-if="!templateSetsLoadFailed" class="archive-template-sets-panel__copy-bar">
          <div class="archive-template-sets-panel__copy-all">
            <span class="archive-template-sets-panel__copy-all-label">目标前缀</span>
            <UiInput
              size="sm"
              v-model="copyAllPrefix"
              placeholder="如 DEFAULT_"
              style="width: 160px"
              :disabled="copyAllLoading"
            />
            <UiCheckbox v-model="copyAllOverride">覆盖已存在</UiCheckbox>
          </div>
          <UiButton size="sm" variant="primary" :loading="copyAllLoading" @click="submitCopyAll">
            一键复制全部模板
          </UiButton>
        </div>
      </WorkbenchSurfaceCard>
    </section>

    <section v-else class="archive-template-sets-panel__section">
      <WorkbenchSurfaceCard flush>
        <UiEmpty
          size="sm"
          v-if="templateSetsLoadFailed"
          description="归档模板套加载失败"
          action-label="重新加载"
          @action="loadTemplateSets"
        />
        <UiDataTable
          v-else
          pagination-mode="none"
          :columns="tenantColumns"
          :data-source="tenantSets"
          :loading="templateSetsLoading"
          :show-pagination="false"
          flat
          row-key="templateSetCode"
          size="middle"
          empty-description="尚未复制任何模板集，请从平台模板复制"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'templateScope'">
              <UiTag :tone="archiveTemplateScopeTone(record.templateScope)" size="sm">
                {{ archiveTemplateScopeLabel(record.templateScope) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'examForm'">
              {{ examFormLabel(record.examForm) }}
            </template>
            <template v-else-if="column.key === 'retention'">
              {{ retentionLabel(record) }}
            </template>
            <template v-else-if="column.key === 'release'">
              <span v-if="record.forkSourceReleaseTag" class="archive-template-sets-panel__release">
                {{ record.forkSourceReleaseTag }}
              </span>
              <span v-else>—</span>
              <UiTag v-if="canResyncTenantSet(record)" tone="orange" size="sm">可重新同步</UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildTenantTemplateRowActions(record)"
                split
                @action="(key) => handleTenantTemplateRowAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
    </section>

    <ArchiveTemplateSetEditorDrawer
      v-model:open="editorDrawerOpen"
      v-model:material-rows="materialRows"
      v-model:self-check-rows="selfCheckRows"
      :title="editorDrawerTitle"
      :loading="detailLoading"
      :saving="saving"
      mode="tenant"
      :category-group-map="categoryGroupMap"
      save-label="保存模板集"
      empty-description="该模板集暂无材料项与自查项"
      @save="saveTenantSet"
      @cancel="resetEditor"
    >
      <template #meta>
        <div class="archive-template-editor__meta">
          <label class="archive-template-editor__field">
            <span>套编码</span>
            <UiInput
              size="sm" :value="selectedSetCode" disabled
            />
          </label>
          <label class="archive-template-editor__field">
            <span>名称</span>
            <UiInput
              size="sm" v-model="editorMeta.templateSetName"
            />
          </label>
          <label class="archive-template-editor__field">
            <span>考核形式</span>
            <UiInput
              size="sm" :value="examFormLabel(editorMeta.examForm)" disabled
            />
          </label>
          <label class="archive-template-editor__field">
            <span>来源模板</span>
            <UiInput
              size="sm" :value="editorMeta.forkSourceSetCode || '—'" disabled
            />
          </label>
          <label class="archive-template-editor__field">
            <span>保管期限</span>
            <div class="archive-template-editor__retention">
              <UiInputNumber
                size="sm"
                v-model="editorMeta.defaultRetentionYears"
                :min="1"
                :max="100"
                :disabled="editorMeta.defaultPermanentRetention"
              />
              <span>年</span>
              <UiCheckbox v-model="editorMeta.defaultPermanentRetention">永久</UiCheckbox>
            </div>
          </label>
        </div>
      </template>
    </ArchiveTemplateSetEditorDrawer>

    <ArchiveTemplateSetPreviewDrawer
      v-model:open="previewOpen"
      :loading="previewLoading"
      :preview="previewData"
      :category-group-map="previewCategoryGroupMap"
      :fork-source-set-code="previewForkSourceSetCode"
    />

    <UiDrawer
      :open="copyOpen"
      title="复制平台模板到本校"
      :width="520"
      :confirm-loading="copyLoading"
      ok-text="确认复制"
      :hide-footer="false"
      @update:open="(v: boolean) => (copyOpen = v)"
      @close="copyOpen = false"
      @confirm="submitCopy"
    >
      <UiForm layout="vertical">
        <UiFormItem label="平台模板套">
          <UiInput
            size="sm" :value="copySource?.templateSetName" disabled
          />
        </UiFormItem>
        <UiFormItem label="目标租户套编码" required>
          <UiInput
            size="sm" v-model="copyTargetSetCode" placeholder="如 PAPER_TYUT_2025"
          />
        </UiFormItem>
        <UiFormItem>
          <UiCheckbox v-model="copyOverride">覆盖已存在的同名套</UiCheckbox>
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="resyncOpen"
      title="重新同步平台模板"
      :width="520"
      :hide-footer="false"
      @update:open="(v: boolean) => (resyncOpen = v)"
      @close="resyncOpen = false"
    >
      <UiAlertStrip
        tone="warning"
        title="同步将覆盖当前模板集"
        description="操作前系统会备份快照；若已有归档任务引用该套模板，同步将被拒绝。请确认影响范围后再继续。"
        dense
        class="archive-template-sets-panel__resync-alert"
      />
      <UiForm layout="vertical" class="archive-template-sets-panel__resync-form">
        <UiFormItem label="模板集编码">
          <UiInput
            size="sm" :value="resyncTarget?.templateSetCode" disabled
          />
        </UiFormItem>
        <UiFormItem label="二次确认：请输入模板集编码" required>
          <UiInput
            size="sm" v-model="resyncConfirmCode" placeholder="输入上方编码以确认"
          />
        </UiFormItem>
      </UiForm>
      <template #footer>
        <UiButton size="sm" variant="outline" @click="resyncOpen = false">取消</UiButton>
        <UiButton size="sm" :loading="resyncLoading" :disabled="!canSubmitResync" @click="submitResync">
          确认同步
        </UiButton>
      </template>
    </UiDrawer>

    <UiDrawer
      :open="auditOpen"
      title="模板版本历史"
      :width="640"
      :hide-footer="true"
      @update:open="(v: boolean) => (auditOpen = v)"
      @close="auditOpen = false"
    >
      <p v-if="auditTarget" class="archive-template-sets-panel__audit-meta">
        模板套：{{ auditTarget.templateSetName || auditTarget.templateSetCode }}
      </p>
      <UiEmpty
        size="sm"
        v-if="auditLoadFailed"
        description="模板版本历史加载失败"
        action-label="重新加载"
        @action="loadAuditRows"
      />
      <UiDataTable
        v-else
        v-model:current="auditPagination.pageNum"
        v-model:page-size="auditPagination.pageSize"
        pagination-mode="server"
        :columns="auditColumns"
        :data-source="auditRows"
        :loading="auditLoading"
        flat
        row-key="auditId"
        size="middle"
        :total="auditPagination.total"
        empty-description="暂无审计快照"
        @page-change="handleAuditPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'operationType'">
            {{ archiveTenantTemplateOperationTypeLabel(record.operationType) }}
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(record.createTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton
              size="sm"
              variant="outline"
              :loading="restoringAuditId === record.auditId"
              @click="submitRestoreFromAudit(record.auditId)"
            >
              恢复此版本
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </UiDrawer>
  </div>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchivePlatformTemplatePreviewResponse,
  ArchiveTenantTemplateAuditItemVO,
  ArchiveTenantTemplateSetResponse,
} from '@/apis/mark/archive-platform-template'
import type { ArchiveExamFormCode } from '@/apis/mark/archive-volume'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type {
  ArchiveTemplateMaterialEditRow,
  ArchiveTemplateSelfCheckEditRow,
} from '@/views/teacher/archive-volume/components/archive-template-editor-types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  copyAllArchivePlatformTemplatesToTenant,
  copyArchivePlatformTemplateToTenant,
  getArchiveTenantTemplateSetDetail,
  listArchiveTenantTemplateSets,
  pageArchiveTenantTemplateAudit,
  previewArchivePlatformTemplateSet,
  restoreArchiveTenantTemplateFromAudit,
  resyncArchiveTenantTemplateSet,
  saveArchiveTenantTemplateSet,
} from '@/apis/mark/archive-platform-template'
import {
  ArchiveTemplateScopeCode,
  archiveTemplateScopeLabel,
  archiveTemplateScopeTone,
} from '@/apis/mark/archive-template-scope'
import { ArchiveExamFormDescription } from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { ArchiveMaterialDeliveryModeCode } from '@/types/enums/archive-material-delivery-mode-enum'
import { archiveTenantTemplateOperationTypeLabel } from '@/types/enums/archive-tenant-template-operation-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveTemplateSetEditorDrawer from '@/views/teacher/archive-volume/components/ArchiveTemplateSetEditorDrawer.vue'
import ArchiveTemplateSetPreviewDrawer from '@/views/teacher/archive-volume/components/ArchiveTemplateSetPreviewDrawer.vue'

defineOptions({ name: 'ArchiveVolumeTemplateSetsPanel' })

const activeScopeTab = ref<ArchiveTemplateScopeCode>(ArchiveTemplateScopeCode.PLATFORM)
const scopeTabItems = [
  { key: ArchiveTemplateScopeCode.PLATFORM, label: '平台模板（只读）' },
  { key: ArchiveTemplateScopeCode.TENANT, label: '本校模板（可维护）' },
]
const templateSets = ref<ArchiveTenantTemplateSetResponse[]>([])
const templateSetsLoading = ref(false)
const templateSetsLoadFailed = ref(false)
const platformSets = computed(() =>
  templateSets.value.filter((item) => item.templateScope === 'PLATFORM'),
)
const tenantSets = computed(() =>
  templateSets.value.filter((item) => item.templateScope === 'TENANT'),
)
const detailLoading = ref(false)
const saving = ref(false)
const copyAllLoading = ref(false)
const copyLoading = ref(false)
const resyncLoading = ref(false)
const previewLoading = ref(false)
const previewOpen = ref(false)
const copyOpen = ref(false)
const resyncOpen = ref(false)
const copyAllPrefix = ref('DEFAULT_')
const copyAllOverride = ref(false)
const copyTargetSetCode = ref('')
const copyOverride = ref(false)
const resyncConfirmCode = ref('')
const selectedSetCode = ref('')
const editorDrawerOpen = ref(false)
const copySource = ref<ArchiveTenantTemplateSetResponse | null>(null)
const resyncTarget = ref<ArchiveTenantTemplateSetResponse | null>(null)
const auditOpen = ref(false)
const auditLoading = ref(false)
const auditLoadFailed = ref(false)
const auditTarget = ref<ArchiveTenantTemplateSetResponse | null>(null)
const auditRows = ref<ArchiveTenantTemplateAuditItemVO[]>([])
const restoringAuditId = ref('')
const auditPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const previewData = ref<ArchivePlatformTemplatePreviewResponse | null>(null)
const previewCategoryGroupMap = ref<Map<string, string>>(new Map())
const previewForkSourceSetCode = ref<string | undefined>(undefined)
const categoryGroupMap = ref<Map<string, string>>(new Map())
const materialRows = ref<ArchiveTemplateMaterialEditRow[]>([])
const selfCheckRows = ref<ArchiveTemplateSelfCheckEditRow[]>([])
interface ArchiveVolumeTemplateEditorMeta {
  templateSetName: string
  examForm?: ArchiveExamFormCode
  forkSourceSetCode?: string
  defaultPermanentRetention?: boolean
  defaultRetentionYears?: number
}

const editorMeta = reactive<ArchiveVolumeTemplateEditorMeta>({
  templateSetName: '',
  forkSourceSetCode: undefined,
  defaultPermanentRetention: undefined,
  defaultRetentionYears: undefined,
})

const platformColumns: ColumnsType<ArchiveTenantTemplateSetResponse> = [
  { title: '作用域', key: 'templateScope', width: 100, align: 'center' },
  { title: '模板编码', dataIndex: 'templateSetCode', key: 'templateSetCode', width: 180 },
  { title: '名称', dataIndex: 'templateSetName', key: 'templateSetName', width: 160 },
  { title: '考核形式', key: 'examForm', width: 100 },
  { title: '保管期限', key: 'retention', width: 100 },
  { title: '发版标签', key: 'releaseTag', width: 120 },
  { title: '操作', key: 'actions', width: 140 },
]

const tenantColumns: ColumnsType<ArchiveTenantTemplateSetResponse> = [
  { title: '作用域', key: 'templateScope', width: 100, align: 'center' },
  { title: '套编码', dataIndex: 'templateSetCode', key: 'templateSetCode', width: 180 },
  { title: '名称', dataIndex: 'templateSetName', key: 'templateSetName', width: 160 },
  { title: '考核形式', key: 'examForm', width: 100 },
  { title: '保管期限', key: 'retention', width: 100 },
  { title: '来源模板', dataIndex: 'forkSourceSetCode', key: 'forkSourceSetCode', width: 160 },
  { title: '发版标签', key: 'release', width: 180 },
  { title: '操作', key: 'actions', width: 200 },
]

const auditColumns: ColumnsType<ArchiveTenantTemplateAuditItemVO> = [
  { title: '操作类型', key: 'operationType', width: 120 },
  { title: '操作人', dataIndex: 'operatorUserId', key: 'operatorUserId', width: 120 },
  { title: '时间', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const editorDrawerTitle = computed(() =>
  selectedSetCode.value
    ? `编辑本校模板：${editorMeta.templateSetName || selectedSetCode.value}`
    : '编辑本校模板',
)

function resetPreview() {
  previewData.value = null
  previewCategoryGroupMap.value = new Map()
  previewForkSourceSetCode.value = undefined
}

function resetEditor() {
  editorDrawerOpen.value = false
  selectedSetCode.value = ''
  editorMeta.templateSetName = ''
  editorMeta.examForm = undefined
  editorMeta.forkSourceSetCode = undefined
  editorMeta.defaultPermanentRetention = undefined
  editorMeta.defaultRetentionYears = undefined
  materialRows.value = []
  selfCheckRows.value = []
  categoryGroupMap.value = new Map()
}

function toPreviewResponseFromTenantDetail(
  detail: ArchiveTenantTemplateSetResponse,
): ArchivePlatformTemplatePreviewResponse {
  return {
    templateSet: {
      setCode: detail.templateSetCode,
      setName: detail.templateSetName,
      examForm: detail.examForm,
      templateScope: detail.templateScope,
      releaseTag: detail.releaseTag,
      description: detail.description,
    },
    materialItems: (detail.materialItems ?? []).map((item) => ({
      materialType: item.materialType,
      catalogCode: item.catalogCode,
      catalogName: item.catalogName,
      requiredFlag: item.requiredFlag,
      sortOrder: item.sortOrder,
      deliveryMode: item.deliveryMode,
    })),
    selfCheckItems: (detail.selfCheckItems ?? []).map((item) => ({
      itemText: item.itemText,
      requiredFlag: item.requiredFlag,
      sortOrder: item.itemOrder,
    })),
  }
}

const canSubmitResync = computed(() => {
  if (!resyncTarget.value) return false
  return resyncConfirmCode.value.trim() === resyncTarget.value.templateSetCode
})

function materialKey(materialType: string, catalogCode?: string) {
  return `${materialType}:${catalogCode ?? ''}`
}

function buildCategoryGroupMap(preview: ArchivePlatformTemplatePreviewResponse | null) {
  const map = new Map<string, string>()
  for (const item of preview?.materialItems ?? []) {
    map.set(
      materialKey(item.materialType, item.catalogCode),
      item.categoryGroup?.trim() || '未分组',
    )
  }
  return map
}

function examFormLabel(code?: ArchiveExamFormCode) {
  if (!code) return '—'
  return strictEnumLabel(ArchiveExamFormDescription, code, 'examForm')
}

function retentionLabel(record: ArchiveTenantTemplateSetResponse) {
  if (record.retentionPolicyLabel) return record.retentionPolicyLabel
  if (record.defaultPermanentRetention) return '永久'
  if (record.defaultRetentionYears != null) return `${record.defaultRetentionYears}年`
  return '—'
}

function platformReleaseTag(setCode?: string) {
  if (!setCode) return undefined
  return platformSets.value.find((item) => item.templateSetCode === setCode)?.releaseTag
}

async function loadTemplateSets() {
  templateSetsLoading.value = true
  try {
    templateSets.value = await listArchiveTenantTemplateSets()
    templateSetsLoadFailed.value = false
  } catch (error) {
    templateSetsLoadFailed.value = true
    showUserError(error, '加载归档模板套失败')
  } finally {
    templateSetsLoading.value = false
  }
}

async function refreshAll() {
  await loadTemplateSets()
}

async function openReadOnlyPreview(templateSetCode: string) {
  previewOpen.value = true
  previewLoading.value = true
  resetPreview()
  try {
    const listItem = templateSets.value.find((item) => item.templateSetCode === templateSetCode)
    if (listItem?.templateScope === ArchiveTemplateScopeCode.PLATFORM) {
      const platformPreview = await previewArchivePlatformTemplateSet({
        sourceSetCode: templateSetCode,
      })
      previewData.value = platformPreview
      previewCategoryGroupMap.value = buildCategoryGroupMap(platformPreview)
      return
    }
    const detail = await getArchiveTenantTemplateSetDetail({ templateSetCode })
    previewForkSourceSetCode.value = detail.forkSourceSetCode
    if (detail.forkSourceSetCode) {
      const platformPreview = await previewArchivePlatformTemplateSet({
        sourceSetCode: detail.forkSourceSetCode,
      })
      previewCategoryGroupMap.value = buildCategoryGroupMap(platformPreview)
    }
    previewData.value = toPreviewResponseFromTenantDetail(detail)
  } catch (error) {
    previewOpen.value = false
    showUserError(error, '加载模板预览失败')
  } finally {
    previewLoading.value = false
  }
}

function canResyncTenantSet(record: ArchiveTenantTemplateSetResponse) {
  if (!record.forkSourceSetCode || !record.forkSourceReleaseTag) return false
  const latestTag = platformReleaseTag(record.forkSourceSetCode)
  if (!latestTag) return false
  return latestTag !== record.forkSourceReleaseTag
}

async function loadCategoryGroups(forkSourceSetCode?: string) {
  if (!forkSourceSetCode) {
    categoryGroupMap.value = new Map()
    return
  }
  try {
    const preview = await previewArchivePlatformTemplateSet({ sourceSetCode: forkSourceSetCode })
    categoryGroupMap.value = buildCategoryGroupMap(preview)
  } catch (error) {
    categoryGroupMap.value = new Map()
    showUserError(error, '模板材料分组预览加载失败')
  }
}

async function loadTenantSetDetail(templateSetCode: string) {
  selectedSetCode.value = templateSetCode
  detailLoading.value = true
  try {
    const detail = await getArchiveTenantTemplateSetDetail({ templateSetCode })
    editorMeta.templateSetName = detail.templateSetName
    editorMeta.examForm = detail.examForm
    editorMeta.forkSourceSetCode = detail.forkSourceSetCode
    editorMeta.defaultPermanentRetention = detail.defaultPermanentRetention
    editorMeta.defaultRetentionYears = detail.defaultRetentionYears
    await loadCategoryGroups(detail.forkSourceSetCode)
    materialRows.value = (detail.materialItems ?? []).map((item, index) => ({
      rowKey: item.templateItemId ?? `material-${index}`,
      materialType: item.materialType,
      catalogCode: item.catalogCode,
      catalogName: item.catalogName ?? '',
      requiredFlag: item.requiredFlag ?? false,
      delayAllowedFlag: item.delayAllowedFlag ?? false,
      sortOrder: item.sortOrder ?? index + 1,
      deliveryMode: item.deliveryMode ?? ArchiveMaterialDeliveryModeCode.PHYSICAL_SCAN,
    }))
    selfCheckRows.value = (detail.selfCheckItems ?? []).map((item, index) => ({
      rowKey: item.selfCheckItemId ?? `self-check-${index}`,
      itemText: item.itemText,
      requiredFlag: item.requiredFlag ?? false,
      itemOrder: item.itemOrder ?? index + 1,
    }))
  } catch (error) {
    resetEditor()
    showUserError(error, '加载模板集详情失败')
  } finally {
    detailLoading.value = false
  }
}

async function openEditDrawer(templateSetCode: string) {
  editorDrawerOpen.value = true
  await loadTenantSetDetail(templateSetCode)
}

function findTenantSetByPlatformSource(sourceSetCode: string) {
  return (
    templateSets.value.find(
      (item) => item.templateScope === 'TENANT' && item.forkSourceSetCode === sourceSetCode,
    )
    ?? templateSets.value.find(
      (item) => item.templateScope === 'TENANT' && item.templateSetCode === sourceSetCode,
    )
  )
}

/** 模板套入口：本校副本可编辑；平台母版引导复制后编辑。 */
async function openPlatformTemplate(record: ArchiveTenantTemplateSetResponse) {
  const tenantSet = findTenantSetByPlatformSource(record.templateSetCode)
  if (tenantSet) {
    await openEditDrawer(tenantSet.templateSetCode)
    return
  }
  await openReadOnlyPreview(record.templateSetCode)
}

function openCopyModal(record: ArchiveTenantTemplateSetResponse, defaultTargetSetCode = '') {
  if (templateSetsLoadFailed.value) return
  copySource.value = record
  copyTargetSetCode.value = defaultTargetSetCode
  copyOverride.value = false
  copyOpen.value = true
}

async function submitCopy() {
  if (copyLoading.value) {
    return
  }
  if (templateSetsLoadFailed.value) {
    showFormValidationMessage('请先重新加载归档模板套')
    return
  }
  if (!copySource.value) return
  const targetSetCode = copyTargetSetCode.value.trim()
  if (!targetSetCode) {
    showFormValidationMessage('请填写目标租户套编码')
    return
  }
  copyLoading.value = true
  try {
    await copyArchivePlatformTemplateToTenant({
      sourceSetCode: copySource.value.templateSetCode,
      targetSetCode,
      overrideIfExists: copyOverride.value,
    })
    message.success('模板已复制到本校')
    copyOpen.value = false
    await loadTemplateSets()
    await openEditDrawer(targetSetCode)
  } catch (error) {
    showUserError(error, '复制模板到本校失败')
  } finally {
    copyLoading.value = false
  }
}

async function submitCopyAll() {
  if (copyAllLoading.value) {
    return
  }
  if (templateSetsLoadFailed.value) {
    showFormValidationMessage('请先重新加载归档模板套')
    return
  }
  const targetPrefix = copyAllPrefix.value.trim()
  if (!targetPrefix) {
    showFormValidationMessage('请填写目标前缀')
    return
  }
  copyAllLoading.value = true
  try {
    await copyAllArchivePlatformTemplatesToTenant({
      targetPrefix,
      overrideIfExists: copyAllOverride.value,
    })
    message.success('全部平台模板已复制到本校')
    await loadTemplateSets()
  } catch (error) {
    showUserError(error, '批量复制平台模板失败')
  } finally {
    copyAllLoading.value = false
  }
}

function openResyncModal(record: ArchiveTenantTemplateSetResponse) {
  if (templateSetsLoadFailed.value) return
  resyncTarget.value = record
  resyncConfirmCode.value = ''
  resyncOpen.value = true
}

function buildPlatformTemplateRowActions(
  record: ArchiveTenantTemplateSetResponse,
): UiTableRowActionItem[] {
  const tenantSet = findTenantSetByPlatformSource(record.templateSetCode)
  return [
    { key: 'open', label: tenantSet ? '编辑' : '预览' },
    { key: 'copy', label: '复制到本校', hidden: !!tenantSet },
  ]
}

function handlePlatformTemplateRowAction(key: string, record: ArchiveTenantTemplateSetResponse) {
  if (key === 'open') void openPlatformTemplate(record)
  else if (key === 'copy') openCopyModal(record)
}

function buildTenantTemplateRowActions(
  record: ArchiveTenantTemplateSetResponse,
): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'history', label: '版本历史' },
    { key: 'resync', label: '重新同步', hidden: !canResyncTenantSet(record) },
  ]
}

function handleTenantTemplateRowAction(key: string, record: ArchiveTenantTemplateSetResponse) {
  if (key === 'edit') void openEditDrawer(record.templateSetCode)
  else if (key === 'history') void openAuditDrawer(record)
  else if (key === 'resync') openResyncModal(record)
}

async function openAuditDrawer(record: ArchiveTenantTemplateSetResponse): Promise<void> {
  auditTarget.value = record
  auditPagination.pageNum = 1
  auditRows.value = []
  auditPagination.total = 0
  auditLoadFailed.value = false
  auditOpen.value = true
  await loadAuditRows()
}

async function loadAuditRows(): Promise<void> {
  if (!auditTarget.value) {
    auditRows.value = []
    auditPagination.total = 0
    return
  }
  auditLoading.value = true
  try {
    const page = await pageArchiveTenantTemplateAudit({
      templateSetCode: auditTarget.value.templateSetCode,
      pageNum: auditPagination.pageNum,
      pageSize: auditPagination.pageSize,
    })
    auditRows.value = page.list
    auditPagination.total = page.total
    auditPagination.pageNum = page.pageNum
    auditPagination.pageSize = page.pageSize
    auditLoadFailed.value = false
  } catch (error) {
    auditLoadFailed.value = true
    showUserError(error, '加载模板版本历史失败')
  } finally {
    auditLoading.value = false
  }
}

function handleAuditPageChange(page: { current: number, pageSize: number }): void {
  auditPagination.pageNum = page.current
  auditPagination.pageSize = page.pageSize
  void loadAuditRows()
}

async function submitRestoreFromAudit(auditId: string): Promise<void> {
  if (restoringAuditId.value || auditLoading.value) {
    return
  }
  if (!auditTarget.value || auditLoadFailed.value || templateSetsLoadFailed.value) {
    return
  }
  const templateSetCode = auditTarget.value.templateSetCode
  await confirmAsync({
    title: '恢复模板版本',
    content: '恢复将覆盖当前模板集内容；若已有归档任务引用该套模板，恢复将被拒绝。',
    type: 'warning',
    onOk: async () => {
      restoringAuditId.value = auditId
      try {
        await restoreArchiveTenantTemplateFromAudit({ auditId })
        message.success('模板版本已恢复')
        auditOpen.value = false
        await refreshAll()
        await openEditDrawer(templateSetCode)
      } catch (error) {
        showUserError(error, '恢复模板版本失败')
      } finally {
        restoringAuditId.value = ''
      }
    },
  })
}

async function submitResync() {
  if (resyncLoading.value) {
    return
  }
  if (!resyncTarget.value || !canSubmitResync.value || templateSetsLoadFailed.value) return
  resyncLoading.value = true
  try {
    await resyncArchiveTenantTemplateSet({
      templateSetCode: resyncTarget.value.templateSetCode,
      confirmSetCode: resyncConfirmCode.value.trim(),
    })
    message.success('模板集已重新同步')
    resyncOpen.value = false
    await refreshAll()
    await openEditDrawer(resyncTarget.value.templateSetCode)
  } catch (error) {
    showUserError(error, '重新同步模板集失败')
  } finally {
    resyncLoading.value = false
  }
}

async function saveTenantSet() {
  if (saving.value) {
    return
  }
  if (!selectedSetCode.value || templateSetsLoadFailed.value) return
  if (!editorMeta.examForm) {
    showFormValidationMessage('模板集缺少考核形式，无法保存')
    return
  }
  if (materialRows.value.length === 0) {
    showFormValidationMessage('至少保留一条材料目录项')
    return
  }
  if (selfCheckRows.value.length === 0) {
    showFormValidationMessage('至少保留一条自查项')
    return
  }
  if (editorMeta.defaultPermanentRetention !== true && editorMeta.defaultRetentionYears == null) {
    showFormValidationMessage('请填写保管年限或勾选永久')
    return
  }
  for (const row of materialRows.value) {
    if (!row.catalogName?.trim()) {
      showFormValidationMessage('材料目录名称不能为空')
      return
    }
  }
  const materialKeys = new Set<string>()
  for (const row of materialRows.value) {
    const key = materialKey(row.materialType, row.catalogCode?.trim())
    if (materialKeys.has(key)) {
      showFormValidationMessage(`材料目录项重复：${row.catalogName.trim()}`)
      return
    }
    materialKeys.add(key)
  }
  const selfCheckTexts = new Set<string>()
  for (const row of selfCheckRows.value) {
    if (!row.itemText?.trim()) {
      showFormValidationMessage('自查项文本不能为空')
      return
    }
    const itemText = row.itemText.trim()
    if (selfCheckTexts.has(itemText)) {
      showFormValidationMessage(`自查项重复：${itemText}`)
      return
    }
    selfCheckTexts.add(itemText)
  }
  saving.value = true
  try {
    await saveArchiveTenantTemplateSet({
      templateSetCode: selectedSetCode.value,
      templateSetName: editorMeta.templateSetName,
      examForm: editorMeta.examForm,
      defaultPermanentRetention: editorMeta.defaultPermanentRetention === true,
      defaultRetentionYears: editorMeta.defaultPermanentRetention
        ? undefined
        : editorMeta.defaultRetentionYears,
      materialItems: materialRows.value.map((item) => ({
        materialType: item.materialType,
        catalogCode: item.catalogCode?.trim() || undefined,
        catalogName: item.catalogName.trim(),
        requiredFlag: item.requiredFlag,
        delayAllowedFlag: item.delayAllowedFlag,
        sortOrder: item.sortOrder,
        deliveryMode: item.deliveryMode ?? ArchiveMaterialDeliveryModeCode.PHYSICAL_SCAN,
      })),
      selfCheckItems: selfCheckRows.value.map((item) => ({
        itemText: item.itemText.trim(),
        requiredFlag: item.requiredFlag,
        itemOrder: item.itemOrder,
      })),
    })
    message.success('模板集已保存')
    await loadTemplateSets()
    resetEditor()
  } catch (error) {
    showUserError(error, '保存模板集失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void refreshAll()
})
</script>

<style scoped>
.archive-template-sets-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}

.archive-template-sets-panel__tabs {
  margin-top: 16px;
}

.archive-template-sets-panel__copy-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--dp-space-3);
  padding: var(--dp-space-3) var(--dp-space-4);
  border-top: 1px solid var(--dp-border);
  background: var(--dp-surface-subtle);
}

.archive-template-sets-panel__copy-all {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  flex-wrap: wrap;
}

.archive-template-sets-panel__copy-all-label {
  font-size: 14px;
  color: var(--dp-color-text-secondary);
}

.archive-template-sets-panel__release {
  margin-right: var(--dp-space-2);
}

.archive-template-sets-panel__resync-alert {
  margin-bottom: var(--dp-space-3);
}

.archive-template-sets-panel__resync-form {
  margin-top: var(--dp-space-2);
}

.archive-template-sets-panel__audit-meta {
  margin: 0 0 var(--dp-space-3);
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.archive-template-editor__retention {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
