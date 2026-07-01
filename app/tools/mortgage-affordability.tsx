import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Disclaimer } from "@/components/Disclaimer";

// ─── Pure calculation ─────────────────────────────────────────────────────────

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
  // combined monthly rate for tax + insurance as fraction of home price
  const k = (propTaxRate + insuranceRate) / 100 / 12;

  // Solve: homePrice * (f + k) - down * f = maxPITI
  const homePrice = (maxPITI + down * f) / (f + k);
  if (homePrice <= 0) return null;

  const loanAmount = Math.max(homePrice - down, 0);
  const monthlyPandI = loanAmount * f;
  const monthlyTax = (homePrice * propTaxRate) / 100 / 12;
  const monthlyInsurance = (homePrice * insuranceRate) / 100 / 12;
  const totalMonthlyPITI = monthlyPandI + monthlyTax + monthlyInsurance;

  // Minimum income so that PITI = 28% of gross monthly
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

function fmt(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MortgageAffordabilityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [income, setIncome] = useState("");
  const [debts, setDebts] = useState("");
  const [down, setDown] = useState("");
  const [propTax, setPropTax] = useState("1.2");
  const [insurance, setInsurance] = useState("0.5");
  const [rate, setRate] = useState("7");
  const [term, setTerm] = useState<15 | 30>(30);

  const result = calcMortgage(income, debts, down, propTax, insurance, rate, term);

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
          Mortgage Affordability
        </Text>
      </View>

      <View className="px-4">
        {/* Annual gross income */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Annual Gross Income
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mr-1 text-lg text-zinc-400">$</Text>
          <TextInput
            value={income}
            onChangeText={setIncome}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
        </View>

        {/* Monthly debts */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Monthly Debt Payments
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mr-1 text-lg text-zinc-400">$</Text>
          <TextInput
            value={debts}
            onChangeText={setDebts}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">/ mo</Text>
        </View>

        {/* Down payment */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Down Payment Available
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mr-1 text-lg text-zinc-400">$</Text>
          <TextInput
            value={down}
            onChangeText={setDown}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
        </View>

        {/* Loan term */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Loan Term
        </Text>
        <View className="mb-5 flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {([15, 30] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTerm(t)}
              className={`flex-1 rounded-xl py-2.5 ${term === t ? "bg-violet-600" : ""}`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  term === t ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {t} Years
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Advanced inputs */}
        <View className="mb-6 gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Interest Rate
              </Text>
              <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
                <TextInput
                  value={rate}
                  onChangeText={setRate}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#a1a1aa"
                  className="flex-1 py-3 text-base text-zinc-900 dark:text-white"
                />
                <Text className="text-zinc-400">%</Text>
              </View>
            </View>
            <View className="flex-1">
              <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Property Tax
              </Text>
              <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
                <TextInput
                  value={propTax}
                  onChangeText={setPropTax}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#a1a1aa"
                  className="flex-1 py-3 text-base text-zinc-900 dark:text-white"
                />
                <Text className="text-zinc-400">%</Text>
              </View>
            </View>
          </View>
          <View className="w-1/2 pr-1.5">
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Insurance
            </Text>
            <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
              <TextInput
                value={insurance}
                onChangeText={setInsurance}
                keyboardType="decimal-pad"
                placeholderTextColor="#a1a1aa"
                className="flex-1 py-3 text-base text-zinc-900 dark:text-white"
              />
              <Text className="text-zinc-400">%</Text>
            </View>
          </View>
        </View>

        {/* Results */}
        {result === null ? (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Enter your income above to calculate affordability
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Maximum Home Price
              </Text>
              <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
                {fmt(result.maxHomePrice)}
              </Text>
              <Text className="mt-0.5 text-xs text-violet-500 dark:text-violet-400">
                Based on {result.limitingFactor === "front-end" ? "28% housing" : "36% total"} DTI limit
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Estimated Monthly Payment
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(result.totalMonthlyPITI)}
              </Text>
            </View>

            {/* Payment breakdown */}
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Payment Breakdown
              </Text>
              <View className="gap-2">
                {[
                  { label: "Principal & Interest", value: result.monthlyPandI },
                  { label: "Property Tax", value: result.monthlyTax },
                  { label: "Insurance", value: result.monthlyInsurance },
                ].map(({ label, value }) => (
                  <View key={label} className="flex-row justify-between">
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">{label}</Text>
                    <Text className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {fmt(value)} / mo
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Min. Recommended Income
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(result.minRequiredIncome)}
              </Text>
              <Text className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                Annual gross to stay within 28% housing DTI
              </Text>
            </View>

            <Text className="text-center text-xs text-zinc-400 dark:text-zinc-500">
              Based on 28% front-end and 36% back-end DTI guidelines. For reference only.
            </Text>
          </View>
        )}

        <Disclaimer variant="finance" />
      </View>
    </ScrollView>
  );
}
