(()=>{
  const bind=()=>{
    const button=document.getElementById('voice-btn');
    const speak=document.getElementById('speak-toggle');
    if(button&&!button.dataset.voiceBound){button.dataset.voiceBound='true';button.addEventListener('click',()=>window.CampusAI.toast('Voice Assistant Coming Soon.'))}
    if(speak&&!speak.dataset.voiceBound){speak.dataset.voiceBound='true';speak.addEventListener('click',()=>window.CampusAI.toast('Voice Assistant Coming Soon.'))}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
