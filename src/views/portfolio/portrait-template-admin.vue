<script setup lang="ts">
import type { PortfolioPortraitTemplateVO } from '@/apis/portfolio/teacher-platform'
import type { PortfolioPortraitLayoutWidget } from '@/utils/portrait-layout'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { portfolioPortraitTemplateApi } from '@/apis/portfolio/teacher-platform'
import PortfolioPortraitLayoutEditor from '@/components/portfolio/PortfolioPortraitLayoutEditor.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import {
  defaultPortraitLayout,
  mergeChartConfigIntoWidgets,
  parsePortraitLayoutJson,
  serializePortraitChartConfig,
  serializePortraitLayout,
} from '@/utils/portrait-layout'

const loading = ref(false)
const templates = ref<PortfolioPortraitTemplateVO[]>([])
const selectedId = ref<string>()
const layoutWidgets = ref<PortfolioPortraitLayoutWidget[]>(defaultPortraitLayout())
const listRequestToken = ref(0)
const detailRequestToken = ref(0)
const form = reactive({
  templateName: '',
  academicYear: String(new Date().getFullYear()),
})

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
  try {
    const detail = await portfolioPortraitTemplateApi.get({ id })
    if (currentToken !== detailRequestToken.value || selectedId.value !== id) {
      return
    }
    form.templateName = detail.templateName
    form.academicYear = detail.academicYear ?? form.academicYear
    layoutWidgets.value = detail.layoutJson
      ? mergeChartConfigIntoWidgets(
          parsePortraitLayoutJson(detail.layoutJson),
          detail.chartConfigJson,
        )
      : defaultPortraitLayout()
  } catch (error) {
    showUserError(error, '加载画像模板详情失败')
  }
}

async function saveTemplate() {
  if (!form.templateName.trim()) {
    showFormValidationMessage('请填写模板名称')
    return
  }
  if (!layoutWidgets.value.length) {
    showFormValidationMessage('请至少添加一个布局组件')
    return
  }
  try {
    selectedId.value = await portfolioPortraitTemplateApi.save({
      id: selectedId.value,
      templateName: form.templateName.trim(),
      academicYear: form.academicYear,
      layoutJson: serializePortraitLayout(layoutWidgets.value),
      chartConfigJson: serializePortraitChartConfig(layoutWidgets.value),
    })
    message.success('画像模板已保存')
    await loadList()
  } catch (error) {
    showUserError(error, '保存画像模板失败')
  }
}

function newTemplate() {
  detailRequestToken.value += 1
  selectedId.value = undefined
  form.templateName = ''
  form.academicYear = String(new Date().getFullYear())
  layoutWidgets.value = defaultPortraitLayout()
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
        <a-spin :spinning="loading">
          <UiEmpty v-if="!loading && templates.length === 0" description="当前筛选无画像模板" />
          <ul v-else class="template-list">
            <li
              v-for="item in templates"
              :key="item.id"
              class="template-item"
              :class="{ 'template-item--active': item.id === selectedId }"
              @click="loadDetail(item.id)"
            >
              {{ item.templateName }}
              <span class="meta">{{ item.academicYear }}</span>
            </li>
          </ul>
        </a-spin>
        <UiButton style="margin-top: 12px" @click="newTemplate"> 新建模板 </UiButton>
      </UiCard>
      <UiCard title="布局编辑">
        <div class="form-row">
          <input v-model="form.templateName" class="input input--wide" placeholder="模板名称" />
          <input v-model="form.academicYear" class="input" placeholder="学年" />
        </div>
        <PortfolioPortraitLayoutEditor v-model:widgets="layoutWidgets" />
        <UiButton variant="primary" style="margin-top: 12px" @click="saveTemplate"> 保存 </UiButton>
      </UiCard>
    </div>
  </StageWorkbenchShell>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 16px;
}
.template-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.template-item {
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.template-item--active {
  background: var(--ant-color-fill-quaternary);
}
.meta {
  display: block;
  font-size: 12px;
  color: var(--dp-text-secondary);
}
.form-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.input {
  padding: 6px 8px;
  border: 1px solid var(--ant-color-border);
  border-radius: 4px;
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
