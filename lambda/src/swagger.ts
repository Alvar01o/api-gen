import { LambdaManifest, TableManifest } from './registry';

// ─── Type mapping ─────────────────────────────────────────────────────────────

function colSchema(type: string): Record<string, unknown> {
  const t = type.toLowerCase();
  if (/^(bigint|smallint|tinyint|mediumint|int)/.test(t) && !t.includes('(1)')) return { type: 'integer' };
  if (/^(float|double|decimal|numeric|real)/.test(t)) return { type: 'number' };
  if (/^bool/.test(t) || t === 'tinyint(1)') return { type: 'boolean' };
  if (/^(datetime|timestamp)/.test(t)) return { type: 'string', format: 'date-time' };
  if (t === 'date') return { type: 'string', format: 'date' };
  if (/^json/.test(t)) return { type: 'object' };
  return { type: 'string' };
}

// ─── Schema builders ──────────────────────────────────────────────────────────

function tableSchema(table: TableManifest): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const col of table.columns) {
    properties[col.name] = {
      ...colSchema(col.type),
      ...(col.isPrimary ? { description: 'Primary key' } : {}),
      ...(col.nullable ? { nullable: true } : {}),
    };
    if (!col.nullable && !col.isPrimary) required.push(col.name);
  }

  return { type: 'object', properties, ...(required.length ? { required } : {}) };
}

function inputSchema(table: TableManifest): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const col of table.columns) {
    if (col.isPrimary) continue;
    properties[col.name] = {
      ...colSchema(col.type),
      ...(col.nullable ? { nullable: true } : {}),
    };
    if (!col.nullable) required.push(col.name);
  }

  return { type: 'object', properties, ...(required.length ? { required } : {}) };
}

// ─── Path builders ────────────────────────────────────────────────────────────

function collectionPaths(base: string, table: TableManifest): Record<string, unknown> {
  const ref = `#/components/schemas/${table.name}`;
  const inputRef = `#/components/schemas/${table.name}Input`;
  const belongsToNames = table.relations.map((r) => r.referencedTable);
  const hasManyNames   = (table.hasMany ?? []).map((hm) => hm.table);
  const allIncludeNames = [...belongsToNames, ...hasManyNames];

  const includeParam = allIncludeNames.length
    ? [{
        name: 'include',
        in: 'query',
        description:
          `Comma-separated relations to embed. ` +
          (belongsToNames.length ? `BelongsTo (LEFT JOIN): \`${belongsToNames.join(', ')}\`. ` : '') +
          (hasManyNames.length   ? `HasMany (subquery): \`${hasManyNames.join(', ')}\`.` : ''),
        schema: { type: 'string', example: allIncludeNames.slice(0, 2).join(',') },
      }]
    : [];

  const filterParams = table.columns.map((c) => ({
    name: `filter[${c.name}]`,
    in: 'query',
    description: `Exact match filter on \`${c.name}\``,
    schema: colSchema(c.type),
  }));

  return {
    get: {
      tags: [table.name],
      summary: `List ${table.name}`,
      operationId: `list_${table.name}`,
      parameters: [
        { name: 'limit',  in: 'query', schema: { type: 'integer', default: 50, maximum: 500, minimum: 1 } },
        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0, minimum: 0 } },
        { name: 'sort',   in: 'query', schema: { type: 'string', enum: table.columns.map((c) => c.name) } },
        { name: 'order',  in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
        ...includeParam,
        ...filterParams,
      ],
      responses: {
        200: {
          description: 'Paginated list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: ref } },
                  meta: {
                    type: 'object',
                    properties: {
                      total:  { type: 'integer' },
                      limit:  { type: 'integer' },
                      offset: { type: 'integer' },
                      pages:  { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: [table.name],
      summary: `Create ${table.name}`,
      operationId: `create_${table.name}`,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: inputRef } } },
      },
      responses: {
        201: {
          description: 'Record created',
          content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: ref } } } } },
        },
        400: { description: 'Validation error' },
      },
    },
  };
}

