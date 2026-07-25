<script setup lang="ts">
import type { ScanDispatchQueueSummaryVO } from '@/apis/mark/scanner-dispatch'
import { ReloadOutlined, ScanOutlined } from '@ant-design/icons-vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadScanDispatchQueueSummary } from '@/apis/mark/scanner-dispatch'
import { getKioskArchiveCollaborationPolicy } from '@/apis/mark/scanner-kiosk'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { ArchiveKioskHubListModeCode } from '@/types/enums/archive-kiosk-hub-list-mode-enum'
import { DispatchQueueStatusFilterCode } from '@/types/enums/dispatch-queue-status-filter-enum'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import { fetchArchiveSuspectedMixedPendingTotal } from '@/utils/archive-suspected-mixed-navigation'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import KioskArchivePickPanel from './components/KioskArchivePickPanel.vue'
import KioskDeviceActivationPanel from './components/KioskDeviceActivationPanel.vue'
import KioskPortfolioGapPickPanel from './components/KioskPortfolioGapPickPanel.vue'
import { useKioskDeviceActivation } from './composables/useKioskDeviceActivation'
import { resolveActivationGuardMessage } from './utils/kioskActivationGuard'

interface TaskKindCard {
  kind: ScanTaskKindCode
  title: string
  description: string
  route: string
  deeplinkOnly?: boolean
  tagText: string
  tagGreen?: boolean
  ctaText: string
}

interface HubSignalItem {
  key: string
  label: string
  value: string
  sub: string
  ledTone: 'green' | 'blue' | 'orange' | 'red' | 'gray'
  clickable?: boolean
}

const EXAM_CARD: TaskKindCard = {
  kind: ScanTaskKindCode.EXAM_MARKING,
  title: '考试扫描 / 补录',
  description: '考后答卷直扫、补扫与识别绑定，进入后选择考试并开始扫描批次。',
  route: '/scanner-kiosk/exam/bind',
  tagText: '可直接进入',
  tagGreen: true,
  ctaText: '进入工作台',
}

const DEEPLINK_CARDS: TaskKindCard[] = [
  {
    kind: ScanTaskKindCode.EXAM_ARCHIVE,
    title: '考后归档',
    description: '查看电脑端派单推送的归档卷待办，或临时选择收集中卷开单扫描。',
    route: '/scanner-kiosk/queue',
    tagText: '待办队列',
    ctaText: '进入队列',
  },
  {
    kind: ScanTaskKindCode.PORTFOLIO_COLLECT,
    title: '教师档案袋',
    description: '查看授权范围内开放的补采待办，或从电脑端档案袋页创建派单后进入工位扫描。',
    route: '/scanner-kiosk/queue',
    tagText: '待办队列',
    ctaText: '进入队列',
  },
]

const router = useRouter()
const deviceActivation = useKioskDeviceActivation()
const hubLoading = ref(true)
const hubErrorMessage = ref('')
const archivePickOpen = ref(false)
const portfolioPickOpen = ref(false)
const archiveHubListMode = ref<ArchiveKioskHubListModeCode>(
  ArchiveKioskHubListModeCode.DISPATCH_QUEUE_FIRST,
)
const queueSummaryLoading = ref(false)
const queueSummary = ref<ScanDispatchQueueSummaryVO | null>(null)
const queueSummaryError = ref('')
const archiveMixedPendingTotal = ref<number | null>(null)
const QUEUE_SUMMARY_POLL_MS = 30_000
let queueSummaryTimer: ReturnType<typeof setTimeout> | undefined
let queueSummaryPollGeneration = 0

const canActivateOnHub = computed(
  () => !resolveActivationGuardMessage(deviceActivation.health.value),
)
const scannerDeviceId = computed(() => deviceActivation.setup.value?.scannerDeviceId ?? '')
const scannerStationId = computed(() => deviceActivation.setup.value?.scannerStationId ?? '')

const endpointLabel = computed(() => {
  const name
    = deviceActivation.setup.value?.deviceName?.trim()
      || deviceActivation.activationForm.value.endpointName.trim()
  return name || '未命名工位'
})

const agentVersionLabel = computed(() => {
  const version = deviceActivation.health.value?.agentVersion?.trim()
  return version ? `v${version}` : 'v—'
})

