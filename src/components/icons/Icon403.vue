<template>
  <svg
    class="error-illustration error-illustration--403"
    viewBox="0 0 520 360"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <ellipse class="shadow" cx="260" cy="300" rx="170" ry="22" />

    <circle class="orb orb--left" cx="120" cy="96" r="44" />
    <circle class="orb orb--right" cx="410" cy="82" r="32" />

    <g class="panel-group">
      <rect class="panel" x="95" y="62" width="330" height="182" rx="24" />
      <rect class="panel-header" x="95" y="62" width="330" height="34" rx="24" />
      <circle class="panel-dot" cx="124" cy="79" r="5" />
      <circle class="panel-dot panel-dot--muted" cx="142" cy="79" r="5" />
      <circle class="panel-dot panel-dot--muted" cx="160" cy="79" r="5" />

      <rect class="panel-card" x="124" y="116" width="128" height="94" rx="18" />
      <rect class="panel-line" x="282" y="126" width="102" height="12" rx="6" />
      <rect class="panel-line panel-line--short" x="282" y="152" width="72" height="12" rx="6" />
      <rect class="panel-line panel-line--muted" x="282" y="178" width="92" height="12" rx="6" />

      <path
        class="shield"
        d="M259 110 198 136v48c0 44 29 76 61 91 32-15 61-47 61-91v-48l-61-26Z"
      />
      <path
        class="shield-inner"
        d="M259 126 213 145v37c0 32 20 57 46 71 26-14 46-39 46-71v-37l-46-19Z"
      />
      <rect class="lock-body" x="238" y="169" width="42" height="34" rx="10" />
      <path class="lock-shackle" d="M246 169v-11c0-9 6-16 13-16s13 7 13 16v11" />

      <circle class="badge" cx="350" cy="112" r="28" />
      <path class="badge-line" d="M339 101l22 22" />
      <path class="badge-line" d="M361 101l-22 22" />
    </g>

    <g class="floating floating--left">
      <rect class="floating-card" x="70" y="226" width="66" height="42" rx="14" />
      <path class="floating-wave" d="M85 248c10-10 26-10 36 0" />
    </g>

    <g class="floating floating--right">
      <rect class="floating-card" x="395" y="214" width="56" height="56" rx="18" />
      <path class="floating-star" d="M423 228l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" />
    </g>

    <text class="code" x="260" y="350" text-anchor="middle">403</text>
  </svg>
</template>

<script lang="ts" setup>
defineOptions({ name: 'Icon403' })
</script>

<style lang="scss" scoped>
.error-illustration {
  width: 100%;
  height: 100%;

  .shadow {
    fill: var(--ant-color-fill-secondary);
  }

  .orb {
    fill: var(--ant-color-primary-bg);
    opacity: 0.8;

    &--right {
      fill: var(--ant-color-warning-bg);
    }
  }

  .panel {
    fill: var(--ant-color-bg-container);
    stroke: var(--ant-color-border-secondary);
    stroke-width: 2;
  }

  .panel-header {
    fill: var(--ant-color-fill-quaternary);
  }

  .panel-dot {
    fill: var(--ant-color-primary);

    &--muted {
      fill: var(--ant-color-text-quaternary);
    }
  }

  .panel-card {
    fill: var(--ant-color-fill-tertiary);
  }

  .panel-line {
    fill: var(--ant-color-primary-border);

    &--short {
      fill: var(--ant-color-warning);
      opacity: 0.5;
    }

    &--muted {
      fill: var(--ant-color-fill-secondary);
    }
  }

  .shield {
    fill: var(--ant-color-primary);
  }

  .shield-inner {
    fill: var(--ant-color-primary-bg);
  }

  .lock-body {
    fill: var(--ant-color-bg-container);
  }

  .lock-shackle {
    fill: none;
    stroke: var(--ant-color-bg-container);
    stroke-linecap: round;
    stroke-width: 8;
  }

  .badge {
    fill: var(--ant-color-error);
  }

  .badge-line {
    fill: none;
    stroke: var(--ant-color-text-light-solid);
    stroke-linecap: round;
    stroke-width: 6;
  }

  .floating-card {
    fill: var(--ant-color-bg-container);
    stroke: var(--ant-color-border-secondary);
    stroke-width: 2;
  }

  .floating-wave {
    fill: none;
    stroke: var(--ant-color-primary);
    stroke-linecap: round;
    stroke-width: 5;
  }

  .floating-star {
    fill: var(--ant-color-warning);
  }

  .code {
    fill: var(--ant-color-text-tertiary);
    font-family: var(--dp-font-family);
    font-size: 72px;
    font-weight: 700;
    letter-spacing: 8px;
  }
}
</style>
