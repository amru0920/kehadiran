/* ===== NAV: 3 modul (Kurikulum / Hal Ehwal Murid / Kokurikulum) ===== */
const MODULES={
  kurikulum:{label:'Kurikulum',tabs:[
    {k:'ambil',   l:'Kehadiran'},
    {k:'data',    l:'Data'},
    {k:'laporan', l:'Laporan'},
    {k:'latihan', l:'e-SEBAMA'}]},
  hem:{label:'Hal Ehwal Murid',tabs:[
    {k:'pelajar', l:'Profil Murid'},
    {k:'disiplin',l:'Disiplin'}]},
  koku:{label:'Kokurikulum',tabs:[
    {k:'koku-kehadiran',l:'Kehadiran'},
    {k:'koku-unit',     l:'Ahli Unit'},
    {k:'koku-murid',    l:'Semak Murid'},
    {k:'koku-ringkasan',l:'Ringkasan'}]}
};
const ALL_TABS=Object.values(MODULES).flatMap(m=>m.tabs.map(t=>t.k));
const RENDER={
  ambil:()=>{fillKelasDropdown();loadCurrent();},
  data:()=>renderData(),
  laporan:()=>{},                 // guru tekan "Cari" untuk jana laporan
  pelajar:()=>renderPelajar(),
  disiplin:()=>renderDisiplin(),
  latihan:()=>renderLatihan(),
  'koku-kehadiran':()=>renderKoku('kehadiran'),
  'koku-unit':()=>renderKoku('unit'),
  'koku-murid':()=>renderKoku('murid'),
  'koku-ringkasan':()=>renderKoku('ringkasan')
};
const nav={mod:'kurikulum',last:{}};   // last: modul -> sub-tab terakhir dibuka

/* ingat pilihan guru supaya tak perlu cari semula */
function navRestore(){
  try{
    const raw=localStorage.getItem('nav.v1');
    if(!raw)return;
    const o=JSON.parse(raw);
    if(o&&MODULES[o.mod])nav.mod=o.mod;
    if(o&&o.last)Object.keys(MODULES).forEach(m=>{
      const t=o.last[m];
      if(MODULES[m].tabs.some(x=>x.k===t))nav.last[m]=t;
    });
  }catch(e){}
}
/* pintasan dari ikon skrin utama: index.html?go=ambil */
function navFromUrl(){
  try{
    const g=new URLSearchParams(location.search).get('go');
    return ALL_TABS.includes(g)?g:null;
  }catch(e){return null;}
}
function navSave(){try{localStorage.setItem('nav.v1',JSON.stringify({mod:nav.mod,last:nav.last}));}catch(e){}}

function showTab(k){
  const mod=Object.keys(MODULES).find(m=>MODULES[m].tabs.some(t=>t.k===k));
  if(!mod)return;
  nav.mod=mod; nav.last[mod]=k; navSave();
  document.querySelectorAll('#modbar .mod').forEach(b=>b.classList.toggle('active',b.dataset.mod===mod));
  renderSubtabs();
  ALL_TABS.forEach(t=>{const el=$('#tab-'+t);if(el)el.classList.toggle('hidden',t!==k);});
  $('#savebar').classList.toggle('hidden',k!=='ambil');
  $('#savebar-koku').classList.toggle('hidden',k!=='koku-kehadiran');
  window.scrollTo(0,0);
  (RENDER[k]||(()=>{}))();
}
function renderSubtabs(){
  const m=MODULES[nav.mod], cur=nav.last[nav.mod]||m.tabs[0].k;
  $('#subtabs').innerHTML=m.tabs.map(t=>`<button class="tab ${t.k===cur?'active':''}" data-tab="${t.k}">${esc(t.l)}</button>`).join('');
}
function openModule(mod){
  if(!MODULES[mod])return;
  nav.mod=mod;
  showTab(nav.last[mod]||MODULES[mod].tabs[0].k);
}

$('#modbar').addEventListener('click',e=>{const b=e.target.closest('[data-mod]');if(b)openModule(b.dataset.mod);});
$('#subtabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)showTab(b.dataset.tab);});
$('#tab-admin-btn').onclick=()=>{if(state.teacher?.is_admin)window.location.href='admin.html';};

navRestore();
renderSubtabs();
boot().then(()=>{
  if($('#app').classList.contains('hidden'))return;
  const g=navFromUrl();
  if(g)showTab(g); else openModule(nav.mod);
});
