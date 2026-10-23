import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'worker'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // An effect may only return a cleanup function. Expression bodies and \`return x.scrollTo()\`
      // silently return values (newer Chrome's scrollTo returns a Promise) that React then calls.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name=/^use(Layout)?Effect$/] > ArrowFunctionExpression[body.type!='BlockStatement']",
          message: 'Use a block body for effects so nothing but a cleanup function can be returned.',
        },
        {
          selector: 'CallExpression[callee.name=/^use(Layout)?Effect$/] ReturnStatement > CallExpression',
          message: 'Do not return a call result from an effect; React treats the return value as a cleanup function.',
        },
      ],
    },
  },
)
