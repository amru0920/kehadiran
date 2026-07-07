/* ===== KUMPULAN KELAS TAMBAHAN ===== */
async function renderKumpulan(){
  try{ await loadStudents(); }catch(e){ toast('Ralat: '+e.message); }
  let groups=[],mem=[];
  try{
    const g=await sb.from('groups').select('*').order('name'); if(g.error)throw g.error; groups=g.data||[];
    const m=await sb.from('group_members').select('group_id'); mem=m.data||[];
  }catch(e){ toast('Ralat: '+e.message); }
  const count={}; mem.forEach(x=>count[x.group_id]=(count[x.group_id]||0)+1);
  const cls=classesFromStudents();
  $('#tab-kumpulan').innerHTML=`<div class="card"><h3>Kumpulan Kelas Tambahan (${groups.length})</h3>
    <p class="legend">Untuk subjek yang hanya <b>sebahagian murid</b> ambil. Cikgu pilih kumpulan ini semasa ambil kehadiran — hanya ahli keluar.</p>
    <div class="addrow">
      <input id="kg-name" placeholder="Nama kumpulan (cth: BM Tambahan Sains)">
      <input id="kg-subj" placeholder="Subjek (cth: Bahasa Melayu)">
      <select id="kg-base"><option value="">Kelas asas (pilihan)</option>${cls.map(c=>`<option>${esc(c)}</option>`).join('')}</select>
      <button class="btn btn-primary" id="kg-add">Cipta</button>
    </div>
    <div id="kg-list" style="margin-top:6px">${groups.map(g=>`<div class="item" data-id="${g.id}">
      <span class="grow"><span class="nm">${esc(g.name)}</span><br><span class="sub">${esc(g.subject||'-')}${g.base_class?' · '+esc(g.base_class):''} · ${count[g.id]||0} ahli</span></span>
      <button class="icon-btn" data-act="ahli">Ahli</button><button class="icon-btn danger" data-act="del">Padam</button></div>
      <div class="kg-editor hidden" data-editor="${g.id}"></div>`).join('')||'<div class="sub">Tiada kumpulan lagi.</div>'}</div></div>`;

  $('#kg-add').onclick=async()=>{
    const name=$('#kg-name').value.trim(),subject=$('#kg-subj').value.trim(),base=$('#kg-base').value;
    if(!name){toast('Nama kumpulan wajib');return;}
    try{const {error}=await sb.from('groups').insert({name,subject,base_class:base});if(error)throw error;renderKumpulan();toast('Kumpulan dicipta ✓');}catch(e){toast('Ralat: '+e.message);}
  };
  $('#kg-list').onclick=async e=>{
    const b=e.target.closest('[data-act]');if(!b)return;
    const row=e.target.closest('.item'),gid=row.dataset.id;
    if(b.dataset.act==='del'){if(confirm('Padam kumpulan ini? (Rekod kehadiran sedia ada tidak terjejas)')){try{const {error}=await sb.from('groups').delete().eq('id',gid);if(error)throw error;renderKumpulan();toast('Dipadam');}catch(e){toast('Ralat: '+e.message);}}}
    if(b.dataset.act==='ahli'){const g=groups.find(x=>x.id===gid);editMembers(gid,g);}
  };
}
async function editMembers(gid,g){
  const panel=document.querySelector(`[data-editor="${gid}"]`);
  if(!panel.classList.contains('hidden')){panel.classList.add('hidden');panel.innerHTML='';return;}
  document.querySelectorAll('.kg-editor').forEach(p=>{p.classList.add('hidden');p.innerHTML='';});
  panel.classList.remove('hidden');panel.innerHTML='<div class="sub" style="padding:10px">Memuat…</div>';
  const existing=new Set();
  try{const m=await sb.from('group_members').select('student_id').eq('group_id',gid);(m.data||[]).forEach(x=>existing.add(x.student_id));}catch(e){}
  const pool=cache.students.filter(s=>!g.base_class||s.kelas===g.base_class);
  panel.innerHTML=`<div style="padding:10px 4px 14px">
    <input id="kg-s-${gid}" placeholder="🔍 Cari murid" style="width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px">
    <div style="max-height:340px;overflow:auto;border:1px solid var(--line);border-radius:10px">
      ${pool.map(s=>`<label class="kg-row" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid var(--line);cursor:pointer">
        <input type="checkbox" data-sid="${s.id}" ${existing.has(s.id)?'checked':''}>
        <span><b>${esc(s.name)}</b><br><span class="sub">${esc(s.nokp)} · ${esc(s.kelas||'')}</span></span></label>`).join('')||'<div class="sub" style="padding:10px">Tiada murid untuk kelas asas ini.</div>'}
    </div>
    <div style="display:flex;gap:10px;margin-top:10px;align-items:center">
      <button class="btn btn-primary" data-save="${gid}">Simpan Ahli</button>
      <span class="sub" id="kg-cnt-${gid}"></span>
    </div></div>`;
  const upd=()=>{document.getElementById('kg-cnt-'+gid).textContent=panel.querySelectorAll('input[type=checkbox]:checked').length+' dipilih';};
  upd();
  panel.querySelector('#kg-s-'+gid).oninput=ev=>{const q=ev.target.value.toLowerCase();panel.querySelectorAll('.kg-row').forEach(l=>{l.style.display=l.textContent.toLowerCase().includes(q)?'':'none';});};
  panel.addEventListener('change',upd);
  panel.querySelector('[data-save="'+gid+'"]').onclick=async()=>{
    const ids=[...panel.querySelectorAll('input[type=checkbox]:checked')].map(c=>c.dataset.sid);
    try{
      await sb.from('group_members').delete().eq('group_id',gid);
      if(ids.length){const rows=ids.map(sid=>({group_id:gid,student_id:sid}));const {error}=await sb.from('group_members').insert(rows);if(error)throw error;}
      toast('Ahli disimpan ✓ ('+ids.length+' murid)');renderKumpulan();
    }catch(e){toast('Ralat: '+e.message);}
  };
}
