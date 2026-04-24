import { useState, useEffect, useCallback } from 'react';
import { API, LABEL_TIP_ABON, LABEL_REDUCERE, calcPretRedus } from '../dashboardConstants';
import './PageBiletele.css';

export default function PageBiletele({ token, onNavigate }) {
    const [titluri,        setTitluri]        = useState(undefined);
    const [loading,        setLoading]        = useState(true);
    const [modal,          setModal]          = useState(null);
    const [actionLoad,     setActionLoad]     = useState(false);
    const [actionMsg,      setActionMsg]      = useState(null);
    const [tipReinnoieste, setTipReinnoieste] = useState(null);
    const [eligibil,       setEligibil]       = useState(null);

    const fetchTitluri = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const r = await fetch(`${API}/api/bilete/toate`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await r.json();
            setTitluri(data.titluri ?? []);
        } catch { setTitluri([]); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        fetch(`${API}/api/bilete/eligibilitate`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => setEligibil(data))
            .catch(() => {});
    }, [token]);

    useEffect(() => { fetchTitluri(); }, [fetchTitluri]);

    const calcPretOptiune = (pretBaza) => {
        if (!eligibil || !eligibil.reducere) return { pretFinal: pretBaza, redus: false, pretBaza };
        const pretRedus = calcPretRedus(pretBaza, eligibil.tip);
        return { pretFinal: pretRedus, redus: true, pretBaza };
    };

    const poateReinnoi = (titlu) => {
        if (titlu.tip !== 'abonament' || !titlu.este_activ) return false;
        const exp = new Date(titlu.data_expirare);
        const azi = new Date();
        const diff = Math.ceil((exp - azi) / (1000 * 60 * 60 * 24));
        return diff <= 3;
    };

    const zileRamase = (titlu) => {
        if (!titlu.data_expirare) return null;
        const exp = new Date(titlu.data_expirare);
        const azi = new Date();
        return Math.ceil((exp - azi) / (1000 * 60 * 60 * 24));
    };

    const handleAnulare = async () => {
        if (!modal) return;
        setActionLoad(true); setActionMsg(null);
        try {
            let url;
            if (modal.titlu.tip === 'bilet') { url = `${API}/api/bilete/${modal.titlu.id}/anuleaza`; }
            else { url = `${API}/api/bilete/abonament/${modal.titlu.id}/anuleaza`; }
            const r = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setActionMsg({ tip: 'ok', text: data.mesaj });
            setTimeout(() => { setModal(null); setActionMsg(null); fetchTitluri(); }, 1200);
        } catch (e) { setActionMsg({ tip: 'err', text: e.message }); }
        finally { setActionLoad(false); }
    };

    const handleReinnoieste = async () => {
        if (!modal || !tipReinnoieste) return;
        setActionLoad(true); setActionMsg(null);
        try {
            const r = await fetch(`${API}/api/bilete/abonament/${modal.titlu.id}/reinnoieste`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ tipNou: tipReinnoieste }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setActionMsg({ tip: 'ok', text: data.mesaj });
            setTimeout(() => { setModal(null); setActionMsg(null); setTipReinnoieste(null); fetchTitluri(); }, 1400);
        } catch (e) { setActionMsg({ tip: 'err', text: e.message }); }
        finally { setActionLoad(false); }
    };

    const handleCloseReinnoiModal = () => {
        if (!actionLoad) { setModal(null); setActionMsg(null); setTipReinnoieste(null); }
    };

    const formatData = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const formatPretVal = (v) => v % 1 === 0 ? `${v} lei` : `${Number(v).toFixed(2)} lei`;

    const renderCard = (titlu) => {
        const activ = titlu.este_activ;
        const esteAbon = titlu.tip === 'abonament';
        const poateR = poateReinnoi(titlu);
        const zileR = esteAbon && activ ? zileRamase(titlu) : null;
        const icon = esteAbon ? '📅' : '🎫';
        const badgeClass = activ ? (esteAbon ? 'bilet-card-badge--activ-abon' : 'bilet-card-badge--activ-bilet') : 'bilet-card-badge--inactiv';
        const badgeText = activ ? (esteAbon ? '✅ Abonament activ' : '🎫 Bilet activ') : (esteAbon ? 'Expirat' : 'Consumat / Anulat');

        let titleText;
        if (esteAbon) {
            if (titlu.data_achizitie && titlu.data_expirare) {
                const start = new Date(titlu.data_achizitie);
                const end   = new Date(titlu.data_expirare);
                const zileTotal = Math.round((end - start) / (1000 * 60 * 60 * 24));
                titleText = zileTotal === 1 ? 'Abonament 1 zi' : `Abonament ${zileTotal} zile`;
            } else {
                titleText = `Abonament ${LABEL_TIP_ABON[titlu.tip_abonament] ?? titlu.tip_abonament}`;
            }
        } else {
            titleText = `Bilet ${titlu.numar_calatorii} călători${titlu.numar_calatorii !== 1 ? 'i' : 'e'}`;
        }

        return (
            <div key={`${titlu.tip}-${titlu.id}`} className={`bilet-card ${activ ? 'bilet-card--activ' : 'bilet-card--inactiv'}`}>
                <div className="bilet-card-inner">
                    <div className="bilet-card-icon-wrap">{icon}</div>
                    <div className="bilet-card-info">
                        <div className="bilet-card-top">
                            <span className={`bilet-card-badge ${badgeClass}`}>{badgeText}</span>
                            {titlu.reducere_aplicata && (<span className="bilet-card-badge bilet-card-badge--reducere">✨ Reducere</span>)}
                            <span className="bilet-card-pret">{formatPretVal(titlu.pret)}</span>
                        </div>
                        <p className="bilet-card-title">{titleText}</p>
                        <div className="bilet-card-meta">
                            <div className="bilet-card-meta-item">
                                <span className="bilet-card-meta-label">Achiziție</span>
                                <span className="bilet-card-meta-value">{formatData(titlu.data_achizitie)}</span>
                            </div>
                            {esteAbon && (<div className="bilet-card-meta-item"><span className="bilet-card-meta-label">Valabil până</span><span className="bilet-card-meta-value">{formatData(titlu.data_expirare)}</span></div>)}
                            {!esteAbon && (<div className="bilet-card-meta-item"><span className="bilet-card-meta-label">Călătorii rămase</span><span className="bilet-card-meta-value">{titlu.numar_calatorii_ramase} / {titlu.numar_calatorii}</span></div>)}
                        </div>
                        {!esteAbon && (
                            <div className="bilet-card-progress"><div className="bilet-card-progress-bar"><div className="bilet-card-progress-fill" style={{ width: `${(titlu.numar_calatorii_ramase / titlu.numar_calatorii) * 100}%` }} /></div></div>
                        )}
                        {poateR && (<div className="bilet-reinnoieste-banner">🔔 {zileR <= 0 ? 'Abonamentul expiră azi!' : `Mai sunt ${zileR} zi${zileR === 1 ? '' : 'le'} — reînnoiește acum!`}</div>)}
                        {esteAbon && activ && !poateR && zileR !== null && (
                            <div className="bilet-card-meta"><div className="bilet-card-meta-item"><span className="bilet-card-meta-label">Reînnoire disponibilă</span><span className="bilet-card-meta-value" style={{ color: 'rgba(255,255,255,0.35)' }}>în {zileR - 3} zi{zileR - 3 === 1 ? '' : 'le'}</span></div></div>
                        )}
                    </div>
                    {activ && (
                        <div className="bilet-card-actions">
                            {poateR && (<button className="bilet-btn-reinnoieste" onClick={() => setModal({ tip: 'reinnoieste', titlu })}>🔄 Reînnoiește</button>)}
                            <button className="bilet-btn-annul" onClick={() => setModal({ tip: 'anulare', titlu })}>✕ Anulează</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="dash-section bilete-page">
            <div className="bilete-header">
                <h2 className="bilete-title">🎫 Biletele Mele</h2>
                <p className="bilete-sub">Istoricul biletelor și abonamentelor tale de metrou</p>
            </div>

            {loading && (<div className="notif-loading"><div className="ang-spinner" /><span>Se încarcă titlurile de călătorie...</span></div>)}

            {!loading && titluri?.length === 0 && (
                <div className="bilete-empty">
                    <div className="bilete-empty-icon">🎫</div>
                    <h3 className="bilete-empty-title">Nicio călătorie înregistrată</h3>
                    <p className="bilete-empty-desc">Nu ai cumpărat niciun bilet sau abonament până acum.</p>
                    <button className="bilete-empty-btn" onClick={() => onNavigate('cumparare')}>💳 Cumpără primul bilet</button>
                </div>
            )}

            {!loading && titluri?.length > 0 && (<div className="bilete-lista">{titluri.map(t => renderCard(t))}</div>)}

            {modal?.tip === 'anulare' && (
                <>
                    <div className="bilete-modal-backdrop" onClick={() => { if (!actionLoad) { setModal(null); setActionMsg(null); } }} />
                    <div className="bilete-modal bilete-modal--danger">
                        <div className="bilete-modal-top">
                            <span className="bilete-modal-icon">⚠️</span>
                            <div className="bilete-modal-texts">
                                <p className="bilete-modal-title">Confirmare anulare</p>
                                <p className="bilete-modal-message">
                                    Ești sigur că vrei să anulezi{' '}
                                    <strong style={{ color: '#fca5a5' }}>
                                        {modal.titlu.tip === 'abonament' ? `abonamentul ${LABEL_TIP_ABON[modal.titlu.tip_abonament]}` : `biletul de ${modal.titlu.numar_calatorii} călători${modal.titlu.numar_calatorii !== 1 ? 'i' : 'e'}`}
                                    </strong>?{' '}Această acțiune este ireversibilă.
                                </p>
                            </div>
                        </div>
                        {actionMsg && (<div className={`cont-msg cont-msg--${actionMsg.tip}`}>{actionMsg.text}</div>)}
                        <div className="bilete-modal-actions">
                            <button className="ang-btn-secondary" onClick={() => { setModal(null); setActionMsg(null); }} disabled={actionLoad}>Înapoi</button>
                            <button className="ang-btn-danger" style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.87rem', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }} onClick={handleAnulare} disabled={actionLoad}>
                                {actionLoad ? 'Se anulează...' : '🗑️ Confirmă anularea'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {modal?.tip === 'reinnoieste' && (
                <>
                    <div className="bilete-modal-backdrop" onClick={handleCloseReinnoiModal} />
                    <div className="bilete-modal bilete-modal--reinnoieste">
                        <div className="bilete-modal-top">
                            <span className="bilete-modal-icon">🔄</span>
                            <div className="bilete-modal-texts">
                                <p className="bilete-modal-title">Alege tipul de reînnoire</p>
                                <p className="bilete-modal-message">Data de expirare va fi prelungită cu perioada aleasă.</p>
                            </div>
                        </div>
                        <div className="reinnoi-optiuni">
                            {[
                                { key: 'zi',        label: '1 Zi',   icon: '🌅', pretBaza: 12  },
                                { key: 'trei_zile', label: '3 Zile', icon: '📆', pretBaza: 35  },
                                { key: 'saptamana', label: '7 Zile', icon: '📅', pretBaza: 45  },
                                { key: 'luna',      label: '1 Lună', icon: '🗓️', pretBaza: 100 },
                            ].map(opt => {
                                const { pretFinal, redus } = calcPretOptiune(opt.pretBaza);
                                return (
                                    <button key={opt.key} className={`reinnoi-card ${tipReinnoieste === opt.key ? 'reinnoi-card--selected' : ''}`} onClick={() => setTipReinnoieste(opt.key)} disabled={actionLoad}>
                                        <span className="reinnoi-card-icon">{opt.icon}</span>
                                        <span className="reinnoi-card-label">{opt.label}</span>
                                        {redus ? (
                                            <>
                                                <span className="reinnoi-card-pret-vechi">{opt.pretBaza} lei</span>
                                                <span className="reinnoi-card-pret reinnoi-card-pret--redus">{pretFinal === 0 ? 'Gratuit' : `${pretFinal % 1 === 0 ? pretFinal : pretFinal.toFixed(2)} lei`}</span>
                                                <span className="reinnoi-card-badge-reducere">-{LABEL_REDUCERE[eligibil.tip]}</span>
                                            </>
                                        ) : (<span className="reinnoi-card-pret">{opt.pretBaza} lei</span>)}
                                    </button>
                                );
                            })}
                        </div>
                        {actionMsg && (<div className={`cont-msg cont-msg--${actionMsg.tip}`}>{actionMsg.text}</div>)}
                        <div className="bilete-modal-actions">
                            <button className="ang-btn-secondary" onClick={handleCloseReinnoiModal} disabled={actionLoad}>Anulează</button>
                            <button className="ang-btn-primary" onClick={handleReinnoieste} disabled={actionLoad || !tipReinnoieste}>
                                {actionLoad ? 'Se procesează...' : '✅ Prelungește abonamentul'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
