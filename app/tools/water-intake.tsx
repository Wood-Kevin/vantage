import { useRouter } from "expo-router";
import { ArrowLeft, Minus, Plus } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getSetting, setSetting } from "@/lib/storage";

// ─── Calculation ──────────────────────────────────────────────────────────────

type ActivityLevel = "sedentary" | "light" | "active" | "veryActive";
type Climate = "temperate" | "hot" | "veryHot";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.0,
  light: 1.15,
  active: 1.3,
  veryActive: 1.5,
};

const CLIMATE_MULTIPLIERS: Record<Climate, number> = {
  temperate: 1.0,
  hot: 1.1,
  veryHot: 1.2,
};

function calcWater(
  weightStr: string,
  unit: "lb" | "kg",
  activity: ActivityLevel,
  climate: Climate
): { oz: number; ml: number; glasses: number } | null {
  const raw = parseFloat(weightStr);
  if (!raw || raw <= 0) return null;
  const lb = unit === "lb" ? raw : raw * 2.20462;
  const baseOz = lb * 0.5;
  const oz = baseOz * ACTIVITY_MULTIPLIERS[activity] * CLIMATE_MULTIPLIERS[climate];
  return { oz, ml: oz * 29.5735, glasses: Math.round(oz / 8) };
}

function statusText(consumed: number, goal: number): string {
  if (consumed === 0) return "Start hydrating!";
  const pct = consumed / goal;
  if (pct >= 1) return "Goal reached! 🎉";
  if (pct >= 0.75) return "Almost there!";
  if (pct >= 0.5) return "Great progress!";
  return "Keep going!";
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

const ACTIVITY_OPTS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Lightly Active" },
  { value: "active", label: "Active" },
  { value: "veryActive", label: "Very Active" },
];

const CLIMATE_OPTS: { value: Climate; label: string }[] = [
  { value: "temperate", label: "Temperate" },
  { value: "hot", label: "Hot" },
  { value: "veryHot", label: "Very Hot" },
];

export default function WaterIntakeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<ActivityLevel>("light");
  const [climate, setClimate] = useState<Climate>("temperate");
  const [consumed, setConsumed] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const persistRef = useRef(false);

  // Load persisted count on mount
  useEffect(() => {
    async function load() {
      const storedDate = await getSetting("water_date");
      const today = todayKey();
      if (storedDate === today) {
        const storedCount = await getSetting("water_count");
        setConsumed(parseInt(storedCount ?? "0", 10) || 0);
      } else {
        await setSetting("water_date", today);
        await setSetting("water_count", "0");
        setConsumed(0);
      }
      setStorageReady(true);
      persistRef.current = true;
    }
    load();
  }, []);

  // Persist consumed count whenever it changes (after initial load)
  useEffect(() => {
    if (!persistRef.current) return;
    setSetting("water_count", consumed.toString());
  }, [consumed]);

  const result = calcWater(weight, unit, activity, climate);
  const goalGlasses = result?.glasses ?? 8;
  const fillPct = Math.min(consumed / goalGlasses, 1);
  const status = statusText(consumed, goalGlasses);

  function increment() {
    setConsumed((c) => c + 1);
  }

  function decrement() {
    setConsumed((c) => Math.max(0, c - 1));
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
          Water Intake Tracker
        </Text>
      </View>

      <View className="px-4">
        {/* Weight input */}
        <View className="mb-5 flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Body Weight
            </Text>
            <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#a1a1aa"
                className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
              />
              <Text className="text-zinc-400">{unit}</Text>
            </View>
          </View>
          <View className="mt-6">
            <View className="flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
              {(["lb", "kg"] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  className={`rounded-xl px-4 py-2 ${unit === u ? "bg-violet-600" : ""}`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      unit === u ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Activity level */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Activity Level
        </Text>
        <View className="mb-5 flex-row flex-wrap gap-2">
          {ACTIVITY_OPTS.map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setActivity(value)}
              className={`rounded-xl px-4 py-2.5 ${
                activity === value
                  ? "bg-violet-600"
                  : "border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  activity === value ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Climate */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Climate
        </Text>
        <View className="mb-6 flex-row gap-2">
          {CLIMATE_OPTS.map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setClimate(value)}
              className={`flex-1 items-center rounded-xl py-2.5 ${
                climate === value
                  ? "bg-violet-600"
                  : "border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  climate === value ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Recommendation */}
        {result && (
          <View className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
            <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
              Daily Recommendation
            </Text>
            <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
              {result.oz.toFixed(0)} oz
            </Text>
            <Text className="mt-0.5 text-sm text-violet-500 dark:text-violet-400">
              {result.ml.toFixed(0)} ml · {result.glasses} glasses of 8 oz
            </Text>
          </View>
        )}

        {/* Today's tracker */}
        <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Today's Intake
          </Text>

          {/* Progress bar */}
          <View className="mb-3 h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <View
              className="h-full rounded-full bg-violet-500"
              style={{ width: `${fillPct * 100}%` }}
            />
          </View>

          <Text className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {consumed} / {goalGlasses} glasses · {status}
          </Text>

          {/* Stepper */}
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={decrement}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <Minus size={22} color="#7c3aed" />
            </Pressable>

            <View className="items-center">
              <Text className="text-5xl font-bold text-zinc-900 dark:text-white">
                {consumed}
              </Text>
              <Text className="text-xs text-zinc-400">glasses</Text>
            </View>

            <Pressable
              onPress={increment}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <Plus size={22} color="#7c3aed" />
            </Pressable>
          </View>

          {/* Glass icons row */}
          <View className="mt-4 flex-row flex-wrap justify-center gap-1.5">
            {Array.from({ length: goalGlasses }).map((_, i) => (
              <View
                key={i}
                className={`h-5 w-5 rounded-md ${
                  i < consumed
                    ? "bg-violet-500"
                    : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
