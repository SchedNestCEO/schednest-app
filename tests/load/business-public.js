import http from "k6/http";
import { check, sleep } from "k6";
import { requireSafeBaseUrl, thresholds } from "./lib/guard.js";
import { summary } from "./lib/summary.js";
const base=requireSafeBaseUrl();
const slug=__ENV.PUBLIC_BOOKING_SLUG;
if(!slug) throw new Error("PUBLIC_BOOKING_SLUG is required.");
export const options={scenarios:{business:{executor:"ramping-vus",startVUs:0,stages:[{duration:"20s",target:10},{duration:"40s",target:50},{duration:"40s",target:100},{duration:"20s",target:0}]}},thresholds:thresholds()};
export default function businessPublicLoadTest() {const r=http.get(`${base}/book/${encodeURIComponent(slug)}`,{tags:{product:"business",workflow:"public_booking"}});check(r,{"booking page responds":x=>x.status>=200&&x.status<400});sleep(1);}
export function handleSummary(data){return summary("business-public",data);}
