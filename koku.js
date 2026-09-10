/* ===== KOKURIKULUM (guru) — ahli unit + kehadiran perjumpaan =====
   Data: koku_units, koku_members, koku_sessions, koku_absentees (lihat koku-schema.sql).
   Setiap murid: 1 Unit Beruniform + 1 Kelab/Persatuan + 1 Sukan/Permainan + 1 Rumah Sukan. */
const KCATS=[
  {k:'beruniform',l:'Unit Beruniform',s:'Beruniform',c:'#2f5fe0'},
  {k:'kelab',     l:'Kelab & Persatuan',s:'Kelab',   c:'#7a4fd6'},
  {k:'sukan',     l:'Sukan & Permainan',s:'Sukan',   c:'#1f9d6b'},
  {k:'rumah',     l:'Rumah Sukan',      s:'Rumah',   c:'#d98613'}
];
const KCAT=k=>KCATS.find(c=>c.k===k)||{l:k,s:k,c:'#6b7585'};
const KOKU={units:[],members:[],byId:{},loaded:false,err:null};
const KOKU_REASONS=['Tanpa Sebab','Sakit','Urusan Sekolah','Dengan Kebenaran'];
/* jadual kehadiran (koku_sessions/koku_absentees) mungkin belum dibuat —
   senarai ahli mesti tetap berfungsi tanpanya */
const kokuTiadaJadualSesi=e=>/koku_sessions|koku_absentees|schema cache|does not exist/i.test(e?.message||'');
const kokuNotaSesi=`<div class="soon" style="margin-top:0"><span class="tagsoon">KEHADIRAN BELUM DIBUKA</span>
  <h3>Jadual perjumpaan belum wujud</h3>
  <p>Unit dan ahli sudah sedia, cuma jadual <code>koku_sessions</code> belum dicipta. Pentadbir perlu jalankan fail <b>koku-kehadiran.sql</b> sekali di Supabase (SQL Editor). Data unit dan ahli tidak terjejas.</p></div>`;

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
  const need=/koku_units|koku_members|koku_sessions|does not exist|schema cache/i.test(KOKU.err?.message||'');
  return `<div class="soon">
    <span class="tagsoon">MODUL BELUM DISEDIAKAN</span>
    <h3>Jadual kokurikulum belum wujud</h3>
    <p>${need?'Pangkalan data belum ada jadual kokurikulum.':'Ralat: '+esc(KOKU.err?.message||'')}</p>
    <p>Pentadbir perlu jalankan fail <b>koku-schema.sql</b> di Supabase (SQL Editor). Fail itu mencipta jadual unit, ahli, perjumpaan &amp; kehadiran, serta memasukkan terus 38 unit sekolah.</p>
  </div>`;
}
/* peta: student_id -> {kategori: {unit, role}} */
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
const kokuUnitOpts=(cat,sel)=>{
  const list=kokuUnitsOf(cat);
  return list.length?list.map(u=>`<option value="${u.id}" ${u.id===sel?'selected':''}>${esc(u.name)} (${kokuCountOf(u.id)} ahli)</option>`).join('')
                    :'<option value="">(Tiada unit)</option>';
};
const kokuPct=(h,t)=>t>0?Math.round(h/t*100):null;
const kokuPctCol=p=>p==null?'#9aa3b2':p>=90?'var(--present)':p>=80?'var(--warn)':p>=70?'#e8743b':'var(--absent)';

/* =================================================================
   1. KEHADIRAN PERJUMPAAN — tekan nama untuk tanda tidak hadir
   ================================================================= */
const KH={unit:null,date:null,roster:[],absent:{}};

