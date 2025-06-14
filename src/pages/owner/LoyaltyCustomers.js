import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Container, Typography, Paper, List, Box, CircularProgress, TextField, IconButton, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, DialogContentText
} from '@mui/material';
import { format } from 'date-fns';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MuiAlert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

const LoyaltyCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'error' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });

  useEffect(() => {
    const fetchCustomers = async () => {
      const snapshot = await getDocs(collection(db, 'loyaltyCustomers'));
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name || '',
          email: d.email || '',
          phone: d.phone || '',
          points: d.points || 0,
          cardNumber: d.cardNumber || '',
          joinedAt: d.joinedAt?.toDate?.() || null,
        };
      });
      setCustomers(data);
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    let filteredData = customers;
    if (search) {
      const s = search.toLowerCase();
      filteredData = filteredData.filter(
        c =>
          c.name.toLowerCase().includes(s) ||
          c.email.toLowerCase().includes(s) ||
          c.phone.toLowerCase().includes(s) ||
          c.cardNumber.toLowerCase().includes(s)
      );
    }
    if (dateFilter) {
      filteredData = filteredData.filter(
        c => c.joinedAt && format(c.joinedAt, 'yyyy-MM-dd') === dateFilter
      );
    }
    setFiltered(filteredData);
  }, [search, dateFilter, customers]);

  const handleDelete = (id) => {
    setConfirmDialog({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDialog.id;
    setConfirmDialog({ open: false, id: null });
    try {
      await deleteDoc(doc(db, 'loyaltyCustomers', id));
      setCustomers(prev => prev.filter(c => c.id !== id));
      setSnackbar({ open: true, message: 'Customer deleted successfully.', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: 'Failed to delete customer.', severity: 'error' });
    }
  };

  const handleEditOpen = (customer) => {
    setEditCustomer({ ...customer });
    setEditDialog(true);
  };

  const handleEditChange = (e) => {
    setEditCustomer({ ...editCustomer, [e.target.name]: e.target.value });
  };

  const handleEditSave = async () => {
    const { id, ...rest } = editCustomer;
    try {
      await updateDoc(doc(db, 'loyaltyCustomers', id), rest);
      setCustomers(prev =>
        prev.map(c => (c.id === id ? { ...c, ...rest } : c))
      );
      setEditDialog(false);
      setSnackbar({ open: true, message: 'Customer updated successfully.', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: 'Failed to update customer.', severity: 'error' });
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#5d4037', letterSpacing: 1 }}>
        Loyalty Customers
      </Typography>
      <Paper sx={{ p: 2, mb: 3, background: 'rgba(245,245,245,0.7)', borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Search by name, email, phone, or card"
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#8d6e63' }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, background: '#fff' }
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              size="small"
              variant="outlined"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayIcon sx={{ color: '#8d6e63' }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, background: '#fff' }
              }}
              label="Joined Date"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <List sx={{ p: 0 }}>
          {filtered.length === 0 && (
            <Typography sx={{ color: '#bdbdbd', textAlign: 'center', mt: 4 }}>
              No customers found.
            </Typography>
          )}
          {filtered.map(customer => (
            <Paper
              key={customer.id}
              sx={{
                mb: 2,
                p: 2.5,
                borderRadius: 3,
                background: 'linear-gradient(90deg, #f9f5f0 80%, #f5f0e6 100%)',
                boxShadow: '0 2px 8px 0 rgba(93,64,55,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 4px 24px 0 rgba(93,64,55,0.08)' }
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#5d4037', fontWeight: 600 }}>
                  {customer.name}{' '}
                  {customer.cardNumber && (
                    <span style={{ color: '#8d6e63', fontWeight: 400 }}>
                      ({customer.cardNumber})
                    </span>
                  )}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                  Email: {customer.email || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                  Phone: {customer.phone || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                  Points: {customer.points}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                  Joined: {customer.joinedAt ? format(customer.joinedAt, 'MMM d, yyyy h:mm a') : 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  aria-label="edit"
                  onClick={() => handleEditOpen(customer)}
                  sx={{
                    color: '#6F4E37',
                    background: 'rgba(111,78,55,0.07)',
                    borderRadius: 2,
                    '&:hover': { background: 'rgba(111,78,55,0.15)' }
                  }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  aria-label="delete"
                  onClick={() => handleDelete(customer.id)}
                  sx={{
                    color: '#d84315',
                    background: 'rgba(216,67,21,0.07)',
                    borderRadius: 2,
                    '&:hover': { background: 'rgba(216,67,21,0.15)' }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Paper>
          ))}
        </List>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Customer</DialogTitle>
        <DialogContent>
          {editCustomer && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Name"
                name="name"
                value={editCustomer.name}
                onChange={handleEditChange}
                fullWidth
                size="small"
              />
              <TextField
                label="Email"
                name="email"
                value={editCustomer.email}
                onChange={handleEditChange}
                fullWidth
                size="small"
              />
              <TextField
                label="Phone"
                name="phone"
                value={editCustomer.phone}
                onChange={handleEditChange}
                fullWidth
                size="small"
              />
              <TextField
                label="Points"
                name="points"
                type="number"
                value={editCustomer.points}
                onChange={handleEditChange}
                fullWidth
                size="small"
              />
              <TextField
                label="Card Number"
                name="cardNumber"
                value={editCustomer.cardNumber}
                onChange={handleEditChange}
                fullWidth
                size="small"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, id: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this customer? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, id: null })} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for success */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
      {/* Alert for error */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </MuiAlert>
      </Snackbar>
    </Container>
  );
};

export default LoyaltyCustomers;
