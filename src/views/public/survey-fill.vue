<template>
  <component :is="activeComponent" />
</template>

<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import SurveyFillDesktop from './survey-fill-desktop.vue'
import SurveyFillMobile from './survey-fill-mobile.vue'

function isMobileDevice(): boolean {
  const ua = navigator.userAgent || ''
  const mobileRe = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS/i
  if (mobileRe.test(ua)) return true
  if ('ontouchstart' in window && window.innerWidth <= 820) return true
  return false
}

const activeComponent = shallowRef(SurveyFillDesktop)

onMounted(() => {
  activeComponent.value = isMobileDevice() ? SurveyFillMobile : SurveyFillDesktop
})
</script>
