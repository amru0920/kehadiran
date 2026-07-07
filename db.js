/* ===== DB ===== */
const DB={
  async myTeacher(ic){const{data,error}=await sb.from('teachers').select('*').eq('ic',ic).maybeSingle();if(error)throw error;return data;},
  async setPasswordFlag(ic){const{error}=await sb.from('teachers').update({password_set:true}).eq('ic',ic);if(error)throw error;},
  async students(){const{data,error}=await sb.from('students').select('*').order('name');if(error)throw error;return data;},
  async groups(){const{data,error}=await sb.from('groups').select('*, group_members(student_id)').order('name');if(error)throw error;return (data||[]).map(g=>({...g,members:(g.group_members||[]).map(m=>m.student_id)}));},
  async offenceTypes(){const{data,error}=await sb.from('offence_types').select('name').eq('active',true).order('name');if(error)throw error;return (data||[]).map(x=>x.name);},
  async getExercise(cn,subj,name,edate){const{data,error}=await sb.from('exercises').select('id,exercise_status(student_id,status,ambil_date,hantar_date,semak_date)').eq('class_name',cn).eq('subject',subj||'').eq('name',name).eq('edate',edate).maybeSingle();if(error)throw error;return data;},
  async exercisesList(){const{data,error}=await sb.from('exercises').select('*, exercise_status(status)').order('edate',{ascending:false});if(error)throw error;return data||[];},
  async exerciseDetail(id){const{data,error}=await sb.from('exercises').select('*, exercise_status(student_id,status,ambil_date,hantar_date,semak_date)').eq('id',id).single();if(error)throw error;return data;},
  async delExercise(id){const{error}=await sb.from('exercises').delete().eq('id',id);if(error)throw error;},
  async saveExercise(ex,statuses){
    const{data:e,error:e1}=await sb.from('exercises').upsert({name:ex.name,class_name:ex.class_name,subject:ex.subject||'',teacher_ic:ex.teacher_ic,teacher_name:ex.teacher_name,edate:ex.edate},{onConflict:'class_name,subject,name,edate'}).select('id').single();
    if(e1)throw e1;
    if(statuses.length){const rows=statuses.map(s=>({exercise_id:e.id,student_id:s.student_id,status:s.status,ambil_date:s.ambil_date,hantar_date:s.hantar_date,semak_date:s.semak_date}));const{error:e2}=await sb.from('exercise_status').upsert(rows,{onConflict:'exercise_id,student_id'});if(e2)throw e2;}
    return e.id;
  },
  async addOffence(o){const{error}=await sb.from('offences').insert(o);if(error)throw error;},
  async listOffences(nokp){const{data,error}=await sb.from('offences').select('*').eq('student_nokp',nokp).order('odate',{ascending:false});if(error)throw error;return data;},
  async delOffence(id){const{error}=await sb.from('offences').delete().eq('id',id);if(error)throw error;},
  async getSession(kelas,date,subjek){
    const{data,error}=await sb.from('attendance_sessions').select('id,session_time,recorded_by,absentees(student_id,reason)')
      .eq('class_name',kelas).eq('date',date).eq('subject',subjek||'').maybeSingle();
    if(error)throw error;return data;
  },
  async saveSession(kelas,date,subjek,recorded_by,session_time,absent){
    const{data:s,error:e1}=await sb.from('attendance_sessions')
      .upsert({class_name:kelas,date,subject:subjek||'',recorded_by,session_time:session_time||null},{onConflict:'class_name,date,subject'}).select('id').single();
    if(e1)throw e1;
    const{error:e2}=await sb.from('absentees').delete().eq('session_id',s.id);if(e2)throw e2;
    if(absent.length){const{error:e3}=await sb.from('absentees').insert(absent.map(a=>({session_id:s.id,student_id:a.student_id,reason:a.reason})));if(e3)throw e3;}
  },
  async sessionsByClass(kelas,from,to){
    let q=sb.from('attendance_sessions').select('class_name,date,subject,absentees(reason,students(name,nokp))').eq('class_name',kelas);
    if(from)q=q.gte('date',from); if(to)q=q.lte('date',to);
    const{data,error}=await q;if(error)throw error;return data;
  },
  async listRemarks(classes){const{data,error}=await sb.from('class_remarks').select('*').in('class_name',classes).order('created_at',{ascending:false});if(error)throw error;return data;},
  async addRemark(r){const{error}=await sb.from('class_remarks').insert(r);if(error)throw error;},
  async delRemark(id){const{error}=await sb.from('class_remarks').delete().eq('id',id);if(error)throw error;},
  async studentAbsences(studentId){const{data,error}=await sb.from('absentees').select('reason,attendance_sessions(date,class_name,subject,session_time,recorded_by)').eq('student_id',studentId);if(error)throw error;return data;},
  async classSessionCount(kelas){const{count,error}=await sb.from('attendance_sessions').select('id',{count:'exact',head:true}).eq('class_name',kelas);if(error)throw error;return count||0;},
  async teachersMap(){const{data,error}=await sb.from('teachers').select('ic,name');if(error)throw error;const m={};(data||[]).forEach(t=>{m[t.ic]=t.name;});return m;},
  async listDiscipline(nokp){const{data,error}=await sb.from('discipline').select('*').eq('student_nokp',nokp).order('created_at',{ascending:false});if(error)throw error;return data;},
  async addDiscipline(d){const{error}=await sb.from('discipline').insert(d);if(error)throw error;},
  async delDiscipline(id){const{error}=await sb.from('discipline').delete().eq('id',id);if(error)throw error;},
  async laporanSessions(kelas,from,to){
    const{data,error}=await sb.from('attendance_sessions')
      .select('id,date,subject,session_time,class_name,absentees(student_id,reason,students(name,nokp,kelas))')
      .eq('class_name',kelas).gte('date',from).lte('date',to).order('date');
    if(error)throw error;return data;
  }
};
