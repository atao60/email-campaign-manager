# ADR - Build Tools

In this project tsc, tsup and `vite build` are both used.

## **The Modern Workflow** - Why and when

In many modern projects, tsc, tsup and `vite build` are three tools often used together:

1. **Vite** might be used to build frontend app.
2. run **`tsc --noEmit`** as a type-checking step before a build or within a Husky pre-commit hook.
3. If a frontend app has a shared internal utility package in a monorepo, build that specific utility package can be dne using **`tsup`** so the Vite app can easily consume it.

## Details

Setting up a solid TypeScript foundation usually involves wiring up the basics—like Prettier for consistent formatting and Husky for pre-commit quality checks.
However, when it comes to the actual build step, choosing between `tsc`, `tsup`, and `vite build` depends entirely on target environment (frontend vs. backend vs. open-source library).

Here is a breakdown of how they compare and when to use each.

### **1. `tsc` (The TypeScript Compiler)**

This is the official compiler provided by Microsoft. It reads configuration from `tsconfig.json` and transpiles TypeScript into JavaScript.

- **How it works:** By default, it operates on a file-by-file basis. It checks types and outputs 1:1 JavaScript files alongside `.d.ts` (declaration) files. It is _not_ a bundler.
- **Pros:** It is the source of truth for TypeScript. It guarantees 100% correct type checking and declaration generation.
- **Cons:** It is historically slow compared to modern Rust/Go-based tools. Because it doesn't bundle code or handle external assets (like CSS or images), it is inadequate for modern frontend development.
- **Best for:** \* Pure type-checking (often run alongside faster build tools using `tsc --noEmit`).
- Simple Node.js backends where to run the compiled JS file directly without bundling.

### **2. `tsup` (The Library Builder)**

`tsup` is a zero-config bundler powered by `esbuild` (written in Go) under the hood. It is designed specifically to bundle TypeScript libraries with zero fuss.

- **How it works:** It takes the TypeScript files and rapidly bundles them into a single file (or a few chunks). It natively supports outputting to CommonJS (CJS) and ECMAScript Modules (ESM) simultaneously.
- **Pros:** Blazing fast. It abstracts away the complex configuration usually required to build dual-package (CJS/ESM) libraries. It also handles generating `.d.ts` files automatically via Rollup/tsc under the hood.
- **Cons:** It is optimized for backend code and libraries. It is not designed to handle complex frontend assets like HTML, CSS, or framework-specific plugins (like React Fast Refresh).
- **Best for:** \* Node.js CLI tools.
- NPM packages and libraries.
- Backend Node.js servers for which a single, optimized output file is desired.

### **3. `vite build` (The Frontend Powerhouse)**

Vite is a modern frontend build tool. For its production build step (`vite build`), it uses Rollup under the hood, heavily optimized with pre-configured plugins.

- **How it works:** It takes the entire application graph—HTML, CSS, TypeScript, images, fonts—and creates highly optimized, minified, and chunked static assets ready to be deployed to a web server.
- **Pros:** World-class handling of frontend assets. It offers out-of-the-box support for CSS modules, PostCSS, asset inlining, and dynamic imports for code splitting.
- **Cons:** Overkill and unnecessarily complex for simple Node libraries. It does not perform type-checking during the build process (it expects that`tsc --noEmit` will be run separately).
- **Best for:** \* Single Page Applications (React, Vue, Svelte).
- Frontend web development for which it is needed to manage assets, CSS, and complex chunking strategies.

---

### **Summary Comparison**

| Feature                        | `tsc`                          | `tsup`                                  | `vite build`                             |
| ------------------------------ | ------------------------------ | --------------------------------------- | ---------------------------------------- |
| **Primary Use Case**           | Type checking, basic Node apps | NPM Libraries, CLI tools, Node backends | Frontend Web Apps (SPAs)                 |
| **Engine**                     | Node.js (Microsoft)            | `esbuild` (Go)                          | Rollup (JavaScript/Rust)                 |
| **Speed**                      | Slowest                        | Blazing Fast                            | Fast (Highly Optimized)                  |
| **Bundles Code?**              | No                             | Yes                                     | Yes                                      |
| **Generates Types (`.d.ts`)?** | Yes                            | Yes                                     | No (requires `tsc` or `vite-plugin-dts`) |
| **Handles CSS/Assets?**        | No                             | Limited / Not intended for it           | Yes (Excellent)                          |
