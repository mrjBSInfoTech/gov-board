import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

function getValue(item, key) {
  if (!key) return "-";

  if (typeof key === "function") {
    return key(item);
  }

  return (
    key
      .split(".")
      .reduce(
        (value, part) => (value == null ? undefined : value[part]),
        item,
      ) ?? "-"
  );
}

export default function PeopleCardList({
  items = [],
  columns = [],
  rowKey,
  renderActions,
  emptyMessage = "No records found.",
}) {
  if (!items.length) {
    return (
      <Box sx={{ textAlign: "center", mt: 6 }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {items.map((item) => (
        <Card
          key={
            typeof rowKey === "function"
              ? rowKey(item)
              : item.id || item.student_id || item.officer_id
          }
          sx={{
            borderRadius: 3,
            border: "1px solid rgba(148, 163, 184, 0.35)",
            borderColor: "rgba(148, 163, 184, 0.35)",
            background:
              "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.88))",
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.22)",
            overflow: "hidden",
          }}
        >
          <CardContent sx={{ p: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
                {columns.map((column) => (
                  <Box
                    key={column.key || column.label}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                      py: 1.1,
                      px: 1,
                      borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        color: "rgba(148, 163, 184, 0.82)",
                        fontWeight: 800,
                        minWidth: 110,
                        fontSize: "0.67rem",
                        lineHeight: 1.4,
                      }}
                    >
                      {column.label}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: "#e6edf8",
                        wordBreak: "break-word",
                        textAlign: "right",
                        flex: 1,
                        fontSize: "0.96rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {column.render
                        ? column.render(item)
                        : getValue(item, column.key)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {renderActions && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    minWidth: 52,
                    ml: "auto",
                    alignSelf: "stretch",
                    px: 0.5,
                    py: 0.5,
                    borderLeft: "1px solid rgba(148, 163, 184, 0.18)",
                    background: "rgba(148, 163, 184, 0.04)",
                    borderRadius: 1.5,
                  }}
                >
                  {renderActions(item)}
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