async function renderKokuKehadiran(){
  const box=$('#tab-koku-kehadiran');
  box.innerHTML='<div class="empty">Memuat…</div>';
  if(!await kokuLoad()){box.innerHTML=kokuSetupMsg();$('#savebar-koku').classList.add('hidden');return;}
  const cat=KOKU._kcat||'beruniform';
  box.innerHTML=`
    <div class="seg" id="kh-seg">${KCATS.map(c=>`<button class="${c.k===cat?'active':''}" data-c="${c.k}">${esc(c.s)}</button>`).join('')}</div>
    <div class="context">
      <div class="field" style="flex:2;min-width:190px"><label>Unit</label><select id="kh-unit">${kokuUnitOpts(cat,KOKU._kunit)}</select></div>
      <div class="field"><label>Tarikh Perjumpaan</label><input type="date" id="kh-date" value="${esc(KOKU._kdate||todayISO())}"></div>
      <div class="field" style="flex:2;min-width:180px"><label>Aktiviti (pilihan)</label><input type="text" id="kh-act" placeholder="cth: Kawad kaki, Mesyuarat Agung"></div>
      <div class="field"><label>Masa Mula</label><input type="time" id="kh-mula"></div>
      <div class="field"><label>Masa Tamat</label><input type="time" id="kh-tamat"></div>
    </div>
    <div class="summary">
      <div class="stat present"><div class="n" id="kh-hadir">0</div><div class="l">Hadir</div></div>
      <div class="stat absent"><div class="n" id="kh-tidak">0</div><div class="l">Tidak Hadir</div></div>
      <div class="stat"><div class="n" id="kh-jumlah">0</div><div class="l">Jumlah Ahli</div></div>
    </div>
    <p class="hint">Semua ahli dikira <strong>hadir</strong> secara lalai. Tekan nama ahli yang tidak hadir, kemudian pilih sebab.</p>
    <div class="roster" id="kh-roster"></div>
    <h3 style="font-size:14px;margin:22px 2px 8px">Perjumpaan Lepas</h3>
    <div id="kh-lepas"></div>
    <div style="height:90px"></div>`;

  $('#kh-seg').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;KOKU._kcat=b.dataset.c;KOKU._kunit=null;renderKokuKehadiran();};
  $('#kh-unit').onchange=()=>{KOKU._kunit=$('#kh-unit').value;khLoad();};
  $('#kh-date').onchange=()=>{KOKU._kdate=$('#kh-date').value;khLoad();};
  $('#kh-roster').onclick=e=>{
    const b=e.target.closest('[data-act]');if(!b)return;
    const id=e.target.closest('.student').dataset.id;
    if(b.dataset.act==='toggle'){
      if(KH.absent[id]===undefined)KH.absent[id]=KOKU_REASONS[0];else delete KH.absent[id];
      khRender();
    }
    if(b.dataset.act==='reason'){
      const r=b.dataset.r;
      KH.absent[id]=r==='Dengan Kebenaran'?((KH.absent[id]||'').startsWith('Dengan Kebenaran')?KH.absent[id]:'Dengan Kebenaran:'):r;
      khRender();
    }
  };
  $('#kh-roster').oninput=e=>{
    const inp=e.target.closest('[data-act="nota"]');if(!inp)return;
    const id=e.target.closest('.student').dataset.id;
    const v=inp.value.trim();
    KH.absent[id]=v?('Dengan Kebenaran: '+v):'Dengan Kebenaran:';
  };
  $('#kh-simpan').onclick=khSave;
  KOKU._kunit=$('#kh-unit').value||null;
  await khLoad();
}

