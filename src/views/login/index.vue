<template>
  <article class="seo-content" aria-hidden="true">
    <h1>教学质量中心 - 高校考试阅卷与教学质量治理平台</h1>
    <p>
      覆盖考试阅卷、OBE
      质量评价与教师档案治理：扫描录入、智能识别、批阅复核、成绩发布、达成度分析与认证支撑。
    </p>
  </article>

  <div class="login-page">
    <!-- 右上角 Logo -->
    <div class="login-brand__top">
      <img src="/logo.svg" alt="教学质量中心" class="login-brand__logo" />
      <div class="login-brand__mark">
        <div class="login-brand__name">教学质量中心</div>
        <div class="login-brand__sub">TEACHING QUALITY</div>
      </div>
    </div>

    <main class="login-stage">
      <section class="login-brand">
        <div class="login-brand__layout">
          <div class="login-brand__content-row">
            <div class="login-brand__capability-column">
              <ul class="login-brand__highlights" aria-label="阅卷主链路">
                <li class="login-brand__highlight">
                  <span class="login-brand__highlight-step">1</span>
                  <span class="login-brand__highlight-text">扫描录入：纸质答卷影像化入库</span>
                </li>
                <li class="login-brand__highlight">
                  <span class="login-brand__highlight-step">2</span>
                  <span class="login-brand__highlight-text">教师复核：识别结果确认与批注</span>
                </li>
                <li class="login-brand__highlight">
                  <span class="login-brand__highlight-step">3</span>
                  <span class="login-brand__highlight-text">成绩发布：复核通过后向学生公布</span>
                </li>
              </ul>
              <div class="login-brand__hero">
                <div class="login-brand__visual">
                  <img
                    :src="loginHeroVisual"
                    alt="教学质量中心平台能力示意图"
                    class="login-brand__visual-image"
                  />
                </div>
              </div>
            </div>

            <section class="login-panel">
              <div class="login-panel__header">
                <h3 class="login-panel__title">登录教学质量中心</h3>
                <p v-if="isSubdomain && subdomainTenant" class="login-panel__subtitle">
                  {{ subdomainTenant.tenantName }}
                </p>
                <p v-else class="login-panel__subtitle">请选择登录方式并完成身份验证。</p>
              </div>

              <div class="login-panel__surface">
                <div v-if="isSubdomain" class="login-body">
                  <UiStateBlock
                    v-if="subdomainLoading"
                    state="loading"
                    title="正在识别学校..."
                    compact
                  />
                  <StudentLogin v-else :subdomain-mode="true" :subdomain-tenant="subdomainTenant" />
                </div>

                <div v-else class="login-body">
                  <UiRadioGroup v-model="activeTab" :options="loginTabItems" block size="lg" />

                  <div class="login-tab-content">
                    <AccountLogin
                      v-if="activeTab === '1'"
                      @switch-to-student="switchToStudentTab"
                    />
                    <StudentLogin
                      v-if="activeTab === '2'"
                      :subdomain-mode="false"
                      :prefill-data="studentPrefill"
                    />
                    <CasLogin
                      v-if="activeTab === '3'"
                      :tenant-id="casTenantId"
                      :display-name="casDisplayName"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>

    <footer class="login-footer">
      <p class="login-footer__copy">{{ copyright }} · 京ICP备13021011号</p>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import type { SsoConfigResponse } from '@/apis/sso'
import { getCasLoginUrl, getSsoConfig } from '@/apis/sso'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import loginHeroVisual from '@/assets/login/login-hero-visual.svg'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiStateBlock from '@/components/ui-guide/ui/UiStateBlock.vue'
import { resetAuthState } from '@/config/axios/auth-state'
import { useAppStore } from '@/stores'
import { showUserError } from '@/utils/error-handler'

import { resolveSubdomainTenant, subdomainLoading, subdomainTenant } from '@/utils/subdomain'
import AccountLogin from './components/account/index.vue'
import CasLogin from './components/cas/index.vue'
import StudentLogin from './components/student/index.vue'

defineOptions({ name: 'Login' })

const route = useRoute()
const appStore = useAppStore()

const isSubdomain = ref(false)
const activeTab = ref('1')
const studentPrefill = ref<{ studentNo: string; password: string }>({ studentNo: '', password: '' })

