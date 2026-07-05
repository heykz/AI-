/**
 * Minimal ambient type declarations for Node.js 24's built-in `node:sqlite`.
 *
 * `node:sqlite` is experimental and ships without official @types.
 * We only use `DatabaseSync` with a tiny subset of its API, so this
 * declaration covers exactly what we need and nothing more.
 */

declare module "node:sqlite" {
  interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableDoubleQuotedStringLiterals?: boolean;
  }

  interface StatementResult {
    changes?: number;
    lastInsertRowid?: number | bigint;
  }

  class StatementSync {
    all(...params: unknown[]): Record<string, unknown>[];
    get(...params: unknown[]): Record<string, unknown> | undefined;
    run(...params: unknown[]): StatementResult;
  }

  export class DatabaseSync {
    constructor(path: string, options?: DatabaseSyncOptions);
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    close(): void;
  }
}
