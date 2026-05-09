<template>
  <ErrorPage :code="403" />
</template>

<script lang="ts" setup>
import ErrorPage from './components/ErrorPage.vue'

defineOptions({ name: 'Error403' })
</script>

<style lang="scss" scoped></style>
