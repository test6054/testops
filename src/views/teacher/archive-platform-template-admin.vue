<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchivePlatformMaterialItemResponse,
  ArchivePlatformTemplateSetResponse,
  ArchivePlatformTemplateSetSaveRequest,
} from '@/apis/mark/archive-platform-template'
import {
  listArchivePlatformTemplateSets,
  previewArchivePlatformTemplateSet,
  saveArchivePlatformTemplateSet,
} from '@/apis/mark/archive-platform-template'
import type {
  ArchiveTemplateMaterialEditRow,
  ArchiveTemplateSelfCheckEditRow,
} from '@/views/teacher/archive-volume/components/archive-template-editor-types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  archiveTemplateScopeLabel,
  archiveTemplateScopeTone,
} from '@/apis/mark/archive-template-scope'
import { ARCHIVE_EXAM_FORM_OPTIONS, ArchiveExamFormDescription } from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useAuthStore } from '@/stores/modules/auth'
import { ArchiveExamFormCode } from '@/types/enums/archive-exam-form-enum'
import { ArchiveMaterialDeliveryModeCode } from '@/types/enums/archive-material-delivery-mode-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveTemplateSetEditorDrawer from '@/views/teacher/archive-volume/components/ArchiveTemplateSetEditorDrawer.vue'
import ArchiveVolumeTemplateSetsPanel from '@/views/teacher/archive-volume/components/ArchiveVolumeTemplateSetsPanel.vue'

defineOptions({ name: 'ArchivePlatformTemplateAdminPage' })

const authStore = useAuthStore()
const isSuperAdmin = computed(() => authStore.isAdmin)

const pageTitle = '归档模板配置'

const platformSets = ref<ArchivePlatformTemplateSetResponse[]>([])
const loading = ref(false)
const loadFailed = ref(false)
const saving = ref(false)
const detailLoading = ref(false)
const editorDrawerOpen = ref(false)
const editorSetCode = ref('')

const editorMeta = reactive({
  setCode: '',
  setName: '',
  examForm: ArchiveExamFormCode.WRITTEN_EXAM,
  description: '',
  releaseTag: '',
  defaultPermanentRetention: false,
  defaultRetentionYears: undefined as number | undefined,
})

const materialRows = ref<ArchiveTemplateMaterialEditRow[]>([])
const selfCheckRows = ref<ArchiveTemplateSelfCheckEditRow[]>([])

const editorDrawerTitle = computed(() =>
  editorSetCode.value ? `编辑模板：${editorSetCode.value}` : '新建模板套',
)

const platformColumns: ColumnsType<ArchivePlatformTemplateSetResponse> = [
  { title: '作用域', key: 'templateScope', width: 100, align: 'center' },
  { title: '套编码', dataIndex: 'setCode', key: 'setCode', width: 180 },
  { title: '名称', dataIndex: 'setName', key: 'setName', ellipsis: true },
  { title: '考核形式', key: 'examForm', width: 100 },
  { title: '保管期限', key: 'retention', width: 100 },
  { title: '发版标签', key: 'releaseTag', width: 120 },
  { title: '操作', key: 'actions', width: 100, align: 'center' },
]

function examFormLabel(code?: ArchiveExamFormCode) {
  if (!code) return '—'
  return strictEnumLabel(ArchiveExamFormDescription, code, 'examForm')
}

function retentionLabel(record: ArchivePlatformTemplateSetResponse) {
  if (record.retentionPolicyLabel) return record.retentionPolicyLabel
  if (record.defaultPermanentRetention) return '永久'
  if (record.defaultRetentionYears != null) return `${record.defaultRetentionYears}年`
  return '—'
}

function resetEditor() {
  editorDrawerOpen.value = false
  editorSetCode.value = ''
  editorMeta.setCode = ''
  editorMeta.setName = ''
  editorMeta.examForm = ArchiveExamFormCode.WRITTEN_EXAM
  editorMeta.description = ''
  editorMeta.releaseTag = ''
  editorMeta.defaultPermanentRetention = false
  editorMeta.defaultRetentionYears = undefined
  materialRows.value = []
  selfCheckRows.value = []
}

function openCreateEditor() {
  // MVR-381：与 isSuperAdmin / BE requireSuperAdminPermission 二次拦截
  if (isSuperAdmin.value !== true) {
    void message.warning('仅平台超级管理员可维护平台归档模板库')
    return
  }
  if (loadFailed.value) return
  resetEditor()
  editorDrawerOpen.value = true
  editorMeta.releaseTag = new Date().toISOString().slice(0, 10)
}

