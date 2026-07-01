<script setup lang="ts">
import type { PortfolioPortraitTemplateVO } from '@/apis/portfolio/teacher-platform'
import { portfolioPortraitTemplateApi } from '@/apis/portfolio/teacher-platform'
import type { PortfolioPortraitLayoutWidget } from '@/utils/portrait-layout'
import {
  defaultPortraitLayout,
  mergeChartConfigIntoWidgets,
  parsePortraitLayoutJson,
  serializePortraitChartConfig,
  serializePortraitLayout,
} from '@/utils/portrait-layout'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import PortfolioPortraitLayoutEditor from '@/components/portfolio/PortfolioPortraitLayoutEditor.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'

const loading = ref(false)
const templates = ref<PortfolioPortraitTemplateVO[]>([])
const selectedId = ref<string>()
const layoutWidgets = ref<PortfolioPortraitLayoutWidget[]>(defaultPortraitLayout())
const form = reactive({
  templateName: '',
  academicYear: String(new Date().getFullYear()),
})

async function loadList() {
  loading.value = true
  try {
    templates.value = await portfolioPortraitTemplateApi.list()
    if (!selectedId.value && templates.value.length) {
      selectedId.value = templates.value[0].id
      await loadDetail(selectedId.value)
    }
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadDetail(id: string) {
  selectedId.value = id
  try {
    const detail = await portfolioPortraitTemplateApi.get({ id })
    form.templateName = detail.templateName
    form.academicYear = detail.academicYear ?? form.academicYear
    layoutWidgets.value = detail.layoutJson
      ? mergeChartConfigIntoWidgets(
          parsePortraitLayoutJson(detail.layoutJson),
          detail.chartConfigJson,
        )
      : defaultPortraitLayout()
  } catch (error) {
    showUserError(error)
  }
}

async function saveTemplate() {
  if (!form.templateName.trim()) {
    message.warning('请填写模板名称')
    return
  }
  if (!layoutWidgets.value.length) {
    message.warning('请至少添加一个布局组件')
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
    showUserError(error)
  }
}

function newTemplate() {
  selectedId.value = undefined
  form.templateName = ''
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
