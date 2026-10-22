import {renderCV as renderBaseCV, escapeHTML as h} from './render-core.mjs';
import {groupActivities} from './layout-base.mjs';
export function renderPrivateCV(profile, css) {
  const p=structuredClone(profile), groups=groupActivities(p.honors||[]);
  p.honors=[];
  let html=renderBaseCV(p,css);
  const items=(title,list)=>list.length?`<h2>${title}</h2>${list.map(x=>`<div class="cv-entry"><p><strong>${h(x.year)}</strong> &middot; ${h(x.title)}</p></div>`).join('')}`:'';
  const sections=items('Honors &amp; awards',groups.awards)+items('Talks &amp; posters',groups.talks);
  html=html.replace('<h2>Publications</h2>',sections+'<h2>Publications</h2>');
  html=html.replace('<head>','<head><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">');
  html=html.replace('<title>'+h(p.name)+' | Curriculum vitae</title>','<title>'+h(p.name.replace(/[^a-z0-9 -]/gi,'').replaceAll(' ','_'))+'_CV</title>');
  return html.replace('</style>','\n@page{size:A4;margin:16mm 17mm;}@media print{.cv-only .cv-sheet{padding:0!important;margin:0!important;max-width:none!important;box-shadow:none!important}.cv-heading{break-inside:avoid}h2,h3{break-after:avoid}.cv-entry,li{break-inside:avoid}body{background:#fff!important}}\n</style>');
}
export function exportCVPDF(profile,css) {
  const popup=window.open('about:blank','_blank');
  if(!popup)throw new Error('Please allow pop-ups for this site, then export the CV again.');
  popup.opener=null;
  popup.document.open();popup.document.write(renderPrivateCV(profile,css));popup.document.close();
  let done=false;
  const print=async()=>{if(done)return;done=true;try{await popup.document.fonts.ready;await Promise.all(Array.from(popup.document.images).map(img=>img.decode().catch(()=>{})));if(!popup.closed){popup.focus();popup.print();}}catch{/* Keep the manual print button available. */}};
  if(popup.document.readyState==='complete')setTimeout(print,150);else popup.addEventListener('load',print,{once:true});
  return popup;
}
