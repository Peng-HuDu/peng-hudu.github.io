import {chronologicalProfile,sortEntries,homeSectionOrder} from './chronology.mjs';
/** Public academic layout. No embedded CV, CV link, or CV download. */
import {escapeHTML as h, safeURL, safePortrait, sortedPublications, normalizedDOI, profileDefinitions,withOptionalSections,publicationAuthorsHTML,publicationCitationHTML} from './render-core.mjs';
export const LAYOUT_VERSION = 'academic-20261023-2';
export function groupActivities(items = []) {
  const awards = [], talks = [];
  for (const x of items) (x.group==='awards'||(!x.group&&/award|scholarship|honou?r|prize/i.test(x.type)) || /award|scholarship|prize/i.test(x.title) ? awards : talks).push(x);
  return {awards, talks};
}
const css = `
/* Shared visual system for every public page. */
:root{--ink:#1f2328;--heading:#1f2328;--muted:#1f2328;--accent:#0070C0;--line:rgba(128,149,168,.22);--page-size:38px;--section-size:26px;--third-size:20px;--entry-size:var(--body-size);--body-size:17px}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:100px;overflow-y:scroll;scrollbar-gutter:stable}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;position:relative;isolation:isolate;background:#f8fafb;color:var(--ink);font:400 var(--body-size)/1.78 Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(105deg,rgba(255,255,255,.9),rgba(255,255,255,.7)),repeating-linear-gradient(105deg,transparent 0 78px,rgba(154,174,191,.1) 79px 97px,transparent 98px 152px)}
a{color:var(--accent);text-underline-offset:.18em}
a:hover{color:var(--accent);text-decoration:underline}
button,input,select{font:inherit}
input::placeholder{color:var(--ink);opacity:1}
button{cursor:pointer}
:focus-visible{outline:2px solid #5683a5;outline-offset:4px}
[hidden]{display:none!important}
.wrap{width:100%;max-width:1160px;margin:0 auto;padding:0 46px}
.skip{position:absolute;left:-9999px}
.skip:focus{left:16px;top:16px;z-index:10;background:white;padding:10px}
.header{flex:0 0 auto;position:sticky;top:0;z-index:5;background:rgba(250,252,253,.94);backdrop-filter:blur(10px)}
.nav{display:flex;align-items:center;justify-content:space-between;gap:22px;min-height:84px;border-bottom:1px solid var(--line)}
.brand{color:var(--heading);font-size:20px;font-weight:600;letter-spacing:-.02em;text-decoration:none;white-space:nowrap}
.nav nav{display:flex;flex-wrap:wrap;align-items:center;gap:6px 22px}
.nav nav a{padding:7px 0;text-decoration:none;font-size:15px;font-weight:600;color:var(--ink);border-bottom:2px solid transparent}
.nav nav a:hover{color:var(--ink)}
.nav nav a[aria-current]{color:var(--ink);font-weight:600;border-bottom-color:#87a7bf}
main.wrap{background:rgba(255,255,255,.62);padding-top:40px;min-height:0;flex:1;display:flex;flex-direction:column}
main.wrap>section{flex:0 0 auto}
h1,h2,h3,h4{color:var(--heading);line-height:1.32;font-weight:600}
h1,.page-title{font-size:var(--page-size);letter-spacing:-.025em}
h2{font-size:var(--section-size);letter-spacing:-.015em}
h3,h4{font-size:var(--entry-size)}
.section{padding:0 0 42px;border:0}
.section>.page-title{margin:0 0 32px;padding:0 0 14px;border-bottom:1px solid rgba(117,139,157,.32)}
.section p{margin:0 0 12px}
.intro{display:grid;grid-template-columns:minmax(0,1fr) 152px;column-gap:42px;align-items:start;padding:0 0 34px}
.intro>div{min-width:0}
.intro h1{margin:0 0 32px;padding:0 0 14px;border-bottom:1px solid rgba(117,139,157,.32)}
.intro .portrait{display:block;width:152px;height:auto;max-height:210px;object-fit:contain;object-position:top;justify-self:end;align-self:start;margin:3px 0 0;border-radius:3px}
.intro.no-portrait{display:block}
.field{font-size:var(--third-size);line-height:1.5;font-weight:600;color:var(--ink);margin:0 0 24px}
.bio{font-size:var(--body-size);line-height:1.85;max-width:880px}
.bio p{margin:0 0 15px}
.home-details{padding:0 0 30px}
.home-block{margin:0 0 34px}
.home-block>h2,.research-topic>h3,.event-section>h2{font-size:var(--section-size);line-height:1.35;font-weight:600;letter-spacing:-.015em;margin:0 0 20px;padding:0;border:0}
.history-item{display:grid;grid-template-columns:minmax(166px,23%) minmax(0,1fr);gap:4px 25px;align-items:start;padding:18px 0;border:0;margin:0}
.history-item .dates{grid-column:1;grid-row:1 / span 4;padding-top:0;font-size:var(--body-size);font-weight:400;line-height:1.7;color:var(--ink)}
.history-item strong,.history-item>p{grid-column:2}
.history-item strong{font-size:var(--entry-size);font-weight:600;line-height:1.7}
.history-item p{font-size:var(--body-size);line-height:1.7;margin:0;color:var(--ink)}
.dates,.muted{color:var(--muted);font-size:14px}
.links{display:flex;flex-wrap:wrap;gap:7px 22px;font-size:15px;margin-top:12px}
.links a{text-decoration:none}
.links a:hover{text-decoration:underline}
.research-content{width:100%}
.research-topic{padding:0 0 25px;margin:0 0 28px}
.research-topic>p{font-size:var(--body-size);line-height:1.85;max-width:1030px;margin:0 0 18px}
.research-work{padding:19px 0;border:0}
.research-work p{font-size:var(--body-size);line-height:1.85;margin:0}
.graphical-abstract{display:block;width:auto;height:auto;max-width:100%;max-height:360px;margin:0 auto 18px}
.academic-profiles{padding:0 0 12px;margin:0 0 16px;border:0}
.academic-profiles .links{margin:0}
.pub-tools{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:0 0 12px}
.pub-tools input[type=search]{flex:1;min-width:170px}
.pub-tools input:not([type=checkbox]),.pub-tools select{border:1px solid #d5dfe7;border-radius:4px;background:rgba(255,255,255,.85);padding:8px 11px;font-size:14px;color:var(--ink)}
.pub-tools label{font-size:13px;color:var(--ink)}
#pub-status{font-size:13px;margin:0 0 4px;color:var(--muted)}
.pubs,.pub-year-items{list-style:none;margin:0;padding:0}
.pub-year-group{display:block;margin:0 0 23px;padding:0;border:0}
.pub-year-group>.pub-year{font-size:var(--third-size);font-weight:600;line-height:1.4;letter-spacing:0;color:var(--ink);margin:0 0 8px;padding:8px 0 10px;border-bottom:1px solid var(--line)}
.pubs li.publication-item{display:block;padding:17px 0;border:0}
.publication-item h3{font-size:var(--body-size);font-weight:600;line-height:1.7;color:var(--ink);margin:0 0 7px}
.publication-item h3 a{color:var(--accent);text-decoration:none}
.publication-item h3 a:hover{color:var(--accent);text-decoration:underline}
.publication-item>p{font-size:var(--body-size);line-height:1.7;margin:3px 0;color:var(--ink)}
.publication-owner{text-decoration:underline;text-underline-offset:.16em;text-decoration-thickness:1px;font-weight:400}
.status-tag{display:inline-block;font-size:11px;font-weight:500;vertical-align:middle;line-height:1.5;margin-left:10px;padding:2px 7px;border-radius:3px;background:#edf3f7;color:var(--ink)}
.contact-record{display:grid;grid-template-columns:170px minmax(0,1fr);gap:8px 26px;padding:23px 0;border:0}
.contact-label{font-size:var(--body-size);line-height:1.7;font-weight:600;color:var(--ink)}
.contact-value{min-width:0;margin:0;font-size:var(--body-size);overflow-wrap:anywhere}
.contact-value p{margin:0 0 8px}
.contact-value p:last-child{margin-bottom:0}
.contact-value.links{margin:0;font-size:var(--body-size)}
.contact-value a{color:var(--accent)}
.event-section{margin:0 0 34px}
.event-section>h2{margin-top:26px}
.event-year{margin:0 0 23px}
.event-year>h3{font-size:var(--third-size);font-weight:600;line-height:1.4;letter-spacing:0;color:var(--ink);margin:0 0 8px;padding:8px 0 10px;border-bottom:1px solid var(--line)}
.recognition{list-style:none;margin:0;padding:0}
.event-year .recognition li.event-row{display:grid;grid-template-columns:70px minmax(100px,160px) minmax(0,1fr);gap:10px 16px;align-items:start;padding:14px 0;font-size:var(--body-size);line-height:1.7;text-align:left;border:0}
.event-date{font-size:var(--body-size);font-weight:400;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--ink);padding-top:0}
.event-date-pending{font-size:var(--body-size);white-space:normal}
.event-location{font-size:var(--body-size);color:var(--ink);overflow-wrap:anywhere}
.event-title{min-width:0;overflow-wrap:anywhere}
@supports(grid-template-columns:subgrid){
 .event-year .recognition{display:grid;grid-template-columns:70px fit-content(170px) minmax(0,1fr);column-gap:16px}
 .event-year .recognition li.event-row{grid-column:1 / -1;grid-template-columns:subgrid}
}
.footer{display:flex;justify-content:space-between;gap:16px;padding:25px 0 32px;margin-top:auto;flex:0 0 auto;border-top:1px solid var(--line);font-size:12px;color:var(--ink)}
.draft{padding:7px;text-align:center;font-size:12px;color:var(--ink);background:#edf3f7}
.compact{padding:12px 0;border-top:1px solid var(--line)}
summary{font-weight:600;cursor:pointer}
.details-content{padding-top:14px}
@media(max-width:720px){
 :root{--page-size:30px;--section-size:23px;--third-size:18px;--entry-size:var(--body-size);--body-size:16px}
 .wrap{padding-left:23px;padding-right:23px}
 .nav{min-height:92px;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px;padding-top:12px;padding-bottom:11px}
 .brand{font-size:19px}
 .nav nav{gap:3px 18px}
 .nav nav a{font-size:13px;padding:4px 0}
 main.wrap{padding-top:28px}
 .section>.page-title,.intro h1{padding-bottom:12px;margin-bottom:25px}
 .intro{grid-template-columns:minmax(0,1fr) 104px;gap:20px;padding-bottom:24px}
 .intro .portrait{width:104px;max-height:144px}
 .field{font-size:var(--third-size);margin-bottom:20px}
 .history-item{grid-template-columns:minmax(102px,29%) minmax(0,1fr);column-gap:16px;padding:15px 0}
 .history-item .dates{font-size:var(--body-size)}
 .home-block{margin-bottom:27px}
 .contact-record{grid-template-columns:100px minmax(0,1fr);gap:7px 15px;padding:20px 0}
 .contact-label{font-size:var(--body-size)}
 .links{font-size:14px;gap:7px 18px}
 .event-year .recognition{display:block}
 .event-year .recognition li.event-row{display:grid;grid-template-columns:66px minmax(0,1fr);gap:3px 12px;padding:13px 0}
 .event-row .event-date{grid-column:1;grid-row:1 / span 2}
 .event-row .event-location{grid-column:2;grid-row:1;font-size:var(--body-size)}
 .event-row .event-title{grid-column:2;grid-row:2}
 .footer{flex-direction:column;gap:2px;font-size:11px}
}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{body{background:white}body::before{display:none}.header,.pub-tools,.skip{display:none}.wrap{max-width:none;padding:0}.section{break-inside:auto}.publication-item,.history-item,.event-row{break-inside:avoid}}

`;const linksHTML = p => profileDefinitions().filter(([key]) => safeURL(p.links[key])).map(([key,label]) => `<a href="${h(safeURL(p.links[key]))}" target="_blank" rel="noopener noreferrer">${h(label)} &#8599;</a>`).join('');
const researchHTML=p=>{
 const work=x=>'<article class="research-work">'+(safePortrait(x.graphicalAbstract?.dataUrl)?'<img class="graphical-abstract" src="'+safePortrait(x.graphicalAbstract.dataUrl)+'" alt="'+h(x.graphicalAbstract.alt||'Graphical abstract')+'">':'')+'<p>'+h(x.description).replace(/\n/g,'<br>')+'</p></article>';
 const areas=p.research.map(a=>'<article class="research-topic"><h3>'+h(a.title)+'</h3>'+(a.description?'<p>'+h(a.description).replace(/\n/g,'<br>')+'</p>':'')+p.projects.filter(x=>x.researchArea===a.title).map(work).join('')+'</article>').join('');
 const extra=p.projects.filter(x=>!p.research.some(a=>a.title===x.researchArea));
 return '<section class="section" id="research"><h2>Research</h2><div class="research-content">'+areas+(extra.length?'<article class="research-topic">'+extra.map(work).join('')+'</article>':'')+'</div></section>';
};
const contactLinksHTML = p => (p.contactLinks||[]).filter(x=>x.label&&x.label.trim()&&safeURL(x.url)).map(x=>'<a href="'+h(safeURL(x.url))+'" target="_blank" rel="noopener noreferrer">'+h(x.label)+' &#8599;</a>').join('');
const activityHTML = items => `<ul class="recognition">${items.map(x=>`<li><time>${h(x.year)}</time><span>${h(x.title)}${/presentation|poster|talk/i.test(x.type)?`<small class="activity-type">${h(x.type)}</small>`:''}</span></li>`).join('')}</ul>`;
export function renderHome(p) {
  p=chronologicalProfile(withOptionalSections(p));
  const pubs = sortedPublications(p), groups = groupActivities(p.honors);
  const pubGroups = []; for (const item of pubs) { let group=pubGroups.at(-1); if(!group||String(group.year)!==String(item.year)){group={year:item.year,items:[]};pubGroups.push(group);} group.items.push(item); }
  const portrait = safePortrait(p.portrait?.dataUrl);

  const background=safePortrait(p.background?.dataUrl);
  const overlay=typeof p.background?.overlayOpacity==='number'?Math.max(0,Math.min(1,p.background.overlayOpacity)):0.88;
  const backgroundCSS=background?'body::before{background:linear-gradient(rgba(255,255,255,'+overlay+'),rgba(255,255,255,'+overlay+')),url("'+background+'") center / cover no-repeat}main.wrap{background:transparent}':'';

  const records = key => sortEntries(p[key]||[]).map(x=>`<div class="history-item"><span class="dates">${h(x.period)}</span><strong>${h(x.title)}</strong><p>${h(x.institution)}</p>${x.detail?`<p class="muted">${h(x.detail)}</p>`:''}</div>`).join('');
  const json = v => JSON.stringify(v).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="profile-revision" content="${h(p.revision||'')}"><meta name="layout-version" content="${LAYOUT_VERSION}"><meta name="description" content="${h(p.name)}, ${h(p.role)} at ${h(p.institution)}. ${h(String(p.headline).split(/[,，]/).map(s=>s.trim()).filter(Boolean).join(' · '))}."><title>${h(p.name)} | ${h(p.institutionShort)}</title>${p.draft?'<meta name="robots" content="noindex,nofollow">':''}<style>${css}${backgroundCSS}</style><script type="application/ld+json">${json({'@context':'https://schema.org','@type':'Person',name:p.name,jobTitle:p.role,affiliation:{'@type':'Organization',name:p.institution},sameAs:Object.values(p.links).filter(safeURL)})}</script></head><body><a class="skip" href="#home">Skip to content</a>${p.draft?'<div class="draft">DRAFT PREVIEW - Review before publishing</div>':''}<header class="header"><div class="wrap nav"><a class="brand" href="#home">${h(p.name)}</a><nav aria-label="Main navigation"><a href="#home">Home</a><a href="#research">Research</a><a href="#publications">Publications</a><a href="#contact">Contact</a></nav></div></header><main class="wrap">
<section id="home" aria-labelledby="name"><div class="intro${portrait?'':' no-portrait'}"><div><h1 id="name">${h(p.name)}</h1><p class="field">${h(String(p.headline).split(/[,，]/).map(s=>s.trim()).filter(Boolean).join(' · '))}</p><div class="bio">${p.bio.map(x=>`<p>${h(x)}</p>`).join('')}</div></div>${portrait?`<img class="portrait" src="${portrait}" alt="${h(p.portrait.alt)}" width="175">`:''}</div><div class="home-details">${homeSectionOrder(p).map(key=>key==='experience'?`<div class="home-block" aria-labelledby="career-title"><h2 id="career-title">Career</h2>${records(key)}</div>`:`<div class="home-block" aria-labelledby="education-title"><h2 id="education-title">Education</h2>${records(key)}</div>`).join('')}${groups.awards.length?`<details class="compact"><summary>Honors &amp; Awards</summary><div class="details-content">${activityHTML(groups.awards)}</div></details>`:''}${groups.talks.length?`<details class="compact"><summary>Talks &amp; Posters</summary><div class="details-content">${activityHTML(groups.talks)}</div></details>`:''}</div>
</section>
${researchHTML(p)}
<section class="section" id="publications"><h2>Publications</h2><div class="academic-profiles"><div class="links">${linksHTML(p)}</div></div>${pubs.length?`<div class="pub-tools"><input type="search" id="pub-search" aria-label="Search publications" placeholder="Search titles, authors, journals"><select id="pub-year" aria-label="Publication year"><option value="all">All years</option>${[...new Set(pubs.map(x=>x.year))].map(y=>`<option>${h(y)}</option>`).join('')}</select><label><input type="checkbox" id="pub-selected"> Selected works only</label></div><p class="muted" id="pub-status" aria-live="polite">${pubs.length} records</p><ol class="pubs">${pubGroups.map(group=>`<li class="pub-year-group"><h3 class="pub-year">${h(group.year)}</h3><ol class="pub-year-items">${group.items.map(x=>`<li class="publication-item" data-year="${h(x.year)}" data-selected="${x.selected?'true':'false'}" data-search="${h([x.title,x.authors,x.journal,x.year].join(' ').toLowerCase())}"><h3><a href="https://doi.org/${h(normalizedDOI(x.doi))}" target="_blank" rel="noopener noreferrer">${h(x.title)}</a>${x.selected?'<span class="status-tag">Selected work</span>':''}</h3><p>${publicationAuthorsHTML(x.authors)}</p><p>${publicationCitationHTML(x)}</p></li>`).join('')}</ol></li>`).join('')}</ol>`:`<div class="notice"><p>For the publication record and current citation metrics, please visit my academic profiles.</p><div class="links">${['scholar','orcid','scopus'].filter(k=>safeURL(p.links[k])).map(k=>`<a href="${h(safeURL(p.links[k]))}" target="_blank" rel="noopener noreferrer">${h({scholar:'Google Scholar',orcid:'ORCID',scopus:'Scopus'}[k])} &#8599;</a>`).join('')}</div></div>`}${p.publicationSummary.showCount && p.publicationSummary.reportedCount!==null?`<p class="muted">${h(p.publicationSummary.reportedCount)} papers reported as of ${h(p.publicationSummary.countAsOf)}. ${h(p.publicationSummary.countSource)}</p>`:''}</section>
<section class="section" id="contact"><h2>Contact</h2><div class="contact-record"><div class="contact-label">Affiliations</div><div class="contact-value">${(p.affiliations||[]).map(x=>'<p>'+h(x.name)+'</p>').join('')}</div></div><div class="contact-record"><div class="contact-label">Email</div><div class="contact-value">${(p.emails||[]).filter(x=>x.email).map(x=>'<p><a href="mailto:'+h(x.email)+'">'+h(x.email)+'</a></p>').join('')}</div></div><div class="contact-record"><div class="contact-label">Collaborations</div><div class="contact-value links collaborator-links">${contactLinksHTML(p)}</div></div></section><footer class="footer"><span>${h(p.name)} - ${h(String(p.headline).split(/[,，]/).map(s=>s.trim()).filter(Boolean).join(' · '))}</span><span>Updated ${h(p.updated)}</span></footer></main><script>
(function(){var links=document.querySelectorAll('.nav nav a');function mark(){var hash=location.hash||'#home';links.forEach(function(a){if(a.getAttribute('href')===hash)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}window.addEventListener('hashchange',mark);mark();var search=document.getElementById('pub-search');if(!search)return;var year=document.getElementById('pub-year'),selected=document.getElementById('pub-selected');function filter(){var n=0;document.querySelectorAll('.publication-item').forEach(function(e){var match=e.dataset.search.includes(search.value.trim().toLowerCase())&&(year.value==='all'||e.dataset.year===year.value)&&(!selected.checked||e.dataset.selected==='true');e.hidden=!match;if(match)n++;});document.querySelectorAll('.pub-year-group').forEach(function(g){g.hidden=!g.querySelector('.publication-item:not([hidden])');});document.getElementById('pub-status').textContent=n+' matching record'+(n===1?'':'s');}search.addEventListener('input',filter);year.addEventListener('change',filter);selected.addEventListener('change',filter);})();
</script></body></html>`;
}
