<script setup lang="ts">
import type { PfSceneCode } from '@/apis/portfolio/indicator-types'
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import { PF_SCENE_CODE_OPTIONS } from '@/apis/portfolio/indicator-types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'

const sceneCode = ref<PfSceneCode>('DUAL_TEACHER')
const eligibilityCode = ref('DUAL_TEACHER_APPLY')
const ruleTreeJson = ref('')
const loading = ref(false)
const saving = ref(false)

async function loadRule() {
  loading.value = true
  try {
    const rule = await portfolioIndicatorTenantApi.getEligibilityRule({ eligibilityCode: eligibilityCode.value })
    ruleTreeJson.value = rule.ruleTreeJson
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function saveRule() {
  saving.value = true
  try {
    await portfolioIndicatorTenantApi.saveEligibilityRule({
      eligibilityCode: eligibilityCode.value,
      eligibilityName: '双师认定',
      sceneCode: sceneCode.value,
      ruleTreeJson: ruleTreeJson.value,
    })
    message.success('Eligibility 规则已保存')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    saving.value = false
  }
}

onMounted(loadRule)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="资格规则编辑" subtitle="Eligibility 合取树 JSON" />
    <UiCard>
      <div class="toolbar">
        <a-select v-model:value="sceneCode" :options="PF_SCENE_CODE_OPTIONS" style="width: 140px" />
        <a-input v-model:value="eligibilityCode" style="width: 200px" />
        <UiButton @click="loadRule">
          加载
        </UiButton>
        <UiButton variant="primary" :loading="saving" @click="saveRule">
          保存
        </UiButton>
      </div>
      <a-spin :spinning="loading">
        <a-textarea v-model:value="ruleTreeJson" :rows="18" />
      </a-spin>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
</style>
