declare module 'better-sqlite3' {
  class Database {
    constructor(filename: string, options?: { verbose?: (sql: string) => void });
    prepare(sql: string): Statement;
  }

  interface Statement {
    run(...params: any[]): RunResult;
    all(...params: any[]): any[];
  }

  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export default Database;
} 