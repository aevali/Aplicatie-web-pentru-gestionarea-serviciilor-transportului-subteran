import { useState, useEffect, useCallback } from 'react';
import { API } from '../dashboardConstants';
import './PageNotificari.css';

const TIP_NOTIF_ICON = {
    reinoire_abonament: '🔄',
    info:              '🔔',
};

export default function PageNotificari({ token }) {
    const [notificari, setNotificari] = useState(undefined);
    const [loading,    setLoading]    = useState(true);
    const [marcLoad,   setMarcLoad]   = useState(false);

    const fetchNotificari = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const r = await fetch(`${API}/api/notificari`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await r.json();
            setNotificari(data.notificari ?? []);
        } catch { setNotificari([]); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchNotificari(); }, [fetchNotificari]);

    const handleCiteste = async (id) => {
        try {
            await fetch(`${API}/api/notificari/${id}/citita`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
            setNotificari(prev => prev.map(n => n.id_notificare === id ? { ...n, citita: true } : n));
        } catch { /* ignore */ }
    };

    const handleMarcheazaTot = async () => {
        setMarcLoad(true);
        try {
            await fetch(`${API}/api/notificari/marcheaza-toate/citite`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
            setNotificari(prev => prev.map(n => ({ ...n, citita: true })));
        } catch { /* ignore */ }
        finally { setMarcLoad(false); }
    };

    const formatTimestamp = (ts) => {
        if (!ts) return '—';
        const d = new Date(ts);
        return d.toLocaleString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const necitite = notificari?.filter(n => !n.citita).length ?? 0;

    return (
        <div className="dash-section notif-page">
            <div className="notif-header-row">
                <div>
                    <h2 className="notif-title">🔔 Notificări</h2>
                    <p className="notif-sub">
                        {loading ? 'Se încarcă...' : (
                            necitite > 0
                                ? `${necitite} notificare${necitite !== 1 ? 'i' : ''} nouă${necitite !== 1 ? '' : ''}`
                                : 'Toate notificările sunt citite'
                        )}
                    </p>
                </div>
                {!loading && necitite > 0 && (
                    <button className="notif-marcheaza-btn" onClick={handleMarcheazaTot} disabled={marcLoad}>
                        {marcLoad ? 'Se marchează...' : '✓ Marchează toate ca citite'}
                    </button>
                )}
            </div>

            {loading && (<div className="notif-loading"><div className="ang-spinner" /><span>Se încarcă notificările...</span></div>)}

            {!loading && notificari?.length === 0 && (
                <div className="notif-empty">
                    <div className="notif-empty-icon">🔔</div>
                    <h3 className="notif-empty-title">Nicio notificare</h3>
                    <p className="notif-empty-desc">Veți fi notificați când călătorii efectuează acțiuni importante.</p>
                </div>
            )}

            {!loading && notificari?.length > 0 && (
                <div className="notif-lista">
                    {notificari.map(n => (
                        <div key={n.id_notificare} className={`notif-item ${n.citita ? 'notif-item--citita' : 'notif-item--necitita'}`} onClick={() => !n.citita && handleCiteste(n.id_notificare)}>
                            <div className="notif-item-icon">{TIP_NOTIF_ICON[n.tip] ?? '🔔'}</div>
                            <div className="notif-item-body">
                                <p className="notif-item-mesaj">{n.mesaj}</p>
                                <div className="notif-item-meta">
                                    <span className="notif-item-time">{formatTimestamp(n.created_at)}</span>
                                    {!n.citita && <span className="notif-item-nou">Nou</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