function itemPaths(base: string, table: TableManifest): Record<string, unknown> {
  const ref = `#/components/schemas/${table.name}`;
  const inputRef = `#/components/schemas/${table.name}Input`;
  const belongsToNames = table.relations.map((r) => r.referencedTable);
  const hasManyNames   = (table.hasMany ?? []).map((hm) => hm.table);
  const allIncludeNames = [...belongsToNames, ...hasManyNames];

  const idParam = { name: 'id', in: 'path', required: true, description: table.pk, schema: { type: 'string' } };

  const includeParam = allIncludeNames.length
    ? [{ name: 'include', in: 'query', description: `Relations to embed. BelongsTo: ${belongsToNames.join(', ')}${hasManyNames.length ? ` | HasMany: ${hasManyNames.join(', ')}` : ''}`, schema: { type: 'string' } }]
    : [];

  return {
    get: {
      tags: [table.name],
      summary: `Get ${table.name} by ${table.pk}`,
      operationId: `get_${table.name}_by_id`,
      parameters: [idParam, ...includeParam],
      responses: {
        200: { description: 'Found', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: ref } } } } } },
        404: { description: 'Not found' },
      },
    },
    put: {
      tags: [table.name],
      summary: `Update ${table.name}`,
      operationId: `update_${table.name}`,
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: inputRef } } } },
      responses: {
        200: { description: 'Updated', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: ref } } } } } },
        404: { description: 'Not found' },
        400: { description: 'Validation error' },
      },
    },
    delete: {
      tags: [table.name],
      summary: `Delete ${table.name}`,
      operationId: `delete_${table.name}`,
      parameters: [idParam],
      responses: {
        200: { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object', properties: { deleted: { type: 'boolean' }, id: { type: 'string' } } } } } } } },
        404: { description: 'Not found' },
      },
    },
  };
}

function relationPath(table: TableManifest, referencedTable: string, fkCol: string, refCol: string): Record<string, unknown> {
  const ref = `#/components/schemas/${referencedTable}`;
  return {
    get: {
      tags: [table.name],
      summary: `Get ${referencedTable} related to ${table.name}`,
      operationId: `get_${table.name}_${referencedTable}`,
      description: `Follows FK: \`${table.name}.${fkCol}\` → \`${referencedTable}.${refCol}\``,
      parameters: [
        { name: 'id',     in: 'path',  required: true, schema: { type: 'string' }, description: table.pk },
        { name: 'limit',  in: 'query', schema: { type: 'integer', default: 50 } },
        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        { name: 'sort',   in: 'query', schema: { type: 'string' } },
        { name: 'order',  in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
      ],
      responses: {
        200: {
          description: 'Related rows',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data:     { type: 'array', items: { $ref: ref } },
                  relation: { type: 'object', properties: { from: { type: 'string' }, fk: { type: 'string' }, to: { type: 'string' }, on: { type: 'string' } } },
                  meta:     { type: 'object', properties: { total: { type: 'integer' }, limit: { type: 'integer' }, offset: { type: 'integer' }, pages: { type: 'integer' } } },
                },
              },
            },
          },
        },
        404: { description: 'Parent not found' },
      },
    },
  };
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildOpenApiSpec(manifest: LambdaManifest): Record<string, unknown> {
  const { engine, dbName, tables } = manifest;
  const base = `/${engine}/${dbName}`;

  const schemas: Record<string, unknown> = {};
  const paths:   Record<string, unknown> = {};

  for (const table of Object.values(tables)) {
    schemas[table.name]            = tableSchema(table);
    schemas[`${table.name}Input`]  = inputSchema(table);

    const tablePath = `${base}/${table.name}`;
    paths[tablePath]           = collectionPaths(base, table);
    paths[`${tablePath}/{id}`] = itemPaths(base, table);

    for (const rel of table.relations) {
      paths[`${tablePath}/{id}/${rel.referencedTable}`] = relationPath(
        table, rel.referencedTable, rel.column, rel.referencedColumn,
      );
    }
  }

  return {
    openapi: '3.0.3',
    info: {
      title: `${dbName} — Dynamic API`,
      description:
        `Auto-generated CRUD API for **${engine}** database \`${dbName}\`.\n\n` +
        `Generated by **api-dyn** lambda runtime.\n\n` +
        `### Conventions\n` +
        `- Pagination: \`?limit=50&offset=0\`\n` +
        `- Sorting: \`?sort=column&order=asc|desc\`\n` +
        `- Filtering: \`?filter[column]=value\`\n` +
        `- Relations (LEFT JOIN): \`?include=table1,table2\`\n` +
        `- Relation navigation: \`GET /${engine}/${dbName}/{table}/{id}/{relation}\``,
      version: new Date(manifest.registeredAt).toISOString().slice(0, 10),
      contact: { name: 'api-dyn' },
    },
    servers: [{ url: '/', description: 'Lambda runtime' }],
    tags: Object.values(tables).map((t) => ({
      name: t.name,
      description: `CRUD endpoints for table \`${t.name}\` (PK: \`${t.pk}\`)`,
    })),
    paths,
    components: { schemas },
  };
}

// ─── Swagger UI HTML (CDN, no extra deps) ─────────────────────────────────────

export function buildSwaggerHtml(specUrl: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title} – API Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #f8fafc; font-family: sans-serif; }
    .swagger-ui .topbar { display: none !important; }
    .swagger-ui .info .title { font-size: 1.6rem; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '${specUrl}',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      tryItOutEnabled: true,
    });
  </script>
</body>
</html>`;
}