const ssoConfig = ref<SsoConfigResponse | null>(null)
const casEnabled = computed(() => ssoConfig.value?.casEnabled ?? false)
const casDisplayName = computed(() => ssoConfig.value?.casDisplayName || '统一认证')
const casTenantId = ref<string>('')
const isCasCallback = ref(false)
const copyright = computed(() => appStore.getCopyright())

const loginTabItems = computed(() => {
  const items: { value: string; label: string }[] = [
    { value: '1', label: '账号登录' },
    { value: '2', label: '学号登录' },
  ]
  if (casEnabled.value) {
    items.push({ value: '3', label: casDisplayName.value })
  }
  return items
})

function switchToStudentTab(val: { studentNo: string; password: string }) {
  activeTab.value = '2'
  studentPrefill.value = {
    studentNo: val.studentNo,
    password: val.password,
  }
}

function checkCasCallback(): boolean {
  const ticket = queryString(route.query.ticket)
  const tenantId = queryString(route.query.tenantId)

  if (ticket && tenantId) {
    isCasCallback.value = true
    casTenantId.value = tenantId
    activeTab.value = '3'
    return true
  }
  return false
}

function shouldAutoTriggerCas(): boolean {
  const autoCas = queryString(route.query.autoCas)
  return autoCas === '1' || autoCas === 'true'
}

async function resolveCurrentTenantId(): Promise<string> {
  const routeTenantId = queryString(route.query.tenantId)
  if (routeTenantId) {
    return routeTenantId
  }

  const resolvedTenant = await resolveSubdomainTenant()
  if (resolvedTenant?.tenantId) {
    return resolvedTenant.tenantId
  }

  return ''
}

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

async function triggerAutoCasLogin() {
  if (!casTenantId.value) {
    return
  }

  activeTab.value = '3'
  window.location.href = await getCasLoginUrl(casTenantId.value)
}

async function fetchSsoConfig() {
  const tenantId = casTenantId.value || (await resolveCurrentTenantId())

  if (!tenantId) {
    ssoConfig.value = { casEnabled: false, casDisplayName: '统一认证' }
    return
  }

  try {
    const config = await getSsoConfig(tenantId)
    ssoConfig.value = config

    if (config.casEnabled) {
      casTenantId.value = tenantId
    }
  } catch (error) {
    ssoConfig.value = null
    showUserError(error, '登录方式配置加载失败')
  }
}

onMounted(async () => {
  resetAuthState()

  const isCasReturn = checkCasCallback()

  await fetchSsoConfig()

  if (isCasReturn && casEnabled.value) {
    activeTab.value = '3'
    return
  }

  if (casEnabled.value && shouldAutoTriggerCas()) {
    await triggerAutoCasLogin()
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
:global(html),
:global(body),
:global(#app) {
  height: auto;
  min-height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
}

.seo-content {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.login-page {
  --login-bg: #f5f8fc;
  --login-surface: #fff;
  --login-text: #17345d;
  --login-muted: #607696;
  --login-accent: #2563eb;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: auto;
  padding: 24px 36px 18px;
  overflow: visible;
  /* 企业 SaaS 风格：单层柔和背景，去 radial-gradient / glow / 网格底纹 */
  background: var(--login-bg);
}

.login-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  width: min(1400px, 100%);
  min-height: auto;
  margin: 0 auto;
  align-items: center;
}

.login-brand {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 18px;
  flex: 1;
  min-height: auto;
  padding: 8px 6px 0;
  overflow: visible;
}

.login-brand__top,
.login-brand__layout,
.login-brand__content-row,
.login-brand__capability-column,
.login-brand__hero,
.login-brand__visual {
  position: relative;
}

.login-brand__top {
  position: absolute;
  top: 28px;
  left: 48px;
  display: inline-flex;
  align-items: center;
  gap: 14px;
  z-index: 10;
}

.login-brand__logo {
  width: 34px;
  height: 34px;
}

.login-brand__mark {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.login-brand__name {
  font-size: 28px;
  line-height: 1;
  font-weight: 800;
  color: var(--login-text);
}

.login-brand__sub {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: rgba(23, 52, 93, 0.5);
}

.login-brand__layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: min(1180px, 100%);
  margin: 0 auto;
  justify-content: center;
  align-self: center;
  min-height: 0;
  padding-top: 56px;
}

.login-brand__content-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 56px;
  min-height: 0;
  align-items: center;
}

.login-brand__capability-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-brand__highlights {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.login-brand__highlight {
  display: flex;
  align-items: center;
  gap: 12px;
}

.login-brand__highlight-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.1);
  color: var(--login-accent);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.login-brand__highlight-text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--login-muted);
}

