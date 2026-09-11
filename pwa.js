(() => {
  'use strict';
  const status=document.getElementById('estadoApp');
  const help=document.getElementById('ayudaInstalar');
  const helpButton=document.getElementById('btnAyudaInstalar');
  const installButton=document.getElementById('btnInstalarApp');
  const updateButton=document.getElementById('btnActualizarApp');
  let readyOffline=false, registration=null, promptInstall=null, updating=false;
  const statusText=(text,ready=false,error=false)=>{
    status.textContent=text;status.dataset.ready=String(ready);status.dataset.error=String(error);
  };
  function refreshStatus(){
    if(!window.mantenedorIniciado){statusText('La vista previa no ha iniciado. Prueba el enlace en Safari o Chrome.');return;}
    if(readyOffline)statusText(navigator.onLine?'Lista para usar sin conexión':'Sin conexión · herramienta disponible',true);
    else statusText(navigator.onLine?'Preparando el uso sin conexión…':'Aún no está guardada para usar sin conexión.');
  }
  helpButton.onclick=()=>{help.hidden=!help.hidden;helpButton.setAttribute('aria-expanded',String(!help.hidden));};
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();promptInstall=event;installButton.hidden=false;
  });
  installButton.onclick=async()=>{
    if(!promptInstall)return;
    await promptInstall.prompt();await promptInstall.userChoice;
    promptInstall=null;installButton.hidden=true;
  };
  window.addEventListener('appinstalled',()=>{installButton.hidden=true;});
  updateButton.onclick=()=>{
    if(!registration?.waiting)return;
    if(!window.confirm('Guarda tu gráfica antes de actualizar. La página se reiniciará y se perderá el trabajo que no hayas descargado. ¿Actualizar ahora?'))return;
    updating=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  };
  async function checkCache(){
    const worker=navigator.serviceWorker.controller;
    if(!worker)return;
    const channel=new MessageChannel();
    const answer=await new Promise(resolve=>{
      const timer=setTimeout(()=>{channel.port1.close();resolve({ready:false});},5000);
      channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};
      worker.postMessage({type:'CACHE_STATUS'},[channel.port2]);
    });
    readyOffline=answer.ready===true;refreshStatus();
  }
  window.addEventListener('mantenedor-listo',refreshStatus);
  window.addEventListener('online',()=>{refreshStatus();if(registration){registration.update().catch(()=>{});checkCache();}});
  window.addEventListener('offline',refreshStatus);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&registration)checkCache();});
  if(location.protocol==='file:'){
    statusText('Archivo local: para instalar en teléfono abre el enlace web de la ayuda.');return;
  }
  if(!window.isSecureContext||!('serviceWorker' in navigator)){
    statusText('Este navegador permite el uso en línea, pero no la instalación sin conexión.',false,true);return;
  }
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(updating){location.reload();return;}
    updateButton.hidden=!registration?.waiting;
    checkCache();
  });
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async reg=>{
    registration=reg;
    const showUpdate=()=>{updateButton.hidden=!reg.waiting;};
    showUpdate();
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;
      worker?.addEventListener('statechange',()=>{
        if(worker.state==='installed'||worker.state==='activated')showUpdate();
        if(worker.state==='redundant'&&!readyOffline)statusText('No se pudo guardar la herramienta. Vuelve a abrir con conexión.',false,true);
      });
    });
    refreshStatus();
    await navigator.serviceWorker.ready;
    await checkCache();
  }).catch(()=>statusText('No se pudo guardar para usar sin conexión. Abre el enlace en Safari o Chrome y vuelve a intentar.',false,true));
})();
