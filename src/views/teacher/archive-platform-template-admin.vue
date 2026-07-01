<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchivePlatformMaterialItemVO,
  ArchivePlatformTemplateSetSaveRequest,
  ArchivePlatformTemplateSetVO, ArchiveTemplateMaterialEditRow, ArchiveTemplateSelfCheckEditRow
} from '@/apis/mark/archive-platform-template'
import type { ArchiveExamFormCode } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  initializeArchivePlatformTemplateDefaults,
  listArchivePlatformTemplateSets,
  previewArchivePlatformTemplateSet,
  saveArchivePlatformTemplateSet,
} from '@/apis/mark/archive-platform-template'
import {
  archiveTemplateScopeLabel,
  archiveTemplateScopeTone,
} from '@/apis/mark/archive-template-scope'
import { ARCHIVE_EXAM_FORM_LABEL } from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiFormActions from '@/components/ui-guide/ui/UiFormActions.vue'
import UiFormSection from '@/components/ui-guide/ui/UiFormSection.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useAuthStore } from '@/stores/modules/auth'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveTemplateSetEditorDrawer from '@/views/teacher/archive-volume/components/ArchiveTemplateSetEditorDrawer.vue'
import ArchiveVolumeTemplateSetsPanel from '@/views/teacher/archive-volume/components/ArchiveVolumeTemplateSetsPanel.vue'

defineOptions({ name: 'ArchivePlatformTemplateAdminPage' })

const authStore = useAuthStore()
const isSuperAdmin = computed(() => authStore.isAdmin)

const pageTitle = '归档模板配置'

const platformSets = ref<ArchivePlatformTemplateSetVO[]>([])
const loading = ref(false)
const saving = ref(false)
const seeding = ref(false)
const detailLoading = ref(false)
const editorDrawerOpen = ref(false)
const editorSetCode = ref('')

const editorMeta = reactive({
  setCode: '',
  setName: '',
  examForm: 'WRITTEN_EXAM' as ArchiveExamFormCode,
  description: '',
  releaseTag: '',
})

const materialRows = ref<ArchiveTemplateMaterialEditRow[]>([])
const selfCheckRows = ref<ArchiveTemplateSelfCheckEditRow[]>([])

const editorDrawerTitle = computed(() =>
  editorSetCode.value ? `编辑模板：${editorSetCode.value}` : '新建模板套',
)

const examFormOptions = Object.entries(ARCHIVE_EXAM_FORM_LABEL).map(([value, label]) => ({
  value: value as ArchiveExamFormCode,
  label,
}))

const platformColumns: ColumnsType<ArchivePlatformTemplateSetVO> = [
  { title: '作用域', key: 'templateScope', width: 100, align: 'center' },
  { title: '套编码', dataIndex: 'setCode', key: 'setCode', width: 180 },
  { title: '名称', dataIndex: 'setName', key: 'setName', ellipsis: true },
  { title: '考核形式', key: 'examForm', width: 100 },
  { title: '发版标签', key: 'releaseTag', width: 120 },
  { title: '操作', key: 'actions', width: 100, align: 'center' },
]

function examFormLabel(code?: ArchiveExamFormCode) {
  if (!code) return '—'
  return strictEnumLabel(ARCHIVE_EXAM_FORM_LABEL, code, 'examForm')
}

function resetEditor() {
  editorDrawerOpen.value = false
  editorSetCode.value = ''
  editorMeta.setCode = ''
  editorMeta.setName = ''
  editorMeta.examForm = 'WRITTEN_EXAM'
  editorMeta.description = ''
  editorMeta.releaseTag = ''
  materialRows.value = []
  selfCheckRows.value = []
}

function openCreateEditor() {
  resetEditor()
  editorDrawerOpen.value = true
  editorMeta.releaseTag = new Date().toISOString().slice(0, 10)
}

function mapMaterialRow(item: ArchivePlatformMaterialItemVO, index: number): ArchiveTemplateMaterialEditRow {
  return {
    rowKey: `${item.materialType}-${index}`,
    materialType: item.materialType,
    catalogCode: item.catalogCode,
    catalogName: item.catalogName ?? '',
    requiredFlag: item.requiredFlag ?? false,
    sortOrder: item.sortOrder ?? index + 1,
    categoryGroup: item.categoryGroup,
  }
}

async function openEditEditor(setCode: string) {
  editorDrawerOpen.value = true
  detailLoading.value = true
  editorSetCode.value = setCode
  try {
    const preview = await previewArchivePlatformTemplateSet({ sourceSetCode: setCode })
    const set = preview.templateSet
    editorMeta.setCode = set.setCode
    editorMeta.setName = set.setName ?? ''
    editorMeta.examForm = set.examForm ?? 'WRITTEN_EXAM'
    editorMeta.description = set.description ?? ''
    editorMeta.releaseTag = set.releaseTag ?? ''
    materialRows.value = preview.materialItems.map((item, index) => mapMaterialRow(item, index))
    selfCheckRows.value = preview.selfCheckItems.map((item, index) => ({
      rowKey: `self-${index}`,
      itemText: item.itemText,
      requiredFlag: item.requiredFlag ?? false,
      sortOrder: item.sortOrder ?? index + 1,
    }))
  }
  catch (error) {
    resetEditor()
    showUserError(error, '加载模板详情失败')
  }
  finally {
    detailLoading.value = false
  }
}

