import bcrypt from 'bcryptjs';
import readline from 'node:readline';
if(process.argv.length>2)throw new Error('Run without password arguments; use hidden interactive input or stdin.');
async function readPassword(){
 if(!process.stdin.isTTY){let value='';for await(const chunk of process.stdin)value+=chunk;return value.replace(/\r?\n$/,'');}
 process.stderr.write('New password (hidden): ');readline.emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();
 return new Promise((resolve,reject)=>{let value='';const finish=()=>{process.stdin.setRawMode(false);process.stdin.pause();process.stdin.removeListener('keypress',key);process.stderr.write('\n');};const key=(text,pressed={})=>{if(pressed.ctrl&&pressed.name==='c'){finish();reject(new Error('Cancelled.'));}else if(pressed.name==='return'||pressed.name==='enter'){finish();resolve(value);}else if(pressed.name==='backspace'){value=Array.from(value).slice(0,-1).join('');}else if(text&&!pressed.ctrl&&!pressed.meta)value+=text;};process.stdin.on('keypress',key);});
}
const password=await readPassword();if(!password||Buffer.byteLength(password,'utf8')>72)throw new Error('Use 1–72 UTF-8 bytes for a bcrypt password.');
console.log(await bcrypt.hash(password,12));
