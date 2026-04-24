import { useState, useEffect, useCallback } from 'react';
import { API, tipCalatorLabels, formatData } from '../dashboardConstants';
import './PageVerificari.css';

const TABS_VERIF = [
    { id: 'toate',        label: 'Toate',        icon: '📋' },
    { id: 'in_asteptare', label: 'În așteptare', icon: '🕐' },
    { id: 'aprobata',     label: 'Aprobate',     icon: '✅' },
    { id: 'respinsa',     label: 'Respinse',     icon: '❌' },
];
const statusLabels = { in_asteptare: 'În așteptare', aprobata: 'Aprobată', respinsa: 'Respinsă' };
const statusIcons  = { in_asteptare: '🕐', aprobata: '✅', respinsa: '❌' };

export default function PageVerificari({ token }) {
    const [cereri,      setCereri]      = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [tab,         setTab]         = useState('toate');
    const [selected,    setSelected]    = useState(null);
    const [motiv,       setMotiv]       = useState('');
    const [actLoad,     setActLoad]     = useState(false);
    const [actMsg,      setActMsg]      = useState(null);
    const [showRejForm, setShowRejForm] = useState(false);

    const fetchCereri = useCallback(async () => {
        setLoading(true);
        try {
            const url = tab === 'toate' ? `${API}/api/verificari` : `${API}/api/verificari?status=${tab}`;
            const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const data = await r.json();
            setCereri(Array.isArray(data) ? data : []);
        } catch { setCereri([]); }
        finally { setLoading(false); }
    }, [tab, token]);

    useEffect(() => { fetchCereri(); }, [fetchCereri]);

    const handleActiune = async (actiune) => {
        if (actiune === 'respinge' && !motiv.trim()) return;
        setActLoad(true); setActMsg(null);
        try {
            const r = await fetch(`${API}/api/verificari/${selected.id_cerere}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ actiune, motiv }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setActMsg({ tip: 'ok', text: data.mesaj });
            setTimeout(() => { setSelected(null); setMotiv(''); setActMsg(null); setShowRejForm(false); fetchCereri(); }, 1200);
        } catch (e) { setActMsg({ tip: 'err', text: e.message }); }
        finally { setActLoad(false); }
    };

    const docList = (() => {
        if (!selected?.cale_document) return [];
        try { const parsed = JSON.parse(selected.cale_document); return Array.isArray(parsed) ? parsed : [parsed]; }
        catch { return [selected.cale_document]; }
    })();
    const docBaseUrl = selected ? `${API}/api/verificari/${selected.id_cerere}/document` : null;
    const docLabels = ['Buletin de identitate', 'Legitimație / carnet'];

    return (
        <div className="dash-section verif-page">
            <div>
                <h2 className="dash-section-title">Verificări Documente</h2>
                <p className="dash-section-sub">Revizuiești cererile de reducere ale călătorilor.</p>
            </div>

            <div className="verif-tabs">
                {TABS_VERIF.map(t => {
                    const cnt = t.id === 'toate' ? cereri.length : cereri.filter(c => c.status === t.id).length;
                    return (<button key={t.id} className={`verif-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.icon} {t.label}{cnt > 0 && <span className="verif-tab-count">{cnt}</span>}</button>);
                })}
            </div>

            {loading ? (
                <div className="verif-loading"><div className="ang-spinner" /> Se încarcă...</div>
            ) : cereri.length === 0 ? (
                <div className="verif-table-wrap"><div className="verif-empty"><div className="verif-empty-icon">📋</div><p>Nicio cerere{tab !== 'toate' ? ` cu status „${statusLabels[tab]}"` : ''} momentan.</p></div></div>
            ) : (
                <div className="verif-table-wrap">
                    <table className="verif-table">
                        <thead><tr><th>Călător</th><th>Tip</th><th>Data cererii</th><th>Status</th><th>Acțiuni</th></tr></thead>
                        <tbody>
                            {cereri.map(c => (
                                <tr key={c.id_cerere} onClick={() => { setSelected(c); setMotiv(''); setActMsg(null); setShowRejForm(false); }}>
                                    <td><div className="verif-name-cell"><div className="verif-avatar">{(c.prenume?.[0] ?? '?').toUpperCase()}{(c.nume?.[0] ?? '').toUpperCase()}</div><div><div className="verif-fullname">{c.prenume} {c.nume}</div><div className="verif-email">{c.email}</div></div></div></td>
                                    <td>{tipCalatorLabels[c.tip_calator] ?? c.tip_calator}</td>
                                    <td>{new Date(c.created_at).toLocaleDateString('ro-RO')}</td>
                                    <td><span className={`verif-status verif-status--${c.status}`}>{statusIcons[c.status]} {statusLabels[c.status]}</span></td>
                                    <td><button className="verif-btn-view" onClick={e => { e.stopPropagation(); setSelected(c); setMotiv(''); setActMsg(null); setShowRejForm(false); }}>🔍 Vezi</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selected && (
                <>
                    <div className="verif-modal-backdrop" onClick={() => setSelected(null)} />
                    <div className="verif-modal">
                        <div className="verif-modal-header">
                            <h3 className="verif-modal-title">Cerere #{selected.id_cerere}</h3>
                            <button className="verif-modal-close" onClick={() => setSelected(null)}>✕</button>
                        </div>
                        <div className="verif-modal-body">
                            <div className="verif-modal-info-grid">
                                <div className="verif-modal-field"><span className="verif-modal-field-label">Nume complet</span><span className="verif-modal-field-value">{selected.prenume} {selected.nume}</span></div>
                                <div className="verif-modal-field"><span className="verif-modal-field-label">Email</span><span className="verif-modal-field-value">{selected.email}</span></div>
                                <div className="verif-modal-field"><span className="verif-modal-field-label">Tip călător</span><span className="verif-modal-field-value">{tipCalatorLabels[selected.tip_calator] ?? selected.tip_calator}</span></div>
                                <div className="verif-modal-field"><span className="verif-modal-field-label">Status</span><span className={`verif-status verif-status--${selected.status}`}>{statusIcons[selected.status]} {statusLabels[selected.status]}</span></div>
                                <div className="verif-modal-field"><span className="verif-modal-field-label">Dată trimitere</span><span className="verif-modal-field-value">{formatData(selected.created_at)}</span></div>
                                {selected.angajat_prenume && (<div className="verif-modal-field"><span className="verif-modal-field-label">Revizuit de</span><span className="verif-modal-field-value">{selected.angajat_prenume} {selected.angajat_nume}</span></div>)}
                            </div>

                            {selected.motiv_respingere && (
                                <div style={{ padding: '0.7rem 0.9rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '0.83rem', color: '#fca5a5', fontStyle: 'italic' }}>💬 {selected.motiv_respingere}</div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                {docList.map((cale, idx) => {
                                    const ext  = cale.split('.').pop().toLowerCase();
                                    const icon = ext === 'pdf' ? '📄' : '🖼️';
                                    const name = cale.split('/').pop();
                                    const url  = `${docBaseUrl}?index=${idx}`;
                                    return (
                                        <div key={idx} className="verif-doc-preview">
                                            <span className="verif-doc-icon">{icon}</span>
                                            <div className="verif-doc-info"><div className="verif-doc-name">{name}</div><div className="verif-doc-hint">{docLabels[idx] ?? `Document ${idx + 1}`}</div></div>
                                            <button className="verif-btn-download" onClick={() => { fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.blob()).then(blob => { window.open(URL.createObjectURL(blob), '_blank'); }); }}>📂 Deschide</button>
                                        </div>
                                    );
                                })}
                                {docList.length === 0 && (<p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)' }}>Niciun document atașat.</p>)}
                            </div>

                            {actMsg && <div className={`cont-msg cont-msg--${actMsg.tip}`}>{actMsg.text}</div>}

                            {selected.status === 'in_asteptare' && (
                                <>
                                    {showRejForm && (
                                        <div className="verif-respingere-field">
                                            <label htmlFor="motiv-resp">Motiv respingere *</label>
                                            <textarea id="motiv-resp" placeholder="Explică motivul respingerii..." value={motiv} onChange={e => setMotiv(e.target.value)} />
                                        </div>
                                    )}
                                    <div className="verif-modal-actions">
                                        <button className="ang-btn-secondary" onClick={() => setSelected(null)}>Anulează</button>
                                        {!showRejForm ? (
                                            <button className="verif-btn-respinge" onClick={() => setShowRejForm(true)}>❌ Respinge</button>
                                        ) : (
                                            <button className="verif-btn-respinge" disabled={!motiv.trim() || actLoad} onClick={() => handleActiune('respinge')}>{actLoad ? 'Se procesează...' : '❌ Confirmă respingere'}</button>
                                        )}
                                        <button className="verif-btn-aproba" disabled={actLoad} onClick={() => handleActiune('aproba')}>{actLoad ? 'Se procesează...' : '✅ Aprobă'}</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
