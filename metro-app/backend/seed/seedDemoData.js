// Populeaza baza de date cu date istorice realiste: calatori, bilete, abonamente,
// cereri de reducere, tickete suport, calatorii efectuate, pase turistice, notificari, anunturi.
// Rulare: node seed/seedDemoData.js  (adauga --force ca sa ruleze chiar daca pare deja populata)

const bcrypt = require('bcrypt');
const pool   = require('../db');

const FORCE = process.argv.includes('--force');
const PAROLA_CALATOR = 'Parola123!';
const PAROLA_ANGAJAT = 'Angajat123!';
const ZILE_ISTORIC   = 420; // ~14 luni

/* ─────────────────────────────────────────────────────────────────────────────
   Tabele de preturi / reguli — copiate din routes/bilete.js si routes/tourist.js
───────────────────────────────────────────────────────────────────────────── */
const PRETURI_BILETE      = { 1: 5.00, 2: 10.00, 5: 25.00, 10: 45.00, 20: 80.00 };
const PRETURI_ABONAMENTE  = { zi: 12.00, trei_zile: 35.00, saptamana: 45.00, luna: 100.00, sase_luni: 500.00, an: 900.00 };
const ABONAMENTE_CU_REDUCERE = new Set(['zi', 'trei_zile', 'saptamana', 'luna']);
const REDUCERE_PROCENT    = { elev: 1.00, student: 0.90, pensionar: 0.50, adult: 0.00 };
const ZILE_VALABILITATE   = { zi: 1, trei_zile: 3, saptamana: 7, luna: 30, sase_luni: 180, an: 365 };
const PRETURI_TOURIST     = { 1: 6.00, 2: 12.00, 3: 16.00, 4: 20.00, 5: 24.00, 7: 40.00 };

/* ─────────────────────────────────────────────────────────────────────────────
   Date de referinta
───────────────────────────────────────────────────────────────────────────── */
const NUME = ['Popescu', 'Ionescu', 'Popa', 'Stan', 'Stoica', 'Gheorghe', 'Constantin', 'Rusu', 'Dumitru', 'Marin',
    'Tudor', 'Matei', 'Barbu', 'Nistor', 'Radu', 'Cristea', 'Toma', 'Enache', 'Diaconu', 'Voicu',
    'Ciobanu', 'Sandu', 'Preda', 'Munteanu', 'Neagu', 'Dobre', 'Iordache', 'Anghel', 'Serban', 'Coman'];
const PRENUME = ['Andrei', 'Mihai', 'Alexandru', 'Stefan', 'Ionut', 'Cristian', 'Florin', 'Gabriel', 'Adrian', 'Marius',
    'Bogdan', 'Daniel', 'Razvan', 'Catalin', 'Vlad', 'Cosmin', 'Sorin', 'Dragos', 'Eduard',
    'Maria', 'Elena', 'Ioana', 'Andreea', 'Alexandra', 'Gabriela', 'Cristina', 'Diana', 'Raluca',
    'Simona', 'Mihaela', 'Florentina', 'Georgiana', 'Larisa', 'Adriana', 'Camelia', 'Nicoleta', 'Roxana', 'Bianca', 'Corina'];
const DOMENII_EMAIL = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];

