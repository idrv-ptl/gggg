(()=>{
  window.CampusAI=window.CampusAI||{};
  window.CampusAI.chat={
    init(){
      const form=document.getElementById('chat-form'),input=document.getElementById('chat-input'),messages=document.getElementById('chat-messages'),typing=document.getElementById('typing-indicator'),send=document.getElementById('send-btn'),welcome=document.getElementById('chat-welcome');
      if(!form||!input||!messages||form.dataset.chatBound)return;
      form.dataset.chatBound='true';
      const add=(text,role)=>{const tpl=document.getElementById(role==='user'?'tpl-message-user':'tpl-message-bot');if(!tpl)return null;const node=tpl.content.firstElementChild.cloneNode(true);node.querySelector('.message__bubble').textContent=text;messages.append(node);const body=document.getElementById('chat-body');if(body)body.scrollTop=body.scrollHeight;return node};
      const sendMessage=async text=>{
        const message=(text||input.value).trim();if(!message)return;
        add(message,'user');input.value='';send.disabled=true;if(welcome)welcome.hidden=true;if(typing)typing.hidden=false;
        try{const reply=await window.CampusAI.assistantApi.reply(message);if(typing)typing.hidden=true;add(reply,'bot')}
        catch(error){if(typing)typing.hidden=true;window.CampusAI.reportError(error,'The assistant is temporarily unavailable.')}
        finally{send.disabled=!input.value.trim()}
        const history=document.getElementById('history-list');if(history){const item=document.createElement('li');item.className='history-item';const button=document.createElement('button');button.type='button';button.className='history-item__btn';button.textContent=message;item.append(button);history.prepend(item)}
      };
      form.addEventListener('submit',event=>{event.preventDefault();void sendMessage()});
      input.addEventListener('input',()=>{send.disabled=!input.value.trim()});
      document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>void sendMessage(button.dataset.prompt)));
      document.getElementById('new-chat-btn')?.addEventListener('click',()=>{messages.replaceChildren();if(welcome)welcome.hidden=false;input.focus()});
      document.getElementById('clear-chat-confirm')?.addEventListener('click',()=>{messages.replaceChildren();if(welcome)welcome.hidden=false;const modal=document.getElementById('modal-clear-chat');if(modal)modal.hidden=true});
      document.getElementById('history-search')?.addEventListener('input',event=>{const query=event.target.value.toLowerCase();document.querySelectorAll('#history-list .history-item').forEach(item=>{item.hidden=!item.textContent.toLowerCase().includes(query)})});
    }
  };
})();
