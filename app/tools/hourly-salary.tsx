import { useRouter } from "expo-router";
import { ArrowLeft, ArrowLeftRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PremiumGate from "@/components/PremiumGate";
import { usePremium } from "@/lib/entitlements";

// ─── Pure calculation ─────────────────────────────────────────────────────────

type Mode = "hourly" | "salary";

type RateResult = {
  hourly: number;
  daily: number;
  weekly: number;
  biWeekly: number;
  monthly: number;
  annual: number;
};

function calcRates(
  valueStr: string,
  mode: Mode,
  hoursPerWeek: number,
  weeksPerYear: number
): RateResult | null {
  const value = parseFloat(valueStr);
  if (!value || value <= 0 || hoursPerWeek <= 0 || weeksPerYear <= 0) return null;

  const hourly =
    mode === "hourly" ? value : value / (hoursPerWeek * weeksPerYear);

  return {
    hourly,
    daily: hourly * 8,
    weekly: hourly * hoursPerWeek,
    biWeekly: hourly * hoursPerWeek * 2,
    monthly: (hourly * hoursPerWeek * weeksPerYear) / 12,
    annual: hourly * hoursPerWeek * weeksPerYear,
  };
}

function fmt(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const RESULT_ROWS: { key: keyof RateResult; label: string }[] = [
  { key: "hourly", label: "Hourly Rate" },
  { key: "daily", label: "Daily Rate (8 hrs)" },
  { key: "weekly", label: "Weekly Rate" },
  { key: "biWeekly", label: "Bi-Weekly Rate" },
  { key: "monthly", label: "Monthly Rate" },
  { key: "annual", label: "Annual Salary" },
];

export default function HourlySalaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = usePremium();

  const [mode, setMode] = useState<Mode>("hourly");
  const [value, setValue] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [weeksPerYear, setWeeksPerYear] = useState("52");

  if (isLoading) return null;
  if (!isPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-900">
        <PremiumGate toolName="Hourly ↔ Salary Converter" onClose={() => router.back()} />
      </View>
    );
  }

  const result = calcRates(
    value,
    mode,
    parseFloat(hoursPerWeek) || 40,
    parseFloat(weeksPerYear) || 52
  );

  function toggleMode() {
    // Carry the annual result into the opposing field to avoid losing context
    if (result) {
      if (mode === "hourly") {
        setValue(result.annual.toFixed(0));
      } else {
        setValue(result.hourly.toFixed(2));
      }
    } else {
      setValue("");
    }
    setMode((m) => (m === "hourly" ? "salary" : "hourly"));
  }

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
          Hourly ↔ Salary
        </Text>
      </View>

      <View className="px-4">
        {/* Mode toggle */}
        <View className="mb-5 flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {(["hourly", "salary"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              className={`flex-1 rounded-xl py-2.5 ${mode === m ? "bg-violet-600" : ""}`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  mode === m ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {m === "hourly" ? "From Hourly" : "From Annual Salary"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Value input */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {mode === "hourly" ? "Hourly Rate" : "Annual Salary"}
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mr-1 text-lg text-zinc-400">$</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder={mode === "hourly" ? "0.00" : "0"}
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
        </View>

        {/* Hours / weeks inputs */}
        <View className="mb-6 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Hours / Week
            </Text>
            <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
              <TextInput
                value={hoursPerWeek}
                onChangeText={setHoursPerWeek}
                keyboardType="decimal-pad"
                placeholderTextColor="#a1a1aa"
                className="flex-1 py-3 text-base text-zinc-900 dark:text-white"
              />
            </View>
          </View>
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Weeks / Year
            </Text>
            <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
              <TextInput
                value={weeksPerYear}
                onChangeText={setWeeksPerYear}
                keyboardType="decimal-pad"
                placeholderTextColor="#a1a1aa"
                className="flex-1 py-3 text-base text-zinc-900 dark:text-white"
              />
            </View>
          </View>
        </View>

        {/* Swap button */}
        <Pressable
          onPress={toggleMode}
          className="mb-6 flex-row items-center justify-center gap-2 rounded-2xl border border-zinc-200 py-3 dark:border-zinc-700"
        >
          <ArrowLeftRight size={16} color="#7c3aed" />
          <Text className="text-sm font-semibold text-violet-600">
            Swap direction
          </Text>
        </Pressable>

        {/* Results */}
        {result === null ? (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Enter a rate above to see all equivalent pay periods
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {RESULT_ROWS.map(({ key, label }, i) => {
              const isHighlighted =
                (mode === "hourly" && key === "annual") ||
                (mode === "salary" && key === "hourly");
              return (
                <View
                  key={key}
                  className={
                    isHighlighted
                      ? "rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950"
                      : "rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"
                  }
                >
                  <Text
                    className={
                      isHighlighted
                        ? "text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400"
                        : "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                    }
                  >
                    {label}
                  </Text>
                  <Text
                    className={
                      isHighlighted
                        ? "mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200"
                        : "mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100"
                    }
                  >
                    {fmt(result[key])}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