function mapMaterialRow(
  item: ArchivePlatformMaterialItemResponse,
  index: number,
): ArchiveTemplateMaterialEditRow {
  return {
    rowKey: `${item.materialType}-${index}`,
    materialType: item.materialType,
    catalogCode: item.catalogCode,
    catalogName: item.catalogName ?? '',
    requiredFlag: item.requiredFlag ?? false,
    sortOrder: item.sortOrder ?? index + 1,
    categoryGroup: item.categoryGroup,
    deliveryMode: item.deliveryMode ?? ArchiveMaterialDeliveryModeCode.PHYSICAL_SCAN,
  }
}

async function openEditEditor(setCode: string) {
  // MVR-381：与 isSuperAdmin / BE requireSuperAdminPermission 二次拦截
  if (isSuperAdmin.value !== true) {
    void message.warning('仅平台超级管理员可维护平台归档模板库')
    return
  }
  editorDrawerOpen.value = true
  detailLoading.value = true
  editorSetCode.value = setCode
  try {
    const preview = await previewArchivePlatformTemplateSet({ sourceSetCode: setCode })
    const set = preview.templateSet
    editorMeta.setCode = set.setCode
    editorMeta.setName = set.setName ?? ''
    editorMeta.examForm = set.examForm ?? ArchiveExamFormCode.WRITTEN_EXAM
    editorMeta.description = set.description ?? ''
    editorMeta.releaseTag = set.releaseTag ?? ''
    editorMeta.defaultPermanentRetention = set.defaultPermanentRetention === true
    editorMeta.defaultRetentionYears = set.defaultRetentionYears
    materialRows.value = preview.materialItems.map((item, index) => mapMaterialRow(item, index))
    selfCheckRows.value = preview.selfCheckItems.map((item, index) => ({
      rowKey: `self-${index}`,
      itemText: item.itemText,
      requiredFlag: item.requiredFlag ?? false,
      sortOrder: item.sortOrder ?? index + 1,
    }))
  } catch (error) {
    resetEditor()
    showUserError(error, '加载模板详情失败')
  } finally {
    detailLoading.value = false
  }
}

async function loadPlatformSets() {
  loading.value = true
  try {
    platformSets.value = await listArchivePlatformTemplateSets()
    loadFailed.value = false
  } catch (error) {
    loadFailed.value = true
    showUserError(error, '加载平台模板失败')
  } finally {
    loading.value = false
  }
}

