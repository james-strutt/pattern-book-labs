export const LANDIQ_THEME = {
  colors: {
    // Primary brand colours
    brand: {
      dark: "#002664",
      supplementary: "#002664",
      light: "#CBEDFD",
      lightBlue: "#8CE0FF",
      purple: "#9747FF",
      palePurple: "#E8D5FF",
      violet: "#7C3AED",
      violetDark: "#581C87",
      // Legacy numbered aliases (prefer semantic names above)
      navy: "#002664",
      blue01: "#002664",
      blue02: "#002664",
      blue03: "#8CE0FF",
      blue04: "#CBEDFD",
    },
    // Secondary brand colours (Waratah red spectrum)
    secondary: {
      waratahRed: "#D7153A",
      darkRed: "#630019",
      lightRed: "#FFB8C1",
      paleRed: "#FFEEEA",
      // Legacy numbered aliases (prefer semantic names above)
      red01: "#630019",
      red02: "#D7153A",
      red03: "#FFB8C1",
      red04: "#FFEEEA",
    },
    // Status colours for feedback states
    status: {
      error: "#B81237",
      errorBg: "#F7E7EB",
      errorHover: "#9A0F2E",
      success: "#008A07",
      successBg: "#E5F6E6",
      warning: "#C95000",
      warningBg: "#FBEEE5",
      warningHover: "#A84400",
      info: "#2E5299",
      // Legacy aliases (prefer semantic names above)
      danger: "#B81237",
      dangerHover: "#9A0F2E",
      errorRed: "#B81237",
      errorRedBg: "#F7E7EB",
      successGreen: "#008A07",
      successGreenBg: "#E5F6E6",
      warningOrange: "#C95000",
      warningOrangeBg: "#FBEEE5",
      warningOrangeHover: "#A84400",
    },
    // Info colours (for informational UI elements)
    info: {
      blue: "#2E5299",
      blueBg: "#EAEDF4",
      // Legacy aliases
      light: "#EAEDF4",
      dark: "#2E5299",
    },
    // Extended colour palettes for specific use cases
    warning: {
      light: "#fef3c7",
      main: "#f59e0b",
      dark: "#d97706",
      text: "#92400e",
    },
    success: {
      light: "#dcfce7",
      main: "#22c55e",
      accent: "#4ADE80",
      dark: "#16a34a",
      text: "#166534",
    },
    error: {
      light: "#fee2e2",
      main: "#ef4444",
      dark: "#dc2626",
      text: "#991b1b",
    },
    // Grey scale
    greys: {
      dark: "#22272B",
      grey02: "#495054",
      grey03: "#DCD3D6",
      grey04: "#EBEBEB",
      offWhite: "#F2F2F2",
      white: "#FFFFFF",
      // Legacy aliases
      grey01: "#22272B",
      light: "#F2F2F2",
      mid: "#DCD3D6",
    },
    // Text colours
    text: {
      dark: "#22272B",
      light: "#FFFFFF",
      focus: "#0085B3",
      muted: "#495054",
    },
    // Badge colours
    badge: {
      agency: {
        bg: "#f3e8ff",
        text: "#6b21a8",
      },
      sasDirector: {
        bg: "#fef3c7",
        text: "#92400e",
      },
      pattern: {
        bg: "#E8D5FF",
        text: "#6b21a8",
      },
      permissibility: {
        success: {
          badgeBg: "#C8E5C9",
          badgeText: "#166534",
        },
        error: {
          badgeBg: "#F0C8D1",
          badgeText: "#B81237",
        },
        info: {
          badgeBg: "#D4DAE8",
          badgeText: "#2E5299",
        },
        withConsent: {
          badgeBg: "#BBF7D0",
          badgeText: "#166534",
        },
      },
    },
    // Scenario colours (for scenario/override UI elements)
    scenario: {
      accent: "#0D9488",
      button: "#14B8A6",
    },
    // Tab colours
    tabs: {
      streetView: "#ffedd5",
      patternBook: "#E8D5FF",
    },
  },
  gradients: {
    badge: {
      lmrCatchment: "linear-gradient(to right, #002664, #146CFD)",
      todPrecinct: "linear-gradient(to right, #146CFD, #8CE0FF)",
    },
  },
  spacing: {
    controlGap: "8px",
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  sizes: {
    controlButton: "40px",
    buttonSmall: "32px",
    buttonDefault: "48px",
    buttonLarge: "64px",
  },
  borders: {
    controlWidth: "2px",
    controlRadius: "50px",
    buttonRadius: "4px",
  },
  border: {
    radius: {
      xs: "2px",
      sm: "4px",
      md: "8px",
      lg: "12px",
      pill: "16px",
      full: "9999px",
    },
  },
  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px rgba(0, 0, 0, 0.1)",
    lg: "0 8px 24px rgba(0, 0, 0, 0.15)",
    dropdown: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
  typography: {
    fontFamily:
      '"Public Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontSize: {
      "2xl": "32px",
      xl: "20px",
      lg: "18px",
      md: "16px",
      base: "16px",
      sm: "14px",
      xs: "12px",
    },
    // Font weight values for CSS fontWeight property
    // Use these values when setting fontWeight in inline styles or CSS
    fontWeight: {
      bold: "700",
      semibold: "600",
      medium: "500",
      regular: "400",
    },
    // Alias for fontWeight (for backward compatibility)
    weights: {
      bold: "700",
      semibold: "600",
      medium: "500",
      regular: "400",
      normal: "400", // Alias for regular
    },
    styles: {
      headingLarge: {
        fontFamily:
          '"Public Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: "20px",
        fontWeight: "700",
        color: "#22272B",
      },
      headingMedium: {
        fontFamily:
          '"Public Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: "18px",
        fontWeight: "600",
        color: "#22272B",
      },
      headingSmall: {
        fontFamily:
          '"Public Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: "16px",
        fontWeight: "600",
        color: "#22272B",
      },
      body: {
        fontFamily:
          '"Public Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: "16px",
        fontWeight: "400",
        color: "#22272B",
      },
      bodySmall: {
        fontFamily:
          '"Public Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: "14px",
        fontWeight: "400",
        color: "#22272B",
      },
      caption: {
        fontFamily:
          '"Public Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: "12px",
        fontWeight: "400",
        color: "#22272B",
      },
    },
  },
} as const;
