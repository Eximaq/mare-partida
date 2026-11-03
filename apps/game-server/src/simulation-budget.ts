/** Soft wall-time budget. Yield only after a whole actor/room transaction commits.
 * At least one successful transaction can finish even if it exceeds the budget.
 * The next selection starts from the oldest persisted tick, not a catch-up queue. */
export function simulationBudget(maxMs=Infinity){
 if(maxMs!==Infinity&&(!Number.isFinite(maxMs)||maxMs<1||maxMs>1000))throw new RangeError('Invalid simulation budget');
 const started=performance.now();let committed=0;
 return {commit(){committed++;},exhausted(){return committed>0&&performance.now()-started>=maxMs;}};
}
