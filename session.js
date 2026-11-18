(()=>{
  const app=window.CampusAI;
  const publicPages=new Set(['','index.html','login.html','signup.html']);
  const currentFile=location.pathname.split('/').filter(Boolean).pop()||'';
  const protectedPage=!publicPages.has(currentFile);
  const adminPage=location.pathname.toLowerCase().includes('/admin/');
  const redirect=()=>location.replace(new URL(adminPage?'../login.html':'login.html',location.href).href);
  const shell=document.getElementById('app-shell')||document.querySelector('.app-shell');
  let loading=null;
  if(protectedPage){loading=document.createElement('div');loading.className='session-loading';loading.id='session-loading';loading.setAttribute('role','status');loading.innerHTML='<span class="auth-spinner" aria-hidden="true"></span><span>Checking your session…</span>';document.body.append(loading);if(shell){shell.hidden=true;shell.setAttribute('aria-busy','true')}}
  app.session={user:null,profile:null,ready:Promise.resolve(null),async refresh(){const client=app.supabase;if(!client)return null;const {data,error}=await client.auth.getSession();if(error)throw error;this.user=data.session?.user||null;return this.user}};
  if(!app.supabase){if(protectedPage){app.reportError(app.supabaseError,'Supabase is unavailable.');redirect()}return}
  app.session.ready=(async()=>{
    try{
      const user=await app.session.refresh();
      if(!protectedPage)return user;
      if(!user){redirect();return null}
      if(adminPage&&user.app_metadata?.role!=='admin'){app.toast('Administrator access is required.','error');location.replace('../dashboard.html');return null}
      if(!adminPage){
        try{
          const result=await app.database.ensureStudentProfile(user);
          app.session.profile=result.student;
          if(result.deferred)throw new Error('Your student profile will be saved after you sign in with the confirmed account.');
        }catch(error){app.reportError(error,'Could not load or save your student profile.')}
        app.renderCurrentUser(user,app.session.profile);
      }
      if(shell){shell.hidden=false;shell.removeAttribute('aria-busy')}
      loading?.remove();
      return user;
    }catch(error){app.reportError(error,'Could not verify your session.');if(protectedPage)redirect();return null}
  })();
  app.supabase.auth.onAuthStateChange((event,session)=>{app.session.user=session?.user||null;if(event==='SIGNED_OUT'&&protectedPage)redirect()});
})();
