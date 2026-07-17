<script setup lang="ts">
/**
 * 补扫启动面板：触摸屏大控件采集补扫必填项，确认后直接开批次。
 */
import { computed, ref, watch } from 'vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { useKioskCtx } from '../composables/kioskInjection'

const open = defineModel<boolean>('open', { required: true })

const SUPPLEMENT_REASON_PRESETS = ['缺页补扫', '污损重扫', '识别异常重扫', '顺序错误补扫'] as const

const { workflow, mutex, stage } = useKioskCtx()

const launching = ref(false)
const preparing = ref(false)
const prepareFailed = ref(false)

const paperOptions = computed(() => workflow.supplementBoundPapers.value)
const pagesPerSheet = computed(
  () => workflow.kioskContext.value?.taskContract?.pagesPerSheet ?? null,
)

const selectedPaper = computed(() =>
  paperOptions.value.find(
    (item) => item.paperInstanceId === workflow.supplementPaperInstanceId.value,
  ),
)

const fieldBlockReason = computed(() => workflow.supplementLaunchFieldBlockedReason.value)

const canConfirm = computed(
  () =>
    !preparing.value
    && !prepareFailed.value
    && !fieldBlockReason.value
    && mutex.canDo('startSupplementScan')
    && !launching.value
    && !workflow.loading.value,
)

const confirmBlockReason = computed(
  () => fieldBlockReason.value || mutex.reasonOf('startSupplementScan') || '',
)

watch(open, async (isOpen) => {
  if (!isOpen) {
    launching.value = false
    preparing.value = false
    prepareFailed.value = false
    await workflow.cancelSupplementLaunch()
    return
  }
  launching.value = false
  preparing.value = true
  prepareFailed.value = false
  const ready = await workflow.prepareSupplementLaunch()
  preparing.value = false
  if (!ready) {
    prepareFailed.value = true
  }
})

function selectReasonPreset(reason: string) {
  workflow.supplementReason.value = reason
}

function decrementPageNo() {
  const current = workflow.supplementTargetPageNo.value ?? 1
  workflow.supplementTargetPageNo.value = Math.max(1, current - 1)
}

function incrementPageNo() {
  const current = workflow.supplementTargetPageNo.value ?? 1
  const maxPage = pagesPerSheet.value
  const next = current + 1
  if (maxPage != null && maxPage > 0) {
    workflow.supplementTargetPageNo.value = Math.min(maxPage, next)
    return
  }
  workflow.supplementTargetPageNo.value = next
}

function closeModal() {
  open.value = false
}

function formatMissingPages(pageNos?: number[]) {
  const pages = pageNos?.filter((pageNo) => pageNo > 0) ?? []
  if (pages.length === 0) return ''
  return `缺 ${pages.join('、')} 页`
}

async function confirmSupplement() {
  if (!canConfirm.value) return
  launching.value = true
  try {
    const started = await workflow.startSupplementScan()
    if (started) {
      open.value = false
      stage.gotoStage('scanning')
    }
  } finally {
    launching.value = false
  }
}
</script>

