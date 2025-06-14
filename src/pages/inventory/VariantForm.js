// src/pages/inventory/VariantForm.js
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
  Tooltip,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';

const VariantForm = () => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newVariant, setNewVariant] = useState({
    name: '',
    price: 0,
    stock: 0
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [variantToEdit, setVariantToEdit] = useState(null);
  const [editVariant, setEditVariant] = useState({ name: '', price: 0, stock: 0 });

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const q = query(collection(db, 'variants'));
        const querySnapshot = await getDocs(q);
        const variantsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVariants(variantsData);
      } catch (error) {
        console.error('Error fetching variants:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVariants();
  }, []);

  const handleVariantChange = (e) => {
    const { name, value } = e.target;
    setNewVariant(prev => ({
      ...prev,
      [name]: name === 'name' ? value : parseFloat(value) || 0
    }));
  };

  const handleAddVariant = async () => {
    if (!newVariant.name) return;
    
    try {
      setLoading(true);
      const docRef = await addDoc(collection(db, 'variants'), {
        ...newVariant,
        createdAt: new Date()
      });
      setVariants([...variants, { id: docRef.id, ...newVariant }]);
      setNewVariant({ name: '', price: 0, stock: 0 });
    } catch (error) {
      console.error('Error adding variant:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVariant = async (id) => {
    setDeleteDialogOpen(false);
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'variants', id));
      setVariants(variants.filter(v => v.id !== id));
      setSnackbar({ open: true, message: 'Variant deleted successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete variant.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (variant) => {
    setVariantToEdit(variant);
    setEditVariant({ name: variant.name, price: variant.price, stock: variant.stock });
    setEditDialogOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditVariant(prev => ({
      ...prev,
      [name]: name === 'name' ? value : parseFloat(value) || 0
    }));
  };

  const handleEditSave = async () => {
    if (!variantToEdit) return;
    setEditDialogOpen(false);
    try {
      setLoading(true);
      const ref = doc(db, 'variants', variantToEdit.id);
      await updateDoc(ref, {
        name: editVariant.name,
        price: Number(editVariant.price) || 0,
        stock: parseInt(editVariant.stock) || 0
      });
      setVariants(variants.map(v =>
        v.id === variantToEdit.id
          ? { ...v, ...editVariant }
          : v
      ));
      setSnackbar({ open: true, message: 'Variant updated successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update variant.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && variants.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{
        fontFamily: '"Playfair Display", serif',
        color: '#4e342e',
        fontWeight: 700,
        mb: 3
      }}>
        Manage Variants
      </Typography>
      <Paper elevation={0} sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        background: 'rgba(255,255,255,0.97)',
        border: '1.5px solid #ede7e3',
        boxShadow: 'none'
      }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2, color: '#5d4037', fontWeight: 600 }}>
          Add New Variant
        </Typography>
        <Box sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center'
        }}>
          <TextField
            label="Variant Name (e.g., Small, Medium)"
            name="name"
            value={newVariant.name}
            onChange={handleVariantChange}
            fullWidth
            size="small"
            sx={{ borderRadius: 2, background: '#faf9f7' }}
          />
          <TextField
            label="Additional Price"
            name="price"
            type="number"
            value={newVariant.price}
            onChange={handleVariantChange}
            InputProps={{
              startAdornment: <InputAdornment position="start">₱</InputAdornment>,
              inputProps: { min: 0, step: 0.01 }
            }}
            size="small"
            sx={{ borderRadius: 2, background: '#faf9f7' }}
          />
          <TextField
            label="Initial Stock"
            name="stock"
            type="number"
            value={newVariant.stock}
            onChange={handleVariantChange}
            inputProps={{ min: 0 }}
            size="small"
            sx={{ borderRadius: 2, background: '#faf9f7' }}
          />
          <Button
            variant="contained"
            onClick={handleAddVariant}
            startIcon={<Add />}
            disabled={loading}
            sx={{
              minWidth: 140,
              fontWeight: 600,
              borderRadius: 2,
              background: '#6f4e37',
              '&:hover': { background: '#5d4037' }
            }}
          >
            {loading ? 'Adding...' : 'Add Variant'}
          </Button>
        </Box>
      </Paper>
      <Paper elevation={0} sx={{
        borderRadius: 3,
        background: 'rgba(255,255,255,0.97)',
        border: '1.5px solid #ede7e3',
        boxShadow: 'none'
      }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{
                backgroundColor: '#f5f5f5',
                '& th': { color: '#4e342e', fontWeight: 600, borderBottom: 'none' }
              }}>
                <TableCell>Variant Name</TableCell>
                <TableCell>Additional Price</TableCell>
                <TableCell>Current Stock</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {variants.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No variants found.
                  </TableCell>
                </TableRow>
              )}
              {variants.map((variant) => (
                <TableRow key={variant.id} hover sx={{
                  transition: 'background 0.2s',
                  '&:hover': { backgroundColor: '#f9f5f0' }
                }}>
                  <TableCell>
                    <Chip label={variant.name} color="primary" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1 }} />
                  </TableCell>
                  <TableCell>₱{Number(variant.price).toFixed(2)}</TableCell>
                  <TableCell>{variant.stock}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleEditClick(variant)} disabled={loading}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => {
                      setVariantToDelete(variant);
                      setDeleteDialogOpen(true);
                    }} disabled={loading}>
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
        <DialogTitle>Delete Variant</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{variantToDelete?.name}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleDeleteVariant(variantToDelete.id)} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Variant</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Variant Name"
              name="name"
              value={editVariant.name}
              onChange={handleEditChange}
              fullWidth
              size="small"
            />
            <TextField
              label="Additional Price"
              name="price"
              type="number"
              value={editVariant.price}
              onChange={handleEditChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
              size="small"
            />
            <TextField
              label="Stock"
              name="stock"
              type="number"
              value={editVariant.stock}
              onChange={handleEditChange}
              inputProps={{ min: 0 }}
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

export default VariantForm;