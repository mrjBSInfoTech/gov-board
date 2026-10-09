import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import {
  fetchStudents,
  updateStudent,
} from "../../api/admin/studentAPI";
import PeopleCardList from "../../components/common/PeopleCardList";
import StudentForm from "../../components/admin/Student/StudentForm";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState("All");

  const sectionOptions = [
    "All",
    ...new Set(students.map((student) => student.section).filter(Boolean)),
  ];

  const filteredStudents = students.filter((student) => {
    const matchesSection =
      selectedSection === "All" || student.section === selectedSection;
    const keyword = searchTerm.trim().toLowerCase();
    const searchable =
      `${student.first_name} ${student.last_name} ${student.student_number} ${student.section}`.toLowerCase();

    const matchesSearch = !keyword || searchable.includes(keyword);
    return matchesSection && matchesSearch;
  });

  const loadStudents = async () => {
    try {
      setStudents(await fetchStudents());
    } catch (error) {
      setErrorMessage(error.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleOpenEdit = (student) => {
    setSelectedStudent(student);
    setStudentFormOpen(true);
  };

  const handleSubmitStudent = async (formData) => {
    await updateStudent(selectedStudent.student_id, formData);
    setStudentFormOpen(false);
    setSelectedStudent(null);
    await loadStudents();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Students</title>
      </Helmet>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
        >
          Students
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
            mb: 2,
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
          }}
        >
          <TextField
            fullWidth
            size="small"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name or student number"
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
              value={selectedSection}
              onChange={(event) => setSelectedSection(event.target.value)}
              displayEmpty
              sx={{
                backgroundColor: "rgba(15, 23, 42, 0.55)",
                borderRadius: 2,
                color: "#fff",
              }}
            >
              {sectionOptions.map((section) => (
                <MenuItem key={section} value={section}>
                  {section === "All" ? "All Sections" : `Section ${section}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <PeopleCardList
          items={filteredStudents}
          rowKey={(student) => student.student_id}
          emptyMessage="No students found for this filter."
          columns={[
            { label: "Student Number", key: "student_number" },
            { label: "Year", key: "year" },
            { label: "Section", key: "section" },
            { label: "First Name", key: "first_name" },
            { label: "Last Name", key: "last_name" },
          ]}
          renderActions={(student) => (
            <>
              <Tooltip title="View">
                <IconButton size="small" color="default">
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleOpenEdit(student)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        />
      )}

      <StudentForm
        open={studentFormOpen}
        handleClose={() => {
          setStudentFormOpen(false);
          setSelectedStudent(null);
        }}
        selectedStudent={selectedStudent}
        onSubmit={handleSubmitStudent}
      />

    </Box>
  );
}