async function khLoad(){
  const id=$('#kh-unit').value||null, date=$('#kh-date').value;
  KH.unit=id?KOKU.byId[id]:null; KH.date=date; KH.absent={};
  $('#kh-act').value=''; $('#kh-mula').value=''; $('#kh-tamat').value='';
  if(!KH.unit||!date){KH.roster=[];khRender();$('#kh-info').textContent='Pilih unit & tarikh';$('#kh-lepas').innerHTML='';return;}
  $('#kh-roster').innerHTML='<div class="empty">Memuat…</div>';
  try{
    const [rows,ses]=await Promise.all([DB.kokuMembersByUnit(id),DB.kokuGetSession(id,date)]);
    KH.roster=rows.map(r=>({id:r.student_id,name:r.students?.name||'-',nokp:r.students?.nokp||'',kelas:r.students?.kelas||'',role:r.role}))
      .sort((a,b)=>(a.kelas||'').localeCompare(b.kelas||'')||a.name.localeCompare(b.name));
    if(ses){
      (ses.koku_absentees||[]).forEach(a=>KH.absent[a.student_id]=a.reason||'Tanpa Sebab');
      $('#kh-act').value=ses.activity||'';
      if(ses.session_time){const[a,b]=ses.session_time.split('-');$('#kh-mula').value=a||'';$('#kh-tamat').value=b||'';}
    }
    $('#kh-info').textContent=ses?`✏️ Mod edit — rekod ${fmtDate(date)} dimuatkan${ses.recorded_name?' · direkod oleh '+ses.recorded_name:''}`:'Belum disimpan';
    $('#kh-simpan').textContent=ses?'Kemaskini Kehadiran':'Simpan Kehadiran';
    KH.sedia=true;
  }catch(e){
    if(kokuTiadaJadualSesi(e)){
      KH.sedia=false;
      $('#kh-roster').innerHTML=kokuNotaSesi;
      $('#kh-info').textContent='Jadual kehadiran belum dibuka';
      $('#kh-lepas').innerHTML='';
      ['kh-hadir','kh-tidak','kh-jumlah'].forEach(x=>$('#'+x).textContent='0');
      return;
    }
    toast('Ralat memuat: '+e.message);
  }
  khRender(); khPast();
}

function khRender(){
  const box=$('#kh-roster');
  if(!KH.unit){box.innerHTML='<div class="empty"><strong>Pilih unit</strong>Pilih kategori dan unit untuk papar senarai ahli.</div>';}
  else if(!KH.roster.length){box.innerHTML='<div class="empty"><strong>Belum ada ahli</strong>Unit ini belum ada murid berdaftar. Pentadbir boleh daftar ahli melalui panel Admin.</div>';}
  else box.innerHTML=KH.roster.map((s,i)=>{
    const v=KH.absent[s.id], ab=v!==undefined, rs=ab?v:'';
    return `<div class="student ${ab?'absent':''}" data-id="${s.id}">
      <div class="srow" data-act="toggle"><span class="num">${i+1}.</span>
        <span class="who"><span class="name">${esc(s.name)}${s.role&&s.role!=='Ahli'?` <span class="pill" style="background:#eaf1ff;color:var(--brand)">${esc(s.role)}</span>`:''}</span><br>
        <span class="meta">${esc(s.nokp)} · ${esc(s.kelas)}</span></span>
        ${ab?'<span class="status no">Tidak Hadir</span>':'<span class="status yes">✓ Hadir</span>'}</div>
      ${ab?`<div class="reasons">${KOKU_REASONS.map(r=>{const on=r==='Dengan Kebenaran'?(rs||'').startsWith('Dengan Kebenaran'):rs===r;return `<button class="chip ${on?'on':''}" data-act="reason" data-r="${r}">${r}</button>`;}).join('')}</div>${(rs||'').startsWith('Dengan Kebenaran')?`<input class="bersebab-input" data-act="nota" placeholder="Nyatakan sebab (cth: ke pertandingan, urusan keluarga)" value="${esc(rs.replace(/^Dengan Kebenaran:?\s*/,''))}">`:''}`:''}</div>`;
  }).join('');
  const total=KH.roster.length, tidak=Object.keys(KH.absent).length;
  $('#kh-jumlah').textContent=total;$('#kh-tidak').textContent=tidak;$('#kh-hadir').textContent=Math.max(0,total-tidak);
}

async function khSave(){
  if(!KH.unit){toast('Pilih unit');return;}
  if(!KH.date){toast('Pilih tarikh');return;}
  if(KH.sedia===false){toast('Jadual kehadiran belum dibuka — jalankan koku-kehadiran.sql di Supabase');return;}
  if(!KH.roster.length){toast('Unit ini belum ada ahli');return;}
  const masa=(()=>{const a=$('#kh-mula').value,b=$('#kh-tamat').value;return a&&b?`${a}-${b}`:(a||'');})();
  $('#kh-simpan').disabled=true;
  try{
    await DB.kokuSaveSession({
      unit_id:KH.unit.id,sdate:KH.date,activity:$('#kh-act').value.trim(),session_time:masa,
      recorded_by:state.teacher?.ic||null,recorded_name:state.teacher?.name||null
    },Object.entries(KH.absent).map(([student_id,reason])=>({student_id,reason})));
    $('#kh-info').textContent='Disimpan ✓';
    $('#kh-simpan').textContent='Kemaskini Kehadiran';
    toast('Kehadiran perjumpaan disimpan ✓');
    khPast();
  }catch(e){toast(kokuTiadaJadualSesi(e)?'Jadual kehadiran belum dibuka — jalankan koku-kehadiran.sql di Supabase':'Ralat simpan: '+e.message);}
  $('#kh-simpan').disabled=false;
}

