import React, { useState } from 'react';
import './ChannelManager.css';
import { 
  Zap, TrendingUp, Inbox, Shield, BarChart, Plus, ChevronDown, Check, X, 
  Settings, RefreshCw, Layers, Database, Globe, AlertTriangle, Info,
  Search, Sliders, ArrowRight, Activity, Command, Package,
  History, Eye, Save, Lock, Cpu, Layout, MousePointerClick, Edit3,
  ChevronLeft, ChevronRight, Calendar, Download, Printer, Filter
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS & HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

const getDummyArr = (base, len) => Array.from({ length: len }, (_, i) => base[i % base.length]);

const KPICardV3 = ({ label, val, trend, color, icon }) => (
  <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div style={{ background: color + '15', color: color, padding: '12px', borderRadius: '12px' }}>{icon}</div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A' }}>{val}</div>
      </div>
    </div>
    <div style={{ fontSize: '13px', fontWeight: '800', color: trend.startsWith('+') ? '#10B981' : '#64748B' }}>{trend} <span style={{ fontWeight: '500', color: '#94A3B8' }}>vs last week</span></div>
  </div>
);

const MappingRow = ({ local, remote, channel }) => (
  <div className="mapping-connector">
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '240px' }}>
      <div style={{ background: '#F1F5F9', padding: '8px', borderRadius: '8px' }}><Package size={16} /></div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '800' }}>{local}</div>
        <div style={{ fontSize: '10px', color: '#64748B' }}>FLOWTYM CORE</div>
      </div>
    </div>
    <div className="mapping-line"></div>
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'right', width: '240px', justifyContent: 'flex-end' }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '13px', fontWeight: '800' }}>{remote}</div>
        <div style={{ fontSize: '10px', color: '#64748B' }}>{channel.toUpperCase()}</div>
      </div>
      <div style={{ background: '#EEF2FF', color: '#4361EE', padding: '8px', borderRadius: '8px' }}><Globe size={16} /></div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════
   BULK EDIT MODAL (KILLER FEATURE)
   ══════════════════════════════════════════════════════════════════════════ */

const BulkEditModal = ({ onClose }) => (
   <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
     <div className="card animate-fade-in" style={{ width: '600px', background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}><MousePointerClick size={24} color="#4361EE" /> Bulk Edit (Masse)</h2>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><X size={16}/></button>
       </div>
 
       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
             <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '8px' }}>Période d'application</label>
             <div style={{ display: 'flex', gap: '10px' }}>
                <input type="date" className="search-input-v2" defaultValue="2025-03-20" style={{ width: '100%' }} />
                <input type="date" className="search-input-v2" defaultValue="2025-03-31" style={{ width: '100%' }} />
             </div>
          </div>
          <div>
             <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '8px' }}>Jours concernés</label>
             <div style={{ display: 'flex', gap: '4px' }}>
                {['L','M','M','J','V','S','D'].map((d,i) => (
                   <div key={i} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i > 4 ? '#4361EE' : '#F1F5F9', color: i > 4 ? 'white' : '#64748B', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>{d}</div>
                ))}
             </div>
          </div>
       </div>
 
       <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
             <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '8px' }}>Action à appliquer</label>
                <select className="search-input-v2" style={{ width: '100%', background: 'white' }}>
                   <option>Ajuster le Prix BAR</option>
                   <option>Modifier la Disponibilité</option>
                   <option>Fermer les ventes (Stop Sell)</option>
                   <option>Minimum Stay</option>
                </select>
             </div>
             <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '8px' }}>Nouvelle Valeur</label>
                <input type="text" className="search-input-v2" defaultValue="165" style={{ width: '100%', background: 'white', fontWeight: '900', color: '#0F172A' }} />
             </div>
          </div>
          <div style={{ marginTop: '16px' }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#0F172A', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked /> Forcer l'écrasement des règles RMS (Override)
             </label>
          </div>
       </div>
 
       <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={onClose}><Save size={16} /> Appliquer (54 cellules)</button>
       </div>
     </div>
   </div>
 );

/* ══════════════════════════════════════════════════════════════════════════
   INVENTORY GRID (HIGH UX, EDITABLE, COMPACT MODE)
   ══════════════════════════════════════════════════════════════════════════ */

