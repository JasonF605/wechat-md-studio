export const themeCatalog = [
  {
    id: "tech-pulse",
    label: "AI Side Hustle Tech",
    description: "High-contrast blue, green, and ink accents for AI tools, automation, and monetization essays.",
    categories: ["ai-money", "tools", "business"],
    tokens: {
      background: "#F7FBFF",
      text: "#111827",
      muted: "#5B6575",
      accent: "#2563EB",
      accent2: "#0F766E",
      soft: "#EAF3FF",
      soft2: "#E8FFF6",
      border: "#BFD7FF",
      codeBg: "#0F172A",
      codeText: "#E0F2FE",
      quoteBg: "#F0F7FF",
      tableHead: "#E7F0FF"
    }
  },
  {
    id: "science-clean",
    label: "Science Clean",
    description: "Calm teal and blue explanatory style for science, knowledge, and mechanism-focused writing.",
    categories: ["science", "education"],
    tokens: {
      background: "#F8FFFD",
      text: "#10231F",
      muted: "#55716B",
      accent: "#0F766E",
      accent2: "#2563EB",
      soft: "#E6FFFA",
      soft2: "#EEF6FF",
      border: "#A7F3D0",
      codeBg: "#12312C",
      codeText: "#D9FFF7",
      quoteBg: "#F0FDFA",
      tableHead: "#DDFCF3"
    }
  },
  {
    id: "food-magazine",
    label: "Food Magazine",
    description: "Warm editorial styling for recipes, restaurants, food essays, and lifestyle writing.",
    categories: ["food", "lifestyle"],
    tokens: {
      background: "#FFFDF8",
      text: "#33251E",
      muted: "#775F55",
      accent: "#B45309",
      accent2: "#BE123C",
      soft: "#FFF3D6",
      soft2: "#FFE4E6",
      border: "#F7C873",
      codeBg: "#3B2A20",
      codeText: "#FFF7ED",
      quoteBg: "#FFF8E7",
      tableHead: "#FFE9B5"
    }
  },
  {
    id: "health-trust",
    label: "Health Trust",
    description: "Trustworthy green-blue style for health, elder care, safety reminders, and medical literacy.",
    categories: ["health", "safety"],
    tokens: {
      background: "#FAFFFC",
      text: "#102018",
      muted: "#52675B",
      accent: "#047857",
      accent2: "#1D4ED8",
      soft: "#EAFBF2",
      soft2: "#EAF2FF",
      border: "#9EDDBF",
      codeBg: "#0B2A1D",
      codeText: "#DCFCE7",
      quoteBg: "#F0FDF4",
      tableHead: "#DFF7EA"
    }
  },
  {
    id: "github-doc",
    label: "GitHub Doc",
    description: "Developer-documentation look for tutorials, API notes, tooling walkthroughs, and changelogs.",
    categories: ["tutorial", "tools", "developer"],
    tokens: {
      background: "#FFFFFF",
      text: "#24292F",
      muted: "#57606A",
      accent: "#0969DA",
      accent2: "#1A7F37",
      soft: "#F6F8FA",
      soft2: "#EEF6FF",
      border: "#D0D7DE",
      codeBg: "#24292F",
      codeText: "#F6F8FA",
      quoteBg: "#F6F8FA",
      tableHead: "#F6F8FA"
    }
  },
  {
    id: "essay-paper",
    label: "Essay Paper",
    description: "Quiet paper-like layout for personal essays, reflection, field notes, and story-driven posts.",
    categories: ["essay", "personal"],
    tokens: {
      background: "#FFFDF7",
      text: "#2B2925",
      muted: "#6F6659",
      accent: "#6D5A3D",
      accent2: "#2F6B5F",
      soft: "#F7F1E4",
      soft2: "#EAF5F1",
      border: "#E0D4BE",
      codeBg: "#2C2924",
      codeText: "#FFF8E7",
      quoteBg: "#FAF4E8",
      tableHead: "#F3EAD8"
    }
  },
  {
    id: "news-brief",
    label: "News Brief",
    description: "Crisp red, black, and gray news style for timely commentary, announcements, and policy notes.",
    categories: ["news", "commentary"],
    tokens: {
      background: "#FFFFFF",
      text: "#111827",
      muted: "#60646C",
      accent: "#B91C1C",
      accent2: "#1F2937",
      soft: "#FEF2F2",
      soft2: "#F3F4F6",
      border: "#F4A6A6",
      codeBg: "#18181B",
      codeText: "#F4F4F5",
      quoteBg: "#FFF5F5",
      tableHead: "#FEE2E2"
    }
  },
  {
    id: "minimal-ink",
    label: "Minimal Ink",
    description: "Low-noise black, white, and jade accents for long-form reading and evergreen articles.",
    categories: ["minimal", "evergreen"],
    tokens: {
      background: "#FFFFFF",
      text: "#111111",
      muted: "#5F6368",
      accent: "#111111",
      accent2: "#0F766E",
      soft: "#F5F5F4",
      soft2: "#EFFAF6",
      border: "#DADADA",
      codeBg: "#111111",
      codeText: "#FAFAFA",
      quoteBg: "#F7F7F7",
      tableHead: "#F5F5F4"
    }
  }
];

export function listThemes() {
  return themeCatalog.map(({ id, label, description, categories }) => ({
    id,
    label,
    description,
    categories
  }));
}

export function getTheme(themeId = "minimal-ink") {
  const theme = themeCatalog.find((item) => item.id === themeId);
  if (!theme) {
    const ids = themeCatalog.map((item) => item.id).join(", ");
    throw new Error(`Unknown theme "${themeId}". Available themes: ${ids}`);
  }
  return theme;
}
