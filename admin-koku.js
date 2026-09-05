/* ===== ADMIN: KOKURIKULUM — unit, guru penasihat & pendaftaran ahli =====
   Jadual: koku_units, koku_members (jalankan koku-schema.sql dahulu). */
const AKCATS=[
  {k:'beruniform',l:'Unit Beruniform'},
  {k:'kelab',     l:'Kelab & Persatuan'},
  {k:'sukan',     l:'Sukan & Permainan'},
  {k:'rumah',     l:'Rumah Sukan'}
];
const AKCAT=k=>AKCATS.find(c=>c.k===k)||{l:k};
const AK_ROLES=['Ahli','Ketua','Naib Ketua','Setiausaha','Bendahari','AJK'];
const AKOKU={units:[],members:[],edit:null,err:null};

async function akokuLoad(){
  AKOKU.err=null;
  try{
    if(!cache.students.length)await loadStudents();
    const [u,m]=await Promise.all([
      sb.from('koku_units').select('*').order('category').order('sort'),
      sb.from('koku_members').select('id,unit_id,student_id,category,role')
    ]);
    if(u.error)throw u.error; if(m.error)throw m.error;
    AKOKU.units=u.data||[]; AKOKU.members=m.data||[];
    return true;
  }catch(e){ AKOKU.err=e; return false; }
}
function akokuSetup(){
  return `<div class="soon">
    <span class="tagsoon">JADUAL BELUM DISEDIAKAN</span>
    <h3>Jalankan koku-schema.sql dahulu</h3>
    <p>${esc(AKOKU.err?.message||'')}</p>
    <p>Buka <b>Supabase Dashboard → SQL Editor</b>, tampal kandungan fail <code>koku-schema.sql</code> dalam projek ini, kemudian tekan <b>Run</b>. Ia akan mencipta jadual <code>koku_units</code> dan <code>koku_members</code> serta memasukkan terus 38 unit sekolah (8 Unit Beruniform, 14 Kelab &amp; Persatuan, 12 Sukan &amp; Permainan, 4 Rumah Sukan) berserta nama guru penasihat.</p>
  </div>`;
}
const akUnitsOf=c=>AKOKU.units.filter(u=>u.category===c);
const akCount=id=>AKOKU.members.filter(m=>m.unit_id===id).length;
const akStudent=id=>cache.students.find(s=>s.id===id);
const akClasses=()=>classesFromStudents();

/* ================= TAB 1: UNIT & PENASIHAT ================= */
async function renderKokuAdmin(){
  const box=$('#tab-koku');
  box.innerHTML='<div class="empty">Memuat…</div>';
  if(!await akokuLoad()){box.innerHTML=akokuSetup();return;}
  const e=AKOKU.edit;
  box.innerHTML=`
    <div class="card">
      <h3>${e?'Kemaskini Unit':'Tambah Unit Baharu'}</h3>
      <div class="addrow">
        <select id="ak-cat">${AKCATS.map(c=>`<option value="${c.k}" ${e&&e.category===c.k?'selected':''}>${esc(c.l)}</option>`).join('')}</select>
        <input type="text" id="ak-name" placeholder="Nama unit" value="${e?esc(e.name):''}">
        <input type="text" id="ak-day" placeholder="Hari perjumpaan (pilihan)" value="${e?esc(e.meet_day||''):''}">
      </div>
      <div class="addrow"><input type="text" id="ak-adv" placeholder="Guru penasihat — pisah dengan koma, (K) untuk ketua" value="${e?esc(e.advisors||''):''}"></div>
      <div class="addrow">
        <button class="btn btn-primary" id="ak-save">${e?'Simpan Perubahan':'Tambah Unit'}</button>
        ${e?'<button class="btn btn-ghost" id="ak-cancel">Batal</button>':''}
      </div>
    </div>
    ${AKCATS.map(c=>{
      const us=akUnitsOf(c.k);
      return `<div class="card"><h3>${esc(c.l)} <span style="font-size:13px;color:var(--muted);font-weight:600">(${us.length} unit)</span></h3>
        ${us.map(u=>`<div class="item" data-id="${u.id}">
          <span class="grow"><span class="nm">${esc(u.name)} ${u.active?`<span class="pill g" style="font-size:10px">${akCount(u.id)} AHLI</span>`:'<span class="pill" style="font-size:10px">TIDAK AKTIF</span>'}</span>
          <br><span class="sub">${u.meet_day?'📅 '+esc(u.meet_day)+' · ':''}${esc(u.advisors||'Tiada guru penasihat direkod')}</span></span>
          <button class="icon-btn" data-act="edit">Edit</button>
          <button class="icon-btn" data-act="aktif">${u.active?'Nyahaktif':'Aktifkan'}</button>
          <button class="icon-btn danger" data-act="del">Padam</button></div>`).join('')||'<div class="sub">Tiada unit.</div>'}
      </div>`;}).join('')}`;

  $('#ak-save').onclick=async()=>{
    const name=$('#ak-name').value.trim();
    if(!name){toast('Nama unit wajib');return;}
    const row={category:$('#ak-cat').value,name,advisors:$('#ak-adv').value.trim()||null,meet_day:$('#ak-day').value.trim()||null};
    $('#ak-save').disabled=true;
    try{
      if(e){const{error}=await sb.from('koku_units').update(row).eq('id',e.id);if(error)throw error;AKOKU.edit=null;toast('Unit dikemaskini ✓');}
      else{const{error}=await sb.from('koku_units').insert({...row,sort:akUnitsOf(row.category).length+1});if(error)throw error;toast('Unit ditambah ✓');}
      renderKokuAdmin();
    }catch(err){toast('Ralat: '+err.message);$('#ak-save').disabled=false;}
  };
  if(e)$('#ak-cancel').onclick=()=>{AKOKU.edit=null;renderKokuAdmin();};
  box.onclick=async ev=>{
    const b=ev.target.closest('[data-act]');if(!b)return;
    const id=ev.target.closest('.item').dataset.id, u=AKOKU.units.find(x=>x.id===id);
    if(b.dataset.act==='edit'){AKOKU.edit=u;renderKokuAdmin();window.scrollTo(0,0);return;}
    if(b.dataset.act==='aktif'){try{const{error}=await sb.from('koku_units').update({active:!u.active}).eq('id',id);if(error)throw error;renderKokuAdmin();}catch(err){toast('Ralat: '+err.message);}return;}
    if(b.dataset.act==='del'){
      const n=akCount(id);
      if(!confirm(`Padam unit "${u.name}"?${n?`\nRekod ${n} ahli dalam unit ini akan turut dipadam.`:''}`))return;
      try{const{error}=await sb.from('koku_units').delete().eq('id',id);if(error)throw error;toast('Unit dipadam');renderKokuAdmin();}catch(err){toast('Ralat: '+err.message);}
    }
  };
}

