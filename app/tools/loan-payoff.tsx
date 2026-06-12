import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PremiumGate from "@/components/PremiumGate";
import { usePremium } from "@/lib/entitlements";

// ─── Pure calculation ─────────────────────────────────────────────────────────

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

  // Payment must exceed monthly interest accrual
  if (monthlyRate > 0 && payment <= balance * monthlyRate) {
    return { feasible: false };
  }

  let months: number;
  if (monthlyRate === 0) {
    months = Math.ceil(balance / payment);
  } else {
    months = Math.ceil(
      -Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate)
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

function fmt(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function timeLabel(years: number, months: number): string {
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mo`);
  return parts.join(" ") || "< 1 month";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoanPayoffScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = usePremium();

  const [balance, setBalance] = useState("");
  const [rate, setRate] = useState("");
  const [payment, setPayment] = useState("");

  if (isLoading) return null;
  if (!isPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-900">
        <PremiumGate toolName="Loan Payoff Calculator" onClose={() => router.back()} />
      </View>
    );
  }

  const result = calcLoanPayoff(balance, rate, payment);

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
          Loan Payoff Calculator
        </Text>
      </View>

      <View className="px-4">
        {/* Loan balance */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Loan Balance
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mr-1 text-lg text-zinc-400">$</Text>
          <TextInput
            value={balance}
            onChangeText={setBalance}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
        </View>

        {/* Annual interest rate */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Annual Interest Rate
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">%</Text>
        </View>

        {/* Monthly payment */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Monthly Payment
        </Text>
        <View className="mb-6 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mr-1 text-lg text-zinc-400">$</Text>
          <TextInput
            value={payment}
            onChangeText={setPayment}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
        </View>

        {/* Results */}
        {result === null ? (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Enter your loan details above to see the payoff timeline
            </Text>
          </View>
        ) : !result.feasible ? (
          <View className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <Text className="text-sm font-semibold text-red-600 dark:text-red-400">
              Payment too low
            </Text>
            <Text className="mt-1 text-xs text-red-500 dark:text-red-400">
              Your monthly payment doesn't cover the interest accrual. Increase your payment to pay off this loan.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Time to Pay Off
              </Text>
              <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
                {timeLabel(result.years, result.remainingMonths)}
              </Text>
              <Text className="mt-0.5 text-xs text-violet-500 dark:text-violet-400">
                {result.months} monthly payments
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total Amount Paid
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(result.totalPaid)}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total Interest Paid
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(result.totalInterest)}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Interest as % of Balance
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {result.interestPct.toFixed(1)}%
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
