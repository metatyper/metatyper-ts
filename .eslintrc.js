module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        project: 'tsconfig.json',
        sourceType: 'module',
        tsconfigRootDir: __dirname
    },
    plugins: ['@typescript-eslint', 'unused-imports'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
    root: true,
    env: {
        node: true,
        commonjs: true,
        es2021: true,
        jest: true
    },
    ignorePatterns: ['.eslintrc.js', 'jest.config.js', 'rollup.config.mjs', 'lib', 'index.d.ts', '.dev'],
    rules: {
        'unused-imports/no-unused-imports': 'warn',
        'unused-imports/no-unused-imports': [
            'warn',
            { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }
        ],
        '@typescript-eslint/no-unused-vars': [
            'warn',
            { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }
        ],
        "no-unused-vars": "off",      
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-this-alias': 'off',
        'prettier/prettier': [
            'warn',
            {
                endOfLine: 'auto'
            }
        ],
        'padding-line-between-statements': [
            'warn',
            { blankLine: 'always', prev: '*', next: 'multiline-block-like' },
            { blankLine: 'always', prev: 'multiline-block-like', next: '*' },
            { blankLine: 'always', prev: ['const', 'let', 'export'], next: '*' },
            {
                blankLine: 'always',
                prev: '*',
                next: ['if', 'class', 'for', 'do', 'while', 'switch', 'try']
            },
            {
                blankLine: 'always',
                prev: ['if', 'class', 'for', 'do', 'while', 'switch', 'try'],
                next: '*'
            },
            {
                blankLine: 'any',
                prev: ['const', 'let', 'export'],
                next: ['const', 'let', 'export']
            },
            { blankLine: 'always', prev: '*', next: 'return' }
        ]
    }
}
