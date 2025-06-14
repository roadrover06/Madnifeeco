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
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';

const DEFAULT_VARIETIES = ['Hot', 'Ice', 'Frappe'];

const VarietyForm = () => {
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newVariety, setNewVariety] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [varietyToDelete, setVarietyToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [varietyToEdit, setVarietyToEdit] = useState(null);
  const [editVariety, setEditVariety] = useState('');

  useEffect(() => {
    const fetchVarieties = async () => {
      try {
        const q = query(collection(db, 'varieties'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVarieties(data);
      } catch (error) {
        console.error('Error fetching varieties:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVarieties();
  }, []);

  const handleAddVariety = async () => {
    if (!newVariety.trim()) return;
    try {
      setLoading(true);
      const docRef = await addDoc(collection(db, 'varieties'), {
        name: newVariety.trim()
      });
      setVarieties([...varieties, { id: docRef.id, name: newVariety.trim() }]);
      setNewVariety('');
      setSnackbar({ open: true, message: 'Variety added!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to add variety.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVariety = async (id) => {
    setDeleteDialogOpen(false);
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'varieties', id));
      setVarieties(varieties.filter(v => v.id !== id));
      setSnackbar({ open: true, message: 'Variety deleted!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete variety.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (variety) => {
    setVarietyToEdit(variety);
    setEditVariety(variety.name);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!varietyToEdit) return;
    setEditDialogOpen(false);
    try {
      setLoading(true);
      const ref = doc(db, 'varieties', varietyToEdit.id);
      await updateDoc(ref, { name: editVariety.trim() });
      setVarieties(varieties.map(v =>
        v.id === varietyToEdit.id
          ? { ...v, name: editVariety.trim() }
          : v
      ));
      setSnackbar({ open: true, message: 'Variety updated!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update variety.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && varieties.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <span>Loading...</span>
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
        Manage Varieties
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
          Add New Variety
        </Typography>
        <Box sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center'
        }}>
          <TextField
            label="Variety Name (e.g., Hot, Ice, Frappe)"
            name="name"
            value={newVariety}
            onChange={e => setNewVariety(e.target.value)}
            fullWidth
            size="small"
            sx={{ borderRadius: 2, background: '#faf9f7' }}
          />
          <Button
            variant="contained"
            onClick={handleAddVariety}
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
            {loading ? 'Adding...' : 'Add Variety'}
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
                <TableCell>Variety Name</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {varieties.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    No varieties found.
                  </TableCell>
                </TableRow>
              )}
              {varieties.map((variety) => (
                <TableRow key={variety.id} hover sx={{
                  transition: 'background 0.2s',
                  '&:hover': { backgroundColor: '#f9f5f0' }
                }}>
                  <TableCell>
                    <Chip label={variety.name} color="primary" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1 }} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton color="primary" onClick={() => handleEditClick(variety)} disabled={loading}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton color="error" onClick={() => {
                        setVarietyToDelete(variety);
                        setDeleteDialogOpen(true);
                      }} disabled={loading}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Variety</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{varietyToDelete?.name}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleDeleteVariety(varietyToDelete.id)} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Variety</DialogTitle>
        <DialogContent>
          <TextField
            label="Variety Name"
            name="editVariety"
            value={editVariety}
            onChange={e => setEditVariety(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 2 }}
          />
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

export default VarietyForm;
