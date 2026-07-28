<template>
  <article class="seo-content" aria-hidden="true">
    <h1>教学质量中心 - 高校考试阅卷与教学质量治理平台</h1>
    <p>
      覆盖考试阅卷、OBE
      质量评价与教师档案治理：扫描录入、智能识别、批阅复核、成绩发布、达成度分析与认证支撑。
    </p>
  </article>

  <div class="login-page">
    <div class="login-brand__top">
      <img src="/logo.svg" alt="教学质量中心" class="login-brand__logo" />
      <div class="login-brand__mark">
        <div class="login-brand__name">教学质量中心</div>
        <div class="login-brand__sub">让每一次评价都有据可依</div>
      </div>
    </div>

    <main class="login-stage">
      <section class="login-brand">
        <div class="login-brand__layout">
          <div class="login-brand__content-row">
            <div class="login-brand__capability-column">
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
                <p class="login-panel__eyebrow">欢迎回来</p>
                <h2 class="login-panel__title">登录教学质量中心</h2>
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
                      :subdomain-mode="false"
                      @tenant-ready="onCasTenantReady"
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
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getCasLoginUrl } from '@/apis/sso'
import loginHeroVisual from '@/assets/login/login-hero-visual.png'
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
const studentPrefill = ref<{ studentNo: string, password: string }>({ studentNo: '', password: '' })

/** CAS 回跳或深链带来的预置租户；无子域时由 CasLogin 内选校解析 */
const casTenantId = ref<string>('')
const casTabLabel = ref('统一认证')
const copyright = computed(() => appStore.getCopyright())

const loginTabItems = computed(() => [
  { value: '1', label: '账号登录' },
  { value: '2', label: '学号登录' },
  { value: '3', label: casTabLabel.value },
])

function switchToStudentTab(val: { studentNo: string, password: string }) {
  activeTab.value = '2'
  studentPrefill.value = {
    studentNo: val.studentNo,
    password: val.password,
  }
}

function onCasTenantReady(payload: { tenantId: string, casEnabled: boolean, displayName: string }) {
  casTenantId.value = payload.tenantId
  if (payload.displayName) {
    casTabLabel.value = payload.displayName
  }
}

function checkCasCallback(): boolean {
  const ticket = queryString(route.query.ticket)
  const tenantId = queryString(route.query.tenantId)

  if (ticket && tenantId) {
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
  const loginUrl = await getCasLoginUrl(casTenantId.value)
  if (!loginUrl) {
    throw new Error('统一认证暂不可用')
  }
  window.location.href = loginUrl
}

onMounted(async () => {
  resetAuthState()

  const isCasReturn = checkCasCallback()
  const seedTenantId = casTenantId.value || (await resolveCurrentTenantId())
  if (seedTenantId) {
    casTenantId.value = seedTenantId
  }

  if (isCasReturn) {
    activeTab.value = '3'
    return
  }

  if (seedTenantId && shouldAutoTriggerCas()) {
    try {
      await triggerAutoCasLogin()
    } catch (error) {
      showUserError(error, '自动跳转统一认证失败')
    }
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;

.seo-content {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

/* Brand 层：天空一律消费 --dp-brand-*，随主色派生；克制单层，不叠光晕 mesh */
.login-page {
  --login-sky: var(--dp-brand-sky);
  --login-sky-mid: var(--dp-brand-sky-mid);
  --login-surface: var(--dp-surface);
  --login-text: var(--dp-text-primary);
  --login-muted: var(--dp-text-secondary);
  --login-accent: var(--dp-color-primary);
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  padding: var(--dp-space-page) var(--dp-space-section) var(--dp-space-block);
  overflow: hidden;
  background: linear-gradient(165deg, var(--login-sky) 0%, var(--login-sky-mid) 52%, var(--dp-gray-50) 100%);
}

.login-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  width: min(1400px, 100%);
  min-height: 0;
  margin: 0 auto;
  align-items: center;
}

.login-brand {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: var(--dp-space-component-tight) var(--dp-space-component-xs) 0;
  overflow: hidden;
}

/* 极淡天蓝网格，承接插画结构线，不抢主体 */
.login-brand::before {
  content: '';
  position: absolute;
  inset: 10px 0 84px;
  background:
    linear-gradient(
      color-mix(in srgb, var(--dp-blue-200) 55%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--dp-blue-200) 55%, transparent) 1px,
      transparent 1px
    );
  background-size: 56px 56px;
  opacity: 0.18;
  pointer-events: none;
  mask-image: radial-gradient(ellipse at 40% 45%, black 20%, transparent 72%);
}

.login-brand__top,
.login-brand__layout,
.login-brand__content-row,
.login-brand__capability-column,
.login-brand__hero,
.login-brand__visual {
  position: relative;
  z-index: 1;
}

.login-brand__top {
  position: absolute;
  top: 28px;
  left: 48px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component);
}

.login-brand__logo {
  width: 34px;
  height: 34px;
}

.login-brand__mark {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.login-brand__name {
  font-size: clamp(26px, 2.8vw, 32px);
  line-height: 1.15;
  font-weight: var(--dp-font-weight-title);
  letter-spacing: -0.02em;
  color: var(--login-text);
  text-wrap: balance;
}

.login-brand__sub {
  max-width: 20em;
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
  font-weight: var(--dp-font-weight-body);
  letter-spacing: 0.01em;
  color: var(--login-muted);
}

.login-brand__layout {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-self: stretch;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding-top: 0;
}

.login-brand__content-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 400px);
  gap: var(--dp-space-section-loose);
  align-items: center;
  flex: 1;
  min-height: 0;
}

.login-brand__capability-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.login-brand__hero {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.login-brand__visual {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
}

/* 与插画同色温的环境光，消掉「白底贴图」感 */
.login-brand__visual::before {
  content: '';
  position: absolute;
  inset: 6% 2% 8%;
  border-radius: 48% 52% 50% 50%;
  background:
    radial-gradient(
      circle at 50% 48%,
      color-mix(in srgb, var(--dp-surface) 88%, transparent) 0%,
      color-mix(in srgb, var(--dp-blue-100) 55%, transparent) 42%,
      transparent 72%
    );
  filter: blur(8px);
  pointer-events: none;
}

.login-brand__visual-image {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center center;
  filter: drop-shadow(0 18px 34px color-mix(in srgb, var(--dp-color-primary) 16%, transparent));
}

.login-panel {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-self: center;
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--dp-color-primary-border) 42%, transparent);
  border-radius: calc(var(--dp-radius-panel) + 2px);
  background: var(--login-surface);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 16px 40px color-mix(in srgb, var(--dp-color-primary) 9%, transparent);
  overflow: hidden;
}

