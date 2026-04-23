import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

// ─── DEFAULT CATEGORIES ───────────────────────────────────────────────────────
// Stored as [{name, color}]. The isTransfer flag — not the category name —
// drives exclusion from charts and budget tracking.
const DEFAULT_CATEGORIES = [
  { name:"Groceries",          color:"#34d399" },
  { name:"Dining & Takeaways", color:"#fbbf24" },
  { name:"Transport",          color:"#60a5fa" },
  { name:"Utilities & Bills",  color:"#a78bfa" },
  { name:"Health & Medical",   color:"#f87171" },
  { name:"Entertainment",      color:"#f472b6" },
  { name:"Shopping",           color:"#fb923c" },
  { name:"Personal Care",      color:"#22d3ee" },
  { name:"Education",          color:"#a3e635" },
  { name:"Travel",             color:"#818cf8" },
  { name:"Income",             color:"#10b981" },
  { name:"Savings & Transfers",color:"#475569" },
  { name:"Other",              color:"#64748b" },
];
const EXTRA_COLORS = ["#e879f9","#38bdf8","#fb7185","#4ade80","#facc15","#c084fc","#f97316"];
const ACCOUNT_COLORS = ["#10b981","#60a5fa","#f472b6","#fbbf24","#a78bfa","#fb923c"];

const C = {
  bg:"#060d1a", surface:"#0c1526", card:"#111e33",
  border:"#1a2d4a", accent:"#10b981", accentDim:"#065f46",
  text:"#e2e8f0", muted:"#64748b", subtle:"#94a3b8",
  red:"#f87171", amber:"#fbbf24",
};

const SK = {
  txns:      "pfa-v3-transactions",
  mm:        "pfa-v3-merchants",
  budgets:   "pfa-v3-budgets",
  accounts:  "pfa-v3-accounts",
  categories:"pfa-v3-categories",
};

// ─── STORAGE ──────────────────────────────────────────────────────────────────
async function sGet(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function sSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch(e) { console.error("storage write failed", e); }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt        = n => `$${Math.abs(n).toLocaleString("en-NZ",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtMonth   = m => { if(!m)return""; const [y,mo]=m.split("-"); return new Date(+y,+mo-1,1).toLocaleString("en-NZ",{month:"long",year:"numeric"}); };
const fmtMonthSh = m => { if(!m)return""; const [y,mo]=m.split("-"); return new Date(+y,+mo-1,1).toLocaleString("en-NZ",{month:"short"})+" '"+y.slice(2); };
const getCatColor = (name, cats) => cats.find(c=>c.name===name)?.color || "#64748b";

// ─── CSV PARSING ──────────────────────────────────────────────────────────────
function parseAccountName(lines, aliases={}) {
  const line = (lines[1]||"").replace(/,+$/,"").trim();
  if (line.includes("Account") && line.includes("Branch")) {
    const nick = line.match(/\(([^)]+)\)/)?.[1]?.trim() || null;
    const num  = line.match(/Account\s+([\w-]+)/)?.[1]?.trim() || null;
    const short   = nick || num || line.slice(0,20);
    const baseDisplay = nick && num ? `${nick} ···${num.slice(-6)}` : (nick || num || line.slice(0,30));
    const display = aliases[short] || baseDisplay;
    return { short, display };
  }
  const short = "Main";
  return { short, display: aliases[short] || "Main Account" };
}

function parseDate(raw) {
  raw = raw.trim();
  if (/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(raw)) return raw.replace(/\//g,"-");
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [d,m,y] = raw.split("/");
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  return null;
}

function parseCSVLine(line) {
  const r=[]; let cur="",inQ=false;
  for(const c of line){ if(c==='"')inQ=!inQ; else if(c===","&&!inQ){r.push(cur.trim());cur="";}else cur+=c; }
  r.push(cur.trim()); return r;
}

function parseCSV(text, aliases={}) {
  const lines = text.split(/\r?\n/);
  const acct  = parseAccountName(lines, aliases);
  const headerIdx = lines.findIndex(l=>l.startsWith("Date,"));
  if (headerIdx===-1) throw new Error("Can't find transaction headers. Is this an ASB CSV?");
  const txns=[];
  for(let i=headerIdx+1;i<lines.length;i++){
    const line=lines[i].trim(); if(!line)continue;
    const f=parseCSVLine(line); if(f.length<7)continue;
    const [dateRaw,uniqueId,type,,payee,memo,amtRaw]=f;
    const amount=parseFloat(amtRaw);
    const iso=parseDate(dateRaw);
    if(isNaN(amount)||!iso)continue;
    const [y,m]=iso.split("-");
    const uid=(uniqueId||"").trim()||`${iso}-${i}`;
    txns.push({
      id:`${acct.short}::${uid}`, date:iso, month:`${y}-${m}`,
      type:type?.trim()||"", payee:payee||"", memo:memo||"",
      amount, isCredit:amount>0,
      account:acct.display, accountShort:acct.short,
      category:null, isTransfer:false,
    });
  }
  return { txns, account: acct };
}

// ─── TRANSFER DETECTION ───────────────────────────────────────────────────────
// IMPORTANT: The isTransfer flag — not the category name — is the sole driver
// of exclusion from dashboard charts and budget tracking.
function detectTransfers(allTxns) {
  if([...new Set(allTxns.map(t=>t.accountShort))].length<2) return allTxns;
  const lookup={};
  allTxns.forEach(t=>{
    const key=`${t.date}::${Math.abs(t.amount).toFixed(2)}`;
    (lookup[key]=lookup[key]||[]).push(t);
  });
  const ids=new Set();
  Object.values(lookup).forEach(group=>{
    const debits=group.filter(t=>!t.isCredit);
    const credits=group.filter(t=>t.isCredit);
    debits.forEach(d=>credits.forEach(c=>{
      if(d.accountShort!==c.accountShort){ids.add(d.id);ids.add(c.id);}
    }));
  });
  return allTxns.map(t=>ids.has(t.id)?{...t,category:"Savings & Transfers",isTransfer:true}:t);
}

// ─── AI ───────────────────────────────────────────────────────────────────────
async function categorise(txns, mm, accountShorts, categories) {
  const unknown=txns.filter(t=>!t.category&&!t.isTransfer);
  if(!unknown.length)return{};
  const catNames=categories.map(c=>c.name).join(", ");
  const resp=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514",max_tokens:1500,
      messages:[{role:"user",content:
        `Categorise these NZ ASB bank transactions.\nCategories: ${catNames}\n\nRules:\n- Credits/wages/salary/govt payments -> Income\n- Transfers to own accounts (${accountShorts.join(", ")}) -> Savings & Transfers\n- IRD/Inland Revenue -> Utilities & Bills\n- Countdown/Pak'nSave/New World/Woolworths/Farro -> Groceries\n- Cafes/restaurants/takeaways/Uber Eats/DoorDash -> Dining & Takeaways\n- Petrol/parking/Uber/public transport/AT HOP -> Transport\n- Power/water/internet/phone/insurance -> Utilities & Bills\n- Pharmacy/medical/dental/physio/chiro -> Health & Medical\n\nTransactions (id|account|payee|memo|amount):\n${unknown.map(t=>`${t.id}|${t.accountShort}|${t.payee}|${t.memo}|${t.amount}`).join("\n")}\n\nReply ONLY with valid JSON: {"id":"category"}`
      }]
    })
  });
  if(!resp.ok)throw new Error(`API error ${resp.status}`);
  const data=await resp.json();
  const txt=data.content.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
  try{return JSON.parse(txt);}catch{return{};}
}

