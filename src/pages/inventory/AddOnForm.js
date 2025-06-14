// src/pages/inventory/AddOnForm.js
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';

const AddOnForm = () => {
  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAddOn, setNewAddOn] = useState({
    name: '',
    price: 0
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addOnToDelete, setAddOnToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addOnToEdit, setAddOnToEdit] = useState(null);
  const [editAddOn, setEditAddOn] = useState({ name: '', price: 0 });

  useEffect(() => {
    const fetchAddOns = async () => {
      try {
        const q = query(collection(db, 'addOns'));
        const querySnapshot = await getDocs(q);
        const addOnsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAddOns(addOnsData);
      } catch (error) {
        console.error('Error fetching add-ons:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAddOns();
  }, []);

  const handleAddOnChange = (e) => {
    const { name, value } = e.target;
    setNewAddOn(prev => ({
      ...prev,
      [name]: name === 'name' ? value : parseFloat(value) || 0
    }));
  };

  const handleAddAddOn = async () => {
    if (!newAddOn.name) return;
    try {
      const docRef = await addDoc(collection(db, 'addOns'), {
        ...newAddOn,
        createdAt: new Date()
      });
      setAddOns([...addOns, { id: docRef.id, ...newAddOn }]);
      setNewAddOn({ name: '', price: 0 });
    } catch (error) {
      console.error('Error adding add-on:', error);
    }
  };

  const handleDeleteAddOn = async (id) => {
    setDeleteDialogOpen(false);
    try {
      await deleteDoc(doc(db, 'addOns', id));
      setAddOns(addOns.filter(a => a.id !== id));
      setSnackbar({ open: true, message: 'Add-on deleted successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete add-on.', severity: 'error' });
    }
  };

  const handleEditClick = (addOn) => {
    setAddOnToEdit(addOn);
    setEditAddOn({ name: addOn.name, price: addOn.price });
    setEditDialogOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditAddOn(prev => ({
      ...prev,
      [name]: name === 'name' ? value : parseFloat(value) || 0
    }));
  };

  const handleEditSave = async () => {
    if (!addOnToEdit) return;
    setEditDialogOpen(false);
    try {
      const ref = doc(db, 'addOns', addOnToEdit.id);
      await updateDoc(ref, {
        name: editAddOn.name,
        price: Number(editAddOn.price) || 0
      });
      setAddOns(addOns.map(a =>
        a.id === addOnToEdit.id
          ? { ...a, ...editAddOn }
          : a
      ));
      setSnackbar({ open: true, message: 'Add-on updated successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update add-on.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{
        fontFamily: '"Playfair Display", serif',
        color: '#4e342e',
        fontWeight: 700,
        mb: 3
      }}>
        Manage Add-ons
      </Typography>
      <Paper elevation={0} sx={{
        borderRadius: 3,
        p: 3,
        mb: 3,
        background: 'rgba(255,255,255,0.97)',
        border: '1.5px solid #ede7e3',
        boxShadow: 'none'
      }}>
        <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
          alignItems: 'center'
        }}>
          <TextField
            label="Add-on Name"
            name="name"
            value={newAddOn.name}
            onChange={handleAddOnChange}
            sx={{
              minWidth: 200,
              borderRadius: 2,
              background: '#faf9f7'
            }}
            size="small"
          />
          <TextField
            label="Price"
            name="price"
            type="number"
            value={newAddOn.price}
            onChange={handleAddOnChange}
            InputProps={{
              startAdornment: <InputAdornment position="start">₱</InputAdornment>,
              inputProps: { min: 0, step: 0.01 }
            }}
            sx={{
              minWidth: 120,
              borderRadius: 2,
              background: '#faf9f7'
            }}
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleAddAddOn}
            startIcon={<Add />}
            sx={{
              minWidth: 140,
              fontWeight: 600,
              borderRadius: 2,
              background: '#6f4e37',
              '&:hover': { background: '#5d4037' }
            }}
          >
            Add Add-on
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{
                backgroundColor: '#f5f5f5',
                '& th': { color: '#4e342e', fontWeight: 600, borderBottom: 'none' }
              }}>
                <TableCell>Add-on Name</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {addOns.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No add-ons found.
                  </TableCell>
                </TableRow>
              )}
              {addOns.map((addOn) => (
                <TableRow key={addOn.id} hover sx={{
                  transition: 'background 0.2s',
                  '&:hover': { backgroundColor: '#f9f5f0' }
                }}>
                  <TableCell>
                    <Chip label={addOn.name} color="primary" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1 }} />
                  </TableCell>
                  <TableCell>₱{Number(addOn.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleEditClick(addOn)}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => {
                      setAddOnToDelete(addOn);
                      setDeleteDialogOpen(true);
                    }}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Add-on</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{addOnToDelete?.name}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleDeleteAddOn(addOnToDelete.id)} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Add-on</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Add-on Name"
              name="name"
              value={editAddOn.name}
              onChange={handleEditChange}
              fullWidth
              size="small"
            />
            <TextField
              label="Price"
              name="price"
              type="number"
              value={editAddOn.price}
              onChange={handleEditChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddOnForm;