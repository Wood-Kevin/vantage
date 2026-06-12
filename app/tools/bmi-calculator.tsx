import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Pure calculation ─────────────────────────────────────────────────────────

type Unit = "metric" | "imperial";

type BMIResult = {
  bmi: number;
  category: string;
  categoryColor: string;
  barPosition: number; // 0–1, clamped
  minHealthyWeight: string;
  maxHealthyWeight: string;
};

const BMI_SCALE_MIN = 10;
const BMI_SCALE_MAX = 45;

function calcBMI(
  heightStr: string,
  weightStr: string,
  unit: Unit
): BMIResult | null {
  const height = parseFloat(heightStr);
  const weight = parseFloat(weightStr);
  if (!height || !weight || height <= 0 || weight <= 0) return null;

  let bmi: number;
  let minHealthyKg: number;
  let maxHealthyKg: number;
  let heightM: number;

  if (unit === "metric") {
    heightM = height / 100; // cm → m
    bmi = weight / (heightM * heightM);
    minHealthyKg = 18.5 * heightM * heightM;
    maxHealthyKg = 24.9 * heightM * heightM;
  } else {
    // Imperial: height in inches, weight in lbs
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

function bmiCategory(bmi: number): { category: string; categoryColor: string } {
  if (bmi < 18.5)
    return { category: "Underweight", categoryColor: "text-blue-500 dark:text-blue-400" };
  if (bmi < 25)
    return { category: "Normal", categoryColor: "text-emerald-600 dark:text-emerald-400" };
  if (bmi < 30)
    return { category: "Overweight", categoryColor: "text-amber-500 dark:text-amber-400" };
  return { category: "Obese", categoryColor: "text-red-500 dark:text-red-400" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BMICalculatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [unit, setUnit] = useState<Unit>("metric");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const result = calcBMI(height, weight, unit);

  function switchUnit(u: Unit) {
    setUnit(u);
    setHeight("");
    setWeight("");
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
          BMI Calculator
        </Text>
      </View>

      <View className="px-4">
        {/* Unit toggle */}
        <View className="mb-6 flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {(["metric", "imperial"] as Unit[]).map((u) => (
            <Pressable
              key={u}
              onPress={() => switchUnit(u)}
              className={`flex-1 rounded-xl py-2.5 ${unit === u ? "bg-violet-600" : ""}`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  unit === u ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {u === "metric" ? "Metric (kg/cm)" : "Imperial (lb/in)"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Height */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Height ({unit === "metric" ? "cm" : "inches"})
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
            placeholder={unit === "metric" ? "e.g. 175" : "e.g. 69"}
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">{unit === "metric" ? "cm" : "in"}</Text>
        </View>

        {/* Weight */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Weight ({unit === "metric" ? "kg" : "lb"})
        </Text>
        <View className="mb-6 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder={unit === "metric" ? "e.g. 70" : "e.g. 154"}
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">{unit === "metric" ? "kg" : "lb"}</Text>
        </View>

        {/* Results */}
        {result ? (
          <View className="gap-3">
            {/* BMI value */}
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Your BMI
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {result.bmi}
              </Text>
            </View>

            {/* Category */}
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Category
              </Text>
              <Text className={`mt-1 text-3xl font-bold ${result.categoryColor}`}>
                {result.category}
              </Text>
            </View>

            {/* Visual scale bar */}
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                BMI Scale
              </Text>
              {/* Bar */}
              <View className="relative mb-1 h-3 overflow-visible rounded-full">
                {/* Segments */}
                <View className="absolute inset-0 flex-row overflow-hidden rounded-full">
                  <View style={{ flex: 8.5 }} className="bg-blue-400" />
                  <View style={{ flex: 6.5 }} className="bg-emerald-400" />
                  <View style={{ flex: 5 }} className="bg-amber-400" />
                  <View style={{ flex: 15 }} className="bg-red-400" />
                </View>
                {/* Marker */}
                <View
                  className="absolute top-0 h-3 w-1.5 -translate-x-0.5 rounded-full bg-zinc-900 dark:bg-white"
                  style={{ left: `${result.barPosition * 100}%` }}
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-[10px] text-zinc-400">10</Text>
                <Text className="text-[10px] text-zinc-400">18.5</Text>
                <Text className="text-[10px] text-zinc-400">25</Text>
                <Text className="text-[10px] text-zinc-400">30</Text>
                <Text className="text-[10px] text-zinc-400">45</Text>
              </View>
            </View>

            {/* Healthy range */}
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Healthy Weight Range
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {result.minHealthyWeight} – {result.maxHealthyWeight}
              </Text>
              <Text className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                For your height (BMI 18.5–24.9)
              </Text>
            </View>
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Enter your height and weight above to see your BMI
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
