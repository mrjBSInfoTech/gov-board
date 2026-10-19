import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const formatAmount = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const statusColors = {
  Planned: { background: "rgba(59, 130, 246, 0.12)", color: "#1d4ed8" },
  Ongoing: { background: "rgba(20, 184, 166, 0.12)", color: "#0f766e" },
  Completed: { background: "rgba(100, 116, 139, 0.12)", color: "#475569" },
};

const formatDate = (dateValue) => {
  if (!dateValue) return "No date selected";
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dateValue
    : new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
};

function Detail({ label, value, strong = false, icon = null }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 0.15 }}
      >
        {label}
      </Typography>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 0.7, minWidth: 0 }}
      >
        {icon}
        <Typography
          noWrap
          variant="body2"
          sx={{
            fontWeight: strong ? 800 : 600,
            color: strong ? "#0f766e" : "text.primary",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function BudgetCard({ budget, onEdit, onDelete }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const planned = Number(budget.planned_amount || 0);
  const spent = Number(budget.spent_amount || 0);
  const remaining = planned - spent;
  const progress = Math.min(100, (spent / (planned || 1)) * 100);
  const status = statusColors[budget.status] || statusColors.Planned;
  const closeMenu = () => setMenuAnchor(null);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: "rgba(148, 163, 184, 0.25)",
        transition: "border-color 160ms ease, box-shadow 160ms ease",
        "&:hover": {
          borderColor: "rgba(20, 184, 166, 0.5)",
          boxShadow: "0 10px 26px rgba(15, 23, 42, 0.08)",
        },
      }}
    >
      <CardContent
        sx={{ p: 2.25, position: "relative", "&:last-child": { pb: 2.25 } }}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr", rowGap: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              minWidth: 0,
              pr: 4,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                borderRadius: 2,
                bgcolor: "rgba(20, 184, 166, 0.12)",
                color: "#0f766e",
              }}
            >
              <AccountBalanceOutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  minWidth: 0,
                }}
              >
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800 }}>
                  {budget.budget_name}
                </Typography>
                <Chip
                  label={budget.status}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    height: 24,
                    fontWeight: 700,
                    backgroundColor: status.background,
                    color: status.color,
                  }}
                />
              </Box>
              <Typography variant="body2" noWrap color="text.secondary">
                {budget.description ||
                  budget.category ||
                  "No description provided."}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ mt: 0.75, height: 4, borderRadius: 3 }}
              />
            </Box>
          </Box>

          <Detail
            label="Budget usage"
            value={`${formatAmount(spent)} / ${formatAmount(planned)}`}
            strong
          />
          <Detail label="Remaining" value={formatAmount(remaining)} />
          <Detail
            label="Budget date"
            value={formatDate(budget.budget_period)}
            icon={<CalendarTodayOutlinedIcon fontSize="small" color="action" />}
          />

          <IconButton
            aria-label={`Actions for ${budget.budget_name}`}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            size="small"
            sx={{ position: "absolute", top: 14, right: 14 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={closeMenu}
        >
          <MenuItem
            onClick={() => {
              closeMenu();
              onEdit(budget);
            }}
            sx={{ color: "success.main" }}
          >
            <EditOutlinedIcon fontSize="small" sx={{ mr: 1.25 }} /> Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              closeMenu();
              onDelete(budget);
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteOutlineIcon fontSize="small" sx={{ mr: 1.25 }} /> Delete
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
}