/* ================= TAB 2: DAFTAR AHLI ================= */
async function renderKokuAhli(){
  const box=$('#tab-kokuahli');
  box.innerHTML='<div class="empty">Memuat…</div>';
  if(!await akokuLoad()){box.innerHTML=akokuSetup();return;}
  const cat=AKOKU._cat||'beruniform';
  box.innerHTML=`
    <div class="card">
      <h3>Daftar Ahli Unit</h3>
      <div class="addrow">
        <select id="am-cat">${AKCATS.map(c=>`<option value="${c.k}" ${c.k===cat?'selected':''}>${esc(c.l)}</option>`).join('')}</select>
        <select id="am-unit"></select>
        <select id="am-kelas"><option value="">— Pilih kelas —</option>${akClasses().map(c=>`<option>${esc(c)}</option>`).join('')}</select>
      </div>
      <div class="addrow">
        <button class="icon-btn" id="am-all">Tanda Semua</button>
        <button class="icon-btn" id="am-none">Buang Semua Tanda</button>
        <button class="icon-btn" id="am-import">Import CSV</button>
        <button class="icon-btn" id="am-templat">Templat CSV</button>
        <input type="file" id="am-file" accept=".csv" hidden>
        <span class="grow"></span>
        <button class="btn btn-primary" id="am-save">Simpan</button>
      </div>
      <div class="sub" id="am-info" style="margin:4px 2px"></div>
      <div id="am-list"></div>
    </div>
    <div class="card"><h3 id="am-cur-title">Ahli semasa</h3><div id="am-current"></div></div>`;

  $('#am-cat').onchange=()=>{AKOKU._cat=$('#am-cat').value;AKOKU._unit=null;renderKokuAhli();};
  const us=akUnitsOf(cat).filter(u=>u.active);
  $('#am-unit').innerHTML=us.length?us.map(u=>`<option value="${u.id}">${esc(u.name)} (${akCount(u.id)})</option>`).join(''):'<option value="">(Tiada unit)</option>';
  if(AKOKU._unit&&us.some(u=>u.id===AKOKU._unit))$('#am-unit').value=AKOKU._unit;
  AKOKU._unit=$('#am-unit').value||null;
  if(AKOKU._kelas)$('#am-kelas').value=AKOKU._kelas;
  $('#am-unit').onchange=()=>{AKOKU._unit=$('#am-unit').value;akList();akCurrent();};
  $('#am-kelas').onchange=()=>{AKOKU._kelas=$('#am-kelas').value;akList();};
  $('#am-all').onclick=()=>{document.querySelectorAll('#am-list input[type=checkbox]').forEach(c=>c.checked=true);akInfo();};
  $('#am-none').onclick=()=>{document.querySelectorAll('#am-list input[type=checkbox]').forEach(c=>c.checked=false);akInfo();};
  $('#am-save').onclick=akSave;
  $('#am-templat').onclick=()=>download('templat_ahli_kokurikulum.csv','NoKP,Kategori,Unit,Jawatan\n081201071234,beruniform,Kor Kadet Polis,Ahli\n081201071234,kelab,Kelab Nilam,AJK\n081201071234,sukan,Badminton,Ahli\n081201071234,rumah,Rumah Juara (Merah),Ahli');
  $('#am-import').onclick=()=>$('#am-file').click();
  $('#am-file').onchange=ev=>{const f=ev.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>akImportCSV(rd.result);rd.readAsText(f,'UTF-8');ev.target.value='';};
  akList(); akCurrent();
}
function akList(){
  const box=$('#am-list'), kelas=$('#am-kelas').value, unit=AKOKU._unit, cat=$('#am-cat').value;
  if(!unit){box.innerHTML='<div class="sub" style="padding:10px 2px">Tiada unit aktif dalam kategori ini.</div>';$('#am-info').textContent='';return;}
  if(!kelas){box.innerHTML='<div class="sub" style="padding:10px 2px">Pilih kelas untuk senaraikan murid.</div>';$('#am-info').textContent='';return;}
  const list=cache.students.filter(s=>s.kelas===kelas).sort((a,b)=>a.name.localeCompare(b.name));
  const inCat={};AKOKU.members.filter(m=>m.category===cat).forEach(m=>inCat[m.student_id]=m.unit_id);
  box.innerHTML=list.map((s,i)=>{
    const cur=inCat[s.id]||'';
    const other=cur&&cur!==unit?AKOKU.units.find(u=>u.id===cur):null;
    return `<div class="item">
      <input type="checkbox" data-id="${s.id}" data-cur="${cur}" ${cur===unit?'checked':''} style="width:20px;height:20px;flex:none">
      <span class="grow"><span class="nm">${i+1}. ${esc(s.name)}</span><br><span class="sub">${esc(s.nokp)}${other?` · <span style="color:var(--warn)">kini: ${esc(other.name)}</span>`:''}</span></span>
    </div>`;}).join('')||'<div class="sub">Tiada murid dalam kelas ini.</div>';
  box.onchange=akInfo; akInfo();
}
function akInfo(){
  const cbs=[...document.querySelectorAll('#am-list input[type=checkbox]')];
  const tick=cbs.filter(c=>c.checked).length;
  const pindah=cbs.filter(c=>c.checked&&c.dataset.cur&&c.dataset.cur!==AKOKU._unit).length;
  $('#am-info').innerHTML=cbs.length?`${tick} ditanda daripada ${cbs.length} murid.${pindah?` <b style="color:var(--warn)">${pindah} murid akan dipindahkan daripada unit lain</b> (1 murid = 1 unit bagi setiap kategori).`:''}`:'';
}
async function akSave(){
  const unit=AKOKU._unit, cat=$('#am-cat').value;
  if(!unit){toast('Pilih unit');return;}
  const cbs=[...document.querySelectorAll('#am-list input[type=checkbox]')];
  if(!cbs.length){toast('Pilih kelas dahulu');return;}
  const add=cbs.filter(c=>c.checked).map(c=>({unit_id:unit,student_id:c.dataset.id,category:cat,role:'Ahli'}));
  const drop=cbs.filter(c=>!c.checked&&c.dataset.cur===unit).map(c=>c.dataset.id);
  $('#am-save').disabled=true;
  try{
    if(add.length){const{error}=await sb.from('koku_members').upsert(add,{onConflict:'student_id,category'});if(error)throw error;}
    if(drop.length){const{error}=await sb.from('koku_members').delete().eq('unit_id',unit).in('student_id',drop);if(error)throw error;}
    toast(`Disimpan ✓ ${add.length} ahli${drop.length?', '+drop.length+' dibuang':''}`);
    await akokuLoad(); akList(); akCurrent();
    const sel=$('#am-unit');const keep=sel.value;
    sel.innerHTML=akUnitsOf(cat).filter(u=>u.active).map(u=>`<option value="${u.id}">${esc(u.name)} (${akCount(u.id)})</option>`).join('');
    sel.value=keep;
  }catch(e){toast('Ralat: '+e.message);}
  $('#am-save').disabled=false;
}
async function akCurrent(){
  const box=$('#am-current'), unit=AKOKU._unit;
  if(!unit){box.innerHTML='<div class="sub">—</div>';return;}
  const u=AKOKU.units.find(x=>x.id===unit);
  box.innerHTML='<div class="sub">Memuat…</div>';
  let rows=[];
  try{const{data,error}=await sb.from('koku_members').select('id,role,student_id').eq('unit_id',unit);if(error)throw error;rows=data||[];}
  catch(e){box.innerHTML='<div class="sub">Ralat: '+esc(e.message)+'</div>';return;}
  rows=rows.map(r=>({...r,s:akStudent(r.student_id)})).filter(r=>r.s)
    .sort((a,b)=>((a.s.kelas||'').localeCompare(b.s.kelas||''))||a.s.name.localeCompare(b.s.name));
  $('#am-cur-title').innerHTML=`Ahli semasa — ${esc(u?u.name:'')} <span style="font-size:13px;color:var(--muted);font-weight:600">(${rows.length} murid)</span>`;
  box.innerHTML=rows.map((r,i)=>`<div class="item" data-mid="${r.id}">
      <span class="grow"><span class="nm">${i+1}. ${esc(r.s.name)}</span><br><span class="sub">${esc(r.s.nokp)} · ${esc(r.s.kelas||'')}</span></span>
      <select data-act="role">${AK_ROLES.map(x=>`<option ${x===r.role?'selected':''}>${x}</option>`).join('')}</select>
      <button class="icon-btn danger" data-act="buang">Buang</button></div>`).join('')||'<div class="sub">Belum ada ahli.</div>';
  box.onclick=async e=>{
    const b=e.target.closest('[data-act="buang"]');if(!b)return;
    const id=e.target.closest('[data-mid]').dataset.mid;
    try{const{error}=await sb.from('koku_members').delete().eq('id',id);if(error)throw error;await akokuLoad();akList();akCurrent();toast('Dibuang');}catch(err){toast('Ralat: '+err.message);}
  };
  box.onchange=async e=>{
    if(e.target.dataset.act!=='role')return;
    const id=e.target.closest('[data-mid]').dataset.mid;
    try{const{error}=await sb.from('koku_members').update({role:e.target.value}).eq('id',id);if(error)throw error;toast('Jawatan dikemaskini');}catch(err){toast('Ralat: '+err.message);}
  };
}
async function akImportCSV(text){
  const rows=parseCSV(text); if(rows.length<2){toast('Fail kosong');return;}
  const h=rows[0].map(x=>x.toLowerCase().replace(/[^a-z]/g,''));
  const find=ks=>h.findIndex(x=>ks.includes(x));
  const iK=find(['nokp','nokad','ic','kp']),iC=find(['kategori','category']),iU=find(['unit','nama','namaunit']),iJ=find(['jawatan','role']);
  if(iK<0||iU<0){toast('Lajur perlu: NoKP, Unit (dan Kategori)');return;}
  const byNokp={};cache.students.forEach(s=>byNokp[(s.nokp||'').replace(/\D/g,'')]=s);
  const unitKey=(c,n)=>c+'|'+n.trim().toLowerCase();
  const byUnit={};AKOKU.units.forEach(u=>byUnit[unitKey(u.category,u.name)]=u);
  const byName={};AKOKU.units.forEach(u=>{byName[u.name.trim().toLowerCase()]=byName[u.name.trim().toLowerCase()]||u;});
  const out=[];const bad=[];
  for(let r=1;r<rows.length;r++){
    const c=rows[r];
    const nokp=(c[iK]||'').replace(/\D/g,''), un=(c[iU]||'').trim(), ct=(iC>=0?(c[iC]||'').trim().toLowerCase():'');
    if(!nokp||!un)continue;
    const s=byNokp[nokp]; const u=byUnit[unitKey(ct,un)]||byName[un.toLowerCase()];
    if(!s){bad.push(`Baris ${r+1}: No. KP ${nokp} tiada dalam senarai murid`);continue;}
    if(!u){bad.push(`Baris ${r+1}: unit "${un}" tidak dijumpai`);continue;}
    out.push({unit_id:u.id,student_id:s.id,category:u.category,role:(iJ>=0?(c[iJ]||'').trim():'')||'Ahli'});
  }
  if(!out.length){toast('Tiada baris sah'+(bad.length?': '+bad[0]:''));return;}
  if(!confirm(`Daftar ${out.length} keahlian?${bad.length?`\n${bad.length} baris akan dilangkau.`:''}\nMurid yang sudah ada unit lain dalam kategori sama akan dipindahkan.`))return;
  try{
    for(let i=0;i<out.length;i+=200){
      const{error}=await sb.from('koku_members').upsert(out.slice(i,i+200),{onConflict:'student_id,category'});
      if(error)throw error;
      toast(`Memuat naik… ${Math.min(i+200,out.length)}/${out.length}`);
    }
    await akokuLoad(); renderKokuAhli();
    toast(`Siap: ${out.length} keahlian didaftarkan${bad.length?', '+bad.length+' dilangkau':''}`);
    if(bad.length)console.warn('Baris dilangkau:\n'+bad.join('\n'));
  }catch(e){toast('Ralat: '+e.message);}
}