.login-brand__hero {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
}

.login-brand__visual {
  width: min(700px, 100%);
  height: clamp(280px, 54vh, 560px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-brand__visual-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
}

.login-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-self: center;
  width: 100%;
  padding: 0;
  gap: 0;
  border-radius: var(--dp-radius-panel);
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.login-panel__header {
  margin-bottom: 0;
  padding: 24px 24px 16px;
  border-radius: var(--dp-radius-panel) var(--dp-radius-panel) 0 0;
  background: var(--login-surface);
  border: 1px solid var(--ant-color-border-secondary, #e5e7eb);
  border-bottom: none;
}

.login-panel__title {
  margin: 0;
  font-size: 22px;
  line-height: 1.3;
  font-weight: 600;
  color: var(--login-text);
}

.login-panel__subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--login-muted);
}

.login-panel__surface {
  padding: 20px 24px 24px;
  border-radius: 0 0 var(--dp-radius-panel) var(--dp-radius-panel);
  background: var(--login-surface);
  border: 1px solid var(--ant-color-border-secondary, #e5e7eb);
  border-top: none;
}

.login-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.login-tab-content {
  margin-top: 24px;

  :deep(.ui-radio-group :where(.ant-radio-group)) {
    gap: 3px;
    padding: 3px;
    border-color: rgba(207, 217, 232, 0.92);
    background: #eef2f7;
    box-shadow: inset 0 1px 1px rgba(15, 23, 42, 0.03);
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper) {
    min-height: 34px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 600;
    line-height: 34px;
    color: #60708a;
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)) {
    background: #fff;
    color: #16345d;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.08),
      0 0 0 1px rgba(210, 219, 232, 0.9) inset;
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper:hover:not(.ant-radio-button-wrapper-disabled)) {
    color: #27476f;
  }

  :deep(.ant-form-item) {
    margin-bottom: 18px;
  }

  :deep(.ui-radio-group) {
    width: 100%;
  }

  :deep(.ui-input__control),
  :deep(.ui-password-input__control),
  :deep(.school-autocomplete__input .ant-select-selector) {
    border-radius: 14px;
  }

  :deep(.ui-button--size-lg) {
    min-height: 48px;
    border-radius: 14px;
    font-weight: 700;
  }
}

.login-footer {
  position: relative;
  z-index: 1;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  width: min(1360px, 100%);
  margin: 8px auto 0;
}

.login-footer__copy {
  margin: 0;
  font-size: 12px;
  color: rgba(84, 108, 143, 0.72);
}

@media (max-width: 1180px) {
  .login-stage {
    display: block;
    padding-top: 0;
  }

  .login-brand {
    min-height: auto;
  }

  .login-brand__top {
    position: relative;
    top: auto;
    left: auto;
    z-index: 1;
    width: 100%;
    margin-bottom: 4px;
  }

  .login-brand__layout {
    width: 100%;
    gap: 28px;
    padding-top: 0;
  }

  .login-brand__content-row {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .login-brand__capability-column {
    min-height: auto;
  }

  .login-brand__hero {
    min-height: auto;
  }

  .login-brand__visual {
    width: 100%;
    height: min(440px, 52vw);
    max-width: 720px;
  }
}

@media (max-width: bp.$layout-mobile-max) {
  .login-page {
    padding: 20px 16px 24px;
  }

  .login-stage {
    gap: 18px;
    min-height: auto;
  }

  .login-brand__top {
    margin-bottom: 8px;
  }

  .login-brand,
  .login-panel {
    border-radius: 24px;
  }

  .login-brand {
    gap: 24px;
    padding: 12px 4px 8px;
  }

  .login-brand__layout {
    gap: 24px;
    padding-top: 8px;
  }

  .login-brand__content-row {
    gap: 22px;
  }

  .login-panel {
    padding: 0;
    width: 100%;
  }

  .login-panel__header {
    padding: 18px 16px 12px;
  }

  .login-panel__surface {
    margin-top: -1px;
    padding: 16px;
  }

  .login-brand__visual {
    height: auto;
    max-height: none;
  }

  .login-footer {
    justify-content: flex-start;
  }
}
</style>
