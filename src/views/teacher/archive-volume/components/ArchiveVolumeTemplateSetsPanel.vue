<template>
  <div class="archive-template-sets-panel">
    <UiAlertStrip
      v-if="!canManageConfig"
      tone="warning"
      title="当前账号仅可查看"
      description="复制平台模板与维护本校模板须租户管理员权限。"
      dense
    />

    <UiSectionTabs
      v-model="activeScopeTab"
      :items="scopeTabItems"
      compact
      class="archive-template-sets-panel__tabs"
    />

    <section v-if="activeScopeTab === 'PLATFORM'" class="archive-template-sets-panel__section">
      <WorkbenchSurfaceCard flush>
        <UiDataTable
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
            <template v-else-if="column.key === 'releaseTag'">
              <UiTag v-if="record.releaseTag" tone="blue" size="sm">{{ record.releaseTag }}</UiTag>
              <span v-else>—</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction tone="primary" @click="openPlatformTemplate(record)">
                {{ findTenantSetByPlatformSource(record.templateSetCode) ? '编辑' : '预览' }}
              </UiTextAction>
              <UiTextAction
                v-if="canManageConfig && !findTenantSetByPlatformSource(record.templateSetCode)"
                tone="primary"
                @click="openCopyModal(record)"
              >
                复制到本校
              </UiTextAction>
            </template>
          </template>
        </UiDataTable>
        <div v-if="canManageConfig" class="archive-template-sets-panel__copy-bar">
          <div class="archive-template-sets-panel__copy-all">
            <span class="archive-template-sets-panel__copy-all-label">目标前缀</span>
            <a-input
              v-model:value="copyAllPrefix"
              placeholder="如 DEFAULT_"
              style="width: 160px"
              :disabled="copyAllLoading"
            />
            <a-checkbox v-model:checked="copyAllOverride">覆盖已存在</a-checkbox>
          </div>
          <UiButton size="sm" variant="primary" :loading="copyAllLoading" @click="submitCopyAll">
            一键复制全部模板
          </UiButton>
        </div>
      </WorkbenchSurfaceCard>
    </section>

    <section v-else class="archive-template-sets-panel__section">
      <WorkbenchSurfaceCard flush>
        <UiDataTable
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
            <template v-else-if="column.key === 'release'">
              <span v-if="record.forkSourceReleaseTag" class="archive-template-sets-panel__release">
                {{ record.forkSourceReleaseTag }}
              </span>
              <span v-else>—</span>
              <UiTag v-if="canResyncTenantSet(record)" tone="orange" size="sm">可重新同步</UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction v-if="canManageConfig" tone="primary" @click.stop="openEditDrawer(record.templateSetCode)">编辑</UiTextAction>
              <UiTextAction
                v-if="canManageConfig && canResyncTenantSet(record)"
                tone="primary"
                @click.stop="openResyncModal(record)"
              >
                重新同步
              </UiTextAction>
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
            <a-input :value="selectedSetCode" disabled />
          </label>
          <label class="archive-template-editor__field">
            <span>名称</span>
            <a-input v-model:value="editorMeta.templateSetName" />
          </label>
          <label class="archive-template-editor__field">
            <span>考核形式</span>
            <a-input :value="examFormLabel(editorMeta.examForm)" disabled />
          </label>
          <label class="archive-template-editor__field">
            <span>来源模板</span>
            <a-input :value="editorMeta.forkSourceSetCode || '—'" disabled />
          </label>
        </div>
      </template>
    </ArchiveTemplateSetEditorDrawer>

    <UiDrawer
      :open="previewOpen"
      :title="previewTitle"
      :width="720"
      hide-footer
      @update:open="(v: boolean) => (previewOpen = v)"
      @close="previewOpen = false"
    >
      <UiSkeletonState v-if="previewLoading" variant="card" compact />
      <template v-else-if="previewData">
        <p v-if="previewData.templateSet.description" class="archive-template-sets-panel__preview-desc">
          {{ previewData.templateSet.description }}
        </p>
        <h4 class="archive-template-sets-panel__subsection">材料目录（{{ previewData.materialItems.length }} 项）</h4>
        <div
          v-for="group in previewGroupedMaterials"
          :key="group.groupName"
          class="archive-template-sets-panel__preview-group"
        >
          <div class="archive-template-sets-panel__group-title">{{ group.groupName }}</div>
          <ul class="archive-template-sets-panel__preview-list">
            <li v-for="item in group.items" :key="`${item.materialType}-${item.catalogCode}`">
              {{ item.catalogName }}
              <UiTag v-if="item.requiredFlag" tone="orange" size="sm">建议必交</UiTag>
            </li>
          </ul>
        </div>
        <h4 class="archive-template-sets-panel__subsection">自查项（{{ previewData.selfCheckItems.length }} 项）</h4>
        <ul class="archive-template-sets-panel__preview-list">
          <li v-for="(item, index) in previewData.selfCheckItems" :key="index">
            {{ item.itemText }}
          </li>
        </ul>
      </template>
    </UiDrawer>

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
      <a-form layout="vertical">
        <a-form-item label="平台模板套">
          <a-input :value="copySource?.templateSetName" disabled />
        </a-form-item>
        <a-form-item label="目标租户套编码" required>
          <a-input v-model:value="copyTargetSetCode" placeholder="如 PAPER_TYUT_2025" />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model:checked="copyOverride">覆盖已存在的同名套</a-checkbox>
        </a-form-item>
      </a-form>
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
        description="操作前系统会备份快照；若已有归档卷引用该套模板，同步将被拒绝。请确认影响范围后再继续。"
        dense
        class="archive-template-sets-panel__resync-alert"
      />
      <a-form layout="vertical" class="archive-template-sets-panel__resync-form">
        <a-form-item label="模板集编码">
          <a-input :value="resyncTarget?.templateSetCode" disabled />
        </a-form-item>
        <a-form-item label="二次确认：请输入模板集编码" required>
          <a-input
            v-model:value="resyncConfirmCode"
            placeholder="输入上方编码以确认"
          />
        </a-form-item>
      </a-form>
      <template #footer>
        <UiButton variant="outline" @click="resyncOpen = false">取消</UiButton>
        <UiButton :loading="resyncLoading" :disabled="!canSubmitResync" @click="submitResync">
          确认同步
        </UiButton>
      </template>
    </UiDrawer>
  </div>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchivePlatformMaterialItemResponse,
  ArchivePlatformTemplatePreviewResponse,
  ArchiveTenantTemplateSetResponse,
} from '@/apis/mark/archive-platform-template'
import type {
  ArchiveExamFormCode,
} from '@/apis/mark/archive-volume'
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
  previewArchivePlatformTemplateSet,
  resyncArchiveTenantTemplateSet,
  saveArchiveTenantTemplateSet,
} from '@/apis/mark/archive-platform-template'
import {
  ArchiveTemplateScopeCode,
  archiveTemplateScopeLabel,
  archiveTemplateScopeTone,
} from '@/apis/mark/archive-template-scope'
import {
  ArchiveExamFormDescription,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveTemplateSetEditorDrawer from '@/views/teacher/archive-volume/components/ArchiveTemplateSetEditorDrawer.vue'

defineOptions({ name: 'ArchiveVolumeTemplateSetsPanel' })

const { canManageConfig, loadGrants } = useArchiveDutyAccess()

const activeScopeTab = ref<ArchiveTemplateScopeCode>(ArchiveTemplateScopeCode.PLATFORM)
const scopeTabItems = [
  { key: ArchiveTemplateScopeCode.PLATFORM, label: '平台模板（只读）' },
  { key: ArchiveTemplateScopeCode.TENANT, label: '本校模板（可维护）' },
]
const templateSets = ref<ArchiveTenantTemplateSetResponse[]>([])
const templateSetsLoading = ref(false)
const platformSets = computed(() => templateSets.value.filter(item => item.templateScope === 'PLATFORM'))
const tenantSets = computed(() => templateSets.value.filter(item => item.templateScope === 'TENANT'))
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
const previewData = ref<ArchivePlatformTemplatePreviewResponse | null>(null)
const categoryGroupMap = ref<Map<string, string>>(new Map())
const materialRows = ref<ArchiveTemplateMaterialEditRow[]>([])
const selfCheckRows = ref<ArchiveTemplateSelfCheckEditRow[]>([])
interface ArchiveVolumeTemplateEditorMeta {
  templateSetName: string
  examForm?: ArchiveExamFormCode
  forkSourceSetCode?: string
}

const editorMeta = reactive<ArchiveVolumeTemplateEditorMeta>({
  templateSetName: '',
  forkSourceSetCode: undefined,
})

const platformColumns: ColumnsType<ArchiveTenantTemplateSetResponse> = [
  { title: '作用域', key: 'templateScope', width: 100, align: 'center' },
  { title: '模板编码', dataIndex: 'templateSetCode', key: 'templateSetCode', width: 180 },
  { title: '名称', dataIndex: 'templateSetName', key: 'templateSetName', width: 160 },
  { title: '考核形式', key: 'examForm', width: 100 },
  { title: '发版标签', key: 'releaseTag', width: 120 },
  { title: '操作', key: 'actions', width: 140 },
]

const tenantColumns: ColumnsType<ArchiveTenantTemplateSetResponse> = [
  { title: '作用域', key: 'templateScope', width: 100, align: 'center' },
  { title: '套编码', dataIndex: 'templateSetCode', key: 'templateSetCode', width: 180 },
  { title: '名称', dataIndex: 'templateSetName', key: 'templateSetName', width: 160 },
  { title: '考核形式', key: 'examForm', width: 100 },
  { title: '来源模板', dataIndex: 'forkSourceSetCode', key: 'forkSourceSetCode', width: 160 },
  { title: '发版标签', key: 'release', width: 180 },
  { title: '操作', key: 'actions', width: 160 },
]

const editorDrawerTitle = computed(() =>
  selectedSetCode.value ? `编辑本校模板：${editorMeta.templateSetName || selectedSetCode.value}` : '编辑本校模板',
)

const previewTitle = computed(() =>
  previewData.value ? `模板预览：${previewData.value.templateSet.setName}` : '模板预览',
)

function resetEditor() {
  editorDrawerOpen.value = false
  selectedSetCode.value = ''
  editorMeta.templateSetName = ''
  editorMeta.examForm = undefined
  editorMeta.forkSourceSetCode = undefined
  materialRows.value = []
  selfCheckRows.value = []
  categoryGroupMap.value = new Map()
}

const previewGroupedMaterials = computed(() =>
  groupPlatformMaterials(previewData.value?.materialItems ?? []),
)

const canSubmitResync = computed(() => {
  if (!resyncTarget.value) return false
  return resyncConfirmCode.value.trim() === resyncTarget.value.templateSetCode
})

function materialKey(materialType: string, catalogCode?: string) {
  return `${materialType}:${catalogCode ?? ''}`
}

function groupPlatformMaterials(items: ArchivePlatformMaterialItemResponse[]) {
  const groups = new Map<string, ArchivePlatformMaterialItemResponse[]>()
  for (const item of items) {
    const groupName = item.categoryGroup?.trim() || '未分组'
    const bucket = groups.get(groupName) ?? []
    bucket.push(item)
    groups.set(groupName, bucket)
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
    .map(([groupName, groupItems]) => ({
      groupName,
      items: [...groupItems].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }))
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

function platformReleaseTag(setCode?: string) {
  if (!setCode) return undefined
  return platformSets.value.find(item => item.templateSetCode === setCode)?.releaseTag
}

async function loadTemplateSets() {
  templateSetsLoading.value = true
  try {
    templateSets.value = await listArchiveTenantTemplateSets()
  }
  catch (error) {
    templateSets.value = []
    showUserError(error, '加载归档模板套失败')
  }
  finally {
    templateSetsLoading.value = false
  }
}

async function refreshAll() {
  await loadTemplateSets()
}

async function openReadOnlyPreview(templateSetCode: string) {
  previewOpen.value = true
  previewLoading.value = true
  previewData.value = null
  try {
    const detail = await getArchiveTenantTemplateSetDetail({ templateSetCode })
    previewData.value = {
      templateSet: {
        setCode: detail.templateSetCode,
        setName: detail.templateSetName,
        examForm: detail.examForm,
        templateScope: detail.templateScope,
        releaseTag: detail.releaseTag,
      },
      materialItems: (detail.materialItems ?? []).map(item => ({
        materialType: item.materialType,
        catalogCode: item.catalogCode,
        catalogName: item.catalogName,
        requiredFlag: item.requiredFlag,
        sortOrder: item.sortOrder,
      })),
      selfCheckItems: (detail.selfCheckItems ?? []).map(item => ({
        itemText: item.itemText,
        requiredFlag: item.requiredFlag,
        sortOrder: item.itemOrder,
      })),
    }
  }
  catch (error) {
    previewOpen.value = false
    showUserError(error, '加载模板预览失败')
  }
  finally {
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
  }
  catch {
    categoryGroupMap.value = new Map()
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
    await loadCategoryGroups(detail.forkSourceSetCode)
    materialRows.value = (detail.materialItems ?? []).map((item, index) => ({
      rowKey: item.templateItemId ?? `material-${index}`,
      materialType: item.materialType,
      catalogCode: item.catalogCode,
      catalogName: item.catalogName ?? '',
      requiredFlag: item.requiredFlag ?? false,
      delayAllowedFlag: item.delayAllowedFlag ?? false,
      sortOrder: item.sortOrder ?? index + 1,
    }))
    selfCheckRows.value = (detail.selfCheckItems ?? []).map((item, index) => ({
      rowKey: item.selfCheckItemId ?? `self-check-${index}`,
      itemText: item.itemText,
      requiredFlag: item.requiredFlag ?? false,
      itemOrder: item.itemOrder ?? index + 1,
    }))
  }
  catch (error) {
    resetEditor()
    showUserError(error, '加载模板集详情失败')
  }
  finally {
    detailLoading.value = false
  }
}

async function openEditDrawer(templateSetCode: string) {
  editorDrawerOpen.value = true
  await loadTenantSetDetail(templateSetCode)
}

function findTenantSetByPlatformSource(sourceSetCode: string) {
  return templateSets.value.find(item => item.templateScope === 'TENANT' && item.forkSourceSetCode === sourceSetCode)
    ?? templateSets.value.find(item => item.templateScope === 'TENANT' && item.templateSetCode === sourceSetCode)
}

/** 模板套入口：本校副本可编辑；平台母版引导复制后编辑。 */
async function openPlatformTemplate(record: ArchiveTenantTemplateSetResponse) {
  const tenantSet = findTenantSetByPlatformSource(record.templateSetCode)
  if (tenantSet) {
    await openEditDrawer(tenantSet.templateSetCode)
    return
  }
  if (canManageConfig.value) {
    openCopyModal(record, record.templateSetCode)
    message.info('保存为本校模板后可编辑，请确认目标编码')
    return
  }
  await openReadOnlyPreview(record.templateSetCode)
}

function openCopyModal(record: ArchiveTenantTemplateSetResponse, defaultTargetSetCode = '') {
  copySource.value = record
  copyTargetSetCode.value = defaultTargetSetCode
  copyOverride.value = false
  copyOpen.value = true
}

async function submitCopy() {
  if (!copySource.value) return
  const targetSetCode = copyTargetSetCode.value.trim()
  if (!targetSetCode) {
    message.warning('请填写目标租户套编码')
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
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    copyLoading.value = false
  }
}

async function submitCopyAll() {
  const targetPrefix = copyAllPrefix.value.trim()
  if (!targetPrefix) {
    message.warning('请填写目标前缀')
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
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    copyAllLoading.value = false
  }
}

function openResyncModal(record: ArchiveTenantTemplateSetResponse) {
  resyncTarget.value = record
  resyncConfirmCode.value = ''
  resyncOpen.value = true
}

async function submitResync() {
  if (!resyncTarget.value || !canSubmitResync.value) return
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
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    resyncLoading.value = false
  }
}

async function saveTenantSet() {
  if (!selectedSetCode.value) return
  if (!editorMeta.examForm) {
    message.warning('模板集缺少考核形式，无法保存')
    return
  }
  if (materialRows.value.length === 0) {
    message.warning('至少保留一条材料目录项')
    return
  }
  if (selfCheckRows.value.length === 0) {
    message.warning('至少保留一条自查项')
    return
  }
  for (const row of materialRows.value) {
    if (!row.catalogName?.trim()) {
      message.warning('材料目录名称不能为空')
      return
    }
  }
  for (const row of selfCheckRows.value) {
    if (!row.itemText?.trim()) {
      message.warning('自查项文本不能为空')
      return
    }
  }
  saving.value = true
  try {
    await saveArchiveTenantTemplateSet({
      templateSetCode: selectedSetCode.value,
      templateSetName: editorMeta.templateSetName,
      examForm: editorMeta.examForm,
      materialItems: materialRows.value.map((item) => ({
        materialType: item.materialType,
        catalogCode: item.catalogCode?.trim() || undefined,
        catalogName: item.catalogName.trim(),
        requiredFlag: item.requiredFlag,
        delayAllowedFlag: item.delayAllowedFlag,
        sortOrder: item.sortOrder,
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
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadGrants()
  void refreshAll()
})
</script>

<style scoped>
.archive-template-sets-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-template-sets-panel__tabs {
  margin-top: 16px;
}

.archive-template-sets-panel__copy-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--dp-space-3, 12px);
  padding: var(--dp-space-4, 16px) var(--dp-space-5, 20px);
  border-top: 1px solid var(--dp-border, #e2e8f0);
  background: var(--dp-surface-subtle, #f8fafc);
}

.archive-template-sets-panel__copy-all {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  flex-wrap: wrap;
}

.archive-template-sets-panel__copy-all-label {
  font-size: 14px;
  color: var(--dp-color-text-secondary, #666);
}

.archive-template-sets-panel__release {
  margin-right: var(--dp-space-2, 8px);
}

.archive-template-sets-panel__subsection {
  margin: var(--dp-space-4, 16px) 0 var(--dp-space-2, 8px);
  font-size: 14px;
  font-weight: 600;
}

.archive-template-sets-panel__preview-desc {
  margin: 0 0 var(--dp-space-3, 12px);
  color: var(--dp-text-secondary, #64748b);
  font-size: 14px;
}

.archive-template-sets-panel__preview-group {
  margin-bottom: var(--dp-space-3, 12px);
}

.archive-template-sets-panel__preview-list {
  margin: 0;
  padding-left: 1.25em;
  font-size: 14px;
  line-height: 1.6;
}

.archive-template-sets-panel__resync-alert {
  margin-bottom: var(--dp-space-3, 12px);
}

.archive-template-sets-panel__resync-form {
  margin-top: var(--dp-space-2, 8px);
}
</style>
