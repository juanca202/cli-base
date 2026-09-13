import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: [
      'src/**/*.test.ts',
      'src/**/process-runner*.ts',
      'src/process-runner/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'node:child_process',
              message:
                'Usa ProcessRunner. Solo su implementación puede importar child_process.',
            },
            {
              name: 'child_process',
              message:
                'Usa ProcessRunner. Solo su implementación puede importar child_process.',
            },
          ],
        },
      ],
    },
  },
);
