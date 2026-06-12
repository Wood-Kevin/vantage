import { Lock, LucideIcon } from "lucide-react-native";
import { Dimensions, Pressable, Text, View } from "react-native";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = (screenWidth - 56) / 2;

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  tier: "free" | "premium";
  isLocked: boolean;
  onPress: () => void;
};

export default function ToolCard({
  title,
  description,
  icon: Icon,
  tier,
  isLocked,
  onPress,
}: Props) {
  const showFree = tier === "free";
  const showLock = tier === "premium" && isLocked;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "#ede9fe", borderless: false }}
      style={{ width: CARD_WIDTH, height: 130 }}
      className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-800"
    >
      {showFree && (
        <View className="absolute right-3 top-3 rounded-full bg-emerald-100 px-2 py-0.5 dark:bg-emerald-900">
          <Text className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            FREE
          </Text>
        </View>
      )}

      {showLock && (
        <View className="absolute right-3 top-3 rounded-full bg-zinc-100 p-1.5 dark:bg-zinc-700">
          <Lock size={11} color="#a1a1aa" />
        </View>
      )}

      <View className="mb-3 h-11 w-11 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900">
        <Icon size={22} color="#7c3aed" />
      </View>

      <Text
        className="mb-1 text-sm font-bold text-zinc-900 dark:text-white"
        numberOfLines={1}
      >
        {title}
      </Text>

      <Text
        className="text-xs leading-4 text-zinc-500 dark:text-zinc-400"
        numberOfLines={2}
      >
        {description}
      </Text>
    </Pressable>
  );
}
