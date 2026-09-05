/* ===== KOKURIKULUM (guru) — lihat penglibatan murid dalam setiap unit =====
   Data: koku_units + koku_members (lihat koku-schema.sql).
   Setiap murid: 1 Unit Beruniform + 1 Kelab/Persatuan + 1 Sukan/Permainan + 1 Rumah Sukan. */
const KCATS=[
  {k:'beruniform',l:'Unit Beruniform',s:'Beruniform',c:'#2f5fe0'},
  {k:'kelab',     l:'Kelab & Persatuan',s:'Kelab',   c:'#7a4fd6'},
  {k:'sukan',     l:'Sukan & Permainan',s:'Sukan',   c:'#1f9d6b'},
  {k:'rumah',     l:'Rumah Sukan',      s:'Rumah',   c:'#d98613'}
];
const KCAT=k=>KCATS.find(c=>c.k===k)||{l:k,s:k,c:'#6b7585'};
const KOKU={units:[],members:[],byId:{},loaded:false,err:null};

async function kokuLoad(force){
  if(KOKU.loaded&&!force)return !KOKU.err;
  KOKU.err=null;
  try{
    const [u,m]=await Promise.all([DB.kokuUnits(),DB.kokuMembersAll()]);
    KOKU.units=u; KOKU.members=m; KOKU.byId={};
    u.forEach(x=>KOKU.byId[x.id]=x);
    KOKU.loaded=true;
  }catch(e){ KOKU.err=e; KOKU.loaded=true; }
  return !KOKU.err;
}
function kokuSetupMsg(){
  const need=/koku_units|koku_members|does not exist|schema cache/i.test(KOKU.err?.message||'');
  return `<div class="soon">
    <span class="tagsoon">MODUL BELUM DISEDIAKAN</span>
    <h3>Jadual kokurikulum belum wujud</h3>
    <p>${need?'Pangkalan data belum ada jadual <code>koku_units</code> / <code>koku_members</code>.':'Ralat: '+esc(KOKU.err?.message||'')}</p>
    <p>Pentadbir perlu jalankan fail <b>koku-schema.sql</b> sekali sahaja di Supabase (SQL Editor). Fail itu akan memasukkan terus 38 unit sekolah: 8 Unit Beruniform, 14 Kelab &amp; Persatuan, 12 Sukan &amp; Permainan, 4 Rumah Sukan.</p>
  </div>`;
}
/* peta: student_id -> {kategori: unit} */
function kokuMapByStudent(){
  const map={};
  KOKU.members.forEach(m=>{
    const u=KOKU.byId[m.unit_id]; if(!u)return;
    (map[m.student_id]=map[m.student_id]||{})[u.category]={unit:u,role:m.role};
  });
  return map;
}
const kokuUnitsOf=cat=>KOKU.units.filter(u=>u.category===cat);
const kokuCountOf=unitId=>KOKU.members.filter(m=>m.unit_id===unitId).length;

