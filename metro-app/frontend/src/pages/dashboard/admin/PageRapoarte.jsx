import { useState, useEffect, useCallback } from 'react';
import { API } from '../dashboardConstants';
import {
    BarChart3, Users, TrendingUp, Ticket, FileText, Headphones, Globe,
    DollarSign, Calendar, ChevronDown, Activity, Star, Clock, MapPin,
    CreditCard, ShieldCheck, BarChart2, PieChart as PieIcon,
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import './PageRapoarte.css';

/* ─── Constante ─── */
const RAPOARTE = [
    { id: 'utilizatori', label: 'Utilizatori',          icon: Users },
    { id: 'venituri',    label: 'Venituri',             icon: DollarSign },
    { id: 'calatorii',   label: 'Călătorii',            icon: Activity },
    { id: 'titluri',     label: 'Abonamente & Bilete',  icon: Ticket },
    { id: 'cereri',      label: 'Cereri Reducere',       icon: FileText },
    { id: 'suport',      label: 'Suport Clienți',       icon: Headphones },
    { id: 'turisti',     label: 'Turiști',              icon: Globe },
];

const PERIOADE = [
    { value: 3,  label: 'Ultimele 3 luni' },
    { value: 6,  label: 'Ultimele 6 luni' },
    { value: 12, label: 'Ultimele 12 luni' },
    { value: 0,  label: 'Tot timpul' },
];

const COLORS = ['#2563eb', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
const STATUS_COLORS = {
    aprobata: '#10b981', respinsa: '#ef4444', in_asteptare: '#f59e0b',
    deschis: '#3b82f6', in_lucru: '#f59e0b', rezolvat: '#10b981', inchis: '#6b7280',
};
const TIP_LABEL = { adult: 'Adult', elev: 'Elev', student: 'Student', pensionar: 'Pensionar' };
const STATUS_LABEL = {
    aprobata: 'Aprobată', respinsa: 'Respinsă', in_asteptare: 'În așteptare',
    deschis: 'Deschis', in_lucru: 'În lucru', rezolvat: 'Rezolvat', inchis: 'Închis',
};
const ABON_LABEL = {
    zi: '1 zi', trei_zile: '3 zile', saptamana: '1 săpt.',
    luna: '1 lună', sase_luni: '6 luni', an: '1 an',
};

const GRID_STROKE = 'rgba(255,255,255,0.04)';
const AXIS_TICK  = { fill: '#6b7280', fontSize: 11, fontFamily: 'Inter' };

/* ─── Formatteri ─── */
const fmtNr   = (n) => (n ?? 0).toLocaleString('ro-RO');
const fmtLei  = (n) => `${(n ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`;
const fmtEuro = (n) => `${(n ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const fmtLuna = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const luna = d.toLocaleDateString('ro-RO', { month: 'short' }).replace('.', '');
    const an = d.getFullYear().toString().slice(2);
    return `${luna} '${an}`;
};

/* ─── Tooltip custom ─── */
function RapTooltip({ active, payload, label, formatter }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rap-tooltip">
            <div className="rap-tooltip-label">{label}</div>
            {payload.map((entry, i) => (
                <div key={i} className="rap-tooltip-row">
                    <span className="rap-tooltip-dot" style={{ background: entry.color || entry.fill }} />
                    <span className="rap-tooltip-name">{entry.name}</span>
                    <span className="rap-tooltip-value">
                        {formatter ? formatter(entry.value) : fmtNr(entry.value)}
                    </span>
                </div>
            ))}
        </div>
    );
}

/* ─── Pie label custom ─── */
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="#8b8fa3" fontSize={11} fontFamily="Inter"
              textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
            {name} ({(percent * 100).toFixed(0)}%)
        </text>
    );
}

