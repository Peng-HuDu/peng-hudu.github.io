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
  return p;
}
export function normalizedDOI(value = '') {
  return String(value).trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
}
export function validateProfile(p, release = false) {
  const errors = [];
  if (!p || typeof p !== 'object' || Array.isArray(p)) return ['Profile must be a JSON object.'];
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
  for (const [key, fields] of Object.entries({research:['title','label','description'],goals:['title','description'],experience:['period','title','institution','detail'],education:['period','title','institution','detail']})) {
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
    if (!['published','accepted','preprint'].includes(pub.status)) errors.push(`Publication ${i + 1}: choose published, accepted, or preprint.`);
    for (const k of ['doi','url']) if (typeof pub[k] !== 'string') errors.push(`Publication ${i + 1}: ${k} must be text (or an empty string).`);
    if (pub.doi) {
      const d = normalizedDOI(pub.doi);
      if (!/^10\.\d{4,9}\/\S+$/i.test(d)) errors.push(`Publication ${i + 1}: malformed DOI.`);
      if (seen.has(d.toLowerCase())) errors.push(`Publication ${i + 1}: duplicate DOI.`);
      seen.add(d.toLowerCase());
    }
    if (pub.url && !safeURL(pub.url)) errors.push(`Publication ${i + 1}: URL must use https.`);
    if (typeof pub.selected !== 'boolean') errors.push(`Publication ${i + 1}: selected must be true or false.`);
  }
  for (const [key, fields] of Object.entries({skills:['title','tools'], projects:['title','label','description','researchArea'], honors:['year','title','type']})) {
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
  if (release && p.draft) errors.push('Release blocked: the profile is still a draft. Review the content and set draft to false.');
  return errors;
}
export function sortedPublications(p) { return [...p.publications].sort((a,b) => b.year - a.year || a.title.localeCompare(b.title)); }
export function bibtex(p) {
  const tex = value => String(value || '').replace(/\\/g, '\\textbackslash{}').replace(/[{}]/g, c => '\\'+c).replace(/[&%#_]/g, c => '\\'+c).replace(/\$/g, '\\$');
  return sortedPublications(p).map((x,i) => {
    const key = `du${x.year}_${i+1}`; const type = x.status === 'preprint' ? 'misc' : 'article';
    const fields = {title:`{${tex(x.title)}}`,author:tex(x.authors),journal:tex(x.journal),year:x.year};
    if (x.doi) fields.doi = normalizedDOI(x.doi);
    if (safeURL(x.url)) fields.url = x.url;
    if (x.status !== 'published') fields.note = x.status;
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
export function cvBody(p) {
  const h = escapeHTML;
  const records = key => p[key].map(x => `<div class="cv-entry"><h3>${h(x.title)}</h3><p>${h(x.institution)} &middot; ${h(x.period)}</p>${x.detail?`<p class="cv-muted">${h(x.detail)}</p>`:''}</div>`).join('');
  const links = profileDefinitions().filter(([key]) => safeURL(p.links[key])).map(([key,label])=>`<a href="${h(safeURL(p.links[key]))}" target="_blank" rel="noopener noreferrer">${h(label)}</a>`).join(' &middot; ');
  const image = safePortrait(p.portrait?.dataUrl);
  return `<article class="cv-sheet">
  ${p.draft?`<div class="cv-draft">DRAFT CV &mdash; Review before sharing.${p.publications.length?'':' Individual publication records have not yet been imported.'}</div>`:''}
  <div class="cv-heading"><div><h1>${h(p.name)}</h1><p>${h(p.role)} &middot; ${h(p.department)}<br>${h(p.institution)}</p>${p.email?`<p><a href="mailto:${h(p.email)}">${h(p.email)}</a></p>`:''}${links?`<p>${links}</p>`:''}</div>${image?`<img class="cv-portrait" src="${image}" alt="${h(p.portrait.alt)}" width="82" height="105">`:''}</div>
  <h2>Research profile</h2>${p.bio.map(x=>`<p>${h(x)}</p>`).join('')}
  <h2>Appointment</h2>${records('experience')}<h2>Education</h2>${records('education')}
  <h2>Research expertise</h2>${p.research.map(x=>`<div class="cv-entry"><h3>${h(x.title)}</h3><p>${h(x.description)}</p><p class="cv-muted">${h(x.label)}</p></div>`).join('')}
  ${(p.skills||[]).length?`<h2>Research skills</h2><div class="cv-skill-list">${p.skills.map(x=>`<div class="cv-entry"><h3>${h(x.title)}</h3><p>${h(x.tools)}</p></div>`).join('')}</div>`:''}
  ${(p.projects||[]).length?`<h2>Doctoral research projects</h2>${p.projects.map(x=>`<div class="cv-entry"><h3>${h(x.title)}</h3><p>${h(x.description)}</p></div>`).join('')}`:''}
  ${(p.honors||[]).length?`<h2>Honors, awards &amp; presentations</h2>${p.honors.map(x=>`<div class="cv-entry"><p><strong>${h(x.year)}</strong> &middot; ${h(x.title)}</p><p class="cv-muted">${h(x.type)}</p></div>`).join('')}`:''}
  ${p.goals.length?`<h2>Planned research directions</h2>${p.goals.map(x=>`<div class="cv-entry"><h3>${h(x.title)}</h3><p>${h(x.description)}</p></div>`).join('')}`:''}
  <h2>Publications</h2>${p.publications.length?`<ol>${sortedPublications(p).map(x=>`<li>${h(x.authors)} (${h(x.year)}). <strong>${h(x.title)}</strong>. <em>${h(x.journal)}</em>.${x.status!=='published'?` [${h(x.status)}]`:''}${x.doi?` <a href="https://doi.org/${h(normalizedDOI(x.doi))}">${h(normalizedDOI(x.doi))}</a>`:''}</li>`).join('')}</ol>`:(safeURL(p.links.scholar)?`<p>Publication record and current citation metrics: <a href="${h(safeURL(p.links.scholar))}" target="_blank" rel="noopener noreferrer">Google Scholar</a>.</p>${p.draft?'<p class="cv-muted">Individual publication records have not yet been imported into this CV.</p>':''}`:'<p class="cv-muted">Individual publication records have not yet been added.</p>')}
  ${p.publicationSummary.showCount && p.publicationSummary.reportedCount!==null?`<p class="cv-muted">Reported total: ${h(p.publicationSummary.reportedCount)} papers; as of ${h(p.publicationSummary.countAsOf)}. ${h(p.publicationSummary.countSource)}</p>`:''}
  <p class="cv-muted">Last content update: ${h(p.updated)}.</p></article>`;
}
export function renderCV(p, css) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="profile-revision" content="${escapeHTML(p.revision || '')}"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(p.name)} | Curriculum vitae</title>${p.draft?'<meta name="robots" content="noindex,nofollow">':''}<style>${css}</style></head><body class="cv-only"><div class="cv-actions"><span>Curriculum vitae &middot; ${escapeHTML(p.name)}</span><button onclick="window.print()">Print / Save PDF</button></div>${cvBody(p)}</body></html>`;
}
export function renderHome(p, css) {
  const h = escapeHTML;
  const pubs = sortedPublications(p);
  const profiles = profileDefinitions().map(([key,label,desc]) => {
    const url = safeURL(p.links[key]);
    if (key === 'orcid' && url) desc = 'ORCID iD: ' + new URL(url).pathname.replaceAll('/', '');
    if (key === 'scopus' && url) desc = 'Author ID: ' + new URL(url).searchParams.get('authorId');
    if (!url && !p.draft) return '';
    return url?`<a class="profile-card" href="${h(url)}" target="_blank" rel="noopener noreferrer"><strong>${h(label)} <span aria-hidden="true">&#8599;</span></strong><span>${h(desc)}</span></a>`:`<div class="profile-card pending"><strong>${h(label)}</strong><span>Profile link to be added<br>No identity guessed</span></div>`;
  }).join('');
  const timeline = key => p[key].map(x=>`<div class="timeline-item"><p class="timeline-date">${h(x.period)}</p><h3>${h(x.title)}</h3><p class="timeline-institution">${h(x.institution)}</p><p class="timeline-detail">${h(x.detail)}</p></div>`).join('');
  const pubItems = pubs.map(x => `<li class="pub-item" data-year="${h(x.year)}" data-selected="${x.selected?'true':'false'}" data-search="${h([x.title,x.authors,x.journal,x.year].join(' ').toLowerCase())}"><div class="pub-year">${h(x.year)}</div><div><h3>${h(x.title)}</h3><p>${h(x.authors)}</p><div class="pub-meta"><em>${h(x.journal)}</em>${x.status!=='published'?` &middot; <span class="tag">${h(x.status)}</span>`:''}${x.selected?' &middot; <span class="tag">Selected work</span>':''}</div><div class="pub-links">${x.doi?`<a href="https://doi.org/${h(normalizedDOI(x.doi))}" target="_blank" rel="noopener noreferrer">DOI &#8599;</a>`:''}${safeURL(x.url)?`<a href="${h(safeURL(x.url))}" target="_blank" rel="noopener noreferrer">Article &#8599;</a>`:''}</div></div></li>`).join('');
  const metadata = {"@context":"https://schema.org","@type":"Person",name:p.name,jobTitle:p.role,affiliation:{"@type":"Organization",name:p.institution},alumniOf:p.education.map(x=>({"@type":"CollegeOrUniversity",name:x.institution})),sameAs:Object.values(p.links).filter(safeURL)};
  const safeJSON = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="profile-revision" content="${escapeHTML(p.revision || '')}"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${h(p.name)} - ${h(p.role)}, ${h(p.institution)}. ${h(p.headline)}."><meta name="theme-color" content="#182c31">${p.draft?'<meta name="robots" content="noindex,nofollow">':''}<title>${h(p.name)} | ${h(p.headline)}</title><style>${css}</style><script type="application/ld+json">${safeJSON(metadata)}</script></head>
<body><a class="skip" href="#main">Skip to content</a>${p.draft?'<div class="draft-banner">PREVIEW &middot; CV and profile links integrated &middot; Review before public release.</div>':''}
<header class="site-header"><div class="shell nav-shell"><a class="brand" href="#top" aria-label="${h(p.name)} home"><span class="monogram" aria-hidden="true">${h(p.presentation?.monogram || "PD")}</span><span>${h(p.name)}</span></a><nav class="nav-links" aria-label="Main navigation"><a class="desktop-nav" href="#research">Research</a><a href="#publications">Publications</a><a class="desktop-nav" href="#experience">Experience</a><a class="desktop-nav" href="#honors">Honors</a><a class="desktop-nav" href="#profiles">Profiles</a><a class="nav-cv" href="cv.html" data-open-cv>View CV &#8599;</a></nav></div></header>
<main id="main" class="shell"><section class="hero" id="top" aria-labelledby="hero-title"><div><p class="eyebrow">${h(p.role)} &nbsp;/&nbsp; ${h(p.institutionShort)} ${h(p.department.replace(/^Department of /,''))}</p><h1 id="hero-title">${h(p.name)}</h1><p class="hero-subtitle">${h(p.headline)}</p><p class="hero-summary">${h(p.tagline)}</p><div class="button-row"><a class="button" href="#research">Explore research <span aria-hidden="true">&#8595;</span></a><a class="button secondary" href="#profiles">Academic profiles <span aria-hidden="true">&#8599;</span></a></div></div><aside class="hero-card" aria-label="Research approach"><div class="portrait-heading">${safePortrait(p.portrait?.dataUrl)?`<img class="hero-portrait" src="${safePortrait(p.portrait.dataUrl)}" alt="${h(p.portrait.alt)}" width="106" height="136">`:""}<div><p class="eyebrow">Research perspective</p><p class="card-title">${h(p.presentation?.perspectiveTitle || "Research perspective")}</p></div></div>${(p.presentation?.steps || []).map((x,i)=>`<div class="scale-row"><span class="scale-index">${String(i+1).padStart(2,"0")}</span><div><strong>${h(x.title)}</strong><span>${h(x.description)}</span></div></div>`).join("")}</aside></section>
<div class="affiliation-strip"><div><span class="eyebrow">Current affiliation</span><strong>${h(p.institution)}</strong></div><div><span class="eyebrow">Academic home</span><strong>${h(p.department)}</strong></div></div>
<section class="section" id="research" aria-labelledby="research-title"><div class="section-heading"><div><p class="eyebrow">01 / Research</p><h2 id="research-title">Structure. Transport.<br>New possibilities.</h2></div><p class="section-intro">${h(p.presentation?.researchIntro || p.tagline)}</p></div><div class="research-grid">${p.research.map((x,i)=>`<article class="research-card"><div class="research-top"><span class="card-num">${String(i+1).padStart(2,'0')}</span><span class="tag">${h(x.label)}</span></div><h3>${h(x.title)}</h3><p>${h(x.description)}</p></article>`).join('')}</div>${p.goals.length?`<div class="goals"><div><p class="eyebrow">Looking ahead</p><p class="goals-intro">Planned research directions</p></div><div class="goal-grid">${p.goals.map(x=>`<article><h3>${h(x.title)}</h3><p>${h(x.description)}</p></article>`).join('')}</div></div>`:''}</section>
${(p.projects||[]).length?`<section class="section" id="projects" aria-labelledby="projects-title"><div class="section-heading"><div><p class="eyebrow">02 / Research projects</p><h2 id="projects-title">Superatomic building blocks.<br>Thermal behavior.</h2></div><p class="section-intro">Doctoral research on cluster-assembled materials, thermal conductivity, and thermal rectification.</p></div><div class="project-grid">${p.projects.map((x,i)=>`<article class="project-card"><div class="research-top"><span class="card-num">${String(i+1).padStart(2,'0')}</span><span class="tag">${h(x.label)}</span></div><h3>${h(x.title)}</h3><p>${h(x.description)}</p></article>`).join('')}</div></section>`:''}
${(p.skills||[]).length?`<section class="section" id="skills" aria-labelledby="skills-title"><div class="section-heading"><div><p class="eyebrow">03 / Research skills</p><h2 id="skills-title">Computational toolkit.</h2></div><p class="section-intro">Materials modeling, first-principles calculations, lattice dynamics, molecular dynamics, and machine learning potentials.</p></div><div class="skills-grid">${p.skills.map(x=>`<article class="skill-card"><h3>${h(x.title)}</h3><div class="tool-tags">${x.tools.split(',').map(t=>t.trim()).filter(Boolean).map(t=>`<span>${h(t)}</span>`).join('')}</div></article>`).join('')}</div></section>`:''}
<section class="section" id="publications" aria-labelledby="pub-title"><div class="section-heading"><div><p class="eyebrow">04 / Publications</p><h2 id="pub-title">Research outputs.</h2></div><p class="section-intro">${pubs.length?'Publication records curated for this website. Citation metrics remain linked to the relevant external profile.':'Publications and citation metrics are available through the linked academic profiles. A curated local publication list will be added here.'}</p></div>${p.publicationSummary.journals.length?`<div class="journal-list" aria-label="Journals listed in supplied biography">${p.publicationSummary.journals.map(j=>`<span>${h(j)}</span>`).join('')}</div>`:''}${p.publicationSummary.showCount && p.publicationSummary.reportedCount!==null?`<p class="section-intro">${h(p.publicationSummary.reportedCount)} papers reported as of ${h(p.publicationSummary.countAsOf)}. ${h(p.publicationSummary.countSource)}</p>`:''}${pubs.length?`<div class="publication-toolbar"><input id="pub-search" type="search" placeholder="Search titles, authors, or journals" aria-label="Search publications"><select id="pub-year" aria-label="Filter by publication year"><option value="all">All years</option>${[...new Set(pubs.map(x=>x.year))].map(y=>`<option>${h(y)}</option>`).join('')}</select><label><input id="pub-selected" type="checkbox"> Selected only</label><button class="button secondary" id="export-bib">BibTeX &#8595;</button></div><p id="pub-status" class="no-results" aria-live="polite">${pubs.length} records</p><ol class="pub-list">${pubItems}</ol>`:`<div class="placeholder"><strong>${safeURL(p.links.scholar)?"View the publication record on Google Scholar.":"Publication list awaiting import."}</strong><p>${safeURL(p.links.scholar)?"Use the linked profile for publications and current citation metrics.":"Individual publication records have not yet been added."}</p>${safeURL(p.links.scholar)?`<a class="button secondary" href="${h(safeURL(p.links.scholar))}" target="_blank" rel="noopener noreferrer">Google Scholar &#8599;</a>`:""}${p.draft?`<p class="import-note">The supplied CV contains no publication list. Profile links are connected; individual paper records and citation statistics have not been imported.</p>`:""}</div>`}</section>
<section class="section" id="experience" aria-labelledby="experience-title"><div class="section-heading"><div><p class="eyebrow">05 / Background</p><h2 id="experience-title">Research journey.</h2></div><div class="bio-full">${p.bio.map(x=>`<p>${h(x)}</p>`).join('')}</div></div><div class="experience-grid"><div><p class="timeline-heading">Appointment</p>${timeline('experience')}</div><div><p class="timeline-heading">Education</p>${timeline('education')}</div></div></section>
${(p.honors||[]).length?`<section class="section" id="honors" aria-labelledby="honors-title"><div class="section-heading"><div><p class="eyebrow">06 / Honors &amp; academic activities</p><h2 id="honors-title">Recognition &amp;<br>academic exchange.</h2></div><p class="section-intro">Scholarships, research awards, and contributions to academic conferences.</p></div><div class="honors-list">${p.honors.map(x=>`<article class="honor-item"><p class="honor-year">${h(x.year)}</p><div><h3>${h(x.title)}</h3><span class="tag">${h(x.type)}</span></div></article>`).join('')}</div></section>`:''}
<section class="section" id="profiles" aria-labelledby="profiles-title"><div class="section-heading"><div><p class="eyebrow">07 / Elsewhere</p><h2 id="profiles-title">One researcher.<br>Connected records.</h2></div><p class="section-intro">Official academic profiles, publication records, and research resources, brought together in one place.</p></div><div class="profile-grid">${profiles || '<p class="section-intro">Academic profile links will be added here.</p>'}</div><div class="contact-line">${p.email?`<span>Academic correspondence${p.draft && p.contactNote?`<small>${h(p.contactNote)}</small>`:""}</span><a href="mailto:${h(p.email)}">${h(p.email)} &#8599;</a>`:'<span>Contact details have not yet been supplied.</span><span>No tracking scripts or external data requests are included.</span>'}</div></section>
<footer class="site-footer"><span class="footer-title">${h(p.name)} &middot; ${h(p.headline)}</span><span>Last content update: ${h(p.updated)}${p.draft?' &middot; Draft preview':''}</span></footer></main>
<dialog id="cv-dialog" aria-labelledby="cv-dialog-title"><div class="cv-actions"><span id="cv-dialog-title">Curriculum vitae &middot; ${h(p.name)}</span><div><button id="print-cv">Print / Save PDF</button> <button id="close-cv" aria-label="Close curriculum vitae">Close &#215;</button></div></div>${cvBody(p)}</dialog><script type="application/json" id="bib-data">${safeJSON(bibtex(p))}</script>
<script>
(function(){
  var dialog = document.getElementById('cv-dialog');
  document.querySelectorAll('[data-open-cv]').forEach(function(a){a.addEventListener('click',function(e){if(dialog.showModal){e.preventDefault();dialog.showModal();}});});
  document.getElementById('close-cv').addEventListener('click',function(){dialog.close();});
  document.getElementById('print-cv').addEventListener('click',function(){window.print();});
  dialog.addEventListener('click',function(e){if(e.target===dialog){var r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  var search=document.getElementById('pub-search'), year=document.getElementById('pub-year'), selected=document.getElementById('pub-selected');
  function filter(){var count=0;document.querySelectorAll('.pub-item').forEach(function(el){var match=el.dataset.search.indexOf(search.value.trim().toLowerCase())!==-1&&(year.value==='all'||el.dataset.year===year.value)&&(!selected.checked||el.dataset.selected==='true');el.hidden=!match;if(match)count++;});document.getElementById('pub-status').textContent=count+' matching record'+(count===1?'':'s');}
  if(search){search.addEventListener('input',filter);year.addEventListener('change',filter);selected.addEventListener('change',filter);}
  var btn=document.getElementById('export-bib');if(btn)btn.addEventListener('click',function(){var blob=new Blob([JSON.parse(document.getElementById('bib-data').textContent)],{type:'application/x-bibtex'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='publications.bib';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);});
})();
</script></body></html>`;
}

/** Remove private/source-only metadata before committing public data. */
export function publicProfile(input) {
  const allowed = ['schemaVersion','draft','updated','name','role','department','institution','institutionShort','headline','tagline','bio','email','links','research','goals','experience','education','publicationSummary','publications','presentation','projects','skills','honors','contactLinks','portrait','revision'];
  const p = Object.fromEntries(allowed.filter(k => input[k] !== undefined).map(k => [k, structuredClone(input[k])]));
  if (p.portrait) p.portrait = {dataUrl:p.portrait.dataUrl, alt:p.portrait.alt};
  if (p.publicationSummary && !p.publicationSummary.showCount) {
    p.publicationSummary.reportedCount = null; p.publicationSummary.countAsOf = ''; p.publicationSummary.countSource = '';
  }
  return p;
}
