import http from "k6/http";
import { check, sleep } from "k6";
import { thresholds } from "./lib/guard.js";
import { summary } from "./lib/summary.js";
if(__ENV.ALLOW_LOAD_TEST!=="true") throw new Error("Set ALLOW_LOAD_TEST=true.");
const url=(__ENV.SUPABASE_URL||"").replace(/\/$/,"");
const key=__ENV.SUPABASE_PUBLIC_KEY,email=__ENV.TEST_USER_EMAIL,password=__ENV.TEST_USER_PASSWORD;
if(!url||!key||!email||!password) throw new Error("SUPABASE_URL, SUPABASE_PUBLIC_KEY, TEST_USER_EMAIL and TEST_USER_PASSWORD are required.");
export const options={scenarios:{business_auth:{executor:"ramping-vus",startVUs:0,stages:[{duration:"20s",target:10},{duration:"40s",target:50},{duration:"40s",target:100},{duration:"20s",target:0}]}},thresholds:thresholds()};
export function setup(){const r=http.post(`${url}/auth/v1/token?grant_type=password`,JSON.stringify({email,password}),{headers:{apikey:key,"Content-Type":"application/json"}});if(!check(r,{"auth succeeds":x=>x.status===200})) throw new Error(`Auth failed ${r.status}`);const j=r.json();return {token:j.access_token,userId:j.user.id};}
function h(t){return {apikey:key,Authorization:`Bearer ${t}`,Accept:"application/json"};}
export default function businessAuthenticatedLoadTest(d){const p=http.get(`${url}/rest/v1/business_profiles?owner_id=eq.${d.userId}&select=id&limit=1`,{headers:h(d.token),tags:{product:"business",workflow:"profile"}});check(p,{"profile read":x=>x.status===200});const rows=p.status===200?p.json():[];const id=rows?.[0]?.id;if(id){const rs=http.batch([["GET",`${url}/rest/v1/services?business_id=eq.${id}&select=id,name,price,duration_minutes,is_active&limit=50`,null,{headers:h(d.token),tags:{product:"business",workflow:"services"}}],["GET",`${url}/rest/v1/bookings?business_id=eq.${id}&select=id,start_time,end_time,status,service_id&limit=100`,null,{headers:h(d.token),tags:{product:"business",workflow:"bookings"}}]]);check(rs[0],{"services read":x=>x.status===200});check(rs[1],{"bookings read":x=>x.status===200});}sleep(1);}
export function handleSummary(data){return summary("business-authenticated",data);}
