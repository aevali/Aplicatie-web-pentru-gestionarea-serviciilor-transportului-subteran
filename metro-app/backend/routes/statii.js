const express = require('express');
const router = express.Router();
const pool = require('../db');
const { TRAVEL_TIMES, TRANSFER_TIMES, PLATFORM_CHANGE_TIME, WAIT_TIME_TRANSFER } = require('../config/travelTimes');

// GET /api/statii — returnează toate stațiile + magistralele (public, fără auth)
router.get('/', async (req, res) => {
    try {
        const statiiRes = await pool.query(`
            SELECT s.id_statie, s.nume, s.este_nod,
                   COALESCE(json_agg(
                       json_build_object('magistrala', sm.magistrala, 'pozitie', sm.pozitie)
                       ORDER BY sm.magistrala
                   ) FILTER (WHERE sm.magistrala IS NOT NULL), '[]') AS magistrale
            FROM statii s
            LEFT JOIN statii_magistrale sm ON s.id_statie = sm.id_statie
            GROUP BY s.id_statie, s.nume, s.este_nod
            ORDER BY s.id_statie
        `);

        const magistraleRes = await pool.query(`
            SELECT sm.magistrala, sm.pozitie, s.id_statie, s.nume, s.este_nod
            FROM statii_magistrale sm
            JOIN statii s ON s.id_statie = sm.id_statie
            ORDER BY sm.magistrala, sm.pozitie
        `);

        const magistrale = {};
        for (const row of magistraleRes.rows) {
            if (!magistrale[row.magistrala]) magistrale[row.magistrala] = [];
            magistrale[row.magistrala].push({
                id_statie: row.id_statie,
                nume: row.nume,
                pozitie: row.pozitie,
                este_nod: row.este_nod,
            });
        }

        res.json({
            statii: statiiRes.rows,
            magistrale,
        });
    } catch (err) {
        console.error('Eroare /api/statii:', err.message);
        res.status(500).json({ mesaj: 'Eroare server.' });
    }
});

// module.exports mutat la sfârșitul fișierului

/* ═══════════════════════════════════════════
   Perechi de corespondență (transfer fizic)
═══════════════════════════════════════════ */
const TRANSFER_PAIRS = [
    [17, 26],  // Piata Victoriei 1 ↔ 2
    [9,  29],  // Piata Unirii 1 ↔ 2
    [16, 47],  // Gara de Nord 1 ↔ 2
    [15, 48],  // Basarab ↔ Basarab 2
    [5,  41],  // Nicolae Grigorescu 1 ↔ 2
    [11, 64],  // Eroilor ↔ Eroilor 2
    [6,  22],  // Dristor 1 ↔ Dristor 2
];

const COST_TRAVEL   = 2;  // călătorie între 2 stații consecutive
const COST_PLATFORM = 1;  // schimb linie pe aceeași stație (peron comun)
const COST_TRANSFER = 4;  // transfer fizic (mers pe jos între stații pereche)

/* ═══════════════════════════════════════════
   Dijkstra — calcul rută optimă
═══════════════════════════════════════════ */
function buildGraph(magistrale, stationLines) {
    const graph = {};
    const ensure = (n) => { if (!graph[n]) graph[n] = []; };
    const addEdge = (a, b, w, type) => {
        ensure(a); ensure(b);
        graph[a].push({ to: b, weight: w, type });
        graph[b].push({ to: a, weight: w, type });
    };

    // 1. Stații consecutive pe aceeași magistrală
    for (const [mag, stations] of Object.entries(magistrale)) {
        const sorted = [...stations].sort((a, b) => a.pozitie - b.pozitie);
        for (let i = 0; i < sorted.length - 1; i++) {
            addEdge(
                `${sorted[i].id_statie}_${mag}`,
                `${sorted[i + 1].id_statie}_${mag}`,
                COST_TRAVEL, 'travel'
            );
        }
    }

    // 2. Aceeași stație pe linii diferite (peron comun / schimb gratuit)
    for (const [stId, lines] of Object.entries(stationLines)) {
        for (let i = 0; i < lines.length; i++) {
            for (let j = i + 1; j < lines.length; j++) {
                addEdge(`${stId}_${lines[i]}`, `${stId}_${lines[j]}`,
                    COST_PLATFORM, 'same_platform');
            }
        }
    }

    // 3. Perechi de corespondență (stații diferite, transfer fizic)
    for (const [a, b] of TRANSFER_PAIRS) {
        const lA = stationLines[a] || [];
        const lB = stationLines[b] || [];
        for (const la of lA) {
            for (const lb of lB) {
                addEdge(`${a}_${la}`, `${b}_${lb}`, COST_TRANSFER, 'transfer');
            }
        }
    }

    return graph;
}

