import { useState, useEffect, useRef, useCallback } from 'react';
import { API } from '../dashboardConstants';
import './PageSuport.css';

const FAQ = [
    {
        id: 1, cat: 'Bilete & Abonamente',
        q: 'Cum cumpăr un bilet sau abonament?',
        a: 'Accesează secțiunea „Cumpărare" din meniu. Alege între bilet (1, 2, 5, 10 sau 20 de călătorii) sau abonament (zilnic, 3 zile, săptămânal, lunar, semestrial sau anual). Codul QR va fi disponibil imediat pe pagina Home.'
    },
    {
        id: 2, cat: 'Bilete & Abonamente',
        q: 'Unde găsesc biletul meu activ?',
        a: 'Codul QR al titlului activ este afișat pe pagina Home. Istoricul complet al achizițiilor îl găsești în secțiunea „Biletele Mele".'
    },
    {
        id: 3, cat: 'Bilete & Abonamente',
        q: 'Pot reînnoi un abonament înainte să expire?',
        a: 'Da! Poți reînnoi cu până la 3 zile înainte de expirare. Zilele rămase se adaugă automat la noul abonament — nu pierzi nicio zi plătită.'
    },
    {
        id: 4, cat: 'Bilete & Abonamente',
        q: 'Pot anula un bilet sau abonament?',
        a: 'Biletele utilizate nu pot fi anulate. Abonamentele active pot fi anulate din „Biletele Mele". Dacă ai o situație specială, deschide un ticket de suport mai jos.'
    },
    {
        id: 5, cat: 'Reduceri & Documente',
        q: 'Ce reduceri sunt disponibile?',
        a: 'Elevii beneficiază de gratuitate (100%), studenții de 90% reducere, pensionarii de 50%. Reducerile se aplică la bilete și abonamentele standard după aprobarea documentelor.'
    },
    {
        id: 6, cat: 'Reduceri & Documente',
        q: 'Cum îmi validez documentele pentru reducere?',
        a: 'Accesează „Contul Meu" → „Documente & Verificare identitate". Încarcă buletinul + documentul specific categoriei (carnet elev, legitimație student, talon pensie). Un angajat verifică în 24-48h.'
    },
    {
        id: 7, cat: 'Reduceri & Documente',
        q: 'De ce nu pot cumpăra la prețul redus?',
        a: 'Documentele trebuie aprobate de un angajat. Verifică statusul în „Contul Meu". Dacă sunt respinse, citește motivul și reîncarcă documentele corecte. Adulții nu sunt eligibili pentru reduceri.'
    },
    {
        id: 8, cat: 'Reduceri & Documente',
        q: 'Ce documente trebuie să încarc?',
        a: 'Toți: buletin de identitate (față + verso). Suplimentar — Elevi: carnet vizat pentru anul curent (sau certificat naștere sub 14 ani); Studenți: legitimație vizată; Pensionari: talon de pensie din ultimele 3 luni.'
    },
    {
        id: 9, cat: 'Cont & Securitate',
        q: 'Cum îmi schimb parola?',
        a: 'Accesează „Contul Meu" → secțiunea „Schimbare parolă". Introdu parola actuală, noua parolă (minim 8 caractere) și confirmarea.'
    },
    {
        id: 10, cat: 'Cont & Securitate',
        q: 'Pot folosi contul pe mai multe dispozitive?',
        a: 'Da, poți accesa contul de pe orice browser. Sesiunea este menținută prin token JWT stocat local. La deconectare, token-ul este eliminat din dispozitivul respectiv.'
    },
    {
        id: 11, cat: 'Utilizare & Validare',
        q: 'Cum funcționează codul QR la turnichet?',
        a: 'Prezintă codul QR de pe pagina Home la turnichet sau angajat. Fiecare scanare deduce o călătorie (bilet) sau verifică valabilitatea (abonament). Codul este unic și personal.'
    },
    {
        id: 12, cat: 'Utilizare & Validare',
        q: 'Biletele sunt nominale (personale)?',
        a: 'Da, toate titlurile sunt legate de contul tău și nu pot fi transferate sau utilizate de altă persoană.'
    },
];