const stationLedTone = computed<'green' | 'gray'>(() =>
  deviceActivation.localAgentReachable.value ? 'green' : 'gray',
)

const showAgentOfflineHint = computed(
  () =>
    !hubLoading.value
    && !deviceActivation.loading.value
    && !deviceActivation.localAgentReachable.value
    && (deviceActivation.isDeviceBound.value || !deviceActivation.needsActivationGate.value),
)

const showTaskKindCards = computed(
  () =>
    deviceActivation.localAgentReachable.value
    && deviceActivation.isDeviceBound.value
    && !deviceActivation.needsActivationGate.value,
)

const showFailedAlert = computed(
  () =>
    showTaskKindCards.value
    && !queueSummaryLoading.value
    && ((queueSummary.value?.failedTicketCount ?? 0) > 0
      || (queueSummary.value?.committingWorkOrderCount ?? 0) > 0),
)

const contextSubtitle = computed(() => {
  if (hubLoading.value || deviceActivation.loading.value) {
    return '正在读取本机扫描服务与工位状态…'
  }
  if (hubErrorMessage.value) {
    return '工位状态读取失败，请重试或检查本机扫描服务'
  }
  if (deviceActivation.needsActivationGate.value) {
    return deviceActivation.deviceReadiness.value.detail
  }
  if (showAgentOfflineHint.value) {
    return '本地扫描服务暂时不可用；服务恢复后会自动重连，无需重新激活'
  }
  if (showTaskKindCards.value) {
    return '设备已就绪，选择业务入口开始工作'
  }
  return '完成一次激活后，考试 / 归档 / 档案袋共用同一工位凭证'
})

const hubSignals = computed<HubSignalItem[]>(() => {
  const health = deviceActivation.health.value
  const agentOnline = deviceActivation.localAgentReachable.value
  const bound = deviceActivation.isDeviceBound.value && !deviceActivation.needsActivationGate.value

  let scanValue: string
  let scanLed: HubSignalItem['ledTone']
  let scanSub: string
  if (!agentOnline) {
    scanValue = '不可用'
    scanLed = 'gray'
    scanSub = '请先启动本机扫描服务'
  } else if (!bound) {
    scanValue = '待激活'
    scanLed = 'orange'
    scanSub = '输入激活码完成一次绑定'
  } else if (health?.scannerConnected && health.scanAllowed) {
    scanValue = '就绪'
    scanLed = 'green'
    scanSub = '扫描仪已连接'
  } else if (health?.scannerConnected) {
    scanValue = '受限'
    scanLed = 'orange'
    scanSub = '扫描仪已连接'
  } else {
    scanValue = '未连接'
    scanLed = 'orange'
    scanSub = '请检查扫描仪连接'
  }

  const metrics: HubSignalItem[] = [
    {
      key: 'agent',
      label: '扫描服务',
      value: agentOnline ? '正常' : '离线',
      ledTone: agentOnline ? 'green' : 'red',
      sub: agentOnline ? '本地代理已连接' : '请先启动本机扫描服务',
    },
    {
      key: 'binding',
      label: '工位绑定',
      value: bound ? '已绑定' : '待激活',
      ledTone: bound ? 'green' : 'orange',
      sub: bound ? endpointLabel.value : '输入激活码完成一次绑定',
    },
    {
      key: 'scan',
      label: '扫描就绪',
      value: scanValue,
      ledTone: scanLed,
      sub: scanSub,
    },
  ]

  if (bound && (queueSummary.value?.pendingCount ?? 0) > 0) {
    metrics.push({
      key: 'pending',
      label: '待办队列',
      value: String(queueSummary.value?.pendingCount ?? 0),
      ledTone: 'blue',
      sub: '待处理工单',
      clickable: true,
    })
  }

  if (bound && (queueSummary.value?.processingCount ?? 0) > 0) {
    metrics.push({
      key: 'processing',
      label: '处理中',
      value: String(queueSummary.value?.processingCount ?? 0),
      ledTone: 'blue',
      sub: '正在扫描',
      clickable: true,
    })
  }

  if (bound && (queueSummary.value?.failedTicketCount ?? 0) > 0) {
    metrics.push({
      key: 'failed',
      label: '失败待办',
      value: String(queueSummary.value?.failedTicketCount ?? 0),
      ledTone: 'red',
      sub: '点击查看失败派单',
      clickable: true,
    })
  }

  if (bound && (queueSummary.value?.suspendedCount ?? 0) > 0) {
    metrics.push({
      key: 'suspended',
      label: '挂起派单',
      value: String(queueSummary.value?.suspendedCount ?? 0),
      ledTone: 'orange',
      sub: '点击查看挂起队列',
      clickable: true,
    })
  }

  if (bound && (queueSummary.value?.committingWorkOrderCount ?? 0) > 0) {
    metrics.push({
      key: 'committing',
      label: '合成中',
      value: String(queueSummary.value?.committingWorkOrderCount ?? 0),
      ledTone: 'orange',
      sub: '电脑端异常看板查看合成中工单',
      clickable: true,
    })
  }

  if (bound && archiveMixedPendingTotal.value != null && archiveMixedPendingTotal.value > 0) {
    metrics.push({
      key: 'mixed',
      label: '疑似混扫',
      value: String(archiveMixedPendingTotal.value),
      ledTone: 'orange',
      sub: '归档混扫复核待办',
      clickable: true,
    })
  }

  return metrics
})

