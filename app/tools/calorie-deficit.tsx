import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PremiumGate from "@/components/PremiumGate";
import { usePremium } from "@/lib/entitlements";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Pure calculation ─────────────────────────────────────────────────────────

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

  // Mifflin-St Jeor
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
      const weeklyKg = (weeklyLb / 2.20462);
      if (Math.sign(deltaKg) === Math.sign(weeklyKg) && weeklyKg !== 0) {
        weeksToGoal = Math.ceil(Math.abs(deltaKg / weeklyKg));
      }
    }
  }

  return { bmr, tdee, targetCalories, dailyDelta, weeksToGoal };
}

// ─── Component ────────────────────────────────────────────────────────────────

const ACTIVITY_OPTS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Lightly Active" },
  { value: "moderate", label: "Moderately Active" },
  { value: "very", label: "Very Active" },
  { value: "extra", label: "Extra Active" },
];

const GOAL_OPTS: { value: Goal; label: string }[] = [
  { value: "lose1.5", label: "Lose 1.5 lb/wk" },
  { value: "lose1", label: "Lose 1 lb/wk" },
  { value: "lose0.5", label: "Lose 0.5 lb/wk" },
  { value: "maintain", label: "Maintain" },
  { value: "gain0.5", label: "Gain 0.5 lb/wk" },
  { value: "gain1", label: "Gain 1 lb/wk" },
];

function isWeightChangeGoal(goal: Goal): boolean {
  return goal !== "maintain";
}

export default function CalorieDeficitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = usePremium();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("lb");
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("ft");
  const [weight, setWeight] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<Goal>("lose1");
  const [targetWeight, setTargetWeight] = useState("");

  if (isLoading) return null;
  if (!isPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-900">
        <PremiumGate toolName="Calorie Deficit Calculator" onClose={() => router.back()} />
      </View>
    );
  }

  const result = calcCalories(
    age,
    gender,
    heightUnit,
    heightCm,
    heightFt,
    heightIn,
    weight,
    weightUnit,
    activity,
    goal,
    targetWeight
  );

  const showTargetWeight = isWeightChangeGoal(goal);

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
          Calorie Deficit Calculator
        </Text>
      </View>

      <View className="px-4">
        {/* Age */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Age
        </Text>
        <View className="mb-5 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">yrs</Text>
        </View>

        {/* Gender */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Gender
        </Text>
        <View className="mb-5 flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
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

        {/* Height */}
        <View className="mb-5 flex-row items-end gap-3">
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Height
            </Text>
            {heightUnit === "cm" ? (
              <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
                <TextInput
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#a1a1aa"
                  className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
                />
                <Text className="text-zinc-400">cm</Text>
              </View>
            ) : (
              <View className="flex-row gap-2">
                <View className="flex-1 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800">
                  <TextInput
                    value={heightFt}
                    onChangeText={setHeightFt}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#a1a1aa"
                    className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
                  />
                  <Text className="text-zinc-400">ft</Text>
                </View>
                <View className="flex-1 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800">
                  <TextInput
                    value={heightIn}
                    onChangeText={setHeightIn}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#a1a1aa"
                    className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
                  />
                  <Text className="text-zinc-400">in</Text>
                </View>
              </View>
            )}
          </View>
          <View className="mb-0.5">
            <View className="flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
              {(["ft", "cm"] as HeightUnit[]).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setHeightUnit(u)}
                  className={`rounded-xl px-3 py-2 ${heightUnit === u ? "bg-violet-600" : ""}`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      heightUnit === u ? "text-white" : "text-zinc-600 dark:text-zinc-400"
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
        <View className="mb-5 flex-row items-end gap-3">
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Current Weight
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
              <Text className="text-zinc-400">{weightUnit}</Text>
            </View>
          </View>
          <View className="mb-0.5">
            <View className="flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
              {(["lb", "kg"] as WeightUnit[]).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setWeightUnit(u)}
                  className={`rounded-xl px-3 py-2 ${weightUnit === u ? "bg-violet-600" : ""}`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      weightUnit === u ? "text-white" : "text-zinc-600 dark:text-zinc-400"
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
        <View className="mb-5 gap-2">
          {ACTIVITY_OPTS.map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setActivity(value)}
              className={`rounded-xl px-4 py-3 ${
                activity === value
                  ? "bg-violet-600"
                  : "border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
              }`}
            >
              <Text
                className={`font-semibold ${
                  activity === value
                    ? "text-white"
                    : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Goal */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Goal
        </Text>
        <View className="mb-5 gap-2">
          {GOAL_OPTS.map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setGoal(value)}
              className={`rounded-xl px-4 py-3 ${
                goal === value
                  ? "bg-violet-600"
                  : "border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
              }`}
            >
              <Text
                className={`font-semibold ${
                  goal === value ? "text-white" : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Target weight (only for loss/gain goals) */}
        {showTargetWeight && (
          <>
            <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Target Weight ({weightUnit})
            </Text>
            <View className="mb-6 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
              <TextInput
                value={targetWeight}
                onChangeText={setTargetWeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#a1a1aa"
                className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
              />
              <Text className="text-zinc-400">{weightUnit}</Text>
            </View>
          </>
        )}

        {/* Results */}
        {result === null ? (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Fill in your details above to see your calorie targets
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                BMR (Mifflin-St Jeor)
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {Math.round(result.bmr).toLocaleString()} kcal
              </Text>
              <Text className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                Calories burned at complete rest
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                TDEE
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {Math.round(result.tdee).toLocaleString()} kcal
              </Text>
              <Text className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                Total daily energy expenditure
              </Text>
            </View>

            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Target Daily Calories
              </Text>
              <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
                {Math.round(result.targetCalories).toLocaleString()} kcal
              </Text>
              {result.dailyDelta !== 0 && (
                <Text className="mt-0.5 text-xs text-violet-500 dark:text-violet-400">
                  {result.dailyDelta > 0 ? "+" : ""}
                  {result.dailyDelta} kcal vs TDEE
                </Text>
              )}
            </View>

            {result.weeksToGoal !== null && (
              <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Estimated Time to Goal
                </Text>
                <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {result.weeksToGoal} weeks
                </Text>
                <Text className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                  ≈ {(result.weeksToGoal / 4.33).toFixed(1)} months
                </Text>
              </View>
            )}

            <Text className="text-center text-xs text-zinc-400 dark:text-zinc-500">
              Estimates based on Mifflin-St Jeor formula. Consult a dietitian for personalized guidance.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
