import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'inspect_results' })
export class InspectResult {
  @PrimaryKey()
  id: string = randomUUID();

  @Property({ nullable: true })
  userId?: string;

  @Property({ nullable: true })
  tenantId?: string;

  @Property()
  engine!: string;

  @Property()
  dbName!: string;

  @Property({ type: 'json' })
  data!: object;

  @Property({ defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
