/* ===== DISIPLIN (kesalahan ringan) ===== */
async function renderDisiplinAdmin(){
  try{ await loadStudents(); }catch(e){ toast('Ralat: '+e.message); }
  $('#tab-disiplin').innerHTML=`<div class="card"><h3>Disiplin — Kesalahan Ringan</h3>
    <div class="seg" id="dz-seg"><button class="active" data-z="lapor">Laporan</button><button data-z="rekod">Rekod</button><button data-z="jenis">Jenis Kesalahan</button></div>
    <div id="dz-out"></div></div>`;
  $('#dz-seg').onclick=e=>{const b=e.target.closest('[data-z]');if(!b)return;document.querySelectorAll('#dz-seg button').forEach(x=>x.classList.remove('active'));b.classList.add('active');dzView(b.dataset.z);};
  dzView('lapor');
}
function dzView(z){ if(z==='rekod')dzRekod(); else if(z==='jenis')dzJenis(); else dzLapor(); }

async function fetchOffences(from,to,cls){
  let q=sb.from('offences').select('*');
  if(from)q=q.gte('odate',from); if(to)q=q.lte('odate',to); if(cls)q=q.eq('class_name',cls);
  const {data,error}=await q.order('odate',{ascending:false}); if(error)throw error; return data||[];
}
function dzPeriod(){return document.querySelector('#dz-period button.active')?.dataset.p||'bulan';}
function dzRange(p){const t=new Date();const to=t.toISOString().slice(0,10);
  if(p==='hari')return[to,to];
  if(p==='minggu'){const f=new Date(t);f.setDate(t.getDate()-6);return[f.toISOString().slice(0,10),to];}
  if(p==='bulan')return[t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-01',to];
  return[null,null];}
async function dzLapor(){
  $('#dz-out').innerHTML=`<div class="seg" id="dz-period"><button data-p="hari">Hari Ini</button><button data-p="minggu">Minggu Ini</button><button class="active" data-p="bulan">Bulan Ini</button><button data-p="semua">Semua</button></div>
    <div class="addrow"><select id="dz-cls"><option value="">Semua kelas</option>${classesFromStudents().map(c=>'<option>'+esc(c)+'</option>').join('')}</select><input id="dz-q" placeholder="🔍 Cari murid (pilihan)"></div>
    <div id="dz-lout"></div>`;
  $('#dz-period').onclick=e=>{const b=e.target.closest('[data-p]');if(!b)return;document.querySelectorAll('#dz-period button').forEach(x=>x.classList.remove('active'));b.classList.add('active');dzRun();};
  $('#dz-cls').onchange=dzRun; $('#dz-q').oninput=dzRun;
  dzRun();
}
let dzData=[];
async function dzRun(){
  const box=$('#dz-lout');box.innerHTML='<div class="empty">Memuat…</div>';
  const [from,to]=dzRange(dzPeriod());const cls=$('#dz-cls').value;const q=($('#dz-q').value||'').trim().toLowerCase();
  let data=[];try{data=await fetchOffences(from,to,cls);}catch(e){box.innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';return;}
  if(q)data=data.filter(o=>(o.student_name||'').toLowerCase().includes(q)||(o.student_nokp||'').includes(q));
  dzData=data;
  if(!data.length){box.innerHTML='<div class="empty">Tiada rekod kesalahan untuk tapisan ini.</div>';return;}
  const byStu={};
  data.forEach(o=>{const k=o.student_nokp;byStu[k]=byStu[k]||{nokp:k,name:o.student_name,kelas:o.class_name,count:0,last:o.odate};byStu[k].count++;});
  const stuRows=Object.values(byStu).sort((a,b)=>b.count-a.count);
  box.innerHTML=`<p class="legend">${stuRows.length} murid · ${data.length} kesalahan. Tekan nama untuk butiran.</p>`+
    stuRows.map(s=>{const col=s.count>=5?'var(--absent)':s.count>=3?'#e8743b':s.count>=2?'var(--warn)':'var(--muted)';
      return `<div class="item" data-nokp="${esc(s.nokp)}" style="cursor:pointer;border-left:4px solid ${col}">
        <span class="grow"><span class="nm">${esc(s.name||'-')}</span><br><span class="sub">${esc(s.kelas||'')}</span></span>
        <span class="pill" style="background:${col};color:#fff">${s.count} kesalahan</span></div>`;}).join('');
  box.onclick=e=>{const it=e.target.closest('[data-nokp]');if(it)dzStudent(it.dataset.nokp);};
}
function dzStudent(nokp){
  const box=$('#dz-lout');
  const rows=dzData.filter(o=>o.student_nokp===nokp).sort((a,b)=>(b.odate||'').localeCompare(a.odate||''));
  const s=rows[0]||{};
  const byType={};rows.forEach(o=>byType[o.offence_type]=(byType[o.offence_type]||0)+1);
  box.innerHTML=`<button class="btn btn-ghost" id="dz-back" style="margin-bottom:10px">← Kembali</button>
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;margin-bottom:12px;box-shadow:var(--shadow)">
      <div style="font-size:17px;font-weight:800">${esc(s.student_name||'-')}</div>
      <div style="font-size:13px;color:var(--muted)">${esc(nokp)} · ${esc(s.class_name||'')}</div>
      <div style="margin-top:8px"><span class="pill" style="background:var(--absent);color:#fff">${rows.length} kesalahan</span></div>
      <div style="margin-top:8px;font-size:13px;color:var(--muted)">${Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([t,n])=>esc(t)+' ×'+n).join(' · ')}</div>
    </div>
    <table class="rpt-table"><tr><th>Tarikh</th><th>Kesalahan</th><th>Catatan</th><th>Direkod</th></tr>
    ${rows.map(o=>'<tr><td>'+esc(o.odate||'')+'</td><td><b>'+esc(o.offence_type)+'</b></td><td>'+esc(o.note||'-')+'</td><td>'+esc(o.recorded_name||'')+'</td></tr>').join('')}</table>`;
  $('#dz-back').onclick=dzRun;
}
async function dzJenis(){
  const box=$('#dz-out');box.innerHTML='<div class="empty">Memuat…</div>';
  let types=[];try{const {data,error}=await sb.from('offence_types').select('*').order('name');if(error)throw error;types=data||[];}catch(e){toast('Ralat: '+e.message);}
  box.innerHTML=`<div class="addrow"><input id="jz-name" placeholder="Jenis kesalahan baru"><button class="btn btn-primary" id="jz-add">Tambah</button></div>
    <div id="jz-list">${types.map(t=>'<div class="item" data-id="'+t.id+'"><span class="grow"><span class="nm">'+esc(t.name)+'</span></span><button class="icon-btn danger" data-act="del">Padam</button></div>').join('')||'<div class="sub">Tiada jenis kesalahan.</div>'}</div>`;
  $('#jz-add').onclick=async()=>{const name=$('#jz-name').value.trim();if(!name){toast('Isi nama');return;}try{const {error}=await sb.from('offence_types').insert({name});if(error)throw error;dzJenis();toast('Ditambah ✓');}catch(e){toast('Ralat: '+e.message);}};
  $('#jz-list').onclick=async e=>{const b=e.target.closest('[data-act="del"]');if(!b)return;const id=e.target.closest('.item').dataset.id;if(confirm('Padam jenis ini? (Rekod sedia ada tidak terjejas)')){try{const {error}=await sb.from('offence_types').delete().eq('id',id);if(error)throw error;dzJenis();toast('Dipadam');}catch(e){toast('Ralat: '+e.message);}}};
}
function drCard(s){return '<div class="item" data-id="'+s.id+'" data-nokp="'+esc(s.nokp||'')+'" data-name="'+esc(s.name)+'" data-kelas="'+esc(s.kelas||'')+'" style="cursor:pointer"><span class="grow"><span class="nm">'+esc(s.name)+'</span><br><span class="sub">'+esc(s.nokp||'')+' · '+esc(s.kelas||'')+'</span></span></div>';}
async function dzRekod(){
  $('#dz-out').innerHTML=`<div class="addrow"><select id="dr-kelas"><option value="">— Pilih kelas —</option>${classesFromStudents().map(c=>'<option>'+esc(c)+'</option>').join('')}</select><input id="dr-q" placeholder="🔍 Atau cari murid"></div><div id="dr-out"><div class="sub">Pilih kelas atau cari murid untuk rekod kesalahan.</div></div>`;
  $('#dr-kelas').onchange=()=>{$('#dr-q').value='';drList($('#dr-kelas').value);};
  $('#dr-q').oninput=()=>{const q=$('#dr-q').value.trim().toLowerCase();if(!q){return;}$('#dr-kelas').value='';const m=cache.students.filter(s=>s.name.toLowerCase().includes(q)||(s.nokp||'').includes(q)).slice(0,40);$('#dr-out').innerHTML=m.map(drCard).join('')||'<div class="sub">Tiada padanan.</div>';bindDr();};
}
function drList(kelas){if(!kelas){$('#dr-out').innerHTML='';return;}const list=cache.students.filter(s=>s.kelas===kelas).sort((a,b)=>a.name.localeCompare(b.name));$('#dr-out').innerHTML='<p class="legend">'+list.length+' murid dalam '+esc(kelas)+'</p>'+list.map(drCard).join('');bindDr();}
function bindDr(){$('#dr-out').onclick=e=>{const it=e.target.closest('[data-id]');if(it)drProfil(it.dataset);};}
async function drProfil(d){
  const box=$('#dr-out');box.innerHTML='<div class="empty">Memuat…</div>';
  let list=[],types=[];
  try{const o=await sb.from('offences').select('*').eq('student_nokp',d.nokp).order('odate',{ascending:false});list=o.data||[];const t=await sb.from('offence_types').select('name').eq('active',true).order('name');types=(t.data||[]).map(x=>x.name);}catch(e){toast('Ralat: '+e.message);}
  box.innerHTML=`<button class="btn btn-ghost" id="dr-back" style="margin-bottom:10px">← Kembali</button>
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;margin-bottom:10px;box-shadow:var(--shadow)"><b>${esc(d.name)}</b><br><span class="sub">${esc(d.nokp)} · ${esc(d.kelas)} · ${list.length} rekod</span></div>
    <div class="addrow"><select id="dr-type">${types.length?types.map(t=>'<option>'+esc(t)+'</option>').join(''):'<option value="">(Tiada jenis)</option>'}</select><input type="date" id="dr-date" value="${new Date().toISOString().slice(0,10)}"><input id="dr-note" placeholder="Catatan (pilihan)"><button class="btn btn-primary" id="dr-add">Rekod</button></div>
    <div id="dr-list">${list.map(o=>'<div class="item"><span class="grow"><span class="nm">'+esc(o.offence_type)+'</span><br><span class="sub">'+esc(o.odate||'')+(o.recorded_name?' · '+esc(o.recorded_name):'')+(o.note?' · '+esc(o.note):'')+'</span></span><button class="icon-btn danger" data-del="'+o.id+'">Padam</button></div>').join('')||'<div class="sub">Tiada rekod.</div>'}</div>`;
  $('#dr-back').onclick=()=>{const k=$('#dr-kelas').value;if(k)drList(k);else dzRekod();};
  $('#dr-add').onclick=async()=>{const type=$('#dr-type').value,note=$('#dr-note').value.trim(),odate=$('#dr-date').value;if(!type){toast('Pilih jenis');return;}try{const {error}=await sb.from('offences').insert({student_nokp:d.nokp,student_name:d.name,class_name:d.kelas,offence_type:type,note,odate,recorded_by:null,recorded_name:adminName});if(error)throw error;toast('Direkod ✓');drProfil(d);}catch(e){toast('Ralat: '+e.message);}};
  $('#dr-list').onclick=async e=>{const b=e.target.closest('[data-del]');if(!b)return;if(confirm('Padam rekod ini?')){try{const {error}=await sb.from('offences').delete().eq('id',b.dataset.del);if(error)throw error;drProfil(d);toast('Dipadam');}catch(e){toast('Ralat: '+e.message);}}};
}
