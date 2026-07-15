import { readFile } from "node:fs/promises";
import process from "node:process";
const api=process.env.PERFORMANCE_API_URL,token=process.env.PERFORMANCE_ADMIN_TOKEN,path=process.env.LOAD_SUMMARY_PATH;
if(!api||!token||!path){console.error("PERFORMANCE_API_URL, PERFORMANCE_ADMIN_TOKEN and LOAD_SUMMARY_PATH are required.");process.exit(1)}
const summary=JSON.parse(await readFile(path,"utf8"));
const r=await fetch(api,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({action:"ingest_k6_summary",environment:process.env.LOAD_ENVIRONMENT||"staging",product:process.env.LOAD_PRODUCT||"platform",name:process.env.LOAD_RUN_NAME||summary.name||"k6 load test",summary})});
const j=await r.json().catch(()=>({}));if(!r.ok){console.error(j.error||`HTTP ${r.status}`);process.exit(1)}console.log(`Performance run ingested: ${j.run?.id||"created"}`);
