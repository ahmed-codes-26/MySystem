import {connect} from './db.js';
import {Habit,Entry,Sleep,Password} from './models.js';
import {encrypt} from './encryption.js';
import {today} from './app.js';
import dayjs from 'dayjs';
try {
 await connect();const now=today(),names=['Fajr Prayer','Deep Work','Exercise','Read 20 Pages','Stay Hydrated','Daily Reflection'];
 await Habit.bulkWrite(names.map((name,i)=>({updateOne:{filter:{id:`sample-habit-${i}`},update:{$setOnInsert:{id:`sample-habit-${i}`,name,weight:[10,8,6,4,3,5][i],createdOn:dayjs(now).subtract(100,'day').format('YYYY-MM-DD'),order:i}},upsert:true}})));
 const habits=await Habit.find({id:{$in:names.map((_,i)=>`sample-habit-${i}`)}});const operations=[];
 habits.forEach((h,i)=>{for(let d=0;d<84;d++){const date=dayjs(now).subtract(d,'day').format('YYYY-MM-DD');operations.push({updateOne:{filter:{habitId:h.id,date},update:{$setOnInsert:{habitId:h.id,date,status:(d+i)%9===0?'missed':(d+i)%7===0?'skipped':'done',weightSnapshot:h.weight,nameSnapshot:h.name}},upsert:true}});}});
 await Entry.bulkWrite(operations);
 await Sleep.bulkWrite(Array.from({length:84},(_,d)=>{const date=dayjs(now).subtract(d,'day').format('YYYY-MM-DD');return {updateOne:{filter:{date},update:{$setOnInsert:{date,hours:6+(d%9)*.25}},upsert:true}};}));
 await Password.bulkWrite(['Demo Mail','Demo Academy','Demo Cloud'].map((name,i)=>({updateOne:{filter:{id:`sample-password-${i}`},update:{$setOnInsert:{id:`sample-password-${i}`,encrypted:encrypt({name,createdOn:new Date().toISOString(),fields:[{label:'Email',value:`demo${i}@example.invalid`},{label:'Password',value:'FAKE-SAMPLE-NOT-A-REAL-PASSWORD'},{label:'Account ID',value:`DEMO-${i+1}`}]},`vault:sample-password-${i}`)}},upsert:true}})));
 console.log('Sample data seeded: 6 habits, 84 days of entries/sleep and 3 fake accounts. Existing records preserved.');process.exit(0);
}catch{console.error('Seed failed. Check Atlas connection and server configuration.');process.exit(1);}
