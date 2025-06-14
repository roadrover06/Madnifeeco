// src/pages/inventory/Inventory.js
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
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
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import ProductForm from './ProductForm';
import VariantForm from './VariantForm';
import AddOnForm from './AddOnForm';
import CategoryForm from './CategoryForm';
import VarietyForm from './VarietyForm';
import IngredientForm from './IngredientForm';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [productDetailsDialogOpen, setProductDetailsDialogOpen] = useState(false);
  const [productDetails, setProductDetails] = useState(null);
  const [allIngredients, setAllIngredients] = useState([]);

  // Add this function to fetch products and categories (for refresh)
  const fetchProductsAndCategories = async () => {
    setLoading(true);
    try {
      // Fetch products
      const productsQuery = query(collection(db, 'products'));
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch categories
      const categoriesQuery = query(collection(db, 'categories'));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProducts(productsData);
      setFilteredProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCategories();
  }, []);

  useEffect(() => {
    applyFilters(products, categoryFilter, searchTerm);
  }, [products, categoryFilter, searchTerm]);

  const applyFilters = (productsToFilter, category, search) => {
    let filtered = [...productsToFilter];
    
    if (category !== 'all') {
      filtered = filtered.filter(product => product.categoryId === category);
    }
    
    if (search.trim() !== '') {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    setFilteredProducts(filtered);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };

  // Add handler for adding/updating product
  const handleProductFormSubmit = async (productData) => {
    try {
      if (editingProduct) {
        // Update
        const productRef = doc(db, 'products', editingProduct.id);
        await updateDoc(productRef, productData);
      } else {
        // Add
        await addDoc(collection(db, 'products'), productData);
      }
      setShowProductForm(false);
      setEditingProduct(null);
      await fetchProductsAndCategories();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  // Add handler for deleting product
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, 'products', productToDelete.id));
      setSnackbar({ open: true, message: 'Product deleted successfully!', severity: 'success' });
      setProductToDelete(null);
      setDeleteDialogOpen(false);
      await fetchProductsAndCategories();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete product.', severity: 'error' });
      setDeleteDialogOpen(false);
    }
  };

  // Add this after fetching allVariants in ProductForm and make it available globally for table rendering
  useEffect(() => {
    // Fetch variants (sizes)
    const variantsQuery = query(collection(db, 'variants'));
    getDocs(variantsQuery).then(variantsSnapshot => {
      const variantsData = variantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      window.allVariants = variantsData; // for table rendering
    });
  }, []);

  // Fetch all ingredients for details dialog
  useEffect(() => {
    const fetchIngredients = async () => {
      const ingredientsQuery = query(collection(db, 'ingredients'));
      const ingredientsSnapshot = await getDocs(ingredientsQuery);
      setAllIngredients(ingredientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchIngredients();
  }, []);

  if (loading && activeTab === 0 && products.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 4 }, background: 'linear-gradient(120deg, #f9f5f0 60%, #f5f0e6 100%)', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{
        fontFamily: '"Playfair Display", serif',
        color: '#4e342e',
        fontWeight: 700,
        mb: 3
      }}>
        Inventory Management
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
          <Tab label="Products" />
          <Tab label="Variants" />
          <Tab label="Varieties" />
          <Tab label="Add-ons" />
          <Tab label="Categories" />
          <Tab label="Ingredients" /> {/* NEW TAB */}
        </Tabs>
      </Box>
      {activeTab === 0 && !showCategoryForm && (
        <>
          <Box sx={{
            mb: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductForm(true);
                }}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  fontWeight: 600,
                  background: '#6f4e37',
                  '&:hover': { background: '#5d4037' }
                }}
              >
                Add New Product
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowCategoryForm(true)}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  color: '#4e342e',
                  borderColor: '#bdbdbd',
                  background: 'rgba(255,255,255,0.7)',
                  '&:hover': { borderColor: '#8d6e63', background: '#f5f0e6' }
                }}
              >
                Manage Categories
              </Button>
            </Box>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap'
            }}>
              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel id="category-filter-label">Category</InputLabel>
                <Select
                  labelId="category-filter-label"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                variant="outlined"
                size="small"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton onClick={handleClearSearch} size="small">
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ width: 300 }}
              />
            </Box>
          </Box>
          
          {showProductForm && (
            <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <ProductForm 
                product={editingProduct}
                categories={categories}
                onSubmit={handleProductFormSubmit}
                onCancel={() => {
                  setShowProductForm(false);
                  setEditingProduct(null);
                }}
              />
            </Paper>
          )}
          
          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.light' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Product Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Category</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Varieties / Variants & Prices</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Stock</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow
                    key={product.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={e => {
                      // Only open details if not clicking edit/delete
                      if (
                        e.target.closest('button') ||
                        e.target.closest('svg')
                      ) return;
                      setProductDetails(product);
                      setProductDetailsDialogOpen(true);
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                      <InfoOutlinedIcon sx={{ color: '#bdbdbd', mr: 1 }} fontSize="small" />
                      {product.name}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getCategoryName(product.categoryId)} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {/* Show varieties if present */}
                      {Array.isArray(product.varieties) && product.varieties.length > 0 ? (
                        product.varieties.map((v, idx) => (
                          <Chip
                            key={idx}
                            label={`${v.name}: ₱${Number(v.price).toFixed(2)}`}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                            color="info"
                            variant="outlined"
                          />
                        ))
                      ) : Array.isArray(product.variants) && product.variants.length > 0 && product.variantPrices ? (
                        // Show variants & prices if no varieties
                        product.variants.map((variantId, idx) => (
                          <Chip
                            key={variantId}
                            label={
                              (() => {
                                const variant = (window.allVariants || []).find(v => v.id === variantId);
                                const name = variant ? variant.name : variantId;
                                const price = product.variantPrices && product.variantPrices[variantId];
                                return `${name}: ₱${Number(price || 0).toFixed(2)}`;
                              })()
                            }
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                            color="secondary"
                            variant="outlined"
                          />
                        ))
                      ) : (
                        <span style={{ color: '#888' }}>No varieties/variants</span>
                      )}
                    </TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                      <Chip 
                        label={product.available ? 'Available' : 'Unavailable'} 
                        color={product.available ? 'success' : 'error'} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        onClick={e => {
                          e.stopPropagation();
                          setEditingProduct(product);
                          setShowProductForm(true);
                        }}
                      >
                        <EditIcon color="primary" />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={e => {
                          e.stopPropagation();
                          setProductToDelete(product);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {/* Delete confirmation dialog */}
          <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogContent>
              Are you sure you want to delete <b>{productToDelete?.name}</b>?
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleDeleteProduct} color="error" variant="contained">Delete</Button>
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

          {/* Product Details Dialog */}
          <Dialog
            open={productDetailsDialogOpen}
            onClose={() => setProductDetailsDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              Product Details
            </DialogTitle>
            <DialogContent dividers>
              {productDetails && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {productDetails.name}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Category: {getCategoryName(productDetails.categoryId)}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {productDetails.description || <span style={{ color: '#bbb' }}>No description</span>}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <b>Stock:</b> {productDetails.stock}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <b>Status:</b> {productDetails.available ? 'Available' : 'Unavailable'}
                  </Typography>
                  {/* Varieties */}
                  {Array.isArray(productDetails.varieties) && productDetails.varieties.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                        Varieties & Prices
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {productDetails.varieties.map((v, idx) => (
                          <Chip
                            key={idx}
                            label={`${v.name}: ₱${Number(v.price).toFixed(2)}`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </>
                  )}
                  {/* Variants */}
                  {Array.isArray(productDetails.variants) && productDetails.variants.length > 0 && productDetails.variantPrices && (
                    <>
                      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                        Variants & Prices
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {productDetails.variants.map((variantId, idx) => {
                          const variant = (window.allVariants || []).find(v => v.id === variantId);
                          const name = variant ? variant.name : variantId;
                          const price = productDetails.variantPrices && productDetails.variantPrices[variantId];
                          return (
                            <Chip
                              key={variantId}
                              label={`${name}: ₱${Number(price || 0).toFixed(2)}`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          );
                        })}
                      </Box>
                    </>
                  )}
                  {/* Ingredients */}
                  {Array.isArray(productDetails.ingredientsUsed) && productDetails.ingredientsUsed.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                        Ingredients Used
                      </Typography>
                      <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                        {productDetails.ingredientsUsed.map((ing, idx) => {
                          const ingredient = allIngredients.find(i => i.id === ing.ingredientId);
                          return (
                            <li key={idx}>
                              <Typography variant="body2">
                                {ingredient ? ingredient.name : ing.name || 'Unknown'}: {ing.amount} {ing.unit}
                              </Typography>
                            </li>
                          );
                        })}
                      </Box>
                    </>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setProductDetailsDialogOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {activeTab === 4 && (
        <CategoryForm />
      )}

      {showCategoryForm && activeTab === 0 && (
        <Box sx={{ mb: 3 }}>
          <Button onClick={() => setShowCategoryForm(false)} sx={{ mb: 2 }}>
            Back to Products
          </Button>
          <CategoryForm />
        </Box>
      )}

      {activeTab === 1 && <VariantForm />}
      {activeTab === 2 && <VarietyForm />}
      {activeTab === 3 && <AddOnForm />}
      {activeTab === 5 && <IngredientForm />}
    </Box>
  );
};

export default Inventory;