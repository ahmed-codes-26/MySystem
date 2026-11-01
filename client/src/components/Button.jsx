import {forwardRef,useId,useImperativeHandle,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './Button.css';

const variants=new Set(['primary','secondary','ghost','destructive','icon']);
const Button=forwardRef(function Button({variant='secondary',size='default',loading=false,disabled=false,confirm=false,tooltip,title,className='',children,type='button',onMouseEnter,onMouseLeave,onFocus,onBlur,...props},ref){
 if(!variants.has(variant))throw new Error('Unsupported Button variant');
 const node=useRef(null),id=useId();const [tip,setTip]=useState(null);
 useImperativeHandle(ref,()=>node.current);
 const label=tooltip||title||props['aria-label'];
 function show(){if(variant!=='icon'||!label||!node.current)return;const rect=node.current.getBoundingClientRect();setTip({left:Math.max(70,Math.min(window.innerWidth-70,rect.left+rect.width/2)),top:rect.bottom+40>window.innerHeight?Math.max(6,rect.top-34):rect.bottom+6});}
 return <><button {...props} ref={node} type={type} disabled={disabled||loading} aria-busy={loading||undefined} aria-describedby={tip?id:props['aria-describedby']} title={variant==='icon'?undefined:title} className={`btn btn--${variant} ${size==='small'?'btn--small':''} ${confirm&&variant==='destructive'?'btn--confirm':''} ${className}`} onMouseEnter={e=>{if(matchMedia('(hover: hover) and (pointer: fine)').matches)show();onMouseEnter?.(e);}} onMouseLeave={e=>{setTip(null);onMouseLeave?.(e);}} onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))show();onFocus?.(e);}} onBlur={e=>{setTip(null);onBlur?.(e);}} onClickCapture={()=>setTip(null)}>{loading&&<span className="btn-spinner" aria-hidden="true"/>}{children}</button>{tip&&!disabled&&!loading&&createPortal(<span role="tooltip" id={id} className="btn-tooltip" style={tip}>{label}</span>,document.body)}</>;
});
export default Button;
