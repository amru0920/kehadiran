/* ===== LAPORAN & ANALISIS ===== */
let RPT={month:null,from:'',to:'',sessions:[]};
let charts=[];
let teachersByIc={};

async function renderData(){
  $('#tab-data').innerHTML=`
    <div class="lap-bar">
      <div class="field"><label>Bulan</label><input type="month" id="lp-month"></div>
      <div class="field"><label>Kelas</label><select id="lp-class"><option value="">Semua kelas</option></select></div>
      <button class="btn btn-primary" id="lp-go">Jana</button>
      <button class="btn btn-ghost" id="lp-print">Cetak</button>
      <button class="btn btn-ghost" id="lp-del" style="color:var(--absent)">Padam Rekod</button>
    </div>
    <div class="seg" id="lp-seg">
      <button class="active" data-v="ringkasan">Ringkasan</button>
      <button data-v="kekerapan">Kekerapan</button>
      <button data-v="kelas">Ikut Kelas</button>
      <button data-v="guru">Ikut Guru</button>
      <button data-v="aktiviti">Aktiviti Guru</button>
      <button data-v="carta">Carta</button>
      <button data-v="detail">Detail</button>
    </div>
    <div id="lp-out"><div class="empty">Pilih bulan, tekan <b>Jana</b>.</div></div>`;
  try{ await loadStudents(); const {data}=await sb.from('teachers').select('ic,name,class_name'); teachersByIc={}; (data||[]).forEach(t=>teachersByIc[t.ic]=t); }catch(e){}
  const now=new Date();
  $('#lp-month').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  $('#lp-class').innerHTML='<option value="">Semua kelas &amp; kumpulan</option>'+classOptGroups();
  $('#lp-go').onclick=lpFetch;
  $('#lp-print').onclick=()=>window.print();
  $('#lp-del').onclick=lpDelete;
  document.querySelector('#lp-seg').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;document.querySelectorAll('#lp-seg button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderView(b.dataset.v);};
  $('#lp-out').addEventListener('click',e=>{const d=e.target.closest('[data-drill]');if(!d)return;drillClass(d.getAttribute('data-drill'),d);});
  lpFetch();
}

async function lpFetch(){
  const m=$('#lp-month').value; if(!m){toast('Pilih bulan');return;}
  const d=new Date(m+'-01'); const last=new Date(d.getFullYear(),d.getMonth()+1,0);
  const from=m+'-01', to=`${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}-${String(last.getDate()).padStart(2,'0')}`;
  const cls=$('#lp-class').value;
  $('#lp-out').innerHTML='<div class="empty">Mengira…</div>';
  let q=sb.from('attendance_sessions').select('id,class_name,date,subject,session_time,recorded_by,absentees(reason,students(id,name,nokp,kelas))').gte('date',from).lte('date',to).order('date');
  if(cls) q=q.eq('class_name',cls);
  const {data,error}=await q;
  if(error){$('#lp-out').innerHTML='<div class="empty">Ralat: '+esc(error.message)+'</div>';return;}
  RPT={month:m,from,to,sessions:data||[]};
  const active=document.querySelector('#lp-seg button.active')?.dataset.v||'ringkasan';
  renderView(active);
}

async function lpDelete(){
  if(!RPT.sessions||!RPT.sessions.length){toast('Tiada rekod untuk dipadam');return;}
  const cls=$('#lp-class').value;
  const scope=cls?`kelas ${cls}`:'SEMUA kelas';
  if(!confirm(`Padam ${RPT.sessions.length} sesi (${scope}) untuk ${monthLabel()}?\nTermasuk semua rekod tidak hadir. TIDAK boleh undo.`))return;
  if(!confirm('Sahkan sekali lagi — padam terus?'))return;
  const ids=RPT.sessions.map(s=>s.id);
  const {error}=await sb.from('attendance_sessions').delete().in('id',ids);
  if(error){toast('Ralat: '+error.message);return;}
  toast(`${ids.length} sesi dipadam ✓`);
  lpFetch();
}

function computeRPT(){
  const perStudent={},perClass={},perTeacher={},entries=[];
  (RPT.sessions||[]).forEach(s=>{
    perClass[s.class_name]=perClass[s.class_name]||{sessions:0,absent:0};
    perClass[s.class_name].sessions++;
    const tk=s.recorded_by||'?';
    perTeacher[tk]=perTeacher[tk]||{sessions:0,absent:0};
    perTeacher[tk].sessions++;
    (s.absentees||[]).forEach(a=>{
      if(a.reason===NA)return;
      const st=a.students||{}; const id=st.id||(st.nokp||Math.random());
      entries.push({date:s.date,kelas:s.class_name,subject:s.subject||'-',masa:s.session_time||'',reason:a.reason,name:st.name||'-',nokp:st.nokp||''});
      perStudent[id]=perStudent[id]||{name:st.name||'-',nokp:st.nokp||'',kelas:st.kelas||'',count:0,reasons:{}};
      perStudent[id].count++; perStudent[id].reasons[a.reason]=(perStudent[id].reasons[a.reason]||0)+1;
      perClass[s.class_name].absent++; perTeacher[tk].absent++;
    });
  });
  return {perStudent,perClass,perTeacher,entries};
}
const rosterCount=cn=>(cache.groupSize&&cache.groupSize[cn]!=null)?cache.groupSize[cn]:cache.students.filter(s=>s.kelas===cn).length;
const tName=ic=>ic==='?'?'(Tidak direkod)':(teachersByIc[ic]?.name||ic);
const monthLabel=()=>{const d=new Date(RPT.from);return d.toLocaleDateString('ms-MY',{month:'long',year:'numeric'});};

function drillClass(cn,cardEl){
  const panel=cardEl.nextElementSibling;
  if(!panel||!panel.hasAttribute('data-drillpanel'))return;
  if(!panel.classList.contains('hidden')){panel.classList.add('hidden');panel.innerHTML='';return;}
  // kumpul kekerapan pelajar dalam kelas ni
  const perStu={};
  (RPT.sessions||[]).filter(s=>s.class_name===cn).forEach(s=>{
    (s.absentees||[]).forEach(a=>{const st=a.students||{};const id=st.nokp||st.name;
      perStu[id]=perStu[id]||{name:st.name||'-',nokp:st.nokp||'',count:0,reasons:{}};
      perStu[id].count++;perStu[id].reasons[a.reason]=(perStu[id].reasons[a.reason]||0)+1;});
  });
  const rows=Object.values(perStu).sort((a,b)=>b.count-a.count);
  panel.classList.remove('hidden');
  panel.innerHTML=rows.length?`<table><tr><th>Pelajar</th><th>Kali</th><th>Sebab</th></tr>
    ${rows.map(p=>`<tr class="${p.count>=2?'rep':''}"><td><b>${esc(p.name)}</b></td><td>${p.count}</td><td style="color:var(--muted)">${Object.entries(p.reasons).map(([r,n])=>esc(r)+'×'+n).join(', ')}</td></tr>`).join('')}
    </table><p class="legend" style="margin:8px 0 0">Baris merah = pelajar yang sama tidak hadir 2 kali atau lebih.</p>`
    :'<p class="legend" style="margin:8px 0 0">Tiada ketidakhadiran untuk kelas ini.</p>';
}

function renderView(v){
  const box=$('#lp-out');
  if(!RPT.sessions.length){box.innerHTML='<div class="empty"><strong>Tiada rekod</strong>Tiada sesi kehadiran untuk bulan ini.</div>';return;}
  const C=computeRPT();
  if(v==='ringkasan'){
    const totalSesi=RPT.sessions.length, totalInstances=C.entries.length;
    const distinctStudents=Object.keys(C.perStudent).length, kelasTerlibat=Object.keys(C.perClass).length;
    let slots=0,absent=0;
    Object.entries(C.perClass).forEach(([cn,x])=>{slots+=rosterCount(cn)*x.sessions;absent+=x.absent;});
    const rate=slots>0?Math.round((slots-absent)/slots*100):'—';
    const gauges=Object.entries(C.perClass).map(([cn,x])=>{const sl=rosterCount(cn)*x.sessions;const r=sl>0?(sl-x.absent)/sl*100:null;return{cn,...x,rate:r};}).sort((a,b)=>(a.rate??999)-(b.rate??999));
    box.innerHTML=`<div class="cards">
        <div class="mcard"><div class="n">${totalSesi}</div><div class="l">Sesi (${esc(monthLabel())})</div></div>
        <div class="mcard"><div class="n">${kelasTerlibat}</div><div class="l">Kelas terlibat</div></div>
        <div class="mcard"><div class="n" style="color:var(--absent)">${distinctStudents}</div><div class="l">Pelajar tidak hadir</div></div>
        <div class="mcard"><div class="n" style="color:var(--warn)">${totalInstances}</div><div class="l">Jumlah kali tidak hadir</div></div>
        <div class="mcard"><div class="n" style="color:var(--present)">${rate}%</div><div class="l">Kehadiran keseluruhan</div></div>
      </div>
      <p class="legend">Tekan mana-mana kelas untuk lihat senarai pelajar &amp; kekerapan.</p>
      ${gauges.map(r=>{const col=r.rate===null?'#9aa3b2':r.rate<80?'var(--absent)':r.rate<90?'var(--warn)':'var(--present)';const lb=r.rate===null?'—':Math.round(r.rate)+'%';
        return `<div class="dcard" data-drill="${esc(r.cn)}" style="cursor:pointer">
          <div class="gauge" style="background:${col}">${lb}</div>
          <div class="info"><div class="cn">${esc(r.cn)}${groupBadge(r.cn)} <span style="font-size:11px;color:var(--muted)">▼ tekan</span></div>
          <div class="det">${rosterCount(r.cn)} pelajar · ${r.sessions} sesi · ${r.absent} kali tidak hadir</div></div></div>
          <div class="drill hidden" data-drillpanel="${esc(r.cn)}"></div>`;}).join('')}`;
  }
  else if(v==='kekerapan'){
    const rows=Object.values(C.perStudent).sort((a,b)=>b.count-a.count);
    box.innerHTML=`<table class="rpt-table"><tr><th>#</th><th>Nama</th><th>Kelas</th><th>Kali</th><th>Pecahan Sebab</th></tr>
      ${rows.map((p,i)=>{const reasons=Object.entries(p.reasons).map(([r,n])=>`${esc(r)}×${n}`).join(', ');
        return `<tr class="${p.count>=3?'hot':''}"><td>${i+1}</td><td><b>${esc(p.name)}</b><br><span style="color:var(--muted);font-size:11px">${esc(p.nokp)}</span></td><td>${esc(p.kelas)}</td><td><span class="pill">${p.count}</span></td><td style="color:var(--muted)">${reasons}</td></tr>`;}).join('')}
    </table><p class="legend" style="margin-top:8px">Baris merah = 3 kali atau lebih tidak hadir bulan ini.</p>`;
  }
  else if(v==='kelas'){
    const rows=Object.entries(C.perClass).map(([cn,x])=>{const sl=rosterCount(cn)*x.sessions;const r=sl>0?(sl-x.absent)/sl*100:null;return{cn,...x,rate:r};}).sort((a,b)=>(a.rate??999)-(b.rate??999));
    box.innerHTML=`<table class="rpt-table"><tr><th>Kelas</th><th>Sesi</th><th>Tidak Hadir</th><th>Kehadiran</th></tr>
      ${rows.map(r=>{const cls=r.rate===null?'':r.rate<80?'pill':r.rate<90?'pill w':'pill g';const lb=r.rate===null?'—':Math.round(r.rate)+'%';
        return `<tr><td><b>${esc(r.cn)}</b>${groupBadge(r.cn)}</td><td>${r.sessions}</td><td>${r.absent}</td><td><span class="${cls}">${lb}</span></td></tr>`;}).join('')}
    </table>`;
  }
  else if(v==='guru'){
    const byT={};
    (RPT.sessions||[]).forEach(s=>{
      const ic=s.recorded_by||'?';
      byT[ic]=byT[ic]||{sessions:0,absent:0,classes:{}};
      byT[ic].sessions++;
      byT[ic].classes[s.class_name]=byT[ic].classes[s.class_name]||{sessions:0,absent:0};
      byT[ic].classes[s.class_name].sessions++;
      const n=(s.absentees||[]).length;
      byT[ic].absent+=n; byT[ic].classes[s.class_name].absent+=n;
    });
    const teachers=Object.entries(byT).map(([ic,x])=>({ic,...x})).sort((a,b)=>b.sessions-a.sessions);
    box.innerHTML=teachers.map(t=>{
      const clsRows=Object.entries(t.classes).sort((a,b)=>a[0].localeCompare(b[0]))
        .map(([cn,c])=>`<tr><td>${esc(cn)}</td><td>${c.sessions}</td><td>${c.absent}</td></tr>`).join('');
      return `<div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin-bottom:10px;box-shadow:var(--shadow)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px">
          <b style="font-size:15px">${esc(tName(t.ic))}</b>
          <span style="font-size:12px;color:var(--muted)">${t.sessions} sesi · ${t.absent} tidak hadir</span>
        </div>
        <table class="rpt-table"><tr><th>Kelas</th><th>Sesi</th><th>Tidak Hadir</th></tr>${clsRows}</table>
      </div>`;
    }).join('')+`<p class="legend" style="margin-top:8px">Dikumpulkan ikut akaun guru yang log masuk semasa merekod. Setiap guru dipecahkan ikut kelas mereka.</p>`;
  }
  else if(v==='aktiviti'){
    const days=['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
    const byT={};
    (RPT.sessions||[]).forEach(s=>{const ic=s.recorded_by||'?';(byT[ic]=byT[ic]||[]).push(s);});
    const teachers=Object.entries(byT).sort((a,b)=>b[1].length-a[1].length);
    if(!teachers.length){box.innerHTML='<div class="empty">Tiada rekod untuk tempoh ini.</div>';return;}
    box.innerHTML=teachers.map(([ic,list])=>{
      list.sort((a,b)=>a.date.localeCompare(b.date));
      const rows=list.map(s=>{
        const d=new Date(s.date+'T00:00:00');const hari=isNaN(d.getTime())?'-':days[d.getDay()];
        return `<tr><td>${esc(s.date)}</td><td>${hari}</td><td>${esc(s.class_name)}</td><td>${esc(s.subject||'-')}</td><td>${esc((s.session_time||'').replace('-','–'))}</td><td>${(s.absentees||[]).filter(a=>a.reason!==NA).length}</td></tr>`;
      }).join('');
      return `<div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin-bottom:10px;box-shadow:var(--shadow)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px">
          <b style="font-size:15px">${esc(tName(ic))}</b>
          <span class="pill g">${list.length} kelas direkod</span>
        </div>
        <table class="rpt-table"><tr><th>Tarikh</th><th>Hari</th><th>Kelas</th><th>Subjek</th><th>Masa</th><th>Tak Hadir</th></tr>${rows}</table>
      </div>`;
    }).join('')+`<p class="legend" style="margin-top:8px">Setiap kelas tambahan yang guru ambil dalam ${esc(monthLabel())} — bila, hari, kelas &amp; subjek.</p>`;
  }
  else if(v==='carta'){
    charts.forEach(ch=>{try{ch.destroy();}catch(e){}}); charts=[];
    if(typeof Chart==='undefined'){box.innerHTML='<div class="empty">Carta gagal dimuat — perlu sambungan internet untuk muat pustaka carta.</div>';return;}
    box.innerHTML=`
      <div class="chart-card"><h4>Pecahan Sebab Tidak Hadir</h4><p class="legend">Berapa banyak ponteng sebenar vs sebab sah.</p><div style="height:240px"><canvas id="ch-reason"></canvas></div></div>
      <div class="chart-card"><h4>Peratus Kehadiran Ikut Kelas</h4><p class="legend">Kelas mana paling perlu perhatian.</p><div style="height:260px"><canvas id="ch-class"></canvas></div></div>
      <div class="chart-card"><h4>Ketidakhadiran Ikut Hari</h4><p class="legend">Corak hari — selalunya hari apa pelajar tidak hadir.</p><div style="height:260px"><canvas id="ch-day"></canvas></div></div>`;
    // a) Pecahan sebab (donut)
    const rc={}; C.entries.forEach(e=>{const base=(e.reason||'-').split(':')[0].trim()||'-';rc[base]=(rc[base]||0)+1;});
    const rOrder=Object.entries(rc).sort((a,b)=>b[1]-a[1]);
    const palette={'Ponteng':'#e0492f','Sekolah':'#2f5fe0','Dengan Kebenaran':'#1f9d6b'};
    const extra=['#d98613','#8e44ad','#16a085','#c0392b'];let ei=0;
    charts.push(new Chart($('#ch-reason'),{type:'doughnut',
      data:{labels:rOrder.map(x=>x[0]),datasets:[{data:rOrder.map(x=>x[1]),backgroundColor:rOrder.map(x=>palette[x[0]]||extra[ei++%extra.length]),borderWidth:2,borderColor:'#fff'}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}}));
    // b) Kehadiran % ikut kelas (bar)
    const cls=Object.entries(C.perClass).map(([cn,x])=>{const sl=rosterCount(cn)*x.sessions;return{cn,pct:sl>0?Math.round((sl-x.absent)/sl*100):0};}).sort((a,b)=>a.pct-b.pct);
    charts.push(new Chart($('#ch-class'),{type:'bar',
      data:{labels:cls.map(c=>c.cn),datasets:[{label:'Kehadiran %',data:cls.map(c=>c.pct),backgroundColor:cls.map(c=>c.pct>=90?'#1f9d6b':c.pct>=80?'#d98613':c.pct>=70?'#e8743b':'#e0492f'),borderRadius:6}]},
      options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,max:100,ticks:{callback:v=>v+'%'}}},plugins:{legend:{display:false}}}}));
    // c) Tidak hadir ikut hari (bar)
    const days=['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
    const dc=[0,0,0,0,0,0,0]; C.entries.forEach(e=>{const d=new Date(e.date+'T00:00:00');if(!isNaN(d.getTime()))dc[d.getDay()]++;});
    charts.push(new Chart($('#ch-day'),{type:'bar',
      data:{labels:days,datasets:[{label:'Kali tidak hadir',data:dc,backgroundColor:'#2f5fe0',borderRadius:6}]},
      options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{precision:0}}},plugins:{legend:{display:false}}}}));
  }
  else if(v==='detail'){
    const rows=C.entries.sort((a,b)=>a.date.localeCompare(b.date)||a.kelas.localeCompare(b.kelas));
    box.innerHTML=`<div class="rpt-card" style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;box-shadow:var(--shadow)">
      <h3 style="margin:0 0 4px">Senarai Ketidakhadiran — ${esc(monthLabel())}</h3>
      <p class="legend" style="margin:0 0 10px">${rows.length} rekod</p>
      <table class="rpt-table"><tr><th>Tarikh</th><th>Kelas</th><th>Subjek</th><th>Masa</th><th>Nama</th><th>NoKP</th><th>Sebab</th></tr>
      ${rows.map(e=>`<tr><td>${esc(e.date)}</td><td>${esc(e.kelas)}</td><td>${esc(e.subject)}</td><td>${esc((e.masa||'').replace('-','–'))}</td><td>${esc(e.name)}</td><td>${esc(e.nokp)}</td><td><span class="pill">${esc(e.reason)}</span></td></tr>`).join('')||'<tr><td colspan=7 style="color:var(--present)">Tiada ketidakhadiran.</td></tr>'}
      </table></div>`;
  }
}
