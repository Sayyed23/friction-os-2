export type Shipment = { id: string; vendor: string; checkpoint: string; delayed: boolean; delayDays: number; driver: string; date: string };
const dates = ["2025-01-08","2025-01-13","2025-01-19","2025-01-24","2025-01-30","2025-02-04","2025-02-10","2025-02-15","2025-02-21","2025-02-27","2025-03-04","2025-03-10","2025-03-16","2025-03-22","2025-03-28","2025-04-02","2025-04-08"];
export const shipments: Shipment[] = dates.map((date, i) => ({ id: `SHP-${2401+i}`, vendor: "Shree Logistics", checkpoint: i < 14 ? "Checkpoint B" : i % 2 ? "Checkpoint A" : "Checkpoint C", delayed: true, delayDays: i < 14 ? [2,3,2,4,3,2,3,2,3,4,2,3,2,4][i] : 1, driver: ["A. Kumar","R. Singh","P. Das","M. Khan","S. Patel"][i % 5], date }));
export const vendorZShipments: Shipment[] = [
  {id:"VZ-01",vendor:"Vendor Z",checkpoint:"Checkpoint A",delayed:true,delayDays:2,driver:"R. Singh",date:"2025-04-02"},
  {id:"VZ-02",vendor:"Vendor Z",checkpoint:"Checkpoint B",delayed:false,delayDays:0,driver:"A. Kumar",date:"2025-04-08"}
];
