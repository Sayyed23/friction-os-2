import { shipments, vendorZShipments } from "./data";
import { reason } from "./reasoning";
import { createEmailAction, completeEmailAction } from "./actions";
export class WarehouseOpsAgent {
  readonly id="warehouse_ops"; readonly name="Warehouse / Ops Agent"; readonly persona="Warehouse / Floor Manager";
  trigger(){ return {vendor:"Shree Logistics",records:shipments}; }
  reason(records=this.trigger().records){ return reason(records); }
  planAction(records=this.trigger().records){ const analysis=this.reason(records); return analysis.sufficient?createEmailAction():null; }
  draftEmail(){return {to:"Shree Logistics",subject:"Recurring Delivery Delays - Checkpoint B",body:`Hi Shree Logistics Team,\n\nWe noticed that 14 of the 17 delayed shipments in our recent delivery history were associated with Checkpoint B.\n\nWe would like to discuss whether an alternate route can be used for upcoming shipments.\n\nPlease share available options and expected transit times.\n\nRegards,\nOperations Team`};}
  sendEmail(action:ReturnType<typeof createEmailAction>){return completeEmailAction(action);}
  lowEvidence(){return {vendor:"Vendor Z",records:vendorZShipments,reasoning:reason(vendorZShipments)};}
}
