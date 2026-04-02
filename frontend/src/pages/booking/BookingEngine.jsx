import { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp, TrendingDown, BarChart3, Target, DollarSign, Users, Mail,
  Globe, Search, ShoppingCart, Star, Settings, Bell, ChevronRight,
  ChevronDown, Plus, Play, Pause, RefreshCw, Download, Upload, Zap,
  ArrowUpRight, ArrowDownRight, Check, X, AlertTriangle, Info,
  Building2, Wifi, WifiOff, Database, Link, Eye, Edit3, Copy, Trash2,
  Send, Filter, Calendar, Clock, Tag, Gift, CreditCard, Smartphone,
  PieChart, Activity, Map, MessageSquare, ThumbsUp, Shield, Repeat,
  Layers, Cpu, Radio, ExternalLink, MoreHorizontal, LogOut, LayoutGrid,
  List, Sliders, BrainCircuit, Rocket, BadgeCheck, Sparkles, Hotel, Bed, Loader2
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION INTEGRATION - Import hook for real config data
// ═══════════════════════════════════════════════════════════════════════════════
import { useConfigData, usePricingMatrix, useRoomTypes } from "../../hooks/useConfigData";

/* ══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS & GLOBAL CSS
══════════════════════════════════════════════════════════════════════════ */
const CSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
    .dre *,.dre *::before,.dre *::after{box-sizing:border-box;margin:0;padding:0}
    .dre{
      --p:#7c3aed; --p1:#6d28d9; --p2:#8b5cf6; --p3:#a78bfa; --p4:#ddd6fe; --p5:#ede9fe; --p6:#f5f3ff;
      --hd:linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#4c1d95 100%);
      --grd:linear-gradient(135deg,#7c3aed,#a78bfa);
      --bg:#f0eef8; --sf:#fff; --s2:#faf9ff; --bd:#e5e1f0; --b2:#cdc8e0;
      --tx:#1a1535; --t2:#4a4468; --t3:#9991b8;
      --gn:#059669; --gnb:#d1fae5; --gnbd:#a7f3d0;
      --rd:#dc2626; --rdb:#fee2e2; --rdbd:#fca5a5;
      --am:#d97706; --amb:#fef3c7;
      --bl:#2563eb; --blb:#dbeafe;
      --f:'Geist',-apple-system,'Segoe UI',sans-serif;
      --r:12px; --r2:8px; --r3:6px;
      --s1:0 1px 3px rgba(109,40,217,.07),0 1px 2px rgba(0,0,0,.04);
      --s2b:0 4px 16px rgba(109,40,217,.1),0 2px 4px rgba(0,0,0,.05);
      --s3:0 8px 28px rgba(109,40,217,.15),0 3px 8px rgba(0,0,0,.07);
    }
    .dre{font-family:var(--f);background:var(--bg);color:var(--tx);min-height:100vh;display:flex;flex-direction:column;font-size:13.5px;line-height:1.5}
    .dre ::-webkit-scrollbar{width:5px;height:5px}
    .dre ::-webkit-scrollbar-track{background:transparent}
    .dre ::-webkit-scrollbar-thumb{background:var(--p4);border-radius:3px}

    /* TOP BAR */
    .dre .tb{background:var(--hd);height:54px;padding:0 22px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:300;box-shadow:0 2px 14px rgba(76,29,149,.35)}
    .dre .tb-logo{display:flex;align-items:center;gap:8px;margin-right:4px}
    .dre .tb-bars{display:flex;align-items:flex-end;gap:3px;height:18px}
    .dre .tb-bars span{display:block;width:4px;border-radius:2px 2px 0 0}
    .dre .tb-name{font-size:14.5px;font-weight:600;color:#fff;letter-spacing:-.02em}
    .dre .tb-div{color:rgba(255,255,255,.2);margin:0 6px;font-size:14px}
    .dre .tb-mod{font-size:13px;font-weight:500;color:rgba(255,255,255,.8);letter-spacing:-.01em}
    .dre .tb-space{flex:1}
    .dre .tb-chip{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:4px 11px;font-size:11.5px;font-weight:500;color:rgba(255,255,255,.75)}
    .dre .tb-btn-g{background:#16a34a;border:none;border-radius:var(--r2);padding:7px 15px;color:#fff;font-weight:600;font-size:12.5px;cursor:pointer;font-family:var(--f);display:flex;align-items:center;gap:6px;letter-spacing:-.01em;box-shadow:0 2px 8px rgba(22,163,74,.3);transition:all .14s}
    .dre .tb-btn-g:hover{background:#15803d;transform:translateY(-1px)}
    .dre .tb-btn-p{background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.18);border-radius:var(--r2);padding:7px 15px;color:#fff;font-weight:600;font-size:12.5px;cursor:pointer;font-family:var(--f);display:flex;align-items:center;gap:6px;letter-spacing:-.01em;transition:all .14s}
    .dre .tb-btn-p:hover{background:rgba(255,255,255,.2)}
    .dre .tb-icon-btn{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.8);transition:background .13s;flex-shrink:0}
    .dre .tb-icon-btn:hover{background:rgba(255,255,255,.2)}

    /* SUB NAV */
    .dre .snav{background:var(--sf);border-bottom:1px solid var(--bd);padding:0 22px;display:flex;align-items:center;gap:1px;height:44px;box-shadow:var(--s1);overflow-x:auto}
    .dre .snav::-webkit-scrollbar{height:0}
    .dre .sntab{padding:5px 13px;background:transparent;border:none;border-radius:var(--r2);color:var(--t3);font-weight:500;font-size:12.5px;cursor:pointer;font-family:var(--f);display:flex;align-items:center;gap:5px;letter-spacing:-.01em;transition:all .13s;white-space:nowrap;flex-shrink:0}
    .dre .sntab:hover{background:var(--p6);color:var(--p2)}
    .dre .sntab.on{background:var(--p6);color:var(--p);font-weight:600}
    .dre .sntab svg{opacity:.7}
    .dre .sntab.on svg{opacity:1}

    /* MAIN */
    .dre .body{display:flex;flex:1;overflow:hidden}
    .dre .main{flex:1;padding:22px 24px;overflow-y:auto}
    .dre .pg-hd{margin-bottom:20px}
    .dre .pg-hd h1{font-size:19px;font-weight:600;color:var(--tx);letter-spacing:-.03em;margin-bottom:2px}
    .dre .pg-hd p{font-size:12.5px;color:var(--t3);font-weight:400}

    /* KPI CARDS */
    .dre .krow{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:18px}
    .dre .kcard{background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);padding:17px 19px;box-shadow:var(--s1);transition:box-shadow .16s,transform .16s;cursor:default;position:relative;overflow:hidden}
    .dre .kcard::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--grd);opacity:0;transition:opacity .2s}
    .dre .kcard:hover{box-shadow:var(--s2b);transform:translateY(-1px)}
    .dre .kcard:hover::after{opacity:1}
    .dre .kcard-ico{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;margin-bottom:11px}
    .dre .kcard-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px}
    .dre .kcard-n{font-size:31px;font-weight:600;color:var(--tx);letter-spacing:-.05em;line-height:1;margin-bottom:4px}
    .dre .kcard-l{font-size:13px;font-weight:500;color:var(--t2);letter-spacing:-.01em}
    .dre .kcard-s{font-size:12px;color:var(--t3);margin-top:2px}
    .dre .badge-up{display:inline-flex;align-items:center;gap:3px;background:var(--gnb);color:var(--gn);font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px}
    .dre .badge-dn{display:inline-flex;align-items:center;gap:3px;background:var(--rdb);color:var(--rd);font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px}
    .dre .badge-nu{display:inline-flex;align-items:center;gap:3px;background:var(--p5);color:var(--p);font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px}

    /* LAYOUT */
    .dre .cgrid{display:grid;grid-template-columns:1fr 292px;gap:14px;align-items:start}
    .dre .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .dre .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}

    /* PANEL */
    .dre .panel{background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);box-shadow:var(--s1);overflow:hidden}
    .dre .panel-hd{background:var(--hd);padding:14px 18px;display:flex;align-items:center;justify-content:space-between}
    .dre .panel-hd h3{font-size:14px;font-weight:600;color:#fff;letter-spacing:-.02em;display:flex;align-items:center;gap:7px}
    .dre .panel-pill{background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:3px 11px;color:rgba(255,255,255,.75);font-size:11.5px;font-weight:500;display:flex;align-items:center;gap:5px}
    .dre .itabs{display:flex;padding:0 18px;border-bottom:1px solid var(--bd);background:var(--sf)}
    .dre .itab{padding:10px 15px;border:none;background:transparent;font-family:var(--f);font-size:13px;font-weight:500;color:var(--t3);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .13s;letter-spacing:-.01em;display:flex;align-items:center;gap:5px}
    .dre .itab:hover{color:var(--p2)}
    .dre .itab.on{color:var(--p);border-bottom-color:var(--p);font-weight:600}

    /* CARD */
    .dre .card{background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);padding:17px 19px;box-shadow:var(--s1)}
    .dre .card-ttl{font-size:11px;font-weight:700;color:var(--p2);letter-spacing:.06em;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:6px}

    /* TABLE */
    .dre .tbl{width:100%;border-collapse:collapse}
    .dre .tbl th{padding:8px 11px;text-align:left;font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid var(--bd);white-space:nowrap}
    .dre .tbl td{padding:11px 11px;border-bottom:1px solid var(--p6);font-size:13px;color:var(--t2);font-weight:400;vertical-align:middle}
    .dre .tbl tr:last-child td{border-bottom:none}
    .dre .tbl tr:hover td{background:var(--p6)}
    .dre .tbl td.tn{font-weight:600;color:var(--tx);letter-spacing:-.01em}

    /* CAMP LIST */
    .dre .cbody{display:grid;grid-template-columns:1fr 1fr}
    .dre .clist{padding:15px 18px;border-right:1px solid var(--bd)}
    .dre .ci{padding:11px 0;border-bottom:1px solid var(--p6)}
    .dre .ci:last-of-type{border-bottom:none}
    .dre .ci-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;gap:8px}
    .dre .ci-name{font-size:13px;font-weight:600;color:var(--tx);letter-spacing:-.01em;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .dre .ci-budg{font-size:12px;color:var(--t3);font-weight:400;display:flex;align-items:center;gap:4px;flex-shrink:0}
    .dre .ci-rev{font-weight:600;color:var(--tx)}
    .dre .ci-bot{display:flex;align-items:center;justify-content:space-between}
    .dre .roas-good{font-size:12.5px;font-weight:600;color:var(--gn);display:flex;align-items:center;gap:3px}
    .dre .roas-ok{font-size:12.5px;font-weight:600;color:var(--am);display:flex;align-items:center;gap:3px}
    .dre .roas-bad{font-size:12.5px;font-weight:600;color:var(--rd);display:flex;align-items:center;gap:3px}
    .dre .ci-acts{display:flex;gap:2px}
    .dre .ico-btn{background:none;border:none;cursor:pointer;padding:4px 5px;border-radius:5px;color:var(--t3);display:flex;align-items:center;justify-content:center;transition:all .12s}
    .dre .ico-btn:hover{background:var(--p5);color:var(--p)}
    .dre .ico-btn.danger:hover{background:var(--rdb);color:var(--rd)}
    .dre .btn-nc{width:100%;margin-top:13px;background:var(--grd);border:none;border-radius:var(--r2);padding:10px;color:#fff;font-weight:600;font-size:13px;cursor:pointer;font-family:var(--f);letter-spacing:-.01em;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 2px 10px rgba(124,58,237,.28);transition:all .14s}
    .dre .btn-nc:hover{box-shadow:0 4px 16px rgba(124,58,237,.42);transform:translateY(-1px)}

    /* RIGHT PANEL CONTENT */
    .dre .cright{padding:15px 18px;display:flex;flex-direction:column;gap:15px}
    .dre .sec-l{font-size:12px;font-weight:600;color:var(--tx);letter-spacing:-.01em;margin-bottom:9px}

    /* PRIX COMP */
    .dre .pxcomp{display:flex;gap:7px}
    .dre .pxbox{flex:1;border:1px solid var(--bd);border-radius:10px;padding:11px 9px;text-align:center;background:var(--s2);transition:all .14s}
    .dre .pxbox:hover{border-color:var(--p4)}
    .dre .pxbox.hl{background:var(--grd);border-color:transparent;box-shadow:0 4px 14px rgba(124,58,237,.28)}
    .dre .pxpl{font-size:10.5px;font-weight:600;color:var(--t3);margin-bottom:5px;display:flex;align-items:center;justify-content:center;gap:4px;letter-spacing:-.01em}
    .dre .pxbox.hl .pxpl{color:rgba(255,255,255,.8)}
    .dre .pxamt{font-size:25px;font-weight:600;color:var(--tx);letter-spacing:-.05em;line-height:1}
    .dre .pxbox.hl .pxamt{color:#fff;font-size:27px}
    .dre .pxbdg{font-size:9.5px;font-weight:600;padding:2px 7px;border-radius:10px;margin-top:5px;display:inline-block;letter-spacing:.02em}
    .dre .pb-dir{background:rgba(255,255,255,.22);color:#fff}
    .dre .pb-ota{background:var(--p5);color:var(--p)}
    .dre .px-ctrl{display:flex;align-items:center;gap:7px;justify-content:center;margin-top:8px}
    .dre .px-cbtn{background:var(--p6);border:1px solid var(--p4);border-radius:6px;padding:4px 13px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--f);color:var(--p);transition:all .12s;letter-spacing:-.01em}
    .dre .px-cbtn:hover{background:var(--p5)}

    /* CHART */
    .dre .chart-box{background:var(--p6);border:1px solid var(--p5);border-radius:8px;padding:10px 8px 6px}
    .dre .chart-leg{display:flex;gap:13px;margin-bottom:7px;padding:0 2px}
    .dre .cl-i{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500;color:var(--t3)}
    .dre .cl-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    .dre .cl-val{font-weight:700;color:var(--p);margin-left:3px}

    /* STAT ROW */
    .dre .stat-row{display:grid;grid-template-columns:1fr 1fr;background:var(--bd);gap:1px;border-radius:0 0 var(--r) var(--r);overflow:hidden}
    .dre .stat-cell{background:var(--sf);padding:13px 18px}
    .dre .stat-l{font-size:11px;color:var(--t3);font-weight:500;margin-bottom:4px;letter-spacing:.01em}
    .dre .stat-v{font-size:24px;font-weight:600;color:var(--tx);letter-spacing:-.05em}

    /* IA SIDEBAR */
    .dre .ia-wrap{display:flex;flex-direction:column;gap:11px}
    .dre .ia-panel{background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);box-shadow:var(--s1);overflow:hidden}
    .dre .ia-hd{background:var(--hd);padding:13px 15px;display:flex;align-items:center;justify-content:space-between}
    .dre .ia-hd h4{font-size:13px;font-weight:600;color:#fff;letter-spacing:-.02em;display:flex;align-items:center;gap:7px}
    .dre .ia-body{padding:11px 11px 5px;display:flex;flex-direction:column;gap:7px}
    .dre .ia-rec{display:flex;align-items:flex-start;gap:9px;padding:10px 11px;background:var(--p6);border:1px solid var(--p5);border-radius:9px;cursor:pointer;transition:all .14s}
    .dre .ia-rec:hover{background:var(--p5);border-color:var(--p4);box-shadow:var(--s1)}
    .dre .ia-rec.done{opacity:.65;background:var(--gnb);border-color:var(--gnbd);cursor:default}
    .dre .ia-ico{width:30px;height:30px;border-radius:8px;background:var(--p5);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
    .dre .ia-rec.done .ia-ico{background:var(--gnb)}
    .dre .ia-txt{font-size:12px;font-weight:600;color:var(--tx);line-height:1.4;letter-spacing:-.01em}
    .dre .ia-sub{font-size:11px;color:var(--t3);margin-top:2px;line-height:1.4;font-weight:400}
    .dre .ia-tag{font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;margin-top:5px;display:inline-flex;align-items:center;gap:3px;letter-spacing:.01em}
    .dre .tag-h{background:var(--rdb);color:var(--rd)}
    .dre .tag-m{background:var(--amb);color:var(--am)}
    .dre .tag-ok{background:var(--gnb);color:var(--gn)}

    /* PRICING ENGINE */
    .dre .px-eng{margin:0 11px 11px;background:var(--p6);border:1px solid var(--p4);border-radius:10px;padding:12px 13px}
    .dre .px-eng-t{font-size:10px;font-weight:700;color:var(--p);letter-spacing:.06em;text-transform:uppercase;margin-bottom:9px;display:flex;align-items:center;gap:5px}
    .dre .px-m{margin-bottom:7px}
    .dre .px-ml{display:flex;justify-content:space-between;margin-bottom:3px}
    .dre .px-ml span{font-size:11px;color:var(--t3)}
    .dre .px-ml strong{font-size:11px;font-weight:600}
    .dre .px-trk{height:4px;background:var(--p4);border-radius:2px;overflow:hidden}
    .dre .px-f{height:100%;border-radius:2px;transition:width 1s ease}
    .dre .px-res{margin-top:9px;padding-top:9px;border-top:1px solid var(--p4);display:flex;align-items:center;justify-content:space-between}
    .dre .px-rl{font-size:11px;color:var(--t3)}
    .dre .px-rv{font-size:25px;font-weight:600;color:var(--p);letter-spacing:-.05em}

    /* CONNECTIVITY HUB */
    .dre .conn-hub{background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);overflow:hidden}
    .dre .conn-hd{background:var(--hd);padding:11px 14px;display:flex;align-items:center;gap:8px}
    .dre .conn-hd span{font-size:13px;font-weight:600;color:#fff;letter-spacing:-.01em}
    .dre .conn-body{padding:10px 12px;display:flex;flex-direction:column;gap:5px}
    .dre .conn-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;background:var(--p6);border:1px solid var(--p5);transition:all .13s;cursor:pointer}
    .dre .conn-row:hover{border-color:var(--p4);background:var(--p5)}
    .dre .conn-row.err{background:var(--rdb);border-color:var(--rdbd)}
    .dre .conn-row.warn{background:var(--amb);border-color:var(--am);opacity:.8}
    .dre .conn-ico{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .dre .conn-info{flex:1;min-width:0}
    .dre .conn-name{font-size:12px;font-weight:600;color:var(--tx);letter-spacing:-.01em}
    .dre .conn-stat{font-size:10.5px;color:var(--t3);margin-top:1px}
    .dre .conn-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
    .dre .c-ok{background:var(--gn);box-shadow:0 0 5px var(--gn)}
    .dre .c-err{background:var(--rd)}
    .dre .c-warn{background:var(--am)}
    .dre .c-sync{background:var(--p2);animation:pulse 1.5s infinite}

    /* BUTTONS */
    .dre .btn-p{background:var(--grd);border:none;border-radius:var(--r2);padding:8px 15px;color:#fff;font-weight:600;font-size:13px;cursor:pointer;font-family:var(--f);letter-spacing:-.01em;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(124,58,237,.25);transition:all .14s}
    .dre .btn-p:hover{box-shadow:0 4px 14px rgba(124,58,237,.4);transform:translateY(-1px)}
    .dre .btn-p:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .dre .btn-s{background:var(--sf);border:1px solid var(--bd);border-radius:var(--r2);padding:7px 13px;color:var(--t2);font-weight:500;font-size:13px;cursor:pointer;font-family:var(--f);letter-spacing:-.01em;display:flex;align-items:center;gap:5px;transition:all .12s}
    .dre .btn-s:hover{background:var(--p6);color:var(--p);border-color:var(--p4)}
    .dre .btn-danger{background:var(--rdb);border:1px solid var(--rdbd);border-radius:var(--r2);padding:6px 12px;color:var(--rd);font-weight:600;font-size:12px;cursor:pointer;font-family:var(--f);letter-spacing:-.01em;display:flex;align-items:center;gap:5px;transition:all .12s}
    .dre .btn-danger:hover{background:var(--rd);color:#fff}

    /* FILTER BAR */
    .dre .fbar{display:flex;gap:7px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
    .dre .fbtn{background:var(--sf);border:1px solid var(--bd);border-radius:6px;padding:5px 12px;font-size:12.5px;font-weight:500;color:var(--t2);cursor:pointer;font-family:var(--f);transition:all .12s;letter-spacing:-.01em;display:flex;align-items:center;gap:5px}
    .dre .fbtn:hover{background:var(--p6);color:var(--p);border-color:var(--p4)}
    .dre .fbtn.on{background:var(--p);color:#fff;border-color:var(--p);font-weight:600}

    /* ROWS */
    .dre .orow{display:flex;align-items:center;gap:9px;padding:10px 12px;background:var(--p6);border:1px solid var(--p5);border-radius:var(--r2);margin-bottom:7px;transition:all .13s}
    .dre .orow:hover{border-color:var(--p4);box-shadow:var(--s1)}
    .dre .seqc{padding:11px 13px;background:var(--p6);border:1px solid var(--p5);border-radius:var(--r2);margin-bottom:7px}
    .dre .seqc:hover{border-color:var(--p4)}
    .dre .segrow{display:flex;align-items:center;gap:9px;padding:9px 12px;background:var(--p6);border:1px solid var(--p5);border-radius:var(--r2);margin-bottom:6px;transition:border-color .13s}
    .dre .segrow:hover{border-color:var(--p4)}

    /* TOGGLE */
    .dre .tgl{width:34px;height:19px;border-radius:10px;background:var(--b2);border:none;cursor:pointer;position:relative;transition:background .2s;padding:0;flex-shrink:0}
    .dre .tgl.on{background:var(--p)}
    .dre .tgl::after{content:'';position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
    .dre .tgl.on::after{transform:translateX(15px)}

    /* STATUS BADGES */
    .dre .bdg-a{background:var(--gnb);color:var(--gn);font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;display:inline-flex;align-items:center;gap:3px}
    .dre .bdg-p{background:var(--p5);color:var(--p2);font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;display:inline-flex;align-items:center;gap:3px}
    .dre .par-u{background:var(--gnb);color:var(--gn);font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px}
    .dre .par-a{background:var(--rdb);color:var(--rd);font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px}
    .dre .par-p{background:var(--p5);color:var(--p);font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px}
    .dre .pb-g{background:var(--blb);color:var(--bl);font-size:11px;font-weight:600;padding:2px 8px;border-radius:5px}
    .dre .pb-m{background:#dbeafe;color:#1877f2;font-size:11px;font-weight:600;padding:2px 8px;border-radius:5px}
    .dre .pb-t{background:var(--rdb);color:var(--rd);font-size:11px;font-weight:600;padding:2px 8px;border-radius:5px}

    /* SEO GAUGE */
    .dre .gauge-w{display:flex;justify-content:center;margin:5px 0}

    /* MODAL */
    .dre .mo{position:fixed;inset:0;background:rgba(15,10,40,.5);z-index:500;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px)}
    .dre .mo-box{background:var(--sf);border-radius:14px;padding:24px;width:460px;max-width:95vw;box-shadow:0 24px 60px rgba(0,0,0,.22)}
    .dre .mo-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
    .dre .mo-hd h3{font-size:16px;font-weight:600;color:var(--tx);letter-spacing:-.02em}
    .dre .mo-close{background:var(--p6);border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--t3);transition:all .12s}
    .dre .mo-close:hover{background:var(--p5);color:var(--p)}
    .dre .ff{margin-bottom:13px}
    .dre .fl{font-size:12px;font-weight:600;color:var(--t2);margin-bottom:5px;display:block;letter-spacing:-.01em}
    .dre .fi{width:100%;background:var(--p6);border:1px solid var(--p4);border-radius:var(--r2);padding:9px 12px;font-size:13px;color:var(--tx);font-family:var(--f);outline:none;transition:border-color .12s;letter-spacing:-.01em}
    .dre .fi:focus{border-color:var(--p);box-shadow:0 0 0 3px rgba(124,58,237,.12)}
    .dre .fsel{width:100%;background:var(--p6);border:1px solid var(--p4);border-radius:var(--r2);padding:9px 12px;font-size:13px;color:var(--tx);font-family:var(--f);outline:none;cursor:pointer;appearance:none}

    /* TOAST */
    @keyframes sIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes sOut{from{transform:translateX(0);opacity:1}to{transform:translateX(120%);opacity:0}}
    .dre .toast{position:fixed;bottom:22px;right:22px;background:var(--tx);color:#fff;padding:11px 16px;border-radius:10px;font-size:13px;font-weight:500;z-index:999;display:flex;align-items:center;gap:8px;box-shadow:var(--s3);letter-spacing:-.01em;animation:sIn .28s ease}
    .dre .toast.out{animation:sOut .28s ease forwards}
    .dre .toast-icon{width:20px;height:20px;border-radius:50%;background:var(--gn);display:flex;align-items:center;justify-content:center;flex-shrink:0}

    /* ANIM */
    @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .dre .fade{animation:fadeUp .24s ease both}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .dre .spin{animation:spin 1.2s linear infinite}

    /* MISC */
    .dre .divider{height:1px;background:var(--bd);margin:12px 0}
    .dre .empty{padding:32px;text-align:center;color:var(--t3);font-size:13px}
    .dre .tag-crit{background:var(--rdb);color:var(--rd);font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:10px}
    .dre .tag-warn{background:var(--amb);color:var(--am);font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:10px}
    .dre .tag-ok{background:var(--gnb);color:var(--gn);font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:10px}
    .dre .section-sep{display:flex;align-items:center;gap:10px;margin:18px 0 14px}
    .dre .section-sep span{font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
    .dre .section-sep::before,.dre .section-sep::after{content:'';flex:1;height:1px;background:var(--bd)}
    .dre .score-bar{height:6px;border-radius:3px;overflow:hidden;background:var(--bd);margin-top:4px}
    .dre .score-fill{height:100%;border-radius:3px;transition:width 1.2s ease}
    .dre .info-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--p6);font-size:12.5px}
    .dre .info-row:last-child{border-bottom:none}
    .dre .info-l{color:var(--t3)}
    .dre .info-v{color:var(--tx);font-weight:600;letter-spacing:-.01em}
  `}</style>
);

/* ══════════════════════════════════════════════════════════════════════════
   CHART COMPONENT
══════════════════════════════════════════════════════════════════════════ */
function LineChart({ d1, d2, h = 88 }) {
  const W = 420;
  const mn = Math.min(...d1, ...d2) - 80, mx = Math.max(...d1, ...d2) + 50;
  const tx = i => (i / (d1.length - 1)) * W;
  const ty = v => h - ((v - mn) / (mx - mn)) * h;
  const pts = d => d.map((v, i) => `${tx(i).toFixed(1)},${ty(v).toFixed(1)}`).join(" ");
  const area = d => `M ${pts(d).replace(/ /g, " L ")} L ${tx(d.length - 1)},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h, display: "block" }}>
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity=".3" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity=".2" /><stop offset="100%" stopColor="#059669" stopOpacity="0" /></linearGradient>
      </defs>
      <path d={area(d1)} fill="url(#g1)" />
      <path d={area(d2)} fill="url(#g2)" />
      <polyline points={pts(d1)} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts(d2)} fill="none" stroke="#059669" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {d1.filter((_, i) => i % 3 === 0).map((_, j) => { const i = j * 3; return <circle key={i} cx={tx(i)} cy={ty(d1[i])} r="3" fill="#8b5cf6" />; })}
      {d2.filter((_, i) => i % 3 === 0).map((_, j) => { const i = j * 3; return <circle key={i} cx={tx(i)} cy={ty(d2[i])} r="3" fill="#059669" />; })}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GAUGE
══════════════════════════════════════════════════════════════════════════ */
function Gauge({ sc }) {
  const r = 40, cx = 52, cy = 52, circ = 2 * Math.PI * r;
  const col = sc >= 70 ? "#059669" : sc >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="gauge-w">
      <svg width={104} height={104} viewBox="0 0 104 104">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ede9fe" strokeWidth={8} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - sc / 100)}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 1.2s ease" }} />
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize={22} fontWeight={600} fontFamily="Geist,sans-serif" fill={col}>{sc}</text>
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize={9} fill="#9991b8" fontFamily="Geist,sans-serif">/100</text>
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MICRO COMPONENTS
══════════════════════════════════════════════════════════════════════════ */
const MBar = ({ p, c }) => <div className="px-trk"><div className="px-f" style={{ width: `${p}%`, background: c }} /></div>;
const SBadge = ({ s }) => s === "active"
  ? <span className="bdg-a"><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#059669", display: "inline-block" }} />Actif</span>
  : <span className="bdg-p"><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#9991b8", display: "inline-block" }} />Pause</span>;

function Toast({ msg, type = "success", onDone }) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 2500);
    const t2 = setTimeout(onDone, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  const icons = { success: <Check size={11} />, error: <X size={11} />, info: <Info size={11} />, sync: <RefreshCw size={11} className="spin" /> };
  const bg = { success: "#059669", error: "#dc2626", info: "#7c3aed", sync: "#7c3aed" };
  return (
    <div className={`toast${out ? " out" : ""}`}>
      <div className="toast-icon" style={{ background: bg[type] }}>{icons[type]}</div>
      {msg}
    </div>
  );
}

function Modal({ title, children, onClose, width = 460 }) {
  return (
    <div className="mo" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mo-box" style={{ width }}>
        <div className="mo-hd">
          <h3>{title}</h3>
          <button className="mo-close" onClick={onClose}><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════════════════════ */
const CLICS = [1400, 1520, 1680, 1720, 1860, 1920, 2010, 2060, 2120, 2090, 2160, 2210];
const RESA = [1150, 1280, 1370, 1450, 1530, 1600, 1670, 1730, 1780, 1820, 1870, 1940];
const MONTHS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];

const MODULES = [
  { id: "pms",     name: "PMS Opera Cloud",      icon: Building2,    color: "#7c3aed", bg: "#ede9fe", status: "ok",   stat: "Synchronise · il y a 2min",  data: { rooms: 84, occ: "73%", revPAR: "142" } },
  { id: "rms",     name: "RMS — Pricing Engine",  icon: TrendingUp,   color: "#059669", bg: "#d1fae5", status: "ok",   stat: "Prix mis a jour · Auto",      data: { rec: "162", delta: "+8%" } },
  { id: "cm",      name: "Channel Manager",       icon: Layers,       color: "#2563eb", bg: "#dbeafe", status: "ok",   stat: "6 canaux actifs",             data: { channels: 6, ota_share: "38%" } },
  { id: "crm",     name: "CRM Clients",           icon: Users,        color: "#d97706", bg: "#fef3c7", status: "ok",   stat: "1 786 contacts · Sync live",  data: { contacts: 1786, segments: 4 } },
  { id: "erep",    name: "E-Reputation",           icon: Star,         color: "#dc2626", bg: "#fee2e2", status: "warn", stat: "3 avis sans reponse",         data: { avg: 4.3, pending: 3 } },
  { id: "report",  name: "Reporting & BI",        icon: BarChart3,    color: "#7c3aed", bg: "#ede9fe", status: "ok",   stat: "Dernier rapport: aujourd'hui", data: { lastExport: "Aujourd'hui" } },
  { id: "booking", name: "Booking Engine",        icon: ShoppingCart, color: "#059669", bg: "#d1fae5", status: "ok",   stat: "Paiement Stripe actif",       data: { directRate: "62%", conv: "4.8%" } },
  { id: "stripe",  name: "Stripe Payments",       icon: CreditCard,   color: "#635bff", bg: "#eef2ff", status: "ok",   stat: "3 methodes · RGPD conforme",  data: {} },
];

const INIT_CAMPS = [
  { id: 1, name: "Promo Saison Ete", platform: "google", budget: 1200, rev: 6500, roas: 5.4, conv: 34, status: "active", cpc: 1.80 },
  { id: 2, name: "Offre Week-End",   platform: "google", budget: 800,  rev: 3200, roas: 4.0, conv: 18, status: "active", cpc: 1.40 },
  { id: 3, name: "Retargeting Vis.", platform: "google", budget: 1000, rev: 5000, roas: 5.0, conv: 26, status: "active", cpc: 1.90 },
];
const META_C = [
  { id: 4, name: "Retargeting Meta",  platform: "meta", budget: 600, rev: 3100, roas: 6.1, conv: 28, status: "active", cpc: 0.95 },
  { id: 5, name: "Lookalike VIP",     platform: "meta", budget: 450, rev: 1500, roas: 1.8, conv: 8,  status: "paused", cpc: 1.40 },
];
const TRIV_C = [
  { id: 6, name: "Trivago Direct",    platform: "trivago", budget: 300, rev: 1500, roas: 3.9, conv: 12, status: "active", cpc: 1.20 },
];
const META_PRICES = [
  { ch: "Booking.com", ota: 125 }, { ch: "Expedia", ota: 119 },
  { ch: "Trivago", ota: 132 }, { ch: "Google Hotels", ota: 112 }, { ch: "Airbnb", ota: 108 },
];
const AI_RECS = [
  { ic: Rocket,      t: "Augmenter budget Google +20%",    sub: "ROAS 5.4x — surperformance detectee.",     p: "high", action: "budget_google" },
  { ic: Tag,         t: "Lancer Promo Last Minute",         sub: "Occ. dim. < 50% — stimuler la demande.",   p: "med",  action: "promo_lm"      },
  { ic: DollarSign,  t: "Baisser tarif dates creuses -10", sub: "Booking.com -12% sur vos dates creuses.",  p: "med",  action: "price_down"    },
  { ic: Mail,        t: "Relancer les abandons (312)",      sub: "Taux conv. moyen ~6.2% sur ce segment.",   p: "high", action: "email_abandon" },
];
const SEQ_EMAILS = [
  { n: "Relance abandon reservation", sent: 312, open: "41%", conv: "6.2%", status: "active"  },
  { n: "Email post-sejour J+3",       sent: 184, open: "68%", conv: "3.1%", status: "active"  },
  { n: "Offre fidelite 6 mois",       sent: 89,  open: "55%", conv: "8.7%", status: "active"  },
  { n: "Reactivation 90j+",           sent: 348, open: "22%", conv: "1.8%", status: "paused" },
  { n: "Bienvenue nouveau client",    sent: 127, open: "74%", conv: "5.1%", status: "active"  },
];
const SEGMENTS = [
  { l: "Nouveaux clients", n: 892, p: 41, c: "#7c3aed" },
  { l: "Clients fideles",  n: 634, p: 29, c: "#2563eb" },
  { l: "Abandon panier",   n: 312, p: 14, c: "#d97706" },
  { l: "Inactifs 90j+",   n: 348, p: 16, c: "#dc2626" },
];
const SEO_PAGES = [
  { pg: "/chambre-deluxe",   sc: 48, issue: "Balise H1 manquante",         prio: "crit" },
  { pg: "/offres-speciales", sc: 52, issue: "Meta description courte",      prio: "crit" },
  { pg: "/restaurant",       sc: 61, issue: "Vitesse de chargement lente",  prio: "warn" },
  { pg: "/ (Accueil)",       sc: 78, issue: "Images non optimisees",        prio: "warn" },
  { pg: "/contact",          sc: 86, issue: "Contenu insuffisant",          prio: "ok"   },
];
const OFFRES = [
  { n: "Early Bird -15%",    code: "EARLY15",  used: 34, conv: "8.2%",  active: true  },
  { n: "Week-end Romance",   code: "WEEKEND",  used: 12, conv: "11.4%", active: true  },
  { n: "Direct -10%",        code: "DIRECT10", used: 67, conv: "6.8%",  active: true  },
  { n: "Sejour 3 = 2",       code: "3FOR2",    used: 8,  conv: "14.1%", active: false },
];
const UPSELLS_INIT = [
  { n: "Upgrade Deluxe",   price: "+30/nuit", accepted: "34%", on: true  },
  { n: "Petit dejeuner",   price: "+18/nuit", accepted: "52%", on: true  },
  { n: "Late check-out",   price: "+25",      accepted: "28%", on: true  },
  { n: "Parking securise", price: "+15/nuit", accepted: "41%", on: false },
  { n: "Spa & bien-etre",  price: "+45/nuit", accepted: "19%", on: false },
];

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export function BookingEngine() {
  const [tab,        setTab]       = useState("dashboard");
  const [innerTab,   setInnerTab]  = useState("google");
  const [camps,      setCamps]     = useState(INIT_CAMPS);
  const [applied,    setApplied]   = useState([]);
  const [campOn,     setCampOn]    = useState(true);
  const [toasts,     setToasts]    = useState([]);
  const [modal,      setModal]     = useState(null);
  const [upsells,    setUpsells]   = useState(UPSELLS_INIT);
  const [syncing,    setSyncing]   = useState({});
  const [modules,    setModules]   = useState(MODULES);
  const [filterCamp, setFilterCamp]= useState("Toutes");
  const [newCamp,    setNewCamp]   = useState({ name: "", platform: "google", budget: "", obj: "conversion" });
  const [newOffre,   setNewOffre]  = useState({ name: "", code: "", discount: "", type: "pct" });
  const [offres,     setOffres]    = useState(OFFRES);
  const toastId = useRef(0);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONFIGURATION INTEGRATION - Load real config data
  // ═══════════════════════════════════════════════════════════════════════════════
  const { 
    hotel: configHotel, 
    roomTypes: configRoomTypes, 
    ratePlans: configRatePlans,
    pricingMatrix: configPricingMatrix,
    loading: configLoading, 
    error: configError,
    refresh: refreshConfig 
  } = useConfigData();

  // Derive price from configuration (use first room type's BAR price or default)
  const [price, setPrice] = useState(112);
  
  // Update price when config loads
  useEffect(() => {
    if (configRoomTypes?.length > 0 && configPricingMatrix?.BAR) {
      // Get the first room type code (usually STD)
      const firstRoomCode = configRoomTypes[0]?.code || 'STD';
      const basePrice = configPricingMatrix.BAR?.[firstRoomCode] || configRoomTypes[0]?.base_price || 120;
      setPrice(basePrice);
    }
  }, [configRoomTypes, configPricingMatrix]);

  // Build dynamic OTA comparison prices from config
  const metaPrices = configRoomTypes?.length > 0 
    ? [
        { ch: "Booking.com", ota: Math.round(price * 1.12) }, // +12%
        { ch: "Expedia", ota: Math.round(price * 1.08) },     // +8%
        { ch: "Trivago", ota: Math.round(price * 1.15) },     // +15%
        { ch: "Google Hotels", ota: Math.round(price * 1.05) }, // +5%
        { ch: "Airbnb", ota: Math.round(price * 1.02) },      // +2%
      ]
    : META_PRICES;

  const toast = useCallback((msg, type = "success") => {
    const id = ++toastId.current;
    setToasts(t => [...t, { id, msg, type }]);
  }, []);

  const removeToast = id => setToasts(t => t.filter(x => x.id !== id));

  const syncModule = async (modId) => {
    setSyncing(s => ({ ...s, [modId]: true }));
    toast(`Synchronisation ${MODULES.find(m => m.id === modId)?.name}...`, "sync");
    await new Promise(r => setTimeout(r, 1800));
    setSyncing(s => ({ ...s, [modId]: false }));
    setModules(ms => ms.map(m => m.id === modId ? { ...m, status: "ok", stat: "Synchronise · a l'instant" } : m));
    toast(`${MODULES.find(m => m.id === modId)?.name} synchronise`, "success");
  };

  const applyRec = (i, action) => {
    if (applied.includes(i)) return;
    setApplied(p => [...p, i]);
    if (action === "budget_google") { setCamps(c => c.map(x => x.id === 1 ? { ...x, budget: Math.round(x.budget * 1.2) } : x)); toast("Budget Google augmente de 20%"); }
    if (action === "price_down")    { setPrice(p => p - 10); toast("Tarif ajuste -10 · PMS synchronise"); syncModule("pms"); }
    if (action === "email_abandon") { toast("Sequence relance abandons activee · 312 contacts cibles"); }
    if (action === "promo_lm")      { toast("Promo Last Minute creee et diffusee"); }
  };

  const toggleCamp = id => { setCamps(c => c.map(x => x.id === id ? { ...x, status: x.status === "active" ? "paused" : "active" } : x)); };

  const createCamp = () => {
    if (!newCamp.name || !newCamp.budget) { toast("Remplis tous les champs", "error"); return; }
    const nc = { id: Date.now(), name: newCamp.name, platform: newCamp.platform, budget: parseInt(newCamp.budget), rev: 0, roas: 0, conv: 0, status: "active", cpc: 0 };
    setCamps(c => [...c, nc]);
    setModal(null);
    toast(`Campagne "${nc.name}" lancee sur ${nc.platform}`);
    setNewCamp({ name: "", platform: "google", budget: "", obj: "conversion" });
  };

  const createOffre = () => {
    if (!newOffre.name) { toast("Nom de l'offre requis", "error"); return; }
    setOffres(o => [...o, { n: newOffre.name, code: newOffre.code || "PROMO", used: 0, conv: "0%", active: true }]);
    setModal(null);
    toast(`Offre "${newOffre.name}" creee`);
    setNewOffre({ name: "", code: "", discount: "", type: "pct" });
  };

  const allCamps = [...camps, ...META_C, ...TRIV_C];
  const currentCamps = innerTab === "google" ? camps : innerTab === "meta" ? META_C : TRIV_C;
  const filteredCamps = allCamps.filter(c => filterCamp === "Toutes" || c.platform === filterCamp.toLowerCase());

  const MAIN_TABS = [
    { id: "dashboard",   l: "Dashboard",      Icon: LayoutGrid    },
    { id: "ads",         l: "Ads Manager",    Icon: Radio         },
    { id: "metasearch",  l: "Meta Search",    Icon: Search        },
    { id: "booking",     l: "Booking",        Icon: ShoppingCart  },
    { id: "crm",         l: "CRM & Email",    Icon: Mail          },
    { id: "seo",         l: "SEO & Contenu",  Icon: Globe         },
    { id: "reporting",   l: "Reporting",      Icon: BarChart3     },
    { id: "integrations",l: "Integrations",   Icon: Link          },
  ];

  /* ─── RENDER ─────────────────────────────────────────────────────────── */
  return (
    <>
      <CSS />
      <div className="dre">

        {/* ── TOP BAR ── */}
        <header className="tb">
          <div className="tb-logo">
            <div className="tb-bars">
              <span style={{ height: 7,  background: "#ef4444" }} />
              <span style={{ height: 13, background: "#f59e0b" }} />
              <span style={{ height: 18, background: "#22c55e" }} />
              <span style={{ height: 11, background: "#a78bfa" }} />
            </div>
            <span className="tb-name">FlowTYM</span>
            <span className="tb-div">/</span>
            <span className="tb-mod">Booking Engine</span>
          </div>
          <div className="tb-space" />
          <div className="tb-chip">
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: campOn ? "#4ade80" : "#94a3b8", display: "inline-block", boxShadow: campOn ? "0 0 5px #4ade80" : "none", animation: campOn ? "pulse 2s infinite" : "none" }} />
            {campOn ? "Systeme actif" : "En pause"}
          </div>
          <button className="tb-btn-g" onClick={() => { setCampOn(!campOn); toast(campOn ? "Campagnes desactivees" : "Campagnes activees", campOn ? "error" : "success"); }}>
            <Zap size={14} />
            {campOn ? "Actif" : "Activer"}
          </button>
          <button className="tb-btn-p" onClick={() => setModal({ type: "offre" })}>
            <Plus size={14} />
            Creer offre
          </button>
          <button className="tb-icon-btn"><Bell size={15} /></button>
          <button className="tb-icon-btn"><Settings size={15} /></button>
        </header>

        {/* ── SUB NAV ── */}
        <nav className="snav">
          {MAIN_TABS.map(t => (
            <button key={t.id} className={`sntab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
              <t.Icon size={13} />
              {t.l}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "var(--t3)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
            <Hotel size={13} /> Hotel Le Meridian · Paris
          </span>
        </nav>

        {/* ── BODY ── */}
        <div className="body">
          <main className="main">

            {/* ╔══════════════════════════════════════╗
                ║           DASHBOARD                  ║
                ╚══════════════════════════════════════╝ */}
            {tab === "dashboard" && (
              <div className="fade">
                <div className="pg-hd">
                  <h1>Dashboard Global</h1>
                  <p>Vue d'ensemble · 30 derniers jours · synchronise avec PMS, RMS, Channel Manager</p>
                </div>

                {/* KPI ROW */}
                <div className="krow">
                  {[
                    { Icon: DollarSign, bg: "#ede9fe", c: "#7c3aed", n: "56 320 €", l: "Revenu Direct", s: "vs mois dernier", badge: "+35%", up: true },
                    { Icon: TrendingUp, bg: "#d1fae5", c: "#059669", n: "5.2x",     l: "ROAS Global",   s: "Performance ads", badge: null,   up: null },
                    { Icon: Target,     bg: "#fef3c7", c: "#d97706", n: "4.8%",     l: "Taux Conversion",s: "Site direct",    badge: "+1.2%", up: true },
                    { Icon: Activity,   bg: "#fee2e2", c: "#dc2626", n: "18,50 €",  l: "Cout Acquisition",s: "CPA optimise",  badge: "-15%",  up: true },
                  ].map((k, i) => (
                    <div key={i} className="kcard">
                      <div className="kcard-top">
                        <div className="kcard-ico" style={{ background: k.bg }}><k.Icon size={17} color={k.c} /></div>
                        {k.badge && <span className={k.up === true ? "badge-up" : k.up === false ? "badge-dn" : "badge-nu"}>
                          {k.up === true ? <TrendingUp size={10} /> : k.up === false ? <TrendingDown size={10} /> : null}{k.badge}
                        </span>}
                      </div>
                      <div className="kcard-n">{k.n}</div>
                      <div className="kcard-l">{k.l}</div>
                      <div className="kcard-s">{k.s}</div>
                    </div>
                  ))}
                </div>

                <div className="cgrid">
                  {/* CAMP PANEL */}
                  <div className="panel">
                    <div className="panel-hd">
                      <h3><Radio size={15} />Campagnes Publicitaires</h3>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div className="panel-pill">
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: campOn ? "#4ade80" : "#94a3b8", display: "inline-block" }} />
                          {allCamps.filter(c => c.status === "active").length} actives
                        </div>
                        <button className="ico-btn" style={{ color: "rgba(255,255,255,.6)" }} onClick={() => { syncModule("cm"); toast("Channel Manager synchronise", "sync"); }}>
                          <RefreshCw size={14} className={syncing["cm"] ? "spin" : ""} />
                        </button>
                      </div>
                    </div>
                    <div className="itabs">
                      {[{ id: "google", l: "Google Ads" }, { id: "meta", l: "Meta Ads" }, { id: "metasearch", l: "Meta Search" }].map(t => (
                        <button key={t.id} className={`itab${innerTab === t.id ? " on" : ""}`} onClick={() => setInnerTab(t.id)}>{t.l}</button>
                      ))}
                    </div>
                    <div className="cbody">
                      <div className="clist">
                        {currentCamps.map(c => (
                          <div key={c.id} className="ci">
                            <div className="ci-top">
                              <span className="ci-name">{c.name}</span>
                              <span className="ci-budg">€{c.budget} <ChevronRight size={11} style={{ color: "var(--p3)" }} /> <span className="ci-rev">€{c.rev > 0 ? c.rev.toLocaleString() : "—"}</span></span>
                            </div>
                            <div className="ci-bot">
                              <span className={c.roas > 4 ? "roas-good" : c.roas > 2 ? "roas-ok" : "roas-bad"}>
                                {c.roas > 0 ? <><TrendingUp size={11} />{c.roas}x</> : "—"}
                              </span>
                              <div className="ci-acts">
                                <button className="ico-btn" onClick={() => toggleCamp(c.id)} title={c.status === "active" ? "Pauser" : "Activer"}>
                                  {c.status === "active" ? <Pause size={13} /> : <Play size={13} />}
                                </button>
                                <button className="ico-btn" title="Modifier"><Edit3 size={13} /></button>
                                <button className="ico-btn" title="Dupliquer"><Copy size={13} /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button className="btn-nc" onClick={() => setModal({ type: "camp" })}><Plus size={14} />Nouvelle Campagne</button>
                      </div>
                      <div className="cright">
                        <div>
                          <div className="sec-l">Comparateur de Prix</div>
                          <div className="pxcomp">
                            <div className="pxbox"><div className="pxpl"><Building2 size={11} />Booking</div><div className="pxamt">125€</div><div className="pxbdg pb-ota">OTA</div></div>
                            <div className="pxbox"><div className="pxpl"><Globe size={11} />Expedia</div><div className="pxamt">119€</div><div className="pxbdg pb-ota">OTA</div></div>
                            <div className="pxbox hl"><div className="pxpl"><Hotel size={11} />Direct</div><div className="pxamt">{price}€</div><div className="pxbdg pb-dir">-{Math.round((125 - price) / 125 * 100)}%</div></div>
                          </div>
                          <div className="px-ctrl">
                            <button className="px-cbtn" onClick={() => { setPrice(p => p - 5); toast("Tarif -5€ · sync PMS", "sync"); syncModule("pms"); }}>-5€</button>
                            <span style={{ fontSize: 11, color: "var(--t3)" }}>Tarif direct</span>
                            <button className="px-cbtn" onClick={() => { setPrice(p => p + 5); toast("Tarif +5€ · sync PMS", "sync"); syncModule("pms"); }}>+5€</button>
                          </div>
                        </div>
                        <div>
                          <div className="sec-l">Clics & Reservations</div>
                          <div className="chart-leg">
                            <div className="cl-i"><div className="cl-dot" style={{ background: "#8b5cf6" }} />Clics</div>
                            <div className="cl-i"><div className="cl-dot" style={{ background: "#059669" }} />Reservations<span className="cl-val">380</span></div>
                          </div>
                          <div className="chart-box"><LineChart d1={CLICS} d2={RESA} h={86} /></div>
                        </div>
                      </div>
                    </div>
                    <div className="stat-row">
                      <div className="stat-cell"><div className="stat-l">Taux de Conversion</div><div className="stat-v">15.5%</div></div>
                      <div className="stat-cell"><div className="stat-l">Reservations du Mois</div><div className="stat-v">860</div></div>
                    </div>
                  </div>

                  {/* IA SIDEBAR */}
                  <div className="ia-wrap">
                    {/* IA RECS */}
                    <div className="ia-panel">
                      <div className="ia-hd">
                        <h4><BrainCircuit size={15} />Recommandations IA</h4>
                        <Sparkles size={14} color="rgba(255,255,255,.6)" />
                      </div>
                      <div className="ia-body">
                        {AI_RECS.map((r, i) => (
                          <div key={i} className={`ia-rec${applied.includes(i) ? " done" : ""}`} onClick={() => applyRec(i, r.action)}>
                            <div className="ia-ico"><r.ic size={14} color={applied.includes(i) ? "#059669" : "#7c3aed"} /></div>
                            <div>
                              <div className="ia-txt">{r.t}</div>
                              <div className="ia-sub">{r.sub}</div>
                              {applied.includes(i)
                                ? <span className="ia-tag tag-ok"><Check size={9} />Applique</span>
                                : <span className={`ia-tag ${r.p === "high" ? "tag-h" : "tag-m"}`}>
                                  {r.p === "high" ? <AlertTriangle size={9} /> : <Info size={9} />}
                                  {r.p === "high" ? "Priorite haute" : "Recommande"}
                                </span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* PRICING ENGINE */}
                      <div className="px-eng">
                        <div className="px-eng-t"><Cpu size={12} />Pricing Engine IA</div>
                        {[["Occupation", "73%", "#7c3aed", 73], ["Demande", "Haute", "#059669", 80], ["Concurrence", "€178", "#d97706", 60]].map(([l, v, c, p]) => (
                          <div key={l} className="px-m">
                            <div className="px-ml"><span>{l}</span><strong style={{ color: c }}>{v}</strong></div>
                            <MBar p={p} c={c} />
                          </div>
                        ))}
                        <div className="px-res">
                          <span className="px-rl">Prix recommande</span>
                          <span className="px-rv">€{Math.round(price * 1.08)}</span>
                        </div>
                      </div>
                    </div>

                    {/* CONNECTIVITY HUB (mini) */}
                    <div className="conn-hub">
                      <div className="conn-hd"><Link size={13} color="rgba(255,255,255,.8)" /><span>Modules connectes</span></div>
                      <div className="conn-body">
                        {modules.slice(0, 5).map(m => (
                          <div key={m.id} className={`conn-row${m.status === "err" ? " err" : m.status === "warn" ? "" : ""}`}
                            onClick={() => syncModule(m.id)}>
                            <div className="conn-ico" style={{ background: m.bg }}><m.icon size={14} color={m.color} /></div>
                            <div className="conn-info">
                              <div className="conn-name">{m.name}</div>
                              <div className="conn-stat">{syncing[m.id] ? "Synchronisation..." : m.stat}</div>
                            </div>
                            <div className={`conn-dot ${syncing[m.id] ? "c-sync" : m.status === "ok" ? "c-ok" : m.status === "warn" ? "c-warn" : "c-err"}`} />
                          </div>
                        ))}
                        <button className="btn-s" style={{ width: "100%", justifyContent: "center", marginTop: 6, fontSize: 12 }} onClick={() => setTab("integrations")}>
                          <ExternalLink size={12} />Voir toutes les integrations
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ╔══════════════════════════════════════╗
                ║           ADS MANAGER                ║
                ╚══════════════════════════════════════╝ */}
            {tab === "ads" && (
              <div className="fade">
                <div className="pg-hd"><h1>Ads Manager</h1><p>Google Ads · Meta Ads · Trivago — Synchronise avec Channel Manager</p></div>
                <div className="fbar">
                  {["Toutes", "google", "meta", "trivago"].map((f, i) => (
                    <button key={f} className={`fbtn${filterCamp === f ? " on" : ""}`} onClick={() => setFilterCamp(f)}>
                      {i === 0 ? <LayoutGrid size={12} /> : i === 1 ? <Search size={12} /> : i === 2 ? <Users size={12} /> : <Globe size={12} />}
                      {i === 0 ? "Toutes" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                  <div style={{ flex: 1 }} />
                  <button className="btn-s" onClick={() => { toast("Donnees synchronisees", "sync"); syncModule("cm"); }}><RefreshCw size={13} className={syncing["cm"] ? "spin" : ""} />Synchroniser</button>
                  <button className="btn-p" onClick={() => setModal({ type: "camp" })}><Plus size={14} />Nouvelle campagne</button>
                </div>
                <div className="panel" style={{ marginBottom: 14 }}>
                  <table className="tbl">
                    <thead><tr>{["Campagne", "Plateforme", "Statut", "Budget", "Revenus", "ROAS", "Conv.", "CPC", "Actions"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {filteredCamps.map(c => (
                        <tr key={c.id}>
                          <td className="tn">{c.name}</td>
                          <td><span className={c.platform === "google" ? "pb-g" : c.platform === "meta" ? "pb-m" : "pb-t"}>{c.platform.charAt(0).toUpperCase() + c.platform.slice(1)}</span></td>
                          <td><SBadge s={c.status} /></td>
                          <td>€{c.budget.toLocaleString()}</td>
                          <td style={{ fontWeight: 600, color: "var(--tx)" }}>{c.rev > 0 ? `€${c.rev.toLocaleString()}` : "—"}</td>
                          <td><span style={{ fontWeight: 700, color: c.roas > 4 ? "var(--gn)" : c.roas > 2 ? "var(--am)" : "var(--rd)" }}>{c.roas > 0 ? `${c.roas}x` : "—"}</span></td>
                          <td>{c.conv}</td>
                          <td style={{ color: "var(--t3)" }}>€{c.cpc.toFixed(2)}</td>
                          <td>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button className="ico-btn" onClick={() => toggleCamp(c.id)} title={c.status === "active" ? "Pauser" : "Activer"}>{c.status === "active" ? <Pause size={13} /> : <Play size={13} />}</button>
                              <button className="ico-btn" title="Modifier"><Edit3 size={13} /></button>
                              <button className="ico-btn" title="Dupliquer"><Copy size={13} /></button>
                              <button className="ico-btn danger" title="Supprimer" onClick={() => { setCamps(cs => cs.filter(x => x.id !== c.id)); toast("Campagne supprimee", "error"); }}><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                  {[
                    { Icon: CreditCard, l: "Budget total",    v: `€${allCamps.reduce((a, c) => a + c.budget, 0).toLocaleString()}`, c: "#7c3aed", bg: "#ede9fe" },
                    { Icon: TrendingUp, l: "Revenus generes", v: `€${allCamps.reduce((a, c) => a + c.rev, 0).toLocaleString()}`,    c: "#059669", bg: "#d1fae5" },
                    { Icon: BarChart3,  l: "ROAS moyen",      v: (allCamps.filter(c=>c.roas>0).reduce((a,c)=>a+c.roas,0)/allCamps.filter(c=>c.roas>0).length).toFixed(1)+"x", c: "#d97706", bg: "#fef3c7" },
                    { Icon: BadgeCheck, l: "Conversions",     v: allCamps.reduce((a,c)=>a+c.conv,0),                                 c: "#2563eb", bg: "#dbeafe" },
                  ].map(({ Icon, l, v, c, bg }) => (
                    <div key={l} className="card" style={{ textAlign: "center" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}><Icon size={17} color={c} /></div>
                      <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{l}</div>
                      <div style={{ fontSize: 24, fontWeight: 600, color: c, letterSpacing: "-.05em" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Autres onglets omis pour brièveté - voir composant complet */}
            {tab === "metasearch" && (
              <div className="fade">
                <div className="pg-hd"><h1>Meta Search & Parite tarifaire</h1><p>Synchronise PMS · RMS · Channel Manager — Prix mis a jour en temps reel depuis Configuration</p></div>
                <div className="g2" style={{ marginBottom: 14 }}>
                  <div className="card">
                    <div className="card-ttl">
                      <DollarSign size={13} />Tarif direct actuel
                      {configRoomTypes?.length > 0 && (
                        <span style={{ fontSize: 10, background: 'var(--gnb)', color: 'var(--gn)', padding: '2px 8px', borderRadius: 10, marginLeft: 8, fontWeight: 600 }}>
                          VIA CONFIG
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: "center", padding: "14px 0" }}>
                      <div style={{ fontSize: 52, fontWeight: 600, color: "var(--p)", letterSpacing: "-.06em", lineHeight: 1 }}>€{price}</div>
                      <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 5 }}>/ nuit · {configRoomTypes?.[0]?.name || 'Chambre Standard'} · PMS synchronise</div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
                        {[-10, -5, +5, +10].map(d => (
                          <button key={d} className="px-cbtn" style={{ padding: "6px 14px", fontSize: 13 }}
                            onClick={() => { setPrice(p => p + d); syncModule("pms"); toast(`Tarif ${d > 0 ? "+" : ""}${d}€ · PMS mis a jour`, "sync"); }}>
                            {d > 0 ? `+${d}€` : `${d}€`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-ttl"><BarChart3 size={13} />Parite OTA en direct</div>
                    {metaPrices.map((m, i) => {
                      const diff = Math.round((price - m.ota) / m.ota * 100);
                      const st = diff < -2 ? "under" : diff > 2 ? "above" : "parity";
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--p6)" }}>
                          <span style={{ flex: 1, fontSize: 13, color: "var(--t2)", fontWeight: 500 }}>{m.ch}</span>
                          <span style={{ fontSize: 12, color: "var(--t3)" }}>€{m.ota}</span>
                          <span className={st === "under" ? "par-u" : st === "above" ? "par-a" : "par-p"}>
                            {st === "parity" ? "Parite" : st === "under" ? `-${Math.abs(diff)}%` : `+${diff}%`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {tab === "booking" && (
              <div className="fade">
                <div className="pg-hd"><h1>Booking Engine Direct</h1><p>Reservations directes · Upsell automatique · Paiement securise · Sync PMS · Connecte a Configuration</p></div>
                
                {/* ═══════════════════════════════════════════════════════════════════════════════
                    CONFIGURATION DATA SECTION - Room Types & Pricing from ConfigService
                ═══════════════════════════════════════════════════════════════════════════════ */}
                <div className="card" style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div className="card-ttl" style={{ marginBottom: 0 }}>
                      <Bed size={13} />Types de chambres & Tarifs
                      <span style={{ 
                        fontSize: 10, 
                        background: configLoading ? 'var(--amb)' : configError ? 'var(--rdb)' : 'var(--gnb)', 
                        color: configLoading ? 'var(--am)' : configError ? 'var(--rd)' : 'var(--gn)',
                        padding: '2px 8px', 
                        borderRadius: 10, 
                        marginLeft: 8,
                        fontWeight: 600
                      }}>
                        {configLoading ? 'CHARGEMENT...' : configError ? 'ERREUR' : 'DEPUIS CONFIG'}
                      </span>
                    </div>
                    <button className="btn-s" style={{ fontSize: 11, padding: "5px 11px" }} onClick={() => { refreshConfig(); toast("Configuration actualisee", "sync"); }}>
                      <RefreshCw size={12} className={configLoading ? "spin" : ""} />Sync
                    </button>
                  </div>
                  
                  {configLoading && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)' }}>
                      <Loader2 size={24} className="spin" style={{ marginBottom: 8 }} />
                      <div>Chargement depuis Configuration...</div>
                    </div>
                  )}
                  
                  {!configLoading && configRoomTypes?.length > 0 && (
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Nom</th>
                          <th>Capacite</th>
                          <th>Prix Base</th>
                          {configRatePlans?.map(rp => (
                            <th key={rp.id || rp.code}>{rp.name || rp.code}</th>
                          ))}
                          <th>Chambres</th>
                        </tr>
                      </thead>
                      <tbody>
                        {configRoomTypes.map((rt, i) => (
                          <tr key={rt.id || i}>
                            <td style={{ fontWeight: 600, color: 'var(--p)' }}>{rt.code}</td>
                            <td className="tn">{rt.name}</td>
                            <td>{rt.max_occupancy || rt.max_adults || 2} pers.</td>
                            <td style={{ fontWeight: 600, color: 'var(--tx)' }}>{rt.base_price?.toFixed(0) || '—'}€</td>
                            {configRatePlans?.map(rp => (
                              <td key={rp.id || rp.code} style={{ fontWeight: 500 }}>
                                {configPricingMatrix?.[rp.code]?.[rt.code]?.toFixed(0) || '—'}€
                              </td>
                            ))}
                            <td>
                              <span className="bdg-a" style={{ background: rt.room_count > 0 ? 'var(--gnb)' : 'var(--amb)', color: rt.room_count > 0 ? 'var(--gn)' : 'var(--am)' }}>
                                {rt.room_count || 0}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  
                  {!configLoading && (!configRoomTypes || configRoomTypes.length === 0) && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)' }}>
                      <AlertTriangle size={24} style={{ marginBottom: 8, color: 'var(--am)' }} />
                      <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: 4 }}>Aucun type de chambre configuré</div>
                      <div>Configurez vos chambres dans le module Configuration</div>
                    </div>
                  )}
                </div>

                {/* Hotel Info from Config */}
                {configHotel && (
                  <div className="card" style={{ marginBottom: 14 }}>
                    <div className="card-ttl"><Hotel size={13} />Informations Hôtel (depuis Configuration)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                      <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
                        <div className="info-l">Établissement</div>
                        <div className="info-v">{configHotel.name?.replace('TEST_', '')}</div>
                      </div>
                      <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
                        <div className="info-l">Devise</div>
                        <div className="info-v">{configHotel.currency || 'EUR'}</div>
                      </div>
                      <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
                        <div className="info-l">Check-in</div>
                        <div className="info-v">{configHotel.check_in_time || '15:00'}</div>
                      </div>
                      <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
                        <div className="info-l">Check-out</div>
                        <div className="info-v">{configHotel.check_out_time || '11:00'}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Original content: Offers & Upsells */}
                <div className="g2" style={{ marginBottom: 14 }}>
                  <div className="card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div className="card-ttl" style={{ marginBottom: 0 }}><Gift size={13} />Offres & codes promo</div>
                      <button className="btn-p" style={{ fontSize: 11, padding: "5px 11px" }} onClick={() => setModal({ type: "offre" })}><Plus size={12} />Creer</button>
                    </div>
                    {offres.map((o, i) => (
                      <div key={i} className="orow">
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--p5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Tag size={14} color="#7c3aed" /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)", letterSpacing: "-.01em" }}>{o.n}</div>
                          <div style={{ fontSize: 11, color: "var(--t3)" }}>Code: <span style={{ color: "var(--p)", fontWeight: 600 }}>{o.code}</span> · {o.used}x utilise</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gn)", letterSpacing: "-.02em" }}>{o.conv}</div>
                          <div style={{ fontSize: 10, color: "var(--t3)" }}>conv.</div>
                        </div>
                        <button className={`tgl${o.active ? " on" : ""}`}
                          onClick={() => setOffres(os => os.map((x, j) => j === i ? { ...x, active: !x.active } : x))} />
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <div className="card-ttl"><TrendingUp size={13} />Upsell automatique</div>
                    {upsells.map((u, i) => (
                      <div key={i} className="orow">
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: u.on ? "var(--p5)" : "var(--bd)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Sparkles size={14} color={u.on ? "#7c3aed" : "#9991b8"} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)", letterSpacing: "-.01em" }}>{u.n}</div>
                          <div style={{ fontSize: 11.5, color: "var(--p)", fontWeight: 600 }}>{u.price}</div>
                        </div>
                        <div style={{ textAlign: "right", marginRight: 10 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t2)", letterSpacing: "-.02em" }}>{u.accepted}</div>
                          <div style={{ fontSize: 10, color: "var(--t3)" }}>accepte</div>
                        </div>
                        <button className={`tgl${u.on ? " on" : ""}`} onClick={() => setUpsells(us => us.map((x, j) => j === i ? { ...x, on: !x.on } : x))} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(tab === "crm" || tab === "seo" || tab === "reporting" || tab === "integrations") && (
              <div className="fade">
                <div className="pg-hd">
                  <h1>{tab === "crm" ? "CRM & Email" : tab === "seo" ? "SEO & Contenu" : tab === "reporting" ? "Reporting" : "Integrations"}</h1>
                  <p>Module en cours de developpement</p>
                </div>
                <div className="card">
                  <div className="empty">
                    <Sparkles size={32} color="var(--p3)" style={{ marginBottom: 12 }} />
                    <div style={{ fontWeight: 600, color: "var(--tx)", marginBottom: 4 }}>Bientot disponible</div>
                    <div>Ce module sera active prochainement</div>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* ── MODAL CAMPAGNE ── */}
      {modal?.type === "camp" && (
        <Modal title="Nouvelle campagne publicitaire" onClose={() => setModal(null)}>
          <div className="ff"><label className="fl">Nom de la campagne</label><input className="fi" placeholder="Ex: Promo ete Paris" value={newCamp.name} onChange={e => setNewCamp(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="ff"><label className="fl">Plateforme</label>
            <select className="fsel" value={newCamp.platform} onChange={e => setNewCamp(p => ({ ...p, platform: e.target.value }))}>
              <option value="google">Google Ads</option><option value="meta">Meta Ads</option><option value="trivago">Trivago</option>
            </select>
          </div>
          <div className="ff"><label className="fl">Budget mensuel (€)</label><input className="fi" type="number" placeholder="1000" value={newCamp.budget} onChange={e => setNewCamp(p => ({ ...p, budget: e.target.value }))} /></div>
          <div className="ff"><label className="fl">Objectif</label>
            <select className="fsel" value={newCamp.obj} onChange={e => setNewCamp(p => ({ ...p, obj: e.target.value }))}>
              <option value="conversion">Conversions (reservations)</option><option value="notoriete">Notoriete</option><option value="trafic">Trafic site</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button className="btn-s" style={{ flex: 1, justifyContent: "center" }} onClick={() => setModal(null)}>Annuler</button>
            <button className="btn-p" style={{ flex: 2, justifyContent: "center" }} onClick={createCamp}><Rocket size={14} />Lancer la campagne</button>
          </div>
        </Modal>
      )}

      {/* ── MODAL OFFRE ── */}
      {modal?.type === "offre" && (
        <Modal title="Creer une offre promotionnelle" onClose={() => setModal(null)}>
          <div className="ff"><label className="fl">Nom de l'offre</label><input className="fi" placeholder="Ex: Week-end Romantique" value={newOffre.name} onChange={e => setNewOffre(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="ff"><label className="fl">Code promo</label><input className="fi" placeholder="PROMO20" value={newOffre.code} onChange={e => setNewOffre(p => ({ ...p, code: e.target.value.toUpperCase() }))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="ff"><label className="fl">Reduction</label><input className="fi" type="number" placeholder="15" value={newOffre.discount} onChange={e => setNewOffre(p => ({ ...p, discount: e.target.value }))} /></div>
            <div className="ff"><label className="fl">Type</label>
              <select className="fsel" value={newOffre.type} onChange={e => setNewOffre(p => ({ ...p, type: e.target.value }))}>
                <option value="pct">% de reduction</option><option value="eur">€ de reduction</option><option value="nuit">Nuit gratuite</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button className="btn-s" style={{ flex: 1, justifyContent: "center" }} onClick={() => setModal(null)}>Annuler</button>
            <button className="btn-p" style={{ flex: 2, justifyContent: "center" }} onClick={createOffre}><Gift size={14} />Creer l'offre</button>
          </div>
        </Modal>
      )}

      {/* ── TOASTS ── */}
      <div style={{ position: "fixed", bottom: 22, right: 22, display: "flex", flexDirection: "column", gap: 8, zIndex: 999, alignItems: "flex-end" }}>
        {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} onDone={() => removeToast(t.id)} />)}
      </div>
    </>
  );
}

export default BookingEngine;
