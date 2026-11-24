import 'reflect-metadata';
import 'dotenv/config';
import { PostgresConnector } from './core/connectors/postgres.connector';
import { MysqlConnector } from './core/connectors/mysql.connector';
import { BaseConnector } from './core/connectors/base.connector';
import { DatabaseDAG } from './structures/graf';

async function run() {
  const engine = process.argv[2];
  const dbName = process.argv[3];

  if (!engine || !dbName) {
    console.error('Usage: ts-node src/index.ts <mysql|postgres> <dbName>');
    process.exit(1);
  }

  let connector: BaseConnector;

  switch (engine) {
    case 'postgres':
      connector = new PostgresConnector();
      break;

    case 'mysql':
      connector = new MysqlConnector();
      break;

    default:
      console.error('Usage: ts-node src/index.ts <mysql|postgres> <dbName>');
      process.exit(1);
  }

  try {
    console.log('Before connect');
    await connector.connect(dbName);
    console.log('Connected');

    console.log('Before loadSchema');
    const schema = await connector.loadSchema();
    console.log('Schema loaded');

    const dag = DatabaseDAG.fromDatabaseStructure(schema);

    if (dag.hasCycle()) {
      console.warn('⚠️  FK cycles found — affected edges marked as is_cyclic: true');
    }

    console.log('Tables:', dag.size());
    console.log(JSON.stringify(dag.toJSON(), null, 2));

  } catch (error) {
    console.error('Error during execution:', error);
    process.exit(1);
  } finally {
    await connector.close();
  }
}

run();
