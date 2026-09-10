/* ===== PELAJAR: pilih kelas -> senarai -> profil + hukuman ===== */
const HK_BASE=['Kerja Amal 1 jam','Kerja Amal 1 jam 30 minit'];
const HK_ROTAN=['1 rotan di tapak tangan','2 rotan di tapak tangan','3 rotan di tapak tangan','1 rotan di punggung','2 rotan di punggung','3 rotan di punggung'];
function icGender(nokp){const d=(nokp||'').replace(/\D/g,'');if(d.length<12)return null;return parseInt(d[11],10)%2===0?'F':'M';}
function actionsFor(nokp){return icGender(nokp)==='F'?HK_BASE.slice():HK_BASE.concat(HK_ROTAN);}
function rotanNote(nokp){const g=icGender(nokp);return g==='F'?'Murid perempuan — pilihan rotan disembunyikan mengikut polisi.':'⚠️ Murid perempuan tidak boleh dirotan.';}
const tName=ic=>(state.teachersByIc&&state.teachersByIc[ic])||(ic?ic:'(Tidak direkod)');
const allClassList=()=>[...new Set(state.students.map(s=>s.kelas).filter(Boolean))].sort();
function renderPelajar(){
  $('#pp-kelas').innerHTML='<option value="">— Pilih kelas —</option>'+allClassList().map(c=>`<option>${esc(c)}</option>`).join('');
  $('#pp-kelas').onchange=()=>{$('#pp-q').value='';listByClass($('#pp-kelas').value);};
  $('#pp-go').onclick=ppSearch;
  $('#pp-print').onclick=()=>window.print();
  $('#pp-q').onkeydown=e=>{if(e.key==='Enter')ppSearch();};
  $('#pp-out').innerHTML='<div class="empty"><strong>Pilih kelas</strong>Pilih kelas untuk lihat senarai pelajar, atau cari nama/No. KP.</div>';
}
function pctColor(pct){
  if(pct==null) return {b:'var(--absent)',bg:'#fff0ed'};
  if(pct>=90) return {b:'var(--present)',bg:'#f0faf5'};
  if(pct>=80) return {b:'var(--warn)',bg:'#fff8ec'};
  if(pct>=70) return {b:'#e8743b',bg:'#fff1e8'};
  return {b:'var(--absent)',bg:'#fff0ed'};
}
function studentRow(s,i,info){
  // info = {absent, pct} untuk pelajar yang pernah tidak hadir; null jika kehadiran penuh
  let style='cursor:pointer', tag='';
  if(info && info.absent>0){
    const col=pctColor(info.pct);
    style=`cursor:pointer;border-left:5px solid ${col.b};background:${col.bg}`;
    tag=info.pct!=null?` <span class="pill" style="background:${col.b};color:#fff">${info.pct}%</span>`:` <span class="pill">${info.absent}×</span>`;
  }
  const detExtra=info&&info.absent>0?` · ${info.absent} kali tidak hadir`:'';
  return `<div class="dcard" data-id="${s.id}" style="${style}"><div class="info"><div class="cn">${i!=null?i+1+'. ':''}${esc(s.name)}${tag}</div><div class="det">${esc(s.nokp)} · ${esc(s.kelas||'')}${detExtra}</div></div></div>`;
}
async function listByClass(kelas){
  $('#pp-print').onclick=()=>window.print();
  if(!kelas){$('#pp-out').innerHTML='';return;}
  const list=state.students.filter(s=>s.kelas===kelas).sort((a,b)=>a.name.localeCompare(b.name));
  $('#pp-out').innerHTML='<div class="empty">Memuat…</div>';
  let total=0; const absCount={};
  try{
    const {data,error}=await sb.from('attendance_sessions').select('absentees(student_id,reason)').eq('class_name',kelas);
    if(error)throw error;
    total=(data||[]).length;
    (data||[]).forEach(s=>(s.absentees||[]).forEach(a=>{if(a.reason===NA)return;absCount[a.student_id]=(absCount[a.student_id]||0)+1;}));
  }catch(e){/* kalau gagal, papar tanpa tanda */}
  const info=id=>{const ab=absCount[id]||0; if(ab<=0)return null; return {absent:ab, pct: total>0?Math.round((total-ab)/total*100):null};};
  const absentN=list.filter(s=>absCount[s.id]).length;
  $('#pp-out').innerHTML=`<p class="legend">${list.length} pelajar dalam <b>${esc(kelas)}</b> · <span style="color:var(--absent)">${absentN} pernah tidak hadir</span> — warna ikut % kehadiran: <span style="color:var(--present)">●</span>≥90 <span style="color:var(--warn)">●</span>80–89 <span style="color:#e8743b">●</span>70–79 <span style="color:var(--absent)">●</span>&lt;70. Tekan nama untuk butiran.</p>`+
    list.map((s,i)=>studentRow(s,i,info(s.id))).join('');
  $('#pp-out').onclick=e=>{const d=e.target.closest('[data-id]');if(d){const s=state.students.find(x=>x.id===d.dataset.id);if(s)showProfil(s,kelas);}};
}
function ppSearch(){
  $('#pp-print').onclick=()=>window.print();
  const q=$('#pp-q').value.trim().toLowerCase();
  if(!q){toast('Taip carian');return;}
  $('#pp-kelas').value='';
  const m=state.students.filter(s=>s.name.toLowerCase().includes(q)||(s.nokp||'').toLowerCase().includes(q)).slice(0,40);
  if(!m.length){$('#pp-out').innerHTML='<div class="empty"><strong>Tiada padanan</strong></div>';return;}
  if(m.length===1){showProfil(m[0]);return;}
  $('#pp-out').innerHTML=m.map(s=>studentRow(s,null)).join('');
  $('#pp-out').onclick=e=>{const d=e.target.closest('[data-id]');if(d){const s=state.students.find(x=>x.id===d.dataset.id);if(s)showProfil(s);}};
}
async function showProfil(s,backClass){
  $('#pp-out').innerHTML='<div class="empty">Memuat…</div>';
  try{
    const [abs,disc,off,sessR]=await Promise.all([
      DB.studentAbsences(s.id),
      DB.listDiscipline(s.nokp),
      DB.listOffences(s.nokp).catch(()=>[]),
      sb.from('attendance_sessions').select('subject').eq('class_name',s.kelas)
    ]);
    if(sessR.error)throw sessR.error;
    const sessions=sessR.data||[];
    const totalAll=sessions.length;
    const perSubjTotal={};
    sessions.forEach(x=>{const j=x.subject||'(tiada subjek)';perSubjTotal[j]=(perSubjTotal[j]||0)+1;});
    const subjects=Object.keys(perSubjTotal).sort();
    const absAll=abs.filter(a=>a.reason!==NA).map(a=>({date:a.attendance_sessions?.date||'-',subject:a.attendance_sessions?.subject||'(tiada subjek)',masa:a.attendance_sessions?.session_time||'',cikgu:tName(a.attendance_sessions?.recorded_by),reason:a.reason}));
    const back=backClass?`<button class="btn btn-ghost" id="pp-back" style="margin-bottom:10px">← Senarai ${esc(backClass)}</button>`:'';
    const isAdmin=!!state.teacher?.is_admin;
    $('#pp-out').innerHTML=`${back}
      <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;margin-bottom:10px;box-shadow:var(--shadow)">
        <div style="font-size:18px;font-weight:800">${esc(s.name)}</div>
        <div style="font-size:13px;color:var(--muted)">${esc(s.nokp)} · ${esc(s.kelas||'')}</div>
        ${(off.length||disc.length)?`<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
          ${off.length?`<span class="pill">${off.length} kesalahan disiplin</span>`:''}
          ${disc.length?`<span class="pill" style="background:#fdf2e1;color:var(--warn)">${disc.length} tindakan HEM</span>`:''}</div>`:''}
      </div>
      <div class="lap-head" style="margin:0 0 10px"><div class="field" style="flex:1"><label>Tapis ikut subjek</label><select id="pp-subj"><option value="">Semua subjek</option>${subjects.map(j=>`<option>${esc(j)}</option>`).join('')}</select></div></div>
      <div id="pp-body"></div>

      <h3 style="font-size:14px;margin:18px 2px 8px">Rekod Kesalahan Disiplin${off.length?` <span class="pill">${off.length}</span>`:''}</h3>
      ${off.length?`<table class="rpt-table"><tr><th>Tarikh</th><th>Jenis Kesalahan</th><th>Catatan</th><th>Direkod Oleh</th></tr>
        ${off.map(o=>`<tr><td>${o.odate?esc(fmtDate(o.odate)):'-'}</td><td><b>${esc(o.offence_type||'-')}</b></td><td style="color:var(--muted)">${esc(o.note||'-')}</td><td>${esc(o.recorded_name||'-')}</td></tr>`).join('')}
        </table><p class="legend" style="margin-top:6px">Rekod kesalahan dimasukkan melalui tab <b>Disiplin</b>.</p>`
        :'<div class="empty" style="padding:16px;color:var(--present)">✓ Tiada rekod kesalahan disiplin.</div>'}

      <h3 style="font-size:14px;margin:18px 2px 8px">Hukuman / Tindakan HEM</h3>
      ${isAdmin?`<div class="lap-head" style="margin:0 0 10px">
        <div class="field"><label>Tindakan</label><select id="hk-action">${actionsFor(s.nokp).map(a=>`<option>${a}</option>`).join('')}</select></div>
        <div class="field" style="flex:2;min-width:180px"><label>Catatan (pilihan)</label><input type="text" id="hk-note" placeholder="Butiran tambahan"></div>
        <button class="btn btn-primary" id="hk-add">Rekod Hukuman</button>
      </div>
      <p class="legend" style="margin:2px 2px 8px">${rotanNote(s.nokp)}</p>`
      :`<p class="legend" style="margin:2px 2px 10px">🔒 Hukuman direkod oleh HEM/pentadbir sahaja. Cikgu hanya boleh lihat rekod.</p>`}
      <div id="hk-list">${disc.length?disc.map(d=>`<div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;box-shadow:var(--shadow)">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><b>${esc(d.action)}</b><span style="font-size:12px;color:var(--muted)">${esc((d.created_at||'').slice(0,10))}${d.recorded_name?' · '+esc(d.recorded_name):''}</span></div>
        ${d.note?`<div style="margin-top:4px;font-size:14px">${esc(d.note)}</div>`:''}
        ${isAdmin?`<button class="hbtn" data-del="${d.id}" style="margin-top:8px;color:var(--absent);font-size:12px;padding:5px 10px">Padam</button>`:''}</div>`).join(''):'<div class="empty" style="padding:16px">Tiada rekod hukuman.</div>'}</div>`;

    const renderBody=()=>{
      const sel=$('#pp-subj').value;
      const rows=(sel?absAll.filter(a=>a.subject===sel):absAll).slice().sort((x,y)=>y.date.localeCompare(x.date));
      const total=sel?(perSubjTotal[sel]||0):totalAll;
      const absentN=rows.length, attended=Math.max(0,total-absentN), pct=total>0?Math.round(attended/total*100):100;
      const pcol=pct>=90?'var(--present)':pct>=80?'var(--warn)':pct>=70?'#e8743b':'var(--absent)';
      $('#pp-body').innerHTML=`
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
          <div style="width:80px;height:80px;border-radius:50%;display:grid;place-items:center;background:${pcol};color:#fff;font-size:23px;font-weight:800;flex:0 0 auto">${total>0?pct+'%':'—'}</div>
          <div style="flex:1;min-width:150px;font-size:13px;color:var(--muted)">${sel?'Subjek: <b>'+esc(sel)+'</b>':'<b>Semua subjek</b>'}<br>${total>0?`Hadir ${attended}/${total} sesi · ${absentN} kali tidak hadir`:'Belum ada sesi direkod'}</div>
        </div>
        ${pct===100&&total>0?'<div style="color:var(--present);font-weight:700;padding:0 2px 12px">✓ Kehadiran penuh.</div>':''}
        ${rows.length?`<table class="rpt-table"><tr><th>Tarikh</th><th>Subjek</th><th>Masa</th><th>Cikgu</th><th>Sebab</th></tr>
          ${rows.map(a=>`<tr><td>${esc(a.date)}</td><td>${esc(a.subject)}</td><td>${esc(fmtMasa(a.masa))}</td><td>${esc(a.cikgu)}</td><td><span class="pill">${esc(a.reason)}</span></td></tr>`).join('')}
          </table><p class="legend" style="margin-top:6px">HEM boleh rujuk cikgu yang merekod sesi tersebut.</p>`
          :(total>0?'<div class="empty" style="padding:12px;color:var(--present)">✓ Tiada rekod tidak hadir.</div>':'<div class="empty" style="padding:12px">Belum ada sesi.</div>')}`;
    };
    renderBody();
    $('#pp-subj').onchange=renderBody;
    $('#pp-print').onclick=()=>cetakBorangProfil(s,{absen:absAll,offences:off,hukuman:disc,total:totalAll});
    if(backClass)$('#pp-back').onclick=()=>listByClass(backClass);
    if(isAdmin){
      $('#hk-add').onclick=async()=>{
        const action=$('#hk-action').value,note=$('#hk-note').value.trim();
        try{await DB.addDiscipline({student_nokp:s.nokp,student_name:s.name,class_name:s.kelas,action,note,recorded_by:state.teacher?.ic||null,recorded_name:state.teacher?.name||null});
          toast('Hukuman direkod ✓');showProfil(s,backClass);}catch(e){toast('Ralat: '+e.message);}
      };
      $('#hk-list').onclick=async e=>{const b=e.target.closest('[data-del]');if(!b)return;if(confirm('Padam rekod hukuman ini?')){try{await DB.delDiscipline(b.dataset.del);showProfil(s,backClass);toast('Dipadam');}catch(e){toast('Ralat: '+e.message);}}};
    }
  }catch(e){$('#pp-out').innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';}
}