async function loadPlatformSets() {
  loading.value = true
  try {
    platformSets.value = await listArchivePlatformTemplateSets()
  }
  catch (error) {
    platformSets.value = []
    showUserError(error, '加载平台模板失败')
  }
  finally {
    loading.value = false
  }
}

async function submitInitializeDefaults() {
  seeding.value = true
  try {
    const result = await initializeArchivePlatformTemplateDefaults()
    if (result.seeded) {
      message.success(`已写入默认模板，当前共 ${result.afterSetCount ?? 0} 套`)
    }
    else {
      message.info(`默认模板已存在，当前共 ${result.afterSetCount ?? 0} 套`)
    }
    await loadPlatformSets()
  }
  catch (error) {
    showUserError(error, '初始化默认模板失败')
  }
  finally {
    seeding.value = false
  }
}

async function submitSave() {
  const setCode = editorMeta.setCode.trim()
  const setName = editorMeta.setName.trim()
  const releaseTag = editorMeta.releaseTag.trim()
  if (!setCode || !setName || !releaseTag) {
    message.warning('请填写套编码、名称与发版标签')
    return
  }
  if (materialRows.value.length === 0 || selfCheckRows.value.length === 0) {
    message.warning('材料项与自查项均不能为空')
    return
  }
  const payload: ArchivePlatformTemplateSetSaveRequest = {
    setCode,
    setName,
    examForm: editorMeta.examForm,
    description: editorMeta.description.trim() || undefined,
    releaseTag,
    materialItems: materialRows.value.map(item => ({
      materialType: item.materialType,
      catalogCode: item.catalogCode?.trim() || undefined,
      catalogName: item.catalogName.trim(),
      requiredFlag: item.requiredFlag,
      sortOrder: item.sortOrder,
      categoryGroup: item.categoryGroup?.trim() || undefined,
    })),
    selfCheckItems: selfCheckRows.value.map(item => ({
      itemText: item.itemText.trim(),
      requiredFlag: item.requiredFlag,
      sortOrder: item.sortOrder,
    })),
  }
  saving.value = true
  try {
    await saveArchivePlatformTemplateSet(payload)
    message.success('平台模板已保存')
    await loadPlatformSets()
    resetEditor()
  }
  catch (error) {
    showUserError(error, '保存平台模板失败')
  }
  finally {
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
      <UiFormSection title="平台模板">
        <UiFormActions align="between">
          <span v-if="platformSets.length === 0" class="archive-platform-admin__hint">尚未配置任何平台模板</span>
          <span v-else class="archive-platform-admin__hint">共 {{ platformSets.length }} 套</span>
          <div class="archive-platform-admin__toolbar">
            <UiButton size="sm" :loading="seeding" @click="submitInitializeDefaults">初始化默认模板</UiButton>
            <UiButton size="sm" variant="primary" @click="openCreateEditor">新建模板套</UiButton>
          </div>
        </UiFormActions>
        <UiDataTable
          pagination-mode="none"
          :columns="platformColumns"
          :data-source="platformSets"
          :loading="loading"
          :show-pagination="false"
          flat
          row-key="setCode"
          size="middle"
          empty-description="暂无平台模板，请先初始化默认模板或新建"
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
              <UiTextAction tone="primary" @click="openEditEditor(record.setCode)">编辑</UiTextAction>
            </template>
          </template>
        </UiDataTable>
      </UiFormSection>

      <ArchiveTemplateSetEditorDrawer
        v-model:open="editorDrawerOpen"
        v-model:material-rows="materialRows"
        v-model:self-check-rows="selfCheckRows"
        :title="editorDrawerTitle"
        :loading="detailLoading"
        :saving="saving"
        mode="platform"
        save-label="保存模板"
        empty-description="暂无材料项与自查项，请先初始化默认模板"
        @save="submitSave"
        @cancel="resetEditor"
      >
        <template #meta>
          <div class="archive-template-editor__meta">
            <label class="archive-template-editor__field">
              <span>套编码</span>
              <a-input v-model:value="editorMeta.setCode" :disabled="!!editorSetCode" placeholder="如 PLATFORM_PAPER_FULL" />
            </label>
            <label class="archive-template-editor__field">
              <span>名称</span>
              <a-input v-model:value="editorMeta.setName" placeholder="模板套名称" />
            </label>
            <label class="archive-template-editor__field">
              <span>考核形式</span>
              <a-select v-model:value="editorMeta.examForm" :options="examFormOptions" style="width: 100%" />
            </label>
            <label class="archive-template-editor__field">
              <span>发版标签</span>
              <a-input v-model:value="editorMeta.releaseTag" placeholder="如 2026-06-30" />
            </label>
            <label class="archive-template-editor__field archive-template-editor__field--wide">
              <span>说明</span>
              <a-input v-model:value="editorMeta.description" placeholder="可选" />
            </label>
          </div>
        </template>
      </ArchiveTemplateSetEditorDrawer>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped>
.archive-platform-admin__hint {
  color: var(--dp-text-secondary, #64748b);
  font-size: 14px;
}
.archive-platform-admin__toolbar {
  display: flex;
  gap: 8px;
}
</style>
