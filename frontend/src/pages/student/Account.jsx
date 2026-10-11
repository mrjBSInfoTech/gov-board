import { Helmet } from "react-helmet-async";
import { Box, Typography } from "@mui/material";
import AccountSettings from "../../components/account/AccountSettings";

export default function StudentAccount() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - GovBoard"><title>Account</title></Helmet>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>Account</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Manage your student information and password.
      </Typography>
      <AccountSettings
        role="student"
        onProfileUpdated={(profile) => {
          localStorage.setItem("student_first_name", profile.first_name);
          localStorage.setItem("student_last_name", profile.last_name);
          localStorage.setItem("student_student_number", profile.student_number);
          window.dispatchEvent(new Event("student-profile-updated"));
        }}
      />
    </Box>
  );
}
