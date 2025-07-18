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
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
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
import OrderProcessing from './OrderProcessing'; // Add this import

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
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [dialogSelectedProducts, setDialogSelectedProducts] = useState({});
  // New: filter and search state for dialog
  const [dialogCategory, setDialogCategory] = useState('All');
  const [dialogSearch, setDialogSearch] = useState('');

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
      const discount = totalAmount * percentage; // totalAmount is now defined above
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
    setPaymentOrder(null); // <-- Only close payment dialog here
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

  // Move this up so it's defined before first use (before handleApplyReward)
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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

      // Prepare new order data for payment dialog
      const createdOrder = {
        ...cleanedOrderData,
        id: orderRef.id
      };

      // Show payment dialog using OrderProcessing
      setPaymentOrder(createdOrder);

      // Reset form state (but do not call onSubmit yet)
      setSelectedReward(null);
      setDiscountApplied(0);
      setItems([]);
      setCustomerName('');
      setNotes('');

      // Remove: setNewOrderData(createdOrder); setShowPaymentDialog(true);
      // Remove: showSnackbar('Order submitted successfully! Please process payment.', 'success');
    } catch (error) {
      console.error('Error submitting order:', error);
      showSnackbar('Error submitting order. Please try again.', 'error');
    }
  };

  // --- Product Selection Dialog: Confirm selection logic ---
  // Add this helper to check if all selected products have required variant/variety selected
  const isDialogSelectionValid = () => {
    return Object.entries(dialogSelectedProducts).every(([productId]) => {
      const product = products.find(p => p.id === productId);
      const opts = dialogProductOptions[productId] || {};
      // If product has varieties, require variety selection
      if (product?.varieties?.length > 0 && !opts.variety) return false;
      // If product has variants, require variant selection
      if ((!product?.varieties || product.varieties.length === 0) && product?.variants?.length > 0 && !opts.variant) return false;
      return true;
    });
  };

  // --- Payment dialog logic: Only close dialog on cancel, not after payment ---
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Add state to store payment summary fields
  const [lastPaymentFields, setLastPaymentFields] = useState(null);

  // Handler to process payment (mimics OrderProcessing.js logic)
  const handleProcessPayment = async ({
    amount,
    method,
    manualDiscountType,
    manualDiscountValue,
    manualDiscount,
    serviceFee,
    shippingFee,
    adjustedTotal
  }) => {
    if (!paymentOrder) return;
    setIsProcessingPayment(true);
    try {
      // Update order with payment details and mark as paid
      await updateDoc(doc(db, 'orders', paymentOrder.id), {
        payment: {
          amount: amount,
          method: method,
          date: serverTimestamp(),
          processedBy: user.uid,
          processedByName: userData?.firstName || user.email.split('@')[0],
          manualDiscountType: manualDiscountType || null,
          manualDiscountValue: manualDiscountValue || null,
          manualDiscount: manualDiscount || null,
          serviceFee: serviceFee || null,
          shippingFee: shippingFee || null,
          adjustedTotal: adjustedTotal || null
        },
        status: 'paid',
        updatedAt: serverTimestamp()
      });

      // Add to queue collection
      await addDoc(collection(db, 'queue'), {
        orderId: paymentOrder.id,
        status: 'waiting',
        createdAt: serverTimestamp(),
        customerName: paymentOrder.customerName || 'Walk-in',
        total: adjustedTotal || paymentOrder.total,
        items: paymentOrder.items,
        payment: {
          amount: amount,
          method: method
        }
      });

      // Add activity log
      await addDoc(collection(db, 'activityLogs'), {
        type: 'payment',
        description: `Payment processed for Order #${paymentOrder.id.slice(0, 8)}`,
        userId: user.uid,
        userEmail: user.email,
        userName: userData?.firstName || user.email.split('@')[0],
        amount: amount,
        orderId: paymentOrder.id,
        timestamp: serverTimestamp()
      });

      // Store payment fields for summary dialog
      setLastPaymentFields({
        amount,
        method,
        manualDiscountType,
        manualDiscountValue,
        manualDiscount,
        serviceFee,
        shippingFee,
        adjustedTotal
      });

      // Instead of printing receipt, show payment summary dialog (handled in OrderProcessing)
      setIsProcessingPayment(false);
      // Do not close paymentOrder yet; let OrderProcessing handle dialog flow

    } catch (error) {
      setIsProcessingPayment(false);
      alert('Error processing payment. Please try again.');
      console.error('Error processing payment:', error);
    }
  };

  // Handler for "New Order" button in payment summary dialog
  const handleNewOrder = () => {
    setPaymentOrder(null);
    setLastPaymentFields(null);
    setSelectedReward(null);
    setDiscountApplied(0);
    setItems([]);
    setCustomerName('');
    setNotes('');
    // Optionally call onSubmit to refresh parent if needed
    if (onSubmit) onSubmit();
  };

  // Add this at the bottom of your OrderForm component
  const printReceiptForOrder = (order, onPrinted) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt for Order #${order.id.slice(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; width: 80mm; margin: 0 auto; padding: 10px; }
            .receipt-header { text-align: center; margin-bottom: 10px; }
            .receipt-footer { text-align: center; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 3px 0; vertical-align: top; }
            .text-right { text-align: right; }
            .text-bold { font-weight: bold; }
            .text-error { color: #d32f2f; }
            .item-details { font-size: 11px; color: #666; margin-left: 8px; display: block; }
            hr { border: 0; border-top: 1px dashed #000; margin: 10px 0; }
          </style>
        </head>
        <body>
    `);

    const createdAtDate =
      order.createdAt && order.createdAt.toDate
        ? order.createdAt.toDate()
        : (order.createdAt instanceof Date
          ? order.createdAt
          : new Date());

    printWindow.document.write(`
      <div class="receipt-header">
        <h3>Madnifeeco</h3>
        <p>530 Conch St., Tondo Manila</p>
        <p>Tel: (123) 456-7890</p>
      </div>
      <hr>
      <p>Order #: ${order.id.slice(0, 8)}</p>
      <p>Date: ${format(createdAtDate, 'MMM dd, yyyy HH:mm')}</p>
      <p>Customer: ${order.customerName || 'Walk-in'}</p>
      <hr>
      <table>
        <tbody>
          ${order.items.map((item, index) => {
            let details = '';
            // Show variety if present
            if (item.variety) {
              details += `<span class="item-details">Variety: ${item.variety}</span>`;
            }
            if (item.variantName) {
              details += `<span class="item-details">Variant: ${item.variantName}${typeof item.variantPrice !== 'undefined' && item.variantPrice !== null ? ` (+₱${Number(item.variantPrice).toFixed(2)})` : ''}</span>`;
            }
            if (item.addOns && item.addOns.length > 0) {
              item.addOns.forEach(addOn => {
                details += `<span class="item-details">Add-on: ${addOn.name}${typeof addOn.price !== 'undefined' && addOn.price !== null ? ` (+₱${Number(addOn.price).toFixed(2)})` : ''}</span>`;
              });
            } else if (item.addOnNames && item.addOnNames.length > 0) {
              details += `<span class="item-details">Add-ons: ${item.addOnNames.join(', ')}</span>`;
            }
            return `
<tr>
  <td>
    ${item.isReward
      ? `<strong>FREE:</strong> ${item.name}`
      : `${item.quantity}x ${item.name}`
    }
    ${details}
  </td>
  <td class="text-right">
    ${item.isReward ? 'FREE' : `₱${(item.price * item.quantity).toFixed(2)}`}
  </td>
</tr>
`;
          }).join('')}
          ${order.discountApplied > 0 ? `
            <tr>
              <td class="text-error">${order.rewardUsed || 'Discount'}:</td>
              <td class="text-right text-error">-₱${order.discountApplied.toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr>
            <td class="text-bold">Subtotal:</td>
            <td class="text-right text-bold">₱${order.total?.toFixed(2) || '0.00'}</td>
          </tr>
          ${order.pointsEarned > 0 ? `
            <tr>
              <td>Points Earned:</td>
              <td class="text-right">+${order.pointsEarned} pts</td>
            </tr>
          ` : ''}
          ${order.pointsDeducted > 0 ? `
            <tr>
              <td>Points Redeemed:</td>
              <td class="text-right">-${order.pointsDeducted} pts</td>
            </tr>
          ` : ''}
          ${order.payment ? `
            <tr>
              <td>Tax:</td>
              <td class="text-right">₱0.00</td>
            </tr>
            <tr>
              <td class="text-bold">Total:</td>
              <td class="text-right text-bold">₱${order.total?.toFixed(2) || '0.00'}</td>
            </tr>
            <tr>
              <td>Payment Method:</td>
              <td class="text-right">
                ${
                  order.payment.method
                    ? (order.payment.method.charAt(0).toUpperCase() + order.payment.method.slice(1))
                    : 'N/A'
                }
              </td>
            </tr>
            <tr>
              <td>Amount Tendered:</td>
              <td class="text-right">
                ₱${order.payment.amount !== undefined && order.payment.amount !== null ? Number(order.payment.amount).toFixed(2) : '0.00'}
              </td>
            </tr>
            <tr>
              <td class="text-bold">Change Due:</td>
              <td class="text-right text-bold">
                ₱${order.payment.amount !== undefined && order.payment.amount !== null ? (order.payment.amount - order.total).toFixed(2) : '0.00'}
              </td>
            </tr>
          ` : ''}
        </tbody>
      </table>
      <hr>
      <div class="receipt-footer">
        <p>Thank you for your visit!</p>
        <p>Please come again</p>
      </div>
    `);

    printWindow.document.write('</body></html>');
    printWindow.document.close();

    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        if (typeof onPrinted === 'function') onPrinted();
      }, 500);
    };
  };

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

  // Helper to get product price for grid view
  const getProductDisplayPrice = (product) => {
    if (!product) return 0;
    if (product.varieties && product.varieties.length > 0) {
      return Number(product.varieties[0].price);
    }
    if (product.variants && product.variants.length > 0 && product.variantPrices) {
      const firstVariantId = product.variants[0];
      return typeof product.variantPrices[firstVariantId] === 'number'
        ? Number(product.variantPrices[firstVariantId])
        : 0;
    }
    return typeof product.basePrice === 'number'
      ? product.basePrice
      : (typeof product.price === 'number' ? product.price : 0);
  };

  // Add state for per-product options in dialog
