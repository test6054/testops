<script setup lang="ts">
/**
 * 扫描参数与模式抽屉：硬件参数与扫描模式；制卷核对在就绪页制卷摘要区。
 */
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, ui } = useKioskCtx()

const open = computed({
  get: () => ui.scanParamsDrawerOpen.value,
  set: (v: boolean) => { ui.scanParamsDrawerOpen.value = v },
})

const contract = computed(() => workflow.kioskContext.value?.taskContract)
const scanConfigOptions = computed(() => workflow.kioskContext.value?.scanConfigOptions)
const recommendedConfig = computed(() => scanConfigOptions.value?.defaultScanConfig)
const scanConfigAdvisory = computed(() => scanConfigOptions.value?.scanConfigAdvisory?.trim() || '')
const scanConfigHint = computed(() => scanConfigOptions.value?.scanConfigHint?.trim() || '')
const scanConfigBoundaryNote = '单面/双面扫描可按实际送纸修改，与应扫页数无强制对应。'
const dpiOptions = computed(() =>
  (scanConfigOptions.value?.allowedDpis ?? []).map((dpi) => ({ value: dpi, label: `${dpi} DPI` })),
)
const colorModeOptions = computed(() =>
  (scanConfigOptions.value?.colorModes ?? []).map((mode) => ({
    value: mode,
    label: workflow.scannerColorModeLabel(mode),
  })),
)
const duplexModeOptions = computed(() =>
  (scanConfigOptions.value?.duplexModes ?? []).map((mode) => ({
    value: mode,
    label: workflow.scannerDuplexModeLabel(mode),
  })),
)
const paramsDisabled = computed(() => !workflow.canSwitchScanMode.value || !scanConfigOptions.value)
const isSupplement = computed(() => workflow.scanMode.value === 'SUPPLEMENT')
const scanModeAdvisory = computed(() => workflow.scanModeAdvisory.value)

const supplementPaperOptions = computed(() =>
  workflow.supplementBoundPapers.value.map((item) => ({
    value: item.paperInstanceId,
    label: `${item.studentName || '—'}（${item.studentNo || '—'}）`,
  })),
)

const contractTitleText = computed(() => {
  if (!contract.value) return ''
  const kind = contract.value.materialKindText || '扫描材料'
  const layout = contract.value.materialLayoutModeText?.trim()
  const paperStyle = contract.value.paperStyleText?.trim()
  if (layout) return `${kind} · ${layout}`
  if (paperStyle && paperStyle !== '未配置') return `${kind} · ${paperStyle}`
  return kind
})

const scanModeSummary = computed(() => workflow.scanModeText(workflow.scanMode.value, ''))

const scanModeTone = computed(() => {
  const mode = workflow.scanMode.value
  if (mode === 'SUPPLEMENT') return 'supplement'
  if (mode === 'ARCHIVE') return 'archive'
  return 'direct'
})

const hardwareParamPreview = computed(() => {
  const items: string[] = []
  const config = workflow.scanConfig.value
  if (config.dpi) items.push(`${config.dpi} DPI`)
  if (config.colorMode) items.push(workflow.scannerColorModeLabel(config.colorMode))
  if (config.duplexMode) items.push(workflow.scannerDuplexModeLabel(config.duplexMode))
  return items
})

const duplexMismatchHint = computed(() => {
  const recommended = recommendedConfig.value?.duplexMode
  const current = workflow.scanConfig.value.duplexMode
  if (!recommended || !current || recommended === current) return ''
  return `系统建议 ${workflow.scannerDuplexModeLabel(recommended)}，当前为 ${workflow.scannerDuplexModeLabel(current)}，可按实际送纸修改`
})

const SCAN_MODES = [
  { id: 'DIRECT' as const, label: '首次扫描' },
  { id: 'SUPPLEMENT' as const, label: '补扫' },
  { id: 'ARCHIVE' as const, label: '历史存档' },
]

function selectMode(mode: 'DIRECT' | 'SUPPLEMENT' | 'ARCHIVE') {
  if (mode !== workflow.scanMode.value) workflow.changeScanMode(mode)
}

function applyRecommendedScanConfig() {
  workflow.applyExamRecommendedScanConfig(true)
}
</script>

