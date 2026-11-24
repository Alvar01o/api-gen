import { readFile, writeFile } from 'fs/promises';

// ─── Role/permission statement patterns ───────────────────────────────────────
//
// All of the following can appear in pg_dump / pg_dumpall output and will fail
// when the referenced roles don't exist in the target server. They are safe to
// strip because they don't affect the schema structure, only ownership and ACLs.

// GRANT ... TO <role> / REVOKE ... FROM <role>
// Emitted by pg_dump for every table, sequence, function, etc.
const GRANT_REVOKE_RE = /^[ \t]*(GRANT|REVOKE)\b[^;]*;[ \t]*(\r?\n)?/gim;

// ALTER <object> ... OWNER TO <role>
// Emitted by pg_dump for every owned object (TABLE, FUNCTION, SEQUENCE, VIEW,
// TYPE, SCHEMA, DATABASE, DOMAIN, AGGREGATE, etc.)
const OWNER_TO_RE = /^[ \t]*ALTER\s+\S[^;]*\bOWNER\s+TO\s+\S+\s*;[ \t]*(\r?\n)?/gim;

// ALTER DEFAULT PRIVILEGES [FOR ROLE <role>] ... GRANT/REVOKE ...
// Emitted when default privileges have been configured. References two roles
// (grantor and grantee) — both must exist or the statement fails.
const DEFAULT_PRIVILEGES_RE = /^[ \t]*ALTER\s+DEFAULT\s+PRIVILEGES\b[^;]*;[ \t]*(\r?\n)?/gim;

// SET ROLE <rolename> / RESET ROLE
// pg_dumpall uses SET ROLE to switch context per object. Fails if role absent.
const SET_ROLE_RE = /^[ \t]*(SET\s+ROLE|RESET\s+ROLE)\b[^;]*;[ \t]*(\r?\n)?/gim;

// SET SESSION AUTHORIZATION <rolename> / RESET SESSION AUTHORIZATION
// Similar to SET ROLE — used in some dump formats to impersonate the owner.
const SET_SESSION_AUTH_RE = /^[ \t]*(SET|RESET)\s+SESSION\s+AUTHORIZATION\b[^;]*;[ \t]*(\r?\n)?/gim;

// CREATE ROLE / CREATE USER / ALTER ROLE / ALTER USER / DROP ROLE / DROP USER
// Present in pg_dumpall --globals-only output. Importing into a managed server
// (where role creation is restricted) will fail outright.
const ROLE_DDL_RE = /^[ \t]*(CREATE|ALTER|DROP)\s+(ROLE|USER)\b[^;]*;[ \t]*(\r?\n)?/gim;

// REASSIGN OWNED BY <old_role> TO <new_role>
// Bulk ownership transfer — both roles must exist.
const REASSIGN_OWNED_RE = /^[ \t]*REASSIGN\s+OWNED\s+BY\b[^;]*;[ \t]*(\r?\n)?/gim;

// DROP OWNED BY <role>
// Drops all objects owned by a role before removing it. Role must exist.
const DROP_OWNED_RE = /^[ \t]*DROP\s+OWNED\s+BY\b[^;]*;[ \t]*(\r?\n)?/gim;

/**
 * Strips all role/permission-related statements from a SQL dump so it can be
 * imported into any PostgreSQL server regardless of which roles exist there.
 *
 * Removed categories:
 *   - GRANT / REVOKE
 *   - ALTER <object> OWNER TO <role>
 *   - ALTER DEFAULT PRIVILEGES ...
 *   - SET ROLE / RESET ROLE
 *   - SET SESSION AUTHORIZATION / RESET SESSION AUTHORIZATION
 *   - CREATE / ALTER / DROP ROLE|USER
 *   - REASSIGN OWNED BY
 *   - DROP OWNED BY
 */
export function sanitizeSql(sql: string): string {
  return sql
    .replace(GRANT_REVOKE_RE, '')
    .replace(OWNER_TO_RE, '')
    .replace(DEFAULT_PRIVILEGES_RE, '')
    .replace(SET_ROLE_RE, '')
    .replace(SET_SESSION_AUTH_RE, '')
    .replace(ROLE_DDL_RE, '')
    .replace(REASSIGN_OWNED_RE, '')
    .replace(DROP_OWNED_RE, '');
}

/**
 * Reads the schema file at `filePath`, applies sanitizeSql, and overwrites
 * the file if any changes were made.
 */
export async function sanitizeSchemaFile(filePath: string): Promise<void> {
  const original = await readFile(filePath, 'utf8');
  const sanitized = sanitizeSql(original);
  if (sanitized !== original) {
    await writeFile(filePath, sanitized, 'utf8');
  }
}

export function validateSqlContent(sql: string) {
  if (process.env.SCHEMA_ENABLE_SQL_GUARD !== 'true') return;

  const forbidden = (process.env.SCHEMA_FORBIDDEN_KEYWORDS || '')
    .split(',')
    .map(k => k.trim().toUpperCase())
    .filter(Boolean);

  const upperSql = sql.toUpperCase();

  for (const word of forbidden) {
    if (upperSql.includes(word)) {
      throw new Error(`Forbidden SQL keyword detected: ${word}`);
    }
  }
}
