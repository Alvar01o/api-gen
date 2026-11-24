import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

export enum UserRole {
  ADMIN = 'admin',
  CLIENT = 'client',
}

@Entity({ tableName: 'users' })
export class User {
  @PrimaryKey()
  id: string = randomUUID();

  @Property({ unique: true })
  email!: string;

  @Property()
  name!: string;

  @Property({ hidden: true })
  passwordHash!: string;

  @Enum(() => UserRole)
  role: UserRole = UserRole.CLIENT;

  @Property({ defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
