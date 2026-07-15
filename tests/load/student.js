import http from "k6/http";
import { check, sleep } from "k6";
import { requireSafeBaseUrl, thresholds } from "./lib/guard.js";
import { summary } from "./lib/summary.js";
const base=requireSafeBaseUrl();
const route=__ENV.STUDENT_ROUTE||"/student/dashboard";
export const options={scenarios:{student:{executor:"ramping-vus",startVUs:0,stages:[{duration:"20s",target:10},{duration:"40s",target:50},{duration:"40s",target:100},{duration:"20s",target:0}]}},thresholds:thresholds()};
export default function studentLoadTest(){const r=http.get(`${base}${route}`,{redirects:0,tags:{product:"student",workflow:"route"}});check(r,{"student route responds":x=>x.status>=200&&x.status<400});sleep(1);}
export function handleSummary(data){return summary("student",data);}
