import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'schema_jobs' })
export class SchemaJobRecord {
  @PrimaryKey()
  id!: string;

  @Property({ nullable: true })
  userId?: string;

  @Property({ nullable: true })
  tenantId?: string;

  @Property()
  engine!: string;

  @Property()
  dbName!: string;

  @Property({ nullable: true })
  hash?: string;

  @Property({ nullable: true })
  schemaPath?: string;

  @Property()
  status: string = 'queued';

  @Property()
  progress: number = 0;

  @Property({ nullable: true })
  stage?: string;

  @Property({ nullable: true, columnType: 'text' })
  error?: string;

  @Property({ type: 'json', nullable: true })
  result?: object;

  @Property({ defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ nullable: true })
  finishedAt?: Date;
}
