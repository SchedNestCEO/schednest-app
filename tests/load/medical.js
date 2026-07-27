import http from "k6/http";
import { check, sleep } from "k6";
import { requireSafeBaseUrl, thresholds } from "./lib/guard.js";
import { summary } from "./lib/summary.js";
const base=requireSafeBaseUrl();
const route=__ENV.MEDICAL_ROUTE||"/med/dashboard";
export const options={scenarios:{medical:{executor:"ramping-vus",startVUs:0,stages:[{duration:"20s",target:10},{duration:"40s",target:50},{duration:"40s",target:100},{duration:"20s",target:0}]}},thresholds:thresholds()};
export default function medicalLoadTest() {const r=http.get(`${base}${route}`,{redirects:0,tags:{product:"medical",workflow:"route"}});check(r,{"medical route responds":x=>x.status>=200&&x.status<400});sleep(1);}
export function handleSummary(data){return summary("medical",data);}
