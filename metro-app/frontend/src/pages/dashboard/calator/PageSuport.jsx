import { useState, useEffect, useCallback, useRef } from 'react';
import { API } from '../dashboardConstants';
import './PageSuport.css';

/* ─── FAQ ─── */
const FAQ_ITEMS = [
    {
        q: 'Cum cumpăr un bilet sau abonament?',
        a: 'Din dashboard, accesează secțiunea „Cumpărare" din meniul lateral. Poți alege între bilet (1–20 călătorii) sau abonament (1 zi până la 1 an). Plata se înregistrează în cont, iar biletul apare imediat în „Biletele Mele".',
    },
    {
        q: 'Cum obțin reducere dacă sunt elev, student sau pensionar?',
        a: 'Accesează „Contul Meu" din meniul de profil (dreapta sus), încarcă o copie a buletinului și a legitimației/carnetului. Un angajat MetroBucurești va verifica documentele în 24–48 de ore. Reducerile sunt: elev 100%, student 90%, pensionar 50% — aplicate la abonamentele de maximum 1 lună.',
    },
    {
        q: 'Cât durează verificarea documentelor?',
        a: 'De regulă 24–48 de ore în zilele lucrătoare. Poți urmări statusul în secțiunea „Contul Meu". Dacă documentele sunt respinse, primești un motiv detaliat și poți retrimite documente corectate.',
    },
    {
        q: 'Pot anula un bilet sau abonament activ?',
        a: 'Da. Din secțiunea „Biletele Mele" apasă butonul „Anulează" de lângă titlul activ. Atenție: anularea este definitivă și nu se acordă rambursare automată. Pentru situații excepționale, contactează suportul.',
    },
    {
        q: 'Cum funcționează codul QR de pe bilet?',
        a: 'La fiecare titlu de călătorie cumpărat se generează automat un cod QR unic. La intrarea în stație, prezintă-l angajatului sau scannerului. Pentru bilete, o călătorie este scăzută la fiecare validare. Abonamentele sunt valabile nelimitat în intervalul de timp aferent.',
    },
    {
        q: 'Pot reînnoi abonamentul înainte de expirare?',
        a: 'Da, dar reînnoirea este disponibilă cu maximum 3 zile înainte de data expirării. Accesează „Biletele Mele", apasă „Reînnoiește" și alege durata dorită. Zilele se adaugă cumulativ la abonamentul existent.',
    },
    {
        q: 'Ce reduceri se aplică și la ce tipuri de abonamente?',
        a: 'Reducerile pentru elev, student și pensionar se aplică DOAR la abonamentele de maximum 1 lună (1 zi, 3 zile, 1 săptămână, 1 lună). Abonamentele de 6 luni și 1 an se achiziționează la prețul standard, fără reducere.',
    },
    {
        q: 'Ce fac dacă documentele mi-au fost respinse?',
        a: 'Verifică motivul respingerii afișat în „Contul Meu", corectează problema indicată (ex: imagine neclară, document expirat, tip greșit) și retrimite documentele. Procesul de verificare repornește de la zero.',
    },
    {
        q: 'Câte stații are metroul din București?',
        a: 'Rețeaua MetroBucurești are 5 magistrale active (M1–M5) cu 53 de stații în total. Poți explora harta interactivă completă în secțiunea „Harta Rețelei" din dashboard.',
    },
    {
        q: 'Ce fac dacă am o problemă tehnică în aplicație?',
        a: 'Folosește butonul „Contactează un angajat" din această pagină pentru a deschide un ticket de suport. Un angajat MetroBucurești îți va răspunde cât mai curând. De asemenea, ne poți contacta la stațiile de metrou sau la numărul de urgență afișat pe peroane.',
    },
];

function StarRating({ value, onChange }) {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="star-rating">
            {[1,2,3,4,5].map(s => (
                <button
                    key={s} type="button"
                    className={`star-btn ${s <= (hovered || value) ? 'star-active' : ''}`}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => onChange(s)}
                >★</button>
            ))}
        </div>
    );
}

