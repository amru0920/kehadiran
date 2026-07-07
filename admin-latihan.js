/* ===== LATIHAN: track cikgu bagi berapa banyak ikut kelas ===== */
let LA_GM={}; // groupName -> [studentIds]
async function renderLatihanAdmin(){
  try{await loadStudents();}catch(e){}
  try{const g=await sb.from('groups').select('name, group_members(student_id)');LA_GM={};(g.data||[]).forEach(x=>{LA_GM[x.name]=(x.group_members||[]).map(m=>m.student_id);});}catch(e){LA_GM={};}
  $('#tab-latihan').innerHTML=`<div class="card"><h3>Rekod Latihan</h3>
    <div class="seg" id="la-seg"><button class="active" data-z="lapor">Laporan</button><button data-z="ringkas">Ringkasan Guru</button></div>
    <div id="la-body"></div></div>`;
  $('#la-seg').onclick=e=>{const b=e.target.closest('[data-z]');if(!b)return;document.querySelectorAll('#la-seg button').forEach(x=>x.classList.remove('active'));b.classList.add('active');b.dataset.z==='ringkas'?laRingkas():laLapor();};
  laLapor();
}
const laRoster=cn=>LA_GM[cn]?LA_GM[cn].map(id=>cache.students.find(s=>s.id===id)).filter(Boolean):cache.students.filter(s=>s.kelas===cn);
let LA_CACHE=[];
async function laLapor(){
  const box=$('#la-body');
  const cls=[...new Set([...classesFromStudents(),...Object.keys(LA_GM)])].sort();
  const teachers=Object.entries(teachersByIc||{}).sort((a,b)=>(a[1]?.name||'').localeCompare(b[1]?.name||''));
  box.innerHTML=`<div class="addrow">
      <select id="la-guru"><option value="">Semua guru</option>${teachers.map(([ic,t])=>`<option value="${esc(ic)}">${esc(t.name||ic)}</option>`).join('')}</select>
      <select id="la-cls"><option value="">Semua kelas</option>${cls.map(c=>`<option>${esc(c)}</option>`).join('')}</select>
      <input id="la-q" placeholder="🔍 Cari nama latihan">
    </div><div id="la-lout"><div class="empty">Memuat…</div></div>`;
  $('#la-guru').onchange=laRun;$('#la-cls').onchange=laRun;$('#la-q').oninput=laRun;
  try{const {data,error}=await sb.from('exercises').select('*, exercise_status(status)').order('edate',{ascending:false});if(error)throw error;LA_CACHE=data||[];}catch(e){$('#la-lout').innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';return;}
  laRun();
}
function laRun(){
  const guru=$('#la-guru').value,cls=$('#la-cls').value,q=($('#la-q').value||'').trim().toLowerCase();
  let list=LA_CACHE.filter(x=>(!guru||x.teacher_ic===guru)&&(!cls||x.class_name===cls)&&(!q||(x.name||'').toLowerCase().includes(q)));
  const box=$('#la-lout');
  if(!list.length){box.innerHTML='<div class="empty">Tiada latihan untuk tapisan ini.</div>';return;}
  box.innerHTML='<p class="legend">'+list.length+' latihan. Tekan untuk lihat siapa dapat & belum.</p>'+list.map(x=>{
    const total=laRoster(x.class_name).length||0;const st=x.exercise_status||[];
    const semak=st.filter(s=>s.status>=3).length,hantar=st.filter(s=>s.status>=2).length,ambil=st.filter(s=>s.status>=1).length;
    return `<div class="item" data-ex="${x.id}" style="cursor:pointer"><span class="grow"><span class="nm">${esc(x.name)}</span><br><span class="sub">${esc(x.class_name)} · ${esc(x.subject||'-')} · ${esc(x.edate||'')} · ${esc(tName(x.teacher_ic||'?'))}</span><br><span class="sub">Ambil ${ambil}/${total} · Hantar ${hantar} · <b style="color:var(--present)">Semak ${semak}</b></span></span></div>`;}).join('');
  box.onclick=e=>{const d=e.target.closest('[data-ex]');if(d)laDetail(d.dataset.ex);};
}
async function laDetail(id){
  const box=$('#la-lout');box.innerHTML='<div class="empty">Memuat…</div>';
  let ex;try{const {data,error}=await sb.from('exercises').select('*, exercise_status(student_id,status,ambil_date,hantar_date,semak_date)').eq('id',id).single();if(error)throw error;ex=data;}catch(e){box.innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';return;}
  const roster=laRoster(ex.class_name);const stMap={};(ex.exercise_status||[]).forEach(s=>stMap[s.student_id]=s);
  const buckets={0:[],1:[],2:[],3:[]};roster.forEach(s=>{const st=stMap[s.id]?.status||0;buckets[st].push({s,rec:stMap[s.id]||{}});});
  const LAB=['Belum Ambil','Ambil','Hantar','Semak'];const COL=['#9aa3b2','var(--warn)','var(--brand)','var(--present)'];
  const sec=lvl=>{const arr=buckets[lvl];if(!arr.length)return '';return `<h4 style="font-size:13px;margin:14px 2px 6px;color:${COL[lvl]}">${LAB[lvl]} (${arr.length})</h4>`+arr.map(({s,rec})=>{const d=[];if(rec.ambil_date)d.push('A:'+rec.ambil_date.slice(5));if(rec.hantar_date)d.push('H:'+rec.hantar_date.slice(5));if(rec.semak_date)d.push('S:'+rec.semak_date.slice(5));return `<div class="item" style="border-left:4px solid ${COL[lvl]}"><span class="grow"><span class="nm">${esc(s.name)}</span><br><span class="sub">${esc(s.nokp)}${d.length?' · '+d.join(' '):''}</span></span></div>`;}).join('');};
  box.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:10px"><button class="btn btn-ghost" id="la-back">← Kembali</button><button class="btn btn-ghost" id="la-del" style="color:var(--absent)">Padam Latihan</button></div>
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin-bottom:6px;box-shadow:var(--shadow)"><div style="font-size:16px;font-weight:800">${esc(ex.name)}</div><div style="font-size:13px;color:var(--muted)">${esc(ex.class_name)} · ${esc(ex.subject||'-')} · ${esc(ex.edate||'')} · ${esc(tName(ex.teacher_ic||'?'))}</div></div>
    ${sec(0)}${sec(1)}${sec(2)}${sec(3)}`;
  $('#la-back').onclick=laLapor;
  $('#la-del').onclick=async()=>{if(confirm('Padam latihan ini + semua rekod status? Tak boleh undo.')){try{const {error}=await sb.from('exercises').delete().eq('id',id);if(error)throw error;toast('Latihan dipadam');laLapor();}catch(e){toast('Ralat: '+e.message);}}};
}
async function laRingkas(){
  const box=$('#la-body');box.innerHTML='<div class="empty">Memuat…</div>';
  let ex=[];try{const {data,error}=await sb.from('exercises').select('teacher_ic,teacher_name,class_name');if(error)throw error;ex=data||[];}catch(e){box.innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';return;}
  if(!ex.length){box.innerHTML='<div class="empty">Tiada rekod latihan.</div>';return;}
  const byT={};ex.forEach(x=>{const ic=x.teacher_ic||'?';byT[ic]=byT[ic]||{name:x.teacher_name||tName(ic),total:0,classes:{}};byT[ic].total++;byT[ic].classes[x.class_name]=(byT[ic].classes[x.class_name]||0)+1;});
  const teachers=Object.values(byT).sort((a,b)=>b.total-a.total);
  box.innerHTML=`<div class="cards"><div class="mcard"><div class="n">${ex.length}</div><div class="l">Jumlah latihan</div></div><div class="mcard"><div class="n">${teachers.length}</div><div class="l">Guru terlibat</div></div></div>`+
    teachers.map(t=>{const rows=Object.entries(t.classes).sort((a,b)=>b[1]-a[1]).map(([cn,n])=>`<tr><td>${esc(cn)}</td><td><span class="pill">${n}</span></td></tr>`).join('');
      return `<div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin-bottom:10px;box-shadow:var(--shadow)"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px"><b style="font-size:15px">${esc(t.name)}</b><span class="pill g">${t.total} latihan</span></div><table class="rpt-table"><tr><th>Kelas</th><th>Bilangan</th></tr>${rows}</table></div>`;}).join('');
}
async function OLD_renderLatihanAdmin(){
  $('#tab-latihan').innerHTML='<div class="card"><h3>Rekod Latihan Guru</h3><p class="legend">x</p><div id="la-out"><div class="empty">Memuat…</div></div></div>';
  let ex=[];
  try{const {data,error}=await sb.from('exercises').select('teacher_ic,teacher_name,class_name,subject,name,edate');if(error)throw error;ex=data||[];}catch(e){$('#la-out').innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';return;}
  if(!ex.length){$('#la-out').innerHTML='<div class="empty">Tiada rekod latihan lagi.</div>';return;}
  // group by teacher -> class
  const byT={};
  ex.forEach(x=>{const ic=x.teacher_ic||'?';const nm=x.teacher_name||tName(ic);byT[ic]=byT[ic]||{name:nm,total:0,classes:{}};byT[ic].total++;byT[ic].classes[x.class_name]=(byT[ic].classes[x.class_name]||0)+1;});
  const teachers=Object.values(byT).sort((a,b)=>b.total-a.total);
  $('#la-out').innerHTML=`<div class="cards"><div class="mcard"><div class="n">${ex.length}</div><div class="l">Jumlah latihan</div></div><div class="mcard"><div class="n">${teachers.length}</div><div class="l">Guru terlibat</div></div></div>`+
    teachers.map(t=>{
      const rows=Object.entries(t.classes).sort((a,b)=>b[1]-a[1]).map(([cn,n])=>`<tr><td>${esc(cn)}</td><td><span class="pill">${n}</span></td></tr>`).join('');
      return `<div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin-bottom:10px;box-shadow:var(--shadow)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px"><b style="font-size:15px">${esc(t.name)}</b><span class="pill g">${t.total} latihan</span></div>
        <table class="rpt-table"><tr><th>Kelas</th><th>Bilangan</th></tr>${rows}</table>
      </div>`;}).join('');
}
