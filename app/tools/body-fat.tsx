import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PremiumGate from "@/components/PremiumGate";
import { usePremium } from "@/lib/entitlements";

// ─── Pure calculation (US Navy Method) ───────────────────────────────────────

type Gender = "male" | "female";
type MeasurementUnit = "cm" | "in";

function toCm(value: number, unit: MeasurementUnit): number {
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

type BodyFatCategory = {
  label: string;
  color: string;
  description: string;
};

const MALE_CATEGORIES: Array<{ max: number } & BodyFatCategory> = [
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

const FEMALE_CATEGORIES: Array<{ max: number } & BodyFatCategory> = [
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
  gender: Gender
): BodyFatCategory {
  const cats = gender === "male" ? MALE_CATEGORIES : FEMALE_CATEGORIES;
  return cats.find((c) => bodyFatPct <= c.max) ?? cats[cats.length - 1];
}

function calcBodyFat(
  gender: Gender,
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
  if (weightKg <= 0 || heightRaw <= 0 || neckRaw <= 0 || waistRaw <= 0) return null;

  const height = toCm(heightRaw, unit);
  const neck = toCm(neckRaw, unit);
  const waist = toCm(waistRaw, unit);

  let bodyFatPct: number;

  if (gender === "male") {
    const diff = waist - neck;
    if (diff <= 0) return null;
    bodyFatPct =
      495 /
        (1.0324 -
          0.19077 * Math.log10(diff) +
          0.15456 * Math.log10(height)) -
      450;
  } else {
    const hipRaw = parseFloat(hipStr);
    if (!hipRaw || hipRaw <= 0) return null;
    const hip = toCm(hipRaw, unit);
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

function fmtNum(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BodyFatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = usePremium();

  const [gender, setGender] = useState<Gender>("male");
  const [unit, setUnit] = useState<MeasurementUnit>("cm");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [neck, setNeck] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");

  if (isLoading) return null;
  if (!isPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-900">
        <PremiumGate toolName="Body Fat % Estimator" onClose={() => router.back()} />
      </View>
    );
  }

  const result = calcBodyFat(gender, unit, weight, height, neck, waist, hip);

  const unitLabel = unit === "cm" ? "cm" : "in";

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
          Body Fat % Estimator
        </Text>
      </View>

      <View className="px-4">
        {/* Gender + Unit toggles */}
        <View className="mb-5 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Gender
            </Text>
            <View className="flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
              {(["male", "female"] as Gender[]).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  className={`flex-1 rounded-xl py-2.5 ${gender === g ? "bg-violet-600" : ""}`}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      gender === g ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {g === "male" ? "Male" : "Female"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Units
            </Text>
            <View className="flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
              {(["cm", "in"] as MeasurementUnit[]).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  className={`flex-1 rounded-xl py-2.5 ${unit === u ? "bg-violet-600" : ""}`}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
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

        {/* Weight */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Body Weight (kg)
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">kg</Text>
        </View>

        {/* Height */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Height ({unitLabel})
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">{unitLabel}</Text>
        </View>

        {/* Neck */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Neck Circumference ({unitLabel})
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={neck}
            onChangeText={setNeck}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">{unitLabel}</Text>
        </View>

        {/* Waist */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Waist Circumference ({unitLabel})
          <Text className="text-xs font-normal text-zinc-400">
            {" "}— measured at navel
          </Text>
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={waist}
            onChangeText={setWaist}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">{unitLabel}</Text>
        </View>

        {/* Hip — female only */}
        {gender === "female" && (
          <>
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Hip Circumference ({unitLabel})
              <Text className="text-xs font-normal text-zinc-400">
                {" "}— measured at widest point
              </Text>
            </Text>
            <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
              <TextInput
                value={hip}
                onChangeText={setHip}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#a1a1aa"
                className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
              />
              <Text className="text-zinc-400">{unitLabel}</Text>
            </View>
          </>
        )}

        {/* Results */}
        {result === null ? (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Enter your measurements above to estimate body fat
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {/* Body fat % with category color */}
            <View
              className="rounded-2xl p-4"
              style={{
                backgroundColor: result.categoryColor + "20",
                borderWidth: 1,
                borderColor: result.categoryColor + "60",
              }}
            >
              <Text
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: result.categoryColor }}
              >
                Body Fat
              </Text>
              <Text
                className="mt-1 text-4xl font-bold"
                style={{ color: result.categoryColor }}
              >
                {fmtNum(result.bodyFatPct)}%
              </Text>
              <View className="mt-2 flex-row items-center gap-2">
                <View
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: result.categoryColor }}
                >
                  <Text className="text-xs font-bold text-white">
                    {result.category}
                  </Text>
                </View>
              </View>
              <Text
                className="mt-2 text-xs"
                style={{ color: result.categoryColor }}
              >
                {result.categoryDescription}
              </Text>
            </View>

            {/* Fat mass */}
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Fat Mass
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmtNum(result.fatMassKg)} kg
              </Text>
              <Text className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">
                {fmtNum(result.fatMassLb)} lb
              </Text>
            </View>

            {/* Lean mass */}
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Lean Mass
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmtNum(result.leanMassKg)} kg
              </Text>
              <Text className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">
                {fmtNum(result.leanMassLb)} lb
              </Text>
            </View>

            <Text className="text-center text-xs text-zinc-400 dark:text-zinc-500">
              US Navy circumference method. For reference only — DEXA scan is more accurate.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
