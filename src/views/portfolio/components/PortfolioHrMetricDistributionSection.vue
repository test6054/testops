<script setup lang="ts">
import type {
  PortfolioAgeBandDistributionItemVO,
  PortfolioMetricDistributionItemVO,
  PortfolioRetirementWindowDistributionItemVO,
  PortfolioTenureBandDistributionItemVO,
} from '@/apis/portfolio/types'
import { computed } from 'vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { PortfolioAgeBandCode } from '@/types/enums/portfolio-age-band-enum'
import {
  portfolioAgeBandLabel,
  portfolioRetirementWindowLabel,
  portfolioTenureBandLabel,
  requirePortfolioAgeBandCode,
} from '@/utils/portfolio-hr-band'

const props = defineProps<{
  politicalAffiliationDistribution?: PortfolioMetricDistributionItemVO[]
  educationDegreeDistribution?: PortfolioMetricDistributionItemVO[]
  ageBandDistribution?: PortfolioAgeBandDistributionItemVO[]
  tenureBandDistribution?: PortfolioTenureBandDistributionItemVO[]
  retirementWindowDistribution?: PortfolioRetirementWindowDistributionItemVO[]
  postCategoryDistribution?: PortfolioMetricDistributionItemVO[]
}>()

interface DistributionRow {
  code: string
  label: string
  count: number
}

interface DistributionPanel {
  key: string
  title: string
  items: DistributionRow[]
}

const ageRows = computed<DistributionRow[]>(() =>
  (props.ageBandDistribution ?? []).map((item) => {
    const code = requirePortfolioAgeBandCode(item.code)
    return {
      code,
      label: portfolioAgeBandLabel(code),
      count: item.count,
    }
  }),
)

const tenureRows = computed<DistributionRow[]>(() =>
  (props.tenureBandDistribution ?? []).map((item) => ({
    code: item.code,
    label: portfolioTenureBandLabel(item.code),
    count: item.count,
  })),
)

const retirementRows = computed<DistributionRow[]>(() =>
  (props.retirementWindowDistribution ?? []).map((item) => ({
    code: item.code,
    label: portfolioRetirementWindowLabel(item.code),
    count: item.count,
  })),
)

const panels = computed<DistributionPanel[]>(() => [
  { key: 'age', title: '年龄结构', items: ageRows.value },
  { key: 'tenure', title: '来校年限', items: tenureRows.value },
  { key: 'retirement', title: '退休窗口', items: retirementRows.value },
  { key: 'education', title: '学历结构', items: props.educationDegreeDistribution ?? [] },
  { key: 'political', title: '政治面貌', items: props.politicalAffiliationDistribution ?? [] },
  { key: 'post', title: '岗位类别', items: props.postCategoryDistribution ?? [] },
])

const hasAnyDistribution = computed(() => panels.value.some((panel) => panel.items.length > 0))

const ageUnknownRatio = computed(() => {
  const items = ageRows.value
  const total = items.reduce((sum, item) => sum + item.count, 0)
  if (total <= 0) {
    return 0
  }
  const unknown = items.find((item) => item.code === PortfolioAgeBandCode.UNKNOWN)?.count ?? 0
  return unknown / total
})

const ageUnknownPercentLabel = computed(() => `${Math.round(ageUnknownRatio.value * 100)}%`)
</script>

<template>
  <section v-if="hasAnyDistribution" class="hr-dist" aria-label="人事结构分布">
    <UiAlertStrip
      v-if="ageUnknownRatio >= 0.5"
      tone="warning"
      size="sm"
      dense
      inline
      :show-icon="false"
      class="hr-dist__alert"
    >
      出生日期未填报占比 {{ ageUnknownPercentLabel }}，年龄结构以「未填报」为主，请催填人事主数据
    </UiAlertStrip>
    <div class="hr-dist__grid">
      <UiCard v-for="panel in panels" :key="panel.key" :title="panel.title">
        <ul v-if="panel.items.length" class="hr-dist__list">
          <li v-for="item in panel.items" :key="item.code">
            <span>{{ item.label }}</span>
            <strong>{{ item.count }}</strong>
          </li>
        </ul>
        <UiEmpty v-else size="sm" description="暂无分布数据" />
      </UiCard>
    </div>
  </section>
</template>

<style scoped>
.hr-dist__alert {
  margin-bottom: var(--dp-space-component);
}

.hr-dist__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dp-space-component);
}

.hr-dist__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.hr-dist__list li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-xs) 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
  border-bottom: 1px solid var(--dp-border);
}

.hr-dist__list li:last-child {
  border-bottom: none;
}

.hr-dist__list strong {
  color: var(--dp-text-primary);
  font-weight: var(--dp-font-weight-title, 600);
}

@media (max-width: 1024px) {
  .hr-dist__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .hr-dist__grid {
    grid-template-columns: 1fr;
  }
}
</style>
