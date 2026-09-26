import type { Shipment } from "./data";
export type Reasoning = { sampleSize:number; delayedCount:number; checkpoint:string; delaysAtCheckpoint:number; concentration:number; concentrationPercent:string; averageAtCheckpoint:number; averageElsewhere:number; confidence:"high"|"medium"|"low"; score:number; sufficient:boolean };
export function reason(records: Shipment[]): Reasoning {
  const delayed = records.filter(x => x.delayed);
  const counts = delayed.reduce<Record<string,number>>((a,x)=>(a[x.checkpoint]=(a[x.checkpoint]||0)+1,a),{});
  const checkpoint = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0] || "Unknown";
  const at = delayed.filter(x=>x.checkpoint===checkpoint), elsewhere = delayed.filter(x=>x.checkpoint!==checkpoint);
  const concentration = delayed.length ? at.length/delayed.length : 0;
  const confidence = delayed.length >= 10 && concentration >= .75 ? "high" : delayed.length >= 5 && concentration >= .5 ? "medium" : "low";
  const rawScore = Math.round(70 + 14*concentration + Math.min(records.length,20)*.35);
  const score = records.length < 5 ? Math.min(49, rawScore) : Math.min(99, rawScore);
  return {sampleSize:records.length,delayedCount:delayed.length,checkpoint,delaysAtCheckpoint:at.length,concentration,concentrationPercent:(concentration*100).toFixed(2),averageAtCheckpoint:at.length?at.reduce((s,x)=>s+x.delayDays,0)/at.length:0,averageElsewhere:elsewhere.length?elsewhere.reduce((s,x)=>s+x.delayDays,0)/elsewhere.length:0,confidence,score,sufficient:confidence!=="low"};
}
