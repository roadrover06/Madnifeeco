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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';

const UNITS = ['grams', 'kilograms', 'ml', 'liters', 'pieces', 'packs', 'sachets'];

const IngredientForm = () => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    stock: 0,
    unit: 'grams'
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ingredientToEdit, setIngredientToEdit] = useState(null);
  const [editIngredient, setEditIngredient] = useState({ name: '', stock: 0, unit: 'grams' });

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const q = query(collection(db, 'ingredients'));
        const querySnapshot = await getDocs(q);
        const ingredientsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setIngredients(ingredientsData);
      } catch (error) {
        console.error('Error fetching ingredients:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchIngredients();
  }, []);

  const handleIngredientChange = (e) => {
    const { name, value } = e.target;
    setNewIngredient(prev => ({
      ...prev,
      [name]: name === 'name' ? value : name === 'stock' ? parseFloat(value) || 0 : value
    }));
  };

  const handleAddIngredient = async () => {
    if (!newIngredient.name) return;
    try {
      setLoading(true);
      const docRef = await addDoc(collection(db, 'ingredients'), {
        ...newIngredient,
        createdAt: new Date()
      });
      setIngredients([...ingredients, { id: docRef.id, ...newIngredient }]);
      setNewIngredient({ name: '', stock: 0, unit: 'grams' });
      setSnackbar({ open: true, message: 'Ingredient added!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to add ingredient.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIngredient = async (id) => {
    setDeleteDialogOpen(false);
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'ingredients', id));
      setIngredients(ingredients.filter(i => i.id !== id));
      setSnackbar({ open: true, message: 'Ingredient deleted!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete ingredient.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (ingredient) => {
    setIngredientToEdit(ingredient);
    setEditIngredient({ name: ingredient.name, stock: ingredient.stock, unit: ingredient.unit });
    setEditDialogOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditIngredient(prev => ({
      ...prev,
      [name]: name === 'name' ? value : name === 'stock' ? parseFloat(value) || 0 : value
    }));
  };

  const handleEditSave = async () => {
    if (!ingredientToEdit) return;
    setEditDialogOpen(false);
    try {
      setLoading(true);
      const ref = doc(db, 'ingredients', ingredientToEdit.id);
      await updateDoc(ref, {
        name: editIngredient.name,
        stock: Number(editIngredient.stock) || 0,
        unit: editIngredient.unit
      });
      setIngredients(ingredients.map(i =>
        i.id === ingredientToEdit.id
          ? { ...i, ...editIngredient }
          : i
      ));
      setSnackbar({ open: true, message: 'Ingredient updated!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update ingredient.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && ingredients.length === 0) {
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
        Manage Ingredients
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
          Add New Ingredient
        </Typography>
        <Box sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center'
        }}>
          <TextField
            label="Ingredient Name"
            name="name"
            value={newIngredient.name}
            onChange={handleIngredientChange}
            fullWidth
            size="small"
            sx={{ borderRadius: 2, background: '#faf9f7' }}
          />
          <TextField
            label="Stock"
            name="stock"
            type="number"
            value={newIngredient.stock}
            onChange={handleIngredientChange}
            inputProps={{ min: 0, step: 0.01 }}
            size="small"
            sx={{ borderRadius: 2, background: '#faf9f7' }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Unit</InputLabel>
            <Select
              name="unit"
              value={newIngredient.unit}
              label="Unit"
              onChange={handleIngredientChange}
            >
              {UNITS.map(unit => (
                <MenuItem key={unit} value={unit}>{unit}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={handleAddIngredient}
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
            {loading ? 'Adding...' : 'Add Ingredient'}
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
                <TableCell>Ingredient Name</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ingredients.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No ingredients found.
                  </TableCell>
                </TableRow>
              )}
              {ingredients.map((ingredient) => (
                <TableRow key={ingredient.id} hover sx={{
                  transition: 'background 0.2s',
                  '&:hover': { backgroundColor: '#f9f5f0' }
                }}>
                  <TableCell>
                    {ingredient.name}
                  </TableCell>
                  <TableCell>{ingredient.stock}</TableCell>
                  <TableCell>{ingredient.unit}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleEditClick(ingredient)} disabled={loading}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => {
                      setIngredientToDelete(ingredient);
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
        <DialogTitle>Delete Ingredient</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{ingredientToDelete?.name}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleDeleteIngredient(ingredientToDelete.id)} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Ingredient</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Ingredient Name"
              name="name"
              value={editIngredient.name}
              onChange={handleEditChange}
              fullWidth
              size="small"
            />
            <TextField
              label="Stock"
              name="stock"
              type="number"
              value={editIngredient.stock}
              onChange={handleEditChange}
              inputProps={{ min: 0, step: 0.01 }}
              size="small"
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Unit</InputLabel>
              <Select
                name="unit"
                value={editIngredient.unit}
                label="Unit"
                onChange={handleEditChange}
              >
                {UNITS.map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </Select>
            </FormControl>
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

export default IngredientForm;
