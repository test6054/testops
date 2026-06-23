<template>
  <div class="error-page">
    <section class="error__container">
      <div class="error__img">
        <component :is="IconMap[props.code]" class="error__icon"></component>
      </div>

      <div class="error__tip">
        <div class="error__tip--a">抱歉!</div>
        <div class="error__tip--b">当前页面不存在...</div>
        <div class="error__tip--c">请检查网址是否正确，或点击下方按钮返回工作台</div>
        <a-button shape="round" size="large" type="primary" @click="back">{{ backLabel }}</a-button>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import type { Component } from 'vue'
import { computed } from 'vue'
import Icon403 from '@/components/icons/Icon403.vue'
import Icon404 from '@/components/icons/Icon404.vue'
import { useAuthStore } from '@/stores'
import { RoleEnum } from '@/utils/permission'

defineOptions({ name: 'ErrorPage' })

const props = withDefaults(defineProps<Props>(), {
  code: 403,
})

interface Props {
  code?: number
}

const IconMap: Record<number, Component> = {
  403: Icon403,
  404: Icon404,
}

const router = useRouter()
const authStore = useAuthStore()

/** 按登录角色回到阅卷端默认工作台，避免未登录用户落到根路径 */
function resolveHomePath(): string {
  const role = authStore.userRole
  if (role === RoleEnum.SCH_STU) {
    return '/student/score'
  }
  if (role === RoleEnum.SUPER_ADMIN) {
    return '/teacher/dashboard'
  }
  if (
    role === RoleEnum.SCH_TECH
    || role === RoleEnum.CROP_ADMIN
    || role === RoleEnum.CROP_USER
  ) {
    return '/teacher/exam-list'
  }
  return '/login'
}

const backLabel = computed(() => {
  const role = authStore.userRole
  if (role === RoleEnum.SCH_STU) {
    return '返回我的成绩'
  }
  if (role === RoleEnum.SUPER_ADMIN) {
    return '返回教学质量中心'
  }
  if (
    role === RoleEnum.SCH_TECH
    || role === RoleEnum.CROP_ADMIN
    || role === RoleEnum.CROP_USER
  ) {
    return '返回考试工作台'
  }
  return '返回登录'
})

function back() {
  router.replace({ path: resolveHomePath() })
}
</script>

<style lang="scss" scoped>
.error-page {
  width: 100%;
  height: 100%;
  background: var(--ant-color-bg-container);
  display: flex;
  justify-content: center;
  align-items: center;
}

.error {
  &__container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__img {
    width: 100%;
    position: relative;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  &__icon {
    max-width: 90%;
    height: 50vh;
  }

  &__tip {
    display: flex;
    flex-direction: column;
    align-items: center;

    &--a {
      margin-top: var(--dp-space-6);
      font-size: var(--dp-font-size-3xl);
      font-weight: var(--dp-font-weight-title);
      color: var(--ant-color-text);
    }

    &--b {
      margin-top: var(--dp-space-4);
      font-size: var(--dp-font-size-xl);
      color: var(--ant-color-text-secondary);
    }

    &--c {
      margin-top: var(--dp-space-2);
      margin-bottom: var(--dp-space-6);
      font-size: var(--dp-font-size-md);
      color: var(--ant-color-text-tertiary);
    }
  }
}
</style>
