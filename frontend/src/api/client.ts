import axios from 'axios';
import { GenerateResponse, GeneratedProject, PublicEndpoint, SchemaJob, Tenant, UploadResponse } from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  return data as { token: string; user: { id: string; name: string; email: string; role: string } };
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post('/auth/register', { name, email, password });
  return data as { token: string; user: { id: string; name: string; email: string; role: string } };
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export async function listTenants(): Promise<Tenant[]> {
  const { data } = await api.get('/tenants');
  return data.tenants as Tenant[];
}

export async function createTenant(name: string): Promise<Tenant> {
  const { data } = await api.post('/tenants', { name });
  return data.tenant as Tenant;
}

export async function updateTenant(tenantId: string, name: string): Promise<Tenant> {
  const { data } = await api.patch(`/tenants/${tenantId}`, { name });
  return data.tenant as Tenant;
}

export async function deleteTenant(tenantId: string): Promise<void> {
  await api.delete(`/tenants/${tenantId}`);
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export async function uploadSchema(tenantId: string, engine: string, name: string, file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('engine', engine);
  form.append('name', name);
  form.append('schema', file);
  const { data } = await api.post<UploadResponse>(`/tenants/${tenantId}/schema/upload`, form);
  return data;
}

export async function getJob(tenantId: string, jobId: string): Promise<SchemaJob> {
  const { data } = await api.get<SchemaJob>(`/tenants/${tenantId}/schema/job/${jobId}`);
  return data;
}

export async function inspectSchema(tenantId: string, engine: string, dbName: string): Promise<unknown> {
  const { data } = await api.get(`/tenants/${tenantId}/schema/inspect/${engine}/${dbName}`);
  return data;
}

export async function generateApis(
  tenantId: string,
  engine: string,
  dbName: string,
  opts?: { requiresAuth?: boolean; hashAlgorithm?: string },
): Promise<GenerateResponse> {
  const { data } = await api.post<GenerateResponse>(
    `/tenants/${tenantId}/schema/generate/${engine}/${dbName}`,
    opts ?? {},
  );
  return data;
}

export async function listEndpoints(tenantId: string, projectId: string): Promise<PublicEndpoint[]> {
  const { data } = await api.get(`/tenants/${tenantId}/projects/${projectId}/endpoints`);
  return data.endpoints as PublicEndpoint[];
}

export async function toggleEndpoint(
  tenantId: string,
  projectId: string,
  endpointId: string,
  isPublic: boolean,
): Promise<PublicEndpoint> {
  const { data } = await api.patch(
    `/tenants/${tenantId}/projects/${projectId}/endpoints/${endpointId}`,
    { isPublic },
  );
  return data.endpoint as PublicEndpoint;
}

export async function bulkToggleEndpoints(
  tenantId: string,
  projectId: string,
  isPublic: boolean,
): Promise<void> {
  await api.patch(`/tenants/${tenantId}/projects/${projectId}/endpoints`, { isPublic });
}

export async function listMyProjects(tenantId: string): Promise<GeneratedProject[]> {
  const { data } = await api.get(`/tenants/${tenantId}/projects`);
  return data.projects as GeneratedProject[];
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function adminListUsers() {
  const { data } = await api.get('/admin/users');
  return data.users as { id: string; name: string; email: string; role: string; createdAt: string }[];
}

export async function adminListJobs() {
  const { data } = await api.get('/admin/jobs');
  return data.jobs as SchemaJob[];
}

export async function adminListGenerated() {
  const { data } = await api.get('/admin/generated');
  return data.apis as { id: string; userId?: string; tenantId?: string; engine: string; dbName: string; routes: string[]; createdAt: string }[];
}
