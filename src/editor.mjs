import {sortedEntryIndices,homeSectionOrder,parseDate} from './chronology.mjs';
import {escapeHTML as h,safePortrait,withOptionalSections,validateProfile,publicProfile,bibtex,profileDefinitions,normalizeAuthors} from './render-core.mjs';
import {renderPages,pageDefs} from './pages.mjs';
import {zipTextFiles} from './zip.mjs';
import {exportCVPDF} from './cv-export.mjs';
import {GitHubStore} from './github.mjs';
const $=id=>document.getElementById(id);
const say=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error);};
const cloud=(text,error=false)=>{$('cloud-status').textContent=text;$('cloud-status').classList.toggle('error',error);};
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
const fail=e=>{const map={401:'令牌无效或已过期，请重新连接。',403:'权限不足或访问频率受限，请检查仓库范围和 Contents 读写权限。',404:'未找到仓库或文件，请检查授权。',409:'资料版本冲突，未覆盖云端内容。请先导出资料 JSON，再载入最新版本合并修改。',422:'分支已变化或受保护。请导出资料 JSON，重新载入后核对。'};if(map[e.code])return map[e.code];if(/Network request|Failed to fetch|abort/i.test(e.message))return '网络连接未能确认，请检查网络后重新载入资料；保存结果请以仓库记录为准。';if(/fine-grained|github_pat_/i.test(e.message))return '请输入以 github_pat_ 开头的细粒度访问令牌。';if(/configured repository owner|write access/i.test(e.message))return '当前令牌没有此资料库的写入权限，请检查所属账号与仓库授权。';return '操作未完成：'+e.message;};
async function read(path){const r=await fetch(path,{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw new Error(path+' (HTTP '+r.status+')');return r.text();}
try{
const [css,configText]=await Promise.all([read('/src/site.css'),read('/config/site.json')]);
let p=withOptionalSections({schemaVersion:1,draft:true,updated:'',name:'',role:'',department:'',institution:'',institutionShort:'',headline:'',tagline:'',bio:[],email:'',links:{scholar:'',orcid:'',github:'',institution:'',scopus:''},research:[],goals:[],experience:[],education:[],publicationSummary:{reportedCount:null,countAsOf:'',countSource:'',showCount:false,journals:[]},publications:[],presentation:{monogram:'',researchIntro:'',perspectiveTitle:'',steps:[]},projects:[],skills:[],honors:[],portrait:{dataUrl:'',alt:'',source:''},revision:''}),dirty=false,rawDirty=false,busy=false,snapshot=null,timer,lastRevision='',loaded=false,publicationTimer=null,publicationEpoch=0,reorderTimer=null;
const config=JSON.parse(configText),store=new GitHubStore(config);
const value=path=>path.split('.').reduce((x,k)=>x?.[k],p);
function set(path,v){const keys=path.split('.');let o=p;for(const k of keys.slice(0,-1))o=o[k];o[keys.at(-1)]=v;}
function field(path,label,kind='text',hint=''){
 const v=value(path)??'',id='field-'+path.replaceAll('.','-');

 if(kind==='date'){
  return '<div class="field iso-date-field"><label class="iso-date-label" for="'+id+'">'+h(label)+'</label><span class="iso-date-wrap"><input id="'+id+'" data-path="'+path+'" data-iso-date="true" type="text" value="'+h(v)+'" placeholder="YYYY-MM-DD" maxlength="10" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" autocomplete="off" required><span class="calendar-slot"><button type="button" class="calendar-button" data-open-calendar="'+id+'-calendar" aria-label="从日历选择日期"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/></svg></button><input class="calendar-native" id="'+id+'-calendar" type="date" data-calendar-path="'+path+'" value="'+h(v)+'" tabindex="-1" aria-hidden="true"></span></span>'+(hint?'<div class="hint">'+h(hint)+'</div>':'')+'</div>';
 }

 const control=kind==='textarea'?`<textarea id="${id}" data-path="${path}">${h(v)}</textarea>`:kind==='checkbox'?`<input id="${id}" data-path="${path}" type="checkbox" ${v?'checked':''}>`:`<input id="${id}" data-path="${path}" type="${kind}" value="${h(v)}" ${(path.endsWith('.doi')||path.endsWith('.date'))?'required':path.endsWith('.startDate')?'maxlength="10" placeholder="例如 2025-07"':''}>`;
 return `<label class="field" for="${id}"><span>${h(label)}</span>${control}${hint?`<div class="hint">${h(hint)}</div>`:''}</label>`;
}
const defs={research:[['title','研究方向'],['description','概述','textarea']],projects:[['title','项目名称'],['label','分类标签'],['researchArea','所属研究方向（标题需一致）'],['description','项目介绍','textarea']],goals:[['title','计划名称'],['description','研究计划','textarea']],skills:[['title','方法类别'],['tools','工具或模型（英文逗号分隔）','textarea']],experience:[['period','起止时间'],['title','职位'],['institution','机构'],['detail','详细说明','textarea']],education:[['period','就读时间'],['title','学位'],['institution','学校'],['detail','详细说明','textarea']],honors:[['year','年份'],['title','名称','textarea']],affiliations:[['name','名称']],emails:[['email','地址','email']],contactLinks:[['label','名称'],['url','链接','url']]};
const defaults={research:{title:'',description:''},projects:{researchArea:'',description:'',graphicalAbstract:{dataUrl:'',alt:''}},goals:{title:'',description:''},skills:{title:'',tools:''},experience:{period:'',title:'',institution:'',detail:''},education:{period:'',title:'',institution:'',detail:''},honors:{date:'',location:'',title:'',group:'awards',legacyDatePending:false},affiliations:{name:''},emails:{email:''},contactLinks:{label:'',url:''},publications:{title:'',authors:'',journal:'',year:new Date().getFullYear(),volume:'',pages:'',doi:'',selected:false}};
function orderIndices(key){return sortedEntryIndices(p[key]||[]);}
function sortDateField(key,i){
 const label='可选日期';
 return field(key+'.'+i+'.startDate',label,'text','支持 2025、2025-07 或 2025-07-01；留空按已有时间排序。');
}
function blocks(key,title){return `<h2>${title}</h2>${orderIndices(key).map((i,n)=>`<div class="block"><h3>${title} ${n+1}</h3>${defs[key].map(([k,l,t])=>field(`${key}.${i}.${k}`,l,t)).join('')}${sortDateField(key,i)}<button class="remove" data-remove="${key}" data-index="${i}">删除此条目</button></div>`).join('')}<button class="add-button" data-add="${key}">添加条目</button><div style="height:25px"></div>`;}
function eventBlocks(title,indices,addType){return '<h2>'+title+'</h2>'+indices.map((i,n)=>'<div class="block"><h3>'+title+' '+(n+1)+'</h3>'+field('honors.'+i+'.date','日期（必填）','date','YYYY-MM-DD，例如 2025-07-01。')+(p.honors[i].legacyDatePending?'<p class="help">原年份：'+h(p.honors[i].year)+'；日期待补充。旧条目仍会保留显示。</p>':'')+field('honors.'+i+'.location','地点','text','按国家、城市、场所由大到小填写，使用英文逗号分隔。')+field('honors.'+i+'.title','事件','textarea')+'<button class="remove" data-remove="honors" data-index="'+i+'">删除此条目</button></div>').join('')+'<button class="add-button" data-add="honors" data-group="'+addType+'">添加条目</button><div style="height:25px"></div>';}

function parseBibTeX(source){
 const entries=[];let i=0;
 while(i<source.length){
  const at=source.indexOf('@',i);if(at<0)break;let j=at+1;while(/[A-Za-z]/.test(source[j]||''))j++;const type=source.slice(at+1,j).toLowerCase();while(/\s/.test(source[j]||''))j++;const open=source[j];if(open!=='{'&&open!=='('){i=j+1;continue;}const close=open==='{'?'}':')';j++;while(/\s/.test(source[j]||''))j++;const comma=source.indexOf(',',j);if(comma<0)break;const key=source.slice(j,comma).trim();j=comma+1;const fields={};
  while(j<source.length){while(/[\s,]/.test(source[j]||''))j++;if(source[j]===close){j++;break;}let k=j;while(/[\w-]/.test(source[j]||''))j++;const name=source.slice(k,j).toLowerCase();while(/\s/.test(source[j]||''))j++;if(source[j]!=='='){while(j<source.length&&source[j]!==','&&source[j]!==close)j++;continue;}j++;while(/\s/.test(source[j]||''))j++;let value='';
   if(source[j]==='{'){j++;let depth=1,escaped=false;while(j<source.length&&depth){const c=source[j++];if(c==='\\'&&!escaped){value+=c;escaped=true;continue;}if(c==='{'&&!escaped)depth++;if(c==='}'&&!escaped){depth--;if(!depth)break;}value+=c;escaped=false;}}
   else if(source[j]==='"'){j++;let escaped=false;while(j<source.length){const c=source[j++];if(c==='"'&&!escaped)break;value+=c;if(c==='\\'&&!escaped)escaped=true;else escaped=false;}}
   else{const start=j;while(j<source.length&&source[j]!==','&&source[j]!==close)j++;value=source.slice(start,j).trim();}
   fields[name]=value.trim();while(/\s/.test(source[j]||''))j++;if(source[j]===',')j++;
  }
  if(!['comment','preamble','string'].includes(type))entries.push({type,key,fields});i=Math.max(j,at+1);
 }
 const clean=v=>String(v||'').replace(/\\([&%_#$])/g,'$1').replace(/[{}]/g,'').replace(/\s+/g,' ').trim();
 return entries.map(e=>{const x=e.fields,year=Number((x.year||'').match(/\d{4}/)?.[0]),venue=x.journal||x.booktitle||x.publisher||'';return{title:clean(x.title),authors:normalizeAuthors(clean(x.author)),journal:clean(venue),volume:clean(x.volume),pages:clean(x.pages||x.eid),year,doi:clean(x.doi),selected:false};}).filter(x=>x.title&&x.authors&&x.journal&&Number.isInteger(x.year)&&x.year>=1900&&x.year<=2100&&x.doi);
}
function researchForm(){
 const work=(i,n)=>'<div class="block research-entry"><h3>代表性工作 '+(n+1)+'</h3>'+(safePortrait(p.projects[i].graphicalAbstract?.dataUrl)?'<img src="'+safePortrait(p.projects[i].graphicalAbstract.dataUrl)+'" alt="图形摘要" style="max-width:100%;max-height:180px">':'')+'<label class="field"><span>图形摘要</span><input type="file" data-abstract="'+i+'" accept="image/jpeg,image/png,image/webp"></label><button type="button" data-clear-abstract="'+i+'">移除图片</button>'+field('projects.'+i+'.description','创新性','textarea')+sortDateField('projects',i)+'<button class="remove" data-remove="projects" data-index="'+i+'">删除此条目</button></div>';
 const direction=(i,n)=>'<section class="block"><h2>研究方向 '+(n+1)+'</h2>'+field('research.'+i+'.title','名称')+field('research.'+i+'.description','概述','textarea')+sortDateField('research',i)+orderIndices('projects').filter(j=>p.projects[j].researchArea===p.research[i].title).map(work).join('')+'<button data-add="projects" data-area="'+i+'">添加代表性工作</button><button class="remove" data-remove="research" data-index="'+i+'">删除研究方向</button></section>';
 const orphan=orderIndices('projects').filter(i=>!p.research.some(a=>a.title===p.projects[i].researchArea));
 return orderIndices('research').map(direction).join('')+'<button data-add="research">添加研究方向</button>'+(orphan.length?'<h2>未归类工作</h2>'+orphan.map((i,n)=>'<label class="field"><span>归入研究方向</span><select data-path="projects.'+i+'.researchArea"><option value="">请选择</option>'+p.research.map(a=>'<option value="'+h(a.title)+'">'+h(a.title)+'</option>').join('')+'</select></label>'+work(i,n)).join(''):'');
}
function forms(){
 $('basics').innerHTML=`<h2>基本信息</h2><p class="help">编辑个人简介、照片及经历；有日期的条目默认按开始时间由近及远。</p>${field('name','姓名')}${field('headline','研究关键词','text','使用英文逗号分隔，例如 Computational materials physics, Thermal transport；网页以点号连接。')}<label class="field"><span>个人简介（段落间空一行）</span><textarea id="bio-input" rows="7">${h(p.bio.join('\n\n'))}</textarea></label><h2>个人照片</h2>${safePortrait(p.portrait?.dataUrl)?`<img src="${safePortrait(p.portrait.dataUrl)}" alt="${h(p.portrait.alt)}" style="width:82px;height:auto;margin-bottom:12px">`:''}<label class="field"><span>选择照片（JPEG / PNG / WebP，不超过 1 MB）</span><input id="portrait-file" type="file" accept="image/jpeg,image/png,image/webp"></label>${field('portrait.alt','照片替代文字（英文）')}<button class="mini-button" id="remove-portrait">移除照片</button><div style="height:20px"></div>${field('updated','资料更新日期','date')}${field('draft','在预览中显示草稿提示','checkbox')}${homeSectionOrder(p).map(key=>blocks(key,key==='experience'?'职业':'教育')).join('')}`;
 $('research').innerHTML=researchForm();
 const awardIndices=orderIndices('honors').filter(i=>p.honors[i].group==='awards'),talkIndices=orderIndices('honors').filter(i=>p.honors[i].group==='talks');
 $('events').innerHTML=eventBlocks('荣誉与奖励',awardIndices,'awards')+eventBlocks('报告与海报',talkIndices,'talks');
 $('contact').innerHTML=blocks('affiliations','机构')+blocks('emails','邮箱')+blocks('contactLinks','合作');
 $('publications').innerHTML=`<h2>学术主页链接</h2><p class="help">这些链接显示在公开 Publications 页面的论文列表上方。</p>${profileDefinitions().map(([k,l])=>field('links.'+k,(k==='institution'?'学校官方个人页':l)+' 链接','url')).join('')}<h2>论文条目</h2><div class="bib-actions"><button type="button" class="mini-button" id="import-bib">导入 BibTeX</button><input id="bib-file" type="file" accept=".bib,.txt,application/x-bibtex" hidden><button type="button" class="mini-button" id="export-bib-panel">导出 BibTeX</button></div><div class="note">支持导入 .bib 论文题录。作者姓名用英文逗号分隔，期刊填写标准缩写。</div>${orderIndices('publications').map((i,n)=>`<div class="block"><h3>论文 ${n+1}</h3>${field(`publications.${i}.title`,'标题','textarea')}${field(`publications.${i}.authors`,'作者','textarea')}${field(`publications.${i}.journal`,'期刊（标准缩写）')}${field(`publications.${i}.year`,'年','number')}${field(`publications.${i}.volume`,'卷')}${field(`publications.${i}.pages`,'页 / 文章编号')}${field(`publications.${i}.doi`,'DOI（必填）')}${field(`publications.${i}.selected`,'标记为代表作','checkbox')}${sortDateField('publications',i)}<button class="remove" data-remove="publications" data-index="${i}">删除此条目</button></div>`).join('')}<button class="add-button" data-add="publications">添加论文</button>`;
 $('raw-json').value=JSON.stringify(p,null,2);
 controls();
}
forms();
function check(){if(rawDirty){say('请先应用 JSON 修改。',true);return false;}const errors=validateProfile(p);if(errors.length){say('请检查以下字段：\n'+errors.join('\n'),true);return false;}return true;}
let currentPage='index.html',activeTab='basics';
function preview(){if(!loaded||!check())return;const pages=renderPages(p);$('preview').srcdoc=pages[currentPage];}
function switchPreview(key){const map={basics:'index.html',research:'research.html',publications:'publications.html',events:'events.html',contact:'contact.html'};if(map[key])currentPage=map[key];preview();}
function modified(){dirty=true;controls();clearTimeout(timer);timer=setTimeout(preview,450);say('已修改，尚未保存。');}
function download(name,text,mime){const url=URL.createObjectURL(new Blob([text],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function controls(){
 for(const id of ['cloud-connect','cloud-token'])$(id).disabled=busy;
 $('cloud-reload').disabled=busy||!store.connected;
 $('cloud-check').disabled=busy||!loaded;
 $('cloud-disconnect').disabled=busy||!store.connected;
 $('cloud-save').disabled=busy||!store.connected||!snapshot||!dirty;
 document.querySelector('.editor-pane').inert=busy||!loaded;
 document.querySelector('.editor-pane').hidden=!loaded;
 document.querySelector('.toolbar').inert=busy||!loaded;
 for(const el of document.querySelectorAll('.toolbar button'))el.disabled=busy||!loaded;
 $('tools-state').textContent=loaded?'导出文件保存在本地':'连接资料库后可用';
 $('editor-empty').hidden=loaded;$('preview-empty').hidden=loaded;$('preview').hidden=!loaded;
 for(const el of document.querySelectorAll('[data-tab],#refresh'))el.disabled=busy||!loaded;
 $('connection-state').textContent=store.connected?'已连接':'未连接';
 $('connection-state').dataset.connected=String(store.connected);
 $('edit-state').textContent=busy?'处理中…':!loaded?'未载入资料':dirty?'有未保存修改':'已保存';
 $('edit-state').dataset.state=dirty?'dirty':'saved';
}
function stopPublicationCheck(){clearTimeout(publicationTimer);publicationEpoch++;}
async function checkPublication(expected=lastRevision,attempt=0,automatic=false,epoch=publicationEpoch){
 const status=$('publish-status');
 if(!expected){status.textContent='当前资料没有版本标记，请先保存后再检查。';return;}
 status.dataset.state='pending';status.textContent=attempt?'网站正在更新…':'正在检查网站版本…';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const url=new URL('index.html',config.siteURL.replace(/\/$/,'')+'/');url.searchParams.set('editor-check',String(Date.now()));
  const response=await fetch(url,{cache:'no-store',credentials:'omit',signal:controller.signal});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const doc=new DOMParser().parseFromString(await response.text(),'text/html');
  if(epoch!==publicationEpoch)return;
  if(doc.querySelector('meta[name="profile-revision"]')?.content===expected){status.dataset.state='success';status.textContent='公开网站已更新至当前保存版本。';return;}
  status.textContent='资料已保存，公开网站正在更新…';
 }catch(e){
  if(epoch!==publicationEpoch)return;
  status.textContent='暂时无法确认网站版本；可稍后点击“检查网站更新”。';
 }finally{clearTimeout(timeout);}
 if(epoch!==publicationEpoch)return;
 if(automatic&&attempt<17)publicationTimer=setTimeout(()=>checkPublication(expected,attempt+1,true,epoch),10000);
 else if(automatic){status.dataset.state='error';status.textContent='资料已保存，网站版本尚未确认。请查看发布记录或稍后重新检查。';}
}
async function action(fn){if(busy)return;busy=true;controls();try{await fn();}catch(e){cloud(fail(e),true);if(!store.connected)$('connection-details').open=true;}finally{busy=false;controls();}}
async function load(){const s=await store.snapshot();const errors=validateProfile(s.profile);if(errors.length)throw new Error(errors.join('; '));stopPublicationCheck();snapshot=s;p=withOptionalSections(s.profile);lastRevision=p.revision||'';loaded=true;$('publish-status').textContent='';dirty=false;rawDirty=false;forms();preview();cloud('已载入最新资料 · 版本 '+s.head.slice(0,7));say('资料已载入，选择页面后开始编辑。');}
document.addEventListener('input',e=>{const el=e.target;if(el.dataset.path){if(/^honors\.\d+\.date$/.test(el.dataset.path)){const item=p.honors[Number(el.dataset.path.split('.')[1])];if(el.value){item.year=el.value.slice(0,4);item.legacyDatePending=false;delete item.startDate;}}if(/^research\.\d+\.title$/.test(el.dataset.path)){const old=value(el.dataset.path);for(const work of p.projects)if(work.researchArea===old)work.researchArea=el.value;}set(el.dataset.path,el.type==='checkbox'?el.checked:el.type==='number'?(el.value===''?null:Number(el.value)):el.value);modified();}if(el.id==='bio-input'){p.bio=el.value.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);modified();}if(el.id==='raw-json'){rawDirty=dirty=true;controls();say('JSON 已修改，请先应用。');}});
document.addEventListener('change',e=>{
 const path=e.target.dataset?.path;
 if(!path||(!/[.](startDate|date|period|year|researchArea)$/.test(path)&&!/^research\.\d+\.title$/.test(path)))return;
 if(path.endsWith('.startDate')&&e.target.value&&parseDate(e.target.value)===null)return;
 clearTimeout(reorderTimer);
 reorderTimer=setTimeout(()=>{
  if(rawDirty)return;
  const active=document.activeElement,focusedPath=active?.dataset?.path;
  const selection=active&&typeof active.selectionStart==='number'?[active.selectionStart,active.selectionEnd]:null;
  const scroll=window.scrollY;
  forms();
  const replacement=focusedPath?[...document.querySelectorAll('[data-path]')].find(el=>el.dataset.path===focusedPath):null;
  if(replacement){replacement.focus({preventScroll:true});if(selection&&replacement.setSelectionRange)try{replacement.setSelectionRange(...selection);}catch{}}
  window.scrollTo({top:scroll,behavior:'auto'});
 },0);
});
document.addEventListener('click',e=>{if(e.target.closest('#import-bib')){$('bib-file').click();return;}if(e.target.closest('#export-bib-panel')){exportBib();return;}const clear=e.target.closest('[data-clear-abstract]');if(clear){p.projects[Number(clear.dataset.clearAbstract)].graphicalAbstract={dataUrl:'',alt:''};forms();modified();return;}const tab=e.target.closest('[data-tab]');if(tab){if(rawDirty){say('请先应用 JSON 修改。',true);return;}activeTab=tab.dataset.tab;$('edit-page').textContent=tab.textContent;$('advanced').hidden=true;$('advanced-toggle').textContent='高级 JSON';$('advanced-toggle').setAttribute('aria-expanded','false');document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===tab)));document.querySelectorAll('[role=tabpanel]').forEach(s=>s.hidden=s.id!==activeTab);switchPreview(activeTab);}const advanced=e.target.closest('#advanced-toggle');if(advanced){if(rawDirty){say('请先应用 JSON 修改后再离开高级 JSON。',true);return;}if($('advanced').hidden){document.querySelectorAll('[role=tabpanel]').forEach(s=>s.hidden=true);$('advanced').hidden=false;$('edit-page').textContent='高级 JSON';$('raw-json').value=JSON.stringify(p,null,2);advanced.textContent='返回页面编辑';advanced.setAttribute('aria-expanded','true');}else{$('advanced').hidden=true;$(activeTab).hidden=false;$('edit-page').textContent=document.querySelector('[data-tab="'+activeTab+'"]').textContent;advanced.textContent='高级 JSON';advanced.setAttribute('aria-expanded','false');}return;}const add=e.target.closest('[data-add]');if(add){const item=clone(defaults[add.dataset.add]);if(add.dataset.add==='honors')item.group=add.dataset.group||'awards';if(add.dataset.area)item.researchArea=p.research[Number(add.dataset.area)]?.title||'';p[add.dataset.add].push(item);forms();modified();}const remove=e.target.closest('[data-remove]');if(remove){if(remove.dataset.remove==='research'){const old=p.research[Number(remove.dataset.index)]?.title;for(const work of p.projects)if(work.researchArea===old)work.researchArea='';}p[remove.dataset.remove].splice(Number(remove.dataset.index),1);forms();modified();}if(e.target.closest('#remove-portrait')){p.portrait={dataUrl:'',alt:''};forms();modified();}});
$('refresh').onclick=()=>{preview();if(check())say('预览已刷新，尚未发布。');};
$('export-json').onclick=()=>{if(check()){download('profile.json',JSON.stringify(p,null,2)+'\n','application/json');say('资料 JSON 已导出，不会更改云端内容。');}};
$('export-home').onclick=()=>{if(!check())return;const blob=zipTextFiles(renderPages(p)),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='academic_homepage_5_pages.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('已导出五个英文 HTML 页面（ZIP 压缩包）。');};
$('import-json-button').onclick=()=>$('import-json').click();
$('export-cv').onclick=()=>{if(!check())return;try{exportCVPDF(p,css);say('已打开英文 CV 打印窗口。请选择“另存为 PDF”，建议关闭页眉页脚。不会上传 CV。');}catch(e){say('请允许此网站的弹出窗口，再导出 PDF。',true);}};
document.addEventListener('change',async e=>{if(e.target.id!=='bib-file')return;const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw new Error('BibTeX 文件需小于 5 MB。');const text=await file.text(),parsed=parseBibTeX(text);if(!parsed.length)throw new Error('未找到含标题、作者、期刊、年份和 DOI 的完整 BibTeX 条目。');const doi=x=>String(x.doi||'').toLowerCase().replace(/^https?:\/\/doi\.org\//,'').replace(/^doi:/,'').trim(),title=x=>String(x.title||'').replace(/<[^>]*>/g,'').replace(/&amp;/gi,'&').toLowerCase().replace(/[^a-z0-9]+/g,''),match=(a,b)=>(doi(a)&&doi(a)===doi(b))||(title(a)&&title(a)===title(b)&&String(a.year)===String(b.year));let added=0,enriched=0,duplicates=0;for(const item of parsed){const existing=p.publications.find(x=>match(x,item));if(existing){let changed=false;for(const field of ['authors','journal','doi','volume','pages'])if(!String(existing[field]||'').trim()&&String(item[field]||'').trim()){existing[field]=item[field];changed=true;}if(changed)enriched++;else duplicates++;}else{p.publications.push(item);added++;}}if(!added&&!enriched)throw new Error('没有新增或补全记录；文件中的条目已存在。');dirty=true;forms();preview();say('BibTeX 导入完成：新增 '+added+' 条，补全 '+enriched+' 条，未改动重复项 '+duplicates+' 条。');}catch(e){say(fail(e),true);}finally{e.target.value='';}});
function exportBib(){if(!check())return;if(!p.publications.length){say('尚未录入论文记录，暂无可导出的引用信息。',true);return;}download('publications.bib',bibtex(p),'application/x-bibtex');say('论文引用已导出（.bib），不包含论文全文。');};
$('apply-json').onclick=()=>{try{const n=JSON.parse($('raw-json').value),errors=validateProfile(n);if(errors.length)throw new Error(errors.join('\n'));p=withOptionalSections(n);rawDirty=false;dirty=true;forms();preview();say('JSON 修改已应用，尚未发布。');}catch(e){say(fail(e),true);}};
$('import-json').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>5*1024*1024)throw new Error('JSON 文件需小于 5 MB。');const n=JSON.parse(await f.text()),errors=validateProfile(n);if(errors.length)throw new Error(errors.join('\n'));if(dirty&&!confirm('是否用导入文件替换未保存修改？'))return;p=withOptionalSections(n);rawDirty=false;dirty=true;forms();preview();say('资料 JSON 已导入，尚未发布。');}catch(e){say(fail(e),true);}finally{e.target.value='';}};
document.addEventListener('change',async e=>{if(e.target.id!=='portrait-file')return;const f=e.target.files[0];if(!f)return;try{if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>1024*1024)throw new Error('照片必须为 JPEG / PNG / WebP，且不超过 1 MB。');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('无法读取照片。'));r.readAsDataURL(f);});if(!safePortrait(data))throw new Error('不支持的照片格式。');const img=new Image();img.src=data;await img.decode();p.portrait={dataUrl:data,alt:'Portrait of '+p.name};forms();modified();}catch(e){say(fail(e),true);}});
$('cloud-connect').onclick=()=>action(async()=>{const token=$('cloud-token').value;$('cloud-token').value='';await store.connect(token);if(dirty||rawDirty){const remote=await store.snapshot();if(!snapshot||remote.fileSHA!==snapshot.fileSHA){snapshot=null;const e=new Error();e.code=409;throw e;}cloud('已连接，当前修改已保留。');}else await load();$('connection-details').open=false;$('connection-details').querySelector('summary').focus();});
$('cloud-disconnect').onclick=()=>{stopPublicationCheck();store.disconnect();$('cloud-token').value='';$('connection-details').open=true;controls();cloud('已断开并清除令牌，未发布内容仍可导出。');};
$('cloud-reload').onclick=()=>{if((dirty||rawDirty)&&!confirm('是否丢弃未保存修改，载入 GitHub 版本？需要保留时请先导出资料 JSON。'))return;action(load);};
$('cloud-save').onclick=()=>action(async()=>{if(!check()||!snapshot)return;if(!confirm('确认将资料保存到私有 GitHub 仓库？公开页面将由仓库 Actions 自动生成发布；CV 不会上传。'))return;const next=publicProfile(p);next.draft=false;next.updated=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());next.revision=crypto.randomUUID();const errors=validateProfile(next,true);if(errors.length)throw new Error(errors.join('\n'));const text=JSON.stringify(next,null,2)+'\n';if(new TextEncoder().encode(text).length>950000)throw new Error('资料超过 950 KB，请缩小照片。');cloud('正在提交修改，确认结果前请勿关闭标签页。');const result=await store.publish([{path:'content/profile.json',content:text}],snapshot.fileSHA);p=withOptionalSections(next);dirty=rawDirty=false;lastRevision=next.revision;snapshot={...snapshot,fileSHA:result.fileSHA,head:result.commitSHA,profile:next};forms();preview();$('cloud-commit').href=result.commitURL;$('cloud-commit').hidden=false;cloud('已保存到私有资料库 · 版本 '+result.commitSHA.slice(0,7));say('资料已保存，正在更新公开网站。');stopPublicationCheck();$('publish-status').dataset.state='pending';$('publish-status').textContent='公开网站正在更新…';const epoch=publicationEpoch;publicationTimer=setTimeout(()=>checkPublication(lastRevision,0,true,epoch),5000);});
$('cloud-check').onclick=()=>{stopPublicationCheck();checkPublication();};
$('cloud-live').href=config.siteURL+'/';$('cloud-repo').href=`https://github.com/${config.owner}/${config.repo}`;$('cloud-token-help').href=`https://github.com/settings/personal-access-tokens/new?name=Academic%20homepage%20editor&target_name=${encodeURIComponent(config.owner)}&contents=write&expires_in=30`;
const tokenHelp=$('token-help'),tokenTip=$('token-tip-toggle');
function closeTokenTip(dismiss=false){tokenHelp.dataset.open='false';tokenHelp.dataset.dismissed=String(dismiss);tokenTip.setAttribute('aria-expanded','false');}
tokenHelp.addEventListener('pointerenter',()=>{tokenHelp.dataset.dismissed='false';});
tokenHelp.addEventListener('focusin',()=>{tokenHelp.dataset.dismissed='false';});
document.addEventListener('click',e=>{if(e.target.closest('#token-tip-toggle')){const open=tokenHelp.dataset.open!=='true';tokenHelp.dataset.open=String(open);tokenHelp.dataset.dismissed=String(!open);tokenTip.setAttribute('aria-expanded',String(open));}else if(!e.target.closest('#token-help'))closeTokenTip(true);});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTokenTip(true);});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});window.addEventListener('pagehide',()=>{stopPublicationCheck();store.disconnect();$('cloud-token').value='';controls();});