function dijkstra(graph, startId, endId, stationLines) {
    const startLines = stationLines[startId] || [];
    const endLines   = stationLines[endId]   || [];

    const dist = {};
    const prev = {};
    const visited = new Set();

    for (const node of Object.keys(graph)) dist[node] = Infinity;
    for (const l of startLines) dist[`${startId}_${l}`] = 0;

    while (true) {
        let minNode = null, minDist = Infinity;
        for (const [node, d] of Object.entries(dist)) {
            if (!visited.has(node) && d < minDist) { minDist = d; minNode = node; }
        }
        if (!minNode || minDist === Infinity) break;
        visited.add(minNode);

        const [nId] = minNode.split('_');
        if (parseInt(nId) === endId) break;

        for (const edge of (graph[minNode] || [])) {
            if (visited.has(edge.to)) continue;
            const nd = dist[minNode] + edge.weight;
            if (nd < dist[edge.to]) {
                dist[edge.to] = nd;
                prev[edge.to] = { from: minNode, type: edge.type };
            }
        }
    }

    // Găsește cel mai bun nod destinație
    let bestEnd = null, bestDist = Infinity;
    for (const l of endLines) {
        const node = `${endId}_${l}`;
        if ((dist[node] ?? Infinity) < bestDist) { bestDist = dist[node]; bestEnd = node; }
    }

    if (!bestEnd || bestDist === Infinity) return null;

    // Trace path
    const path = [];
    let cur = bestEnd;
    while (cur) {
        const [stId, mag] = cur.split('_');
        path.unshift({ id_statie: parseInt(stId), magistrala: mag });
        cur = prev[cur]?.from || null;
    }
    return path;
}

// GET /api/statii/ruta?start=ID&end=ID
router.get('/ruta', async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ mesaj: 'Parametrii start și end sunt obligatorii.' });

    const startId = parseInt(start);
    const endId   = parseInt(end);
    if (startId === endId) return res.status(400).json({ mesaj: 'Stația de plecare și destinația trebuie să fie diferite.' });

    try {
        const statiiRes = await pool.query('SELECT * FROM statii ORDER BY id_statie');
        const smRes     = await pool.query('SELECT * FROM statii_magistrale ORDER BY magistrala, pozitie');

        const statii = {};
        for (const s of statiiRes.rows) statii[s.id_statie] = s;

        if (!statii[startId] || !statii[endId]) {
            return res.status(404).json({ mesaj: 'Stație negăsită.' });
        }

        const magistrale = {};
        const stationLines = {};
        for (const sm of smRes.rows) {
            if (!magistrale[sm.magistrala]) magistrale[sm.magistrala] = [];
            magistrale[sm.magistrala].push(sm);
            if (!stationLines[sm.id_statie]) stationLines[sm.id_statie] = [];
            stationLines[sm.id_statie].push(sm.magistrala);
        }

        const graph = buildGraph(magistrale, stationLines);
        const path  = dijkstra(graph, startId, endId, stationLines);

        if (!path) return res.status(404).json({ mesaj: 'Nu s-a găsit nicio rută.' });

        // Grupează în segmente per magistrală
        const segments = [];
        let seg = null;
        for (const step of path) {
            const st = statii[step.id_statie];
            if (!seg || seg.magistrala !== step.magistrala) {
                if (seg) segments.push(seg);
                seg = { magistrala: step.magistrala, statii: [] };
            }
            seg.statii.push({ id_statie: st.id_statie, nume: st.nume, este_nod: st.este_nod });
        }
        if (seg) segments.push(seg);

        const uniqueStations = new Set(path.map(p => p.id_statie)).size;

        // ── Calcul timp estimat realist ──
        const posLookup = {};
        for (const sm of smRes.rows) {
            posLookup[`${sm.id_statie}_${sm.magistrala}`] = sm.pozitie;
        }

        let timp_estimat = 0;
        for (let si = 0; si < segments.length; si++) {
            const seg = segments[si];
            const times = TRAVEL_TIMES[seg.magistrala] || [];

            for (let i = 0; i < seg.statii.length - 1; i++) {
                const posA = posLookup[`${seg.statii[i].id_statie}_${seg.magistrala}`];
                const posB = posLookup[`${seg.statii[i + 1].id_statie}_${seg.magistrala}`];
                if (posA !== undefined && posB !== undefined) {
                    const fromIdx = Math.min(posA, posB) - 1;
                    timp_estimat += times[fromIdx] || 2;
                }
            }

            // Adaugă timp de transfer între segmente
            if (si > 0) {
                const prevSeg = segments[si - 1];
                const prevLast = prevSeg.statii[prevSeg.statii.length - 1].id_statie;
                const curFirst = seg.statii[0].id_statie;

                if (prevLast === curFirst) {
                    timp_estimat += PLATFORM_CHANGE_TIME + WAIT_TIME_TRANSFER;
                } else {
                    const key = [prevLast, curFirst].sort((a, b) => a - b).join('-');
                    timp_estimat += (TRANSFER_TIMES[key] || 8) + WAIT_TIME_TRANSFER;
                }
            }
        }

        res.json({
            ruta: segments,
            total_statii: uniqueStations,
            schimbari: Math.max(0, segments.length - 1),
            plecare: statii[startId].nume,
            destinatie: statii[endId].nume,
            timp_estimat,
        });
    } catch (err) {
        console.error('Eroare /api/statii/ruta:', err.message);
        res.status(500).json({ mesaj: 'Eroare server.' });
    }
});

