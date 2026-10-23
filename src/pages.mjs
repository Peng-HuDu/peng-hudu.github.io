import {chronologicalProfile,sortEntries} from './chronology.mjs';
import {renderHome as oldHome, groupActivities} from './layout-base.mjs';
import {escapeHTML as h,safeURL,profileDefinitions,withOptionalSections} from './render-core.mjs';
export const pageDefs=[['home','Home','index.html'],['research','Research','research.html'],['publications','Publications','publications.html'],['events','Events','events.html'],['contact','Contact','contact.html']];
const eventList=(arr,title)=>{
 if(!arr.length)return '';
 const getYear=x=>Number((String(x.date||x.year).match(/[0-9]{4}/)||[])[0])||0;
 const sorted=sortEntries(arr);
 const groups=[]; for(const item of sorted){const year=getYear(item);let group=groups.at(-1);if(!group||group.year!==year){group={year,items:[]};groups.push(group);}group.items.push(item);}
 return `<div class="event-section"><h2>${title}</h2>${groups.map(group=>`<section class="event-year"><h3>${group.year||'Other'}</h3><ul class="recognition">${group.items.map(x=>`<li class="event-row">${x.date?`<time class="event-date" datetime="${h(x.date)}">${h(x.date.slice(5))}</time>`:'<span class="event-date event-date-pending">Date pending</span>'}<span class="event-location">${h(String(x.location||'').split(/[,，]/).map(s=>s.trim()).filter(Boolean).join(' · '))}</span><span class="event-title">${h(x.title)}</span></li>`).join('')}</ul></section>`).join('')}</div>`;
};
const extractSection=(html,id)=>{
 const marker=`id="${id}"`,at=html.indexOf(marker),start=at<0?-1:html.lastIndexOf('<section',at);if(start<0)return '';
 const tags=/<\/?section\b[^>]*>/g;tags.lastIndex= start;let depth=0,match;
 while((match=tags.exec(html))){if(match[0][1]==='/')depth--;else depth++;if(depth===0)return html.slice(start,tags.lastIndex);}
 return '';
};
export function renderPages(profile){
  profile=chronologicalProfile(withOptionalSections(profile));
  const full=oldHome(profile);
  const css=full.match(/<style>([\s\S]*?)<\/style>/)[1];
  const sections=Object.fromEntries(['home','research','publications','contact'].map(id=>{
    const section=extractSection(full,id); if(!section)throw new Error('Missing section '+id);return [id,section];
  }));
  const group=groupActivities(profile.honors||[]);
  const home=sections.home.replace(/<details class="compact"><summary>Honors &amp; Awards<\/summary>[\s\S]*?<\/details>/,'').replace(/<details class="compact"><summary>Talks &amp; Posters<\/summary>[\s\S]*?<\/details>/,'');
  const events=`<section class="section" id="events"><h2>Events</h2>${eventList(group.awards,'Honors & Awards')}${eventList(group.talks,'Talks & Posters')}${!group.awards.length&&!group.talks.length?'<p>Events will be listed here.</p>':''}</section>`;;
  const content={home,research:sections.research,publications:sections.publications,events,contact:sections.contact};
  const pubJS=full.match(/<script>\s*\(function\(\)[\s\S]*?<\/script>/)?.[0]||'';
  const nav=active=>pageDefs.map(([key,label,filename])=>`<a href="${filename}" ${key===active?'aria-current="page"':''}>${label}</a>`).join('');
  const result={};
  for(const [key,label,filename] of pageDefs){
    result[filename]=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="profile-revision" content="${h(profile.revision||'')}"><meta name="description" content="${h(profile.name)} — ${label}"><title>${h(label)} | ${h(profile.name)}</title><style>${css}\n.nav nav a[aria-current="page"]{font-weight:700;color:#173e60}.event-section{margin-top:18px}.event-section>h2{font-size:21px;border-left:0;padding-left:0;margin:32px 0 10px}.event-year{margin:0 0 27px}.event-year>h3{font-size:17px;font-weight:600;margin:0 0 3px;color:#687784}.event-year .recognition li.event-row{display:grid;grid-template-columns:88px minmax(140px,240px) minmax(0,1fr);gap:12px 20px;align-items:start;padding:14px 0;font-size:16px;text-align:left}.event-row>.event-date{font-variant-numeric:tabular-nums;white-space:nowrap;color:#607386}.event-date-pending{font-size:12px}.event-location{color:#607386;overflow-wrap:anywhere}.event-title{min-width:0;overflow-wrap:anywhere}@media(max-width:720px){.event-year .recognition li.event-row{grid-template-columns:82px minmax(0,1fr);gap:4px 12px}.event-row .event-date{grid-column:1;grid-row:1 / span 2}.event-row .event-location{grid-column:2;grid-row:1;font-size:14px}.event-row .event-title{grid-column:2;grid-row:2}}.section>h1{font-size:28px;color:#203e58}.header .brand{font-weight:600}@media(max-width:720px){.nav nav a{padding:0 4px;font-size:12px}.nav nav{flex-wrap:wrap;justify-content:flex-start;gap:8px 0}}\n</style></head><body><header class="header"><div class="wrap nav"><a class="brand" href="index.html">${h(profile.name)}</a><nav aria-label="Main navigation">${nav(key)}</nav></div></header><main class="wrap">${content[key]}<footer class="footer"><span>${h(profile.name)} &middot; ${h(profile.headline)}</span><span>Updated ${h(profile.updated)}</span></footer></main>${key==='publications'?pubJS:''}</body></html>`;
  }
  return result;
}
