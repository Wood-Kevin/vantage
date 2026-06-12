import Constants from "expo-constants";
import { Check, ChevronRight, Crown } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePremium } from "@/lib/entitlements";

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 mt-6">
      {title}
    </Text>
  );
}

type RowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
};

function SettingRow({ label, value, onPress, isLast = false }: RowProps) {
  const inner = (
    <View
      className={`flex-row items-center px-4 py-3.5 min-h-[52px]${
        !isLast ? " border-b border-zinc-100 dark:border-zinc-800" : ""
      }`}
    >
      <Text className="flex-1 text-[15px] font-medium text-zinc-900 dark:text-white">
        {label}
      </Text>
      {value ? (
        <Text
          className="text-sm text-zinc-400 dark:text-zinc-500 text-right ml-4"
          style={{ maxWidth: "55%" }}
        >
          {value}
        </Text>
      ) : null}
      {onPress ? <ChevronRight size={16} color="#a1a1aa" /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => (pressed ? { opacity: 0.6 } : {})}
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
}

function UpgradeBanner() {
  return (
    <View className="rounded-2xl bg-violet-600 p-5">
      <View className="flex-row items-center gap-2 mb-1.5">
        <Crown size={20} color="white" />
        <Text className="text-lg font-bold text-white">Unlock Vantage Premium</Text>
      </View>
      <Text className="text-sm text-violet-200 mb-4 leading-5">
        Get all 25+ tools for a one-time payment
      </Text>
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => console.log("lifetime purchase")}
          style={({ pressed }) => (pressed ? { opacity: 0.85 } : {})}
          className="flex-1 rounded-xl bg-white py-2.5 items-center justify-center"
        >
          <Text className="text-sm font-semibold text-violet-600">Lifetime $9.99</Text>
        </Pressable>
        <Pressable
          onPress={() => console.log("monthly purchase")}
          style={({ pressed }) => (pressed ? { opacity: 0.85 } : {})}
          className="flex-1 rounded-xl bg-violet-700 py-2.5 items-center justify-center"
        >
          <Text className="text-sm font-semibold text-white">$1.99 / mo</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PremiumBadge() {
  return (
    <View className="flex-row items-center gap-2.5 px-4 py-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
      <View className="w-5 h-5 rounded-full bg-emerald-500 items-center justify-center">
        <Check size={12} color="white" strokeWidth={3} />
      </View>
      <Text className="text-[15px] font-semibold text-emerald-700 dark:text-emerald-400">
        Premium Active
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = usePremium();

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-900">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <Text className="text-3xl font-bold text-zinc-900 dark:text-white pb-6">
          Settings
        </Text>

        {/* Section 1 — Upgrade / Premium */}
        {!isLoading && (isPremium ? <PremiumBadge /> : <UpgradeBanner />)}

        {/* Section 2 — App Info */}
        <SectionLabel title="About" />
        <View className="rounded-2xl bg-white dark:bg-zinc-800 overflow-hidden">
          <SettingRow label="Version" value={appVersion} />
          <SettingRow label="Tools Available" value="30 tools" />
          <SettingRow
            label="Storage"
            value="Local only — your data never leaves your device"
            isLast
          />
        </View>

        {/* Section 3 — Support */}
        <SectionLabel title="Support" />
        <View className="rounded-2xl bg-white dark:bg-zinc-800 overflow-hidden">
          <SettingRow
            label="Restore Purchases"
            onPress={() => console.log("restore purchases")}
          />
          <SettingRow
            label="Rate Vantage"
            onPress={() => console.log("rate app")}
          />
          <SettingRow
            label="Privacy Policy"
            onPress={() => console.log("privacy policy")}
          />
          <SettingRow
            label="Terms of Use"
            onPress={() => console.log("terms of use")}
            isLast
          />
        </View>

        {/* Section 4 — Footer */}
        <View className="items-center mt-10 gap-1.5">
          <Text className="text-sm text-zinc-400 dark:text-zinc-500">
            Made with ☕ by one person
          </Text>
          <Text className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
            Vantage — 25+ tools for life's quick questions
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
