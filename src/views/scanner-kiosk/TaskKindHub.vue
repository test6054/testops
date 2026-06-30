<script setup lang="ts">
import type { ScanDispatchQueueSummaryVO } from '@/apis/mark/scanner-dispatch'
import type { ScanTaskKindCode } from '@/apis/mark/scanner-work-order'
import type { SignalMetric } from '@/types/workbench'

import {

  ArrowRightOutlined,

  FileSearchOutlined,

  FolderOpenOutlined,

  ReloadOutlined,

  ScanOutlined,

} from '@ant-design/icons-vue'

import { computed, onMounted, onUnmounted, ref } from 'vue'

import { useRouter } from 'vue-router'

import { loadScanDispatchQueueSummary } from '@/apis/mark/scanner-dispatch'

import UiButton from '@/components/ui-guide/ui/Button.vue'

import UiTag from '@/components/ui-guide/ui/Tag.vue'

import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'

import ContextBar from '@/components/workbench/ContextBar.vue'

import SignalBand from '@/components/workbench/SignalBand.vue'

import { getUserErrorMessage } from '@/utils/error-handler'

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

  deeplinkHint: string

}



const EXAM_CARD: TaskKindCard = {

  kind: 'EXAM_MARKING',

  title: '考试扫描 / 补录',

  description: '考后答卷直扫、补扫与识别绑定，进入后选择考试并开始扫描批次。',

  route: '/scanner-kiosk/exam/setup',

  deeplinkHint: '',

}



const DEEPLINK_CARDS: TaskKindCard[] = [

  {

    kind: 'EXAM_ARCHIVE',

    title: '考后归档',

    description: '查看 PC 派单推送的归档卷待办，或临时选择收集中卷开单扫描。',

    route: '/scanner-kiosk/queue',

    deeplinkHint: '进入待办队列',

  },

  {

    kind: 'PORTFOLIO_COLLECT',

    title: '教师档案袋',

    description: '查看授权范围内开放的补采待办，或从 PC 档案袋页创建派单后进入工位扫描。',

    route: '/scanner-kiosk/queue',

    deeplinkHint: '进入待办队列',

  },

]



const router = useRouter()

const deviceActivation = useKioskDeviceActivation()

const hubLoading = ref(true)

const hubErrorMessage = ref('')

const archivePickOpen = ref(false)
const portfolioPickOpen = ref(false)

const queueSummaryLoading = ref(false)

const queueSummary = ref<ScanDispatchQueueSummaryVO | null>(null)

const QUEUE_SUMMARY_POLL_MS = 30_000
let queueSummaryTimer: ReturnType<typeof setInterval> | undefined



const canActivateOnHub = computed(() => !resolveActivationGuardMessage(deviceActivation.health.value))



const scannerDeviceId = computed(() => deviceActivation.setup.value?.scannerDeviceId ?? '')

const scannerStationId = computed(() => deviceActivation.setup.value?.scannerStationId ?? '')



const endpointLabel = computed(() => {
  const name = deviceActivation.setup.value?.deviceName?.trim()

    || deviceActivation.activationForm.value.endpointName.trim()

  return name || '未命名工位'
})



const showAgentOfflineHint = computed(() =>

  !hubLoading.value

  && !deviceActivation.loading.value

  && !deviceActivation.localAgentReachable.value

  && (deviceActivation.isDeviceBound.value || !deviceActivation.needsActivationGate.value),

)



const showTaskKindCards = computed(() =>

  deviceActivation.localAgentReachable.value

  && deviceActivation.isDeviceBound.value

  && !deviceActivation.needsActivationGate.value,

)



const showFailedAlert = computed(() =>
  showTaskKindCards.value
  && !queueSummaryLoading.value
  && ((queueSummary.value?.failedTicketCount ?? 0) > 0
    || (queueSummary.value?.committingWorkOrderCount ?? 0) > 0),
)



const contextSubtitle = computed(() => {
  if (hubLoading.value || deviceActivation.loading.value) {
    return '正在读取本机 Agent 与工位状态…'
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
    return '本机工位已就绪，请选择业务采集类型'
  }

  return '完成一次激活后，考试 / 归档 / 档案袋共用同一工位凭证'
})



