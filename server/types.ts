export interface SqlResult {
  success: boolean;
  meta: { changes: number };
}

export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<SqlResult & { results: T[] }>;
  run(): Promise<SqlResult>;
}

export interface PortfolioDatabase {
  prepare(sql: string): SqlStatement;
  batch(statements: SqlStatement[]): Promise<SqlResult[]>;
}

export interface ServerEnvironment {
  PORTFOLIO_DB?: PortfolioDatabase;
  ADMIN_PASSWORD_HASH?: string;
  APP_ORIGIN?: string;
  ASSETS?: { fetch(request: Request): Promise<Response> };
}

export interface PagesContext {
  request: Request;
  env: ServerEnvironment;
  next(): Promise<Response>;
}
