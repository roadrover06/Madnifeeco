// src/pages/orders/OrderProcessing.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField,
  Divider,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Grid,
  MenuItem,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import LocalOffer from '@mui/icons-material/LocalOffer';
import { 
  Check as CheckIcon, 
  Close as CloseIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { updateDoc, doc, serverTimestamp, addDoc, collection, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { format } from 'date-fns';
import Receipt from '../../components/Receipt';
import { Dialog as MuiDialog } from '@mui/material';

const OrderProcessing = ({
  order,
  onClose,
  onUpdate,
  onProcessPayment,
  onNewOrder
}) => {
  const [user] = useAuthState(auth);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [manualDiscountType, setManualDiscountType] = useState('fixed');
  const [manualDiscountValue, setManualDiscountValue] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [shippingFee, setShippingFee] = useState('');
  const [showPaymentSummary, setShowPaymentSummary] = useState(false);
  const [lastPayment, setLastPayment] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // For printing, refs to hidden DOM nodes
  const receiptRef = useRef(null);
  const orderSlipRef = useRef(null);

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

  const handleProcessOrder = async (status) => {
    try {
      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };

      if (status === 'completed') {
        updateData.completedBy = user.uid;
        updateData.completedByName = userData?.firstName || user.email.split('@')[0];
      }

      await updateDoc(doc(db, 'orders', order.id), updateData);

      await addDoc(collection(db, 'activityLogs'), {
        type: status === 'completed' ? 'order_completed' : 'order_cancelled',
        description: `Order #${order.id.slice(0, 8)} ${status}`,
        userId: user.uid,
        userEmail: user.email,
        userName: userData?.firstName || user.email.split('@')[0],
        orderId: order.id,
        timestamp: serverTimestamp()
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const quickAmounts = [1, 5, 10, 20, 50, 100, 200, 500, 1000];
  const handleQuickAmount = (amt) => {
    setPaymentAmount((prev) => {
      const val = parseFloat(prev) || 0;
      return (val + amt).toString();
    });
  };

  // Calculate all fees and discounts
  const parsedDiscount = parseFloat(manualDiscountValue) || 0;
  const baseSubtotal = order.total || 0;
  
  let manualDiscount = 0;
  if (manualDiscountType === 'fixed') {
    manualDiscount = parsedDiscount;
  } else if (manualDiscountType === 'percentage') {
    manualDiscount = baseSubtotal * (parsedDiscount / 100);
  }
  
  const parsedServiceFee = parseFloat(serviceFee) || 0;
  const parsedShippingFee = parseFloat(shippingFee) || 0;

  // Adjusted total with all fees and discounts
  const adjustedTotal =
    baseSubtotal -
    (order.discountApplied || 0) -
    manualDiscount +
    parsedServiceFee +
    parsedShippingFee;

  const minAmount = adjustedTotal;
  const enteredAmount = parseFloat(paymentAmount) || 0;
  // const liveChangeDue = paymentAmount ? (enteredAmount - minAmount).toFixed(2) : '';

  // --- Print Receipt ---
  const printReceipt = () => {
    const printContents = receiptRef.current;
    if (!printContents) return;
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write('<html><head><title>Receipt</title>');
    printWindow.document.write('<style>body{font-family:Arial,sans-serif;width:80mm;margin:0 auto;padding:10px;} .receipt-header{text-align:center;margin-bottom:10px;} .receipt-footer{text-align:center;margin-top:10px;} table{width:100%;border-collapse:collapse;} td{padding:3px 0;vertical-align:top;} .text-right{text-align:right;} .text-bold{font-weight:bold;} .text-error{color:#d32f2f;} .item-details{font-size:11px;color:#666;margin-left:8px;display:block;} .item-base{font-size:12px;color:#222;} .item-addon{font-size:11px;color:#666;margin-left:12px;display:block;} hr{border:0;border-top:1px dashed #000;margin:10px 0;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContents.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  // --- Print Order Slip ---
  const printOrderSlip = () => {
    const printContents = orderSlipRef.current;
    if (!printContents) return;
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write('<html><head><title>Order Slip</title>');
    printWindow.document.write('<style>body{font-family:Arial,sans-serif;width:80mm;margin:0 auto;padding:10px;} .header{text-align:center;margin-bottom:10px;} table{width:100%;border-collapse:collapse;} td{padding:3px 0;} .bold{font-weight:bold;} hr{border:0;border-top:1px dashed #000;margin:10px 0;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContents.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handlePayment = async () => {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) < minAmount) {
      return;
    }
    
    try {
      setIsProcessingPayment(true);
      
      const paymentData = {
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        date: serverTimestamp(),
        processedBy: user?.uid,
        processedByName: userData?.firstName || user?.email?.split('@')[0],
        manualDiscountType,
        manualDiscountValue: parsedDiscount,
        manualDiscount,
        serviceFee: parsedServiceFee,
        shippingFee: parsedShippingFee,
        adjustedTotal
      };

      if (onProcessPayment) {
        await onProcessPayment(paymentData);
      } else {
        await updateDoc(doc(db, 'orders', order.id), {
          payment: paymentData,
          status: 'paid',
          updatedAt: serverTimestamp()
        });
      }

      setLastPayment(paymentData);
      setShowPaymentSummary(true);
      
      // Add to queue collection
      await addDoc(collection(db, 'queue'), {
        orderId: order.id,
        status: 'waiting',
        createdAt: serverTimestamp(),
        customerName: order.customerName || 'Walk-in',
        total: adjustedTotal,
        items: order.items,
        payment: {
          amount: parseFloat(paymentAmount),
          method: paymentMethod
        }
      });

      // Add activity log
      await addDoc(collection(db, 'activityLogs'), {
        type: 'payment',
        description: `Payment processed for Order #${order.id.slice(0, 8)}`,
        userId: user.uid,
        userEmail: user.email,
        userName: userData?.firstName || user.email.split('@')[0],
        amount: parseFloat(paymentAmount),
        orderId: order.id,
        timestamp: serverTimestamp()
      });

    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  function getBaseAndAddOnPrice(item) {
    let base = Number(item.basePrice || item.price || 0);
    let addOns = 0;
    if (item.addOns && Array.isArray(item.addOns)) {
      addOns = item.addOns.reduce((sum, ao) => sum + Number(ao.price || 0), 0);
    }
    if (item.variantPrice) {
      base += Number(item.variantPrice);
    }
    return { base, addOns };
  }

  // --- Live display values for payment info ---
  const livePaymentMethod = paymentMethod || (order.payment?.method ?? '-');
  const liveAmountTendered = paymentAmount !== '' ? Number(paymentAmount).toFixed(2) : (order.payment?.amount !== undefined ? Number(order.payment.amount).toFixed(2) : '-');
  const liveChangeDue = paymentAmount !== '' ? (enteredAmount - minAmount).toFixed(2) : (order.payment?.amount !== undefined ? (Number(order.payment.amount) - Number(order.payment.adjustedTotal ?? order.total ?? 0)).toFixed(2) : '-');

  // --- Fix createdAt display ---
  const createdAtDate = order.createdAt?.toDate ? order.createdAt.toDate() : (order.createdAt ? new Date(order.createdAt) : null);

  const displayPaymentMethod =
    order.payment?.method
      ? order.payment.method.charAt(0).toUpperCase() + order.payment.method.slice(1)
      : order.status === 'paid'
        ? 'N/A'
        : '-';

  const displayAmountTendered =
    order.payment?.amount !== undefined
      ? Number(order.payment.amount).toFixed(2)
      : order.status === 'paid'
        ? '0.00'
        : '-';

  const displayChangeDue =
    order.payment?.amount !== undefined && order.payment?.amount !== null
      ? (Number(order.payment.amount) - Number(order.payment.adjustedTotal ?? order.total ?? 0)).toFixed(2)
      : order.status === 'paid'
        ? '0.00'
        : '-';

  const changeDue =
    order.payment?.amount !== undefined && order.payment?.amount !== null
      ? (Number(order.payment.amount) - Number(order.payment.adjustedTotal ?? order.total ?? 0)).toFixed(2)
      : '0.00';

  return (
    <>
      {/* Hidden receipt for printing */}
      <div style={{ display: 'none' }}>
        <div id="print-receipt-content" ref={receiptRef}>
          <div className="receipt-header" style={{ textAlign: 'center', marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontWeight: 900, letterSpacing: 2, color: '#6f4e37' }}>Madnifeeco</h2>
            <div style={{ fontSize: 13, color: '#333', marginBottom: 2 }}>530 Conch St., Tondo Manila</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Order #{order.id?.slice(0, 8)}</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{createdAtDate ? format(createdAtDate, 'MMM dd, yyyy HH:mm') : ''}</div>
            <hr style={{ border: 0, borderTop: '1.5px dashed #bdbdbd', margin: '10px 0' }} />
          </div>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <th align="left">Item</th>
                <th align="right">Base</th>
                <th align="right">Add-ons</th>
                <th align="center">Qty</th>
                <th align="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => {
                const { base, addOns } = getBaseAndAddOnPrice(item);
                return (
                  <tr key={idx} style={{ borderBottom: '1px dotted #e0e0e0' }}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      {item.variety && <span style={{ display: 'block', fontSize: 11, color: '#888' }}>Variety: {item.variety}</span>}
                      {item.variantName && <span style={{ display: 'block', fontSize: 11, color: '#888' }}>Variant: {item.variantName}</span>}
                    </td>
                    <td align="right">{item.isReward ? <span style={{ color: '#43a047', fontWeight: 700 }}>FREE</span> : `₱${base.toFixed(2)}`}</td>
                    <td align="right">{item.isReward ? <span style={{ color: '#43a047', fontWeight: 700 }}>FREE</span> : (addOns > 0 ? `₱${addOns.toFixed(2)}` : '-')}</td>
                    <td align="center">{item.quantity}</td>
                    <td align="right">{item.isReward ? <span style={{ color: '#43a047', fontWeight: 700 }}>FREE</span> : `₱${(item.price * item.quantity).toFixed(2)}`}</td>
                  </tr>
                );
              })}
              {order.discountApplied > 0 && (
                <tr>
                  <td colSpan={4} align="right" style={{ color: '#d32f2f', fontWeight: 600 }}>{order.rewardUsed || 'Discount'}:</td>
                  <td align="right" style={{ color: '#d32f2f', fontWeight: 600 }}>-₱{order.discountApplied.toFixed(2)}</td>
                </tr>
              )}
              {manualDiscount > 0 && (
                <tr>
                  <td colSpan={4} align="right" style={{ color: '#d32f2f', fontWeight: 600 }}>Manual Discount:</td>
                  <td align="right" style={{ color: '#d32f2f', fontWeight: 600 }}>-₱{manualDiscount.toFixed(2)}</td>
                </tr>
              )}
              {parsedServiceFee > 0 && (
                <tr>
                  <td colSpan={4} align="right" style={{ color: '#6f4e37' }}>Service Fee:</td>
                  <td align="right" style={{ color: '#6f4e37' }}>₱{parsedServiceFee.toFixed(2)}</td>
                </tr>
              )}
              {parsedShippingFee > 0 && (
                <tr>
                  <td colSpan={4} align="right" style={{ color: '#6f4e37' }}>Shipping Fee:</td>
                  <td align="right" style={{ color: '#6f4e37' }}>₱{parsedShippingFee.toFixed(2)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={4} align="right" style={{ fontWeight: 700, borderTop: '1.5px solid #bdbdbd', paddingTop: 6 }}>Subtotal:</td>
                <td align="right" style={{ fontWeight: 700, borderTop: '1.5px solid #bdbdbd', paddingTop: 6 }}>₱{order.total?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td colSpan={4} align="right" style={{ fontWeight: 700 }}>Adjusted Total:</td>
                <td align="right" style={{ fontWeight: 700 }}>₱{adjustedTotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={4} align="right">Payment Method:</td>
                <td align="right">{livePaymentMethod.charAt(0).toUpperCase() + livePaymentMethod.slice(1)}</td>
              </tr>
              <tr>
                <td colSpan={4} align="right">Amount Tendered:</td>
                <td align="right">₱{liveAmountTendered}</td>
              </tr>
              <tr>
                <td colSpan={4} align="right" style={{ fontWeight: 700 }}>Change Due:</td>
                <td align="right" style={{ fontWeight: 700 }}>₱{liveChangeDue}</td>
              </tr>
            </tbody>
          </table>
          <hr style={{ border: 0, borderTop: '1.5px dashed #bdbdbd', margin: '10px 0' }} />
          <div className="receipt-footer" style={{ textAlign: 'center', fontSize: 13, color: '#6f4e37', fontWeight: 600, marginTop: 10 }}>
            Thank you for your purchase!<br />
            <span style={{ fontSize: 11, color: '#888' }}>Follow us on Facebook: <b>Madnifeeco</b></span>
          </div>
        </div>
      </div>
      {/* Hidden order slip for printing */}
      <div style={{ display: 'none' }}>
        <div id="print-order-slip-content" ref={orderSlipRef}>
          <div className="header">
            <h3>Order Slip</h3>
            <div>Order #{order.id?.slice(0, 8)}</div>
            <div>{createdAtDate ? format(createdAtDate, 'MMM dd, yyyy HH:mm') : ''}</div>
            <hr />
          </div>
          <table>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <span className="item-base">{item.name}</span>
                    {item.variety && <span className="item-details">Variety: {item.variety}</span>}
                    {item.variantName && <span className="item-details">Variant: {item.variantName}</span>}
                  </td>
                  <td className="text-right">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr />
          <div className="receipt-footer">
            Please prepare the above items.
          </div>
        </div>
      </div>
      {/* Main Dialog */}
      <MuiDialog
        open={true}
        onClose={order.status === 'pending' ? undefined : onClose}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={order.status === 'pending'}
        disableBackdropClick={order.status === 'pending'}
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: 'linear-gradient(120deg, #f9f5f0 60%, #f5f0e6 100%)',
            boxShadow: '0 8px 32px rgba(93,64,55,0.10)'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'rgba(255,255,255,0.95)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderBottom: '1.5px solid #ede7e3',
          px: 4, py: 3
        }}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{
              bgcolor: 'primary.main',
              mr: 2,
              width: 44,
              height: 44,
              fontSize: 28
            }}>
              <ReceiptIcon sx={{ color: 'white' }} />
            </Avatar>
            <Typography variant="h6" sx={{ color: '#4e342e', fontWeight: 700 }}>
              Order #{order.id.slice(0, 8)}
            </Typography>
            <Chip 
              label={order.status} 
              color={order.status === 'pending' ? 'warning' : order.status === 'paid' ? 'primary' : 'success'}
              sx={{ ml: 2, fontWeight: 600, borderRadius: 1 }}
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 4, py: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{
                p: 2, mb: 2, borderRadius: 3, background: 'rgba(255,255,255,0.95)', border: '1.5px solid #ede7e3'
              }}>
                <Typography variant="subtitle1" gutterBottom sx={{ color: '#5d4037', fontWeight: 600 }}>
                  Customer: <span style={{ fontWeight: 400 }}>{order.customerName}</span>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Date: {createdAtDate ? format(createdAtDate, 'MMM dd, yyyy HH:mm') : 'N/A'}
                </Typography>
                {order.notes && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Notes:</strong> {order.notes}
                  </Typography>
                )}
              </Paper>
              <TableContainer component={Paper} sx={{
                borderRadius: 3,
                border: '1.5px solid #ede7e3',
                background: 'rgba(255,255,255,0.97)',
                boxShadow: 'none'
              }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{
                      backgroundColor: '#f5f5f5',
                      '& th': { fontWeight: 600, color: '#4e342e', borderBottom: 'none' }
                    }}>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Base Price</TableCell>
                      <TableCell align="right">Add-ons</TableCell>
                      <TableCell align="center">Qty</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item, index) => {
                      const { base, addOns } = getBaseAndAddOnPrice(item);
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            {item.isReward ? (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <LocalOffer color="success" sx={{ mr: 1 }} />
                                <span>{item.name} (FREE)</span>
                                {item.variety && (
                                  <div style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                                    Variety: {item.variety}
                                  </div>
                                )}
                                {item.variantName && (
                                  <div style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                                    Variant: {item.variantName}
                                    {typeof item.variantPrice !== 'undefined' && item.variantPrice !== null && (
                                      <> (+₱{Number(item.variantPrice).toFixed(2)})</>
                                    )}
                                  </div>
                                )}
                              </Box>
                            ) : (
                              <>
                                <span>{item.name}</span>
                                {item.variety && (
                                  <div style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                                    Variety: {item.variety}
                                  </div>
                                )}
                                {item.variantName && (
                                  <div style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                                    Variant: {item.variantName}
                                    {typeof item.variantPrice !== 'undefined' && item.variantPrice !== null && (
                                      <> (+₱{Number(item.variantPrice).toFixed(2)})</>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {item.isReward ? 'FREE' : `₱${base.toFixed(2)}`}
                          </TableCell>
                          <TableCell align="right">
                            {item.isReward
                              ? 'FREE'
                              : addOns > 0
                                ? `₱${addOns.toFixed(2)}`
                                : '-'}
                          </TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {item.isReward
                              ? 'FREE'
                              : `₱${(item.price * item.quantity).toFixed(2)}`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {order.discountApplied > 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          <Typography color="error">
                            {order.rewardUsed || 'Discount'}:
                          </Typography>
                        </TableCell>
                          <TableCell align="right">
                            <Typography color="error">
                              -₱{order.discountApplied.toFixed(2)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                    )}
                    {manualDiscount > 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          <Typography color="error">
                            Manual Discount:
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography color="error">
                            -₱{manualDiscount.toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {parsedServiceFee > 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          Service Fee:
                        </TableCell>
                        <TableCell align="right">
                          ₱{parsedServiceFee.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )}
                    {parsedShippingFee > 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          Shipping Fee:
                        </TableCell>
                        <TableCell align="right">
                          ₱{parsedShippingFee.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <strong>Subtotal:</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>₱{order.total?.toFixed(2) || '0.00'}</strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <strong>Adjusted Total:</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>₱{adjustedTotal.toFixed(2)}</strong>
                      </TableCell>
                    </TableRow>
                    {(order.pointsEarned > 0 || order.pointsDeducted > 0) && (
                      <>
                        {order.pointsEarned > 0 && (
                          <TableRow>
                            <TableCell colSpan={3} align="right">
                              Points Earned:
                            </TableCell>
                            <TableCell align="right">
                              +{order.pointsEarned} pts
                            </TableCell>
                          </TableRow>
                        )}
                        {order.pointsDeducted > 0 && (
                          <TableRow>
                            <TableCell colSpan={3} align="right">
                              Points Redeemed:
                            </TableCell>
                            <TableCell align="right">
                              -{order.pointsDeducted} pts
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )}
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        Payment Method:
                      </TableCell>
                      <TableCell align="right" colSpan={2}>
                        {livePaymentMethod.charAt(0).toUpperCase() + livePaymentMethod.slice(1)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        Amount Tendered:
                      </TableCell>
                      <TableCell align="right" colSpan={2}>
                        ₱{liveAmountTendered}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <strong>Change Due:</strong>
                      </TableCell>
                      <TableCell align="right" colSpan={2}>
                        <strong>₱{liveChangeDue}</strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            
            <Grid item xs={12} md={6}>
              {order.status === 'pending' ? (
                <Paper elevation={0} sx={{
                  p: 3, mb: 2, borderRadius: 3, background: 'rgba(255,255,255,0.97)', border: '1.5px solid #ede7e3'
                }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ color: '#5d4037', fontWeight: 600 }}>
                    Process Payment
                  </Typography>
                  {order.discountApplied > 0 && (
                    <Box sx={{
                      backgroundColor: '#e8f5e9',
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      border: '1px solid #c8e6c9'
                    }}>
                      <Typography variant="body2">
                        <strong>Applied Reward:</strong> {order.rewardUsed}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Discount Amount:</strong> -₱{order.discountApplied.toFixed(2)}
                      </Typography>
                      {order.pointsDeducted > 0 && (
                        <Typography variant="body2">
                          <strong>Points Deducted:</strong> {order.pointsDeducted} pts
                        </Typography>
                      )}
                    </Box>
                  )}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>Quick Amount:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {quickAmounts.map((amt) => (
                        <Button
                          key={amt}
                          variant="outlined"
                          size="small"
                          onClick={() => handleQuickAmount(amt)}
                          sx={{ minWidth: 48, borderRadius: 2, fontWeight: 600 }}
                        >
                          ₱{amt}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                  <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Discount Type</InputLabel>
                      <Select
                        label="Discount Type"
                        value={manualDiscountType}
                        onChange={e => setManualDiscountType(e.target.value)}
                      >
                        <MenuItem value="fixed">Discount (Fixed)</MenuItem>
                        <MenuItem value="percentage">Discount (%)</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      label={manualDiscountType === 'fixed' ? 'Amount' : 'Percent'}
                      type="number"
                      value={manualDiscountValue}
                      onChange={e => setManualDiscountValue(e.target.value)}
                      InputProps={{
                        endAdornment: manualDiscountType === 'percentage'
                          ? <InputAdornment position="end">%</InputAdornment>
                          : <InputAdornment position="end">₱</InputAdornment>
                      }}
                      sx={{ minWidth: 120 }}
                    />
                    <Box sx={{ alignSelf: 'center', ml: 1 }}>
                      <Typography variant="body2" color="success.main">
                        -₱{manualDiscount.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                    <TextField
                      size="small"
                      label="Service Fee"
                      type="number"
                      value={serviceFee}
                      onChange={e => setServiceFee(e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₱</InputAdornment>
                      }}
                      sx={{ minWidth: 120 }}
                    />
                    <TextField
                      size="small"
                      label="Shipping Fee"
                      type="number"
                      value={shippingFee}
                      onChange={e => setShippingFee(e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₱</InputAdornment>
                      }}
                      sx={{ minWidth: 120 }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="primary">
                      <strong>Adjusted Total: ₱{adjustedTotal.toFixed(2)}</strong>
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    error={paymentAmount && enteredAmount < minAmount}
                    helperText={
                      paymentAmount && enteredAmount < minAmount
                        ? `Amount must be at least ₱${minAmount.toFixed(2)}`
                        : ''
                    }
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                    }}
                    disabled={!!isProcessingPayment}
                  />
                  <TextField
                    fullWidth
                    select
                    label="Payment Method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    sx={{ mb: 2 }}
                    disabled={!!isProcessingPayment}
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="card">Credit Card</MenuItem>
                    <MenuItem value="mobile">Mobile Payment</MenuItem>
                    <MenuItem value="gcash">GCash</MenuItem>
                  </TextField>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="primary">
                      Payment Method: <strong>{paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</strong>
                    </Typography>
                  </Box>
                  {paymentAmount && !isNaN(enteredAmount) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color={enteredAmount < minAmount ? "error" : "success.main"}>
                        Change Due: <strong>₱{liveChangeDue}</strong>
                      </Typography>
                    </Box>
                  )}
                  {paymentMethod === 'gcash' && (
                    <Box sx={{
                      mb: 2,
                      p: 2,
                      borderRadius: 2,
                      background: '#f0f7ff',
                      border: '1px solid #b3e5fc',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}>
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/8/8a/GCash_logo.svg"
                        alt="GCash"
                        style={{ height: 32, marginRight: 12 }}
                      />
                      <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 500 }}>
                        Please confirm GCash payment from customer before proceeding.
                      </Typography>
                    </Box>
                  )}
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={<PaymentIcon />}
                    onClick={handlePayment}
                    disabled={!paymentAmount || !!isProcessingPayment}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 600,
                      py: 1.2,
                      boxShadow: 'none',
                      background: '#6f4e37',
                      '&:hover': { background: '#5d4037' }
                    }}
                  >
                    {isProcessingPayment ? 'Processing...' : 'Complete Payment'}
                  </Button>
                </Paper>
              ) : (
                <Paper elevation={0} sx={{
                  p: 3, mb: 2, borderRadius: 3, background: 'rgba(255,255,255,0.97)', border: '1.5px solid #ede7e3'
                }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ color: '#5d4037', fontWeight: 600 }}>
                    Payment Details
                  </Typography>
                  {order.discountApplied > 0 && (
                    <Box sx={{ mb: 2, p: 1, backgroundColor: '#e8f5e9', borderRadius: 1 }}>
                      <Typography variant="body2">
                        <strong>Reward Applied:</strong> {order.rewardUsed}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Discount:</strong> -₱{order.discountApplied.toFixed(2)}
                      </Typography>
                      {order.pointsDeducted > 0 && (
                        <Typography variant="body2">
                          <strong>Points Used:</strong> {order.pointsDeducted} pts
                        </Typography>
                      )}
                      {order.pointsEarned > 0 && (
                        <Typography variant="body2">
                          <strong>Points Earned:</strong> +{order.pointsEarned} pts
                        </Typography>
                      )}
                    </Box>
                  )}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Status:</strong> {order.status}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Payment Method:</strong> {order.payment?.method?.charAt(0).toUpperCase() + order.payment?.method?.slice(1) || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Amount Paid:</strong> ₱{order.payment?.amount?.toFixed(2) || '0.00'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Change Given:</strong> ₱{changeDue}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Payment Date:</strong> {order.payment?.date?.toDate ? format(order.payment.date.toDate(), 'MMM dd, yyyy HH:mm') : 'N/A'}
                    </Typography>
                  </Box>
                </Paper>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{
            background: 'rgba(255,255,255,0.95)',
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            px: 4, py: 2
          }}
        >
          <Button onClick={onClose} sx={{
            borderRadius: 2,
            color: '#4e342e',
            fontWeight: 600,
            px: 3,
            py: 1,
            background: 'rgba(255,255,255,0.7)',
            '&:hover': { background: '#f5f0e6' }
          }}>
            Close
          </Button>
        </DialogActions>
        <MuiDialog
          open={showPaymentSummary}
          onClose={() => setShowPaymentSummary(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Payment Successful</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Payment for Order #{order.id.slice(0, 8)} was successful.
            </Typography>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Subtotal</TableCell>
                  <TableCell align="right">₱{Number(baseSubtotal).toFixed(2)}</TableCell>
                </TableRow>
                {order.discountApplied > 0 && (
                  <TableRow>
                    <TableCell>Reward Discount</TableCell>
                    <TableCell align="right">-₱{Number(order.discountApplied).toFixed(2)}</TableCell>
                  </TableRow>
                )}
                {manualDiscount > 0 && (
                  <TableRow>
                    <TableCell>Manual Discount</TableCell>
                    <TableCell align="right">-₱{Number(manualDiscount).toFixed(2)}</TableCell>
                  </TableRow>
                )}
                {parsedServiceFee > 0 && (
                  <TableRow>
                    <TableCell>Service Fee</TableCell>
                    <TableCell align="right">₱{Number(parsedServiceFee).toFixed(2)}</TableCell>
                  </TableRow>
                )}
                {parsedShippingFee > 0 && (
                  <TableRow>
                    <TableCell>Shipping Fee</TableCell>
                    <TableCell align="right">₱{Number(parsedShippingFee).toFixed(2)}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell><strong>Total</strong></TableCell>
                  <TableCell align="right"><strong>₱{Number(adjustedTotal).toFixed(2)}</strong></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Amount Paid</TableCell>
                  <TableCell align="right">
                    ₱{Number(lastPayment?.amount ?? paymentAmount ?? 0).toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Change Due</TableCell>
                  <TableCell align="right">
                    ₱{Number(
                      (lastPayment?.amount ?? paymentAmount ?? 0) - Number(adjustedTotal)
                    ).toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Payment Method</TableCell>
                  <TableCell align="right">
                    {(lastPayment?.method || paymentMethod).charAt(0).toUpperCase() +
                      (lastPayment?.method || paymentMethod).slice(1)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              onClick={printReceipt}
              startIcon={<PrintIcon />}
            >
              Print Receipt
            </Button>
            <Button
              variant="outlined"
              onClick={printOrderSlip}
              startIcon={<PrintIcon />}
            >
              Print Order Slip
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                setShowPaymentSummary(false);
                if (onNewOrder) onNewOrder();
                if (onClose) onClose();
              }}
            >
              New Order
            </Button>
          </DialogActions>
        </MuiDialog>
      </MuiDialog>
    </>
  );
};

export default OrderProcessing;