const hubSignals = computed<SignalMetric[]>(() => {
  const health = deviceActivation.health.value

  const agentOnline = deviceActivation.localAgentReachable.value

  const bound = deviceActivation.isDeviceBound.value && !deviceActivation.needsActivationGate.value



  let scanValue: string

  let scanTone: SignalMetric['tone']

  if (!agentOnline) {
    scanValue = '不可用'

    scanTone = 'gray'
  }

  else if (!bound) {
    scanValue = '待激活'

    scanTone = 'orange'
  }

  else if (health?.scannerConnected && health.scanAllowed) {
    scanValue = '就绪'

    scanTone = 'green'
  }

  else if (health?.scannerConnected) {
    scanValue = '受限'

    scanTone = 'orange'
  }

  else {
    scanValue = '未连接'

    scanTone = 'orange'
  }



  const metrics: SignalMetric[] = [

    {

      key: 'agent',

      label: 'Agent 服务',

      value: agentOnline ? '在线' : '离线',

      tone: agentOnline ? 'green' : 'red',

      helper: agentOnline ? `v${health?.agentVersion ?? '—'}` : '请先启动本机扫描服务',

    },

    {

      key: 'binding',

      label: '工位绑定',

      value: bound ? '已激活' : '待激活',

      tone: bound ? 'green' : 'orange',

      helper: bound ? endpointLabel.value : '输入激活码完成一次绑定',

    },

    {

      key: 'scan',

      label: '扫描就绪',

      value: scanValue,

      tone: scanTone,

      helper: health?.scannerConnected ? '扫描仪已连接' : '请检查扫描仪连接',

    },

  ]



  if (bound && (queueSummary.value?.pendingCount ?? 0) > 0) {
    metrics.push({
      key: 'pending',
      label: '待处理派单',
      value: String(queueSummary.value?.pendingCount ?? 0),
      tone: 'blue',
      helper: '点击查看待处理队列',
      clickable: true,
    })
  }

  if (bound && (queueSummary.value?.processingCount ?? 0) > 0) {
    metrics.push({
      key: 'processing',
      label: '处理中派单',
      value: String(queueSummary.value?.processingCount ?? 0),
      tone: 'green',
      helper: '点击查看处理中队列',
      clickable: true,
    })
  }

  if (bound && (queueSummary.value?.failedTicketCount ?? 0) > 0) {
    metrics.push({
      key: 'failed',
      label: '失败待办',
      value: String(queueSummary.value?.failedTicketCount ?? 0),
      tone: 'red',
      helper: '点击查看失败派单',
      clickable: true,
    })
  }

  if (bound && (queueSummary.value?.suspendedCount ?? 0) > 0) {
    metrics.push({
      key: 'suspended',
      label: '挂起派单',
      value: String(queueSummary.value?.suspendedCount ?? 0),
      tone: 'orange',
      helper: '点击查看挂起队列',
      clickable: true,
    })
  }

  if (bound && (queueSummary.value?.committingWorkOrderCount ?? 0) > 0) {
    metrics.push({
      key: 'committing',
      label: '合成中',
      value: String(queueSummary.value?.committingWorkOrderCount ?? 0),
      tone: 'orange',
      helper: '归档/档案袋异步提交中，请稍候刷新',
    })
  }

  if (bound && (queueSummary.value?.suspectedMixedCount ?? 0) > 0) {
    metrics.push({
      key: 'mixed',
      label: '疑似混扫',
      value: String(queueSummary.value?.suspectedMixedCount ?? 0),
      tone: 'orange',
      helper: 'PC 异常看板查看混扫批次',
      clickable: true,
    })
  }

  return metrics
})



const showSignalBand = computed(() =>

  !hubLoading.value

  && !hubErrorMessage.value

  && !deviceActivation.needsActivationGate.value,

)



async function loadQueueSummary() {
  if (!deviceActivation.isDeviceBound.value) {
    queueSummary.value = null
    return
  }

  queueSummaryLoading.value = true
  try {
    queueSummary.value = await loadScanDispatchQueueSummary({
      scannerDeviceId: scannerDeviceId.value || undefined,
      scannerStationId: scannerStationId.value || undefined,
    })
  }
  catch {
    queueSummary.value = null
  }
  finally {
    queueSummaryLoading.value = false
  }
}

function startQueueSummaryPolling() {
  stopQueueSummaryPolling()
  queueSummaryTimer = setInterval(() => {
    void loadQueueSummary()
  }, QUEUE_SUMMARY_POLL_MS)
}

function stopQueueSummaryPolling() {
  if (queueSummaryTimer) {
    clearInterval(queueSummaryTimer)
    queueSummaryTimer = undefined
  }
}

function handleMetricClick(key: string) {
  if (key === 'pending') {
    void router.push({ path: '/scanner-kiosk/queue', query: { tab: 'PENDING' } })
    return
  }
  if (key === 'processing') {
    void router.push({ path: '/scanner-kiosk/queue', query: { tab: 'PROCESSING' } })
    return
  }
  if (key === 'failed') {
    void router.push({ path: '/scanner-kiosk/queue', query: { tab: 'FAILED' } })
    return
  }
  if (key === 'suspended') {
    void router.push({ path: '/scanner-kiosk/queue', query: { tab: 'SUSPENDED' } })
    return
  }
  if (key === 'mixed') {
    window.open('/teacher/scanner-exception-dashboard?kind=MIXED_BATCH', '_blank', 'noopener,noreferrer')
  }
}

