// ═══════════════════════════════════════════════════════
// Timpi de deplasare & transfer — Metroul București
// ═══════════════════════════════════════════════════════

/**
 * Timp de deplasare (minute) între stații consecutive pe fiecare magistrală.
 * Index 0 = de la poziția 1 la poziția 2, index 1 = de la 2 la 3, etc.
 *
 * Medie ~2.5 min/segment, variind între 2 și 3 minute.
 */
const TRAVEL_TIMES = {
    // M1: Pantelimon → Dristor 2  (22 stații, 21 segmente)
    M1: [
        3, // Pantelimon → Republica
        2, // Republica → Costin Georgian
        2, // Costin Georgian → Titan
        3, // Titan → Nicolae Grigorescu 1
        3, // Nicolae Grigorescu 1 → Dristor 1
        2, // Dristor 1 → Mihai Bravu
        3, // Mihai Bravu → Timpuri Noi
        2, // Timpuri Noi → Piata Unirii 1
        3, // Piata Unirii 1 → Izvor
        2, // Izvor → Eroilor
        2, // Eroilor → Grozavesti
        2, // Grozavesti → Petrache Poenaru
        2, // Petrache Poenaru → Crangasi
        3, // Crangasi → Basarab
        2, // Basarab → Gara de Nord 1
        3, // Gara de Nord 1 → Piata Victoriei 1
        2, // Piata Victoriei 1 → Stefan cel Mare
        2, // Stefan cel Mare → Obor
        2, // Obor → Iancului
        3, // Iancului → Piata Muncii
        2, // Piata Muncii → Dristor 2
    ],
    // M2: Pipera → Tudor Arghezi  (15 stații, 14 segmente)
    M2: [
        3, // Pipera → Aurel Vlaicu
        3, // Aurel Vlaicu → Aviatorilor
        2, // Aviatorilor → Piata Victoriei 2
        2, // Piata Victoriei 2 → Piata Romana
        2, // Piata Romana → Universitate
        2, // Universitate → Piata Unirii 2
        3, // Piata Unirii 2 → Tineretului
        2, // Tineretului → Eroii Revolutiei
        3, // Eroii Revolutiei → Constantin Brancoveanu
        2, // Constantin Brancoveanu → Piata Sudului
        3, // Piata Sudului → Aparatorii Patriei
        2, // Aparatorii Patriei → Dimitrie Leonida
        2, // Dimitrie Leonida → Berceni
        3, // Berceni → Tudor Arghezi
    ],
    // M3: Anghel Saligny → Preciziei  (15 stații, 14 segmente)
    M3: [
        2, // Anghel Saligny → Nicolae Teclu
        3, // Nicolae Teclu → 1 Decembrie 1918
        2, // 1 Decembrie 1918 → Nicolae Grigorescu 2
        3, // Nicolae Grigorescu 2 → Dristor 1
        2, // Dristor 1 → Mihai Bravu
        3, // Mihai Bravu → Timpuri Noi
        2, // Timpuri Noi → Piata Unirii 1
        3, // Piata Unirii 1 → Izvor
        2, // Izvor → Eroilor
        3, // Eroilor → Politehnica
        2, // Politehnica → Lujerului
        2, // Lujerului → Gorjului
        2, // Gorjului → Pacii
        3, // Pacii → Preciziei
    ],
    // M4: Gara de Nord 2 → Straulesti  (8 stații, 7 segmente)
    M4: [
        2, // Gara de Nord 2 → Basarab 2
        2, // Basarab 2 → Grivita
        3, // Grivita → 1 Mai
        2, // 1 Mai → Jiului
        2, // Jiului → Parc Bazilescu
        3, // Parc Bazilescu → Laminorului
        2, // Laminorului → Straulesti
    ],
    // M5: Raul Doamnei → Eroilor 2  (10 stații, 9 segmente)
    M5: [
        3, // Raul Doamnei → Constantin Brancusi
        2, // Constantin Brancusi → Valea Ialomitei
        2, // Valea Ialomitei → Romancierilor
        3, // Romancierilor → Parc Drumul Taberei
        2, // Parc Drumul Taberei → Tudor Vladimirescu
        2, // Tudor Vladimirescu → Favorit
        2, // Favorit → Orizont
        3, // Orizont → Academia Militara
        2, // Academia Militara → Eroilor 2
    ],
};

/**
 * Timp de transfer fizic (minute) între stațiile pereche.
 * Cheia: "idMic-idMare" (ID-urile sortate crescător).
 * Transferul presupune mers pe jos între cele 2 stații.
 */
const TRANSFER_TIMES = {
    '5-41':  9,  // Nicolae Grigorescu 1 ↔ 2
    '6-22':  10, // Dristor 1 ↔ Dristor 2
    '9-29':  8,  // Piata Unirii 1 ↔ 2
    '11-64': 7,  // Eroilor ↔ Eroilor 2
    '15-48': 8,  // Basarab ↔ Basarab 2
    '16-47': 7,  // Gara de Nord 1 ↔ 2
    '17-26': 7,  // Piata Victoriei 1 ↔ 2
};

/**
 * Timp de schimbare peron (minute) — aceeași stație, linie diferită.
 * Ex: Dristor 1 de pe M1 pe M3 (peron comun).
 */
const PLATFORM_CHANGE_TIME = 2;

/**
 * Timp de așteptare la fiecare schimbare de linie (minute).
 * Include așteptarea pe peron pentru următorul metrou.
 */
const WAIT_TIME_TRANSFER = 5;

module.exports = { TRAVEL_TIMES, TRANSFER_TIMES, PLATFORM_CHANGE_TIME, WAIT_TIME_TRANSFER };
