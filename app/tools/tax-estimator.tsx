import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Disclaimer } from "@/components/Disclaimer";

// ─── 2025 Federal Tax Brackets (IRS Rev. Proc. 2024-40) ──────────────────────

type FilingStatus = "single" | "married" | "hoh";

const STANDARD_DEDUCTIONS: Record<FilingStatus, number> = {
  single: 15000,
  married: 30000,
  hoh: 22500,
};

// Brackets: [threshold, rate]. Income above the threshold is taxed at rate.
// Sorted ascending by threshold.
const BRACKETS: Record<FilingStatus, [number, number][]> = {
  single: [
    [0, 0.10],
    [11925, 0.12],
    [48475, 0.22],
    [103350, 0.24],
    [197300, 0.32],
    [250525, 0.35],
    [626350, 0.37],
  ],
  married: [
    [0, 0.10],
    [23850, 0.12],
    [96950, 0.22],
    [206700, 0.24],
    [394600, 0.32],
    [501050, 0.35],
    [751600, 0.37],
  ],
  hoh: [
    [0, 0.10],
    [17000, 0.12],
    [64850, 0.22],
    [103350, 0.24],
    [197300, 0.32],
    [250500, 0.35],
    [626350, 0.37],
  ],
};

// ─── Pure calculation ─────────────────────────────────────────────────────────

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

  // Self-employment tax: 15.3% on 92.35% of net SE income
  const seBase = netIncome * 0.9235;
  const selfEmploymentTax = seBase * 0.153;

  // Deductible portion of SE tax (above-the-line deduction)
  const seDeduction = selfEmploymentTax * 0.5;

  // Federal taxable income
  const federalTaxable = Math.max(
    netIncome - seDeduction - STANDARD_DEDUCTIONS[status],
    0
  );
  const federalIncomeTax = applyBrackets(federalTaxable, status);

  // State tax (simplified: flat rate on net income)
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

function fmt(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const FILING_STATUSES: { value: FilingStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "hoh", label: "Head of Household" },
];

export default function TaxEstimatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [gross, setGross] = useState("");
  const [expenses, setExpenses] = useState("");
  const [stateRate, setStateRate] = useState("5");
  const [status, setStatus] = useState<FilingStatus>("single");

  const result = calcTax(gross, expenses, stateRate, status);

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-900"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="flex-row items-center gap-3 px-4 pb-4"
      >
        <Pressable onPress={() => router.back()} hitSlop={8} className="rounded-full p-1">
          <ArrowLeft size={22} color="#7c3aed" />
        </Pressable>
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">
          Tax Estimator
        </Text>
      </View>

      <View className="px-4">
        {/* Gross income */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Gross Annual Income
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mr-1 text-lg text-zinc-400">$</Text>
          <TextInput
            value={gross}
            onChangeText={setGross}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
        </View>

        {/* Filing status */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Filing Status
        </Text>
        <View className="mb-5 gap-2">
          {FILING_STATUSES.map(({ value, label }) => {
            const active = status === value;
            return (
              <Pressable
                key={value}
                onPress={() => setStatus(value)}
                className={
                  active
                    ? "rounded-xl bg-violet-600 px-4 py-3"
                    : "rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800"
                }
              >
                <Text
                  className={
                    active
                      ? "font-semibold text-white"
                      : "font-semibold text-zinc-700 dark:text-zinc-300"
                  }
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Monthly business expenses */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Monthly Business Expenses
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mr-1 text-lg text-zinc-400">$</Text>
          <TextInput
            value={expenses}
            onChangeText={setExpenses}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">/ mo</Text>
        </View>

        {/* State tax rate */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          State Tax Rate
        </Text>
        <View className="mb-6 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={stateRate}
            onChangeText={setStateRate}
            keyboardType="decimal-pad"
            placeholder="5"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">%</Text>
        </View>

        {/* Results */}
        {result ? (
          <View className="gap-3">
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Federal Income Tax
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(result.federalIncomeTax)}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Self-Employment Tax
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(result.selfEmploymentTax)}
              </Text>
              <Text className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                15.3% on 92.35% of net income
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                State Tax
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(result.stateTax)}
              </Text>
              <Text className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                {stateRate}% flat rate on net income
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total Tax Burden
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(result.totalTax)}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Effective Tax Rate
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {result.effectiveRate.toFixed(1)}%
              </Text>
            </View>

            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Net Take-Home (Annual)
              </Text>
              <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
                {fmt(result.annualTakeHome)}
              </Text>
              <Text className="mt-0.5 text-sm font-semibold text-violet-600 dark:text-violet-300">
                {fmt(result.monthlyTakeHome)} / month
              </Text>
            </View>

            <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Recommended Monthly Holdback
              </Text>
              <Text className="mt-1 text-3xl font-bold text-amber-700 dark:text-amber-200">
                {fmt(result.monthlyHoldback)}
              </Text>
              <Text className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Set aside for federal + SE tax
              </Text>
            </View>

            <Text className="text-center text-xs text-zinc-400 dark:text-zinc-500">
              Based on 2025 federal tax brackets (IRS Rev. Proc. 2024-40). For reference only — consult a tax professional.
            </Text>
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Enter your gross income above to see your estimated tax breakdown
            </Text>
          </View>
        )}

        <Disclaimer variant="tax" />
      </View>
    </ScrollView>
  );
}
