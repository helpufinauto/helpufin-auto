export function calculateMonthly(price, deposit=0, rate=12, term=60){

  if(!price) return 0;

  const principal = Math.max(0, price - deposit);
  const monthlyRate = (rate / 100) / 12;

  if(monthlyRate === 0){
    return Math.round(principal / term);
  }

  const payment =
    (principal * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -term));

  return Math.round(payment);
}
