import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
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
  Collecting: { background: "rgba(20, 184, 166, 0.12)", color: "#0f766e" },
  Active: { background: "rgba(59, 130, 246, 0.12)", color: "#1d4ed8" },
  Closed: { background: "rgba(100, 116, 139, 0.12)", color: "#475569" },
};

const formatDeadline = (deadline) => {
  if (!deadline) return "No deadline";
  const date = new Date(`${deadline}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? deadline
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

export default function FundCard({ fund, onEdit, onDelete, onContribute }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const status = statusColors[fund.status] || statusColors.Collecting;
  const progress = Math.min(
    100,
    (Number(fund.total_contributed || 0) / Number(fund.target_amount || 1)) *
      100,
  );

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
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr",
            alignItems: "center",
            columnGap: 1.5,
            rowGap: 1.5,
          }}
        >
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
              <AccountBalanceWalletOutlinedIcon />
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
                  {fund.fund_name}
                </Typography>
                <Chip
                  label={fund.status}
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
                {fund.description || "No description provided."}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ mt: 0.75, height: 4, borderRadius: 3 }}
              />
            </Box>
          </Box>

          <Detail
            label={fund.completion_status || "Collected"}
            value={`${formatAmount(fund.total_contributed)} / ${formatAmount(fund.target_amount)}`}
            strong
          />
          <Detail
            label="Contribution"
            value={`${formatAmount(fund.contribution_amount)} per student`}
          />
          <Detail
            label="Deadline"
            value={formatDeadline(fund.deadline)}
            icon={<CalendarTodayOutlinedIcon fontSize="small" color="action" />}
          />

          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              closeMenu();
              onContribute(fund);
            }}
            sx={{
              width: "100%",
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Record
          </Button>

          <IconButton
            aria-label={`Actions for ${fund.fund_name}`}
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
              onEdit(fund);
            }}
            sx={{ color: "success.main" }}
          >
            <EditOutlinedIcon fontSize="small" sx={{ mr: 1.25 }} /> Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              closeMenu();
              onDelete(fund);
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
