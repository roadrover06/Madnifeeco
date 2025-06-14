// src/pages/owner/OwnerDashboard.js
import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase';
import { 
  doc, getDoc, collection, query, where, getDocs, 
  orderBy, limit, onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { format, subDays, startOfWeek, endOfWeek, startOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Chart } from 'react-google-charts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// MUI Icons
import {
  LocalCafe, AttachMoney, People, Inventory, BarChart,
  TrendingUp, TrendingDown, Receipt, Star, Schedule,
  PointOfSale, CardGiftcard, TableRestaurant, Queue,
  Print, PictureAsPdf, Description
} from '@mui/icons-material';

// MUI Components
import {
  Typography, Container, Box, CircularProgress, Grid,
  Card, CardContent, CardHeader, Avatar, Divider,
  LinearProgress, Chip, Paper, Button, List,
  Menu, MenuItem, IconButton, ToggleButton, ToggleButtonGroup, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { PieChart, ShowChart, BarChart as MuiBarChart, TableChart } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import logoBase64 from './madnifeeco-logo-base64'; 

const OwnerDashboard = () => {
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    totalOrders: 0,
    activeStaff: 0,
    inventoryValue: 0,
    tableUtilization: 0,
    occupiedTables: 0,
    totalTables: 10, // Assuming you have 10 tables
    queueEfficiency: 0,
    avgWaitTime: 0,
    queueLength: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [loyaltyData, setLoyaltyData] = useState({
    totalPoints: 0,
    redeemedPoints: 0,
    activeMembers: 0
  });
  const [loadingData, setLoadingData] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [products, setProducts] = useState([]);
  const [reportFilter, setReportFilter] = useState('thisMonth');
  const [reservations, setReservations] = useState([]);
  const [queueItems, setQueueItems] = useState([]);
  const [chartType, setChartType] = useState('LineChart');
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);

  // Analytics summary
  const analytics = [
    {
      label: 'Best Day',
      value: (() => {
        if (revenueData.length <= 1) return 'N/A';
        const max = revenueData.slice(1).reduce((a, b) => (a[1] > b[1] ? a : b));
        return `${max[0]} (₱${max[1].toFixed(2)})`;
      })(),
    },
    {
      label: 'Worst Day',
      value: (() => {
        if (revenueData.length <= 1) return 'N/A';
        const min = revenueData.slice(1).reduce((a, b) => (a[1] < b[1] ? a : b));
        return `${min[0]} (₱${min[1].toFixed(2)})`;
      })(),
    },
    {
      label: 'Avg. Daily Revenue',
      value: (() => {
        if (revenueData.length <= 1) return 'N/A';
        const sum = revenueData.slice(1).reduce((acc, cur) => acc + cur[1], 0);
        return `₱${(sum / (revenueData.length - 1)).toFixed(2)}`;
      })(),
    },
    {
      label: 'Top Product',
      value: topProducts.length > 0 ? `${topProducts[0].name} (${topProducts[0].count} sold)` : 'N/A',
    },
    {
      label: 'Most Loyal Customers',
      value: loyaltyData.activeMembers,
    },
  ];

  // Fetch user data and dashboard data
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    };

    const fetchDashboardData = async () => {
      try {
        setLoadingData(true);
        
        // Calculate date ranges
        const today = new Date();
        const lastMonth = subDays(today, 30);
        const weekStart = startOfWeek(today);
        const weekEnd = endOfWeek(today);

         // Fetch all tables to get the actual count
    const tablesQuery = query(collection(db, 'tables'));
    const tablesSnapshot = await getDocs(tablesQuery);
    const totalTables = tablesSnapshot.size || 10; // Fallback to 10 if no tables exist

    // Fetch orders data
    const ordersQuery = query(collection(db, 'orders'), where('status', '==', 'completed'));
    const monthlyOrdersQuery = query(
      collection(db, 'orders'),
      where('status', '==', 'completed'),
      where('createdAt', '>=', lastMonth)
    );
    const weeklyOrdersQuery = query(
      collection(db, 'orders'),
      where('status', '==', 'completed'),
      where('createdAt', '>=', weekStart),
      where('createdAt', '<=', weekEnd)
    );

    // Fetch reservations data - only get today's reservations
    const currentDate = format(today, 'yyyy-MM-dd');
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('date', '==', currentDate),
      where('status', '==', 'Reserved')
    );
    // Fetch queue data - only get today's queue items
    const queueQuery = query(
      collection(db, 'queue'),
      where('createdAt', '>=', startOfDay(today))
    );

   // Execute all queries in parallel
const [
  ordersSnapshot,
  monthlySnapshot,
  weeklySnapshot,
  reservationsSnapshot, 
  queueSnapshot
] = await Promise.all([
  getDocs(ordersQuery),
  getDocs(monthlyOrdersQuery),
  getDocs(weeklyOrdersQuery),
  getDocs(reservationsQuery),
  getDocs(queueQuery)
]);

    // Process reservations data
    const reservationsData = reservationsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      // Convert Firestore timestamp to Date if it exists
      createdAt: doc.data().createdAt?.toDate?.() || new Date()
    }));
    setReservations(reservationsData);

    // Process queue data
    const queueData = queueSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamp to Date if it exists
      createdAt: doc.data().createdAt?.toDate?.() || new Date()
    }));
    setQueueItems(queueData);

    // --- STAFF QUERY: INCLUDE MANAGER ---
    // Fetch staff data (include manager)
    const staffQuery = query(
      collection(db, 'users'),
      where('role', 'in', ['staff', 'barista', 'cashier', 'manager'])
    );
    const staffSnapshot = await getDocs(staffQuery);

    // --- STAFF PERFORMANCE: CALCULATE FROM SHIFTS COLLECTION ---
    // Fetch all shifts for staff performance calculation
    const shiftsQuery = query(collection(db, 'shifts'));
    const shiftsSnapshot = await getDocs(shiftsQuery);
    const shiftsData = shiftsSnapshot.docs.map(doc => ({
      ...doc.data(),
      clockIn: doc.data().clockIn?.toDate?.(),
      clockOut: doc.data().clockOut?.toDate?.(),
    }));

    // Calculate staff performance: shifts completed, punctuality, avg duration
    const staffPerfArr = staffSnapshot.docs.map(staffDoc => {
      const staff = staffDoc.data();
      const staffId = staffDoc.id;
      const staffShifts = shiftsData.filter(s => s.userId === staffId && s.status === 'completed');
      const shiftsCompleted = staffShifts.length;
      // Punctuality: % of shifts where clockIn <= scheduledStart (on time or early)
      let punctuality = 'N/A';
      if (shiftsCompleted > 0) {
        const punctualCount = staffShifts.filter(s => {
          if (!s.clockIn || !s.scheduledStart) return false;
          // Compare times as "HH:mm"
          const clockInStr = typeof s.clockIn === 'object' ? format(s.clockIn, 'HH:mm') : s.clockIn;
          return clockInStr <= s.scheduledStart;
        }).length;
        punctuality = ((punctualCount / shiftsCompleted) * 5).toFixed(2); // scale to 5
      }
      // Avg duration in hours
      let avgDuration = 'N/A';
      if (shiftsCompleted > 0) {
        const totalMinutes = staffShifts.reduce((sum, s) => {
          if (s.clockIn && s.clockOut) {
            return sum + Math.max(0, (s.clockOut - s.clockIn) / 60000);
          }
          return sum;
        }, 0);
        avgDuration = (totalMinutes / shiftsCompleted / 60).toFixed(2);
      }
      return {
        name: staff.firstName && staff.lastName ? `${staff.firstName} ${staff.lastName}` : (staff.name || staff.email || 'Unnamed'),
        shiftsCompleted,
        punctuality,
        avgDuration,
      };
    });
    setStaffPerformance(staffPerfArr);

    // --- TABLE UTILIZATION ---
    // Calculate current time for table utilization
    // Instead of only "Reserved", count all statuses except "available" and "cancelled"
    // This logic is already correct in your stats calculation:
    // const activeStatuses = ['Reserved', 'Seated', 'Completed'];
    const activeStatuses = ['Reserved', 'Seated', 'Completed'];
    const activeReservations = reservationsData.filter(reservation =>
      activeStatuses.includes((reservation.status || '').toLowerCase().replace(/^\w/, c => c.toUpperCase()))
    );
    const occupiedTables = [...new Set(activeReservations.map(res => res.tableNumber))].length;
    const tableUtilization = totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;

    // --- QUEUE EFFICIENCY ---
    // Calculate queue efficiency metrics
    const waitingQueue = queueData.filter(item =>
      item.payment?.status === 'waiting' ||
      !item.payment?.status // Include items without payment status
    );
    const avgWaitTime = calculateAverageWaitTime(waitingQueue);
    const queueLength = waitingQueue.length;
    const queueEfficiency = calculateQueueEfficiency(queueData);

    // Calculate revenue
    const totalRevenue = ordersSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
    const monthlyRevenue = monthlySnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
    const weeklyRevenue = weeklySnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);

    // Fetch products data for inventory value
    const productsQuery = query(collection(db, 'products'));
    const productsSnapshot = await getDocs(productsQuery);
    const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProducts(productsData);
    
    // Calculate inventory value from products (use correct price logic)
    const getProductBasePrice = (product) => {
      // If product has varieties (array of {name, price}), use the lowest price
      if (Array.isArray(product.varieties) && product.varieties.length > 0) {
        return Math.min(...product.varieties.map(v => parseFloat(v.price) || 0));
      }
      // If product has variants and variantPrices, use the lowest variant price
      if (
        Array.isArray(product.variants) && product.variants.length > 0 &&
        product.variantPrices && typeof product.variantPrices === 'object' && Object.keys(product.variantPrices).length > 0
      ) {
        return Math.min(...Object.values(product.variantPrices).map(p => parseFloat(p) || 0));
      }
      // Fallback to product.price if present
      return parseFloat(product.price) || 0;
    };

    const inventoryValue = productsData.reduce((sum, product) => {
      const price = getProductBasePrice(product);
      return sum + (price * (product.stock || 0));
    }, 0);

    // --- SET STATS (INCLUDE MANAGER IN STAFF COUNT, TABLE UTILIZATION, QUEUE EFFICIENCY) ---
    setStats({
      totalRevenue,
      monthlyRevenue,
      weeklyRevenue,
      totalOrders: ordersSnapshot.size,
      activeStaff: staffSnapshot.size, // now includes manager
      inventoryValue,
      tableUtilization,
      occupiedTables,
      totalTables,
      queueEfficiency,
      avgWaitTime,
      queueLength
    });

        // Prepare revenue data for chart
        const dailyRevenue = {};
        ordersSnapshot.docs.forEach(doc => {
          const order = doc.data();
          const date = order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd') : 'unknown';
          if (!dailyRevenue[date]) {
            dailyRevenue[date] = 0;
          }
          dailyRevenue[date] += order.total || 0;
        });
        
        const chartData = [
          ['Date', 'Revenue'],
          ...Object.entries(dailyRevenue).map(([date, revenue]) => [date, revenue])
        ];
        setRevenueData(chartData);

        // Fetch loyalty program data
