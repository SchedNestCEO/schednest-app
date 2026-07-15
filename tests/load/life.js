import http from "k6/http";
import { check, sleep } from "k6";
import { requireSafeBaseUrl, thresholds } from "./lib/guard.js";
import { summary } from "./lib/summary.js";
const base=requireSafeBaseUrl();
const route=__ENV.LIFE_ROUTE||"/coming-soon";
export const options={scenarios:{life:{executor:"ramping-vus",startVUs:0,stages:[{duration:"20s",target:10},{duration:"40s",target:50},{duration:"40s",target:100},{duration:"20s",target:0}]}},thresholds:thresholds()};
export default function(){const r=http.get(`${base}${route}`,{redirects:0,tags:{product:"life",workflow:"route"}});check(r,{"life route responds":x=>x.status>=200&&x.status<400});sleep(1);}
export function handleSummary(data){return summary("life",data);}
