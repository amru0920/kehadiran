document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');
  const k=tab.dataset.tab;
  $('#tab-guru').classList.toggle('hidden',k!=='guru');
  $('#tab-pelajar').classList.toggle('hidden',k!=='pelajar');
  $('#tab-data').classList.toggle('hidden',k!=='data');
  $('#tab-hukuman').classList.toggle('hidden',k!=='hukuman');
  $('#tab-kumpulan').classList.toggle('hidden',k!=='kumpulan');
  $('#tab-disiplin').classList.toggle('hidden',k!=='disiplin');
  $('#tab-latihan').classList.toggle('hidden',k!=='latihan');
  if(k==='guru')renderGuru();if(k==='pelajar')renderPelajar();if(k==='data')renderData();if(k==='hukuman')renderHukuman();if(k==='kumpulan')renderKumpulan();if(k==='disiplin')renderDisiplinAdmin();if(k==='latihan')renderLatihanAdmin();
}));

boot();
