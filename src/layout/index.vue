<template>
  <!-- 管理员端使用左侧侧边栏布局，教师/学生端使用顶部导航布局 -->
  <LayoutDefault v-if="isAdminRoute"></LayoutDefault>
  <LayoutMix v-else-if="appStore.layout === 'mix'"></LayoutMix>
  <LayoutDefault v-else></LayoutDefault>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import {useAppStore} from '@/stores'
import LayoutDefault from './LayoutDefault.vue'
import LayoutMix from './LayoutMix.vue'

defineOptions({name: 'Layout'})
const appStore = useAppStore()
const route = useRoute()

/**
 * 判断是否为管理员路由
 * 管理员路由强制使用左侧侧边栏布局
 */
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
</script>

<style lang="scss" scoped></style>
