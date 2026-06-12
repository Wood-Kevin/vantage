import { useRouter } from "expo-router";
import { ArrowLeft, Minus, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Pure calculation ─────────────────────────────────────────────────────────

type TipResult = {
  originalBill: number;
  tipAmount: number;
  tipPerPerson: number;
  totalPerPerson: number;
};

function calcFromTotal(
  totalStr: string,
  tipPct: number,
  people: number
): TipResult | null {
  const total = parseFloat(totalStr);
  if (!total || total <= 0 || tipPct < 0 || people < 1) return null;
  const originalBill = total / (1 + tipPct / 100);
  const tipAmount = total - originalBill;
  return {
    originalBill,
    tipAmount,
    tipPerPerson: tipAmount / people,
    totalPerPerson: total / people,
  };
}

function fmtCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const PRESET_TIPS = [10, 15, 18, 20, 25] as const;

export default function TipFromTotalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [total, setTotal] = useState("");
  const [selectedTip, setSelectedTip] = useState<number | "custom">(20);
  const [customTip, setCustomTip] = useState("");
  const [people, setPeople] = useState(1);

  const activeTipPct =
    selectedTip === "custom" ? parseFloat(customTip) || 0 : selectedTip;
  const result = calcFromTotal(total, activeTipPct, people);

  function increment() {
    setPeople((p) => Math.min(20, p + 1));
  }
  function decrement() {
    setPeople((p) => Math.max(1, p - 1));
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-900"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center gap-3 px-4 pb-4">
        <Pressable onPress={() => router.back()} hitSlop={8} className="rounded-full p-1">
          <ArrowLeft size={22} color="#7c3aed" />
        </Pressable>
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">Tip from Total</Text>
      </View>

      <View className="px-4">
        {/* Total paid */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Total Amount Paid
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mr-1 text-lg text-zinc-400">$</Text>
          <TextInput
            value={total}
            onChangeText={setTotal}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
        </View>

        {/* Tip percentage */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Tip Percentage
        </Text>
        <View className="mb-3 flex-row gap-2">
          {PRESET_TIPS.map((pct) => (
            <Pressable
              key={pct}
              onPress={() => setSelectedTip(pct)}
              className={`flex-1 items-center rounded-xl py-2.5 ${
                selectedTip === pct
                  ? "bg-violet-600"
                  : "border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  selectedTip === pct ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {pct}%
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setSelectedTip("custom")}
            className={`flex-1 items-center rounded-xl py-2.5 ${
              selectedTip === "custom"
                ? "bg-violet-600"
                : "border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                selectedTip === "custom" ? "text-white" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Custom
            </Text>
          </Pressable>
        </View>

        {selectedTip === "custom" && (
          <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
            <TextInput
              value={customTip}
              onChangeText={setCustomTip}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#a1a1aa"
              autoFocus
              className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
            />
            <Text className="text-zinc-400">%</Text>
          </View>
        )}

        {/* Number of people */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Number of People
        </Text>
        <View className="mb-6 flex-row items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
          <Pressable onPress={decrement} hitSlop={8} disabled={people <= 1}>
            <Minus size={20} color={people <= 1 ? "#d4d4d8" : "#7c3aed"} />
          </Pressable>
          <Text className="text-lg font-bold text-zinc-900 dark:text-white">
            {people} {people === 1 ? "person" : "people"}
          </Text>
          <Pressable onPress={increment} hitSlop={8} disabled={people >= 20}>
            <Plus size={20} color={people >= 20 ? "#d4d4d8" : "#7c3aed"} />
          </Pressable>
        </View>

        {/* Results */}
        {result === null ? (
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
                {fmtCurrency(result.originalBill)}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Tip Amount
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmtCurrency(result.tipAmount)}
              </Text>
              <Text className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                {activeTipPct.toFixed(1)}% of original bill
              </Text>
            </View>

            {people > 1 && (
              <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Tip Per Person
                </Text>
                <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {fmtCurrency(result.tipPerPerson)}
                </Text>
              </View>
            )}

            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                {people > 1 ? "Total Per Person" : "Total Confirmed"}
              </Text>
              <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
                {fmtCurrency(result.totalPerPerson)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
