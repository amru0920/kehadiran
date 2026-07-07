/* ===== LAPORAN ===== */
async function renderLaporan(){
  const kelas=$('#lap-kelas').value,from=$('#lap-from').value,to=$('#lap-to').value;
  if(!kelas||!from||!to){toast('Isi semua medan');return;}
  const box=$('#lap-container');box.innerHTML='<div class="empty">Memuat…</div>';
  try{
    const sessions=await DB.laporanSessions(kelas,from,to);
    if(!sessions.length){box.innerHTML='<div class="empty"><strong>Tiada sesi</strong>Tiada rekod kehadiran untuk tempoh ini.</div>';return;}
    // Kumpul semua pelajar tidak hadir
    const absentMap={};// student_id -> {name,nokp,kelas,reasons:[{date,subject,reason}]}
    sessions.forEach(s=>{
      (s.absentees||[]).forEach(a=>{
        const nm=a.students?.name||a.student_id;
        const nokp=a.students?.nokp||'';
        if(!absentMap[a.student_id])absentMap[a.student_id]={name:nm,nokp,entries:[]};
        absentMap[a.student_id].entries.push({date:s.date,subject:s.subject||'-',masa:s.session_time||'',reason:a.reason});
      });
    });
    const absentList=Object.values(absentMap).sort((a,b)=>a.name.localeCompare(b.name));
    box.innerHTML=`
      <div class="rpt-card">
        <h4>Laporan Ketidakhadiran</h4>
        <div class="sub">${esc(kelas)} · ${fmtDate(from)} – ${fmtDate(to)} · ${sessions.length} sesi · ${absentList.length} pelajar tidak hadir</div>
        ${absentList.length?`<table class="rpt-table">
          <tr><th>#</th><th>Nama Pelajar</th><th>NoKP</th><th>Tarikh</th><th>Subjek</th><th>Masa</th><th>Sebab</th></tr>
          ${absentList.flatMap((p,i)=>p.entries.map((e,j)=>`
            <tr>
              <td>${j===0?i+1:''}</td>
              <td>${j===0?`<b>${esc(p.name)}</b>`:''}</td>
              <td>${j===0?esc(p.nokp):''}</td>
              <td>${fmtDate(e.date)}</td>
              <td>${esc(e.subject)}</td>
              <td>${esc(fmtMasa(e.masa))}</td>
              <td><span class="badge-reason">${esc(e.reason)}</span></td>
            </tr>`)).join('')}
        </table>`:'<div style="color:var(--present);font-weight:600;padding:10px 0">✓ Semua pelajar hadir sepanjang tempoh ini.</div>'}
      </div>`;
  }catch(e){box.innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';}
}
$('#lap-cari').onclick=renderLaporan;
$('#lap-print').onclick=()=>window.print();
