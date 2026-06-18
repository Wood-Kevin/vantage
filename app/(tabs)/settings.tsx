import Constants from "expo-constants";
import { ChevronRight } from "lucide-react-native";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  function handleRateVantage() {
    Linking.openURL("market://details?id=com.kevinwood.vantage").catch(() =>
      Linking.openURL(
        "https://play.google.com/store/apps/details?id=com.kevinwood.vantage"
      )
    );
  }

  function handlePrivacyPolicy() {
    Linking.openURL("https://wood-kevin.github.io/vantage/privacy.html");
  }

  function handleTermsOfUse() {
    Linking.openURL("https://wood-kevin.github.io/vantage/terms.html");
  }

  function handleReportBug() {
    Linking.openURL(
      "mailto:kevin.wood02284@icloud.com?subject=Vantage Bug Report"
    );
  }

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

        {/* Section 1 — App Info */}
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

        {/* Section 2 — Support */}
        <SectionLabel title="Support" />
        <View className="rounded-2xl bg-white dark:bg-zinc-800 overflow-hidden">
          <SettingRow
            label="Rate Vantage"
            onPress={handleRateVantage}
          />
          <SettingRow
            label="Report a Bug"
            onPress={handleReportBug}
          />
          <SettingRow
            label="Privacy Policy"
            onPress={handlePrivacyPolicy}
          />
          <SettingRow
            label="Terms of Use"
            onPress={handleTermsOfUse}
            isLast
          />
        </View>

        {/* Section 3 — Footer */}
        <View className="items-center mt-10 gap-1.5">
          <Text className="text-sm text-zinc-400 dark:text-zinc-500">
            Made with ☕ by one person
          </Text>
          <Text className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
            Vantage — 30 tools for life's quick questions
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
