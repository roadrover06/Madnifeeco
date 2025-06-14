// src/pages/employees/Employees.js
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, addDoc, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  DialogContentText,
  Snackbar,
  Divider // <-- Add this import
} from '@mui/material';
import EmployeeForm from './EmployeeForm';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import MuiAlert from '@mui/material/Alert';
import { generateReferralCode } from '../../utils/referralUtils';

const roles = [
  { value: 'staff', label: 'Staff', color: 'default' },
  { value: 'manager', label: 'Manager', color: 'primary' },
  { value: 'admin', label: 'Admin', color: 'secondary' },
  { value: 'owner', label: 'Owner', color: 'warning' },
];

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const [referralRole, setReferralRole] = useState('staff');
  const [activeReferralCodes, setActiveReferralCodes] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [referralCodesForEmployee, setReferralCodesForEmployee] = useState([]);
  const [referralCodesDialogOpen, setReferralCodesDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch employees
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        const employeesData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEmployees(employeesData);

        // Fetch active referral codes count for each employee
        const referralCodesQuery = query(collection(db, 'referralCodes'));
        const referralCodesSnapshot = await getDocs(referralCodesQuery);
        
        const codesCount = {};
        referralCodesSnapshot.forEach(doc => {
          const data = doc.data();
          if (!data.used && data.ownerId) {
            codesCount[data.ownerId] = (codesCount[data.ownerId] || 0) + 1;
          }
        });
        
        setActiveReferralCodes(codesCount);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpdateEmployee = async (employeeData) => {
    try {
      const employeeRef = doc(db, 'users', editingEmployee.id);
      await updateDoc(employeeRef, employeeData);
      setEmployees(employees.map(e => 
        e.id === editingEmployee.id ? { ...e, ...employeeData } : e
      ));
      setEditingEmployee(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error updating employee:', error);
    }
  };

  // Modified: Show confirm dialog before deletion, show snackbar after
  const handleDeleteEmployee = async (employeeId) => {
    setDeleteDialogOpen(false);
    try {
      await deleteDoc(doc(db, 'users', employeeId));
      setEmployees(employees.filter(e => e.id !== employeeId));
      setSnackbar({
        open: true,
        message: 'Employee deleted successfully.',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting employee:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting employee.',
        severity: 'error'
      });
    }
  };

  const handleGenerateReferralCode = () => {
    const code = generateReferralCode(referralRole);
    setGeneratedCode(code);
  };

  const handleAddReferralCode = async () => {
    if (!selectedEmployee || !generatedCode) return;

    try {
      // Add to referralCodes collection
      await addDoc(collection(db, 'referralCodes'), {
        code: generatedCode,
        role: referralRole,
        used: false,
        ownerId: selectedEmployee.id,
        ownerEmail: selectedEmployee.email,
        createdAt: new Date()
      });

      // Update local state
      const newCount = (activeReferralCodes[selectedEmployee.id] || 0) + 1;
      setActiveReferralCodes({
        ...activeReferralCodes,
        [selectedEmployee.id]: newCount
      });

      setGeneratedCode('');
      setReferralDialogOpen(false);
    } catch (error) {
      console.error('Error adding referral code:', error);
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const openReferralDialog = (employee) => {
    setSelectedEmployee(employee);
    setReferralDialogOpen(true);
    setGeneratedCode('');
    setReferralRole('staff');
  };

  const handleViewReferralCodes = async (employee) => {
    setSelectedEmployee(employee);
    setReferralCodesDialogOpen(true);
    // Fetch all referral codes for this employee
    const q = query(collection(db, 'referralCodes'), where('ownerId', '==', employee.id));
    const snapshot = await getDocs(q);
    setReferralCodesForEmployee(snapshot.docs.map(doc => doc.data()));
  };

  const getRoleColor = (roleValue) => {
    const role = roles.find(r => r.value === roleValue);
    return role ? role.color : 'default';
  };

  const getRoleLabel = (roleValue) => {
    const role = roles.find(r => r.value === roleValue);
    return role ? role.label : roleValue;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      p: { xs: 1, md: 4 },
      background: 'linear-gradient(120deg, #f9f5f0 60%, #f5f0e6 100%)',
      minHeight: '100vh'
    }}>
      <Typography variant="h4" gutterBottom sx={{
        fontFamily: '"Playfair Display", serif',
        color: '#4e342e',
        fontWeight: 700,
        mb: 3
      }}>
        Employees Management
      </Typography>

      <Box sx={{
        mb: 3,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center'
      }}>
        {/* Removed Add Employee Button */}
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setReferralDialogOpen(true)}
          sx={{
            borderRadius: 2,
            fontWeight: 600,
            px: 3,
            py: 1,
            ml: 2,
            color: '#4e342e',
            borderColor: '#bdbdbd',
            background: 'rgba(255,255,255,0.7)',
            '&:hover': { borderColor: '#8d6e63', background: '#f5f0e6' }
          }}
        >
          Generate Referral Code
        </Button>
      </Box>

      {/* Employee Form Dialog */}
      <Dialog
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingEmployee(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <EmployeeForm
            employee={editingEmployee}
            onSubmit={handleUpdateEmployee}
            onCancel={() => {
              setShowForm(false);
              setEditingEmployee(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <TableContainer component={Paper} sx={{
        borderRadius: 3,
        border: '1.5px solid #ede7e3',
        background: 'rgba(255,255,255,0.97)',
        boxShadow: 'none',
        animation: 'fadeIn 0.7s',
        mt: 2
      }}>
        <Table>
          <TableHead>
            <TableRow sx={{
              backgroundColor: '#f5f5f5',
              '& th': {
                fontWeight: 600,
                fontSize: '1rem',
                color: '#4e342e',
                borderBottom: 'none'
              }
            }}>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Active Referral Codes</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map(employee => (
              <TableRow
                key={employee.id}
                hover
                sx={{
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  '&:hover': { backgroundColor: '#f9f5f0' }
                }}
              >
                <TableCell sx={{ fontWeight: 500, color: '#5d4037' }}>
                  {employee.firstName} {employee.lastName}
                </TableCell>
                <TableCell sx={{ color: '#6d4c41' }}>{employee.email}</TableCell>
                <TableCell>
                  <Chip
                    label={getRoleLabel(employee.role)}
                    color={getRoleColor(employee.role)}
                    sx={{ borderRadius: 1, fontWeight: 500 }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      fontWeight: 500,
                      px: 2,
                      py: 0.5,
                      minWidth: 0,
                      color: '#4e342e',
                      borderColor: '#bdbdbd',
                      background: 'rgba(255,255,255,0.7)',
                      '&:hover': { borderColor: '#8d6e63', background: '#f5f0e6' }
                    }}
                    onClick={() => handleViewReferralCodes(employee)}
                  >
                    View ({activeReferralCodes[employee.id] || 0})
                  </Button>
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => {
                      setEditingEmployee(employee);
                      setShowForm(true);
                    }}
                    disabled={employee.id === auth.currentUser?.uid}
                  >
                    <EditIcon color="primary" />
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      setEmployeeToDelete(employee);
                      setDeleteDialogOpen(true);
                    }}
                    disabled={employee.id === auth.currentUser?.uid}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(24px);}
              to { opacity: 1; transform: none;}
            }
          `}
        </style>
      </TableContainer>

      {/* Referral Code Generation Dialog */}
      <Dialog
        open={referralDialogOpen}
        onClose={() => setReferralDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{
          fontWeight: 700,
          color: '#4e342e',
          fontFamily: '"Playfair Display", serif'
        }}>
          Generate Referral Code
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, color: '#8d6e63' }}>
            Assign a referral code to an employee for inviting new staff.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Employee</InputLabel>
              <Select
                value={selectedEmployee?.id || ''}
                onChange={(e) => {
                  const employee = employees.find(emp => emp.id === e.target.value);
                  setSelectedEmployee(employee);
                }}
                label="Select Employee"
                sx={{ borderRadius: 2, background: '#faf9f7' }}
              >
                {employees.map(employee => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} ({employee.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Role for Referral</InputLabel>
              <Select
                value={referralRole}
                onChange={(e) => setReferralRole(e.target.value)}
                label="Role for Referral"
                sx={{ borderRadius: 2, background: '#faf9f7' }}
              >
                {roles.map(role => (
                  <MenuItem
                    key={role.value}
                    value={role.value}
                  >
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box display="flex" alignItems="center" gap={2}>
              <TextField
                fullWidth
                label="Referral Code"
                value={generatedCode}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ borderRadius: 2, background: '#faf9f7' }}
              />
              <Button
                variant="outlined"
                onClick={handleGenerateReferralCode}
                disabled={!selectedEmployee}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  px: 2,
                  py: 1,
                  color: '#4e342e',
                  borderColor: '#bdbdbd',
                  background: 'rgba(255,255,255,0.7)',
                  '&:hover': { borderColor: '#8d6e63', background: '#f5f0e6' }
                }}
              >
                Generate
              </Button>
              {generatedCode && (
                <Tooltip title="Copy to clipboard">
                  <IconButton onClick={() => handleCopyToClipboard(generatedCode)}>
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          background: 'rgba(255,255,255,0.95)',
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
          px: 4, py: 2
        }}>
          <Button onClick={() => setReferralDialogOpen(false)} sx={{
            borderRadius: 2,
            color: '#4e342e',
            fontWeight: 600,
            px: 3,
            py: 1,
            background: 'rgba(255,255,255,0.7)',
            '&:hover': { background: '#f5f0e6' }
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddReferralCode}
            variant="contained"
            disabled={!generatedCode || !selectedEmployee}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              px: 3,
              py: 1,
              background: '#6f4e37',
              '&:hover': { background: '#5d4037' }
            }}
          >
            Add Referral Code
          </Button>
        </DialogActions>
      </Dialog>

      {/* Referral Codes List Dialog */}
      <Dialog
        open={referralCodesDialogOpen}
        onClose={() => setReferralCodesDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{
          fontWeight: 700,
          color: '#4e342e',
          fontFamily: '"Playfair Display", serif'
        }}>
          Referral Codes for {selectedEmployee?.firstName} {selectedEmployee?.lastName}
        </DialogTitle>
        <DialogContent>
          {referralCodesForEmployee.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#8d6e63', mt: 2 }}>
              No referral codes found for this employee.
            </Typography>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#6d4c41' }}>
                <strong>Active Codes</strong>
              </Typography>
              {referralCodesForEmployee.filter(code => !code.used).length === 0 ? (
                <Typography variant="body2" sx={{ color: '#bdbdbd', mb: 2 }}>
                  None
                </Typography>
              ) : (
                referralCodesForEmployee.filter(code => !code.used).map((code, idx) => (
                  <Box key={idx} sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 1,
                    p: 1,
                    borderRadius: 2,
                    background: '#f5f0e6'
                  }}>
                    <Typography sx={{ fontWeight: 600, color: '#4e342e', mr: 2 }}>
                      {code.code}
                    </Typography>
                    <Chip label={getRoleLabel(code.role)} size="small" sx={{ mr: 2 }} />
                    <Chip label="Active" color="success" size="small" />
                  </Box>
                ))
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#6d4c41' }}>
                <strong>Used Codes</strong>
              </Typography>
              {referralCodesForEmployee.filter(code => code.used).length === 0 ? (
                <Typography variant="body2" sx={{ color: '#bdbdbd' }}>
                  None
                </Typography>
              ) : (
                referralCodesForEmployee.filter(code => code.used).map((code, idx) => (
                  <Box key={idx} sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 1,
                    p: 1,
                    borderRadius: 2,
                    background: '#f9f5f0'
                  }}>
                    <Typography sx={{ fontWeight: 600, color: '#bdbdbd', mr: 2 }}>
                      {code.code}
                    </Typography>
                    <Chip label={getRoleLabel(code.role)} size="small" sx={{ mr: 2 }} />
                    <Chip label="Used" color="default" size="small" />
                  </Box>
                ))
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{
          background: 'rgba(255,255,255,0.95)',
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
          px: 4, py: 2
        }}>
          <Button onClick={() => setReferralCodesDialogOpen(false)} sx={{
            borderRadius: 2,
            color: '#4e342e',
            fontWeight: 600,
            px: 3,
            py: 1,
            background: 'rgba(255,255,255,0.7)',
            '&:hover': { background: '#f5f0e6' }
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Employee</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{' '}
            <strong>
              {employeeToDelete?.firstName} {employeeToDelete?.lastName}
            </strong>
            ? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              borderRadius: 2,
              color: '#4e342e',
              fontWeight: 600,
              px: 3,
              py: 1,
              background: 'rgba(255,255,255,0.7)',
              '&:hover': { background: '#f5f0e6' }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleDeleteEmployee(employeeToDelete.id)}
            variant="contained"
            color="error"
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              px: 3,
              py: 1
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for deletion success/error */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ borderRadius: 2, fontWeight: 500 }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default Employees;