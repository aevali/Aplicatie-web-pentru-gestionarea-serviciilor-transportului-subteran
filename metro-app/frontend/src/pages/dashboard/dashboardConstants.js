export const API = 'http://localhost:5000';

/* ─── Helper: elimina diacritice pt preview email ─── */
export function normalizeazaEmail(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.');
}

/* ─── Navigare per rol ─── */
export const navByRole = {
    calator: [
        { id: 'overview',  icon: '🏠', label: 'Home' },
        { id: 'cumparare', icon: '💳', label: 'Cumpărare' },
        { id: 'bilete',    icon: '🎫', label: 'Biletele Mele' },
        { id: 'harta',     icon: '🗺️', label: 'Harta Rețelei' },
    ],
    angajat: [
        { id: 'overview',        icon: '🏠', label: 'Home' },
        { id: 'verificari',      icon: '📋', label: 'Verificări Documente' },
        { id: 'validare',        icon: '🎫', label: 'Validare Bilete' },
        { id: 'suport_clienti',  icon: '🎧', label: 'Suport Clienți' },
        { id: 'raport',          icon: '📑', label: 'Raport Tură' },
        { id: 'notificari',      icon: '🔔', label: 'Notificări' },
    ],
    admin: [
        { id: 'overview',   icon: '🏠', label: 'Home' },
        { id: 'angajati',   icon: '👤', label: 'Gestionare Angajați' },
        { id: 'verificari', icon: '📋', label: 'Verificări Documente' },
        { id: 'rapoarte',   icon: '📊', label: 'Rapoarte' },
        { id: 'notificari', icon: '🔔', label: 'Notificări' },
        { id: 'setari',     icon: '⚙️', label: 'Setări' },
    ],
};

export const labelsByRole  = { admin: 'Administrator', angajat: 'Angajat', calator: 'Călător' };
export const tipCalatorLabel = { adult: 'Adult', elev: 'Elev', student: 'Student', pensionar: 'Pensionar' };
export const tipCalatorLabels = { adult: 'Adult', elev: 'Elev', student: 'Student', pensionar: 'Pensionar' };

export function getRolEfectiv(user, tipCont) {
    if (tipCont === 'angajat' && user?.rol === 'admin') return 'admin';
    return tipCont ?? 'calator';
}

/* ─── Helper format dată ─── */
export function formatData(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ─── Constante bilete & abonamente ─── */
export const OPTIUNI_BILETE = [
    { nr: 1,  label: '1 călătorie',   emoji: '🎫', pret: 5.00  },
    { nr: 2,  label: '2 călătorii',   emoji: '🎫', pret: 10.00 },
    { nr: 5,  label: '5 călătorii',   emoji: '🎟️', pret: 25.00 },
    { nr: 10, label: '10 călătorii',  emoji: '🎟️', pret: 45.00 },
    { nr: 20, label: '20 călătorii',  emoji: '🏷️', pret: 80.00 },
];

export const OPTIUNI_ABONAMENTE = [
    { tip: 'zi',        label: '1 Zi',         emoji: '📅', pret: 12.00,  areReducere: true  },
    { tip: 'trei_zile', label: '3 Zile',        emoji: '📅', pret: 35.00,  areReducere: true  },
    { tip: 'saptamana', label: '1 Săptămână',   emoji: '🗓️', pret: 45.00,  areReducere: true  },
    { tip: 'luna',      label: '1 Lună',        emoji: '🗓️', pret: 100.00, areReducere: true  },
    { tip: 'sase_luni', label: '6 Luni',        emoji: '📆', pret: 500.00, areReducere: false },
    { tip: 'an',        label: '1 An',          emoji: '📆', pret: 900.00, areReducere: false },
];

export const LABEL_REDUCERE = { elev: '100%', student: '90%', pensionar: '50%' };
export const PROCENT_REDUCERE = { elev: 1.00, student: 0.90, pensionar: 0.50 };

export function calcPretRedus(pret, tipCalator) {
    const proc = PROCENT_REDUCERE[tipCalator] ?? 0;
    if (proc === 0) return pret;
    return +(pret * (1 - proc)).toFixed(2);
}

export function formatPret(val) {
    if (val === 0) return 'Gratuit';
    return val % 1 === 0 ? `${val} lei` : `${val.toFixed(2)} lei`;
}

export const LABEL_TIP_ABON = {
    zi: '1 zi', trei_zile: '3 zile', saptamana: '1 săptămână',
    luna: '1 lună', sase_luni: '6 luni', an: '1 an',
};
