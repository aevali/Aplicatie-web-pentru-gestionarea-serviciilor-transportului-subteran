import { useState } from 'react';

/* ─── UploadZone — componentă reutilizabilă ─── */
export default function UploadZone({ label, sublabel, fisier, onSelect, onClear, optional = false }) {
    const [dragover, setDragover] = useState(false);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(165,180,252,0.8)' }}>
                {label}{optional && <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> (opțional)</span>}
            </p>
            <div
                className={`cont-upload-zone ${dragover ? 'dragover' : ''}`}
                style={{ padding: '1.2rem 1rem', minHeight: '120px' }}
                onDragOver={e => { e.preventDefault(); setDragover(true); }}
                onDragLeave={() => setDragover(false)}
                onDrop={e => { e.preventDefault(); setDragover(false); const f = e.dataTransfer.files[0]; if (f) onSelect(f); }}
            >
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => onSelect(e.target.files[0] ?? null)} />
                <span className="cont-upload-icon" style={{ fontSize: '1.6rem' }}>
                    {fisier ? '✅' : '📁'}
                </span>
                {fisier ? (
                    <p className="cont-upload-title" style={{ fontSize: '0.8rem', color: '#86efac' }}>
                        {fisier.name.length > 24 ? fisier.name.slice(0, 22) + '…' : fisier.name}
                    </p>
                ) : (
                    <p className="cont-upload-title" style={{ fontSize: '0.8rem' }}>Apasă sau trage</p>
                )}
                <p className="cont-upload-hint">{sublabel}</p>
            </div>
            {fisier && (
                <button
                    className="ang-btn-secondary"
                    onClick={onClear}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', alignSelf: 'flex-start' }}
                >
                    ✕ Elimină
                </button>
            )}
        </div>
    );
}
