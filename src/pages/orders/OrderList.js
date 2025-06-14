// src/pages/orders/OrderList.js
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Typography,
  Chip,
  Box
} from '@mui/material';
import { format } from 'date-fns';

const statusColors = {
  pending: 'warning',
  completed: 'success',
  cancelled: 'error',
  paid: 'primary',
  'in-progress': 'info'
};

const OrderList = ({ orders, onOrderClick }) => {
  if (orders.length === 0) {
    return (
      <Typography variant="body1" sx={{ mt: 2 }}>
        No orders found. Create your first order!
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} sx={{
      borderRadius: '16px',
      border: '1.5px solid #ede7e3',
      background: 'rgba(255,255,255,0.97)',
      boxShadow: 'none',
      animation: 'fadeIn 0.7s',
    }}>
      <Table>
        <TableHead>
          <TableRow sx={{
            backgroundColor: '#f5f5f5',
            '& th': {
              fontWeight: 600,
              fontSize: '1rem',
              color: '#4e342e',
              borderBottom: 'none'
            }
          }}>
            <TableCell>Order ID</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Items</TableCell>
            <TableCell>Total</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map(order => (
            <TableRow
              key={order.id}
              hover
              onClick={() => onOrderClick(order)}
              sx={{
                cursor: 'pointer',
                transition: 'background 0.2s',
                '&:hover': { backgroundColor: '#f9f5f0' }
              }}
            >
              <TableCell sx={{ fontWeight: 500, color: '#5d4037' }}>#{order.id.slice(0, 8)}</TableCell>
              <TableCell sx={{ color: '#6d4c41' }}>{order.customerName}</TableCell>
              <TableCell sx={{ color: '#8d6e63' }}>
                {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : 'N/A'}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {order.items.map((item, index) => (
                    <Typography key={index} variant="body2" sx={{ color: '#4e342e' }}>
                      {item.quantity}x {item.name}
                      {item.variantName ? ` (${item.variantName})` : ''}
                      {item.addOnNames && item.addOnNames.length > 0
                        ? ` [${item.addOnNames.join(', ')}]`
                        : ''}
                      {item.isReward ? ' (FREE)' : ''}
                    </Typography>
                  ))}
                </Box>
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#3e2723' }}>
                ₱{order.total?.toFixed(2) || '0.00'}
              </TableCell>
              <TableCell>
                <Chip
                  label={order.status.replace('-', ' ')}
                  color={statusColors[order.status] || 'default'}
                  size="small"
                  sx={{ borderRadius: '8px', fontWeight: 500 }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(24px);}
            to { opacity: 1; transform: none;}
          }
        `}
      </style>
    </TableContainer>
  );
};

export default OrderList;