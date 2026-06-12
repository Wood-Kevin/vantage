import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PremiumGate from "@/components/PremiumGate";
import { usePremium } from "@/lib/entitlements";

// ─── Types ────────────────────────────────────────────────────────────────────

type Units = "metric" | "imperial";

// ─── Pure calculation ─────────────────────────────────────────────────────────

type RoadTripResult = {
  fuelCost: number;
  fuelCostPerPerson: number;
  accommodationTotal: number;
  foodTotal: number;
  miscTotal: number;
  grandTotal: number;
  costPerPerson: number;
  dailyAvgPerPerson: number;
};

function calcRoadTrip(
  distanceStr: string,
  efficiencyStr: string,
  fuelPriceStr: string,
  daysStr: string,
  accommodationStr: string,
  foodPerPersonStr: string,
  peopleStr: string,
  miscStr: string,
  units: Units,
): RoadTripResult | null {
  const distance = parseFloat(distanceStr);
  const efficiency = parseFloat(efficiencyStr);
  const fuelPrice = parseFloat(fuelPriceStr);
  const days = parseFloat(daysStr);
  const accommodation = parseFloat(accommodationStr) || 0;
  const foodPerPerson = parseFloat(foodPerPersonStr) || 0;
  const people = parseFloat(peopleStr) || 1;
  const misc = parseFloat(miscStr) || 0;

  if (!distance || !efficiency || !fuelPrice || !days || distance <= 0 || efficiency <= 0 || fuelPrice <= 0 || days <= 0) {
    return null;
  }

  let fuelCost: number;
  if (units === "metric") {
    // L/100km + $/L
    const litresNeeded = (distance / 100) * efficiency;
    fuelCost = litresNeeded * fuelPrice;
  } else {
    // MPG + $/gal
    const gallonsNeeded = distance / efficiency;
    fuelCost = gallonsNeeded * fuelPrice;
  }

  const accommodationTotal = accommodation * days;
  const foodTotal = foodPerPerson * people * days;
  const miscTotal = misc * days;
  const grandTotal = fuelCost + accommodationTotal + foodTotal + miscTotal;
  const costPerPerson = grandTotal / people;
  const dailyAvgPerPerson = costPerPerson / days;

  return {
    fuelCost,
    fuelCostPerPerson: fuelCost / people,
    accommodationTotal,
    foodTotal,
    miscTotal,
    grandTotal,
    costPerPerson,
    dailyAvgPerPerson,
  };
}

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// ─── Input helpers ────────────────────────────────────────────────────────────

function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  suffix,
  prefix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  prefix?: string;
}) {
  return (
    <View className="mb-5">
      <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{label}</Text>
      <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
        {prefix && <Text className="mr-1 text-lg text-zinc-400">{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder ?? "0"}
          placeholderTextColor="#a1a1aa"
          className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
        />
        {suffix && <Text className="text-zinc-400">{suffix}</Text>}
      </View>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoadTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = usePremium();

  const [units, setUnits] = useState<Units>("imperial");
  const [distance, setDistance] = useState("");
  const [efficiency, setEfficiency] = useState("");
  const [fuelPrice, setFuelPrice] = useState("");
  const [days, setDays] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [foodPerPerson, setFoodPerPerson] = useState("");
  const [people, setPeople] = useState("2");
  const [misc, setMisc] = useState("");

  if (isLoading) return null;
  if (!isPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-900">
        <PremiumGate toolName="Road Trip Planner" onClose={() => router.back()} />
      </View>
    );
  }

  const result = calcRoadTrip(
    distance, efficiency, fuelPrice, days,
    accommodation, foodPerPerson, people, misc, units
  );
  const peopleCount = parseFloat(people) || 1;

  const isMetric = units === "metric";

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
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">Road Trip Planner</Text>
      </View>

      <View className="px-4">
        {/* Units toggle */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Units</Text>
        <View className="mb-5 flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {(["metric", "imperial"] as Units[]).map((u) => (
            <Pressable
              key={u}
              onPress={() => setUnits(u)}
              className={`flex-1 rounded-xl py-2.5 ${units === u ? "bg-violet-600" : ""}`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  units === u ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {u === "metric" ? "Metric (km, L)" : "Imperial (mi, gal)"}
              </Text>
            </Pressable>
          ))}
        </View>

        <FieldInput
          label={`Total Distance (${isMetric ? "km" : "miles"})`}
          value={distance}
          onChangeText={setDistance}
          suffix={isMetric ? "km" : "mi"}
        />
        <FieldInput
          label={isMetric ? "Fuel Efficiency (L/100km)" : "Fuel Efficiency (MPG)"}
          value={efficiency}
          onChangeText={setEfficiency}
          suffix={isMetric ? "L/100km" : "MPG"}
        />
        <FieldInput
          label={isMetric ? "Fuel Price (per litre)" : "Fuel Price (per gallon)"}
          value={fuelPrice}
          onChangeText={setFuelPrice}
          prefix="$"
          placeholder="0.00"
        />

        <View className="mb-2 border-t border-zinc-100 dark:border-zinc-800" />
        <Text className="mb-4 mt-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Trip Expenses
        </Text>

        <FieldInput
          label="Number of Days"
          value={days}
          onChangeText={setDays}
          suffix="days"
        />
        <FieldInput
          label="Number of People"
          value={people}
          onChangeText={setPeople}
          suffix="people"
        />
        <FieldInput
          label="Daily Accommodation"
          value={accommodation}
          onChangeText={setAccommodation}
          prefix="$"
          placeholder="0.00"
          suffix="/ night"
        />
        <FieldInput
          label="Daily Food Per Person"
          value={foodPerPerson}
          onChangeText={setFoodPerPerson}
          prefix="$"
          placeholder="0.00"
          suffix="/ day"
        />
        <FieldInput
          label="Miscellaneous Daily Budget"
          value={misc}
          onChangeText={setMisc}
          prefix="$"
          placeholder="0"
          suffix="/ day"
        />

        {/* Results */}
        {result === null ? (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Enter distance, fuel details, and trip length to plan your budget
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Grand Total
              </Text>
              <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
                {fmtCurrency(result.grandTotal)}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Cost Per Person
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmtCurrency(result.costPerPerson)}
              </Text>
              <Text className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">
                {fmtCurrency(result.dailyAvgPerPerson)} / day avg
              </Text>
            </View>

            {/* Breakdown */}
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Breakdown
              </Text>
              <View className="gap-2.5">
                {[
                  { label: "Fuel", total: result.fuelCost, per: result.fuelCostPerPerson },
                  { label: "Accommodation", total: result.accommodationTotal, per: result.accommodationTotal / peopleCount },
                  { label: "Food", total: result.foodTotal, per: result.foodTotal / peopleCount },
                  ...(result.miscTotal > 0
                    ? [{ label: "Miscellaneous", total: result.miscTotal, per: result.miscTotal / peopleCount }]
                    : []),
                ].map(({ label, total, per }) => (
                  <View key={label} className="flex-row items-center justify-between">
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">{label}</Text>
                    <View className="items-end">
                      <Text className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {fmtCurrency(total)}
                      </Text>
                      {peopleCount > 1 && (
                        <Text className="text-xs text-zinc-400">
                          {fmtCurrency(per)} / person
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