const EditableCell = ({ initialValue, type, isCompact, isChannelToggle, isAnomaly }) => {
  const [val, setVal] = useState(initialValue);

  const handleClick = () => {
    if (isChannelToggle) setVal(val === 'CLOSED' ? initialValue : 'CLOSED');
  };

  const handleChange = (e) => {
    if (!isChannelToggle) setVal(e.target.value);
  };

  let colorClass = "";
  if (val === 'CLOSED') colorClass = "cell-red";
  else if (type === 'price' && val !== '-' && parseInt(val) < 135) colorClass = "cell-green";
  else if (type === 'count' && parseInt(val) === 0) colorClass = "cell-gray";

  return (
    <td style={{ padding: isCompact ? '4px 2px' : '8px' }} onClick={handleClick}>
      <div className={`cell-val ${colorClass}`} style={{ 
        padding: isCompact ? '2px 0' : '6px 4px', 
        fontSize: isCompact ? '9px' : '11px',
        minHeight: isCompact ? '20px' : 'auto',
        borderRadius: isCompact ? '4px' : '8px',
        cursor: isChannelToggle ? 'pointer' : 'text',
        boxShadow: isAnomaly && val !== 'CLOSED' ? '0 0 0 2px #F59E0B, 0 4px 6px -1px rgba(245, 158, 11, 0.4)' : 'none',
        background: isAnomaly && val !== 'CLOSED' ? '#FEF3C7' : '',
        border: isAnomaly && val !== 'CLOSED' ? '1px solid #F59E0B' : 'none',
        position: 'relative',
        transition: 'all 0.2s'
      }}>
        {isAnomaly && val !== 'CLOSED' && <div style={{position: 'absolute', top: '-4px', right: '-4px', width: '8px', height:'8px', background: '#EF4444', borderRadius:'50%', border: '2px solid white'}}></div>}
        
        {isChannelToggle ? (
           <span style={{ fontWeight: '800' }}>{val}</span>
        ) : (
           <input 
             value={val} 
             onChange={handleChange} 
             style={{ 
               width: '100%', background: 'transparent', border: 'none', textAlign: 'center', 
               fontWeight: '900', color: 'inherit', outline: 'none', padding: 0
             }} 
           />
        )}
      </div>
    </td>
  );
};

const GridRow = ({ label, baseData, viewPeriod, isCompact, type, isChannel, indent, showAnomalies }) => {
  const data = getDummyArr(baseData, viewPeriod);
  
  return (
    <tr style={{ background: isChannel ? '#F8FAFC' : 'white' }}>
      <td style={{ 
        paddingLeft: indent ? '30px' : '20px', 
        fontWeight: indent ? '600' : '800', 
        fontSize: isCompact ? '10px' : '12px',
        color: isChannel ? '#64748B' : '#0F172A',
        borderRight: '1px solid #E2E8F0',
        whiteSpace: 'nowrap'
      }}>
        {isChannel && <span style={{ marginRight: '6px' }}>↳</span>}
        {label}
      </td>
      {data.map((v, i) => {
        // Random anomaly mock logic just for display purposes
        const isAnomaly = showAnomalies && isChannel && typeof v === 'number' && Math.random() > 0.8;
        return <EditableCell key={i} initialValue={v} type={type} isCompact={isCompact} isChannelToggle={isChannel} isAnomaly={isAnomaly} />
      })}
    </tr>
  );
}