.login-panel__header {
  margin: 0;
  padding: var(--dp-space-block) var(--dp-space-block) var(--dp-space-component);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.login-panel__eyebrow {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-type-hint-size);
  font-weight: var(--dp-font-weight-title);
  letter-spacing: 0.08em;
  color: var(--login-accent);
}

.login-panel__title {
  margin: 0;
  font-size: clamp(22px, 2.2vw, 28px);
  line-height: 1.2;
  font-weight: var(--dp-font-weight-title);
  letter-spacing: -0.02em;
  color: var(--login-text);
  text-wrap: balance;
}

.login-panel__subtitle {
  margin: var(--dp-space-component-tight) 0 0;
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
  color: var(--login-muted);
}

.login-panel__surface {
  margin-top: 0;
  padding: var(--dp-space-component) var(--dp-space-block) var(--dp-space-block);
  border-top: 1px solid color-mix(in srgb, var(--dp-border-subtle) 80%, transparent);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.login-body {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
}

.login-tab-content {
  margin-top: var(--dp-space-component-xs);

  :deep(.ui-radio-group :where(.ant-radio-group)) {
    gap: 3px;
    padding: 3px;
    border-color: var(--dp-border-subtle);
    background: var(--dp-fill-quaternary);
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper) {
    min-height: 34px;
    padding: 0 var(--dp-space-component);
    font-size: var(--dp-font-size-sm);
    font-weight: var(--dp-font-weight-emphasis);
    line-height: 34px;
    color: var(--dp-text-secondary);
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)) {
    background: var(--dp-surface);
    color: var(--dp-text-primary);
    box-shadow: var(--dp-shadow-sm);
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper:hover:not(.ant-radio-button-wrapper-disabled)) {
    color: var(--dp-text-primary);
  }

  :deep(.ant-form-item) {
    margin-bottom: var(--dp-space-block);
  }

  :deep(.ui-radio-group) {
    width: 100%;
  }

  :deep(.ui-input__control),
  :deep(.ui-password-input__control),
  :deep(.school-autocomplete__input .ant-select-selector) {
    border-radius: var(--dp-radius-control);
  }

  :deep(.ui-button--size-lg),
  :deep(.dp-btn--lg) {
    min-height: 48px;
    border-radius: var(--dp-radius-control);
    font-weight: var(--dp-font-weight-title);
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
  margin: var(--dp-space-component-tight) auto 0;
}

.login-footer__copy {
  margin: 0;
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-muted);
}

@media (max-width: 1180px) {
  .login-stage {
    display: block;
    overflow: auto;
  }

  .login-brand {
    min-height: auto;
    overflow: visible;
  }

  .login-brand__top {
    position: relative;
    top: auto;
    left: auto;
    margin-bottom: var(--dp-space-block);
  }

  .login-brand__layout {
    width: 100%;
    gap: var(--dp-space-page);
  }

  .login-brand__content-row {
    grid-template-columns: 1fr;
    gap: var(--dp-space-page);
    flex: none;
  }

  .login-brand__capability-column,
  .login-brand__hero,
  .login-brand__visual {
    flex: none;
  }

  .login-brand__visual {
    width: 100%;
    max-width: none;
    height: min(520px, 58vh);
    margin: 0 auto;
  }

  .login-brand__visual-image {
    width: 100%;
    height: 100%;
  }
}

@media (max-width: bp.$layout-mobile-max) {
  .login-page {
    height: auto;
    min-height: 100vh;
    padding: var(--dp-space-block) var(--dp-space-page);
    overflow: visible;
  }

  .login-stage {
    min-height: auto;
  }

  .login-brand__content-row {
    gap: var(--dp-space-block);
  }

  .login-brand__visual {
    height: min(320px, 42vh);
  }

  .login-brand__visual-image {
    object-fit: contain;
  }

  .login-panel__header {
    padding: var(--dp-space-block);
  }

  .login-panel__title {
    font-size: var(--dp-font-size-3xl);
  }

  .login-panel__surface {
    padding: var(--dp-space-block);
  }

  .login-footer {
    justify-content: flex-start;
  }
}
</style>
