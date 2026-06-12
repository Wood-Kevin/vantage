import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PremiumGate from "@/components/PremiumGate";
import { usePremium } from "@/lib/entitlements";

// ─── Pure calculation ─────────────────────────────────────────────────────────

type DistanceUnit = "km" | "mi";
type EfficiencyUnit = "L100km" | "mpg";
type PriceUnit = "perL" | "perGal";

function toKm(value: number, unit: DistanceUnit): number {
  return unit === "mi" ? value * 1.60934 : value;
}

function toL100km(value: number, unit: EfficiencyUnit): number {
  return unit === "mpg" ? 235.214 / value : value;
}

function toPricePerL(value: number, unit: PriceUnit): number {
  return unit === "perGal" ? value / 3.78541 : value;
}

type FuelResult = {
  litresNeeded: number;
  gallonsNeeded: number;
  totalCost: number;
  costPerPerson: number;
  co2Kg: number;
};

function calcFuel(
  distanceStr: string, distUnit: DistanceUnit,
  efficiencyStr: string, effUnit: EfficiencyUnit,
  priceStr: string, priceUnit: PriceUnit,
  passengersStr: string,
): FuelResult | null {
  const dist = parseFloat(distanceStr);
  const eff = parseFloat(efficiencyStr);
  const price = parseFloat(priceStr);
  const passengers = parseInt(passengersStr, 10) || 1;

  if (!dist || !eff || !price || dist <= 0 || eff <= 0 || price <= 0) return null;

  const distKm = toKm(dist, distUnit);
  const eff100 = toL100km(eff, effUnit);
  const priceL = toPricePerL(price, priceUnit);

  const litresNeeded = (distKm / 100) * eff100;
  const totalCost = litresNeeded * priceL;
  const co2Kg = litresNeeded * 2.31;

  return {
    litresNeeded,
    gallonsNeeded: litresNeeded / 3.78541,
    totalCost,
    costPerPerson: totalCost / passengers,
    co2Kg,
  };
}

function fmt2(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Reusable sub-components ─────────────────────────────────────────────────

function UnitToggle<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View className="flex-row rounded-xl border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
      {options.map(({ value, label }) => (
        <Pressable
          key={value}
          onPress={() => onSelect(value)}
          className={`flex-1 rounded-lg py-1.5 ${selected === value ? "bg-violet-600" : ""}`}
        >
          <Text
            className={`text-center text-xs font-semibold ${
              selected === value ? "text-white" : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FuelCostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = usePremium();

  const [distance, setDistance] = useState("");
  const [distUnit, setDistUnit] = useState<DistanceUnit>("km");
  const [efficiency, setEfficiency] = useState("");
  const [effUnit, setEffUnit] = useState<EfficiencyUnit>("L100km");
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState<PriceUnit>("perL");
  const [passengers, setPassengers] = useState("1");

  if (isLoading) return null;
  if (!isPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-900">
        <PremiumGate toolName="Fuel Cost Estimator" onClose={() => router.back()} />
      </View>
    );
  }

  const result = calcFuel(distance, distUnit, efficiency, effUnit, price, priceUnit, passengers);
  const passengerCount = parseInt(passengers, 10) || 1;

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
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">Fuel Cost Estimator</Text>
      </View>

      <View className="px-4">
        {/* Distance */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Trip Distance</Text>
        <View className="mb-1 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={distance}
            onChangeText={setDistance}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="mr-3 text-zinc-400">{distUnit}</Text>
          <UnitToggle
            options={[{ value: "km", label: "km" }, { value: "mi", label: "mi" }]}
            selected={distUnit}
            onSelect={setDistUnit}
          />
        </View>
        <View className="mb-5" />

        {/* Fuel efficiency */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Fuel Efficiency</Text>
        <View className="mb-1 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={efficiency}
            onChangeText={setEfficiency}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="mr-3 text-xs text-zinc-400">
            {effUnit === "L100km" ? "L/100km" : "MPG"}
          </Text>
          <UnitToggle
            options={[
              { value: "L100km", label: "L/100" },
              { value: "mpg", label: "MPG" },
            ]}
            selected={effUnit}
            onSelect={setEffUnit}
          />
        </View>
        <View className="mb-5" />

        {/* Fuel price */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Fuel Price</Text>
        <View className="mb-1 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Text className="mr-1 text-lg text-zinc-400">$</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="mr-3 text-xs text-zinc-400">
            {priceUnit === "perL" ? "/ litre" : "/ gallon"}
          </Text>
          <UnitToggle
            options={[{ value: "perL", label: "/L" }, { value: "perGal", label: "/gal" }]}
            selected={priceUnit}
            onSelect={setPriceUnit}
          />
        </View>
        <View className="mb-5" />

        {/* Passengers */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Passengers</Text>
        <View className="mb-6 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <TextInput
            value={passengers}
            onChangeText={setPassengers}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor="#a1a1aa"
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
          <Text className="text-zinc-400">people</Text>
        </View>

        {/* Results */}
        {result === null ? (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Enter your trip details above to estimate fuel cost
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Total Fuel Cost
              </Text>
              <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
                ${fmt2(result.totalCost)}
              </Text>
            </View>

            {passengerCount > 1 && (
              <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Cost Per Person
                </Text>
                <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  ${fmt2(result.costPerPerson)}
                </Text>
              </View>
            )}

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Fuel Needed
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt2(result.litresNeeded)} L
              </Text>
              <Text className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">
                {fmt2(result.gallonsNeeded)} gallons
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                CO₂ Emissions
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt2(result.co2Kg)} kg
              </Text>
              <Text className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                2.31 kg CO₂ per litre petrol
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
