/**
 * Unit tests for the core calculation functions used in Vantage tool screens.
 * Functions are extracted verbatim from their respective screen files so these
 * tests validate the real production math without needing React Native imports.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. TAX ESTIMATOR
// Source: app/tools/tax-estimator.tsx
// ─────────────────────────────────────────────────────────────────────────────

type FilingStatus = "single" | "married" | "hoh";

const STANDARD_DEDUCTIONS: Record<FilingStatus, number> = {
  single: 15000,
  married: 30000,
  hoh: 22500,
};

const BRACKETS: Record<FilingStatus, [number, number][]> = {
  single: [
    [0, 0.1],
    [11925, 0.12],
    [48475, 0.22],
    [103350, 0.24],
    [197300, 0.32],
    [250525, 0.35],
    [626350, 0.37],
  ],
  married: [
    [0, 0.1],
    [23850, 0.12],
    [96950, 0.22],
    [206700, 0.24],
    [394600, 0.32],
    [501050, 0.35],
    [751600, 0.37],
  ],
  hoh: [
    [0, 0.1],
    [17000, 0.12],
    [64850, 0.22],
    [103350, 0.24],
    [197300, 0.32],
    [250500, 0.35],
    [626350, 0.37],
  ],
};

function applyBrackets(taxable: number, status: FilingStatus): number {
  if (taxable <= 0) return 0;
  const brackets = BRACKETS[status];
  let tax = 0;
  for (let i = brackets.length - 1; i >= 0; i--) {
    const [threshold, rate] = brackets[i];
    if (taxable > threshold) {
      tax += (taxable - threshold) * rate;
      taxable = threshold;
    }
  }
  return tax;
}

type TaxResult = {
  netIncome: number;
  selfEmploymentTax: number;
  federalIncomeTax: number;
  stateTax: number;
  totalTax: number;
  effectiveRate: number;
  annualTakeHome: number;
  monthlyTakeHome: number;
  monthlyHoldback: number;
};

function calcTax(
  grossStr: string,
  expensesStr: string,
  stateRateStr: string,
  status: FilingStatus
): TaxResult | null {
  const gross = parseFloat(grossStr) || 0;
  if (gross <= 0) return null;

  const annualExpenses = (parseFloat(expensesStr) || 0) * 12;
  const stateRate = parseFloat(stateRateStr) || 0;

  const netIncome = Math.max(gross - annualExpenses, 0);

  const seBase = netIncome * 0.9235;
  const selfEmploymentTax = seBase * 0.153;

  const seDeduction = selfEmploymentTax * 0.5;

  const federalTaxable = Math.max(
    netIncome - seDeduction - STANDARD_DEDUCTIONS[status],
    0
  );
  const federalIncomeTax = applyBrackets(federalTaxable, status);

  const stateTax = netIncome * (stateRate / 100);

  const totalTax = federalIncomeTax + selfEmploymentTax + stateTax;
  const effectiveRate = gross > 0 ? (totalTax / gross) * 100 : 0;
  const annualTakeHome = Math.max(netIncome - totalTax, 0);
  const monthlyTakeHome = annualTakeHome / 12;
  const monthlyHoldback = (federalIncomeTax + selfEmploymentTax) / 12;

  return {
    netIncome,
    selfEmploymentTax,
    federalIncomeTax,
    stateTax,
    totalTax,
    effectiveRate,
    annualTakeHome,
    monthlyTakeHome,
    monthlyHoldback,
  };
}

describe("Tax Estimator", () => {
  describe("Single filer, $50,000 gross, no expenses, 0% state", () => {
    // seBase = 50000 * 0.9235 = 46175
    // selfEmploymentTax = 46175 * 0.153 = 7064.775
    // seDeduction = 3532.3875
    // federalTaxable = 50000 - 3532.3875 - 15000 = 31467.6125
    // applyBrackets: hits 10% (0–11925) + 12% (11925–48475)
    //   tax = 11925*0.10 + (31467.6125-11925)*0.12 = 1192.5 + 2345.1135 = 3537.6135
    // totalTax = 3537.6135 + 7064.775 = 10602.3885
    // effectiveRate = 10602.3885/50000*100 ≈ 21.20%

    const result = calcTax("50000", "0", "0", "single") as TaxResult;

    test("returns a result", () => {
      expect(result).not.toBeNull();
    });

    test("self-employment tax ≈ $7,065 (15.3% of 92.35% of net)", () => {
      expect(result.selfEmploymentTax).toBeCloseTo(7064.78, 0);
    });

    test("federal income tax ≈ $3,538 (10%+12% brackets on taxable)", () => {
      expect(result.federalIncomeTax).toBeCloseTo(3537.61, 0);
    });

    test("state tax = $0 at 0% rate", () => {
      expect(result.stateTax).toBe(0);
    });

    test("effective rate ≈ 21.2% on gross (includes SE tax)", () => {
      expect(result.effectiveRate).toBeCloseTo(21.2, 0);
    });

    test("annual take-home ≈ $39,398", () => {
      expect(result.annualTakeHome).toBeCloseTo(39397.61, 0);
    });

    test("effective federal income tax rate < top bracket rate (12%)", () => {
      // federalIncomeTax / gross*100 should be < 12 since they never hit 22%
      const federalEffective = (result.federalIncomeTax / 50000) * 100;
      expect(federalEffective).toBeLessThan(12);
    });

    test("marginal bracket is 12% (taxable $31k < $48,475 threshold)", () => {
      // Taxable income of ~$31,468 sits in the 12% bracket (11925–48475)
      // so marginal rate is 12%, not 22%
      const federalEffective = (result.federalIncomeTax / 50000) * 100;
      expect(federalEffective).toBeLessThan(12);
      expect(federalEffective).toBeGreaterThan(0);
    });
  });

  describe("Married filing jointly, $120,000 gross, no expenses, 0% state", () => {
    // seBase = 120000 * 0.9235 = 110820
    // selfEmploymentTax = 110820 * 0.153 = 16955.46
    // seDeduction = 8477.73
    // federalTaxable = 120000 - 8477.73 - 30000 = 81522.27
    // applyBrackets: hits 10% (0–23850) + 12% (23850–96950)
    //   tax = 23850*0.10 + (81522.27-23850)*0.12 = 2385 + 6920.67 = 9305.67
    // totalTax = 9305.67 + 16955.46 = 26261.13
    // effectiveRate ≈ 21.88%

    const result = calcTax("120000", "0", "0", "married") as TaxResult;

    test("returns a result", () => {
      expect(result).not.toBeNull();
    });

    test("self-employment tax ≈ $16,955", () => {
      expect(result.selfEmploymentTax).toBeCloseTo(16955.46, 0);
    });

    test("federal income tax ≈ $9,306 (10%+12% brackets)", () => {
      expect(result.federalIncomeTax).toBeCloseTo(9305.67, 0);
    });

    test("effective rate ≈ 21.9% on gross", () => {
      expect(result.effectiveRate).toBeCloseTo(21.88, 0);
    });

    test("annual take-home ≈ $93,739", () => {
      expect(result.annualTakeHome).toBeCloseTo(93738.87, 0);
    });

    test("effective federal income tax rate < top bracket rate (12%)", () => {
      const federalEffective = (result.federalIncomeTax / 120000) * 100;
      // $81,522 taxable is still in the 12% bracket (< $96,950 married threshold)
      expect(federalEffective).toBeLessThan(12);
    });

    test("effective rate always < top bracket rate for both filers", () => {
      const singleResult = calcTax("50000", "0", "0", "single") as TaxResult;
      const marriedResult = calcTax("120000", "0", "0", "married") as TaxResult;
      const singleFedEffective = (singleResult.federalIncomeTax / 50000) * 100;
      const marriedFedEffective = (marriedResult.federalIncomeTax / 120000) * 100;
      // Both hit only the 12% bracket — effective must be < 12
      expect(singleFedEffective).toBeLessThan(12);
      expect(marriedFedEffective).toBeLessThan(12);
    });
  });

  test("returns null for zero/negative income", () => {
    expect(calcTax("0", "0", "0", "single")).toBeNull();
    expect(calcTax("-1000", "0", "0", "single")).toBeNull();
  });

  test("monthly holdback covers federal + SE only (not state)", () => {
    const result = calcTax("50000", "0", "5", "single") as TaxResult;
    const expectedHoldback =
      (result.federalIncomeTax + result.selfEmploymentTax) / 12;
    expect(result.monthlyHoldback).toBeCloseTo(expectedHoldback, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOAN PAYOFF
// Source: app/tools/loan-payoff.tsx
// ─────────────────────────────────────────────────────────────────────────────

type LoanResult =
  | { feasible: false }
  | {
      feasible: true;
      months: number;
      years: number;
      remainingMonths: number;
      totalPaid: number;
      totalInterest: number;
      interestPct: number;
    };

function calcLoanPayoff(
  balanceStr: string,
  rateStr: string,
  paymentStr: string
): LoanResult | null {
  const balance = parseFloat(balanceStr);
  const annualRate = parseFloat(rateStr);
  const payment = parseFloat(paymentStr);

  if (!balance || !payment || balance <= 0 || payment <= 0) return null;
  if (annualRate < 0) return null;

  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate > 0 && payment <= balance * monthlyRate) {
    return { feasible: false };
  }

  let months: number;
  if (monthlyRate === 0) {
    months = Math.ceil(balance / payment);
  } else {
    months = Math.ceil(
      -Math.log(1 - (balance * monthlyRate) / payment) /
        Math.log(1 + monthlyRate)
    );
  }

  const totalPaid = payment * months;
  const totalInterest = totalPaid - balance;
  const interestPct = (totalInterest / balance) * 100;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  return {
    feasible: true,
    months,
    years,
    remainingMonths,
    totalPaid,
    totalInterest,
    interestPct,
  };
}

describe("Loan Payoff", () => {
  describe("$10,000 balance, 5% APR, $200/month", () => {
    // monthlyRate = 0.05/12 ≈ 0.004167
    // n_exact = -ln(1 - 10000*0.004167/200) / ln(1.004167)
    //         = -ln(0.79167) / ln(1.004167)
    //         = 0.23361 / 0.004158 ≈ 56.18 → ceil = 57
    // totalPaid = 200 * 57 = 11400
    // totalInterest = 1400

    const result = calcLoanPayoff("10000", "5", "200") as Extract<
      LoanResult,
      { feasible: true }
    >;

    test("returns a feasible result", () => {
      expect(result).not.toBeNull();
      expect(result.feasible).toBe(true);
    });

    test("months to payoff = 57", () => {
      expect(result.months).toBe(57);
    });

    test("4 years, 9 months (57 / 12)", () => {
      expect(result.years).toBe(4);
      expect(result.remainingMonths).toBe(9);
    });

    test("total paid = $11,400 (200 × 57)", () => {
      expect(result.totalPaid).toBeCloseTo(11400, 0);
    });

    test("total interest ≈ $1,400 (totalPaid − balance)", () => {
      expect(result.totalInterest).toBeCloseTo(1400, 0);
    });

    test("interest as % of balance ≈ 14%", () => {
      expect(result.interestPct).toBeCloseTo(14.0, 0);
    });

    test("total interest formula: totalPaid - balance", () => {
      expect(result.totalInterest).toBeCloseTo(
        result.totalPaid - 10000,
        2
      );
    });
  });

  test("payment below interest accrual returns { feasible: false }", () => {
    // $10,000 at 5% → monthly interest = $41.67; payment of $40 is too low
    const result = calcLoanPayoff("10000", "5", "40");
    expect(result).not.toBeNull();
    expect((result as { feasible: boolean }).feasible).toBe(false);
  });

  test("0% APR uses simple division (no log formula)", () => {
    // $1,000 at 0% APR, $100/month → exactly 10 months
    const result = calcLoanPayoff("1000", "0", "100") as Extract<
      LoanResult,
      { feasible: true }
    >;
    expect(result.feasible).toBe(true);
    expect(result.months).toBe(10);
    expect(result.totalInterest).toBe(0);
  });

  test("higher payment → fewer months", () => {
    const slow = calcLoanPayoff("10000", "5", "200") as Extract<
      LoanResult,
      { feasible: true }
    >;
    const fast = calcLoanPayoff("10000", "5", "500") as Extract<
      LoanResult,
      { feasible: true }
    >;
    expect(fast.months).toBeLessThan(slow.months);
    expect(fast.totalInterest).toBeLessThan(slow.totalInterest);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. MORTGAGE AFFORDABILITY
// Source: app/tools/mortgage-affordability.tsx
// ─────────────────────────────────────────────────────────────────────────────

type MortgageResult = {
  maxHomePrice: number;
  loanAmount: number;
  monthlyPandI: number;
  monthlyTax: number;
  monthlyInsurance: number;
  totalMonthlyPITI: number;
  minRequiredIncome: number;
  limitingFactor: "front-end" | "back-end";
};

function monthlyPaymentFactor(annualRate: number, termYears: number): number {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return 1 / n;
  return (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcMortgage(
  incomeStr: string,
  debtsStr: string,
  downStr: string,
  propTaxStr: string,
  insuranceStr: string,
  rateStr: string,
  termYears: number
): MortgageResult | null {
  const income = parseFloat(incomeStr);
  const debts = parseFloat(debtsStr) || 0;
  const down = parseFloat(downStr) || 0;
  const propTaxRate = parseFloat(propTaxStr) || 1.2;
  const insuranceRate = parseFloat(insuranceStr) || 0.5;
  const annualRate = parseFloat(rateStr) || 7;

  if (!income || income <= 0) return null;

  const grossMonthly = income / 12;
  const maxPITI_front = grossMonthly * 0.28;
  const maxPITI_back = Math.max(grossMonthly * 0.36 - debts, 0);
  const maxPITI = Math.min(maxPITI_front, maxPITI_back);
  const limitingFactor: "front-end" | "back-end" =
    maxPITI_front <= maxPITI_back ? "front-end" : "back-end";

  const f = monthlyPaymentFactor(annualRate, termYears);
  const k = (propTaxRate + insuranceRate) / 100 / 12;

  const homePrice = (maxPITI + down * f) / (f + k);
  if (homePrice <= 0) return null;

  const loanAmount = Math.max(homePrice - down, 0);
  const monthlyPandI = loanAmount * f;
  const monthlyTax = (homePrice * propTaxRate) / 100 / 12;
  const monthlyInsurance = (homePrice * insuranceRate) / 100 / 12;
  const totalMonthlyPITI = monthlyPandI + monthlyTax + monthlyInsurance;

  const minRequiredIncome = (totalMonthlyPITI / 0.28) * 12;

  return {
    maxHomePrice: homePrice,
    loanAmount,
    monthlyPandI,
    monthlyTax,
    monthlyInsurance,
    totalMonthlyPITI,
    minRequiredIncome,
    limitingFactor,
  };
}

describe("Mortgage Affordability", () => {
  describe("$80k income, $500 monthly debts, $40k down, 7% / 30yr / 1.2% tax / 0.5% insurance", () => {
    // grossMonthly = 6666.67
    // maxPITI_front = 6666.67 * 0.28 = 1866.67
    // maxPITI_back  = 6666.67 * 0.36 - 500 = 2400 - 500 = 1900
    // maxPITI = min(1866.67, 1900) = 1866.67  → front-end is limiting

    const result = calcMortgage(
      "80000",
      "500",
      "40000",
      "1.2",
      "0.5",
      "7",
      30
    ) as MortgageResult;

    test("returns a result", () => {
      expect(result).not.toBeNull();
    });

    test("front-end DTI (28%) is the limiting factor", () => {
      expect(result.limitingFactor).toBe("front-end");
    });

    test("PITI ≤ 28% of gross monthly income (front-end DTI)", () => {
      const grossMonthly = 80000 / 12;
      const frontEndDTI = result.totalMonthlyPITI / grossMonthly;
      expect(frontEndDTI).toBeCloseTo(0.28, 2);
    });

    test("back-end DTI (PITI + debts) ≤ 36% of gross monthly", () => {
      const grossMonthly = 80000 / 12;
      const backEndDTI = (result.totalMonthlyPITI + 500) / grossMonthly;
      expect(backEndDTI).toBeLessThanOrEqual(0.36 + 0.01); // within rounding
    });

    test("loan amount = home price − down payment", () => {
      expect(result.loanAmount).toBeCloseTo(
        result.maxHomePrice - 40000,
        0
      );
    });

    test("PITI = P&I + tax + insurance (internal consistency)", () => {
      expect(result.totalMonthlyPITI).toBeCloseTo(
        result.monthlyPandI + result.monthlyTax + result.monthlyInsurance,
        2
      );
    });

    test("back-end DTI is relaxed: $500 debt leaves room above front-end limit", () => {
      // back-end PITI capacity = grossMonthly*0.36 - 500 = 1900
      // front-end capacity = 1866.67 < 1900, so front-end binds
      const grossMonthly = 80000 / 12;
      const backEndCapacity = grossMonthly * 0.36 - 500;
      const frontEndCapacity = grossMonthly * 0.28;
      expect(frontEndCapacity).toBeLessThan(backEndCapacity);
    });
  });

  test("high debt load flips limiting factor to back-end", () => {
    // With $2000/month debts, back-end becomes tighter than front-end
    const result = calcMortgage(
      "80000",
      "2000",
      "0",
      "1.2",
      "0.5",
      "7",
      30
    ) as MortgageResult;
    expect(result).not.toBeNull();
    expect(result.limitingFactor).toBe("back-end");
  });

  test("returns null for zero income", () => {
    expect(calcMortgage("0", "0", "0", "1.2", "0.5", "7", 30)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. BMI CALCULATOR
// Source: app/tools/bmi-calculator.tsx
// ─────────────────────────────────────────────────────────────────────────────

type BMIUnit = "metric" | "imperial";

type BMIResult = {
  bmi: number;
  category: string;
  categoryColor: string;
  barPosition: number;
  minHealthyWeight: string;
  maxHealthyWeight: string;
};

function bmiCategory(bmi: number): { category: string; categoryColor: string } {
  if (bmi < 18.5)
    return {
      category: "Underweight",
      categoryColor: "text-blue-500 dark:text-blue-400",
    };
  if (bmi < 25)
    return {
      category: "Normal",
      categoryColor: "text-emerald-600 dark:text-emerald-400",
    };
  if (bmi < 30)
    return {
      category: "Overweight",
      categoryColor: "text-amber-500 dark:text-amber-400",
    };
  return { category: "Obese", categoryColor: "text-red-500 dark:text-red-400" };
}

const BMI_SCALE_MIN = 10;
const BMI_SCALE_MAX = 45;

function calcBMI(
  heightStr: string,
  weightStr: string,
  unit: BMIUnit
): BMIResult | null {
  const height = parseFloat(heightStr);
  const weight = parseFloat(weightStr);
  if (!height || !weight || height <= 0 || weight <= 0) return null;

  let bmi: number;
  let minHealthyKg: number;
  let maxHealthyKg: number;
  let heightM: number;

  if (unit === "metric") {
    heightM = height / 100;
    bmi = weight / (heightM * heightM);
    minHealthyKg = 18.5 * heightM * heightM;
    maxHealthyKg = 24.9 * heightM * heightM;
  } else {
    bmi = (703 * weight) / (height * height);
    heightM = height * 0.0254;
    minHealthyKg = 18.5 * heightM * heightM;
    maxHealthyKg = 24.9 * heightM * heightM;
  }

  const { category, categoryColor } = bmiCategory(bmi);
  const barPosition = Math.min(
    Math.max((bmi - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN), 0),
    1
  );

  const minHealthyDisplay =
    unit === "metric"
      ? `${minHealthyKg.toFixed(1)} kg`
      : `${(minHealthyKg * 2.20462).toFixed(1)} lb`;
  const maxHealthyDisplay =
    unit === "metric"
      ? `${maxHealthyKg.toFixed(1)} kg`
      : `${(maxHealthyKg * 2.20462).toFixed(1)} lb`;

  return {
    bmi: Math.round(bmi * 10) / 10,
    category,
    categoryColor,
    barPosition,
    minHealthyWeight: minHealthyDisplay,
    maxHealthyWeight: maxHealthyDisplay,
  };
}

describe("BMI Calculator", () => {
  describe("Metric: 70 kg, 175 cm", () => {
    // bmi = 70 / 1.75² = 70 / 3.0625 = 22.857 → rounded = 22.9
    const result = calcBMI("175", "70", "metric") as BMIResult;

    test("returns a result", () => {
      expect(result).not.toBeNull();
    });

    test("BMI = 22.9", () => {
      expect(result.bmi).toBe(22.9);
    });

    test("category = Normal", () => {
      expect(result.category).toBe("Normal");
    });
  });

  describe("Imperial: 154 lb, 5 ft 9 in (69 inches)", () => {
    // bmi = (703 * 154) / 69² = 108262 / 4761 = 22.739 → rounded = 22.7
    const result = calcBMI("69", "154", "imperial") as BMIResult;

    test("returns a result", () => {
      expect(result).not.toBeNull();
    });

    test("BMI = 22.7", () => {
      expect(result.bmi).toBe(22.7);
    });

    test("category = Normal", () => {
      expect(result.category).toBe("Normal");
    });
  });

  describe("Category boundaries", () => {
    test("BMI 18.4 → Underweight", () => {
      expect(bmiCategory(18.4).category).toBe("Underweight");
    });

    test("BMI 18.5 → Normal (boundary is exclusive on the Underweight side)", () => {
      expect(bmiCategory(18.5).category).toBe("Normal");
    });

    test("BMI 24.9 → Normal", () => {
      expect(bmiCategory(24.9).category).toBe("Normal");
    });

    test("BMI 25.0 → Overweight (boundary is exclusive on the Normal side)", () => {
      expect(bmiCategory(25.0).category).toBe("Overweight");
    });

    test("BMI 29.9 → Overweight", () => {
      expect(bmiCategory(29.9).category).toBe("Overweight");
    });

    test("BMI 30.0 → Obese (boundary is exclusive on the Overweight side)", () => {
      expect(bmiCategory(30.0).category).toBe("Obese");
    });
  });

  test("returns null for zero or negative inputs", () => {
    expect(calcBMI("0", "70", "metric")).toBeNull();
    expect(calcBMI("175", "0", "metric")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. CALORIE DEFICIT
// Source: app/tools/calorie-deficit.tsx
// ─────────────────────────────────────────────────────────────────────────────

type Gender = "male" | "female";
type WeightUnit = "kg" | "lb";
type HeightUnit = "cm" | "ft";
type ActivityLevel = "sedentary" | "light" | "moderate" | "very" | "extra";
type Goal =
  | "lose1.5"
  | "lose1"
  | "lose0.5"
  | "maintain"
  | "gain0.5"
  | "gain1";

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  "lose1.5": -750,
  lose1: -500,
  "lose0.5": -250,
  maintain: 0,
  "gain0.5": 250,
  gain1: 500,
};

const GOAL_WEEKLY_LB: Record<Goal, number> = {
  "lose1.5": -1.5,
  lose1: -1,
  "lose0.5": -0.5,
  maintain: 0,
  "gain0.5": 0.5,
  gain1: 1,
};

function toKg(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value / 2.20462 : value;
}

function toCm(feet: number, inches: number): number {
  return feet * 30.48 + inches * 2.54;
}

type CalorieResult = {
  bmr: number;
  tdee: number;
  targetCalories: number;
  dailyDelta: number;
  weeksToGoal: number | null;
};

function calcCalories(
  ageStr: string,
  gender: Gender,
  heightUnit: HeightUnit,
  heightCmStr: string,
  heightFtStr: string,
  heightInStr: string,
  weightStr: string,
  weightUnit: WeightUnit,
  activity: ActivityLevel,
  goal: Goal,
  targetWeightStr: string
): CalorieResult | null {
  const age = parseFloat(ageStr);
  const weightRaw = parseFloat(weightStr);
  if (!age || !weightRaw || age <= 0 || weightRaw <= 0) return null;

  const weightKg = toKg(weightRaw, weightUnit);

  let heightCm: number;
  if (heightUnit === "cm") {
    heightCm = parseFloat(heightCmStr);
  } else {
    const ft = parseFloat(heightFtStr) || 0;
    const ins = parseFloat(heightInStr) || 0;
    heightCm = toCm(ft, ins);
  }
  if (!heightCm || heightCm <= 0) return null;

  const bmr =
    10 * weightKg +
    6.25 * heightCm -
    5 * age +
    (gender === "male" ? 5 : -161);

  const tdee = bmr * ACTIVITY_FACTORS[activity];
  const adjustment = GOAL_ADJUSTMENTS[goal];
  const targetCalories = Math.max(tdee + adjustment, 800);
  const dailyDelta = adjustment;

  let weeksToGoal: number | null = null;
  if (goal !== "maintain") {
    const weeklyLb = GOAL_WEEKLY_LB[goal];
    const targetRaw = parseFloat(targetWeightStr);
    if (targetRaw > 0) {
      const targetKg = toKg(targetRaw, weightUnit);
      const deltaKg = targetKg - weightKg;
      const weeklyKg = weeklyLb / 2.20462;
      if (Math.sign(deltaKg) === Math.sign(weeklyKg) && weeklyKg !== 0) {
        weeksToGoal = Math.ceil(Math.abs(deltaKg / weeklyKg));
      }
    }
  }

  return { bmr, tdee, targetCalories, dailyDelta, weeksToGoal };
}

describe("Calorie Deficit Calculator", () => {
  describe("Male, age 30, 180 cm, 80 kg, moderately active", () => {
    // Mifflin-St Jeor: 10*80 + 6.25*180 - 5*30 + 5 = 800+1125-150+5 = 1780
    // TDEE (moderate 1.55): 1780 * 1.55 = 2759

    const result = calcCalories(
      "30",
      "male",
      "cm",
      "180",
      "",
      "",
      "80",
      "kg",
      "moderate",
      "maintain",
      ""
    ) as CalorieResult;

    test("returns a result", () => {
      expect(result).not.toBeNull();
    });

    test("BMR = 1780 kcal (Mifflin-St Jeor)", () => {
      expect(result.bmr).toBeCloseTo(1780, 0);
    });

    test("TDEE = 2759 kcal (BMR × 1.55 moderate factor)", () => {
      expect(result.tdee).toBeCloseTo(2759, 0);
    });

    test("target calories = TDEE when goal is maintain", () => {
      expect(result.targetCalories).toBeCloseTo(result.tdee, 0);
    });
  });

  describe("Activity level multipliers (male 30, 180cm, 80kg)", () => {
    // BMR = 1780 for this profile
    const bmr = 1780;

    function tdeeFor(activity: ActivityLevel): number {
      const r = calcCalories(
        "30", "male", "cm", "180", "", "", "80", "kg",
        activity, "maintain", ""
      ) as CalorieResult;
      return r.tdee;
    }

    test("sedentary: BMR × 1.2 = 2136", () => {
      expect(tdeeFor("sedentary")).toBeCloseTo(bmr * 1.2, 0);
    });

    test("lightly active: BMR × 1.375 = 2447.5", () => {
      expect(tdeeFor("light")).toBeCloseTo(bmr * 1.375, 0);
    });

    test("moderately active: BMR × 1.55 = 2759", () => {
      expect(tdeeFor("moderate")).toBeCloseTo(bmr * 1.55, 0);
    });

    test("very active: BMR × 1.725 = 3070.5", () => {
      expect(tdeeFor("very")).toBeCloseTo(bmr * 1.725, 0);
    });

    test("extra active: BMR × 1.9 = 3382", () => {
      expect(tdeeFor("extra")).toBeCloseTo(bmr * 1.9, 0);
    });

    test("TDEE strictly increases with each activity level", () => {
      const levels: ActivityLevel[] = [
        "sedentary", "light", "moderate", "very", "extra"
      ];
      const values = levels.map(tdeeFor);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  test("female BMR uses -161 constant instead of +5", () => {
    // Male: 10*80 + 6.25*180 - 5*30 + 5  = 1780
    // Female: same but -161               = 1614
    const male = calcCalories(
      "30", "male", "cm", "180", "", "", "80", "kg",
      "moderate", "maintain", ""
    ) as CalorieResult;
    const female = calcCalories(
      "30", "female", "cm", "180", "", "", "80", "kg",
      "moderate", "maintain", ""
    ) as CalorieResult;
    expect(male.bmr - female.bmr).toBeCloseTo(166, 0); // 5 - (-161) = 166
  });

  test("goal adjustments shift target calories correctly", () => {
    const base = calcCalories(
      "30", "male", "cm", "180", "", "", "80", "kg",
      "moderate", "maintain", ""
    ) as CalorieResult;
    const lose1 = calcCalories(
      "30", "male", "cm", "180", "", "", "80", "kg",
      "moderate", "lose1", ""
    ) as CalorieResult;
    expect(base.tdee - lose1.targetCalories).toBeCloseTo(500, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. BODY FAT (US Navy Method)
// Source: app/tools/body-fat.tsx
// ─────────────────────────────────────────────────────────────────────────────

type BodyFatGender = "male" | "female";
type MeasurementUnit = "cm" | "in";

function toCmMeasure(value: number, unit: MeasurementUnit): number {
  return unit === "in" ? value * 2.54 : value;
}

type BodyFatResult = {
  bodyFatPct: number;
  fatMassKg: number;
  fatMassLb: number;
  leanMassKg: number;
  leanMassLb: number;
  category: string;
  categoryColor: string;
  categoryDescription: string;
};

const MALE_CATEGORIES: Array<{
  max: number;
  label: string;
  color: string;
  description: string;
}> = [
  {
    max: 6,
    label: "Essential Fat",
    color: "#3b82f6",
    description: "Minimum fat necessary for basic physiological functions.",
  },
  {
    max: 14,
    label: "Athletes",
    color: "#22c55e",
    description: "Typical of competitive athletes with very lean physiques.",
  },
  {
    max: 18,
    label: "Fitness",
    color: "#a3e635",
    description: "Lean and fit. Common among active individuals.",
  },
  {
    max: 25,
    label: "Acceptable",
    color: "#f59e0b",
    description: "Average range. Healthy but with room for improvement.",
  },
  {
    max: Infinity,
    label: "Obese",
    color: "#ef4444",
    description: "Above healthy range. Associated with increased health risks.",
  },
];

const FEMALE_CATEGORIES: Array<{
  max: number;
  label: string;
  color: string;
  description: string;
}> = [
  {
    max: 14,
    label: "Essential Fat",
    color: "#3b82f6",
    description: "Minimum fat necessary for basic physiological functions.",
  },
  {
    max: 21,
    label: "Athletes",
    color: "#22c55e",
    description: "Typical of competitive athletes with very lean physiques.",
  },
  {
    max: 25,
    label: "Fitness",
    color: "#a3e635",
    description: "Lean and fit. Common among active individuals.",
  },
  {
    max: 32,
    label: "Acceptable",
    color: "#f59e0b",
    description: "Average range. Healthy but with room for improvement.",
  },
  {
    max: Infinity,
    label: "Obese",
    color: "#ef4444",
    description: "Above healthy range. Associated with increased health risks.",
  },
];

function getCategory(
  bodyFatPct: number,
  gender: BodyFatGender
): { label: string; color: string; description: string } {
  const cats = gender === "male" ? MALE_CATEGORIES : FEMALE_CATEGORIES;
  return cats.find((c) => bodyFatPct <= c.max) ?? cats[cats.length - 1];
}

function calcBodyFat(
  gender: BodyFatGender,
  unit: MeasurementUnit,
  weightStr: string,
  heightStr: string,
  neckStr: string,
  waistStr: string,
  hipStr: string
): BodyFatResult | null {
  const weightKg = parseFloat(weightStr);
  const heightRaw = parseFloat(heightStr);
  const neckRaw = parseFloat(neckStr);
  const waistRaw = parseFloat(waistStr);

  if (!weightKg || !heightRaw || !neckRaw || !waistRaw) return null;
  if (weightKg <= 0 || heightRaw <= 0 || neckRaw <= 0 || waistRaw <= 0)
    return null;

  const height = toCmMeasure(heightRaw, unit);
  const neck = toCmMeasure(neckRaw, unit);
  const waist = toCmMeasure(waistRaw, unit);

  let bodyFatPct: number;

  if (gender === "male") {
    const diff = waist - neck;
    if (diff <= 0) return null;
    bodyFatPct =
      495 /
        (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(height)) -
      450;
  } else {
    const hipRaw = parseFloat(hipStr);
    if (!hipRaw || hipRaw <= 0) return null;
    const hip = toCmMeasure(hipRaw, unit);
    const sum = waist + hip - neck;
    if (sum <= 0) return null;
    bodyFatPct =
      495 /
        (1.29579 -
          0.35004 * Math.log10(sum) +
          0.221 * Math.log10(height)) -
      450;
  }

  if (!isFinite(bodyFatPct) || bodyFatPct < 0 || bodyFatPct > 70) return null;

  const fatMassKg = (bodyFatPct / 100) * weightKg;
  const leanMassKg = weightKg - fatMassKg;
  const cat = getCategory(bodyFatPct, gender);

  return {
    bodyFatPct,
    fatMassKg,
    fatMassLb: fatMassKg * 2.20462,
    leanMassKg,
    leanMassLb: leanMassKg * 2.20462,
    category: cat.label,
    categoryColor: cat.color,
    categoryDescription: cat.description,
  };
}

describe("Body Fat % (US Navy Method)", () => {
  describe("Male: 80 kg, height 177 cm, neck 37 cm, waist 85 cm", () => {
    // diff = waist - neck = 48 cm
    // log10(48) ≈ 1.68124,  log10(177) ≈ 2.24797
    // denom = 1.0324 - 0.19077*1.68124 + 0.15456*2.24797
    //       = 1.0324 - 0.32073 + 0.34743 ≈ 1.05910
    // bodyFat = 495/1.05910 - 450 ≈ 17.4%
    // category: Fitness (≤18% for males)

    const result = calcBodyFat(
      "male",
      "cm",
      "80",
      "177",
      "37",
      "85",
      ""
    ) as BodyFatResult;

    test("returns a result", () => {
      expect(result).not.toBeNull();
    });

    test("body fat ≈ 17.4% (US Navy formula)", () => {
      expect(result.bodyFatPct).toBeCloseTo(17.4, 0);
    });

    test("category = Fitness (14%–18% range for males)", () => {
      expect(result.category).toBe("Fitness");
    });

    test("fat mass + lean mass = total body weight", () => {
      expect(result.fatMassKg + result.leanMassKg).toBeCloseTo(80, 4);
    });

    test("lb values are consistent (kg × 2.20462)", () => {
      expect(result.fatMassLb).toBeCloseTo(result.fatMassKg * 2.20462, 3);
      expect(result.leanMassLb).toBeCloseTo(result.leanMassKg * 2.20462, 3);
    });
  });

  test("returns null when waist ≤ neck (invalid measurement)", () => {
    // waist 35 < neck 37 → diff = -2, log10 undefined → null
    expect(calcBodyFat("male", "cm", "80", "177", "37", "35", "")).toBeNull();
  });

  test("imperial inputs produce same result as equivalent cm inputs", () => {
    // 177 cm ≈ 69.69 in, 37 cm ≈ 14.57 in, 85 cm ≈ 33.46 in, 80 kg (weight stays kg)
    const cmResult = calcBodyFat(
      "male", "cm", "80", "177", "37", "85", ""
    ) as BodyFatResult;
    const inResult = calcBodyFat(
      "male",
      "in",
      "80",
      (177 / 2.54).toFixed(4),
      (37 / 2.54).toFixed(4),
      (85 / 2.54).toFixed(4),
      ""
    ) as BodyFatResult;
    expect(cmResult.bodyFatPct).toBeCloseTo(inResult.bodyFatPct, 3);
  });
});