const InventoryGrid = () => {
  const [viewPeriod, setViewPeriod] = useState(30);
  const [showChannels, setShowChannels] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(true);

  const isCompact = viewPeriod === 30;

  const days = Array.from({ length: viewPeriod }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return { day: d.getDate(), weekday: d.toLocaleDateString('fr-FR', { weekday: 'short' }), isWeekend: d.getDay() === 0 || d.getDay() === 6, isToday: d.toDateString() === new Date().toDateString(), dateObj: d };
  });

  const endD = new Date(startDate);
  endD.setDate(endD.getDate() + viewPeriod - 1);
  const options = { day: '2-digit', month: 'short' };
  const periodLabel = `${startDate.toLocaleDateString('fr-FR', options)} → ${endD.toLocaleDateString('fr-FR', options)}`;

  const goPrev = () => { const d = new Date(startDate); d.setDate(d.getDate() - viewPeriod); setStartDate(d); };
  const goNext = () => { const d = new Date(startDate); d.setDate(d.getDate() + viewPeriod); setStartDate(d); };
  const goToday = () => setStartDate(new Date());

  const toData = getDummyArr([85, 90, 95, 80, 75, 60, 50, 65, 85, 95, 100, 80], viewPeriod);

  return (
    <>
    {showBulkEdit && <BulkEditModal onClose={() => setShowBulkEdit(false)} />}
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* GRID TOOLBAR */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#F8FAFC', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
               {/* Period Nav */}
               <div style={{ display: 'flex', background: 'white', borderRadius: '10px', padding: '4px', border: '1px solid #E2E8F0', alignItems: 'center' }}>
                  <button onClick={goPrev} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 8px', color: '#64748B' }}><ChevronLeft size={16}/></button>
                  <div style={{ fontWeight: '800', fontSize: '13px', padding: '0 12px', color: '#0F172A', minWidth: '130px', textAlign: 'center' }}>{periodLabel}</div>
                  <button onClick={goNext} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 8px', color: '#64748B' }}><ChevronRight size={16}/></button>
               </div>
               
               <button onClick={goToday} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}><Calendar size={14}/> Aujourd'hui</button>

               {/* View Period Selector */}
               <div style={{ display: 'flex', background: '#E2E8F0', padding: '4px', borderRadius: '10px', gap: '2px', marginLeft: '12px' }}>
                  <button onClick={() => setViewPeriod(7)} className={`pill-btn ${viewPeriod === 7 ? 'active' : ''}`} style={{ padding: '6px 12px' }}>7 Jours</button>
                  <button onClick={() => setViewPeriod(15)} className={`pill-btn ${viewPeriod === 15 ? 'active' : ''}`} style={{ padding: '6px 12px' }}>15 Jours</button>
                  <button onClick={() => setViewPeriod(30)} className={`pill-btn ${viewPeriod === 30 ? 'active' : ''}`} style={{ padding: '6px 12px', background: viewPeriod === 30 ? '#3B82F6' : '', color: viewPeriod === 30 ? 'white' : '' }}>1 Mois (Global)</button>
               </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
               <button className="btn btn-secondary btn-sm" onClick={() => setShowChannels(!showChannels)}>
                  {showChannels ? 'Cacher Canaux' : 'Afficher Canaux (OTA)'}
               </button>
               <button className="btn btn-primary btn-sm" onClick={() => setShowBulkEdit(true)}><MousePointerClick size={14}/> Bulk Edit</button>
               <button className={`btn btn-sm ${showAnomalies ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowAnomalies(!showAnomalies)} style={{ color: showAnomalies ? 'white' : '#F59E0B', borderColor: showAnomalies ? 'transparent' : '#FDE68A', background: showAnomalies ? '#F59E0B' : '#FFFBEB' }}>
                   <Zap size={14}/> {showAnomalies ? 'Masquer Anomalies' : 'Highlight Anomalies'}
               </button>
            </div>
         </div>
      </div>

      {/* THE GRID */}
      <div style={{ overflowX: isCompact ? 'hidden' : 'auto', width: '100%' }}>
        <table className="inventory-table" style={{ width: '100%', tableLayout: isCompact ? 'fixed' : 'auto' }}>
          <thead>
            <tr>
              <th style={{ width: isCompact ? '160px' : '220px', textAlign: 'left', paddingLeft: '20px', fontSize: '11px', verticalAlign: 'middle', borderBottom: '1px solid #E2E8F0' }}>Date</th>
              {days.map(d => (
                <th key={d.dateObj.getTime()} style={{ 
                    background: d.isToday ? '#FFFBEB' : (d.isWeekend ? '#EEF2FF' : '#F8FAFC'), 
                    padding: isCompact ? '4px 0' : '12px 4px',
                    borderBottom: d.isToday ? '3px solid #F59E0B' : '1px solid #E2E8F0'
                }}>
                  <div style={{ fontSize: isCompact ? '8px' : '10px', color: d.isToday ? '#D97706' : '#94A3B8', fontWeight: d.isToday ? '900' : '700' }}>{d.weekday.toUpperCase()}</div>
                  <div style={{ fontSize: isCompact ? '12px' : '15px', color: d.isToday ? '#D97706' : (d.isWeekend ? '#4361EE' : '#1e293b') }}>{d.day}</div>
                </th>
              ))}
            </tr>
            {/* OCCUPANCY ROW */}
            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
              <td style={{ paddingLeft: '20px', fontWeight: '800', fontSize: isCompact ? '9px' : '11px', color: '#64748B' }}>TO GLOBAL</td>
              {toData.map((to, i) => (
                <td key={i} style={{ textAlign: 'center', fontWeight: '900', fontSize: isCompact ? '10px' : '12px', color: to >= 85 ? '#10B981' : (to >= 65 ? '#F59E0B' : '#EF4444'), borderRight: '1px solid rgba(0,0,0,0.02)' }}>
                  {to}%
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ROOM 1 */}
            <tr><td colSpan={viewPeriod + 1} style={{ background: '#F1F5F9', fontWeight: '900', fontSize: '12px', padding: '10px 20px' }}>Double Standard (STD)</td></tr>
            <GridRow label="Disponibilité" baseData={[8, 7, 5, 4, 3, 2, 0, 0, 5, 8]} viewPeriod={viewPeriod} isCompact={isCompact} type="count" showAnomalies={showAnomalies} />
            <GridRow label="Prix BAR" baseData={[145, 145, 145, 160, 180, 195, 195, 180]} viewPeriod={viewPeriod} isCompact={isCompact} type="price" showAnomalies={showAnomalies} />
            
            {showChannels && (
              <>
                <GridRow label="Booking.com" baseData={[130, 130, 130, 144, 162, 175]} viewPeriod={viewPeriod} isCompact={isCompact} type="price" isChannel={true} showAnomalies={showAnomalies} />
                <GridRow label="Expedia" baseData={[130, 130, 130, 144, 'CLOSED', 175]} viewPeriod={viewPeriod} isCompact={isCompact} type="price" isChannel={true} showAnomalies={showAnomalies} />
              </>
            )}

            <GridRow label="Min Stay" baseData={[1, 1, 2, 2, 3, 2]} viewPeriod={viewPeriod} isCompact={isCompact} type="count" indent showAnomalies={showAnomalies} />
            <GridRow label="CTA" baseData={['-', '-', '-', 'Oui', '-', '-']} viewPeriod={viewPeriod} isCompact={isCompact} type="text" indent showAnomalies={showAnomalies} />

            {/* ROOM 2 */}
            <tr><td colSpan={viewPeriod + 1} style={{ background: '#F1F5F9', fontWeight: '900', fontSize: '12px', padding: '10px 20px' }}>Suite Vue Mer (SUI)</td></tr>
            <GridRow label="Disponibilité" baseData={[2, 2, 1, 0, 0, 1, 2, 1]} viewPeriod={viewPeriod} isCompact={isCompact} type="count" showAnomalies={showAnomalies} />
            <GridRow label="Prix BAR" baseData={[280, 280, 310, 340, 340, 310]} viewPeriod={viewPeriod} isCompact={isCompact} type="price" showAnomalies={showAnomalies} />
            
            {showChannels && (
              <>
                <GridRow label="Booking.com" baseData={[252, 252, 279, 'CLOSED', 'CLOSED']} viewPeriod={viewPeriod} isCompact={isCompact} type="price" isChannel={true} showAnomalies={showAnomalies} />
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   RATE SHOPPER (KILLER FEATURE)
   ══════════════════════════════════════════════════════════════════════════ */

const RateShopperView = () => (
   <div className="animate-fade-in" style={{ padding: '24px', background: 'white', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
         <div>
            <h2 style={{ fontSize: '20px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}><Activity color="#4361EE" /> Rate Shopper (Veille Concurrentielle)</h2>
            <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Comparaison des prix en temps réel sur votre Set Concurrentiel (CompSet).</p>
         </div>
         <button className="btn btn-primary"><RefreshCw size={14} /> Actualiser Marché</button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr)', gap: '20px', marginBottom: '24px' }}>
          {/* Demo CompSet Cards */}
          <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
             <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', marginBottom: '12px' }}>CONCURRENT 1</div>
             <div style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', marginBottom: '4px' }}>Hôtel Le Majestic</div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '28px', fontWeight: '900', color: '#0F172A' }}>195 €</span>
                <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 8px', background: '#FEE2E2', color: '#EF4444', borderRadius: '20px', marginBottom: '6px' }}>+15€ vs Vous</span>
             </div>
          </div>
          <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
             <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', marginBottom: '12px' }}>CONCURRENT 2</div>
             <div style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', marginBottom: '4px' }}>Boutique Hôtel Azur</div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '28px', fontWeight: '900', color: '#0F172A' }}>160 €</span>
                <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 8px', background: '#D1FAE5', color: '#10B981', borderRadius: '20px', marginBottom: '6px' }}>-20€ vs Vous</span>
             </div>
          </div>
          <div style={{ padding: '20px', background: '#EEF2FF', borderRadius: '16px', border: '2px solid #4361EE' }}>
             <div style={{ fontSize: '12px', fontWeight: '800', color: '#4361EE', marginBottom: '12px' }}>NOTRE PROPRIÉTÉ</div>
             <div style={{ fontSize: '18px', fontWeight: '900', color: '#4361EE', marginBottom: '4px' }}>Grand Hôtel Rivage</div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '28px', fontWeight: '900', color: '#4361EE' }}>180 €</span>
                <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 8px', background: 'rgba(67, 97, 238, 0.1)', color: '#4361EE', borderRadius: '20px', marginBottom: '6px' }}>TARIF BAR</span>
             </div>
          </div>
      </div>
 
      <div style={{ padding: '20px', background: '#FFFBEB', borderRadius: '16px', border: '1px solid #FDE68A', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
         <Zap color="#F59E0B" />
         <div>
            <h4 style={{ fontWeight: '800', color: '#92400E', margin: '0 0 8px 0' }}>Recommandation RMS Stratégique (Auto-Pilot)</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#B45309', lineHeight: '1.5' }}>Le marché est actuellement en hausse. Votre CompSet a augmenté ses prix de 12% en moyenne sur les dernières 4h en réponse à l'annonce du Congrès. <b>Le RMS recommande de combler le gap.</b></p>
            <button className="btn btn-sm" style={{ marginTop: '12px', background: '#F59E0B', color: 'white', border: 'none' }}>Aligner les tarifs (+12%)</button>
         </div>
      </div>
   </div>
 );

/* ══════════════════════════════════════════════════════════════════════════
   CONFIGURATION MENU
   ══════════════════════════════════════════════════════════════════════════ */

const ConfigMenuUI = () => {
   const [activeConf, setActiveConf] = useState('affichage');
   const confTabs = [
      { id: 'affichage', label: 'Affichage & Préférences' },
      { id: 'canaux', label: 'Gestion des Canaux (OTA)' },
      { id: 'connect', label: 'Connectivité PMS/RMS' },
      { id: 'tarifs', label: 'Tarifs & Plans' },
      { id: 'chambres', label: 'Types de Chambres' },
      { id: 'regles', label: 'Règles & Restrictions' },
   ];

   return (
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '24px' }} className="animate-fade-in">
         <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '900', color: '#64748B', marginBottom: '8px', paddingLeft: '8px' }}>PANNNEAU CONFIG</h4>
            {confTabs.map(t => (
               <button 
                  key={t.id} 
                  onClick={() => setActiveConf(t.id)}
                  style={{ 
                     textAlign: 'left', padding: '12px', borderRadius: '8px', border: 'none', background: activeConf === t.id ? '#F1F5F9' : 'transparent',
                     color: activeConf === t.id ? '#4361EE' : '#64748B', fontWeight: activeConf === t.id ? '800' : '600',
                     cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
               >
                  {t.label}
                  {activeConf === t.id && <ArrowRight size={14} />}
               </button>
            ))}
         </div>

         <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{confTabs.find(t => t.id === activeConf)?.label}</h3>
               {activeConf === 'canaux' && <button className="btn btn-primary btn-sm"><Plus size={14} /> Nouveau Canal</button>}
               {activeConf === 'tarifs' && <button className="btn btn-primary btn-sm"><Plus size={14} /> Nouveau Tarif</button>}
            </div>
            
            <div style={{ padding: '30px' }}>
               
               {activeConf === 'affichage' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '600px' }}>
                     <div>
                        <h4 style={{ fontWeight: '800', marginBottom: '16px' }}>Restrictions Visibles (Grille)</h4>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                           {['Min Stay', 'Max Stay', 'Close to Arrival (CTA)', 'Close to Departure (CTD)'].map(r => (
                              <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', border: '1px solid #E2E8F0', borderRadius: '12px', cursor: 'pointer' }}>
                                 <input type="checkbox" defaultChecked /> <span style={{ fontWeight: '600', fontSize: '13px' }}>{r}</span>
                              </label>
                           ))}
                        </div>
                     </div>
                     <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0' }} />
                     <div>
                        <h4 style={{ fontWeight: '800', marginBottom: '16px' }}>Ordre d'affichage des tarifs</h4>
                        <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                           <div style={{ padding: '12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: '700' }}>1. BAR (Best Available Rate)</span><span>≡</span></div>
                           <div style={{ padding: '12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: '700' }}>2. Non-Refundable (NRF)</span><span>≡</span></div>
                           <div style={{ padding: '12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', opacity: 0.6 }}><span style={{ fontWeight: '700' }}>3. Corporate</span><span>≡</span></div>
                        </div>
                     </div>
                  </div>
               )}

               {activeConf === 'canaux' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                     <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '10px', marginTop: 0 }}>Les canaux sont automatiquement triés en fonction du taux de commission configuré (stratégie RM).</p>
                     
                     <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>🌐</div>
                           <div>
                              <div style={{ fontWeight: '900', fontSize: '16px' }}>Moteur de Réservation (Direct)</div>
                              <div style={{ fontSize: '13px', color: '#64748B' }}>Tarif: BAR, NRF • Ch: Toutes</div>
                           </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                           <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>COMMISSION</div>
                              <div style={{ fontSize: '16px', fontWeight: '900', color: '#10B981' }}>0.0%</div>
                           </div>
                           <button className="btn btn-secondary btn-sm"><Edit3 size={14}/></button>
                        </div>
                     </div>

                     <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <div style={{ width: '40px', height: '40px', background: '#003580', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>B.</div>
                           <div>
                              <div style={{ fontWeight: '900', fontSize: '16px' }}>Booking.com (Genius)</div>
                              <div style={{ fontSize: '13px', color: '#64748B' }}>Tarif: Booking Genius • Ch: STD, SUI</div>
                           </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                           <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>COMMISSION</div>
                              <div style={{ fontSize: '16px', fontWeight: '900', color: '#F59E0B' }}>15.0%</div>
                           </div>
                           <button className="btn btn-secondary btn-sm"><Edit3 size={14}/></button>
                        </div>
                     </div>

                     <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <div style={{ width: '40px', height: '40px', background: '#FF5A5F', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>A.</div>
                           <div>
                              <div style={{ fontWeight: '900', fontSize: '16px' }}>Airbnb</div>
                              <div style={{ fontSize: '13px', color: '#64748B' }}>Tarif: BAR • Ch: SUI uniquement</div>
                           </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                           <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>COMMISSION</div>
                              <div style={{ fontSize: '16px', fontWeight: '900', color: '#EF4444' }}>18.0%</div>
                           </div>
                           <button className="btn btn-secondary btn-sm"><Edit3 size={14}/></button>
                        </div>
                     </div>
                  </div>
               )}

               {['tarifs', 'chambres', 'connect', 'regles'].includes(activeConf) && (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                     <Settings size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                     <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#64748B' }}>{confTabs.find(t=>t.id===activeConf)?.label}</h3>
                     <p style={{ fontSize: '14px', marginTop: '8px' }}>Interface de configuration avancée accessible depuis cette zone.</p>
                  </div>
               )}

            </div>
         </div>
      </div>
   );
};

/* ══════════════════════════════════════════════════════════════════════════
   OTHER DASHBOARDS
   ══════════════════════════════════════════════════════════════════════════ */

const SaaSDashboard = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px' }}>
    <KPICardV3 label="Revenu Mensuel OTA" val="12.4k €" trend="+15.2%" color="#3B82F6" icon={<TrendingUp size={24} />} />
    <KPICardV3 label="ADR Distribution" val="184 €" trend="+4.3%" color="#10B981" icon={<Zap size={24} />} />
    <KPICardV3 label="Overbooking Risk" val="0.0%" trend="Clean" color="#FACC15" icon={<Shield size={24} />} />
    <KPICardV3 label="Reservations Today" val="24" trend="Active" color="#F472B6" icon={<Inbox size={24} />} />
  </div>
);

const MappingEngineUI = () => (
  <div className="animate-fade-in">
     <div style={{ background: '#F8FAFC', padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h4 style={{ fontWeight: '800', margin: 0 }}>Mapping des Catégories (Internal ↔ Channel)</h4>
        <button className="btn btn-secondary btn-sm">+ Nouveau Mapping</button>
     </div>
     <MappingRow local="Double Standard" remote="STDDBL Double Room Standard" channel="Booking.com" />
     <MappingRow local="Suite Luxe Sea View" remote="LXRSEA Luxury Sea Suite" channel="Expedia" />
     <MappingRow local="Twin Standard" remote="TWN Twin Room" channel="Airbnb" />
  </div>
);

const RMSRecommendations = () => (
   <div className="rms-card animate-fade-in">
     <div style={{ display: 'flex', gap: '16px' }}>
       <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}><Zap size={24} color="white" /></div>
       <div>
         <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>Recommandations de Prix</h3>
         <p style={{ fontSize: '12px', opacity: 0.8, margin: '4px 0 0 0' }}>Analyse basée sur le marché local et l'occupation anticipée.</p>
       </div>
     </div>
     <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
         <span>Optimisation demandée</span>
         <span style={{ fontWeight: '800' }}>24 Mars - 28 Mars</span>
       </div>
       <div style={{ fontSize: '15px', fontWeight: '400', lineHeight: '1.4' }}>
         Nous recommandons une hausse de <strong style={{ fontWeight: '900' }}>+15%</strong> sur le tarif BAR pour le week-end du 26 Mars. <br/>
         <span style={{ fontSize: '11px', opacity: 0.7 }}>Raison: Congrès Médical (Palais des Festivals) - Demande élevée.</span>
       </div>
     </div>
     <button style={{ padding: '12px', background: 'white', color: '#3F37C9', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
       <Check size={18} /> Appliquer les recommandations
     </button>
   </div>
 );

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT EXPORT
   ══════════════════════════════════════════════════════════════════════════ */

export const ChannelView = () => {
  const [activeSubTab, setActiveSubTab] = useState('inventory');
  const [rmsActive, setRmsActive] = useState(true);

  return (
    <div className="channel-saas-container animate-fade-in">
      {/* HEADER ACTION BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="ptitle" style={{ margin: 0 }}>Channel Manager <span className="sub">SaaS Engine</span></h1>
          <p className="psub" style={{ margin: '4px 0 0 0' }}>Connectivité OTA multi-canaux & Optimisation RMS Temps Réel</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          
          {/* RMS AUTO-PILOT TOGGLE (KILLER FEATURE) */}
          <div onClick={() => setRmsActive(!rmsActive)} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: rmsActive ? '#EEF2FF' : '#F1F5F9', padding: '6px 16px', borderRadius: '20px', border: `1px solid ${rmsActive ? '#C7D2FE' : '#E2E8F0'}`, cursor: 'pointer', transition: 'all 0.3s' }}>
             <Cpu size={16} color={rmsActive ? "#4361EE" : "#64748B"} />
             <span style={{ fontSize: '11px', fontWeight: '900', color: rmsActive ? '#4361EE' : '#64748B' }}>RMS AUTO-PILOT</span>
             <div style={{ width: '32px', height: '18px', background: rmsActive ? '#4361EE' : '#CBD5E1', borderRadius: '10px', position: 'relative', transition: 'all 0.3s' }}>
                <div style={{ width: '12px', height: '12px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: rmsActive ? '17px' : '3px', transition: 'all 0.3s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}></div>
             </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#F0FDF4', borderRadius: '12px', border: '1px solid #DCFCE7' }}>
            <div className="sync-pulse"></div>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#10B981' }}>SYNCHRONISATION : LIVE</span>
          </div>
          
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '12px', padding: '4px' }}>
             <button className="btn btn-secondary btn-sm" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }} title="Exporter CSV/Excel/PDF"><Download size={14} /> Export</button>
             <button className="btn btn-secondary btn-sm" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }} title="Imprimer le rapport"><Printer size={14} /> Print</button>
          </div>

          <button className="btn btn-primary btn-sm"><Save size={14} /> Sauvegarder Changes</button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="sub-nav scroll-hide" style={{ margin: '20px 0', padding: '8px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '14px', width: 'fit-content', display: 'flex', gap: '8px', maxWidth: '100%', overflowX: 'auto' }}>
        <button className={`module-tab ${activeSubTab === 'dashboard' ? 'active' : ''}`} style={{ padding: '10px 16px', borderRadius: '10px', color: activeSubTab === 'dashboard' ? '#4361EE' : '#64748B', background: activeSubTab === 'dashboard' ? 'white' : 'transparent', boxShadow: activeSubTab === 'dashboard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onClick={() => setActiveSubTab('dashboard')}><BarChart size={16} /> Dashboard</button>
        <button className={`module-tab ${activeSubTab === 'inventory' ? 'active' : ''}`} style={{ padding: '10px 16px', borderRadius: '10px', color: activeSubTab === 'inventory' ? '#4361EE' : '#64748B', background: activeSubTab === 'inventory' ? 'white' : 'transparent', boxShadow: activeSubTab === 'inventory' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onClick={() => setActiveSubTab('inventory')}><Layout size={16} /> Inventaire Grid</button>
        <button className={`module-tab ${activeSubTab === 'rateshopper' ? 'active' : ''}`} style={{ padding: '10px 16px', borderRadius: '10px', color: activeSubTab === 'rateshopper' ? '#4361EE' : '#64748B', background: activeSubTab === 'rateshopper' ? 'white' : 'transparent', boxShadow: activeSubTab === 'rateshopper' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onClick={() => setActiveSubTab('rateshopper')}><Activity size={16} /> Rate Shopper</button>
        <button className={`module-tab ${activeSubTab === 'reserves' ? 'active' : ''}`} style={{ padding: '10px 16px', borderRadius: '10px', color: activeSubTab === 'reserves' ? '#4361EE' : '#64748B', background: activeSubTab === 'reserves' ? 'white' : 'transparent', boxShadow: activeSubTab === 'reserves' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onClick={() => setActiveSubTab('reserves')}><Inbox size={16} /> Réservations</button>
        <button className={`module-tab ${activeSubTab === 'bookingengine' ? 'active' : ''}`} style={{ padding: '10px 16px', borderRadius: '10px', color: activeSubTab === 'bookingengine' ? '#4361EE' : '#64748B', background: activeSubTab === 'bookingengine' ? 'white' : 'transparent', boxShadow: activeSubTab === 'bookingengine' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onClick={() => setActiveSubTab('bookingengine')}><Globe size={16} /> Booking Engine</button>
        <button className={`module-tab ${activeSubTab === 'mapping' ? 'active' : ''}`} style={{ padding: '10px 16px', borderRadius: '10px', color: activeSubTab === 'mapping' ? '#4361EE' : '#64748B', background: activeSubTab === 'mapping' ? 'white' : 'transparent', boxShadow: activeSubTab === 'mapping' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onClick={() => setActiveSubTab('mapping')}><Layers size={16} /> Mapping OTA</button>
        <button className={`module-tab ${activeSubTab === 'rms' ? 'active' : ''}`} style={{ padding: '10px 16px', borderRadius: '10px', color: activeSubTab === 'rms' ? '#4361EE' : '#64748B', background: activeSubTab === 'rms' ? 'white' : 'transparent', boxShadow: activeSubTab === 'rms' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onClick={() => setActiveSubTab('rms')}><Cpu size={16} /> RMS Intelligence</button>
        <button className={`module-tab ${activeSubTab === 'config' ? 'active' : ''}`} style={{ padding: '10px 16px', borderRadius: '10px', color: activeSubTab === 'config' ? '#4361EE' : '#64748B', background: activeSubTab === 'config' ? 'white' : 'transparent', boxShadow: activeSubTab === 'config' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onClick={() => setActiveSubTab('config')}><Settings size={16} /> Configuration</button>
      </div>

      {/* DYNAMIC CONTENT RENDER */}
      {activeSubTab === 'inventory' && <InventoryGrid />}
      {activeSubTab === 'rateshopper' && <RateShopperView />}
      {activeSubTab === 'dashboard' && <SaaSDashboard />}
      {activeSubTab === 'mapping' && <MappingEngineUI />}
      {activeSubTab === 'rms' && <RMSRecommendations />}
      {activeSubTab === 'config' && <ConfigMenuUI />}
      
      {['reserves', 'bookingengine', 'logs'].includes(activeSubTab) && (
        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
           <h2 style={{ color: '#0F172A', fontWeight: '900', fontSize: '24px' }}>WIP: {activeSubTab.toUpperCase()}</h2>
           <p style={{ color: '#64748B' }}>Module en cours de construction dans ce prototype.</p>
        </div>
      )}
    </div>
  );
};