<template>
  <UiDialog
    v-model:open="open"
    title="补扫"
    :width="640"
    hide-footer
    destroy-on-close
    class="supplement-launch-modal"
  >
    <div v-if="preparing" class="supplement-launch supplement-launch--loading">
      <UiSpin tip="加载可补扫试卷…" />
    </div>
    <div v-else-if="prepareFailed" class="supplement-launch supplement-launch--failed">
      <p>{{ workflow.errorMessage.value || '当前无法开启补扫' }}</p>
      <button type="button" class="action-btn action-btn--ghost" @click="closeModal">关闭</button>
    </div>
    <div v-else class="supplement-launch">
      <p class="supplement-launch__hint">
        补扫每次仅登记单页。请选择本工位已绑定试卷、指定目标页号并填写原因。
      </p>

      <section class="supplement-launch__section">
        <h4>补扫试卷</h4>
        <div v-if="paperOptions.length" class="paper-tiles">
          <button
            v-for="paper in paperOptions"
            :key="paper.paperInstanceId"
            type="button"
            class="paper-tile"
            :class="{
              'paper-tile--active':
                workflow.supplementPaperInstanceId.value === paper.paperInstanceId,
            }"
            @click="workflow.selectSupplementPaper(paper.paperInstanceId)"
          >
            <strong>{{ paper.studentName }}</strong>
            <span>{{ paper.studentNo }}</span>
            <small v-if="formatMissingPages(paper.missingTemplatePageNos)">
              {{ formatMissingPages(paper.missingTemplatePageNos) }}
            </small>
          </button>
        </div>
        <p v-else class="supplement-launch__empty">本工位暂无已绑定试卷，请先完成首次扫描与绑定</p>
      </section>

      <section class="supplement-launch__section">
        <h4>目标页号</h4>
        <div class="page-stepper">
          <button type="button" class="stepper-btn" @click="decrementPageNo">−</button>
          <span class="page-stepper__value">{{ workflow.supplementTargetPageNo.value ?? 1 }}</span>
          <button type="button" class="stepper-btn" @click="incrementPageNo">+</button>
        </div>
        <p v-if="pagesPerSheet != null && pagesPerSheet > 0" class="supplement-launch__sub">
          模板共 {{ pagesPerSheet }} 页
        </p>
      </section>

      <section class="supplement-launch__section">
        <h4>补扫原因</h4>
        <div class="reason-chips">
          <button
            v-for="reason in SUPPLEMENT_REASON_PRESETS"
            :key="reason"
            type="button"
            class="reason-chip"
            :class="{ 'reason-chip--active': workflow.supplementReason.value === reason }"
            @click="selectReasonPreset(reason)"
          >
            {{ reason }}
          </button>
        </div>
        <input
          v-model="workflow.supplementReason.value"
          type="text"
          maxlength="120"
          class="reason-input"
          placeholder="或输入其他原因"
        />
      </section>

      <section class="supplement-launch__section">
        <h4>登记方式</h4>
        <div class="replace-seg">
          <button
            type="button"
            class="replace-seg__btn"
            :class="{ 'replace-seg__btn--active': !workflow.supplementReplaceTargetPage.value }"
            @click="workflow.supplementReplaceTargetPage.value = false"
          >
            追加补扫
          </button>
          <button
            type="button"
            class="replace-seg__btn"
            :class="{ 'replace-seg__btn--active': workflow.supplementReplaceTargetPage.value }"
            @click="workflow.supplementReplaceTargetPage.value = true"
          >
            替换目标页
          </button>
        </div>
        <p v-if="selectedPaper" class="supplement-launch__sub">
          {{ selectedPaper.studentName }}（{{ selectedPaper.studentNo }}）
        </p>
      </section>

      <p v-if="fieldBlockReason" class="supplement-launch__error">{{ fieldBlockReason }}</p>

      <div class="supplement-launch__actions">
        <button type="button" class="action-btn action-btn--ghost" @click="closeModal">取消</button>
        <button
          type="button"
          class="action-btn action-btn--primary"
          :disabled="!canConfirm"
          :title="confirmBlockReason || '确认补扫'"
          @click="confirmSupplement"
        >
          {{ launching || workflow.loading.value ? '处理中…' : '确认补扫' }}
        </button>
      </div>
    </div>
  </UiDialog>
</template>

<style scoped>
.supplement-launch {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-4);
}

.supplement-launch--loading,
.supplement-launch--failed {
  align-items: center;
  justify-content: center;
  min-height: 180px;
}

.supplement-launch--failed p {
  margin: 0 0 var(--kiosk-space-4);
  color: var(--kiosk-danger);
  text-align: center;
}

.supplement-launch__hint {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  line-height: var(--kiosk-lh-base);
}

.supplement-launch__section h4 {
  margin: 0 0 var(--kiosk-space-2);
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-secondary);
}

.supplement-launch__empty,
.supplement-launch__sub {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.supplement-launch__error {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-danger);
}

.paper-tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--kiosk-space-2);
}

.paper-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: var(--kiosk-h-action-md);
  padding: var(--kiosk-space-3);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.paper-tile--active {
  border-color: var(--kiosk-primary);
  background: var(--kiosk-primary-soft);
}

.paper-tile strong {
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-primary);
}

.paper-tile span,
.paper-tile small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.paper-tile small {
  color: var(--kiosk-warning);
}

.page-stepper {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-3);
}

.stepper-btn {
  width: var(--kiosk-h-icon-button);
  height: var(--kiosk-h-icon-button);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.page-stepper__value {
  min-width: 48px;
  text-align: center;
  font-size: var(--kiosk-fz-h2);
  font-weight: var(--kiosk-fw-bold);
  font-variant-numeric: tabular-nums;
}

.reason-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--kiosk-space-2);
  margin-bottom: var(--kiosk-space-2);
}

.reason-chip {
  min-height: var(--kiosk-h-input-sm);
  padding: 0 var(--kiosk-space-3);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  cursor: pointer;
}

.reason-chip--active {
  border-color: var(--kiosk-warning);
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
}

.reason-input {
  width: 100%;
  height: var(--kiosk-h-input);
  padding: 0 var(--kiosk-space-3);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
}

.replace-seg {
  display: flex;
  gap: var(--kiosk-space-1);
  padding: 3px;
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
}

.replace-seg__btn {
  flex: 1;
  min-height: var(--kiosk-h-action-md);
  border: none;
  border-radius: calc(var(--kiosk-radius-md) - 2px);
  background: transparent;
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-medium);
  cursor: pointer;
}

.replace-seg__btn--active {
  background: var(--kiosk-surface);
  color: var(--kiosk-primary);
  box-shadow: var(--kiosk-shadow-1);
}

.supplement-launch__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--kiosk-space-3);
  padding-top: var(--kiosk-space-2);
}

.action-btn {
  min-height: var(--kiosk-h-action-md);
  min-width: 140px;
  padding: 0 var(--kiosk-space-5);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
}

.action-btn--ghost {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  color: var(--kiosk-ink-secondary);
}

.action-btn--primary {
  background: var(--kiosk-warning);
  border: none;
  color: var(--kiosk-primary-on);
}

.action-btn--primary:disabled {
  background: var(--kiosk-neutral);
  cursor: not-allowed;
}
</style>
