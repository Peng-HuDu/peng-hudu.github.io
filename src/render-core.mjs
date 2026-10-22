import {journalAbbreviation,plainTitle} from './bibliography.mjs';
import {DATE_SECTIONS,parseDate,sortEntries,chronologicalProfile,homeSectionOrder} from './chronology.mjs';
/** Pure HTML renderers shared by the offline editor and the static build. */
export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function safeURL(value = '') {
  if (!value) return '';
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}
export function safePortrait(value = '') {
  return typeof value === 'string' && value.length <= 2000000 && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : '';
}
export function withOptionalSections(value) {
  const p = typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  for (const key of ['skills', 'projects', 'honors', 'contactLinks']) if (p[key] === undefined) p[key] = [];
  p.projects = p.projects.map(x => ({...x, researchArea:x.researchArea ?? ''}));
  p.contactLinks = p.contactLinks.map(x => ({...x, label:x.label ?? '', url:x.url ?? ''}));
  if (p.portrait === undefined) p.portrait = {dataUrl:'', alt:'', source:''};
  if (p.contactNote === undefined) p.contactNote = '';

  p.research=(p.research||[]).map(x=>{const {label,...rest}=x;return {...rest,title:(x.title||'').trim()};});
  p.projects=(p.projects||[]).map(x=>{const {label,title,...rest}=x;return {...rest,description:[title,x.description].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join('\n\n'),researchArea:(x.researchArea||'').trim(),graphicalAbstract:x.graphicalAbstract||{dataUrl:'',alt:''}};});
  p.honors=(p.honors||[]).flatMap(x=>{const years=String(x.year||'').match(/\b\d{4}\b/g)||[];return years.length>1?years.map(year=>({...x,year})):x;}).map(x=>{const {type,...rest}=x;return {...rest,group:x.group||(/award|scholarship|honou?r|prize/i.test(type||'')||/award|scholarship|prize/i.test(x.title)?'awards':'talks')};});
  p.affiliations=p.affiliations??[{department:p.department||'',institution:p.institution||''}];
  p.emails=p.emails??(p.email?[{email:p.email}]:[]);
  const primary=sortEntries(p.affiliations)[0];if(primary){if(primary.department)p.department=primary.department;if(primary.institution)p.institution=primary.institution;}
  if(p.emails.length)p.email=sortEntries(p.emails)[0].email||'';else p.email='';
  p.publications=(p.publications||[]).map(x=>{const {status,url,...rest}=x;return {...rest,title:plainTitle(x.title),journal:journalAbbreviation(x.journal),authors:normalizeAuthors(x.authors),doi:normalizedDOI(x.doi).toLowerCase(),volume:x.volume||'',pages:x.pages||''};});
  return p;
}
export function normalizeAuthors(value=''){
 return String(value).includes(' and ')?String(value).split(/\s+and\s+/i).map(s=>{const a=s.trim().split(/,\s*/);return a.length===2?a[1]+' '+a[0]:s.trim();}).join(', '):String(value).trim();
}
export function normalizedDOI(value = '') {
  return String(value).trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
}
export function validateProfile(p, release = false) {
  const errors = [];
  if (!p || typeof p !== 'object' || Array.isArray(p)) return ['Profile must be a JSON object.'];
  p=withOptionalSections(p);
  if (p.schemaVersion !== 1) errors.push('Unsupported schemaVersion. Expected 1.');
  for (const key of ['name','role','department','institution','institutionShort','headline','tagline','updated']) {
    if (typeof p[key] !== 'string' || !p[key].trim()) errors.push(`${key} must be a nonempty string.`);
  }
  if (typeof p.draft !== 'boolean') errors.push('draft must be true or false.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.updated || '')) errors.push('updated must be YYYY-MM-DD.');
  for (const key of ['bio','research','goals','experience','education','publications']) {
    if (!Array.isArray(p[key])) errors.push(`${key} must be an array.`);
  }
  if (Array.isArray(p.bio) && p.bio.some(x => typeof x !== 'string')) errors.push('Every biography paragraph must be text.');
  for (const [key, fields] of Object.entries({research:['title','description'],goals:['title','description'],experience:['period','title','institution','detail'],education:['period','title','institution','detail']})) {
    for (const [i, entry] of (Array.isArray(p[key]) ? p[key] : []).entries()) {
      if (!entry || fields.some(f => typeof entry[f] !== 'string')) errors.push(`${key}[${i}] has missing or non-text fields.`);
    }
  }
  if (!p.links || typeof p.links !== 'object' || Array.isArray(p.links)) errors.push('links must be an object.');
  else {
    for (const [key, value] of Object.entries(p.links)) if (typeof value !== 'string' || (value && !safeURL(value))) errors.push(`links.${key} must be blank or an https URL.`);
    if (p.links.scholar && safeURL(p.links.scholar)) {
      const u = new URL(p.links.scholar);
      if (!/^scholar\.google\.[a-z.]+$/.test(u.hostname) || !u.searchParams.get('user')) errors.push('Use your Google Scholar profile URL containing user=, not the Scholar homepage.');
    }
    if (p.links.orcid && safeURL(p.links.orcid)) {
      const u = new URL(p.links.orcid); const id = u.pathname.replace(/^\/|\/$/g, '');
      if (u.hostname !== 'orcid.org' || !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id)) errors.push('Use an ORCID profile URL in the form https://orcid.org/0000-0000-0000-0000.');
      else {
        const s = id.replaceAll('-', ''); let total = 0;
        for (const ch of s.slice(0,15)) total = (total + Number(ch)) * 2;
        const result = (12 - total % 11) % 11; const check = result === 10 ? 'X' : String(result);
        if (check !== s[15]) errors.push('The ORCID iD check digit is invalid. Check the copied URL.');
      }
    }
  }
  if (typeof p.email !== 'string' || (p.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(p.email))) errors.push('email must be blank or a valid email address.');
  const summary = p.publicationSummary;
  if (!summary || !Array.isArray(summary.journals) || summary.journals.some(x => typeof x !== 'string')) errors.push('publicationSummary.journals must be a text array.');
  else {
    if (typeof summary.showCount !== 'boolean') errors.push('publicationSummary.showCount must be true or false.');
    if (summary.reportedCount !== null && (!Number.isInteger(summary.reportedCount) || summary.reportedCount < 0)) errors.push('reportedCount must be a nonnegative integer or null.');
  }
  const seen = new Set();
  for (const [i, pub] of (Array.isArray(p.publications) ? p.publications : []).entries()) {
    if (!pub || ['title','authors','journal'].some(k => typeof pub[k] !== 'string' || !pub[k].trim())) { errors.push(`Publication ${i + 1} needs title, authors, and journal.`); continue; }
    if (!Number.isInteger(pub.year) || pub.year < 1900 || pub.year > 2100) errors.push(`Publication ${i + 1}: year must be a number between 1900 and 2100.`);
    if (!pub.doi) errors.push('论文 '+(i+1)+'：请填写 DOI。');
    for (const k of ['doi','volume','pages']) if (typeof pub[k] !== 'string') errors.push(`Publication ${i + 1}: ${k} must be text (or an empty string).`);
    if (pub.doi) {
      const d = normalizedDOI(pub.doi);
      if (!/^10\.\d{4,9}\/\S+$/i.test(d)) errors.push(`Publication ${i + 1}: malformed DOI.`);
      if (seen.has(d.toLowerCase())) errors.push(`Publication ${i + 1}: duplicate DOI.`);
      seen.add(d.toLowerCase());
    }
    if (pub.url && !safeURL(pub.url)) errors.push(`Publication ${i + 1}: URL must use https.`);
    if (typeof pub.selected !== 'boolean') errors.push(`Publication ${i + 1}: selected must be true or false.`);
  }
  for (const [key, fields] of Object.entries({skills:['title','tools'], projects:['description','researchArea'], honors:['year','title','group']})) {
    if (p[key] !== undefined && !Array.isArray(p[key])) errors.push(`${key} must be an array.`);
    else for (const [i, entry] of (p[key] || []).entries()) {
      if (!entry || fields.some(f => typeof entry[f] !== 'string')) errors.push(`${key}[${i}] has missing or non-text fields.`);
    }
  }
  if (p.contactNote !== undefined && typeof p.contactNote !== 'string') errors.push('contactNote must be text.');
  if (p.contactLinks !== undefined && !Array.isArray(p.contactLinks)) errors.push('contactLinks must be an array.');
  else for (const [i, link] of (p.contactLinks || []).entries()) if (!link || typeof link.label !== 'string' || typeof link.url !== 'string' || (link.url && !safeURL(link.url))) errors.push(`contactLinks[${i}] needs a text label and a blank or https URL.`);
  if (p.portrait !== undefined) {
    if (!p.portrait || typeof p.portrait !== 'object' || typeof p.portrait.dataUrl !== 'string' || typeof p.portrait.alt !== 'string' || (p.portrait.dataUrl && !safePortrait(p.portrait.dataUrl))) errors.push('portrait must contain a blank or embedded JPEG, PNG, or WebP image and text alt.');
  }
  if (p.links?.scopus && safeURL(p.links.scopus)) {
    const url = new URL(p.links.scopus);
    if (!['scopus.com','www.scopus.com'].includes(url.hostname) || !/^\d+$/.test(url.searchParams.get('authorId') || '')) errors.push('Use a Scopus author profile URL with a numeric authorId.');
  }
  if (p.presentation !== undefined) {
    const d = p.presentation;
    if (!d || typeof d !== 'object' || ['monogram','researchIntro','perspectiveTitle'].some(k => typeof d[k] !== 'string') || !Array.isArray(d.steps) || d.steps.some(x => !x || typeof x.title !== 'string' || typeof x.description !== 'string')) errors.push('presentation needs text fields monogram, researchIntro, perspectiveTitle, and a steps array with title and description.');
  }
  const dateLabels={experience:'职业经历',education:'教育经历',research:'研究领域',projects:'研究工作',goals:'当前研究方向',skills:'研究方法',honors:'学术活动',publications:'论文',contactLinks:'合作',affiliations:'机构',emails:'邮箱'};
  for(const key of DATE_SECTIONS)for(const [i,item] of (Array.isArray(p[key])?p[key]:[]).entries()){
    if(!item||item.startDate===undefined||item.startDate==='')continue;
    if(parseDate(item.startDate)===null){errors.push(dateLabels[key]+'第'+(i+1)+'条：排序时间请填写有效的 YYYY、YYYY-MM 或 YYYY-MM-DD。');continue;}
    const year=String(item.year??'').match(/\b\d{4}\b/)?.[0];
    if(['publications','honors'].includes(key)&&year&&item.startDate.trim().slice(0,4)!==year)errors.push(dateLabels[key]+'第'+(i+1)+'条：排序日期的年份须与条目年份一致。');
  }
  for(const [i,x] of (p.projects||[]).entries())if(x.graphicalAbstract?.dataUrl&&!safePortrait(x.graphicalAbstract.dataUrl))errors.push('研究工作 '+(i+1)+'：图形摘要格式无效。');
  for(const [i,x] of (p.emails||[]).entries())if(x.email&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(x.email))errors.push('邮箱 '+(i+1)+'：格式无效。');
  if (release && p.draft) errors.push('Release blocked: the profile is still a draft. Review the content and set draft to false.');
  return errors;
}
export function sortedPublications(p) { return sortEntries(p.publications); }
export function bibtex(p) {
  const tex = value => String(value || '').replace(/\\/g, '\\textbackslash{}').replace(/[{}]/g, c => '\\'+c).replace(/[&%#_]/g, c => '\\'+c).replace(/\$/g, '\\$');
  return sortedPublications(p).map((x,i) => {
    const key = `du${x.year}_${i+1}`; const type = 'article';
    const fields = {title:`{${tex(x.title)}}`,author:tex(normalizeAuthors(x.authors).split(/,\s*/).join(' and ')),journal:tex(x.journal),year:x.year};
    if(x.volume)fields.volume=tex(x.volume);if(x.pages)fields.pages=tex(x.pages);
    if (x.doi) fields.doi = normalizedDOI(x.doi);
    if (safeURL(x.url)) fields.url = x.url;

    return `@${type}{${key},\n${Object.entries(fields).map(([k,v]) => `  ${k} = {${v}}`).join(',\n')}\n}`;
  }).join('\n\n') + '\n';
}
export function profileDefinitions() {
  return [
    ['scholar','Google Scholar','Publications & citation metrics'],
    ['orcid','ORCID','Persistent researcher identity'],
    ['scopus','Scopus','Author profile & indexed publications'],
    ['github','GitHub','Code & research resources'],
    ['institution','Institutional profile','University record']
  ];
}

/** Shared publication typography; display-only, source author names remain unchanged. */
export function publicationAuthorsHTML(authors=''){
  return String(authors).split(/,\s*/).map(name=>{
    const identity=name.replace(/[^A-Za-z]/g,'').toLowerCase();
    return ['penghudu','phdu'].includes(identity)?'<u class="publication-owner">Peng-Hu Du</u>':escapeHTML(name.trim());
  }).join(', ');
}
export function publicationCitationHTML(pub){
  return '<strong><em>'+escapeHTML(pub.journal)+'</em></strong>'+
    (pub.volume?' '+escapeHTML(pub.volume):'')+
    (pub.pages?', '+escapeHTML(pub.pages):'')+' ('+escapeHTML(pub.year)+').';
}

export function cvBody(p) {
  p=chronologicalProfile(withOptionalSections(p));
  const h = escapeHTML;
  const records = key => p[key].map(x => `<div class="cv-entry"><h3>${h(x.title)}</h3><p>${h(x.institution)} &middot; ${h(x.period)}</p>${x.detail?`<p class="cv-muted">${h(x.detail)}</p>`:''}</div>`).join('');
  const links = profileDefinitions().filter(([key]) => safeURL(p.links[key])).map(([key,label])=>`<a href="${h(safeURL(p.links[key]))}" target="_blank" rel="noopener noreferrer">${h(label)}</a>`).join(' &middot; ');
  const image = safePortrait(p.portrait?.dataUrl);
  return `<article class="cv-sheet">
  ${p.draft?`<div class="cv-draft">DRAFT CV &mdash; Review before sharing.${p.publications.length?'':' Individual publication records have not yet been imported.'}</div>`:''}
  <div class="cv-heading"><div><h1>${h(p.name)}</h1><p>${h(p.role)} &middot; ${h(p.department)}<br>${h(p.institution)}</p>${p.email?`<p><a href="mailto:${h(p.email)}">${h(p.email)}</a></p>`:''}${links?`<p>${links}</p>`:''}</div>${image?`<img class="cv-portrait" src="${image}" alt="${h(p.portrait.alt)}" width="82" height="105">`:''}</div>
  <h2>Research profile</h2>${p.bio.map(x=>`<p>${h(x)}</p>`).join('')}
  ${homeSectionOrder(p).map(key=>`<h2>${key==='experience'?'Career':'Education'}</h2>${records(key)}`).join('')}
  <h2>Research</h2>${p.research.map(x=>`<div class="cv-entry"><h3>${h(x.title)}</h3><p>${h(x.description)}</p></div>`).join('')}
  ${(p.skills||[]).length?`<h2>Research skills</h2><div class="cv-skill-list">${p.skills.map(x=>`<div class="cv-entry"><h3>${h(x.title)}</h3><p>${h(x.tools)}</p></div>`).join('')}</div>`:''}
  ${(p.projects||[]).length?`<h2>Representative research</h2>${p.projects.map(x=>`<div class="cv-entry"><p>${h(x.description)}</p></div>`).join('')}`:''}
  ${(p.honors||[]).length?`<h2>Honors, awards &amp; presentations</h2>${p.honors.map(x=>`<div class="cv-entry"><p><strong>${h(x.year)}</strong> &middot; ${h(x.title)}</p></div>`).join('')}`:''}
  ${p.goals.length?`<h2>Planned research directions</h2>${p.goals.map(x=>`<div class="cv-entry"><h3>${h(x.title)}</h3><p>${h(x.description)}</p></div>`).join('')}`:''}
  <h2>Publications</h2>${p.publications.length?`<ol>${sortedPublications(p).map(x=>`<li>${publicationAuthorsHTML(x.authors)}. <strong>${h(x.title)}</strong>. ${publicationCitationHTML(x)}${!!x.status && x.status!=='published'?` [${h(x.status)}]`:''}${x.doi?` <a href="https://doi.org/${h(normalizedDOI(x.doi))}">${h(normalizedDOI(x.doi))}</a>`:''}</li>`).join('')}</ol>`:(safeURL(p.links.scholar)?`<p>Publication record and current citation metrics: <a href="${h(safeURL(p.links.scholar))}" target="_blank" rel="noopener noreferrer">Google Scholar</a>.</p>${p.draft?'<p class="cv-muted">Individual publication records have not yet been imported into this CV.</p>':''}`:'<p class="cv-muted">Individual publication records have not yet been added.</p>')}
  ${p.publicationSummary.showCount && p.publicationSummary.reportedCount!==null?`<p class="cv-muted">Reported total: ${h(p.publicationSummary.reportedCount)} papers; as of ${h(p.publicationSummary.countAsOf)}. ${h(p.publicationSummary.countSource)}</p>`:''}
  <p class="cv-muted">Last content update: ${h(p.updated)}.</p></article>`;
}
export function renderCV(p, css) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="profile-revision" content="${escapeHTML(p.revision || '')}"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(p.name)} | Curriculum vitae</title>${p.draft?'<meta name="robots" content="noindex,nofollow">':''}<style>${css}</style></head><body class="cv-only"><div class="cv-actions"><span>Curriculum vitae &middot; ${escapeHTML(p.name)}</span><button onclick="window.print()">Print / Save PDF</button></div>${cvBody(p)}</body></html>`;
}
/** Remove private/source-only metadata before committing public data. */
export function publicProfile(input) {
  const allowed = ['schemaVersion','draft','updated','name','role','department','institution','institutionShort','headline','tagline','bio','email','links','research','goals','experience','education','publicationSummary','publications','presentation','projects','skills','honors','contactLinks','affiliations','emails','portrait','revision'];
  const p = Object.fromEntries(allowed.filter(k => input[k] !== undefined).map(k => [k, structuredClone(input[k])]));
  if (p.portrait) p.portrait = {dataUrl:p.portrait.dataUrl, alt:p.portrait.alt};
  if (p.publicationSummary && !p.publicationSummary.showCount) {
    p.publicationSummary.reportedCount = null; p.publicationSummary.countAsOf = ''; p.publicationSummary.countSource = '';
  }
  return chronologicalProfile(withOptionalSections(p));
}
