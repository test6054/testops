<script setup lang="ts">
/**
 * KioskSettingsDrawer - 设备设置抽屉（右侧 480px）
 *
 * 内容分组：
 *   1. Agent 状态与设备信息（只读）
 *   2. 重新激活（gateway / activationCode / endpointName + activate 按钮）
 *   3. 扫描仪选择（可用列表 + 当前选中 + 刷新）
 *   4. 维护操作（诊断导出 + 解绑一体机）
 *
 * 由 KioskAppBar / KioskSideRail 触发 ui.openSettings() 打开；
 * 关闭通过 v-model:open 双向绑定 ui.settingsDrawerOpen。
 */
import {
  ApiOutlined,
  ArrowUpOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CloudDownloadOutlined,
  DisconnectOutlined,
  ReloadOutlined,
  ScanOutlined,
  ThunderboltFilled,
  WarningFilled,
} from '@ant-design/icons-vue'
import { computed, watch } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, ui } = useKioskCtx()

// 抽屉打开时自动启动扫描仪枚举轮询，关闭时停止
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
  if (!d) return '未定位设备'
  return workflow.endpointOnlineStatusLabel(d.onlineStatus)
})

function handleRefreshScanners() {
  workflow.refreshScannersByUser()
}
function handleSelectScanner(localScannerId: string) {
  if (workflow.selectedScannerId.value === localScannerId) return
  workflow.selectedScannerId.value = localScannerId
}
function handleActivate() {
  if (!workflow.canActivateAgent.value || workflow.loading.value) return
  workflow.activateAgent()
}
function handleUnbind() {
  workflow.unbindAgent()
}
function handleDiagnosticsExport() {
  workflow.triggerDiagnosticsExport()
}
function handleClose() {
  ui.closeSettings()
}

// SSE 实时流派生（注意：账本细节只在主区显示，本抽屉不重复展示账本数据，避免双源真值）
const sseStatusTone = computed(() => (workflow.sseStreaming.value ? 'success' : 'muted'))
const sseStatusText = computed(() =>
  workflow.sseStreaming.value ? '已连接（实时推送）' : '未连接',
)
const liveEventCount = computed(() => workflow.liveEvents.value.length)

