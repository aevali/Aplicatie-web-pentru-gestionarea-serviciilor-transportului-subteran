import { useState, useEffect } from 'react';
import { API, OPTIUNI_BILETE, OPTIUNI_ABONAMENTE, LABEL_REDUCERE, calcPretRedus, formatPret } from '../dashboardConstants';
import './PageCumparare.css';

export default function PageCumparare({ user, token, onNavigate }) {
    const [sectiune,   setSectiune]   = useState('bilete');
    const [selectat,   setSelectat]   = useState(null);
    const [eligibil,   setEligibil]   = useState(null);
    const [activExist, setActivExist] = useState(null);
    const [loadInit,   setLoadInit]   = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [cumparLoad,  setCumparLoad]  = useState(false);
    const [cumparMsg,   setCumparMsg]   = useState(null);
    const [succes,      setSucces]      = useState(null);

    useEffect(() => {
        if (!token) return;
        setLoadInit(true);
        Promise.all([
            fetch(`${API}/api/bilete/eligibilitate`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch(`${API}/api/bilete/activ`,         { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        ]).then(([elig, activ]) => {
            setEligibil(elig);
            setActivExist(activ.activ ?? null);
        }).catch(() => {}).finally(() => setLoadInit(false));
    }, [token]);

    const handleSectiune = (s) => { setSectiune(s); setSelectat(null); setCumparMsg(null); };

    const handleSelectCard = (val) => {
        setSelectat(prev => (prev?.valoare === val ? null : { tip: sectiune, valoare: val }));
        setCumparMsg(null);
    };

    const pretInfo = (() => {
        if (!selectat || !eligibil) return null;
        const tipCalator = eligibil.tip;
        const areReducereCont = eligibil.reducere && tipCalator !== 'adult';
        if (selectat.tip === 'bilete') {
            const optiune = OPTIUNI_BILETE.find(o => o.nr === selectat.valoare);
            if (!optiune) return null;
            return { pretBaza: optiune.pret, pretFinal: optiune.pret, reducere: false, procent: '0%', label: optiune.label, emoji: optiune.emoji };
        } else {
            const optiune = OPTIUNI_ABONAMENTE.find(o => o.tip === selectat.valoare);
            if (!optiune) return null;
            const poateReducere = areReducereCont && optiune.areReducere;
            const pretRedus = poateReducere ? calcPretRedus(optiune.pret, tipCalator) : null;
            return { pretBaza: optiune.pret, pretFinal: pretRedus !== null ? pretRedus : optiune.pret, reducere: pretRedus !== null, procent: LABEL_REDUCERE[tipCalator] ?? '0%', label: optiune.label, emoji: optiune.emoji, areReducereDisponibila: optiune.areReducere };
        }
    })();

    const handleCumparare = async () => {
        if (!selectat || !pretInfo) return;
        setCumparLoad(true); setCumparMsg(null);
        try {
            let url, body;
            if (selectat.tip === 'bilete') {
                url  = `${API}/api/bilete/cumpara-bilet`;
                body = { numar_calatorii: selectat.valoare };
            } else {
                url  = `${API}/api/bilete/cumpara-abonament`;
                body = { tip: selectat.valoare };
            }
            const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setSucces({ mesaj: data.mesaj, titlu: data.titlu });
            setShowConfirm(false);
        } catch (e) {
            setCumparMsg({ tip: 'err', text: e.message });
            setShowConfirm(false);
        } finally { setCumparLoad(false); }
    };

    if (succes) {
        return (
            <div className="dash-section cumparare-page">
                <div className="cumparare-succes">
                    <div className="cumparare-succes-icon">🎉</div>
                    <h2 className="cumparare-succes-title">Cumpărătură realizată!</h2>
                    <p className="cumparare-succes-desc">{succes.mesaj}</p>
                    <button className="cumparare-succes-btn" onClick={() => onNavigate('overview')}>🏠 Mergi la Home pentru QR</button>
                </div>
            </div>
        );
    }

    if (loadInit) {
        return (
            <div className="dash-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="ang-spinner" />
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Se încarcă...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="dash-section cumparare-page">
            <div className="cumparare-header">
                <h2 className="cumparare-title">💳 Cumpărare titluri de călătorie</h2>
                <p className="cumparare-sub">Selectează tipul și numărul de călătorii dorite</p>
            </div>

            {activExist && (
                <div className="cumparare-banner cumparare-banner--blocat">
                    <span className="cumparare-banner-icon">{activExist.tip === 'bilet' ? '🎫' : '📅'}</span>
                    <div className="cumparare-banner-text">
                        <span className="cumparare-banner-title">Ai deja un titlu de călătorie activ</span>
                        <span className="cumparare-banner-desc">
                            {activExist.tip === 'bilet'
                                ? `Bilet cu ${activExist.numar_calatorii_ramase} călători${activExist.numar_calatorii_ramase !== 1 ? 'i' : 'e'} rămase — folosește-l înainte de a cumpăra altul.`
                                : `Abonamentul tău expiră pe ${new Date(activExist.data_expirare).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
                        </span>
                    </div>
                </div>
            )}

            {!activExist && eligibil?.reducere && sectiune === 'abonamente' && (
                <div className="cumparare-banner cumparare-banner--reducere">
                    <span className="cumparare-banner-icon">🎓</span>
                    <div className="cumparare-banner-text">
                        <span className="cumparare-banner-title">Reducere {LABEL_REDUCERE[eligibil.tip]} aplicată automat!</span>
                        <span className="cumparare-banner-desc">Documentele tale au fost verificate. Beneficiezi de reducere doar la abonamente de până la 1 lună inclusiv.</span>
                    </div>
                </div>
            )}

            <div className="cumparare-toggle">
                <button id="toggle-bilete" className={`cumparare-toggle-btn ${sectiune === 'bilete' ? 'active' : ''}`} onClick={() => handleSectiune('bilete')}>🎫 Bilete</button>
                <button id="toggle-abonamente" className={`cumparare-toggle-btn ${sectiune === 'abonamente' ? 'active' : ''}`} onClick={() => handleSectiune('abonamente')}>📅 Abonamente</button>
            </div>

            {sectiune === 'bilete' && (
                <div className="cumparare-grid">
                    {OPTIUNI_BILETE.map(opt => {
                        const isSelected = selectat?.valoare === opt.nr && selectat?.tip === 'bilete';
                        return (
                            <div key={opt.nr} id={`bilet-card-${opt.nr}`} className={`cumparare-card ${isSelected ? 'selected' : ''} ${activExist ? 'disabled' : ''}`} onClick={() => !activExist && handleSelectCard(opt.nr)} role="button" aria-pressed={isSelected}>
                                {isSelected && <div className="cumparare-card-badge-selected">✓</div>}
                                <div className="cumparare-card-emoji">{opt.emoji}</div>
                                <div className="cumparare-card-label">{opt.label}</div>
                                <div className="cumparare-card-pret">{formatPret(opt.pret)}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {sectiune === 'abonamente' && (
                <div className="cumparare-grid">
                    {OPTIUNI_ABONAMENTE.map(opt => {
                        const isSelected = selectat?.valoare === opt.tip && selectat?.tip === 'abonamente';
                        const poateReducere = eligibil?.reducere && opt.areReducere;
                        const pretRedus = poateReducere ? calcPretRedus(opt.pret, eligibil.tip) : null;
                        return (
                            <div key={opt.tip} id={`abon-card-${opt.tip}`} className={`cumparare-card ${isSelected ? 'selected' : ''} ${activExist ? 'disabled' : ''}`} onClick={() => !activExist && handleSelectCard(opt.tip)} role="button" aria-pressed={isSelected}>
                                {isSelected && <div className="cumparare-card-badge-selected">✓</div>}
                                {eligibil?.reducere && !opt.areReducere && (<div className="cumparare-card-badge-no-red">fără reducere</div>)}
                                <div className="cumparare-card-emoji">{opt.emoji}</div>
                                <div className="cumparare-card-label">{opt.label}</div>
                                {pretRedus !== null && (<div className="cumparare-card-pret-vechi">{opt.pret} lei</div>)}
                                <div className={`cumparare-card-pret ${pretRedus !== null ? 'cumparare-card-pret-redus' : ''}`}>
                                    {pretRedus === 0 ? 'Gratuit' : `${pretRedus !== null ? formatPret(pretRedus) : formatPret(opt.pret)}`}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectat && pretInfo && (
                <div className="cumparare-sumar">
                    <div className="cumparare-sumar-title">Sumar comandă</div>
                    <div className="cumparare-sumar-row">
                        <div className="cumparare-sumar-info">
                            <span className="cumparare-sumar-label">{pretInfo.emoji} {pretInfo.label}</span>
                            <span className="cumparare-sumar-desc">{selectat.tip === 'bilete' ? 'Bilet de metrou' : 'Abonament metrou'}{pretInfo.reducere && ` · reducere ${pretInfo.procent}`}</span>
                        </div>
                        <div className="cumparare-sumar-pret">
                            {pretInfo.reducere && (<span className="cumparare-sumar-pret-vechi">{formatPret(pretInfo.pretBaza)}</span>)}
                            <span className={`cumparare-sumar-pret-val ${pretInfo.pretFinal === 0 ? 'gratuit' : ''}`}>{formatPret(pretInfo.pretFinal)}</span>
                        </div>
                    </div>
                    <hr className="cumparare-sumar-divider" />
                    {cumparMsg && (<div className={`cont-msg cont-msg--${cumparMsg.tip}`}>{cumparMsg.text}</div>)}
                    <button id="btn-cumpara" className="cumparare-btn" onClick={() => setShowConfirm(true)} disabled={cumparLoad}>💳 Cumpără acum</button>
                </div>
            )}

            {showConfirm && pretInfo && (
                <>
                    <div className="cumparare-modal-backdrop" onClick={() => setShowConfirm(false)} />
                    <div className="cumparare-modal">
                        <div className="cumparare-modal-icon">{pretInfo.emoji}</div>
                        <div className="cumparare-modal-title">Confirmare cumpărare</div>
                        <div className="cumparare-modal-desc">
                            {pretInfo.label} — {selectat.tip === 'bilete' ? 'Bilet' : 'Abonament'} metrou
                            {pretInfo.reducere && (<><br /><span style={{ color: '#86efac' }}>✅ Reducere {pretInfo.procent} aplicată</span></>)}
                        </div>
                        <div className={`cumparare-modal-pret ${pretInfo.pretFinal === 0 ? 'gratuit' : ''}`}>{formatPret(pretInfo.pretFinal)}</div>
                        <div className="cumparare-modal-actions">
                            <button className="ang-btn-secondary" onClick={() => setShowConfirm(false)}>Anulează</button>
                            <button id="btn-confirma-cumparare" className="ang-btn-primary" onClick={handleCumparare} disabled={cumparLoad}>
                                {cumparLoad ? 'Se procesează...' : '✅ Confirmă'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
