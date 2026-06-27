<script setup lang="ts">
import type { PortfolioEligibilityEvalResultDto } from '@/apis/portfolio/indicator-types'
import { computed, ref } from 'vue'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import PortfolioIndicatorExplainDrawer from '@/components/portfolio/PortfolioIndicatorExplainDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import { showUserError } from '@/utils/error-handler'

const { targetTeacherId } = usePortfolioPageScope()
const evaluating = ref(false)
const result = ref<PortfolioEligibilityEvalResultDto | null>(null)
const explainOpen = ref(false)

const eligibilityOptions = [
  { value: 'DUAL_TEACHER_APPLY', label: '双师认定申请' },
]

const eligibilityCode = ref('DUAL_TEACHER_APPLY')
const dualTeacherCert = ref(true)
const ethicsApproved = ref(true)
const teachingYears = ref(3)

const factJson = computed(() => JSON.stringify({
  dualTeacherCert: String(dualTeacherCert.value),
  ethicsAuditStatus: ethicsApproved.value ? 'APPROVED' : 'PENDING',
  teachingYears: teachingYears.value,
}))

async function evaluate() {
  evaluating.value = true
  try {
    result.value = await portfolioIndicatorTenantApi.evaluateEligibility({
      eligibilityCode: eligibilityCode.value,
      teacherUserId: targetTeacherId.value,
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
    <ContextBar title="我的资格评估" subtitle="基于 Eligibility 规则的结构化评估" />
    <UiCard>
      <a-form layout="vertical">
        <a-form-item label="评估类型">
          <a-select v-model:value="eligibilityCode" :options="eligibilityOptions" style="width: 240px" />
        </a-form-item>
        <a-form-item label="双师证书">
          <a-switch v-model:checked="dualTeacherCert" />
        </a-form-item>
        <a-form-item label="师德审核已通过">
          <a-switch v-model:checked="ethicsApproved" />
        </a-form-item>
        <a-form-item label="教龄（年）">
          <a-input-number v-model:value="teachingYears" :min="0" :max="50" />
        </a-form-item>
      </a-form>
      <div class="toolbar">
        <UiButton variant="primary" :loading="evaluating" @click="evaluate">
          开始评估
        </UiButton>
        <UiButton v-if="result" @click="explainOpen = true">
          查看解释
        </UiButton>
      </div>
      <template v-if="result">
        <UiTag :tone="result.eligible ? 'green' : 'red'" style="margin-bottom: 12px">
          {{ result.eligible ? '评估通过' : '评估不通过' }}
        </UiTag>
        <p>{{ result.explainText }}</p>
        <ul v-if="result.gapItems.length" class="gap-list">
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
.gap-list {
  margin: 8px 0 0;
  padding-left: 20px;
  color: var(--ant-color-text-secondary, #666);
  font-size: 13px;
}
</style>
