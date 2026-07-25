<template>
  <div class="auth-layout" :class="{ 'auth-layout--wide': wide }">
    <!-- 左侧品牌面板 -->
    <aside class="auth-brand">
      <div class="auth-brand__mark">
        <slot name="brand-mark">
          <img src="/logo.svg" alt="实训坊" class="auth-brand__logo" />
          <div class="auth-brand__mark-text">
            <div class="auth-brand__product">实训坊</div>
            <div class="auth-brand__product-sub">EDU PRACTICE WEB</div>
          </div>
        </slot>
      </div>

      <div class="auth-brand__hero">
        <slot name="brand-header">
          <h1 class="auth-brand__title">工科产教融合 AI 实训平台</h1>
          <p class="auth-brand__subtitle">
            服务课程实训、毕业设计、校企项目与阶段答辩等高校教学场景。
          </p>
        </slot>
      </div>

      <div class="auth-brand__capability-cloud">
        <slot name="brand-content">
          <div class="auth-brand__capabilities">
            <div class="auth-brand__capability">课程组织与任务推进</div>
            <div class="auth-brand__capability">AI 评测与答辩收口</div>
            <div class="auth-brand__capability">达成度分析</div>
            <div class="auth-brand__capability">教学留痕</div>
            <div class="auth-brand__capability">OBE 达成</div>
            <div class="auth-brand__capability">校企项目实训</div>
          </div>
        </slot>
      </div>

      <div class="auth-brand__meta">
        <slot name="brand-footer">
          <div class="auth-brand__tags">
            <span class="brand-tag brand-tag--blue">新工科</span>
            <span class="brand-tag brand-tag--green">OBE达成</span>
            <span class="brand-tag brand-tag--purple">AI赋能</span>
          </div>
        </slot>
      </div>
    </aside>

    <!-- 右侧内容面板 -->
    <main class="auth-main">
      <div class="auth-main__inner">
        <slot />
      </div>
      <footer v-if="showFooter" class="auth-footer">
        <slot name="footer">
          {{ copyright }} ·
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">京ICP备13021011号</a>
        </slot>
      </footer>
    </main>

    <!-- 移动端顶栏（< 860px 显示） -->
    <div class="auth-mobile-bar">
      <img src="/logo.svg" alt="logo" class="auth-mobile-bar__logo" />
      <span class="auth-mobile-bar__title">实训坊</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useAppStore } from '@/stores'

defineOptions({ name: 'AuthLayout' })

withDefaults(
  defineProps<{
    showFooter?: boolean
    wide?: boolean
  }>(),
  {
    showFooter: true,
    wide: false,
  },
)

const appStore = useAppStore()
const copyright = computed(() => appStore.getCopyright())
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.auth-layout {
  display: flex;
  min-height: 100vh;
  position: relative;
  background: var(--dp-surface);
}

.auth-brand {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.auth-brand__mark {
  position: absolute;
  top: 42px;
  left: 48px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-block);
}

.auth-brand__logo {
  width: 32px;
  height: 32px;
  filter: none;
}

.auth-brand__mark-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.auth-brand__product {
  font-size: var(--dp-font-size-2xl);
  line-height: 1.1;
  font-weight: 700;
  color: var(--dp-text-primary);
}

.auth-brand__product-sub {
  font-size: var(--dp-font-size-xxs);
  font-weight: 700;
  letter-spacing: 0.14em;
  color: color-mix(in srgb, var(--dp-gray-600) 58%, transparent);
}

.auth-brand__hero {
  display: none;
}

.auth-brand__capability-cloud {
  position: absolute;
  left: 50%;
  bottom: 74px;
  z-index: 2;
  width: min(960px, calc(100vw - 96px));
  transform: translateX(-50%);
}

.auth-brand__capabilities {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--dp-space-component);
  margin: 0;
}

.auth-brand__capability {
  display: inline-flex;
  align-items: center;
  min-height: var(--dp-control-height-md, 36px);
  padding: 0 var(--dp-space-block);
  border-radius: var(--dp-radius-full);
  font-size: var(--dp-font-size-xs);
  line-height: 1;
  font-weight: 700;
  color: var(--dp-text-secondary);
  background: color-mix(in srgb, var(--dp-blue-50) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--dp-blue-200) 90%, transparent);
  box-shadow: none;
}

.auth-brand__meta {
  display: none;
}

.auth-brand__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--dp-space-component);
}

.brand-tag {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 var(--dp-space-block);
  border-radius: var(--dp-radius-full);
  font-size: var(--dp-font-size-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--dp-blue-50) 96%, transparent);
  background: color-mix(in srgb, var(--dp-surface) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--dp-surface) 12%, transparent);
}

.brand-tag--blue {
  background: color-mix(in srgb, var(--dp-blue-200) 14%, transparent);
}

.brand-tag--green {
  background: color-mix(in srgb, var(--dp-green-200) 12%, transparent);
}

.brand-tag--purple {
  background: color-mix(in srgb, var(--dp-purple-200) 12%, transparent);
}

// ─── 右侧内容面板 ───
.auth-main {
  flex: 1;
  min-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--dp-space-section-loose) var(--dp-space-section) var(--dp-space-section-loose);
  position: relative;
  overflow-y: auto;
  background: var(--dp-surface);

  .auth-layout--wide & {
    min-width: 100%;
  }
}

.auth-main__inner {
  width: 100%;
  max-width: 400px;
}

.auth-footer {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);

  a {
    color: inherit;
    text-decoration: none;

    &:hover {
      color: var(--dp-text-secondary);
    }
  }
}

@media (max-width: bp.$shell-laptop-max) {
  .auth-brand__capabilities {
    gap: var(--dp-space-component);
  }
}

// ─── 移动端顶栏 ───
.auth-mobile-bar {
  display: none;
}

// ─── 响应式：< 860px ───
@media (max-width: 860px) {
  .auth-layout {
    flex-direction: column;
  }

  .auth-brand {
    position: static;
    inset: auto;
  }

  .auth-mobile-bar {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component);
    padding: var(--dp-space-block);
    background: var(--dp-color-primary);
    color: var(--dp-text-inverse);
  }

  .auth-mobile-bar__logo {
    width: 28px;
    height: 28px;
    filter: brightness(0) invert(1);
  }

  .auth-mobile-bar__title {
    font-size: 17px;
    font-weight: 700;
  }

  .auth-main {
    flex: 1;
    min-width: auto;
    padding: var(--dp-space-section) var(--dp-space-block) var(--dp-space-section-loose);
    justify-content: flex-start;
  }

  .auth-main__inner {
    max-width: 100%;
  }

  .auth-brand__mark {
    display: none;
  }

  .auth-brand__capability-cloud {
    bottom: 74px;
    width: calc(100vw - 32px);
  }

  .auth-brand__capabilities {
    gap: var(--dp-space-component) var(--dp-space-component-tight);
  }

  .auth-brand__capability {
    min-height: 32px;
    padding: 0 var(--dp-space-component);
    font-size: var(--dp-font-size-xxs);
  }

  .auth-footer {
    position: relative;
    bottom: auto;
    margin-top: var(--dp-space-component);
  }
}
</style>
