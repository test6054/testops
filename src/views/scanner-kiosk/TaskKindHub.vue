<script setup lang="ts">
import type { ScanTaskKindCode } from '@/apis/mark/scanner-work-order'
import type { SignalMetric } from '@/types/workbench'
import {
  ArrowRightOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  ScanOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { getUserErrorMessage } from '@/utils/error-handler'
import KioskDeviceActivationPanel from './components/KioskDeviceActivationPanel.vue'
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
    description: '归档卷材料扫描登记',
    route: '/scanner-kiosk/archive/session',
    deeplinkOnly: true,
    deeplinkHint: '考后归档须从归档卷详情页「一体机扫描」深链进入（须携带 volumeId、materialType 等参数）',
  },
  {
    kind: 'PORTFOLIO_COLLECT',
    title: '教师档案袋',
    description: '教学档案袋材料补采',
    route: '/scanner-kiosk/portfolio/session',
    deeplinkOnly: true,
    deeplinkHint: '档案袋采集须从 AI 候选确认或补采任务页深链进入（须携带 teacherId、collectMode 等参数）',
  },
]

const router = useRouter()
const deviceActivation = useKioskDeviceActivation()
const hubLoading = ref(true)
const hubErrorMessage = ref('')

const canActivateOnHub = computed(() => !resolveActivationGuardMessage(deviceActivation.health.value))

const endpointLabel = computed(() => {
  const name = deviceActivation.setup.value?.deviceName?.trim()
    || deviceActivation.activationForm.value.endpointName.trim()
  return name || '未命名工位'
})

const showAgentOfflineHint = computed(() =>
  !hubLoading.value
  && !deviceActivation.loading.value
  && !deviceActivation.localAgentReachable.value
  && (deviceActivation.isDeviceBound.value || deviceActivation.needsActivationGate.value === false),
)

const showTaskKindCards = computed(() =>
  deviceActivation.localAgentReachable.value
  && deviceActivation.isDeviceBound.value
  && !deviceActivation.needsActivationGate.value,
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

  let scanValue = '—'
  let scanTone: SignalMetric['tone'] = 'gray'
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

  return [
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
})

const showSignalBand = computed(() =>
  !hubLoading.value
  && !hubErrorMessage.value
  && !deviceActivation.needsActivationGate.value,
)

async function loadHubState() {
  hubLoading.value = true
  hubErrorMessage.value = ''
  try {
    await deviceActivation.refreshDeviceActivationState()
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
    message.info(card.deeplinkHint)
    return
  }
  router.push(card.route)
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

            <button
              v-for="card in DEEPLINK_CARDS"
              :key="card.kind"
              type="button"
              class="hub-entry hub-entry--deeplink"
              @click="enterCard(card)"
            >
              <div class="hub-entry__top">
                <span class="hub-entry__icon"><component :is="cardIcon(card.kind)" /></span>
                <div class="hub-entry__meta">
                  <span class="hub-entry__title">{{ card.title }}</span>
                  <UiTag tone="gray" size="sm">须深链</UiTag>
                </div>
              </div>
              <p class="hub-entry__desc">{{ card.description }}</p>
              <div class="hub-entry__foot">
                <span class="hub-entry__hint">从业务页深链进入</span>
              </div>
            </button>
          </section>
        </template>
      </div>
    </main>
  </div>
</template>

<style>
@import './styles/tokens.css';
@import './styles/hub-shell.scss';
</style>
