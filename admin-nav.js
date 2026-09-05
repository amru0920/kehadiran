/* ===== NAV ADMIN: modul Pentadbiran / Kurikulum / HEM / Kokurikulum ===== */
const MODULES={
  pentadbiran:{tabs:[
    {k:'guru',    l:'Guru'},
    {k:'pelajar', l:'Pelajar'},
    {k:'kumpulan',l:'Kumpulan'}]},
  kurikulum:{tabs:[
    {k:'data',    l:'Laporan & Analisis'},
    {k:'latihan', l:'Latihan / e-SEBAMA'}]},
  hem:{tabs:[
    {k:'disiplin',l:'Disiplin'},
    {k:'hukuman', l:'Hukuman'}]},
  koku:{tabs:[
    {k:'koku',     l:'Unit & Penasihat'},
    {k:'kokuahli', l:'Daftar Ahli'}]}
};
const ALL_TABS=Object.values(MODULES).flatMap(m=>m.tabs.map(t=>t.k));
const RENDER={
  guru:()=>renderGuru(),
  pelajar:()=>renderPelajar(),
  kumpulan:()=>renderKumpulan(),
  data:()=>renderData(),
  latihan:()=>renderLatihanAdmin(),
  disiplin:()=>renderDisiplinAdmin(),
  hukuman:()=>renderHukuman(),
  koku:()=>renderKokuAdmin(),
  kokuahli:()=>renderKokuAhli()
};
const nav={mod:'pentadbiran',last:{}};

function navRestore(){
  try{
    const o=JSON.parse(localStorage.getItem('adminnav.v1')||'null');
    if(o&&MODULES[o.mod])nav.mod=o.mod;
    if(o&&o.last)Object.keys(MODULES).forEach(m=>{const t=o.last[m];if(MODULES[m].tabs.some(x=>x.k===t))nav.last[m]=t;});
  }catch(e){}
}
function navSave(){try{localStorage.setItem('adminnav.v1',JSON.stringify({mod:nav.mod,last:nav.last}));}catch(e){}}

function showTab(k){
  const mod=Object.keys(MODULES).find(m=>MODULES[m].tabs.some(t=>t.k===k));
  if(!mod)return;
  nav.mod=mod; nav.last[mod]=k; navSave();
  document.querySelectorAll('#modbar .mod').forEach(b=>b.classList.toggle('active',b.dataset.mod===mod));
  renderSubtabs();
  ALL_TABS.forEach(t=>{const el=$('#tab-'+t);if(el)el.classList.toggle('hidden',t!==k);});
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
/* dipanggil oleh enterApp() dalam admin-auth.js */
function navEnter(){ openModule(nav.mod); }

$('#modbar').addEventListener('click',e=>{const b=e.target.closest('[data-mod]');if(b)openModule(b.dataset.mod);});
$('#subtabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)showTab(b.dataset.tab);});

navRestore();
renderSubtabs();
boot();