const showSignalBand = computed(
  () => !hubLoading.value && !hubErrorMessage.value && !deviceActivation.needsActivationGate.value,
)

const archivePickFirst = computed(
  () => archiveHubListMode.value === ArchiveKioskHubListModeCode.ARCHIVE_PICK_FIRST,
)

const archiveEntryCard = computed<TaskKindCard>(() => {
  const base = DEEPLINK_CARDS.find((card) => card.kind === ScanTaskKindCode.EXAM_ARCHIVE)!
  if (!archivePickFirst.value) {
    return base
  }
  return {
    ...base,
    tagText: '临时选卷',
    ctaText: '临时扫描',
  }
})

const portfolioEntryCard = computed(() =>
  DEEPLINK_CARDS.find((card) => card.kind === ScanTaskKindCode.PORTFOLIO_COLLECT)!,
)

async function loadArchiveHubPolicy() {
  try {
    const policy = await getKioskArchiveCollaborationPolicy()
    if (policy.kioskHubListMode) {
      archiveHubListMode.value = policy.kioskHubListMode
    }
  } catch (error) {
    // 策略失败不得伪装成「默认派单优先」成功态；保留上次模式并提示教师
    showUserError(error, '归档协作策略加载失败')
  }
}

async function loadArchiveMixedPendingTotal() {
  try {
    const total = await fetchArchiveSuspectedMixedPendingTotal()
    archiveMixedPendingTotal.value = total > 0 ? total : null
  } catch (error) {
    // 附属计数失败不影响 Hub 主界面；禁止把失败伪装成 0 条
    archiveMixedPendingTotal.value = null
    showUserError(error, '疑似混扫待处理数量加载失败')
  }
}

async function loadQueueSummary() {
  if (!deviceActivation.isDeviceBound.value) {
    queueSummary.value = null
    archiveMixedPendingTotal.value = null
    return
  }
  queueSummaryLoading.value = true
  queueSummaryError.value = ''
  try {
    queueSummary.value = await loadScanDispatchQueueSummary({
      scannerDeviceId: scannerDeviceId.value || undefined,
      scannerStationId: scannerStationId.value || undefined,
    })
  } catch (error) {
    queueSummary.value = null
    queueSummaryError.value = getUserErrorMessage(error)
  } finally {
    queueSummaryLoading.value = false
  }
  // 附属：混扫待处理数失败不拖垮主队列摘要
  await loadArchiveMixedPendingTotal()
}

function startQueueSummaryPolling() {
  stopQueueSummaryPolling()
  const generation = queueSummaryPollGeneration
  const scheduleNext = (delayMs: number) => {
    if (generation !== queueSummaryPollGeneration) {
      return
    }
    queueSummaryTimer = setTimeout(() => {
      void (async () => {
        if (generation !== queueSummaryPollGeneration) {
          return
        }
        await loadQueueSummary()
        if (generation !== queueSummaryPollGeneration) {
          return
        }
        scheduleNext(QUEUE_SUMMARY_POLL_MS)
      })()
    }, delayMs)
  }
  scheduleNext(QUEUE_SUMMARY_POLL_MS)
}

