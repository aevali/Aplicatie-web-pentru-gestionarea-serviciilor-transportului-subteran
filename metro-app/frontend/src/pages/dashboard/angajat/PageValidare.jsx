import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { API } from '../dashboardConstants';
import './PageValidare.css';

const TIP_LABEL = {
    adult:     { label: 'Adult',     emoji: '👤', cls: 'adult'     },
    elev:      { label: 'Elev',      emoji: '🎒', cls: 'elev'      },
    student:   { label: 'Student',   emoji: '🎓', cls: 'student'   },
    pensionar: { label: 'Pensionar', emoji: '🏅', cls: 'pensionar' },
};

export default function PageValidare({ token }) {
    const videoRef   = useRef(null);
    const canvasRef  = useRef(null);
    const streamRef  = useRef(null);
    const rafRef     = useRef(null);
    const scanningRef = useRef(true); // prevenire scanari multiple

    const [camStatus,  setCamStatus]  = useState('loading'); // loading | ok | denied | error
    const [rezultat,   setRezultat]   = useState(null);      // null = niciun scan
    const [loading,    setLoading]    = useState(false);

    /* ── Pornire camera ── */
    const pornesteCamera = useCallback(async () => {
        setCamStatus('loading');
        scanningRef.current = true;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setCamStatus('ok');
        } catch (err) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setCamStatus('denied');
            } else {
                setCamStatus('error');
            }
        }
    }, []);

    /* ── Oprire camera ── */
    const opresteCamera = useCallback(() => {
        scanningRef.current = false;
        cancelAnimationFrame(rafRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    /* ── Montare / demontare ── */
    useEffect(() => {
        pornesteCamera();
        return () => opresteCamera();
    }, [pornesteCamera, opresteCamera]);

    /* ── Loop scanare QR ── */
    useEffect(() => {
        if (camStatus !== 'ok') return;

        const scan = () => {
            if (!scanningRef.current) return;

            const video  = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas) { rafRef.current = requestAnimationFrame(scan); return; }
            if (video.readyState !== video.HAVE_ENOUGH_DATA) { rafRef.current = requestAnimationFrame(scan); return; }

            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const cod = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });

            if (cod) {
                trimiteScan(cod.data);
                return; // scanningRef.current va deveni false în trimiteScan
            }

            rafRef.current = requestAnimationFrame(scan);
        };

        rafRef.current = requestAnimationFrame(scan);
        return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [camStatus]);

    /* ── Apel API ── */
    const trimiteScan = async (codQr) => {
        if (!scanningRef.current) return; // deja in curs
        scanningRef.current = false; // blocheaza noi scanari
        setLoading(true);

        try {
            const r = await fetch(`${API}/api/validare/scaneaza`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body:    JSON.stringify({ cod_qr: codQr }),
            });
            const data = await r.json();
            setRezultat({ ...data, status: r.status });
        } catch {
            setRezultat({ ok: false, mesaj: '❌ Eroare de rețea. Verifică conexiunea și încearcă din nou.', status: 500 });
        } finally {
            setLoading(false);
        }
    };

    /* ── Resetare: scanaza din nou ── */
    const reseteaza = () => {
        setRezultat(null);
        setLoading(false);
        scanningRef.current = true;
        // reluam loop-ul
        const scan = () => {
            if (!scanningRef.current) return;
            const video  = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
                rafRef.current = requestAnimationFrame(scan);
                return;
            }
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const cod = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
            if (cod) { trimiteScan(cod.data); return; }
            rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
    };

    /* ── Render card rezultat ── */
    const renderRezultat = () => {
        if (!rezultat) return null;
        const { ok, calator, mesaj, tip, titlu } = rezultat;
        const tipInfo = TIP_LABEL[calator?.tip_calator] ?? TIP_LABEL.adult;

        return (
            <div className={`val-result-card ${ok ? 'val-result-card--ok' : 'val-result-card--err'}`}>
                <div className="val-result-icon">{ok ? '✅' : '❌'}</div>

                {calator && (
                    <div className="val-result-calator">
                        <h3 className="val-result-name">
                            {calator.prenume} {calator.nume}
                        </h3>
                        <span className={`val-result-tip val-result-tip--${tipInfo.cls}`}>
                            {tipInfo.emoji} {tipInfo.label}
                        </span>
                        {tip === 'bilet' && titlu && (
                            <p className="val-result-titlu">
                                🎫 Bilet — {titlu.calatorii_ramase} / {titlu.numar_calatorii} călătorii rămase
                            </p>
                        )}
                        {tip === 'abonament' && titlu && (
                            <p className="val-result-titlu">
                                📅 Abonament — valabil până la{' '}
                                <strong>
                                    {new Date(titlu.data_expirare).toLocaleDateString('ro-RO', {
                                        day: 'numeric', month: 'long', year: 'numeric',
                                    })}
                                </strong>
                            </p>
                        )}
                    </div>
                )}

                <p className="val-result-mesaj">{mesaj}</p>

                <button className="val-scan-again-btn" onClick={reseteaza}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Scanează din nou
                </button>
            </div>
        );
    };

    return (
        <div className="dash-section page-validare">
            <div className="val-header">
                <h2 className="dash-section-title">
                    🎫 Validare Bilete
                </h2>
                <p className="val-subtitle">
                    Scanează codul QR al călătorului pentru a valida titlul de călătorie.
                </p>
            </div>

            <div className="val-body">
                {/* ── Coloana camera ── */}
                <div className="val-camera-col">
                    <div className={`val-camera-frame ${camStatus === 'ok' && !rezultat ? 'val-camera-frame--active' : ''}`}>
                        {camStatus === 'loading' && (
                            <div className="val-cam-overlay">
                                <div className="ang-spinner" />
                                <p>Se inițializează camera...</p>
                            </div>
                        )}
                        {camStatus === 'denied' && (
                            <div className="val-cam-overlay val-cam-overlay--err">
                                <span className="val-cam-icon">📷</span>
                                <p>Accesul la cameră a fost refuzat.</p>
                                <p className="val-cam-hint">Permite accesul în setările browserului și reîncarcă pagina.</p>
                            </div>
                        )}
                        {camStatus === 'error' && (
                            <div className="val-cam-overlay val-cam-overlay--err">
                                <span className="val-cam-icon">⚠️</span>
                                <p>Camera nu a putut fi pornită.</p>
                                <button className="val-scan-again-btn" style={{ marginTop: '1rem' }} onClick={pornesteCamera}>
                                    Încearcă din nou
                                </button>
                            </div>
                        )}

                        <video
                            ref={videoRef}
                            className={`val-video ${camStatus === 'ok' ? 'val-video--visible' : ''}`}
                            playsInline
                            muted
                        />
                        <canvas ref={canvasRef} className="val-canvas" />

                        {/* Viewfinder animat peste video */}
                        {camStatus === 'ok' && !rezultat && !loading && (
                            <div className="val-viewfinder">
                                <div className="val-vf-corner val-vf-tl" />
                                <div className="val-vf-corner val-vf-tr" />
                                <div className="val-vf-corner val-vf-bl" />
                                <div className="val-vf-corner val-vf-br" />
                                <div className="val-vf-scan-line" />
                            </div>
                        )}

                        {/* Loading overlay la procesare */}
                        {loading && (
                            <div className="val-cam-overlay val-cam-overlay--processing">
                                <div className="ang-spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
                                <p>Se procesează...</p>
                            </div>
                        )}
                    </div>

                    <p className="val-camera-hint">
                        {camStatus === 'ok' && !loading && !rezultat
                            ? '📡 Îndreaptă camera spre codul QR al călătorului'
                            : camStatus === 'ok' && rezultat
                            ? '📷 Camera este activă'
                            : ''}
                    </p>
                </div>

                {/* ── Coloana rezultat ── */}
                <div className="val-result-col">
                    {!rezultat && !loading && (
                        <div className="val-waiting-card">
                            <div className="val-waiting-icon">📲</div>
                            <h3>În așteptare</h3>
                            <p>Rezultatul validării va apărea aici după scanarea codului QR.</p>
                        </div>
                    )}
                    {loading && (
                        <div className="val-waiting-card">
                            <div className="ang-spinner" style={{ margin: '0 auto' }} />
                            <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.5)' }}>Se verifică titlul...</p>
                        </div>
                    )}
                    {rezultat && renderRezultat()}
                </div>
            </div>
        </div>
    );
}
