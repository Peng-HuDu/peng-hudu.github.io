import {chronologicalProfile,sortEntries,homeSectionOrder} from './chronology.mjs';
/** Public academic layout. No embedded CV, CV link, or CV download. */
import {escapeHTML as h, safeURL, safePortrait, sortedPublications, normalizedDOI, profileDefinitions,withOptionalSections,publicationAuthorsHTML,publicationCitationHTML} from './render-core.mjs';
export const LAYOUT_VERSION = 'academic-20261022-1';
export function groupActivities(items = []) {
  const awards = [], talks = [];
  for (const x of items) (x.group==='awards'||(!x.group&&/award|scholarship|honou?r|prize/i.test(x.type)) || /award|scholarship|prize/i.test(x.title) ? awards : talks).push(x);
  return {awards, talks};
}
const css = `
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:100px}body{margin:0;background:#fff;color:#30353b;font:16px/1.75 Arial,Helvetica,sans-serif}a{color:#224f79;text-underline-offset:4px}a:hover{color:#102f4d}button,input,select{font:inherit}button{cursor:pointer}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid #275c8a;outline-offset:4px}[hidden]{display:none!important}.wrap{max-width:1080px;margin:auto;padding:0 34px}.skip{position:absolute;left:-9999px}.skip:focus{left:16px;top:16px;background:#fff;padding:10px;z-index:9}.header{background:#fff;position:sticky;top:0;z-index:5}.nav{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:85px;border-bottom:2px solid #274d6a}.brand{font-size:21px;font-weight:600;text-decoration:none;color:#233e55;white-space:nowrap}.nav nav{display:flex;gap:0;align-items:center}.nav nav a{font-size:15px;text-decoration:none;padding:1px 18px;border-right:1px solid #d6dde4;color:#354b5c}.nav nav a:last-child{padding-right:0;border:0}.nav nav a[aria-current="location"]{font-weight:700;color:#173e60} .intro{display:block;padding:45px 0 28px;max-width:900px}.intro>div{display:block}.portrait{display:block;width:150px;height:auto;max-height:210px;object-fit:contain;object-position:top;margin:0 0 22px;border-radius:0;box-shadow:none}.intro.no-portrait{display:block}.kicker{font-size:13px;color:#637381;margin:0 0 9px;letter-spacing:.015em}h1{font-size:34px;line-height:1.2;font-weight:600;margin:0 0 10px;color:#203e58}.position{font-size:16px;margin:0 0 10px}.field{font-size:16px;font-weight:600;margin:9px 0 15px;color:#344b5e}.bio p{margin:0 0 10px}.links{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:15px;font-size:14px}.links a{text-decoration:none}.links a:hover{text-decoration:underline}.section{border-top:1px solid #dce2e8;padding:34px 0 42px}.section h2,.home-details h2{font-size:24px;line-height:1.35;font-weight:600;margin:0 0 22px;color:#203e58}.section h3{font-size:18px;line-height:1.45;margin:0 0 9px;color:#304d66}.section p{margin:0 0 12px}.muted{color:#626e79;font-size:14px}.area-grid{display:block;max-width:930px}.area{padding:0;margin:0 0 25px}.area:last-child{margin-bottom:0}.area h3{margin-bottom:6px}.area p{font-size:15px}.label{display:none}.home-details{padding-bottom:30px}.home-details h2{font-size:21px;margin-bottom:14px}.home-details h3{font-size:16px;margin:0 0 13px;color:#304d66}.home-details .compact{margin-top:7px}.home-details .compact+details{border-top:0}.subsection{margin-top:30px}.subsection>h3{margin-bottom:14px}.subsection .area-grid>article{margin-bottom:19px}.subsection .area-grid>article h3{font-size:16px}.compact{border-top:1px solid #e1e6eb;border-bottom:1px solid #e1e6eb;padding:12px 0;margin-top:25px}.compact+details{border-top:0;margin-top:0}summary{cursor:pointer;font-size:15px;font-weight:600;color:#345570}.details-content{padding:17px 0 0}.project{margin-bottom:18px}.project h4{font-size:15px;margin:0 0 3px}.project p{font-size:14px;color:#5d6974} .methods{display:block}.methods>div{margin:0 0 14px}.methods dt{font-size:14px;font-weight:600}.methods dd{margin:3px 0 0;color:#626e79;font-size:14px}.pub-tools{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:18px 0 10px}.pub-tools input[type=search]{flex:1;min-width:180px}.pub-tools input,.pub-tools select{border:1px solid #c8d1da;background:#fff;padding:8px}.pub-tools label{font-size:13px}.pubs{padding:0;list-style:none}.pubs li{padding:17px 0;border-bottom:1px solid #e1e6eb}.pubs h3{font-size:17px}.pubs p{font-size:14px;margin:4px 0}.pub-year{font-size:13px;font-weight:600;color:#626e79}.status-tag{font-size:12px;margin-left:14px;color:#476a87}.notice{padding:0;background:none;border:0;border-radius:0}.notice p:last-child{margin-bottom:0} .columns{display:block;max-width:900px}.columns>div{margin:0 0 26px}.history-item{margin:0 0 17px}.history-item strong{display:block;font-size:15px;font-weight:600}.history-item p{font-size:14px;margin:2px 0}.dates{font-size:13px;color:#687784}.recognition{list-style:none;margin:0;padding:0} .recognition li{display:grid;grid-template-columns:85px 1fr;gap:15px;padding:8px 0;font-size:14px}.recognition time{color:#687784}.activity-type{display:block;color:#687784;font-size:12px}.footer{padding:22px 0 34px;color:#70808d;font-size:12px;border-top:1px solid #dce2e8;display:flex;justify-content:space-between;gap:18px}.draft{padding:7px 15px;text-align:center;background:#f2f5f8;color:#526779;font-size:12px}
@media(max-width:720px){.wrap{padding:0 21px}.nav{min-height:92px;align-items:flex-start;gap:10px;flex-direction:column;padding:14px 21px}.brand{font-size:19px}.nav nav{width:100%;justify-content:space-between}.nav nav a{font-size:13px;padding:0 12px}.nav nav a:first-child{padding-left:0}.intro{gap:23px;grid-template-columns:105px 1fr;padding:30px 0 23px}.portrait{width:105px;max-height:145px}h1{font-size:28px}.kicker{font-size:11px}.position,.field{font-size:14px}.bio{margin-top:20px}.columns,.methods{grid-template-columns:1fr;gap:5px}.section{padding:28px 0}.section h2{font-size:22px}.home-details h2{font-size:19px}.footer{flex-direction:column;gap:3px}.recognition li{grid-template-columns:68px 1fr;gap:10px}.no-portrait .bio,.no-portrait .links{margin-left:0}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media print{.header,.pub-tools,.skip{display:none}.wrap{max-width:none}.section{break-inside:auto}.area,.history-item,.pubs li{break-inside:avoid}.intro{padding-top:0}}

/* Typography and hierarchy refresh */
body{font-size:18px;line-height:1.82;color:#27323b}
.wrap{max-width:1120px;padding-left:48px;padding-right:48px}
.nav{min-height:94px}
.brand{font-size:23px}
.nav nav a{font-size:16px;padding-left:20px;padding-right:20px}
.intro{max-width:980px;padding-top:58px;padding-bottom:38px}
.portrait{width:165px;max-height:220px;margin-bottom:25px}
h1{font-size:46px;line-height:1.15;letter-spacing:-.025em;margin-bottom:15px}
.kicker{font-size:14px;letter-spacing:.04em}
.position{font-size:18px;margin-bottom:12px}
.field{font-size:20px;margin:12px 0 20px}
.bio{max-width:890px;font-size:18px;line-height:1.85}
.bio p{margin-bottom:15px}
.section{padding:48px 0 56px}
.section h2,.home-details h2{font-size:30px;line-height:1.25;padding-left:16px;border-left:4px solid #274d6a;margin-bottom:27px}
.section h3{font-size:21px;line-height:1.4}
.area-grid{max-width:980px}
.area{margin-bottom:34px}
.area h3{font-size:22px;margin-bottom:8px}
.area p{font-size:17px;line-height:1.8;max-width:900px}
.home-details{max-width:960px;padding:0 0 38px}
.home-details .home-block{margin:0 0 42px}
.home-details .home-block:last-of-type{margin-bottom:28px}
.home-details h2{font-size:29px;margin-bottom:23px}
.home-details h3{font-size:20px;margin:0 0 14px}
.history-item{margin-bottom:23px}
.history-item strong{font-size:18px}
.history-item p{font-size:16px}
.dates{font-size:15px}
.recognition li{font-size:16px;padding:12px 0}
.recognition time{font-size:15px}
.pubs li{padding:22px 0}
.pubs h3{font-size:20px;line-height:1.45}
.pubs p{font-size:16px}
.pub-year{font-size:15px}
.footer{font-size:13px;padding-top:28px;padding-bottom:40px}
@media(max-width:720px){
 body{font-size:16px;line-height:1.75}
 .wrap{padding-left:22px;padding-right:22px}
 .nav{min-height:88px}
 .brand{font-size:20px}
 .nav nav a{font-size:13px;padding-left:9px;padding-right:9px}
 .intro{padding-top:36px;padding-bottom:28px}
 .portrait{width:125px;max-height:165px;margin-bottom:20px}
 h1{font-size:35px}
 .position{font-size:16px}
 .field{font-size:18px}
 .bio{font-size:16px}
 .section{padding:36px 0 42px}
 .section h2,.home-details h2{font-size:25px;margin-bottom:21px;padding-left:12px}
 .section h3,.area h3{font-size:19px}
 .area{margin-bottom:27px}
 .area p{font-size:16px}
 .home-details .home-block{margin-bottom:33px}
 .home-details h3{font-size:18px}
 .history-item strong{font-size:16px}
 .history-item p{font-size:15px}
 .dates{font-size:14px}
 .pubs h3{font-size:18px}
 .pubs p{font-size:15px}
}

/* Education and career records: one date-led row per entry */
.history-item{display:grid;grid-template-columns:minmax(175px,24%) minmax(0,1fr);column-gap:32px;row-gap:3px;align-items:start;padding:19px 0;margin:0;border-bottom:1px solid #e1e6eb}
.history-item .dates{grid-column:1;grid-row:1 / span 4;padding-top:2px}
.history-item strong,.history-item>p{grid-column:2}
.history-item strong{font-size:18px;line-height:1.5}
.history-item p{font-size:16px;line-height:1.65}
@media(max-width:720px){.history-item{grid-template-columns:minmax(105px,30%) minmax(0,1fr);column-gap:16px;padding:15px 0}.history-item strong{font-size:16px}.history-item p{font-size:15px}}

/* Single-column sections with one table-like row per record */
.section .area{display:grid;grid-template-columns:minmax(190px,27%) minmax(0,1fr);column-gap:38px;row-gap:8px;padding:20px 0;border-bottom:1px solid #e1e6eb}
.section .area h3{grid-column:1;grid-row:1;margin:0}
.section .area>p{grid-column:2;grid-row:1;margin:0}
.section .area .project{grid-column:1 / -1;display:grid;grid-template-columns:minmax(190px,27%) minmax(0,1fr);column-gap:38px;padding-top:15px;margin:0;border-top:1px solid #edf0f3}
.section .area .project h4{grid-column:1;font-size:16px;margin:0}
.section .area .project p{grid-column:2;margin:0}
.goal-row{display:grid;grid-template-columns:minmax(190px,27%) minmax(0,1fr);gap:8px 38px;padding:18px 0;border-bottom:1px solid #e1e6eb}
.goal-row h3{grid-column:1;grid-row:1;margin:0}.goal-row p{grid-column:2;grid-row:1;margin:0}
.methods>div{display:grid;grid-template-columns:minmax(190px,27%) minmax(0,1fr);gap:8px 38px;padding:14px 0;border-bottom:1px solid #e1e6eb;margin:0}
.methods dt{grid-column:1}.methods dd{grid-column:2;margin:0}
.pubs li{display:grid;grid-template-columns:minmax(100px,18%) minmax(0,1fr);column-gap:30px;row-gap:5px;align-items:start}
.pubs .pub-year{grid-column:1;grid-row:1 / span 5;padding-top:3px}
.pubs li h3,.pubs li>p,.pubs li>.links{grid-column:2}
.pubs li h3{margin:0}.pubs li>p{margin:0}.pubs li>.links{margin:4px 0 0}
.contact-record{display:grid;grid-template-columns:minmax(160px,22%) minmax(0,1fr);gap:8px 32px;padding:17px 0;border-bottom:1px solid #e1e6eb}
.contact-label{font-weight:600;color:#304d66}.contact-value{margin:0}.contact-value.links{margin:0;gap:12px 20px}
@media(max-width:720px){
 .section .area,.section .area .project,.goal-row{grid-template-columns:minmax(105px,30%) minmax(0,1fr);column-gap:16px}
 .section .area h3,.goal-row h3{font-size:16px}
 .section .area>p,.section .area .project p,.goal-row p{font-size:15px}
 .methods>div{grid-template-columns:minmax(105px,30%) minmax(0,1fr);column-gap:16px}
 .pubs li{grid-template-columns:minmax(54px,16%) minmax(0,1fr);column-gap:14px}.pubs h3{font-size:17px}
 .contact-record{grid-template-columns:minmax(100px,30%) minmax(0,1fr);column-gap:14px}
}
/* Group publications by year, like merged year cells in a table */
.pubs{list-style:none;margin:0;padding:0}
.pubs>.pub-year-group{display:grid;grid-template-columns:minmax(100px,18%) minmax(0,1fr);column-gap:30px;align-items:stretch;padding:0;border-bottom:2px solid #cbd4dc}
.pubs>.pub-year-group>.pub-year{grid-column:1;grid-row:1;align-self:center;font-size:20px;font-weight:700;color:#405d76}
.pubs .pub-year-items{grid-column:2;list-style:none;margin:0;padding:0}
.pubs li.publication-item{display:block;padding:19px 0;border-bottom:1px solid #e1e6eb}
.pubs li.publication-item:last-child{border-bottom:0}
.pubs li.publication-item h3{font-size:20px}
.pubs li.publication-item>p{font-size:16px}
.pubs li.publication-item>.links{margin:4px 0 0}
@media(max-width:720px){
 .pubs>.pub-year-group{grid-template-columns:minmax(54px,16%) minmax(0,1fr);column-gap:14px}
 .pubs>.pub-year-group>.pub-year{font-size:17px}
 .pubs li.publication-item{padding:15px 0}
 .pubs li.publication-item h3{font-size:17px}
 .pubs li.publication-item>p{font-size:15px}
}


/* Research uses a broad editorial column: areas first, then grouped projects */
.research-content{max-width:1060px}
.research-subheading{font-size:22px!important;margin:34px 0 8px!important;padding:20px 0 0!important;border-left:0!important;border-top:1px solid #dce2e8}
.research-areas .area{display:block;grid-template-columns:none;padding:17px 0;margin:0;border-bottom:1px solid #e1e6eb}
.research-areas .area h4{font-size:22px;line-height:1.4;color:#304d66;margin:0 0 6px}
.research-areas .area p{font-size:17px;line-height:1.8;max-width:980px;margin:0}
.research-project-group{margin:18px 0 25px}
.research-project-group>h4{font-size:18px;line-height:1.45;color:#304d66;margin:0 0 5px}
.research-project-group .project{display:block;padding:15px 0;margin:0;border-bottom:1px solid #e1e6eb}
.research-project-group .project h5{font-size:17px;line-height:1.45;color:#304d66;margin:0 0 4px}
.research-project-group .project p{font-size:16px;line-height:1.75;color:#505e69;margin:0;max-width:980px}
.goal-card,.method-card{padding:15px 0;border-bottom:1px solid #e1e6eb}
.goal-card h4,.method-card h4{font-size:17px;margin:0 0 4px;color:#304d66}
.goal-card p,.method-card p{font-size:16px;margin:0;max-width:980px}
.method-list{display:block}
@media(max-width:720px){
 .research-subheading{font-size:20px!important;margin-top:26px!important}
 .research-areas .area h4{font-size:19px}
 .research-areas .area p,.research-project-group .project p,.goal-card p,.method-card p{font-size:15px}
 .research-project-group>h4{font-size:17px}
 .research-project-group .project h5,.goal-card h4,.method-card h4{font-size:16px}
}

/* Keep the portrait aligned with the name at the top right */
.intro{display:grid;grid-template-columns:minmax(0,1fr) 165px;column-gap:42px;align-items:start;max-width:1080px}
.intro>div{grid-column:1;grid-row:1;min-width:0}
.intro .portrait{grid-column:2;grid-row:1;justify-self:end;align-self:start;width:165px;max-height:220px;margin:4px 0 0}
.intro.no-portrait{display:block}
@media(max-width:720px){
 .intro{display:grid;grid-template-columns:minmax(0,1fr) 108px;column-gap:18px;align-items:start}
 .intro .portrait{grid-column:2;grid-row:1;width:108px;max-height:145px;margin:3px 0 0}
 .intro.no-portrait{display:block}
}

.research-content{max-width:1080px}
.research-topic{padding:0 0 34px;margin:0 0 30px;border-bottom:1px solid #dce2e8}
.research-topic>h3{font-size:25px;line-height:1.38;margin:0 0 12px;color:#203e58}
.research-topic>p{max-width:1030px;font-size:18px;line-height:1.82;margin:0 0 14px}
.research-topic .selected-work{margin:22px 0 0;padding:0 0 0 22px;border-left:3px solid #dce2e8}
.research-topic .selected-work h4{font-size:18px;line-height:1.45;margin:0 0 8px;color:#304d66}
.research-topic .selected-work article{padding:11px 0;border-top:1px solid #edf0f3}
.research-topic .selected-work h5{font-size:17px;line-height:1.45;margin:0 0 4px;color:#304d66}
.research-topic .selected-work p{font-size:16px;line-height:1.75;margin:0;color:#505e69}
.research-additional{padding:26px 0 30px;border-bottom:1px solid #dce2e8}
.research-additional>h3{font-size:23px;margin:0 0 14px;color:#203e58}
.research-additional article{padding:13px 0;border-top:1px solid #edf0f3}
.research-additional h4{font-size:18px;margin:0 0 4px;color:#304d66}
.research-additional p{font-size:17px;margin:0;max-width:1030px}
.academic-profiles{padding:0 0 28px;margin:-5px 0 28px;border-bottom:1px solid #dce2e8}
.academic-profiles h3{font-size:19px;margin:0 0 8px}
.academic-profiles .links{margin:0;font-size:16px;gap:8px 24px}
@media(max-width:720px){.research-topic{padding-bottom:25px;margin-bottom:23px}.research-topic>h3{font-size:21px}.research-topic>p{font-size:16px}.research-topic .selected-work{padding-left:15px}.research-topic .selected-work h4{font-size:17px}.research-topic .selected-work h5,.research-additional h4{font-size:16px}.research-topic .selected-work p,.research-additional p{font-size:15px}.research-additional>h3{font-size:20px}.academic-profiles .links{font-size:14px}}

/* Align the main heading frame on every standalone page */
.section>h2{box-sizing:border-box;margin:0 0 27px!important;padding-left:16px!important;border-left:4px solid #274d6a!important;font-size:30px!important;line-height:1.25!important}
@media(max-width:720px){.section>h2{margin-bottom:21px!important;padding-left:12px!important;font-size:25px!important}}
.pub-year-group{display:block!important;grid-template-columns:none!important}.pub-year-group>.pub-year{display:block!important;font-size:21px!important;font-weight:600;padding:22px 0 8px!important;border:0!important}.pub-year-items{margin-left:0!important;padding-left:0!important}.publication-owner{text-decoration:underline;text-underline-offset:.16em;text-decoration-thickness:1px;font-weight:400}.publication-item{padding:16px 0!important}.publication-item h3 a{color:inherit;text-decoration:none}.publication-item h3 a:hover{text-decoration:underline}.research-work{padding:22px 0;border-top:1px solid #e1e6eb}.research-work p{font-size:18px;line-height:1.8;margin:0}.graphical-abstract{display:block;max-width:100%;max-height:360px;width:auto;height:auto;margin:0 auto 18px}
`;
const linksHTML = p => profileDefinitions().filter(([key]) => safeURL(p.links[key])).map(([key,label]) => `<a href="${h(safeURL(p.links[key]))}" target="_blank" rel="noopener noreferrer">${h(label)} &#8599;</a>`).join('');
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
  const records = key => sortEntries(p[key]||[]).map(x=>`<div class="history-item"><span class="dates">${h(x.period)}</span><strong>${h(x.title)}</strong><p>${h(x.institution)}</p>${x.detail?`<p class="muted">${h(x.detail)}</p>`:''}</div>`).join('');
  const json = v => JSON.stringify(v).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="profile-revision" content="${h(p.revision||'')}"><meta name="layout-version" content="${LAYOUT_VERSION}"><meta name="description" content="${h(p.name)}, ${h(p.role)} at ${h(p.institution)}. ${h(String(p.headline).split(/[,，]/).map(s=>s.trim()).filter(Boolean).join(' · '))}."><title>${h(p.name)} | ${h(p.institutionShort)}</title>${p.draft?'<meta name="robots" content="noindex,nofollow">':''}<style>${css}</style><script type="application/ld+json">${json({'@context':'https://schema.org','@type':'Person',name:p.name,jobTitle:p.role,affiliation:{'@type':'Organization',name:p.institution},sameAs:Object.values(p.links).filter(safeURL)})}</script></head><body><a class="skip" href="#home">Skip to content</a>${p.draft?'<div class="draft">DRAFT PREVIEW - Review before publishing</div>':''}<header class="header"><div class="wrap nav"><a class="brand" href="#home">${h(p.name)}</a><nav aria-label="Main navigation"><a href="#home">Home</a><a href="#research">Research</a><a href="#publications">Publications</a><a href="#contact">Contact</a></nav></div></header><main class="wrap">