/* ---------- 1. AHLI UNIT ---------- */
async function renderKokuUnit(){
  const box=$('#tab-koku-unit');
  box.innerHTML='<div class="empty">Memuat…</div>';
  if(!await kokuLoad()){box.innerHTML=kokuSetupMsg();return;}
  const cat=KOKU._cat||'beruniform';
  box.innerHTML=`
    <div class="seg" id="ku-seg">${KCATS.map(c=>`<button class="${c.k===cat?'active':''}" data-c="${c.k}">${esc(c.s)}</button>`).join('')}</div>
    <div class="lap-head" style="margin:0 0 6px">
      <div class="field" style="flex:2;min-width:200px"><label>Unit</label><select id="ku-unit"></select></div>
      <button class="btn btn-ghost" id="ku-print">Cetak</button>
    </div>
    <div id="ku-out"></div>`;
  $('#ku-seg').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;KOKU._cat=b.dataset.c;KOKU._unit=null;renderKokuUnit();};
  $('#ku-print').onclick=()=>window.print();
  const list=kokuUnitsOf(cat);
  $('#ku-unit').innerHTML=list.length
    ? list.map(u=>`<option value="${u.id}">${esc(u.name)} (${kokuCountOf(u.id)} ahli)</option>`).join('')
    : '<option value="">(Tiada unit)</option>';
  if(KOKU._unit&&list.some(u=>u.id===KOKU._unit))$('#ku-unit').value=KOKU._unit;
  $('#ku-unit').onchange=()=>{KOKU._unit=$('#ku-unit').value;kokuUnitBody();};
  KOKU._unit=$('#ku-unit').value||null;
  kokuUnitBody();
}
async function kokuUnitBody(){
  const out=$('#ku-out'), id=KOKU._unit;
  if(!id){out.innerHTML='<div class="empty"><strong>Tiada unit</strong>Pentadbir belum daftar unit bagi kategori ini.</div>';return;}
  const u=KOKU.byId[id];
  out.innerHTML='<div class="empty">Memuat…</div>';
  let rows=[];
  try{rows=await DB.kokuMembersByUnit(id);}catch(e){out.innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';return;}
  rows.sort((a,b)=>((a.students?.kelas||'').localeCompare(b.students?.kelas||''))||((a.students?.name||'').localeCompare(b.students?.name||'')));
  const perKelas={};rows.forEach(r=>{const k=r.students?.kelas||'-';perKelas[k]=(perKelas[k]||0)+1;});
  out.innerHTML=`
    <div class="rpt-card">
      <h4>${esc(u.name)}</h4>
      <div class="sub">${esc(KCAT(u.category).l)}${u.meet_day?' · Perjumpaan: '+esc(u.meet_day):''} · <b>${rows.length} ahli</b>${Object.keys(perKelas).length?' · '+Object.keys(perKelas).sort().map(k=>esc(k)+' ('+perKelas[k]+')').join(', '):''}</div>
      ${u.advisors?`<div style="font-size:12px;color:var(--muted);margin-bottom:10px"><b style="color:var(--ink)">Guru penasihat:</b> ${esc(u.advisors)}</div>`:''}
      ${rows.length?`<table class="rpt-table">
        <tr><th>#</th><th>Nama Murid</th><th>Kelas</th><th>No. KP</th><th>Jawatan</th></tr>
        ${rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${esc(r.students?.name||'-')}</b></td><td>${esc(r.students?.kelas||'-')}</td><td>${esc(r.students?.nokp||'')}</td><td>${r.role&&r.role!=='Ahli'?`<span class="pill" style="background:#eaf1ff;color:var(--brand)">${esc(r.role)}</span>`:'Ahli'}</td></tr>`).join('')}
      </table>`:'<div class="empty" style="padding:18px"><strong>Belum ada ahli</strong>Pentadbir kokurikulum boleh daftar ahli melalui panel Admin.</div>'}
    </div>`;
}

/* ---------- 2. SEMAK MURID ---------- */
async function renderKokuMurid(){
  const box=$('#tab-koku-murid');
  box.innerHTML='<div class="empty">Memuat…</div>';
  if(!await kokuLoad()){box.innerHTML=kokuSetupMsg();return;}
  box.innerHTML=`
    <div class="lap-head">
      <div class="field"><label>Kelas</label><select id="km-kelas"><option value="">— Pilih kelas —</option>${allClassList().map(c=>`<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="field" style="flex:1;min-width:160px"><label>Atau cari murid</label><input type="text" id="km-q" placeholder="Nama / No. KP"></div>
      <button class="btn btn-primary" id="km-go">Cari</button>
      <button class="btn btn-ghost" id="km-print">Cetak</button>
    </div>
    <div id="km-out"><div class="empty"><strong>Pilih kelas</strong>Lihat unit kokurikulum setiap murid dalam kelas, atau cari seorang murid.</div></div>`;
  $('#km-kelas').onchange=()=>{$('#km-q').value='';kokuKelas($('#km-kelas').value);};
  $('#km-print').onclick=()=>window.print();
  $('#km-go').onclick=kokuCari;
  $('#km-q').onkeydown=e=>{if(e.key==='Enter')kokuCari();};
}
function kokuBadges(rec){
  return KCATS.map(c=>{
    const r=rec&&rec[c.k];
    return r
      ? `<span class="pill" style="background:${c.c}18;color:${c.c}">${esc(c.s)}: ${esc(r.unit.name)}${r.role&&r.role!=='Ahli'?' ('+esc(r.role)+')':''}</span>`
      : `<span class="pill" style="background:#f1f2f5;color:#9aa3b2">${esc(c.s)}: —</span>`;
  }).join(' ');
}
function kokuKelas(kelas){
  const out=$('#km-out');
  if(!kelas){out.innerHTML='';return;}
  const map=kokuMapByStudent();
  const list=state.students.filter(s=>s.kelas===kelas).sort((a,b)=>a.name.localeCompare(b.name));
  const penuh=list.filter(s=>KCATS.every(c=>map[s.id]&&map[s.id][c.k])).length;
  const kosong=list.filter(s=>!map[s.id]).length;
  out.innerHTML=`<p class="legend">${list.length} murid dalam <b>${esc(kelas)}</b> · <span style="color:var(--present)">${penuh} lengkap 4 unit</span> · <span style="color:var(--absent)">${kosong} belum ada sebarang unit</span></p>`+
    (list.map((s,i)=>`<div class="dcard" style="display:block"><div class="cn">${i+1}. ${esc(s.name)}</div>
      <div class="det" style="margin-bottom:6px">${esc(s.nokp)} · ${esc(s.kelas||'')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${kokuBadges(map[s.id])}</div></div>`).join('')
      ||'<div class="empty">Tiada murid.</div>');
}
function kokuCari(){
  const q=($('#km-q').value||'').trim().toLowerCase();
  if(!q){toast('Taip carian');return;}
  $('#km-kelas').value='';
  const map=kokuMapByStudent();
  const m=state.students.filter(s=>s.name.toLowerCase().includes(q)||(s.nokp||'').includes(q)).slice(0,40);
  $('#km-out').innerHTML=m.length?m.map(s=>`<div class="dcard" style="display:block"><div class="cn">${esc(s.name)}</div>
      <div class="det" style="margin-bottom:6px">${esc(s.nokp)} · ${esc(s.kelas||'')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${kokuBadges(map[s.id])}</div></div>`).join('')
    :'<div class="empty"><strong>Tiada padanan</strong></div>';
}

/* ---------- 3. RINGKASAN ---------- */
async function renderKokuRingkasan(){
  const box=$('#tab-koku-ringkasan');
  box.innerHTML='<div class="empty">Memuat…</div>';
  if(!await kokuLoad(true)){box.innerHTML=kokuSetupMsg();return;}
  const map=kokuMapByStudent();
  const total=state.students.length;
  box.innerHTML=`
    <div class="summary" style="flex-wrap:wrap">
      <div class="stat"><div class="n">${KOKU.units.length}</div><div class="l">Unit</div></div>
      <div class="stat"><div class="n">${KOKU.members.length}</div><div class="l">Keahlian</div></div>
      <div class="stat present"><div class="n">${state.students.filter(s=>map[s.id]).length}</div><div class="l">Murid ada unit</div></div>
      <div class="stat absent"><div class="n">${state.students.filter(s=>!map[s.id]).length}</div><div class="l">Belum ada unit</div></div>
    </div>
    <button class="btn btn-ghost" id="kr-print" style="margin-bottom:10px">Cetak</button>
    ${KCATS.map(c=>{
      const us=kokuUnitsOf(c.k);
      const daftar=state.students.filter(s=>map[s.id]&&map[s.id][c.k]).length;
      return `<div class="rpt-card">
        <h4><span style="color:${c.c}">●</span> ${esc(c.l)}</h4>
        <div class="sub">${us.length} unit · ${daftar}/${total} murid berdaftar · <span style="color:var(--absent)">${total-daftar} belum</span></div>
        ${us.length?`<table class="rpt-table"><tr><th>#</th><th>Unit</th><th>Hari</th><th>Ahli</th></tr>
          ${us.map((u,i)=>{const n=kokuCountOf(u.id);return `<tr class="${n===0?'hot':''}"><td>${i+1}</td><td><b>${esc(u.name)}</b></td><td style="color:var(--muted)">${esc(u.meet_day||'-')}</td><td><span class="pill" style="background:${n?c.c+'18':'var(--absent-soft)'};color:${n?c.c:'var(--absent)'}">${n}</span></td></tr>`;}).join('')}
        </table>`:'<div class="empty" style="padding:14px">Tiada unit.</div>'}
      </div>`;}).join('')}
    <p class="legend">Baris merah = unit yang belum ada seorang pun ahli. Pendaftaran ahli dibuat oleh pentadbir kokurikulum melalui panel Admin.</p>`;
  $('#kr-print').onclick=()=>window.print();
}

function renderKoku(sub){
  if(sub==='unit')return renderKokuUnit();
  if(sub==='murid')return renderKokuMurid();
  if(sub==='ringkasan')return renderKokuRingkasan();
}