const loyaltyQuery = query(collection(db, 'loyaltyCustomers'));
const loyaltySnapshot = await getDocs(loyaltyQuery);

// Calculate loyalty metrics
let totalPoints = 0;
loyaltySnapshot.forEach(doc => {
  const customer = doc.data();
  totalPoints += customer.points || 0;
});

// Set loyalty data
setLoyaltyData({
  totalPoints,
  redeemedPoints: 0, // You can implement this if you track redemptions
  activeMembers: loyaltySnapshot.size
});
        // Fetch recent orders
        const recentOrdersQuery = query(
          collection(db, 'orders'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const recentSnapshot = await getDocs(recentOrdersQuery);
        setRecentOrders(recentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Calculate top products (simplified)
        const productMap = {};
        ordersSnapshot.docs.forEach(doc => {
          const order = doc.data();
          if (order.items) {
            order.items.forEach(item => {
              if (!productMap[item.name]) {
                productMap[item.name] = { name: item.name, count: 0, revenue: 0 };
              }
              productMap[item.name].count += item.quantity;
              productMap[item.name].revenue += item.price * item.quantity;
            });
          }
        });
        setTopProducts(Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

        // Set up real-time listeners
        const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
          setStats(prev => ({
            ...prev,
            totalOrders: snapshot.size,
            totalRevenue: snapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0)
          }));
        });

        const unsubscribeStaff = onSnapshot(staffQuery, (snapshot) => {
          setStats(prev => ({ ...prev, activeStaff: snapshot.size }));
        });

        setLoadingData(false);

        return () => {
          unsubscribeOrders();
          unsubscribeStaff();
        };
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoadingData(false);
      }
    };

    fetchUserData();
    fetchDashboardData();
  }, [user]);

  // Helper function to calculate time difference in minutes