const STATUS_META = {
    deschis:  { label: 'Deschis',   cls: 'sp-status--deschis' },
    in_lucru: { label: 'În lucru',  cls: 'sp-status--lucru'   },
    rezolvat: { label: 'Rezolvat',  cls: 'sp-status--rezolvat'},
    inchis:   { label: 'Închis',    cls: 'sp-status--inchis'  },
};

const fmtTime = (ts) => new Date(ts).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (ts) => new Date(ts).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
const fmtFull = (ts) => new Date(ts).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });

export default function PageSuport({ user, token }) {
    const [faqOpen,      setFaqOpen]      = useState(null);
    const [tickets,      setTickets]      = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [view,         setView]         = useState('main'); // 'main' | 'chat'
    const [ticketSel,    setTicketSel]    = useState(null);
    const [mesaje,       setMesaje]       = useState([]);
    // Form
    const [fSubiect,     setFSubiect]     = useState('');
    const [fMesaj,       setFMesaj]       = useState('');
    const [fLoad,        setFLoad]        = useState(false);
    const [fMsg,         setFMsg]         = useState(null);
    // Chat
    const [msgNou,       setMsgNou]       = useState('');
    const [sendLoad,     setSendLoad]     = useState(false);
    const [ratingHover,  setRatingHover]  = useState(0);
    const [ratingLoad,   setRatingLoad]   = useState(false);

    const chatRef = useRef(null);
    const h = { Authorization: `Bearer ${token}` };

    const fetchTickets = useCallback(async () => {
        try {
            const r = await fetch(`${API}/api/suport/ticket/al-meu`, { headers: h });
            const d = await r.json();
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
            fetch(`${API}/api/suport/ticket/${id}/vazut`, { method: 'POST', headers: h });
        } catch {}
    }, [token]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [mesaje]);

    // Poll in chat
    useEffect(() => {
        if (view !== 'chat' || !ticketSel) return;
        const iv = setInterval(() => fetchMesaje(ticketSel.id_ticket), 10000);
        return () => clearInterval(iv);
    }, [view, ticketSel, fetchMesaje]);

    const openChat = async (ticket) => {
        setTicketSel(ticket);
        await fetchMesaje(ticket.id_ticket);
        setView('chat');
    };

    const handleSubmitTicket = async (e) => {
        e.preventDefault();
        if (!fSubiect.trim() || !fMesaj.trim()) return;
        setFLoad(true); setFMsg(null);
        try {
            const r = await fetch(`${API}/api/suport/ticket`, {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({ subiect: fSubiect, mesaj: fMesaj }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.mesaj);
            setFSubiect(''); setFMesaj('');
            await fetchTickets();
            await fetchMesaje(d.ticket.id_ticket);
            setView('chat');
        } catch (e) { setFMsg({ tip: 'err', text: e.message }); }
        setFLoad(false);
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

    const handleFeedback = async (rating) => {
        setRatingLoad(true);
        try {
            const r = await fetch(`${API}/api/suport/ticket/${ticketSel.id_ticket}/feedback`, {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating }),
            });
            if (r.ok) { await fetchTickets(); await fetchMesaje(ticketSel.id_ticket); }
        } catch {}
        setRatingLoad(false);
    };

    const ticketActiv    = tickets.find(t => ['deschis', 'in_lucru', 'rezolvat'].includes(t.status));
    const ticketsInchise = tickets.filter(t => t.status === 'inchis');

    const faqBycat = FAQ.reduce((a, f) => { (a[f.cat] = a[f.cat] || []).push(f); return a; }, {});

    // ── CHAT VIEW ──────────────────────────────────
    if (view === 'chat' && ticketSel) {
        const isClosed       = ticketSel.status === 'inchis';
        const canWrite       = ticketSel.status === 'in_lucru';
        const canFinalize    = ticketSel.status === 'in_lucru';
        const isRezolvat     = ticketSel.status === 'rezolvat';

        return (
            <div className="dash-section sp-chat-page">
                <div className="sp-chat-header">
                    <button className="sp-back-btn" onClick={() => { setView('main'); fetchTickets(); }}>
                        ← Înapoi
                    </button>
                    <div className="sp-chat-info">
                        <h3 className="sp-chat-title">{ticketSel.subiect}</h3>
                        <div className="sp-chat-meta">
                            <span className={`sp-status ${STATUS_META[ticketSel.status]?.cls}`}>
                                {STATUS_META[ticketSel.status]?.label}
                            </span>
                            {ticketSel.angajat_prenume && (
                                <span className="sp-chat-agent">
                                    👤 {ticketSel.angajat_prenume} {ticketSel.angajat_nume}
                                </span>
                            )}
                            {!ticketSel.angajat_prenume && (
                                <span className="sp-chat-agent sp-chat-agent--wait">
                                    ⏳ Se așteaptă preluarea de un agent...
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="sp-chat-messages" ref={chatRef}>
                    {mesaje.length === 0 && (
                        <div className="sp-chat-empty">Niciun mesaj încă. Agentul va răspunde în curând.</div>
                    )}
                    {mesaje.map(m => (
                        <div key={m.id_mesaj}
                            className={`sp-message ${m.expeditor_tip === 'calator' ? 'sp-message--mine' : 'sp-message--theirs'}`}>
                            <div className="sp-message-bubble">
                                <p className="sp-message-text">{m.continut}</p>
                                <span className="sp-message-time">{fmtTime(m.created_at)} · {fmtDate(m.created_at)}</span>
                            </div>
                            <div className="sp-message-label">
                                {m.expeditor_tip === 'calator' ? 'Tu' : `Agent ${ticketSel.angajat_prenume ?? ''}`}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Buton finalizare — călătorul decide când e rezolvat */}
                {canFinalize && (
                    <div className="sp-finalize-card">
                        <p className="sp-finalize-title">Ai primit răspunsul? Finalizează conversația:</p>
                        <p className="sp-finalize-sub">Lasă un rating și închide ticketul când problema ta a fost rezolvată.</p>
                        <div className="sp-stars">
                            {[1,2,3,4,5].map(s => (
                                <button key={s}
                                    className={`sp-star ${ratingHover >= s ? 'sp-star--active' : ''}`}
                                    onMouseEnter={() => setRatingHover(s)}
                                    onMouseLeave={() => setRatingHover(0)}
                                    onClick={() => handleFeedback(s)}
                                    disabled={ratingLoad}>★</button>
                            ))}
                        </div>
                        <p className="sp-finalize-hint">Click pe o stea pentru a finaliza</p>
                    </div>
                )}

                {/* Dacă a fost marcat rezolvat de angajat (fallback) */}
                {isRezolvat && (
                    <div className="sp-feedback-card">
                        <p className="sp-feedback-title">✅ Agentul a marcat problema ca rezolvată</p>
                        {ticketSel.rezumat && <p className="sp-feedback-rezumat">📋 {ticketSel.rezumat}</p>}
                        <p className="sp-feedback-sub">Lasă un rating pentru a închide conversația:</p>
                        <div className="sp-stars">
                            {[1,2,3,4,5].map(s => (
                                <button key={s}
                                    className={`sp-star ${ratingHover >= s ? 'sp-star--active' : ''}`}
                                    onMouseEnter={() => setRatingHover(s)}
                                    onMouseLeave={() => setRatingHover(0)}
                                    onClick={() => handleFeedback(s)}
                                    disabled={ratingLoad}>★</button>
                            ))}
                        </div>
                    </div>
                )}

                {isClosed && (
                    <div className="sp-closed-banner">
                        🔒 Conversație închisă · Rating: <span className="sp-stars-inline">{'★'.repeat(ticketSel.rating ?? 0)}</span>
                    </div>
                )}

                {canWrite && (
                    <div className="sp-chat-input-row">
                        <textarea
                            className="sp-chat-input"
                            placeholder="Scrie un mesaj... (Enter = trimite, Shift+Enter = linie nouă)"
                            value={msgNou}
                            onChange={e => setMsgNou(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTrimiteMsg(); } }}
                            rows={2}
                        />
                        <button className="sp-send-btn" onClick={handleTrimiteMsg}
                            disabled={!msgNou.trim() || sendLoad}>
                            {sendLoad ? '…' : '➤'}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // ── MAIN VIEW ──────────────────────────────────
    return (
        <div className="dash-section sp-page">
            <div className="sp-hero">
                <div className="sp-hero-icon">💬</div>
                <div>
                    <h2 className="dash-section-title">Centru de Asistență</h2>
                    <p className="sp-hero-sub">Găsește răspunsuri rapide sau contactează un agent de suport.</p>
                </div>
            </div>

            {/* Ticket activ */}
            {ticketActiv && (
                <div className="sp-active-ticket" onClick={() => openChat(ticketActiv)}>
                    <div className="sp-active-left">
                        <span className="sp-active-icon">🎫</span>
                        <div>
                            <p className="sp-active-title">{ticketActiv.subiect}</p>
                            <p className="sp-active-sub">
                                {ticketActiv.angajat_prenume
                                    ? `Agent: ${ticketActiv.angajat_prenume} ${ticketActiv.angajat_nume}`
                                    : 'Se așteaptă preluarea de un agent...'}
                            </p>
                        </div>
                    </div>
                    <div className="sp-active-right">
                        <span className={`sp-status ${STATUS_META[ticketActiv.status]?.cls}`}>
                            {STATUS_META[ticketActiv.status]?.label}
                        </span>
                        <span className="sp-active-arrow">→</span>
                    </div>
                </div>
            )}

            {/* FAQ */}
            <div className="sp-section">
                <h3 className="sp-section-title">❓ Întrebări frecvente</h3>
                <div className="sp-faq-list">
                    {Object.entries(faqBycat).map(([cat, items]) => (
                        <div key={cat} className="sp-faq-cat">
                            <p className="sp-faq-cat-label">{cat}</p>
                            {items.map(faq => (
                                <div key={faq.id} className={`sp-faq-item ${faqOpen === faq.id ? 'sp-faq-item--open' : ''}`}>
                                    <button className="sp-faq-q" onClick={() => setFaqOpen(faqOpen === faq.id ? null : faq.id)}>
                                        <span>{faq.q}</span>
                                        <span className="sp-faq-ch">{faqOpen === faq.id ? '▲' : '▼'}</span>
                                    </button>
                                    {faqOpen === faq.id && <div className="sp-faq-a">{faq.a}</div>}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Form ticket nou */}
            {!ticketActiv && (
                <div className="sp-section">
                    <h3 className="sp-section-title">📩 Contactează suportul</h3>
                    <p className="sp-section-sub">Nu ai găsit răspunsul? Un agent îți va răspunde în cel mai scurt timp.</p>
                    <form className="sp-form" onSubmit={handleSubmitTicket}>
                        <div className="sp-form-field">
                            <label>Subiect</label>
                            <input type="text" placeholder="ex: Nu pot cumpăra abonament"
                                value={fSubiect} onChange={e => setFSubiect(e.target.value)} maxLength={250} />
                        </div>
                        <div className="sp-form-field">
                            <label>Descrierea problemei</label>
                            <textarea placeholder="Descrie problema cât mai detaliat..."
                                value={fMesaj} onChange={e => setFMesaj(e.target.value)} rows={4} />
                        </div>
                        {fMsg && <div className={`cont-msg cont-msg--${fMsg.tip}`}>{fMsg.text}</div>}
                        <button type="submit" className="ang-btn-primary"
                            disabled={!fSubiect.trim() || !fMesaj.trim() || fLoad}>
                            {fLoad ? 'Se trimite...' : '📨 Trimite cerere'}
                        </button>
                    </form>
                </div>
            )}

            {/* Istoric */}
            {ticketsInchise.length > 0 && (
                <div className="sp-section">
                    <h3 className="sp-section-title">📋 Istoricul sesiunilor</h3>
                    <div className="sp-history-list">
                        {ticketsInchise.map(t => (
                            <div key={t.id_ticket} className="sp-history-item" onClick={() => openChat(t)}>
                                <div>
                                    <p className="sp-history-title">{t.subiect}</p>
                                    <p className="sp-history-date">
                                        {fmtFull(t.created_at)}
                                        {t.rating ? ` · ${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}` : ''}
                                    </p>
                                </div>
                                <span className={`sp-status ${STATUS_META[t.status]?.cls}`}>
                                    {STATUS_META[t.status]?.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
