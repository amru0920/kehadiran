const state={teacher:null,students:[]};

const classesForTeacher=()=>{
  const all=[...new Set(state.students.map(s=>s.kelas).filter(Boolean))].sort();
  // Kalau guru ada class_name, tunjuk kelas dia dulu, lain di bawah
  if(state.teacher?.class_name){
    const mine=all.filter(c=>c===state.teacher.class_name);
    const rest=all.filter(c=>c!==state.teacher.class_name);
    return [...mine,...rest];
  }
  return all;
};
const rosterFor=kelas=>state.students.filter(s=>s.kelas===kelas).sort((a,b)=>a.name.localeCompare(b.name));
const rosterForGroup=g=>(g.members||[]).map(id=>state.students.find(s=>s.id===id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));
const myClasses=()=>state.teacher?.class_name?[state.teacher.class_name]:classesForTeacher();
function periodRange(p){const t=new Date();const to=todayISO();
  if(p==='minggu'){const f=new Date(t);f.setDate(t.getDate()-6);return[f.toISOString().slice(0,10),to];}
  if(p==='bulan')return[`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`,to];
  return[null,null];}   // Semua = tiada had tarikh
