<template>
  <div class="login-bg">
    <div class="fly bg-fly-circle1"></div>
    <div class="fly bg-fly-circle2"></div>
    <div class="fly bg-fly-circle3"></div>
    <div class="fly bg-fly-circle4"></div>
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
}

.fly {
  pointer-events: none;
  position: fixed;
  z-index: 9999;
}

.bg-fly-circle1 {
  left: 40px;
  top: 100px;
  width: 100px;
  height: 100px;
  border-radius: var(--dp-radius-full);
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--ant-color-primary) 7%, transparent) 0%,
    color-mix(in srgb, var(--ant-color-primary) 4%, transparent) 100%
  );
}

.bg-fly-circle2 {
  left: 15%;
  bottom: 5%;
  width: 150px;
  height: 150px;
  border-radius: var(--dp-radius-full);
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--ant-color-primary) 8%, transparent) 0%,
    color-mix(in srgb, var(--ant-color-primary) 4%, transparent) 100%
  );
}

.bg-fly-circle3 {
  right: 12%;
  top: 90px;
  width: 145px;
  height: 145px;
  border-radius: var(--dp-radius-full);
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--ant-color-primary) 10%, transparent) 0%,
    color-mix(in srgb, var(--ant-color-primary) 4%, transparent) 100%
  );
}

.bg-fly-circle4 {
  right: 5%;
  top: 60%;
  width: 160px;
  height: 160px;
  border-radius: var(--dp-radius-full);
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--ant-color-primary) 2%, transparent) 0%,
    color-mix(in srgb, var(--ant-color-primary) 4%, transparent) 100%
  );
}
</style>
