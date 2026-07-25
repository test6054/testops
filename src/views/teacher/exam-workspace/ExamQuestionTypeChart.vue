<template>
  <WorkbenchSurfaceCard class="qtype-chart">
    <template #head>
      <div class="qtype-chart__head">
        <h3 class="qtype-chart__title">题型与分值</h3>
        <span class="qtype-chart__meta">按分值占比</span>
      </div>
    </template>
    <UiSkeletonState v-if="loading" variant="list" :rows="4" compact />
    <UiEmpty v-else-if="!data || data.items.length === 0" size="sm" description="暂未配置题目" />
    <div v-else class="qtype-chart__body">
      <div v-for="item in data.items" :key="item.ocrScene" class="qtype-chart__row">
        <span class="qtype-chart__label">{{ item.ocrSceneMessage }}</span>
        <div class="qtype-chart__track">
          <div
            class="qtype-chart__fill"
            :class="{ 'qtype-chart__fill--lead': item.totalFullScore === maxScore }"
            :style="{ width: barWidth(item.totalFullScore) }"
          />
        </div>
        <span class="qtype-chart__count">{{ item.questionCount }} 题</span>
        <span class="qtype-chart__score">{{ item.totalFullScore }} 分</span>
      </div>
      <footer class="qtype-chart__foot">
        <span>共 <strong>{{ data.totalQuestionCount }}</strong> 题</span>
        <span>满分 <strong>{{ data.totalFullScore }}</strong> 分</span>
      </footer>
    </div>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { ExamQuestionTypeDistributionResponse } from '@/apis/mark/exam-progress'
import { computed } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'

defineOptions({ name: 'ExamQuestionTypeChart' })

const props = defineProps<{
  data: ExamQuestionTypeDistributionResponse | null
  loading: boolean
}>()

const maxScore = computed(() => {
  if (!props.data || props.data.items.length === 0) return 0
  return Math.max(...props.data.items.map((i) => i.totalFullScore))
})

function barWidth(score: number): string {
  if (maxScore.value <= 0) return '0%'
  return `${Math.round((score / maxScore.value) * 100)}%`
}
</script>

<style lang="scss" scoped>
.qtype-chart {
  &__head {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
  }

  &__title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__meta {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-tertiary);
  }

  &__row {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
    padding: var(--dp-space-2) 0;
  }

  &__label {
    width: 56px;
    flex-shrink: 0;
    font-size: var(--dp-font-size-sm);
    font-weight: 500;
    color: var(--dp-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__track {
    flex: 1;
    height: 8px;
    border-radius: var(--dp-radius-full);
    background: var(--dp-gray-100);
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: inherit;
    background: color-mix(in srgb, var(--dp-color-primary) 40%, transparent);
    transition: width var(--dp-duration-normal) ease;

    &--lead {
      background: var(--dp-color-primary);
    }
  }

  &__count {
    width: 44px;
    flex-shrink: 0;
    text-align: right;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
    font-variant-numeric: tabular-nums;
  }

  &__score {
    width: 44px;
    flex-shrink: 0;
    text-align: right;
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    color: var(--dp-text-primary);
    font-variant-numeric: tabular-nums;
  }

  &__foot {
    display: flex;
    justify-content: space-between;
    margin-top: var(--dp-space-3);
    padding-top: var(--dp-space-3);
    border-top: 1px solid var(--dp-border);
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);

    strong {
      font-weight: 600;
      color: var(--dp-text-primary);
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>