const timeDifferenceInMinutes = (time1, time2) => {
  const [hours1, minutes1] = time1.split(':').map(Number);
  const [hours2, minutes2] = time2.split(':').map(Number);
  
  return (hours2 - hours1) * 60 + (minutes2 - minutes1);
};

// Updated helper functions with better time calculations
const calculateAverageWaitTime = (queueItems) => {
  if (!queueItems || queueItems.length === 0) return 0;
  
  const now = new Date();
  const totalWaitTime = queueItems.reduce((sum, item) => {
    const createdAt = item.createdAt || now;
    const waitTime = (now - createdAt) / (1000 * 60); // in minutes
    return sum + Math.max(0, waitTime); // Don't count negative wait times
  }, 0);
  
  return parseFloat((totalWaitTime / queueItems.length).toFixed(1)) || 0;
};

const calculateQueueEfficiency = (queueItems) => {
  if (!queueItems || queueItems.length === 0) return 100;
  
  const completedOrders = queueItems.filter(item => 
    item.payment?.status === 'completed'
  ).length;
  
  const totalOrders = queueItems.length;
  
  // Calculate efficiency based on completed vs total, with minimum 50%
  const efficiency = Math.max(50, (completedOrders / Math.max(totalOrders, 1)) * 100);
  return parseFloat(efficiency.toFixed(1));
};

  const handlePrintMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePrintMenuClose = () => {
    setAnchorEl(null);
  };

  const handleChartType = (event, newType) => {
    // Fix: Only set chart type if newType is a string (not an event object)
    if (typeof newType === 'string' && newType) setChartType(newType);
  };

  const generateSalesReport = (fileFormat = 'pdf') => {
  if (fileFormat === 'pdf') {
    const doc = new jsPDF();
    let currentY = 20;
    
    // Add logo
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 14, 10, 30, 30);
    }
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Madnifeeco Coffee', 105, currentY, { align: 'center' });
    currentY += 10;
    
    doc.setFontSize(16);
    doc.text('Sales Performance Report', 105, currentY, { align: 'center' });
    currentY += 15;
    
    // Report metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, 14, currentY);
    doc.text(`Prepared for: ${userData?.name || 'Owner'}`, 105, currentY, { align: 'center' });
    doc.text(`Page 1`, 190, currentY, { align: 'right' });
    currentY += 10;
    
    // Summary section with improved styling
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, 'bold');
    doc.text('Business Summary', 14, currentY);
    currentY += 7;
    
    doc.setFont(undefined, 'normal');
    // Remove peso sign in all values
    const summaryData = [
      { label: 'Total Revenue', value: (stats.totalRevenue || 0).toFixed(2) },
      { label: 'Monthly Revenue', value: (stats.monthlyRevenue || 0).toFixed(2) },
      { label: 'Weekly Revenue', value: (stats.weeklyRevenue || 0).toFixed(2) },
      { label: 'Total Orders', value: stats.totalOrders.toString() }
    ];
    
    autoTable(doc, {
      startY: currentY,
      head: [['Metric', 'Value']],
      body: summaryData.map(item => [item.label, item.value]),
      theme: 'grid',
      headStyles: { 
        fillColor: [93, 64, 55],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { 
        cellPadding: 5,
        fontSize: 10
      },
      columnStyles: {
        1: { cellWidth: 'auto', halign: 'right' }
      }
    });
    currentY = doc.lastAutoTable.finalY + 15;
    
    // Top Products section with improved styling
    doc.setFont(undefined, 'bold');
    doc.text('Top Selling Products', 14, currentY);
    currentY += 7;
    
    const topProductsData = topProducts.map((product, index) => [
      (index + 1).toString(),
      product.name,
      product.count.toString(),
      (product.revenue).toFixed(2)
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Product', 'Quantity Sold', 'Revenue']],
      body: topProductsData,
      theme: 'grid',
      headStyles: { 
        fillColor: [93, 64, 55],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { 
        cellPadding: 5,
        fontSize: 10
      },
      columnStyles: {
        3: { halign: 'right' }
      },
      pageBreak: 'auto'
    });
    currentY = doc.lastAutoTable.finalY + 15;
    
    // Recent Orders section with improved styling
    doc.setFont(undefined, 'bold');
    doc.text('Recent Orders', 14, currentY);
    currentY += 7;
    
    const ordersData = recentOrders.map(order => [
      `#${order.id.slice(0, 6)}`,
      order.customerName || 'Walk-in',
      order.createdAt?.toDate ? format(order.createdAt.toDate(), 'MMM d, h:mm a') : 'N/A',
      order.total?.toFixed(2) || '0.00'
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Order ID', 'Customer', 'Date', 'Total']],
      body: ordersData,
      theme: 'grid',
      headStyles: { 
        fillColor: [93, 64, 55],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { 
        cellPadding: 5,
        fontSize: 10
      },
      columnStyles: {
        3: { halign: 'right' }
      },
      pageBreak: 'auto'
    });
    
    // Add page numbers and footer
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
      doc.text('Madnifeeco Coffee - Confidential', 14, 285);
    }
    
    doc.save('madnifeeco-sales-report.pdf');
  } else {
    // Excel export - well formatted and organized, no peso sign
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Madnifeeco Coffee - Sales Report'],
      [`Generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`],
      [`Prepared for: ${userData?.name || 'Owner'}`],
      [],
      ['Business Summary'],
      ['Metric', 'Value'],
      ['Total Revenue', stats.totalRevenue || 0],
      ['Monthly Revenue', stats.monthlyRevenue || 0],
      ['Weekly Revenue', stats.weeklyRevenue || 0],
      ['Total Orders', stats.totalOrders]
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Top Products sheet
    const productsData = [
      ['Top Selling Products'],
      [],
      ['#', 'Product', 'Quantity Sold', 'Revenue'],
      ...topProducts.map((product, index) => [
        index + 1,
        product.name,
        product.count,
        product.revenue
      ])
    ];
    const productsWs = XLSX.utils.aoa_to_sheet(productsData);
    XLSX.utils.book_append_sheet(wb, productsWs, 'Top Products');

    // Recent Orders sheet
    const ordersData = [
      ['Recent Orders'],
      [],
      ['Order ID', 'Customer', 'Date', 'Total'],
      ...recentOrders.map(order => [
        `#${order.id.slice(0, 6)}`,
        order.customerName || 'Walk-in',
        order.createdAt?.toDate ? format(order.createdAt.toDate(), 'MMM d, h:mm a') : 'N/A',
        order.total || 0
      ])
    ];
    const ordersWs = XLSX.utils.aoa_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, ordersWs, 'Recent Orders');

    // Set column widths for better formatting
    [summaryWs, productsWs, ordersWs].forEach(ws => {
      if (ws['!cols']) return;
      ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
    });

    XLSX.writeFile(wb, 'madnifeeco-sales-report.xlsx');
  }
  handlePrintMenuClose();
};

