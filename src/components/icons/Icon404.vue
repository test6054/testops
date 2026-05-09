<template>
  <svg
    class="error-illustration error-illustration--404"
    viewBox="0 0 520 360"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <ellipse class="shadow" cx="260" cy="304" rx="176" ry="22" />

    <circle class="orb orb--left" cx="102" cy="88" r="34" />
    <circle class="orb orb--right" cx="408" cy="110" r="46" />

    <g class="scene">
      <rect class="panel" x="112" y="58" width="296" height="188" rx="26" />
      <path
        class="panel-fold"
        d="M347 58h35c14 0 26 12 26 26v35l-61-61Z"
      />
      <rect class="panel-line" x="144" y="92" width="114" height="12" rx="6" />
      <rect class="panel-line panel-line--muted" x="144" y="118" width="78" height="12" rx="6" />

      <circle class="search-ring" cx="230" cy="166" r="46" />
      <circle class="search-core" cx="230" cy="166" r="26" />
      <path class="search-handle" d="M260 196l36 36" />

      <path
        class="broken"
        d="M324 146c18 0 33 15 33 33s-15 33-33 33c-10 0-18-4-24-11l13-13c3 3 7 5 11 5a14 14 0 0 0 0-28c-4 0-8 2-11 5l-13-13c6-7 14-11 24-11Z"
      />
      <path class="broken broken--muted" d="M286 201l-18 18" />
      <path class="broken broken--muted" d="M303 184l-18 18" />
    </g>

    <g class="card card--left">
      <rect class="mini" x="82" y="218" width="72" height="50" rx="16" />
      <path class="mini-line" d="M100 234h36" />
      <path class="mini-line mini-line--short" d="M100 248h24" />
    </g>

    <g class="card card--right">
      <rect class="mini" x="384" y="208" width="58" height="58" rx="18" />
      <path class="mini-cross" d="M402 226l22 22" />
      <path class="mini-cross" d="M424 226l-22 22" />
    </g>

    <text class="code" x="260" y="350" text-anchor="middle">404</text>
  </svg>
</template>

<script lang="ts" setup>
defineOptions({ name: 'Icon404' })
</script>

<style lang="scss" scoped>
.error-illustration {
  width: 100%;
  height: 100%;

  .shadow {
    fill: var(--ant-color-fill-secondary);
  }

  .orb {
    fill: var(--ant-color-success-bg);
    opacity: 0.75;

    &--right {
      fill: var(--ant-color-primary-bg);
    }
  }

  .panel {
    fill: var(--ant-color-bg-container);
    stroke: var(--ant-color-border-secondary);
    stroke-width: 2;
  }

  .panel-fold {
    fill: var(--ant-color-fill-tertiary);
  }

  .panel-line {
    fill: var(--ant-color-primary-border);

    &--muted {
      fill: var(--ant-color-fill-secondary);
    }
  }

  .search-ring {
    fill: var(--ant-color-primary);
  }

  .search-core {
    fill: var(--ant-color-primary-bg);
  }

  .search-handle {
    fill: none;
    stroke: var(--ant-color-primary);
    stroke-linecap: round;
    stroke-width: 12;
  }

  .broken {
    fill: var(--ant-color-warning);

    &--muted {
      fill: none;
      stroke: var(--ant-color-error);
      stroke-linecap: round;
      stroke-width: 8;
    }
  }

  .mini {
    fill: var(--ant-color-bg-container);
    stroke: var(--ant-color-border-secondary);
    stroke-width: 2;
  }

  .mini-line,
  .mini-cross {
    fill: none;
    stroke: var(--ant-color-text-secondary);
    stroke-linecap: round;
    stroke-width: 5;
  }

  .mini-line--short {
    stroke: var(--ant-color-primary);
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
