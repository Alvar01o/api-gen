import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const PATTERNS_PATH = path.join(__dirname, 'user-table-patterns.json');

interface Patterns {
  tablePatterns: string[];
  usernamePatterns: string[];
  passwordPatterns: string[];
}

interface DetectionInput {
  /** All table names in the imported schema */
  tableNames: string[];
  /** Map of tableName → column names */
  tableColumns: Record<string, string[]>;
}

export type DetectionResult =
  | {
      found: true;
      table: string;
      usernameField: string;
      passwordField: string;
      source: 'pattern' | 'claude';
    }
  | {
      found: false;
      source: 'pattern' | 'claude';
    };

function loadPatterns(): Patterns {
  return JSON.parse(readFileSync(PATTERNS_PATH, 'utf-8')) as Patterns;
}

function savePatterns(p: Patterns) {
  writeFileSync(PATTERNS_PATH, JSON.stringify(p, null, 2), 'utf-8');
}

/** Find a field name in a list of column names using known patterns.
 *  Priority: exact match > starts-with > contains (within each pattern, in order).
 */
function matchField(columns: string[], patterns: string[]): string | undefined {
  const lower = columns.map((c) => c.toLowerCase());
  // Pass 1 — exact matches (highest priority)
  for (const pat of patterns) {
    const idx = lower.findIndex((c) => c === pat);
    if (idx !== -1) return columns[idx];
  }
  // Pass 2 — starts-with (e.g. "username_field" matches "username" pattern)
  for (const pat of patterns) {
    const idx = lower.findIndex((c) => c.startsWith(pat + '_') || c.startsWith(pat));
    if (idx !== -1) return columns[idx];
  }
  // Pass 3 — contains substring
  for (const pat of patterns) {
    const idx = lower.findIndex((c) => c.includes(pat));
    if (idx !== -1) return columns[idx];
  }
  return undefined;
}

/** Match a table name against known patterns (exact → contains) */
function matchTable(tableName: string, patterns: string[]): boolean {
  const t = tableName.toLowerCase();
  if (patterns.some((p) => p === t)) return true;
  if (patterns.some((p) => t.includes(p) || p.includes(t))) return true;
  return false;
}

/** Call Claude API to identify the auth table when no pattern matches */
async function detectWithClaude(input: DetectionInput): Promise<DetectionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[auth-detector] ANTHROPIC_API_KEY not set — skipping Claude detection');
    return { found: false, source: 'claude' };
  }

  // Build table summary for the prompt
  const tableSummary = input.tableNames
    .map((t) => `- ${t}: ${(input.tableColumns[t] ?? []).join(', ')}`)
    .join('\n');

  const prompt =
    `You are analyzing a database schema to find the user authentication table.\n\n` +
    `Tables in the database:\n${tableSummary}\n\n` +
    `Identify which table stores users and is used for authentication. ` +
    `It must have a field for login identifier (email/username) and a field for credentials (password/hash).\n\n` +
    `Respond ONLY with valid JSON — no extra text:\n` +
    `If found: {"found":true,"table":"<name>","usernameField":"<col>","passwordField":"<col>"}\n` +
    `If not found: {"found":false}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 128,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('[auth-detector] Claude API error:', response.status);
      return { found: false, source: 'claude' };
    }

    const data = await response.json() as any;
    const text: string = data?.content?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { found: false, source: 'claude' };

    const parsed = JSON.parse(jsonMatch[0]) as {
      found: boolean;
      table?: string;
      usernameField?: string;
      passwordField?: string;
    };

    if (!parsed.found || !parsed.table || !parsed.usernameField || !parsed.passwordField) {
      return { found: false, source: 'claude' };
    }

    // Verify the identified table/fields actually exist in the schema
    if (!input.tableNames.includes(parsed.table)) return { found: false, source: 'claude' };
    const cols = input.tableColumns[parsed.table] ?? [];
    if (!cols.includes(parsed.usernameField) || !cols.includes(parsed.passwordField)) {
      return { found: false, source: 'claude' };
    }

    return {
      found: true,
      table: parsed.table,
      usernameField: parsed.usernameField,
      passwordField: parsed.passwordField,
      source: 'claude',
    };
  } catch (err: any) {
    console.error('[auth-detector] Claude call failed:', err.message);
    return { found: false, source: 'claude' };
  }
}

/** Add a new table pattern entry to the JSON file */
function addTablePattern(tableName: string) {
  const patterns = loadPatterns();
  const t = tableName.toLowerCase();
  if (!patterns.tablePatterns.includes(t)) {
    patterns.tablePatterns.push(t);
    savePatterns(patterns);
    console.log(`[auth-detector] added new pattern "${t}" to patterns file`);
  }
}

/**
 * Main detection function.
 * 1. Try pattern matching against known table/field names
 * 2. Fall back to Claude if no pattern matches
 * 3. If Claude finds a match, persist the new table pattern
 */
export async function detectAuthTable(input: DetectionInput): Promise<DetectionResult> {
  const patterns = loadPatterns();

  // ── Pattern pass ────────────────────────────────────────────────────────────
  for (const tableName of input.tableNames) {
    if (!matchTable(tableName, patterns.tablePatterns)) continue;

    const cols = input.tableColumns[tableName] ?? [];
    const usernameField = matchField(cols, patterns.usernamePatterns);
    const passwordField = matchField(cols, patterns.passwordPatterns);

    if (usernameField && passwordField) {
      console.log(`[auth-detector] matched table "${tableName}" via pattern`);
      return { found: true, table: tableName, usernameField, passwordField, source: 'pattern' };
    }
  }

  // ── Claude fallback ─────────────────────────────────────────────────────────
  console.log('[auth-detector] no pattern match — calling Claude');
  const result = await detectWithClaude(input);

  if (result.found) {
    addTablePattern(result.table);
  }

  return result;
}
