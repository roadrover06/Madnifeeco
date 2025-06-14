import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Box, Typography, TextField, Button, Paper, Divider, Alert } from '@mui/material';
import { sendPasswordResetEmail, updateProfile } from 'firebase/auth';

const Profile = () => {
  const user = auth.currentUser;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFirstName(docSnap.data().firstName || '');
          setLastName(docSnap.data().lastName || '');
        }
      }
    };
    fetchUserData();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName
      });
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`.trim()
      });
      setSuccessMsg('Profile updated successfully.');
    } catch (err) {
      setErrorMsg('Failed to update profile.');
    }
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setSuccessMsg('Password reset email sent! Please check your inbox.');
    } catch (err) {
      setErrorMsg('Failed to send password reset email.');
    }
    setLoading(false);
  };

  return (
    <Box sx={{
      maxWidth: 400,
      mx: 'auto',
      mt: 6,
      p: 2
    }}>
      <Paper elevation={2} sx={{
        p: 4,
        borderRadius: 3,
        boxShadow: '0 2px 12px 0 rgba(111,78,55,0.07)'
      }}>
        <Typography variant="h5" fontWeight={700} mb={2} align="center">
          Profile
        </Typography>
        <Divider sx={{ mb: 3 }} />
        {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
        {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
        <form onSubmit={handleSave}>
          <TextField
            label="Email"
            value={email}
            fullWidth
            margin="normal"
            InputProps={{ readOnly: true }}
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <TextField
            label="First Name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            fullWidth
            margin="normal"
            required
            variant="outlined"
          />
          <TextField
            label="Last Name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            fullWidth
            margin="normal"
            required
            variant="outlined"
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2, mb: 1, textTransform: 'none', fontWeight: 600 }}
            disabled={loading}
          >
            Save Changes
          </Button>
        </form>
        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" fontWeight={500} mb={1}>
          Change Password
        </Typography>
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          onClick={handlePasswordReset}
          disabled={loading || resetSent}
          sx={{ textTransform: 'none', fontWeight: 500 }}
        >
          {resetSent ? 'Reset Email Sent' : 'Send Password Reset Email'}
        </Button>
      </Paper>
    </Box>
  );
};

export default Profile;
