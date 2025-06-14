// src/pages/orders/OrderProcessing.js
import React, { useState } from 'react';
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


const OrderProcessing = ({ order, onClose, onUpdate }) => {
  const [user] = useAuthState(auth);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [userData, setUserData] = useState(null);

  // Add this useEffect to fetch user data
React.useEffect(() => {
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

    // Add activity log
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

  // In OrderProcessing.js, update the handlePayment function:
const handlePayment = async () => {
  const amount = parseFloat(paymentAmount);
  if (isNaN(amount) || amount < order.total) {
    alert(`Payment amount must be at least ₱${order.total.toFixed(2)}`);
    return;
  }

  try {
    // Update order with payment details and mark as paid
    await updateDoc(doc(db, 'orders', order.id), {
      payment: {
        amount: amount,
        method: paymentMethod,
        date: serverTimestamp(),
        processedBy: user.uid,
        processedByName: userData?.firstName || user.email.split('@')[0]
      },
      status: 'paid',
      updatedAt: serverTimestamp()
    });

    // Add to queue collection
    await addDoc(collection(db, 'queue'), {
      orderId: order.id,
      status: 'waiting',
      createdAt: serverTimestamp(),
      customerName: order.customerName || 'Walk-in',
      total: order.total,
      items: order.items,
      payment: {
        amount: amount,
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
      amount: amount,
      orderId: order.id,
      timestamp: serverTimestamp()
    });

    onUpdate();
    onClose();
  } catch (error) {
    console.error('Error processing payment:', error);
    alert('Error processing payment. Please try again.');
  }
};

  // Update the printReceipt function in OrderProcessing.js
const printReceipt = () => {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt for Order #${order.id.slice(0, 8)}</title>
        <style>
          body { 
            font-family: Arial, sans-serif;
            width: 80mm;
            margin: 0 auto;
            padding: 10px;
          }
          .receipt-header {
            text-align: center;
            margin-bottom: 10px;
          }
          .receipt-footer {
            text-align: center;
            margin-top: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          td {
            padding: 3px 0;
            vertical-align: top;
          }
          .text-right {
            text-align: right;
          }
          .text-bold {
            font-weight: bold;
          }
          .text-error {
            color: #d32f2f;
          }
          .item-details {
            font-size: 11px;
            color: #666;
            margin-left: 8px;
            display: block;
          }
          hr {
            border: 0;
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
  `);

  // Main receipt content
  printWindow.document.write(`
    <div class="receipt-header">
      <h3>Your Cafe Name</h3>
      <p>123 Cafe Street, City</p>
      <p>Tel: (123) 456-7890</p>
    </div>
    <hr>
    <p>Order #: ${order.id.slice(0, 8)}</p>
    <p>Date: ${order.createdAt?.toDate ? format(order.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : 'N/A'}</p>
    <p>Customer: ${order.customerName || 'Walk-in'}</p>
    <hr>
    <table>
      <tbody>
        ${order.items.map((item, index) => {
          let details = '';
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

  // Wait for content to load before printing
  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
};

// Helper to render item details for dialog and receipt
function renderItemDetails(item) {
  // For dialog: returns array of JSX elements
  const details = [];
  details.push(
    <span key="name">{item.name}</span>
  );
  if (item.variantName) {
  details.push(
    <div key="variant" style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
      Variant: {item.variantName}
      {item.variantPrice ? ` (+₱${item.variantPrice.toFixed(2)})` : ''}
    </div>
  );
}
  if (item.addOns && item.addOns.length > 0) {
    item.addOns.forEach((addOn, idx) => {
      details.push(
        <div key={`addon-${idx}`} style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
          Add-on: {addOn.name}
          {addOn.price ? ` (+₱${addOn.price.toFixed(2)})` : ''}
        </div>
      );
    });
  } else if (item.addOnNames && item.addOnNames.length > 0) {
    // fallback for legacy addOnNames (no price)
    details.push(
      <div key="addon-names" style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
        Add-ons: {item.addOnNames.join(', ')}
      </div>
    );
  }
  return details;
}

// Calculate change if payment exists
  const changeDue = order.payment 
    ? (order.payment.amount - order.total).toFixed(2)
    : 0;

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="md"
      fullWidth
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
                Date: {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : 'N/A'}
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
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="center">Qty</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
  {order.items.map((item, index) => (
    <TableRow key={index}>
      <TableCell>
  {item.isReward ? (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <LocalOffer color="success" sx={{ mr: 1 }} />
      <span>{item.name} (FREE)</span>
      {item.variantName && (
        <div style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
          Variant: {item.variantName}
          {/* Always show variant price, even if 0 */}
          {typeof item.variantPrice !== 'undefined' && item.variantPrice !== null && (
            <> (+₱{Number(item.variantPrice).toFixed(2)})</>
          )}
        </div>
      )}
      {item.addOns && item.addOns.length > 0 && item.addOns.map((addOn, idx) => (
        <div key={idx} style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
          Add-on: {addOn.name}
          {typeof addOn.price !== 'undefined' && addOn.price !== null && (
            <> (+₱{Number(addOn.price).toFixed(2)})</>
          )}
        </div>
      ))}
      {!item.addOns && item.addOnNames && item.addOnNames.length > 0 && (
        <div style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
          Add-ons: {item.addOnNames.join(', ')}
        </div>
      )}
    </Box>
  ) : (
    <>
      <span>{item.name}</span>
      {item.variantName && (
        <div style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
          Variant: {item.variantName}
          {/* Always show variant price, even if 0 */}
          {typeof item.variantPrice !== 'undefined' && item.variantPrice !== null && (
            <> (+₱{Number(item.variantPrice).toFixed(2)})</>
          )}
        </div>
      )}
      {item.addOns && item.addOns.length > 0 && item.addOns.map((addOn, idx) => (
        <div key={idx} style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
          Add-on: {addOn.name}
          {typeof addOn.price !== 'undefined' && addOn.price !== null && (
            <> (+₱{Number(addOn.price).toFixed(2)})</>
          )}
        </div>
      ))}
      {!item.addOns && item.addOnNames && item.addOnNames.length > 0 && (
        <div style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
          Add-ons: {item.addOnNames.join(', ')}
        </div>
      )}
    </>
  )}
      </TableCell>
      <TableCell align="right">
        {item.isReward
          ? 'FREE'
          : `₱${item.price.toFixed(2)}`
        }
      </TableCell>
      <TableCell align="center">{item.quantity}</TableCell>
      <TableCell align="right">
        {item.isReward
          ? 'FREE'
          : `₱${(item.price * item.quantity).toFixed(2)}`
        }
      </TableCell>
    </TableRow>
  ))}
  
  {/* Add rewards/discounts display */}
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
  
  <TableRow>
    <TableCell colSpan={3} align="right">
      <strong>Subtotal:</strong>
    </TableCell>
    <TableCell align="right">
      <strong>₱{order.total?.toFixed(2) || '0.00'}</strong>
    </TableCell>
  </TableRow>
  
  {/* Show points earned/deducted if available */}
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
                  {order.payment && (
                    <>
                      <TableRow>
                        <TableCell colSpan={3} align="right">Tax:</TableCell>
                        <TableCell align="right">₱0.00</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          <strong>Total:</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>₱{order.total?.toFixed(2) || '0.00'}</strong>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} align="right">Payment Method:</TableCell>
                        <TableCell align="right">
                          ₱{order.payment?.method
  ? order.payment.method.charAt(0).toUpperCase() + order.payment.method.slice(1)
  : 'N/A'}

                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} align="right">Amount Tendered:</TableCell>
                        <TableCell align="right">
                          ₱{order.payment.amount?.toFixed(2) || '0.00'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          <strong>Change Due:</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>₱{changeDue}</strong>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
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
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  error={paymentAmount && parseFloat(paymentAmount) < (order.total - (order.discountApplied || 0))}
                  helperText={
                    paymentAmount && parseFloat(paymentAmount) < (order.total - (order.discountApplied || 0)) ?
                      `Amount must be at least ₱${(order.total - (order.discountApplied || 0)).toFixed(2)}` : ''
                  }
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  }}
                />
                <TextField
                  fullWidth
                  select
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Credit Card</MenuItem>
                  <MenuItem value="mobile">Mobile Payment</MenuItem>
                  <MenuItem value="gcash">GCash</MenuItem>
                </TextField>
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
                  disabled={!paymentAmount}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 600,
                    py: 1.2,
                    boxShadow: 'none',
                    background: '#6f4e37',
                    '&:hover': { background: '#5d4037' }
                  }}
                >
                  Complete Payment
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
                    <strong>Status:</strong> Completed
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
            <Paper elevation={0} sx={{
              p: 3, borderRadius: 3, background: 'rgba(255,255,255,0.97)', border: '1.5px solid #ede7e3'
            }}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: '#5d4037', fontWeight: 600 }}>
                Order Actions
              </Typography>
              <Box display="flex" gap={1} mb={2}>
                {order.status === 'pending' && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CloseIcon />}
                    onClick={() => handleProcessOrder('cancelled')}
                    sx={{ borderRadius: 2, fontWeight: 600 }}
                  >
                    Cancel Order
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={printReceipt}
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                >
                  Print Receipt
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{
        background: 'rgba(255,255,255,0.95)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        px: 4, py: 2
      }}>
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
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(24px);}
            to { opacity: 1; transform: none;}
          }
        `}
      </style>
    </Dialog>
  );
};

export default OrderProcessing;