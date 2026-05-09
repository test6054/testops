<template>
  <ErrorPage :code="404" />
</template>

<script lang="ts" setup>
import ErrorPage from './components/ErrorPage.vue'

defineOptions({ name: 'Error404' })
</script>

<style lang="scss" scoped></style>
