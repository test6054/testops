<script lang="ts" setup>
/**
 * 未选考试时 B 钉条门禁：禁大 Empty 英雄区，唯一 CTA 去考试列表。
 * 真源实现委托 WorkbenchContextGateStrip。
 */
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'

defineOptions({ name: 'ExamSelectGateStrip' })

withDefaults(
  defineProps<{
    /** 展示文案（门禁语义，不放宽业务） */
    body?: string
    /** CTA 文案 */
    ctaLabel?: string
    /** 跳转路径，默认教师考试列表 */
    listPath?: string
  }>(),
  {
    body: '请先选择考试后再办理本页业务',
    ctaLabel: '打开考试列表',
    listPath: '/teacher/exam-list',
  },
)
</script>

<template>
  <WorkbenchContextGateStrip
    tag="未选择考试"
    :body="body"
    :cta-label="ctaLabel"
    :list-path="listPath"
    class="exam-select-gate-strip"
  />
</template>
