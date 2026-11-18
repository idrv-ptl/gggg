(()=>{
  const config=window.CampusAIConfig;
  if(!window.supabase?.createClient){window.CampusAI.supabaseError=new Error('Supabase client library failed to load.');return}
  if(!config?.supabaseUrl||!config?.supabasePublishableKey){window.CampusAI.supabaseError=new Error('Supabase configuration is incomplete.');return}
  window.CampusAI.supabase=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
})();
