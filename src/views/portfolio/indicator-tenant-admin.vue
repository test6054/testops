<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PfIndicatorStatusCode,
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
  PfModelStatusCode,
  PfModelStatusDescription,
  PfSceneCode,
  PfSceneCodeDescription,
} from '@/apis/portfolio/indicator-types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
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
const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const saving = computed(() => operationKey.value.startsWith('save:'))
const trialing = computed(() => operationKey.value.startsWith('trial:'))
const freezing = computed(() => operationKey.value.startsWith('freeze:'))
const enabling = computed(() => operationKey.value === 'enable-all')
const binding = computed(() => operationKey.value.startsWith('pack:bind:'))
const exporting = computed(() => operationKey.value === 'catalog:export')
const loadState = reactive({ config: false, model: false, packs: false })
const loadError = reactive({ config: false, model: false, packs: false })
const requestToken = reactive({ config: 0, model: 0, packs: 0 })
const configFilter = ref('')
const configRows = ref<PortfolioTenantIndicatorConfigVO[]>([])
const industryPacks = ref<PortfolioIndustryPackVO[]>([])
const bindForm = reactive({ packCode: '', majorGroupCode: '', majorGroupName: '', enabled: true })
const model = ref<Awaited<ReturnType<typeof portfolioIndicatorTenantApi.getModel>> | null>(null)
const modelDirty = ref(false)
const editDrawerOpen = ref(false)
const interactionLocked = computed(() => writing.value || editDrawerOpen.value)
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

