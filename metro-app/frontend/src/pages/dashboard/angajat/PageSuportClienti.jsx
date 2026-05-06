import { useState, useEffect, useRef, useCallback } from 'react';
import { API } from '../dashboardConstants';
import './PageSuportClienti.css';

const STATUS_META = {
    deschis:  { label: 'Deschis',   cls: 'spc-status--deschis' },
    in_lucru: { label: 'În lucru',  cls: 'spc-status--lucru'   },
    rezolvat: { label: 'Rezolvat',  cls: 'spc-status--rezolvat'},
    inchis:   { label: 'Închis',    cls: 'spc-status--inchis'  },
};

const fmtTime = (ts) => new Date(ts).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (ts) => new Date(ts).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });

export default function PageSuportClienti({ token, user }) {
    const [tab,         setTab]         = useState('deschis');
    const [tickets,     setTickets]     = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [ticketSel,   setTicketSel]   = useState(null);
    const [mesaje,      setMesaje]      = useState([]);
    const [chatView,    setChatView]    = useState(false);
    const [ratingStats, setRatingStats] = useState(null);
    // Chat
    const [msgNou,      setMsgNou]      = useState('');
    const [sendLoad,    setSendLoad]    = useState(false);
    const [actLoad,     setActLoad]     = useState(false);
    const [actMsg,      setActMsg]      = useState(null);
    // Rezolvare (păstrat pentru compatibilitate state)
    const [showRez,     setShowRez]     = useState(false);
    const [rezumat,     setRezumat]     = useState('');

    const chatRef = useRef(null);
    const h = { Authorization: `Bearer ${token}` };

    const fetchTickets = useCallback(async (statusFilter) => {
        setLoading(true);
        try {
            const qs  = statusFilter && statusFilter !== 'toate' ? `?status=${statusFilter}` : '';
            const r   = await fetch(`${API}/api/suport/tickets${qs}`, { headers: h });
            const d   = await r.json();
            setTickets(d.tickets ?? []);
        } catch {}
        setLoading(false);
    }, [token]);

    const fetchMesaje = useCallback(async (id) => {
        try {
            const r = await fetch(`${API}/api/suport/ticket/${id}/mesaje`, { headers: h });
            const d = await r.json();
            setMesaje(d.mesaje ?? []);
            setTicketSel(d.ticket);
        } catch {}
    }, [token]);

    useEffect(() => {
        const filterMap = { deschis: 'deschis', al_meu: 'in_lucru', toate: null };
        fetchTickets(filterMap[tab]);
    }, [tab, fetchTickets]);

    // Fetch rating angajat
    useEffect(() => {
        if (!token) return;
        fetch(`${API}/api/suport/rating-meu`, { headers: h })
            .then(r => r.json())
            .then(d => setRatingStats(d))
            .catch(() => {});
    }, [token]);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [mesaje]);

    // Poll mesaje in chat
    useEffect(() => {
        if (!chatView || !ticketSel) return;
        const iv = setInterval(() => fetchMesaje(ticketSel.id_ticket), 10000);
        return () => clearInterval(iv);
    }, [chatView, ticketSel, fetchMesaje]);

    const openChat = async (ticket) => {
        setTicketSel(ticket);
        setMesaje([]);
        setActMsg(null);
        setShowRez(false);
        setRezumat('');
        await fetchMesaje(ticket.id_ticket);
        setChatView(true);
    };

    const handleAccepta = async () => {
        if (!ticketSel) return;
        setActLoad(true); setActMsg(null);
        try {
            const r = await fetch(`${API}/api/suport/ticket/${ticketSel.id_ticket}/accepta`, {
                method: 'POST', headers: h,
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.mesaj);
            setActMsg({ tip: 'ok', text: d.mesaj });
            await fetchMesaje(ticketSel.id_ticket);
        } catch (e) { setActMsg({ tip: 'err', text: e.message }); }
        setActLoad(false);
    };

    const handleTrimiteMsg = async () => {
        if (!msgNou.trim() || !ticketSel) return;
        setSendLoad(true);
        try {
            const r = await fetch(`${API}/api/suport/ticket/${ticketSel.id_ticket}/mesaj`, {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({ continut: msgNou }),
            });
            if (r.ok) { setMsgNou(''); await fetchMesaje(ticketSel.id_ticket); }
        } catch {}
        setSendLoad(false);
    };

    const handleRezolva = async () => {
        if (!rezumat.trim() || !ticketSel) return;
        setActLoad(true); setActMsg(null);
        try {
            const r = await fetch(`${API}/api/suport/ticket/${ticketSel.id_ticket}/rezolva`, {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({ rezumat }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.mesaj);
            setActMsg({ tip: 'ok', text: d.mesaj });
            setShowRez(false);
            setRezumat('');
            await fetchMesaje(ticketSel.id_ticket);
        } catch (e) { setActMsg({ tip: 'err', text: e.message }); }
        setActLoad(false);
    };

    const isMyTicket = ticketSel?.id_angajat === user?.id;
    const canWrite   = ticketSel && isMyTicket && ticketSel.status === 'in_lucru';
    const canAccept  = ticketSel && ticketSel.status === 'deschis';

    // ── CHAT VIEW ──────────────────────────────────
    if (chatView && ticketSel) {
        return (
            <div className="dash-section spc-chat-page">
                <div className="spc-chat-header">
                    <button className="spc-back-btn" onClick={() => {
                        setChatView(false);
                        const filterMap = { deschis: 'deschis', al_meu: 'in_lucru', toate: null };
                        fetchTickets(filterMap[tab]);
                    }}>← Înapoi</button>
                    <div className="spc-chat-info">
                        <div className="spc-chat-title-row">
                            <h3 className="spc-chat-title">{ticketSel.subiect}</h3>
                            <span className={`spc-status ${STATUS_META[ticketSel.status]?.cls}`}>
                                {STATUS_META[ticketSel.status]?.label}
                            </span>
                        </div>
                        <p className="spc-chat-sub">
                            👤 {ticketSel.calator_prenume} {ticketSel.calator_nume}
                            {ticketSel.angajat_prenume && ` · Agent: ${ticketSel.angajat_prenume} ${ticketSel.angajat_nume}`}
                        </p>
                    </div>
                </div>

                {actMsg && <div className={`cont-msg cont-msg--${actMsg.tip}`}>{actMsg.text}</div>}

                {canAccept && (
                    <div className="spc-action-bar">
                        <p className="spc-action-info">Acest ticket nu a fost preluat. Poți accepta și prelua conversația.</p>
                        <button className="ang-btn-primary" onClick={handleAccepta} disabled={actLoad}>
                            {actLoad ? 'Se procesează...' : '✅ Acceptă ticket'}
                        </button>
                    </div>
                )}

                <div className="spc-chat-messages" ref={chatRef}>
                    {mesaje.length === 0 && (
                        <div className="spc-chat-empty">Niciun mesaj în conversație.</div>
                    )}
                    {mesaje.map(m => (
                        <div key={m.id_mesaj}
                            className={`spc-message ${m.expeditor_tip === 'angajat' ? 'spc-message--mine' : 'spc-message--theirs'}`}>
                            <div className="spc-message-bubble">
                                <p className="spc-message-text">{m.continut}</p>
                                <span className="spc-message-time">{fmtTime(m.created_at)} · {fmtDate(m.created_at)}</span>
                            </div>
                            <div className="spc-message-label">
                                {m.expeditor_tip === 'angajat' ? 'Tu' : ticketSel.calator_prenume ?? 'Călător'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Angajatul nu mai marchează rezolvat — călătorul închi de conversăția */}
                {canWrite && (
                    <div className="spc-agent-hint">
                        💬 Răspunde călătorului. El va finaliza conversația când are răspunsul.
                    </div>
                )}

                {canWrite && (
                    <div className="spc-chat-input-row">
                        <textarea className="spc-chat-input"
                            placeholder="Scrie un mesaj... (Enter = trimite)"
                            value={msgNou}
                            onChange={e => setMsgNou(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTrimiteMsg(); } }}
                            rows={2}
                        />
                        <button className="spc-send-btn" onClick={handleTrimiteMsg}
                            disabled={!msgNou.trim() || sendLoad}>
                            {sendLoad ? '…' : '➤'}
                        </button>
                    </div>
                )}

                {ticketSel.status === 'rezolvat' && (
                    <div className="spc-closed-banner">
                        ⏳ Se așteaptă confirmarea și ratingul de la călător.
                    </div>
                )}
                {ticketSel.status === 'inchis' && (
                    <div className="spc-closed-banner">
                        🔒 Ticket închis · Rating: <span style={{ color: '#fbbf24' }}>{'★'.repeat(ticketSel.rating ?? 0)}</span>
                    </div>
                )}
            </div>
        );
    }

    // ── LIST VIEW ──────────────────────────────────
    const tabTickets = tab === 'al_meu'
        ? tickets.filter(t => t.id_angajat === user?.id)
        : tickets;

    return (
        <div className="dash-section spc-page">
            <div className="spc-header">
                <div className="spc-hero-icon">🎧</div>
                <div style={{ flex: 1 }}>
                    <h2 className="dash-section-title">Suport Clienți</h2>
                    <p className="spc-hero-sub">Gestionează și răspunde la solicitările călătorilor.</p>
                </div>
                {ratingStats && parseFloat(ratingStats.rating_mediu) > 0 && (
                    <div className="spc-rating-badge">
                        <div className="spc-rating-stars">
                            {'★'.repeat(Math.round(parseFloat(ratingStats.rating_mediu)))}
                            {'☆'.repeat(5 - Math.round(parseFloat(ratingStats.rating_mediu)))}
                        </div>
                        <div className="spc-rating-info">
                            <span className="spc-rating-val">{ratingStats.rating_mediu}</span>
                            <span className="spc-rating-sub">{ratingStats.tickete_cu_rating} evaluări</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="spc-tabs">
                {[
                    { id: 'deschis', label: '📬 Deschise' },
                    { id: 'al_meu',  label: '🙋 Ale mele' },
                    { id: 'toate',   label: '📋 Toate'    },
                ].map(t => (
                    <button key={t.id} className={`spc-tab ${tab === t.id ? 'spc-tab--active' : ''}`}
                        onClick={() => setTab(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Lista */}
            {loading ? (
                <div className="ang-loading"><div className="ang-spinner" /></div>
            ) : tabTickets.length === 0 ? (
                <div className="spc-empty">
                    <span>📭</span>
                    <p>{tab === 'deschis' ? 'Nu există tickete deschise.' : tab === 'al_meu' ? 'Nu ai preluat niciun ticket.' : 'Nu există tickete.'}</p>
                </div>
            ) : (
                <div className="spc-ticket-list">
                    {tabTickets.map(t => (
                        <div key={t.id_ticket} className="spc-ticket-card" onClick={() => openChat(t)}>
                            <div className="spc-ticket-top">
                                <span className="spc-ticket-id">#{t.id_ticket}</span>
                                <span className={`spc-status ${STATUS_META[t.status]?.cls}`}>
                                    {STATUS_META[t.status]?.label}
                                </span>
                            </div>
                            <p className="spc-ticket-subiect">{t.subiect}</p>
                            <div className="spc-ticket-meta">
                                <span>👤 {t.calator_prenume} {t.calator_nume}</span>
                                <span>📅 {fmtDate(t.created_at)}</span>
                                {t.angajat_prenume && <span>🙋 {t.angajat_prenume} {t.angajat_nume}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
