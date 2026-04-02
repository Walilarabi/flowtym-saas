import { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp, TrendingDown, BarChart3, Target, DollarSign, Users,
  Calendar, Settings, Bell, ChevronRight, ChevronDown, Plus, Play,
  RefreshCw, Download, Upload, Zap, ArrowUpRight, ArrowDownRight,
  Check, X, AlertTriangle, Info, Building2, Database, Eye, Edit3,
  Filter, Clock, Tag, CreditCard, PieChart, Activity, Map, Layers,
  Cpu, ExternalLink, MoreHorizontal, LayoutGrid, Sliders, Hotel,
  Percent, BedDouble, Calculator, Gauge, Brain, Lightbulb, Sparkles,
  CalendarDays, Sun, Moon, Globe, FileSpreadsheet, ChevronLeft,
  Save, RotateCcw, Maximize2, Minimize2, Lock, Unlock, Star
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════════
   HOPTYM RMS - Revenue Management System
   Design System — Light Mode with Dark Mode Support
══════════════════════════════════════════════════════════════════════════ */

const CSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
    
    .hoptym *,.hoptym *::before,.hoptym *::after{box-sizing:border-box;margin:0;padding:0}
    .hoptym{
      /* Navigation */
      --nav-bg:#1e1b4b;
      --nav-active:#4f46e5;
      --nav-text:rgba(255,255,255,.65);
      --nav-hover:rgba(255,255,255,.07);
      
      /* App Colors */
      --bg:#f8fafc;
      --surface:#ffffff;
      --surface2:#f8fafc;
      --surface3:#f1f5f9;
      
      /* Text */
      --ink:#1f2937;
      --ink2:#374151;
      --ink3:#6b7280;
      --ink4:#9ca3af;
      --ink5:#d1d5db;
      
      /* Primary */
      --primary:#4f46e5;
      --primary-s:#eef2ff;
      --primary-h:#4338ca;
      
      /* Semantic */
      --green:#059669;
      --green-s:#ecfdf5;
      --green-ink:#065f46;
      --amber:#d97706;
      --amber-s:#fffbeb;
      --amber-ink:#78350f;
      --red:#dc2626;
      --red-s:#fef2f2;
      --red-ink:#7f1d1d;
      --blue:#2563eb;
      --blue-s:#eff6ff;
      --teal:#0891b2;
      --teal-s:#ecfeff;
      
      /* Borders & shadows */
      --border:#e5e7eb;
      --border2:#d1d5db;
      --shadow:0 1px 3px rgba(0,0,0,.06),0 1px 8px rgba(0,0,0,.04);
      --shadow-md:0 4px 12px rgba(0,0,0,.08),0 2px 4px rgba(0,0,0,.04);
      
      /* Shape */
      --r:10px;
      --r-sm:7px;
      --r-lg:14px;
      
      /* Typography */
      --font:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      --mono:'DM Mono','SF Mono',monospace;
    }
    
    .hoptym{font-family:var(--font);background:var(--bg);color:var(--ink);min-height:100%;display:flex;flex-direction:column;font-size:13px;line-height:1.55}
    .hoptym ::-webkit-scrollbar{width:4px;height:4px}
    .hoptym ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
    
    /* ═══════ INTERNAL NAVBAR ═══════ */
    .hoptym .rms-navbar{
      background:var(--nav-bg);
      display:flex;align-items:center;
      padding:0 22px;height:50px;gap:3px;
      flex-shrink:0;
      box-shadow:0 2px 10px rgba(0,0,0,.2);
    }
    .hoptym .nav-logo{display:flex;align-items:center;gap:9px;margin-right:18px;flex-shrink:0}
    .hoptym .nav-logo-mark{
      width:28px;height:28px;background:var(--nav-active);border-radius:7px;
      display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:800;color:#fff;
      box-shadow:0 2px 8px rgba(79,70,229,.45);
    }
    .hoptym .nav-logo-name{font-size:14px;font-weight:700;color:#fff;letter-spacing:-.3px}
    .hoptym .nav-logo-sub{font-size:9px;color:rgba(255,255,255,.4);letter-spacing:.3px}
    .hoptym .nav-sep{width:1px;height:24px;background:rgba(255,255,255,.1);margin:0 10px;flex-shrink:0}
    .hoptym .nav-tabs{display:flex;align-items:center;gap:2px;flex:1}
    .hoptym .nav-tab{
      display:flex;align-items:center;gap:6px;
      padding:5px 13px;border-radius:18px;
      font-size:12.5px;font-weight:500;color:var(--nav-text);
      cursor:pointer;transition:all .14s;white-space:nowrap;user-select:none;
      border:none;background:none;
    }
    .hoptym .nav-tab svg{opacity:.7}
    .hoptym .nav-tab:hover{background:var(--nav-hover);color:rgba(255,255,255,.85)}
    .hoptym .nav-tab.active{
      background:var(--nav-active);color:#fff;
      box-shadow:0 2px 8px rgba(79,70,229,.4);
    }
    .hoptym .nav-tab.active svg{opacity:1}
    .hoptym .nav-right{display:flex;align-items:center;gap:8px;margin-left:auto}
    .hoptym .engine-pill{
      display:flex;align-items:center;gap:5px;
      background:rgba(5,150,105,.12);border:1px solid rgba(5,150,105,.2);
      border-radius:16px;padding:3px 9px;
      font-size:11px;font-weight:500;color:#34d399;
    }
    .hoptym .pulse{width:5px;height:5px;border-radius:50%;background:#34d399;animation:pulse 2s infinite;flex-shrink:0}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
    
    /* ═══════ SUBNAV ═══════ */
    .hoptym .subnav{
      background:#16133a;
      border-bottom:1px solid rgba(255,255,255,.05);
      display:flex;align-items:center;
      padding:0 22px;height:38px;gap:1px;
      flex-shrink:0;
    }
    .hoptym .subnav-item{
      display:flex;align-items:center;gap:5px;
      padding:4px 11px;border-radius:6px;
      font-size:11.5px;font-weight:400;color:rgba(255,255,255,.5);
      cursor:pointer;transition:all .12s;user-select:none;white-space:nowrap;
      border:none;background:none;
    }
    .hoptym .subnav-item:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.75)}
    .hoptym .subnav-item.active{background:rgba(79,70,229,.2);color:#a5b4fc;font-weight:500}
    .hoptym .subnav-sep{width:1px;height:16px;background:rgba(255,255,255,.07);margin:0 4px;flex-shrink:0}
    
    /* ═══════ INFO BAR ═══════ */
    .hoptym .infobar{
      background:var(--surface);border-bottom:1px solid var(--border);
      padding:10px 24px;display:flex;align-items:center;justify-content:space-between;
    }
    .hoptym .infobar-title{font-size:15px;font-weight:700;color:var(--ink);letter-spacing:-.3px}
    .hoptym .infobar-sub{font-size:11px;color:var(--ink4);margin-top:1px}
    .hoptym .infobar-right{display:flex;align-items:center;gap:8px}
    
    /* ═══════ BUTTONS ═══════ */
    .hoptym .btn{
      display:inline-flex;align-items:center;gap:5px;
      padding:6px 13px;border-radius:var(--r-sm);
      font-size:12.5px;font-weight:500;
      border:1px solid var(--border2);background:var(--surface);color:var(--ink2);
      transition:all .12s;box-shadow:var(--shadow);cursor:pointer;font-family:var(--font);
    }
    .hoptym .btn:hover{background:var(--surface3);border-color:var(--border2)}
    .hoptym .btn-primary{background:var(--primary);color:#fff;border-color:var(--primary);box-shadow:0 1px 4px rgba(79,70,229,.25)}
    .hoptym .btn-primary:hover{background:var(--primary-h);box-shadow:0 3px 10px rgba(79,70,229,.3)}
    .hoptym .btn-green{background:var(--green);color:#fff;border-color:var(--green)}
    .hoptym .btn-sm{padding:5px 10px;font-size:11.5px}
    
    /* ═══════ CONTENT ═══════ */
    .hoptym .main{flex:1;overflow-y:auto}
    .hoptym .content{padding:20px 24px 48px;display:flex;flex-direction:column;gap:16px}
    
    /* ═══════ CARDS ═══════ */
    .hoptym .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow)}
    .hoptym .card-h{display:flex;align-items:flex-start;justify-content:space-between;padding:15px 18px 0}
    .hoptym .card-title{font-size:13px;font-weight:600;color:var(--ink)}
    .hoptym .card-sub{font-size:11px;color:var(--ink4);margin-top:2px}
    .hoptym .card-b{padding:14px 18px 11px}
    
    /* ═══════ KPI ═══════ */
    .hoptym .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    .hoptym .kpi{
      background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);
      padding:14px 16px;box-shadow:var(--shadow);position:relative;overflow:hidden;
    }
    .hoptym .kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--kpi-c,var(--primary))}
    .hoptym .kpi-label{font-size:10.5px;color:var(--ink4);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;font-weight:500}
    .hoptym .kpi-value{font-size:22px;font-weight:700;color:var(--ink);letter-spacing:-.5px;line-height:1.1}
    .hoptym .kpi-sub{font-size:11px;color:var(--ink4);margin-top:5px;display:flex;align-items:center;gap:4px}
    
    /* ═══════ TAGS ═══════ */
    .hoptym .tag{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:600}
    .hoptym .tag-green{background:var(--green-s);color:var(--green-ink)}
    .hoptym .tag-red{background:var(--red-s);color:var(--red-ink)}
    .hoptym .tag-amber{background:var(--amber-s);color:var(--amber-ink)}
    .hoptym .tag-blue{background:var(--blue-s);color:var(--blue)}
    .hoptym .tag-primary{background:var(--primary-s);color:var(--primary)}
    
    /* ═══════ ALERTS ═══════ */
    .hoptym .alert{border-radius:var(--r);padding:11px 15px;display:flex;align-items:flex-start;gap:10px}
    .hoptym .alert.red{background:var(--red-s);border:1px solid rgba(220,38,38,.15)}
    .hoptym .alert.amber{background:var(--amber-s);border:1px solid rgba(217,119,6,.15)}
    .hoptym .alert.blue{background:var(--blue-s);border:1px solid rgba(37,99,235,.15)}
    .hoptym .alert.green{background:var(--green-s);border:1px solid rgba(5,150,105,.15)}
    .hoptym .alert.primary{background:var(--primary-s);border:1px solid rgba(79,70,229,.15)}
    .hoptym .alert-icon{font-size:15px;flex-shrink:0;margin-top:1px}
    .hoptym .alert-body{font-size:12.5px;line-height:1.6;color:var(--ink2)}
    .hoptym .alert-body strong{font-weight:600;color:var(--ink)}
    
    /* ═══════ TABS ═══════ */
    .hoptym .tabs{display:flex;gap:2px;background:var(--surface3);padding:3px;border-radius:8px;width:fit-content}
    .hoptym .tab{padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;color:var(--ink4);cursor:pointer;transition:all .12s;user-select:none;border:none;background:none}
    .hoptym .tab:hover{color:var(--ink)}
    .hoptym .tab.active{background:var(--surface);color:var(--ink);box-shadow:var(--shadow)}
    
    /* ═══════ GRIDS ═══════ */
    .hoptym .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .hoptym .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
    .hoptym .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    
    /* ═══════ TABLE ═══════ */
    .hoptym .rt{width:100%;border-collapse:collapse;font-size:12.5px}
    .hoptym .rt th{padding:8px 11px;text-align:left;font-size:10.5px;font-weight:600;color:var(--ink4);text-transform:uppercase;letter-spacing:.4px;background:var(--surface2);border-bottom:1px solid var(--border)}
    .hoptym .rt td{padding:9px 11px;border-bottom:1px solid var(--border);font-size:12.5px;color:var(--ink2);vertical-align:middle}
    .hoptym .rt tr:last-child td{border-bottom:none}
    .hoptym .rt tr:hover td{background:var(--surface2)}
    .hoptym .bar{display:inline-block;height:5px;border-radius:3px;vertical-align:middle;margin-right:5px}
    
    /* ═══════ FORM FIELDS ═══════ */
    .hoptym .field{margin-bottom:14px}
    .hoptym .field label{display:block;font-size:11.5px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px}
    .hoptym .field-input{
      width:100%;padding:9px 12px;
      background:var(--surface);border:1.5px solid var(--border2);
      border-radius:var(--r-sm);font-size:13px;color:var(--ink);
      transition:border-color .12s,box-shadow .12s;font-family:var(--font);
    }
    .hoptym .field-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(79,70,229,.1);outline:none}
    .hoptym .field-input::placeholder{color:var(--ink5)}
    
    /* ═══════ TOGGLE ═══════ */
    .hoptym .toggle{position:relative;width:36px;height:20px;display:inline-block}
    .hoptym .toggle input{opacity:0;width:0;height:0}
    .hoptym .toggle-track{position:absolute;inset:0;background:var(--ink5);border-radius:10px;cursor:pointer;transition:.18s}
    .hoptym .toggle-track::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18);transition:.18s cubic-bezier(.34,1.56,.64,1)}
    .hoptym .toggle input:checked+.toggle-track{background:var(--primary)}
    .hoptym .toggle input:checked+.toggle-track::after{transform:translateX(16px)}
    
    /* ═══════ SLIDER ═══════ */
    .hoptym .slider{width:100%;-webkit-appearance:none;height:4px;border-radius:2px;background:var(--border);outline:none;cursor:pointer}
    .hoptym .slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--primary);border:2px solid #fff;box-shadow:0 1px 4px rgba(79,70,229,.3)}
    
    /* ═══════ CALENDAR ═══════ */
    .hoptym .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
    .hoptym .cal-cell{border:1px solid var(--border);border-radius:8px;padding:6px 7px;min-height:80px;background:var(--surface);cursor:pointer;transition:border-color .12s;position:relative}
    .hoptym .cal-cell:hover{border-color:var(--primary)}
    .hoptym .cal-cell.today{border-color:var(--primary);border-width:2px}
    .hoptym .cal-dow{text-align:center;font-size:10px;font-weight:600;color:var(--ink4);padding:2px 0;text-transform:uppercase;letter-spacing:.4px}
    .hoptym .cal-day{font-size:11px;font-weight:600;color:var(--ink2);margin-bottom:4px}
    .hoptym .cal-price{font-size:14px;font-weight:700;color:var(--ink);font-family:var(--mono)}
    .hoptym .cal-occ{font-size:10px;color:var(--ink4);margin-top:2px}
    
    /* ═══════ CONNECTIVITY CARDS ═══════ */
    .hoptym .conn-card{
      background:var(--surface);border:1.5px solid var(--border);
      border-radius:var(--r-lg);box-shadow:var(--shadow);overflow:hidden;
      transition:border-color .14s,box-shadow .14s;
    }
    .hoptym .conn-card:hover{border-color:var(--border2);box-shadow:var(--shadow-md)}
    .hoptym .conn-header{
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px 14px;border-bottom:1px solid var(--border);
    }
    .hoptym .conn-icon{
      width:40px;height:40px;border-radius:11px;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    .hoptym .conn-name{font-size:14px;font-weight:700;color:var(--ink);margin-left:13px}
    .hoptym .conn-desc{font-size:11.5px;color:var(--ink4);margin-top:2px}
    .hoptym .conn-body{padding:16px 20px}
    .hoptym .conn-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:14px}
    .hoptym .conn-stat{background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:10px 12px}
    .hoptym .conn-stat-label{font-size:10px;color:var(--ink4);text-transform:uppercase;letter-spacing:.4px;font-weight:500}
    .hoptym .conn-stat-val{font-size:14px;font-weight:700;color:var(--ink);margin-top:3px}
    .hoptym .conn-stat-sub{font-size:10.5px;color:var(--ink4);margin-top:1px}
    .hoptym .status-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:14px;font-size:11px;font-weight:600}
    .hoptym .status-ok{background:var(--green-s);color:var(--green-ink)}
    .hoptym .status-off{background:var(--red-s);color:var(--red-ink)}
    .hoptym .status-warn{background:var(--amber-s);color:var(--amber-ink)}
    .hoptym .status-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}
    .hoptym .conn-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    
    /* ═══════ STRATEGY CARDS ═══════ */
    .hoptym .strat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .hoptym .strat-card{
      padding:18px 14px;border:2px solid var(--border);border-radius:var(--r-lg);
      background:var(--surface);cursor:pointer;transition:all .14s;text-align:center;
    }
    .hoptym .strat-card:hover{border-color:var(--primary);box-shadow:var(--shadow-md)}
    .hoptym .strat-card.on{border-color:var(--primary);background:var(--primary-s)}
    .hoptym .strat-emoji{font-size:26px;margin-bottom:8px}
    .hoptym .strat-name{font-size:13px;font-weight:700;color:var(--ink)}
    .hoptym .strat-tag{font-size:11px;color:var(--ink4);margin-top:3px}
    .hoptym .strat-card.on .strat-name{color:var(--primary)}
    
    /* ═══════ AUTOPILOT ═══════ */
    .hoptym .ap-card{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:15px;box-shadow:var(--shadow)}
    .hoptym .ap-card.hi{border-color:#fcd34d;background:#fffbeb}
    .hoptym .ap-avail{font-size:22px;font-weight:700;letter-spacing:-.5px;margin:3px 0 2px}
    .hoptym .ap-bar{height:3px;border-radius:2px;background:linear-gradient(90deg,var(--amber),rgba(217,119,6,.2));margin-top:10px;animation:shimmer 1.8s infinite}
    @keyframes shimmer{0%,100%{opacity:1}50%{opacity:.3}}
    
    /* ═══════ WEIGHT VISUALIZATION ═══════ */
    .hoptym .weight-row{display:grid;grid-template-columns:120px 1fr 44px;align-items:center;gap:12px;margin-bottom:13px}
    .hoptym .weight-label{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink2)}
    .hoptym .wdot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    .hoptym .weight-val{font-size:12px;font-weight:700;color:var(--primary);font-family:var(--mono);text-align:right}
    
    /* ═══════ ENGINE TRACE ═══════ */
    .hoptym .engine-trace{font-family:var(--mono);font-size:11px;background:#1e1b4b;color:#e0e0e0;border-radius:var(--r);padding:14px 16px;overflow-x:auto;line-height:1.9}
    .hoptym .trace-layer{color:#818cf8;font-weight:600}
    .hoptym .trace-val{color:#6ee7b7}
    .hoptym .trace-warn{color:#fcd34d}
    .hoptym .trace-key{color:#93c5fd}
    
    /* ═══════ RECOMMENDATIONS ═══════ */
    .hoptym .reco-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)}
    .hoptym .reco-row:last-child{border-bottom:none}
    .hoptym .reco-icon{width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
    
    /* ═══════ ICON WRAPPERS ═══════ */
    .hoptym .icon-wrap{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .hoptym .icon-wrap-sm{width:36px;height:36px;border-radius:10px}
    .hoptym .icon-primary{background:#eef2ff}
    .hoptym .icon-green{background:#ecfdf5}
    .hoptym .icon-amber{background:#fffbeb}
    .hoptym .icon-red{background:#fef2f2}
    .hoptym .icon-blue{background:#eff6ff}
    
    /* ═══════ RESPONSIVE ═══════ */
    @media (max-width:1200px){
      .hoptym .kpi-grid{grid-template-columns:repeat(2,1fr)}
      .hoptym .strat-grid{grid-template-columns:repeat(2,1fr)}
      .hoptym .g2{grid-template-columns:1fr}
    }
    @media (max-width:768px){
      .hoptym .kpi-grid{grid-template-columns:1fr}
      .hoptym .nav-tabs{display:none}
      .hoptym .subnav{overflow-x:auto}
    }
  `}</style>
);

/* ══════════════════════════════════════════════════════════════════════════
   MOCK DATA (Fallback when API unavailable)
══════════════════════════════════════════════════════════════════════════ */

const MOCK_KPIS = {
  revpar: { value: 142.50, change: 8.3, target: 155 },
  adr: { value: 189.00, change: 5.2, target: 195 },
  occupancy: { value: 75.4, change: 2.1, target: 82 },
  revenue: { value: 28450, change: 12.5, target: 32000 }
};

const MOCK_CALENDAR = [
  { date: '2024-12-16', day: 'Lun', price: 189, occ: 85, demand: 'high' },
  { date: '2024-12-17', day: 'Mar', price: 175, occ: 72, demand: 'medium' },
  { date: '2024-12-18', day: 'Mer', price: 169, occ: 68, demand: 'medium' },
  { date: '2024-12-19', day: 'Jeu', price: 185, occ: 78, demand: 'high' },
  { date: '2024-12-20', day: 'Ven', price: 215, occ: 92, demand: 'peak' },
  { date: '2024-12-21', day: 'Sam', price: 235, occ: 95, demand: 'peak' },
  { date: '2024-12-22', day: 'Dim', price: 199, occ: 82, demand: 'high' },
];

const MOCK_COMPETITORS = [
  { name: 'Hôtel Mercure', rate: 185, occ: 78, source: 'Booking.com' },
  { name: 'Novotel Centre', rate: 172, occ: 82, source: 'Expedia' },
  { name: 'Ibis Styles', rate: 129, occ: 88, source: 'Direct' },
  { name: 'Holiday Inn', rate: 165, occ: 75, source: 'Booking.com' },
];

const MOCK_RECOMMENDATIONS = [
  { id: 1, type: 'price', icon: TrendingUp, color: 'green', title: 'Augmenter tarif weekend', description: 'Demande forte détectée pour le 21/12', impact: '+€2,450', priority: 'high' },
  { id: 2, type: 'alert', icon: AlertTriangle, color: 'amber', title: 'Occupation faible mercredi', description: 'Considérer une promotion flash', impact: '+12 résa.', priority: 'medium' },
  { id: 3, type: 'opportunity', icon: Sparkles, color: 'blue', title: 'Événement local détecté', description: 'Congrès médical du 18-20/12', impact: '+€5,200', priority: 'high' },
];

const STRATEGIES = [
  { id: 'conservative', emoji: '🛡️', name: 'Conservateur', tag: 'Stabilité maximale' },
  { id: 'balanced', emoji: '⚖️', name: 'Équilibré', tag: 'Optimum rendement' },
  { id: 'aggressive', emoji: '🚀', name: 'Agressif', tag: 'Croissance rapide' },
  { id: 'dynamic', emoji: '🎯', name: 'Dynamique', tag: 'Adaptatif AI' },
];

const WEIGHT_FACTORS = [
  { id: 'demand', label: 'Demande', color: '#4f46e5', value: 25 },
  { id: 'competition', label: 'Concurrence', color: '#0891b2', value: 20 },
  { id: 'events', label: 'Événements', color: '#059669', value: 15 },
  { id: 'seasonality', label: 'Saisonnalité', color: '#d97706', value: 20 },
  { id: 'historical', label: 'Historique', color: '#dc2626', value: 20 },
];

/* ══════════════════════════════════════════════════════════════════════════
   API SERVICE
══════════════════════════════════════════════════════════════════════════ */

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';
const HOTEL_ID = 'default-hotel'; // Would come from context/auth

const api = {
  async getConfig() {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/config`);
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async getKPIs() {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/kpis`);
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async getStrategy() {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/strategy`);
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async updateStrategy(data) {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/strategy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async getWeights() {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/weights`);
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async updateWeights(factors) {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/weights`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factors })
      });
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async getRecommendations() {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/recommendations`);
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async applyRecommendation(id) {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/recommendations/${id}/apply`, {
        method: 'POST'
      });
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async dismissRecommendation(id) {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/recommendations/${id}/dismiss`, {
        method: 'POST'
      });
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async getCalendar() {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/calendar`);
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async runEngine() {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/engine/run`, {
        method: 'POST'
      });
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async getConnectorsStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/connectors/status`);
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async syncConnector(connector) {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/connectors/${connector}/sync`, {
        method: 'POST'
      });
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async getMarketData() {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/market-data`);
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  },
  
  async getCompetitors() {
    try {
      const res = await fetch(`${API_BASE}/api/rms/hotels/${HOTEL_ID}/competitors`);
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('API error:', e); return null; }
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */

export const RMS = () => {
  // Navigation state
  const [activeMenu, setActiveMenu] = useState('revenue');
  const [activeSubMenu, setActiveSubMenu] = useState('dashboard');
  
  // Data state (from API)
  const [kpis, setKpis] = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [connectors, setConnectors] = useState(null);
  const [strategies, setStrategies] = useState(STRATEGIES);
  
  // Strategy state
  const [selectedStrategy, setSelectedStrategy] = useState('balanced');
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [autopilotThreshold, setAutopilotThreshold] = useState(0.75);
  const [weights, setWeights] = useState(WEIGHT_FACTORS);
  
  // Engine state
  const [engineStatus, setEngineStatus] = useState('live');
  const [lastSync, setLastSync] = useState(new Date());
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load all data in parallel
      const [configData, kpisData, strategyData, weightsData, recsData, calData, connData] = await Promise.all([
        api.getConfig(),
        api.getKPIs(),
        api.getStrategy(),
        api.getWeights(),
        api.getRecommendations(),
        api.getCalendar(),
        api.getConnectorsStatus()
      ]);
      
      if (kpisData?.current) {
        setKpis({
          revpar: { value: kpisData.current.revpar || 0, change: 8.3, target: kpisData.targets?.revpar || 155 },
          adr: { value: kpisData.current.adr || 0, change: 5.2, target: kpisData.targets?.adr || 195 },
          occupancy: { value: kpisData.current.occupancy_pct || 0, change: 2.1, target: kpisData.targets?.occupancy || 82 },
          revenue: { value: kpisData.current.total_revenue || 0, change: 12.5, target: kpisData.targets?.revenue || 32000 }
        });
      }
      
      if (strategyData) {
        setSelectedStrategy(strategyData.active_strategy || 'balanced');
        setAutopilotEnabled(strategyData.autopilot_enabled || false);
        setAutopilotThreshold(strategyData.autopilot_confidence_threshold || 0.75);
        if (strategyData.strategies?.length) {
          setStrategies(strategyData.strategies.map(s => ({
            id: s.strategy_type,
            emoji: s.emoji,
            name: s.name,
            tag: s.tag
          })));
        }
      }
      
      if (weightsData?.factors) {
        setWeights(weightsData.factors.map(f => ({
          id: f.factor_id,
          label: f.label,
          color: f.color,
          value: f.value
        })));
      }
      
      if (recsData?.recommendations) {
        setRecommendations(recsData.recommendations.map(r => ({
          id: r.id,
          type: r.type,
          icon: r.type === 'price_increase' ? TrendingUp : r.type === 'promotion' ? Sparkles : AlertTriangle,
          color: r.priority === 'high' || r.priority === 'critical' ? 'green' : r.type === 'promotion' ? 'amber' : 'blue',
          title: r.title,
          description: r.description,
          impact: `€${r.estimated_revenue_impact?.toFixed(0) || '0'}`,
          priority: r.priority,
          confidence: r.confidence_score,
          status: r.status
        })));
      }
      
      if (calData?.days) {
        const days = Object.entries(calData.days).slice(0, 7).map(([date, info]) => {
          const d = new Date(date);
          return {
            date,
            day: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
            price: info.final_price || info.base_price,
            occ: info.occupancy_forecast || 70,
            demand: info.demand_level || 'medium'
          };
        });
        setCalendarData(days);
      }
      
      if (connData?.connectors) {
        setConnectors(connData.connectors);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sub-menu items based on active menu
  const getSubMenuItems = () => {
    switch (activeMenu) {
      case 'revenue':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
          { id: 'calendar', label: 'Calendrier', icon: Calendar },
          { id: 'rates', label: 'Grille tarifaire', icon: DollarSign },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ];
      case 'intelligence':
        return [
          { id: 'recommendations', label: 'Recommandations', icon: Lightbulb },
          { id: 'competitors', label: 'Concurrence', icon: Target },
          { id: 'forecast', label: 'Prévisions', icon: TrendingUp },
          { id: 'events', label: 'Événements', icon: CalendarDays },
        ];
      case 'config':
        return [
          { id: 'strategy', label: 'Stratégie', icon: Sliders },
          { id: 'weights', label: 'Pondération', icon: Gauge },
          { id: 'autopilot', label: 'Autopilot', icon: Cpu },
          { id: 'connections', label: 'Connecteurs', icon: Database },
        ];
      default:
        return [];
    }
  };

  const runEngine = async () => {
    setIsCalculating(true);
    try {
      const result = await api.runEngine();
      if (result?.status === 'success') {
        // Reload recommendations after engine run
        const recsData = await api.getRecommendations();
        if (recsData?.recommendations) {
          setRecommendations(recsData.recommendations.map(r => ({
            id: r.id,
            type: r.type,
            icon: r.type === 'price_increase' ? TrendingUp : r.type === 'promotion' ? Sparkles : AlertTriangle,
            color: r.priority === 'high' || r.priority === 'critical' ? 'green' : r.type === 'promotion' ? 'amber' : 'blue',
            title: r.title,
            description: r.description,
            impact: `€${r.estimated_revenue_impact?.toFixed(0) || '0'}`,
            priority: r.priority,
            confidence: r.confidence_score,
            status: r.status
          })));
        }
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Engine run error:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleStrategyChange = async (strategyId) => {
    setSelectedStrategy(strategyId);
    await api.updateStrategy({ active_strategy: strategyId });
  };

  const handleAutopilotToggle = async (enabled) => {
    setAutopilotEnabled(enabled);
    await api.updateStrategy({ autopilot_enabled: enabled });
  };

  const handleWeightChange = async (factorId, newValue) => {
    const newWeights = weights.map(w => 
      w.id === factorId ? { ...w, value: parseInt(newValue) } : w
    );
    setWeights(newWeights);
  };

  const saveWeights = async () => {
    const factors = weights.map(w => ({
      factor_id: w.id,
      label: w.label,
      value: w.value,
      color: w.color
    }));
    await api.updateWeights(factors);
  };

  const handleApplyRecommendation = async (recId) => {
    await api.applyRecommendation(recId);
    // Reload recommendations
    const recsData = await api.getRecommendations();
    if (recsData?.recommendations) {
      setRecommendations(recsData.recommendations.map(r => ({
        id: r.id,
        type: r.type,
        icon: r.type === 'price_increase' ? TrendingUp : r.type === 'promotion' ? Sparkles : AlertTriangle,
        color: r.priority === 'high' || r.priority === 'critical' ? 'green' : r.type === 'promotion' ? 'amber' : 'blue',
        title: r.title,
        description: r.description,
        impact: `€${r.estimated_revenue_impact?.toFixed(0) || '0'}`,
        priority: r.priority,
        confidence: r.confidence_score,
        status: r.status
      })));
    }
  };

  const handleDismissRecommendation = async (recId) => {
    await api.dismissRecommendation(recId);
    setRecommendations(prev => prev.filter(r => r.id !== recId));
  };

  const handleSyncConnector = async (connector) => {
    await api.syncConnector(connector);
    // Reload connectors status
    const connData = await api.getConnectorsStatus();
    if (connData?.connectors) {
      setConnectors(connData.connectors);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="hoptym" data-testid="rms-module">
      <CSS />
      
      {/* Internal Navigation */}
      <nav className="rms-navbar" data-testid="rms-navbar">
        <div className="nav-logo">
          <div className="nav-logo-mark">H</div>
          <div>
            <div className="nav-logo-name">Hoptym</div>
            <div className="nav-logo-sub">YIELD · RMS</div>
          </div>
        </div>
        
        <div className="nav-sep" />
        
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeMenu === 'revenue' ? 'active' : ''}`}
            onClick={() => { setActiveMenu('revenue'); setActiveSubMenu('dashboard'); }}
            data-testid="nav-tab-revenue"
          >
            <DollarSign size={15} />
            Revenue
          </button>
          <button
            className={`nav-tab ${activeMenu === 'intelligence' ? 'active' : ''}`}
            onClick={() => { setActiveMenu('intelligence'); setActiveSubMenu('recommendations'); }}
            data-testid="nav-tab-intelligence"
          >
            <Brain size={15} />
            Intelligence
            <span style={{ background: 'var(--red)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '7px', marginLeft: '2px' }}>
              {MOCK_RECOMMENDATIONS.length}
            </span>
          </button>
          <button
            className={`nav-tab ${activeMenu === 'config' ? 'active' : ''}`}
            onClick={() => { setActiveMenu('config'); setActiveSubMenu('strategy'); }}
            data-testid="nav-tab-config"
          >
            <Settings size={15} />
            Configuration
          </button>
        </div>
        
        <div className="nav-right">
          <div className="engine-pill">
            <span className="pulse" />
            RMS Live
          </div>
          <span className="tag tag-blue" style={{ background: 'rgba(59,130,246,.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.2)', borderRadius: '14px', padding: '3px 9px', fontSize: '11px' }}>
            {formatTime(lastSync)}
          </span>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={runEngine}
            disabled={isCalculating}
            data-testid="btn-recalculate"
          >
            <RefreshCw size={14} className={isCalculating ? 'animate-spin' : ''} />
            {isCalculating ? 'Calcul...' : 'Recalculer'}
          </button>
        </div>
      </nav>
      
      {/* Sub Navigation */}
      <div className="subnav" data-testid="rms-subnav">
        {getSubMenuItems().map((item, idx) => (
          <button
            key={item.id}
            className={`subnav-item ${activeSubMenu === item.id ? 'active' : ''}`}
            onClick={() => setActiveSubMenu(item.id)}
            data-testid={`subnav-${item.id}`}
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </div>
      
      {/* Info Bar */}
      <div className="infobar">
        <div>
          <div className="infobar-title" data-testid="page-title">
            {activeSubMenu === 'dashboard' && 'Dashboard Revenue'}
            {activeSubMenu === 'calendar' && 'Calendrier Tarifaire'}
            {activeSubMenu === 'rates' && 'Grille Tarifaire'}
            {activeSubMenu === 'analytics' && 'Analytics & Rapports'}
            {activeSubMenu === 'recommendations' && 'Recommandations IA'}
            {activeSubMenu === 'competitors' && 'Analyse Concurrentielle'}
            {activeSubMenu === 'forecast' && 'Prévisions de Demande'}
            {activeSubMenu === 'events' && 'Calendrier Événements'}
            {activeSubMenu === 'strategy' && 'Stratégie Tarifaire'}
            {activeSubMenu === 'weights' && 'Pondération des Facteurs'}
            {activeSubMenu === 'autopilot' && 'Mode Autopilot'}
            {activeSubMenu === 'connections' && 'Connecteurs & Intégrations'}
          </div>
          <div className="infobar-sub">Moteur RMS 6 couches — Optimisation dynamique en temps réel</div>
        </div>
        <div className="infobar-right">
          <button className="btn btn-sm">
            <Download size={14} />
            Exporter
          </button>
          <button className="btn btn-sm">
            <Filter size={14} />
            Filtres
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="main">
        <div className="content">
          
          {/* DASHBOARD PAGE */}
          {activeSubMenu === 'dashboard' && (
            <>
              {/* KPIs */}
              <div className="kpi-grid" data-testid="kpi-grid">
                <div className="kpi" style={{ '--kpi-c': 'var(--primary)' }}>
                  <div className="kpi-label">RevPAR</div>
                  <div className="kpi-value">€{(kpis?.revpar?.value || MOCK_KPIS.revpar.value).toFixed(2)}</div>
                  <div className="kpi-sub">
                    <span className="tag tag-green">
                      <ArrowUpRight size={12} />
                      +{kpis?.revpar?.change || MOCK_KPIS.revpar.change}%
                    </span>
                    <span style={{ marginLeft: 4 }}>vs N-1</span>
                  </div>
                </div>
                <div className="kpi" style={{ '--kpi-c': 'var(--blue)' }}>
                  <div className="kpi-label">ADR</div>
                  <div className="kpi-value">€{(kpis?.adr?.value || MOCK_KPIS.adr.value).toFixed(2)}</div>
                  <div className="kpi-sub">
                    <span className="tag tag-green">
                      <ArrowUpRight size={12} />
                      +{kpis?.adr?.change || MOCK_KPIS.adr.change}%
                    </span>
                    <span style={{ marginLeft: 4 }}>vs N-1</span>
                  </div>
                </div>
                <div className="kpi" style={{ '--kpi-c': 'var(--teal)' }}>
                  <div className="kpi-label">Occupation</div>
                  <div className="kpi-value">{kpis?.occupancy?.value || MOCK_KPIS.occupancy.value}%</div>
                  <div className="kpi-sub">
                    <span className="tag tag-green">
                      <ArrowUpRight size={12} />
                      +{kpis?.occupancy?.change || MOCK_KPIS.occupancy.change}%
                    </span>
                    <span style={{ marginLeft: 4 }}>vs N-1</span>
                  </div>
                </div>
                <div className="kpi" style={{ '--kpi-c': 'var(--green)' }}>
                  <div className="kpi-label">Revenu Total</div>
                  <div className="kpi-value">€{(kpis?.revenue?.value || MOCK_KPIS.revenue.value).toLocaleString()}</div>
                  <div className="kpi-sub">
                    <span className="tag tag-green">
                      <ArrowUpRight size={12} />
                      +{kpis?.revenue?.change || MOCK_KPIS.revenue.change}%
                    </span>
                    <span style={{ marginLeft: 4 }}>vs N-1</span>
                  </div>
                </div>
              </div>
              
              {/* Alerts */}
              <div className="alert primary" data-testid="engine-alert">
                <Sparkles size={18} style={{ color: 'var(--primary)' }} className="alert-icon" />
                <div className="alert-body">
                  <strong>Moteur RMS actif</strong> — {recommendations.length || MOCK_RECOMMENDATIONS.length} recommandations générées. 
                  La stratégie <strong>{strategies.find(s => s.id === selectedStrategy)?.name || 'Équilibré'}</strong> est appliquée.
                  {autopilotEnabled && ' Mode Autopilot activé.'}
                </div>
              </div>
              
              <div className="g2">
                {/* Calendar Preview */}
                <div className="card">
                  <div className="card-h">
                    <div>
                      <div className="card-title">Aperçu Semaine</div>
                      <div className="card-sub">Tarifs et occupation prévus</div>
                    </div>
                    <button className="btn btn-sm" onClick={() => setActiveSubMenu('calendar')}>
                      Voir tout <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="card-b">
                    <div className="cal-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                      {(calendarData || MOCK_CALENDAR).map((day, idx) => (
                        <div 
                          key={day.date} 
                          className={`cal-cell ${idx === 0 ? 'today' : ''}`}
                          style={{ 
                            background: day.demand === 'peak' ? 'var(--green-s)' : 
                                       day.demand === 'high' ? 'var(--blue-s)' : 
                                       'var(--surface)'
                          }}
                        >
                          <div className="cal-day">{day.day}</div>
                          <div className="cal-price">€{day.price}</div>
                          <div className="cal-occ">{day.occ}% occ.</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Quick Recommendations */}
                <div className="card">
                  <div className="card-h">
                    <div>
                      <div className="card-title">Recommandations</div>
                      <div className="card-sub">Actions suggérées par l'IA</div>
                    </div>
                    <button className="btn btn-sm" onClick={() => { setActiveMenu('intelligence'); setActiveSubMenu('recommendations'); }}>
                      Voir tout <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="card-b">
                    {(recommendations.length > 0 ? recommendations : MOCK_RECOMMENDATIONS).slice(0, 3).map((reco) => (
                      <div key={reco.id} className="reco-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className={`reco-icon icon-${reco.color}`} style={{ background: `var(--${reco.color}-s)` }}>
                            {reco.icon ? <reco.icon size={16} style={{ color: `var(--${reco.color})` }} /> : <Sparkles size={16} style={{ color: `var(--${reco.color})` }} />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>{reco.title}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--ink4)' }}>{reco.description?.slice(0, 50)}...</div>
                          </div>
                        </div>
                        <span className={`tag tag-${reco.color}`}>{reco.impact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Competitors Table */}
              <div className="card">
                <div className="card-h">
                  <div>
                    <div className="card-title">Benchmark Concurrentiel</div>
                    <div className="card-sub">Comparaison temps réel des tarifs</div>
                  </div>
                </div>
                <div className="card-b" style={{ padding: 0 }}>
                  <table className="rt">
                    <thead>
                      <tr>
                        <th>Établissement</th>
                        <th>Tarif</th>
                        <th>Occupation</th>
                        <th>Source</th>
                        <th>Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: 'var(--primary-s)' }}>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          <Building2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                          Votre hôtel
                        </td>
                        <td style={{ fontWeight: 700 }}>€{kpis?.adr?.value || MOCK_KPIS.adr.value}</td>
                        <td>{kpis?.occupancy?.value || MOCK_KPIS.occupancy.value}%</td>
                        <td><span className="tag tag-primary">Tous canaux</span></td>
                        <td><span className="tag tag-green">Position 2</span></td>
                      </tr>
                      {MOCK_COMPETITORS.map((comp, idx) => (
                        <tr key={idx}>
                          <td>{comp.name}</td>
                          <td style={{ fontWeight: 600 }}>€{comp.rate}</td>
                          <td>
                            <span 
                              className="bar" 
                              style={{ 
                                width: `${comp.occ}px`, 
                                maxWidth: '80px',
                                background: comp.occ > 80 ? 'var(--green)' : comp.occ > 70 ? 'var(--blue)' : 'var(--amber)'
                              }} 
                            />
                            {comp.occ}%
                          </td>
                          <td><span className="tag tag-blue">{comp.source}</span></td>
                          <td style={{ color: 'var(--ink4)' }}>
                            {comp.rate > MOCK_KPIS.adr.value ? (
                              <span className="tag tag-red">+€{comp.rate - MOCK_KPIS.adr.value}</span>
                            ) : (
                              <span className="tag tag-green">-€{MOCK_KPIS.adr.value - comp.rate}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          
          {/* CALENDAR PAGE */}
          {activeSubMenu === 'calendar' && (
            <div className="card">
              <div className="card-h">
                <div>
                  <div className="card-title">Calendrier Tarifaire - Décembre 2024</div>
                  <div className="card-sub">Cliquez sur une date pour modifier le tarif</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm"><ChevronLeft size={14} /> Précédent</button>
                  <button className="btn btn-sm">Suivant <ChevronRight size={14} /></button>
                </div>
              </div>
              <div className="card-b">
                <div className="cal-grid" style={{ marginBottom: 8 }}>
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                    <div key={d} className="cal-dow">{d}</div>
                  ))}
                </div>
                <div className="cal-grid">
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    const occ = Math.floor(Math.random() * 40) + 60;
                    const price = Math.floor(Math.random() * 80) + 150;
                    const demand = occ > 85 ? 'peak' : occ > 75 ? 'high' : 'medium';
                    return (
                      <div 
                        key={day} 
                        className={`cal-cell ${day === 16 ? 'today' : ''}`}
                        style={{ 
                          background: demand === 'peak' ? 'var(--green-s)' : 
                                     demand === 'high' ? 'var(--blue-s)' : 
                                     'var(--surface)'
                        }}
                      >
                        <div className="cal-day">{day}</div>
                        <div className="cal-price">€{price}</div>
                        <div className="cal-occ">{occ}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* RECOMMENDATIONS PAGE */}
          {activeSubMenu === 'recommendations' && (
            <>
              <div className="alert amber" data-testid="recommendations-alert">
                <Lightbulb size={18} style={{ color: 'var(--amber)' }} className="alert-icon" />
                <div className="alert-body">
                  <strong>{MOCK_RECOMMENDATIONS.length} recommandations</strong> générées par le moteur d'intelligence artificielle.
                  Appliquez-les pour optimiser votre revenue.
                </div>
              </div>
              
              <div className="card">
                <div className="card-h">
                  <div>
                    <div className="card-title">Recommandations Prioritaires</div>
                    <div className="card-sub">Triées par impact potentiel</div>
                  </div>
                  <button className="btn btn-primary btn-sm">
                    <Zap size={14} />
                    Appliquer toutes
                  </button>
                </div>
                <div className="card-b">
                  {MOCK_RECOMMENDATIONS.map((reco) => (
                    <div key={reco.id} className="reco-row" style={{ padding: '16px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                        <div className={`icon-wrap icon-${reco.color}`}>
                          <reco.icon size={22} style={{ color: `var(--${reco.color})` }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>{reco.title}</span>
                            <span className={`tag tag-${reco.priority === 'high' ? 'red' : 'amber'}`}>
                              {reco.priority === 'high' ? 'Priorité haute' : 'Priorité moyenne'}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--ink3)' }}>{reco.description}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--green)' }}>{reco.impact}</div>
                          <div style={{ fontSize: '11px', color: 'var(--ink4)' }}>Impact estimé</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                          <button className="btn btn-primary btn-sm">Appliquer</button>
                          <button className="btn btn-sm">Ignorer</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* COMPETITORS PAGE */}
          {activeSubMenu === 'competitors' && (
            <div className="card">
              <div className="card-h">
                <div>
                  <div className="card-title">Analyse Concurrentielle</div>
                  <div className="card-sub">Données en temps réel des OTAs</div>
                </div>
              </div>
              <div className="card-b" style={{ padding: 0 }}>
                <table className="rt">
                  <thead>
                    <tr>
                      <th>Établissement</th>
                      <th>Tarif Moyen</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Occupation</th>
                      <th>Source</th>
                      <th>Mise à jour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_COMPETITORS.map((comp, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{comp.name}</td>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--mono)' }}>€{comp.rate}</td>
                        <td style={{ color: 'var(--ink3)' }}>€{comp.rate - 20}</td>
                        <td style={{ color: 'var(--ink3)' }}>€{comp.rate + 45}</td>
                        <td>
                          <span 
                            className="bar" 
                            style={{ 
                              width: `${comp.occ}px`, 
                              maxWidth: '80px',
                              background: comp.occ > 80 ? 'var(--green)' : 'var(--amber)'
                            }} 
                          />
                          {comp.occ}%
                        </td>
                        <td><span className="tag tag-blue">{comp.source}</span></td>
                        <td style={{ fontSize: '11px', color: 'var(--ink4)' }}>Il y a 5 min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* STRATEGY PAGE */}
          {activeSubMenu === 'strategy' && (
            <>
              <div className="card">
                <div className="card-h">
                  <div>
                    <div className="card-title">Stratégie Tarifaire</div>
                    <div className="card-sub">Choisissez votre approche de pricing</div>
                  </div>
                </div>
                <div className="card-b">
                  <div className="strat-grid" data-testid="strategy-grid">
                    {strategies.map((strat) => (
                      <div
                        key={strat.id}
                        className={`strat-card ${selectedStrategy === strat.id ? 'on' : ''}`}
                        onClick={() => handleStrategyChange(strat.id)}
                        data-testid={`strategy-${strat.id}`}
                      >
                        <div className="strat-emoji">{strat.emoji}</div>
                        <div className="strat-name">{strat.name}</div>
                        <div className="strat-tag">{strat.tag}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="alert green">
                <Check size={18} style={{ color: 'var(--green)' }} className="alert-icon" />
                <div className="alert-body">
                  Stratégie <strong>{strategies.find(s => s.id === selectedStrategy)?.name || 'Équilibré'}</strong> sélectionnée.
                  Les recommandations seront adaptées à cette approche.
                </div>
              </div>
            </>
          )}
          
          {/* WEIGHTS PAGE */}
          {activeSubMenu === 'weights' && (
            <div className="card">
              <div className="card-h">
                <div>
                  <div className="card-title">Pondération des Facteurs</div>
                  <div className="card-sub">Ajustez l'influence de chaque paramètre (total: 100%)</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={saveWeights}>
                  <Save size={14} />
                  Sauvegarder
                </button>
              </div>
              <div className="card-b">
                {weights.map((factor) => (
                  <div key={factor.id} className="weight-row">
                    <div className="weight-label">
                      <span className="wdot" style={{ background: factor.color }} />
                      {factor.label}
                    </div>
                    <input
                      type="range"
                      className="slider"
                      min="0"
                      max="100"
                      value={factor.value}
                      onChange={(e) => handleWeightChange(factor.id, e.target.value)}
                      style={{ '--slider-color': factor.color }}
                    />
                    <div className="weight-val">{factor.value}%</div>
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8, fontSize: '12px', color: 'var(--ink3)' }}>
                  Total: <strong style={{ color: weights.reduce((s, w) => s + w.value, 0) === 100 ? 'var(--green)' : 'var(--red)' }}>
                    {weights.reduce((s, w) => s + w.value, 0)}%
                  </strong> {weights.reduce((s, w) => s + w.value, 0) !== 100 && '(doit être 100%)'}
                </div>
              </div>
            </div>
          )}
          
          {/* AUTOPILOT PAGE */}
          {activeSubMenu === 'autopilot' && (
            <>
              <div className={`ap-card ${autopilotEnabled ? 'hi' : ''}`} data-testid="autopilot-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="icon-wrap icon-amber">
                      <Cpu size={24} style={{ color: 'var(--amber)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--ink)' }}>Mode Autopilot</div>
                      <div style={{ fontSize: '12px', color: 'var(--ink4)' }}>Application automatique des recommandations (confiance ≥ {autopilotThreshold * 100}%)</div>
                    </div>
                  </div>
                  <label className="toggle">
                    <input 
                      type="checkbox" 
                      checked={autopilotEnabled}
                      onChange={(e) => handleAutopilotToggle(e.target.checked)}
                      data-testid="autopilot-toggle"
                    />
                    <span className="toggle-track" />
                  </label>
                </div>
                
                {autopilotEnabled && (
                  <div className="alert amber" style={{ margin: 0 }}>
                    <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
                    <div className="alert-body">
                      <strong>Autopilot activé</strong> — Le système appliquera automatiquement les ajustements tarifaires validés.
                      Vous recevrez une notification pour chaque modification.
                    </div>
                  </div>
                )}
              </div>
              
              <div className="g3">
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Ajustements aujourd'hui</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)' }}>12</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Impact estimé</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green)' }}>+€3,450</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Précision moteur</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--blue)' }}>94.2%</div>
                </div>
              </div>
            </>
          )}
          
          {/* CONNECTIONS PAGE */}
          {activeSubMenu === 'connections' && (
            <div className="g2">
              <div className="conn-card">
                <div className="conn-header">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="conn-icon icon-blue">
                      <Database size={20} style={{ color: 'var(--blue)' }} />
                    </div>
                    <div style={{ marginLeft: 13 }}>
                      <div className="conn-name">PMS</div>
                      <div className="conn-desc">Système de gestion hôtelière</div>
                    </div>
                  </div>
                  <span className="status-badge status-ok">
                    <span className="status-dot" />
                    Connecté
                  </span>
                </div>
                <div className="conn-body">
                  <div className="conn-stats">
                    <div className="conn-stat">
                      <div className="conn-stat-label">Réservations</div>
                      <div className="conn-stat-val">1,247</div>
                      <div className="conn-stat-sub">Ce mois</div>
                    </div>
                    <div className="conn-stat">
                      <div className="conn-stat-label">Sync</div>
                      <div className="conn-stat-val">5 min</div>
                      <div className="conn-stat-sub">Dernière</div>
                    </div>
                    <div className="conn-stat">
                      <div className="conn-stat-label">Erreurs</div>
                      <div className="conn-stat-val">0</div>
                      <div className="conn-stat-sub">24h</div>
                    </div>
                  </div>
                  <div className="conn-actions">
                    <button className="btn btn-sm">
                      <RefreshCw size={13} />
                      Sync maintenant
                    </button>
                    <button className="btn btn-sm">
                      <Settings size={13} />
                      Configurer
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="conn-card">
                <div className="conn-header">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="conn-icon icon-amber">
                      <Globe size={20} style={{ color: 'var(--amber)' }} />
                    </div>
                    <div style={{ marginLeft: 13 }}>
                      <div className="conn-name">Channel Manager</div>
                      <div className="conn-desc">Distribution OTA</div>
                    </div>
                  </div>
                  <span className="status-badge status-ok">
                    <span className="status-dot" />
                    Connecté
                  </span>
                </div>
                <div className="conn-body">
                  <div className="conn-stats">
                    <div className="conn-stat">
                      <div className="conn-stat-label">Canaux</div>
                      <div className="conn-stat-val">8</div>
                      <div className="conn-stat-sub">Actifs</div>
                    </div>
                    <div className="conn-stat">
                      <div className="conn-stat-label">Sync</div>
                      <div className="conn-stat-val">2 min</div>
                      <div className="conn-stat-sub">Dernière</div>
                    </div>
                    <div className="conn-stat">
                      <div className="conn-stat-label">Taux</div>
                      <div className="conn-stat-val">99.9%</div>
                      <div className="conn-stat-sub">Uptime</div>
                    </div>
                  </div>
                  <div className="conn-actions">
                    <button className="btn btn-sm">
                      <RefreshCw size={13} />
                      Sync maintenant
                    </button>
                    <button className="btn btn-sm">
                      <Settings size={13} />
                      Configurer
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="conn-card">
                <div className="conn-header">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="conn-icon icon-green">
                      <Target size={20} style={{ color: 'var(--green)' }} />
                    </div>
                    <div style={{ marginLeft: 13 }}>
                      <div className="conn-name">Rate Shopper</div>
                      <div className="conn-desc">Veille concurrentielle</div>
                    </div>
                  </div>
                  <span className="status-badge status-ok">
                    <span className="status-dot" />
                    Connecté
                  </span>
                </div>
                <div className="conn-body">
                  <div className="conn-stats">
                    <div className="conn-stat">
                      <div className="conn-stat-label">Concurrents</div>
                      <div className="conn-stat-val">12</div>
                      <div className="conn-stat-sub">Suivis</div>
                    </div>
                    <div className="conn-stat">
                      <div className="conn-stat-label">Sync</div>
                      <div className="conn-stat-val">15 min</div>
                      <div className="conn-stat-sub">Dernière</div>
                    </div>
                    <div className="conn-stat">
                      <div className="conn-stat-label">Points</div>
                      <div className="conn-stat-val">2,450</div>
                      <div className="conn-stat-sub">Collectés</div>
                    </div>
                  </div>
                  <div className="conn-actions">
                    <button className="btn btn-sm">
                      <RefreshCw size={13} />
                      Sync maintenant
                    </button>
                    <button className="btn btn-sm">
                      <Settings size={13} />
                      Configurer
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="conn-card" style={{ borderStyle: 'dashed', opacity: 0.7 }}>
                <div className="conn-header">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="conn-icon" style={{ background: 'var(--surface3)' }}>
                      <Plus size={20} style={{ color: 'var(--ink4)' }} />
                    </div>
                    <div style={{ marginLeft: 13 }}>
                      <div className="conn-name" style={{ color: 'var(--ink3)' }}>Ajouter un connecteur</div>
                      <div className="conn-desc">Intégrez une nouvelle source</div>
                    </div>
                  </div>
                </div>
                <div className="conn-body" style={{ textAlign: 'center', padding: 24 }}>
                  <button className="btn btn-primary">
                    <Plus size={14} />
                    Nouveau connecteur
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* ANALYTICS, RATES, FORECAST, EVENTS - Placeholder pages */}
          {['analytics', 'rates', 'forecast', 'events'].includes(activeSubMenu) && (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <div className="icon-wrap icon-primary" style={{ margin: '0 auto 16px', width: 64, height: 64, borderRadius: 16 }}>
                {activeSubMenu === 'analytics' && <BarChart3 size={32} style={{ color: 'var(--primary)' }} />}
                {activeSubMenu === 'rates' && <DollarSign size={32} style={{ color: 'var(--primary)' }} />}
                {activeSubMenu === 'forecast' && <TrendingUp size={32} style={{ color: 'var(--primary)' }} />}
                {activeSubMenu === 'events' && <CalendarDays size={32} style={{ color: 'var(--primary)' }} />}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                {activeSubMenu === 'analytics' && 'Analytics & Rapports'}
                {activeSubMenu === 'rates' && 'Grille Tarifaire'}
                {activeSubMenu === 'forecast' && 'Prévisions de Demande'}
                {activeSubMenu === 'events' && 'Calendrier Événements'}
              </h3>
              <p style={{ color: 'var(--ink4)', marginBottom: 20 }}>
                Cette section est en cours de développement et sera bientôt disponible.
              </p>
              <button className="btn btn-primary">
                <Bell size={14} />
                Me notifier
              </button>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
};

export default RMS;