<section id="home" aria-labelledby="name"><div class="intro${portrait?'':' no-portrait'}"><div><h1 id="name">${h(p.name)}</h1><p class="field">${h(String(p.headline).split(/[,，]/).map(s=>s.trim()).filter(Boolean).join(' · '))}</p><div class="bio">${p.bio.map(x=>`<p>${h(x)}</p>`).join('')}</div></div>${portrait?`<img class="portrait" src="${portrait}" alt="${h(p.portrait.alt)}" width="175">`:''}</div><div class="home-details">${homeSectionOrder(p).map(key=>key==='experience'?`<div class="home-block" aria-labelledby="career-title"><h2 id="career-title">Career</h2>${records(key)}</div>`:`<div class="home-block" aria-labelledby="education-title"><h2 id="education-title">Education</h2>${records(key)}</div>`).join('')}${groups.awards.length?`<details class="compact"><summary>Honors &amp; Awards</summary><div class="details-content">${activityHTML(groups.awards)}</div></details>`:''}${groups.talks.length?`<details class="compact"><summary>Talks &amp; Posters</summary><div class="details-content">${activityHTML(groups.talks)}</div></details>`:''}</div>
</section>
${researchHTML(p)}
<section class="section" id="publications"><h2>Publications</h2><div class="academic-profiles"><div class="links">${linksHTML(p)}</div></div>${pubs.length?`<div class="pub-tools"><input type="search" id="pub-search" aria-label="Search publications" placeholder="Search titles, authors, journals"><select id="pub-year" aria-label="Publication year"><option value="all">All years</option>${[...new Set(pubs.map(x=>x.year))].map(y=>`<option>${h(y)}</option>`).join('')}</select><label><input type="checkbox" id="pub-selected"> Selected works only</label></div><p class="muted" id="pub-status" aria-live="polite">${pubs.length} records</p><ol class="pubs">${pubGroups.map(group=>`<li class="pub-year-group"><h3 class="pub-year">${h(group.year)}</h3><ol class="pub-year-items">${group.items.map(x=>`<li class="publication-item" data-year="${h(x.year)}" data-selected="${x.selected?'true':'false'}" data-search="${h([x.title,x.authors,x.journal,x.year].join(' ').toLowerCase())}"><h3><a href="https://doi.org/${h(normalizedDOI(x.doi))}" target="_blank" rel="noopener noreferrer">${h(x.title)}</a>${x.selected?'<span class="status-tag">Selected work</span>':''}</h3><p>${publicationAuthorsHTML(x.authors)}</p><p>${publicationCitationHTML(x)}</p></li>`).join('')}</ol></li>`).join('')}</ol>`:`<div class="notice"><p>For the publication record and current citation metrics, please visit my academic profiles.</p><div class="links">${['scholar','orcid','scopus'].filter(k=>safeURL(p.links[k])).map(k=>`<a href="${h(safeURL(p.links[k]))}" target="_blank" rel="noopener noreferrer">${h({scholar:'Google Scholar',orcid:'ORCID',scopus:'Scopus'}[k])} &#8599;</a>`).join('')}</div></div>`}${p.publicationSummary.showCount && p.publicationSummary.reportedCount!==null?`<p class="muted">${h(p.publicationSummary.reportedCount)} papers reported as of ${h(p.publicationSummary.countAsOf)}. ${h(p.publicationSummary.countSource)}</p>`:''}</section>
<section class="section" id="contact"><h2>Contact</h2><div class="contact-record"><div class="contact-label">Affiliations</div><div class="contact-value">${(p.affiliations||[]).map(x=>'<p>'+h(x.name)+'</p>').join('')}</div></div><div class="contact-record"><div class="contact-label">Email</div><div class="contact-value">${(p.emails||[]).filter(x=>x.email).map(x=>'<p><a href="mailto:'+h(x.email)+'">'+h(x.email)+'</a></p>').join('')}</div></div><div class="contact-record"><div class="contact-label">Collaborations</div><div class="contact-value links collaborator-links">${contactLinksHTML(p)}</div></div></section><footer class="footer"><span>${h(p.name)} &middot; ${h(String(p.headline).split(/[,，]/).map(s=>s.trim()).filter(Boolean).join(' · '))}</span><span>Updated ${h(p.updated)}</span></footer></main><script>
(function(){var links=document.querySelectorAll('.nav nav a');function mark(){var hash=location.hash||'#home';links.forEach(function(a){if(a.getAttribute('href')===hash)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}window.addEventListener('hashchange',mark);mark();var search=document.getElementById('pub-search');if(!search)return;var year=document.getElementById('pub-year'),selected=document.getElementById('pub-selected');function filter(){var n=0;document.querySelectorAll('.publication-item').forEach(function(e){var match=e.dataset.search.includes(search.value.trim().toLowerCase())&&(year.value==='all'||e.dataset.year===year.value)&&(!selected.checked||e.dataset.selected==='true');e.hidden=!match;if(match)n++;});document.querySelectorAll('.pub-year-group').forEach(function(g){g.hidden=!g.querySelector('.publication-item:not([hidden])');});document.getElementById('pub-status').textContent=n+' matching record'+(n===1?'':'s');}search.addEventListener('input',filter);year.addEventListener('change',filter);selected.addEventListener('change',filter);})();
</script></body></html>`;
}
