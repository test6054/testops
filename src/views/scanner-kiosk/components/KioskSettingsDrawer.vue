<script setup lang="ts">
/**
 * KioskSettingsDrawer - 设备设置抽屉（右侧 480px）
 *
 * 内容分组：
 *   1. 扫描设备（组件状态 + 设备信息 + 扫描仪与配置）
 *   2. 实时连接
 *   3. 维护操作（重新激活入口）
 */
import {
  ApiOutlined,
  ArrowUpOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  ReloadOutlined,
  ScanOutlined,
  ThunderboltFilled,
  WarningFilled,
} from '@ant-design/icons-vue'
import { computed, watch } from 'vue'
import { AgentUpdateStatusCode } from '@/apis/mark/scanner-agent-local'
import { getKioskBindingProfile } from '@/utils/kiosk-auth'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, ui } = useKioskCtx()

watch(
  () => ui.settingsDrawerOpen.value,
  (isOpen) => {
    if (isOpen) {
      workflow.startScannersPolling(8000)
    } else {
      workflow.stopScannersPolling()
    }
  },
)

const open = computed({
  get: () => ui.settingsDrawerOpen.value,
  set: (v: boolean) => {
    ui.settingsDrawerOpen.value = v
  },
})

const health = computed(() => workflow.health.value)
const device = computed(() => workflow.kioskContext.value?.device)
const selectedScanner = computed(() => workflow.selectedScanner.value)
const bindingProfile = computed(() => getKioskBindingProfile())

const agentStatusTone = computed(() => {
  const h = health.value
  if (!h) return 'muted'
  if (!h.bound) return 'danger'
  if (!h.scannerConnected) return 'warning'
  return 'success'
})

const agentStatusText = computed(() => {
  const h = health.value
  if (!h) return '未连接'
  return workflow.agentHealthStatusLabel(h.status)
})

const deviceOnlineText = computed(() => {
  const d = device.value
  if (!d) return health.value?.bound ? '已绑定' : '未绑定'
  return workflow.endpointOnlineStatusLabel(d.onlineStatus)
})

const scannerConfigRows = computed(() => {
  const scanner = selectedScanner.value
  if (!scanner) return []
  return [
    { label: '驱动类型', value: scanner.driverType || '—' },
    { label: '最大 DPI', value: scanner.maxDpi ? String(scanner.maxDpi) : '—' },
    { label: '进纸器 ADF', value: scanner.supportsAdf ? '支持' : '不支持' },
    { label: '双面扫描', value: scanner.supportsDuplex ? '支持' : '不支持' },
  ]
})

function handleRefreshScanners() {
  workflow.refreshScannersByUser()
}
function handleSelectScanner(localScannerId: string) {
  if (workflow.selectedScannerId.value === localScannerId) return
  workflow.selectedScannerId.value = localScannerId
}
function handleRefreshSession() {
  void workflow.refreshAll()
}
function handleReactivate() {
  workflow.openActivationModal()
}
function handleClose() {
  ui.closeSettings()
}

const sseStatusTone = computed(() => (workflow.sseStreaming.value ? 'success' : 'muted'))
const sseStatusText = computed(() =>
  workflow.sseStreaming.value ? '已连接（实时推送）' : '未连接',
)
const liveEventCount = computed(() => workflow.liveEvents.value.length)

const upgradeRequired = computed(() => Boolean(health.value?.upgradeRequired))
const tokenResetRequired = computed(() => Boolean(health.value?.tokenResetRequired))
const rebindRequired = computed(() => Boolean(health.value?.rebindRequired))
const kioskBrowserSessionSyncNeeded = computed(() => workflow.kioskBrowserSessionSyncNeeded.value)
const agentUpdateStatus = computed(() => health.value?.updateStatus ?? AgentUpdateStatusCode.NONE)
const agentUpdateAvailable = computed(() => Boolean(health.value?.updateAvailable))
const agentUpdateInstallable = computed(() => Boolean(health.value?.updateInstallable))
const agentUpdateInProgress = computed(
  () =>
    agentUpdateStatus.value === AgentUpdateStatusCode.DOWNLOADING
    || agentUpdateStatus.value === AgentUpdateStatusCode.INSTALLING,
)
const agentUpdateFailed = computed(() => agentUpdateStatus.value === AgentUpdateStatusCode.FAILED)
const showMaintenanceSection = computed(
  () =>
    upgradeRequired.value
    || tokenResetRequired.value
    || rebindRequired.value
    || kioskBrowserSessionSyncNeeded.value
    || agentUpdateInProgress.value
    || agentUpdateFailed.value
    || agentUpdateAvailable.value,
)

