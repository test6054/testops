<script setup lang="ts">
import type {
  PortfolioPortraitTemplateStatusCode,
  PortfolioPortraitTemplateVO,
} from '@/apis/portfolio/teacher-platform'
import type { PortfolioPortraitLayoutWidget } from '@/utils/portrait-layout'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  portfolioPortraitTemplateApi,
  PortfolioPortraitTemplateStatusDescription,
  PortfolioPortraitTemplateStatusCode as PortraitTemplateStatus,
} from '@/apis/portfolio/teacher-platform'
import PortfolioPortraitLayoutEditor from '@/components/portfolio/PortfolioPortraitLayoutEditor.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import {
  defaultPortraitLayout,
  mergeLayoutWithChartConfig,
  toPortraitChartConfigPayload,
  toPortraitLayoutPayload,
} from '@/utils/portrait-layout'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const templates = ref<PortfolioPortraitTemplateVO[]>([])
const saving = ref(false)
const statusUpdating = ref(false)
const selectedId = ref<string>()
const loadedTemplateId = ref<string>()
const currentTemplateStatus = ref<PortfolioPortraitTemplateStatusCode>()
const detailState = ref<'ready' | 'loading' | 'error'>('ready')
const layoutWidgets = ref<PortfolioPortraitLayoutWidget[]>(defaultPortraitLayout())
const listRequestToken = ref(0)
const detailRequestToken = ref(0)
const form = reactive({
  templateName: '',
  academicYear: String(new Date().getFullYear()),
})
const editorReady = computed(
  () =>
    !selectedId.value
    || (detailState.value === 'ready' && loadedTemplateId.value === selectedId.value),
)

async function loadList() {
  const currentToken = ++listRequestToken.value
  loading.value = true
  try {
    const nextTemplates = await portfolioPortraitTemplateApi.list()
    if (currentToken !== listRequestToken.value) {
      return
    }
    templates.value = nextTemplates
    if (selectedId.value && !templates.value.some((template) => template.id === selectedId.value)) {
      newTemplate()
    }
  } catch (error) {
    if (currentToken !== listRequestToken.value) {
      return
    }
    showUserError(error, '加载画像模板列表失败')
  } finally {
    if (currentToken === listRequestToken.value) {
      loading.value = false
    }
  }
}

async function loadDetail(id: string) {
  const currentToken = ++detailRequestToken.value
  selectedId.value = id
  loadedTemplateId.value = undefined
  currentTemplateStatus.value = undefined
  detailState.value = 'loading'
  form.templateName = ''
  form.academicYear = String(new Date().getFullYear())
  layoutWidgets.value = defaultPortraitLayout()
  try {
    const detail = await portfolioPortraitTemplateApi.get({ id })
    if (currentToken !== detailRequestToken.value || selectedId.value !== id) {
      return
    }
    form.templateName = detail.templateName
    form.academicYear = detail.academicYear ?? form.academicYear
    if (!detail.templateStatus) {
      loadedTemplateId.value = undefined
      currentTemplateStatus.value = undefined
      detailState.value = 'error'
      showUserError(null, '画像模板状态缺失，请重新加载')
      return
    }
    currentTemplateStatus.value = detail.templateStatus
    layoutWidgets.value = detail.layout?.length
      ? mergeLayoutWithChartConfig(detail.layout, detail.chartConfig)
      : defaultPortraitLayout()
    loadedTemplateId.value = id
    detailState.value = 'ready'
  } catch (error) {
    if (currentToken !== detailRequestToken.value || selectedId.value !== id) {
      return
    }
    loadedTemplateId.value = undefined
    currentTemplateStatus.value = undefined
    detailState.value = 'error'
    showUserError(error, '加载画像模板详情失败')
  }
}

async function saveTemplate() {
  if (saving.value) {
    return
  }
  if (!editorReady.value) {
    showFormValidationMessage('当前模板详情尚未就绪，请重新加载后再保存')
    return
  }
  if (!form.templateName.trim()) {
    showFormValidationMessage('请填写模板名称')
    return
  }
  if (!layoutWidgets.value.length) {
    showFormValidationMessage('请至少添加一个布局组件')
    return
  }
  const templateId = selectedId.value
  if (templateId && !currentTemplateStatus.value) {
    showUserError(null, '当前模板状态未就绪，已禁止保存，请重新加载后再试')
    return
  }
  saving.value = true
  try {
    const savedId = await portfolioPortraitTemplateApi.save({
      id: templateId,
      templateName: form.templateName.trim(),
      academicYear: form.academicYear,
      layout: toPortraitLayoutPayload(layoutWidgets.value),
      chartConfig: toPortraitChartConfigPayload(layoutWidgets.value),
    })
    selectedId.value = savedId
    void message.success('画像模板已保存')
    await loadList()
    await loadDetail(savedId)
  } catch (error) {
    showUserError(error, '保存画像模板失败')
  } finally {
    saving.value = false
  }
}

function newTemplate() {
  if (saving.value) {
    return
  }
  detailRequestToken.value += 1
  selectedId.value = undefined
  loadedTemplateId.value = undefined
  currentTemplateStatus.value = PortraitTemplateStatus.DRAFT
  detailState.value = 'ready'
  form.templateName = ''
  form.academicYear = String(new Date().getFullYear())
  layoutWidgets.value = defaultPortraitLayout()
}

