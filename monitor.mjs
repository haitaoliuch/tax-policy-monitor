import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";

const ROOT = process.cwd();
const DOCS = path.join(ROOT, "docs");
const DATA = path.join(DOCS, "policies.json");
const ATT = path.join(DOCS, "attachments");
const HOME = "https://www.chinatax.gov.cn/";
const UA = "Mozilla/5.0 AppleWebKit/537.36 Chrome/130 Safari/537.36";
fs.mkdirSync(ATT,{recursive:true});

async function get(url){
  const r=await fetch(url,{headers:{"User-Agent":UA}});
  if(!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}
const clean=s=>(s||"").replace(/\s+/g," ").trim();
function norm(u){
  const x=new URL(u,HOME);
  if((x.hostname==="www.chinatax.gov.cn"||x.hostname==="chinatax.gov.cn")&&x.pathname.startsWith("/zcfgk/"))
    return "https://fgk.chinatax.gov.cn"+x.pathname+x.search;
  return x.href;
}
function dateOf(s){
  for(const re of [/成文日期[：:\s]*(20\d{2})[-年./](\d{1,2})[-月./](\d{1,2})/,/发布日期[：:\s]*(20\d{2})[-年./](\d{1,2})[-月./](\d{1,2})/,/(20\d{2})年(\d{1,2})月(\d{1,2})日/]){
    const m=s.match(re); if(m)return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
  } return "";
}
function docno(s){
  for(const re of [/(国家税务总局公告\s*20\d{2}年第\d+号)/,/([^\s，。；]{1,18}〔20\d{2}〕\d+号)/]){
    const m=s.match(re);if(m)return clean(m[1]);
  } return "";
}
function summary(body,d,n){
  let ss=body.split(/(?<=[。！？；])/).map(clean).filter(x=>x.length>15&&!/字体：|扫一扫|收藏|分享|订阅|语音播报/.test(x));
  const pick=(ks,k)=>ss.filter(x=>ks.some(z=>x.includes(z))).slice(0,k);
  const purpose=pick(["为进一步","为贯彻","为落实","为规范","为支持","为促进"],1);
  const key=pick(["免征","减征","退还","扣除","税率","征收","申报","缴纳","适用","纳税人","调整","取消","新增","优化","应当","可以"],4);
  const eff=pick(["自20","执行","施行","有效期","截止","至20"],2);
  const out=[]; if(n)out.push(`【文号】${n}`); if(d)out.push(`【发布日期】${d}`);
  if(purpose[0])out.push(`【政策目的】${purpose[0].slice(0,220)}`);
  out.push(`【核心内容】${(key.length?key:ss.slice(0,4)).map(x=>x.slice(0,220)).join(" ")||"请查看政策原文。"}`);
  if(eff.length)out.push(`【执行时间】${eff.map(x=>x.slice(0,200)).join(" ")}`);
  return out.join("\n");
}
function safe(s){return clean(s).replace(/[\\/:*?"<>|]/g,"_").slice(0,100)||"attachment"}
async function homeLinks(){
 const $=cheerio.load(await get(HOME)), out=[], seen=new Set();
 $("a[href]").each((_,a)=>{
   const href=$(a).attr("href")||"", title=clean($(a).text());
   if(href.includes("/zcfgk/")&&title.length>=8){
     const u=norm(href);if(!seen.has(u)){seen.add(u);out.push({title,url:u})}
   }
 });
 return out.slice(0,15);
}
async function one(item){
 const html=await get(item.url), $=cheerio.load(html), page=clean($.root().text());
 let body="";
 for(const sel of [".TRS_Editor",".content",".article-content","#zoom","article","main"]){
   const t=clean($(sel).text());if(t.length>body.length)body=t;
 }
 if(body.length<200)body=page;
 const title=clean($("h1").first().text())||clean($("h2").first().text())||item.title;
 const d=dateOf(page), n=docno(page), id=crypto.createHash("md5").update(item.url).digest("hex").slice(0,12);
 const attachments=[];
 for(const a of $("a[href]").toArray()){
   const href=$(a).attr("href")||"", name=clean($(a).text()), low=href.toLowerCase().split("?")[0];
   if(!(/\.(pdf|docx?|xlsx?|zip|rar|wps)$/.test(low)||name.includes("附件")))continue;
   try{
    const url=new URL(href,item.url).href, r=await fetch(url,{headers:{"User-Agent":UA}});
    if(!r.ok)continue;
    const ext=path.extname(new URL(url).pathname), dir=path.join(ATT,id);fs.mkdirSync(dir,{recursive:true});
    let file=safe(name);if(!path.extname(file)&&ext)file+=ext;
    const full=path.join(dir,file);fs.writeFileSync(full,Buffer.from(await r.arrayBuffer()));
    attachments.push({name:name||file,url,local_path:`./attachments/${id}/${file}`});
   }catch{}
 }
 return {id,title,publish_date:d,document_no:n,summary:summary(body,d,n),url:item.url,attachments,discovered_at:new Date().toISOString()};
}
let db={last_checked:"",policies:[]};
if(fs.existsSync(DATA)){try{db=JSON.parse(fs.readFileSync(DATA,"utf8"))}catch{}}
const known=new Set((db.policies||[]).flatMap(x=>[x.url,x.title]));
let added=0;
for(const item of await homeLinks()){
 if(known.has(item.url)||known.has(item.title))continue;
 try{
   const p=await one(item);db.policies.push(p);known.add(p.url);known.add(p.title);added++;
   console.log("新增:",p.title);
 }catch(e){console.error("失败:",item.title,e.message)}
}
db.last_checked=new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",dateStyle:"medium",timeStyle:"short"}).format(new Date());
db.policies.sort((a,b)=>(b.publish_date||"").localeCompare(a.publish_date||""));
fs.writeFileSync(DATA,JSON.stringify(db,null,2),"utf8");
console.log(`完成：新增 ${added} 条，累计 ${db.policies.length} 条`);
