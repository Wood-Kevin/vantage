import { LucideIcon } from "lucide-react-native";
import { Dimensions, Pressable, Text, View } from "react-native";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = (screenWidth - 56) / 2;

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  onPress: () => void;
};

export default function ToolCard({
  title,
  description,
  icon: Icon,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "#ede9fe", borderless: false }}
      style={{ width: CARD_WIDTH, height: 130 }}
      className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-800"
    >
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
