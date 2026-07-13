<template>
  <a-drawer :open="open" title="跨学年进度对比" width="560" @close="close">
    <a-spin :spinning="loading">
      <p
        v-if="cockpit?.completenessDeltaVsPreviousYear !== undefined"
        class="portfolio-progress-compare__delta"
      >
        较上学年完整度变化：
        <strong>{{ formatDelta(cockpit.completenessDeltaVsPreviousYear) }}</strong>
      </p>
      <div v-if="cockpit?.periodRows?.length" class="portfolio-progress-compare__rows">
        <section
          v-for="row in cockpit.periodRows"
          :key="row.academicYear"
          class="portfolio-progress-compare__row"
        >
          <div class="portfolio-progress-compare__row-head">
            <h3>{{ row.academicYear }}</h3>
            <span class="portfolio-progress-compare__percent">{{ row.completenessPercent }}%</span>
          </div>
          <p class="portfolio-progress-compare__meta">
            待审 {{ row.pendingReviewCount ?? 0 }} 条 · 退回 {{ row.returnedCount ?? 0 }} 条 ·
            {{ row.academicYear === cockpit?.currentAcademicYear ? '补采' : '缺口' }}
            {{ row.openGapCount ?? 0 }} 项
            <template v-if="(row.courseArchiveFrameworkSlotTotal ?? 0) > 0">
              · 五框架 {{ row.courseArchiveFrameworkSlotDone ?? 0 }}/{{
                row.courseArchiveFrameworkSlotTotal ?? 0
              }}
            </template>
          </p>
          <div v-if="row.topGapCategoryNames?.length" class="portfolio-progress-compare__gaps">
            <span class="portfolio-progress-compare__gaps-label">TOP 缺口分类</span>
            <ul>
              <li v-for="name in row.topGapCategoryNames" :key="name">
                {{ name }}
              </li>
            </ul>
          </div>
          <UiEmpty v-else description="本学年暂无缺口分类" />
        </section>
      </div>
      <UiEmpty v-else-if="!loading" description="暂无进度对比数据" />
    </a-spin>
  </a-drawer>
</template>

<script lang="ts" setup>
import type { PortfolioTeacherProgressCockpitVO } from '@/apis/portfolio/types'
import { ref, watch } from 'vue'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'PortfolioProgressCompareDrawer' })

const props = defineProps<{
  open: boolean
  teacherId?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const loading = ref(false)
const cockpit = ref<PortfolioTeacherProgressCockpitVO | null>(null)
const requestToken = ref(0)

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${delta}%`
}

function resetCockpit() {
  cockpit.value = null
}

function close() {
  resetCockpit()
  emit('update:open', false)
}

async function loadCockpit() {
  const currentToken = requestToken.value
  if (!props.teacherId) {
    resetCockpit()
    return
  }
  resetCockpit()
  loading.value = true
  try {
    const nextCockpit = await portfolioAnalysisApi.getProgressCockpit({
      teacherId: props.teacherId,
    })
    if (requestToken.value !== currentToken) {
      return
    }
    cockpit.value = nextCockpit
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    resetCockpit()
    showUserError(error, '加载进度对比失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

watch(
  () => props.open,
  (open) => {
    requestToken.value += 1
    if (!open) {
      loading.value = false
      resetCockpit()
      return
    }
    void loadCockpit()
  },
)

watch(
  () => props.teacherId,
  (teacherId) => {
    requestToken.value += 1
    if (!teacherId) {
      resetCockpit()
      return
    }
    if (props.open) {
      void loadCockpit()
    }
  },
)
</script>

<style scoped lang="scss">
.portfolio-progress-compare__delta {
  margin: 0 0 var(--dp-space-4);
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.portfolio-progress-compare__rows {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}

.portfolio-progress-compare__row {
  padding: var(--dp-space-3);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-sm);
}

.portfolio-progress-compare__row-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--dp-space-3);
}

.portfolio-progress-compare__row-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: var(--dp-font-weight-semibold);
}

.portfolio-progress-compare__percent {
  font-size: 20px;
  font-weight: var(--dp-font-weight-semibold);
  color: var(--dp-text-primary);
}

.portfolio-progress-compare__meta {
  margin: var(--dp-space-2) 0 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.portfolio-progress-compare__gaps {
  margin-top: var(--dp-space-3);
}

.portfolio-progress-compare__gaps-label {
  display: block;
  margin-bottom: var(--dp-space-2);
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.portfolio-progress-compare__gaps ul {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
}
</style>
