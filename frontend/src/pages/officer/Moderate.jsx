import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PeopleCardList from "../../components/common/PeopleCardList";

export default function Moderate() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const token = localStorage.getItem("officer_token");
        if (!token) {
          setErrorMessage("Officer session is missing.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          "http://localhost:5000/api/officer/moderate/same-section",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to load members.");
        }

        setMembers(Array.isArray(data) ? data : []);
      } catch (error) {
        setErrorMessage(error.message || "Unable to load member list.");
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, []);

  const memberTypeOptions = useMemo(() => {
    const options = new Set(members.map((member) => member.member_type));
    return ["All", ...Array.from(options)];
  }, [members]);

  const filteredMembers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return members.filter((member) => {
      const matchesType =
        selectedType === "All" || member.member_type === selectedType;
      const searchString =
        `${member.first_name} ${member.last_name} ${member.student_number} ${member.position || ""} ${member.section || ""}`.toLowerCase();
      const matchesSearch = !keyword || searchString.includes(keyword);
      return matchesType && matchesSearch;
    });
  }, [members, searchTerm, selectedType]);

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Moderate</title>
      </Helmet>

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 }, mb: 1 }}
        >
          Moderate
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Students and officers from your section.
        </Typography>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {!loading && (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 3,
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
          }}
        >
          <TextField
            fullWidth
            size="small"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name or number"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: { sm: 360 },
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(15, 23, 42, 0.55)",
                borderRadius: 2,
              },
            }}
          />

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <Select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              sx={{
                backgroundColor: "rgba(15, 23, 42, 0.55)",
                borderRadius: 2,
                color: "#fff",
              }}
            >
              {memberTypeOptions.map((type) => (
                <MenuItem key={type} value={type}>
                  {type === "All" ? "All Members" : type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <PeopleCardList
          items={filteredMembers}
          rowKey={(member) => `${member.member_type}-${member.id}`}
          emptyMessage="No students or officers found in this section."
          columns={[
            { label: "Type", key: "member_type" },
            {
              label: "Name",
              render: (member) => `${member.first_name} ${member.last_name}`,
            },
            { label: "Student Number", key: "student_number" },
            { label: "Position", key: "position" },
            { label: "Year", key: "year" },
            { label: "Section", key: "section" },
          ]}
        />
      )}
    </Box>
  );
}