/* ─── Date demo pentru grafice ─── */
const DEMO = {
    sumar: {
        total_calatori: 1247, total_venituri: 187450.00, venituri_bilete: 62300.00,
        venituri_abonamente: 98750.00, venituri_turisti: 26400.00,
        total_calatorii: 34520, abonamente_active: 312,
    },
    utilizatori: {
        pe_luna: [
            { luna: '2025-07-01', numar: 45 }, { luna: '2025-08-01', numar: 62 },
            { luna: '2025-09-01', numar: 98 }, { luna: '2025-10-01', numar: 87 },
            { luna: '2025-11-01', numar: 110 }, { luna: '2025-12-01', numar: 76 },
            { luna: '2026-01-01', numar: 124 }, { luna: '2026-02-01', numar: 135 },
            { luna: '2026-03-01', numar: 142 }, { luna: '2026-04-01', numar: 118 },
            { luna: '2026-05-01', numar: 156 }, { luna: '2026-06-01', numar: 94 },
        ],
        pe_tip: [
            { tip: 'adult', numar: 687 }, { tip: 'student', numar: 312 },
            { tip: 'elev', numar: 168 }, { tip: 'pensionar', numar: 80 },
        ],
        total: 1247,
    },
    venituri: {
        pe_luna: [
            { luna: '2025-07-01', bilete: 3200, abonamente: 5800, turisti: 1400 },
            { luna: '2025-08-01', bilete: 4100, abonamente: 6200, turisti: 2800 },
            { luna: '2025-09-01', bilete: 5600, abonamente: 8900, turisti: 1900 },
            { luna: '2025-10-01', bilete: 4800, abonamente: 7600, turisti: 1600 },
            { luna: '2025-11-01', bilete: 5200, abonamente: 9100, turisti: 1200 },
            { luna: '2025-12-01', bilete: 4500, abonamente: 7800, turisti: 3200 },
            { luna: '2026-01-01', bilete: 6100, abonamente: 9400, turisti: 1800 },
            { luna: '2026-02-01', bilete: 5800, abonamente: 8700, turisti: 2100 },
            { luna: '2026-03-01', bilete: 6400, abonamente: 9800, turisti: 2400 },
            { luna: '2026-04-01', bilete: 5500, abonamente: 8200, turisti: 2600 },
            { luna: '2026-05-01', bilete: 6800, abonamente: 10200, turisti: 3100 },
            { luna: '2026-06-01', bilete: 4300, abonamente: 7050, turisti: 2300 },
        ],
        total_bilete: 62300, total_abonamente: 98750, total_turisti: 26400, total: 187450,
    },
    calatorii: {
        pe_statie: [
            { nume: 'Piața Unirii 1', numar: 4820 }, { nume: 'Piața Victoriei 1', numar: 3950 },
            { nume: 'Universitate', numar: 3740 }, { nume: 'Eroilor', numar: 3210 },
            { nume: 'Dristor 1', numar: 2890 }, { nume: 'Gara de Nord 1', numar: 2650 },
            { nume: 'Pipera', numar: 2480 }, { nume: 'Piața Romană', numar: 2150 },
            { nume: 'Timpuri Noi', numar: 1920 }, { nume: 'Tineretului', numar: 1780 },
            { nume: 'Obor', numar: 1650 }, { nume: 'Aurel Vlaicu', numar: 1520 },
            { nume: 'Basarab', numar: 1380 }, { nume: 'Lujerului', numar: 1240 },
            { nume: 'Titan', numar: 1140 },
        ],
        pe_ora: [
            { ora: 0, numar: 45 }, { ora: 1, numar: 20 }, { ora: 2, numar: 12 }, { ora: 3, numar: 8 },
            { ora: 4, numar: 35 }, { ora: 5, numar: 320 }, { ora: 6, numar: 1450 }, { ora: 7, numar: 3820 },
            { ora: 8, numar: 4210 }, { ora: 9, numar: 2650 }, { ora: 10, numar: 1580 }, { ora: 11, numar: 1320 },
            { ora: 12, numar: 1680 }, { ora: 13, numar: 1850 }, { ora: 14, numar: 1720 }, { ora: 15, numar: 2100 },
            { ora: 16, numar: 3150 }, { ora: 17, numar: 4380 }, { ora: 18, numar: 3650 }, { ora: 19, numar: 2240 },
            { ora: 20, numar: 1420 }, { ora: 21, numar: 850 }, { ora: 22, numar: 520 }, { ora: 23, numar: 190 },
        ],
        pe_luna: [], total: 34520, medie_zilnica: 95.6,
    },
    titluri: {
        abonamente_pe_tip: [
            { tip: 'luna', numar: 428, venit: 42800 }, { tip: 'saptamana', numar: 312, venit: 14040 },
            { tip: 'zi', numar: 245, venit: 2940 }, { tip: 'trei_zile', numar: 186, venit: 6510 },
            { tip: 'sase_luni', numar: 72, venit: 36000 }, { tip: 'an', numar: 18, venit: 16200 },
        ],
        bilete_pe_tip: [
            { numar_calatorii: 1, numar: 520, venit: 2600 }, { numar_calatorii: 2, numar: 380, venit: 3800 },
            { numar_calatorii: 5, numar: 290, venit: 7250 }, { numar_calatorii: 10, numar: 210, venit: 9450 },
            { numar_calatorii: 20, numar: 85, venit: 6800 },
        ],
        total_abonamente: 1261, total_bilete: 1485,
    },
    cereri: {
        pe_luna: [
            { luna: '2025-07-01', numar: 8 }, { luna: '2025-08-01', numar: 12 },
            { luna: '2025-09-01', numar: 22 }, { luna: '2025-10-01', numar: 18 },
            { luna: '2025-11-01', numar: 15 }, { luna: '2025-12-01', numar: 10 },
            { luna: '2026-01-01', numar: 24 }, { luna: '2026-02-01', numar: 19 },
            { luna: '2026-03-01', numar: 26 }, { luna: '2026-04-01', numar: 16 },
            { luna: '2026-05-01', numar: 21 }, { luna: '2026-06-01', numar: 13 },
        ],
        pe_status: [
            { status: 'aprobata', numar: 148 }, { status: 'respinsa', numar: 32 },
            { status: 'in_asteptare', numar: 24 },
        ],
        total: 204, rata_aprobare: 72.5,
    },
    suport: {
        pe_luna: [
            { luna: '2025-07-01', numar: 5 }, { luna: '2025-08-01', numar: 8 },
            { luna: '2025-09-01', numar: 12 }, { luna: '2025-10-01', numar: 9 },
            { luna: '2025-11-01', numar: 14 }, { luna: '2025-12-01', numar: 7 },
            { luna: '2026-01-01', numar: 11 }, { luna: '2026-02-01', numar: 16 },
            { luna: '2026-03-01', numar: 13 }, { luna: '2026-04-01', numar: 10 },
            { luna: '2026-05-01', numar: 15 }, { luna: '2026-06-01', numar: 6 },
        ],
        pe_status: [
            { status: 'rezolvat', numar: 82 }, { status: 'inchis', numar: 28 },
            { status: 'deschis', numar: 12 }, { status: 'in_lucru', numar: 4 },
        ],
        rating_mediu: 4.3, total_cu_rating: 95, rata_rezolvare: 87.3, total: 126,
    },
    turisti: {
        pe_tara: [
            { tara: 'Germania', numar: 48, venit: 1152 }, { tara: 'Franța', numar: 42, venit: 1008 },
            { tara: 'Italia', numar: 38, venit: 912 }, { tara: 'Spania', numar: 28, venit: 672 },
            { tara: 'Marea Britanie', numar: 26, venit: 780 }, { tara: 'Olanda', numar: 22, venit: 528 },
            { tara: 'Austria', numar: 18, venit: 432 }, { tara: 'Polonia', numar: 16, venit: 320 },
            { tara: 'SUA', numar: 14, venit: 560 }, { tara: 'Japonia', numar: 8, venit: 320 },
        ],
        pe_zile: [
            { zile: 1, numar: 65 }, { zile: 2, numar: 48 }, { zile: 3, numar: 72 },
            { zile: 4, numar: 35 }, { zile: 5, numar: 28 }, { zile: 7, numar: 42 },
        ],
        pe_luna: [],
        total: 290, venit_total: 6684,
    },
};

