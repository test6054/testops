<script setup lang="ts">
import type { ScanTaskKindCode } from '@/apis/mark/scanner-work-order'
import { FileSearchOutlined, FolderOpenOutlined, ScanOutlined } from '@ant-design/icons-vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import KioskDeviceActivationPanel from './components/KioskDeviceActivationPanel.vue'
import { useKioskDeviceActivation } from './composables/useKioskDeviceActivation'
import { resolveActivationGuardMessage } from './utils/kioskActivationGuard'
import { parseAllowedTaskKinds } from './utils/parseAllowedTaskKinds'
import { getUserErrorMessage } from '@/utils/error-handler'

interface TaskKindCard {
  kind: ScanTaskKindCode
  title: string
  description: string
  route: string
}

const TASK_KIND_CARDS: TaskKindCard[] = [
  {
    kind: 'EXAM_MARKING',
    title: '考试扫描 / 补录',
    description: '考后答卷直扫、补扫与识别绑定',
    route: '/scanner-kiosk/exam/setup',
  },
  {
    kind: 'EXAM_ARCHIVE',
    title: '考后归档',
    description: '从归档卷详情深链进入；须携带 volumeId、materialType',
    route: '/scanner-kiosk/archive/session',
  },
  {
    kind: 'PORTFOLIO_COLLECT',
    title: '教师档案袋',
    description: '从 AI 候选 / 补采任务深链进入',
    route: '/scanner-kiosk/portfolio/session',
  },
]

const router = useRouter()
const deviceActivation = useKioskDeviceActivation()
const allowedTaskKinds = ref<ScanTaskKindCode[]>([])
const hubLoading = ref(true)
const hubErrorMessage = ref('')

const canActivateOnHub = computed(() => !resolveActivationGuardMessage(deviceActivation.health.value))

const showAgentOfflineHint = computed(() =>
  !hubLoading.value
  && !deviceActivation.loading.value
  && !deviceActivation.localAgentReachable.value
  && (deviceActivation.isDeviceBound.value || deviceActivation.needsActivationGate.value === false),
)

const showTaskKindCards = computed(() =>
  deviceActivation.localAgentReachable.value
  && deviceActivation.isDeviceBound.value
  && !deviceActivation.needsActivationGate.value
  && allowedTaskKinds.value.length > 0,
)

const showAllowedTaskKindsPending = computed(() =>
  deviceActivation.localAgentReachable.value
  && deviceActivation.isDeviceBound.value
  && !deviceActivation.needsActivationGate.value
  && allowedTaskKinds.value.length === 0,
)

const visibleCards = computed(() =>
  TASK_KIND_CARDS.filter(card => allowedTaskKinds.value.includes(card.kind)),
)

async function loadHubState() {
  hubLoading.value = true
  hubErrorMessage.value = ''
  try {
    await deviceActivation.refreshDeviceActivationState()
    if (!deviceActivation.isDeviceBound.value) {
      allowedTaskKinds.value = []
      return
    }
    const setup = deviceActivation.setup.value
    allowedTaskKinds.value = parseAllowedTaskKinds(setup?.allowedTaskKinds)
  }
  catch (error) {
    hubErrorMessage.value = getUserErrorMessage(error)
    allowedTaskKinds.value = []
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
  if (card.kind === 'EXAM_ARCHIVE') {
    hubErrorMessage.value = '考后归档须从归档卷详情页「一体机扫描」深链进入（须携带 volumeId、materialType 等参数）'
    return
  }
  if (card.kind === 'PORTFOLIO_COLLECT') {
    hubErrorMessage.value = '档案袋采集须从 AI 候选确认或补采任务页深链进入（须携带 teacherId、collectMode 等参数）'
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
  <div class="hub">
    <header class="hub__header">
      <h1>文档采集工作台</h1>
      <p v-if="deviceActivation.isDeviceBound.value && deviceActivation.localAgentReachable.value">
        本机工位已激活，请选择设备已授权的业务采集类型
      </p>
      <p v-else-if="showAgentOfflineHint">
        本地扫描服务暂时不可用；服务恢复后会自动重连，无需重新激活
      </p>
      <p v-else>
        设备激活与业务类型无关：完成一次激活后，考试 / 归档 / 档案袋共用同一工位凭证
      </p>
    </header>

    <p v-if="hubErrorMessage" class="hub__error">{{ hubErrorMessage }}</p>
    <p v-else-if="hubLoading || deviceActivation.loading.value" class="hub__hint">正在读取本机 Agent 状态…</p>

    <KioskDeviceActivationPanel
      v-else-if="deviceActivation.needsActivationGate.value"
      :activation="deviceActivation"
      :can-activate="canActivateOnHub"
      :submit-loading="deviceActivation.loading.value"
      show-manual-cancel
      @submit="handleHubActivate"
    />

    <template v-else-if="showTaskKindCards">
      <div class="hub__grid">
        <button
          v-for="card in visibleCards"
          :key="card.kind"
          type="button"
          class="hub__card"
          @click="enterCard(card)"
        >
          <component :is="cardIcon(card.kind)" class="hub__icon" />
          <span class="hub__title">{{ card.title }}</span>
          <span class="hub__desc">{{ card.description }}</span>
        </button>
      </div>
    </template>

    <p v-else-if="showAllowedTaskKindsPending" class="hub__hint">
      正在同步设备授权的业务类型；若长时间为空，请在教务平台扫描设备管理中配置 allowedTaskKinds。
    </p>
  </div>
</template>

<style scoped>
@import './styles/tokens.css';

.hub {
  min-height: 100vh;
  padding: 32px 24px;
  background: var(--kiosk-bg);
  color: var(--kiosk-text);
}

.hub__header h1 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
}

.hub__header p {
  margin: 0;
  color: var(--kiosk-text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.hub__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.hub__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 20px 16px;
  border: 1px solid var(--kiosk-border);
  border-radius: 6px;
  background: var(--kiosk-surface);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.hub__card:hover {
  border-color: var(--kiosk-accent);
  box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
}

.hub__icon {
  font-size: 22px;
  color: var(--kiosk-accent);
}

.hub__title {
  font-size: 16px;
  font-weight: 600;
}

.hub__desc {
  font-size: 13px;
  color: var(--kiosk-text-secondary);
  line-height: 1.5;
}

.hub__hint,
.hub__error {
  margin-top: 24px;
  font-size: 14px;
}

.hub__error {
  color: var(--kiosk-danger);
}
</style>
