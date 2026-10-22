/** Shared chronological ordering for editor views, exports and public pages. */
export const DATE_SECTIONS=['experience','education','research','projects','goals','skills','honors','publications','contactLinks'];
export function parseDate(value){
 if(typeof value!=='string')return null;
 const m=value.trim().match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
 if(!m)return null;
 const year=Number(m[1]),month=m[2]?Number(m[2]):1,day=m[3]?Number(m[3]):1;
 if(year<1000||month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate())return null;
 return year*10000+month*100+day;
}
function existingDate(value){
 const text=String(value??'');
 const year=text.match(/\b(\d{4})\b/);
 if(!year)return null;
 const y=year[1],at=year.index;
 const iso=text.slice(at).match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?!\d)/);
 if(iso&&iso[2]){const result=parseDate(iso[0]);if(result!==null)return result;}
 const monthNames=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 const before=text.slice(0,at).match(/([A-Za-z]+)\s*$/);
 const month=before?monthNames.indexOf(before[1].slice(0,3).toLowerCase()):-1;
 return parseDate(month>=0?y+'-'+String(month+1).padStart(2,'0'):y);
}
export function entryStart(entry){
 const explicit=parseDate(entry?.startDate);
 if(explicit!==null)return explicit;
 return existingDate(entry?.period)??existingDate(entry?.year);
}
export function sortedEntryIndices(items=[]){
 return items.map((_,index)=>index).sort((a,b)=>{
  const first=entryStart(items[a]),second=entryStart(items[b]);
  if(first===second)return a-b;
  if(first===null)return 1;
  if(second===null)return -1;
  return second-first;
 });
}
export function sortEntries(items=[]){return sortedEntryIndices(items).map(i=>items[i]);}
export function chronologicalProfile(profile){
 const copy={...profile};
 for(const key of DATE_SECTIONS)if(Array.isArray(profile[key]))copy[key]=sortEntries(profile[key]);
 return copy;
}
export function homeSectionOrder(profile){
 const keys=['experience','education'];
 const newest=key=>Math.max(-Infinity,...(profile[key]||[]).map(entryStart).filter(x=>x!==null));
 const career=newest('experience'),education=newest('education');
 // A missing date cannot establish precedence; keep the requested Career-first default.
 if(career===-Infinity||education===-Infinity)return keys;
 return education>career?['education','experience']:keys;
}
