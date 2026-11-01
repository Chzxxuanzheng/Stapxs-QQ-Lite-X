import { globalIgnores } from 'eslint/config'
import {
    defineConfigWithVueTs,
    vueTsConfigs,
} from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
    {
        name: 'app/files-to-lint',
        files: ['src/renderer/src/**/*.{vue,ts,mts,tsx}'],
    },

    globalIgnores([
        'node_modules/**',
        'dist/**',
        'src/renderer/public/**',
        'src/renderer/src/assets/**',
        '*.config.*',
        'proxy.js',
    ]),

    ...pluginVue.configs['flat/essential'],
    vueTsConfigs.recommended,

    {
        files: ['src/renderer/src/**/*.{vue,ts,mts,tsx}'],
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },
        rules: {
            // === 基础规则 ===
            // 忽略使用 any 类型的错误
            '@typescript-eslint/no-explicit-any': 'off',
            // debugger
            'no-debugger': 'warn',
            // console
            'no-console': 'warn',
            // 优先使用箭头函数
            'prefer-arrow-callback': 'warn',
            // 引号
            quotes: ['warn', 'single'],
            // 分号
            semi: ['warn', 'never'],
            // 未使用的变量
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            // 禁止使用ref和reactive
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'vue',
                            importNames: ['ref', 'reactive'],
                            message: '禁止使用 ref 和 reactive',
                        },
                    ],
                },
            ],
            // 禁止使用 localStorage
            'no-restricted-globals': [
                'error',
                {
                    name: 'localStorage',
                    message:
                        '禁止使用 localStorage。请使用 useLocalStorage 替代。',
                },
            ],
            'no-restricted-properties': [
                'error',
                {
                    object: 'window',
                    property: 'localStorage',
                    message:
                        '禁止使用 localStorage。请使用 useLocalStorage 替代。',
                },
            ],
            // 允许while true
            'no-constant-condition': ['error', { checkLoops: false }],
            indent: ['warn', 4, { SwitchCase: 1 }],

            // === Vue 相关规则 ===
            // html 缩进
            'vue/html-indent': [
                'warn',
                4,
                {
                    alignAttributesVertically: false,
                },
            ],
            // html 标签闭合
            'vue/html-closing-bracket-spacing': [
                'warn',
                {
                    selfClosingTag: 'always',
                },
            ],
            // 每行最大属性数
            'vue/max-attributes-per-line': [
                'warn',
                {
                    singleline: { max: 3 },
                    multiline: { max: 3 },
                },
            ],
            // 属性换行设置
            'vue/first-attribute-linebreak': [
                'warn',
                {
                    singleline: 'ignore',
                    multiline: 'ignore',
                },
            ],
            // html 标签换行
            'vue/html-closing-bracket-newline': [
                'warn',
                {
                    multiline: 'never',
                },
            ],
            // html 引号
            'vue/html-quotes': ['warn', 'double', { avoidEscape: true }],
            // v-for 分隔符
            'vue/v-for-delimiter-style': ['error', 'in'],
            // 组件 name 属性
            'vue/require-name-property': 'warn',
            // 属性简写
            'vue/prefer-true-attribute-shorthand': 'warn',
            // prop 类型
            'vue/require-prop-types': 'off',
            // v-html
            'vue/no-v-html': 'off',
            // vue 单单词组件
            'vue/multi-word-component-names': 'off',
            // vue 不推荐组件名
            'vue/no-reserved-component-names': 'off',
        },
    },

    skipFormatting,
)
