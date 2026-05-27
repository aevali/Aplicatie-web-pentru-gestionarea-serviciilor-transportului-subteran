/**
 * ═══════════════════════════════════════════════════════
 * Seed: Metrouri & Orare — Metroul București
 * ═══════════════════════════════════════════════════════
 *
 * Rulare:  cd metro-app/backend && node seed/seedMetrouriOrare.js
 *
 * Ce face:
 *   1. Șterge datele existente din orare + metrouri
 *   2. Inserează metrouri (garnituri) pe fiecare magistrală
 *   3. Generează orare realiste (sosiri per stație) pentru zile lucrătoare
 *
 * Intervale de frecvență (zile lucrătoare):
 *   M1/M3/M4/M5: 10min (05-07), 4min (07-10), 10min (10-16), 4min (16-19), 10min (19-23)
 *   M2 (aglomerat): 8min (05-07), 3min (07-10), 7min (10-16), 3min (16-19), 8min (19-23)
 */

const pool = require('../db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { TRAVEL_TIMES } = require('../config/travelTimes');

// ═══════════════════════════════════════════
// CONFIGURARE METROURI
// ═══════════════════════════════════════════
const METROURI_CONFIG = {
    M1: { count: 8,  capacitate: 800  },
    M2: { count: 10, capacitate: 1000 },  // cea mai aglomerata
    M3: { count: 8,  capacitate: 800  },
    M4: { count: 6,  capacitate: 600  },
    M5: { count: 6,  capacitate: 600  },
};

// ═══════════════════════════════════════════
// CONFIGURARE FRECVENȚĂ PLECĂRI DIN CAPĂT
// ═══════════════════════════════════════════
const FREQUENCY = {
    standard: [
        { start: '05:00', end: '07:00', interval: 10 },
        { start: '07:00', end: '10:00', interval: 4  },
        { start: '10:00', end: '16:00', interval: 10 },
        { start: '16:00', end: '19:00', interval: 4  },
        { start: '19:00', end: '23:00', interval: 10 },
    ],
    M2: [
        { start: '05:00', end: '07:00', interval: 8 },
        { start: '07:00', end: '10:00', interval: 3 },
        { start: '10:00', end: '16:00', interval: 7 },
        { start: '16:00', end: '19:00', interval: 3 },
        { start: '19:00', end: '23:00', interval: 8 },
    ],
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function timeToMin(str) {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
}

function minToTime(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Generează toate orele de plecare din capăt pe baza intervalelor */
function generateDepartures(freqSlots) {
    const departures = [];
    for (const slot of freqSlots) {
        const startMin = timeToMin(slot.start);
        const endMin   = timeToMin(slot.end);
        for (let t = startMin; t < endMin; t += slot.interval) {
            departures.push(t);
        }
    }
    return departures;
}

// ═══════════════════════════════════════════
// SEED PRINCIPAL
// ═══════════════════════════════════════════
async function seed() {
    console.log('');
    console.log('🚇 ═══════════════════════════════════════');
    console.log('   Seed Metrouri & Orare');
    console.log('═══════════════════════════════════════════');
    console.log('');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // ─── 1. Curățare date existente ───
        console.log('🗑️  Ștergere date existente...');
        await client.query('DELETE FROM orare');
        await client.query('DELETE FROM metrouri');
        // Reset sequences
        await client.query("SELECT setval(pg_get_serial_sequence('metrouri', 'id_metrou'), 1, false)");
        await client.query("SELECT setval(pg_get_serial_sequence('orare', 'id_orar'), 1, false)");

        // Adaugă coloana sens dacă nu există
        try {
            await client.query("ALTER TABLE orare ADD COLUMN sens VARCHAR(10)");
            console.log('   + Coloană "sens" adăugată la tabela orare');
        } catch (e) {
            // Coloana există deja
        }
        console.log('   ✓ Tabele curățate\n');

        // ─── 2. Încarcă stații și magistrale din DB ───
        console.log('📍 Încărcare stații din baza de date...');
        const smRes = await client.query(`
            SELECT sm.magistrala, sm.pozitie, sm.id_statie, s.nume
            FROM statii_magistrale sm
            JOIN statii s ON s.id_statie = sm.id_statie
            ORDER BY sm.magistrala, sm.pozitie
        `);

        const lineStations = {};
        for (const row of smRes.rows) {
            if (!lineStations[row.magistrala]) lineStations[row.magistrala] = [];
            lineStations[row.magistrala].push(row);
        }

        const lineNames = Object.keys(lineStations).sort();
        console.log(`   ✓ ${smRes.rows.length} stații pe ${lineNames.length} magistrale (${lineNames.join(', ')})\n`);

        // Validare timpi de deplasare
        for (const line of lineNames) {
            const nStations = lineStations[line].length;
            const nTimes = (TRAVEL_TIMES[line] || []).length;
            if (nTimes !== nStations - 1) {
                throw new Error(`TRAVEL_TIMES[${line}] are ${nTimes} valori, dar sunt ${nStations} stații (ar trebui ${nStations - 1})`);
            }
        }

        // ─── 3. Inserare metrouri ───
        console.log('🚆 Inserare metrouri...');
        const metroIdsByLine = {};

        for (const line of lineNames) {
            const cfg = METROURI_CONFIG[line];
            if (!cfg) {
                console.log(`   ⚠️  Linia ${line} nu are config, skip.`);
                continue;
            }

            metroIdsByLine[line] = [];
            for (let i = 0; i < cfg.count; i++) {
                const res = await client.query(
                    `INSERT INTO metrouri (magistrala, capacitate_max, status)
                     VALUES ($1, $2, 'pe_traseu') RETURNING id_metrou`,
                    [line, cfg.capacitate]
                );
                metroIdsByLine[line].push(res.rows[0].id_metrou);
            }

            const ids = metroIdsByLine[line];
            console.log(`   ${line}: ${cfg.count} garnituri (cap. ${cfg.capacitate}) → IDs ${ids[0]}-${ids[ids.length - 1]}`);
        }

        const totalMetrouri = Object.values(metroIdsByLine).flat().length;
        console.log(`   ✓ Total: ${totalMetrouri} metrouri\n`);

        // ─── 4. Generare orare ───
        console.log('📅 Generare orare (zile lucrătoare)...');
        const allOrare = []; // { id_metrou, id_statie, tip_zi, ora_sosire, sens }

        for (const line of lineNames) {
            if (!metroIdsByLine[line]) continue;

            const stations  = lineStations[line];
            const times     = TRAVEL_TIMES[line];
            const freq      = line === 'M2' ? FREQUENCY.M2 : FREQUENCY.standard;
            const metros    = metroIdsByLine[line];
            const halfMetro = Math.floor(metros.length / 2);

            // Generăm plecări din ambele capete
            const departures = generateDepartures(freq);

            let lineOrareCount = 0;

            for (const dir of ['forward', 'reverse']) {
                const orderedStations = dir === 'forward'
                    ? [...stations]
                    : [...stations].reverse();
                const segTimes = dir === 'forward'
                    ? [...times]
                    : [...times].reverse();

                // Metrouri: prima jumătate pt forward, a doua pt reverse
                const dirMetros = dir === 'forward'
                    ? metros.slice(0, halfMetro)
                    : metros.slice(halfMetro);

                let metroIdx = 0;

                for (const depMin of departures) {
                    const metroId = dirMetros[metroIdx % dirMetros.length];
                    metroIdx++;

                    let currentMin = depMin;

                    for (let i = 0; i < orderedStations.length; i++) {
                        if (i > 0) {
                            currentMin += segTimes[i - 1];
                        }

                        // Nu depășim miezul nopții
                        if (currentMin >= 24 * 60) break;

                        allOrare.push({
                            id_metrou:  metroId,
                            id_statie:  orderedStations[i].id_statie,
                            tip_zi:     'lucratoare',
                            ora_sosire: minToTime(currentMin),
                            sens:       dir === 'forward' ? 'dus' : 'intors',
                        });
                        lineOrareCount++;
                    }
                }
            }

            console.log(`   ${line}: ${lineOrareCount} intrări (${stations.length} stații × ${departures.length} plecări × 2 sensuri)`);
        }

        console.log(`   ✓ Total: ${allOrare.length} rânduri orare\n`);

        // ─── 5. Inserare orare (batch) ───
        console.log('💾 Inserare orare în baza de date...');
        const CHUNK_SIZE = 1000;
        const totalChunks = Math.ceil(allOrare.length / CHUNK_SIZE);

        for (let i = 0; i < allOrare.length; i += CHUNK_SIZE) {
            const chunk = allOrare.slice(i, i + CHUNK_SIZE);
            const values = chunk.map(o =>
                `(${o.id_metrou}, ${o.id_statie}, '${o.tip_zi}', '${o.ora_sosire}', '${o.sens}')`
            ).join(',');

            await client.query(
                `INSERT INTO orare (id_metrou, id_statie, tip_zi, ora_sosire, sens) VALUES ${values}`
            );

            const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
            process.stdout.write(`   Lot ${chunkNum}/${totalChunks}... ✓\r`);
        }
        console.log(`   Toate ${totalChunks} loturi inserate ✓            \n`);

        // ─── 6. Creare index pentru performanță ───
        console.log('🔍 Creare indexuri...');
        // Ștergem indexul vechi fără sens
        await client.query('DROP INDEX IF EXISTS idx_orare_statie_zi_ora');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_orare_statie_zi_sens_ora 
            ON orare(id_statie, tip_zi, sens, ora_sosire)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_orare_metrou 
            ON orare(id_metrou)
        `);
        console.log('   ✓ Indexuri create\n');

        // ─── COMMIT ───
        await client.query('COMMIT');

        // ─── Sumar ───
        console.log('═══════════════════════════════════════════');
        console.log('✅ Seed finalizat cu succes!');
        console.log('═══════════════════════════════════════════');
        console.log(`   🚆 Metrouri: ${totalMetrouri}`);
        console.log(`   📅 Orare:    ${allOrare.length}`);
        console.log(`   📊 Program:  05:00 – 23:00 (zile lucrătoare)`);
        console.log('');
        console.log('   Frecvențe M1/M3/M4/M5:');
        console.log('     05-07: la 10 min | 07-10: la 4 min');
        console.log('     10-16: la 10 min | 16-19: la 4 min');
        console.log('     19-23: la 10 min');
        console.log('');
        console.log('   Frecvențe M2 (aglomerat):');
        console.log('     05-07: la 8 min  | 07-10: la 3 min');
        console.log('     10-16: la 7 min  | 16-19: la 3 min');
        console.log('     19-23: la 8 min');
        console.log('');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('');
        console.error('❌ Eroare la seed:', err.message);
        console.error(err.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
