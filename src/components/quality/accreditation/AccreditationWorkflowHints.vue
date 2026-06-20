<script setup lang="ts">
import type { AccreditationCycleVO } from '@/apis/quality'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import {
  canConclusion,
  canRecordApplication,
  canReview,
  canSubmitSelfAssessment,
} from '@/composables/useAccreditationWorkbench'

const props = defineProps<{
  cycle?: AccreditationCycleVO
  supportConfirmed: boolean
  annualPlanCount: number
  evidenceCount: number
}>()

const emit = defineEmits<{
  'go-tab': [tab: string]
  'go-report': []
  'go-ai-report': []
  'go-archive': []
  'go-courses': []
  'create-cycle': []
  'create-annual': []
  'create-onsite': []
}>()

const hints = computed(() => {
  const list: { text: string, action?: string, tab?: string }[] = []
  if (!props.cycle) {
    list.push({
      text: '尚未建立认证周期，请先新建并登记申请书提交。',
      action: '新建周期',
      tab: 'cycle',
    })
    return list
  }
  const c = props.cycle
  if (canRecordApplication(c) && !c.applicationRecordedAt) {
    list.push({ text: '登记申请书提交（手工，不对接 eqem）。', action: '去周期页', tab: 'cycle' })
  }
  if (!props.supportConfirmed) {
    list.push({
      text: '师资与支持条件档案未确认，自评报告第 6、7 章无法引用。',
      action: '去师资页',
      tab: 'support',
    })
  }
  if (props.annualPlanCount === 0) {
    list.push({
      text: '创建年度评价课程计划并登记课程完成。',
      action: '新建年度计划',
      tab: 'annual',
    })
  }
  if (canSubmitSelfAssessment(c)) {
    list.push({
      text: '完成自评材料后提交自评，并可在报告/AI 任务页生成 T/CEEAA 八章报告。',
      action: '生成自评报告',
      tab: 'cycle',
    })
  }
  if (canReview(c)) {
    list.push({
      text: '登记自评审阅决议：受理进入现场考查 / 补正 / 不通过。',
      action: '去审阅',
      tab: 'cycle',
    })
  }
  if (c.currentPhase === 'ONSITE_VISIT') {
    list.push({
      text: '创建现场考查计划，逐项完成 CEEAA 检查清单并关联归档证据。',
      action: '新建考查',
      tab: 'onsite',
    })
  }
  if (canConclusion(c)) {
    list.push({
      text: '现场考查完成后登记认证结论（含有条件通过第 3 年改进到期）。',
      action: '登记结论',
      tab: 'cycle',
    })
  }
  if (props.evidenceCount === 0) {
    list.push({
      text: '上传并按类别归类专家材料证据，或从 mark 同步试卷扫描页。',
      action: '去证据页',
      tab: 'evidence',
    })
  } else {
    list.push({
      text: '证据齐备后可导出 PROGRAM_ACCREDITATION 专家材料包。',
      action: '去归档',
      tab: 'evidence',
    })
  }
  return list
})

function onHint(item: { action?: string, tab?: string }) {
  if (item.tab) emit('go-tab', item.tab)
  if (item.action === '生成自评报告') emit('go-ai-report')
  if (item.action === '去归档') emit('go-archive')
  if (item.action === '新建周期') emit('create-cycle')
  if (item.action === '新建年度计划') emit('create-annual')
  if (item.action === '新建考查') emit('create-onsite')
}
</script>

<template>
  <ul v-if="hints.length" class="hints">
    <li v-for="(item, i) in hints" :key="i" class="hints__item">
      <span>{{ item.text }}</span>
      <UiButton v-if="item.action" size="sm" variant="outline" @click="onHint(item)">
        {{ item.action }}
      </UiButton>
    </li>
  </ul>
</template>

<style scoped>
.hints {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hints__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  font-size: 13px;
  background: var(--dp-surface-subtle);
  border-radius: 4px;
  border: 1px solid var(--dp-border);
}
</style>
