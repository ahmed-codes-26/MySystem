import mongoose from 'mongoose';
import { config } from './config.js';
export const connect = () => mongoose.connect(config.MONGODB_URI,{dbName:'mysystem',serverSelectionTimeoutMS:15000});
