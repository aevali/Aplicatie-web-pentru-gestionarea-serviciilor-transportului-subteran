import { useState, useEffect, useCallback } from 'react';
import { API } from '../dashboardConstants';
import {
    Settings, Ticket, CreditCard, Globe, Percent, Wrench,
    Save, RotateCcw, CheckCircle, AlertTriangle
} from 'lucide-react';
import './PageSetari.css';

/* ─────────────────────────────────────────────────────────────────────────────
   Definirea completă a setărilor, grupate pe secțiuni.
   Fiecare setare:  cheie (din DB), label, hint, suffix (unitate), default
───────────────────────────────────────────────────────────────────────────── */

const SECTIUNI = [
    {
        id: 'bilete',
        label: 'Prețuri bilete',
        desc: 'Prețul per număr de călătorii',
        icon: Ticket,
        color: 'blue',
        setari: [
            { cheie: 'pret_bilet_1',  label: '1 călătorie',   suffix: 'lei', implicit: '5.00' },
            { cheie: 'pret_bilet_2',  label: '2 călătorii',   suffix: 'lei', implicit: '10.00' },
            { cheie: 'pret_bilet_5',  label: '5 călătorii',   suffix: 'lei', implicit: '25.00' },
            { cheie: 'pret_bilet_10', label: '10 călătorii',  suffix: 'lei', implicit: '45.00' },
            { cheie: 'pret_bilet_20', label: '20 călătorii',  suffix: 'lei', implicit: '80.00' },
        ],
    },
    {
        id: 'abonamente',
        label: 'Prețuri abonamente',
        desc: 'Prețul integral pe tip de abonament',
        icon: CreditCard,
        color: 'green',
        setari: [
            { cheie: 'pret_abonament_zi',         label: '1 zi',         suffix: 'lei', implicit: '12.00' },
            { cheie: 'pret_abonament_trei_zile',   label: '3 zile',      suffix: 'lei', implicit: '35.00' },
            { cheie: 'pret_abonament_saptamana',   label: '1 săptămână', suffix: 'lei', implicit: '45.00' },
            { cheie: 'pret_abonament_luna',        label: '1 lună',      suffix: 'lei', implicit: '100.00' },
            { cheie: 'pret_abonament_sase_luni',   label: '6 luni',      suffix: 'lei', implicit: '500.00' },
            { cheie: 'pret_abonament_an',          label: '1 an',        suffix: 'lei', implicit: '900.00' },
        ],
    },
    {
        id: 'tourist',
        label: 'Prețuri tourist pass',
        desc: 'Carduri turistice, exprimate în EUR',
        icon: Globe,
        color: 'cyan',
        setari: [
            { cheie: 'pret_tourist_1', label: '1 zi',   suffix: 'EUR', implicit: '6.00' },
            { cheie: 'pret_tourist_2', label: '2 zile',  suffix: 'EUR', implicit: '12.00' },
            { cheie: 'pret_tourist_3', label: '3 zile',  suffix: 'EUR', implicit: '16.00' },
            { cheie: 'pret_tourist_4', label: '4 zile',  suffix: 'EUR', implicit: '20.00' },
            { cheie: 'pret_tourist_5', label: '5 zile',  suffix: 'EUR', implicit: '24.00' },
            { cheie: 'pret_tourist_7', label: '7 zile',  suffix: 'EUR', implicit: '40.00' },
        ],
    },
    {
        id: 'reduceri',
        label: 'Reduceri pe categorii',
        desc: 'Procentul de reducere per tip călător',
        icon: Percent,
        color: 'purple',
        setari: [
            { cheie: 'reducere_elev',      label: 'Elev',      hint: 'Aplicat la abonamente ≤ 1 lună', suffix: '%', implicit: '100' },
            { cheie: 'reducere_student',   label: 'Student',   hint: 'Aplicat la abonamente ≤ 1 lună', suffix: '%', implicit: '90' },
            { cheie: 'reducere_pensionar', label: 'Pensionar', hint: 'Aplicat la abonamente ≤ 1 lună', suffix: '%', implicit: '50' },
        ],
    },
    {
        id: 'operational',
        label: 'Parametri operaționali',
        desc: 'Configurări de funcționare',
        icon: Wrench,
        color: 'amber',
        setari: [
            { cheie: 'cooldown_scanare_min',       label: 'Cooldown între scanări',             hint: 'Intervalul minim între două validări consecutive pe abonament', suffix: 'min',  implicit: '15' },
            { cheie: 'zile_reinoire_abonament',    label: 'Fereastră reînnoire abonament',     hint: 'Cu câte zile înainte de expirare se permite reînnoirea',        suffix: 'zile', implicit: '3' },
            { cheie: 'zile_auto_ridicare_turist',  label: 'Auto-ridicare card turist',         hint: 'După câte zile se consideră cardul ridicat automat',             suffix: 'zile', implicit: '7' },
        ],
    },
];

// Toate cheile ca set, pentru referință rapidă
const TOATE_CHEILE = SECTIUNI.flatMap(s => s.setari.map(x => x.cheie));
const DEFAULTS = {};
SECTIUNI.forEach(s => s.setari.forEach(x => { DEFAULTS[x.cheie] = x.implicit; }));

