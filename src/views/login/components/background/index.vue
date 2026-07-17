<template>
  <div class="login-bg" aria-hidden="true">
    <div class="login-bg__orb login-bg__orb--a"></div>
    <div class="login-bg__orb login-bg__orb--b"></div>
    <div class="login-bg__orb login-bg__orb--c"></div>
  </div>
</template>

<script lang="ts" setup></script>

<style lang="scss" scoped>
.login-bg {
  width: 100%;
  height: 100%;
  position: fixed;
  overflow: hidden;
  z-index: 1;
  pointer-events: none;
}

.login-bg__orb {
  position: fixed;
  border-radius: var(--dp-radius-full);
  z-index: 1;
}

.login-bg__orb--a {
  left: 40px;
  top: 100px;
  width: 120px;
  height: 120px;
  background: color-mix(in srgb, var(--dp-color-primary) 8%, transparent);
}

.login-bg__orb--b {
  left: 14%;
  bottom: 6%;
  width: 160px;
  height: 160px;
  background: color-mix(in srgb, var(--dp-color-primary) 6%, transparent);
}

.login-bg__orb--c {
  right: 8%;
  top: 18%;
  width: 140px;
  height: 140px;
  background: color-mix(in srgb, var(--dp-color-primary) 5%, transparent);
}
</style>
