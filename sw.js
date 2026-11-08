// Maqueta 3D: guarda la app en el dispositivo para que abra sin conexion
const V='maqueta3d-v1',FONTS='maqueta3d-fuentes';
const SHELL=['./','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./favicon.png'];
// una respuesta que llego por redireccion no sirve para abrir la pagina: se guarda una copia limpia
const clean=res=>res.redirected?res.blob().then(b=>new Response(b,{status:res.status,statusText:res.statusText,headers:res.headers})):Promise.resolve(res);
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>fetch(u,{cache:'reload'}).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return clean(r).then(x=>c.put(u,x));})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==FONTS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){
    if(r.mode==='navigate'){
      // la pagina: primero la red (asi llegan las versiones nuevas); sin conexion, o si tarda mucho, la copia guardada
      const net=fetch(r);
      e.waitUntil(net.then(res=>{if(res.ok)return clean(res.clone()).then(x=>caches.open(V).then(c=>c.put('./',x)));}).catch(()=>{}));
      e.respondWith(new Promise(done=>{let ok=false;const fin=x=>{if(!ok&&x){ok=true;done(x);}};
        const t=setTimeout(()=>caches.match('./').then(fin),4000);
        net.then(res=>{clearTimeout(t);if(res.ok)fin(res);else caches.match('./').then(h=>fin(h||res));}).catch(()=>caches.match('./').then(h=>{clearTimeout(t);fin(h||Response.error());}));}));
      return;}
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();e.waitUntil(caches.open(V).then(c=>c.put(r,cp)));}return res;})));return;}
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    // tipografias: se guardan la primera vez; sin conexion (o con conexion muy lenta) se usan las del sistema
    const css=u.hostname==='fonts.googleapis.com';
    const alt=()=>css?new Response('/* sin conexion: fuentes del sistema */',{headers:{'Content-Type':'text/css'}}):Response.error();
    e.respondWith(caches.open(FONTS).then(c=>c.match(r).then(hit=>{if(hit)return hit;
      const net=fetch(r).then(res=>{if(res.ok||res.type==='opaque'){try{e.waitUntil(c.put(r,res.clone()).catch(()=>{}));}catch(_){}}return res;});
      e.waitUntil(net.catch(()=>{}));
      return Promise.race([net,new Promise(ok=>setTimeout(ok,css?3000:20000))]).then(x=>x||alt()).catch(alt);})));}
});
