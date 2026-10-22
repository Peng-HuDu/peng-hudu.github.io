// Minimal ZIP generator for UTF-8 text files (uncompressed/store; no dependencies).
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
export function zipTextFiles(files){const encoder=new TextEncoder(),parts=[],directory=[];let offset=0;
const u16=(v)=>[v&255,(v>>>8)&255],u32=(v)=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
for(const [name,text] of Object.entries(files)){const n=encoder.encode(name),b=encoder.encode(text),crc=crc32(b);const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(b.length),...u32(b.length),...u16(n.length),...u16(0),...n]);parts.push(local,b);directory.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(b.length),...u32(b.length),...u16(n.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...n]));offset+=local.length+b.length;}
const directorySize=directory.reduce((s,x)=>s+x.length,0),end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(directory.length),...u16(directory.length),...u32(directorySize),...u32(offset),...u16(0)]);
return new Blob([...parts,...directory,end],{type:'application/zip'});
}
