// src/pages/employees/EmployeeForm.js
import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Grid,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider
} from '@mui/material';

const roles = [
  { value: 'staff', label: 'Staff' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
];

const EmployeeForm = ({ employee, onSubmit, onCancel }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');

  useEffect(() => {
    if (employee) {
      setFirstName(employee.firstName || '');
      setLastName(employee.lastName || '');
      setEmail(employee.email || '');
      setRole(employee.role || 'staff');
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setRole('staff');
    }
  }, [employee]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      firstName,
      lastName,
      email,
      role
    });
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        background: 'rgba(255,255,255,0.97)',
        border: '1.5px solid #ede7e3',
        boxShadow: 'none',
        maxWidth: 520,
        mx: 'auto',
        mt: 2,
        mb: 4,
        animation: 'fadeIn 0.7s'
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 4 } }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: '#4e342e',
            mb: 2,
            fontFamily: '"Playfair Display", serif'
          }}
        >
          {employee ? 'Edit Employee' : 'Add New Employee'}
        </Typography>
        <Divider sx={{ mb: 3, borderColor: '#ede7e3' }} />
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                sx={{ borderRadius: 2, background: '#faf9f7' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                sx={{ borderRadius: 2, background: '#faf9f7' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!employee}
                sx={{ borderRadius: 2, background: '#faf9f7' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  label="Role"
                  required
                  sx={{ borderRadius: 2, background: '#faf9f7' }}
                >
                  {roles.map(role => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  sx={{
                    borderRadius: 2,
                    color: '#4e342e',
                    borderColor: '#bdbdbd',
                    px: 3,
                    py: 1,
                    background: 'rgba(255,255,255,0.7)',
                    '&:hover': { borderColor: '#8d6e63', background: '#f5f0e6' }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    borderRadius: 2,
                    fontWeight: 600,
                    px: 3,
                    py: 1,
                    background: '#6f4e37',
                    '&:hover': { background: '#5d4037' }
                  }}
                >
                  {employee ? 'Update Employee' : 'Add Employee'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </CardContent>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(24px);}
            to { opacity: 1; transform: none;}
          }
        `}
      </style>
    </Card>
  );
};

export default EmployeeForm;