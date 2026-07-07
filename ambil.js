const current={kelas:null,date:null,subjek:null,roster:[],absent:{}};

function setSubjek(subj){const sel=$('#subjek');const has=[...sel.options].some(o=>o.value===subj);if(has){sel.value=subj;$('#subjek-custom-wrap').classList.add('hidden');}else{sel.value='Lain-lain';$('#subjek-custom-wrap').classList.remove('hidden');$('#subjek-custom').value=subj;}}
function getSubjek(){
  const v=$('#subjek').value;
  return v==='Lain-lain'?($('#subjek-custom').value.trim()||'Lain-lain'):v;
}
function getMasa(){const a=$('#masa-mula').value,b=$('#masa-tamat').value;return a&&b?`${a}-${b}`:(a||'');}

// Subjek "Lain-lain" → tunjuk input teks
$('#subjek').addEventListener('change',()=>{
  const v=$('#subjek').value;
  $('#subjek-custom-wrap').classList.toggle('hidden',v!=='Lain-lain');
  loadCurrent();
});
$('#subjek-custom').addEventListener('change',loadCurrent);

/* ===== AMBIL ===== */
async function loadCurrent(){
  const val=$('#kelas').value||'';
  current.group=null;
  if(val.startsWith('grp:')){
    const g=(state.groups||[]).find(x=>'grp:'+x.id===val);
    current.group=g||null;
    current.kelas=g?g.name:null;
    if(g&&g.subject)setSubjek(g.subject);
  }else{
    current.kelas=val||null;
  }
  current.date=$('#tarikh').value;
  current.subjek=getSubjek();
  current.absent={};
  if(!current.kelas){current.roster=[];renderRoster();$('#save-info').textContent='';return;}
  current.roster=current.group?rosterForGroup(current.group):rosterFor(current.kelas);
  try{
    const s=await DB.getSession(current.kelas,current.date,current.subjek);
    if(s){
      s.absentees.forEach(a=>current.absent[a.student_id]=a.reason);
      if(s.session_time){const[a,b]=s.session_time.split('-');$('#masa-mula').value=a||'';$('#masa-tamat').value=b||'';}
    }
    $('#save-info').textContent=s?'✏️ Mod edit — rekod sedia ada dimuatkan, ubah & simpan semula':'Belum disimpan';
    $('#save-info').style.color='';
    $('#btn-simpan').textContent=s?'Kemaskini Rekod':'Simpan Rekod';
  }catch(e){toast('Ralat memuat: '+e.message);}
  renderRoster();
}
function renderRoster(){
  $('#roster').innerHTML=current.roster.map((s,i)=>{
    const v=current.absent[s.id];
    const isNA=v===NA, ab=v!==undefined&&!isNA, rs=ab?v:'';
    const cls=isNA?'na':(ab?'absent':'');
    const badge=isNA?`<span class="status na">Tidak Berkenaan</span>`:(ab?`<span class="status no">Tidak Hadir</span>`:`<span class="status yes">✓ Hadir</span>`);
    return `<div class="student ${cls}" data-id="${s.id}">
      <div class="srow" data-act="toggle"><span class="num">${i+1}.</span>
        <span class="who"><span class="name">${esc(s.name)}</span><br><span class="meta">${esc(s.nokp)} · ${esc(s.kelas||'')}</span></span>
        ${badge}</div>
      ${ab?`<div class="reasons">${REASONS.map(r=>{const on=r==='Dengan Kebenaran'?(rs||'').startsWith('Dengan Kebenaran'):rs===r;return `<button class="chip ${on?'on':''}" data-act="reason" data-r="${r}">${r}</button>`;}).join('')}</div>${(rs||'').startsWith('Dengan Kebenaran')?`<input class="bersebab-input" data-act="bersebab-note" placeholder="Nyatakan sebab (cth: Demam, urusan keluarga)" value="${esc(rs.replace(/^Dengan Kebenaran:?\s*/,''))}">`:''}`:''}</div>`;
  }).join('')||'<div class="empty"><strong>Tiada pelajar</strong>Kelas ini belum ada pelajar.</div>';
  let tidak=0,na=0;Object.values(current.absent).forEach(v=>{if(v===NA)na++;else tidak++;});
  const total=current.roster.length;
  $('#stat-jumlah').textContent=total;$('#stat-tidak').textContent=tidak;$('#stat-hadir').textContent=total-tidak-na;
}
$('#roster').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const id=e.target.closest('.student').dataset.id;
  if(b.dataset.act==='toggle'){const v=current.absent[id];if(v===undefined)current.absent[id]=REASONS[0];else if(v!==NA)current.absent[id]=NA;else delete current.absent[id];renderRoster();}
  if(b.dataset.act==='reason'){const r=b.dataset.r;if(r==='Dengan Kebenaran'){if(!(current.absent[id]||'').startsWith('Dengan Kebenaran'))current.absent[id]='Dengan Kebenaran:';}else current.absent[id]=r;renderRoster();}
});
$('#roster').addEventListener('input',e=>{
  const inp=e.target.closest('[data-act="bersebab-note"]');if(!inp)return;
  const id=e.target.closest('.student').dataset.id;
  const v=inp.value.trim();
  current.absent[id]=v?('Dengan Kebenaran: '+v):'Dengan Kebenaran:';
});
$('#kelas').addEventListener('change',loadCurrent);
$('#tarikh').addEventListener('change',loadCurrent);
$('#btn-simpan').onclick=async()=>{
  if(!current.kelas){toast('Tiada kelas');return;}
  // Pastikan unique constraint ada (kelas+date+subject)
  // Kena update schema supaya unique termasuk subject
  $('#btn-simpan').disabled=true;
  try{
    await DB.saveSession(current.kelas,current.date,current.subjek,state.teacher?.ic||null,getMasa(),
      Object.entries(current.absent).map(([student_id,reason])=>({student_id,reason})));
    $('#save-info').textContent='Disimpan ✓';$('#btn-simpan').textContent='Kemaskini Rekod';toast('Rekod disimpan ✓');
  }catch(e){toast('Ralat simpan: '+e.message);}
  $('#btn-simpan').disabled=false;
};
