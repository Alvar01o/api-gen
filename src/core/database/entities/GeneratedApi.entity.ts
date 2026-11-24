import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'generated_apis' })
export class GeneratedApi {
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
  manifest!: object;

  @Property({ type: 'json' })
  routes!: string[];

  /** Whether JWT auth is enabled for this API */
  @Property({ nullable: true })
  authEnabled?: boolean;

  /** Table used for authentication */
  @Property({ nullable: true })
  authTable?: string;

  /** Column used as username/email identifier */
  @Property({ nullable: true })
  authUsernameField?: string;

  /** Column used as password/hash */
  @Property({ nullable: true })
  authPasswordField?: string;

  /** Password hashing algorithm: bcrypt | md5 | sha1 | sha256 | plain */
  @Property({ nullable: true })
  authHashAlgorithm?: string;

  @Property({ defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
