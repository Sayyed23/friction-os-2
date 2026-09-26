export type AgentAction = { id:string; type:"send_email"; title:string; status:"draft"|"completed"; originatingAgent:"warehouse_ops"; reasoningId:string; requiresHumanApproval:false; sentAt?:string };
export function createEmailAction():AgentAction{return {id:"action_001",type:"send_email",title:"Contact Shree Logistics",status:"draft",originatingAgent:"warehouse_ops",reasoningId:"reason_001",requiresHumanApproval:false};}
export function completeEmailAction(action:AgentAction):AgentAction{return {...action,status:"completed",sentAt:new Date().toISOString()};}