// 升级 / 维护提示派生
const upgradeRequired = computed(() => Boolean(health.value?.upgradeRequired))
const tokenResetRequired = computed(() => Boolean(health.value?.tokenResetRequired))
const showMaintenanceSection = computed(() => upgradeRequired.value || tokenResetRequired.value)

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
      <!-- Drawer 自绘标题栏（接管 ant 默认样式） -->
      <header class="drawer-head">
        <div>
          <h2>设备设置</h2>
          <small>一体机激活 / 扫描仪 / 维护</small>
        </div>
        <button type="button" class="drawer-close" title="关闭 [Esc]" @click="handleClose">
          ×
        </button>
      </header>

      <div class="drawer-body">
        <!-- 升级 / 维护提示（仅当 upgradeRequired 或 tokenResetRequired 时显示） -->
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

          <div v-if="tokenResetRequired" class="alert-block">
            <p>服务端要求重置一体机 token</p>
            <small>请使用下方激活码重新激活，本机当前任务在激活后会被中断。</small>
          </div>

          <div v-if="upgradeRequired" class="alert-block">
            <p>服务端公告需升级 Agent / 客户端</p>
            <dl class="kv">
              <div v-if="health?.agentVersion">
                <dt>当前 Agent</dt>
                <dd class="mono">{{ health.agentVersion }}</dd>
              </div>
              <div v-if="minAgentVersion">
                <dt>最低 Agent</dt>
                <dd class="mono">{{ minAgentVersion }}</dd>
              </div>
              <div v-if="latestAgentVersion">
                <dt>最新 Agent</dt>
                <dd class="mono">{{ latestAgentVersion }}</dd>
              </div>
              <div v-if="minClientVersion">
                <dt>最低 客户端</dt>
                <dd class="mono">{{ minClientVersion }}</dd>
              </div>
              <div v-if="latestClientVersion">
                <dt>最新 客户端</dt>
                <dd class="mono">{{ latestClientVersion }}</dd>
              </div>
            </dl>
            <small> 请联系管理员或运维下载新版本安装包；升级期间一体机会自动暂停业务。 </small>
          </div>
        </section>

        <!-- Section 1: Agent 状态 -->
        <section class="section">
          <header class="section-head">
            <h3>Agent 状态</h3>
            <span class="status-pill" :class="`tone-${agentStatusTone}`">
              <CheckCircleFilled v-if="agentStatusTone === 'success'" />
              <WarningFilled v-else-if="agentStatusTone === 'warning'" />
              <CloseCircleFilled v-else-if="agentStatusTone === 'danger'" />
              <span>{{ agentStatusText }}</span>
            </span>
          </header>

          <dl class="kv">
            <div>
              <dt>Agent 版本</dt>
              <dd>{{ health?.agentVersion || '—' }}</dd>
            </div>
            <div>
              <dt>机器码</dt>
              <dd class="mono">{{ health?.machineCode || '—' }}</dd>
            </div>
            <div>
              <dt>本地超时任务</dt>
              <dd>{{ health?.pendingUploadJobs ?? '—' }}</dd>
            </div>
            <div>
              <dt>扫描仪连接</dt>
              <dd>{{ health?.scannerConnected ? '已连接' : '未连接' }}</dd>
            </div>
            <div>
              <dt>服务允许扫描</dt>
              <dd>{{ health?.scanAllowed ? '是' : '否' }}</dd>
            </div>
            <div v-if="health?.lastHeartbeatAt">
              <dt>最后心跳</dt>
              <dd class="mono">{{ workflow.formatTime(health.lastHeartbeatAt) }}</dd>
            </div>
          </dl>
        </section>

        <!-- Section 1.5: 实时流 SSE 状态（仅显示连接信息，账本数据由主区单一真源呈现） -->
        <section class="section">
          <header class="section-head">
            <h3>
              <ApiOutlined />
              实时流（SSE）
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
              <dd class="mono">{{ liveEventCount }}</dd>
            </div>
            <div>
              <dt>事件源 URL</dt>
              <dd class="mono small">扫描中页面 SSE 推送活跃批次增量</dd>
            </div>
          </dl>
          <p class="section-note">
            扫描页面账本细节请在「复核」或「封存 · 历史批次详情」页面查看； 此处仅展示 SSE
            连接维度信息，避免与主区账本视图分裂。
          </p>
        </section>

        <!-- Section 2: 重新激活 -->
        <section class="section">
          <header class="section-head">
            <h3>重新激活 / 切端点</h3>
            <small v-if="!workflow.canActivateAgent.value" class="section-hint">
              当前扫描任务未结束，无法激活
            </small>
          </header>

          <div class="form">
            <label class="form-row">
              <span class="form-label">网关 BaseURL</span>
              <input
                v-model="workflow.activationForm.value.gatewayBaseUrl"
                type="text"
                class="form-input mono"
                placeholder="https://gateway.example.com"
                :disabled="!workflow.canActivateAgent.value"
              />
            </label>
            <label class="form-row">
              <span class="form-label">激活码</span>
              <input
                v-model="workflow.activationForm.value.activationCode"
                type="text"
                class="form-input mono"
                placeholder="由教务平台下发"
                :disabled="!workflow.canActivateAgent.value"
              />
            </label>
            <label class="form-row">
              <span class="form-label">端点名称</span>
              <input
                v-model="workflow.activationForm.value.endpointName"
                type="text"
                class="form-input"
                placeholder="如：教学楼 A-501"
                :disabled="!workflow.canActivateAgent.value"
              />
            </label>
            <button
              type="button"
              class="primary-btn"
              :disabled="!workflow.canActivateAgent.value || workflow.loading.value"
              @click="handleActivate"
            >
              <ThunderboltFilled />
              <span>激活一体机</span>
            </button>
          </div>
        </section>

        <!-- Section 3: 扫描仪选择 -->
        <section class="section">
          <header class="section-head">
            <h3>扫描仪 ({{ workflow.scanners.value.length }})</h3>
            <button
              type="button"
              class="ghost-btn"
              :disabled="workflow.loading.value"
              :title="workflow.loading.value ? '正在处理中' : '重新枚举扫描仪'"
              @click="handleRefreshScanners"
            >
              <ReloadOutlined />
              <span>刷新</span>
            </button>
          </header>

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
                    <span class="mono">{{ s.localScannerId }}</span>
                    <span class="dot" />
                    <span>{{ s.available ? '可用' : '不可用' }}</span>
                  </span>
                </div>
              </button>
            </li>
          </ul>
        </section>

        <!-- Section 4: 设备信息 -->
        <section class="section">
          <header class="section-head">
            <h3>设备信息</h3>
            <span class="status-pill" :class="`tone-${device ? 'success' : 'muted'}`">
              <span>{{ deviceOnlineText }}</span>
            </span>
          </header>

          <dl class="kv">
            <div>
              <dt>Device ID</dt>
              <dd class="mono">{{ device?.scannerDeviceId || '—' }}</dd>
            </div>
            <div>
              <dt>Station ID</dt>
              <dd class="mono">{{ device?.scannerStationId || '—' }}</dd>
            </div>
            <div>
              <dt>设备名称</dt>
              <dd>{{ device?.deviceName || '—' }}</dd>
            </div>
            <div>
              <dt>站点名称</dt>
              <dd>{{ device?.scannerStationName || '—' }}</dd>
            </div>
            <div v-if="device">
              <dt>服务端连接</dt>
              <dd>{{ device.scannerConnected ? '已连接' : '未连接' }}</dd>
            </div>
            <div v-if="device">
              <dt>待处理任务</dt>
              <dd>{{ device.pendingJobCount }} / {{ device.pendingUploadPageCount }} 页</dd>
            </div>
          </dl>
        </section>

        <!-- Section 5: 维护操作 -->
        <section class="section">
          <header class="section-head">
            <h3>维护操作</h3>
          </header>

          <div class="ops-row">
            <button type="button" class="ghost-btn" @click="handleDiagnosticsExport">
              <CloudDownloadOutlined />
              <span>导出诊断包</span>
            </button>
            <button
              type="button"
              class="danger-btn"
              :disabled="workflow.loading.value"
              :title="workflow.loading.value ? '正在处理中' : '解绑后需重新激活才能使用'"
              @click="handleUnbind"
            >
              <DisconnectOutlined />
              <span>解绑一体机</span>
            </button>
          </div>
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
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.drawer-close:hover {
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
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

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--kiosk-space-2);
  padding-bottom: var(--kiosk-space-2);
  border-bottom: 1px solid var(--kiosk-divider);
}
.section-head h3 {
  margin: 0;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}