/** 租户指标配置写操作必须串行，避免配置变更、试算与冻结跨场景执行。 */
function beginOperation(key: string): boolean {
  if (writing.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}

const sceneLabel = computed(() =>
  strictEnumLabel(PfSceneCodeDescription, sceneCode.value, '指标场景编码'),
)
const modelEditable = computed(
  () => Boolean(model.value) && model.value?.modelStatus !== PfModelStatusCode.FROZEN,
)

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

const sceneWeightColumns: ColumnsType = [
  { title: '指标编码', dataIndex: 'indicatorCode', key: 'indicatorCode', fixed: 'left' },
  { title: '启用', key: 'enabled', width: 80 },
  { title: '权重', key: 'weight', width: 120 },
]

const industryPackColumns: ColumnsType = [
  { title: '包编码', dataIndex: 'packCode', key: 'packCode', fixed: 'left' },
  { title: '包名称', dataIndex: 'packName', key: 'packName' },
  { title: '版本', dataIndex: 'packVersion', key: 'packVersion', width: 88 },
  { title: '状态', key: 'status', width: 88 },
]

async function loadConfig() {
  const currentToken = ++requestToken.config
  loadState.config = true
  loadError.config = false
  try {
    const rows = await portfolioIndicatorTenantApi.listConfig()
    if (requestToken.config !== currentToken) return
    configRows.value = rows
  } catch (error) {
    if (requestToken.config !== currentToken) return
    configRows.value = []
    loadError.config = true
    showUserError(error, '加载租户指标配置失败')
  } finally {
    if (requestToken.config === currentToken) loadState.config = false
  }
}

async function loadIndustryPacks() {
  const currentToken = ++requestToken.packs
  loadState.packs = true
  loadError.packs = false
  try {
    const rows = await portfolioIndicatorPlatformApi.listIndustryPack()
    if (requestToken.packs !== currentToken) return
    industryPacks.value = rows
  } catch (error) {
    if (requestToken.packs !== currentToken) return
    industryPacks.value = []
    loadError.packs = true
    showUserError(error, '加载行业包失败')
  } finally {
    if (requestToken.packs === currentToken) loadState.packs = false
  }
}

async function loadModel() {
  const targetSceneCode = sceneCode.value
  const currentToken = ++requestToken.model
  model.value = null
  loadState.model = true
  loadError.model = false
  try {
    const result = await portfolioIndicatorTenantApi.getModel({ sceneCode: targetSceneCode })
    if (requestToken.model !== currentToken || sceneCode.value !== targetSceneCode) return
    model.value = result
    modelDirty.value = false
  } catch (error) {
    if (requestToken.model !== currentToken) return
    model.value = null
    loadError.model = true
    showUserError(error, '加载场景模型失败')
  } finally {
    if (requestToken.model === currentToken) loadState.model = false
  }
}

async function enableAll() {
  const operation = 'enable-all'
  if (!beginOperation(operation)) return
  const confirmed = await confirmAsync({
    title: '确认启用全部平台指标？',
    content: '将启用当前租户可用的 T001-T100 指标，并使所有场景已有试算结果失效。',
    type: 'warning',
  })
  if (!confirmed) {
    endOperation(operation)
    return
  }
  try {
    const result = await portfolioIndicatorTenantApi.enableAllConfig()
    message.success(`已启用 ${result.enabledCount} 项指标`)
    const reloads = [loadConfig()]
    if (model.value) reloads.push(loadModel())
    await Promise.all(reloads)
  } catch (error) {
    showUserError(error, '启用全部平台指标失败')
  } finally {
    endOperation(operation)
  }
}

async function toggleEnabled(record: PortfolioTenantIndicatorConfigVO, enabled: boolean) {
  const indicatorCode = record.indicatorCode
  const operation = `config:toggle:${indicatorCode}`
  if (!beginOperation(operation)) return
  try {
    await portfolioIndicatorTenantApi.saveConfig({ indicatorCode, enabled })
    message.success(enabled ? '已启用' : '已停用')
  } catch (error) {
    showUserError(error, '切换指标启用状态失败')
  } finally {
    await Promise.all([loadConfig(), model.value ? loadModel() : Promise.resolve()])
    endOperation(operation)
  }
}

function openEdit(record: PortfolioTenantIndicatorConfigVO) {
  if (interactionLocked.value) return
  editForm.indicatorCode = record.indicatorCode
  editForm.indicatorName = record.indicatorName
  editForm.enabled = record.enabled
  editForm.standardScore = record.standardScore
  editForm.capScore = record.capScore
  editForm.applicableScenes = record.applicableScenes ?? ''
  editDrawerOpen.value = true
}

async function saveEdit() {
  const indicatorCode = editForm.indicatorCode
  if (!indicatorCode) return
  if (
    editForm.standardScore != null
    && editForm.capScore != null
    && editForm.capScore < editForm.standardScore
  ) {
    showFormValidationMessage('封顶分不能低于标准分')
    return
  }
  const operation = `save:config:${indicatorCode}`
  if (!beginOperation(operation)) return
  const request = {
    indicatorCode,
    enabled: editForm.enabled,
    standardScore: editForm.standardScore,
    capScore: editForm.capScore,
    applicableScenes: editForm.applicableScenes.trim() || undefined,
  }
  try {
    await portfolioIndicatorTenantApi.saveConfig(request)
    message.success('配置已保存')
    editDrawerOpen.value = false
    await Promise.all([loadConfig(), model.value ? loadModel() : Promise.resolve()])
  } catch (error) {
    showUserError(error, '保存指标配置失败')
  } finally {
    endOperation(operation)
  }
}

async function saveModel() {
  if (!model.value) {
    return
  }
  const targetSceneCode = sceneCode.value
  const indicators = model.value.indicators.map((item) => ({
    indicatorCode: item.indicatorCode,
    enabled: item.enabled,
    weightPct: item.weightPct,
  }))
  const operation = `save:model:${targetSceneCode}`
  if (!beginOperation(operation)) return
  try {
    await portfolioIndicatorTenantApi.saveModel({
      sceneCode: targetSceneCode,
      indicators,
    })
    message.success('场景模型已保存')
    if (sceneCode.value === targetSceneCode) await loadModel()
  } catch (error) {
    showUserError(error, '保存场景模型失败')
  } finally {
    endOperation(operation)
  }
}

async function trialModel() {
  if (!model.value) return
  const targetSceneCode = sceneCode.value
  const indicators = model.value.indicators.map((item) => ({
    indicatorCode: item.indicatorCode,
    enabled: item.enabled,
    weightPct: item.weightPct,
  }))
  const operation = `trial:${targetSceneCode}`
  if (!beginOperation(operation)) return
  try {
    await portfolioIndicatorTenantApi.saveModel({ sceneCode: targetSceneCode, indicators })
    const result = await portfolioIndicatorTenantApi.trialModel({ sceneCode: targetSceneCode })
    if (sceneCode.value !== targetSceneCode) return
    model.value = result
    modelDirty.value = false
    message.success(result.trialPassed ? '当前权重已保存，试算通过' : '试算未通过，请检查权重')
  } catch (error) {
    showUserError(error, '场景模型试算失败')
  } finally {
    endOperation(operation)
  }
}

async function freezeModel() {
  if (modelDirty.value) {
    showFormValidationMessage('当前权重尚未保存，请先保存或试算后再冻结')
    return
  }
  if (!model.value || model.value.modelStatus !== PfModelStatusCode.PUBLISHED) {
    showFormValidationMessage('仅已发布且存在正式快照的场景模型可以冻结')
    return
  }
  const targetSceneCode = sceneCode.value
  const operation = `freeze:${targetSceneCode}`
  if (!beginOperation(operation)) return
  const confirmed = await confirmAsync({
    title: '确认冻结已发布模型？',
    content: `冻结「${sceneLabel.value}」后，当前正式快照将立即结束有效期，模型不可再直接修改。`,
    type: 'warning',
  })
  if (!confirmed) {
    endOperation(operation)
    return
  }
  try {
    await portfolioIndicatorTenantApi.freezeModel({ sceneCode: targetSceneCode })
    message.success('场景模型已冻结')
    if (sceneCode.value === targetSceneCode) await loadModel()
  } catch (error) {
    showUserError(error, '冻结场景模型失败')
  } finally {
    endOperation(operation)
  }
}

async function bindPack() {
  if (!bindForm.packCode) {
    showFormValidationMessage('请选择行业包')
    return
  }
  const packCode = bindForm.packCode
  const majorGroupCode = bindForm.majorGroupCode.trim()
  const majorGroupName = bindForm.majorGroupName.trim()
  if (Boolean(majorGroupCode) !== Boolean(majorGroupName)) {
    showFormValidationMessage('专业群编码和名称必须同时填写或同时留空')
    return
  }
  const operation = `pack:bind:${packCode}:${majorGroupCode}`
  if (!beginOperation(operation)) return
  const request = {
    bindings: [
      {
        packCode,
        majorGroupCode: majorGroupCode || undefined,
        majorGroupName: majorGroupName || undefined,
        enabled: bindForm.enabled,
      },
    ],
  }
  try {
    await portfolioIndicatorTenantApi.bindIndustryPack(request)
    message.success('行业包已挂载')
  } catch (error) {
    showUserError(error, '挂载行业包失败')
  } finally {
    endOperation(operation)
  }
}

async function exportCatalog() {
  const operation = 'catalog:export'
  if (!beginOperation(operation)) return
  try {
    const result = await portfolioIndicatorTenantApi.exportIndicatorCatalog()
    await downloadPortfolioIndicatorExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出指标目录失败')
  } finally {
    endOperation(operation)
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
    model.value.trialPassed = false
    modelDirty.value = true
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
  if (writing.value) return
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
  model.value = null
  modelDirty.value = false
  requestToken.model++
  loadState.model = false
  loadError.model = false
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
          <UiButton :loading="exporting" :disabled="interactionLocked" @click="exportCatalog">
            导出目录
          </UiButton>
          <UiButton
            :disabled="interactionLocked"
            @click="router.push({ name: 'PortfolioIndicatorPublishWizard' })"
          >
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
              :disabled="writing"
            />
            <UiButton :loading="enabling" :disabled="writing" @click="enableAll">
              批量启用 T001–T100
            </UiButton>
            <UiButton :loading="loadState.config" :disabled="writing" @click="loadConfig">
              刷新
            </UiButton>
          </div>
          <UiEmpty
            v-if="!loadState.config && !loadError.config && filteredConfigs.length === 0"
            description="当前筛选无租户指标配置"
          />
          <UiDataTable
            :columns="configColumns"
            :data-source="filteredConfigs"
            :loading="loadState.config"
            :load-error="loadError.config"
            row-key="indicatorCode"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'enabled'">
                <a-switch
                  :checked="record.enabled"
                  :disabled="writing"
                  @change="handleConfigEnabledChange(record, $event)"
                />
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="[{ key: 'edit', label: '编辑', disabled: interactionLocked }]"
                  split
                  @action="() => openEdit(record)"
                />
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
              :disabled="writing"
            />
            <UiButton
              :loading="operationKey.startsWith('save:model:')"
              :disabled="writing || !modelEditable"
              @click="saveModel"
            >
              保存
            </UiButton>
            <UiButton
              variant="primary"
              :loading="trialing"
              :disabled="writing || !modelEditable"
              @click="trialModel"
            >
              保存并试算
            </UiButton>
            <UiButton
              :loading="freezing"
              :disabled="
                writing || modelDirty || model?.modelStatus !== PfModelStatusCode.PUBLISHED
              "
              @click="freezeModel"
            >
              冻结
            </UiButton>
          </div>
          <a-spin :spinning="loadState.model">
            <UiEmpty v-if="loadError.model" description="场景模型加载失败，请重试" />
            <template v-if="model">
              <p class="meta">
                {{ sceneLabel }} · 状态 {{ modelStatusLabel(model.modelStatus) }} · 权重合计
                {{ model.weightSum ?? '—' }} · 试算 {{ model.trialPassed ? '通过' : '未通过' }}
                <span v-if="modelDirty"> · 尚未保存</span>
              </p>
              <UiDataTable
                :columns="sceneWeightColumns"
                :data-source="model.indicators"
                row-key="indicatorCode"
                size="small"
                flat
                pagination-mode="none"
                :show-pagination="false"
                :sticky-header="false"
                :total="model.indicators.length"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'enabled'">
                    <a-switch
                      :checked="record.enabled"
                      :disabled="writing || !modelEditable"
                      @change="handleSceneEnabledChange(record.indicatorCode, $event)"
                    />
                  </template>
                  <template v-else-if="column.key === 'weight'">
                    <a-input-number
                      :value="record.weightPct"
                      :min="0"
                      :max="100"
                      :disabled="writing || !modelEditable"
                      style="width: 100px"
                      @change="handleSceneWeightChange(record.indicatorCode, $event)"
                    />
                  </template>
                </template>
              </UiDataTable>
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
              :disabled="writing"
            />
            <a-input
              v-model:value="bindForm.majorGroupCode"
              placeholder="专业群编码"
              style="width: 140px"
              :disabled="writing"
            />
            <a-input
              v-model:value="bindForm.majorGroupName"
              placeholder="专业群名称"
              style="width: 160px"
              :disabled="writing"
            />
            <a-switch
              v-model:checked="bindForm.enabled"
              checked-children="启用"
              un-checked-children="停用"
              :disabled="writing"
            />
            <UiButton variant="primary" :loading="binding" :disabled="writing" @click="bindPack">
              挂载
            </UiButton>
          </div>
          <UiDataTable
            :columns="industryPackColumns"
            :data-source="industryPacks"
            :loading="loadState.packs"
            :load-error="loadError.packs"
            row-key="id"
            size="small"
            flat
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :total="industryPacks.length"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                {{ indicatorStatusLabel(record.status) }}
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
      </a-tabs>
    </UiCard>
    <a-drawer
      v-model:open="editDrawerOpen"
      title="编辑指标配置"
      width="480"
      :closable="!writing"
      :mask-closable="!writing"
    >
      <p>
        <strong>{{ editForm.indicatorCode }}</strong> {{ editForm.indicatorName }}
      </p>
      <a-form layout="vertical">
        <a-form-item label="启用">
          <a-switch v-model:checked="editForm.enabled" :disabled="writing" />
        </a-form-item>
        <a-form-item label="标准分">
          <a-input-number
            v-model:value="editForm.standardScore"
            style="width: 100%"
            :disabled="writing"
          />
        </a-form-item>
        <a-form-item label="封顶分">
          <a-input-number
            v-model:value="editForm.capScore"
            style="width: 100%"
            :disabled="writing"
          />
        </a-form-item>
        <a-form-item label="适用场景">
          <a-input
            v-model:value="editForm.applicableScenes"
            placeholder="如 PORTRAIT,EVALUATION"
            :disabled="writing"
          />
        </a-form-item>
      </a-form>
      <UiButton variant="primary" :loading="saving" :disabled="writing" @click="saveEdit">
        保存
      </UiButton>
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
