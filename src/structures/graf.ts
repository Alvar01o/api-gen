import {
  ColumnMetadata,
  ForeignKeyMetadata,
  IndexMetadata,
  DatabaseStructure,
} from '../core/models/database-structure.model';

// ---------------------------------------------------------------------------
// Child node types
// ---------------------------------------------------------------------------

export interface FKChild {
  type: 'fk';
  /** Name of the referenced table — acts as the node identifier in the graph */
  id: string;
  /** True when this FK would create a cycle — excluded from graph traversal */
  is_cyclic: boolean;
  data: {
    columnName: string;       // column in this table that holds the FK
    referencedColumn: string; // column in the referenced table
    constraintName: string;
  };
}

export interface IndexChild {
  type: 'index';
  /** Index name */
  id: string;
  data: {
    columns: string[];
    unique: boolean;
  };
}

export type NodeChild = FKChild | IndexChild;

// ---------------------------------------------------------------------------
// Table node
// ---------------------------------------------------------------------------

export interface TableNodeData {
  columns: ColumnMetadata[];
  foreignKeys: ForeignKeyMetadata[];
  indexes: IndexMetadata[];
}

export interface TableNode {
  /** Table name */
  id: string;
  data: TableNodeData;
  /** Children: FK edges (point to other table nodes) + index leaf nodes */
  children: NodeChild[];
}

// ---------------------------------------------------------------------------
// Directed Acyclic Graph
// ---------------------------------------------------------------------------

export class DatabaseDAG {
  private nodes: Map<string, TableNode> = new Map();

  // ── Build ────────────────────────────────────────────────────────────────

  addTable(table: {
    name: string;
    columns: ColumnMetadata[];
    foreignKeys: ForeignKeyMetadata[];
    indexes: IndexMetadata[];
  }): void {
    const children: NodeChild[] = [];

    for (const fk of table.foreignKeys) {
      children.push({
        type: 'fk',
        id: fk.referencedTable,
        is_cyclic: false,
        data: {
          columnName: fk.columnName,
          referencedColumn: fk.referencedColumn,
          constraintName: fk.constraintName,
        },
      });
    }

    for (const idx of table.indexes) {
      children.push({
        type: 'index',
        id: idx.name,
        data: {
          columns: idx.columns,
          unique: idx.unique,
        },
      });
    }

    this.nodes.set(table.name, {
      id: table.name,
      data: {
        columns: table.columns,
        foreignKeys: table.foreignKeys,
        indexes: table.indexes,
      },
      children,
    });
  }

  // ── Accessors ────────────────────────────────────────────────────────────

  getNode(id: string): TableNode | undefined {
    return this.nodes.get(id);
  }

  getNodes(): TableNode[] {
    return Array.from(this.nodes.values());
  }

  size(): number {
    return this.nodes.size;
  }

  // ── Cycle detection (DFS, follows non-cyclic FK edges only) ────────────
  // Marks back-edges as is_cyclic = true in-place so the graph stays a DAG.
  // Returns the number of cyclic edges found.

  markCycles(): number {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const id of this.nodes.keys()) color.set(id, WHITE);
    let found = 0;

    const dfs = (id: string): void => {
      color.set(id, GRAY);
      const node = this.nodes.get(id);
      if (!node) return;

      for (const child of node.children) {
        if (child.type !== 'fk' || child.is_cyclic) continue;
        const c = color.get(child.id) ?? WHITE;
        if (c === GRAY) {
          // Back edge — mark it and skip to keep the graph acyclic
          child.is_cyclic = true;
          found++;
        } else if (c === WHITE) {
          dfs(child.id);
        }
      }

      color.set(id, BLACK);
    };

    for (const id of this.nodes.keys()) {
      if ((color.get(id) ?? WHITE) === WHITE) dfs(id);
    }
    return found;
  }

  hasCycle(): boolean {
    return this.getNodes().some(node =>
      node.children.some(c => c.type === 'fk' && c.is_cyclic)
    );
  }

  // ── Factory ──────────────────────────────────────────────────────────────

  static fromDatabaseStructure(structure: DatabaseStructure): DatabaseDAG {
    const dag = new DatabaseDAG();
    for (const table of structure.tables) {
      dag.addTable(table);
    }
    dag.markCycles();
    return dag;
  }

  // ── Serialization ────────────────────────────────────────────────────────

  toJSON(): Record<string, TableNode> {
    return Object.fromEntries(this.nodes.entries());
  }
}
