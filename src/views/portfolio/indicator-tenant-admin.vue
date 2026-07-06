<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PfIndicatorStatusCode,
  PfModelStatusCode,
  PortfolioIndustryPackVO,
  PortfolioTenantIndicatorConfigVO,
} from '@/apis/portfolio/indicator-types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  portfolioIndicatorPlatformApi,
  portfolioIndicatorTenantApi,
} from '@/apis/portfolio/indicator'
import {
  PF_SCENE_CODE_OPTIONS,
  PfIndicatorStatusDescription,
  PfModelStatusDescription,
  PfSceneCode,
  PfSceneCodeDescription,
} from '@/apis/portfolio/indicator-types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioIndicatorExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

function modelStatusLabel(value: PfModelStatusCode): string {
  return strictEnumLabel(PfModelStatusDescription, value, '场景模型状态')
}

function indicatorStatusLabel(value: PfIndicatorStatusCode): string {
  return strictEnumLabel(PfIndicatorStatusDescription, value, '指标状态')
}

const router = useRouter()
const activeTab = ref('config')
const sceneCode = ref<PfSceneCode>(PfSceneCode.PERFORMANCE)
const loading = ref(false)
const saving = ref(false)
const trialing = ref(false)
const freezing = ref(false)
const enabling = ref(false)
const binding = ref(false)
const configFilter = ref('')
const configRows = ref<PortfolioTenantIndicatorConfigVO[]>([])
const industryPacks = ref<PortfolioIndustryPackVO[]>([])
const bindForm = reactive({ packCode: '', majorGroupCode: '', majorGroupName: '', enabled: true })
const model = ref<Awaited<ReturnType<typeof portfolioIndicatorTenantApi.getModel>> | null>(null)
const editDrawerOpen = ref(false)
const editForm = reactive<{
  indicatorCode: string
  indicatorName: string
  enabled: boolean
  standardScore?: number
  capScore?: number
  applicableScenes: string
}>({
  indicatorCode: '',
  indicatorName: '',
  enabled: true,
  standardScore: undefined,
  capScore: undefined,
  applicableScenes: '',
})

const sceneLabel = computed(() => PfSceneCodeDescription[sceneCode.value])

const filteredConfigs = computed(() => {
  const keyword = configFilter.value.trim().toLowerCase()
  if (!keyword) {
    return configRows.value
  }
  return configRows.value.filter(
    (row) =>
      row.indicatorCode.toLowerCase().includes(keyword)
      || row.indicatorName.toLowerCase().includes(keyword),
  )
})

const configColumns: ColumnsType = [
  { title: '编码', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 88 },
  { title: '名称', dataIndex: 'indicatorName', key: 'indicatorName' },
  { title: '启用', key: 'enabled', width: 72 },
  { title: '标准分', dataIndex: 'standardScore', key: 'standardScore', width: 80 },
  { title: '封顶分', dataIndex: 'capScore', key: 'capScore', width: 80 },
  { title: '操作', key: 'actions', width: 120 },
]

