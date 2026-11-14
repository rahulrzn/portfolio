import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';

// This adapter executes the production SQL against SQLite. It does not emulate
// queries or return canned rows; only the asynchronous D1 API is adapted.
export class SqliteStatement {
  private values: SQLInputValue[] = [];

  constructor(private database: DatabaseSync, private sql: string) {}

  bind(...values: unknown[]): SqliteStatement {
    const statement = new SqliteStatement(this.database, this.sql);
    statement.values = values.map((value) =>
      value instanceof ArrayBuffer ? new Uint8Array(value) : value as SQLInputValue,
    );
    return statement;
  }

  async first<T>(): Promise<T | null> {
    return this.database.prepare(this.sql).get(...this.values) as T ?? null;
  }

  async all<T>(): Promise<{ success: boolean; results: T[]; meta: { changes: number } }> {
    return {
      success: true,
      results: this.database.prepare(this.sql).all(...this.values) as T[],
      meta: { changes: 0 },
    };
  }

  runSync(): { success: boolean; meta: { changes: number } } {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }

  async run(): Promise<{ success: boolean; meta: { changes: number } }> {
    return this.runSync();
  }
}

export class SqliteD1 {
  readonly sqlite: DatabaseSync;

  constructor(path = ':memory:') {
    this.sqlite = new DatabaseSync(path);
    this.sqlite.exec(readFileSync(new NodeURL('../../migrations/0001_portfolio.sql', import.meta.url), 'utf8'));
  }

  prepare(sql: string): SqliteStatement {
    return new SqliteStatement(this.sqlite, sql);
  }

  async batch(statements: SqliteStatement[]): Promise<{ success: boolean; meta: { changes: number } }[]> {
    this.sqlite.exec('BEGIN');
    try {
      const results = statements.map((statement) => statement.runSync());
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }
}
