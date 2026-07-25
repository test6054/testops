<script setup lang="ts">
import type {
  PfEligibilityExplainStructDto,
  PfScoreExplainStructDto,
} from '@/apis/portfolio/indicator-types'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'

const props = defineProps<{
  open: boolean
  explainText?: string
  scoreExplain?: PfScoreExplainStructDto
  eligibilityExplain?: PfEligibilityExplainStructDto
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

function close() {
  emit('update:open', false)
}
</script>

<template>
  <UiDrawer :open="open" title="规则解释" width="480" @close="close">
    <p v-if="explainText">
      {{ explainText }}
    </p>
    <dl v-if="scoreExplain" class="explain-fields">
      <div>
        <dt>轨道</dt>
        <dd>{{ scoreExplain.ruleTrack }}</dd>
      </div>
      <div>
        <dt>指标</dt>
        <dd>{{ scoreExplain.indicatorCode }} {{ scoreExplain.indicatorName }}</dd>
      </div>
      <div v-if="scoreExplain.snapshotId">
        <dt>快照</dt>
        <dd>{{ scoreExplain.snapshotId }} / {{ scoreExplain.snapshotVersion }}</dd>
      </div>
      <div v-if="scoreExplain.academicYear">
        <dt>学年</dt>
        <dd>{{ scoreExplain.academicYear }}</dd>
      </div>
      <div v-if="scoreExplain.inputs">
        <dt>输入</dt>
        <dd>
          原始值 {{ scoreExplain.inputs.rawValue }}
          <span v-if="scoreExplain.inputs.unit">（{{ scoreExplain.inputs.unit }}）</span>
        </dd>
      </div>
      <div v-if="scoreExplain.ruleHit">
        <dt>规则命中</dt>
        <dd>
          {{ scoreExplain.ruleHit.ruleType }}
          / {{ scoreExplain.ruleHit.segmentLabel }}
          / 标准分 {{ scoreExplain.ruleHit.standardScore }}
          / 计算分 {{ scoreExplain.ruleHit.calcScore }}
          / {{ scoreExplain.ruleHit.passed ? '命中' : '未命中' }}
        </dd>
      </div>
      <div v-if="scoreExplain.audit">
        <dt>审核</dt>
        <dd>
          {{ scoreExplain.audit.required ? '需审核' : '无需审核' }}
          / {{ scoreExplain.audit.status }}
        </dd>
      </div>
      <div v-if="scoreExplain.generatedTime">
        <dt>生成时间</dt>
        <dd>{{ scoreExplain.generatedTime }}</dd>
      </div>
    </dl>
    <dl v-else-if="eligibilityExplain" class="explain-fields">
      <div>
        <dt>轨道</dt>
        <dd>{{ eligibilityExplain.ruleTrack }}</dd>
      </div>
      <div>
        <dt>资格规则</dt>
        <dd>{{ eligibilityExplain.eligibilityCode }}</dd>
      </div>
      <div v-if="eligibilityExplain.snapshotId">
        <dt>快照</dt>
        <dd>{{ eligibilityExplain.snapshotId }}</dd>
      </div>
      <div>
        <dt>结果</dt>
        <dd>{{ eligibilityExplain.eligible ? '满足' : '不满足' }}</dd>
      </div>
      <div v-if="eligibilityExplain.eligibilityGaps?.length">
        <dt>缺口</dt>
        <dd>
          <ul class="gap-list">
            <li v-for="(gap, index) in eligibilityExplain.eligibilityGaps" :key="index">
              {{ gap }}
            </li>
          </ul>
        </dd>
      </div>
      <div v-if="eligibilityExplain.root">
        <dt>根节点</dt>
        <dd>
          {{ eligibilityExplain.root.nodeType }}
          / {{ eligibilityExplain.root.fieldKey }}
          / {{ eligibilityExplain.root.passed ? '通过' : '未通过' }}
        </dd>
      </div>
      <div v-if="eligibilityExplain.generatedTime">
        <dt>生成时间</dt>
        <dd>{{ eligibilityExplain.generatedTime }}</dd>
      </div>
    </dl>
  </UiDrawer>
</template>

<style scoped>
.explain-fields {
  margin: var(--dp-space-component) 0 0;
  display: grid;
  gap: var(--dp-space-component-tight);
}
.explain-fields > div {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
}
.explain-fields dt {
  color: var(--dp-text-secondary);
}
.explain-fields dd {
  margin: 0;
}
.gap-list {
  margin: 0;
  padding-left: 18px;
}
</style>
