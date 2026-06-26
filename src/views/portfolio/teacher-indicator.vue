<script setup lang="ts">
import type { PortfolioEligibilityEvalResultDto } from '@/apis/portfolio/indicator-types'
import { ref } from 'vue'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import PortfolioIndicatorExplainDrawer from '@/components/portfolio/PortfolioIndicatorExplainDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { showUserError } from '@/utils/error-handler'

const { currentUserId } = usePortfolioTeacherAccess()
const evaluating = ref(false)
const result = ref<PortfolioEligibilityEvalResultDto | null>(null)
const explainOpen = ref(false)
const factJson = ref('{"dualTeacherCert":"true","ethicsAuditStatus":"APPROVED"}')

async function evaluate() {
  evaluating.value = true
  try {
    result.value = await portfolioIndicatorTenantApi.evaluateEligibility({
      eligibilityCode: 'DUAL_TEACHER_APPLY',
      teacherUserId: currentUserId.value,
      factJson: factJson.value,
    })
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    evaluating.value = false
  }
}
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="我的资格评估" subtitle="Eligibility 结果与结构化解释" />
    <UiCard>
      <a-textarea v-model:value="factJson" :rows="4" placeholder="事实 JSON" />
      <div class="toolbar">
        <UiButton variant="primary" :loading="evaluating" @click="evaluate">
          评估双师资格
        </UiButton>
        <UiButton v-if="result" @click="explainOpen = true">
          查看解释
        </UiButton>
      </div>
      <template v-if="result">
        <p>结论：{{ result.eligible ? '通过' : '不通过' }}</p>
        <p>{{ result.explainText }}</p>
        <ul v-if="result.gapItems.length">
          <li v-for="(item, index) in result.gapItems" :key="index">
            {{ item }}
          </li>
        </ul>
      </template>
    </UiCard>
    <PortfolioIndicatorExplainDrawer
      v-model:open="explainOpen"
      :explain-text="result?.explainText"
      :explain-struct-json="result?.explainStructJson"
    />
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}
</style>
