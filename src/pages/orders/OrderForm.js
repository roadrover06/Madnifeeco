// src/pages/orders/OrderForm.js
import React, { useState, useEffect } from 'react';
import { setDoc } from 'firebase/firestore';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { 
  TextField, 
  Button, 
  Grid, 
  MenuItem, 
  Select, 
  InputLabel, 
  FormControl, 
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Card,
  CardContent,
  Divider,
  Avatar,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip,
  ListItemButton 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import PersonIcon from '@mui/icons-material/Person';
import NotesIcon from '@mui/icons-material/Notes';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HistoryIcon from '@mui/icons-material/History';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase';
import { 
  addDoc, 
  collection, 
  serverTimestamp, 
  query, 
  where, 
  limit, 
  getDocs,
  orderBy,
  getDoc,
  doc,
  increment,
  updateDoc,
  writeBatch 
} from 'firebase/firestore';
import { format } from 'date-fns';
import { LocalOffer } from '@mui/icons-material';

const OrderForm = ({ products, onSubmit, onCancel, initialProduct }) => {
  const [user] = useAuthState(auth);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [lastOrders, setLastOrders] = useState([]);
  const [showLastOrders, setShowLastOrders] = useState(false);
  const [crossSellSuggestions, setCrossSellSuggestions] = useState([]);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loyaltyCustomers, setLoyaltyCustomers] = useState([]);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  // Add these to your existing state variables
  const [loyaltyRewards, setLoyaltyRewards] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);
  const [showRewardsDialog, setShowRewardsDialog] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(0);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    cardNumber: '',
    points: 0
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' // can be 'error', 'warning', 'info', 'success'
  });
  const [variants, setVariants] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [selectedVariety, setSelectedVariety] = useState('');

  // Add this useEffect to fetch loyalty rewards
  useEffect(() => {
    const fetchLoyaltyRewards = async () => {
      const q = query(collection(db, 'loyaltyRewards'), where('active', '==', true));
      const querySnapshot = await getDocs(q);
      const rewards = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLoyaltyRewards(rewards);
    };
    fetchLoyaltyRewards();
  }, []);

  // Add these functions to handle rewards
  const handleShowRewards = () => {
    setShowRewardsDialog(true);
  };

  const handleApplyReward = (reward) => {
    // Check if a reward is already applied
    if (selectedReward) {
      showSnackbar('Only one reward can be applied per order', 'error');
      return;
    }

    const selectedCustomer = loyaltyCustomers.find(
      c => c.name === customerName || 
           customerName.includes(c.cardNumber) || 
           c.cardNumber === customerName
    );

    if (!selectedCustomer) {
      showSnackbar('Customer not found in loyalty program', 'error');
      return;
    }

    if (selectedCustomer.points < reward.pointsRequired) {
      showSnackbar('Not enough points for this reward', 'error');
      return;
    }

    setSelectedReward(reward);
    setShowRewardsDialog(false);
    
    // Handle different reward types
    if (reward.name.includes('%')) {
      const percentage = parseFloat(reward.name.replace('%', '')) / 100;
      const discount = totalAmount * percentage;
      setDiscountApplied(discount);
      showSnackbar(`${reward.name} discount applied!`, 'success');
    } else if (reward.name.includes('Free')) {
      const freeItem = {
        productId: 'FREE-' + reward.id,
        name: reward.description || reward.name,
        price: 0,
        quantity: 1,
        isReward: true,
        rewardId: reward.id
      };
      
      setItems([...items, freeItem]);
      showSnackbar(`${reward.name} reward added to order!`, 'success');
    }
  };

  const handleRemoveReward = () => {
    if (selectedReward) {
      if (selectedReward.name.includes('Free')) {
        setItems(items.filter(item => !item.isReward || item.rewardId !== selectedReward.id));
      }
      setSelectedReward(null);
      setDiscountApplied(0);
      showSnackbar('Reward removed', 'info');
    }
  };

  // Add this to your existing handleSubmit or similar functions to reset rewards when needed
  const handleCancel = () => {
    setSelectedReward(null);
    setDiscountApplied(0);
    onCancel();
  };

  // Add this useEffect to fetch loyalty customers
  useEffect(() => {
    const fetchLoyaltyCustomers = async () => {
      const q = query(collection(db, 'loyaltyCustomers'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const customers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLoyaltyCustomers(customers);
    };
    fetchLoyaltyCustomers();
  }, []);

  // Add this function to register new loyalty customers
  const handleRegisterCustomer = async () => {
    try {
      // Generate a random card number
      const cardNumber = `LC-${Math.floor(100000 + Math.random() * 900000)}`;
      
      await addDoc(collection(db, 'loyaltyCustomers'), {
        ...newCustomer,
        cardNumber,
        points: 0,
        joinedAt: serverTimestamp()
      });
      
      setShowCustomerDialog(false);
      setNewCustomer({
        name: '',
        phone: '',
        email: '',
        cardNumber: '',
        points: 0
      });
      showSnackbar('Customer registered successfully!', 'success');
    } catch (error) {
      console.error('Error registering customer:', error);
      showSnackbar('Failed to register customer', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Add this useEffect to fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    };

    fetchUserData();
  }, [user]);

  // Add this function to get cross-sell suggestions
  const getCrossSellSuggestions = (currentItems) => {
    if (!currentItems || currentItems.length === 0) return [];
    
    const suggestions = [];
    
    // Example cross-sell mappings
    const crossSellMap = {
      'Coffee': { name: 'Cookie', price: 10, message: 'Perfect with coffee!' },
      'Tea': { name: 'Scone', price: 15, message: 'Great with tea!' },
      'Sandwich': { name: 'Chips', price: 5, message: 'Add some crunch!' },
      'Smoothie': { name: 'Energy Bar', price: 20, message: 'Boost your energy!' }
    };
    
    currentItems.forEach(item => {
      const suggestion = crossSellMap[item.name];
      if (suggestion && !currentItems.some(i => i.name === suggestion.name)) {
        suggestions.push({
          ...suggestion,
          originalItem: item.name
        });
      }
    });
    
    return suggestions;
  };

  const removeUndefined = (obj) => {
  if (!obj) return obj;
  const newObj = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

  // Update the items state effect
  useEffect(() => {
    setCrossSellSuggestions(getCrossSellSuggestions(items));
  }, [items]);

  // Add this function to handle adding a cross-sell item
  const handleAddCrossSell = (suggestion) => {
    const product = products.find(p => p.name === suggestion.name);
    if (!product) return;
    
    const existingItemIndex = items.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += 1;
      setItems(updatedItems);
    } else {
      setItems([...items, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      }]);
    }
  };

  // Add this useEffect to fetch last orders:
  useEffect(() => {
    const fetchLastOrders = async () => {
      try {
        const q = query(
          collection(db, 'orders'),
          where('customerName', '==', customerName),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLastOrders(ordersData);
      } catch (error) {
        console.error('Error fetching last orders:', error);
      }
    };

    if (customerName) {
      fetchLastOrders();
    }
  }, [customerName]);

  // Add this function to repeat an order:
  const repeatOrder = (orderToRepeat) => {
    setItems(orderToRepeat.items.map(item => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    })));
    setShowLastOrders(false);
  };

  // Update handleAddItem to include variant and add-ons
  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) return;
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    let itemPrice = 0;
    let variantObj = null;

    // If product has varieties, use selected variety price
    if (product.varieties && product.varieties.length > 0 && selectedVariety) {
      const varietyObj = product.varieties.find(v => v.name === selectedVariety);
      itemPrice = varietyObj ? Number(varietyObj.price) : 0;
    }
    // If product has no varieties but has variants, use per-product variant price
    else if ((!product.varieties || product.varieties.length === 0) && product.variants && product.variants.length > 0 && selectedVariant) {
      variantObj = variants.find(v => v.id === selectedVariant);
      itemPrice = typeof product.variantPrices?.[selectedVariant] === 'number'
        ? Number(product.variantPrices[selectedVariant])
        : (variantObj ? Number(variantObj.price || 0) : 0);
    }
    // Fallback to basePrice or price
    else {
      itemPrice = typeof product.basePrice === 'number'
        ? product.basePrice
        : (typeof product.price === 'number' ? product.price : 0);
    }

    const addOnObjs = addOns.filter(a => selectedAddOns.includes(a.id));
    let addOnsTotal = addOnObjs.reduce((sum, a) => sum + Number(a.price || 0), 0);
    let itemTotalPrice = itemPrice + addOnsTotal;

    const existingItemIndex = items.findIndex(
      item =>
        item.productId === selectedProduct &&
        item.variantId === (variantObj ? variantObj.id : undefined) &&
        JSON.stringify(item.addOnIds || []) === JSON.stringify(selectedAddOns) &&
        item.variety === selectedVariety
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += quantity;
      setItems(updatedItems);
    } else {
      setItems([
        ...items,
        {
          productId: selectedProduct,
          name: product.name,
          price: itemTotalPrice,
          quantity,
          variantId: variantObj ? variantObj.id : selectedVariant || undefined,
          variantName: variantObj ? variantObj.name : (() => {
            const v = variants.find(vv => vv.id === selectedVariant);
            return v ? v.name : undefined;
          })(),
          addOnIds: addOnObjs.map(a => a.id),
          addOnNames: addOnObjs.map(a => a.name),
          addOns: addOnObjs,
          variety: selectedVariety
        }
      ]); // <-- FIX: use closing bracket for setItems([...])
    }

    setSelectedProduct('');
    setQuantity(1);
    setSelectedVariant('');
    setSelectedAddOns([]);
    setSelectedVariety('');
  };

  const handleRemoveItem = (productId) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }

    setItems(items.map(item => 
      item.productId === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const orderTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderData = {
      customerName,
      notes,
      items,
      total: orderTotal
    };
    
    // Check if order needs confirmation (high value or many items)
    const needsConfirmation = orderTotal > 1000 || items.length > 5;
    
    if (needsConfirmation) {
      setPendingOrder(orderData);
      setShowConfirmationDialog(true);
      return;
    }
    
    submitOrder(orderData);
  };

  // Update the submitOrder function
  const submitOrder = async (orderData) => {
    try {
      // Validate that there are items in the order
      if (items.length === 0) {
        showSnackbar('Cannot submit an empty order', 'error');
        return;
      }

      // Create a Firestore batch to handle multiple writes
      const batch = writeBatch(db);

      let selectedCustomer = null;
      let pointsEarned = 0;
      let pointsDeducted = 0;

      // Calculate paid items total (excluding rewards) once
      const paidItemsTotal = items
        .filter(item => !item.isReward)
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Only process loyalty if customer name is provided
      if (customerName) {
        selectedCustomer = loyaltyCustomers.find(
          c => c.name === customerName ||
               (customerName.includes(c.cardNumber) ||
               c.cardNumber === customerName
        ));
        
        // Calculate points only if customer exists in loyalty program
        if (selectedCustomer) {
          pointsEarned = Math.floor((paidItemsTotal - discountApplied) / 50);
          
          if (selectedReward) {
            pointsDeducted = selectedReward.pointsRequired;
          }
        }
      }
      
      // Create order document reference
      const orderRef = doc(collection(db, 'orders'));

      // --- Fix: Clean items and orderData before writing ---
      const cleanedItems = items.map(item => {
        const cleaned = removeUndefined(item);
        Object.keys(cleaned).forEach(key => {
          if (cleaned[key] === undefined) delete cleaned[key];
        });
        if (cleaned.isReward) cleaned.price = 0;
        return cleaned;
      });

      const cleanedOrderData = removeUndefined({
        ...orderData,
        customerName: customerName || 'Walk-in Customer',
        items: cleanedItems,
        total: orderData.total - discountApplied,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByName: userData?.firstName || user.email.split('@')[0],
        status: 'pending',
        customerId: selectedCustomer?.id || null,
        pointsEarned,
        pointsDeducted,
        discountApplied: discountApplied,
        rewardUsed: selectedReward ? selectedReward.name : null,
        payment: removeUndefined({
          pointsEarned,
          pointsDeducted,
          discountAmount: discountApplied,
          rewardUsed: selectedReward ? selectedReward.name : null
        })
      });

      batch.set(orderRef, cleanedOrderData);

      // Update stock for each product in the order
      items.forEach(item => {
        if (!item.isReward) { // Don't reduce stock for reward items
          const productRef = doc(db, 'products', item.productId);
          batch.update(productRef, {
            stock: increment(-item.quantity)
          });

          // Deduct ingredients if product uses ingredients
          const product = products.find(p => p.id === item.productId);
          if (product && Array.isArray(product.ingredientsUsed)) {
            product.ingredientsUsed.forEach(ing => {
              if (ing.ingredientId && ing.amount > 0) {
                const ingredientRef = doc(db, 'ingredients', ing.ingredientId);
                // Deduct total amount = amount per product * quantity ordered
                batch.update(ingredientRef, {
                  stock: increment(-ing.amount * item.quantity)
                });
              }
            });
          }
        }
      });

      // Update loyalty customer points if customer exists
      if (selectedCustomer) {
        const customerRef = doc(db, 'loyaltyCustomers', selectedCustomer.id);
        batch.update(customerRef, {
          points: increment(pointsEarned - pointsDeducted)
        });

        // Add points earned transaction if any
        if (pointsEarned > 0) {
          const pointsEarnedRef = doc(collection(db, 'loyaltyPoints'));
          batch.set(pointsEarnedRef, {
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.name,
            orderId: orderRef.id,
            points: pointsEarned,
            timestamp: serverTimestamp(),
            processedBy: user.uid,
            processedByName: userData?.firstName || user.email.split('@')[0],
            type: 'earned'
          });
        }
        
        // Add points deducted transaction if any
        if (pointsDeducted > 0 && selectedReward) {
          const pointsDeductedRef = doc(collection(db, 'loyaltyPoints'));
          batch.set(pointsDeductedRef, {
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.name,
            orderId: orderRef.id,
            points: -pointsDeducted,
            timestamp: serverTimestamp(),
            processedBy: user.uid,
            processedByName: userData?.firstName || user.email.split('@')[0],
            rewardId: selectedReward.id,
            rewardName: selectedReward.name,
            type: 'redeemed'
          });
        }
      }

      // Add activity log
      const activityLogRef = doc(collection(db, 'activityLogs'));
      batch.set(activityLogRef, {
        type: 'order_created',
        description: `New order created for ${customerName || 'Walk-in Customer'}`,
        userId: user.uid,
        userEmail: user.email,
        userName: userData?.firstName || user.email.split('@')[0],
        orderId: orderRef.id,
        timestamp: serverTimestamp()
      });

      // Commit the batch
      await batch.commit();

      // Reset form state
      setSelectedReward(null);
      setDiscountApplied(0);
      setItems([]);
      setCustomerName('');
      setNotes('');

      // Call success callback
      onSubmit();
      
      showSnackbar('Order submitted successfully!', 'success');
    } catch (error) {
      console.error('Error submitting order:', error);
      showSnackbar('Error submitting order. Please try again.', 'error');
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Fetch variants and add-ons on mount
  useEffect(() => {
    const fetchVariantsAndAddOns = async () => {
      const variantsSnap = await getDocs(collection(db, 'variants'));
      setVariants(variantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const addOnsSnap = await getDocs(collection(db, 'addOns'));
      setAddOns(addOnsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchVariantsAndAddOns();
  }, []);

  // Pre-select product if initialProduct is provided
  useEffect(() => {
    if (initialProduct && initialProduct.id) {
      setSelectedProduct(initialProduct.id);
      setSelectedVariety('');
      setSelectedVariant('');
      setQuantity(1);
    }
  }, [initialProduct]);
  
  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={3}>
        {/* New Order Card - Minimalist */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '18px',
            border: '1.5px solid #ede7e3',
            boxShadow: 'none',
            animation: 'fadeIn 0.7s',
          }}>
            <CardContent sx={{ p: { xs: 2, md: 4 } }}>
              <Box display="flex" alignItems="center" mb={3}>
                <Avatar sx={{
                  bgcolor: 'primary.main',
                  width: 44,
                  height: 44,
                  mr: 2,
                  fontSize: 28,
                  boxShadow: '0 2px 8px 0 rgba(93,64,55,0.08)'
                }}>
                  <ReceiptIcon sx={{ color: 'white' }} />
                </Avatar>
                <Typography variant="h5" fontWeight="600" sx={{ color: '#4e342e' }}>
                  New Order
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Box sx={{
                    p: 2,
                    backgroundColor: '#f9f9f9',
                    borderRadius: '12px',
                    border: '1px solid #eee'
                  }}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <PersonIcon color="primary" sx={{ mr: 1, fontSize: '20px' }} />
                      <Typography variant="subtitle1" fontWeight="500">Customer Information</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Grid container spacing={1} alignItems="center">
                        <Grid item xs={12} sm={8} sx={{ minWidth: '300px' }}>
                          <Autocomplete
                            freeSolo
                            options={loyaltyCustomers}
                            getOptionLabel={(option) => 
                              typeof option === 'string' ? option : `${option.name} (${option.cardNumber})`
                            }
                            value={customerName}
                            onInputChange={(event, newValue) => {
                              setCustomerName(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Customer Name or Loyalty Card"  // Removed the 'required' prop
                                variant="outlined"
                                fullWidth
                                size="small"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: 'white'
                                  },
                                  minWidth: '300px',
                                  '& .MuiInputBase-input': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }
                                }}
                              />
                            )}
                            sx={{ 
                              flex: 1,
                              minWidth: '300px'
                            }}
                          />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <Button 
                            variant="outlined" 
                            onClick={() => setShowCustomerDialog(true)}
                            fullWidth
                            sx={{ 
                              height: '40px',
                              borderRadius: '12px',
                              textTransform: 'none'
                            }}
                          >
                            Loyalty
                          </Button>
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          {customerName && (
                            <Button
                              variant="outlined"
                              startIcon={<HistoryIcon />}
                              onClick={() => setShowLastOrders(true)}
                              fullWidth
                              sx={{ 
                                height: '40px',
                                borderRadius: '12px',
                                textTransform: 'none'
                              }}
                            >
                              History
                            </Button>
                          )}
                        </Grid>
                      </Grid>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{
                    p: 2,
                    backgroundColor: '#f9f9f9',
                    borderRadius: '12px',
                    border: '1px solid #eee',
                    height: '100%'
                  }}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <NotesIcon color="primary" sx={{ mr: 1, fontSize: '20px' }} />
                      <Typography variant="subtitle1" fontWeight="500">Order Notes</Typography>
                    </Box>
                    <TextField
                      fullWidth
                      label="Special Instructions"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      multiline
                      minRows={2}
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          backgroundColor: 'white'
                        }
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Order Items Card - Minimalist */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{
            background: 'rgba(255,255,255,0.98)',
            borderRadius: '18px',
            border: '1.5px solid #ede7e3',
            boxShadow: 'none',
            animation: 'fadeIn 1s',
          }}>
            <CardContent sx={{ p: { xs: 2, md: 4 } }}>
              <Box display="flex" alignItems="center" mb={3}>
                <Avatar sx={{
                  bgcolor: 'secondary.main',
                  width: 44,
                  height: 44,
                  mr: 2,
                  fontSize: 28,
                  boxShadow: '0 2px 8px 0 rgba(93,64,55,0.08)'
                }}>
                  <LocalCafeIcon sx={{ color: 'white' }} />
                </Avatar>
                <Typography variant="h5" fontWeight="600" sx={{ color: '#4e342e' }}>
                  Order Items
                </Typography>
              </Box>
              
              {/* Add Items Section */}
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                alignItems: 'center',
                mb: 3,
                p: 3,
                backgroundColor: '#f8f7f5',
                borderRadius: '12px',
                border: '1px solid #f0edea'
              }}>
                <Autocomplete
                  options={products.filter(p => p.available !== false)}
                  getOptionLabel={(product) => {
                    if (!product || typeof product !== 'object') return '';
                    if (typeof product === 'string') return product;
                    const name = product.name || '';
                    // Determine price based on selected variety/variant
                    let price = 0;
                    // If this product is currently selected, use the selected variety/variant from state
                    if (selectedProduct === product.id) {
                      // If product has varieties, use selectedVariety
                      if (product.varieties && product.varieties.length > 0 && selectedVariety) {
                        const varietyObj = product.varieties.find(v => v.name === selectedVariety);
                        price = varietyObj ? Number(varietyObj.price) : 0;
                      }
                      // If product has no varieties but has variants, use selectedVariant
                      else if ((!product.varieties || product.varieties.length === 0) && product.variants && product.variants.length > 0 && selectedVariant) {
                        price = typeof product.variantPrices?.[selectedVariant] === 'number'
                          ? Number(product.variantPrices[selectedVariant])
                          : 0;
                      }
                      // Fallback
                      else {
                        price = typeof product.basePrice === 'number'
                          ? product.basePrice
                          : (typeof product.price === 'number' ? product.price : 0);
                      }
                    } else {
                      // Not selected, show default price (first variety, or first variant, or basePrice/price)
                      if (product.varieties && product.varieties.length > 0) {
                        price = Number(product.varieties[0].price);
                      } else if (product.variants && product.variants.length > 0 && product.variantPrices) {
                        const firstVariantId = product.variants[0];
                        price = typeof product.variantPrices[firstVariantId] === 'number'
                          ? Number(product.variantPrices[firstVariantId])
                          : 0;
                      } else {
                        price = typeof product.basePrice === 'number'
                          ? product.basePrice
                          : (typeof product.price === 'number' ? product.price : 0);
                      }
                    }
                    return `${name} - ₱${price.toFixed(2)}`;
                  }}
                  value={
                    products.find(p => p.id === selectedProduct) || null
                  }
                  onChange={(event, newValue) => {
                    setSelectedProduct(newValue?.id || '');
                    setSelectedVariety('');
                    setSelectedVariant('');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search products..."
                      variant="outlined"
                      size="small"
                      fullWidth
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          backgroundColor: 'white'
                        }
                      }}
                    />
                  )}
                  sx={{ flex: 1, minWidth: 200 }}
                  disabled={products.filter(p => p.available !== false).length === 0}
                />
                
                {/* VARIETY DROPDOWN */}
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Variety</InputLabel>
                  <Select
                    label="Variety"
                    value={selectedVariety}
                    onChange={e => setSelectedVariety(e.target.value)}
                    disabled={
                      !selectedProduct ||
                      !(products.find(p => p.id === selectedProduct)?.varieties?.length > 0)
                    }
                  >
                    <MenuItem value="">None</MenuItem>
                    {(products.find(p => p.id === selectedProduct)?.varieties || []).map(v => (
                      <MenuItem key={v.name} value={v.name}>{v.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* VARIANT DROPDOWN */}
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Variant</InputLabel>
                  <Select
                    label="Variant"
                    value={selectedVariant}
                    onChange={e => setSelectedVariant(e.target.value)}
                    disabled={
                      !selectedProduct ||
                      !(products.find(p => p.id === selectedProduct)?.variants?.length > 0)
                    }
                  >
                    <MenuItem value="">None</MenuItem>
                    {(products.find(p => p.id === selectedProduct)?.variants || []).map(variantId => {
                      const variant = variants.find(v => v.id === variantId);
                      // Try to get per-product variant price
                      const product = products.find(p => p.id === selectedProduct);
                      const variantPrice = product?.variantPrices?.[variantId];
                      return (
                        <MenuItem key={variantId} value={variantId}>
                          {variant ? variant.name : variantId}
                          {typeof variantPrice === 'number'
                            ? ` (₱${variantPrice.toFixed(2)})`
                            : variant && variant.price
                              ? ` (+₱${Number(variant.price).toFixed(2)})`
                              : ''}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                {/* ADD-ONS MULTISELECT */}
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Add-ons</InputLabel>
                  <Select
                    label="Add-ons"
                    multiple
                    value={selectedAddOns}
                    onChange={e => setSelectedAddOns(e.target.value)}
                    renderValue={selected => addOns.filter(a => selected.includes(a.id)).map(a => a.name).join(', ')}
                  >
                    {addOns.map(addOn => (
                      <MenuItem key={addOn.id} value={addOn.id}>
                        {addOn.name} {addOn.price ? `(+₱${Number(addOn.price).toFixed(2)})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <TextField
                  type="number"
                  label="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  inputProps={{ min: 1 }}
                  sx={{ 
                    width: 100,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: 'white'
                    }
                  }}
                  size="small"
                />
                
                <Button 
                  variant="contained" 
                  onClick={handleAddItem}
                  startIcon={<AddIcon />}
                  size="medium"
                  sx={{
                    borderRadius: '12px',
                    textTransform: 'none',
                    px: 3,
                    height: '40px',
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: 'none',
                      bgcolor: 'primary.dark'
                    }
                  }}
                >
                  Add Item
                </Button>
              </Box>
              
              {/* Items Table */}
              {items.length > 0 ? (
                <TableContainer component={Paper} elevation={0} sx={{
                  border: '1px solid #ede7e3',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.97)',
                  animation: 'fadeIn 1.2s',
                }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{
                        backgroundColor: '#f5f5f5',
                        '& th': {
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          color: '#4e342e',
                          borderBottom: 'none'
                        }
                      }}>
                        <TableCell sx={{ borderRadius: '12px 0 0 0' }}>Product</TableCell>
                        <TableCell>Variety</TableCell>
                        <TableCell>Variant</TableCell>
                        <TableCell>Add-ons</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="center">Quantity</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="center" sx={{ borderRadius: '0 12px 0 0' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.productId + (item.variantId || '') + (item.addOnIds ? item.addOnIds.join(',') : '')} hover>
                          <TableCell>
                            {item.isReward ? (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <LocalOffer color="success" sx={{ mr: 1 }} />
                                <Typography fontWeight="500">
                                  {item.name} (FREE)
                                </Typography>
                              </Box>
                            ) : (
                              <Typography fontWeight="500">
                                {item.name}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.variety || '-'}
                          </TableCell>
                          <TableCell>
                            {item.variantName || '-'}
                          </TableCell>
                          <TableCell>
                            {item.addOnNames && item.addOnNames.length > 0
                              ? item.addOnNames.join(', ')
                              : '-'}
                          </TableCell>
                          <TableCell align="right">
                            {item.isReward ? (
                              <Typography color="success.main" fontStyle="italic">
                                FREE
                              </Typography>
                            ) : (
                              `₱${item.price.toFixed(2)}`
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <IconButton 
                                size="small" 
                                onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                                sx={{ 
                                  color: 'error.main',
                                  '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.08)' }
                                }}
                              >
                                <RemoveIcon fontSize="small" />
                              </IconButton>
                              <Typography sx={{ 
                                mx: 1, 
                                minWidth: 24, 
                                textAlign: 'center',
                                fontWeight: '500'
                              }}>
                                {item.quantity}
                              </Typography>
                              <IconButton 
                                size="small" 
                                onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                                sx={{ 
                                  color: 'success.main',
                                  '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.08)' }
                                }}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: '500' }}>
                            {item.isReward ? 'FREE' : `₱${(item.price * item.quantity).toFixed(2)}`}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton 
                              size="small" 
                              onClick={() => handleRemoveItem(item.productId)}
                              sx={{ 
                                color: 'error.main',
                                '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.08)' }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ '& td': { borderBottom: 'none' } }}>
                        <TableCell colSpan={5} align="right" sx={{ 
                          pt: 3,
                          fontWeight: '600',
                          fontSize: '1rem'
                        }}>
                          Order Total:
                        </TableCell>
                        <TableCell colSpan={2} align="right" sx={{ 
                          pt: 3,
                          fontWeight: '600',
                          fontSize: '1rem'
                        }}>
                          <Box>
                            <Typography>₱{totalAmount.toFixed(2)}</Typography>
                            {discountApplied > 0 && (
                              <>
                                <Typography variant="body2" color="error.main">
                                  - ₱{discountApplied.toFixed(2)} (Discount)
                                </Typography>
                                <Typography variant="subtitle1">
                                  ₱{(totalAmount - discountApplied).toFixed(2)}
                                </Typography>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Paper elevation={0} sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: '#f8f7f5',
                  borderRadius: '14px',
                  border: '1px dashed #ede7e3',
                  animation: 'fadeIn 1.2s',
                }}>
                  <LocalCafeIcon sx={{
                    fontSize: 40,
                    color: '#bdbdbd',
                    mb: 1,
                    opacity: 0.5
                  }} />
                  <Typography variant="body1" color="text.secondary">
                    No items added yet. Start by selecting a product above.
                  </Typography>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Loyalty Rewards Section */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: '16px',
            border: '1.5px solid #ede7e3',
            p: 2,
            boxShadow: 'none',
            animation: 'fadeIn 1.3s',
          }}>
            <Box display="flex" alignItems="center" mb={1}>
              <LocalOffer color="primary" sx={{ mr: 1, fontSize: '20px' }} />
              <Typography variant="subtitle1" fontWeight="500">Loyalty Rewards</Typography>
            </Box>
            {customerName && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button 
                  variant="outlined" 
                  onClick={handleShowRewards}
                  disabled={
                    !loyaltyCustomers.some(
                      c => c.name === customerName || 
                           customerName.includes(c.cardNumber) || 
                           c.cardNumber === customerName
                    ) || 
                    selectedReward
                  }
                  sx={{
                    borderRadius: '12px',
                    textTransform: 'none'
                  }}
                >
                  {selectedReward ? 'Reward Applied' : 'Use Rewards'}
                </Button>
                {selectedReward && (
                  <Chip 
                    label={`${selectedReward.name} applied`}
                    onDelete={handleRemoveReward}
                    color="success"
                    sx={{ borderRadius: '8px' }}
                  />
                )}
              </Box>
            )}
          </Card>
        </Grid>

        {/* Cross-sell Suggestions */}
        {crossSellSuggestions.length > 0 && (
          <Grid item xs={12}>
            <Card elevation={0} sx={{
              background: '#f5fafd',
              borderRadius: '16px',
              p: 2,
              border: '1.5px solid #ede7e3',
              boxShadow: 'none',
              animation: 'fadeIn 1.4s',
            }}>
              <Box display="flex" alignItems="center" mb={2}>
                <LocalOffer color="primary" sx={{ mr: 1, fontSize: '20px' }} />
                <Typography variant="subtitle1" fontWeight="500">Suggested Add-ons</Typography>
              </Box>
              <Grid container spacing={2}>
                {crossSellSuggestions.map((suggestion, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card elevation={0} sx={{ 
                      p: 2,
                      borderRadius: '12px',
                      border: '1px solid #e0e0e0',
                      backgroundColor: 'white'
                    }}>
                      <Typography variant="body1" fontWeight="500">
                        Add {suggestion.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {suggestion.message}
                      </Typography>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="body2" fontWeight="600">
                          ₱{suggestion.price.toFixed(2)}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleAddCrossSell(suggestion)}
                          sx={{
                            borderRadius: '8px',
                            textTransform: 'none'
                          }}
                        >
                          Add
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Card>
          </Grid>
        )}
        
        {/* Form Actions */}
        <Grid item xs={12}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            mt: 2
          }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              sx={{
                px: 3,
                py: 1,
                borderRadius: '12px',
                textTransform: 'none',
                borderColor: '#bdbdbd',
                color: '#4e342e',
                background: 'rgba(255,255,255,0.7)',
                '&:hover': {
                  borderColor: '#8d6e63',
                  background: '#f5f0e6'
                }
              }}
            >
              Cancel Order
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={items.length === 0}
              sx={{
                px: 3,
                py: 1,
                borderRadius: '12px',
                textTransform: 'none',
                bgcolor: 'success.main',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: 'success.dark',
                  boxShadow: 'none'
                },
                '&:disabled': {
                  bgcolor: 'action.disabledBackground',
                  color: 'text.disabled'
                }
              }}
              startIcon={<ReceiptIcon />}
            >
              Submit Order
            </Button>
          </Box>
        </Grid>
      </Grid>
              <Dialog open={showLastOrders} onClose={() => setShowLastOrders(false)}>
    <DialogTitle>Previous Orders for {customerName}</DialogTitle>
    <DialogContent>
      <List>
        {lastOrders.length > 0 ? (
          lastOrders.map((order) => (
            <ListItem 
              key={order.id}
              button
              onClick={() => repeatOrder(order)}
            >
              <ListItemText
                primary={`Order #${order.id.slice(0, 8)}`}
                secondary={`${format(order.createdAt.toDate(), 'MMM dd, yyyy')} - ₱${order.total.toFixed(2)}`}
              />
            </ListItem>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No previous orders found for this customer
          </Typography>
        )}
      </List>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setShowLastOrders(false)}>Close</Button>
    </DialogActions>
  </Dialog>

  {/* Rewards Dialog */}
<Dialog open={showRewardsDialog} onClose={() => setShowRewardsDialog(false)} fullWidth maxWidth="sm">
  <DialogTitle>Available Rewards</DialogTitle>
  <DialogContent>
    {loyaltyRewards.length > 0 ? (
      <List>
        {loyaltyRewards.map((reward) => {
          const selectedCustomer = loyaltyCustomers.find(
            c => c.name === customerName || 
                 customerName.includes(c.cardNumber) || 
                 c.cardNumber === customerName
          );
          const canUseReward = selectedCustomer && 
                             selectedCustomer.points >= reward.pointsRequired &&
                             !selectedReward; // Disable if reward already selected
          
          return (
            <ListItem 
              key={reward.id}
              secondaryAction={
                <Typography variant="body2" color="text.secondary">
                  {reward.pointsRequired} pts
                </Typography>
              }
              sx={{
                opacity: canUseReward ? 1 : 0.6,
                borderBottom: '1px solid #eee',
                mb: 1
              }}
            >
              <ListItemButton
                onClick={() => canUseReward && handleApplyReward(reward)}
                disabled={!canUseReward || selectedReward} // Disable if reward already selected
              >
                <ListItemText
                  primary={reward.name}
                  secondary={reward.description}
                />
                {!canUseReward && (
                  <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                    {selectedReward ? 'Reward already applied' : 'Not enough points'}
                  </Typography>
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    ) : (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No rewards available at this time.
      </Typography>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowRewardsDialog(false)}>Close</Button>
  </DialogActions>
</Dialog>

  {/* Add this at the bottom of your OrderForm component */}
<Dialog open={showCustomerDialog} onClose={() => setShowCustomerDialog(false)}>
  <DialogTitle>Register Loyalty Customer</DialogTitle>
  <DialogContent>
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Full Name"
          value={newCustomer.name}
          onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Phone Number"
          value={newCustomer.phone}
          onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={newCustomer.email}
          onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
        />
      </Grid>
    </Grid>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowCustomerDialog(false)}>Cancel</Button>
    <Button 
      onClick={handleRegisterCustomer}
      variant="contained"
      disabled={!newCustomer.name || !newCustomer.phone}
    >
      Register
    </Button>
  </DialogActions>
</Dialog>

  <Dialog
    open={showConfirmationDialog}
    onClose={() => setShowConfirmationDialog(false)}
  >
    <DialogTitle>Confirm Large Order</DialogTitle>
    <DialogContent>
      <Typography variant="body1" gutterBottom>
        This order has a total of ₱{pendingOrder?.total?.toFixed(2)} with {pendingOrder?.items?.length} items.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Please confirm this order is correct before submitting.
      </Typography>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Price</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingOrder?.items?.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.name}</TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={2} align="right"><strong>Total:</strong></TableCell>
              <TableCell align="right"><strong>₱{pendingOrder?.total?.toFixed(2)}</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setShowConfirmationDialog(false)}>Cancel</Button>
      <Button 
        variant="contained" 
        color="primary"
        onClick={() => {
          submitOrder(pendingOrder);
          setShowConfirmationDialog(false);
        }}
      >
        Confirm Order
      </Button>
    </DialogActions>
  </Dialog>
          
          
      </form>
    );
  };

  export default OrderForm;