const generateAttendanceReport = (fileFormat = 'pdf') => {
  if (fileFormat === 'pdf') {
    const doc = new jsPDF();
    let currentY = 20;
    
    // Add logo
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 14, 10, 30, 30);
    }
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Madnifeeco Coffee', 105, currentY, { align: 'center' });
    currentY += 10;
    
    doc.setFontSize(16);
    doc.text('Staff Attendance Report', 105, currentY, { align: 'center' });
    currentY += 15;
    
    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, 14, currentY);
    doc.text(`Prepared for: ${userData?.name || 'Owner'}`, 105, currentY, { align: 'center' });
    doc.text(`Page 1`, 190, currentY, { align: 'right' });
    currentY += 10;
    
    // Staff Performance with improved styling
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, 'bold');
    doc.text('Staff Performance Metrics', 14, currentY);
    currentY += 7;
    
    const staffData = staffPerformance.map(staff => [
      staff.name,
      staff.shiftsCompleted.toString(),
      staff.punctuality,
      `${staff.avgDuration} hrs`
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Staff Name', 'Shifts Completed', 'Punctuality (1-5)', 'Avg. Duration']],
      body: staffData,
      theme: 'grid',
      headStyles: { 
        fillColor: [93, 64, 55],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { 
        cellPadding: 5,
        fontSize: 10
      },
      columnStyles: {
        2: { halign: 'center' }
      },
      pageBreak: 'auto'
    });
    
    // Add page numbers and footer
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
      doc.text('Madnifeeco Coffee - Confidential', 14, 285);
    }
    
    doc.save('madnifeeco-attendance-report.pdf');
  } else {
    // Excel export - well formatted and organized
    const wb = XLSX.utils.book_new();
    const staffData = [
      ['Madnifeeco Coffee - Attendance Report'],
      [`Generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`],
      [`Prepared for: ${userData?.name || 'Owner'}`],
      [],
      ['Staff Performance Metrics'],
      [],
      ['Staff Name', 'Shifts Completed', 'Punctuality (1-5)', 'Avg. Duration (hrs)'],
      ...staffPerformance.map(staff => [
        staff.name,
        staff.shiftsCompleted,
        staff.punctuality,
        staff.avgDuration
      ])
    ];
    const staffWs = XLSX.utils.aoa_to_sheet(staffData);
    staffWs['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, staffWs, 'Staff Performance');
    XLSX.writeFile(wb, 'madnifeeco-attendance-report.xlsx');
  }
  handlePrintMenuClose();
};