/** 模板保存期间冻结列表选择，避免保存上下文与编辑对象分离。 */
function selectTemplate(id: string) {
  if (!saving.value && !statusUpdating.value) {
    void loadDetail(id)
  }
}

/** 通过独立状态动作启用或停用模板，普通布局保存不得改变发布状态。 */
async function changeTemplateStatus(targetStatus: PortfolioPortraitTemplateStatusCode) {
  if (
    !selectedId.value
    || !editorReady.value
    || !currentTemplateStatus.value
    || saving.value
    || statusUpdating.value
  ) {
    return
  }
  const templateId = selectedId.value
  const actionLabel = targetStatus === PortraitTemplateStatus.ACTIVE ? '启用' : '停用'
  const confirmed = await confirmAsync({
    content:
      targetStatus === PortraitTemplateStatus.ACTIVE
        ? '确认启用当前画像模板？启用后该模板可进入正式画像展示链。'
        : '确认停用当前画像模板？停用后该模板不再用于正式画像展示。',
    type: targetStatus === PortraitTemplateStatus.INACTIVE ? 'error' : undefined,
  })
  if (!confirmed) {
    return
  }
  statusUpdating.value = true
  try {
    if (targetStatus === PortraitTemplateStatus.ACTIVE) {
      await portfolioPortraitTemplateApi.activate({ id: templateId })
    } else {
      await portfolioPortraitTemplateApi.deactivate({ id: templateId })
    }
    void message.success(`画像模板已${actionLabel}`)
    await loadDetail(templateId)
    await loadList()
  } catch (error) {
    showUserError(error, `${actionLabel}画像模板失败`)
  } finally {
    statusUpdating.value = false
  }
}

onMounted(loadList)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="画像模板设置" />
    </template>
    <div class="layout">
      <UiCard title="模板列表" class="list">
        <UiSpin :spinning="loading">
          <UiEmpty
            size="sm"
            v-if="!loading && templates.length === 0"
            description="当前筛选无画像模板"
          />
          <ul v-else class="template-list">
            <li
              v-for="item in templates"
              :key="item.id"
              class="template-item"
              :class="{ 'template-item--active': item.id === selectedId }"
              @click="selectTemplate(item.id)"
            >
              {{ item.templateName }}
              <span class="meta">
                {{ item.academicYear }}
                <UiTag v-if="item.templateStatus" size="sm">
                  {{
                    strictEnumLabel(
                      PortfolioPortraitTemplateStatusDescription,
                      item.templateStatus,
                      '画像模板状态',
                    )
                  }}
                </UiTag>
              </span>
            </li>
          </ul>
        </UiSpin>
        <UiButton
          size="sm"
          variant="primary"
          style="margin-top: 12px"
          :disabled="saving || statusUpdating"
          @click="newTemplate"
        >
          新建模板
        </UiButton>
      </UiCard>
      <UiCard title="布局编辑">
        <UiSpin v-if="detailState === 'loading'" :spinning="true" />
        <UiEmpty
          v-else-if="detailState === 'error'"
          size="sm"
          description="模板详情加载失败，当前内容不可编辑"
        >
          <template #action>
            <UiButton v-if="selectedId" size="sm" variant="outline" @click="loadDetail(selectedId)">
              重新加载
            </UiButton>
          </template>
        </UiEmpty>
        <template v-else>
          <div class="form-row">
            <input v-model="form.templateName" class="input input--wide" placeholder="模板名称" />
            <input v-model="form.academicYear" class="input" placeholder="学年" />
            <UiTag v-if="currentTemplateStatus" size="sm">
              {{
                strictEnumLabel(
                  PortfolioPortraitTemplateStatusDescription,
                  currentTemplateStatus,
                  '画像模板状态',
                )
              }}
            </UiTag>
          </div>
          <PortfolioPortraitLayoutEditor v-model:widgets="layoutWidgets" />
          <UiButton
            size="sm"
            variant="primary"
            style="margin-top: 12px"
            :loading="saving"
            :disabled="saving || statusUpdating || !editorReady"
            @click="saveTemplate"
          >
            保存
          </UiButton>
          <UiButton
            v-if="selectedId && currentTemplateStatus !== PortraitTemplateStatus.ACTIVE"
            size="sm"
            variant="outline"
            style="margin: 12px 0 0 8px"
            :loading="statusUpdating"
            :disabled="saving || statusUpdating"
            @click="changeTemplateStatus(PortraitTemplateStatus.ACTIVE)"
          >
            启用
          </UiButton>
          <UiButton
            v-if="selectedId && currentTemplateStatus === PortraitTemplateStatus.ACTIVE"
            size="sm"
            variant="outline"
            style="margin: 12px 0 0 8px"
            :loading="statusUpdating"
            :disabled="saving || statusUpdating"
            @click="changeTemplateStatus(PortraitTemplateStatus.INACTIVE)"
          >
            停用
          </UiButton>
        </template>
      </UiCard>
    </div>
  </StageWorkbenchShell>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: var(--dp-space-3, 12px);
}
.template-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.template-item {
  padding: 8px;
  border-radius: var(--dp-radius-xs);
  cursor: pointer;
  font-size: var(--dp-font-size-md);
}
.template-item--active {
  background: var(--dp-fill-quaternary);
}
.meta {
  display: block;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}
.form-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.input {
  padding: 6px 8px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-xs);
}
.input--wide {
  flex: 1;
}
@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