export default function PageSetari({ token }) {
    const [valori,       setValori]       = useState({});          // valorile din DB
    const [editare,      setEditare]      = useState({});          // valorile editate local
    const [loading,      setLoading]      = useState(true);
    const [saving,       setSaving]       = useState(false);
    const [toast,        setToast]        = useState(null);        // { tip: 'ok'|'err', text }

    // Fetch la mount
    const fetchSetari = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const r = await fetch(`${API}/api/setari`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!r.ok) throw new Error('Eroare la încărcarea setărilor.');
            const data = await r.json();
            const db = data.setari ?? {};

            // Combină: ce vine din DB + defaults pentru chei care lipsesc
            const merged = {};
            for (const cheie of TOATE_CHEILE) {
                merged[cheie] = db[cheie] ?? DEFAULTS[cheie];
            }

            setValori(merged);
            setEditare(merged);
        } catch (err) {
            setToast({ tip: 'err', text: err.message || 'Eroare la încărcarea setărilor.' });
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchSetari(); }, [fetchSetari]);

    // Handler input
    const handleChange = (cheie, val) => {
        setEditare(prev => ({ ...prev, [cheie]: val }));
    };

    // Verifică dacă s-au făcut modificări
    const hasChanges = TOATE_CHEILE.some(k => String(editare[k] ?? '') !== String(valori[k] ?? ''));

    // Câte setări s-au modificat
    const nrModificate = TOATE_CHEILE.filter(k => String(editare[k] ?? '') !== String(valori[k] ?? '')).length;

    // Reset
    const handleReset = () => {
        setEditare({ ...valori });
        setToast(null);
    };

    // Save
    const handleSave = async () => {
        if (!hasChanges) return;
        setSaving(true);
        setToast(null);

        // Trimitem doar cheile modificate
        const modificate = {};
        for (const cheie of TOATE_CHEILE) {
            if (String(editare[cheie] ?? '') !== String(valori[cheie] ?? '')) {
                modificate[cheie] = editare[cheie];
            }
        }

        try {
            const r = await fetch(`${API}/api/setari`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ setari: modificate }),
            });
            const data = await r.json();

            if (!r.ok) {
                setToast({ tip: 'err', text: data.mesaj || 'Eroare la salvare.' });
                return;
            }

            // Actualizăm valorile din DB
            const db = data.setari ?? {};
            const merged = {};
            for (const cheie of TOATE_CHEILE) {
                merged[cheie] = db[cheie] ?? DEFAULTS[cheie];
            }
            setValori(merged);
            setEditare(merged);

            setToast({ tip: 'ok', text: `${Object.keys(modificate).length} ${Object.keys(modificate).length === 1 ? 'setare actualizată' : 'setări actualizate'} cu succes.` });
            setTimeout(() => setToast(null), 4000);
        } catch {
            setToast({ tip: 'err', text: 'Eroare de conexiune. Încearcă din nou.' });
        } finally {
            setSaving(false);
        }
    };

    // Loading
    if (loading) {
        return (
            <div className="dash-section set-page">
                <div className="set-loading">
                    <div className="ang-spinner" />
                    <span>Se încarcă setările...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="dash-section set-page">
            {/* Header */}
            <div className="set-header">
                <h2 className="set-title">
                    <div className="set-title-icon"><Settings size={18} /></div>
                    Setări sistem
                </h2>
                <p className="set-subtitle">
                    Configurează prețurile, reducerile și parametrii operaționali ai platformei.
                </p>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`set-toast set-toast--${toast.tip}`}>
                    {toast.tip === 'ok' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                    {toast.text}
                </div>
            )}

            {/* Secțiuni */}
            {SECTIUNI.map(sectiune => {
                const Icon = sectiune.icon;
                return (
                    <div key={sectiune.id} className="set-section">
                        <div className="set-section-header">
                            <div className={`set-section-icon set-section-icon--${sectiune.color}`}>
                                <Icon size={15} />
                            </div>
                            <span className="set-section-label">{sectiune.label}</span>
                            <span className="set-section-desc">{sectiune.desc}</span>
                        </div>

                        {sectiune.setari.map(s => {
                            const isChanged = String(editare[s.cheie] ?? '') !== String(valori[s.cheie] ?? '');
                            return (
                                <div key={s.cheie} className="set-row">
                                    <div className="set-row-label">
                                        {s.label}
                                        {s.hint && <span className="set-row-label-hint">{s.hint}</span>}
                                    </div>
                                    <div className="set-input-wrap">
                                        <input
                                            type="number"
                                            className={`set-input ${isChanged ? 'set-input--changed' : ''}`}
                                            value={editare[s.cheie] ?? ''}
                                            onChange={e => handleChange(s.cheie, e.target.value)}
                                            step="0.01"
                                            min="0"
                                        />
                                        <span className="set-input-suffix">{s.suffix}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {/* Sticky save bar */}
            {hasChanges && (
                <div className="set-save-bar">
                    <div className="set-save-info">
                        <span className="set-save-dot" />
                        {nrModificate} {nrModificate === 1 ? 'setare modificată' : 'setări modificate'} — nesalvate
                    </div>
                    <div className="set-save-actions">
                        <button className="set-btn-reset" onClick={handleReset} disabled={saving}>
                            <RotateCcw size={14} /> Anulează
                        </button>
                        <button className="set-btn-save" onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <><div className="ang-spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} /> Se salvează...</>
                            ) : (
                                <><Save size={15} /> Salvează</>
                            )}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
