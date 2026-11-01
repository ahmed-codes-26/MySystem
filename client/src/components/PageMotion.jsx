import { useEffect, useRef } from 'react';
export default function PageMotion({ children, route }) {
 const ref = useRef(null);
 useEffect(() => {
   if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
   const root = ref.current;
   const observer = new IntersectionObserver(items => {items.forEach(item => {if(item.isIntersecting) {item.target.classList.add('scroll-visible'); observer.unobserve(item.target);}});}, {threshold:.06});
   const scan = () => root.querySelectorAll('.card:not(.scroll-visible)').forEach(card => {if(card.closest('.dashboard-skeleton')) return; card.classList.add('scroll-ready'); const rect=card.getBoundingClientRect(); if(rect.top < window.innerHeight && rect.bottom > 0) card.classList.add('scroll-visible'); else observer.observe(card);});
   scan(); const mutation = new MutationObserver(scan); mutation.observe(root,{childList:true,subtree:true});
   return () => {observer.disconnect();mutation.disconnect();};
 },[route]);
 return <div ref={ref} className="page-motion">{children}</div>;
}
