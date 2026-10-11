/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'no-feature-internals',
      comment:
        'Una feature no importa internos de otra; solo su index público (src/features/<otra>/index.ts, requisito capability-modularity). Una feature no se importa a sí misma por esta regla (pathNot).',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: {
        path: '^src/features/[^/]+/.+',
        pathNot: ['^src/features/$1/', '^src/features/[^/]+/index\\.ts$'],
      },
    },
    {
      name: 'commands-only-feature-public-api',
      comment: 'src/commands/ solo puede entrar a una feature por su index público.',
      severity: 'error',
      from: { path: '^src/commands/' },
      to: {
        path: '^src/features/[^/]+/(?!index\\.ts$)',
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
  },
};
