<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'

const route = useRoute()
const router = useRouter()

const returnFormId = computed(() => {
  const raw = route.query.formId
  return typeof raw === 'string' ? raw.trim() : ''
})

const returnResultId = computed(() => {
  const raw = route.query.resultId
  return typeof raw === 'string' ? raw.trim() : ''
})

const returnFromStatistics = computed(
  () => route.query.from === 'statistics' && Boolean(returnFormId.value),
)
const returnFromAchievement = computed(
  () => route.query.from === 'achievement' && Boolean(returnResultId.value),
)

/** 从统计抽屉或达成度详情进入时回到来源页，否则回到间接评价台账 */
function handleReturn() {
  if (returnFromAchievement.value) {
    void router.push({
      name: 'QualityAchievementDetail',
      params: { resultId: returnResultId.value },
    })
    return
  }
  if (returnFromStatistics.value) {
    void router.push({
      name: 'QualityIngestIndirectEvaluation',
      query: {
        formId: returnFormId.value,
        openStatistics: '1',
      },
    })
    return
  }
  void router.push({ name: 'QualityIngestIndirectEvaluation' })
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar title="间接达成度题项加权说明">
        <template #status>
          <UiButton variant="outline" size="sm" @click="handleReturn">
            {{
              returnFromAchievement
                ? '返回达成度详情'
                : returnFromStatistics
                  ? '返回问卷统计'
                  : '返回间接评价'
            }}
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiCard title="计算口径与示例">
      <p class="help__p">
        同一课程目标下配置多道间接评价题项时，间接达成度按题项权重加权合成，不再对全部答卷做简单均值。
      </p>
      <p class="help__formula">V = Σ(μ<sub>i</sub> × w<sub>i</sub>) / Σw<sub>i</sub></p>
      <ul class="help__list">
        <li>μ<sub>i</sub>：题项 i 的已换算有效分均值，对应问卷统计中的「题项均值 μ」</li>
        <li>w<sub>i</sub>：题项配置权重；同目标下全部留空或 0 时自动等权重 1:1</li>
        <li>分母仅包含有换算样本的题项；存在待换算答卷时该目标达成度不可出数</li>
      </ul>
      <p class="help__p help__p--numeric">
        某门课课程目标 CO1 配置两道间接评价题项：期末学生自评量表（权重
        2）与开放题「学习收获」（权重 1）。 量表题 μ = 0.80，开放题教师换算后 μ = 0.20，则 CO1
        间接达成度 V = (0.80×2 + 0.20×1) / 3 = <strong>0.60</strong>，而非简单均值 0.50。
      </p>
      <p class="help__p">
        工程认证与 OBE
        场景下，多题项支撑同一指标时权重反映题项对目标贡献的设计意图；问卷统计中的「总体换算分」与达成度报告数值保持一致。
      </p>
    </UiCard>

    <section class="help__section">
      <h3 class="help__title">权重配置规则</h3>
      <ul class="help__list">
        <li>同目标下全部题项权重留空或 0：系统等权重 1:1，兼容单题项问卷</li>
        <li>同目标下部分题项有权重、部分为 0 或空：保存时阻断，需补齐或全部留空</li>
        <li>已发布问卷禁止修改权重与结构，仅允许改题干与选项/量表文案</li>
      </ul>
    </section>

    <section class="help__section">
      <h3 class="help__title">口径升级与历史数据</h3>
      <ul class="help__list">
        <li>上线后历史达成度报告将标记为待重算并异步更新，数值可能变化</li>
        <li>题项换算分汇总与达成度计算同源，可通过「重建题项统计」修复统计漂移</li>
        <li>问卷统计展示题项 μ、有效权重 w 与贡献 μ×w，便于认证材料核对</li>
      </ul>
    </section>

    <section class="help__section">
      <h3 class="help__title">已发布问卷文案修订</h3>
      <p class="help__p">
        收集中修正题干或选项文案无需二次发布；保存后立即对新打开的公开链接生效。题项编辑弹窗可查看文案修订时间线，历史已提交答卷的作答摘要保持不变。
      </p>
    </section>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.help {
  &__section {
    padding-top: var(--dp-space-2);
  }

  &__title {
    margin: 0 0 var(--dp-space-3);
    font-size: var(--dp-font-size-lg);
    font-weight: var(--dp-font-weight-title);
    color: var(--dp-text-primary);
    line-height: 1.5;
  }

  &__p {
    margin: 0 0 var(--dp-space-3);
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-md);
    line-height: 1.6;

    &--numeric {
      font-variant-numeric: tabular-nums;
    }
  }

  &__formula {
    margin: 0 0 var(--dp-space-3);
    padding: var(--dp-space-3) var(--dp-space-4);
    background: var(--dp-surface-subtle);
    border-radius: var(--dp-radius-panel);
    font-size: var(--dp-font-size-lg);
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  &__list {
    margin: 0;
    padding-left: 20px;
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-md);
    line-height: 1.7;
  }
}
</style>