const [dialogProductOptions, setDialogProductOptions] = useState({}); // { [productId]: { variety, variant, addOns: [], qty } }

// Helper to get price for a product with options
const getProductDialogPrice = (product, options = {}) => {
  if (!product) return 0;
  // Variety price
  if (product.varieties && product.varieties.length > 0 && options.variety) {
    const varietyObj = product.varieties.find(v => v.name === options.variety);
    return varietyObj ? Number(varietyObj.price) : 0;
  }
  // Variant price
  if (
    (!product.varieties || product.varieties.length === 0) &&
    product.variants && product.variants.length > 0 &&
    options.variant
  ) {
    const variantObj = variants.find(v => v.id === options.variant);
    return typeof product.variantPrices?.[options.variant] === 'number'
      ? Number(product.variantPrices[options.variant])
      : (variantObj ? Number(variantObj.price || 0) : 0);
  }
  // Fallback
  return typeof product.basePrice === 'number'
    ? product.basePrice
    : (typeof product.price === 'number' ? product.price : 0);
};

  // Handle dialog product select/unselect
  const handleDialogProductToggle = (productId) => {
    setDialogSelectedProducts(prev => {
      const newSelected = { ...prev };
      if (newSelected[productId]) {
        delete newSelected[productId];
      } else {
        newSelected[productId] = 1;
      }
      return newSelected;
    });
    setDialogProductOptions(prev => {
      const newOpts = { ...prev };
      if (newOpts[productId]) {
        delete newOpts[productId];
      } else {
        newOpts[productId] = { variety: '', variant: '', addOns: [], qty: 1 };
      }
      return newOpts;
    });
  };

  // Handle dialog quantity change
  const handleDialogQuantityChange = (productId, qty) => {
    setDialogSelectedProducts(prev => ({
      ...prev,
      [productId]: Math.max(1, qty)
    }));
    setDialogProductOptions(prev => ({
      ...prev,
      [productId]: { ...prev[productId], qty: Math.max(1, qty) }
    }));
  };

  // Handle dialog variety/variant/addOns change
  const handleDialogOptionChange = (productId, field, value) => {
    setDialogProductOptions(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  // Confirm selection: add all selected products with options to order
  const handleDialogConfirm = () => {
    // Prepare items to confirm
    const newItems = [];
    Object.entries(dialogSelectedProducts).forEach(([productId, qty]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      const opts = dialogProductOptions[productId] || {};
      let itemPrice = getProductDialogPrice(product, opts);
      const addOnObjs = addOns.filter(a => (opts.addOns || []).includes(a.id));
      let addOnsTotal = addOnObjs.reduce((sum, a) => sum + Number(a.price || 0), 0);
      let itemTotalPrice = itemPrice + addOnsTotal;
      let variantObj = opts.variant ? variants.find(v => v.id === opts.variant) : null;
      newItems.push({
        productId,
        name: product.name,
        price: itemTotalPrice,
        quantity: opts.qty || qty,
        variantId: variantObj ? variantObj.id : opts.variant || undefined,
        variantName: variantObj ? variantObj.name : (() => {
          const v = variants.find(vv => vv.id === opts.variant);
          return v ? v.name : undefined;
        })(),
        addOnIds: addOnObjs.map(a => a.id),
        addOnNames: addOnObjs.map(a => a.name),
        addOns: addOnObjs,
        variety: opts.variety
      });
    });
    setMultiConfirmItems(newItems);
    setShowMultiConfirmDialog(true);
  };

  // New state for multi-select confirmation and payment dialog
  const [showMultiConfirmDialog, setShowMultiConfirmDialog] = useState(false);
  const [multiConfirmItems, setMultiConfirmItems] = useState([]);

  // New: Confirm multi-selection and add to order
  const handleMultiConfirmAdd = () => {
    // Merge with existing items (combine if same product/options)
    let updatedItems = [...items];
    multiConfirmItems.forEach(newItem => {
      const existingIndex = updatedItems.findIndex(
        item =>
          item.productId === newItem.productId &&
          item.variantId === newItem.variantId &&
          JSON.stringify(item.addOnIds || []) === JSON.stringify(newItem.addOnIds || []) &&
          item.variety === newItem.variety
      );
      if (existingIndex >= 0) {
        updatedItems[existingIndex].quantity += newItem.quantity;
      } else {
        updatedItems.push(newItem);
      }
    });
    setItems(updatedItems);
    setShowMultiConfirmDialog(false);
    setShowProductDialog(false);
    setDialogSelectedProducts({});
    setDialogProductOptions({});
    setSelectedProduct('');
    setSelectedVariety('');
    setSelectedVariant('');
    setSelectedAddOns([]);
    setQuantity(1);
  };

  // --- Add these hooks and helpers before the return statement ---

  // Fetch categories for dialog display (for horizontal list)
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    const fetchCategories = async () => {
      const q = query(collection(db, 'categories'));
      const querySnapshot = await getDocs(q);
      setCategories(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCategories();
  }, []);

  // Get unique categories from products (by categoryId)
  const productCategories = React.useMemo(() => {
    // Use categories from DB for display
    return [{ id: 'All', name: 'All' }, ...categories];
  }, [categories]);

  // Filtered and searched products for dialog
  const filteredProducts = React.useMemo(() => {
    let filtered = products.filter(p => p.available !== false);
    if (dialogCategory && dialogCategory !== 'All') {
      filtered = filtered.filter(p => p.categoryId === dialogCategory);
    }
    if (dialogSearch) {
      const s = dialogSearch.toLowerCase();
      filtered = filtered.filter(
        p =>
          (p.name && p.name.toLowerCase().includes(s)) ||
          (p.description && p.description.toLowerCase().includes(s))
      );
    }
    return filtered;
  }, [products, dialogCategory, dialogSearch]);

  // Helper to get category name by id
  const getCategoryName = (categoryId) => {
    if (!categoryId) return '';
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : '';
  };

  // --- Product Detail Dialog state and helpers ---
  const [showProductDetailDialog, setShowProductDetailDialog] = useState(false);
  const [productDetail, setProductDetail] = useState(null);
  const [productDetailOptions, setProductDetailOptions] = useState({
    variety: '',
    variant: '',
    addOns: [],
    qty: 1
  });

  // Helper to get price for product detail dialog
  const getProductDetailPrice = (product, options = {}) => {
    if (!product) return 0;
    // Variety price
    if (product.varieties && product.varieties.length > 0 && options.variety) {
      const varietyObj = product.varieties.find(v => v.name === options.variety);
      return varietyObj ? Number(varietyObj.price) : 0;
    }
    // Variant price
    if (
      (!product.varieties || product.varieties.length === 0) &&
      product.variants && product.variants.length > 0 &&
      options.variant
    ) {
      const variantObj = variants.find(v => v.id === options.variant);
      return typeof product.variantPrices?.[options.variant] === 'number'
        ? Number(product.variantPrices[options.variant])
        : (variantObj ? Number(variantObj.price || 0) : 0);
    }
    // Fallback
    return typeof product.basePrice === 'number'
      ? product.basePrice
      : (typeof product.price === 'number' ? product.price : 0);
  };

  // Open product detail dialog
  const handleOpenProductDetail = (product) => {
    setProductDetail(product);
    setProductDetailOptions({
      variety: '',
      variant: '',
      addOns: [],
      qty: 1
    });
    setShowProductDetailDialog(true);
  };

  // Confirm product detail selection
  const handleConfirmProductDetail = () => {
    const product = productDetail;
    const opts = productDetailOptions;
    let itemPrice = getProductDetailPrice(product, opts);
    const addOnObjs = addOns.filter(a => (opts.addOns || []).includes(a.id));
    let addOnsTotal = addOnObjs.reduce((sum, a) => sum + Number(a.price || 0), 0);
    let itemTotalPrice = itemPrice + addOnsTotal;
    let variantObj = opts.variant ? variants.find(v => v.id === opts.variant) : null;
    // Check if already in items (same product, variant, addOns, variety)
    const existingIndex = items.findIndex(
      item =>
        item.productId === product.id &&
        item.variantId === (variantObj ? variantObj.id : opts.variant || undefined) &&
        JSON.stringify(item.addOnIds || []) === JSON.stringify((addOnObjs || []).map(a => a.id)) &&
        item.variety === opts.variety
    );
    if (existingIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingIndex].quantity += opts.qty || 1;
      setItems(updatedItems);
    } else {
      setItems([
        ...items,
        {
          productId: product.id,
          name: product.name,
          price: itemTotalPrice,
          quantity: opts.qty || 1,
          variantId: variantObj ? variantObj.id : opts.variant || undefined,
          variantName: variantObj ? variantObj.name : (() => {
            const v = variants.find(vv => vv.id === opts.variant);
            return v ? v.name : undefined;
          })(),
          addOnIds: addOnObjs.map(a => a.id),
          addOnNames: addOnObjs.map(a => a.name),
          addOns: addOnObjs,
          variety: opts.variety
        }
     ] );
    }
    setShowProductDetailDialog(false);
    setProductDetail(null);
    setProductDetailOptions({ variety: '', variant: '', addOns: [], qty: 1 });
    setShowProductDialog(false);
  };

  // Reset dialog state on close
  const handleDialogClose = () => {
    setShowProductDialog(false);
    setDialogSelectedProducts({});
    setDialogProductOptions({});
  };

  // --- Add this helper to remove a product from multiConfirmItems ---
const handleRemoveMultiConfirmItem = (idx) => {
  setMultiConfirmItems(items => items.filter((_, i) => i !== idx));
};

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
                {/* Product Selection Button */}
                <Button
                  variant="outlined"
                  startIcon={<ShoppingCartIcon />}
                  onClick={() => setShowProductDialog(true)}
                  sx={{
                    borderRadius: '12px',
                    textTransform: 'none',
                    minWidth: 200,
                    backgroundColor: 'white',
                    fontWeight: 500
                  }}
                >
                  Select Product
                </Button>
                {/* Product Grid Dialog */}
                <Dialog
                  open={showProductDialog}
                  onClose={handleDialogClose}
                  fullWidth
                  maxWidth="md"
                  PaperProps={{
                    sx: { borderRadius: 4, p: 2 }
                  }}
                >
                  <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                      <ShoppingCartIcon color="primary" />
                      <Typography variant="h6" fontWeight={600}>Choose Products</Typography>
                    </Box>
                  </DialogTitle>
                  <DialogContent dividers sx={{ minHeight: 320, maxHeight: 600, p: 0 }}>
                    {/* Horizontal Category List */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto', pb: 1, px: 3, pt: 3 }}>
                      {productCategories.map(cat => (
                        <Chip
                          key={cat.id}
                          label={cat.name}
                          color={dialogCategory === cat.id ? "primary" : "default"}
                          clickable
                          onClick={() => setDialogCategory(cat.id)}
                          sx={{
                            fontWeight: 600,
                            borderRadius: 2,
                            bgcolor: dialogCategory === cat.id ? 'primary.main' : '#f5f5f5',
                            color: dialogCategory === cat.id ? 'white' : '#4e342e',
                            minWidth: 80
                          }}
                        />
                      ))}
                    </Box>
                    {/* Searchbar */}
                    <Box sx={{ mb: 2, px: 3 }}>
                      <TextField
                        size="small"
                        label="Search"
                        value={dialogSearch}
                        onChange={e => setDialogSearch(e.target.value)}
                        sx={{ minWidth: 220, width: '100%' }}
                      />
                    </Box>
                    {/* Product Small Grid View */}
                    <Box
                      sx={{
                        px: 3,
                        pb: 3,
                        height: 420,
                        overflowY: 'auto'
                      }}
                    >
                      <Grid container spacing={2}>
                        {filteredProducts.map((product) => {
                          const isSelected = !!dialogSelectedProducts[product.id];
                          return (
                            <Grid
                              item
                              xs={6}
                              sm={4}
                              md={2}
                              lg={2}
                              xl={2}
                              key={product.id}
                              sx={{
                                display: 'flex'
                              }}
                            >
                              <Card
                                variant={isSelected ? "elevation" : "outlined"}
                                sx={{
                                  borderRadius: 3,
                                  p: 2,
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  borderColor: isSelected ? 'primary.main' : '#ede7e3',
                                  boxShadow: isSelected ? 4 : 'none',
                                  width: '100%',
                                  background: isSelected ? '#e3f2fd' : undefined
                                }}
                                // Only toggle selection if clicking the card background, not the controls
                                onClick={e => {
                                  // Only toggle if the click is on the card itself, not on a child input/control
                                  if (e.target === e.currentTarget) {
                                    handleDialogProductToggle(product.id);
                                  }
                                }}
                              >
                                {product.imageUrl && (
                                  <Box
                                    component="img"
                                    src={product.imageUrl}
                                    alt={product.name}
                                    sx={{
                                      width: 60,
                                      height: 60,
                                      objectFit: 'cover',
                                      borderRadius: 2,
                                      mb: 1,
                                      border: '1px solid #eee',
                                      background: '#fafafa'
                                    }}
                                  />
                                )}
                                <Typography variant="subtitle2" fontWeight={600} align="center" sx={{ mb: 0.5 }}>
                                  {product.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" align="center" sx={{ mb: 0.5 }}>
                                  {getCategoryName(product.categoryId)}
                                </Typography>
                                <Typography variant="body2" color="primary" fontWeight={700}>
                                  ₱{getProductDisplayPrice(product).toFixed(2)}
                                </Typography>
                                {isSelected && (
                                  <Box sx={{ mt: 1, width: '100%' }}>
                                    {/* Variety */}
                                    {product.varieties?.length > 0 && (
                                      <FormControl
                                        size="small"
                                        fullWidth
                                        sx={{ mb: 1 }}
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <InputLabel>Variety</InputLabel>
                                        <Select
                                          label="Variety"
                                          value={dialogProductOptions[product.id]?.variety || ''}
                                          onChange={e => handleDialogOptionChange(product.id, 'variety', e.target.value)}
                                        >
                                          <MenuItem value="">None</MenuItem>
                                          {product.varieties.map(v => (
                                            <MenuItem key={v.name} value={v.name}>
                                              {v.name} (₱{Number(v.price).toFixed(2)})
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>
                                    )}
                                    {/* Variant */}
                                    {product.variants?.length > 0 && (
                                      <FormControl
                                        size="small"
                                        fullWidth
                                        sx={{ mb: 1 }}
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <InputLabel>Variant</InputLabel>
                                        <Select
                                          label="Variant"
                                          value={dialogProductOptions[product.id]?.variant || ''}
                                          onChange={e => handleDialogOptionChange(product.id, 'variant', e.target.value)}
                                        >
                                          <MenuItem value="">None</MenuItem>
                                          {product.variants.map(variantId => {
                                            const variant = variants.find(v => v.id === variantId);
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
                                    )}
                                    {/* Add-ons */}
                                    {addOns.length > 0 && (
                                      <FormControl
                                        size="small"
                                        fullWidth
                                        sx={{ mb: 1 }}
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <InputLabel>Add-ons</InputLabel>
                                        <Select
                                          label="Add-ons"
                                          multiple
                                          value={dialogProductOptions[product.id]?.addOns || []}
                                          onChange={e => handleDialogOptionChange(product.id, 'addOns', e.target.value)}
                                          renderValue={selected => addOns.filter(a => selected.includes(a.id)).map(a => a.name).join(', ')}
                                        >
                                          {addOns.map(addOn => (
                                            <MenuItem key={addOn.id} value={addOn.id}>
                                              {addOn.name} {addOn.price ? `(+₱${Number(addOn.price).toFixed(2)})` : ''}
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>
                                    )}
                                    {/* Quantity */}
                                    <Box onClick={e => e.stopPropagation()}>
                                      <TextField
                                        type="number"
                                        label="Qty"
                                        value={dialogProductOptions[product.id]?.qty || 1}
                                        onChange={e => handleDialogQuantityChange(product.id, Math.max(1, parseInt(e.target.value) || 1))}
                                        inputProps={{ min: 1 }}
                                        size="small"
                                        sx={{ width: 90 }}
                                      />
                                    </Box>
                                    {/* Price */}
                                    <Typography variant="body2" color="primary" fontWeight={700} sx={{ mt: 1 }}>
                                      ₱{getProductDialogPrice(product, dialogProductOptions[product.id] || {}).toFixed(2)}
                                      {(dialogProductOptions[product.id]?.addOns?.length > 0) && (
                                        <>
                                          {' + '}
                                          ₱{addOns.filter(a => (dialogProductOptions[product.id]?.addOns || []).includes(a.id)).reduce((sum, a) => sum + Number(a.price || 0), 0).toFixed(2)}
                                          {' (Add-ons)'}
                                        </>
                                      )}
                                    </Typography>
                                  </Box>
                                )}
                              </Card>
                            </Grid>
                          );
                        })}
                        {filteredProducts.length === 0 && (
                          <Grid item xs={12}>
                            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                              No products found.
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleDialogClose}>Cancel</Button>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={
                        Object.keys(dialogSelectedProducts).length === 0 ||
                        !isDialogSelectionValid()
                      }
                      onClick={handleDialogConfirm}
                    >
                      Confirm Selection
                    </Button>
                  </DialogActions>
                </Dialog>
                {/* END Product Grid Dialog */}

                {/* Multi-item Confirm Dialog */}
                <Dialog
                  open={showMultiConfirmDialog}
                  onClose={() => setShowMultiConfirmDialog(false)}
                  fullWidth
                  maxWidth="sm"
                >
                  <DialogTitle>Confirm Selected Products</DialogTitle>
                  <DialogContent>
                    {multiConfirmItems.length === 0 ? (
                      <Typography>No products selected.</Typography>
                    ) : (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell>Variety</TableCell>
                            <TableCell>Variant</TableCell>
                            <TableCell>Add-ons</TableCell>
                            <TableCell align="center">Qty</TableCell>
                            <TableCell align="right">Total</TableCell>
                            <TableCell align="center">Remove</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {multiConfirmItems.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.variety || '-'}</TableCell>
                              <TableCell>{item.variantName || '-'}</TableCell>
                              <TableCell>{item.addOnNames && item.addOnNames.length > 0 ? item.addOnNames.join(', ') : '-'}</TableCell>
                              <TableCell align="center">{item.quantity}</TableCell>
                              <TableCell align="right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
                              <TableCell align="center">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleRemoveMultiConfirmItem(idx)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setShowMultiConfirmDialog(false)}>Cancel</Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleMultiConfirmAdd}
                      disabled={multiConfirmItems.length === 0}
                    >
                      Add to Order
                    </Button>
                  </DialogActions>
                </Dialog>
                {/* END Multi-item Confirm Dialog */}

                {/* Product Detail Dialog */}
                <Dialog
                  open={showProductDetailDialog}
                  onClose={() => setShowProductDetailDialog(false)}
                  fullWidth
                  maxWidth="xs"
                >
                  <DialogTitle>
                    {productDetail?.name}
                  </DialogTitle>
                  <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {productDetail?.description}
                    </Typography>
                    {/* Variety */}
                    {productDetail?.varieties?.length > 0 && (
                      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Variety</InputLabel>
                        <Select
                          label="Variety"
                          value={productDetailOptions.variety}
                          onChange={e => setProductDetailOptions(opts => ({ ...opts, variety: e.target.value }))}
                        >
                          <MenuItem value="">None</MenuItem>
                          {productDetail.varieties.map(v => (
                            <MenuItem key={v.name} value={v.name}>
                              {v.name} (₱{Number(v.price).toFixed(2)})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    {/* Variant */}
                    {productDetail?.variants?.length > 0 && (
                      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Variant</InputLabel>
                        <Select
                          label="Variant"
                          value={productDetailOptions.variant}
                          onChange={e => setProductDetailOptions(opts => ({ ...opts, variant: e.target.value }))}
                        >
                          <MenuItem value="">None</MenuItem>
                          {productDetail.variants.map(variantId => {
                            const variant = variants.find(v => v.id === variantId);
                            const variantPrice = productDetail?.variantPrices?.[variantId];
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
                    )}
                    {/* Add-ons */}
                    {addOns.length > 0 && (
                      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Add-ons</InputLabel>
                        <Select
                          label="Add-ons"
                          multiple
                          value={productDetailOptions.addOns}
                          onChange={e => setProductDetailOptions(opts => ({ ...opts, addOns: e.target.value }))}
                          renderValue={selected => addOns.filter(a => selected.includes(a.id)).map(a => a.name).join(', ')}
                        >
                          {addOns.map(addOn => (
                            <MenuItem key={addOn.id} value={addOn.id}>
                              {addOn.name} {addOn.price ? `(+₱${Number(addOn.price).toFixed(2)})` : ''}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    {/* Quantity */}
                    <TextField
                      type="number"
                      label="Quantity"
                      value={productDetailOptions.qty}
                      onChange={e => setProductDetailOptions(opts => ({
                        ...opts,
                        qty: Math.max(1, parseInt(e.target.value) || 1)
                      }))}
                      inputProps={{ min: 1 }}
                      sx={{ width: 120, mb: 2 }}
                      size="small"
                    />
                    {/* Price */}
                    <Typography variant="h6" color="primary" fontWeight={700}>
                      ₱{getProductDetailPrice(productDetail, productDetailOptions).toFixed(2)}
                      {productDetailOptions.addOns.length > 0 && (
                        <>
                          {' + '}
                          ₱{addOns.filter(a => productDetailOptions.addOns.includes(a.id)).reduce((sum, a) => sum + Number(a.price || 0), 0).toFixed(2)}
                          {' (Add-ons)'}
                        </>
                      )}
                    </Typography>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setShowProductDetailDialog(false)}>Cancel</Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleConfirmProductDetail}
                    >
                      Add to Order
                    </Button>
                  </DialogActions>
                </Dialog>
                {/* END Product Detail Dialog */}
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
                    {/* Show variety if present */}
                    {item.variety && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 1 }}>
                        Variety: {item.variety}
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
          
          {/* Show payment dialog after order is created */}
          {paymentOrder && (
            <OrderProcessing
              order={{
                ...paymentOrder,
                createdAt:
                  paymentOrder.createdAt && paymentOrder.createdAt.toDate
                    ? paymentOrder.createdAt.toDate()
                    : (paymentOrder.createdAt instanceof Date
                      ? paymentOrder.createdAt
                      : new Date())
              }}
              onClose={() => setPaymentOrder(null)}
              onUpdate={() => {}}
              onProcessPayment={handleProcessPayment}
              isProcessingPayment={isProcessingPayment}
              onNewOrder={handleNewOrder}
            />
          )}
      </form>
    );
  };

  export default OrderForm;