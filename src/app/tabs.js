import {
  AccountIcon,
  LanguageIcon,
  GearIcon,
  LiveIcon,
  RewriteIcon,
  HomeIcon,
  LookupIcon,
  StarIcon,
  AssistantIcon,
} from "@/core/components/Icons";

import SettingsPanel from "@/features/settings";
import AccountPanel from "@/features/account";
import LivePanel from "@/features/live";
import TranslatePanel from "@/features/translate";
import RewritePanel from "@/features/rewrite";
import HomePanel from "@/features/home";
import LookupPanel from "@/features/lookup";
import FavoritesPanel from "@/features/favorites";
import AssistantPanel from "@/features/assistant";

export const tabs = [
  {
    off: false,
    title: "Home",
    icon: HomeIcon,
    content: HomePanel,
    description: "Home page",
  },
  {
    off: true,
    title: "Realtime",
    icon: LiveIcon,
    content: LivePanel,
    description: "Realtime transcription",
  },
  {
    off: false,
    title: "Translate",
    icon: LanguageIcon,
    content: TranslatePanel,
    description: "Word translator",
  },
  {
    off: false,
    title: "Assistant",
    icon: AssistantIcon,
    content: AssistantPanel,
    description: "AI chat assistant",
  },
  {
    off: false,
    title: "Lookup",
    icon: LookupIcon,
    content: LookupPanel,
    description: "Dictionary lookup",
  },
  {
    off: false,
    title: "Favorites",
    icon: StarIcon,
    content: FavoritesPanel,
    description: "Saved words",
  },
  {
    off: false,
    title: "Rewrite",
    icon: RewriteIcon,
    content: RewritePanel,
    description: "professional rewriter",
  },
  {
    off: false,
    title: "Account",
    icon: AccountIcon,
    content: AccountPanel,
    description: "Account manager",
    bottom: true,
  },
  {
    off: false,
    title: "Settings",
    bottom: true,
    icon: GearIcon,
    description: "app settings",
    content: SettingsPanel,
  },
];
