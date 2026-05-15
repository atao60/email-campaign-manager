# @atao60/personal-mailing-manager - Contributing

Welcome!

:tada::+1: First, thank you for considering contributing to `mailing-manager`! :tada::+1:

## Guidelines

We'd like to emphasize these points:

1. Be Respectful
   - We appreciate contributions to `mailing-manager` and we ask you to respect one another.
2. Be Responsible
   - You are responsible for your Pull Request submission.
3. Give Credit
   - If any submissions or contributions are built upon other work (e.g. research papers, open sourced projects, public code), please cite or attach any information about the original source. People should be credited for the work they've done.

## License

By contributing to `@atao60/personal-mailing-manager`, you agree that your contributions will be licensed under its [MIT](LICENSE) license.

## Roadmap

- adapter for gmail
- mode staging: run locally by send to external smtp
- i18n for messages between backend and client
- logger with pino
- code analyse tools
- form to update contacts files

## Code Overview

### Tools

- [VSC](https://code.visualstudio.com/) as [IDE](https://en.wikipedia.org/wiki/Integrated_development_environment)
- [GIT](https://git-scm.com/) as [VCS](https://en.wikipedia.org/wiki/Version_control)
- [Vite](https://vite.dev/) as build tool
- [Vitest](https://vitest.dev/) for testing
- [prettier](https://prettier.io/) & [eslint](https://eslint.org/) for QA
- [@ysk8hori/typescript-graph (tsg)](https://github.com/ysk8hori/typescript-graph) with [mermaid](https://mermaid.js.org/) for dependency diagram
- license-checker-rseidelsohn for licenses checking
- mainly [Google Gemini Pro](https://gemini.google.com/) and [ChatGPT Codex](https://chatgpt.com/codex) as [AI](https://en.wikipedia.org/wiki/Artificial_intelligence).

### Design

Much documentation can be replaced with highly readable code and tests.
In a world of evolutionary architecture, however, it's important to record certain design decisions for the benefit of future team members as well as for external oversight.
This project uses Architecture Decision Records (ADR) for capturing important architectural decisions along with their context and consequences.
They are gathered under folder `./doc/adr`.

Otherwise, below are some broad design rules.

**_TBD_**

## Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) - _at least version 24_
- [npm](https://www.npmjs.com/) - _comes with Node.js_
- [npx](https://github.com/npm/npx#readme) - _comes with Node.js_
- [nvm](https://github.com/nvm-sh/nvm) or [mise](https://mise.jdx.dev/)- _optional_

and possibly:

- a [GitHub account](https://github.com/)

The shell used here is [Bash](https://www.gnu.org/software/bash/) under [Linux](https://www.linuxfoundation.org/).
However it should be straightforward to work under any other usual OS, see [Cross Platform Concerns](#cross-platform-concerns).

Check prerequisites' status:

```bash

npm doctor # show information about git, node, npm... for the current user

git --version

nvm --version # required only if the installed Node has a lower version than the required one.

```

## Development

**_TBD_**

### Coding Rules

**_TBD_**

### Release Guidelines

**_TBD_**

### Commit Messages

We follow the **Conventional Commits** specification. Please format your commit messages as follows:

`<type>(<scope>): <subject>`

**Types:**

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Example:**
`feat(compiler): add support for nested repeat loops`

### Audits

#### Dependency audit

Run:

```bash
npm run npm run analyse:code:deps:all

```

Then display the files `client-graph.svg` and `backend-graph.svg`.

### Cross Platform Concerns

#### Scripts

All the scripts in package.json are cross-platform, at least under [Linux](https://www.linuxfoundation.org/) ([Bash](https://www.gnu.org/software/bash/)),
[Windows](https://www.microsoft.com/windows/) and [Mac OS X](https://www.apple.com/macos).

To make sure your npm scripts work across different platforms, you cannot rely on environment specific tools.
This can be solved by using a task runner to hide the differences.
Alternately, you can use a collection of npm packages which expose small CLI interface.
The list below contains several of them (src: [survivejs.com](https://survivejs.com/maintenance/packaging/building/#cross-platform-concerns)):

- [cross-env](https://www.npmjs.com/package/cross-env) - Set environment variables.
- [npm-run-all](https://www.npmjs.com/package/npm-run-all) or [concurrently](https://www.npmjs.com/package/concurrently) - Running npm scripts in series and parallel is problematic as there’s no native support for that and you have to rely on OS level semantics. npm-run-all solves this problem by hiding it behind a small CLI interface. Example: npm-run-all clean build:\*.

Not forgetting, of course...:

- [cpy-cli](https://www.npmjs.com/package/cpy-cli) - Copy files and folders.
- [mkdirp](https://www.npmjs.com/package/mkdirp) - mkdirp equals to Unix mkdir -p \<path> which creates all directories given to it. A normal mkdir \<path> would fail if any of the parents are missing. -p stands for --parents.
- [rimraf](https://www.npmjs.com/package/rimraf) - rimraf equals to rm -rf \<path> which in Unix terms removes the given path and its contents without any confirmation. The command is both powerful and dangerous.

> A special case here with [rimraf](https://www.npmjs.com/package/rimraf): it can't be used under [Windows](https://www.microsoft.com/windows/) to delete folder `./node_modules`. See the script `[rmdir.js](https://github.com/atao60/fse-cli/blob/master/scripts/rmdir.js)`.
