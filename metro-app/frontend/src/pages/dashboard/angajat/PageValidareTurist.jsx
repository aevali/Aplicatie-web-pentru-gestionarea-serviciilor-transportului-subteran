import { useEffect, useRef, useState, useCallback } from 'react';
import { Globe, CheckCircle, XCircle, Plane, MapPin, Calendar, CameraOff, AlertTriangle, Scan, Camera, Smartphone, Keyboard } from 'lucide-react';
import jsQR from 'jsqr';
import { API } from '../dashboardConstants';
import '../angajat/PageValidare.css';
import './PageValidareTurist.css';

export default function PageValidareTurist({ token }) {
    const videoRef    = useRef(null);
    const canvasRef   = useRef(null);
    const streamRef   = useRef(null);
    const rafRef      = useRef(null);
    const scanningRef = useRef(true);

    const [camStatus, setCamStatus] = useState('loading');
    const [rezultat,  setRezultat]  = useState(null);
    const [loading,   setLoading]   = useState(false);
    const [manualCod, setManualCod] = useState('');
    const [showManual, setShowManual] = useState(false);

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
                inversionAttempts: 'attemptBoth',
            });

            if (cod) {
                trimiteScan(cod.data, 'qr');
                return;
            }
            rafRef.current = requestAnimationFrame(scan);
        };

        rafRef.current = requestAnimationFrame(scan);
        return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [camStatus]);

    /* ── Apel API ── */
    const trimiteScan = async (cod, tip = 'qr') => {
        if (!scanningRef.current && tip === 'qr') return;
        scanningRef.current = false;
        setLoading(true);

        try {
            const r = await fetch(`${API}/api/turisti/valideaza`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ cod, tip }),
            });
            const data = await r.json();
            setRezultat({ ...data, status: r.status });
        } catch {
            setRezultat({
                ok: false,
                mesaj: 'Eroare de rețea. Verifică conexiunea și încearcă din nou.',
                status: 500,
            });
        } finally {
            setLoading(false);
        }
    };

    /* ── Introducere manuala ── */
    const handleManualSubmit = (e) => {
        e.preventDefault();
        const cod = manualCod.trim().toUpperCase();
        if (!cod) return;
        trimiteScan(cod, 'manual');
    };

    /* ── Resetare ── */
    const reseteaza = () => {
        setRezultat(null);
        setLoading(false);
        setManualCod('');
        scanningRef.current = true;

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
            const cod = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
            if (cod) { trimiteScan(cod.data, 'qr'); return; }
            rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
    };

    /* ── Render card rezultat ── */
    const renderRezultat = () => {
        if (!rezultat) return null;
        const { ok, pass, mesaj } = rezultat;

        return (
            <div className={`val-result-card ${ok ? 'val-result-card--ok' : 'val-result-card--err'}`}>
                <div className="val-result-icon">{ok ? <CheckCircle size={48} /> : <XCircle size={48} />}</div>

                {ok && pass && (
                    <div className="val-result-calator">
                        <h3 className="val-result-name">
                            Tourist — {pass.tara}
                        </h3>
                        <span className="vt-tourist-badge">
                            <Globe size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Tourist Pass
                        </span>

                        <div className="vt-pass-details">
                            <div className="vt-detail-row">
                                <span className="vt-detail-label">Email</span>
                                <span className="vt-detail-value">{pass.email}</span>
                            </div>
                            <div className="vt-detail-row">
                                <span className="vt-detail-label">Pașaport</span>
                                <span className="vt-detail-value">{pass.pasaport || '—'}</span>
                            </div>
                            <div className="vt-detail-row">
                                <span className="vt-detail-label">Plan</span>
                                <span className="vt-detail-value">{pass.zile} {pass.zile === 1 ? 'zi' : 'zile'}</span>
                            </div>
                            <div className="vt-detail-row">
                                <span className="vt-detail-label">Preț</span>
                                <span className="vt-detail-value">€{Number(pass.pret).toFixed(0)}</span>
                            </div>
                            <div className="vt-detail-row">
                                <span className="vt-detail-label">Stație</span>
                                <span className="vt-detail-value">{pass.statie_nume}</span>
                            </div>
                            <div className="vt-detail-row">
                                <span className="vt-detail-label">Expiră</span>
                                <span className="vt-detail-value vt-detail-value--accent">
                                    {new Date(pass.data_expirare).toLocaleDateString('ro-RO', {
                                        day: 'numeric', month: 'long', year: 'numeric',
                                    })}
                                </span>
                            </div>
                        </div>
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
        <div className="dash-section page-validare page-validare-turist">
            <div className="val-header">
                <h2 className="dash-section-title">
                    <Globe size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Validare Card Turist
                </h2>
                <p className="val-subtitle">
                    Scanează codul QR sau introdu codul de ridicare al turistului pentru a activa cardul.
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
                                <span className="val-cam-icon"><CameraOff size={32} /></span>
                                <p>Accesul la cameră a fost refuzat.</p>
                                <p className="val-cam-hint">Permite accesul în setările browserului și reîncarcă pagina.</p>
                            </div>
                        )}
                        {camStatus === 'error' && (
                            <div className="val-cam-overlay val-cam-overlay--err">
                                <span className="val-cam-icon"><AlertTriangle size={32} /></span>
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

                        {camStatus === 'ok' && !rezultat && !loading && (
                            <div className="val-viewfinder">
                                <div className="val-vf-corner val-vf-tl" />
                                <div className="val-vf-corner val-vf-tr" />
                                <div className="val-vf-corner val-vf-bl" />
                                <div className="val-vf-corner val-vf-br" />
                                <div className="val-vf-scan-line" />
                            </div>
                        )}

                        {loading && (
                            <div className="val-cam-overlay val-cam-overlay--processing">
                                <div className="ang-spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
                                <p>Se verifică codul...</p>
                            </div>
                        )}
                    </div>

                    <p className="val-camera-hint">
                        {camStatus === 'ok' && !loading && !rezultat
                            ? <><Scan size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Îndreaptă camera spre codul QR al turistului</>
                            : camStatus === 'ok' && rezultat
                            ? <><Camera size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Camera este activă</>
                            : ''}
                    </p>

                    {/* ── Input manual cod ── */}
                    <button
                        className="vt-manual-toggle"
                        onClick={() => setShowManual(v => !v)}
                        type="button"
                    >
                        <Keyboard size={14} /> {showManual ? 'Ascunde introducere manuală' : 'Introdu codul manual'}
                    </button>

                    {showManual && (
                        <form className="val-manual-form" onSubmit={handleManualSubmit}>
                            <input
                                className="val-manual-input"
                                type="text"
                                placeholder="ex. TR-A3K9X2"
                                value={manualCod}
                                onChange={e => setManualCod(e.target.value)}
                                autoFocus
                            />
                            <button
                                className="val-manual-btn"
                                type="submit"
                                disabled={loading || !manualCod.trim()}
                            >
                                Validează
                            </button>
                        </form>
                    )}
                </div>

                {/* ── Coloana rezultat ── */}
                <div className="val-result-col">
                    {!rezultat && !loading && (
                        <div className="val-waiting-card">
                            <div className="val-waiting-icon"><Plane size={48} /></div>
                            <h3>În așteptare</h3>
                            <p>Scanează sau introdu codul turistului. Rezultatul va apărea aici.</p>
                        </div>
                    )}
                    {loading && (
                        <div className="val-waiting-card">
                            <div className="ang-spinner" style={{ margin: '0 auto' }} />
                            <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.5)' }}>Se verifică codul...</p>
                        </div>
                    )}
                    {rezultat && renderRezultat()}
                </div>
            </div>
        </div>
    );
}
