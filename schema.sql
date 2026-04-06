-- ==============================================
-- Transport Subteran — Schema PostgreSQL
-- Rulati acest fisier in baza de date creata
-- ==============================================

-- Extensii necesare (pentru gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================
-- TIPURI ENUM
-- ==============================================

CREATE TYPE tip_calator    AS ENUM ('adult', 'elev', 'student', 'pensionar');
CREATE TYPE magistrala_tip AS ENUM ('M1', 'M2', 'M3', 'M4', 'M5');
CREATE TYPE status_metrou  AS ENUM ('pe_traseu', 'depou');
CREATE TYPE tip_abonament  AS ENUM ('zi', 'saptamana', 'luna', 'an');
CREATE TYPE tip_zi         AS ENUM ('lucratoare', 'weekend', 'sarbatoare');
CREATE TYPE status_cerere  AS ENUM ('in_asteptare', 'aprobata', 'respinsa');
CREATE TYPE rol_angajat    AS ENUM ('angajat', 'admin');

-- ==============================================
-- TABELE
-- (ordine respecta foreign key dependencies)
-- ==============================================

CREATE TABLE angajati (
    id_angajat  SERIAL       PRIMARY KEY,
    nume        VARCHAR(50)  NOT NULL,
    prenume     VARCHAR(50)  NOT NULL,
    email       VARCHAR(100) NOT NULL UNIQUE
                CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    parola      VARCHAR(255) NOT NULL,
    rol         rol_angajat  NOT NULL DEFAULT 'angajat'
);

CREATE TABLE calatori (
    id_calator  SERIAL       PRIMARY KEY,
    nume        VARCHAR(50)  NOT NULL,
    prenume     VARCHAR(50)  NOT NULL,
    email       VARCHAR(100) NOT NULL UNIQUE
                CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    cnp         CHAR(13)     NOT NULL UNIQUE,
    parola      VARCHAR(255) NOT NULL,
    tip         tip_calator  NOT NULL DEFAULT 'adult'
);

CREATE TABLE statii (
    id_statie   SERIAL       PRIMARY KEY,
    nume        VARCHAR(100) NOT NULL UNIQUE,
    este_nod    BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE metrouri (
    id_metrou      SERIAL         PRIMARY KEY,
    magistrala     magistrala_tip NOT NULL,
    capacitate_max INT            NOT NULL CHECK (capacitate_max > 0),
    status         status_metrou  NOT NULL DEFAULT 'depou'
);

CREATE TABLE statii_magistrale (
    id_statie   INT            NOT NULL REFERENCES statii(id_statie),
    magistrala  magistrala_tip NOT NULL,
    pozitie     INT            NOT NULL, -- ordinea statiei pe magistrala (pt rutare)
    PRIMARY KEY (id_statie, magistrala)
);

CREATE TABLE bilete (
    id_bilet               SERIAL         PRIMARY KEY,
    id_calator             INT            NOT NULL REFERENCES calatori(id_calator),
    numar_calatorii        INT            NOT NULL,
    numar_calatorii_ramase INT            NOT NULL,
    data_achizitie         DATE           NOT NULL DEFAULT CURRENT_DATE,
    pret                   NUMERIC(10, 2) NOT NULL,
    cod_qr                 UUID           NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    activ                  BOOLEAN        NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_calatorii CHECK (
        numar_calatorii_ramase >= 0 AND
        numar_calatorii_ramase <= numar_calatorii
    )
);

CREATE TABLE abonamente (
    id_abonament   SERIAL         PRIMARY KEY,
    id_calator     INT            NOT NULL REFERENCES calatori(id_calator),
    tip            tip_abonament  NOT NULL,
    data_achizitie DATE           NOT NULL DEFAULT CURRENT_DATE,
    data_expirare  DATE           NOT NULL,
    pret           NUMERIC(10, 2) NOT NULL,
    cod_qr         UUID           NOT NULL UNIQUE DEFAULT gen_random_uuid()
);

CREATE TABLE orare (
    id_orar    SERIAL         PRIMARY KEY,
    id_metrou  INT            NOT NULL REFERENCES metrouri(id_metrou),
    id_statie  INT            NOT NULL REFERENCES statii(id_statie),
    tip_zi     tip_zi         NOT NULL DEFAULT 'lucratoare',
    ora_sosire TIME           NOT NULL
);

CREATE TABLE cereri_reducere (
    id_cerere        SERIAL        PRIMARY KEY,
    id_calator       INT           NOT NULL REFERENCES calatori(id_calator),
    tip_solicitat    tip_calator   NOT NULL CHECK (tip_solicitat <> 'adult'),
    cale_document    TEXT          NOT NULL,  -- ex: /uploads/doc_123.pdf
    status           status_cerere NOT NULL DEFAULT 'in_asteptare',
    id_angajat       INT           REFERENCES angajati(id_angajat), -- NULL pana la procesare
    motiv_respingere TEXT,                    -- completat doar la respingere
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE calatorii_efectuate (
    id_calatorie  SERIAL    PRIMARY KEY,
    id_calator    INT       NOT NULL REFERENCES calatori(id_calator),
    id_statie     INT       NOT NULL REFERENCES statii(id_statie),
    id_bilet      INT       REFERENCES bilete(id_bilet),         -- NULL daca s-a folosit abonament
    id_abonament  INT       REFERENCES abonamente(id_abonament), -- NULL daca s-a folosit bilet
    scanat_la     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_titlu_transport CHECK (
        (id_bilet IS NOT NULL AND id_abonament IS NULL) OR
        (id_bilet IS NULL     AND id_abonament IS NOT NULL)
    )
);

CREATE TABLE setari_aplicatie (
    cheie       VARCHAR(100) PRIMARY KEY,
    valoare     TEXT         NOT NULL,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- TRIGGERS: updated_at automat
-- ==============================================

CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cereri_reducere_updated_at
    BEFORE UPDATE ON cereri_reducere
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_setari_updated_at
    BEFORE UPDATE ON setari_aplicatie
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- ==============================================
-- DATE INITIALE: Statii
-- ==============================================

INSERT INTO statii (nume, este_nod) VALUES
('Pantelimon',           false),
('Republica',            false),
('Costin Georgian',      false),
('Titan',                false),
('Nicolae Grigorescu 1', true),
('Dristor 1',            true),
('Mihai Bravu',          false),
('Timpuri Noi',          false),
('Piata Unirii 1',       true),
('Izvor',                false),
('Eroilor',              true),
('Grozaversti',          false),
('Petrache Poenaru',     false),
('Crangasi',             false),
('Basarab',              true),
('Gara de Nord 1',       true),
('Piata Victoriei 1',    true),
('Stefan cel Mare',      false),
('Obor',                 false),
('Iancului',             false),
('Piata Muncii',         false),
('Dristor 2',            true),
('Pipera',               false),
('Aurel Vlaicu',         false),
('Aviatorilor',          false),
('Piata Victoriei 2',    true),
('Piata Romana',         false),
('Universitate',         false),
('Piata Unirii 2',       true),
('Tineretului',          false),
('Eroii Revolutiei',     false),
('Constantin Brancoveanu', false),
('Piata Sudului',        false),
('Aparatorii Patriei',   false),
('Dimitrie Leonida',     false),
('Berceni',              false),
('Tudor Arghezi',        false),
('Anghel Saligny',       false),
('Nicolae Teclu',        false),
('1 Decembrie 1918',     false),
('Nicolae Grigorescu 2', true),
('Politehnica',          false),
('Lujerului',            false),
('Gorjului',             false),
('Pacii',                false),
('Preciziei',            false),
('Gara de Nord 2',       true),
('Basarab 2',            true),
('Grivita',              false),
('1 Mai',                false),
('Jiului',               false),
('Parc Bazilescu',       false),
('Laminorului',          false),
('Straulesti',           false),
('Raul Doamnei',         false),
('Constantin Brancusi',  false),
('Valea Ialomitei',      false),
('Romancierilor',        false),
('Parc Drumul Taberei',  false),
('Tudor Vladimirescu',   false),
('Favorit',              false),
('Orizont',              false),
('Academia Militara',    false),
('Eroilor 2',            true);

-- ==============================================
-- DATE INITIALE: Statii Magistrale (cu pozitie)
-- Rezolva numele la id-uri prin JOIN
-- ==============================================

INSERT INTO statii_magistrale (id_statie, magistrala, pozitie)
SELECT s.id_statie, m.magistrala::magistrala_tip, m.pozitie
FROM (VALUES
    -- M1 (Pantelimon → Dristor 2)
    ('Pantelimon',           'M1',  1),
    ('Republica',            'M1',  2),
    ('Costin Georgian',      'M1',  3),
    ('Titan',                'M1',  4),
    ('Nicolae Grigorescu 1', 'M1',  5),
    ('Dristor 1',            'M1',  6),
    ('Mihai Bravu',          'M1',  7),
    ('Timpuri Noi',          'M1',  8),
    ('Piata Unirii 1',       'M1',  9),
    ('Izvor',                'M1', 10),
    ('Eroilor',              'M1', 11),
    ('Grozaversti',          'M1', 12),
    ('Petrache Poenaru',     'M1', 13),
    ('Crangasi',             'M1', 14),
    ('Basarab',              'M1', 15),
    ('Gara de Nord 1',       'M1', 16),
    ('Piata Victoriei 1',    'M1', 17),
    ('Stefan cel Mare',      'M1', 18),
    ('Obor',                 'M1', 19),
    ('Iancului',             'M1', 20),
    ('Piata Muncii',         'M1', 21),
    ('Dristor 2',            'M1', 22),
    -- M2 (Pipera → Tudor Arghezi)
    ('Pipera',               'M2',  1),
    ('Aurel Vlaicu',         'M2',  2),
    ('Aviatorilor',          'M2',  3),
    ('Piata Victoriei 2',    'M2',  4),
    ('Piata Romana',         'M2',  5),
    ('Universitate',         'M2',  6),
    ('Piata Unirii 2',       'M2',  7),
    ('Tineretului',          'M2',  8),
    ('Eroii Revolutiei',     'M2',  9),
    ('Constantin Brancoveanu','M2', 10),
    ('Piata Sudului',        'M2', 11),
    ('Aparatorii Patriei',   'M2', 12),
    ('Dimitrie Leonida',     'M2', 13),
    ('Berceni',              'M2', 14),
    ('Tudor Arghezi',        'M2', 15),
    -- M3 (Anghel Saligny → Preciziei)
    ('Anghel Saligny',       'M3',  1),
    ('Nicolae Teclu',        'M3',  2),
    ('1 Decembrie 1918',     'M3',  3),
    ('Nicolae Grigorescu 2', 'M3',  4),
    ('Dristor 1',            'M3',  5),
    ('Mihai Bravu',          'M3',  6),
    ('Timpuri Noi',          'M3',  7),
    ('Piata Unirii 1',       'M3',  8),
    ('Izvor',                'M3',  9),
    ('Eroilor',              'M3', 10),
    ('Politehnica',          'M3', 11),
    ('Lujerului',            'M3', 12),
    ('Gorjului',             'M3', 13),
    ('Pacii',                'M3', 14),
    ('Preciziei',            'M3', 15),
    -- M4 (Gara de Nord 2 → Straulesti)
    ('Gara de Nord 2',       'M4',  1),
    ('Basarab 2',            'M4',  2),
    ('Grivita',              'M4',  3),
    ('1 Mai',                'M4',  4),
    ('Jiului',               'M4',  5),
    ('Parc Bazilescu',       'M4',  6),
    ('Laminorului',          'M4',  7),
    ('Straulesti',           'M4',  8),
    -- M5 (Raul Doamnei → Eroilor 2)
    ('Raul Doamnei',         'M5',  1),
    ('Constantin Brancusi',  'M5',  2),
    ('Valea Ialomitei',      'M5',  3),
    ('Romancierilor',        'M5',  4),
    ('Parc Drumul Taberei',  'M5',  5),
    ('Tudor Vladimirescu',   'M5',  6),
    ('Favorit',              'M5',  7),
    ('Orizont',              'M5',  8),
    ('Academia Militara',    'M5',  9),
    ('Eroilor 2',            'M5', 10)
) AS m(nume_statie, magistrala, pozitie)
JOIN statii s ON s.nume = m.nume_statie;

-- ==============================================
-- DATE INITIALE: Setari aplicatie
-- ==============================================

INSERT INTO setari_aplicatie (cheie, valoare) VALUES
('pret_bilet_1_calatorie',    '3.00'),
('pret_bilet_2_calatorii',    '5.00'),
('pret_bilet_10_calatorii',   '22.00'),
('pret_abonament_zi',         '8.00'),
('pret_abonament_saptamana',  '25.00'),
('pret_abonament_luna',       '70.00'),
('pret_abonament_an',         '700.00'),
('zile_reminder_abonament',   '7');

-- ==============================================
-- NOTA: Contul de admin initial se creeaza
-- din backend dupa ce parola e hash-uita cu bcrypt
-- Exemplu rapid (inlocuieste hash-ul real):
--
-- INSERT INTO angajati (nume, prenume, email, parola, rol)
-- VALUES ('Admin', 'System', 'admin@metrou.ro', '<bcrypt_hash>', 'admin');
-- ==============================================
