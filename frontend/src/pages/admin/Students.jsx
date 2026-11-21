import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  addAccount,
  deleteAccount,
  fetchAccounts,
  updateAccount,
} from "../../api/admin/accountAPI";
import {
  deleteStudent,
  fetchStudents,
  updateStudent,
} from "../../api/admin/studentAPI";
import AccountDelete from "../../components/admin/Account/AccountDelete";
import AccountForm from "../../components/admin/Account/AccountForm";
import AccountInfo from "../../components/admin/Account/AccountInfo";
import StudentForm from "../../components/admin/Student/StudentForm";
import PeopleCardList from "../../components/common/PeopleCardList";

const ACCOUNT_FILTERS = [
  { value: "all", label: "All students and officers" },
  { value: "officer", label: "Officers only" },
  { value: "student", label: "Students only" },
];
export default function Students() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState("All");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [officerFormOpen, setOfficerFormOpen] = useState(false);
  const [officerInfoOpen, setOfficerInfoOpen] = useState(false);
  const [officerDeleteOpen, setOfficerDeleteOpen] = useState(false);
  const [studentDeleteTarget, setStudentDeleteTarget] = useState(null);
  const isSuperAdmin =
    localStorage.getItem("admin_id") === "1" &&
    localStorage.getItem("admin_position") === "Super Admin";
  const isCollegeHead = localStorage.getItem("admin_position") === "College Head";
  const canEditStudentDetails =
    isSuperAdmin ||
    isCollegeHead ||
    (localStorage.getItem("admin_position") === "Governor" &&
      localStorage.getItem("admin_can_edit_students") === "true");
  const canDeleteStudentRecords = isSuperAdmin || isCollegeHead;
  const canCreateStudentRecords = isSuperAdmin || isCollegeHead;

  const sectionOptions = useMemo(
    () => [
      "All",
      ...new Set(accounts.map((account) => account.section).filter(Boolean)),
    ],
    [accounts],
  );

  const filteredAccounts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return accounts.filter((account) => {
      const matchesType =
        selectedType === "all" ||
        (selectedType === "officer" && account.is_officer) ||
        (selectedType === "student" && !account.is_officer);
      const matchesSection =
        selectedSection === "All" || account.section === selectedSection;
      const searchable =
        `${account.first_name} ${account.last_name} ${account.student_number} ${account.email || ""} ${account.position} ${account.course} ${account.section} ${account.college}`.toLowerCase();
      return (
        matchesType &&
        matchesSection &&
        (!keyword || searchable.includes(keyword))
      );
    });
  }, [accounts, searchTerm, selectedSection, selectedType]);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [students, officers] = await Promise.all([
        fetchStudents(),
        fetchAccounts(),
      ]);
      setAccounts(
        [
          ...students.map((student) => ({ ...student, is_officer: false })),
          ...officers.map((officer) => ({
            ...officer,
            student_id: officer.officer_id,
            is_officer: true,
          })),
        ].sort(
          (first, second) =>
            new Date(second.date_created).getTime() -
            new Date(first.date_created).getTime(),
        ),
      );
    } catch (error) {
      setErrorMessage(error.message || "Unable to load students and officers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const handleStudentSubmit = async (formData) => {
    await updateStudent(selectedStudent.student_id, formData);
    setStudentFormOpen(false);
    setSelectedStudent(null);
    setSnackbarMessage("Student account updated.");
    await loadAccounts();
  };

  const handleOfficerSubmit = async (formData) => {
    if (selectedOfficer) {
      await updateAccount(selectedOfficer.officer_id, formData);
      setSnackbarMessage("Officer account updated.");
    } else {
      await addAccount(formData);
      setSnackbarMessage("Officer account created.");
    }
    setOfficerFormOpen(false);
    setSelectedOfficer(null);
    await loadAccounts();
  };

  const handleDeleteOfficer = async (id) => {
    try {
      await deleteAccount(id);
      setOfficerDeleteOpen(false);
      setSelectedOfficer(null);
      setSnackbarMessage("Officer account deleted.");
      await loadAccounts();
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete officer account.");
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentDeleteTarget) return;
    try {
      await deleteStudent(studentDeleteTarget.student_id);
      setStudentDeleteTarget(null);
      setSnackbarMessage("Student account deleted.");
      await loadAccounts();
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete student account.");
    }
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
          alignItems: { xs: "stretch", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
        >
          Students
        </Typography>
        {canCreateStudentRecords && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedOfficer(null);
              setOfficerFormOpen(true);
            }}
          >
            Add Officer
          </Button>
        )}
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage("")}>
          {errorMessage}
        </Alert>
      )}

      {!loading && (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 2,
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
          }}
        >
          <TextField
            fullWidth
            size="small"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, student number, course, or college"
            sx={{ maxWidth: { md: 360 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: { md: 220 } }}>
            <Select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              aria-label="Filter by account type"
            >
              {ACCOUNT_FILTERS.map((filter) => (
                <MenuItem key={filter.value} value={filter.value}>
                  {filter.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { md: 170 } }}>
            <Select
              value={selectedSection}
              onChange={(event) => setSelectedSection(event.target.value)}
              aria-label="Filter by section"
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
          items={filteredAccounts}
          rowKey={(account) =>
            `${account.is_officer ? "officer" : "student"}-${account.student_id}`
          }
          emptyMessage="No accounts found for this filter."
          columns={[
            { label: "Account Type", render: (account) => account.is_officer ? "Officer" : "Student" },
            { label: "Student Number", key: "student_number" },
            { label: "Email", key: "email" },
            { label: "Position", key: "position" },
            { label: "College", key: "college" },
            { label: "Course", key: "course" },
            { label: "Year", key: "year" },
            { label: "Section", key: "section" },
            { label: "First Name", key: "first_name" },
            { label: "Last Name", key: "last_name" },
          ]}
          renderActions={(account) => (
            <>
              {account.is_officer && (
                <Tooltip title="View officer">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedOfficer(account);
                      setOfficerInfoOpen(true);
                    }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {canEditStudentDetails && (
                <Tooltip title="Edit student details">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => {
                      if (account.is_officer) {
                        setSelectedOfficer(account);
                        setOfficerFormOpen(true);
                      } else {
                        setSelectedStudent(account);
                        setStudentFormOpen(true);
                      }
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {canDeleteStudentRecords && (
                <Tooltip title="Delete student">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      if (account.is_officer) {
                        setSelectedOfficer(account);
                        setOfficerDeleteOpen(true);
                      } else {
                        setStudentDeleteTarget(account);
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
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
        onSubmit={handleStudentSubmit}
      />
      <AccountForm
        open={officerFormOpen}
        handleClose={() => {
          setOfficerFormOpen(false);
          setSelectedOfficer(null);
        }}
        selectedAccount={selectedOfficer}
        onSubmit={handleOfficerSubmit}
      />
      <AccountInfo
        open={officerInfoOpen}
        handleClose={() => setOfficerInfoOpen(false)}
        selectedAccount={selectedOfficer}
      />
      <AccountDelete
        open={officerDeleteOpen}
        handleClose={() => {
          setOfficerDeleteOpen(false);
          setSelectedOfficer(null);
        }}
        selectedAccount={selectedOfficer}
        onDelete={handleDeleteOfficer}
      />
      <Dialog
        open={Boolean(studentDeleteTarget)}
        onClose={() => setStudentDeleteTarget(null)}
      >
        <DialogTitle>Delete Student Account</DialogTitle>
        <DialogContent>
          <Typography>
            Delete {studentDeleteTarget?.first_name} {studentDeleteTarget?.last_name}'s
            student account? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentDeleteTarget(null)}>Cancel</Button>
          <Button color="error" onClick={handleDeleteStudent}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={3500}
        onClose={() => setSnackbarMessage("")}
        message={snackbarMessage}
      />
    </Box>
  );
}
