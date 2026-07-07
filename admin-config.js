/* ===== KONFIGURASI ===== */
const SUPABASE_URL  = "https://uxodkjkpwiyfxozgrnib.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4b2Rramtwd2l5ZnhvemdybmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDY0MTUsImV4cCI6MjA5NzE4MjQxNX0.ndWT0nLnNQTo7rp8naPzYfRUXc2eRZ1U06GQScSCqBY";
const ADMIN_EMAIL   = "admin@kehadiran.local";   // akaun admin (cipta di Dashboard + daftar dalam jadual admins)
const FN_URL        = `${SUPABASE_URL}/functions/v1/admin-teachers`;
/* ======================= */

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
const $=s=>document.querySelector(s);
const esc=s=>(s??'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),3200);}

const NA='Tidak Berkenaan';
const cache={students:[]};

const classesFromStudents=()=>[...new Set(cache.students.map(s=>s.kelas).filter(Boolean))].sort();
async function loadStudents(){ const {data,error}=await sb.from('students').select('*').order('name'); if(error)throw error; cache.students=data;
  try{ const g=await sb.from('groups').select('name, group_members(student_id)'); cache.groupSize={}; (g.data||[]).forEach(x=>{cache.groupSize[x.name]=(x.group_members||[]).length;}); }catch(e){ cache.groupSize=cache.groupSize||{}; } }
const isGroup=cn=>!!(cache.groupSize&&cache.groupSize[cn]!=null);
const groupBadge=cn=>isGroup(cn)?' <span class="pill g" style="font-size:10px">KUMPULAN</span>':'';
function classOptGroups(){
  let h='<optgroup label="Kelas Tingkatan">'+classesFromStudents().map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')+'</optgroup>';
  const gs=Object.keys(cache.groupSize||{}).sort();
  if(gs.length) h+='<optgroup label="Kumpulan Kelas Tambahan">'+gs.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('')+'</optgroup>';
  return h;
}
