<script setup lang="ts">
import type { PfSceneCode } from '@/apis/portfolio/indicator-types'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import { PF_SCENE_CODE_LABEL, PF_SCENE_CODE_OPTIONS } from '@/apis/portfolio/indicator-types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const sceneCode = ref<PfSceneCode>('PERFORMANCE')
const loading = ref(false)
const saving = ref(false)
const trialing = ref(false)
const model = ref<Awaited<ReturnType<typeof portfolioIndicatorTenantApi.getModel>> | null>(null)

const sceneLabel = computed(() => strictEnumLabel(PF_SCENE_CODE_LABEL, sceneCode.value))

async function loadModel() {
  loading.value = true
  try {
    model.value = await portfolioIndicatorTenantApi.getModel({ sceneCode: sceneCode.value })
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
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
      indicators: model.value.indicators,
    })
    message.success('场景模型已保存')
    await loadModel()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    saving.value = false
  }
}

async function trialModel() {
  trialing.value = true
  try {
    model.value = await portfolioIndicatorTenantApi.trialModel({ sceneCode: sceneCode.value })
    message.success(model.value.trialPassed ? '试算通过' : '试算未通过，请检查权重')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    trialing.value = false
  }
}

watch(sceneCode, loadModel)
onMounted(loadModel)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="租户指标配置" :subtitle="`${sceneLabel} 场景权重与启停`" />
    <UiCard>
      <div class="toolbar">
        <a-select v-model:value="sceneCode" :options="PF_SCENE_CODE_OPTIONS" style="width: 140px" />
        <UiButton :loading="saving" @click="saveModel">
          保存
        </UiButton>
        <UiButton variant="primary" :loading="trialing" @click="trialModel">
          试算
        </UiButton>
      </div>
      <a-spin :spinning="loading">
        <template v-if="model">
          <p>状态：{{ model.modelStatus }} · 权重合计：{{ model.weightSum ?? '—' }} · 试算：{{ model.trialPassed ? '通过' : '未通过' }}</p>
          <a-table
            size="small"
            :pagination="false"
            row-key="indicatorCode"
            :data-source="model.indicators"
            :columns="[
              { title: '指标编码', dataIndex: 'indicatorCode' },
              { title: '启用', dataIndex: 'enabled', width: 72 },
              { title: '权重', dataIndex: 'weight', width: 100 },
            ]"
          />
        </template>
      </a-spin>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
</style>
