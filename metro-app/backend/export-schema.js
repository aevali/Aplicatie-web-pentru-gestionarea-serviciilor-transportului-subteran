/**
 * export-schema.js
 * Conectare la PostgreSQL local si export schema (tabele, tipuri, triggere)
 * Rulare: node export-schema.js
 */

const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'vali',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'metro_app',
});

async function exportSchema() {
    const client = await pool.connect();
    let sql = `-- Schema exportata din PostgreSQL local\n-- ${new Date().toISOString()}\n\n`;

    try {
        // 1. Tipuri ENUM
        const enums = await client.query(`
            SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public'
            GROUP BY t.typname
            ORDER BY t.typname
        `);

        sql += '-- TIPURI ENUM\n';
        for (const row of enums.rows) {
            // array_agg poate returna string "{val1,val2}" sau array real
            const labels = Array.isArray(row.labels)
                ? row.labels
                : String(row.labels).replace(/^{|}$/g, '').split(',');
            const values = labels.map(l => `'${l.trim()}'`).join(', ');
            sql += `CREATE TYPE ${row.typname} AS ENUM (${values});\n`;
        }
        sql += '\n';

        // 2. Tabele (in ordinea dependentelor)
        const tables = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        sql += '-- TABELE\n';
        for (const t of tables.rows) {
            const cols = await client.query(`
                SELECT column_name, data_type, udt_name,
                       character_maximum_length, is_nullable,
                       column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position
            `, [t.table_name]);

            sql += `\nCREATE TABLE ${t.table_name} (\n`;
            const colDefs = cols.rows.map(c => {
                let type = c.data_type === 'USER-DEFINED' ? c.udt_name
                         : c.data_type === 'character varying' ? `VARCHAR(${c.character_maximum_length || 255})`
                         : c.data_type === 'character' ? `CHAR(${c.character_maximum_length || 1})`
                         : c.data_type.toUpperCase();
                let def = `    ${c.column_name} ${type}`;
                if (c.column_default) {
                    // Simplify serial columns
                    if (c.column_default.includes('nextval')) {
                        def = `    ${c.column_name} SERIAL`;
                    } else {
                        def += ` DEFAULT ${c.column_default}`;
                    }
                }
                if (c.is_nullable === 'NO') def += ' NOT NULL';
                return def;
            });

            // Constraints (PK, FK, UNIQUE, CHECK)
            const constraints = await client.query(`
                SELECT tc.constraint_type, tc.constraint_name,
                       kcu.column_name,
                       ccu.table_name AS foreign_table,
                       ccu.column_name AS foreign_column,
                       cc.check_clause
                FROM information_schema.table_constraints tc
                LEFT JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                LEFT JOIN information_schema.constraint_column_usage ccu
                    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
                LEFT JOIN information_schema.check_constraints cc
                    ON tc.constraint_name = cc.constraint_name
                WHERE tc.table_schema = 'public' AND tc.table_name = $1
                ORDER BY tc.constraint_type
            `, [t.table_name]);

            for (const c of constraints.rows) {
                if (c.constraint_type === 'PRIMARY KEY') {
                    colDefs.push(`    PRIMARY KEY (${c.column_name})`);
                } else if (c.constraint_type === 'FOREIGN KEY') {
                    colDefs.push(`    FOREIGN KEY (${c.column_name}) REFERENCES ${c.foreign_table}(${c.foreign_column})`);
                } else if (c.constraint_type === 'UNIQUE') {
                    colDefs.push(`    UNIQUE (${c.column_name})`);
                }
            }

            sql += colDefs.join(',\n') + '\n);\n';
        }

        // 3. Scrie fisierul
        fs.writeFileSync('schema_export.sql', sql, 'utf8');
        console.log('✅ Schema exportata in schema_export.sql');
        console.log(`   Tabele: ${tables.rows.map(r => r.table_name).join(', ')}`);
        console.log(`   Tipuri ENUM: ${enums.rows.map(r => r.typname).join(', ')}`);

    } finally {
        client.release();
        await pool.end();
    }
}

exportSchema().catch(err => {
    console.error('❌ Eroare:', err.message);
    process.exit(1);
});
