<template>
  <div id="archive-task-provenance" class="form-section">
    <div class="section-header">
      <h3 class="section-title">选择任务来源</h3>
    </div>
    <p class="section-desc">本学期线下考核为主路径；历史数字化与批量导入为次级入口。</p>

    <button
      type="button"
      class="archive-task-provenance__primary"
      :class="{
        'archive-task-provenance__primary--active': wizardState.provenance === offlineCode,
      }"
      @click="emit('select', offlineCode)"
    >
      <span class="archive-task-provenance__primary-label">本学期线下考核归档</span>
      <span class="archive-task-provenance__primary-desc">
        未走线上阅卷主链的本学期考试，选定模板套后登记材料与成绩事实。
      </span>
      <UiTag tone="blue" size="sm">推荐</UiTag>
    </button>

    <div class="archive-task-provenance__secondary">
      <UiTextAction @click="emit('select', historicalCode)">历史档案数字化</UiTextAction>
      <span class="archive-task-provenance__divider">·</span>
      <UiTextAction @click="emit('batch-excel')">批量 Excel 导入</UiTextAction>
    </div>
    <p v-if="wizardState.provenance === historicalCode" class="create-form__hint">
      已选历史档案数字化，请继续填写任务信息与归档方案。
    </p>
  </div>
</template>

<script setup lang="ts">
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { ArchiveTaskProvenanceCode } from '@/types/enums/archive-task-provenance-enum'
import { useInjectedArchiveTaskCreateWizardState } from './archive-task-create-context'

const emit = defineEmits<{
  "select": [provenance: ArchiveTaskProvenanceCode]
  'batch-excel': []
}>()

const wizardState = useInjectedArchiveTaskCreateWizardState()
const offlineCode = ArchiveTaskProvenanceCode.CURRENT_TERM_OFFLINE
const historicalCode = ArchiveTaskProvenanceCode.HISTORICAL_DIGITIZE
</script>

<style scoped lang="scss">
.archive-task-provenance__primary {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 16px;
  text-align: left;
  background: var(--dp-bg-subtle);
  border: 1px solid var(--dp-border-light);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover,
  &--active {
    border-color: var(--dp-color-primary);
  }
}

.archive-task-provenance__primary-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-task-provenance__primary-desc {
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-muted);
}

.archive-task-provenance__secondary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.archive-task-provenance__divider {
  color: var(--dp-text-muted);
}
</style>