const minAgentVersion = computed(() => health.value?.minimumAgentVersion || '')
const latestAgentVersion = computed(() => health.value?.latestAgentVersion || '')
const minClientVersion = computed(() => health.value?.minimumClientVersion || '')
const latestClientVersion = computed(() => health.value?.latestClientVersion || '')
</script>

<template>
  <a-drawer
    v-model:open="open"
    placement="right"
    :width="480"
    :body-style="{ padding: 0, background: 'var(--kiosk-page-bg)' }"
    :header-style="{ display: 'none' }"
    :closable="false"
    :destroy-on-close="false"
  >
    <div class="settings-drawer">
      <header class="drawer-head">
        <div>
          <h2>设备设置</h2>
          <small>扫描设备 / 实时连接 / 维护</small>
        </div>
        <button type="button" class="drawer-close" title="关闭 [Esc]" @click="handleClose">
          ×
        </button>
      </header>

      <div class="drawer-body">
        <section v-if="showMaintenanceSection" class="section section--alert">
          <header class="section-head">
            <h3>
              <ArrowUpOutlined v-if="upgradeRequired" />
              <WarningFilled v-else />
              {{ upgradeRequired ? '升级要求' : '维护提示' }}
            </h3>
            <span class="status-pill tone-warning">
              <WarningFilled />
              <span>需要处理</span>
            </span>
          </header>

          <div v-if="kioskBrowserSessionSyncNeeded" class="alert-block">
            <p>浏览器会话未与 Agent 对齐</p>
            <small>正在从本机 Agent 同步 push_token；若长时间无响应，请刷新连接或重新输入激活码。</small>
            <button type="button" class="ghost-btn" @click="handleRefreshSession">
              <ReloadOutlined />
              刷新连接
            </button>
          </div>

          <div v-if="tokenResetRequired || rebindRequired" class="alert-block">
            <p>系统要求重新激活一体机</p>
            <small>{{
              rebindRequired
                ? '当前机器码未绑定服务端端点，请使用激活码重新激活。'
                : '请通过激活弹窗重新激活，本机当前任务在激活后会被中断。'
            }}</small>
            <button type="button" class="ghost-btn" @click="handleReactivate">打开激活窗口</button>
          </div>

          <div v-if="upgradeRequired" class="alert-block">
            <p>系统提示需要升级本机扫描组件</p>
            <dl class="kv">
              <div v-if="health?.agentVersion">
                <dt>当前组件版本</dt>
                <dd>{{ health.agentVersion }}</dd>
              </div>
              <div v-if="minAgentVersion">
                <dt>最低组件版本</dt>
                <dd>{{ minAgentVersion }}</dd>
              </div>
              <div v-if="latestAgentVersion">
                <dt>最新组件版本</dt>
                <dd>{{ latestAgentVersion }}</dd>
              </div>
              <div v-if="minClientVersion">
                <dt>最低客户端版本</dt>
                <dd>{{ minClientVersion }}</dd>
              </div>
              <div v-if="latestClientVersion">
                <dt>最新客户端版本</dt>
                <dd>{{ latestClientVersion }}</dd>
              </div>
            </dl>
            <small>
              下载完成后将在无进行中扫描任务时自动安装；有扫描任务时请待任务结束后再安装。
            </small>
          </div>

          <div
            v-if="agentUpdateAvailable || agentUpdateInProgress || agentUpdateFailed"
            class="alert-block"
          >
            <p>本机扫描组件更新</p>
            <dl class="kv">
              <div>
                <dt>更新状态</dt>
                <dd>{{ workflow.agentUpdateStatusLabel(agentUpdateStatus) }}</dd>
              </div>
              <div v-if="health?.updatePackageVersion">
                <dt>更新版本</dt>
                <dd>{{ health.updatePackageVersion }}</dd>
              </div>
              <div v-if="health?.updatePackageFileName">
                <dt>更新包</dt>
                <dd>{{ health.updatePackageFileName }}</dd>
              </div>
              <div v-if="health?.updateDownloadedAt">
                <dt>下载完成</dt>
                <dd>{{ workflow.formatTime(health.updateDownloadedAt) }}</dd>
              </div>
            </dl>
            <small v-if="health?.updateDiagnosticMessage">{{
              health.updateDiagnosticMessage
            }}</small>
            <button
              v-if="agentUpdateInstallable"
              type="button"
              class="ghost-btn"
              :disabled="workflow.loading.value"
              @click="workflow.installAgentUpdatePackage()"
            >
              安装已下载更新包
            </button>
          </div>
        </section>

        <!-- 扫描设备：组件状态 + 绑定信息 + 扫描仪 -->
        <section class="section">
          <header class="section-head">
            <h3>
              <ScanOutlined />
              扫描设备
            </h3>
            <span class="status-pill" :class="`tone-${agentStatusTone}`">
              <CheckCircleFilled v-if="agentStatusTone === 'success'" />
              <WarningFilled v-else-if="agentStatusTone === 'warning'" />
              <CloseCircleFilled v-else-if="agentStatusTone === 'danger'" />
              <span>{{ agentStatusText }}</span>
            </span>
          </header>

          <dl class="kv">
            <div>
              <dt>组件版本</dt>
              <dd>{{ health?.agentVersion || '—' }}</dd>
            </div>
            <div>
              <dt>机器码</dt>
              <dd>{{ health?.machineCode || '—' }}</dd>
            </div>
            <div>
              <dt>扫描仪连接</dt>
              <dd>{{ health?.scannerConnected ? '已连接' : '未连接' }}</dd>
            </div>
            <div>
              <dt>服务允许扫描</dt>
              <dd>{{ health?.scanAllowed ? '是' : '否' }}</dd>
            </div>
            <div>
              <dt>本地超时任务</dt>
              <dd>{{ health?.pendingUploadJobs ?? '—' }}</dd>
            </div>
            <div>
              <dt>设备在线</dt>
              <dd>{{ deviceOnlineText }}</dd>
            </div>
            <div>
              <dt>扫描设备编号</dt>
              <dd>{{ device?.scannerDeviceId || bindingProfile?.scannerDeviceId || '—' }}</dd>
            </div>
            <div>
              <dt>扫描站点编号</dt>
              <dd>{{ device?.scannerStationId || bindingProfile?.scannerStationId || '—' }}</dd>
            </div>
            <div>
              <dt>设备名称</dt>
              <dd>{{ device?.deviceName || bindingProfile?.deviceName || '—' }}</dd>
            </div>
            <div>
              <dt>站点名称</dt>
              <dd>{{ device?.scannerStationName || bindingProfile?.endpointName || '—' }}</dd>
            </div>
            <div v-if="health?.lastHeartbeatAt">
              <dt>最后心跳</dt>
              <dd>{{ workflow.formatTime(health.lastHeartbeatAt) }}</dd>
            </div>
          </dl>

          <div class="subsection-head">
            <h4>扫描仪 ({{ workflow.scanners.value.length }})</h4>
            <button
              type="button"
              class="ghost-btn"
              :disabled="workflow.loading.value"
              @click="handleRefreshScanners"
            >
              <ReloadOutlined />
              <span>刷新</span>
            </button>
          </div>

          <div v-if="workflow.scanners.value.length === 0" class="empty-block">
            <ScanOutlined class="empty-icon" />
            <p>未检测到扫描仪</p>
            <small>请确认 USB 或网络连接、驱动已安装，再点击刷新</small>
          </div>

          <ul v-else class="scanner-list">
            <li
              v-for="s in workflow.scanners.value"
              :key="s.localScannerId"
              class="scanner-item"
              :class="{
                active: workflow.selectedScannerId.value === s.localScannerId,
                disabled: !s.available,
              }"
            >
              <button
                type="button"
                :disabled="!s.available"
                @click="handleSelectScanner(s.localScannerId)"
              >
                <span class="scanner-radio" />
                <div class="scanner-text">
                  <strong>{{ s.displayName }}</strong>
                  <span class="scanner-meta">
                    <span>{{ s.localScannerId }}</span>
                    <span class="dot" />
                    <span>{{ s.available ? '可用' : '不可用' }}</span>
                  </span>
                </div>
              </button>
            </li>
          </ul>

          <div v-if="selectedScanner" class="scanner-config">
            <h4>当前扫描仪配置</h4>
            <dl class="kv">
              <div v-for="row in scannerConfigRows" :key="row.label">
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </div>
              <div v-if="selectedScanner.diagnostic">
                <dt>诊断信息</dt>
                <dd>{{ selectedScanner.diagnostic }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <!-- 实时连接 -->
        <section class="section">
          <header class="section-head">
            <h3>
              <ApiOutlined />
              实时连接
            </h3>
            <span class="status-pill" :class="`tone-${sseStatusTone}`">
              <CheckCircleFilled v-if="sseStatusTone === 'success'" />
              <CloseCircleFilled v-else />
              <span>{{ sseStatusText }}</span>
            </span>
          </header>

          <dl class="kv">
            <div>
              <dt>已接收事件</dt>
              <dd>{{ liveEventCount }}</dd>
            </div>
            <div>
              <dt>连接说明</dt>
              <dd class="small">激活后打开页面会自动建立实时连接，扫描中自动接收活跃批次更新</dd>
            </div>
          </dl>
        </section>

        <!-- 维护操作 -->
        <section class="section">
          <header class="section-head">
            <h3>维护操作</h3>
          </header>

          <div class="ops-row">
            <button
              type="button"
              class="primary-btn primary-btn--compact"
              :disabled="!workflow.canActivateAgent.value || workflow.loading.value"
              @click="handleReactivate"
            >
              <ThunderboltFilled />
              <span>重新激活</span>
            </button>
          </div>
          <p class="section-note">一体机客户端不支持解绑；如需解绑请联系管理员在教务平台操作。</p>
        </section>
      </div>
    </div>
  </a-drawer>
</template>

<style scoped>
.settings-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--kiosk-page-bg);
  font-family: var(--kiosk-font-display);
  color: var(--kiosk-ink-primary);
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-4) var(--kiosk-space-5);
  background: var(--kiosk-surface);
  border-bottom: 1px solid var(--kiosk-divider);
  box-shadow: var(--kiosk-shadow-1);
}
.drawer-head h2 {
  margin: 0 0 2px;
  font-size: var(--kiosk-fz-h2);
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
}
.drawer-head small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.drawer-close {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  color: var(--kiosk-ink-secondary);
  font-size: 22px;
  font-family: inherit;
  cursor: pointer;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--kiosk-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-4);
}

