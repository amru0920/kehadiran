/* ===== LATIHAN (rekod homework) ===== */
const LT={ex:null,roster:[],st:{}}; // st: student_id -> {status,ambil_date,hantar_date,semak_date}
const LT_LABEL=['Belum','Ambil','Hantar','Semak'];
function fillLtKelas(){
  const cls=classesForTeacher();
  let html=`<optgroup label="Kelas Tingkatan">`+cls.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')+`</optgroup>`;
  const grps=state.groups||[];
  if(grps.length) html+=`<optgroup label="Kumpulan Subjek">`+grps.map(g=>`<option value="grp:${g.id}">${esc(g.name)}${g.subject?' — '+esc(g.subject):''}</option>`).join('')+`</optgroup>`;
  $('#lt-kelas').innerHTML=html;
}
function renderLatihan(){
  fillLtKelas();
  if(!$('#lt-date').value)$('#lt-date').value=todayISO();
  $('#lt-kelas').onchange=ltLoad;
  $('#lt-subjek').onchange=ltLoad;
  $('#lt-date').onchange=ltLoad;
  $('#lt-name').onchange=ltLoad;
  $('#lt-seg').onclick=e=>{const b=e.target.closest('[data-lt]');if(!b)return;document.querySelectorAll('#lt-seg button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const v=b.dataset.lt;$('#lt-rekod').classList.toggle('hidden',v!=='rekod');$('#lt-lapor').classList.toggle('hidden',v!=='lapor');if(v==='lapor')ltReport();};
  ltLoad();
}
const rosterForClassName=cn=>{const g=(state.groups||[]).find(x=>x.name===cn);return g?rosterForGroup(g):rosterFor(cn);};
let LTR_CACHE=[];
async function ltReport(){
  const cls=[...new Set([...allClassList(),...(state.groups||[]).map(g=>g.name)])].sort();
  $('#ltr-kelas').innerHTML='<option value="">Semua kelas</option>'+cls.map(c=>`<option>${esc(c)}</option>`).join('');
  $('#ltr-kelas').onchange=ltrRun;$('#ltr-q').oninput=ltrRun;
  $('#ltr-out').innerHTML='<div class="empty">Memuat…</div>';
  try{LTR_CACHE=await DB.exercisesList();}catch(e){$('#ltr-out').innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';return;}
  ltrRun();
}
function ltrRun(){
  const cls=$('#ltr-kelas').value,q=($('#ltr-q').value||'').trim().toLowerCase();
  const myIc=state.teacher?.ic||null;
  let list=LTR_CACHE.filter(x=>(!myIc||x.teacher_ic===myIc)&&(!cls||x.class_name===cls)&&(!q||(x.name||'').toLowerCase().includes(q)));
  if(!list.length){$('#ltr-out').innerHTML='<div class="empty"><strong>Tiada latihan</strong>Cuba tukar tapisan.</div>';return;}
  $('#ltr-out').innerHTML='<p class="legend">'+list.length+' latihan. Tekan untuk lihat siapa dapat & belum.</p>'+list.map(x=>{
    const total=rosterForClassName(x.class_name).length||0;
    const st=x.exercise_status||[];
    const semak=st.filter(s=>s.status>=3).length,hantar=st.filter(s=>s.status>=2).length,ambil=st.filter(s=>s.status>=1).length;
    return `<div class="dcard" data-ex="${x.id}" style="cursor:pointer"><div class="info">
      <div class="cn">${esc(x.name)}</div>
      <div class="det">${esc(x.class_name)} · ${esc(x.subject||'-')} · ${esc(x.edate||'')} · ${esc(tName(x.teacher_ic))}</div>
      <div class="det" style="margin-top:4px">Ambil ${ambil}/${total} · Hantar ${hantar} · <b style="color:var(--present)">Semak ${semak}</b></div>
    </div></div>`;}).join('');
  $('#ltr-out').onclick=e=>{const d=e.target.closest('[data-ex]');if(d)ltrDetail(d.dataset.ex);};
}
async function ltrDetail(id){
  $('#ltr-out').innerHTML='<div class="empty">Memuat…</div>';
  let ex;try{ex=await DB.exerciseDetail(id);}catch(e){$('#ltr-out').innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';return;}
  const roster=rosterForClassName(ex.class_name);
  const stMap={};(ex.exercise_status||[]).forEach(s=>stMap[s.student_id]=s);
  const buckets={0:[],1:[],2:[],3:[]};
  roster.forEach(s=>{const st=stMap[s.id]?.status||0;buckets[st].push({s,rec:stMap[s.id]||{}});});
  const LAB=['Belum Ambil','Ambil','Hantar','Semak'];const COL=['#9aa3b2','var(--warn)','var(--brand)','var(--present)'];
  const sec=(lvl)=>{const arr=buckets[lvl];if(!arr.length)return '';
    return `<h4 style="font-size:13px;margin:14px 2px 6px;color:${COL[lvl]}">${LAB[lvl]} (${arr.length})</h4>`+
      arr.map(({s,rec})=>{const d=[];if(rec.ambil_date)d.push('A:'+rec.ambil_date.slice(5));if(rec.hantar_date)d.push('H:'+rec.hantar_date.slice(5));if(rec.semak_date)d.push('S:'+rec.semak_date.slice(5));
        return `<div class="dcard" style="border-left:4px solid ${COL[lvl]}"><div class="info"><div class="cn">${esc(s.name)}</div><div class="det">${esc(s.nokp)}${d.length?' · '+d.join(' '):''}</div></div></div>`;}).join('');};
  $('#ltr-out').innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:10px"><button class="btn btn-ghost" id="ltr-back">← Kembali</button><button class="btn btn-ghost" id="ltr-del" style="color:var(--absent)">Padam Latihan</button></div>
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin-bottom:6px;box-shadow:var(--shadow)">
      <div style="font-size:16px;font-weight:800">${esc(ex.name)}</div>
      <div style="font-size:13px;color:var(--muted)">${esc(ex.class_name)} · ${esc(ex.subject||'-')} · ${esc(ex.edate||'')} · ${esc(tName(ex.teacher_ic))}</div>
    </div>
    ${sec(0)}${sec(1)}${sec(2)}${sec(3)}`;
  $('#ltr-back').onclick=ltReport;
  $('#ltr-del').onclick=async()=>{if(confirm('Padam latihan ini + semua rekod status? Tak boleh undo.')){try{await DB.delExercise(id);toast('Latihan dipadam');ltReport();}catch(e){toast('Ralat: '+e.message);}}};
}
function ltRosterResolve(){
  const val=$('#lt-kelas').value||'';
  if(val.startsWith('grp:')){const g=(state.groups||[]).find(x=>'grp:'+x.id===val);return{kelas:g?g.name:null,roster:g?rosterForGroup(g):[]};}
  return{kelas:val||null,roster:val?rosterFor(val):[]};
}
async function ltLoad(){
  const r=ltRosterResolve();
  LT.roster=r.roster; LT.kelas=r.kelas; LT.st={};
  const name=$('#lt-name').value.trim(), subj=$('#lt-subjek').value, edate=$('#lt-date').value;
  if(LT.kelas&&name&&edate){
    try{const ex=await DB.getExercise(LT.kelas,subj,name,edate);
      if(ex){(ex.exercise_status||[]).forEach(s=>{LT.st[s.student_id]={status:s.status||0,ambil_date:s.ambil_date,hantar_date:s.hantar_date,semak_date:s.semak_date};});}
    }catch(e){toast('Ralat muat: '+e.message);}
  }
  renderLtRoster();
}
function renderLtRoster(){
  if(!LT.roster.length){$('#lt-roster').innerHTML='<div class="empty"><strong>Pilih kelas & nama latihan</strong>Roster akan keluar bila lengkap.</div>';['lt-ambil','lt-hantar','lt-semak'].forEach(id=>$('#'+id).textContent='0');return;}
  const colors=['#9aa3b2','var(--warn)','var(--brand)','var(--present)'];
  $('#lt-roster').innerHTML=LT.roster.map((s,i)=>{
    const st=LT.st[s.id]?.status||0;
    const dates=[];const rec=LT.st[s.id]||{};
    if(rec.ambil_date)dates.push('A:'+rec.ambil_date.slice(5));
    if(rec.hantar_date)dates.push('H:'+rec.hantar_date.slice(5));
    if(rec.semak_date)dates.push('S:'+rec.semak_date.slice(5));
    return `<div class="student" data-id="${s.id}">
      <div class="srow" data-act="lt-toggle" style="cursor:pointer"><span class="num">${i+1}.</span>
        <span class="who"><span class="name">${esc(s.name)}</span><br><span class="meta">${esc(s.nokp)}${dates.length?' · '+dates.join(' '):''}</span></span>
        <span class="status" style="background:${colors[st]}22;color:${colors[st]}">${LT_LABEL[st]}</span></div></div>`;
  }).join('');
  let a=0,h=0,sm=0;Object.values(LT.st).forEach(x=>{if(x.status>=1)a++;if(x.status>=2)h++;if(x.status>=3)sm++;});
  $('#lt-ambil').textContent=a;$('#lt-hantar').textContent=h;$('#lt-semak').textContent=sm;
}
$('#lt-roster').addEventListener('click',e=>{
  const b=e.target.closest('[data-act="lt-toggle"]');if(!b)return;
  const id=e.target.closest('.student').dataset.id;
  const rec=LT.st[id]||{status:0};
  rec.status=((rec.status||0)+1)%4;
  const today=todayISO();
  if(rec.status===1&&!rec.ambil_date)rec.ambil_date=today;
  if(rec.status===2&&!rec.hantar_date)rec.hantar_date=today;
  if(rec.status===3&&!rec.semak_date)rec.semak_date=today;
  if(rec.status===0){rec.ambil_date=null;rec.hantar_date=null;rec.semak_date=null;}
  LT.st[id]=rec;
  renderLtRoster();
  ltSave(); // auto-save tiap perubahan
});
let ltSaveTimer=null;
function ltSave(){
  clearTimeout(ltSaveTimer);
  ltSaveTimer=setTimeout(async()=>{
    const name=$('#lt-name').value.trim();
    if(!LT.kelas||!name){return;}
    try{
      const statuses=Object.entries(LT.st).map(([student_id,x])=>({student_id,status:x.status,ambil_date:x.ambil_date||null,hantar_date:x.hantar_date||null,semak_date:x.semak_date||null}));
      await DB.saveExercise({name,class_name:LT.kelas,subject:$('#lt-subjek').value,teacher_ic:state.teacher?.ic||null,teacher_name:state.teacher?.name||null,edate:$('#lt-date').value},statuses);
    }catch(e){toast('Ralat simpan: '+e.message);}
  },600);
}