export default function PageSuport({ user, token }) {
    const [tab,          setTab]          = useState('chat'); // default pe chat
    const [openFaq,      setOpenFaq]      = useState(null);

    /* ─── Tickets ─── */
    const [myTickets,    setMyTickets]    = useState([]);
    const [activeTicket, setActiveTicket] = useState(null);
    const [mesaje,       setMesaje]       = useState([]);
    const [loadMesaje,   setLoadMesaje]   = useState(false);
    const [ticketsLoaded, setTicketsLoaded] = useState(false);

    /* ─── Form nou ticket ─── */
    const [showForm, setShowForm] = useState(false);
    const [subiect,  setSubiect]  = useState('');
    const [mesajNou, setMesajNou] = useState('');
    const [formErr,  setFormErr]  = useState('');
    const [formLoad, setFormLoad] = useState(false);

    /* ─── Chat input ─── */
    const [chatInput, setChatInput] = useState('');
    const [sendLoad,  setSendLoad]  = useState(false);

    /* ─── Feedback ─── */
    const [rating,       setRating]       = useState(0);
    const [feedbackSent, setFeedbackSent] = useState(false);
    const [feedbackLoad, setFeedbackLoad] = useState(false);

    const messagesEndRef = useRef(null);
    const pollRef        = useRef(null);
    const headers        = { Authorization: `Bearer ${token}` };

    /* ─── Fetch ticketele mele ─── */
    const fetchMyTickets = useCallback(async () => {
        if (!token) return;
        try {
            const r    = await fetch(`${API}/api/suport/ticket/al-meu`, { headers });
            const data = await r.json();
            const list = data.tickets ?? [];
            setMyTickets(list);
            setTicketsLoaded(true);
            // auto-selectează ticket activ dacă nu e deja selectat
            const activ = list.find(t => ['deschis','in_lucru'].includes(t.status));
            if (activ) setActiveTicket(prev => prev ?? activ);
        } catch { setTicketsLoaded(true); }
    }, [token]);

    /* ─── Fetch mesaje ─── */
    const fetchMesaje = useCallback(async (idTicket) => {
        if (!idTicket) return;
        setLoadMesaje(true);
        try {
            const r    = await fetch(`${API}/api/suport/ticket/${idTicket}/mesaje`, { headers });
            const data = await r.json();
            setMesaje(data.mesaje ?? []);
            if (data.ticket) setActiveTicket(data.ticket);
        } catch { /**/ }
        finally { setLoadMesaje(false); }
    }, [token]);

    /* ─── Polling 5s ─── */
    useEffect(() => {
        clearInterval(pollRef.current);
        if (activeTicket && ['deschis','in_lucru'].includes(activeTicket.status)) {
            fetchMesaje(activeTicket.id_ticket);
            pollRef.current = setInterval(() => fetchMesaje(activeTicket.id_ticket), 5000);
        }
        return () => clearInterval(pollRef.current);
    }, [activeTicket?.id_ticket, activeTicket?.status]);

    useEffect(() => { fetchMyTickets(); }, [fetchMyTickets]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mesaje]);

    /* ─── Creare ticket ─── */
    const handleCreareTicket = async (e) => {
        e.preventDefault();
        setFormErr('');
        if (!subiect.trim()) return setFormErr('Subiectul este obligatoriu.');
        if (!mesajNou.trim()) return setFormErr('Descrierea este obligatorie.');
        setFormLoad(true);
        try {
            const r    = await fetch(`${API}/api/suport/ticket`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ subiect: subiect.trim(), mesaj: mesajNou.trim() }),
            });
            const data = await r.json();
            if (!r.ok) return setFormErr(data.mesaj);
            setShowForm(false);
            setSubiect(''); setMesajNou('');
            setActiveTicket(data.ticket);
            await fetchMyTickets();
        } catch { setFormErr('Eroare de rețea. Încearcă din nou.'); }
        finally { setFormLoad(false); }
    };

    /* ─── Trimite mesaj ─── */
    const handleSendMesaj = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || sendLoad) return;
        setSendLoad(true);
        try {
            const r    = await fetch(`${API}/api/suport/ticket/${activeTicket.id_ticket}/mesaj`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ continut: chatInput.trim() }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setChatInput('');
            await fetchMesaje(activeTicket.id_ticket);
        } catch (err) { alert(err.message); }
        finally { setSendLoad(false); }
    };

    /* ─── Feedback ─── */
    const handleFeedback = async () => {
        if (!rating || feedbackLoad) return;
        setFeedbackLoad(true);
        try {
            const r    = await fetch(`${API}/api/suport/ticket/${activeTicket.id_ticket}/feedback`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setFeedbackSent(true);
            await fetchMesaje(activeTicket.id_ticket);
            await fetchMyTickets();
        } catch (err) { alert(err.message); }
        finally { setFeedbackLoad(false); }
    };

    const formatTime = (ts) => new Date(ts).toLocaleString('ro-RO', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const SC = {
        deschis:  { label: 'Deschis',  cls: 'status--deschis',  icon: '🟡' },
        in_lucru: { label: 'În lucru', cls: 'status--inlucru',  icon: '🔵' },
        rezolvat: { label: 'Rezolvat', cls: 'status--rezolvat', icon: '🟢' },
        inchis:   { label: 'Închis',   cls: 'status--inchis',   icon: '⚫' },
    };

    const ticketActiv = myTickets.find(t => ['deschis','in_lucru'].includes(t.status));

    /* ── ce să afișăm pe tab chat ── */
    const showChatWindow = activeTicket && (
        ticketActiv?.id_ticket === activeTicket.id_ticket ||
        ['rezolvat','inchis'].includes(activeTicket.status)
    );

    return (
        <div className="suport-root">

            {/* ══ HEADER ══ */}
            <div className="suport-header">
                <div>
                    <h2 className="suport-title">💬 Centru de Asistență</h2>
                    <p className="suport-sub">Răspunsuri rapide sau contact direct cu un angajat MetroBucurești.</p>
                </div>
            </div>

            {/* ══ TABS ══ */}
            <div className="suport-tabs">
                <button className={`suport-tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
                    <span>💬</span> Contactează Suport
                    {ticketActiv && <span className="suport-tab-dot" />}
                </button>
                <button className={`suport-tab ${tab === 'faq' ? 'active' : ''}`} onClick={() => setTab('faq')}>
                    <span>❓</span> Întrebări Frecvente
                </button>
            </div>

            {/* ══ CHAT / SUPORT LIVE ══ */}
            {tab === 'chat' && (
                <div className="chat-section">

                    {/* Loading inițial */}
                    {!ticketsLoaded && (
                        <div className="chat-loading-init">
                            <div className="ang-spinner" /> Se verifică sesiunile...
                        </div>
                    )}

                    {/* Niciun ticket activ + fără form deschis → prompt */}
                    {ticketsLoaded && !ticketActiv && !showForm && !showChatWindow && (
                        <div className="chat-no-ticket">
                            <div className="chat-no-ticket-icon">🎧</div>
                            <h3>Ai nevoie de ajutor?</h3>
                            <p>Deschide o sesiune de suport și un angajat MetroBucurești îți va răspunde cât mai curând.</p>
                            <button className="chat-open-btn" onClick={() => setShowForm(true)}>
                                + Deschide sesiune de suport
                            </button>

                            {myTickets.filter(t => ['rezolvat','inchis'].includes(t.status)).length > 0 && (
                                <div className="chat-history">
                                    <h4>Sesiuni anterioare</h4>
                                    {myTickets.filter(t => ['rezolvat','inchis'].includes(t.status)).map(t => (
                                        <div key={t.id_ticket} className="chat-history-item"
                                            onClick={() => { setActiveTicket(t); fetchMesaje(t.id_ticket); }}>
                                            <span className={`suport-badge ${SC[t.status]?.cls}`}>{SC[t.status]?.icon} {SC[t.status]?.label}</span>
                                            <span className="chat-history-sub">{t.subiect}</span>
                                            {t.rating && <span className="chat-history-rating">{'★'.repeat(t.rating)}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Form creare ticket */}
                    {ticketsLoaded && showForm && !ticketActiv && (
                        <div className="chat-form-wrap">
                            <div className="chat-form-header">
                                <h3>Deschide sesiune de suport</h3>
                                <button className="chat-form-close" onClick={() => setShowForm(false)}>✕</button>
                            </div>
                            <form className="chat-form" onSubmit={handleCreareTicket}>
                                <label>
                                    Subiect <span className="req">*</span>
                                    <input
                                        type="text"
                                        placeholder="ex: Problemă la cumpărare abonament"
                                        value={subiect}
                                        onChange={e => setSubiect(e.target.value)}
                                        maxLength={200}
                                    />
                                </label>
                                <label>
                                    Descrie problema ta <span className="req">*</span>
                                    <textarea
                                        placeholder="Explică cât mai detaliat situația cu care te confrunți..."
                                        value={mesajNou}
                                        onChange={e => setMesajNou(e.target.value)}
                                        rows={5}
                                    />
                                </label>
                                {formErr && <div className="chat-form-err">⚠️ {formErr}</div>}
                                <div className="chat-form-actions">
                                    <button type="button" className="chat-btn-cancel" onClick={() => setShowForm(false)}>Anulează</button>
                                    <button type="submit" className="chat-btn-submit" disabled={formLoad}>
                                        {formLoad ? 'Se trimite...' : '🚀 Trimite'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Chat window — ticket activ sau din istoric */}
                    {ticketsLoaded && showChatWindow && (
                        <div className="chat-window">
                            <div className="chat-window-header">
                                <div className="chat-window-info">
                                    <span className={`suport-badge ${SC[activeTicket.status]?.cls}`}>
                                        {SC[activeTicket.status]?.icon} {SC[activeTicket.status]?.label}
                                    </span>
                                    <span className="chat-window-sub">
                                        Ticket #{activeTicket.id_ticket} · {activeTicket.subiect}
                                    </span>
                                </div>
                                {activeTicket.angajat_prenume && (
                                    <div className="chat-window-agent">
                                        <div className="chat-agent-avatar">
                                            {activeTicket.angajat_prenume?.[0]}{activeTicket.angajat_nume?.[0]}
                                        </div>
                                        <span>{activeTicket.angajat_prenume} {activeTicket.angajat_nume}</span>
                                    </div>
                                )}
                                {!ticketActiv && (
                                    <button className="chat-back-btn" onClick={() => { setActiveTicket(null); }}>
                                        ← Înapoi
                                    </button>
                                )}
                            </div>

                            <div className="chat-messages">
                                {activeTicket.status === 'deschis' && (
                                    <div className="chat-status-msg">
                                        🕐 Sesiunea a fost creată. Aștepți ca un angajat să o accepte.
                                    </div>
                                )}
                                {loadMesaje && mesaje.length === 0 && (
                                    <div className="chat-loading"><div className="ang-spinner" /> Se încarcă...</div>
                                )}
                                {mesaje.map(m => (
                                    <div key={m.id_mesaj} className={`chat-msg ${m.expeditor_tip === 'calator' ? 'chat-msg--mine' : 'chat-msg--agent'}`}>
                                        <div className="chat-msg-bubble">
                                            <p className="chat-msg-text">{m.continut}</p>
                                            <span className="chat-msg-time">{formatTime(m.created_at)}</span>
                                        </div>
                                    </div>
                                ))}

                                {activeTicket.status === 'rezolvat' && !feedbackSent && (
                                    <div className="chat-resolved-card">
                                        <div className="chat-resolved-icon">✅</div>
                                        <h4>Sesiunea a fost rezolvată!</h4>
                                        {activeTicket.rezumat && (
                                            <p className="chat-rezumat">„{activeTicket.rezumat}"</p>
                                        )}
                                        <p>Evaluează experiența ta:</p>
                                        <StarRating value={rating} onChange={setRating} />
                                        <button className="chat-btn-submit" disabled={!rating || feedbackLoad} onClick={handleFeedback}>
                                            {feedbackLoad ? 'Se trimite...' : '✓ Trimite feedback'}
                                        </button>
                                    </div>
                                )}

                                {(activeTicket.status === 'inchis' || feedbackSent) && (
                                    <div className="chat-closed-card">
                                        <span className="chat-closed-icon">⭐</span>
                                        <p>Mulțumim pentru feedback! Sesiunea este închisă.</p>
                                        {activeTicket.rating && (
                                            <div className="chat-final-rating">
                                                {'★'.repeat(activeTicket.rating)}{'☆'.repeat(5 - activeTicket.rating)}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {activeTicket.status === 'in_lucru' && (
                                <form className="chat-input-row" onSubmit={handleSendMesaj}>
                                    <input
                                        type="text" className="chat-input"
                                        placeholder="Scrie un mesaj..."
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        disabled={sendLoad}
                                    />
                                    <button type="submit" className="chat-send-btn" disabled={!chatInput.trim() || sendLoad}>
                                        {sendLoad ? '...' : '➤'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ══ FAQ ══ */}
            {tab === 'faq' && (
                <div className="faq-section">
                    <div className="faq-list">
                        {FAQ_ITEMS.map((item, idx) => (
                            <div key={idx} className={`faq-item ${openFaq === idx ? 'open' : ''}`}>
                                <button className="faq-question" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                                    <span className="faq-q-text">{item.q}</span>
                                    <span className={`faq-chevron ${openFaq === idx ? 'rotated' : ''}`}>›</span>
                                </button>
                                {openFaq === idx && (
                                    <div className="faq-answer"><p>{item.a}</p></div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="faq-cta">
                        <div className="faq-cta-icon">🎧</div>
                        <h3>Nu ai găsit răspunsul?</h3>
                        <p>Contactează direct un angajat MetroBucurești.</p>
                        <button className="faq-cta-btn" onClick={() => setTab('chat')}>
                            Contactează un angajat
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
