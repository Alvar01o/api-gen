import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'tenants' })
export class Tenant {
  @PrimaryKey()
  id: string = randomUUID();

  @Property()
  userId!: string;

  @Property()
  name!: string;

  @Property({ defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
