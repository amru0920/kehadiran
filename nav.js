/* ===== NAV ===== */
document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{
  const k=tab.dataset.tab;
  if(k==='adminlink'){ if(state.teacher?.is_admin){ window.location.href='admin.html'; } return; }
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');
  $('#tab-ambil').classList.toggle('hidden',k!=='ambil');
  $('#tab-data').classList.toggle('hidden',k!=='data');
  $('#tab-laporan').classList.toggle('hidden',k!=='laporan');
  $('#tab-pelajar').classList.toggle('hidden',k!=='pelajar');
  $('#tab-disiplin').classList.toggle('hidden',k!=='disiplin');
  $('#tab-latihan').classList.toggle('hidden',k!=='latihan');
  $('#savebar').classList.toggle('hidden',k!=='ambil');
  if(k==='data')renderData();
  if(k==='pelajar')renderPelajar();
  if(k==='disiplin')renderDisiplin();
  if(k==='latihan')renderLatihan();
  if(k==='ambil'){fillKelasDropdown();loadCurrent();}
}));

boot();
