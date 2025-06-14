// src/pages/Menu.js
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Button, 
  Box,
  TextField,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  InputAdornment,
  Divider,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { 
  LocalCafe, 
  Search, 
  AddShoppingCart,
  AttachMoney,
  FilterList,
  Category,
  Loyalty,
  Inventory
} from '@mui/icons-material';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import OrderForm from './orders/OrderForm';
import { useTheme } from '@mui/material/styles';

const Menu = () => {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [rewardsDialogOpen, setRewardsDialogOpen] = useState(false);
  const [loyaltyRewards, setLoyaltyRewards] = useState([]);
  const [variants, setVariants] = useState([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderInitialProduct, setOrderInitialProduct] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDialogProduct, setProductDialogProduct] = useState(null);
  const [selectedVariety, setSelectedVariety] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }
    };

    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        const categoriesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCategories(categoriesData);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };

    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsData);
        setFilteredProducts(productsData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        showSnackbar('Failed to load products', 'error');
      }
    };

    const fetchLoyaltyRewards = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'loyaltyRewards'));
        const rewardsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLoyaltyRewards(rewardsData);
      } catch (err) {
        console.error("Error fetching loyalty rewards:", err);
      }
    };

    const fetchVariants = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'variants'));
        const variantsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVariants(variantsData);
      } catch (err) {
        // ignore error for variants
      }
    };

    fetchUserData();
    fetchCategories();
    fetchProducts();
    fetchLoyaltyRewards();
    fetchVariants();
  }, [user]);

  useEffect(() => {
    let filtered = [...products];
    
    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => {
        const category = categories.find(cat => cat.id === product.categoryId);
        return category && category.name === selectedCategory;
      });
    }
    
    // Apply search filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(product => {
        const name = product.name ? product.name.toLowerCase() : '';
        const category = categories.find(cat => cat.id === product.categoryId)?.name.toLowerCase() || '';
        const description = product.description ? product.description.toLowerCase() : '';
        
        return (
          name.includes(searchTerm.toLowerCase()) ||
          category.includes(searchTerm.toLowerCase()) ||
          description.includes(searchTerm.toLowerCase())
        );
      });
    }
    
    setFilteredProducts(filtered);
  }, [searchTerm, products, selectedCategory, categories]);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOrderItem = (productId) => {
    const product = products.find(p => p.id === productId);
    setOrderInitialProduct(product || null);
    setOrderDialogOpen(true);
  };

  const handleOpenRewardsDialog = () => {
    setRewardsDialogOpen(true);
  };

  const handleCloseRewardsDialog = () => {
    setRewardsDialogOpen(false);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };

  // Helper to get price for a product based on selected variety/variant
  const getProductPrice = (product, varietyName, variantId) => {
    if (product.varieties && product.varieties.length > 0 && varietyName) {
      const variety = product.varieties.find(v => v.name === varietyName);
      return variety ? Number(variety.price) : 0;
    }
    if (product.variants && product.variants.length > 0 && product.variantPrices && variantId) {
      return typeof product.variantPrices[variantId] === 'number'
        ? Number(product.variantPrices[variantId])
        : 0;
    }
    if (typeof product.basePrice === 'number') return product.basePrice;
    return product.price || 0;
  };

  // Open product details dialog
  const handleProductClick = (product) => {
    setProductDialogProduct(product);
    setSelectedVariety('');
    setSelectedVariant('');
    setProductDialogOpen(true);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh',
        background: 'linear-gradient(to bottom, #f5f5f5, #f9f3e9)'
      }}>
        <Box textAlign="center">
          <CircularProgress size={60} thickness={4} sx={{ color: '#6f4e37' }} />
          <Typography variant="h6" sx={{ mt: 3, color: '#5d4037' }}>
            Brewing our menu for you...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, background: 'linear-gradient(to bottom, #f5f5f5, #f9f3e9)' }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          <Typography variant="h6">{error}</Typography>
          <Typography>Please try refreshing the page</Typography>
        </Alert>
      </Container>
    );
  }

  // Prepare category options for filter
  const categoryOptions = ['All', ...categories.map(category => category.name)];

  return (
    <Container maxWidth="xl" sx={{ py: 4, background: 'linear-gradient(to bottom, #f5f5f5, #f9f3e9)' }}>
      {/* Hero Section */}
      <Box sx={{ 
        background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(https://images.unsplash.com/photo-1445116572660-236099ec97a0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: 3,
        p: 6,
        mb: 4,
        color: 'white',
        textAlign: 'center'
      }}>
        <Typography variant="h2" component="h1" sx={{ 
          fontWeight: 700,
          mb: 2,
          fontFamily: '"Playfair Display", serif'
        }}>
          Our Artisan Menu
        </Typography>
        <Typography variant="h5" sx={{ mb: 3 }}>
          Handcrafted with passion, served with love
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          startIcon={<Loyalty />}
          onClick={handleOpenRewardsDialog}
          sx={{ 
            borderRadius: 3,
            px: 4,
            py: 1.5,
            backgroundColor: '#d4a762',
            '&:hover': {
              backgroundColor: '#c09552'
            }
          }}
        >
          View Loyalty Rewards
        </Button>
      </Box>

      {/* Search and Filter Section */}
      <Paper elevation={0} sx={{ 
        p: 3, 
        mb: 4, 
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterList sx={{ mr: 1, color: '#6f4e37' }} />
          <Typography variant="h6" sx={{ color: '#5d4037', fontWeight: 600 }}>
            Filter Options
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by name, category, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: 'background.paper',
                  '& fieldset': {
                    borderColor: '#e0d6c2',
                  },
                  '&:hover fieldset': {
                    borderColor: '#d4a762',
                  },
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#6f4e37' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              variant="outlined"
              SelectProps={{
                native: true,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: 'background.paper',
                  '& fieldset': {
                    borderColor: '#e0d6c2',
                  },
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Category sx={{ color: '#6f4e37' }} />
                  </InputAdornment>
                ),
              }}
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Menu Items */}
      {filteredProducts.length === 0 ? (
        <Paper elevation={0} sx={{ 
          textAlign: 'center', 
          p: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(10px)'
        }}>
          <LocalCafe sx={{ fontSize: 64, color: '#d4a762', mb: 2 }} />
          <Typography variant="h4" sx={{ color: '#5d4037', mb: 1 }}>
            No items found
          </Typography>
          <Typography variant="body1" sx={{ color: '#8d6e63', mb: 3 }}>
            Try adjusting your filters or search term
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
            }}
            sx={{
              borderColor: '#6f4e37',
              color: '#5d4037',
              borderRadius: 3,
              px: 4,
              '&:hover': {
                backgroundColor: 'rgba(111, 78, 55, 0.1)',
                borderColor: '#5d4037'
              }
            }}
          >
            Reset Filters
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredProducts.map((product) => {
            // Determine lowest price and label for display
            let price = 0;
            let detailLabel = '';
            if (product.varieties && product.varieties.length > 0) {
              // Find the variety with the lowest price
              const sortedVarieties = [...product.varieties].sort((a, b) => Number(a.price) - Number(b.price));
              price = Number(sortedVarieties[0].price) || 0;
              detailLabel = sortedVarieties[0].name ? `(${sortedVarieties[0].name})` : '';
            } else if (product.variants && product.variants.length > 0 && product.variantPrices) {
              // Find the variant with the lowest price
              const variantPrices = product.variants
                .map(vid => ({
                  id: vid,
                  price: typeof product.variantPrices[vid] === 'number' ? Number(product.variantPrices[vid]) : 0
                }))
                .sort((a, b) => a.price - b.price);
              price = variantPrices[0]?.price || 0;
              // Get the variant name from the variants collection
              const variantObj = variants.find(v => v.id === variantPrices[0]?.id);
              detailLabel = variantObj && variantObj.name ? `(${variantObj.name})` : (variantPrices[0]?.id ? `(${variantPrices[0].id})` : '');
            } else if (typeof product.basePrice === 'number') {
              price = product.basePrice;
            } else {
              price = product.price || 0;
            }

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id} sx={{ display: 'flex' }}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                    }
                  }}
                  onClick={() => handleProductClick(product)}
                >
                  {/* Product Image */}
                  {product.imageUrl ? (
                    <CardMedia
                      component="img"
                      height="220"
                      image={product.imageUrl}
                      alt={product.name}
                      sx={{ 
                        objectFit: 'cover',
                        borderTopLeftRadius: '12px',
                        borderTopRightRadius: '12px'
                      }}
                    />
                  ) : (
                    <Box sx={{ 
                      height: 220, 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      backgroundColor: '#f5f0e6',
                      borderTopLeftRadius: '12px',
                      borderTopRightRadius: '12px'
                    }}>
                      <LocalCafe sx={{ fontSize: 60, color: '#d4a762' }} />
                    </Box>
                  )}
                  
                  {/* Favorite Badge */}
                  {product.isPopular && (
                    <Badge
                      badgeContent="BESTSELLER"
                      color="error"
                      sx={{ 
                        '& .MuiBadge-badge': {
                          top: 16,
                          right: 16,
                          px: 2,
                          py: 0.5,
                          borderRadius: 2,
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }
                      }}
                    />
                  )}
                  
                  <CardContent sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', minHeight: 240 }}>
                    {/* Product Name and Category */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="h6" component="div" sx={{ 
                        fontWeight: 700,
                        color: '#3e2723',
                        fontFamily: '"Playfair Display", serif'
                      }}>
                        {product.name || 'Unnamed Product'}
                      </Typography>
                      <Chip 
                        label={getCategoryName(product.categoryId) || 'Uncategorized'} 
                        size="small" 
                        sx={{ 
                          borderRadius: 2,
                          fontWeight: 600,
                          backgroundColor: '#f5f0e6',
                          color: '#6f4e37'
                        }}
                      />
                    </Box>
                    
                    {/* Stock Availability */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Inventory sx={{ 
                        color: product.available ? '#4caf50' : '#f44336',
                        fontSize: '1.1rem',
                        mr: 1
                      }} />
                      <Typography variant="body2" sx={{ 
                        color: product.available ? '#4caf50' : '#f44336',
                        fontWeight: 500
                      }}>
                        {product.available ? 'In Stock' : 'Out of Stock'}
                      </Typography>
                    </Box>
                    
                    {/* Description */}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        mb: 2,
                        color: '#5d4037',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: 60
                      }}
                    >
                      {product.description || 'No description available'}
                    </Typography>
                    
                    {/* Price and Order Button */}
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mt: 'auto',
                      pt: 2,
                      borderTop: '1px dashed #e0d6c2',
                      minHeight: 64 // Ensures alignment of price/order button area
                    }}>
                      <Box>
                        <Typography variant="h5" sx={{
                          fontWeight: 700,
                          color: '#5d4037',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          ₱{price.toFixed(2)}
                        </Typography>
                        {detailLabel && (
                          <Typography variant="body2" sx={{ color: '#8d6e63', fontWeight: 500 }}>
                            {detailLabel}
                          </Typography>
                        )}
                      </Box>
                      <Button
                        variant="contained"
                        size="medium"
                        onClick={e => {
                          e.stopPropagation();
                          handleOrderItem(product.id);
                        }}
                        disabled={!product.available}
                        sx={{
                          borderRadius: 3,
                          px: 3,
                          py: 1,
                          fontWeight: 600,
                          textTransform: 'none',
                          backgroundColor: '#6f4e37',
                          '&:hover': {
                            backgroundColor: '#5a3d2a'
                          },
                          '&:disabled': {
                            backgroundColor: '#e0e0e0',
                            color: '#9e9e9e'
                          }
                        }}
                      >
                        Order Item
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
      
      {/* Floating Order Summary */}
      {userData?.cart?.length > 0 && (
        <Box sx={{ 
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000
        }}>
          <Button 
            variant="contained" 
            size="large"
            startIcon={<AddShoppingCart />}
            onClick={() => navigate('/orders')}
            sx={{ 
              borderRadius: 3,
              px: 4,
              py: 1.5,
              fontWeight: 600,
              backgroundColor: '#d4a762',
              color: '#3e2723',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              '&:hover': {
                backgroundColor: '#c09552',
                boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
              }
            }}
          >
            Order Items ({userData.cart.length})
          </Button>
        </Box>
      )}
      
      {/* Loyalty Rewards Dialog */}
      <Dialog
        open={rewardsDialogOpen}
        onClose={handleCloseRewardsDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          backgroundColor: '#f5f0e6',
          color: '#5d4037',
          borderBottom: '1px solid #e0d6c2'
        }}>
          <Box display="flex" alignItems="center">
            <Loyalty sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight={600}>
              Loyalty Rewards
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: '#f9f5ed' }}>
          {loyaltyRewards.length === 0 ? (
            <Typography variant="body1" sx={{ py: 2, color: '#8d6e63' }}>
              No loyalty rewards available at the moment.
            </Typography>
          ) : (
            <Box>
              <Typography variant="body1" sx={{ mb: 2, color: '#5d4037' }}>
                Redeem your points for these exclusive rewards:
              </Typography>
              <Grid container spacing={2}>
                {loyaltyRewards
                  .sort((a, b) => a.pointsRequired - b.pointsRequired)
                  .map((reward) => (
                    <Grid item xs={12} key={reward.id}>
                      <Paper elevation={0} sx={{ 
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: reward.active ? '#ffffff' : '#f5f5f5',
                        borderLeft: `4px solid ${reward.active ? '#d4a762' : '#bdbdbd'}`
                      }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ 
                          color: reward.active ? '#5d4037' : '#9e9e9e'
                        }}>
                          {reward.name}
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: reward.active ? '#8d6e63' : '#bdbdbd',
                          mb: 1
                        }}>
                          {reward.description}
                        </Typography>
                        <Chip 
                          label={`${reward.pointsRequired} points`}
                          size="small"
                          sx={{ 
                            backgroundColor: reward.active ? '#f5f0e6' : '#eeeeee',
                            color: reward.active ? '#6f4e37' : '#9e9e9e'
                          }}
                        />
                        {!reward.active && (
                          <Typography variant="caption" sx={{ 
                            ml: 1,
                            color: '#f44336',
                            fontStyle: 'italic'
                          }}>
                            Currently unavailable
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          backgroundColor: '#f5f0e6',
          borderTop: '1px solid #e0d6c2'
        }}>
          <Button 
            onClick={handleCloseRewardsDialog}
            sx={{ 
              color: '#6f4e37',
              '&:hover': {
                backgroundColor: 'rgba(111, 78, 55, 0.1)'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* OrderForm Dialog */}
      <Dialog
        open={orderDialogOpen}
        onClose={() => {
          setOrderDialogOpen(false);
          setOrderInitialProduct(null);
        }}
        maxWidth="lg" // Make dialog larger
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          Place Order
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {orderDialogOpen && (
            <OrderForm
              products={products}
              onSubmit={() => {
                setOrderDialogOpen(false);
                setOrderInitialProduct(null);
                showSnackbar('Order placed successfully!', 'success');
              }}
              onCancel={() => {
                setOrderDialogOpen(false);
                setOrderInitialProduct(null);
              }}
              initialProduct={orderInitialProduct} // Pass the selected product
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Product Details Dialog */}
      <Dialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        {productDialogProduct && (
          <>
            <DialogTitle sx={{
              backgroundColor: '#f5f0e6',
              color: '#5d4037',
              borderBottom: '1px solid #e0d6c2'
            }}>
              <Box display="flex" alignItems="center" gap={2}>
                <LocalCafe sx={{ color: '#d4a762' }} />
                <Typography variant="h6" fontWeight={700}>
                  {productDialogProduct.name}
                </Typography>
                {productDialogProduct.isPopular && (
                  <Chip label="BESTSELLER" color="error" size="small" sx={{ ml: 1, fontWeight: 600, borderRadius: 2 }} />
                )}
              </Box>
            </DialogTitle>
            <DialogContent sx={{ backgroundColor: '#f9f5ed', p: 0 }}>
              {productDialogProduct.imageUrl ? (
                <Box sx={{
                  width: '100%',
                  height: 220,
                  background: '#f5f0e6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={productDialogProduct.imageUrl}
                    alt={productDialogProduct.name}
                    style={{
                      maxHeight: 220,
                      maxWidth: '100%',
                      borderRadius: '0 0 12px 12px',
                      objectFit: 'cover'
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{
                  width: '100%',
                  height: 220,
                  background: '#f5f0e6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <LocalCafe sx={{ fontSize: 60, color: '#d4a762' }} />
                </Box>
              )}
              <Box sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ color: '#6f4e37', fontWeight: 600, mb: 1 }}>
                  {getCategoryName(productDialogProduct.categoryId)}
                </Typography>
                <Typography variant="body1" sx={{ color: '#5d4037', mb: 2 }}>
                  {productDialogProduct.description || 'No description available.'}
                </Typography>
                <Divider sx={{ my: 2 }} />
                {/* Stock */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Inventory sx={{
                    color: productDialogProduct.available ? '#4caf50' : '#f44336',
                    fontSize: '1.1rem',
                    mr: 1
                  }} />
                  <Typography variant="body2" sx={{
                    color: productDialogProduct.available ? '#4caf50' : '#f44336',
                    fontWeight: 500
                  }}>
                    {productDialogProduct.available ? 'In Stock' : 'Out of Stock'}
                  </Typography>
                </Box>
                {/* Varieties */}
                {productDialogProduct.varieties && productDialogProduct.varieties.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#6f4e37', fontWeight: 600, mb: 1 }}>
                      Choose Variety:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {productDialogProduct.varieties.map(v => (
                        <Chip
                          key={v.name}
                          label={`${v.name} - ₱${Number(v.price).toFixed(2)}`}
                          clickable
                          color={selectedVariety === v.name ? 'primary' : 'default'}
                          onClick={() => setSelectedVariety(v.name)}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 500,
                            background: selectedVariety === v.name ? '#d4a762' : '#f5f0e6',
                            color: selectedVariety === v.name ? '#fff' : '#6f4e37'
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                {/* Variants */}
                {productDialogProduct.variants && productDialogProduct.variants.length > 0 && productDialogProduct.variantPrices && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#6f4e37', fontWeight: 600, mb: 1 }}>
                      Choose Variant:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {productDialogProduct.variants.map(vid => {
                        const variant = variants.find(v => v.id === vid);
                        const price = typeof productDialogProduct.variantPrices[vid] === 'number'
                          ? Number(productDialogProduct.variantPrices[vid])
                          : 0;
                        return (
                          <Chip
                            key={vid}
                            label={`${variant ? variant.name : vid} - ₱${price.toFixed(2)}`}
                            clickable
                            color={selectedVariant === vid ? 'primary' : 'default'}
                            onClick={() => setSelectedVariant(vid)}
                            sx={{
                              borderRadius: 2,
                              fontWeight: 500,
                              background: selectedVariant === vid ? '#d4a762' : '#f5f0e6',
                              color: selectedVariant === vid ? '#fff' : '#6f4e37'
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}
                {/* Price */}
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Typography variant="h5" sx={{
                    fontWeight: 700,
                    color: '#5d4037',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    ₱{getProductPrice(productDialogProduct, selectedVariety, selectedVariant).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{
              backgroundColor: '#f5f0e6',
              borderTop: '1px solid #e0d6c2'
            }}>
              <Button
                onClick={() => setProductDialogOpen(false)}
                sx={{
                  color: '#6f4e37',
                  '&:hover': {
                    backgroundColor: 'rgba(111, 78, 55, 0.1)'
                  }
                }}
              >
                Close
              </Button>
              <Button
                variant="contained"
                disabled={!productDialogProduct.available}
                onClick={() => {
                  setOrderInitialProduct({
                    ...productDialogProduct,
                    // Pass selected variety/variant for OrderForm initial state if needed
                    initialVariety: selectedVariety,
                    initialVariant: selectedVariant
                  });
                  setOrderDialogOpen(true);
                  setProductDialogOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  background: '#6f4e37',
                  '&:hover': { background: '#5d4037' }
                }}
              >
                Order This
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ 
            width: '100%', 
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            alignItems: 'center'
          }}
          iconMapping={{
            success: <LocalCafe fontSize="inherit" />,
            error: <LocalCafe fontSize="inherit" />,
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {snackbar.message}
          </Typography>
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Menu;