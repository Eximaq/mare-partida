export type SimulationPartition={index:number;count:number};
export function partition(value:SimulationPartition={index:0,count:1}){
 if(!Number.isInteger(value.count)||value.count<1||value.count>8||!Number.isInteger(value.index)||value.index<0||value.index>=value.count)throw Error('Invalid simulation partition');return value;
}
