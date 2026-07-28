<script setup lang="ts">
import type { ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import type { ExamPaperPageKindCode } from '@/types/enums/exam-paper-page-kind-enum'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import { ExamPaperPageKindDescription } from '@/types/enums/exam-paper-page-kind-enum'
import { ExamPrintSheetSideDescription } from '@/types/enums/exam-print-sheet-side-enum'
import { LayoutDesignPhaseCode } from '@/types/enums/layout-design-phase-enum'
import {
  computeIdentityFieldReadiness,
  hasStaffZoneIdentityConflict,
  validateLayoutDocumentForSave,
} from '@/utils/exam-layout-designer'

const props = defineProps<{
  document: ExamLayoutDocument | null
  saveBlockingReasons: string[]
  saving?: boolean
  previewing?: boolean
  previewDisabled?: boolean
  saveDisabled?: boolean
  saveTooltip?: string
}>()

const emit = defineEmits<{
  save: []
  preview: []
  navigate: [phase: LayoutDesignPhaseCode]
}>()

const checklist = computed(() => {
  const reasons = props.saveBlockingReasons.length > 0
    ? props.saveBlockingReasons
    : validateLayoutDocumentForSave(props.document)
  if (reasons.length === 0) {
    return [{ tone: 'green' as const, text: '制卷设计校验通过，可以保存并预览 PDF' }]
  }
  return reasons.map((text) => ({ tone: 'orange' as const, text }))
})

const identityReadiness = computed(() => computeIdentityFieldReadiness(props.document))
const staffZoneConflict = computed(() => hasStaffZoneIdentityConflict(props.document))
const physicalPageSummary = computed(() => {
  const counts = new Map<ExamPaperPageKindCode, number>()
  for (const page of props.document?.pages ?? []) {
    if (page.pageKind) {
      counts.set(page.pageKind, (counts.get(page.pageKind) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([kind, count]) => `${ExamPaperPageKindDescription[kind]} ${count} 页`)
    .join(' · ')
})

const scanRequiredPageCount = computed(
  () => props.document?.pages.filter((page) => page.scanRequired === true).length ?? 0,
)

function pageKindLabel(pageKind: ExamPaperPageKindCode | undefined): string {
  return pageKind ? ExamPaperPageKindDescription[pageKind] : '未配置'
}

function printSideLabel(printSide: keyof typeof ExamPrintSheetSideDescription | undefined): string {
  return printSide ? ExamPrintSheetSideDescription[printSide] : '未配置'
}

function logicalPageLabel(from: number | undefined, to: number | undefined): string {
  if (from == null || to == null) {
    return '未配置'
  }
  return from === to ? `第 ${from} 页` : `第 ${from}-${to} 页`
}

function resolveNavigatePhase(reason: string): LayoutDesignPhaseCode | null {
  if (reason.includes('身份') || reason.includes('ROI') || reason.includes('作答区')) {
    return LayoutDesignPhaseCode.LAYOUT
  }
  if (reason.includes('答案') || reason.includes('题目')) {
    return LayoutDesignPhaseCode.QUESTIONS
  }
  if (reason.includes('页') || reason.includes('源文件') || reason.includes('PDF')) {
    return LayoutDesignPhaseCode.SOURCE
  }
  return null
}
</script>

<template>
  <section class="layout-design-review-phase">
    <div class="layout-design-review-phase__header">
      <h2 class="layout-design-review-phase__title">校验清单</h2>
      <div class="layout-design-review-phase__actions">
        <UiButton
          size="sm"
          variant="outline"
          :loading="previewing"
          :disabled="previewDisabled"
          @click="emit('preview')"
        >
          预览 PDF
        </UiButton>
        <UiTooltip :title="saveTooltip">
          <UiButton
            size="sm"
            variant="primary"
            :loading="saving"
            :disabled="saveDisabled"
            @click="emit('save')"
          >
            保存设计
          </UiButton>
        </UiTooltip>
      </div>
    </div>
    <div class="layout-design-review-phase__evidence-status">
      <UiTag
        v-for="item in identityReadiness"
        :key="item.code"
        :tone="item.ready ? 'green' : 'orange'"
        size="sm"
      >
        {{ item.label }} {{ item.ready ? '已就绪' : item.count === 0 ? '缺失' : '重复' }}
      </UiTag>
      <UiTag :tone="staffZoneConflict ? 'red' : 'green'" size="sm">
        工作人员区域 {{ staffZoneConflict ? '冲突' : '无冲突' }}
      </UiTag>
      <span v-if="physicalPageSummary" class="dp-text-muted-xs">{{ physicalPageSummary }}</span>
    </div>
    <section v-if="document?.pages.length" class="layout-design-review-phase__page-contract">
      <div class="layout-design-review-phase__page-contract-head">
        <div>
          <h3>印刷与扫描逐页合同</h3>
          <p>正式保存后，扫描模板只发布标记为必扫的物理页。</p>
        </div>
        <UiTag :tone="scanRequiredPageCount > 0 ? 'blue' : 'red'" size="sm">
          必扫 {{ scanRequiredPageCount }}/{{ document.pages.length }} 面
        </UiTag>
      </div>
      <div class="layout-design-review-phase__page-table-wrap">
        <table class="layout-design-review-phase__page-table">
          <thead>
            <tr>
              <th>统一页序</th>
              <th>材料页型</th>
              <th>材料内页</th>
              <th>印张 / 面</th>
              <th>承载逻辑页</th>
              <th>扫描模板</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="page in document.pages" :key="page.id ?? `draft-page-${page.pageNo}`">
              <td>第 {{ page.pageNo }} 面</td>
              <td>{{ pageKindLabel(page.pageKind) }}</td>
              <td>{{ page.artifactPageNo == null ? '未配置' : `第 ${page.artifactPageNo} 页` }}</td>
              <td>
                {{ page.printSheetNo == null ? '未配置' : `第 ${page.printSheetNo} 张` }}
                · {{ printSideLabel(page.printSide) }}
              </td>
              <td>{{ logicalPageLabel(page.logicalPageFrom, page.logicalPageTo) }}</td>
              <td>
                <UiTag
                  :tone="page.scanRequired === true ? 'green' : page.scanRequired === false ? 'gray' : 'red'"
                  size="sm"
                >
                  {{ page.scanRequired === true ? '必扫' : page.scanRequired === false ? '不扫描' : '未配置' }}
                </UiTag>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <ul class="layout-design-review-phase__list">
      <li
        v-for="(item, index) in checklist"
        :key="`${item.text}-${index}`"
        class="layout-design-review-phase__item"
      >
        <UiTag :tone="item.tone" size="sm">{{ item.tone === 'green' ? '通过' : '待处理' }}</UiTag>
        <span class="layout-design-review-phase__text">{{ item.text }}</span>
        <UiButton
          v-if="item.tone !== 'green'"
          size="sm"
          variant="ghost"
          @click="emit('navigate', resolveNavigatePhase(item.text) ?? LayoutDesignPhaseCode.SOURCE)"
        >
          前往处理
        </UiButton>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.layout-design-review-phase {
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface, var(--dp-surface));

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component-tight);
  }

  &__title {
    margin: 0;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }

  &__actions {
    display: flex;
    gap: var(--dp-space-component-tight);
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
  }

  &__evidence-status {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component-tight);
  }

  &__page-contract {
    margin-bottom: var(--dp-space-component);
    padding: var(--dp-space-component-tight);
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-control);
    background: var(--dp-surface-subtle);
  }

  &__page-contract-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-component-tight);

    h3,
    p {
      margin: 0;
    }

    h3 {
      font-size: var(--dp-font-size-sm);
      font-weight: 600;
      color: var(--dp-text-primary);
    }

    p {
      margin-top: var(--dp-space-component-xs);
      font-size: var(--dp-font-size-xs);
      color: var(--dp-text-secondary);
    }
  }

  &__page-table-wrap {
    overflow-x: auto;
  }

  &__page-table {
    width: 100%;
    min-width: 760px;
    border-collapse: collapse;
    font-size: var(--dp-font-size-xs);

    th,
    td {
      padding: var(--dp-space-component-tight);
      text-align: left;
      white-space: nowrap;
      border-bottom: 1px solid var(--dp-border-subtle);
    }

    th {
      color: var(--dp-text-secondary);
      font-weight: 600;
    }

    td {
      color: var(--dp-text-primary);
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }
  }

  &__item {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    padding: var(--dp-space-component-tight) 0;
    border-bottom: 1px solid var(--dp-border-subtle);
  }

  &__text {
    flex: 1;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-primary);
  }
}
</style>
