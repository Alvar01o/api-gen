import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'public_endpoints' })
export class PublicEndpoint {
  @PrimaryKey()
  id: string = randomUUID();

  /** FK to generated_apis.id */
  @Property()
  generatedApiId!: string;

  @Property()
  tenantId!: string;

  /** HTTP method: GET | POST | PUT | DELETE */
  @Property()
  method!: string;

  /** Clean route path, e.g. "/postgres/mydb/users/:id" */
  @Property()
  route!: string;

  /** Full string for display: "GET /postgres/mydb/users/:id" */
  @Property()
  routeKey!: string;

  /** true = accessible without JWT */
  @Property()
  isPublic: boolean = false;

  @Property({ defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