async function loadHubState() {
  hubLoading.value = true

  hubErrorMessage.value = ''

  try {
    await deviceActivation.refreshDeviceActivationState()

    await loadQueueSummary()
    startQueueSummaryPolling()
  }

  catch (error) {
    hubErrorMessage.value = getUserErrorMessage(error)
  }

  finally {
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



function enterCard(card: TaskKindCard) {
  if (card.deeplinkOnly) {
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



function cardIcon(kind: ScanTaskKindCode) {
  if (kind === 'EXAM_MARKING') return ScanOutlined

  if (kind === 'EXAM_ARCHIVE') return FolderOpenOutlined

  return FileSearchOutlined
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
        <span class="hub-shell__mark" />

        <div class="hub-shell__brand-text">
          <strong>文档采集工作台</strong>

          <span>一体机 · 扫描工位</span>
        </div>
      </div>

      <div class="hub-shell__station">
        <span

          class="hub-shell__led"

          :class="{ 'hub-shell__led--on': deviceActivation.localAgentReachable.value }"
        />

        <div>
          <div class="hub-shell__station-label">当前工位</div>

          <div class="hub-shell__station-name">{{ endpointLabel }}</div>
        </div>
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
        <ContextBar

          class="hub-shell__context"

          layout="workbench"

          show-title

          title="选择采集类型"

          :subtitle="contextSubtitle"
        >
          <template v-if="showTaskKindCards" #status>
            <UiTag tone="green" size="sm">工位已激活</UiTag>
          </template>
        </ContextBar>



        <SignalBand

          v-if="showSignalBand"

          class="hub-shell__signal"

          :metrics="hubSignals"

          variant="panel"
          @metric-click="handleMetricClick"
        />



        <UiAlertStrip

          v-if="showFailedAlert"

          tone="error"

          title="存在失败待办"

          :description="`失败派单 ${queueSummary?.failedTicketCount ?? 0} 条，合成中 ${queueSummary?.committingWorkOrderCount ?? 0} 条；可点击上方指标进入队列或 PC 异常看板`"

          dense

          class="hub-shell__failed-alert"
        />



        <a-result

          v-if="hubErrorMessage"

          status="error"

          title="工位状态读取失败"

          :sub-title="hubErrorMessage"
        >
          <template #extra>
            <button type="button" class="hub-shell__cta" @click="loadHubState">
              重试
            </button>
          </template>
        </a-result>



        <div v-else-if="hubLoading || deviceActivation.loading.value" class="hub-shell__state">
          <a-skeleton active :paragraph="{ rows: 5 }" />
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
            工位凭证仍有效；Agent 恢复后会自动重连。请先检查本机扫描服务是否已启动。
          </p>

          <button type="button" class="hub-shell__cta" @click="loadHubState">
            重新检测
          </button>
        </section>



        <template v-else-if="showTaskKindCards">
          <p class="hub-shell__section-label">业务入口</p>

          <section class="hub-entries" aria-label="业务采集入口">
            <button

              type="button"

              class="hub-entry hub-entry--primary"

              @click="enterCard(EXAM_CARD)"
            >
              <div class="hub-entry__top">
                <span class="hub-entry__icon"><ScanOutlined /></span>

                <div class="hub-entry__meta">
                  <span class="hub-entry__title">{{ EXAM_CARD.title }}</span>

                  <UiTag tone="blue" size="sm">可直接进入</UiTag>
                </div>
              </div>

              <p class="hub-entry__desc">{{ EXAM_CARD.description }}</p>

              <div class="hub-entry__foot">
                <span class="hub-entry__go">

                  进入工作台

                  <ArrowRightOutlined />

                </span>
              </div>
            </button>



            <div

              v-for="card in DEEPLINK_CARDS"

              :key="card.kind"

              class="hub-entry-wrap"
            >
              <button

                type="button"

                class="hub-entry"

                :class="card.deeplinkOnly ? 'hub-entry--deeplink hub-entry--placeholder' : 'hub-entry--primary'"

                :disabled="card.deeplinkOnly"

                @click="enterCard(card)"
              >
                <div class="hub-entry__top">
                  <span class="hub-entry__icon"><component :is="cardIcon(card.kind)" /></span>

                  <div class="hub-entry__meta">
                    <span class="hub-entry__title">{{ card.title }}</span>

                    <UiTag :tone="card.deeplinkOnly ? 'gray' : 'blue'" size="sm">
                      {{ card.deeplinkOnly ? 'PC 深链' : '待办队列' }}
                    </UiTag>
                  </div>
                </div>

                <p class="hub-entry__desc">{{ card.description }}</p>

                <div class="hub-entry__foot">
                  <span v-if="card.deeplinkOnly" class="hub-entry__hint">{{ card.deeplinkHint }}</span>

                  <span v-else class="hub-entry__go">

                    进入队列

                    <ArrowRightOutlined />

                  </span>
                </div>
              </button>

              <UiButton

                v-if="card.kind === 'EXAM_ARCHIVE'"

                class="hub-entry-wrap__adhoc"

                size="sm"

                variant="outline"

                @click="openArchivePick"
              >
                临时扫描
              </UiButton>
              <UiButton

                v-if="card.kind === 'PORTFOLIO_COLLECT'"

                class="hub-entry-wrap__adhoc"

                size="sm"

                variant="outline"

                @click="openPortfolioPick"
              >
                临时扫描
              </UiButton>
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

@import './styles/hub-shell.scss';
</style>



<style scoped>
.hub-shell__failed-alert {

  margin-bottom: 12px;

}

.hub-entry-wrap {

  display: flex;

  flex-direction: column;

  gap: 8px;

}

.hub-entry-wrap__adhoc {

  align-self: flex-start;

}
</style>


