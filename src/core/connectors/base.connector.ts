import { MikroORM, Options } from '@mikro-orm/core';
import { DatabaseStructure } from '../models/database-structure.model';

type Engine = 'mysql' | 'postgres';

export abstract class BaseConnector {
  protected orm!: MikroORM;

  protected host!: string;
  protected port!: number;
  protected user!: string;
  protected password!: string;

  protected loadCredentials(engine: Engine): void {
    if (engine === 'mysql') {
      this.host = process.env.MYSQL_HOST!;
      this.port = Number(process.env.MYSQL_PORT);
      this.user = process.env.MYSQL_USER!;
      this.password = process.env.MYSQL_PASSWORD!;
    } else {
      this.host = process.env.POSTGRES_HOST!;
      this.port = Number(process.env.POSTGRES_PORT);
      this.user = process.env.POSTGRES_USER!;
      this.password = process.env.POSTGRES_PASSWORD!;
    }

    if (!this.host || !this.port || !this.user || !this.password) {
      throw new Error(
        `Missing required environment variables for engine "${engine}". ` +
        `Expected: ${engine === 'mysql' ? 'MYSQL' : 'POSTGRES'}_HOST/PORT/USER/PASSWORD`
      );
    }
  }

  protected async waitForConnection(initFn: () => Promise<any>, retries = 10, delay = 3000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await initFn();
      } catch (err) {
        console.log(`DB not ready, retrying... (${i + 1}/${retries})`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
    throw new Error('Database not reachable after retries');
  }

  protected getDbConfig(dbName: string): Omit<Options, 'type'> {
    return {
      host: this.host,
      port: this.port,
      user: this.user,
      password: this.password,
      dbName,
      entities: [],
      discovery: {
        warnWhenNoEntities: false,
      },
    };
  }

  abstract connect(dbName: string): Promise<void>;
  abstract loadSchema(): Promise<DatabaseStructure>;
  abstract createDatabase(dbName: string): Promise<void>;
  abstract databaseExists(dbName: string): Promise<boolean>;
  abstract dropDatabase(dbName: string): Promise<void>;
  abstract applySchema(dbName: string, filePath: string): Promise<void>;
  
  async close(): Promise<void> {
    if (this.orm) {
      await this.orm.close(true);
    }
  }
}
