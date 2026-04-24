import { useState, useEffect, useCallback, useRef } from 'react';
import { API } from '../dashboardConstants';
import './PageSuportClienti.css';

const STATUS_CONFIG = {
    deschis:  { label: 'Deschis',  cls: 'sca-status--deschis',  icon: '🟡' },
    in_lucru: { label: 'În lucru', cls: 'sca-status--inlucru',  icon: '🔵' },
    rezolvat: { label: 'Rezolvat', cls: 'sca-status--rezolvat', icon: '🟢' },
    inchis:   { label: 'Închis',   cls: 'sca-status--inchis',   icon: '⚫' },
};

const TABS = [
    { id: 'toate',    label: 'Toate',      icon: '📋' },
    { id: 'deschis',  label: 'Deschise',   icon: '🟡' },
    { id: 'in_lucru', label: 'În lucru',   icon: '🔵' },
    { id: 'rezolvat', label: 'Rezolvate',  icon: '🟢' },
    { id: 'inchis',   label: 'Închise',    icon: '⚫' },
];

function StarDisplay({ rating }) {
    if (!rating) return <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>—</span>;
    return (
        <span className="sca-stars">
            {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
        </span>
    );
}

export default function PageSuportClienti({ token, user }) {
    const [tab,            setTab]            = useState('toate');
    const [tickets,        setTickets]        = useState([]);
    const [loading,        setLoading]        = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [mesaje,         setMesaje]         = useState([]);
    const [loadMesaje,     setLoadMesaje]     = useState(false);
    const [chatInput,      setChatInput]      = useState('');
    const [sendLoad,       setSendLoad]       = useState(false);
    const [acceptLoad,     setAcceptLoad]     = useState(false);
    const [rezumat,        setRezumat]        = useState('');
    const [rezolvLoad,     setRezolvLoad]     = useState(false);
    const [rezolvMsg,      setRezolvMsg]      = useState(null);
    const [showRezolva,    setShowRezolva]    = useState(false);
    const [actMsg,         setActMsg]         = useState(null);

    const messagesEndRef = useRef(null);
    const pollRef = useRef(null);
    const headers = { Authorization: `Bearer ${token}` };

    /* ─── Fetch tickets ─── */
    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const url = tab === 'toate'
                ? `${API}/api/suport/tickets`
                : `${API}/api/suport/tickets?status=${tab}`;
            const r = await fetch(url, { headers });
            const data = await r.json();
            setTickets(data.tickets ?? []);
        } catch { setTickets([]); }
        finally { setLoading(false); }
    }, [tab, token]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    /* ─── Fetch mesaje ─── */
    const fetchMesaje = useCallback(async (idTicket) => {
        if (!idTicket) return;
        setLoadMesaje(true);
        try {
            const r = await fetch(`${API}/api/suport/ticket/${idTicket}/mesaje`, { headers });
            const data = await r.json();
            setMesaje(data.mesaje ?? []);
            if (data.ticket) setSelectedTicket(data.ticket);
        } catch { /* ignore */ }
        finally { setLoadMesaje(false); }
    }, [token]);

    /* ─── Polling 5s dacă ticket e in_lucru și aparține acestui angajat ─── */
    useEffect(() => {
        clearInterval(pollRef.current);
        if (selectedTicket?.status === 'in_lucru' && selectedTicket?.id_angajat === user?.id) {
            pollRef.current = setInterval(() => fetchMesaje(selectedTicket.id_ticket), 5000);
        }
        return () => clearInterval(pollRef.current);
    }, [selectedTicket?.id_ticket, selectedTicket?.status, selectedTicket?.id_angajat]);

    /* ─── Scroll jos ─── */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mesaje]);

    /* ─── Deschide ticket ─── */
    const handleOpenTicket = async (t) => {
        setActMsg(null);
        setRezolvMsg(null);
        setShowRezolva(false);
        setRezumat('');
        setChatInput('');
        setSelectedTicket(t);
        await fetchMesaje(t.id_ticket);
    };

    /* ─── Acceptă ticket ─── */
    const handleAccept = async () => {
        setAcceptLoad(true);
        setActMsg(null);
        try {
            const r = await fetch(`${API}/api/suport/ticket/${selectedTicket.id_ticket}/accepta`, {
                method: 'POST',
                headers,
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setActMsg({ tip: 'ok', text: data.mesaj });
            await fetchMesaje(selectedTicket.id_ticket);
            await fetchTickets();
        } catch (e) { setActMsg({ tip: 'err', text: e.message }); }
        finally { setAcceptLoad(false); }
    };

    /* ─── Trimite mesaj ─── */
    const handleSendMesaj = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || sendLoad) return;
        setSendLoad(true);
        try {
            const r = await fetch(`${API}/api/suport/ticket/${selectedTicket.id_ticket}/mesaj`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ continut: chatInput.trim() }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setChatInput('');
            await fetchMesaje(selectedTicket.id_ticket);
        } catch (err) { alert(err.message); }
        finally { setSendLoad(false); }
    };

    /* ─── Rezolvă ticket ─── */
    const handleRezolva = async () => {
        if (!rezumat.trim() || rezolvLoad) return;
        setRezolvLoad(true);
        setRezolvMsg(null);
        try {
            const r = await fetch(`${API}/api/suport/ticket/${selectedTicket.id_ticket}/rezolva`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ rezumat: rezumat.trim() }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setRezolvMsg({ tip: 'ok', text: data.mesaj });
            setShowRezolva(false);
            await fetchMesaje(selectedTicket.id_ticket);
            await fetchTickets();
        } catch (e) { setRezolvMsg({ tip: 'err', text: e.message }); }
        finally { setRezolvLoad(false); }
    };

    const formatTime = (ts) => new Date(ts).toLocaleString('ro-RO', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    const isMyTicket = selectedTicket?.id_angajat === user?.id;

    const filteredTickets = tab === 'toate'
        ? tickets
        : tickets.filter(t => t.status === tab);

    const countByStatus = (s) => tickets.filter(t => t.status === s).length;

    return (
        <div className="sca-root">
            {/* ── Header ── */}
            <div className="sca-header">
                <h2 className="sca-title">🎧 Suport Clienți</h2>
                <p className="sca-sub">Gestionează sesiunile de suport ale pasagerilor.</p>
            </div>

            <div className="sca-layout">
                {/* ══ LISTA TICKETS ══ */}
                <div className="sca-sidebar">
                    {/* Tabs */}
                    <div className="sca-tabs">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                className={`sca-tab ${tab === t.id ? 'active' : ''}`}
                                onClick={() => { setTab(t.id); setSelectedTicket(null); }}
                            >
                                {t.icon} {t.label}
                                {t.id !== 'toate' && countByStatus(t.id) > 0 && (
                                    <span className="sca-tab-cnt">{countByStatus(t.id)}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Refresh */}
                    <div className="sca-refresh-row">
                        <span className="sca-list-label">
                            {loading ? 'Se încarcă...' : `${filteredTickets.length} ticket${filteredTickets.length !== 1 ? 'e' : ''}`}
                        </span>
                        <button className="sca-refresh-btn" onClick={fetchTickets} disabled={loading}>⟳</button>
                    </div>

                    {/* Lista */}
                    <div className="sca-ticket-list">
                        {loading && (
                            <div className="sca-loading"><div className="ang-spinner" /> Se încarcă...</div>
                        )}
                        {!loading && filteredTickets.length === 0 && (
                            <div className="sca-empty">
                                <span>📭</span>
                                <p>Niciun ticket{tab !== 'toate' ? ` cu status „${STATUS_CONFIG[tab]?.label ?? tab}"` : ''}</p>
                            </div>
                        )}
                        {!loading && filteredTickets.map(t => {
                            const sc = STATUS_CONFIG[t.status] ?? {};
                            const isSelected = selectedTicket?.id_ticket === t.id_ticket;
                            return (
                                <div
                                    key={t.id_ticket}
                                    className={`sca-ticket-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleOpenTicket(t)}
                                >
                                    <div className="sca-ticket-top">
                                        <span className={`sca-badge ${sc.cls}`}>{sc.icon} {sc.label}</span>
                                        <span className="sca-ticket-time">{formatTime(t.created_at)}</span>
                                    </div>
                                    <div className="sca-ticket-name">
                                        {t.calator_prenume} {t.calator_nume}
                                    </div>
                                    <div className="sca-ticket-subiect">{t.subiect}</div>
                                    {t.angajat_prenume && (
                                        <div className="sca-ticket-agent">👤 {t.angajat_prenume} {t.angajat_nume}</div>
                                    )}
                                    {t.rating && <StarDisplay rating={t.rating} />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ══ CHAT PANEL ══ */}
                <div className="sca-chat-panel">
                    {!selectedTicket ? (
                        <div className="sca-chat-empty">
                            <span className="sca-chat-empty-icon">💬</span>
                            <h3>Selectează un ticket</h3>
                            <p>Alege un ticket din lista din stânga pentru a vedea conversația și a interacționa cu pasagerul.</p>
                        </div>
                    ) : (
                        <>
                            {/* Header chat */}
                            <div className="sca-chat-header">
                                <div className="sca-chat-header-info">
                                    <div className="sca-chat-caller">
                                        <div className="sca-chat-avatar">
                                            {selectedTicket.calator_prenume?.[0]}{selectedTicket.calator_nume?.[0]}
                                        </div>
                                        <div>
                                            <div className="sca-chat-callername">
                                                {selectedTicket.calator_prenume} {selectedTicket.calator_nume}
                                            </div>
                                            <div className="sca-chat-subiect">{selectedTicket.subiect}</div>
                                        </div>
                                    </div>
                                    <span className={`sca-badge ${STATUS_CONFIG[selectedTicket.status]?.cls}`}>
                                        {STATUS_CONFIG[selectedTicket.status]?.icon} {STATUS_CONFIG[selectedTicket.status]?.label}
                                    </span>
                                </div>
                                <div className="sca-chat-header-actions">
                                    {/* Acceptă — doar dacă e deschis */}
                                    {selectedTicket.status === 'deschis' && (
                                        <button
                                            className="sca-btn-accept"
                                            onClick={handleAccept}
                                            disabled={acceptLoad}
                                        >
                                            {acceptLoad ? 'Se procesează...' : '✋ Acceptă ticket'}
                                        </button>
                                    )}
                                    {/* Rezolvă — doar dacă e in_lucru și e ticket-ul meu */}
                                    {selectedTicket.status === 'in_lucru' && isMyTicket && !showRezolva && (
                                        <button
                                            className="sca-btn-resolve"
                                            onClick={() => setShowRezolva(true)}
                                        >
                                            ✅ Marchează rezolvat
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Mesaje action */}
                            {actMsg && (
                                <div className={`sca-act-msg sca-act-msg--${actMsg.tip}`}>{actMsg.text}</div>
                            )}

                            {/* Rezolvare form */}
                            {showRezolva && (
                                <div className="sca-resolve-form">
                                    <h4>Scrie rezumatul rezolvării</h4>
                                    <textarea
                                        placeholder="Descrie pe scurt cum a fost rezolvată problema pasagerului..."
                                        value={rezumat}
                                        onChange={e => setRezumat(e.target.value)}
                                        rows={3}
                                    />
                                    {rezolvMsg && (
                                        <div className={`sca-act-msg sca-act-msg--${rezolvMsg.tip}`}>{rezolvMsg.text}</div>
                                    )}
                                    <div className="sca-resolve-actions">
                                        <button className="sca-btn-cancel" onClick={() => { setShowRezolva(false); setRezumat(''); }}>Anulează</button>
                                        <button
                                            className="sca-btn-resolve"
                                            disabled={!rezumat.trim() || rezolvLoad}
                                            onClick={handleRezolva}
                                        >
                                            {rezolvLoad ? 'Se procesează...' : '✅ Confirmă rezolvare'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Rezumat afișat dacă ticket e rezolvat/închis */}
                            {['rezolvat','inchis'].includes(selectedTicket.status) && selectedTicket.rezumat && (
                                <div className="sca-rezumat-display">
                                    <span className="sca-rezumat-icon">📋</span>
                                    <div>
                                        <div className="sca-rezumat-label">Rezumat rezolvare</div>
                                        <div className="sca-rezumat-text">{selectedTicket.rezumat}</div>
                                    </div>
                                    {selectedTicket.rating && (
                                        <div className="sca-rezumat-rating">
                                            <StarDisplay rating={selectedTicket.rating} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Mesaje */}
                            <div className="sca-messages">
                                {loadMesaje && mesaje.length === 0 && (
                                    <div className="sca-loading"><div className="ang-spinner" /> Se încarcă...</div>
                                )}
                                {selectedTicket.status === 'deschis' && (
                                    <div className="sca-status-banner">
                                        🕐 Ticket neacceptat — acceptă pentru a putea răspunde pasagerului.
                                    </div>
                                )}
                                {selectedTicket.status === 'in_lucru' && !isMyTicket && (
                                    <div className="sca-status-banner sca-status-banner--blue">
                                        🔵 Ticket acceptat de alt angajat. Poți vedea conversația.
                                    </div>
                                )}
                                {mesaje.map(m => (
                                    <div key={m.id_mesaj} className={`sca-msg ${m.expeditor_tip === 'angajat' ? 'sca-msg--mine' : 'sca-msg--caller'}`}>
                                        <div className="sca-msg-bubble">
                                            <p className="sca-msg-text">{m.continut}</p>
                                            <span className="sca-msg-time">{formatTime(m.created_at)}</span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input — doar dacă ticket e in_lucru și îmi aparține */}
                            {selectedTicket.status === 'in_lucru' && isMyTicket && (
                                <form className="sca-input-row" onSubmit={handleSendMesaj}>
                                    <input
                                        type="text"
                                        className="sca-input"
                                        placeholder="Răspunde pasagerului..."
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        disabled={sendLoad}
                                    />
                                    <button
                                        type="submit"
                                        className="sca-send-btn"
                                        disabled={!chatInput.trim() || sendLoad}
                                    >
                                        {sendLoad ? '...' : '➤'}
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