async function submitSave() {
  // MVR-317/429：与 BE requireSuperAdminPermission 二次拦截；仅认 isSuperAdmin === true
  if (isSuperAdmin.value !== true) {
    void message.warning('仅平台超级管理员可维护平台归档模板库')
    return
  }
  if (saving.value) {
    return
  }
  if (loadFailed.value) {
    showFormValidationMessage('请先重新加载平台模板')
    return
  }
  const setCode = editorMeta.setCode.trim()
  const setName = editorMeta.setName.trim()
  const releaseTag = editorMeta.releaseTag.trim()
  if (!setCode || !setName || !releaseTag) {
    showFormValidationMessage('请填写套编码、名称与发版标签')
    return
  }
  if (materialRows.value.length === 0 || selfCheckRows.value.length === 0) {
    void message.warning('材料项与自查项均不能为空')
    return
  }
  if (!editorMeta.defaultPermanentRetention && editorMeta.defaultRetentionYears == null) {
    showFormValidationMessage('请填写保管年限或勾选永久')
    return
  }
  const materialKeys = new Set<string>()
  for (const row of materialRows.value) {
    if (!row.catalogName?.trim()) {
      void message.warning('材料目录名称不能为空')
      return
    }
    const key = `${row.materialType}:${row.catalogCode?.trim() ?? ''}`
    if (materialKeys.has(key)) {
      void message.warning(`材料目录项重复：${row.catalogName.trim()}`)
      return
    }
    materialKeys.add(key)
  }
  const selfCheckTexts = new Set<string>()
  for (const row of selfCheckRows.value) {
    const itemText = row.itemText?.trim()
    if (!itemText) {
      void message.warning('自查项文本不能为空')
      return
    }
    if (selfCheckTexts.has(itemText)) {
      void message.warning(`自查项重复：${itemText}`)
      return
    }
    selfCheckTexts.add(itemText)
  }
  const payload: ArchivePlatformTemplateSetSaveRequest = {
    setCode,
    setName,
    examForm: editorMeta.examForm,
    description: editorMeta.description.trim() || undefined,
    releaseTag,
    defaultPermanentRetention: editorMeta.defaultPermanentRetention,
    defaultRetentionYears: editorMeta.defaultPermanentRetention
      ? undefined
      : editorMeta.defaultRetentionYears,
    materialItems: materialRows.value.map((item) => ({
      materialType: item.materialType,
      catalogCode: item.catalogCode?.trim() || undefined,
      catalogName: item.catalogName.trim(),
      requiredFlag: item.requiredFlag,
      sortOrder: item.sortOrder,
      categoryGroup: item.categoryGroup?.trim() || undefined,
      deliveryMode: item.deliveryMode ?? ArchiveMaterialDeliveryModeCode.PHYSICAL_SCAN,
    })),
    selfCheckItems: selfCheckRows.value.map((item) => ({
      itemText: item.itemText.trim(),
      requiredFlag: item.requiredFlag,
      sortOrder: item.sortOrder,
    })),
  }
  saving.value = true
  try {
    await saveArchivePlatformTemplateSet(payload)
    void message.success('平台模板已保存')
    await loadPlatformSets()
    resetEditor()
  } catch (error) {
    showUserError(error, '保存平台模板失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadPlatformSets)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar :title="pageTitle">
        <template v-if="isSuperAdmin" #status>
          <UiTag tone="blue" size="sm">平台模板</UiTag>
        </template>
      </ContextBar>
    </template>

    <ArchiveVolumeTemplateSetsPanel v-if="!isSuperAdmin" />

    <template v-else>
      <WorkbenchSurfaceCard flush class="archive-platform-admin__surface">
        <template #head>
          <h3 class="archive-platform-admin__title">平台模板</h3>
        </template>
        <template #toolbar>
          <div class="archive-platform-admin__toolbar-row">
            <span v-if="loadFailed" class="archive-platform-admin__hint">平台模板加载失败</span>
            <span v-else-if="platformSets.length === 0" class="archive-platform-admin__hint"
              >尚未配置任何平台模板</span
            >
            <span v-else class="archive-platform-admin__hint">共 {{ platformSets.length }} 套</span>
            <div class="archive-platform-admin__actions">
              <UiButton
                size="sm"
                variant="primary"
                :disabled="loadFailed || loading"
                @click="openCreateEditor"
              >
                新建模板套
              </UiButton>
            </div>
          </div>
        </template>

        <UiEmpty
          size="sm"
          v-if="loadFailed"
          description="平台模板加载失败"
          action-label="重新加载"
          @action="loadPlatformSets"
        />

        <UiDataTable
          v-else
          pagination-mode="none"
          :columns="platformColumns"
          :data-source="platformSets"
          :loading="loading"
          :show-pagination="false"
          flat
          row-key="setCode"
          size="middle"
          empty-description="暂无平台模板，请新建模板套"
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
                :items="[{ key: 'edit', label: '编辑' }]"
                split
                @action="() => openEditEditor(record.setCode)"
              />
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>

      <ArchiveTemplateSetEditorDrawer
        v-model:open="editorDrawerOpen"
        v-model:material-rows="materialRows"
        v-model:self-check-rows="selfCheckRows"
        :title="editorDrawerTitle"
        :loading="detailLoading"
        :saving="saving"
        mode="platform"
        save-label="保存模板"
        empty-description="暂无材料项与自查项"
        @save="submitSave"
        @cancel="resetEditor"
      >
        <template #meta>
          <div class="archive-template-editor__meta">
            <label class="archive-template-editor__field">
              <span>套编码</span>
              <UiInput
                size="sm"
                v-model="editorMeta.setCode"
                :disabled="!!editorSetCode"
                placeholder="如 PLATFORM_PAPER_FULL"
              />
            </label>
            <label class="archive-template-editor__field">
              <span>名称</span>
              <UiInput size="sm" v-model="editorMeta.setName" placeholder="模板套名称" />
            </label>
            <label class="archive-template-editor__field">
              <span>考核形式</span>
              <UiSelect
                size="sm"
                v-model="editorMeta.examForm"
                :options="ARCHIVE_EXAM_FORM_OPTIONS"
                style="width: 100%"
              />
            </label>
            <label class="archive-template-editor__field">
              <span>发版标签</span>
              <UiInput size="sm" v-model="editorMeta.releaseTag" placeholder="如 2026-06-30" />
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
            <label class="archive-template-editor__field archive-template-editor__field--wide">
              <span>说明</span>
              <UiInput size="sm" v-model="editorMeta.description" placeholder="可选" />
            </label>
          </div>
        </template>
      </ArchiveTemplateSetEditorDrawer>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped>
.archive-platform-admin__hint {
  color: var(--dp-text-secondary);
  font-size: 14px;
}
.archive-platform-admin__title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--dp-font-weight-title);
  line-height: 1.5;
}
.archive-platform-admin__toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
}
.archive-platform-admin__actions {
  display: flex;
  gap: 8px;
}
.archive-template-editor__retention {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