const SUBIECTE_TICHET = [
    'Nu pot cumpara abonament lunar din aplicatie', 'Codul QR nu se scaneaza la turnichet',
    'Cererea de reducere a fost respinsa, cred ca e o greseala', 'Vreau sa transfer biletul catre alt cont',
    'Aplicatia nu imi arata biletul cumparat', 'Cum imi recuperez parola contului?',
    'Cardul turistic nu a fost preluat de la statie', 'Diferenta de pret la reinnoirea abonamentului',
    'Primesc notificari duplicate', 'Solicit rambursare pentru un bilet neutilizat',
    'Contul meu s-a blocat dupa schimbarea parolei', 'Nu apare reducerea de student la cumparare',
    'Abonamentul s-a activat cu o zi mai tarziu', 'Nu gasesc optiunea de descarcare a facturii',
    'Statia din care am ridicat cardul turistic e gresita', 'Aplicatia se inchide la scanarea codului QR',
    'Am fost taxat de doua ori pentru acelasi bilet', 'Nu pot incarca documentele pentru cererea de reducere',
];
const MESAJE_INITIALE = [
    'Buna ziua, am intampinat o problema si as avea nevoie de ajutor.',
    'Salut, de cateva zile am aceasta problema si nu stiu cum sa o rezolv.',
    'Buna, va scriu pentru ca nu gasesc o solutie singur/a in aplicatie.',
    'Buna ziua, sper sa ma puteti ajuta cat mai repede posibil.',
];
const RASPUNSURI_ANGAJAT = [
    'Buna ziua! Multumim ca ne-ati contactat, am verificat contul dvs. si problema a fost rezolvata.',
    'Am gasit cauza problemei si am facut corectia necesara la cont, ne cerem scuze pentru neplacere.',
    'Am inteles problema, am aplicat o corectie manuala. Va rugam reincercati acum.',
    'Puteti reincerca acum? Am facut o modificare la contul dvs. care ar trebui sa rezolve problema.',
];
const REZUMATE_REZOLVARE = [
    'Problema a fost cauzata de un cache vechi al aplicatiei; am resetat sesiunea si acum functioneaza corect.',
    'Documentul incarcat a fost validat manual, reducerea a fost aplicata la cont.',
    'A fost o eroare temporara de sincronizare cu baza de date; biletul apare acum corect.',
    'Am identificat dublarea platii si am anulat tranzactia in plus.',
    'Cardul turistic a fost realocat la statia corecta de ridicare.',
    'Parola contului a fost resetata manual si am trimis instructiuni pe email.',
];
const MOTIVE_RESPINGERE = [
    'Documentul incarcat este ilizibil, va rugam reincarcati o poza mai clara.',
    'Legitimatia de student pare expirata.',
    'CNP-ul din document nu corespunde cu cel din cont.',
    'Lipseste pagina cu fotografia din documentul incarcat.',
];
const ANUNTURI_POOL = [
    { titlu: 'Mentenanta programata pe Magistrala M2', continut: 'In weekend, intre orele 23:00-05:00, circulatia pe M2 va fi intrerupta pentru lucrari de mentenanta.', nivel_importanta: 'important' },
    { titlu: 'Actualizare aplicatie — transfer de bilete', continut: 'Am adaugat o functie noua care permite transferul biletelor neutilizate catre alt cont.', nivel_importanta: 'info' },
    { titlu: 'Circulatie suplimentara de sarbatori', continut: 'In perioada sarbatorilor, trenurile vor circula cu frecventa marita pe toate liniile.', nivel_importanta: 'info' },
    { titlu: 'Atentie: tentativa de frauda prin SMS', continut: 'Va atentionam ca circula mesaje SMS false care solicita date de card. Nu accesati linkurile din aceste mesaje.', nivel_importanta: 'urgent' },
    { titlu: 'Extindere program call-center', continut: 'Programul call-center-ului a fost extins, acum raspundem si sambata intre 09:00-14:00.', nivel_importanta: 'info' },
    { titlu: 'Reduceri suplimentare pentru turisti', continut: 'Posesorii de card turistic beneficiaza acum de reduceri la muzeele partenere.', nivel_importanta: 'info' },
    { titlu: 'Inchidere temporara statie Piata Unirii 1', continut: 'Din cauza lucrarilor de renovare, accesul dinspre strada va fi limitat timp de 3 zile.', nivel_importanta: 'urgent' },
    { titlu: 'Sondaj de satisfactie calatori', continut: 'Va invitam sa completati sondajul de satisfactie disponibil in aplicatie, la sectiunea Cont.', nivel_importanta: 'info' },
];
const TARI_TURISTI = ['Germania', 'Franta', 'Italia', 'Spania', 'Marea Britanie', 'Olanda', 'Austria', 'Polonia', 'SUA', 'Japonia', 'Ungaria', 'Republica Moldova'];
const PRENUME_TURISTI = ['John', 'Emma', 'Hans', 'Marie', 'Luca', 'Sofia', 'Anna', 'Peter', 'Yuki', 'Carlos', 'Olga', 'Marco'];