async function loadConfig() {
  loading.value = true
  try {
    configRows.value = await portfolioIndicatorTenantApi.listConfig()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadIndustryPacks() {
  try {
    industryPacks.value = await portfolioIndicatorPlatformApi.listIndustryPack()
  } catch (error) {
    showUserError(error)
  }
}

async function loadModel() {
  loading.value = true
  try {
    model.value = await portfolioIndicatorTenantApi.getModel({ sceneCode: sceneCode.value })
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function enableAll() {
  enabling.value = true
  try {
    const result = await portfolioIndicatorTenantApi.enableAllConfig()
    message.success(`已启用 ${result.enabledCount} 项指标`)
    await loadConfig()
  } catch (error) {
    showUserError(error)
  } finally {
    enabling.value = false
  }
}

async function toggleEnabled(record: PortfolioTenantIndicatorConfigVO, enabled: boolean) {
  try {
    await portfolioIndicatorTenantApi.saveConfig({ indicatorCode: record.indicatorCode, enabled })
    record.enabled = enabled
    message.success(enabled ? '已启用' : '已停用')
  } catch (error) {
    showUserError(error)
    await loadConfig()
  }
}

function openEdit(record: PortfolioTenantIndicatorConfigVO) {
  editForm.indicatorCode = record.indicatorCode
  editForm.indicatorName = record.indicatorName
  editForm.enabled = record.enabled
  editForm.standardScore = record.standardScore
  editForm.capScore = record.capScore
  editForm.applicableScenes = record.applicableScenes ?? ''
  editDrawerOpen.value = true
}

async function saveEdit() {
  saving.value = true
  try {
    await portfolioIndicatorTenantApi.saveConfig({
      indicatorCode: editForm.indicatorCode,
      enabled: editForm.enabled,
      standardScore: editForm.standardScore,
      capScore: editForm.capScore,
      applicableScenes: editForm.applicableScenes || undefined,
    })
    message.success('配置已保存')
    editDrawerOpen.value = false
    await loadConfig()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

async function saveModel() {
  if (!model.value) {
    return
  }
  saving.value = true
  try {
    await portfolioIndicatorTenantApi.saveModel({
      sceneCode: sceneCode.value,
      indicators: model.value.indicators.map((item) => ({
        indicatorCode: item.indicatorCode,
        enabled: item.enabled,
        weightPct: item.weightPct,
      })),
    })
    message.success('场景模型已保存')
    await loadModel()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

async function trialModel() {
  trialing.value = true
  try {
    model.value = await portfolioIndicatorTenantApi.trialModel({ sceneCode: sceneCode.value })
    message.success(model.value.trialPassed ? '试算通过' : '试算未通过，请检查权重')
  } catch (error) {
    showUserError(error)
  } finally {
    trialing.value = false
  }
}

async function freezeModel() {
  freezing.value = true
  try {
    await portfolioIndicatorTenantApi.freezeModel({ sceneCode: sceneCode.value })
    message.success('场景模型已冻结')
    await loadModel()
  } catch (error) {
    showUserError(error)
  } finally {
    freezing.value = false
  }
}

async function bindPack() {
  if (!bindForm.packCode) {
    message.warning('请选择行业包')
    return
  }
  binding.value = true
  try {
    await portfolioIndicatorTenantApi.bindIndustryPack({
      bindings: [
        {
          packCode: bindForm.packCode,
          majorGroupCode: bindForm.majorGroupCode || undefined,
          majorGroupName: bindForm.majorGroupName || undefined,
          enabled: bindForm.enabled,
        },
      ],
    })
    message.success('行业包已挂载')
  } catch (error) {
    showUserError(error)
  } finally {
    binding.value = false
  }
}

async function exportCatalog() {
  try {
    const result = await portfolioIndicatorTenantApi.exportIndicatorCatalog()
    await downloadPortfolioIndicatorExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error)
  }
}

function updateIndicatorWeight(
  indicatorCode: string,
  field: 'weightPct' | 'enabled',
  value: number | boolean,
) {
  if (!model.value) {
    return
  }
  const item = model.value.indicators.find((row) => row.indicatorCode === indicatorCode)
  if (item) {
    if (field === 'weightPct') {
      item.weightPct = Number(value)
    } else {
      item.enabled = Boolean(value)
    }
  }
}

function handleConfigEnabledChange(
  record: PortfolioTenantIndicatorConfigVO,
  checked: boolean | string | number,
) {
  void toggleEnabled(record, checked === true)
}

function handleSceneEnabledChange(indicatorCode: string, checked: boolean | string | number) {
  updateIndicatorWeight(indicatorCode, 'enabled', checked === true)
}

function handleSceneWeightChange(indicatorCode: string, value: boolean | string | number | null) {
  updateIndicatorWeight(indicatorCode, 'weightPct', typeof value === 'number' ? value : 0)
}

function onTabChange(key: string | number) {
  activeTab.value = String(key)
  if (activeTab.value === 'config') {
    loadConfig()
  } else if (activeTab.value === 'scene') {
    loadModel()
  } else if (activeTab.value === 'pack') {
    loadIndustryPacks()
  }
}

watch(sceneCode, () => {
  if (activeTab.value === 'scene') {
    loadModel()
  }
})

onMounted(loadConfig)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="租户指标配置">
        <template #actions>
          <UiButton @click="exportCatalog"> 导出目录 </UiButton>
          <UiButton @click="router.push({ name: 'PortfolioIndicatorPublishWizard' })">
            发布向导
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard>
      <a-tabs :active-key="activeTab" @change="onTabChange">
        <a-tab-pane key="config" tab="指标启停">
          <div class="toolbar">
            <a-input
              v-model:value="configFilter"
              placeholder="编码 / 名称"
              style="width: 180px"
              allow-clear
            />
            <UiButton :loading="enabling" @click="enableAll"> 批量启用 T001–T100 </UiButton>
            <UiButton @click="loadConfig"> 刷新 </UiButton>
          </div>
          <UiEmpty
            v-if="!loading && filteredConfigs.length === 0"
            description="当前筛选无租户指标配置"
          />
          <UiDataTable
            :columns="configColumns"
            :data-source="filteredConfigs"
            :loading="loading"
            row-key="indicatorCode"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'enabled'">
                <a-switch
                  :checked="record.enabled"
                  @change="(v) => handleConfigEnabledChange(record, v)"
                />
              </template>
              <template v-else-if="column.key === 'actions'">
                <a @click="openEdit(record)">编辑</a>
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
        <a-tab-pane key="scene" tab="场景权重">
          <div class="toolbar">
            <a-select
              v-model:value="sceneCode"
              :options="PF_SCENE_CODE_OPTIONS"
              style="width: 140px"
            />
            <UiButton :loading="saving" @click="saveModel"> 保存 </UiButton>
            <UiButton variant="primary" :loading="trialing" @click="trialModel"> 试算 </UiButton>
            <UiButton :loading="freezing" @click="freezeModel"> 冻结 </UiButton>
          </div>
          <a-spin :spinning="loading">
            <template v-if="model">
              <p class="meta">
                {{ sceneLabel }} · 状态 {{ modelStatusLabel(model.modelStatus) }} · 权重合计
                {{ model.weightSum ?? '—' }} · 试算 {{ model.trialPassed ? '通过' : '未通过' }}
              </p>
              <a-table
                size="small"
                :pagination="false"
                row-key="indicatorCode"
                :data-source="model.indicators"
                :columns="[
                  { title: '指标编码', dataIndex: 'indicatorCode' },
                  { title: '启用', key: 'enabled', width: 80 },
                  { title: '权重', key: 'weight', width: 120 },
                ]"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'enabled'">
                    <a-switch
                      :checked="record.enabled"
                      @change="(v) => handleSceneEnabledChange(record.indicatorCode, v)"
                    />
                  </template>
                  <template v-else-if="column.key === 'weight'">
                    <a-input-number
                      :value="record.weightPct"
                      :min="0"
                      :max="100"
                      style="width: 100px"
                      @change="(v) => handleSceneWeightChange(record.indicatorCode, v)"
                    />
                  </template>
                </template>
              </a-table>
            </template>
          </a-spin>
        </a-tab-pane>
        <a-tab-pane key="pack" tab="行业包挂载">
          <div class="bind-form">
            <a-select
              v-model:value="bindForm.packCode"
              placeholder="选择行业包"
              style="width: 200px"
              :options="industryPacks.map((p) => ({ value: p.packCode, label: p.packName }))"
            />
            <a-input
              v-model:value="bindForm.majorGroupCode"
              placeholder="专业群编码"
              style="width: 140px"
            />
            <a-input
              v-model:value="bindForm.majorGroupName"
              placeholder="专业群名称"
              style="width: 160px"
            />
            <a-switch
              v-model:checked="bindForm.enabled"
              checked-children="启用"
              un-checked-children="停用"
            />
            <UiButton variant="primary" :loading="binding" @click="bindPack"> 挂载 </UiButton>
          </div>
          <a-table
            size="small"
            row-key="id"
            :pagination="false"
            :data-source="industryPacks"
            :columns="[
              { title: '包编码', dataIndex: 'packCode' },
              { title: '包名称', dataIndex: 'packName' },
              { title: '版本', dataIndex: 'packVersion', width: 88 },
              { title: '状态', key: 'status', width: 88 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                {{ indicatorStatusLabel(record.status) }}
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </UiCard>
    <a-drawer v-model:open="editDrawerOpen" title="编辑指标配置" width="480">
      <p>
        <strong>{{ editForm.indicatorCode }}</strong> {{ editForm.indicatorName }}
      </p>
      <a-form layout="vertical">
        <a-form-item label="启用">
          <a-switch v-model:checked="editForm.enabled" />
        </a-form-item>
        <a-form-item label="标准分">
          <a-input-number v-model:value="editForm.standardScore" style="width: 100%" />
        </a-form-item>
        <a-form-item label="封顶分">
          <a-input-number v-model:value="editForm.capScore" style="width: 100%" />
        </a-form-item>
        <a-form-item label="适用场景">
          <a-input v-model:value="editForm.applicableScenes" placeholder="如 PORTRAIT,EVALUATION" />
        </a-form-item>
      </a-form>
      <UiButton variant="primary" :loading="saving" @click="saveEdit"> 保存 </UiButton>
    </a-drawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar,
.bind-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.meta {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--ant-color-text-secondary);
}
</style>
