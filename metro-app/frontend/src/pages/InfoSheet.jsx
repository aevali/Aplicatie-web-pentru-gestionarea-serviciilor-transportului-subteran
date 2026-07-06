/* ─── Bottom sheet — Contact / Despre noi / Confidențialitate / Termeni ─── */
import { useEffect } from 'react';
import { X, Mail, Phone, MapPin, Clock, Building2, ShieldCheck, FileText } from 'lucide-react';
import './InfoSheet.css';

function ContactRow(props) {
    const { Icon, label, value } = props;
    return (
        <div className="info-contact-row">
            <div className="info-contact-icon"><Icon size={16} /></div>
            <div className="info-contact-text">
                <span className="info-contact-label">{label}</span>
                <span className="info-contact-value">{value}</span>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className="info-section">
            <h3 className="info-section-title">{title}</h3>
            {children}
        </div>
    );
}

const PAGINI = {
    contact: {
        title: 'Contact',
        Icon: Mail,
        render: () => (
            <>
                <p className="info-lead">
                    Ai o întrebare despre cont, bilete sau abonamente? Echipa MetroBucurești îți răspunde
                    pe oricare dintre canalele de mai jos.
                </p>
                <div className="info-contact-list">
                    <ContactRow Icon={Mail} label="Email general" value="contact@metrou.ro" />
                    <ContactRow Icon={Phone} label="Dispecerat (linie gratuită)" value="0800 200 500" />
                    <ContactRow Icon={Phone} label="Suport tehnic aplicație" value="021 300 45 67" />
                    <ContactRow Icon={MapPin} label="Sediu" value="Bulevardul Unirii nr. 12, Sector 3, București" />
                    <ContactRow Icon={Clock} label="Program call-center" value="Luni - Vineri: 08:00 - 20:00 · Sâmbătă: 09:00 - 14:00" />
                </div>
                <p className="info-note">
                    Ești deja utilizator înregistrat? Poți deschide un tichet direct din contul tău, din
                    secțiunea <strong>Dashboard → Suport</strong> — răspunsul rămâne acolo, cu tot istoricul
                    conversației.
                </p>
            </>
        ),
    },
    about: {
        title: 'Despre noi',
        Icon: Building2,
        render: () => (
            <>
                <p className="info-lead">
                    MetroBucurești este platforma digitală a rețelei de metrou din București — bilete,
                    abonamente și acces la cele 5 magistrale (M1 - M5), într-un singur loc.
                </p>
                <Section title="Ce poți face din platformă">
                    <ul className="info-list">
                        <li>Cumperi bilete și abonamente, cu reduceri pentru elevi, studenți și pensionari</li>
                        <li>Vizualizezi harta rețelei și planifici o rută între stații</li>
                        <li>Primești un card turistic dacă vizitezi orașul, valabil între 1 și 7 zile</li>
                        <li>Urmărești notificări și anunțuri despre rețea în timp real</li>
                    </ul>
                </Section>
                <Section title="Echipa">
                    <p>
                        Platforma este dezvoltată de o echipă mică, dedicată digitalizării transportului
                        public din București. Ne poți scrie oricând la <strong>contact@metrou.ro</strong>.
                    </p>
                </Section>
                <Section title="Sediu">
                    <p>Bulevardul Unirii nr. 12, Sector 3, București</p>
                </Section>
            </>
        ),
    },
    privacy: {
        title: 'Confidențialitate',
        Icon: ShieldCheck,
        render: () => (
            <>
                <p className="info-lead">
                    Îți protejăm datele personale și le folosim strict pentru a-ți oferi serviciile din
                    platformă.
                </p>
                <Section title="Ce date colectăm">
                    <p>
                        Nume, prenume, email și CNP — CNP-ul este folosit exclusiv pentru validarea
                        reducerilor de elev, student sau pensionar. Pentru cererile de reducere, îți putem
                        cere o copie a buletinului și, după caz, a legitimației.
                    </p>
                </Section>
                <Section title="Cum folosim datele">
                    <p>
                        Datele sunt folosite pentru emiterea biletelor și abonamentelor, validarea
                        reducerilor de către angajații autorizați și pentru a răspunde solicitărilor trimise
                        prin secțiunea de suport.
                    </p>
                </Section>
                <Section title="Securitate">
                    <p>
                        Parolele sunt stocate criptat și nu sunt vizibile nici pentru echipa noastră.
                        Documentele încărcate pentru verificarea reducerilor sunt accesibile doar angajaților
                        care le procesează.
                    </p>
                </Section>
                <Section title="Drepturile tale">
                    <p>
                        Poți cere oricând acces, corectarea sau ștergerea datelor tale, scriind la{' '}
                        <strong>contact@metrou.ro</strong>.
                    </p>
                </Section>
            </>
        ),
    },
    terms: {
        title: 'Termeni și Condiții',
        Icon: FileText,
        render: () => (
            <>
                <p className="info-lead">
                    Prin crearea unui cont sau folosirea unui card turistic, ești de acord cu termenii de
                    mai jos.
                </p>
                <Section title="Contul tău">
                    <p>
                        Fiecare cont este personal și legat de un singur CNP. Ești responsabil de păstrarea
                        în siguranță a parolei.
                    </p>
                </Section>
                <Section title="Bilete și abonamente">
                    <p>
                        Biletele și abonamentele sunt valabile din momentul achiziției și nu sunt
                        rambursabile după prima validare la turnichet.
                    </p>
                </Section>
                <Section title="Reduceri">
                    <p>
                        Reducerile pentru elevi, studenți și pensionari sunt aplicate doar după validarea
                        documentelor de către un angajat. O cerere respinsă poate fi retrimisă cu documente
                        actualizate.
                    </p>
                </Section>
                <Section title="Card turist">
                    <p>
                        Cardul turistic este valabil pentru numărul de zile ales la achiziție, începând din
                        momentul activării la stația de ridicare aleasă.
                    </p>
                </Section>
                <Section title="Modificări">
                    <p>
                        Putem actualiza acești termeni periodic; continuarea folosirii platformei înseamnă
                        acceptarea versiunii curente.
                    </p>
                </Section>
            </>
        ),
    },
};

export default function InfoSheet({ page, onClose }) {
    const isOpen = !!page;
    const data = PAGINI[page] ?? PAGINI.contact;

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    return (
        <>
            <div className={`info-backdrop${isOpen ? ' open' : ''}`} onClick={onClose} />
            <div
                className={`info-sheet${isOpen ? ' open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-hidden={!isOpen}
                aria-labelledby="info-sheet-title"
            >
                <div className="info-sheet-stripe" />
                <div className="info-sheet-handle" />
                <div className="info-sheet-header">
                    <div className="info-sheet-header-icon"><data.Icon size={18} /></div>
                    <h2 className="info-sheet-title" id="info-sheet-title">{data.title}</h2>
                    <button type="button" className="info-sheet-close" onClick={onClose} aria-label="Închide">
                        <X size={18} />
                    </button>
                </div>
                <div className="info-sheet-body">
                    {data.render()}
                </div>
            </div>
        </>
    );
}
