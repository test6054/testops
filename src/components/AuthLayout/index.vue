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
  background: #fff;
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
  gap: 14px;
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
  font-size: 23px;
  line-height: 1;
  font-weight: 800;
  color: #23426f;
}

.auth-brand__product-sub {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgba(35, 66, 111, 0.58);
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
  gap: 12px 10px;
  margin: 0;
}

.auth-brand__capability {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  color: #4e6487;
  background: rgba(239, 244, 251, 0.92);
  border: 1px solid rgba(188, 202, 223, 0.9);
  box-shadow: none;
}

.auth-brand__meta {
  display: none;
}

.auth-brand__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.brand-tag {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(242, 247, 255, 0.96);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.brand-tag--blue {
  background: rgba(213, 233, 255, 0.14);
}

.brand-tag--green {
  background: rgba(213, 246, 229, 0.12);
}

.brand-tag--purple {
  background: rgba(226, 222, 255, 0.12);
}

// ─── 右侧内容面板 ───
.auth-main {
  flex: 1;
  min-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 72px 40px 132px;
  position: relative;
  overflow-y: auto;
  background: #fff;

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
  font-size: 12px;
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
    gap: 12px 10px;
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
    gap: 10px;
    padding: 14px 20px;
    background: #1e3a5f;
    color: #fff;
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
    padding: 88px 24px 132px;
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
    gap: 10px 8px;
  }

  .auth-brand__capability {
    min-height: 32px;
    padding: 0 12px;
    font-size: 11px;
  }

  .auth-footer {
    position: relative;
    bottom: auto;
    margin-top: 32px;
  }
}
</style>