/* ─────────────────────────────────────────────────────────────────────────────
   Helpere generice
───────────────────────────────────────────────────────────────────────────── */
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[randInt(0, arr.length - 1)]; }
function randWeighted(pairs) {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [value, weight] of pairs) {
        if (r < weight) return value;
        r -= weight;
    }
    return pairs[pairs.length - 1][0];
}
function pickTwoDistinct(arr) {
    const a = randChoice(arr);
    let b = randChoice(arr);
    for (let i = 0; i < 10 && b.id_calator === a.id_calator; i++) b = randChoice(arr);
    return [a, b];
}
function daysAgo(n) { return new Date(Date.now() - n * 86400000); }
function randDateBetween(minDaysAgo, maxDaysAgo) {
    const lo = Math.min(minDaysAgo, maxDaysAgo);
    const hi = Math.max(minDaysAgo, maxDaysAgo);
    return daysAgo(lo + Math.random() * (hi - lo));
}
function addDays(date, n) { return new Date(date.getTime() + n * 86400000); }
function clampNow(d) { const now = new Date(); return d > now ? now : d; }
function toDateStr(d) { return d.toISOString().slice(0, 10); }
function randDigits(n) { let s = ''; for (let i = 0; i < n; i++) s += randInt(0, 9); return s; }
function round2(n) { return Math.round(n * 100) / 100; }