async function askAI(question, history, txns, budgets, categories) {
  const accts=[...new Set(txns.map(t=>t.account))];
  const months=[...new Set(txns.map(t=>t.month))].sort();
  let summary=`Accounts: ${accts.join(", ")}\nMonths: ${months.join(", ")}\n\n`;
  months.forEach(mo=>{
    summary+=`=== ${mo} ===\n`;
    accts.forEach(acc=>{
      const at=txns.filter(t=>t.month===mo&&t.account===acc&&!t.isTransfer);
      if(!at.length)return;
      summary+=`  ${acc}: Income $${at.filter(t=>t.isCredit).reduce((s,t)=>s+t.amount,0).toFixed(2)}, Spend $${at.filter(t=>!t.isCredit).reduce((s,t)=>s+Math.abs(t.amount),0).toFixed(2)}\n`;
      categories.filter(c=>c.name!=="Income").forEach(cat=>{
        const v=at.filter(t=>t.category===cat.name&&!t.isCredit).reduce((s,t)=>s+Math.abs(t.amount),0);
        if(v>0)summary+=`    ${cat.name}: $${v.toFixed(2)}\n`;
      });
    });
  });
  if(Object.keys(budgets).length){
    summary+="\nMonthly Budgets:\n";
    Object.entries(budgets).forEach(([k,v])=>summary+=`  ${k}: $${v}\n`);
  }
  const resp=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514",max_tokens:1200,
      system:`You are a personal finance assistant for a New Zealand user with ASB bank accounts. Their financial data:\n\n${summary}\n\nAnswer concisely in NZD. Note which account when relevant. Inter-account transfers (isTransfer:true) are excluded from all spending totals.`,
      messages:[...history,{role:"user",content:question}]
    })
  });
  if(!resp.ok)throw new Error(`API error ${resp.status}`);
  const data=await resp.json();
  return data.content.map(b=>b.text||"").join("");
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
const Card=({children,style={}})=>(
  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"20px 24px",...style}}>{children}</div>
);
const Stat=({label,value,sub,color=C.text})=>(
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600}}>{label}</div>
    <div style={{fontSize:22,fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:C.muted,fontFamily:"'JetBrains Mono',monospace",marginTop:3}}>{sub}</div>}
  </div>
);
const Tag=({children,color=C.accent})=>(
  <span style={{fontSize:11,background:`${color}22`,color,border:`1px solid ${color}44`,borderRadius:6,padding:"2px 8px",fontWeight:600,whiteSpace:"nowrap"}}>{children}</span>
);
const Pill=({children,active,color=C.accent,onClick})=>(
  <button onClick={onClick} style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",border:`1px solid ${active?color:C.border}`,background:active?`${color}22`:"transparent",color:active?color:C.muted,fontFamily:"inherit"}}>{children}</button>
);

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({tab,setTab,onUpload,uploadStatus,txnCount,accountList,onRenameAccount}){
  const fileRef=useRef();
  const [editingShort,setEditingShort]=useState(null);
  const [editVal,setEditVal]=useState("");
  const nav=[
    {id:"dashboard",icon:"⬡",label:"Dashboard"},
    {id:"transactions",icon:"≡",label:"Transactions"},
    {id:"chat",icon:"◎",label:"AI Chat"},
    {id:"settings",icon:"◈",label:"Settings"},
  ];

  const startEdit=(short,display)=>{ setEditingShort(short); setEditVal(display); };
  const commitEdit=(short)=>{
    const v=editVal.trim().slice(0,20);
    if(v)onRenameAccount(short,v);
    setEditingShort(null);
  };

  return(
    <aside style={{width:224,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",height:"100vh",position:"sticky",top:0,flexShrink:0}}>
      <div style={{padding:"28px 20px 16px"}}>
        <div style={{fontSize:11,color:C.accent,letterSpacing:"0.15em",fontWeight:700,textTransform:"uppercase"}}>Finance</div>
        <div style={{fontSize:22,fontWeight:700,color:C.text,lineHeight:1.1,marginTop:2}}>Analyser</div>
        <div style={{fontSize:11,color:C.muted,marginTop:4}}>{txnCount} transactions</div>
      </div>

      {accountList.length>0&&(
        <div style={{padding:"0 16px 14px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,fontWeight:600}}>Accounts</div>
          {accountList.map((acct,i)=>(
            <div key={acct.short} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:ACCOUNT_COLORS[i%ACCOUNT_COLORS.length],flexShrink:0}}/>
              {editingShort===acct.short?(
                <input
                  value={editVal}
                  onChange={e=>setEditVal(e.target.value.slice(0,20))}
                  onBlur={()=>commitEdit(acct.short)}
                  onKeyDown={e=>{if(e.key==="Enter")commitEdit(acct.short);if(e.key==="Escape")setEditingShort(null);}}
                  autoFocus
                  style={{flex:1,background:C.card,border:`1px solid ${C.accent}`,borderRadius:5,padding:"2px 6px",color:C.text,fontSize:12,outline:"none",fontFamily:"inherit"}}
                />
              ):(
                <span style={{flex:1,fontSize:12,color:C.subtle,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{acct.display}</span>
              )}
              {editingShort!==acct.short&&(
                <button onClick={()=>startEdit(acct.short,acct.display)} title="Rename account"
                  style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:12,padding:"1px 3px",lineHeight:1,flexShrink:0}}>✎</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{padding:"12px 14px"}}>
        <button onClick={()=>fileRef.current.click()} style={{width:"100%",background:C.accent,color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:"inherit"}}>
          <span style={{fontSize:16}}>↑</span> Upload CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" multiple style={{display:"none"}}
          onChange={e=>{if(e.target.files.length){onUpload(Array.from(e.target.files));e.target.value="";}}}/>
        {uploadStatus&&(
          <div style={{marginTop:8,fontSize:12,color:uploadStatus.type==="error"?C.red:uploadStatus.type==="success"?C.accent:C.muted,lineHeight:1.4}}>
            {uploadStatus.type==="loading"&&"⟳ "}{uploadStatus.msg}
          </div>
        )}
        <div style={{fontSize:10,color:C.muted,marginTop:6,lineHeight:1.4}}>Select multiple files to import all accounts at once</div>
      </div>

      <nav style={{flex:1,padding:"0 10px"}}>
        {nav.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"none",cursor:"pointer",textAlign:"left",background:tab===n.id?`${C.accent}18`:"transparent",color:tab===n.id?C.accent:C.subtle,fontSize:14,fontWeight:tab===n.id?600:400,marginBottom:2,fontFamily:"inherit"}}>
            <span style={{fontSize:16}}>{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>
      <div style={{padding:"16px 20px",fontSize:11,color:C.muted,borderTop:`1px solid ${C.border}`}}>ASB Bank · NZD</div>
    </aside>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({txns,months,selectedMonths,setSelectedMonths,budgets,accountList,categories}){
  const [acctFilter,setAcctFilter]=useState("all");

  // Toggle a month on/off; must always keep at least one selected
  const toggleMonth=m=>setSelectedMonths(prev=>{
    if(prev.includes(m))return prev.length>1?prev.filter(x=>x!==m):prev;
    return [...prev,m].sort();
  });

  const multiMonth=selectedMonths.length>1;
  const n=selectedMonths.length;

  // Transactions for selected months + account filter
  const selTxns=txns.filter(t=>
    selectedMonths.includes(t.month)&&(acctFilter==="all"||t.account===acctFilter)
  );
  // Real = non-transfer. Exclusion is driven by isTransfer flag, not category name.
  const real=selTxns.filter(t=>!t.isTransfer);
  const spend=real.filter(t=>!t.isCredit).reduce((s,t)=>s+Math.abs(t.amount),0);
  const income=real.filter(t=>t.isCredit).reduce((s,t)=>s+t.amount,0);
  const net=income-spend;
  const transferAmt=selTxns.filter(t=>t.isTransfer&&!t.isCredit).reduce((s,t)=>s+Math.abs(t.amount),0);

  // Spending by category — exclude isTransfer transactions and Income category
  const catData=categories
    .filter(c=>c.name!=="Income")
    .map(c=>({
      name:c.name, color:c.color,
      value:real.filter(t=>t.category===c.name&&!t.isCredit).reduce((s,t)=>s+Math.abs(t.amount),0)
    }))
    .filter(d=>d.value>0)
    .sort((a,b)=>b.value-a.value);

  // Per-account breakdown
  const acctBreakdown=accountList.map((acct,i)=>{
    const at=txns.filter(t=>selectedMonths.includes(t.month)&&t.accountShort===acct.short&&!t.isTransfer);
    return{...acct,color:ACCOUNT_COLORS[i%ACCOUNT_COLORS.length],
      income:at.filter(t=>t.isCredit).reduce((s,t)=>s+t.amount,0),
      spend:at.filter(t=>!t.isCredit).reduce((s,t)=>s+Math.abs(t.amount),0)};
  });

  // Trends — mark which months are selected for highlighting
  const trendData=months.map(m=>{
    const mt=txns.filter(t=>t.month===m&&(acctFilter==="all"||t.account===acctFilter)&&!t.isTransfer);
    return{
      month:fmtMonthSh(m),
      spend:mt.filter(t=>!t.isCredit).reduce((s,t)=>s+Math.abs(t.amount),0),
      income:mt.filter(t=>t.isCredit).reduce((s,t)=>s+t.amount,0),
      sel:selectedMonths.includes(m),
    };
  });

  // Budget vs actual — isTransfer excluded via `real`
  const budgetData=Object.entries(budgets)
    .map(([cat,budget])=>({
      cat,budget:+budget,
      actual:real.filter(t=>t.category===cat&&!t.isCredit).reduce((s,t)=>s+Math.abs(t.amount),0)
    }))
    .filter(d=>d.budget>0);

  const top5=[...real].filter(t=>!t.isCredit).sort((a,b)=>a.amount-b.amount).slice(0,5);

  if(!txns.length)return(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,color:C.muted}}>
      <div style={{fontSize:48}}>⬡</div>
      <div style={{fontSize:20,color:C.subtle,fontWeight:500}}>No data yet</div>
      <div style={{fontSize:14,textAlign:"center",maxWidth:340}}>Upload your ASB CSV exports. Select multiple files at once to import all accounts together.</div>
    </div>
  );

  const headingText=multiMonth
    ?`${selectedMonths.map(m=>fmtMonthSh(m)).join(" · ")}`
    :fmtMonth(selectedMonths[0]||months[0]);

  return(
    <div style={{flex:1,overflowY:"auto",padding:28}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16,gap:12,flexWrap:"wrap"}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:0,lineHeight:1.3}}>{headingText}</h1>
          {multiMonth&&<div style={{fontSize:11,color:C.muted,marginTop:3}}>{n} months selected · click to deselect</div>}
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {months.map(m=><Pill key={m} active={selectedMonths.includes(m)} onClick={()=>toggleMonth(m)}>{fmtMonthSh(m)}</Pill>)}
        </div>
      </div>

      {/* Account filter pills */}
      {accountList.length>1&&(
        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
          <Pill active={acctFilter==="all"} onClick={()=>setAcctFilter("all")}>All Accounts</Pill>
          {accountList.map((a,i)=>(
            <Pill key={a.short} active={acctFilter===a.display} color={ACCOUNT_COLORS[i%ACCOUNT_COLORS.length]}
              onClick={()=>setAcctFilter(prev=>prev===a.display?"all":a.display)}>{a.display}</Pill>
          ))}
        </div>
      )}

      {/* Summary stats — show monthly average when multiple months selected */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:16}}>
        <Card><Stat label="Income" value={fmt(income)} color={C.accent} sub={multiMonth?`avg ${fmt(income/n)}/mo`:undefined}/></Card>
        <Card><Stat label="Spent"  value={fmt(spend)}  color={C.red}    sub={multiMonth?`avg ${fmt(spend/n)}/mo`:undefined}/></Card>
        <Card><Stat label="Net"    value={`${net>=0?"+":""}${fmt(net)}`} color={net>=0?C.accent:C.red} sub={multiMonth?`avg ${net>=0?"+":""}${fmt(net/n)}/mo`:undefined}/></Card>
        <Card><Stat label="Transactions" value={selTxns.length} color={C.text}/></Card>
      </div>

      {transferAmt>0&&(
        <div style={{fontSize:12,color:C.muted,marginBottom:16,padding:"8px 14px",background:`${C.accent}08`,border:`1px solid ${C.accent}22`,borderRadius:8}}>
          ↔ {fmt(transferAmt)} in inter-account transfers detected and excluded from all totals.
        </div>
      )}

      {/* Per-account breakdown */}
      {acctFilter==="all"&&accountList.length>1&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:16}}>
          {acctBreakdown.map(({short,display,color,income:ai,spend:as})=>(
            <Card key={short} style={{borderColor:`${color}33`}}>
              <div style={{fontSize:11,fontWeight:700,color,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:color,flexShrink:0}}/>{display}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:C.muted}}>In</span><span style={{fontFamily:"monospace",color:C.accent}}>{fmt(ai)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:C.muted}}>Out</span><span style={{fontFamily:"monospace",color:C.red}}>{fmt(as)}</span></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Charts */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <Card>
          <div style={{fontSize:13,fontWeight:600,color:C.subtle,marginBottom:16}}>Spending by Category</div>
          {catData.length?(
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={2} dataKey="value">
                    {catData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip formatter={v=>[fmt(v),"Spend"]} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexWrap:"wrap",gap:"5px 10px"}}>
                {catData.slice(0,7).map(d=>(
                  <div key={d.name} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.muted}}>
                    <div style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0}}/>
                    <span>{d.name}</span>
                    <span style={{fontFamily:"monospace",color:C.subtle}}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ):(
            <div style={{color:C.muted,fontSize:13,textAlign:"center",padding:"40px 0"}}>No expense data for selected period</div>
          )}
        </Card>

        <Card>
          <div style={{fontSize:13,fontWeight:600,color:C.subtle,marginBottom:16}}>Largest Expenses</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {top5.length?top5.map(t=>{
              const idx=accountList.findIndex(a=>a.short===t.accountShort);
              const ac=ACCOUNT_COLORS[Math.max(0,idx)%ACCOUNT_COLORS.length];
              return(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:C.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.payee||t.memo||"Unknown"}</div>
                    <div style={{fontSize:11,color:C.muted,display:"flex",gap:6}}>
                      <span>{t.date}</span>
                      {accountList.length>1&&<span style={{color:ac}}>· {t.account}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:C.red,fontWeight:500}}>{fmt(t.amount)}</span>
                    {t.category&&<Tag color={getCatColor(t.category,categories)}>{t.category}</Tag>}
                  </div>
                </div>
              );
            }):<div style={{color:C.muted,fontSize:13,padding:"20px 0"}}>No expenses for selected period</div>}
          </div>
        </Card>
      </div>

      {/* Monthly Trends — unselected months are dimmed */}
      {trendData.length>1&&(
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,color:C.subtle,marginBottom:16}}>
            Monthly Trends{multiMonth?" — highlighted months are in selection":""}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="month" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={v=>[fmt(v)]} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text}}/>
              <Legend wrapperStyle={{fontSize:12,color:C.muted}}/>
              <Bar dataKey="income" name="Income" radius={[4,4,0,0]}>
                {trendData.map((d,i)=><Cell key={i} fill={C.accent} opacity={multiMonth&&!d.sel?0.25:1}/>)}
              </Bar>
              <Bar dataKey="spend" name="Spend" radius={[4,4,0,0]}>
                {trendData.map((d,i)=><Cell key={i} fill={C.red} opacity={multiMonth&&!d.sel?0.25:1}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Budget vs Actual — isTransfer excluded via `real`, scales with multi-month */}
      {budgetData.length>0&&(
        <Card>
          <div style={{fontSize:13,fontWeight:600,color:C.subtle,marginBottom:16}}>
            Budget vs Actual{multiMonth?` (${n}-month total)`:""}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {budgetData.map(d=>{
              const limit=multiMonth?d.budget*n:d.budget;
              const pct=Math.min((d.actual/limit)*100,100);
              const over=d.actual>limit;
              return(
                <div key={d.cat}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                    <span style={{color:C.subtle,fontWeight:500}}>{d.cat}</span>
                    <span style={{fontFamily:"monospace",color:over?C.red:C.muted}}>
                      {fmt(d.actual)}<span style={{color:C.muted}}> / {fmt(limit)}</span>
                    </span>
                  </div>
                  <div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:over?C.red:C.accent,borderRadius:3,transition:"width 0.5s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
function Transactions({txns,accountList,categories,onBulkCategoryChange}){
  const [search,setSearch]=useState("");
  const [filterCat,setFilterCat]=useState("all");
  const [filterMonth,setFilterMonth]=useState("all");
  const [filterAccount,setFilterAccount]=useState("all");
  const [showTransfers,setShowTransfers]=useState(false);
  const [toast,setToast]=useState(null);

  const months=[...new Set(txns.map(t=>t.month))].sort().reverse();

  const filtered=txns.filter(t=>{
    if(!showTransfers&&t.isTransfer)return false;
    if(filterMonth!=="all"&&t.month!==filterMonth)return false;
    if(filterAccount!=="all"&&t.account!==filterAccount)return false;
    if(filterCat!=="all"&&t.category!==filterCat)return false;
    const q=search.toLowerCase();
    if(q&&!t.payee.toLowerCase().includes(q)&&!t.memo.toLowerCase().includes(q))return false;
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date));

  const handleCategoryChange=(id,cat)=>{
    const source=txns.find(t=>t.id===id);
    if(!source)return;
    const payee=source.payee.toLowerCase();
    // Partial payee match: update any transaction where payees share a substring
    const updated=txns.map(t=>{
      if(t.isTransfer)return t;
      const tp=t.payee.toLowerCase();
      if(tp.includes(payee)||payee.includes(tp))return{...t,category:cat};
      return t;
    });
    const changedCount=updated.filter((t,i)=>t.category!==txns[i].category).length;
    onBulkCategoryChange(updated);
    if(changedCount>1){
      const msg=`Updated ${changedCount} transactions matching "${source.payee}"`;
      setToast(msg);
      setTimeout(()=>setToast(null),4000);
    }
  };

  const sel={background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:12,outline:"none",fontFamily:"inherit"};

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"20px 28px 0",flexShrink:0}}>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text,margin:"0 0 14px"}}>Transactions</h1>
        <div style={{display:"flex",gap:8,marginBottom:toast?8:14,flexWrap:"wrap",alignItems:"center"}}>
          <input placeholder="Search payee / memo..." value={search} onChange={e=>setSearch(e.target.value)} style={{...sel,width:200}}/>
          <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={sel}>
            <option value="all">All months</option>
            {months.map(m=><option key={m} value={m}>{fmtMonth(m)}</option>)}
          </select>
          {accountList.length>1&&(
            <select value={filterAccount} onChange={e=>setFilterAccount(e.target.value)} style={sel}>
              <option value="all">All accounts</option>
              {accountList.map(a=><option key={a.short} value={a.display}>{a.display}</option>)}
            </select>
          )}
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={sel}>
            <option value="all">All categories</option>
            {categories.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <label style={{fontSize:12,color:C.muted,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
            <input type="checkbox" checked={showTransfers} onChange={e=>setShowTransfers(e.target.checked)} style={{accentColor:C.accent}}/> Show transfers
          </label>
          <span style={{fontSize:12,color:C.muted,marginLeft:"auto"}}>{filtered.length} rows</span>
        </div>
        {toast&&(
          <div style={{marginBottom:10,fontSize:12,color:C.accent,background:`${C.accent}11`,border:`1px solid ${C.accent}33`,borderRadius:7,padding:"7px 14px"}}>
            ✓ {toast}
          </div>
        )}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"0 28px 28px"}}>
        <table style={{width:"100%",borderCollapse:"separate",borderSpacing:"0 3px"}}>
          <thead>
            <tr>
              {["Date",accountList.length>1?"Account":"","Payee / Memo","Amount","Category"].filter(Boolean).map(h=>(
                <th key={h} style={{textAlign:"left",fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600,padding:"0 10px 8px"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t=>{
              const idx=accountList.findIndex(a=>a.short===t.accountShort);
              const ac=ACCOUNT_COLORS[Math.max(0,idx)%ACCOUNT_COLORS.length];
              const cc=getCatColor(t.category,categories);
              return(
                <tr key={t.id} style={{background:t.isTransfer?`${C.muted}08`:C.card,opacity:t.isTransfer?0.65:1}}>
                  <td style={{padding:"9px 10px",borderRadius:"8px 0 0 8px",fontSize:12,color:C.muted,fontFamily:"monospace",whiteSpace:"nowrap"}}>{t.date}</td>
                  {accountList.length>1&&(
                    <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>
                      <span style={{fontSize:11,color:ac,background:`${ac}18`,border:`1px solid ${ac}33`,borderRadius:5,padding:"2px 7px",fontWeight:600}}>{t.account}</span>
                    </td>
                  )}
                  <td style={{padding:"9px 10px",maxWidth:240}}>
                    <div style={{fontSize:13,color:t.isTransfer?C.muted:C.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.payee||"—"}</div>
                    {t.memo&&<div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.memo}</div>}
                  </td>
                  <td style={{padding:"9px 10px",fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:500,color:t.isCredit?C.accent:C.red,whiteSpace:"nowrap"}}>
                    {t.isCredit?"+":""}{fmt(t.amount)}{t.isTransfer&&<span style={{fontSize:10,color:C.muted,marginLeft:6}}>↔</span>}
                  </td>
                  <td style={{padding:"9px 10px",borderRadius:"0 8px 8px 0"}}>
                    {t.isTransfer?(
                      <Tag color={C.muted}>Transfer</Tag>
                    ):(
                      <select value={t.category||""} onChange={e=>handleCategoryChange(t.id,e.target.value)}
                        style={{background:"transparent",border:`1px solid ${t.category?cc+"55":C.border}`,borderRadius:6,padding:"3px 6px",fontSize:11,color:t.category?cc:C.muted,cursor:"pointer",fontFamily:"inherit",outline:"none"}}>
                        <option value="">Uncategorised</option>
                        {categories.map(c=><option key={c.name} value={c.name} style={{background:C.card,color:C.text}}>{c.name}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length&&<div style={{textAlign:"center",color:C.muted,padding:"40px 0",fontSize:14}}>No transactions found.</div>}
      </div>
    </div>
  );
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────
// messages state is lifted to App so it survives tab switches (session only, not persisted).
function Chat({txns,budgets,categories,messages,setMessages}){
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef();

  const suggestions=[
    "How much did I spend last month across all accounts?",
    "Which account has the highest expenses?",
    "What is my biggest spending category?",
    "Where can I save $200/month?",
  ];

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const send=async(text)=>{
    const q=(text||input).trim(); if(!q||loading)return;
    setInput("");
    const newMsgs=[...messages,{role:"user",content:q}];
    setMessages(newMsgs);
    setLoading(true);
    try{
      const history=newMsgs.slice(1).map(m=>({role:m.role,content:m.content}));
      const reply=await askAI(q,history.slice(0,-1),txns,budgets,categories);
      setMessages(prev=>[...prev,{role:"assistant",content:reply}]);
    }catch(e){
      setMessages(prev=>[...prev,{role:"assistant",content:`Error: ${e.message}`}]);
    }
    setLoading(false);
  };

  if(!txns.length)return(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:C.muted}}>
      <div style={{fontSize:40}}>◎</div>
      <div style={{fontSize:14}}>Upload transactions first.</div>
    </div>
  );

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"20px 28px 0",flexShrink:0}}>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text,margin:"0 0 4px"}}>AI Chat</h1>
        <div style={{fontSize:13,color:C.muted,marginBottom:16}}>Ask anything about your finances across all accounts</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 28px"}}>
        {messages.map((m,i)=>(
          <div key={i} style={{display:"flex",gap:12,marginBottom:16,flexDirection:m.role==="user"?"row-reverse":"row"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:m.role==="user"?C.accentDim:C.card,border:`1px solid ${m.role==="user"?C.accent:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
              {m.role==="user"?"U":"◎"}
            </div>
            <div style={{maxWidth:"75%",background:m.role==="user"?`${C.accent}18`:C.card,border:`1px solid ${m.role==="user"?C.accent+"33":C.border}`,borderRadius:m.role==="user"?"12px 4px 12px 12px":"4px 12px 12px 12px",padding:"12px 16px",fontSize:14,color:C.text,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{display:"flex",gap:12,marginBottom:16}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:C.card,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>◎</div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"4px 12px 12px 12px",padding:"12px 16px"}}>
              <div style={{display:"flex",gap:4}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.accent,opacity:0.6,animation:`pulse 1.2s ${i*0.2}s infinite`}}/>)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:"16px 28px",flexShrink:0,borderTop:`1px solid ${C.border}`}}>
        {messages.length<=1&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
            {suggestions.map(s=>(
              <button key={s} onClick={()=>send(s)} style={{fontSize:12,color:C.subtle,background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"6px 12px",cursor:"pointer",fontFamily:"inherit"}}>{s}</button>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:10}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())}
            placeholder="Ask about your spending..."
            style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",color:C.text,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
          <button onClick={()=>send()} disabled={!input.trim()||loading}
            style={{background:input.trim()&&!loading?C.accent:"#1a2d4a",color:"#fff",border:"none",borderRadius:10,padding:"12px 18px",fontSize:14,cursor:input.trim()&&!loading?"pointer":"default",fontWeight:600,fontFamily:"inherit"}}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings({categories,setCategories,budgets,setBudgets,txns,setTxns,accountList,onRenameAccount}){
  const months=[...new Set(txns.map(t=>t.month))].sort();

  // Local editable copies
  const [catEdits,setCatEdits]=useState(()=>categories.map(c=>({...c})));
  const [budgetEdits,setBudgetEdits]=useState(()=>({...budgets}));
  const [newCatName,setNewCatName]=useState("");
  const [deleteTarget,setDeleteTarget]=useState(null);
  const [reassignTo,setReassignTo]=useState("");
  const [acctEdits,setAcctEdits]=useState(()=>Object.fromEntries(accountList.map(a=>[a.short,a.display])));
  const [flash,setFlash]=useState("");

  useEffect(()=>setCatEdits(categories.map(c=>({...c}))),[categories]);
  useEffect(()=>setBudgetEdits({...budgets}),[budgets]);
  useEffect(()=>setAcctEdits(Object.fromEntries(accountList.map(a=>[a.short,a.display]))),[accountList]);

  const showFlash=msg=>{setFlash(msg);setTimeout(()=>setFlash(""),2500);};

  // Save categories and budgets together
  const saveCategories=async()=>{
    const names=catEdits.map(c=>c.name.trim()).filter(Boolean);
    if(new Set(names).size!==names.length){showFlash("⚠ Duplicate category names — please fix");return;}

    // Build name-change map for retroactive transaction update
    const nameMap={};
    catEdits.forEach((c,i)=>{
      const oldName=categories[i]?.name;
      const newName=c.name.trim();
      if(oldName&&oldName!==newName)nameMap[oldName]=newName;
    });

    // Carry budgets over: renamed category inherits old category's budget
    const newBudgets={};
    Object.entries(budgetEdits).forEach(([k,v])=>{
      const mapped=nameMap[k]||k;
      const n=parseFloat(v);
      if(n>0)newBudgets[mapped]=n;
    });

    const finalCats=catEdits.map(c=>({name:c.name.trim(),color:c.color})).filter(c=>c.name);
    let newTxns=txns;
    if(Object.keys(nameMap).length){
      newTxns=txns.map(t=>t.category&&nameMap[t.category]?{...t,category:nameMap[t.category]}:t);
    }

    await setCategories(finalCats);
    await setBudgets(newBudgets);
    if(newTxns!==txns)await setTxns(newTxns);
    setBudgetEdits(newBudgets);
    showFlash("✓ Categories & budgets saved");
  };

  const addCategory=()=>{
    const name=newCatName.trim().slice(0,20);
    if(!name)return;
    if(catEdits.some(c=>c.name.toLowerCase()===name.toLowerCase())){showFlash("⚠ Category already exists");return;}
    const color=EXTRA_COLORS[(catEdits.length)%EXTRA_COLORS.length];
    setCatEdits(prev=>[...prev,{name,color}]);
    setNewCatName("");
  };

  const initiateDelete=cat=>{
    const count=txns.filter(t=>t.category===cat.name).length;
    setDeleteTarget({name:cat.name,count});
    setReassignTo("");
  };

  const confirmDelete=async()=>{
    if(!deleteTarget)return;
    const finalCats=catEdits.filter(c=>c.name!==deleteTarget.name);
    const newBudgets={...budgetEdits};
    delete newBudgets[deleteTarget.name];
    let newTxns=txns;
    if(deleteTarget.count>0){
      newTxns=txns.map(t=>t.category===deleteTarget.name?{...t,category:reassignTo||null}:t);
    }
    setCatEdits(finalCats);
    setBudgetEdits(newBudgets);
    await setCategories(finalCats);
    await setBudgets(newBudgets);
    if(newTxns!==txns)await setTxns(newTxns);
    setDeleteTarget(null);
    showFlash(`✓ "${deleteTarget.name}" removed`);
  };

  const saveAccounts=async()=>{
    for(const [short,name] of Object.entries(acctEdits)){
      const trimmed=name.trim().slice(0,20);
      const current=accountList.find(a=>a.short===short)?.display;
      if(trimmed&&trimmed!==current)await onRenameAccount(short,trimmed);
    }
    showFlash("✓ Account names saved");
  };

  const inp={background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 10px",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit"};
  const mono={...inp,width:90,fontFamily:"'JetBrains Mono',monospace",textAlign:"right"};

  return(
    <div style={{flex:1,overflowY:"auto",padding:28}}>
      <h1 style={{fontSize:22,fontWeight:700,color:C.text,margin:"0 0 24px"}}>Settings</h1>

      <Card style={{marginBottom:20,borderColor:`${C.accent}33`,background:`${C.accent}08`}}>
        <div style={{fontSize:13,fontWeight:600,color:C.accent,marginBottom:6}}>◎ No API key needed</div>
        <div style={{fontSize:13,color:C.subtle,lineHeight:1.6}}>This tool runs as a Claude Artifact inside claude.ai — AI categorisation and chat work automatically.</div>
      </Card>

      {/* Data summary */}
      <Card style={{marginBottom:20}}>
        <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:12}}>Your Data</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 24px",marginBottom:16}}>
          {[
            {label:"Transactions",value:txns.length},
            {label:"Months",value:months.length},
            {label:"Accounts",value:accountList.length},
            {label:"Transfers detected",value:txns.filter(t=>t.isTransfer).length},
          ].map(({label,value})=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:C.muted}}>{label}</span>
              <span style={{fontFamily:"monospace",color:C.subtle,fontWeight:600}}>{value}</span>
            </div>
          ))}
        </div>
        <button onClick={async()=>{if(confirm("Delete all transaction data? This cannot be undone."))await setTxns([]);}}
          style={{background:"transparent",color:C.red,border:`1px solid ${C.red}55`,borderRadius:8,padding:"8px 20px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          Clear All Data
        </button>
      </Card>

      {/* Account renaming */}
      {accountList.length>0&&(
        <Card style={{marginBottom:20}}>
          <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:4}}>Accounts</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Rename accounts (max 20 characters). Applied retroactively to all transactions.</div>
          {accountList.map((acct,i)=>(
            <div key={acct.short} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:ACCOUNT_COLORS[i%ACCOUNT_COLORS.length],flexShrink:0}}/>
              <input value={acctEdits[acct.short]||""}
                onChange={e=>setAcctEdits(prev=>({...prev,[acct.short]:e.target.value.slice(0,20)}))}
                style={{...inp,flex:1}}/>
              <span style={{fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>
                {txns.filter(t=>t.accountShort===acct.short).length} txns
              </span>
            </div>
          ))}
          <button onClick={saveAccounts} style={{background:C.accent,color:"#fff",border:"none",borderRadius:8,padding:"9px 22px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Save Account Names
          </button>
        </Card>
      )}

      {/* Categories & Budgets */}
      <Card>
        <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:4}}>Categories &amp; Budgets</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Manage spending categories and set monthly budget targets (applied across all accounts).</div>

        {flash&&(
          <div style={{marginBottom:12,padding:"7px 12px",fontSize:12,borderRadius:7,
            color:flash.startsWith("⚠")?C.amber:C.accent,
            background:flash.startsWith("⚠")?`${C.amber}11`:`${C.accent}11`,
            border:`1px solid ${flash.startsWith("⚠")?C.amber+"33":C.accent+"33"}`}}>
            {flash}
          </div>
        )}

        {/* Delete confirmation */}
        {deleteTarget&&(
          <div style={{marginBottom:16,background:`${C.red}0d`,border:`1px solid ${C.red}44`,borderRadius:9,padding:"14px 16px"}}>
            <div style={{fontSize:13,color:C.red,fontWeight:600,marginBottom:8}}>Remove "{deleteTarget.name}"?</div>
            {deleteTarget.count>0&&(
              <div style={{fontSize:12,color:C.subtle,marginBottom:10}}>
                {deleteTarget.count} transaction{deleteTarget.count!==1?"s are":" is"} currently assigned to this category.
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              {deleteTarget.count>0&&(
                <>
                  <span style={{fontSize:12,color:C.muted}}>Reassign to:</span>
                  <select value={reassignTo} onChange={e=>setReassignTo(e.target.value)} style={{...inp,fontSize:12}}>
                    <option value="">Leave uncategorised</option>
                    {catEdits.filter(c=>c.name!==deleteTarget.name).map(c=>(
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </>
              )}
              <button onClick={confirmDelete} style={{background:C.red,color:"#fff",border:"none",borderRadius:7,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                Confirm Remove
              </button>
              <button onClick={()=>setDeleteTarget(null)} style={{background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:7,padding:"7px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Column headers */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>
          <div style={{width:28,flexShrink:0}}/>
          <div style={{flex:1,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Category name</div>
          <div style={{width:90,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600,textAlign:"right"}}>Budget/mo</div>
          <div style={{width:30}}/>
        </div>

        {/* Category rows */}
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
          {catEdits.map((cat,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
              <input type="color" value={cat.color}
                onChange={e=>setCatEdits(prev=>prev.map((c,j)=>j===i?{...c,color:e.target.value}:c))}
                style={{width:28,height:28,border:"none",borderRadius:6,cursor:"pointer",padding:0,background:"none"}}
                title="Pick colour"/>
              <input value={cat.name}
                onChange={e=>setCatEdits(prev=>prev.map((c,j)=>j===i?{...c,name:e.target.value.slice(0,20)}:c))}
                style={{...inp,flex:1,minWidth:0}} placeholder="Category name"/>
              <input type="number" placeholder="—"
                value={budgetEdits[cat.name]||""}
                onChange={e=>setBudgetEdits(prev=>({...prev,[cat.name]:e.target.value}))}
                style={mono}/>
              <button onClick={()=>initiateDelete(cat)} title="Remove"
                style={{width:28,background:"transparent",border:"none",cursor:"pointer",color:C.muted,fontSize:18,lineHeight:1,flexShrink:0}}>×</button>
            </div>
          ))}
        </div>

        {/* Add new */}
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:20,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
          <input value={newCatName} onChange={e=>setNewCatName(e.target.value.slice(0,20))}
            onKeyDown={e=>e.key==="Enter"&&addCategory()}
            placeholder="New category name (max 20 chars)..."
            style={{...inp,flex:1}}/>
          <button onClick={addCategory}
            style={{background:"transparent",color:C.accent,border:`1px solid ${C.accent}55`,borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
            + Add
          </button>
        </div>

        <button onClick={saveCategories}
          style={{background:C.accent,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          Save Categories &amp; Budgets
        </button>
      </Card>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [txns,setTxnsState]=useState([]);
  const [mm,setMmState]=useState({});
  const [budgets,setBudgetsState]=useState({});
  const [categories,setCategoriesState]=useState(DEFAULT_CATEGORIES);
  const [accountAliases,setAccountAliasesState]=useState({});
  const [selectedMonths,setSelectedMonths]=useState([]);
  const [uploadStatus,setUploadStatus]=useState(null);
  const [ready,setReady]=useState(false);
  // Chat history lives in App state — survives tab switches, resets on page reload
  const [chatMessages,setChatMessages]=useState([{
    role:"assistant",
    content:"Hi! I have full visibility across all your accounts. Ask me anything — spending by account, trends, where to cut back. Inter-account transfers are excluded from all totals.",
  }]);

  useEffect(()=>{
    (async()=>{
      const [t,m,b,a,cats]=await Promise.all([
        sGet(SK.txns),sGet(SK.mm),sGet(SK.budgets),sGet(SK.accounts),sGet(SK.categories)
      ]);
      if(t&&Array.isArray(t)){
        setTxnsState(t);
        const ms=[...new Set(t.map(x=>x.month))].sort();
        setSelectedMonths(ms.length?[ms[ms.length-1]]:[]);
      }
      if(m)setMmState(m);
      if(b)setBudgetsState(b);
      if(a&&typeof a==="object")setAccountAliasesState(a);
      if(cats&&Array.isArray(cats)&&cats.length)setCategoriesState(cats);
      setReady(true);
    })();
  },[]);

  // Persisted setters
  const setTxns=async v=>{setTxnsState(v);await sSet(SK.txns,v);};
  const setMm=async v=>{setMmState(v);await sSet(SK.mm,v);};
  const setBudgets=async v=>{setBudgetsState(v);await sSet(SK.budgets,v);};
  const setCategories=async v=>{setCategoriesState(v);await sSet(SK.categories,v);};
  const setAccountAliases=async v=>{setAccountAliasesState(v);await sSet(SK.accounts,v);};

  // Derive unique account list from transactions (preserving order of first appearance)
  const accountList=[];
  const _seen=new Set();
  txns.forEach(t=>{
    if(!_seen.has(t.accountShort)){_seen.add(t.accountShort);accountList.push({short:t.accountShort,display:t.account});}
  });

  const months=[...new Set(txns.map(t=>t.month))].sort();
  const currentMonths=selectedMonths.length?selectedMonths:months.length?[months[months.length-1]]:[];

  // Rename an account: update alias store + all transactions retroactively
  const handleRenameAccount=async(short,newName)=>{
    const newAliases={...accountAliases,[short]:newName};
    const newTxns=txns.map(t=>t.accountShort===short?{...t,account:newName}:t);
    await setAccountAliases(newAliases);
    await setTxns(newTxns);
  };

  // Upload one or more CSV files
  const handleUpload=async(files)=>{
    setUploadStatus({type:"loading",msg:`Parsing ${files.length} file${files.length>1?"s":""}...`});
    try{
      const existingIds=new Set(txns.map(t=>t.id));
      let allNew=[];
      for(const file of files){
        const text=await file.text();
        const {txns:parsed}=parseCSV(text,accountAliases);
        parsed.filter(t=>!existingIds.has(t.id)).forEach(t=>{existingIds.add(t.id);allNew.push(t);});
      }
      if(!allNew.length){setUploadStatus({type:"error",msg:"No new transactions found — already imported?"});return;}

      const combined=detectTransfers([...txns,...allNew]);
      const newMm={...mm};
      const needsCat=[];
      combined.forEach(t=>{
        if(!allNew.some(n=>n.id===t.id)||t.isTransfer)return;
        const k=t.payee.toLowerCase();
        if(newMm[k])t.category=newMm[k]; else needsCat.push(t);
      });

      if(needsCat.length){
        setUploadStatus({type:"loading",msg:`Categorising ${needsCat.length} transactions with AI...`});
        const accountShorts=[...new Set(combined.map(t=>t.accountShort))];
        const catMap=await categorise(needsCat,newMm,accountShorts,categories);
        combined.forEach(t=>{
          if(catMap[t.id]&&!t.isTransfer){t.category=catMap[t.id];newMm[t.payee.toLowerCase()]=t.category;}
        });
      }

      await setTxns(combined);
      await setMm(newMm);
      const newMonths=[...new Set(allNew.map(t=>t.month))].sort();
      setSelectedMonths([newMonths[newMonths.length-1]]);
      const tCount=Math.round(combined.filter(t=>t.isTransfer&&allNew.some(n=>n.id===t.id)).length/2);
      setUploadStatus({type:"success",msg:`Imported ${allNew.length} transactions${tCount?` · ${tCount} transfer${tCount>1?"s":""} detected`:""}`});
      setTimeout(()=>setUploadStatus(null),5000);
      setTab("dashboard");
    }catch(e){
      setUploadStatus({type:"error",msg:`Error: ${e.message}`});
    }
  };

  // Bulk category change from Transactions tab — also updates merchant map
  const handleBulkCategoryChange=async updatedTxns=>{
    await setTxns(updatedTxns);
    const newMm={...mm};
    updatedTxns.filter(t=>t.category&&!t.isTransfer).forEach(t=>{newMm[t.payee.toLowerCase()]=t.category;});
    await setMm(newMm);
  };

  if(!ready)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,color:C.muted,fontFamily:"'Sora',sans-serif",fontSize:14}}>
      Loading...
    </div>
  );

  return(
    <>
      <style>{`
        @import url('${FONT_URL}');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg};}
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
        @keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}
        select option{background:${C.card};color:${C.text};}
      `}</style>
      <div style={{display:"flex",height:"100vh",fontFamily:"'Sora',sans-serif",background:C.bg,color:C.text,overflow:"hidden"}}>
        <Sidebar
          tab={tab} setTab={setTab}
          onUpload={handleUpload} uploadStatus={uploadStatus}
          txnCount={txns.length} accountList={accountList}
          onRenameAccount={handleRenameAccount}
        />
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {tab==="dashboard"&&(
            <Dashboard
              txns={txns} months={months}
              selectedMonths={currentMonths} setSelectedMonths={setSelectedMonths}
              budgets={budgets} accountList={accountList} categories={categories}
            />
          )}
          {tab==="transactions"&&(
            <Transactions
              txns={txns} accountList={accountList} categories={categories}
              onBulkCategoryChange={handleBulkCategoryChange}
            />
          )}
          {tab==="chat"&&(
            <Chat
              txns={txns} budgets={budgets} categories={categories}
              messages={chatMessages} setMessages={setChatMessages}
            />
          )}
          {tab==="settings"&&(
            <Settings
              categories={categories} setCategories={setCategories}
              budgets={budgets} setBudgets={setBudgets}
              txns={txns} setTxns={setTxns}
              accountList={accountList} onRenameAccount={handleRenameAccount}
            />
          )}
        </div>
      </div>
    </>
  );
}
