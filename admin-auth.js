/* ===== panggil Edge Function (hantar token sesi admin) ===== */
async function callFn(body){
  const {data:{session}}=await sb.auth.getSession();
  if(!session) throw new Error('Sesi tamat, log masuk semula');
  const res=await fetch(FN_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify(body)});
  const out=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(out.error||('Ralat '+res.status));
  return out;
}

/* ===== AUTH (IC + semak is_admin) ===== */
let adminName='Admin';
async function isCallerAdmin(){
  const {data:{user}}=await sb.auth.getUser();
  if(!user) return false;
  const ic=(user.email||'').split('@')[0];
  const {data:t}=await sb.from('teachers').select('is_admin,name').eq('ic',ic).maybeSingle();
  if(t&&t.is_admin){ adminName=t.name||'Admin'; return true; }
  return false;
}
async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(session && await isCallerAdmin()) enterApp();
}
$('#adm-login').onclick=async()=>{
  const ic=$('#adm-ic').value.replace(/\D/g,'');
  if(ic.length<4){toast('Masukkan No. KP penuh');return;}
  $('#adm-login').disabled=true;
  const {error}=await sb.auth.signInWithPassword({email:ic+'@kehadiran.local',password:ic.slice(-4)});
  if(error){$('#adm-login').disabled=false;toast('No. KP tidak sah atau akaun belum dicipta');return;}
  if(!(await isCallerAdmin())){
    await sb.auth.signOut(); $('#adm-login').disabled=false;
    alert('⚠️ Akaun ini tiada akses Admin.\nHubungi pentadbir untuk dibenarkan.');
    return;
  }
  $('#adm-login').disabled=false; enterApp();
};
$('#adm-ic').addEventListener('keydown',e=>{if(e.key==='Enter')$('#adm-login').click();});
$('#btn-logout').onclick=async()=>{await sb.auth.signOut();location.reload();};
function enterApp(){ const ls=$('#login-screen'); ls.style.display='none'; ls.classList.add('hidden'); $('#app').classList.remove('hidden'); window.scrollTo(0,0); renderGuru(); }