const generateInventoryReport = (fileFormat = 'pdf') => {
  if (fileFormat === 'pdf') {
    const doc = new jsPDF();
    let currentY = 20;
    
    // Add logo
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 14, 10, 30, 30);
    }
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Madnifeeco Coffee', 105, currentY, { align: 'center' });
    currentY += 10;
    
    doc.setFontSize(16);
    doc.text('Inventory Management Report', 105, currentY, { align: 'center' });
    currentY += 15;
    
    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, 14, currentY);
    doc.text(`Prepared for: ${userData?.name || 'Owner'}`, 105, currentY, { align: 'center' });
    doc.text(`Page 1`, 190, currentY, { align: 'right' });
    currentY += 10;
    
    // Inventory Summary with improved styling
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, 'bold');
    doc.text('Inventory Summary', 14, currentY);
    currentY += 7;
    
    doc.setFont(undefined, 'normal');
    // Remove peso sign in inventory value
    doc.setFont(undefined, 'normal');
    doc.text(`Total Inventory Value: ${stats.inventoryValue.toFixed(2)}`, 14, currentY);
    currentY += 10;

    // Products List with varieties/variants and prices
    doc.setFont(undefined, 'bold');
    doc.text('Product Inventory Details', 14, currentY);
    currentY += 7;

    // Build inventory data including varieties/variants
    let inventoryData = [];
    products.forEach(product => {
      // Main product row
      const getProductBasePrice = (product) => {
        if (Array.isArray(product.varieties) && product.varieties.length > 0) {
          return Math.min(...product.varieties.map(v => parseFloat(v.price) || 0));
        }
        if (
          Array.isArray(product.variants) && product.variants.length > 0 &&
          product.variantPrices && typeof product.variantPrices === 'object' && Object.keys(product.variantPrices).length > 0
        ) {
          return Math.min(...Object.values(product.variantPrices).map(p => parseFloat(p) || 0));
        }
        return parseFloat(product.price) || 0;
      };
      const unitPrice = getProductBasePrice(product);
      inventoryData.push([
        product.name,
        (product.stock || 0).toString(),
        unitPrice.toFixed(2),
        ((unitPrice * (product.stock || 0)).toFixed(2)),
        product.available ? 'Yes' : 'No'
      ]);
      // Varieties
      if (Array.isArray(product.varieties) && product.varieties.length > 0) {
        product.varieties.forEach(v => {
          inventoryData.push([
            `  - ${v.name}`,
            '', // No stock for variety
            (parseFloat(v.price) || 0).toFixed(2),
            '', // No total value for variety
            ''
          ]);
        });
      }
      // Variants
      if (Array.isArray(product.variants) && product.variants.length > 0 && product.variantPrices) {
        product.variants.forEach(variant => {
          const price = product.variantPrices?.[variant] || '';
          inventoryData.push([
            `  - ${variant}`,
            '', // No stock for variant
            (parseFloat(price) || 0).toFixed(2),
            '', // No total value for variant
            ''
          ]);
        });
      }
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Product', 'Stock', 'Unit Price', 'Total Value', 'Available']],
      body: inventoryData,
      theme: 'grid',
      headStyles: { 
        fillColor: [93, 64, 55],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { 
        cellPadding: 5,
        fontSize: 10
      },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' }
      },
      pageBreak: 'auto'
    });
    
    // Add page numbers and footer
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
      doc.text('Madnifeeco Coffee - Confidential', 14, 285);
    }
    
    doc.save('madnifeeco-inventory-report.pdf');
  } else {
    // Excel export - well formatted and organized, include varieties/variants
    const wb = XLSX.utils.book_new();
    const summaryData = [
      ['Madnifeeco Coffee - Inventory Report'],
      [`Generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`],
      [`Prepared for: ${userData?.name || 'Owner'}`],
      [],
      ['Inventory Summary'],
      ['Total Inventory Value', stats.inventoryValue],
      [],
      ['Product Inventory Details'],
      [],
      ['Product', 'Stock', 'Unit Price', 'Total Value', 'Available']
    ];
    // Add product data with varieties/variants
    products.forEach(product => {
      const getProductBasePrice = (product) => {
        if (Array.isArray(product.varieties) && product.varieties.length > 0) {
          return Math.min(...product.varieties.map(v => parseFloat(v.price) || 0));
        }
        if (
          Array.isArray(product.variants) && product.variants.length > 0 &&
          product.variantPrices && typeof product.variantPrices === 'object' && Object.keys(product.variantPrices).length > 0
        ) {
          return Math.min(...Object.values(product.variantPrices).map(p => parseFloat(p) || 0));
        }
        return parseFloat(product.price) || 0;
      };
      const unitPrice = getProductBasePrice(product);
      summaryData.push([
        product.name,
        product.stock || 0,
        unitPrice,
        unitPrice * (product.stock || 0),
        product.available ? 'Yes' : 'No'
      ]);
      // Varieties
      if (Array.isArray(product.varieties) && product.varieties.length > 0) {
        product.varieties.forEach(v => {
          summaryData.push([
            `  - ${v.name}`,
            '',
            parseFloat(v.price) || 0,
            '',
            ''
          ]);
        });
      }
      // Variants
      if (Array.isArray(product.variants) && product.variants.length > 0 && product.variantPrices) {
        product.variants.forEach(variant => {
          const price = product.variantPrices?.[variant] || '';
          summaryData.push([
            `  - ${variant}`,
            '',
            parseFloat(price) || 0,
            '',
            ''
          ]);
        });
      }
    });
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [
      { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Inventory');
    XLSX.writeFile(wb, 'madnifeeco-inventory-report.xlsx');
  }
  handlePrintMenuClose();
};


  if (loading || loadingData) {
    return (
      <Container maxWidth="xl" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: 6,
        minHeight: '100vh',
        background: 'linear-gradient(120deg, #f9f5f0 60%, #f5f0e6 100%)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          mb: 5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontFamily: '"Playfair Display", serif',
              color: '#4e342e',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              letterSpacing: 1,
              mb: 0.5,
            }}
          >
            <LocalCafe sx={{ mr: 2, fontSize: '2.5rem' }} />
            Madnifeeco Dashboard
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              color: '#a1887f',
              fontWeight: 400,
              fontSize: 18,
              mb: 0.5,
              letterSpacing: 0.5,
            }}
          >
            Welcome back, {userData?.name || 'Owner'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#bdbdbd', fontSize: 15 }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handlePrintMenuOpen}
            sx={{
              color: '#4e342e',
              borderColor: '#bdbdbd',
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 500,
              background: 'rgba(255,255,255,0.7)',
              boxShadow: 'none',
              '&:hover': {
                borderColor: '#8d6e63',
                background: '#f5f0e6',
              },
            }}
          >
            Generate Reports
          </Button>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handlePrintMenuClose}>
  <MenuItem onClick={() => generateSalesReport('pdf')}>
    <PictureAsPdf sx={{ mr: 1, color: '#d32f2f' }} />
    Sales Report (PDF)
  </MenuItem>
  <MenuItem onClick={() => generateSalesReport('excel')}>
    <Description sx={{ mr: 1, color: '#2e7d32' }} />
    Sales Report (Excel)
  </MenuItem>
  <Divider />
  <MenuItem onClick={() => generateAttendanceReport('pdf')}>
    <PictureAsPdf sx={{ mr: 1, color: '#d32f2f' }} />
    Attendance Report (PDF)
  </MenuItem>
  <MenuItem onClick={() => generateAttendanceReport('excel')}>
    <Description sx={{ mr: 1, color: '#2e7d32' }} />
    Attendance Report (Excel)
  </MenuItem>
  <Divider />
  <MenuItem onClick={() => generateInventoryReport('pdf')}>
    <PictureAsPdf sx={{ mr: 1, color: '#d32f2f' }} />
    Inventory Report (PDF)
  </MenuItem>
  <MenuItem onClick={() => generateInventoryReport('excel')}>
    <Description sx={{ mr: 1, color: '#2e7d32' }} />
    Inventory Report (Excel)
  </MenuItem>
