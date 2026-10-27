import {
  amortizationByYear,
  calculateAffordability,
  calculatePayment,
  calculateRefinance,
  monthlyPrincipalAndInterest,
  principalForPayment,
} from '../mortgage';

describe('monthlyPrincipalAndInterest', () => {
  it('matches the standard amortization formula', () => {
    // $400k, 6%, 30y → $2,398.20 (published reference value)
    expect(monthlyPrincipalAndInterest(400_000, 6, 30)).toBeCloseTo(2398.2, 1);
  });

  it('handles a 0% rate as straight-line repayment', () => {
    expect(monthlyPrincipalAndInterest(120_000, 0, 10)).toBe(1000);
  });

  it('returns 0 for empty or invalid input', () => {
    expect(monthlyPrincipalAndInterest(0, 6, 30)).toBe(0);
    expect(monthlyPrincipalAndInterest(100_000, 6, 0)).toBe(0);
  });
});

describe('principalForPayment', () => {
  it('is the inverse of the payment formula', () => {
    const payment = monthlyPrincipalAndInterest(350_000, 6.875, 30);
    expect(principalForPayment(payment, 6.875, 30)).toBeCloseTo(350_000, 2);
  });
});

describe('calculatePayment', () => {
  const base = {
    homePrice: 500_000,
    downPayment: 100_000,
    annualRate: 6,
    termYears: 30,
    annualPropertyTax: 6_000,
    annualInsurance: 1_200,
    monthlyHoa: 50,
  };

  it('adds escrow and HOA to P&I with no PMI at 20% down', () => {
    const r = calculatePayment(base);
    expect(r.loanAmount).toBe(400_000);
    expect(r.pmi).toBe(0);
    expect(r.total).toBeCloseTo(2398.2 + 500 + 100 + 50, 1);
  });

  it('charges PMI when LTV exceeds 80%', () => {
    const r = calculatePayment({ ...base, downPayment: 25_000 });
    expect(r.loanToValue).toBeCloseTo(0.95);
    expect(r.pmi).toBeCloseTo((475_000 * 0.005) / 12);
  });

  it('never produces a negative loan amount', () => {
    expect(calculatePayment({ ...base, downPayment: 600_000 }).loanAmount).toBe(0);
  });
});

describe('amortizationByYear', () => {
  it('pays the balance to zero and principal sums to the loan', () => {
    const years = amortizationByYear(300_000, 6.5, 30);
    expect(years).toHaveLength(30);
    expect(years.at(-1)!.endingBalance).toBeCloseTo(0, 2);
    const principal = years.reduce((s, y) => s + y.principalPaid, 0);
    expect(principal).toBeCloseTo(300_000, 2);
  });

  it('front-loads interest', () => {
    const years = amortizationByYear(300_000, 6.5, 30);
    expect(years[0]!.interestPaid).toBeGreaterThan(years[0]!.principalPaid);
    expect(years[29]!.interestPaid).toBeLessThan(years[29]!.principalPaid);
  });
});

describe('calculateAffordability', () => {
  it('caps housing at 36% DTI minus existing debts', () => {
    const r = calculateAffordability({
      annualIncome: 120_000,
      monthlyDebts: 600,
      downPayment: 50_000,
      annualRate: 6,
      termYears: 30,
      monthlyEscrow: 600,
    });
    expect(r.maxMonthlyHousing).toBe(3000);
    expect(r.maxPrincipalAndInterest).toBe(2400);
    expect(r.maxHomePrice).toBeCloseTo(r.maxLoanAmount + 50_000);
  });

  it('returns zero when debts exceed the DTI budget', () => {
    const r = calculateAffordability({
      annualIncome: 30_000,
      monthlyDebts: 2_000,
      downPayment: 0,
      annualRate: 6,
      termYears: 30,
      monthlyEscrow: 300,
    });
    expect(r.maxLoanAmount).toBe(0);
  });
});

describe('calculateRefinance', () => {
  it('computes break-even from closing costs and savings', () => {
    const r = calculateRefinance({
      currentBalance: 300_000,
      currentRate: 7.5,
      currentRemainingYears: 30,
      newRate: 6,
      newTermYears: 30,
      closingCosts: 6_000,
    });
    expect(r.monthlySavings).toBeGreaterThan(0);
    expect(r.breakEvenMonths).toBe(Math.ceil(6_000 / r.monthlySavings));
    expect(r.lifetimeInterestDelta).toBeLessThan(0);
  });

  it('reports no break-even when the new payment is higher', () => {
    const r = calculateRefinance({
      currentBalance: 300_000,
      currentRate: 5,
      currentRemainingYears: 25,
      newRate: 7,
      newTermYears: 30,
      closingCosts: 4_000,
    });
    expect(r.breakEvenMonths).toBeNull();
  });
});
