/* ===== PELAJAR ===== */
async function renderPelajar(){
  try{ await loadStudents(); }catch(e){ toast('Ralat: '+e.message); }
  $('#tab-pelajar').innerHTML=`<div class="card"><h3>Pelajar (${cache.students.length})</h3>
    <div class="addrow"><input type="text" id="p-nama" placeholder="Nama"><input type="text" id="p-nokp" placeholder="NoKP"><input type="text" id="p-kelas" placeholder="Kelas"><button class="btn btn-primary" id="p-add">Tambah</button></div>
    <div class="addrow"><button class="btn btn-ghost" id="p-import">Import CSV</button><button class="btn btn-ghost" id="p-templat">Templat</button><input type="file" id="p-file" accept=".csv" hidden></div>
    <div id="p-list" style="margin-top:6px">${cache.students.map(s=>`<div class="item" data-id="${s.id}">
      <span class="grow"><span class="nm">${esc(s.name)}</span><br><span class="sub">${esc(s.nokp)} · ${esc(s.kelas||'-')}</span></span>
      <button class="icon-btn" data-act="edit">Edit</button><button class="icon-btn danger" data-act="del">Padam</button></div>`).join('')||'<div class="sub">Tiada pelajar.</div>'}</div></div>`;

  $('#p-add').onclick=async()=>{const name=$('#p-nama').value.trim(),nokp=$('#p-nokp').value.trim(),kelas=$('#p-kelas').value.trim();if(!name||!nokp){toast('Nama & NoKP wajib');return;}
    try{const {error}=await sb.from('students').insert({name,nokp,kelas});if(error)throw error;renderPelajar();toast('Ditambah');}catch(e){toast('Ralat: '+(e.code==='23505'?'NoKP sudah wujud':e.message));}};
  $('#p-templat').onclick=()=>download('templat_pelajar.csv','Nama,NoKP,Kelas\nAhmad Danial,080101071111,5 AVICENNA');
  $('#p-import').onclick=()=>$('#p-file').click();
  $('#p-file').onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>importCSV(rd.result);rd.readAsText(f,'UTF-8');e.target.value='';};
  $('#p-list').onclick=async e=>{
    const b=e.target.closest('[data-act]');if(!b)return;const row=e.target.closest('.item'),id=row.dataset.id,s=cache.students.find(x=>x.id===id);
    if(b.dataset.act==='del'){if(confirm('Padam pelajar ini?')){try{const {error}=await sb.from('students').delete().eq('id',id);if(error)throw error;renderPelajar();toast('Dipadam');}catch(e){toast('Ralat: '+e.message);}}}
    if(b.dataset.act==='edit'){row.innerHTML=`<input type="text" class="grow" data-f="name" value="${esc(s.name)}"><input type="text" data-f="nokp" value="${esc(s.nokp)}" style="max-width:130px"><input type="text" data-f="kelas" value="${esc(s.kelas||'')}" style="max-width:110px"><button class="icon-btn" data-act="save">Simpan</button><button class="icon-btn" data-act="cancel">Batal</button>`;}
    if(b.dataset.act==='save'){const patch={name:row.querySelector('[data-f=name]').value.trim(),nokp:row.querySelector('[data-f=nokp]').value.trim(),kelas:row.querySelector('[data-f=kelas]').value.trim()};if(!patch.name||!patch.nokp)return;try{const {error}=await sb.from('students').update(patch).eq('id',id);if(error)throw error;renderPelajar();toast('Dikemaskini');}catch(e){toast('Ralat: '+e.message);}}
    if(b.dataset.act==='cancel')renderPelajar();
  };
}
function download(n,c){const b=new Blob(['﻿'+c],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=n;a.click();URL.revokeObjectURL(u);}
function parseCSV(t){t=t.replace(/^﻿/,'');const rows=[];let row=[],cur='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}else{if(c==='"')q=true;else if(c===','){row.push(cur);cur='';}else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur='';}else if(c!=='\r')cur+=c;}}if(cur!==''||row.length){row.push(cur);rows.push(row);}return rows.filter(r=>r.some(x=>x.trim()!==''));}
async function importCSV(text){
  try{
    const rows=parseCSV(text);if(rows.length<2)throw new Error('Fail kosong');
    const h=rows[0].map(x=>x.toLowerCase().replace(/[^a-z]/g,''));const find=ks=>h.findIndex(x=>ks.includes(x));
    const iN=find(['nama','name']),iK=find(['nokp','nokad','ic','no']),iC=find(['kelas','class']);
    if(iN<0||iK<0)throw new Error('Lajur perlu: Nama, NoKP');
    const batch=[];for(let r=1;r<rows.length;r++){const c=rows[r];const name=(c[iN]||'').trim(),nokp=(c[iK]||'').trim(),kelas=(iC>=0?(c[iC]||'').trim():'');if(!name||!nokp)continue;batch.push({name,nokp,kelas});}
    if(!batch.length)throw new Error('Tiada baris sah');
    const {error}=await sb.from('students').upsert(batch,{onConflict:'nokp'});if(error)throw error;
    renderPelajar();toast(`${batch.length} pelajar diimport ✓`);
  }catch(e){toast('Ralat import: '+e.message);}
}
