import http from "k6/http";
import { check, sleep } from "k6";
import { requireSafeBaseUrl, thresholds } from "./lib/guard.js";
import { summary } from "./lib/summary.js";
const base=requireSafeBaseUrl(),slug=__ENV.PUBLIC_BOOKING_SLUG;
if(!slug) throw new Error("PUBLIC_BOOKING_SLUG is required.");
const routes={business:`/book/${encodeURIComponent(slug)}`,student:__ENV.STUDENT_ROUTE||"/student/dashboard",teams:__ENV.TEAMS_ROUTE||"/teams/dashboard",medical:__ENV.MEDICAL_ROUTE||"/med/dashboard",life:__ENV.LIFE_ROUTE||"/coming-soon"};
function s(exec,startTime){return {executor:"ramping-vus",exec,startTime,startVUs:0,stages:[{duration:"30s",target:25},{duration:"60s",target:100},{duration:"60s",target:100},{duration:"30s",target:0}]};}
export const options={scenarios:{business_100:s("business","0s"),student_100:s("student","10s"),teams_100:s("teams","20s"),medical_100:s("medical","30s"),life_100:s("life","40s")},thresholds:thresholds()};
function req(product){const r=http.get(`${base}${routes[product]}`,{redirects:0,tags:{product,workflow:"combined"}});check(r,{[`${product} responds`]:x=>x.status>=200&&x.status<400});sleep(1);}
export function business(){req("business");} export function student(){req("student");} export function teams(){req("teams");} export function medical(){req("medical");} export function life(){req("life");}
export function handleSummary(data){return summary("combined-five-products",data);}