document.addEventListener('change',async e=>{if(e.target.dataset.abstract===undefined)return;const file=e.target.files[0];if(!file)return;try{if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1024*1024)throw Error('图形摘要须为 JPEG / PNG / WebP，且不超过 1 MB。');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});if(!safePortrait(data))throw Error('图片格式无效。');p.projects[Number(e.target.dataset.abstract)].graphicalAbstract={dataUrl:data,alt:'Graphical abstract'};forms();modified();}catch(error){say(error.message,true);}});


document.addEventListener('click',e=>{
 const button=e.target.closest('[data-open-calendar]');if(!button)return;
 const picker=$(button.dataset.openCalendar);if(!picker)return;
 const text=document.querySelector('[data-path="'+picker.dataset.calendarPath+'"]');
 picker.value=/^\d{4}-\d{2}-\d{2}$/.test(text.value)&&parseDate(text.value)!==null?text.value:'';
 try{if(typeof picker.showPicker==='function')picker.showPicker();else picker.click();}catch{picker.click();}
});
document.addEventListener('input',e=>{
 const text=e.target;if(text.dataset.isoDate!=='true')return;
 const picker=$(text.id+'-calendar');
 if(picker)picker.value=/^\d{4}-\d{2}-\d{2}$/.test(text.value)&&parseDate(text.value)!==null?text.value:'';
});
document.addEventListener('change',e=>{
 const picker=e.target;if(!picker.dataset.calendarPath)return;
 const text=document.querySelector('[data-path="'+picker.dataset.calendarPath+'"]');if(!text)return;
 text.value=picker.value;
 text.dispatchEvent(new Event('input',{bubbles:true}));
 text.dispatchEvent(new Event('change',{bubbles:true}));
});

preview();controls();cloud('请连接 GitHub 载入私有资料。');say('连接后，选择页面即可编辑并预览。');
}catch(e){const message=e instanceof Error?e.message:String(e);say('编辑器启动失败：'+message,true);cloud('编辑器启动失败：'+message,true);}
