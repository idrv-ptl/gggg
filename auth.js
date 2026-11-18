(()=>{
  const app=window.CampusAI,client=app.supabase;
  const byId=id=>document.getElementById(id);
  const value=id=>(byId(id)?.value||'').trim();
  const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const setError=(id,message)=>{const box=byId(id),text=byId(id+'-text');if(box){box.hidden=!message;if(text)text.textContent=message}};
  const safeAuthMessage=(error,context)=>{
    const message=String(error?.message||'').toLowerCase();
    if(/already registered|already exists|email.*in use/.test(message))return 'An account with this email already exists. Please log in instead.';
    if(/invalid login credentials|invalid email or password/.test(message))return 'The email or password is incorrect. Please try again.';
    if(/password.*(weak|short|characters)/.test(message))return 'Choose a stronger password with at least 8 characters.';
    if(/invalid.*email|email.*invalid/.test(message))return 'Enter a valid college email address.';
    if(/database error saving new user/.test(message))return error.message;
    if(/rate limit|too many requests/.test(message))return 'Too many attempts. Wait a little and try again.';
    return context;
  };
  const withLoading=async(button,label,work,onError)=>{app.setLoading(button,true,label);try{return await work()}catch(error){if(onError)onError(error);else app.reportError(error,'The request could not be completed. Please try again.');return null}finally{app.setLoading(button,false)}};
  if(!client){app.toast('Authentication is temporarily unavailable. Reload the page to retry.','error');document.querySelectorAll('#login-submit,#signup-submit').forEach(button=>button.disabled=true);return}

  byId('login-form')?.addEventListener('submit',async event=>{
    event.preventDefault();setError('login-alert','');
    const email=value('login-email'),password=byId('login-password')?.value||'';
    if(!emailPattern.test(email)||!password){setError('login-alert','Enter a valid email and password.');return}
    await withLoading(byId('login-submit'),'Signing in…',async()=>{
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error){setError('login-alert',safeAuthMessage(error,'Could not sign you in. Please try again.'));return}
      location.replace('dashboard.html');
    });
  });

  byId('signup-form')?.addEventListener('submit',async event=>{
    event.preventDefault();setError('signup-alert','');
    const full_name=value('signup-name'),email=value('signup-email'),branch=byId('signup-branch')?.selectedOptions[0]?.textContent.trim()||'',semester=value('signup-semester'),password=byId('signup-password')?.value||'',confirmation=byId('signup-confirm-password')?.value||'';
    const phone=byId('signup-phone')?.value.trim()||'';
    if(full_name.length<2||!emailPattern.test(email)||!branch||!/^([1-8])$/.test(semester)||!password||!confirmation||!byId('signup-terms')?.checked){setError('signup-alert','Check your name, email, branch, semester, password, and accepted terms.');return}
    if(phone&&!/^\+?[0-9 ()-]{7,20}$/.test(phone)){setError('signup-alert','Enter a valid phone number.');return}
    if(password.length<8){setError('signup-alert','Use a password with at least 8 characters.');return}
    if(password!==confirmation){setError('signup-alert','The passwords do not match.');return}
    await withLoading(byId('signup-submit'),'Creating account…',async()=>{
      const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name,branch,semester},emailRedirectTo:new URL('login.html',location.href).href}});
      if(error){setError('signup-alert',safeAuthMessage(error,'Could not create your account. Please try again.'));return}
      if(!data.user?.id){setError('signup-alert','Could not finish creating your account. Please try again.');return}
      if(Array.isArray(data.user.identities)&&data.user.identities.length===0){setError('signup-alert','An account with this email already exists. Please log in instead.');return}
      const result=await app.database.ensureStudentProfile(data.user,{id:data.user.id,full_name,email,branch,semester});
      if(result.deferred){app.toast('Account created. Verify your email, then log in. Your student profile will be saved after confirmation.','success');return}
      app.toast('Account created. Welcome to CampusAI.','success');location.replace('dashboard.html');
    },error=>{const message=error?.cause?.message||error?.message||'Could not create your account. Please try again.';setError('signup-alert',message)});
  });

  byId('forgot-form')?.addEventListener('submit',async event=>{
    event.preventDefault();const email=value('forgot-email');if(!emailPattern.test(email)){app.toast('Enter a valid email address.','error');return}
    await withLoading(byId('forgot-submit'),'Sending…',async()=>{const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:new URL('login.html',location.href).href});if(error){app.toast(safeAuthMessage(error,'Could not send a reset email. Please try again.'),'error');return}app.toast('If an account exists for that address, a reset email is on its way.','success');const modal=byId('modal-forgot-password');if(modal)modal.hidden=true});
  });

  ['login-google','signup-google'].forEach(id=>byId(id)?.addEventListener('click',async()=>{try{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:new URL('dashboard.html',location.href).href}});if(error)throw error}catch(error){app.reportError(error,'Google sign-in could not be started. Check provider setup and try again.')}}));

  byId('profile-form')?.addEventListener('submit',async event=>{
    event.preventDefault();const user=app.session?.user;if(!user){app.toast('Your session expired. Please sign in again.','error');return}
    const branchSemester=value('profile-program').split(' · '),branch=branchSemester[0]||'',semester=(branchSemester.find(item=>/^(?:semester|year)\s/i.test(item))||'').replace(/^(?:semester|year)\s*/i,'');
    const newEmail=value('profile-email'),button=byId('profile-save');
    await withLoading(button,'Saving…',async()=>{
      if(newEmail&&newEmail!==user.email){const {error}=await client.auth.updateUser({email:newEmail});if(error){app.toast(safeAuthMessage(error,'Could not request an email change.'),'error');return}}
      const profile=await app.database.updateStudent(user.id,{full_name:value('profile-name'),email:user.email||newEmail,branch,semester});app.session.profile=profile;app.renderCurrentUser(user,profile);
      app.toast(newEmail!==user.email?'Profile saved. Check your inbox to confirm the email change.':'Profile updated.','success');
    });
  });

  const uploadButton=byId('profile-photo-upload');
  uploadButton?.addEventListener('click',async()=>{const file=byId('profile-photo')?.files?.[0],user=app.session?.user;if(!file||!user){app.toast('Choose a profile image first.','error');return}await withLoading(uploadButton,'Uploading…',async()=>{const profile=await app.database.uploadProfileImage(user.id,file);app.session.profile=profile;app.renderCurrentUser(user,profile);const image=byId('profile-image');if(image){image.src=profile.profile_image;image.hidden=false}app.toast('Profile photo updated.','success')})});

  document.addEventListener('click',async event=>{
    const logout=event.target.closest('[data-action="logout"],#logout-confirm');if(!logout)return;event.preventDefault();
    if(logout.id==='logout-confirm')logout.disabled=true;
    try{const {error}=await client.auth.signOut();if(error)throw error;location.replace(new URL('login.html',location.href).href)}catch(error){if(logout.id==='logout-confirm')logout.disabled=false;app.reportError(error,'Could not sign out. Please try again.')}
  });
})();