function stopQueueSummaryPolling() {
  queueSummaryPollGeneration += 1
  if (queueSummaryTimer) {
    clearTimeout(queueSummaryTimer)
    queueSummaryTimer = undefined
  }
}

function handleMetricClick(key: string) {
  if (key === 'pending') {
    void router.push({
      path: '/scanner-kiosk/queue',
      query: { tab: DispatchQueueStatusFilterCode.PENDING },
    })
    return
  }
  if (key === 'processing') {
    void router.push({
      path: '/scanner-kiosk/queue',
      query: { tab: DispatchQueueStatusFilterCode.PROCESSING },
    })
    return
  }
  if (key === 'failed') {
    void router.push({
      path: '/scanner-kiosk/queue',
      query: { tab: DispatchQueueStatusFilterCode.FAILED },
    })
    return
  }
  if (key === 'suspended') {
    void router.push({
      path: '/scanner-kiosk/queue',
      query: { tab: DispatchQueueStatusFilterCode.SUSPENDED },
    })
    return
  }
  if (key === 'mixed') {
    window.open('/teacher/archive-volumes/suspected-mixed-scan', '_blank', 'noopener,noreferrer')
    return
  }
  if (key === 'committing') {
    window.open(
      '/teacher/archive-volumes/scan-ops?tab=exception&kind=COMMITTING',
      '_blank',
      'noopener,noreferrer',
    )
  }
}

async function loadHubState() {
  hubLoading.value = true
  hubErrorMessage.value = ''
  try {
    await deviceActivation.refreshDeviceActivationState()
    await Promise.all([loadArchiveHubPolicy(), loadQueueSummary()])
    startQueueSummaryPolling()
  } catch (error) {
    hubErrorMessage.value = getUserErrorMessage(error)
  } finally {
    hubLoading.value = false
  }
}

async function handleHubActivate() {
  const ok = await deviceActivation.activateDevice({
    guard: () => resolveActivationGuardMessage(deviceActivation.health.value),
  })
  if (ok) {
    await loadHubState()
  }
}

function enterArchiveEntry() {
  if (archivePickFirst.value) {
    openArchivePick()
    return
  }
  void router.push({
    path: archiveEntryCard.value.route,
    query: { taskKind: ScanTaskKindCode.EXAM_ARCHIVE },
  })
}

function enterPortfolioEntry() {
  void router.push({
    path: portfolioEntryCard.value.route,
    query: { taskKind: ScanTaskKindCode.PORTFOLIO_COLLECT },
  })
}

function enterArchiveQueue() {
  void router.push({
    path: '/scanner-kiosk/queue',
    query: { taskKind: ScanTaskKindCode.EXAM_ARCHIVE },
  })
}

function enterCard(card: TaskKindCard) {
  if (card.deeplinkOnly) return
  if (
    card.kind === ScanTaskKindCode.EXAM_ARCHIVE
    || card.kind === ScanTaskKindCode.PORTFOLIO_COLLECT
  ) {
    void router.push({ path: card.route, query: { taskKind: card.kind } })
    return
  }
  void router.push(card.route)
}

function openArchivePick() {
  archivePickOpen.value = true
}

function openPortfolioPick() {
  portfolioPickOpen.value = true
}

onMounted(() => {
  void deviceActivation.syncActivationFormFromAgent()
  void loadHubState()
})

onUnmounted(() => {
  stopQueueSummaryPolling()
})
</script>

