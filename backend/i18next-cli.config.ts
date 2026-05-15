import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['fr', 'en'],
  extract: {
    input: 'src/**/*.ts',
    output: '../locales/{{language}}/cli/{{namespace}}.json',
    // ns: ['cli'],
    // // @ts-expect-error- The runtime requires this to prevent cross-file nesting
    // namespaces: ['cli'],
    defaultNS: 'cli',
    // defaultNamespace: 'cli',
    keySeparator: '.',
    // keepRemoved: true
    removeUnusedKeys: false,
    functions: ['t', 'i18n.t', 'outputService.info', 'outputService.success', 'outputService.error']
  }
});
