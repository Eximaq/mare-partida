'use strict';
const tabs=[document.getElementById('login-tab'),document.getElementById('register-tab')];
const panels=[document.getElementById('login-pane'),document.getElementById('register-pane')];
function activateTab(index){
  tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;panels[i].hidden=i!==index;});
}
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>activateTab(index));
  tab.addEventListener('keydown',event=>{
    if(event.key!=='ArrowRight'&&event.key!=='ArrowLeft'&&event.key!=='Home'&&event.key!=='End')return;
    event.preventDefault();let next=event.key==='Home'?0:event.key==='End'?1:(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length;
    activateTab(next);tabs[next].focus();
  });
});
document.querySelectorAll('.toggle-visibility').forEach(button=>{
  button.addEventListener('click',()=>{
    const field=button.previousElementSibling;const reveal=field.type==='password';
    field.type=reveal?'text':'password';button.setAttribute('aria-pressed',String(reveal));button.setAttribute('aria-label',reveal?'Ocultar senha':'Mostrar senha');
  });
});
function showNotice(){
  const status=document.getElementById('status');
  status.querySelector('strong').textContent='CONTAS ONLINE AINDA NÃO ATIVADAS';
  status.querySelector('small').textContent='Nenhuma senha foi enviada ou armazenada. Utilize Jogar Demonstração até conectarmos o Supabase.';
  status.classList.add('notice-active');
}
document.querySelectorAll('form').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();showNotice();}));