async function khPast(){
  const box=$('#kh-lepas');
  if(!KH.unit){box.innerHTML='';return;}
  box.innerHTML='<div class="empty" style="padding:16px">Memuat…</div>';
  let ss=[];
  try{ss=await DB.kokuSessionsByUnit(KH.unit.id);}
  catch(e){box.innerHTML=kokuTiadaJadualSesi(e)?kokuNotaSesi:'<div class="empty" style="padding:16px">Ralat: '+esc(e.message)+'</div>';return;}
  const total=KH.roster.length;
  if(!ss.length){box.innerHTML='<div class="empty" style="padding:16px">Belum ada rekod perjumpaan untuk unit ini.</div>';return;}
  box.innerHTML=`<table class="rpt-table">
    <tr><th>Tarikh</th><th>Aktiviti</th><th>Hadir</th><th></th></tr>
    ${ss.map(s=>{const t=(s.koku_absentees||[]).length,h=Math.max(0,total-t),p=kokuPct(h,total);
      return `<tr data-sesi="${s.id}" data-tarikh="${s.sdate}">
        <td><b>${esc(s.sdate)}</b>${s.session_time?`<br><span style="font-size:11px;color:var(--muted)">${esc(fmtMasa(s.session_time))}</span>`:''}</td>
        <td>${esc(s.activity||'-')}${s.recorded_name?`<br><span style="font-size:11px;color:var(--muted)">${esc(s.recorded_name)}</span>`:''}</td>
        <td><span class="pill" style="background:${p==null?'#f1f2f5':kokuPctCol(p)+'18'};color:${kokuPctCol(p)}">${h}/${total}${p!=null?' · '+p+'%':''}</span></td>
        <td><button class="hbtn" data-act="buka" style="font-size:11px;padding:4px 9px">Buka</button>
            <button class="hbtn" data-act="padam" style="font-size:11px;padding:4px 9px;color:var(--absent)">Padam</button></td></tr>`;}).join('')}
  </table><p class="legend" style="margin-top:6px">Tekan <b>Buka</b> untuk semak atau ubah rekod perjumpaan lepas.</p>`;
  box.onclick=async e=>{
    const b=e.target.closest('[data-act]');if(!b)return;
    const tr=e.target.closest('[data-sesi]');
    if(b.dataset.act==='buka'){$('#kh-date').value=tr.dataset.tarikh;KOKU._kdate=tr.dataset.tarikh;khLoad();window.scrollTo(0,0);return;}
    if(b.dataset.act==='padam'&&confirm('Padam rekod perjumpaan '+tr.dataset.tarikh+'?')){
      try{await DB.kokuDelSession(tr.dataset.sesi);toast('Rekod dipadam');
        if(tr.dataset.tarikh===KH.date)khLoad();else khPast();}catch(err){toast('Ralat: '+err.message);}
    }
  };
}

/* =================================================================
   2. AHLI UNIT — senarai ahli + kehadiran perjumpaan setiap ahli
   ================================================================= */