<template>
  <div class="hub-shell">
    <header class="hub-shell__bar">
      <div class="hub-shell__brand">
        <div class="hub-shell__logo" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="24" height="24" rx="6" fill="var(--kiosk-primary)" />
            <path
              d="M8 10h12M8 14h8M8 18h10"
              stroke="white"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <div class="hub-shell__brand-text">
          <span class="hub-shell__brand-title">文档采集工作台</span>
          <span class="hub-shell__brand-version">一体机 · 扫描工位 · {{ agentVersionLabel }}</span>
        </div>
      </div>

      <div class="hub-shell__station">
        <span class="hub-led hub-led--sm" :class="`hub-led--${stationLedTone}`" />
        <span class="hub-shell__station-label">当前工位</span>
        <span class="hub-shell__station-name">{{ endpointLabel }}</span>
      </div>

      <button
        type="button"
        class="hub-shell__refresh"
        title="刷新工位状态"
        :disabled="hubLoading || deviceActivation.loading.value"
        @click="loadHubState"
      >
        <ReloadOutlined />
      </button>
    </header>

    <main class="hub-shell__main">
      <div class="hub-shell__panel">
        <div class="hub-context">
          <div>
            <div class="hub-context__title">选择采集类型</div>
            <div class="hub-context__sub">{{ contextSubtitle }}</div>
          </div>
          <span v-if="showTaskKindCards" class="hub-context__tag">工位已激活</span>
        </div>

        <div v-if="showSignalBand" class="hub-signal-band">
          <component
            :is="signal.clickable ? 'button' : 'div'"
            v-for="signal in hubSignals"
            :key="signal.key"
            :type="signal.clickable ? 'button' : undefined"
            class="hub-signal"
            :class="{ 'hub-signal--clickable': signal.clickable }"
            @click="signal.clickable ? handleMetricClick(signal.key) : undefined"
          >
            <div class="hub-signal__label">{{ signal.label }}</div>
            <div class="hub-signal__value-row">
              <span class="hub-led hub-led--sm" :class="`hub-led--${signal.ledTone}`" />
              <span class="hub-signal__value">{{ signal.value }}</span>
            </div>
            <div class="hub-signal__sub">{{ signal.sub }}</div>
          </component>
        </div>

        <UiAlertStrip
          v-if="queueSummaryError"
          tone="warning"
          title="待办队列摘要加载失败"
          :description="queueSummaryError"
          dense
          class="hub-shell__failed-alert"
        />

        <UiAlertStrip
          v-if="showFailedAlert"
          tone="error"
          title="存在失败待办"
          :description="`失败派单 ${queueSummary?.failedTicketCount ?? 0} 条，合成中 ${queueSummary?.committingWorkOrderCount ?? 0} 条；可点击上方指标进入队列或电脑端异常看板`"
          dense
          class="hub-shell__failed-alert"
        />

        <UiEmpty
          v-if="hubErrorMessage"
          size="sm"
          title="工位状态读取失败"
          :description="hubErrorMessage"
        />

        <div v-else-if="hubLoading || deviceActivation.loading.value" class="hub-shell__state">
          <UiSkeletonState :rows="5" compact />
        </div>

        <KioskDeviceActivationPanel
          v-else-if="deviceActivation.needsActivationGate.value"
          :can-activate="canActivateOnHub"
          :submit-loading="deviceActivation.loading.value"
          show-manual-cancel
          @submit="handleHubActivate"
        />

        <section v-else-if="showAgentOfflineHint" class="hub-shell__state">
          <p class="hub-shell__state-title">本地扫描服务暂时不可用</p>
          <p class="hub-shell__state-detail">
            工位凭证仍有效；扫描服务恢复后会自动重连。请先检查本机扫描服务是否已启动，或离开再进入本页。
          </p>
        </section>

        <template v-else-if="showTaskKindCards">
          <p class="hub-shell__section-label">业务入口</p>

          <section class="hub-entries" aria-label="业务采集入口">
            <button type="button" class="hub-entry" @click="enterCard(EXAM_CARD)">
              <div class="hub-entry__icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                  <rect
                    x="4"
                    y="4"
                    width="32"
                    height="32"
                    rx="8"
                    fill="var(--kiosk-primary)"
                    opacity="0.12"
                  />
                  <path
                    d="M12 14h16M12 20h16M12 26h10"
                    stroke="var(--kiosk-primary)"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  />
                  <rect
                    x="8"
                    y="8"
                    width="24"
                    height="24"
                    rx="4"
                    stroke="var(--kiosk-primary)"
                    stroke-width="2"
                    fill="none"
                  />
                </svg>
              </div>
              <div class="hub-entry__body">
                <div class="hub-entry__title-row">
                  <span class="hub-entry__title">{{ EXAM_CARD.title }}</span>
                  <span class="hub-entry__tag hub-entry__tag--green">{{ EXAM_CARD.tagText }}</span>
                </div>
                <p class="hub-entry__desc">{{ EXAM_CARD.description }}</p>
                <span class="hub-entry__cta">
                  {{ EXAM_CARD.ctaText }}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M6 3l5 5-5 5"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </button>

            <div class="hub-entry-wrap">
              <div class="hub-entry-block">
                <button type="button" class="hub-entry" @click="enterArchiveEntry">
                  <div class="hub-entry__icon">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                      <rect
                        x="4"
                        y="4"
                        width="32"
                        height="32"
                        rx="8"
                        fill="var(--kiosk-primary)"
                        opacity="0.12"
                      />
                      <path
                        d="M10 14l4-4h12a2 2 0 012 2v16a2 2 0 01-2 2H14a2 2 0 01-2-2V14z"
                        stroke="var(--kiosk-primary)"
                        stroke-width="2"
                        fill="none"
                      />
                      <path
                        d="M10 14h4v-4"
                        stroke="var(--kiosk-primary)"
                        stroke-width="2"
                        stroke-linecap="round"
                      />
                    </svg>
                  </div>
                  <div class="hub-entry__body">
                    <div class="hub-entry__title-row">
                      <span class="hub-entry__title">{{ archiveEntryCard.title }}</span>
                      <span class="hub-entry__tag">{{ archiveEntryCard.tagText }}</span>
                    </div>
                    <p class="hub-entry__desc">{{ archiveEntryCard.description }}</p>
                    <span class="hub-entry__cta">
                      {{ archiveEntryCard.ctaText }}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 3l5 5-5 5"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                </button>
                <button
                  v-if="archivePickFirst"
                  type="button"
                  class="hub-entry__temp-btn"
                  @click="enterArchiveQueue"
                >
                  进入队列
                </button>
                <button v-else type="button" class="hub-entry__temp-btn" @click="openArchivePick">
                  <ScanOutlined />
                  临时扫描
                </button>
              </div>
              <div class="hub-entry-block">
                <button type="button" class="hub-entry" @click="enterPortfolioEntry">
                  <div class="hub-entry__icon">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                      <rect
                        x="4"
                        y="4"
                        width="32"
                        height="32"
                        rx="8"
                        fill="var(--kiosk-primary)"
                        opacity="0.12"
                      />
                      <circle
                        cx="20"
                        cy="16"
                        r="4"
                        stroke="var(--kiosk-primary)"
                        stroke-width="2"
                        fill="none"
                      />
                      <path
                        d="M12 28a8 8 0 0116 0"
                        stroke="var(--kiosk-primary)"
                        stroke-width="2"
                        stroke-linecap="round"
                        fill="none"
                      />
                      <rect
                        x="22"
                        y="10"
                        width="8"
                        height="10"
                        rx="1"
                        stroke="var(--kiosk-primary)"
                        stroke-width="1.5"
                        fill="none"
                      />
                      <path
                        d="M25 14h2M25 16h2"
                        stroke="var(--kiosk-primary)"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                    </svg>
                  </div>
                  <div class="hub-entry__body">
                    <div class="hub-entry__title-row">
                      <span class="hub-entry__title">{{ portfolioEntryCard.title }}</span>
                      <span class="hub-entry__tag">{{ portfolioEntryCard.tagText }}</span>
                    </div>
                    <p class="hub-entry__desc">{{ portfolioEntryCard.description }}</p>
                    <span class="hub-entry__cta">
                      {{ portfolioEntryCard.ctaText }}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 3l5 5-5 5"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                </button>
                <button type="button" class="hub-entry__temp-btn" @click="openPortfolioPick">
                  <ScanOutlined />
                  临时扫描
                </button>
              </div>
            </div>
          </section>
        </template>
      </div>
    </main>

    <KioskArchivePickPanel
      v-model:open="archivePickOpen"
      :scanner-device-id="scannerDeviceId"
      :scanner-station-id="scannerStationId"
    />
    <KioskPortfolioGapPickPanel
      v-model:open="portfolioPickOpen"
      :scanner-device-id="scannerDeviceId"
      :scanner-station-id="scannerStationId"
    />
  </div>
</template>

<style>
@import './styles/tokens.css';
</style>

<style lang="scss">
@use './styles/hub-shell';
</style>
