<template>
  <div class="login pc">
    <h3 class="login-logo">
      <img v-if="logo" :src="logo" alt="logo" />
      <img v-else alt="logo" src="/logo.svg" />
      <span>{{ title }}</span>
    </h3>

    <a-flex align="stretch" class="login-box">
      <div class="login-right">
        <a-tabs class="login-right__form">
          <template #rightExtra>
            <span style="color: red">密码已过期，请修改密码</span>
          </template>
          <a-tab-pane key="1" tab="密码修改">
            <ModifyPassword />
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-flex>

    <div v-if="isDesktop" class="footer">
      <div class="icp-info">
        <div class="below text">
          {{ appStore.getCopyright()
          }}{{
            appStore.getForRecord()
              ? ` ·
                    ${appStore.getForRecord()}`
              : ''
          }}
        </div>
      </div>
    </div>

    <Background />
  </div>
  <div class="login h5">
    <div class="login-logo">
      <img v-if="logo" :src="logo" alt="logo" />
      <img v-else alt="logo" src="/logo.svg" />
      <span>{{ title }}</span>
    </div>
    <div class="login-box">
      <div class="login-right">
        <a-tabs class="login-right__form">
          <template #rightExtra>
            <span style="color: red">密码已过期，请修改密码</span>
          </template>
          <a-tab-pane key="1" tab="密码修改">
            <ModifyPassword />
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useDevice } from '@/hooks'
import { useAppStore } from '@/stores'
import Background from '../components/background/index.vue'
import ModifyPassword from '../components/modifyPassword/index.vue'

defineOptions({ name: 'PwdExpired' })

const { isDesktop } = useDevice()
const appStore = useAppStore()
const title = computed(() => appStore.getTitle())
const logo = computed(() => appStore.getLogo())
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
@media screen and (max-width: 570px) {
  .pc {
    display: none !important;
    background-color: white !important;
  }

  .login {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: center;
    background-color: var(--ant-color-fill-secondary);
    color: var(--ant-color-text);

    &-logo {
      width: 100%;
      height: 104px;
      font-weight: 700;
      font-size: 20px;
      line-height: 32px;
      display: flex;
      padding: 0 20px;
      align-items: center;
      justify-content: start;
      // background-image: url('@/assets/images/login_h5.jpg');
      background-color: var(--ant-color-primary); // 采用纯色背景替代原有的占位图
      color: var(--ant-color-bg-container);
      background-size: 100% 100%;
      box-sizing: border-box;

      img {
        width: 34px;
        height: 34px;
        margin-right: 8px;
      }
    }

    &-box {
      width: 100%;
      display: flex;
      z-index: 999;
    }
  }

  .login-right {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 30px 30px 0;
    box-sizing: border-box;

    &__title {
      color: var(--ant-color-text);
      font-weight: 500;
      font-size: 20px;
      line-height: 32px;
      margin-bottom: 20px;
    }

    &__form {
      :deep(.ant-tabs-nav-list) {
        display: flex;
        justify-content: start;
        align-items: center;
      }

      :deep(.ant-tabs-tab) {
        color: var(--ant-color-text-secondary);
        margin: 0 20px 0 0;
      }

      :deep(.ant-tabs-tab-btn) {
        font-size: 16px;
        font-weight: 500;
        line-height: 22px;
      }

      :deep(.ant-tabs-content-holder) {
        margin-top: 10px;
      }

      :deep(.ant-tabs-tab-active),
      :deep(.ant-tabs-tab-btn:hover) {
        color: var(--ant-color-primary);
      }

      :deep(.ant-tabs-nav::before) {
        display: none;
      }

      :deep(.ant-tabs-tab-btn::before) {
        display: none;
      }
    }
  }

  .theme-btn {
    position: fixed;
    top: 20px;
    right: 30px;
    z-index: 999;
  }

  // 新增弹窗层级设置
  .ant-modal-wrap {
    z-index: 1000;
  }

  .footer {
    align-items: center;
    box-sizing: border-box;
    position: absolute;
    bottom: 10px;
    z-index: 999;

    .icp-info {
      .text {
        font-size: 12px;
        font-weight: 400;
        letter-spacing: 0.2px;
        line-height: 20px;
        text-align: center;
      }

      .below {
        align-items: center;
        display: flex;
      }
    }
  }
}