/* ── Helper: completeaza datele API cu demo daca sunt goale ── */
function mergeDemo(apiData, demoData) {
    if (!apiData) return demoData;
    const merged = { ...apiData };
    for (const key of Object.keys(demoData)) {
        const val = merged[key];
        if (val === undefined || val === null) {
            merged[key] = demoData[key];
        } else if (Array.isArray(val) && val.length === 0) {
            merged[key] = demoData[key];
        } else if (typeof val === 'number' && val === 0 && typeof demoData[key] === 'number' && demoData[key] > 0) {
            merged[key] = demoData[key];
        }
    }
    return merged;
}

/* ══════════════════════════════════════════════
   Componenta principala
   ══════════════════════════════════════════════ */
export default function PageRapoarte() {
    const [raport,   setRaport]   = useState('utilizatori');
    const [perioada, setPerioada] = useState(12);

    /* ── Date demo direct — toate graficele populate ── */
    const sumar   = DEMO.sumar;
    const date    = DEMO[raport] || null;
    const loading  = false;
    const loadingS = false;

    /* ═══════════════════════════════════════════
       Rendere grafice per tip raport
       ═══════════════════════════════════════════ */

    function renderCharts() {
        if (loading) {
            return (
                <div className="rap-loading">
                    <div className="rap-loading-spinner" />
                    <span>Se încarcă datele...</span>
                </div>
            );
        }

        if (!date) {
            return (
                <div className="rap-empty">
                    <BarChart3 size={40} className="rap-empty-icon" />
                    <span>Nu s-au putut încărca datele raportului.</span>
                </div>
            );
        }

        switch (raport) {
            case 'utilizatori': return renderUtilizatori();
            case 'venituri':    return renderVenituri();
            case 'calatorii':   return renderCalatorii();
            case 'titluri':     return renderTitluri();
            case 'cereri':      return renderCereri();
            case 'suport':      return renderSuport();
            case 'turisti':     return renderTuristi();
            default: return null;
        }
    }

    /* ── Utilizatori ── */
    function renderUtilizatori() {
        const { pe_luna = [], pe_tip = [], total = 0 } = date;
        const chartData = pe_luna.map(r => ({ name: fmtLuna(r.luna), valoare: r.numar }));
        const pieData = pe_tip.map(r => ({ name: TIP_LABEL[r.tip] || r.tip, value: r.numar }));
        const mediePerLuna = pe_luna.length > 0 ? Math.round(pe_luna.reduce((s, r) => s + r.numar, 0) / pe_luna.length) : 0;
        const tipPredominant = pe_tip.length > 0 ? (TIP_LABEL[pe_tip[0].tip] || pe_tip[0].tip) : '—';

        return (
            <div className="rap-charts-area rap-chart-transition" key="utilizatori">
                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <TrendingUp size={16} className="rap-chart-title-icon" />
                            Înregistrări noi pe lună
                        </h3>
                    </div>
                    <div className="rap-chart-body">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="gradUtilizatori" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<RapTooltip />} />
                                    <Area type="monotone" dataKey="valoare" name="Utilizatori noi"
                                          stroke="#2563eb" strokeWidth={2} fill="url(#gradUtilizatori)"
                                          dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                                          activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <span className="rap-empty">Nu există date pentru perioada selectată.</span>}
                    </div>
                </div>

                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <PieIcon size={16} className="rap-chart-title-icon" />
                            Distribuție pe tip călător
                        </h3>
                    </div>
                    {pieData.length > 0 ? (
                        <>
                            <div className="rap-chart-body">
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                                             dataKey="value" label={renderPieLabel} paddingAngle={2}>
                                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<RapTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="rap-stats-panel">
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Total utilizatori</span></div>
                                    <span className="rap-stat-value">{fmtNr(total)}</span>
                                </div>
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Medie / lună</span></div>
                                    <span className="rap-stat-value">{fmtNr(mediePerLuna)}</span>
                                </div>
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Tip predominant</span></div>
                                    <span className="rap-stat-value">{tipPredominant}</span>
                                </div>
                            </div>
                        </>
                    ) : <span className="rap-empty">Nu există date.</span>}
                </div>
            </div>
        );
    }

    /* ── Venituri ── */
    function renderVenituri() {
        const { pe_luna = [], total_bilete = 0, total_abonamente = 0, total_turisti = 0, total = 0 } = date;
        const chartData = pe_luna.map(r => ({
            name: fmtLuna(r.luna),
            Bilete: r.bilete,
            Abonamente: r.abonamente,
            Turiști: r.turisti,
        }));
        const bestMonth = pe_luna.length > 0
            ? pe_luna.reduce((best, r) => (r.bilete + r.abonamente + r.turisti) > (best.bilete + best.abonamente + best.turisti) ? r : best, pe_luna[0])
            : null;

        return (
            <div className="rap-charts-area rap-chart-transition" key="venituri">
                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <BarChart2 size={16} className="rap-chart-title-icon" />
                            Venituri lunare pe sursă
                        </h3>
                    </div>
                    <div className="rap-chart-body">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={chartData}>
                                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                    <Tooltip content={<RapTooltip formatter={fmtLei} />} />
                                    <Bar dataKey="Bilete" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="Abonamente" stackId="a" fill="#8b5cf6" />
                                    <Bar dataKey="Turiști" stackId="a" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <span className="rap-empty">Nu există date pentru perioada selectată.</span>}
                    </div>
                    {chartData.length > 0 && (
                        <div className="rap-legend">
                            <span className="rap-legend-item"><span className="rap-legend-dot" style={{ background: '#2563eb' }} /> Bilete</span>
                            <span className="rap-legend-item"><span className="rap-legend-dot" style={{ background: '#8b5cf6' }} /> Abonamente</span>
                            <span className="rap-legend-item"><span className="rap-legend-dot" style={{ background: '#06b6d4' }} /> Turiști</span>
                        </div>
                    )}
                </div>

                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <DollarSign size={16} className="rap-chart-title-icon" />
                            Detalii venituri
                        </h3>
                    </div>
                    <div className="rap-stat-highlight">{fmtLei(total)}</div>
                    <div className="rap-stat-highlight-label">Venit total în perioada selectată</div>
                    <div className="rap-stats-panel">
                        <div className="rap-stat-row">
                            <div className="rap-stat-left">
                                <span className="rap-stat-dot" style={{ background: '#2563eb' }} />
                                <span className="rap-stat-label">Bilete</span>
                            </div>
                            <span className="rap-stat-value">{fmtLei(total_bilete)}</span>
                        </div>
                        <div className="rap-stat-row">
                            <div className="rap-stat-left">
                                <span className="rap-stat-dot" style={{ background: '#8b5cf6' }} />
                                <span className="rap-stat-label">Abonamente</span>
                            </div>
                            <span className="rap-stat-value">{fmtLei(total_abonamente)}</span>
                        </div>
                        <div className="rap-stat-row">
                            <div className="rap-stat-left">
                                <span className="rap-stat-dot" style={{ background: '#06b6d4' }} />
                                <span className="rap-stat-label">Pase turiști</span>
                            </div>
                            <span className="rap-stat-value">{fmtLei(total_turisti)}</span>
                        </div>
                        {bestMonth && (
                            <div className="rap-stat-row">
                                <div className="rap-stat-left">
                                    <span className="rap-stat-dot" style={{ background: '#10b981' }} />
                                    <span className="rap-stat-label">Cea mai bună lună</span>
                                </div>
                                <span className="rap-stat-value">{fmtLuna(bestMonth.luna)}</span>
                            </div>
                        )}
                        {pe_luna.length > 0 && (
                            <div className="rap-stat-row">
                                <div className="rap-stat-left">
                                    <span className="rap-stat-dot" style={{ background: '#f59e0b' }} />
                                    <span className="rap-stat-label">Medie lunară</span>
                                </div>
                                <span className="rap-stat-value">{fmtLei(total / pe_luna.length)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    /* ── Calatorii ── */
    function renderCalatorii() {
        const { pe_statie = [], pe_ora = [], pe_luna = [], total = 0, medie_zilnica = 0 } = date;
        const statieData = pe_statie.map(r => ({ name: r.nume.length > 18 ? r.nume.slice(0, 16) + '…' : r.nume, valoare: r.numar, fullName: r.nume }));
        const oraData = pe_ora.map(r => ({ name: `${String(r.ora).padStart(2, '0')}:00`, valoare: r.numar }));
        const oraVarf = pe_ora.length > 0 ? pe_ora.reduce((max, r) => r.numar > max.numar ? r : max, pe_ora[0]) : null;
        const statiaPop = pe_statie.length > 0 ? pe_statie[0].nume : '—';

        return (
            <div className="rap-charts-area rap-chart-transition" key="calatorii">
                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <MapPin size={16} className="rap-chart-title-icon" />
                            Top stații — nr. validări
                        </h3>
                    </div>
                    <div className="rap-chart-body">
                        {statieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(260, statieData.length * 28)}>
                                <BarChart data={statieData} layout="vertical" margin={{ left: 10 }}>
                                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" tick={AXIS_TICK} axisLine={false}
                                           tickLine={false} width={110} />
                                    <Tooltip content={<RapTooltip />} />
                                    <Bar dataKey="valoare" name="Validări" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <span className="rap-empty">Nu există date.</span>}
                    </div>
                </div>

                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <Clock size={16} className="rap-chart-title-icon" />
                            Distribuție orară
                        </h3>
                    </div>
                    <div className="rap-chart-body">
                        {oraData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={oraData}>
                                    <defs>
                                        <linearGradient id="gradOra" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false}
                                           interval={2} />
                                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<RapTooltip />} />
                                    <Area type="monotone" dataKey="valoare" name="Validări"
                                          stroke="#8b5cf6" strokeWidth={2} fill="url(#gradOra)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <span className="rap-empty">Nu există date.</span>}
                    </div>
                    <div className="rap-stats-panel">
                        <div className="rap-stat-row">
                            <div className="rap-stat-left"><span className="rap-stat-label">Total validări</span></div>
                            <span className="rap-stat-value">{fmtNr(total)}</span>
                        </div>
                        <div className="rap-stat-row">
                            <div className="rap-stat-left"><span className="rap-stat-label">Medie zilnică</span></div>
                            <span className="rap-stat-value">{fmtNr(medie_zilnica)}</span>
                        </div>
                        <div className="rap-stat-row">
                            <div className="rap-stat-left"><span className="rap-stat-label">Stația populară</span></div>
                            <span className="rap-stat-value">{statiaPop}</span>
                        </div>
                        {oraVarf && (
                            <div className="rap-stat-row">
                                <div className="rap-stat-left"><span className="rap-stat-label">Ora de vârf</span></div>
                                <span className="rap-stat-value">{String(oraVarf.ora).padStart(2, '0')}:00</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    /* ── Titluri (Abonamente & Bilete) ── */
    function renderTitluri() {
        const { abonamente_pe_tip = [], bilete_pe_tip = [], total_abonamente = 0, total_bilete = 0 } = date;
        const abonData = abonamente_pe_tip.map(r => ({ name: ABON_LABEL[r.tip] || r.tip, valoare: r.numar, venit: r.venit }));
        const biletData = bilete_pe_tip.map(r => ({ name: `${r.numar_calatorii} căl.`, value: r.numar }));
        const topAbon = abonamente_pe_tip.length > 0 ? (ABON_LABEL[abonamente_pe_tip[0].tip] || abonamente_pe_tip[0].tip) : '—';
        const totalVenitAbon = abonamente_pe_tip.reduce((s, r) => s + r.venit, 0);
        const totalVenitBilete = bilete_pe_tip.reduce((s, r) => s + r.venit, 0);

        return (
            <div className="rap-charts-area rap-chart-transition" key="titluri">
                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <CreditCard size={16} className="rap-chart-title-icon" />
                            Abonamente vândute pe tip
                        </h3>
                    </div>
                    <div className="rap-chart-body">
                        {abonData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={abonData}>
                                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<RapTooltip />} />
                                    <Bar dataKey="valoare" name="Vândute" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={36} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <span className="rap-empty">Nu există date.</span>}
                    </div>
                </div>

                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <Ticket size={16} className="rap-chart-title-icon" />
                            Bilete — distribuție pe nr. călătorii
                        </h3>
                    </div>
                    {biletData.length > 0 ? (
                        <>
                            <div className="rap-chart-body">
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={biletData} cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                                             dataKey="value" label={renderPieLabel} paddingAngle={2}>
                                            {biletData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<RapTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="rap-stats-panel">
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Total abonamente</span></div>
                                    <span className="rap-stat-value">{fmtNr(total_abonamente)}</span>
                                </div>
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Total bilete</span></div>
                                    <span className="rap-stat-value">{fmtNr(total_bilete)}</span>
                                </div>
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Tip abonament popular</span></div>
                                    <span className="rap-stat-value">{topAbon}</span>
                                </div>
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Venit abonamente</span></div>
                                    <span className="rap-stat-value">{fmtLei(totalVenitAbon)}</span>
                                </div>
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Venit bilete</span></div>
                                    <span className="rap-stat-value">{fmtLei(totalVenitBilete)}</span>
                                </div>
                            </div>
                        </>
                    ) : <span className="rap-empty">Nu există date.</span>}
                </div>
            </div>
        );
    }

    /* ── Cereri Reducere ── */
    function renderCereri() {
        const { pe_luna = [], pe_status = [], total = 0, rata_aprobare = 0 } = date;
        const chartData = pe_luna.map(r => ({ name: fmtLuna(r.luna), valoare: r.numar }));
        const pieData = pe_status.map(r => ({ name: STATUS_LABEL[r.status] || r.status, value: r.numar, status: r.status }));
        const pending = pe_status.find(r => r.status === 'in_asteptare')?.numar || 0;

        return (
            <div className="rap-charts-area rap-chart-transition" key="cereri">
                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <TrendingUp size={16} className="rap-chart-title-icon" />
                            Cereri reducere pe lună
                        </h3>
                    </div>
                    <div className="rap-chart-body">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="gradCereri" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<RapTooltip />} />
                                    <Area type="monotone" dataKey="valoare" name="Cereri"
                                          stroke="#06b6d4" strokeWidth={2} fill="url(#gradCereri)"
                                          dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }}
                                          activeDot={{ r: 5, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <span className="rap-empty">Nu există date pentru perioada selectată.</span>}
                    </div>
                </div>

                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <ShieldCheck size={16} className="rap-chart-title-icon" />
                            Distribuție pe status
                        </h3>
                    </div>
                    {pieData.length > 0 ? (
                        <>
                            <div className="rap-chart-body">
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                                             dataKey="value" label={renderPieLabel} paddingAngle={2}>
                                            {pieData.map((entry, i) => (
                                                <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<RapTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="rap-stats-panel">
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Total cereri</span></div>
                                    <span className="rap-stat-value">{fmtNr(total)}</span>
                                </div>
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Rată aprobare</span></div>
                                    <span className="rap-stat-value">{rata_aprobare}%</span>
                                </div>
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">În așteptare</span></div>
                                    <span className="rap-stat-value">{fmtNr(pending)}</span>
                                </div>
                            </div>
                        </>
                    ) : <span className="rap-empty">Nu există date.</span>}
                </div>
            </div>
        );
    }

    /* ── Suport ── */
    function renderSuport() {
        const { pe_luna = [], pe_status = [], rating_mediu, rata_rezolvare = 0, total = 0 } = date;
        const chartData = pe_luna.map(r => ({ name: fmtLuna(r.luna), valoare: r.numar }));
        const pieData = pe_status.map(r => ({ name: STATUS_LABEL[r.status] || r.status, value: r.numar, status: r.status }));
        const deschise = pe_status.find(r => r.status === 'deschis')?.numar || 0;

        return (
            <div className="rap-charts-area rap-chart-transition" key="suport">
                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <TrendingUp size={16} className="rap-chart-title-icon" />
                            Tickete suport pe lună
                        </h3>
                    </div>
                    <div className="rap-chart-body">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="gradSuport" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<RapTooltip />} />
                                    <Area type="monotone" dataKey="valoare" name="Tickete"
                                          stroke="#10b981" strokeWidth={2} fill="url(#gradSuport)"
                                          dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                                          activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <span className="rap-empty">Nu există date pentru perioada selectată.</span>}
                    </div>
                </div>

                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <PieIcon size={16} className="rap-chart-title-icon" />
                            Status tickete
                        </h3>
                    </div>
                    {pieData.length > 0 || rating_mediu != null ? (
                        <>
                            {rating_mediu != null && (
                                <>
                                    <div className="rap-stat-highlight">
                                        <Star size={22} style={{ verticalAlign: 'middle', marginRight: 6, color: '#fbbf24' }} />
                                        {rating_mediu.toFixed(1)}
                                    </div>
                                    <div className="rap-stat-highlight-label">Rating mediu clienți</div>
                                </>
                            )}
                            {pieData.length > 0 && (
                                <div className="rap-chart-body" style={{ minHeight: 160 }}>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} innerRadius={35}
                                                 dataKey="value" label={renderPieLabel} paddingAngle={2}>
                                                {pieData.map((entry, i) => (
                                                    <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<RapTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            <div className="rap-stats-panel">
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Total tickete</span></div>
                                    <span className="rap-stat-value">{fmtNr(total)}</span>
                                </div>
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Rată rezolvare</span></div>
                                    <span className="rap-stat-value">{rata_rezolvare}%</span>
                                </div>
                                <div className="rap-stat-row">
                                    <div className="rap-stat-left"><span className="rap-stat-label">Tickete deschise</span></div>
                                    <span className="rap-stat-value">{fmtNr(deschise)}</span>
                                </div>
                            </div>
                        </>
                    ) : <span className="rap-empty">Nu există date.</span>}
                </div>
            </div>
        );
    }

    /* ── Turisti ── */
    function renderTuristi() {
        const { pe_tara = [], pe_zile = [], pe_luna = [], total = 0, venit_total = 0 } = date;
        const taraData = pe_tara.map(r => ({ name: r.tara, valoare: r.numar }));
        const zileData = pe_zile.map(r => ({ name: `${r.zile} ${r.zile === 1 ? 'zi' : 'zile'}`, valoare: r.numar }));
        const taraPrinc = pe_tara.length > 0 ? pe_tara[0].tara : '—';
        const medieZile = pe_zile.length > 0
            ? (pe_zile.reduce((s, r) => s + r.zile * r.numar, 0) / pe_zile.reduce((s, r) => s + r.numar, 0)).toFixed(1)
            : '—';

        return (
            <div className="rap-charts-area rap-chart-transition" key="turisti">
                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <Globe size={16} className="rap-chart-title-icon" />
                            Top țări — pase turistice
                        </h3>
                    </div>
                    <div className="rap-chart-body">
                        {taraData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(260, taraData.length * 30)}>
                                <BarChart data={taraData} layout="vertical" margin={{ left: 10 }}>
                                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" tick={AXIS_TICK} axisLine={false}
                                           tickLine={false} width={90} />
                                    <Tooltip content={<RapTooltip />} />
                                    <Bar dataKey="valoare" name="Pase" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <span className="rap-empty">Nu există date.</span>}
                    </div>
                </div>

                <div className="rap-chart-card">
                    <div className="rap-chart-header">
                        <h3 className="rap-chart-title">
                            <Calendar size={16} className="rap-chart-title-icon" />
                            Distribuție pe durată
                        </h3>
                    </div>
                    <div className="rap-chart-body">
                        {zileData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={zileData}>
                                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<RapTooltip />} />
                                    <Bar dataKey="valoare" name="Pase" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <span className="rap-empty">Nu există date.</span>}
                    </div>
                    <div className="rap-stats-panel">
                        <div className="rap-stat-row">
                            <div className="rap-stat-left"><span className="rap-stat-label">Total pase</span></div>
                            <span className="rap-stat-value">{fmtNr(total)}</span>
                        </div>
                        <div className="rap-stat-row">
                            <div className="rap-stat-left"><span className="rap-stat-label">Venit total</span></div>
                            <span className="rap-stat-value">{fmtEuro(venit_total)}</span>
                        </div>
                        <div className="rap-stat-row">
                            <div className="rap-stat-left"><span className="rap-stat-label">Țara principală</span></div>
                            <span className="rap-stat-value">{taraPrinc}</span>
                        </div>
                        <div className="rap-stat-row">
                            <div className="rap-stat-left"><span className="rap-stat-label">Durata medie</span></div>
                            <span className="rap-stat-value">{medieZile} zile</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════
       Render principal
       ═══════════════════════════════════════════ */
    const RaportIcon = RAPOARTE.find(r => r.id === raport)?.icon || BarChart3;

    return (
        <div className="dash-section rap-page">
            {/* ── Header ── */}
            <div className="rap-header">
                <div className="rap-title-area">
                    <h2 className="rap-title">
                        <span className="rap-title-icon"><BarChart3 size={18} /></span>
                        Rapoarte
                    </h2>
                    <p className="rap-subtitle">Statistici și analize ale utilizării sistemului</p>
                </div>

                <div className="rap-controls">
                    <div className="rap-select-group">
                        <span className="rap-select-label">Raport</span>
                        <select className="rap-select" value={raport}
                                onChange={e => setRaport(e.target.value)} id="rap-select-report">
                            {RAPOARTE.map(r => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="rap-select-chevron" />
                    </div>

                    <div className="rap-select-group">
                        <span className="rap-select-label">Perioadă</span>
                        <select className="rap-select" value={perioada}
                                onChange={e => setPerioada(Number(e.target.value))} id="rap-select-period">
                            {PERIOADE.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="rap-select-chevron" />
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="rap-kpi-grid">
                <div className="rap-kpi-card">
                    <div className="rap-kpi-icon rap-kpi-icon--blue"><Users size={20} /></div>
                    <div className="rap-kpi-info">
                        <span className="rap-kpi-value">{loadingS ? '—' : fmtNr(sumar?.total_calatori)}</span>
                        <span className="rap-kpi-label">Utilizatori înregistrați</span>
                    </div>
                </div>
                <div className="rap-kpi-card">
                    <div className="rap-kpi-icon rap-kpi-icon--green"><DollarSign size={20} /></div>
                    <div className="rap-kpi-info">
                        <span className="rap-kpi-value">{loadingS ? '—' : fmtLei(sumar?.total_venituri)}</span>
                        <span className="rap-kpi-label">Venituri totale</span>
                    </div>
                </div>
                <div className="rap-kpi-card">
                    <div className="rap-kpi-icon rap-kpi-icon--purple"><Activity size={20} /></div>
                    <div className="rap-kpi-info">
                        <span className="rap-kpi-value">{loadingS ? '—' : fmtNr(sumar?.total_calatorii)}</span>
                        <span className="rap-kpi-label">Călătorii efectuate</span>
                    </div>
                </div>
                <div className="rap-kpi-card">
                    <div className="rap-kpi-icon rap-kpi-icon--amber"><CreditCard size={20} /></div>
                    <div className="rap-kpi-info">
                        <span className="rap-kpi-value">{loadingS ? '—' : fmtNr(sumar?.abonamente_active)}</span>
                        <span className="rap-kpi-label">Abonamente active</span>
                    </div>
                </div>
            </div>

            {/* ── Charts ── */}
            {renderCharts()}
        </div>
    );
}
