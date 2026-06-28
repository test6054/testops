import antfu from '@antfu/eslint-config'

// https://github.com/antfu/eslint-config
export default antfu(
  {
    vue: {
      overrides: {
        'vue/block-order': ['error', {
          order: [['script', 'template'], 'style'],
        }],
        'vue/define-macros-order': ['error', {
          order: ['defineOptions', 'defineModel', 'defineProps', 'defineEmits', 'defineSlots'],
          defineExposeLast: true,
        }],
        'vue/singleline-html-element-content-newline': 'off',
        'vue/html-self-closing': ['off', {
          html: {
            void: 'never',
            normal: 'always',
            component: 'never',
          },
        }],
        'vue/custom-event-name-casing': ['error', 'kebab-case'],
        'vue/no-unused-refs': 'warn',
        'vue/component-name-in-template-casing': 'off',
        'vue/attributes-order': 'off',
      },
    },
    typescript: true,
    ignores: [
      '**/*.md',
      '.github',
      'dist',
      'node_modules',
    ],
  },
  {
    files: [
      'src/views/**/*.{vue,ts}',
      'src/components/**/*.{vue,ts}',
      'src/apis/**/*.{vue,ts}',
    ],
    ignores: [
      'src/views/**/scanner-kiosk/**',
      'src/apis/platform/file.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@/apis/edu/file-management',
          importNames: ['uploadFile'],
          message: '业务页请使用 platform/file 或 UiPlatformFileField，禁止 uploadFile。',
        }],
      }],
      'vue/no-restricted-component-names': ['error',
        { name: 'a-upload', message: '请使用 UiPlatformFileField 或原生 input + platform stage，禁止 a-upload。' },
        { name: 'a-upload-dragger', message: '请使用 UiPlatformFileField 或 UiPlatformExcelImportModal，禁止 a-upload-dragger。' },
      ],
    },
  },
  {
    rules: {
      'curly': 'off',
      'no-new': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'off',
      'unused-imports/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',

      'style/comma-dangle': 'off',
      'style/quotes': 'off',
      'style/semi': 'off',
      'style/arrow-parens': 'off',
      'style/brace-style': 'off',
      'style/indent': 'off',
      'style/no-trailing-spaces': 'off',
      'style/no-multiple-empty-lines': 'off',
      'style/object-curly-spacing': 'off',

      'import/order': 'off',
      'import/first': 'off',
      'sort-imports': 'off',

      '@typescript-eslint/no-unused-vars': ['warn', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        ignoreEnumMembers: true,
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'ts/no-unused-vars': 'off',
      'ts/no-use-before-define': 'off',
      'ts/no-unused-expressions': 'off',

      'regexp/no-unused-capturing-group': 'off',
      'regexp/no-super-linear-backtracking': 'off',
      'node/prefer-global/process': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'prefer-template': 'off',
      'no-case-declarations': 'off',

      'antfu/top-level-function': 'off',
      'antfu/if-newline': 'off',
      'antfu/consistent-list-newline': 'off',
    },
  },
)
