/* ===== DISIPLIN (kesalahan ringan) ===== */
function renderDisiplin(){
  $('#dp-kelas').innerHTML='<option value="">— Pilih kelas —</option>'+allClassList().map(c=>`<option>${esc(c)}</option>`).join('');
  $('#dp-kelas').onchange=()=>{$('#dp-q').value='';dpList($('#dp-kelas').value);};
  $('#dp-go').onclick=dpSearch;
  $('#dp-q').onkeydown=e=>{if(e.key==='Enter')dpSearch();};
  $('#dp-out').innerHTML='<div class="empty"><strong>Pilih kelas</strong>Pilih kelas atau cari murid untuk rekod kesalahan.</div>';
}
function dpCard(s,i){return `<div class="dcard" data-id="${s.id}" style="cursor:pointer"><div class="info"><div class="cn">${i!=null?i+1+'. ':''}${esc(s.name)}</div><div class="det">${esc(s.nokp)} · ${esc(s.kelas||'')}</div></div></div>`;}
function dpList(kelas){
  if(!kelas){$('#dp-out').innerHTML='';return;}
  const list=state.students.filter(s=>s.kelas===kelas).sort((a,b)=>a.name.localeCompare(b.name));
  $('#dp-out').innerHTML=`<p class="legend">${list.length} murid dalam <b>${esc(kelas)}</b> — tekan untuk rekod kesalahan.</p>`+list.map((s,i)=>dpCard(s,i)).join('');
  $('#dp-out').onclick=e=>{const d=e.target.closest('[data-id]');if(d){const s=state.students.find(x=>x.id===d.dataset.id);if(s)dpProfil(s,kelas);}};
}
function dpSearch(){
  const q=$('#dp-q').value.trim().toLowerCase();if(!q){toast('Taip carian');return;}
  $('#dp-kelas').value='';
  const m=state.students.filter(s=>s.name.toLowerCase().includes(q)||(s.nokp||'').includes(q)).slice(0,40);
  $('#dp-out').innerHTML=m.length?m.map(s=>dpCard(s,null)).join(''):'<div class="empty">Tiada padanan.</div>';
  $('#dp-out').onclick=e=>{const d=e.target.closest('[data-id]');if(d){const s=state.students.find(x=>x.id===d.dataset.id);if(s)dpProfil(s);}};
}
async function dpProfil(s,back){
  $('#dp-out').innerHTML='<div class="empty">Memuat…</div>';
  try{
    const list=await DB.listOffences(s.nokp);
    const types=state.offenceTypes||[];
    const backBtn=back?`<button class="btn btn-ghost" id="dp-back" style="margin-bottom:10px">← Senarai ${esc(back)}</button>`:'';
    $('#dp-out').innerHTML=`${backBtn}
      <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;margin-bottom:10px;box-shadow:var(--shadow)">
        <div style="font-size:18px;font-weight:800">${esc(s.name)}</div>
        <div style="font-size:13px;color:var(--muted)">${esc(s.nokp)} · ${esc(s.kelas||'')} · ${list.length} rekod kesalahan</div>
      </div>
      <div class="lap-head" style="margin:0 0 10px">
        <div class="field"><label>Jenis Kesalahan</label><select id="dp-type">${types.length?types.map(t=>`<option>${esc(t)}</option>`).join(''):'<option value="">(Tiada jenis — admin perlu tambah)</option>'}</select></div>
        <div class="field"><label>Tarikh</label><input type="date" id="dp-date" value="${todayISO()}"></div>
        <div class="field" style="flex:1;min-width:150px"><label>Catatan (pilihan)</label><input type="text" id="dp-note" placeholder="Butiran"></div>
        <button class="btn btn-primary" id="dp-add">Rekod</button>
      </div>
      <div id="dp-list">${list.length?list.map(o=>`<div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:11px 14px;margin-bottom:8px;box-shadow:var(--shadow)">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><b>${esc(o.offence_type)}</b><span style="font-size:12px;color:var(--muted)">${esc(o.odate||'')}${o.recorded_name?' · '+esc(o.recorded_name):''}</span></div>
        ${o.note?`<div style="margin-top:3px;font-size:14px">${esc(o.note)}</div>`:''}
        <button class="hbtn" data-del="${o.id}" style="margin-top:6px;color:var(--absent);font-size:12px;padding:5px 10px">Padam</button></div>`).join(''):'<div class="empty" style="padding:16px">Tiada rekod kesalahan.</div>'}</div>`;
    if(back)$('#dp-back').onclick=()=>dpList(back);
    $('#dp-add').onclick=async()=>{
      const type=$('#dp-type').value,note=$('#dp-note').value.trim(),odate=$('#dp-date').value;
      if(!type){toast('Pilih jenis kesalahan');return;}
      try{await DB.addOffence({student_nokp:s.nokp,student_name:s.name,class_name:s.kelas,offence_type:type,note,odate,recorded_by:state.teacher?.ic||null,recorded_name:state.teacher?.name||null});
        toast('Kesalahan direkod ✓');dpProfil(s,back);}catch(e){toast('Ralat: '+e.message);}
    };
    $('#dp-list').onclick=async e=>{const b=e.target.closest('[data-del]');if(!b)return;if(confirm('Padam rekod kesalahan ini?')){try{await DB.delOffence(b.dataset.del);dpProfil(s,back);toast('Dipadam');}catch(e){toast('Ralat: '+e.message);}}};
  }catch(e){$('#dp-out').innerHTML='<div class="empty">Ralat: '+esc(e.message)+'</div>';}
}
