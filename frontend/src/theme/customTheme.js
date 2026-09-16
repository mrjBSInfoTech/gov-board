import { createTheme } from "@mui/material/styles";

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563eb",
      light: "#60a5fa",
      dark: "#1d4ed8",
      contrastText: "#ffffff",
    },
    success: {
      main: "#22c55e",
      light: "#4ade80",
      dark: "#16a34a",
    },
    error: {
      main: "#dc2626",
      light: "#ef4444",
      dark: "#b91c1c",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
      table: "#ffffff",
      sidebar: "#374151",
      header: "#374151",
      footer: "#374151",
    },
    text: {
      primary: "#0f172a",
      secondary: "#475569",
      disabled: "#94a3b8",
      sidebar: "#ffffff",
    },
    divider: "#e2e8f0",
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          backgroundColor: "#f5f5f5",
        },
        body: {
          backgroundColor: "#f5f5f5",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#3b82f6",
      light: "#60a5fa",
      dark: "#2563eb",
      contrastText: "#ffffff",
    },
    success: {
      main: "#22c55e",
      light: "#4ade80",
      dark: "#16a34a",
    },
    error: {
      main: "#ef4444",
      light: "#f87171",
      dark: "#dc2626",
    },
    background: {
      default: "#0f172a",
      paper: "#1e293b",
      table: "#0f172a",
      sidebar: "#1f2937",
      header: "#1f2937",
      footer: "#1f2937",
    },
    text: {
      primary: "#f8fafc",
      secondary: "#94a3b8",
      disabled: "#64748b",
    },
    divider: "#334155",
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          backgroundColor: "#0f172a",
        },
        body: {
          backgroundColor: "#0f172a",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: "1px solid #334155",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
          background: "#1e293b",
        },
      },
    },
  },
});

export const adminLightTheme = createTheme(lightTheme, {
  palette: {
    primary: {
      main: "#0f766e",
      light: "#2dd4bf",
      dark: "#115e59",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f4f7f8",
      paper: "#ffffff",
      table: "#ffffff",
      sidebar: "#17212b",
      header: "#17212b",
      footer: "#17212b",
    },
    text: {
      primary: "#17212b",
      secondary: "#5b6875",
      disabled: "#9aa7b2",
      sidebar: "#eef4f5",
    },
    divider: "#dce5e8",
  },
  typography: {
    fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { backgroundColor: "#f4f7f8" },
        body: { backgroundColor: "#f4f7f8" },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 8,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: "1px solid #dce5e8",
          boxShadow: "0 8px 24px rgba(23, 33, 43, 0.06)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: "#dce5e8" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "#e7edef" },
        head: {
          backgroundColor: "#f6f9fa",
          color: "#5b6875",
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td": { borderBottom: 0 },
          "&:hover": { backgroundColor: "#f7fbfb !important" },
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: "1px solid #dce5e8",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(23, 33, 43, 0.18)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});

export const adminDarkTheme = createTheme(darkTheme, {
  palette: {
    primary: { main: "#2dd4bf", light: "#5eead4", dark: "#0f766e" },
    background: {
      default: "#101820",
      paper: "#18232c",
      table: "#18232c",
      sidebar: "#0d171f",
      header: "#0d171f",
      footer: "#0d171f",
    },
    text: { primary: "#edf7f7", secondary: "#a9b9bf", disabled: "#6f8189" },
    divider: "#2b3a43",
  },
  typography: adminLightTheme.typography,
  components: adminLightTheme.components,
});