.section {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
}

.section-head,
.subsection-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--kiosk-space-2);
}
.section-head {
  padding-bottom: var(--kiosk-space-2);
  border-bottom: 1px solid var(--kiosk-divider);
}
.section-head h3,
.subsection-head h4 {
  margin: 0;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-2);
}
.subsection-head h4 {
  font-size: var(--kiosk-fz-label);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  height: 28px;
  padding: 0 var(--kiosk-space-3);
  border-radius: var(--kiosk-radius-pill);
  font-size: var(--kiosk-fz-caption);
  font-weight: var(--kiosk-fw-medium);
}
.status-pill.tone-success {
  background: var(--kiosk-success-soft);
  color: var(--kiosk-success);
}
.status-pill.tone-warning {
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
}
.status-pill.tone-danger {
  background: var(--kiosk-danger-soft);
  color: var(--kiosk-danger);
}
.status-pill.tone-muted {
  background: var(--kiosk-neutral-soft);
  color: var(--kiosk-ink-tertiary);
}

.kv {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
}
.kv > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--kiosk-space-3);
}
.kv dt {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.kv dd {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-primary);
  text-align: right;
  word-break: break-all;
}
.kv dd.small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.scanner-config {
  padding: var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
}
.scanner-config h4 {
  margin: 0 0 var(--kiosk-space-2);
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-secondary);
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  height: 36px;
  padding: 0 var(--kiosk-space-3);
  background: transparent;
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-sm);
  color: var(--kiosk-ink-secondary);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  cursor: pointer;
}
.ghost-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  height: 44px;
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
  border: none;
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
}
.primary-btn--compact {
  height: 44px;
}
.primary-btn:disabled {
  background: var(--kiosk-neutral);
  color: var(--kiosk-ink-disabled);
  cursor: not-allowed;
}

