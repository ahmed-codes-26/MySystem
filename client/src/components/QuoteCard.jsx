import { date } from '../utils/dates';
// Small verified public-domain selection for the dashboard preview.
const quotes = [
  { text:'Well done is better than well said.', author:'Benjamin Franklin' },
  { text:'Nothing is so fatiguing as the eternal hanging on of an uncompleted task.', author:'William James' },
  { text:'I am not afraid of storms, for I am learning how to sail my ship.', author:'Louisa May Alcott' },
  { text:'You must do the thing you think you cannot do.', author:'Eleanor Roosevelt' },
];
export default function QuoteCard({ today }) { const dayOfYear = date(today).diff(date(`${date(today).year()}-01-01`),'day') + 1; const quote = quotes[dayOfYear % quotes.length]; return <section className="card quote-card"><span className="quote-mark" aria-hidden="true">“</span><div><span className="eyebrow">A LITTLE PERSPECTIVE</span><blockquote>{quote.text}</blockquote><p>— {quote.author}</p></div><span className="quote-decoration" aria-hidden="true">”</span></section>; }