<template>
  <a-drawer
    v-model:open="open"
    title="扫描参数"
    placement="right"
    :width="420"
    destroy-on-close
  >
    <div class="drawer-body">
      <section v-if="contract" class="contract-hint">
        <p class="contract-hint__title">
          {{ contractTitleText }}
        </p>
        <p v-if="contract.materialLayoutModeText && contract.paperStyleText" class="contract-hint__sub">
          纸型：{{ contract.paperStyleText }}
        </p>
        <p v-else-if="contract.materialLayoutModeText" class="contract-hint__sub">
          制卷形态：{{ contract.materialLayoutModeText }}
        </p>
        <p v-if="scanConfigOptions" class="contract-hint__profile">
          <span class="contract-hint__mode" :class="`contract-hint__mode--${scanModeTone}`">
            {{ scanModeSummary }}
          </span>
          <span
            v-for="item in hardwareParamPreview"
            :key="item"
            class="contract-hint__chip"
          >
            {{ item }}
          </span>
        </p>
        <p v-if="scanConfigHint" class="contract-hint__sub">
          {{ scanConfigHint }}
        </p>
        <p v-if="contract.scanMaterialAdvisory" class="contract-hint__warn">
          {{ contract.scanMaterialAdvisory }}
        </p>
        <p v-if="scanConfigAdvisory" class="contract-hint__warn">
          {{ scanConfigAdvisory }}
        </p>
        <p v-if="scanModeAdvisory" class="contract-hint__warn">
          {{ scanModeAdvisory }}
        </p>
        <button
          v-if="recommendedConfig"
          type="button"
          class="contract-hint__action"
          :disabled="paramsDisabled"
          @click="applyRecommendedScanConfig"
        >
          恢复考试推荐参数
        </button>
      </section>

      <div class="field">
        <span class="field__label">扫描模式</span>
        <div class="seg">
          <button
            v-for="mode in SCAN_MODES"
            :key="mode.id"
            type="button"
            class="seg__btn"
            :class="{ 'seg__btn--active': workflow.scanMode.value === mode.id }"
            :disabled="!workflow.canSwitchScanMode.value"
            @click="selectMode(mode.id)"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <div class="field">
        <span class="field__label">分辨率</span>
        <a-select
          v-model:value="workflow.scanConfig.value.dpi"
          :options="dpiOptions"
          :disabled="paramsDisabled"
          class="full"
        />
      </div>
      <div class="field">
        <span class="field__label">色彩</span>
        <a-select
          v-model:value="workflow.scanConfig.value.colorMode"
          :options="colorModeOptions"
          :disabled="paramsDisabled"
          class="full"
        />
      </div>
      <div class="field">
        <span class="field__label">单面/双面扫描</span>
        <a-select
          v-model:value="workflow.scanConfig.value.duplexMode"
          :options="duplexModeOptions"
          :disabled="paramsDisabled"
          class="full"
        />
        <p class="field__hint field__hint--muted">{{ scanConfigBoundaryNote }}</p>
        <p v-if="duplexMismatchHint" class="field__hint">{{ duplexMismatchHint }}</p>
      </div>
      <label class="check">
        <input
          v-model="workflow.scanConfig.value.blankPageDetectionEnabled"
          type="checkbox"
          :disabled="!workflow.canSwitchScanMode.value"
        />
        <span>启用空白页检测</span>
      </label>

      <div v-if="isSupplement" class="supp">
        <div class="field">
          <span class="field__label">补扫试卷</span>
          <a-select
            v-model:value="workflow.supplementPaperInstanceId.value"
            :options="supplementPaperOptions"
            placeholder="选择本工位已绑定试卷"
            :disabled="!workflow.canSwitchScanMode.value"
            class="full"
          />
          <p v-if="supplementPaperOptions.length === 0" class="field__hint field__hint--muted">
            本工位暂无已绑定试卷，请先完成首次扫描与绑定
          </p>
        </div>
        <div class="field">
          <span class="field__label">目标页号</span>
          <input
            v-model.number="workflow.supplementTargetPageNo.value"
            type="number"
            min="1"
            class="input"
            :disabled="!workflow.canSwitchScanMode.value"
          />
        </div>
        <div class="field">
          <span class="field__label">补扫原因</span>
          <input
            v-model="workflow.supplementReason.value"
            type="text"
            maxlength="120"
            class="input"
            :disabled="!workflow.canSwitchScanMode.value"
          />
        </div>
        <label class="check">
          <input
            v-model="workflow.supplementReplaceTargetPage.value"
            type="checkbox"
            :disabled="!workflow.canSwitchScanMode.value"
          />
          <span>替换目标页（否则为追加补扫）</span>
        </label>
      </div>
    </div>
  </a-drawer>
</template>

<style scoped>
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-4);
}

.contract-hint {
  padding: var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
}

.contract-hint__title {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}

.contract-hint__sub {
  margin: var(--kiosk-space-1) 0 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
}

.contract-hint__profile {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--kiosk-space-2);
  margin: var(--kiosk-space-2) 0 0;
}

.contract-hint__mode {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 var(--kiosk-space-2);
  border-radius: var(--kiosk-radius-sm);
  font-size: var(--kiosk-fz-caption);
  font-weight: var(--kiosk-fw-semibold);
  line-height: 1;
}

.contract-hint__mode--direct {
  background: var(--kiosk-primary-soft);
  color: var(--kiosk-primary);
}

.contract-hint__mode--supplement {
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
}

.contract-hint__mode--archive {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  color: var(--kiosk-ink-secondary);
}

.contract-hint__chip {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 var(--kiosk-space-2);
  border-radius: var(--kiosk-radius-sm);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.contract-hint__warn {
  margin: var(--kiosk-space-2) 0 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-warning);
  line-height: var(--kiosk-lh-base);
}

.contract-hint__action {
  margin-top: var(--kiosk-space-2);
  padding: 0;
  background: none;
  border: none;
  font-family: inherit;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-primary);
  cursor: pointer;
}

.contract-hint__action:disabled {
  color: var(--kiosk-ink-tertiary);
  cursor: not-allowed;
}

.field__label {
  display: block;
  margin-bottom: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
}

.field__hint--muted {
  color: var(--kiosk-ink-tertiary);
}

.field__hint {
  margin: var(--kiosk-space-1) 0 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-warning);
  line-height: var(--kiosk-lh-base);
}

.seg {
  display: flex;
  gap: var(--kiosk-space-1);
  padding: 3px;
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
}

.seg__btn {
  flex: 1;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: calc(var(--kiosk-radius-md) - 2px);
  cursor: pointer;
  font-family: inherit;
}

.seg__btn--active {
  background: var(--kiosk-surface);
  color: var(--kiosk-primary);
  box-shadow: var(--kiosk-shadow-1);
}

.full {
  width: 100%;
}

.check {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-body);
}

.supp {
  padding: var(--kiosk-space-3);
  background: var(--kiosk-warning-soft);
  border-radius: var(--kiosk-radius-md);
}

.input {
  width: 100%;
  height: 36px;
  padding: 0 var(--kiosk-space-3);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
}
</style>
