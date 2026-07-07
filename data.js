const dataPeriod=()=>document.querySelector('#dt-seg button.active')?.dataset.p||'bulan';

/* ===== DATA (ikut kelas guru sahaja) ===== */
async function renderData(){
  $('#dt-seg').onclick=e=>{const b=e.target.closest('[data-p]');if(!b)return;document.querySelectorAll('#dt-seg button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderDataBody();};
  renderDataBody();
}
async function renderDataBody(){
  const box=$('#data-list');box.innerHTML='<div class="empty">Mengira…</div>';$('#data-kekerapan').innerHTML='';
  try{
    const cls=myClasses();
    if(!cls.length){box.innerHTML='<div class="empty"><strong>Tiada kelas</strong></div>';return;}
    const [from,to]=periodRange(dataPeriod());
    const results=await Promise.all(cls.map(c=>DB.sessionsByClass(c,from,to)));
    const rows=cls.map((cn,i)=>{
      const ss=results[i];const students=rosterFor(cn).length;
      let absent=0;ss.forEach(s=>absent+=(s.absentees||[]).filter(a=>a.reason!==NA).length);
      const slots=students*ss.length;
      return{cn,students,sessions:ss.length,absent,rate:slots>0?((slots-absent)/slots*100):null};
    }).sort((a,b)=>{if(a.rate===null)return 1;if(b.rate===null)return -1;return a.rate-b.rate;});
    box.innerHTML=rows.map(r=>{
      const col=r.rate===null?'#9aa3b2':r.rate<80?'var(--absent)':r.rate<90?'var(--warn)':'var(--present)';
      const label=r.rate===null?'—':Math.round(r.rate)+'%';
      return `<div class="dcard"><div class="gauge" style="background:${col}">${label}</div>
        <div class="info"><div class="cn">${esc(r.cn)}</div>
        <div class="det">${r.students} pelajar · ${r.sessions} sesi · ${r.absent} kali tidak hadir</div></div></div>`;
    }).join('')||'<div class="empty">Tiada sesi dalam tempoh ini.</div>';
    // Kekerapan tidak hadir (pelajar yang sama)
    const perStu={};
    results.flat().forEach(s=>(s.absentees||[]).forEach(a=>{if(a.reason===NA)return;const st=a.students||{};const id=st.nokp||st.name;
      perStu[id]=perStu[id]||{name:st.name||'-',nokp:st.nokp||'',count:0,reasons:{}};
      perStu[id].count++;perStu[id].reasons[a.reason]=(perStu[id].reasons[a.reason]||0)+1;}));
    const ku=Object.values(perStu).sort((a,b)=>b.count-a.count);
    $('#data-kekerapan').innerHTML=ku.length?`<table class="rpt-table"><tr><th>#</th><th>Pelajar</th><th>Kali</th><th>Sebab</th></tr>
      ${ku.map((p,i)=>`<tr class="${p.count>=3?'hot':''}"><td>${i+1}</td><td><b>${esc(p.name)}</b></td><td><span class="pill">${p.count}</span></td><td style="color:var(--muted)">${Object.entries(p.reasons).map(([r,n])=>esc(r)+'×'+n).join(', ')}</td></tr>`).join('')}
      </table><p class="legend" style="margin-top:8px">Baris merah = 3 kali atau lebih tidak hadir (pelajar yang sama).</p>`
      :'<div class="empty" style="padding:20px">Tiada ketidakhadiran dalam tempoh ini.</div>';
  }catch(e){box.innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';}
}