.section-hint {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-warning);
}

/* Status pill */
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

/* KV grid */
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
.kv .mono {
  font-family: var(--kiosk-font-mono);
}
.mono {
  font-family: var(--kiosk-font-mono);
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-1);
}
.form-label {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.form-input {
  height: 44px;
  padding: 0 var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-primary);
  outline: none;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.form-input:focus {
  border-color: var(--kiosk-primary);
}
.form-input:disabled {
  background: var(--kiosk-neutral-soft);
  cursor: not-allowed;
}

/* Buttons */
.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  height: 48px;
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
  border: none;
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
  transition: background var(--kiosk-dur-fast) var(--kiosk-easing);
}
.primary-btn:hover:not(:disabled) {
  background: var(--kiosk-primary-pressed);
}
.primary-btn:disabled {
  background: var(--kiosk-neutral);
  color: var(--kiosk-ink-disabled);
  cursor: not-allowed;
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
  font-weight: var(--kiosk-fw-medium);
  cursor: pointer;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.ghost-btn:hover:not(:disabled) {
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
}
.ghost-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.danger-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  height: 36px;
  padding: 0 var(--kiosk-space-3);
  background: var(--kiosk-danger-soft);
  border: 1px solid rgba(197, 38, 62, 0.3);
  border-radius: var(--kiosk-radius-sm);
  color: var(--kiosk-danger);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  cursor: pointer;
}
.danger-btn:hover:not(:disabled) {
  border-color: var(--kiosk-danger);
}
.danger-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Empty block */
.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-5);
  background: var(--kiosk-surface-alt);
  border: 1px dashed var(--kiosk-divider-strong);
  border-radius: var(--kiosk-radius-md);
  text-align: center;
}
.empty-icon {
  font-size: 36px;
  color: var(--kiosk-ink-tertiary);
}
.empty-block p {
  margin: 0;
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-secondary);
}
.empty-block small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

/* Scanner list */
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
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.scanner-item button:hover:not(:disabled) {
  border-color: var(--kiosk-primary);
}
.scanner-item button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.scanner-item.active button {
  border-color: var(--kiosk-primary);
  background: var(--kiosk-primary-soft);
  box-shadow: 0 0 0 2px rgba(31, 95, 255, 0.18);
}

.scanner-radio {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--kiosk-divider-strong);
  flex: 0 0 auto;
  position: relative;
}
.scanner-item.active .scanner-radio {
  border-color: var(--kiosk-primary);
  background: var(--kiosk-primary);
}
.scanner-item.active .scanner-radio::after {
  content: '';
  position: absolute;
  inset: 4px;
  background: white;
  border-radius: 50%;
}

.scanner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  text-align: left;
}
.scanner-text strong {
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
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
  flex: 0 0 auto;
}

/* Ops row */
.ops-row {
  display: flex;
  gap: var(--kiosk-space-2);
  flex-wrap: wrap;
}
.ops-row > button {
  flex: 1;
  min-width: 140px;
  height: 44px;
}

/* 维护提示 / 升级提示 */
.section--alert {
  background: var(--kiosk-warning-soft);
  border-color: rgba(217, 119, 6, 0.3);
}
.section--alert .section-head h3 {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  color: var(--kiosk-warning);
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
.alert-block + .alert-block {
  margin-top: var(--kiosk-space-2);
}
.alert-block p {
  margin: 0;
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-warning);
}
.alert-block small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.kv .danger,
.alert-block .danger {
  color: var(--kiosk-danger);
}

.kv dd.small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.section-note {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  line-height: var(--kiosk-lh-base);
}
</style>
