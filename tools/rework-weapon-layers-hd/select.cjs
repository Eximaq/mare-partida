'use strict';
// Pure selection adapter only. Never guesses a compatible body or changes saved equipment.
function select(index, query) {
 if (!query || typeof query.baseFrameSHA256 !== 'string') return null;
 const record=index.records.find(r=>r.item===query.item && r.body===query.body && r.direction===query.direction);
 if(!record)return null;
 const state=record.states.find(s=>s.state===String(query.state));
 if(!state || state.requiredBaseSHA256!==query.baseFrameSHA256)return null;
 return {record,state,atomic:true};
}
module.exports={select};
