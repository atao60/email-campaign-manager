import { Config } from 'release-it';

const config: Config = {
  git: {
    commitMessage: 'chore(release): ${version} [skip ci]\n\n${changelog}',
    requireBranch: 'main',
    requireCleanWorkingDir: true,
    tagAnnotation: 'Release v${version}',
  },
  github: {
    release: true,
    releaseName: 'v${version}',
  },
  npm: {
    publish: false,
  },
  plugins: {
    '@release-it/conventional-changelog': {
      preset: 'conventionalcommits',
      infile: 'CHANGELOG.md',
      header: '# Changelog\n\nAll notable changes to this project will be documented in this file.',
    },
  },
};

export default config;
