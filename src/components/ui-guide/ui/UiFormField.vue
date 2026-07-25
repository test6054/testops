<template>
  <div
    class="ui-form-field"
    :class="{
      'ui-form-field--error': !!error,
      'ui-form-field--required': required,
    }"
  >
    <label v-if="label" class="ui-form-field__label" :for="forId">
      <span>{{ label }}</span>
      <span v-if="required" class="ui-form-field__required">*</span>
    </label>
    <div class="ui-form-field__control">
      <slot />
    </div>
    <p v-if="help && !error" class="ui-form-field__help">{{ help }}</p>
    <p v-if="error" class="ui-form-field__error">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiFormField' })

withDefaults(defineProps<{
  label?: string
  required?: boolean
  help?: string
  error?: string
  forId?: string
}>(), {
  label: '',
  required: false,
  help: '',
  error: '',
  forId: undefined,
})
</script>

<style scoped>
.ui-form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ui-form-field__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.ui-form-field__required {
  color: var(--dp-red-500);
}

.ui-form-field__control {
  width: 100%;
}

.ui-form-field--error .ui-form-field__label {
  color: var(--dp-red-500);
}

.ui-form-field__help,
.ui-form-field__error {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
}

.ui-form-field__help {
  color: var(--dp-text-muted);
}

.ui-form-field__error {
  color: var(--dp-red-500);
}
</style>
