import {dashboard,validDate} from './financial-dashboard.mjs';
const iso=(y,m,d)=>String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
const lastDay=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
// A complete month compares to a complete month; partial months keep day numbers.
export function previousMonthPeriod(from,to){
 if(!validDate(from)||!validDate(to)||from>to)throw Error('invalid_period');
 if(from.slice(0,7)!==to.slice(0,7))return null;
 const [y,m,d]=from.split('-').map(Number),end=Number(to.slice(8));
 const py=m===1?y-1:y,pm=m===1?12:m-1;if(py<1)return null;
 const last=lastDay(py,pm),full=d===1&&end===lastDay(y,m);
 return {from:iso(py,pm,Math.min(d,last)),to:iso(py,pm,full?last:Math.min(end,last))};
}
export function monthComparison(data,from,to){
 const period=previousMonthPeriod(from,to);if(!period)return null;
 // Reuse the dashboard's active-entry and transfer rules, never recalculate balances.
 const current=dashboard(data,from,to),previous=dashboard(data,period.from,period.to);
 const metrics=['receitas','despesas','resultado'].map(key=>{const now=current[key],before=previous[key];return {key,current:now,previous:before,difference:now-before,percent:before>0&&now>=0?(now-before)/before*100:null};});
 return {from,to,previousFrom:period.from,previousTo:period.to,hasCurrentEntries:current.lancamentos.length>0,hasPreviousEntries:previous.lancamentos.length>0,metrics};
}