async function renderKokuUnit(){
  const box=$('#tab-koku-unit');
  box.innerHTML='<div class="empty">Memuat…</div>';
  if(!await kokuLoad()){box.innerHTML=kokuSetupMsg();return;}
  const cat=KOKU._cat||'beruniform';
  box.innerHTML=`
    <div class="seg" id="ku-seg">${KCATS.map(c=>`<button class="${c.k===cat?'active':''}" data-c="${c.k}">${esc(c.s)}</button>`).join('')}</div>
    <div class="lap-head" style="margin:0 0 6px">
      <div class="field" style="flex:2;min-width:200px"><label>Unit</label><select id="ku-unit">${kokuUnitOpts(cat,KOKU._unit)}</select></div>
      <button class="btn btn-ghost" id="ku-print">Cetak</button>
    </div>
    <div id="ku-out"></div>`;
  $('#ku-seg').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;KOKU._cat=b.dataset.c;KOKU._unit=null;renderKokuUnit();};
  $('#ku-print').onclick=()=>window.print();
  $('#ku-unit').onchange=()=>{KOKU._unit=$('#ku-unit').value;kokuUnitBody();};
  KOKU._unit=$('#ku-unit').value||null;
  kokuUnitBody();
}
async function kokuUnitBody(){
  const out=$('#ku-out'), id=KOKU._unit;
  if(!id){out.innerHTML='<div class="empty"><strong>Tiada unit</strong>Pentadbir belum daftar unit bagi kategori ini.</div>';return;}
  const u=KOKU.byId[id];
  out.innerHTML='<div class="empty">Memuat…</div>';
  let rows=[],ss=[];
  try{rows=await DB.kokuMembersByUnit(id);}
  catch(e){out.innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';return;}
  try{ss=await DB.kokuSessionsByUnit(id);}
  catch(e){ss=[];}                      // jadual kehadiran belum ada — papar senarai ahli sahaja
  rows.sort((a,b)=>((a.students?.kelas||'').localeCompare(b.students?.kelas||''))||((a.students?.name||'').localeCompare(b.students?.name||'')));
  const sesi=ss.length, tidak={};
  ss.forEach(s=>(s.koku_absentees||[]).forEach(a=>{tidak[a.student_id]=(tidak[a.student_id]||0)+1;}));
  const perKelas={};rows.forEach(r=>{const k=r.students?.kelas||'-';perKelas[k]=(perKelas[k]||0)+1;});
  out.innerHTML=`
    <div class="rpt-card">
      <h4>${esc(u.name)}</h4>
      <div class="sub">${esc(KCAT(u.category).l)}${u.meet_day?' · Perjumpaan: '+esc(u.meet_day):''} · <b>${rows.length} ahli</b> · ${sesi} perjumpaan direkod${Object.keys(perKelas).length?' · '+Object.keys(perKelas).sort().map(k=>esc(k)+' ('+perKelas[k]+')').join(', '):''}</div>
      ${u.advisors?`<div style="font-size:12px;color:var(--muted);margin-bottom:10px"><b style="color:var(--ink)">Guru penasihat:</b> ${esc(u.advisors)}</div>`:''}
      ${rows.length?`<table class="rpt-table">
        <tr><th>#</th><th>Nama Murid</th><th>Kelas</th><th>Jawatan</th>${sesi?'<th>Kehadiran</th>':''}</tr>
        ${rows.map((r,i)=>{
          const ab=tidak[r.student_id]||0, h=Math.max(0,sesi-ab), p=kokuPct(h,sesi);
          return `<tr class="${sesi&&p!=null&&p<70?'hot':''}"><td>${i+1}</td>
            <td><b>${esc(r.students?.name||'-')}</b><br><span style="font-size:11px;color:var(--muted)">${esc(r.students?.nokp||'')}</span></td>
            <td>${esc(r.students?.kelas||'-')}</td>
            <td>${r.role&&r.role!=='Ahli'?`<span class="pill" style="background:#eaf1ff;color:var(--brand)">${esc(r.role)}</span>`:'Ahli'}</td>
            ${sesi?`<td><span class="pill" style="background:${kokuPctCol(p)}18;color:${kokuPctCol(p)}">${h}/${sesi}${p!=null?' · '+p+'%':''}</span></td>`:''}</tr>`;}).join('')}
      </table>${sesi?'<p class="legend" style="margin-top:6px">Baris merah = kehadiran perjumpaan bawah 70%.</p>':'<p class="legend" style="margin-top:6px">Belum ada rekod perjumpaan. Rekod di tab <b>Kehadiran</b>.</p>'}`
      :'<div class="empty" style="padding:18px"><strong>Belum ada ahli</strong>Pentadbir kokurikulum boleh daftar ahli melalui panel Admin.</div>'}
    </div>`;
}

/* =================================================================
   3. SEMAK MURID — 4 penglibatan setiap murid
   ================================================================= */
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

/* =================================================================
   4. RINGKASAN — unit, keahlian & kehadiran perjumpaan
   ================================================================= */
async function renderKokuRingkasan(){
  const box=$('#tab-koku-ringkasan');
  box.innerHTML='<div class="empty">Memuat…</div>';
  if(!await kokuLoad(true)){box.innerHTML=kokuSetupMsg();return;}
  let ss=[];
  try{ss=await DB.kokuSessionsAll();}catch(e){/* sesi belum wujud — papar tanpa statistik */}
  const map=kokuMapByStudent();
  const total=state.students.length;
  const sesiOf={}, absOf={};
  ss.forEach(s=>{sesiOf[s.unit_id]=(sesiOf[s.unit_id]||0)+1;absOf[s.unit_id]=(absOf[s.unit_id]||0)+(s.koku_absentees||[]).length;});
  const unitPct=u=>{const n=sesiOf[u.id]||0;if(!n)return null;const slot=n*kokuCountOf(u.id);return slot>0?kokuPct(slot-(absOf[u.id]||0),slot):null;};
  box.innerHTML=`
    <div class="summary" style="flex-wrap:wrap">
      <div class="stat"><div class="n">${KOKU.units.length}</div><div class="l">Unit</div></div>
      <div class="stat"><div class="n">${KOKU.members.length}</div><div class="l">Keahlian</div></div>
      <div class="stat"><div class="n">${ss.length}</div><div class="l">Perjumpaan</div></div>
      <div class="stat absent"><div class="n">${state.students.filter(s=>!map[s.id]).length}</div><div class="l">Murid tiada unit</div></div>
    </div>
    <button class="btn btn-ghost" id="kr-print" style="margin-bottom:10px">Cetak</button>
    ${KCATS.map(c=>{
      const us=kokuUnitsOf(c.k);
      const daftar=state.students.filter(s=>map[s.id]&&map[s.id][c.k]).length;
      return `<div class="rpt-card">
        <h4><span style="color:${c.c}">●</span> ${esc(c.l)}</h4>
        <div class="sub">${us.length} unit · ${daftar}/${total} murid berdaftar · <span style="color:var(--absent)">${total-daftar} belum</span></div>
        ${us.length?`<table class="rpt-table"><tr><th>#</th><th>Unit</th><th>Hari</th><th>Ahli</th><th>Sesi</th><th>Kehadiran</th></tr>
          ${us.map((u,i)=>{const n=kokuCountOf(u.id),sn=sesiOf[u.id]||0,p=unitPct(u);
            return `<tr class="${n===0?'hot':''}"><td>${i+1}</td><td><b>${esc(u.name)}</b></td>
              <td style="color:var(--muted)">${esc(u.meet_day||'-')}</td>
              <td><span class="pill" style="background:${n?c.c+'18':'var(--absent-soft)'};color:${n?c.c:'var(--absent)'}">${n}</span></td>
              <td>${sn||'-'}</td>
              <td>${p==null?'<span style="color:var(--muted)">—</span>':`<span class="pill" style="background:${kokuPctCol(p)}18;color:${kokuPctCol(p)}">${p}%</span>`}</td></tr>`;}).join('')}
        </table>`:'<div class="empty" style="padding:14px">Tiada unit.</div>'}
      </div>`;}).join('')}
    <p class="legend">Baris merah = unit yang belum ada seorang pun ahli. Lajur <b>Kehadiran</b> ialah purata kehadiran semua perjumpaan yang direkod bagi unit itu.</p>`;
  $('#kr-print').onclick=()=>window.print();
}

function renderKoku(sub){
  if(sub==='kehadiran')return renderKokuKehadiran();
  if(sub==='unit')return renderKokuUnit();
  if(sub==='murid')return renderKokuMurid();
  if(sub==='ringkasan')return renderKokuRingkasan();
}
