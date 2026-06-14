import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Pure calculations ───────────────────────────────────────────────────────

type CalcResult = {
  tipAmount: number;
  totalBill: number;
  perPerson: number;
};

function calculateTip(billStr: string, tipPct: number, people: number): CalcResult {
  const bill = parseFloat(billStr) || 0;
  const tipAmount = bill * (tipPct / 100);
  const totalBill = bill + tipAmount;
  const perPerson = people > 0 ? totalBill / people : 0;
  return { tipAmount, totalBill, perPerson };
}

type FromTotalResult = {
  originalBill: number;
  tipAmount: number;
  perPerson: number;
} | null;

function calcFromTotal(totalStr: string, tipPct: number, people: number): FromTotalResult {
  const total = parseFloat(totalStr);
  if (!total || total <= 0 || tipPct < 0 || people < 1) return null;
  const originalBill = total / (1 + tipPct / 100);
  const tipAmount = total - originalBill;
  const perPerson = total / people;
  return { originalBill, tipAmount, perPerson };
}

function fmt(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_TIPS = [10, 15, 18, 20, 25] as const;
type Mode = "calculate" | "from-total";

// ─── Component ───────────────────────────────────────────────────────────────

export default function TipCalculatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("calculate");
  const [bill, setBill] = useState("");
  const [total, setTotal] = useState("");
  const [selectedTip, setSelectedTip] = useState<number | "custom">(15);
  const [customTip, setCustomTip] = useState("");
  const [people, setPeople] = useState(1);

  const tipPct = selectedTip === "custom" ? parseFloat(customTip) || 0 : selectedTip;
  const calcResult = calculateTip(bill, tipPct, people);
  const fromTotalResult = calcFromTotal(total, tipPct, people);

  function increment() { setPeople((p) => Math.min(20, p + 1)); }
  function decrement() { setPeople((p) => Math.max(1, p - 1)); }

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
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="rounded-full p-1"
        >
          <ArrowLeft size={22} color="#7c3aed" />
        </Pressable>
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">
          Tip Calculator
        </Text>
      </View>

      <View className="px-4">
        {/* ── Mode Toggle ── */}
        <View className="mb-5 flex-row rounded-2xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          <Pressable
            onPress={() => setMode("calculate")}
            className={`flex-1 items-center rounded-xl py-2 ${
              mode === "calculate" ? "bg-violet-600" : ""
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                mode === "calculate"
                  ? "text-white"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Calculate Tip
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("from-total")}
            className={`flex-1 items-center rounded-xl py-2 ${
              mode === "from-total" ? "bg-violet-600" : ""
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                mode === "from-total"
                  ? "text-white"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Tip from Total
            </Text>
          </Pressable>
        </View>

        {/* ── Amount Input ── */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {mode === "calculate" ? "Bill Amount" : "Total Amount Paid"}
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mr-1 text-lg text-zinc-400">$</Text>
          {mode === "calculate" ? (
            <TextInput
              value={bill}
              onChangeText={setBill}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#a1a1aa"
              className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
            />
          ) : (
            <TextInput
              value={total}
              onChangeText={setTotal}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#a1a1aa"
              className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
            />
          )}
        </View>

        {/* ── Tip Percentage ── */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Tip Percentage
        </Text>
        <View className="mb-3 flex-row flex-wrap gap-2">
          {PRESET_TIPS.map((pct) => {
            const active = selectedTip === pct;
            return (
              <Pressable
                key={pct}
                onPress={() => setSelectedTip(pct)}
                className={
                  active
                    ? "rounded-xl bg-violet-600 px-4 py-2"
                    : "rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                }
              >
                <Text
                  className={
                    active
                      ? "font-semibold text-white"
                      : "font-semibold text-zinc-700 dark:text-zinc-300"
                  }
                >
                  {pct}%
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setSelectedTip("custom")}
            className={
              selectedTip === "custom"
                ? "rounded-xl bg-violet-600 px-4 py-2"
                : "rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            }
          >
            <Text
              className={
                selectedTip === "custom"
                  ? "font-semibold text-white"
                  : "font-semibold text-zinc-700 dark:text-zinc-300"
              }
            >
              Custom
            </Text>
          </Pressable>
        </View>

        {selectedTip === "custom" && (
          <View className="mb-5 flex-row items-center rounded-2xl border border-violet-400 bg-zinc-50 px-4 dark:bg-zinc-800">
            <TextInput
              value={customTip}
              onChangeText={setCustomTip}
              keyboardType="decimal-pad"
              placeholder="Enter %"
              placeholderTextColor="#a1a1aa"
              className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
              autoFocus
            />
            <Text className="ml-1 text-lg text-zinc-400">%</Text>
          </View>
        )}

        {/* ── Split Between ── */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Split Between
        </Text>
        <View className="mb-6 flex-row items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
          <Pressable
            onPress={decrement}
            disabled={people <= 1}
            className="h-9 w-9 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-700"
          >
            <Text className="text-xl font-bold text-zinc-700 dark:text-zinc-200">
              −
            </Text>
          </Pressable>
          <Text className="text-xl font-bold text-zinc-900 dark:text-white">
            {people} {people === 1 ? "person" : "people"}
          </Text>
          <Pressable
            onPress={increment}
            disabled={people >= 20}
            className="h-9 w-9 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-700"
          >
            <Text className="text-xl font-bold text-zinc-700 dark:text-zinc-200">
              +
            </Text>
          </Pressable>
        </View>

        {/* ── Results ── */}
        {mode === "calculate" ? (
          <View className="gap-3">
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Tip Amount
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(calcResult.tipAmount)}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total Bill
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(calcResult.totalBill)}
              </Text>
            </View>

            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Per Person
              </Text>
              <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
                {fmt(calcResult.perPerson)}
              </Text>
            </View>
          </View>
        ) : fromTotalResult === null ? (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Enter the total you paid to work out the original bill
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Original Bill
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(fromTotalResult.originalBill)}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Tip Amount
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(fromTotalResult.tipAmount)}
              </Text>
              <Text className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                {tipPct.toFixed(1)}% of original bill
              </Text>
            </View>

            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Per Person
              </Text>
              <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
                {fmt(fromTotalResult.perPerson)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
