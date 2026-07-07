/* ===== GURU ===== */
async function renderGuru(){
  let list=[]; try{ const {data,error}=await sb.from('teachers').select('*').order('name'); if(error)throw error; list=data; await loadStudents(); }catch(e){ toast('Ralat: '+e.message); }
  const cls=classesFromStudents();
  const clsOpts=v=>'<option value="">(Tiada kelas)</option>'+cls.map(c=>`<option value="${esc(c)}" ${c===v?'selected':''}>${esc(c)}</option>`).join('');
  $('#tab-guru').innerHTML=`<div class="card"><h3>Guru <span style="font-size:13px;color:var(--muted);font-weight:600">(${list.length} orang)</span></h3>
    <div class="addrow"><input type="text" id="g-name" placeholder="Nama"><input type="text" id="g-ic" placeholder="No. KP (12 digit)" inputmode="numeric"><select id="g-class">${clsOpts()}</select><button class="btn btn-primary" id="g-add">Tambah + Cipta Akaun</button></div>
    <div class="addrow"><button class="btn btn-ghost" id="g-import">Import Guru (CSV)</button><button class="btn btn-ghost" id="g-templat">Templat CSV</button><input type="file" id="g-file" accept=".csv" hidden></div>
    <div class="addrow"><input type="text" id="g-search" placeholder="🔍 Cari nama atau No. KP guru"></div>
    <div id="g-tip" class="acct-tip hidden"></div>
    <div id="g-count" class="sub" style="margin:4px 2px"></div>
    <div id="g-list" style="margin-top:6px">${list.map(t=>`<div class="item" data-ic="${esc(t.ic)}" data-id="${t.id}" data-name="${esc((t.name||'').toLowerCase())}">
      <span class="grow"><span class="nm">${esc(t.name)} ${t.is_admin?'<span class="pill g" style="font-size:10px">ADMIN</span>':''}</span><br><span class="sub">${esc(t.ic)} · ${esc(t.class_name||'tiada kelas')}</span></span>
      <select data-act="setclass">${clsOpts(t.class_name)}</select>
      <button class="icon-btn" data-act="admin" style="${t.is_admin?'background:var(--ink);color:#fff;border-color:var(--ink)':''}">Admin</button>
      <button class="icon-btn" data-act="reset">Reset PW</button>
      <button class="icon-btn danger" data-act="del">Padam</button></div>`).join('')||'<div class="sub">Tiada guru.</div>'}</div></div>`;

  $('#g-add').onclick=async()=>{
    const name=$('#g-name').value.trim(), ic=$('#g-ic').value.replace(/\D/g,''), cn=$('#g-class').value;
    if(!name||!ic){toast('Nama & IC wajib');return;}
    $('#g-add').disabled=true;
    try{ const r=await callFn({action:'create',ic,name,class_name:cn});
      $('#g-tip').classList.remove('hidden');
      $('#g-tip').innerHTML=`✅ Akaun dicipta. Beritahu guru:<br>No. KP: <code>${esc(ic)}</code><br>Kata laluan sementara: <code>${esc(r.default_password)}</code> (4 digit akhir IC)<br>Login terus guna No. KP + 4 digit akhir IC.`;
      renderGuru(); toast('Guru + akaun dicipta ✓');
    }catch(e){ toast('Ralat: '+e.message); }
    $('#g-add').disabled=false;
  };
  $('#g-templat').onclick=()=>download('templat_guru.csv','Nama,NoKP,Kelas\nCikgu Contoh,900101071234,5 AVICENNA');
  $('#g-import').onclick=()=>$('#g-file').click();
  $('#g-file').onchange=ev=>{const f=ev.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>importGuruCSV(rd.result);rd.readAsText(f,'UTF-8');ev.target.value='';};
  $('#g-search').oninput=e=>{
    const q=e.target.value.trim().toLowerCase();
    const items=[...document.querySelectorAll('#g-list .item')];
    let shown=0;
    items.forEach(it=>{const hit=!q||it.dataset.name.includes(q)||(it.dataset.ic||'').includes(q);it.style.display=hit?'':'none';if(hit)shown++;});
    $('#g-count').textContent=q?`${shown} padanan ditemui`:'';
  };
  $('#g-list').onclick=async e=>{
    const b=e.target.closest('[data-act]'); if(!b||b.tagName==='SELECT')return;
    const row=e.target.closest('.item'), ic=row.dataset.ic;
    if(b.dataset.act==='del'){ if(confirm('Padam guru ini + akaun loginnya?')){ try{await callFn({action:'delete',ic});renderGuru();toast('Dipadam');}catch(e){toast('Ralat: '+e.message);} } }
    if(b.dataset.act==='reset'){ if(confirm('Reset kata laluan kepada 4 digit akhir IC?')){ try{const r=await callFn({action:'reset',ic});toast('Reset ✓ — PW sementara: '+r.default_password);renderGuru();}catch(e){toast('Ralat: '+e.message);} } }
    if(b.dataset.act==='admin'){ const id=row.dataset.id; const turnOn=!b.style.background; try{const {error}=await sb.from('teachers').update({is_admin:turnOn}).eq('id',id); if(error)throw error; toast(turnOn?'Diberi akses admin ✓':'Akses admin ditarik'); renderGuru();}catch(e){toast('Ralat: '+e.message);} }
  };
  $('#g-list').addEventListener('change',async e=>{
    if(e.target.dataset.act!=='setclass')return;
    const id=e.target.closest('.item').dataset.id;
    try{ const {error}=await sb.from('teachers').update({class_name:e.target.value||null}).eq('id',id); if(error)throw error; toast('Kelas dikemaskini'); }catch(err){toast('Ralat: '+err.message);}
  });
}

async function importGuruCSV(text){
  const rows=parseCSV(text); if(rows.length<2){toast('Fail kosong');return;}
  const h=rows[0].map(x=>x.toLowerCase().replace(/[^a-z]/g,''));
  const find=ks=>h.findIndex(x=>ks.includes(x));
  const iN=find(['nama','name']),iK=find(['nokp','nokad','ic','no']),iC=find(['kelas','class']);
  if(iN<0||iK<0){toast('Lajur perlu: Nama, NoKP');return;}
  const list=[];
  for(let r=1;r<rows.length;r++){const c=rows[r];const name=(c[iN]||'').trim(),ic=(c[iK]||'').replace(/\D/g,''),kelas=(iC>=0?(c[iC]||'').trim():'');if(name&&ic)list.push({name,ic,class_name:kelas});}
  if(!list.length){toast('Tiada baris ada NoKP — tak boleh cipta akaun tanpa NoKP');return;}
  if(!confirm(`Cipta ${list.length} akaun guru? Password default = 4 digit akhir IC.`))return;
  let ok=0,skip=0;
  for(const g of list){
    try{ await callFn({action:'create',ic:g.ic,name:g.name,class_name:g.class_name}); ok++; toast(`Mencipta… ${ok}/${list.length}`); }
    catch(e){ skip++; }
  }
  renderGuru(); toast(`Siap: ${ok} dicipta, ${skip} gagal/dah wujud`);
}