// ═══════════════════════════════════════════
// GET /api/statii/sosiri — următoarele sosiri
// Query: id_statie, magistrala, ora (HH:MM), id_statie_next (pt direcție)
// ═══════════════════════════════════════════
router.get('/sosiri', async (req, res) => {
    const { id_statie, magistrala, ora, id_statie_next } = req.query;

    if (!id_statie || !magistrala) {
        return res.status(400).json({ mesaj: 'Parametrii id_statie și magistrala sunt obligatorii.' });
    }

    const now = ora || new Date().toLocaleTimeString('ro-RO', {
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: 'Europe/Bucharest'
    });

    try {
        const tipZi = 'lucratoare';
        let sens = null;

        // Determină sensul din pozițiile stațiilor pe magistrală
        if (id_statie_next) {
            const posRes = await pool.query(`
                SELECT id_statie, pozitie FROM statii_magistrale
                WHERE magistrala = $1 AND id_statie IN ($2, $3)
            `, [magistrala, id_statie, id_statie_next]);

            const posMap = {};
            for (const r of posRes.rows) posMap[r.id_statie] = r.pozitie;

            const posCurr = posMap[parseInt(id_statie)];
            const posNext = posMap[parseInt(id_statie_next)];

            if (posCurr !== undefined && posNext !== undefined) {
                sens = posNext > posCurr ? 'dus' : 'intors';
            }
        }

        let result;

        if (sens) {
            result = await pool.query(`
                SELECT DISTINCT o.ora_sosire
                FROM orare o
                JOIN metrouri m ON o.id_metrou = m.id_metrou
                WHERE o.id_statie = $1
                  AND m.magistrala = $2
                  AND o.tip_zi = $3
                  AND o.ora_sosire > $4::time
                  AND o.sens = $5
                ORDER BY o.ora_sosire
                LIMIT 3
            `, [id_statie, magistrala, tipZi, now, sens]);
        } else {
            result = await pool.query(`
                SELECT DISTINCT o.ora_sosire
                FROM orare o
                JOIN metrouri m ON o.id_metrou = m.id_metrou
                WHERE o.id_statie = $1
                  AND m.magistrala = $2
                  AND o.tip_zi = $3
                  AND o.ora_sosire > $4::time
                ORDER BY o.ora_sosire
                LIMIT 3
            `, [id_statie, magistrala, tipZi, now]);
        }

        // Obține numele stației
        const statieRes = await pool.query(
            'SELECT nume FROM statii WHERE id_statie = $1',
            [id_statie]
        );

        const numeStatie = statieRes.rows[0]?.nume || '—';

        // Calculează minutele rămase
        const [nowH, nowM] = now.split(':').map(Number);
        const nowMin = nowH * 60 + nowM;

        const urmatoarele = result.rows.map(row => {
            const timeStr = row.ora_sosire.substring(0, 5);
            const [h, m] = timeStr.split(':').map(Number);
            const arrMin = h * 60 + m;
            return {
                ora_sosire: timeStr,
                in_minute: Math.max(0, arrMin - nowMin),
            };
        });

        res.json({
            statie: numeStatie,
            magistrala,
            sens,
            urmatoarele,
        });
    } catch (err) {
        console.error('Eroare /api/statii/sosiri:', err.message);
        res.status(500).json({ mesaj: 'Eroare server.' });
    }
});

module.exports = router;
