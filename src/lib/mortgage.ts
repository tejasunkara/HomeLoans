export interface PaymentInput {
  homePrice: number;
  downPayment: number;
  annualRate: number; // percent, e.g. 6.5
  termYears: number;
  annualPropertyTax: number;
  annualInsurance: number;
  monthlyHoa: number;
}

export interface PaymentBreakdown {
  loanAmount: number;
  principalAndInterest: number;
  propertyTax: number;
  insurance: number;
  pmi: number;
  hoa: number;
  total: number;
  totalInterest: number;
  loanToValue: number;
}

/** Annual PMI as a fraction of the loan amount, charged while LTV > 80%. */
export const PMI_RATE = 0.005;

export function monthlyPrincipalAndInterest(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  const n = termYears * 12;
  if (principal <= 0 || n <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function calculatePayment(input: PaymentInput): PaymentBreakdown {
  const loanAmount = Math.max(0, input.homePrice - input.downPayment);
  const pi = monthlyPrincipalAndInterest(loanAmount, input.annualRate, input.termYears);
  const loanToValue = input.homePrice > 0 ? loanAmount / input.homePrice : 0;
  const pmi = loanToValue > 0.8 ? (loanAmount * PMI_RATE) / 12 : 0;
  const propertyTax = input.annualPropertyTax / 12;
  const insurance = input.annualInsurance / 12;

  return {
    loanAmount,
    principalAndInterest: pi,
    propertyTax,
    insurance,
    pmi,
    hoa: input.monthlyHoa,
    total: pi + propertyTax + insurance + pmi + input.monthlyHoa,
    totalInterest: pi * input.termYears * 12 - loanAmount,
    loanToValue,
  };
}

export interface AmortizationYear {
  year: number;
  principalPaid: number;
  interestPaid: number;
  endingBalance: number;
}

export function amortizationByYear(
  principal: number,
  annualRate: number,
  termYears: number,
): AmortizationYear[] {
  const payment = monthlyPrincipalAndInterest(principal, annualRate, termYears);
  const r = annualRate / 100 / 12;
  const years: AmortizationYear[] = [];
  let balance = principal;

  for (let year = 1; year <= termYears; year++) {
    let principalPaid = 0;
    let interestPaid = 0;
    for (let m = 0; m < 12 && balance > 0; m++) {
      const interest = balance * r;
      const towardPrincipal = Math.min(payment - interest, balance);
      interestPaid += interest;
      principalPaid += towardPrincipal;
      balance -= towardPrincipal;
    }
    years.push({ year, principalPaid, interestPaid, endingBalance: Math.max(0, balance) });
  }
  return years;
}

export interface AffordabilityInput {
  annualIncome: number;
  monthlyDebts: number;
  downPayment: number;
  annualRate: number;
  termYears: number;
  /** Taxes + insurance + HOA as a monthly estimate. */
  monthlyEscrow: number;
  /** Max back-end debt-to-income ratio, e.g. 0.36. */
  maxDti?: number;
}

export interface AffordabilityResult {
  maxMonthlyHousing: number;
  maxPrincipalAndInterest: number;
  maxLoanAmount: number;
  maxHomePrice: number;
}

/** Inverse of the amortization formula: the principal a given payment supports. */
export function principalForPayment(
  payment: number,
  annualRate: number,
  termYears: number,
): number {
  const n = termYears * 12;
  if (payment <= 0 || n <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return payment * n;
  return (payment * (1 - Math.pow(1 + r, -n))) / r;
}

export function calculateAffordability(input: AffordabilityInput): AffordabilityResult {
  const maxDti = input.maxDti ?? 0.36;
  const monthlyIncome = input.annualIncome / 12;
  const maxMonthlyHousing = Math.max(0, monthlyIncome * maxDti - input.monthlyDebts);
  const maxPrincipalAndInterest = Math.max(0, maxMonthlyHousing - input.monthlyEscrow);
  const maxLoanAmount = principalForPayment(
    maxPrincipalAndInterest,
    input.annualRate,
    input.termYears,
  );
  return {
    maxMonthlyHousing,
    maxPrincipalAndInterest,
    maxLoanAmount,
    maxHomePrice: maxLoanAmount + input.downPayment,
  };
}

export interface RefinanceInput {
  currentBalance: number;
  currentRate: number;
  currentRemainingYears: number;
  newRate: number;
  newTermYears: number;
  closingCosts: number;
}

export interface RefinanceResult {
  currentPayment: number;
  newPayment: number;
  monthlySavings: number;
  /** Months until savings cover closing costs; null if the refi never breaks even. */
  breakEvenMonths: number | null;
  lifetimeInterestDelta: number;
}

export function calculateRefinance(input: RefinanceInput): RefinanceResult {
  const currentPayment = monthlyPrincipalAndInterest(
    input.currentBalance,
    input.currentRate,
    input.currentRemainingYears,
  );
  const newPayment = monthlyPrincipalAndInterest(
    input.currentBalance,
    input.newRate,
    input.newTermYears,
  );
  const monthlySavings = currentPayment - newPayment;
  const currentInterest = currentPayment * input.currentRemainingYears * 12 - input.currentBalance;
  const newInterest = newPayment * input.newTermYears * 12 - input.currentBalance;

  return {
    currentPayment,
    newPayment,
    monthlySavings,
    breakEvenMonths:
      monthlySavings > 0 ? Math.ceil(input.closingCosts / monthlySavings) : null,
    lifetimeInterestDelta: newInterest + input.closingCosts - currentInterest,
  };
}
