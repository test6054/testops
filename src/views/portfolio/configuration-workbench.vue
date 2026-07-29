<script setup lang="ts">
import type { PortfolioConfigurationCapabilityVO } from '@/apis/portfolio/configuration'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioConfigurationApi } from '@/apis/portfolio/configuration'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  PortfolioConfigurationCapabilityStatusDescription,
  PortfolioConfigurationCapabilityStatusEnum,
} from '@/types/enums/portfolio-configuration-capability-status-enum'
import { PortfolioConfigurationSectionCodeDescription } from '@/types/enums/portfolio-configuration-section-code-enum'
import { showUserError } from '@/utils/error-handler'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'

const router = useRouter()
const loading = ref(false)
const loadFailed = ref(false)
const readiness = ref<Awaited<ReturnType<typeof portfolioConfigurationApi.getReadiness>> | null>(null)
const loadGeneration = ref(0)

function statusTone(
  status: PortfolioConfigurationCapabilityStatusEnum,
): 'gray' | 'green' | 'orange' | 'blue' {
  if (status === PortfolioConfigurationCapabilityStatusEnum.READY) {
    return 'green'
  }
  if (status === PortfolioConfigurationCapabilityStatusEnum.ATTENTION) {
    return 'orange'
  }
  if (status === PortfolioConfigurationCapabilityStatusEnum.NOT_CONFIGURED) {
    return 'orange'
  }
  return 'blue'
}

function openCapability(item: PortfolioConfigurationCapabilityVO) {
  void router.push({ name: item.routeName })
}

async function loadReadiness() {
  const generation = ++loadGeneration.value
  loading.value = true
  loadFailed.value = false
  try {
    const result = await portfolioConfigurationApi.getReadiness()
    if (generation !== loadGeneration.value) {
      return
    }
    readiness.value = result
  } catch (error) {
    if (generation !== loadGeneration.value) {
      return
    }
    loadFailed.value = true
    showUserError(error, '加载配置 readiness 失败')
  } finally {
    if (generation === loadGeneration.value) {
      loading.value = false
    }
  }
}


const ConfigurationWorkbenchSignalMetrics = computed<SignalMetric[]>(() => {
  if (!readiness.value) {
    return []
  }
  const metrics: SignalMetric[] = [
    {
      key: 'attention',
      label: '需关注',
      value: readiness.value.attentionCount,
      clickable: true,
      tone: readiness.value.attentionCount > 0 ? 'orange' : undefined,
    },
    {
      key: 'not-configured',
      label: '未配置',
      value: readiness.value.notConfiguredCount,
      tone: readiness.value.notConfiguredCount > 0 ? 'orange' : undefined,
    },
    {
      key: 'sections',
      label: '配置分区',
      value: readiness.value.sections.length,
    },
  ]
  return applySpotlightEmphasis(metrics, {
    primaryKey: readiness.value.attentionCount > 0 ? 'attention' : (readiness.value.notConfiguredCount > 0 ? 'not-configured' : 'sections'),
    actionLabel: '刷新',
  })
})

const ConfigurationWorkbenchSubtitle = computed(() => {
  if (loadFailed.value) return '加载失败'
  if (!readiness.value) return loading.value ? '加载中' : '暂无 readiness'
  return `未配置 ${readiness.value.notConfiguredCount} · 需关注 ${readiness.value.attentionCount}`
})

function onConfigurationWorkbenchSignalClick(_key: string) {
  void loadReadiness()
}

onMounted(() => {
  void loadReadiness()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="档案袋配置中心" :subtitle="ConfigurationWorkbenchSubtitle" />
    </template>
    <template v-if="ConfigurationWorkbenchSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="ConfigurationWorkbenchSignalMetrics"
        @metric-click="onConfigurationWorkbenchSignalClick"
      />
    </template>
    <UiAlertStrip
      v-if="loadFailed"
      tone="error"
      title="配置 readiness 加载失败"
      class="dp-mb-component"
    />
    <UiAlertStrip
      v-else-if="readiness"
      tone="info"
      title="配置依赖顺序"
      :description="`先组织/模板，再规则/指标，最后安全审计。生成于 ${readiness.generatedAt}`"
      class="dp-mb-component"
    />
    <section v-if="loading && !readiness" class="configuration-workbench__loading dp-meta">
      正在汇总配置能力就绪状态…
    </section>
    <section v-else-if="readiness" class="configuration-workbench">
      <section
        v-for="section in readiness.sections"
        :key="section.sectionCode"
        class="configuration-workbench__section"
      >
        <h2>
          {{
            section.sectionTitle
              || strictEnumLabel(
                PortfolioConfigurationSectionCodeDescription,
                section.sectionCode,
                '配置分区',
              )
          }}
        </h2>
        <div class="configuration-workbench__grid">
          <UiCard
            v-for="item in section.capabilities"
            :key="item.capabilityCode"
            class="configuration-workbench__card"
          >
            <div class="configuration-workbench__card-head">
              <strong>{{ item.title }}</strong>
              <UiTag :tone="statusTone(item.status)" size="sm">
                {{
                  strictEnumLabel(
                    PortfolioConfigurationCapabilityStatusDescription,
                    item.status,
                    '配置状态',
                  )
                }}
              </UiTag>
            </div>
            <p class="configuration-workbench__summary">{{ item.statusSummary }}</p>
            <p class="dp-meta">
              {{ item.ownerHint }}
              <template v-if="item.blockingCount != null"> · 待办 {{ item.blockingCount }}</template>
              <template v-if="item.lastChangedAt"> · 最近变更 {{ item.lastChangedAt }}</template>
            </p>
            <div class="configuration-workbench__card-actions">
              <UiButton size="sm" variant="primary" @click="openCapability(item)">
                {{ item.nextAction }}
              </UiButton>
            </div>
          </UiCard>
        </div>
      </section>
    </section>
  </StageWorkbenchShell>
</template>

<style scoped>
.configuration-workbench {
  padding: var(--dp-space-block);
}
.configuration-workbench__loading {
  padding: var(--dp-space-block);
}
.configuration-workbench__section + .configuration-workbench__section {
  margin-top: var(--dp-space-component);
  padding-top: var(--dp-space-component);
  border-top: 1px solid var(--dp-border-subtle);
}
.configuration-workbench__section h2 {
  margin: 0 0 var(--dp-space-component);
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
}
.configuration-workbench__grid {
  display: grid;
  gap: var(--dp-space-component);
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.configuration-workbench__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component-tight);
}
.configuration-workbench__summary {
  margin: 0 0 var(--dp-space-component-tight);
  color: var(--dp-text-primary);
  font-size: var(--dp-font-size-sm);
  line-height: 1.45;
}
.configuration-workbench__card-actions {
  margin-top: var(--dp-space-component);
}
</style>
