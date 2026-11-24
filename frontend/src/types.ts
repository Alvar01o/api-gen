export type Engine = 'mysql' | 'postgres';

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
export type JobStatus = 'queued' | 'running' | 'success' | 'failed';

export interface SchemaJob {
  id: string;
  engine: Engine;
  dbName: string;
  hash: string;
  schemaPath: string;
  status: JobStatus;
  progress: number;
  stage?: string;
  error?: string;
  createdAt: string;
  finishedAt?: string;
  result?: {
    createdDb?: boolean;
    applied?: boolean;
  };
}

export interface UploadResponse {
  success: boolean;
  jobId: string;
  deduped?: boolean;
}

// --- Graph types (mirrors src/structures/graf.ts + database-structure.model.ts) ---

export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
  default?: string | null;
  isPrimary: boolean;
}

export interface ForeignKeyMetadata {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

export interface IndexMetadata {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface FKChild {
  type: 'fk';
  id: string;
  is_cyclic: boolean;
  data: { columnName: string; referencedColumn: string; constraintName: string };
}

export interface IndexChild {
  type: 'index';
  id: string;
  data: { columns: string[]; unique: boolean };
}

export type NodeChild = FKChild | IndexChild;

export interface TableNode {
  id: string;
  data: {
    columns: ColumnMetadata[];
    foreignKeys: ForeignKeyMetadata[];
    indexes: IndexMetadata[];
  };
  children: NodeChild[];
}

export interface InspectResponse {
  engine: string;
  dbName: string;
  tables: number;
  cyclic: boolean;
  graph: Record<string, TableNode>;
}

export interface GenerateAuthInfo {
  enabled: boolean;
  table?: string;
  usernameField?: string;
  passwordField?: string;
  source?: string;
  hashAlgorithm?: string;
  loginEndpoint?: string;
}

export interface GenerateResponse {
  success: boolean;
  engine: string;
  dbName: string;
  tables: number;
  routes: string[];
  auth?: GenerateAuthInfo;
}

export interface GeneratedProject {
  id: string;
  engine: string;
  dbName: string;
  routes: string[];
  createdAt: string;
  tenantId?: string;
  authEnabled?: boolean;
  authTable?: string;
  authUsernameField?: string;
  authPasswordField?: string;
  authHashAlgorithm?: string;
}

export interface PublicEndpoint {
  id: string;
  method: string;
  route: string;
  routeKey: string;
  isPublic: boolean;
}