</Menu>
        </Box>
      </Box>

      <Divider sx={{ my: 3, borderColor: '#ede7e3' }} />

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Revenue */}
        <Grid item xs={12} md={6} lg={3}>
          <Card
            sx={{
              height: '100%',
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid #ede7e3',
              borderRadius: '18px',
              boxShadow: 'none',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 24px 0 rgba(93,64,55,0.08)' },
              p: 1,
              animation: 'fadeIn 0.7s',
            }}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ 
                  bgcolor: 'rgba(111, 78, 55, 0.1)',
                  color: '#5d4037'
                }}>
                  <AttachMoney />
                </Avatar>
              }
              title="Total Revenue"
              titleTypographyProps={{ 
                variant: 'h6',
                color: '#5d4037'
              }}
            />
            <CardContent>
              <Typography variant="h4" sx={{ color: '#3e2723', fontWeight: 700 }}>
                ₱{(stats.totalRevenue || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#8d6e63', mt: 1 }}>
                All-time sales
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Revenue */}
        <Grid item xs={12} md={6} lg={3}>
          <Card
            sx={{
              height: '100%',
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid #ede7e3',
              borderRadius: '18px',
              boxShadow: 'none',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 24px 0 rgba(93,64,55,0.08)' },
              p: 1,
              animation: 'fadeIn 0.7s',
            }}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ 
                  bgcolor: 'rgba(46, 125, 50, 0.1)',
                  color: '#2e7d32'
                }}>
                  <TrendingUp />
                </Avatar>
              }
              title="Monthly Revenue"
              titleTypographyProps={{ 
                variant: 'h6',
                color: '#5d4037'
              }}
            />
            <CardContent>
              <Typography variant="h4" sx={{ color: '#3e2723', fontWeight: 700 }}>
                ₱{(stats.monthlyRevenue || 0).toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography variant="body2" sx={{ 
                  color: stats.monthlyRevenue > stats.weeklyRevenue * 4 ? '#2e7d32' : '#d84315',
                  mr: 1
                }}>
                  {((stats.monthlyRevenue / (stats.weeklyRevenue * 4 || 1)) * 100).toFixed(0)}% of projected
                </Typography>
                {stats.monthlyRevenue > stats.weeklyRevenue * 4 ? (
                  <TrendingUp sx={{ color: '#2e7d32' }} />
                ) : (
                  <TrendingDown sx={{ color: '#d84315' }} />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Staff (now includes manager) */}
        <Grid item xs={12} md={6} lg={3}>
          <Card
            sx={{
              height: '100%',
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid #ede7e3',
              borderRadius: '18px',
              boxShadow: 'none',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 24px 0 rgba(93,64,55,0.08)' },
              p: 1,
              animation: 'fadeIn 0.7s',
            }}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ 
                  bgcolor: 'rgba(25, 118, 210, 0.1)',
                  color: '#1976d2'
                }}>
                  <People />
                </Avatar>
              }
              title="Active Staff"
              titleTypographyProps={{ 
                variant: 'h6',
                color: '#5d4037'
              }}
            />
            <CardContent>
              <Typography variant="h4" sx={{ color: '#3e2723', fontWeight: 700 }}>
                {stats.activeStaff}
              </Typography>
              <Typography variant="body2" sx={{ color: '#8d6e63', mt: 1 }}>
                Currently employed (includes managers)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Inventory Value */}
        <Grid item xs={12} md={6} lg={3}>
          <Card
            sx={{
              height: '100%',
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid #ede7e3',
              borderRadius: '18px',
              boxShadow: 'none',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 24px 0 rgba(93,64,55,0.08)' },
              p: 1,
              animation: 'fadeIn 0.7s',
            }}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ 
                  bgcolor: 'rgba(255, 167, 38, 0.1)',
                  color: '#ff8f00'
                }}>
                  <Inventory />
                </Avatar>
              }
              title="Inventory Value"
              titleTypographyProps={{ 
                variant: 'h6',
                color: '#5d4037'
              }}
            />
            <CardContent>
              <Typography variant="h4" sx={{ color: '#3e2723', fontWeight: 700 }}>
                ₱{(stats.inventoryValue || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#8d6e63', mt: 1 }}>
                Current stock worth
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Revenue and Performance Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Chart with Chart Type Switcher and Analytics */}
        <Grid item xs={12} md={8}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              background: 'rgba(255,255,255,0.95)',
              border: '1.5px solid #ede7e3',
              borderRadius: '18px',
              boxShadow: 'none',
              p: 1,
              animation: 'fadeIn 1s',
            }}
          >
            <CardHeader
              title="Revenue Overview"
              titleTypographyProps={{ 
                variant: 'h5',
                color: '#5d4037'
              }}
              avatar={
                <Avatar sx={{ 
                  bgcolor: 'rgba(111, 78, 55, 0.1)',
                  color: '#5d4037'
                }}>
                  <BarChart />
                </Avatar>
              }
              action={
                <ToggleButtonGroup
                  value={chartType}
                  exclusive
                  onChange={handleChartType}
                  size="small"
                  sx={{ mr: 1 }}
                >
                  <Tooltip title="Line Chart"><ToggleButton value="LineChart"><ShowChart fontSize="small" /></ToggleButton></Tooltip>
                  <Tooltip title="Bar Chart"><ToggleButton value="BarChart"><MuiBarChart fontSize="small" /></ToggleButton></Tooltip>
                  <Tooltip title="Pie Chart"><ToggleButton value="PieChart"><PieChart fontSize="small" /></ToggleButton></Tooltip>
                  <Tooltip title="Table"><ToggleButton value="Table"><TableChart fontSize="small" /></ToggleButton></Tooltip>
                </ToggleButtonGroup>
              }
            />
            <CardContent sx={{ height: 300 }}>
              {revenueData.length > 1 ? (
                <Chart
                  chartType={chartType}
                  data={revenueData}
                  options={{
                    title: chartType === 'PieChart' ? 'Revenue Distribution' : 'Daily Revenue',
                    curveType: 'function',
                    legend: { position: 'bottom' },
                    hAxis: { title: chartType === 'LineChart' || chartType === 'BarChart' ? 'Date' : undefined },
                    vAxis: { title: chartType === 'LineChart' || chartType === 'BarChart' ? 'Revenue (₱)' : undefined },
                    colors: ['#8d6e63'],
                    backgroundColor: 'transparent'
                  }}
                  width="100%"
                  height="100%"
                />
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%',
                  backgroundColor: 'rgba(111, 78, 55, 0.05)',
                  borderRadius: '8px'
                }}>
                  <Typography variant="body1" sx={{ color: '#8d6e63' }}>
                    Loading revenue data...
                  </Typography>
                </Box>
              )}
              {/* Analytics Summary */}
              <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {analytics.map((item, idx) => (
                  <Paper key={idx} sx={{ p: 1.5, minWidth: 140, background: 'rgba(93,64,55,0.04)', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ color: '#8d6e63', fontWeight: 500 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: '#5d4037', fontWeight: 700 }}>
                      {item.value}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} md={4}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              background: 'rgba(255,255,255,0.95)',
              border: '1.5px solid #ede7e3',
              borderRadius: '18px',
              boxShadow: 'none',
              p: 1,
              animation: 'fadeIn 1.2s',
            }}
          >
            <CardHeader
              title="Top Brews"
              titleTypographyProps={{ 
                variant: 'h5',
                color: '#5d4037'
              }}
              avatar={
                <Avatar sx={{ 
                  bgcolor: 'rgba(111, 78, 55, 0.1)',
                  color: '#5d4037'
                }}>
                  <LocalCafe />
                </Avatar>
              }
            />
            <CardContent>
              <List>
                {topProducts.map((product, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ color: '#5d4037' }}>
                        {index + 1}. {product.name}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ color: '#5d4037' }}>
                        ₱{product.revenue.toFixed(2)}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(product.revenue / (topProducts[0]?.revenue || 1)) * 100} 
                      sx={{ 
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(111, 78, 55, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#8d6e63'
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#8d6e63', display: 'block', mt: 0.5 }}>
                      {product.count} sold
                    </Typography>
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Business Insights Section */}
      <Grid container spacing={3}>
        {/* Recent Orders */}
        <Grid item xs={12} md={6}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              background: 'rgba(255,255,255,0.97)',
              border: '1.5px solid #ede7e3',
              borderRadius: '18px',
              boxShadow: 'none',
              p: 1,
              animation: 'fadeIn 1.4s',
            }}
          >
            <CardHeader
              title="Recent Orders"
              titleTypographyProps={{ 
                variant: 'h5',
                color: '#5d4037'
              }}
              avatar={
                <Avatar sx={{ 
                  bgcolor: 'rgba(111, 78, 55, 0.1)',
                  color: '#5d4037'
                }}>
                  <Receipt />
                </Avatar>
              }
              action={
                <Button 
                  size="small" 
                  sx={{ color: '#8d6e63' }}
                  onClick={() => window.location.href = '/orders'}
                >
                  View All
                </Button>
              }
            />
            <CardContent>
              <List>
                {recentOrders.map(order => (
                  <Paper key={order.id} sx={{ 
                    p: 2, 
                    mb: 2, 
                    backgroundColor: 'rgba(111, 78, 55, 0.05)',
                    borderRadius: '8px'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle1" sx={{ color: '#5d4037' }}>
                        Order #{order.id.slice(0, 6)}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ color: '#5d4037' }}>
                        ₱{(order.total || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                      {order.customerName || 'Walk-in'} • {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'MMM d, h:mm a') : 'N/A'}
                    </Typography>
                    {order.items && (
                      <Box sx={{ mt: 1 }}>
                        {order.items.slice(0, 2).map((item, idx) => (
                          <Chip 
                            key={idx}
                            label={`${item.quantity}x ${item.name}`}
                            size="small"
                            sx={{ 
                              mr: 1, 
                              mb: 1,
                              backgroundColor: 'rgba(141, 110, 99, 0.1)',
                              color: '#5d4037'
                            }}
                          />
                        ))}
                        {order.items.length > 2 && (
                          <Chip 
                            label={`+${order.items.length - 2} more`}
                            size="small"
                            sx={{ 
                              backgroundColor: 'rgba(141, 110, 99, 0.1)',
                              color: '#5d4037'
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </Paper>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Business Metrics */}
        <Grid item xs={12} md={6}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              background: 'rgba(255,255,255,0.97)',
              border: '1.5px solid #ede7e3',
              borderRadius: '18px',
              boxShadow: 'none',
              p: 1,
              animation: 'fadeIn 1.6s',
            }}
          >
            <CardHeader
              title="Business Metrics"
              titleTypographyProps={{ 
                variant: 'h5',
                color: '#5d4037'
              }}
              avatar={
                <Avatar sx={{ 
                  bgcolor: 'rgba(111, 78, 55, 0.1)',
                  color: '#5d4037'
                }}>
                  <PointOfSale />
                </Avatar>
              }
            />
            <CardContent>
              <Grid container spacing={2}>
                {/* Loyalty Program */}
                <Grid item xs={12} sm={6}>
                  <Paper
                    sx={{
                      p: 2,
                      height: '100%',
                      backgroundColor: 'rgba(212, 167, 98, 0.1)',
                      borderRadius: '8px'
                      // removed cursor: 'pointer'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CardGiftcard sx={{ color: '#8d6e63', mr: 1 }} />
                      <Typography variant="h6" sx={{ color: '#5d4037' }}>
                        Loyalty Program
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: '#5d4037' }}>
                      {loyaltyData.activeMembers} active members
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                      {loyaltyData.totalPoints} points available
                    </Typography>
                    {/* Remove dialog trigger and details, just show summary */}
                  </Paper>
                </Grid>

                {/* Table Utilization */}
                <Grid item xs={12} sm={6}>
                  <Paper
                    sx={{
                      p: 2,
                      height: '100%',
                      backgroundColor: 'rgba(141, 110, 99, 0.1)',
                      borderRadius: '8px'
                      // removed cursor: 'pointer'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TableRestaurant sx={{ color: '#8d6e63', mr: 1 }} />
                      <Typography variant="h6" sx={{ color: '#5d4037' }}>
                        Table Utilization
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: '#5d4037' }}>
                      {(stats.tableUtilization || 0).toFixed(0)}% occupancy rate
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                      {stats.occupiedTables}/{stats.totalTables} tables occupied
                    </Typography>
                    {/* Remove dialog trigger and details, just show summary */}
                  </Paper>
                </Grid>

                {/* Staff Performance */}
                <Grid item xs={12} sm={6}>
                  <Paper
                    sx={{
                      p: 2,
                      height: '100%',
                      backgroundColor: 'rgba(111, 78, 55, 0.1)',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setStaffDialogOpen(true)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <People sx={{ color: '#8d6e63', mr: 1 }} />
                      <Typography variant="h6" sx={{ color: '#5d4037' }}>
                        Staff Performance
                      </Typography>
                    </Box>
                    {staffPerformance.length > 0 ? (
                      <>
                        <Typography variant="body1" sx={{ color: '#5d4037' }}>
                          Avg. punctuality: {(
                            staffPerformance
                              .filter(staff => staff.punctuality !== 'N/A')
                              .reduce((sum, staff) => sum + parseFloat(staff.punctuality), 0) /
                            (staffPerformance.filter(staff => staff.punctuality !== 'N/A').length || 1)
                          ).toFixed(2)}/5
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                          Based on {staffPerformance.reduce((sum, staff) => sum + (staff.shiftsCompleted || 0), 0)} shifts
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          {staffPerformance.slice(0, 3).map((staff, idx) => (
                            <Box key={idx} sx={{ mb: 0.5 }}>
                              <Typography variant="caption" sx={{ color: '#5d4037', fontWeight: 500 }}>
                                {staff.name}:
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#8d6e63', ml: 1 }}>
                                {staff.shiftsCompleted} shifts, Punctuality: {staff.punctuality}/5, Avg. Duration: {staff.avgDuration} hrs
                              </Typography>
                            </Box>
                          ))}
                          {staffPerformance.length > 3 && (
                            <Typography variant="caption" sx={{ color: '#8d6e63' }}>
                              ...and {staffPerformance.length - 3} more
                            </Typography>
                          )}
                        </Box>
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                        No performance data available
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                {/* Queue Efficiency */}
                <Grid item xs={12} sm={6}>
                  <Paper
                    sx={{
                      p: 2,
                      height: '100%',
                      backgroundColor: 'rgba(141, 110, 99, 0.1)',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setQueueDialogOpen(true)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Queue sx={{ color: '#8d6e63', mr: 1 }} />
                      <Typography variant="h6" sx={{ color: '#5d4037' }}>
                        Queue Efficiency
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: '#5d4037' }}>
                      Avg. wait time: {stats.avgWaitTime || 0} min
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#8d6e63' }}>
                      {stats.queueLength} orders in queue
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#8d6e63', mt: 1 }}>
                      Efficiency: {stats.queueEfficiency || 0}%
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Remove Loyalty Members Dialog and Table Utilization Dialog */}
      {/* ...existing code for Staff and Queue dialogs... */}
    </Container>
  );
};

export default OwnerDashboard;