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
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';

const CategoryForm = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [editCategory, setEditCategory] = useState({ name: '' });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, 'categories'));
        const querySnapshot = await getDocs(q);
        const categoriesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setNewCategory(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddCategory = async () => {
    if (!newCategory.name) return;
    try {
      const docRef = await addDoc(collection(db, 'categories'), {
        ...newCategory,
        createdAt: new Date()
      });
      setCategories([...categories, { id: docRef.id, ...newCategory }]);
      setNewCategory({ name: '' });
      setSnackbar({ open: true, message: 'Category added successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error adding category.', severity: 'error' });
    }
  };

  const handleDeleteCategory = async (id) => {
    setDeleteDialogOpen(false);
    try {
      await deleteDoc(doc(db, 'categories', id));
      setCategories(categories.filter(c => c.id !== id));
      setSnackbar({ open: true, message: 'Category deleted successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete category.', severity: 'error' });
    }
  };

  const handleEditClick = (category) => {
    setCategoryToEdit(category);
    setEditCategory({ name: category.name });
    setEditDialogOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditCategory(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditSave = async () => {
    if (!categoryToEdit) return;
    setEditDialogOpen(false);
    try {
      const ref = doc(db, 'categories', categoryToEdit.id);
      await updateDoc(ref, {
        name: editCategory.name
      });
      setCategories(categories.map(c =>
        c.id === categoryToEdit.id
          ? { ...c, ...editCategory }
          : c
      ));
      setSnackbar({ open: true, message: 'Category updated successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update category.', severity: 'error' });
    }
  };

  if (loading && categories.length === 0) {
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
        Manage Categories
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
            label="Category Name"
            name="name"
            value={newCategory.name}
            onChange={handleCategoryChange}
            sx={{
              minWidth: 200,
              borderRadius: 2,
              background: '#faf9f7'
            }}
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleAddCategory}
            startIcon={<Add />}
            sx={{
              minWidth: 140,
              fontWeight: 600,
              borderRadius: 2,
              background: '#6f4e37',
              '&:hover': { background: '#5d4037' }
            }}
          >
            Add Category
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{
                backgroundColor: '#f5f5f5',
                '& th': { color: '#4e342e', fontWeight: 600, borderBottom: 'none' }
              }}>
                <TableCell>Category Name</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    No categories found.
                  </TableCell>
                </TableRow>
              )}
              {categories.map((category) => (
                <TableRow key={category.id} hover sx={{
                  transition: 'background 0.2s',
                  '&:hover': { backgroundColor: '#f9f5f0' }
                }}>
                  <TableCell>
                    <Chip label={category.name} color="primary" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1 }} />
                  </TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleEditClick(category)}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => {
                      setCategoryToDelete(category);
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
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{categoryToDelete?.name}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleDeleteCategory(categoryToDelete.id)} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Category Name"
              name="name"
              value={editCategory.name}
              onChange={handleEditChange}
              fullWidth
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

export default CategoryForm;
