/* ===== HUKUMAN (pelajar ponteng -> profil + tindakan HEM/cikgu) ===== */
const HK_BASE=['Kerja Amal 1 jam','Kerja Amal 1 jam 30 minit'];
const HK_ROTAN=['1 rotan di tapak tangan','2 rotan di tapak tangan','3 rotan di tapak tangan','1 rotan di punggung','2 rotan di punggung','3 rotan di punggung'];
function icGender(nokp){const d=(nokp||'').replace(/\D/g,'');if(d.length<12)return null;return parseInt(d[11],10)%2===0?'F':'M';}
function actionsFor(nokp){return icGender(nokp)==='F'?HK_BASE.slice():HK_BASE.concat(HK_ROTAN);}
function rotanNote(nokp){const g=icGender(nokp);return g==='F'?'Murid perempuan — pilihan rotan disembunyikan mengikut polisi.':'⚠️ Murid perempuan tidak boleh dirotan.';}
const fmtMasa=t=>{if(!t)return '';const[a,b]=t.split('-');return b?`${a}–${b}`:a;};
async function renderHukuman(){
  await loadStudents();
  const cls=classesFromStudents();
  $('#tab-hukuman').innerHTML=`<div class="card"><h3>Hukuman / Tindakan Pelajar</h3>
    <p class="legend">Pilih kelas — hanya pelajar yang <b>pernah tidak hadir</b> akan keluar. Tekan nama untuk rekod/kemaskini hukuman.</p>
    <div class="addrow"><select id="hk-kelas"><option value="">— Pilih kelas / kumpulan —</option>${classOptGroups()}</select>
      <input type="text" id="hk-q" placeholder="🔍 Atau cari nama pelajar"></div>
    <div id="hk-out" style="margin-top:8px"><div class="sub">Pilih kelas untuk mula.</div></div></div>`;
  $('#hk-kelas').onchange=()=>{$('#hk-q').value='';hkListByClass($('#hk-kelas').value);};
  $('#hk-q').oninput=hkSearch;
}
async function hkAbsentStudents(kelas){
  // ambil semua sesi kelas + absentees, kira pelajar berbeza yang pernah tidak hadir
  const {data,error}=await sb.from('attendance_sessions').select('absentees(reason,students(id,name,nokp,kelas))').eq('class_name',kelas);
  if(error)throw error;
  const map={};
  (data||[]).forEach(s=>(s.absentees||[]).forEach(a=>{if(a.reason===NA)return;const st=a.students;if(!st)return;
    map[st.id]=map[st.id]||{...st,count:0};map[st.id].count++;}));
  return Object.values(map).sort((a,b)=>b.count-a.count);
}
async function hkListByClass(kelas){
  const box=$('#hk-out');
  if(!kelas){box.innerHTML='<div class="sub">Pilih kelas untuk mula.</div>';return;}
  box.innerHTML='<div class="empty">Memuat…</div>';
  try{
    const list=await hkAbsentStudents(kelas);
    if(!list.length){box.innerHTML=`<div class="empty" style="color:var(--present)">✓ Tiada pelajar tidak hadir dalam ${esc(kelas)}.</div>`;return;}
    box.innerHTML=`<p class="legend">${list.length} pelajar pernah tidak hadir dalam <b>${esc(kelas)}</b>:</p>`+
      list.map(s=>`<div class="item" data-id="${s.id}" data-nokp="${esc(s.nokp||'')}" data-name="${esc(s.name)}" data-kelas="${esc(s.kelas||'')}" style="cursor:pointer">
        <span class="grow"><span class="nm">${esc(s.name)}</span><br><span class="sub">${esc(s.nokp||'')} · ${s.count} kali tidak hadir</span></span>
        <span class="pill" style="background:var(--absent-soft);color:var(--absent)">${s.count}×</span></div>`).join('');
    box.onclick=e=>{const it=e.target.closest('[data-id]');if(it)hkProfil(it.dataset);};
  }catch(e){box.innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';}
}
function hkSearch(){
  const q=$('#hk-q').value.trim().toLowerCase();
  if(!q){const k=$('#hk-kelas').value;hkListByClass(k);return;}
  $('#hk-kelas').value='';
  const m=cache.students.filter(s=>s.name.toLowerCase().includes(q)||(s.nokp||'').includes(q)).slice(0,40);
  const box=$('#hk-out');
  box.innerHTML=m.length?m.map(s=>`<div class="item" data-id="${s.id}" data-nokp="${esc(s.nokp||'')}" data-name="${esc(s.name)}" data-kelas="${esc(s.kelas||'')}" style="cursor:pointer">
    <span class="grow"><span class="nm">${esc(s.name)}</span><br><span class="sub">${esc(s.nokp||'')} · ${esc(s.kelas||'')}</span></span></div>`).join(''):'<div class="empty">Tiada padanan.</div>';
  box.onclick=e=>{const it=e.target.closest('[data-id]');if(it)hkProfil(it.dataset);};
}
async function hkProfil(d){
  const box=$('#hk-out');
  box.innerHTML='<div class="empty">Memuat…</div>';
  try{
    const [absR,discR,offR,sesR]=await Promise.all([
      sb.from('absentees').select('reason,attendance_sessions(date,class_name,subject,session_time,recorded_by)').eq('student_id',d.id),
      sb.from('discipline').select('*').eq('student_nokp',d.nokp).order('created_at',{ascending:false}),
      sb.from('offences').select('*').eq('student_nokp',d.nokp).order('odate',{ascending:false}),
      sb.from('attendance_sessions').select('id',{count:'exact',head:true}).eq('class_name',d.kelas)
    ]);
    if(absR.error)throw absR.error; if(discR.error)throw discR.error;
    const abs=absR.data||[], disc=discR.data||[], off=offR.data||[], totalSesi=sesR.count||0;
    const aRows=abs.filter(a=>a.reason!==NA).map(a=>({date:a.attendance_sessions?.date||'-',subject:a.attendance_sessions?.subject||'-',masa:a.attendance_sessions?.session_time||'',cikgu:tName(a.attendance_sessions?.recorded_by||'?'),reason:a.reason})).sort((x,y)=>y.date.localeCompare(x.date));
    box.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn btn-ghost" id="hk-back">← Kembali</button><button class="btn btn-primary" id="hk-cetak">🖨 Cetak Profil</button></div>
      <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin-bottom:12px;box-shadow:var(--shadow)">
        <div style="font-size:17px;font-weight:800">${esc(d.name)}</div>
        <div style="font-size:13px;color:var(--muted)">${esc(d.nokp)} · ${esc(d.kelas)}</div>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><span class="pill" style="background:var(--absent-soft);color:var(--absent)">${abs.filter(a=>a.reason!==NA).length} kali tidak hadir</span><span class="pill g">${disc.length} rekod hukuman</span>${off.length?`<span class="pill">${off.length} kesalahan disiplin</span>`:''}</div>
      </div>
      <h4 style="margin:6px 2px 8px;color:var(--brand)">Butiran Tidak Hadir</h4>
      ${aRows.length?`<table class="rpt-table"><tr><th>Tarikh</th><th>Subjek</th><th>Masa</th><th>Cikgu (rekod)</th><th>Sebab</th></tr>
        ${aRows.map(a=>`<tr><td>${esc(a.date)}</td><td>${esc(a.subject)}</td><td>${esc(fmtMasa(a.masa))}</td><td>${esc(a.cikgu)}</td><td><span class="pill">${esc(a.reason)}</span></td></tr>`).join('')}
        </table>`:'<div class="empty" style="padding:12px">Tiada rekod.</div>'}
      <h4 style="margin:18px 2px 8px;color:var(--brand)">Rekod Kesalahan Disiplin</h4>
      ${off.length?`<table class="rpt-table"><tr><th>Tarikh</th><th>Jenis Kesalahan</th><th>Catatan</th><th>Direkod Oleh</th></tr>
        ${off.map(o=>'<tr><td>'+esc(o.odate||'')+'</td><td><b>'+esc(o.offence_type||'-')+'</b></td><td>'+esc(o.note||'-')+'</td><td>'+esc(o.recorded_name||'-')+'</td></tr>').join('')}
        </table>`:'<div class="empty" style="padding:12px;color:var(--present)">✓ Tiada rekod kesalahan disiplin.</div>'}

      <h4 style="margin:18px 2px 8px;color:var(--brand)">Hukuman / Tindakan</h4>
      <div class="addrow">
        <select id="hk-action">${actionsFor(d.nokp).map(a=>`<option>${a}</option>`).join('')}</select>
        <input type="text" id="hk-note" placeholder="Catatan (pilihan)">
        <button class="btn btn-primary" id="hk-add">Rekod Hukuman</button>
      </div>
      <p class="legend" style="margin:4px 2px">${rotanNote(d.nokp)}</p>
      <div id="hk-disc" style="margin-top:8px">${disc.length?disc.map(x=>`<div class="item"><span class="grow"><span class="nm">${esc(x.action)}</span><br><span class="sub">${esc((x.created_at||'').slice(0,10))}${x.recorded_name?' · '+esc(x.recorded_name):''}${x.note?' · '+esc(x.note):''}</span></span><button class="icon-btn danger" data-del="${x.id}">Padam</button></div>`).join(''):'<div class="sub">Tiada rekod hukuman.</div>'}</div>`;

    $('#hk-back').onclick=()=>{const k=$('#hk-kelas').value;if(k)hkListByClass(k);else hkSearch();};
    $('#hk-cetak').onclick=()=>cetakBorangProfil({name:d.name,nokp:d.nokp,kelas:d.kelas},{absen:aRows,offences:off,hukuman:disc,total:totalSesi});
    $('#hk-add').onclick=async()=>{
      const action=$('#hk-action').value,note=$('#hk-note').value.trim();
      try{const {error}=await sb.from('discipline').insert({student_nokp:d.nokp,student_name:d.name,class_name:d.kelas,action,note,recorded_by:null,recorded_name:adminName});
        if(error)throw error; toast('Hukuman direkod ✓'); hkProfil(d);}catch(e){toast('Ralat: '+e.message);}
    };
    $('#hk-disc').onclick=async e=>{const b=e.target.closest('[data-del]');if(!b)return;if(confirm('Padam rekod hukuman ini?')){try{const {error}=await sb.from('discipline').delete().eq('id',b.dataset.del);if(error)throw error;hkProfil(d);toast('Dipadam');}catch(e){toast('Ralat: '+e.message);}}};
  }catch(e){box.innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';}
}
