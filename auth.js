const icToEmail=ic=>ic.replace(/\D/g,'')+EMAIL_DOMAIN;
const emailToIc=em=>(em||'').split('@')[0];

/* ===== AUTH ===== */
function showScreen(name){
  ['login-screen','app'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('hidden');});
  const el=document.getElementById(name==='app'?'app':name+'-screen');
  if(el){el.classList.remove('hidden');window.scrollTo(0,0);}
}
async function boot(){
  const{data:{session}}=await sb.auth.getSession();
  if(session&&session.user.email===ADMIN_EMAIL){await sb.auth.signOut();showScreen('login');return;}
  if(session) await afterLogin(); else showScreen('login');
}
$('#lg-btn').onclick=async()=>{
  const ic=$('#lg-ic').value.replace(/\D/g,'');
  if(ic.length<4){toast('Masukkan No. KP penuh');return;}
  const pw=ic.slice(-4);            // kata laluan tetap = 4 digit akhir IC
  $('#lg-btn').disabled=true;
  const{error}=await sb.auth.signInWithPassword({email:icToEmail(ic),password:pw});
  $('#lg-btn').disabled=false;
  if(error){toast('No. KP tidak sah atau akaun belum dicipta');return;}
  await afterLogin();
};
$('#lg-ic').addEventListener('keydown',e=>{if(e.key==='Enter')$('#lg-btn').click();});
async function afterLogin(){
  const{data:{user}}=await sb.auth.getUser();
  const ic=emailToIc(user.email);
  let t=null;try{t=await DB.myTeacher(ic);}catch(e){}
  state.teacher=t||{ic,name:ic,is_admin:false};
  // Tab Admin hanya untuk guru yang dibenarkan
  $('#tab-admin-btn').classList.toggle('hidden', !state.teacher.is_admin);
  await enterApp();
}
$('#btn-logout').onclick=async()=>{await sb.auth.signOut();state.teacher=null;showScreen('login');$('#lg-ic').value='';};

/* ===== ENTER APP ===== */
async function enterApp(){
  showScreen('app');
  $('#who-am-i').textContent=(state.teacher.name||'Guru')+(state.teacher.class_name?(' · '+state.teacher.class_name):'');
  $('#tarikh').value=todayISO();
  try{state.students=await DB.students();}catch(e){toast('Ralat memuat pelajar');state.students=[];}
  try{state.teachersByIc=await DB.teachersMap();}catch(e){state.teachersByIc={};}
  try{state.groups=await DB.groups();}catch(e){state.groups=[];}
  try{state.offenceTypes=await DB.offenceTypes();}catch(e){state.offenceTypes=[];}
  fillKelasDropdown();
  fillLaporanKelas();
  await loadCurrent();
}

function fillKelasDropdown(){
  const cls=classesForTeacher();
  let html=`<optgroup label="Kelas Tingkatan">`+cls.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')+`</optgroup>`;
  const grps=state.groups||[];
  if(grps.length) html+=`<optgroup label="Kumpulan Subjek">`+grps.map(g=>`<option value="grp:${g.id}">${esc(g.name)}${g.subject?' — '+esc(g.subject):''}</option>`).join('')+`</optgroup>`;
  $('#kelas').innerHTML=html||'<option value="">(Tiada)</option>';
  if(state.teacher?.class_name&&cls.includes(state.teacher.class_name))$('#kelas').value=state.teacher.class_name;
}
function fillLaporanKelas(){
  const cls=classesForTeacher();
  $('#lap-kelas').innerHTML=cls.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  // default range: bulan ini
  const now=new Date(),y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0');
  $('#lap-from').value=`${y}-${m}-01`;
  $('#lap-to').value=todayISO();
}
