import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createAccountApi } from "../../api/accountAPI";

export default function AccountSettings({ role, onProfileUpdated }) {
  const [account] = useState(() => ({ first_name: "", last_name: "", student_number: "" }));
  const [profile, setProfile] = useState(account);
  const [password, setPassword] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const api = useMemo(() => createAccountApi(role), [role]);

  useEffect(() => {
    api.getAccount()
      .then(setProfile)
      .catch((error) => setMessage({ type: "error", text: error.message }))
      .finally(() => setLoading(false));
  }, [api]);

  const updateProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateAccount(profile);
      setProfile(updated);
      onProfileUpdated?.(updated);
      setMessage({ type: "success", text: "Personal information updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async (event) => {
    event.preventDefault();
    if (password.new_password !== password.confirm_password) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.changePassword(password);
      setPassword({ current_password: "", new_password: "", confirm_password: "" });
      setMessage({ type: "success", text: "Password changed successfully." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography>Loading account...</Typography>;

  return (
    <Stack spacing={3} sx={{ maxWidth: 700 }}>
      {message && <Alert severity={message.type}>{message.text}</Alert>}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Personal information</Typography>
          <Box component="form" onSubmit={updateProfile}>
            <Stack spacing={2}>
              <TextField label="First name" value={profile.first_name} onChange={(event) => setProfile({ ...profile, first_name: event.target.value })} required />
              <TextField label="Last name" value={profile.last_name} onChange={(event) => setProfile({ ...profile, last_name: event.target.value })} required />
              <TextField label="Student number" value={profile.student_number} onChange={(event) => setProfile({ ...profile, student_number: event.target.value })} required />
              <Button type="submit" variant="contained" disabled={saving}>Save changes</Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Change password</Typography>
          <Box component="form" onSubmit={updatePassword}>
            <Stack spacing={2}>
              <TextField label="Current password" type="password" value={password.current_password} onChange={(event) => setPassword({ ...password, current_password: event.target.value })} required />
              <Divider />
              <TextField label="New password" type="password" helperText="At least 8 characters" value={password.new_password} onChange={(event) => setPassword({ ...password, new_password: event.target.value })} required inputProps={{ minLength: 8 }} />
              <TextField label="Confirm new password" type="password" value={password.confirm_password} onChange={(event) => setPassword({ ...password, confirm_password: event.target.value })} required />
              <Button type="submit" variant="outlined" disabled={saving}>Change password</Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
