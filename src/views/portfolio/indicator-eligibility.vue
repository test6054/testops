<script setup lang="ts">
import type { PfEligibilityRuleTreeNodeDto } from '@/apis/portfolio/indicator-types'
import message from 'ant-design-vue/es/message'
import { onMounted, ref } from 'vue'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import {
  PF_ELIGIBILITY_PRESET_OPTIONS,
  PF_SCENE_CODE_OPTIONS,
  PfSceneCode,
} from '@/apis/portfolio/indicator-types'
import PortfolioEligibilityTreeEditor from '@/components/portfolio/PortfolioEligibilityTreeEditor.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { validateEligibilityTree } from '@/utils/eligibility-tree'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'

const sceneCode = ref<PfSceneCode>(PfSceneCode.DUAL_TEACHER)
const eligibilityCode = ref('DUAL_TEACHER_APPLY')
const eligibilityName = ref('双师认定申请')
const treeRoot = ref<PfEligibilityRuleTreeNodeDto>({ nodeType: 'AND', children: [] })
const loading = ref(false)
const saving = ref(false)
/** 规则加载 token，切换预置编码时丢弃旧规则回写 */
const ruleRequestToken = ref(0)

const presetOptions = PF_ELIGIBILITY_PRESET_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}))

function onPresetChange(code: string) {
  const preset = PF_ELIGIBILITY_PRESET_OPTIONS.find((item) => item.value === code)
  if (preset) {
    eligibilityName.value = preset.label
    sceneCode.value = preset.scene
  }
}

async function loadRule() {
  const requestCode = eligibilityCode.value
  const currentToken = ++ruleRequestToken.value
  loading.value = true
  try {
    const rule = await portfolioIndicatorTenantApi.getEligibilityRule({
      eligibilityCode: requestCode,
    })
    if (currentToken !== ruleRequestToken.value || eligibilityCode.value !== requestCode) {
      return
    }
    eligibilityName.value = rule.eligibilityName
    sceneCode.value = rule.sceneCode
    treeRoot.value = rule.ruleTree ?? { nodeType: 'AND', children: [] }
  } catch (error) {
    if (currentToken !== ruleRequestToken.value || eligibilityCode.value !== requestCode) {
      return
    }
    treeRoot.value = { nodeType: 'AND', children: [] }
    showUserError(error, '加载资格规则失败')
  } finally {
    if (currentToken === ruleRequestToken.value) {
      loading.value = false
    }
  }
}

async function saveRule() {
  if (saving.value || loading.value) {
    return
  }
  if (!eligibilityName.value.trim()) {
    showFormValidationMessage('请填写资格规则名称')
    return
  }
  const validationError = validateEligibilityTree(treeRoot.value)
  if (validationError) {
    showFormValidationMessage(validationError)
    return
  }
  const requestCode = eligibilityCode.value
  const requestName = eligibilityName.value
  const requestScene = sceneCode.value
  const requestTree = treeRoot.value
  saving.value = true
  try {
    await portfolioIndicatorTenantApi.saveEligibilityRule({
      eligibilityCode: requestCode,
      eligibilityName: requestName,
      sceneCode: requestScene,
      ruleTree: requestTree,
    })
    if (eligibilityCode.value !== requestCode) {
      return
    }
    message.success('资格规则已保存')
  } catch (error) {
    if (eligibilityCode.value === requestCode) {
      showUserError(error, '保存资格规则失败')
    }
  } finally {
    saving.value = false
  }
}

function onPresetPick() {
  onPresetChange(eligibilityCode.value)
  void loadRule()
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
        <UiSelect
          size="sm"
          v-model="eligibilityCode"
          :options="presetOptions"
          style="width: 200px"
          @change="onPresetPick"
        />
        <UiSelect
          size="sm" v-model="sceneCode" :options="PF_SCENE_CODE_OPTIONS" style="width: 140px"
        />
        <UiInput
          size="sm" v-model="eligibilityName" placeholder="规则名称" style="width: 200px"
        />
        <UiButton size="sm" @click="loadRule"> 加载 </UiButton>
        <UiButton size="sm" variant="primary" :loading="saving" :disabled="loading || saving" @click="saveRule"> 保存 </UiButton>
      </div>
      <p class="hint">
        节点类型：叶子条件、与、或、非、审核门禁；通过下方表单编辑，无需手写结构化规则文本。
      </p>
      <UiSpin :spinning="loading">
        <PortfolioEligibilityTreeEditor v-model:node="treeRoot" />
      </UiSpin>
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