const usedEmails = new Set();
function uniqueCalatorEmail(prenume, nume) {
    let email;
    do { email = `${prenume.toLowerCase()}.${nume.toLowerCase()}${randInt(1, 999)}@${randChoice(DOMENII_EMAIL)}`; }
    while (usedEmails.has(email));
    usedEmails.add(email);
    return email;
}
const usedCnp = new Set();
function uniqueCnp() {
    let cnp;
    do { cnp = String(randInt(1, 8)) + randDigits(12); }
    while (usedCnp.has(cnp));
    usedCnp.add(cnp);
    return cnp;
}
const CHARS_COD_RIDICARE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // fara I, O, 0, 1 — la fel ca in tourist.js
const usedCoduri = new Set();
function genereazaCodRidicare() {
    let cod;
    do {
        cod = 'RO-';
        for (let i = 0; i < 6; i++) cod += CHARS_COD_RIDICARE.charAt(randInt(0, CHARS_COD_RIDICARE.length - 1));
    } while (usedCoduri.has(cod));
    usedCoduri.add(cod);
    return cod;
}
function normalizeaza(str) {
    return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.');
}
async function genereazaEmailAngajat(client, prenume, nume) {
    const baza = `${normalizeaza(prenume)}.${normalizeaza(nume)}`;
    let email = `${baza}@metrou.ro`;
    let contor = 2;
    while (true) {
        const existent = await client.query('SELECT id_angajat FROM angajati WHERE email = $1', [email]);
        if (existent.rows.length === 0) break;
        email = `${baza}${contor}@metrou.ro`;
        contor++;
    }
    return email;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Script principal
───────────────────────────────────────────────────────────────────────────── */
async function main() {
    const client = await pool.connect();
    try {
        const countRes = await client.query('SELECT COUNT(*) FROM calatori');
        if (parseInt(countRes.rows[0].count, 10) >= 25 && !FORCE) {
            console.log(`Se pare ca scriptul a mai rulat (${countRes.rows[0].count} calatori existenti). Foloseste --force ca sa adaugi oricum.`);
            return;
        }

        await client.query('BEGIN');

        const statiiRes = await client.query('SELECT id_statie, nume FROM statii ORDER BY id_statie');
        const statii = statiiRes.rows;
        if (statii.length === 0) throw new Error('Nu exista statii in baza de date.');

        /* ── 1. Angajati noi ── */
        const angajatiNoi = [
            { nume: 'Toader', prenume: 'Cristina' },
            { nume: 'Barbu', prenume: 'Mihnea' },
        ];
        const parolaAngajatHash = await bcrypt.hash(PAROLA_ANGAJAT, 10);
        for (const a of angajatiNoi) {
            const email = await genereazaEmailAngajat(client, a.prenume, a.nume);
            await client.query(
                `INSERT INTO angajati (nume, prenume, email, parola, rol) VALUES ($1,$2,$3,$4,'angajat')`,
                [a.nume, a.prenume, email, parolaAngajatHash]
            );
        }
        const angajatiRes = await client.query('SELECT id_angajat, rol FROM angajati');
        const angajatiIds = angajatiRes.rows.map(r => r.id_angajat);
        const adminIds = angajatiRes.rows.filter(r => r.rol === 'admin').map(r => r.id_angajat);

        /* ── 2. Calatori noi ── */
        const NR_CALATORI_NOI = 30;
        const parolaCalatorHash = await bcrypt.hash(PAROLA_CALATOR, 10);
        for (let i = 0; i < NR_CALATORI_NOI; i++) {
            const prenume = randChoice(PRENUME);
            const nume = randChoice(NUME);
            const tip = randWeighted([['adult', 55], ['student', 22], ['elev', 15], ['pensionar', 8]]);
            const email = uniqueCalatorEmail(prenume, nume);
            const cnp = uniqueCnp();
            await client.query(
                `INSERT INTO calatori (nume, prenume, email, cnp, parola, tip) VALUES ($1,$2,$3,$4,$5,$6)`,
                [nume, prenume, email, cnp, parolaCalatorHash, tip]
            );
        }
        const calatoriRes = await client.query('SELECT id_calator, tip FROM calatori');
        const calatoriPool = calatoriRes.rows;

        /* ── 3. Cereri reducere ── */
        const eligibiliReducere = calatoriPool.filter(c => c.tip !== 'adult');
        const NR_CERERI = 18;
        const calatorAreAprobata = new Map();

        for (let i = 0; i < NR_CERERI && eligibiliReducere.length > 0; i++) {
            const c = randChoice(eligibiliReducere);
            const createdAt = randDateBetween(1, ZILE_ISTORIC);
            const status = randWeighted([['aprobata', 55], ['respinsa', 20], ['in_asteptare', 25]]);
            const procesat = status !== 'in_asteptare';
            const idAngajat = procesat ? randChoice(angajatiIds) : null;
            const updatedAt = procesat ? clampNow(addDays(createdAt, randInt(1, 5))) : createdAt;
            const motivRespingere = status === 'respinsa' ? randChoice(MOTIVE_RESPINGERE) : null;
            const caleDocument = JSON.stringify([`documente/calator_${c.id_calator}_${createdAt.getTime()}_${randInt(100, 999)}.jpg`]);

            await client.query(
                `INSERT INTO cereri_reducere (id_calator, tip_solicitat, cale_document, status, id_angajat, motiv_respingere, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [c.id_calator, c.tip, caleDocument, status, idAngajat, motivRespingere, createdAt, updatedAt]
            );

            if (status === 'aprobata') calatorAreAprobata.set(c.id_calator, true);
        }

        /* ── 4. Bilete ── */
        const NR_BILETE = 40;
        const optiuniBilete = Object.keys(PRETURI_BILETE).map(Number);
        const biletePool = [];
        for (let i = 0; i < NR_BILETE; i++) {
            const c = randChoice(calatoriPool);
            const numarCalatorii = randChoice(optiuniBilete);
            const dataAchizitie = randDateBetween(1, ZILE_ISTORIC);
            const pret = PRETURI_BILETE[numarCalatorii];
            const r = await client.query(
                `INSERT INTO bilete (id_calator, numar_calatorii, numar_calatorii_ramase, data_achizitie, pret, activ, reducere_aplicata)
                 VALUES ($1,$2,$2,$3,$4,TRUE,FALSE) RETURNING id_bilet`,
                [c.id_calator, numarCalatorii, toDateStr(dataAchizitie), pret]
            );
            biletePool.push({ sursaTip: 'bilet', id_bilet: r.rows[0].id_bilet, id_calator: c.id_calator, ramase: numarCalatorii, data_achizitie: dataAchizitie });
        }

        /* ── 5. Abonamente ── */
        const NR_ABONAMENTE = 35;
        const abonamentePool = [];
        for (let i = 0; i < NR_ABONAMENTE; i++) {
            const c = randChoice(calatoriPool);
            const tip = randWeighted([['luna', 35], ['saptamana', 25], ['zi', 15], ['trei_zile', 10], ['sase_luni', 10], ['an', 5]]);
            const dataAchizitie = randDateBetween(1, ZILE_ISTORIC);
            const dataExpirare = addDays(dataAchizitie, ZILE_VALABILITATE[tip]);
            const areReducere = c.tip !== 'adult' && ABONAMENTE_CU_REDUCERE.has(tip) && calatorAreAprobata.get(c.id_calator);
            const pretBaza = PRETURI_ABONAMENTE[tip];
            const pret = areReducere ? round2(pretBaza * (1 - REDUCERE_PROCENT[c.tip])) : pretBaza;

            const r = await client.query(
                `INSERT INTO abonamente (id_calator, tip, data_achizitie, data_expirare, pret, reducere_aplicata)
                 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_abonament`,
                [c.id_calator, tip, toDateStr(dataAchizitie), toDateStr(dataExpirare), pret, !!areReducere]
            );
            abonamentePool.push({ sursaTip: 'abonament', id_abonament: r.rows[0].id_abonament, id_calator: c.id_calator, tip, data_achizitie: dataAchizitie, data_expirare: dataExpirare });
        }

        /* ── 6. Calatorii efectuate (scanari) ── */
        const NR_SCANARI = 40;
        for (let i = 0; i < NR_SCANARI; i++) {
            let sursa = null;
            if (Math.random() < 0.55) {
                const candidati = biletePool.filter(b => b.ramase > 0);
                if (candidati.length) sursa = randChoice(candidati);
            }
            if (!sursa) {
                const candidati = abonamentePool.filter(a => a.data_achizitie.getTime() <= Date.now());
                if (candidati.length) sursa = randChoice(candidati);
            }
            if (!sursa) continue;

            const statie = randChoice(statii);
            let scanatLa;
            if (sursa.sursaTip === 'bilet') {
                const varstaZile = Math.max(0, (Date.now() - sursa.data_achizitie.getTime()) / 86400000);
                scanatLa = randDateBetween(0, varstaZile);
                sursa.ramase -= 1;
            } else {
                const capat = Math.min(Date.now(), sursa.data_expirare.getTime());
                const start = sursa.data_achizitie.getTime();
                scanatLa = new Date(start + Math.random() * Math.max(0, capat - start));
            }

            await client.query(
                `INSERT INTO calatorii_efectuate (id_calator, id_statie, id_bilet, id_abonament, scanat_la)
                 VALUES ($1,$2,$3,$4,$5)`,
                [sursa.id_calator, statie.id_statie,
                    sursa.sursaTip === 'bilet' ? sursa.id_bilet : null,
                    sursa.sursaTip === 'abonament' ? sursa.id_abonament : null,
                    scanatLa]
            );
        }
        for (const b of biletePool) {
            await client.query('UPDATE bilete SET numar_calatorii_ramase = $1 WHERE id_bilet = $2', [b.ramase, b.id_bilet]);
        }

        /* ── 7. Tickete suport + mesaje ── */
        const NR_TICHETE = 15;
        const ticketsPool = [];
        for (let i = 0; i < NR_TICHETE; i++) {
            const c = randChoice(calatoriPool);
            const subiect = randChoice(SUBIECTE_TICHET);
            const createdAt = randDateBetween(1, ZILE_ISTORIC);
            const status = randWeighted([['deschis', 20], ['in_lucru', 15], ['rezolvat', 30], ['inchis', 35]]);
            const areAngajat = status !== 'deschis';
            const idAngajat = areAngajat ? randChoice(angajatiIds) : null;
            const rezumat = ['rezolvat', 'inchis'].includes(status) ? randChoice(REZUMATE_REZOLVARE) : null;
            const rating = status === 'inchis' ? randInt(3, 5) : null;

            let updatedAt = createdAt;
            if (status === 'in_lucru') updatedAt = clampNow(addDays(createdAt, randInt(0, 2)));
            if (status === 'rezolvat') updatedAt = clampNow(addDays(createdAt, randInt(1, 5)));
            if (status === 'inchis') updatedAt = clampNow(addDays(createdAt, randInt(2, 7)));

            const lastSeenCalator = status === 'inchis' ? updatedAt : (status === 'rezolvat' && Math.random() < 0.4 ? updatedAt : null);

            const r = await client.query(
                `INSERT INTO tickets_suport (id_calator, id_angajat, subiect, status, rezumat, rating, created_at, updated_at, last_seen_calator)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id_ticket`,
                [c.id_calator, idAngajat, subiect, status, rezumat, rating, createdAt, updatedAt, lastSeenCalator]
            );
            const idTicket = r.rows[0].id_ticket;
            ticketsPool.push({ id_ticket: idTicket, id_calator: c.id_calator, id_angajat: idAngajat, status, created_at: createdAt, updated_at: updatedAt, rezumat });

            await client.query(
                `INSERT INTO mesaje_ticket (id_ticket, expeditor_tip, expeditor_id, continut, created_at) VALUES ($1,'calator',$2,$3,$4)`,
                [idTicket, c.id_calator, randChoice(MESAJE_INITIALE), createdAt]
            );
            if (areAngajat) {
                const raspunsLa = clampNow(addDays(createdAt, randInt(0, 1)));
                await client.query(
                    `INSERT INTO mesaje_ticket (id_ticket, expeditor_tip, expeditor_id, continut, created_at) VALUES ($1,'angajat',$2,$3,$4)`,
                    [idTicket, idAngajat, randChoice(RASPUNSURI_ANGAJAT), raspunsLa]
                );
            }
        }

        /* ── 8. Notificari ── */
        const NR_NOTIFICARI = 20;
        const ticketeAngajate = ticketsPool.filter(t => t.id_angajat);
        const ticketeRezolvate = ticketsPool.filter(t => t.rezumat);

        for (let i = 0; i < NR_NOTIFICARI; i++) {
            const tip = randWeighted([
                ['ticket_nou', 3], ['ticket_acceptat', 2], ['ticket_rezolvat', 2],
                ['mesaj_ticket', 2], ['reinoire_abonament', 3], ['transfer_bilet', 3], ['info', 5],
            ]);
            let mesaj, idCalator, createdAt;
            const citita = Math.random() < 0.65;

            if (tip === 'ticket_nou' && ticketsPool.length) {
                const t = randChoice(ticketsPool);
                mesaj = `🎫 Ticket nou #${t.id_ticket} de la un calator`;
                idCalator = t.id_calator; createdAt = t.created_at;
            } else if (tip === 'ticket_acceptat' && ticketeAngajate.length) {
                const t = randChoice(ticketeAngajate);
                mesaj = `✅ Un angajat a acceptat ticket-ul #${t.id_ticket}`;
                idCalator = t.id_calator; createdAt = clampNow(addDays(t.created_at, randInt(0, 1)));
            } else if (tip === 'ticket_rezolvat' && ticketeRezolvate.length) {
                const t = randChoice(ticketeRezolvate);
                mesaj = `📋 Ticket #${t.id_ticket} rezolvat. Rezumat: „${t.rezumat.slice(0, 120)}"`;
                idCalator = t.id_calator; createdAt = t.updated_at;
            } else if (tip === 'mesaj_ticket' && ticketeAngajate.length) {
                const t = randChoice(ticketeAngajate);
                mesaj = `💬 Mesaj nou in ticket #${t.id_ticket}`;
                idCalator = t.id_calator; createdAt = clampNow(addDays(t.created_at, randInt(0, 2)));
            } else if (tip === 'reinoire_abonament' && abonamentePool.length) {
                const a = randChoice(abonamentePool);
                mesaj = `Abonament ${a.tip} reinnoit (${PRETURI_ABONAMENTE[a.tip]} lei).`;
                idCalator = a.id_calator; createdAt = a.data_achizitie;
            } else if (tip === 'transfer_bilet' && calatoriPool.length > 1) {
                const [, recipient] = pickTwoDistinct(calatoriPool);
                mesaj = 'Un calator a transferat calatorii de metrou catre contul tau.';
                idCalator = recipient.id_calator; createdAt = randDateBetween(1, ZILE_ISTORIC);
            } else {
                const c = randChoice(calatoriPool);
                mesaj = randChoice(['Bine ai venit in platforma MetroBucuresti!', 'Contul tau a fost verificat cu succes.', 'Am actualizat termenii si conditiile platformei.']);
                idCalator = c.id_calator; createdAt = randDateBetween(1, ZILE_ISTORIC);
            }

            await client.query(
                `INSERT INTO notificari (mesaj, tip, id_calator, citita, created_at) VALUES ($1,$2,$3,$4,$5)`,
                [mesaj, tip, idCalator, citita, createdAt]
            );
        }

        /* ── 9. Anunturi (doar admin poate crea anunturi, vezi routes/anunturi.js) ── */
        const anunturiAlese = [...ANUNTURI_POOL].sort(() => Math.random() - 0.5).slice(0, 6);
        for (const a of anunturiAlese) {
            const idAngajat = randChoice(adminIds);
            const creat = randDateBetween(1, 180);
            await client.query(
                `INSERT INTO anunturi (titlu, continut, nivel_importanta, id_angajat, creat) VALUES ($1,$2,$3,$4,$5)`,
                [a.titlu, a.continut, a.nivel_importanta, idAngajat, creat]
            );
        }

        /* ── 10. Tourist passes ── */
        const NR_TURISTI = 15;
        const parolaTuristHash = await bcrypt.hash(PAROLA_CALATOR, 10);
        const zileValideTourist = Object.keys(PRETURI_TOURIST).map(Number);
        for (let i = 0; i < NR_TURISTI; i++) {
            const zile = randChoice(zileValideTourist);
            const pret = PRETURI_TOURIST[zile];
            const tara = randChoice(TARI_TURISTI);
            const statie = randChoice(statii);
            const codRidicare = genereazaCodRidicare();
            const prenumeT = randChoice(PRENUME_TURISTI);
            const email = `${prenumeT.toLowerCase()}${randInt(1, 9999)}@${randChoice(['gmail.com', 'hotmail.com', 'outlook.com'])}`;
            const pasaport = `${randChoice(['AB', 'CD', 'EF', 'GH'])}${randDigits(6)}`;
            const dataAchizitie = randDateBetween(1, ZILE_ISTORIC);
            const varstaZile = (Date.now() - dataAchizitie.getTime()) / 86400000;
            const ridicat = varstaZile > 10;
            const dataActivare = ridicat ? toDateStr(dataAchizitie) : null;
            const dataExpirare = ridicat ? toDateStr(addDays(dataAchizitie, zile)) : null;

            await client.query(
                `INSERT INTO tourist_passes (email, parola, tara, zile, pret, id_statie_ridicare, cod_ridicare, ridicat, data_achizitie, data_activare, data_expirare, pasaport)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                [email, parolaTuristHash, tara, zile, pret, statie.id_statie, codRidicare, ridicat, dataAchizitie, dataActivare, dataExpirare, pasaport]
            );
        }

        await client.query('COMMIT');

        console.log('✅ Populare finalizata cu succes.');
        console.log(`   Parola calatori/turisti seed-uiti: ${PAROLA_CALATOR}`);
        console.log(`   Parola angajati seed-uiti:         ${PAROLA_ANGAJAT}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Eroare la populare, s-a facut rollback:', err.message);
        throw err;
    } finally {
        client.release();
    }
}

main()
    .catch(() => { process.exitCode = 1; })
    .finally(() => pool.end());
