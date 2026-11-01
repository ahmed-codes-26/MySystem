// Only clear what this app copied, never a newer clipboard value.
let clearTimer;
export async function copyAccountValue(value,onMessage) {
 await navigator.clipboard.writeText(value);
 clearTimeout(clearTimer);
 clearTimer=setTimeout(async()=>{
  try {if(await navigator.clipboard.readText()===value){await navigator.clipboard.writeText('');onMessage('Clipboard cleared.');}}
  catch {onMessage('Automatic clipboard clearing was blocked. Clear it manually if needed.');}
 },30000);
}