@media screen and (min-width: bp.$ant-grid-md) {
  .h5 {
    display: none !important;
  }

  .login {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: var(--ant-color-fill-secondary);

    &-logo {
      position: fixed;
      top: 20px;
      left: 30px;
      z-index: 9999;
      color: var(--ant-color-text);
      font-weight: 500;
      font-size: 20px;
      line-height: 32px;
      margin-bottom: 20px;
      display: flex;
      justify-content: center;
      align-items: center;

      img {
        width: 34px;
        height: 34px;
        margin-right: 8px;
      }
    }

    &-box {
      width: 400px; // 原来有 login-left 的时候宽度较大，现在调整为登录框本身的宽度
      max-width: 90vw;
      display: flex;
      z-index: 999;
      box-shadow: var(--dp-shadow-card);
      border-radius: var(--dp-radius-panel);
      overflow: hidden;
    }
  }

  .login-right {
    flex: 11;
    min-width: 0;
    height: 100%;
    background: var(--ant-color-bg-container);
    display: flex;
    flex-direction: column;
    padding: 30px 30px 0;
    box-sizing: border-box;

    &__title {
      color: var(--ant-color-text);
      font-weight: 500;
      font-size: 20px;
      line-height: 32px;
      margin-bottom: 20px;
    }

    &__form {
      :deep(.ant-tabs-nav-list) {
        display: flex;
        // justify-content: center;
        align-items: center;
      }

      :deep(.ant-tabs-tab) {
        color: var(--ant-color-text-secondary);
      }

      :deep(.ant-tabs-tab-btn) {
        font-size: 16px;
        font-weight: 500;
        line-height: 22px;
      }

      :deep(.ant-tabs-content-holder) {
        margin-top: 10px;
      }

      :deep(.ant-tabs-tab-active),
      :deep(.ant-tabs-tab-btn:hover) {
        color: var(--ant-color-primary);
      }

      :deep(.ant-tabs-nav::before) {
        display: none;
      }

      :deep(.ant-tabs-tab-btn::before) {
        display: none;
      }
    }

    &__oauth {
      margin-top: auto;
      margin-bottom: 20px;

      :deep(.ant-divider-inner-text) {
        color: var(--ant-color-text-quaternary);
        font-size: 12px;
        font-weight: 400;
        line-height: 20px;
      }

      .list {
        align-items: center;
        display: flex;
        justify-content: center;
        width: 100%;

        .item {
          margin-right: 15px;
        }

        .mode {
          color: var(--ant-color-text-secondary);
          font-size: 12px;
          font-weight: 400;
          line-height: 20px;
          padding: 6px 10px;
          align-items: center;
          border: 1px solid var(--ant-color-split);
          border-radius: var(--dp-radius-full);
          box-sizing: border-box;
          display: flex;
          height: 32px;
          justify-content: center;
          cursor: pointer;

          .icon {
            width: 21px;
            height: 20px;
          }
        }

        .mode svg {
          font-size: 16px;
          margin-right: 10px;
        }

        .mode:hover,
        .mode svg:hover {
          background: var(--ant-color-primary-bg);
          border: 1px solid var(--ant-color-primary-border);
          color: var(--ant-color-primary);
        }
      }
    }
  }

  .theme-btn {
    position: fixed;
    top: 20px;
    right: 30px;
    z-index: 999;
  }

  // 新增弹窗层级设置
  .ant-modal-wrap {
    z-index: 1000;
  }

  .footer {
    align-items: center;
    box-sizing: border-box;
    position: absolute;
    bottom: 10px;
    z-index: 999;

    .icp-info {
      .text {
        font-size: 12px;
        font-weight: 400;
        letter-spacing: 0.2px;
        line-height: 20px;
        text-align: center;
      }

      .below {
        align-items: center;
        display: flex;
      }
    }
  }
}
</style>
