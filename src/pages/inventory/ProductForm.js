// src/pages/inventory/ProductForm.js
import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Button, 
  Grid, 
  FormControlLabel, 
  Checkbox, 
  Box,
  Typography,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Divider,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import { db } from '../../firebase';
import { collection, getDocs, query } from 'firebase/firestore';

const ProductForm = ({ product, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    stock: product?.stock || 0,
    available: product?.available !== false,
    categoryId: product?.categoryId || '',
    varieties: product?.varieties || [], // [{name: 'Hot', price: 120}]
    variants: product?.variants || [],   // [{id: 'sizeId', name: 'Small', price: 0}]
    variantPrices: product?.variantPrices || {}, // {variantId: price}
    ingredientsUsed: product?.ingredientsUsed || [] // [{ingredientId, name, amount, unit}]
  });

  const [categories, setCategories] = useState([]);
  const [allVariants, setAllVariants] = useState([]);
  const [allVarieties, setAllVarieties] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesQuery = query(collection(db, 'categories'));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCategories(categoriesData);

        // Fetch variants (sizes)
        const variantsQuery = query(collection(db, 'variants'));
        const variantsSnapshot = await getDocs(variantsQuery);
        const variantsData = variantsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllVariants(variantsData);

        // Fetch available varieties (Hot/Ice/Frappe)
        const varietiesQuery = query(collection(db, 'varieties'));
        const varietiesSnapshot = await getDocs(varietiesQuery);
        const varietiesData = varietiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllVarieties(varietiesData);

        // Fetch ingredients
        const ingredientsQuery = query(collection(db, 'ingredients'));
        const ingredientsSnapshot = await getDocs(ingredientsQuery);
        const ingredientsData = ingredientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setIngredients(ingredientsData);

        if (product) {
          setFormData({
            name: product.name || '',
            description: product.description || '',
            stock: product.stock || 0,
            available: product.available !== false,
            categoryId: product.categoryId || '',
            varieties: product.varieties || [],
            variants: product.variants || [],
            variantPrices: product.variantPrices || {},
            ingredientsUsed: product.ingredientsUsed || []
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [product]);

  // Handle changes for main fields
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle changes for varieties (array of {name, price})
  const handleVarietyChange = (idx, field, value) => {
    setFormData(prev => {
      const updated = [...prev.varieties];
      updated[idx][field] = field === 'price' ? parseFloat(value) || 0 : value;
      return { ...prev, varieties: updated };
    });
  };

  // Add a new variety row
  const handleAddVariety = () => {
    setFormData(prev => ({
      ...prev,
      varieties: [...prev.varieties, { name: '', price: 0 }]
    }));
  };

  // Remove a variety row
  const handleRemoveVariety = (idx) => {
    setFormData(prev => ({
      ...prev,
      varieties: prev.varieties.filter((_, i) => i !== idx)
    }));
  };

  // Handle variants (sizes) selection (multi-select)
  const handleVariantsChange = (e) => {
    const { value } = e.target;
    setFormData(prev => {
      // Remove prices for unselected variants
      const newVariantPrices = { ...prev.variantPrices };
      Object.keys(newVariantPrices).forEach(vid => {
        if (!value.includes(vid)) delete newVariantPrices[vid];
      });
      return {
        ...prev,
        variants: value,
        variantPrices: newVariantPrices
      };
    });
  };

  // Handle per-variant price change
  const handleVariantPriceChange = (variantId, price) => {
    setFormData(prev => ({
      ...prev,
      variantPrices: {
        ...prev.variantPrices,
        [variantId]: parseFloat(price) || 0
      }
    }));
  };

  // Handle ingredient usage change
  const handleIngredientChange = (idx, field, value) => {
    setFormData(prev => {
      const updated = [...prev.ingredientsUsed];
      updated[idx][field] = field === 'amount' ? parseFloat(value) || 0 : value;
      return { ...prev, ingredientsUsed: updated };
    });
  };

  // Add a new ingredient row
  const handleAddIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredientsUsed: [...prev.ingredientsUsed, { ingredientId: '', name: '', amount: 0, unit: '' }]
    }));
  };

  // Remove an ingredient row
  const handleRemoveIngredient = (idx) => {
    setFormData(prev => ({
      ...prev,
      ingredientsUsed: prev.ingredientsUsed.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      description: formData.description,
      stock: parseInt(formData.stock) || 0,
      available: formData.available,
      categoryId: formData.categoryId,
      varieties: formData.varieties.filter(v => v.name),
      variants: formData.variants,
      variantPrices: formData.variantPrices,
      ingredientsUsed: formData.ingredientsUsed.filter(i => i.ingredientId && i.amount > 0)
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card elevation={0} sx={{
      borderRadius: 3,
      background: 'rgba(255,255,255,0.97)',
      border: '1.5px solid #ede7e3',
      boxShadow: 'none',
      maxWidth: 700,
      mx: 'auto',
      mt: 2,
      mb: 4,
      animation: 'fadeIn 0.7s'
    }}>
      <CardContent sx={{ p: { xs: 2, md: 4 } }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom sx={{
                fontWeight: 700,
                color: '#4e342e',
                fontFamily: '"Playfair Display", serif'
              }}>
                {product ? 'Edit Product' : 'Add New Product'}
              </Typography>
              <Divider sx={{ mb: 3, borderColor: '#ede7e3' }} />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="name"
                label="Product Name"
                value={formData.name}
                onChange={handleChange}
                required
                variant="outlined"
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small" sx={{ minWidth: 250 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  label="Category"
                  required
                  variant="outlined"
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
                variant="outlined"
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="stock"
                label="Initial Stock"
                type="number"
                value={formData.stock}
                onChange={handleChange}
                inputProps={{ min: 0 }}
                required
                variant="outlined"
                size="small"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                Varieties & Prices
              </Typography>
              <Grid container spacing={2}>
                {formData.varieties.map((variety, idx) => (
                  <React.Fragment key={idx}>
                    <Grid item xs={5} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Variety</InputLabel>
                        <Select
                          value={variety.name}
                          label="Variety"
                          onChange={e => handleVarietyChange(idx, 'name', e.target.value)}
                        >
                          {allVarieties.map(v => (
                            <MenuItem key={v.name} value={v.name}>{v.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={5} sm={4}>
                      <TextField
                        label="Price"
                        type="number"
                        value={variety.price}
                        onChange={e => handleVarietyChange(idx, 'price', e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                          inputProps: { min: 0, step: 0.01 }
                        }}
                        size="small"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={2} sm={2}>
                      <Button
                        color="error"
                        onClick={() => handleRemoveVariety(idx)}
                        sx={{ minWidth: 0, px: 1, py: 0.5 }}
                      >
                        Remove
                      </Button>
                    </Grid>
                  </React.Fragment>
                ))}
                <Grid item xs={12}>
                  <Button variant="outlined" onClick={handleAddVariety} sx={{ mt: 1 }}>
                    Add Variety
                  </Button>
                </Grid>
              </Grid>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small" sx={{ minWidth: 250 }}>
                <InputLabel>Sizes (Variants) - Optional</InputLabel>
                <Select
                  multiple
                  name="variants"
                  value={formData.variants}
                  onChange={handleVariantsChange}
                  label="Sizes (Variants) - Optional"
                  renderValue={selected => selected.map(id => {
                    const found = allVariants.find(v => v.id === id);
                    return found ? found.name : '';
                  }).join(', ')}
                >
                  {allVariants.map(v => (
                    <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Per-variant price fields if no varieties */}
            {formData.variants.length > 0 && formData.varieties.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Set price for each variant:
                </Typography>
                <Grid container spacing={2}>
                  {formData.variants.map(variantId => {
                    const variant = allVariants.find(v => v.id === variantId);
                    return (
                      <Grid item xs={6} sm={4} md={3} key={variantId}>
                        <TextField
                          label={variant ? variant.name : 'Variant'}
                          type="number"
                          value={formData.variantPrices[variantId] || ''}
                          onChange={e => handleVariantPriceChange(variantId, e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                            inputProps: { min: 0, step: 0.01 }
                          }}
                          size="small"
                          fullWidth
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="available"
                    checked={formData.available}
                    onChange={handleChange}
                    color="primary"
                  />
                }
                label="Available for purchase"
              />
            </Grid>
            
            {/* INGREDIENTS USAGE */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                Ingredients Used (per product)
              </Typography>
              <Grid container spacing={2}>
                {formData.ingredientsUsed.map((ing, idx) => (
                  <React.Fragment key={idx}>
                    <Grid item xs={5} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Ingredient</InputLabel>
                        <Select
                          value={ing.ingredientId}
                          label="Ingredient"
                          onChange={e => {
                            const selected = ingredients.find(i => i.id === e.target.value);
                            handleIngredientChange(idx, 'ingredientId', e.target.value);
                            handleIngredientChange(idx, 'name', selected ? selected.name : '');
                            handleIngredientChange(idx, 'unit', selected ? selected.unit : '');
                          }}
                        >
                          {ingredients.map(i => (
                            <MenuItem key={i.id} value={i.id}>{i.name} ({i.unit})</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={4} sm={3}>
                      <TextField
                        label="Amount"
                        type="number"
                        value={ing.amount}
                        onChange={e => handleIngredientChange(idx, 'amount', e.target.value)}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">{ing.unit}</InputAdornment>,
                          inputProps: { min: 0, step: 0.01 }
                        }}
                        size="small"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={3} sm={2}>
                      <Button
                        color="error"
                        onClick={() => handleRemoveIngredient(idx)}
                        sx={{ minWidth: 0, px: 1, py: 0.5 }}
                      >
                        Remove
                      </Button>
                    </Grid>
                  </React.Fragment>
                ))}
                <Grid item xs={12}>
                  <Button variant="outlined" onClick={handleAddIngredient} sx={{ mt: 1 }}>
                    Add Ingredient
                  </Button>
                </Grid>
              </Grid>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2, borderColor: '#ede7e3' }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  sx={{
                    px: 3,
                    borderRadius: 2,
                    color: '#4e342e',
                    borderColor: '#bdbdbd',
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
                    px: 3,
                    borderRadius: 2,
                    fontWeight: 600,
                    background: '#6f4e37',
                    '&:hover': { background: '#5d4037' }
                  }}
                >
                  {product ? 'Update Product' : 'Add Product'}
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

export default ProductForm;