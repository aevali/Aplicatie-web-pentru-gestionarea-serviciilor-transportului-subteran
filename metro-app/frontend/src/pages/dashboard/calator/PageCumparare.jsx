import { useState, useEffect } from 'react';
import { API, OPTIUNI_BILETE, OPTIUNI_ABONAMENTE, LABEL_REDUCERE, calcPretRedus, formatPret } from '../dashboardConstants';
import { CreditCard, Ticket, Calendar, GraduationCap, CheckCircle, Sparkles, Home } from 'lucide-react';
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

    /* Stepper state — index in OPTIUNI_BILETE */
    const [stepperIdx, setStepperIdx] = useState(0);

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

    useEffect(() => {
        document.body.style.overflow = showConfirm ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [showConfirm]);

    const handleSectiune = (s) => { setSectiune(s); setSelectat(null); setCumparMsg(null); };

    /* Stepper: select bilet by index */
    const handleStepperSelect = (idx) => {
        setStepperIdx(idx);
        const opt = OPTIUNI_BILETE[idx];
        setSelectat({ tip: 'bilete', valoare: opt.nr });
        setCumparMsg(null);
    };

    const handleStepperPrev = () => {
        const newIdx = Math.max(0, stepperIdx - 1);
        handleStepperSelect(newIdx);
    };

    const handleStepperNext = () => {
        const newIdx = Math.min(OPTIUNI_BILETE.length - 1, stepperIdx + 1);
        handleStepperSelect(newIdx);
    };

    /* Metro line: select abonament */
    const handleSelectAbon = (tip) => {
        setSelectat(prev => (prev?.valoare === tip ? null : { tip: 'abonamente', valoare: tip }));
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

    /* ── Current stepper option ── */
    const currentOpt = OPTIUNI_BILETE[stepperIdx];

    if (succes) {
        return (
            <div className="dash-section cumparare-page">
                <div className="cumparare-succes">
                    <div className="cumparare-succes-icon"><Sparkles size={48} /></div>
                    <h2 className="cumparare-succes-title">Cumpărătură realizată!</h2>
                    <p className="cumparare-succes-desc">{succes.mesaj}</p>
                    <button className="cumparare-succes-btn" onClick={() => onNavigate('overview')}><Home size={15} style={{ display: 'inline', verticalAlign: 'middle' }} /> Mergi la Home pentru QR</button>
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
                <h2 className="cumparare-title"><CreditCard size={20} style={{ display: 'inline', verticalAlign: 'middle' }} /> Cumpărare titluri de călătorie</h2>
                <p className="cumparare-sub">Selectează tipul și numărul de călătorii dorite</p>
            </div>

            {activExist && (
                <div className="cumparare-banner cumparare-banner--blocat">
                    <span className="cumparare-banner-icon">{activExist.tip === 'bilet' ? <Ticket size={18} /> : <Calendar size={18} />}</span>
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
                    <span className="cumparare-banner-icon"><GraduationCap size={18} /></span>
                    <div className="cumparare-banner-text">
                        <span className="cumparare-banner-title">Reducere {LABEL_REDUCERE[eligibil.tip]} aplicată automat!</span>
                        <span className="cumparare-banner-desc">Documentele tale au fost verificate. Beneficiezi de reducere doar la abonamente de până la 1 lună inclusiv.</span>
                    </div>
                </div>
            )}

            <div className="cumparare-toggle">
                <button id="toggle-bilete" className={`cumparare-toggle-btn ${sectiune === 'bilete' ? 'active' : ''}`} onClick={() => handleSectiune('bilete')}><Ticket size={15} /> Bilete</button>
                <button id="toggle-abonamente" className={`cumparare-toggle-btn ${sectiune === 'abonamente' ? 'active' : ''}`} onClick={() => handleSectiune('abonamente')}><Calendar size={15} /> Abonamente</button>
            </div>

            {/* ═══════ BILETE — STEPPER ═══════ */}
            {sectiune === 'bilete' && (
                <div className={`stepper-container ${activExist ? 'stepper-disabled' : ''}`}>
                    <div className="stepper-label">Număr de călătorii</div>

                    <div className="stepper-control">
                        <button
                            className="stepper-btn stepper-btn--minus"
                            onClick={handleStepperPrev}
                            disabled={stepperIdx === 0 || !!activExist}
                            aria-label="Mai puține călătorii"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>

                        <div className="stepper-display">
                            <span className="stepper-number" key={currentOpt.nr}>{currentOpt.nr}</span>
                            <span className="stepper-unit">călători{currentOpt.nr !== 1 ? 'i' : 'e'}</span>
                        </div>

                        <button
                            className="stepper-btn stepper-btn--plus"
                            onClick={handleStepperNext}
                            disabled={stepperIdx === OPTIUNI_BILETE.length - 1 || !!activExist}
                            aria-label="Mai multe călătorii"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                    </div>

                    {/* Progress dots */}
                    <div className="stepper-dots">
                        {OPTIUNI_BILETE.map((opt, i) => (
                            <button
                                key={opt.nr}
                                className={`stepper-dot ${i === stepperIdx ? 'active' : ''} ${i < stepperIdx ? 'passed' : ''}`}
                                onClick={() => !activExist && handleStepperSelect(i)}
                                title={opt.label}
                            >
                                <span className="stepper-dot-label">{opt.nr}</span>
                            </button>
                        ))}
                        <div className="stepper-dots-track" />
                        <div className="stepper-dots-fill" style={{ width: `${(stepperIdx / (OPTIUNI_BILETE.length - 1)) * 100}%` }} />
                    </div>

                    <div className="stepper-price">
                        <span className="stepper-price-val">{formatPret(currentOpt.pret)}</span>
                        <span className="stepper-price-unit">
                            ({(currentOpt.pret / currentOpt.nr).toFixed(2)} lei / călătorie)
                        </span>
                    </div>
                </div>
            )}

            {/* ═══════ ABONAMENTE — METRO LINE SELECTOR ═══════ */}
            {sectiune === 'abonamente' && (
                <div className={`metro-line-selector ${activExist ? 'metro-line-disabled' : ''}`}>
                    <div className="metro-line-track-wrap">
                        <div className="metro-line-track" />
                        {OPTIUNI_ABONAMENTE.map((opt, i) => {
                            const isSelected = selectat?.valoare === opt.tip && selectat?.tip === 'abonamente';
                            const poateReducere = eligibil?.reducere && opt.areReducere;
                            const pretRedus = poateReducere ? calcPretRedus(opt.pret, eligibil.tip) : null;
                            return (
                                <button
                                    key={opt.tip}
                                    id={`abon-station-${opt.tip}`}
                                    className={`metro-station ${isSelected ? 'selected' : ''}`}
                                    style={{ left: `${(i / (OPTIUNI_ABONAMENTE.length - 1)) * 100}%` }}
                                    onClick={() => !activExist && handleSelectAbon(opt.tip)}
                                >
                                    <div className={`metro-station-dot ${isSelected ? 'active' : ''}`} />
                                    <div className="metro-station-info">
                                        <span className="metro-station-name">{opt.label}</span>
                                        <span className="metro-station-price">
                                            {pretRedus !== null ? (
                                                <>
                                                    <span className="metro-price-old">{opt.pret}</span>
                                                    <span className="metro-price-new">{pretRedus === 0 ? 'Gratuit' : `${pretRedus} lei`}</span>
                                                </>
                                            ) : (
                                                formatPret(opt.pret)
                                            )}
                                        </span>
                                        {poateReducere && <span className="metro-station-discount">-{LABEL_REDUCERE[eligibil.tip]}</span>}
                                        {eligibil?.reducere && !opt.areReducere && <span className="metro-station-no-disc">fără reducere</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══════ SUMAR COMANDĂ ═══════ */}
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
                    <button id="btn-cumpara" className="cumparare-btn" onClick={() => setShowConfirm(true)} disabled={cumparLoad}><CreditCard size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> Cumpără acum</button>
                </div>
            )}

            {/* ═══════ MODAL CONFIRMARE ═══════ */}
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
                                {cumparLoad ? 'Se procesează...' : <><CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Confirmă</>}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
