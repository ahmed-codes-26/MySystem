import mongoose from 'mongoose';
const {Schema,model} = mongoose;
export const Habit = model('Habit',new Schema({id:{type:String,unique:true},name:String,weight:Number,createdOn:String,archivedOn:{type:String,default:null},order:Number},{timestamps:true}));
const entry = new Schema({habitId:String,date:{type:String,index:true},status:String,weightSnapshot:Number,nameSnapshot:String});entry.index({habitId:1,date:1},{unique:true});
export const Entry = model('HabitEntry',entry);
export const Sleep = model('SleepLog',new Schema({date:{type:String,unique:true},hours:Number}));
export const Password = model('PasswordRecord',new Schema({id:{type:String,unique:true},encrypted:String},{timestamps:true}));
export const Session = model('Session',new Schema({id:{type:String,unique:true},expiresAt:{type:Date,expires:0},absoluteExpiresAt:{type:Date,default:()=>new Date(Date.now()+30*24*60*60*1000)}}));
export const LoginAttempt = model('LoginAttempt',new Schema({_id:String,count:Number,expiresAt:{type:Date,expires:0}}));