.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-4);
  background: var(--kiosk-surface-alt);
  border: 1px dashed var(--kiosk-divider-strong);
  border-radius: var(--kiosk-radius-md);
  text-align: center;
}
.empty-icon {
  font-size: 32px;
  color: var(--kiosk-ink-tertiary);
}
.empty-block p {
  margin: 0;
  color: var(--kiosk-ink-secondary);
}
.empty-block small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.scanner-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
}
.scanner-item button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  cursor: pointer;
}
.scanner-item.active button {
  border-color: var(--kiosk-primary);
  background: var(--kiosk-primary-soft);
}
.scanner-item button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.scanner-radio {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--kiosk-divider-strong);
  flex: 0 0 auto;
}
.scanner-item.active .scanner-radio {
  border-color: var(--kiosk-primary);
  background: var(--kiosk-primary);
}
.scanner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  text-align: left;
}
.scanner-meta {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--kiosk-ink-tertiary);
}

.ops-row {
  display: flex;
  gap: var(--kiosk-space-2);
  flex-wrap: wrap;
}
.ops-row > button {
  flex: 1;
  min-width: 140px;
}

.section-note {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  line-height: var(--kiosk-lh-base);
}

.section--alert {
  background: var(--kiosk-warning-soft);
  border-color: rgba(217, 119, 6, 0.3);
}
.alert-block {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-3);
  background: var(--kiosk-surface);
  border: 1px solid rgba(217, 119, 6, 0.25);
  border-radius: var(--kiosk-radius-sm);
}
.alert-block p {
  margin: 0;
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-warning);
}
.alert-block small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
</style>
