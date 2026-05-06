-- Schema exportata din PostgreSQL local
-- 2026-05-04T12:26:45.919Z

-- TIPURI ENUM
CREATE TYPE magistrala_tip AS ENUM ('M1', 'M2', 'M3', 'M4', 'M5');
CREATE TYPE rol_angajat AS ENUM ('angajat', 'admin');
CREATE TYPE status_cerere AS ENUM ('in_asteptare', 'aprobata', 'respinsa');
CREATE TYPE status_metrou AS ENUM ('pe_traseu', 'depou');
CREATE TYPE tip_abonament AS ENUM ('zi', 'trei_zile', 'saptamana', 'luna', 'sase_luni', 'an');
CREATE TYPE tip_calator AS ENUM ('adult', 'elev', 'student', 'pensionar');
CREATE TYPE tip_zi AS ENUM ('lucratoare', 'weekend', 'sarbatoare');

-- TABELE

CREATE TABLE abonamente (
    id_abonament SERIAL NOT NULL,
    id_calator INTEGER NOT NULL,
    tip tip_abonament NOT NULL,
    data_achizitie DATE DEFAULT CURRENT_DATE NOT NULL,
    data_expirare DATE NOT NULL,
    pret NUMERIC NOT NULL,
    cod_qr UUID DEFAULT gen_random_uuid() NOT NULL,
    reducere_aplicata BOOLEAN DEFAULT false NOT NULL,
    FOREIGN KEY (id_calator) REFERENCES calatori(id_calator),
    PRIMARY KEY (id_abonament),
    UNIQUE (cod_qr)
);

CREATE TABLE angajati (
    id_angajat SERIAL NOT NULL,
    nume VARCHAR(50) NOT NULL,
    prenume VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    parola VARCHAR(255) NOT NULL,
    rol rol_angajat DEFAULT 'angajat'::rol_angajat NOT NULL,
    PRIMARY KEY (id_angajat),
    UNIQUE (email)
);

CREATE TABLE bilete (
    id_bilet SERIAL NOT NULL,
    id_calator INTEGER NOT NULL,
    numar_calatorii INTEGER NOT NULL,
    numar_calatorii_ramase INTEGER NOT NULL,
    data_achizitie DATE DEFAULT CURRENT_DATE NOT NULL,
    pret NUMERIC NOT NULL,
    cod_qr UUID DEFAULT gen_random_uuid() NOT NULL,
    activ BOOLEAN DEFAULT true NOT NULL,
    reducere_aplicata BOOLEAN DEFAULT false NOT NULL,
    FOREIGN KEY (id_calator) REFERENCES calatori(id_calator),
    PRIMARY KEY (id_bilet),
    UNIQUE (cod_qr)
);

CREATE TABLE calatori (
    id_calator SERIAL NOT NULL,
    nume VARCHAR(50) NOT NULL,
    prenume VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    cnp CHAR(13) NOT NULL,
    parola VARCHAR(255) NOT NULL,
    tip tip_calator DEFAULT 'adult'::tip_calator NOT NULL,
    PRIMARY KEY (id_calator),
    UNIQUE (email),
    UNIQUE (cnp)
);

CREATE TABLE calatorii_efectuate (
    id_calatorie SERIAL NOT NULL,
    id_calator INTEGER NOT NULL,
    id_statie INTEGER NOT NULL,
    id_bilet INTEGER,
    id_abonament INTEGER,
    scanat_la TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (id_calator) REFERENCES calatori(id_calator),
    FOREIGN KEY (id_statie) REFERENCES statii(id_statie),
    FOREIGN KEY (id_bilet) REFERENCES bilete(id_bilet),
    FOREIGN KEY (id_abonament) REFERENCES abonamente(id_abonament),
    PRIMARY KEY (id_calatorie)
);

CREATE TABLE cereri_reducere (
    id_cerere SERIAL NOT NULL,
    id_calator INTEGER NOT NULL,
    tip_solicitat tip_calator NOT NULL,
    cale_document TEXT NOT NULL,
    status status_cerere DEFAULT 'in_asteptare'::status_cerere NOT NULL,
    id_angajat INTEGER,
    motiv_respingere TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (id_calator) REFERENCES calatori(id_calator),
    FOREIGN KEY (id_angajat) REFERENCES angajati(id_angajat),
    PRIMARY KEY (id_cerere)
);

CREATE TABLE mesaje_ticket (
    id_mesaj SERIAL NOT NULL,
    id_ticket INTEGER NOT NULL,
    expeditor_tip VARCHAR(10) NOT NULL,
    expeditor_id INTEGER NOT NULL,
    continut TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_ticket) REFERENCES tickets_suport(id_ticket),
    PRIMARY KEY (id_mesaj)
);

CREATE TABLE metrouri (
    id_metrou SERIAL NOT NULL,
    magistrala magistrala_tip NOT NULL,
    capacitate_max INTEGER NOT NULL,
    status status_metrou DEFAULT 'depou'::status_metrou NOT NULL,
    PRIMARY KEY (id_metrou)
);

CREATE TABLE notificari (
    id_notificare SERIAL NOT NULL,
    mesaj TEXT NOT NULL,
    tip VARCHAR(50) DEFAULT 'info'::character varying,
    id_calator INTEGER,
    citita BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    FOREIGN KEY (id_calator) REFERENCES calatori(id_calator),
    PRIMARY KEY (id_notificare)
);

CREATE TABLE orare (
    id_orar SERIAL NOT NULL,
    id_metrou INTEGER NOT NULL,
    id_statie INTEGER NOT NULL,
    tip_zi tip_zi DEFAULT 'lucratoare'::tip_zi NOT NULL,
    ora_sosire TIME WITHOUT TIME ZONE NOT NULL,
    FOREIGN KEY (id_metrou) REFERENCES metrouri(id_metrou),
    FOREIGN KEY (id_statie) REFERENCES statii(id_statie),
    PRIMARY KEY (id_orar)
);

CREATE TABLE setari_aplicatie (
    cheie VARCHAR(100) NOT NULL,
    valoare TEXT NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (cheie)
);

CREATE TABLE statii (
    id_statie SERIAL NOT NULL,
    nume VARCHAR(100) NOT NULL,
    este_nod BOOLEAN DEFAULT false NOT NULL,
    PRIMARY KEY (id_statie),
    UNIQUE (nume)
);

CREATE TABLE statii_magistrale (
    id_statie INTEGER NOT NULL,
    magistrala magistrala_tip NOT NULL,
    pozitie INTEGER NOT NULL,
    FOREIGN KEY (id_statie) REFERENCES statii(id_statie),
    PRIMARY KEY (id_statie),
    PRIMARY KEY (magistrala),
    PRIMARY KEY (magistrala),
    PRIMARY KEY (id_statie)
);

CREATE TABLE tickets_suport (
    id_ticket SERIAL NOT NULL,
    id_calator INTEGER NOT NULL,
    id_angajat INTEGER,
    subiect VARCHAR(300) NOT NULL,
    status VARCHAR(20) DEFAULT 'deschis'::character varying NOT NULL,
    rezumat TEXT,
    rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_calator TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (id_calator) REFERENCES calatori(id_calator),
    FOREIGN KEY (id_angajat) REFERENCES angajati(id_angajat),
    PRIMARY KEY (id_ticket)
);
