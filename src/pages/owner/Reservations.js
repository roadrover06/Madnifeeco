import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
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
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MuiAlert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [editReservation, setEditReservation] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'error' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });

  useEffect(() => {
    const fetchReservations = async () => {
      const q = query(collection(db, 'reservations'), orderBy('date', 'desc'), orderBy('time', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          customerName: d.customerName || '',
          tableNumber: d.tableNumber,
          partySize: d.partySize,
          status: d.status,
          time: d.time,
          date: d.date,
          createdAt: d.createdAt?.toDate?.() || null,
        };
      });
      setReservations(data);
      setLoading(false);
    };
    fetchReservations();
  }, []);

  useEffect(() => {
    let filteredData = reservations;
    if (search) {
      const s = search.toLowerCase();
      filteredData = filteredData.filter(
        r =>
          (r.customerName && r.customerName.toLowerCase().includes(s)) ||
          (r.tableNumber && String(r.tableNumber).includes(s)) ||
          (r.status && r.status.toLowerCase().includes(s))
      );
    }
    if (dateFilter) {
      filteredData = filteredData.filter(
        r => r.date === dateFilter
      );
    }
    if (timeFilter) {
      filteredData = filteredData.filter(
        r => r.time === timeFilter
      );
    }
    setFiltered(filteredData);
  }, [search, dateFilter, timeFilter, reservations]);

  const handleDelete = (id) => {
    setConfirmDialog({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDialog.id;
    setConfirmDialog({ open: false, id: null });
    try {
      await deleteDoc(doc(db, 'reservations', id));
      setReservations(prev => prev.filter(r => r.id !== id));
      setSnackbar({ open: true, message: 'Reservation deleted successfully.', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: 'Failed to delete reservation.', severity: 'error' });
    }
  };

  const handleEditOpen = (reservation) => {
    setEditReservation({ ...reservation });
    setEditDialog(true);
  };

  const handleEditChange = (e) => {
    setEditReservation({ ...editReservation, [e.target.name]: e.target.value });
  };

  const handleEditSave = async () => {
    const { id, ...rest } = editReservation;
    try {
      await updateDoc(doc(db, 'reservations', id), rest);
      setReservations(prev =>
        prev.map(r => (r.id === id ? { ...r, ...rest } : r))
      );
      setEditDialog(false);
      setSnackbar({ open: true, message: 'Reservation updated successfully.', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: 'Failed to update reservation.', severity: 'error' });
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#5d4037', letterSpacing: 1 }}>
        Reservations
      </Typography>
      <Paper sx={{ p: 2, mb: 3, background: 'rgba(245,245,245,0.7)', borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Search by name, table, status"
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
          <Grid item xs={12} md={4}>
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
              label="Date"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="time"
              size="small"
              variant="outlined"
              value={timeFilter}
              onChange={e => setTimeFilter(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccessTimeIcon sx={{ color: '#8d6e63' }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, background: '#fff' }
              }}
              label="Time"
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
              No reservations found.
            </Typography>
          )}
          {filtered.map(res => (
            <Paper
              key={res.id}
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
                  Table: {res.tableNumber} &nbsp;|&nbsp; Status: <span style={{ color: res.status === 'Reserved' ? '#ffa000' : res.status === 'Seated' ? '#43a047' : '#8d6e63' }}>{res.status}</span>
                </Typography>
                <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                  Name: {res.customerName || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                  Party Size: {res.partySize || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                  Date: {res.date || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                  Time: {res.time || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                  Created: {res.createdAt ? format(res.createdAt, 'MMM d, yyyy h:mm a') : 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  aria-label="edit"
                  onClick={() => handleEditOpen(res)}
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
                  onClick={() => handleDelete(res.id)}
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
        <DialogTitle>Edit Reservation</DialogTitle>
        <DialogContent>
          {editReservation && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Customer Name"
                name="customerName"
                value={editReservation.customerName}
                onChange={handleEditChange}
                fullWidth
                size="small"
              />
              <TextField
                label="Table Number"
                name="tableNumber"
                value={editReservation.tableNumber}
                onChange={handleEditChange}
                fullWidth
                size="small"
              />
              <TextField
                label="Party Size"
                name="partySize"
                type="number"
                value={editReservation.partySize}
                onChange={handleEditChange}
                fullWidth
                size="small"
              />
              <TextField
                label="Status"
                name="status"
                value={editReservation.status}
                onChange={handleEditChange}
                fullWidth
                size="small"
              />
              <TextField
                label="Date"
                name="date"
                type="date"
                value={editReservation.date}
                onChange={handleEditChange}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Time"
                name="time"
                type="time"
                value={editReservation.time}
                onChange={handleEditChange}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
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
            Are you sure you want to delete this reservation? This action cannot be undone.
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

export default Reservations;
