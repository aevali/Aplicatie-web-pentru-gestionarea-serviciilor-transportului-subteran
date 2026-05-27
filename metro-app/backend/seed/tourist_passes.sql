-- ==============================================
-- Tourist Pass — Tabel nou
-- Rulati acest script in baza de date existenta
-- ==============================================

-- Tabelul principal pentru tourist passes
CREATE TABLE IF NOT EXISTS tourist_passes (
    id_pass            SERIAL         PRIMARY KEY,
    email              VARCHAR(100)   NOT NULL
                       CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    parola             VARCHAR(255)   NOT NULL,
    tara               VARCHAR(100)   NOT NULL,
    zile               INT            NOT NULL CHECK (zile IN (1, 2, 3, 4, 5, 7)),
    pret               NUMERIC(10, 2) NOT NULL,
    id_statie_ridicare INT            NOT NULL REFERENCES statii(id_statie),
    cod_ridicare       VARCHAR(10)    NOT NULL UNIQUE,
    cod_qr             UUID           NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    ridicat            BOOLEAN        NOT NULL DEFAULT FALSE,
    data_achizitie     TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_activare      DATE,
    data_expirare      DATE
);

-- Index pentru lookup rapid dupa cod_ridicare
CREATE INDEX IF NOT EXISTS idx_tourist_passes_cod_ridicare ON tourist_passes(cod_ridicare);
