import {generateProp,propPreset} from '../packages/core/src/props';
import {inspectGeometry} from '../packages/core/src/inspection';

// Reproducible JSON character counts, NOT model-specific token or billing estimates.
const compact={name:'ladder',description:'Eight gold rungs.',materials:[{name:'gold',color:'#e3b34e'}],parts:[{name:'rung',group:'rungs',from:[-4,0,-1],to:[4,1,1],material:'gold',repeat:{count:8,step:[0,3,0]}}]};
const explicit={...compact,parts:Array.from({length:8},(_,i)=>({name:i?`rung_${i+1}`:'rung',group:'rungs',from:[-4,i*3,-1],to:[4,1+i*3,1],material:'gold'}))};
function compare(before:unknown,after:unknown){const originalCharacters=JSON.stringify(before).length,compactCharacters=JSON.stringify(after).length;return {originalCharacters,compactCharacters,reductionPercent:Math.round(1000*(1-compactCharacters/originalCharacters))/10};}
console.log(JSON.stringify({metric:'minified JSON characters (not billed tokens)',creationEightRungs:compare(explicit,compact),inspectionGeometry:Object.fromEntries((['bag','staff'] as const).map(name=>{const asset=generateProp(propPreset(name));return [name,compare(inspectGeometry(asset,'full'),inspectGeometry(asset))];})),limitations:'Excludes tool schemas, other response fields, prompts, reasoning, retries and host context. Actual token and cost savings depend on the model, host and design.'},null,2));
