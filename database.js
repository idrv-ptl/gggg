(()=>{
  const app=window.CampusAI;
  const client=()=>{if(!app.supabase)throw new Error('Campus data is unavailable. Please try again.');return app.supabase};
  const table=name=>client().from(name);
  const newId=()=>window.crypto?.randomUUID?window.crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,character=>{const random=Math.random()*16|0;return(character==='x'?random:(random&0x3|0x8)).toString(16)});
  let pending=0,indicator=null;
  const showLoading=()=>{
    pending++;
    if(indicator)return;
    indicator=document.createElement('div');indicator.className='database-loading';indicator.id='database-loading';indicator.setAttribute('role','status');indicator.setAttribute('aria-live','polite');
    indicator.innerHTML='<span class="auth-spinner" aria-hidden="true"></span><span>Syncing your campus data…</span>';document.body.append(indicator);
  };
  const hideLoading=()=>{pending=Math.max(0,pending-1);if(!pending&&indicator){indicator.remove();indicator=null}};
  const request=async(message,work)=>{showLoading();try{const {data,error}=await work();if(error)throw error;return data}catch(error){throw new Error(message,{cause:error})}finally{hideLoading()}};
  const normalizePercent=row=>{const raw=row.attendance_percentage;if(raw!==null&&raw!==undefined&&raw!==''&&Number.isFinite(Number(raw)))return Number(raw);const total=Number(row.total_classes)||0;return total?Math.round((Number(row.attended_classes)||0)*100/total):0};
  const byNewest=(a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0);
  const scoped=name=>request('Could not load your '+name+'. Please retry.',()=>table(name).select('*').eq('student_id',app.session.user.id));

  app.database={
    async getStudent(id){return request('Could not load your profile. Please retry.',()=>table('students').select('id,full_name,email,branch,semester,profile_image,created_at').eq('id',id).maybeSingle())},
    async saveStudent(student){
      if(!student?.id)throw new Error('Could not save your profile. Please sign in again.');
      const payload={id:student.id,full_name:student.full_name||'',email:student.email||'',branch:student.branch||null,semester:student.semester||null,profile_image:student.profile_image||null};
      await request('Could not save your student profile. Check the students table policies.',()=>table('students').upsert(payload,{onConflict:'id'}));
      return payload;
    },
    async ensureStudentProfile(user,details={}){
      if(!user?.id)throw new Error('Could not verify your student profile. Please sign in again.');
      const {data:{session},error}=await client().auth.getSession();if(error)throw new Error('Could not verify your session. Please sign in again.');
      if(!session||session.user.id!==user.id)return {deferred:true,student:null};
      const existing=await this.getStudent(user.id),metadata=user.user_metadata||{};
      const student={id:user.id,full_name:details.full_name||existing?.full_name||metadata.full_name||metadata.name||'',email:details.email||user.email||existing?.email||'',branch:details.branch||existing?.branch||metadata.branch||'',semester:details.semester||existing?.semester||metadata.semester||'',profile_image:existing?.profile_image||null};
      await this.saveStudent(student);return {deferred:false,student:await this.getStudent(user.id)};
    },
    async updateStudent(id,changes){
      const payload={full_name:changes.full_name,email:changes.email,branch:changes.branch,semester:changes.semester,profile_image:changes.profile_image};Object.keys(payload).forEach(key=>payload[key]===undefined&&delete payload[key]);
      const data=await request('Could not save your profile changes. Please retry.',()=>table('students').update(payload).eq('id',id).select('id,full_name,email,branch,semester,profile_image,created_at').single());return data;
    },
    async uploadProfileImage(userId,file){
      if(!file||!/^image\/(jpeg|png|webp|gif)$/.test(file.type))throw new Error('Choose a JPG, PNG, WEBP, or GIF image.');
      if(file.size>5*1024*1024)throw new Error('Choose an image smaller than 5 MB.');
      const extension=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',path=userId+'/profile.'+extension,bucket=CampusAIConfig.profileBucket;
      const {data,error}=await request('Could not upload your profile photo. Check the Storage bucket and policies.',()=>client().storage.from(bucket).upload(path,file,{upsert:true,contentType:file.type}));if(error)throw new Error('Could not upload your profile photo.');
      const {data:{publicUrl}}=client().storage.from(bucket).getPublicUrl(data.path);
      return this.updateStudent(userId,{profile_image:publicUrl});
    },
    async listAttendance(){return (await scoped('attendance')).map(row=>({...row,attendance_percentage:normalizePercent(row)}))},
    async listAssignments(){return (await scoped('assignments')).sort((a,b)=>new Date(a.due_date||0)-new Date(b.due_date||0))},
    async listTimetable(){return (await scoped('timetable')).sort((a,b)=>String(a.start_time||'').localeCompare(String(b.start_time||'')))},
    async listNotices(){return (await request('Could not load campus notices. Please retry.',()=>table('notices').select('*'))).sort((a,b)=>Number(Boolean(b.is_pinned))-Number(Boolean(a.is_pinned))||byNewest(a,b))},
    async listSyllabus(){return request('Could not load the course syllabus. Please retry.',()=>table('syllabus').select('*'))},
    async listQueries(){return (await scoped('queries')).sort(byNewest)},
    async listAllQueries(){return (await request('Could not load campus queries. Please retry.',()=>table('queries').select('*'))).sort(byNewest)},
    async createQuery({title,message}){return request('Could not submit your query. Please retry.',()=>table('queries').insert({id:newId(),student_id:app.session.user.id,title,message,status:'Pending'}))},
    async updateQuery(id,{title,message}){return request('Could not update your query. Please retry.',()=>table('queries').update({title,message}).eq('id',id).eq('student_id',app.session.user.id))},
    async deleteQuery(id){return request('Could not delete your query. Please retry.',()=>table('queries').delete().eq('id',id).eq('student_id',app.session.user.id))},
    async createAssignment({title,description,subject,due_date,priority}){return request('Could not save the assignment. Please retry.',()=>table('assignments').insert({id:newId(),student_id:app.session.user.id,title,description:description||'',subject:subject||'',due_date,status:'Pending',priority:priority||'Medium'}))},
    async createNotice({title,description,category,is_pinned}){return request('Could not publish the notice. Please retry.',()=>table('notices').insert({id:newId(),title,description,category,is_pinned:Boolean(is_pinned)}))},
    async listAllStudents(){return request('Could not load the student directory. Please retry.',()=>table('students').select('id,full_name,email,branch,semester,created_at'))},
    async listAllAttendance(){return request('Could not load campus attendance. Please retry.',()=>table('attendance').select('*'))},
    async countRows(name,filters=[]){return request('Could not load campus summary. Please retry.',async()=>{let query=table(name).select('id',{count:'exact',head:true});filters.forEach(([column,value])=>query=query.eq(column,value));const {count,error}=await query;return{data:count,error}})},
    async dashboardData(){const [profile,attendance,timetable,notices,assignments,queries]=await Promise.all([this.getStudent(app.session.user.id),this.listAttendance(),this.listTimetable(),this.listNotices(),this.listAssignments(),this.listQueries()]);return{profile,attendance,timetable,notices,assignments,queries}}
  };
})();
