# Vite NPM Workspace Example

This is an attempt to get Vite to rebuild dependencies in a monorepo.

## Getting Started

There are 3 packages in this monorepo:

- @myscope/a
- @myscope/b
- @myscope/c

@myscope/c depends on @myscope/b, and @myscope/b depends on @myscope/a.

@myscope/c has a simple html page that imports index.ts from @myscope/c.

Run the following commands to get started:

```bash
npm install
npm run build:all
npm -w @myscope/c start
```

You can now view the page http://localhost:5173/ and check the console log.


