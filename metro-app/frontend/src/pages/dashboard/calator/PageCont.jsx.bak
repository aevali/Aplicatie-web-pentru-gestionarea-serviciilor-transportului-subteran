import { useState, useEffect, useCallback } from 'react';
import { API, tipCalatorLabels, formatData } from '../dashboardConstants';
import UploadZone from '../components/UploadZone';
import './PageCont.css';

export default function PageCont({ user, token, onDocStatusChange }) {
    const [cerere,          setCerere]          = useState(undefined);
    const [fisierBuletin,   setFisierBuletin]   = useState(null);
    const [fisierLegitimatie, setFisierLegitimatie] = useState(null);
    const [uploadLoad,      setUploadLoad]      = useState(false);
    const [uploadMsg,       setUploadMsg]       = useState(null);
    const [passForm,        setPassForm]        = useState({ parola_veche: '', parola_noua: '', confirmare: '' });
    const [passLoad,        setPassLoad]        = useState(false);
    const [passMsg,         setPassMsg]         = useState(null);

    const isAdult = user?.tip === 'adult';

    const fetchCerere = useCallback(async () => {
        try {
            const r = await fetch(`${API}/api/cont/verificare`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await r.json();
            setCerere(data.cerere ?? null);
            if (onDocStatusChange) onDocStatusChange(data.cerere ? data.cerere.status : null);
        } catch { setCerere(null); }
    }, [token, onDocStatusChange]);

    useEffect(() => { fetchCerere(); }, [fetchCerere]);

    const handleUpload = async () => {
        if (!fisierBuletin) return;
        setUploadLoad(true); setUploadMsg(null);
        const fd = new FormData();
        fd.append('documente', fisierBuletin);
        if (fisierLegitimatie) fd.append('documente', fisierLegitimatie);
        try {
            const r = await fetch(`${API}/api/cont/documente`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setUploadMsg({ tip: 'ok', text: data.mesaj });
            setFisierBuletin(null);
            setFisierLegitimatie(null);
            await fetchCerere();
        } catch (e) { setUploadMsg({ tip: 'err', text: e.message }); }
        finally { setUploadLoad(false); }
    };

    const handlePassChange = async (e) => {
        e.preventDefault(); setPassMsg(null); setPassLoad(true);
        try {
            const r = await fetch(`${API}/api/cont/schimba-parola`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(passForm) });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setPassMsg({ tip: 'ok', text: data.mesaj });
            setPassForm({ parola_veche: '', parola_noua: '', confirmare: '' });
        } catch (e) { setPassMsg({ tip: 'err', text: e.message }); }
        finally { setPassLoad(false); }
    };

    const renderStatusCard = () => {
        if (cerere === undefined) return null;
        if (!cerere) return (
            <div className="cont-status-card cont-status-card--none">
                <span className="cont-status-icon">📋</span>
                <div className="cont-status-text">
                    <h4>Niciun document trimis</h4>
                    <p>Încarcă un document de identitate (buletin + legitimație de elev/student/pensionar, dacă e cazul) pentru a solicita prețul redus al categoriei tale.</p>
                </div>
            </div>
        );
        if (cerere.status === 'in_asteptare') return (
            <div className="cont-status-card cont-status-card--pending">
                <span className="cont-status-icon">🕐</span>
                <div className="cont-status-text">
                    <h4>Document în verificare</h4>
                    <p>Documentul tău a fost trimis și este în curs de verificare. Vei fi notificat după revizuire.</p>
                    <p className="cont-status-date">Trimis pe: {formatData(cerere.created_at)}</p>
                </div>
            </div>
        );
        if (cerere.status === 'aprobata') return (
            <div className="cont-status-card cont-status-card--ok">
                <span className="cont-status-icon">✅</span>
                <div className="cont-status-text">
                    <h4>Documente verificate</h4>
                    <p>Identitatea ta a fost confirmată. Ai acces la prețul redus al categoriei <strong>{tipCalatorLabels[cerere.tip_solicitat]}</strong>.</p>
                    <p className="cont-status-date">Aprobat pe: {formatData(cerere.updated_at)}</p>
                </div>
            </div>
        );
        if (cerere.status === 'respinsa') return (
            <div className="cont-status-card cont-status-card--rejected">
                <span className="cont-status-icon">❌</span>
                <div className="cont-status-text">
                    <h4>Documente respinse</h4>
                    <p>Cererea ta a fost respinsă. Poți re-încărca documentele corecte mai jos.</p>
                    {cerere.motiv_respingere && (<div className="cont-motiv">💬 {cerere.motiv_respingere}</div>)}
                    <p className="cont-status-date">Respins pe: {formatData(cerere.updated_at)}</p>
                </div>
            </div>
        );
    };

    const docBadgeClass = !cerere ? 'doc-none' : cerere.status === 'in_asteptare' ? 'doc-pending' : cerere.status === 'aprobata' ? 'doc-ok' : 'doc-none';
    const initials  = [user?.prenume?.[0], user?.nume?.[0]].filter(Boolean).join('').toUpperCase() || '?';
    const canUpload = !cerere || cerere.status === 'respinsa';

    return (
        <div className="dash-section cont-page">
            <div className="cont-card cont-card--narrow">
                <div className="cont-card-header"><span className="cont-card-icon">👤</span><span className="cont-card-title">Informații cont</span></div>
                <div className="cont-card-body">
                    <div className="cont-profile-row">
                        <div className="cont-avatar">{initials}</div>
                        <div className="cont-profile-info">
                            <p className="cont-profile-name">{user?.prenume} {user?.nume}</p>
                            <p className="cont-profile-email">{user?.email}</p>
                            <div className="cont-profile-badges">
                                <span className="cont-badge cont-badge--tip">{tipCalatorLabels[user?.tip] ?? user?.tip}</span>
                                <span className={`cont-badge cont-badge--${docBadgeClass}`}>
                                    {!cerere                           && '⚠️ Doc. neverificate'}
                                    {cerere?.status === 'in_asteptare' && '🕐 În verificare'}
                                    {cerere?.status === 'aprobata'     && '✅ Verificat'}
                                    {cerere?.status === 'respinsa'     && '❌ Respins'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="cont-info-grid">
                        <div className="cont-info-item"><span className="cont-info-label">Prenume</span><span className="cont-info-value">{user?.prenume ?? '—'}</span></div>
                        <div className="cont-info-item"><span className="cont-info-label">Nume</span><span className="cont-info-value">{user?.nume ?? '—'}</span></div>
                        <div className="cont-info-item"><span className="cont-info-label">Email</span><span className="cont-info-value">{user?.email ?? '—'}</span></div>
                        <div className="cont-info-item"><span className="cont-info-label">Tip cont</span><span className="cont-info-value">{tipCalatorLabels[user?.tip] ?? '—'}</span></div>
                    </div>
                </div>
            </div>

            <div className="cont-card cont-card--narrow">
                <div className="cont-card-header"><span className="cont-card-icon">📄</span><span className="cont-card-title">Documente & Verificare identitate</span></div>
                <div className="cont-card-body">
                    {renderStatusCard()}
                    {canUpload && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: isAdult ? '1fr' : '1fr 1fr', gap: '0.85rem', marginBottom: '0.25rem' }}>
                                <UploadZone label="📋 Buletin de identitate" sublabel="Obligatoriu — față + verso scanat" fisier={fisierBuletin} onSelect={setFisierBuletin} onClear={() => setFisierBuletin(null)} />
                                {!isAdult && (<UploadZone label="🎓 Legitimație / carnet" sublabel="Elev, student sau pensionar" fisier={fisierLegitimatie} onSelect={setFisierLegitimatie} onClear={() => setFisierLegitimatie(null)} optional />)}
                            </div>
                            {uploadMsg && (<div className={`cont-msg cont-msg--${uploadMsg.tip}`} style={{ marginTop: '0.5rem' }}>{uploadMsg.text}</div>)}
                            <div className="cont-upload-actions">
                                <button className="ang-btn-primary" onClick={handleUpload} disabled={!fisierBuletin || uploadLoad}>
                                    {uploadLoad ? 'Se trimite...' : '📤 Trimite documente'}
                                </button>
                            </div>
                        </>
                    )}
                    {!canUpload && cerere?.status !== 'respinsa' && (
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>Poți re-trimite documentele doar după o respingere sau contactând direct un angajat.</p>
                    )}
                </div>
            </div>

            <div className="cont-card">
                <div className="cont-card-header"><span className="cont-card-icon">📋</span><span className="cont-card-title">Reguli validare reduceri</span></div>
                <div className="cont-card-body">
                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.38)', marginBottom: '1.1rem', lineHeight: 1.6 }}>Pentru a beneficia de reducere, documentele trimise trebuie să respecte condițiile de mai jos, specifice categoriei tale.</p>
                    <div className="cont-reguli-scroll"><div className="cont-reguli-grid">
                        <div className="cont-regula-card cont-regula-card--elev">
                            <div className="cont-regula-header"><span className="cont-regula-icon">🎒</span><div><p className="cont-regula-titlu">Elev</p><p className="cont-regula-reducere">Reducere 100% — gratuit</p></div></div>
                            <ul className="cont-regula-lista">
                                <li><span className="cont-regula-dot" /><span className="cont-regula-text">Înscris la o <strong>școală / liceu din București</strong></span></li>
                                <li><span className="cont-regula-dot" /><span className="cont-regula-text"><strong>Carnet de elev</strong> vizat / ștampilat pentru <strong>anul școlar curent</strong></span></li>
                                <li><span className="cont-regula-dot" /><span className="cont-regula-text">Buletin de identitate — sau, sub <strong>14 ani</strong>, <strong>certificat de naștere</strong></span></li>
                            </ul>
                        </div>
                        <div className="cont-regula-card cont-regula-card--student">
                            <div className="cont-regula-header"><span className="cont-regula-icon">🎓</span><div><p className="cont-regula-titlu">Student</p><p className="cont-regula-reducere">Reducere 90%</p></div></div>
                            <ul className="cont-regula-lista">
                                <li><span className="cont-regula-dot" /><span className="cont-regula-text">Înmatriculat la o <strong>facultate din București</strong></span></li>
                                <li><span className="cont-regula-dot" /><span className="cont-regula-text"><strong>Legitimație de student</strong> vizată pentru <strong>anul universitar curent</strong></span></li>
                                <li><span className="cont-regula-dot" /><span className="cont-regula-text">Buletin de identitate (față + verso)</span></li>
                            </ul>
                        </div>
                        <div className="cont-regula-card cont-regula-card--pensionar">
                            <div className="cont-regula-header"><span className="cont-regula-icon">🏡</span><div><p className="cont-regula-titlu">Pensionar</p><p className="cont-regula-reducere">Reducere 50%</p></div></div>
                            <ul className="cont-regula-lista">
                                <li><span className="cont-regula-dot" /><span className="cont-regula-text"><strong>Domiciliu în București</strong> (conform buletin)</span></li>
                                <li><span className="cont-regula-dot" /><span className="cont-regula-text"><strong>Talon de pensie</strong> emis în <strong>ultimele 3 luni</strong></span></li>
                                <li><span className="cont-regula-dot" /><span className="cont-regula-text">Buletin de identitate (față + verso)</span></li>
                            </ul>
                        </div>
                    </div></div>
                </div>
            </div>

            <div className="cont-card cont-card--narrow">
                <div className="cont-card-header"><span className="cont-card-icon">🔒</span><span className="cont-card-title">Schimbare parolă</span></div>
                <div className="cont-card-body">
                    <form className="cont-pass-form" onSubmit={handlePassChange} noValidate>
                        <div className="cont-field"><label htmlFor="pass-veche">Parola actuală</label><input id="pass-veche" type="password" placeholder="Parola curentă" value={passForm.parola_veche} onChange={e => setPassForm(p => ({ ...p, parola_veche: e.target.value }))} /></div>
                        <div className="cont-field"><label htmlFor="pass-noua">Parolă nouă</label><input id="pass-noua" type="password" placeholder="Minim 8 caractere" value={passForm.parola_noua} onChange={e => setPassForm(p => ({ ...p, parola_noua: e.target.value }))} /></div>
                        <div className="cont-field"><label htmlFor="pass-conf">Confirmare parolă nouă</label><input id="pass-conf" type="password" placeholder="Repetă parola nouă" value={passForm.confirmare} onChange={e => setPassForm(p => ({ ...p, confirmare: e.target.value }))} /></div>
                        {passMsg && <div className={`cont-msg cont-msg--${passMsg.tip}`}>{passMsg.text}</div>}
                        <div className="cont-upload-actions">
                            <button type="submit" className="ang-btn-primary" disabled={passLoad}>{passLoad ? 'Se salvează...' : '🔒 Schimbă parola'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
