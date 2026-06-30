<script setup lang="ts">
import type { PfEligibilityRuleTreeNodeDto, PfSceneCode } from '@/apis/portfolio/indicator-types'
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import { PF_ELIGIBILITY_PRESET_OPTIONS, PF_SCENE_CODE_OPTIONS } from '@/apis/portfolio/indicator-types'
import PortfolioEligibilityTreeEditor from '@/components/portfolio/PortfolioEligibilityTreeEditor.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  parseEligibilityTreeJson,
  serializeEligibilityTree,
  validateEligibilityTree,
} from '@/utils/eligibility-tree'
import { showUserError } from '@/utils/error-handler'

const sceneCode = ref<PfSceneCode>('DUAL_TEACHER')
const eligibilityCode = ref('DUAL_TEACHER_APPLY')
const eligibilityName = ref('双师认定申请')
const treeRoot = ref<PfEligibilityRuleTreeNodeDto>({ nodeType: 'AND', children: [] })
const loading = ref(false)
const saving = ref(false)

const presetOptions = PF_ELIGIBILITY_PRESET_OPTIONS.map(item => ({
  value: item.value,
  label: item.label,
}))

function onPresetChange(code: string) {
  const preset = PF_ELIGIBILITY_PRESET_OPTIONS.find(item => item.value === code)
  if (preset) {
    eligibilityName.value = preset.label
    sceneCode.value = preset.scene
  }
}

async function loadRule() {
  loading.value = true
  try {
    const rule = await portfolioIndicatorTenantApi.getEligibilityRule({ eligibilityCode: eligibilityCode.value })
    eligibilityName.value = rule.eligibilityName
    sceneCode.value = rule.sceneCode
    treeRoot.value = parseEligibilityTreeJson(rule.ruleTreeJson)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function saveRule() {
  const validationError = validateEligibilityTree(treeRoot.value)
  if (validationError) {
    message.warning(validationError)
    return
  }
  saving.value = true
  try {
    await portfolioIndicatorTenantApi.saveEligibilityRule({
      eligibilityCode: eligibilityCode.value,
      eligibilityName: eligibilityName.value,
      sceneCode: sceneCode.value,
      ruleTreeJson: serializeEligibilityTree(treeRoot.value),
    })
    message.success('资格规则已保存')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    saving.value = false
  }
}

function onPresetPick() {
  onPresetChange(eligibilityCode.value)
  loadRule()
}

onMounted(loadRule)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="资格规则编辑" />
    </template>
    <UiCard>
      <div class="toolbar">
        <a-select v-model:value="eligibilityCode" :options="presetOptions" style="width: 200px" @change="onPresetPick" />
        <a-select v-model:value="sceneCode" :options="PF_SCENE_CODE_OPTIONS" style="width: 140px" />
        <a-input v-model:value="eligibilityName" placeholder="规则名称" style="width: 200px" />
        <UiButton @click="loadRule">
          加载
        </UiButton>
        <UiButton variant="primary" :loading="saving" @click="saveRule">
          保存
        </UiButton>
      </div>
      <p class="hint">
        节点类型：叶子条件、与、或、非、审核门禁；通过下方表单编辑，无需手写 JSON。
      </p>
      <a-spin :spinning="loading">
        <PortfolioEligibilityTreeEditor v-model:node="treeRoot" />
      </a-spin>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
</style>
