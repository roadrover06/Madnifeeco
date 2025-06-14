// src/pages/Register.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  TextField, Button, Container, Typography, Box, Alert,
  Grid, CircularProgress, CssBaseline, MenuItem,
  Snackbar, IconButton, Divider, Fade, InputAdornment
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import coffeeLogo from '../assets/coffee-logoo.jpg';
import { validateReferralCode, markReferralCodeAsUsed } from '../utils/referralUtils';
import { Close, Visibility, VisibilityOff } from '@mui/icons-material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6F4E37', // Rich coffee brown
      light: '#A78A7F', // Lighter coffee
      dark: '#4E3524', // Dark coffee
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#D7A56D', // Coffee cream
    },
    background: {
      default: '#F9F5F2', // Warm off-white
    },
    text: {
      primary: '#3E2723', // Dark brown
      secondary: '#8D6E63', // Medium brown
    },
    error: {
      main: '#D32F2F',
    },
    success: {
      main: '#2E7D32',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Inter", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '0.5px',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    body1: {
      fontWeight: 400,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.5px',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused fieldset': {
              borderWidth: '1px',
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          }
        }
      },
    },
  },
});

const roles = [
  { value: 'staff', label: 'Staff' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
];

// Array of high-quality coffee shop background images
const backgroundImages = [
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1507133750040-4a8f57021571?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1511920170033-f8396924c348?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1463797221720-6b07e6426c24?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'
];

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('staff');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState('');
  const [referralCodeValid, setReferralCodeValid] = useState(false);
  const [referralRole, setReferralRole] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Background image slideshow effect
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentBgIndex((prevIndex) => 
          (prevIndex + 1) % backgroundImages.length
        );
        setFade(true);
      }, 1000);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const handleReferralCodeChange = async (e) => {
    const code = e.target.value;
    setReferralCode(code);
    
    if (code) {
      const isValid = await validateReferralCode(code);
      setReferralCodeValid(isValid);
      if (isValid) {
        const role = code.split('-')[1].toLowerCase();
        setReferralRole(role);
        setRole(role);
        setSnackbar({
          open: true,
          message: 'Referral code validated successfully!',
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Invalid referral code',
          severity: 'error',
        });
      }
    } else {
      setReferralCodeValid(false);
      setReferralRole('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!referralCodeValid) {
      setError('Valid referral code is required');
      setSnackbar({
        open: true,
        message: 'Please enter a valid referral code',
        severity: 'error',
      });
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setSnackbar({
        open: true,
        message: 'Passwords do not match',
        severity: 'error',
      });
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setSnackbar({
        open: true,
        message: 'Password must be at least 6 characters',
        severity: 'error',
      });
      return;
    }

    setError('');
    setLoading(true);

    try {
      await markReferralCodeAsUsed(referralCode);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
        email,
        role: referralRole || role,
        createdAt: new Date(),
        referredBy: referralCode,
      });

      setSnackbar({
        open: true,
        message: 'Registration successful! Redirecting...',
        severity: 'success',
      });
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      const code = err.code;
      const messages = {
        'auth/email-already-in-use': 'Email already in use',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/invalid-email': 'Invalid email address',
      };
      const errorMessage = messages[code] || err.message;
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated Background */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            // Match Login.js: add the gradient directly to each image for proper transparency
          }}
        >
          {backgroundImages.map((img, index) => (
            <Box
              key={index}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                // Match Login.js: gradient overlay + image in one background property
                background: `linear-gradient(rgba(79, 55, 39, 0.7), rgba(79, 55, 39, 0.9)), url(${img}) center/cover no-repeat fixed`,
                opacity: index === currentBgIndex ? (fade ? 1 : 0) : 0,
                transition: 'opacity 1s ease-in-out',
                willChange: 'opacity',
              }}
            />
          ))}
        </Box>

        <Container maxWidth="sm" disableGutters>
          <CssBaseline />
          <Fade in={true} timeout={700}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                backdropFilter: 'blur(8px) saturate(180%)',
                background: 'rgba(255, 249, 242, 0.88)',
                borderRadius: 4,
                boxShadow: '0 12px 40px rgba(79, 55, 39, 0.25)',
                px: { xs: 2, sm: 4 },
                py: { xs: 3, sm: 5 },
                border: '1px solid rgba(255, 255, 255, 0.18)',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 1,
                '&:before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #6F4E37 0%, #D7A56D 50%, #6F4E37 100%)',
                }
              }}
            >
              <Box
                component="img"
                src={coffeeLogo}
                alt="Madnifeeco Logo"
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  mb: 2,
                  border: '3px solid white',
                  boxShadow: '0 4px 20px rgba(111, 78, 55, 0.3)',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05) rotate(5deg)',
                  }
                }}
              />
              <Typography
                component="h1"
                variant="h4"
                sx={{
                  mb: 0.5,
                  color: 'primary.dark',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  background: 'linear-gradient(135deg, #6F4E37 0%, #D7A56D 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
              >
                MADNIFEECO
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 3,
                  color: 'text.secondary',
                  fontWeight: 400,
                  fontSize: '0.95rem',
                  textAlign: 'center',
                  maxWidth: '80%',
                  lineHeight: 1.5,
                }}
              >
                "Join our coffee community and brew your success."
              </Typography>
              <Typography variant="body1" sx={{ 
                color: 'text.secondary', 
                mb: 2,
                fontWeight: 500
              }}>
                Fill in your details below
              </Typography>
              
              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'error.main',
                    bgcolor: 'rgba(211, 47, 47, 0.08)',
                    width: '100%'
                  }}
                >
                  {error}
                </Alert>
              )}
              
              <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
                sx={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: 3,
                  boxShadow: '0 2px 12px rgba(111, 78, 55, 0.08)',
                  p: { xs: 2.5, sm: 3.5 },
                  border: '1px solid rgba(111, 78, 55, 0.1)',
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      label="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '& fieldset': {
                            borderColor: 'rgba(111, 78, 55, 0.15)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'primary.light',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      label="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '& fieldset': {
                            borderColor: 'rgba(111, 78, 55, 0.15)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'primary.light',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '& fieldset': {
                            borderColor: 'rgba(111, 78, 55, 0.15)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'primary.light',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      helperText="At least 6 characters"
                      variant="outlined"
                      size="small"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              onClick={() => setShowPassword((show) => !show)}
                              edge="end"
                              size="small"
                              tabIndex={-1}
                              sx={{ color: 'text.secondary' }}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '& fieldset': {
                            borderColor: 'rgba(111, 78, 55, 0.15)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'primary.light',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      label="Confirm Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                              onClick={() => setShowConfirmPassword((show) => !show)}
                              edge="end"
                              size="small"
                              tabIndex={-1}
                              sx={{ color: 'text.secondary' }}
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '& fieldset': {
                            borderColor: 'rgba(111, 78, 55, 0.15)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'primary.light',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      select
                      label="Role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={referralCodeValid}
                      helperText={
                        referralCodeValid
                          ? `Role assigned via referral code: ${referralRole}`
                          : 'Select a role manually'
                      }
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '& fieldset': {
                            borderColor: 'rgba(111, 78, 55, 0.15)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'primary.light',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    >
                      {roles.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="Referral Code"
                      value={referralCode}
                      onChange={handleReferralCodeChange}
                      error={referralCode && !referralCodeValid}
                      helperText={referralCode && !referralCodeValid ? "Invalid referral code" : ""}
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '& fieldset': {
                            borderColor: referralCodeValid ? theme.palette.success.main : 'rgba(111, 78, 55, 0.15)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'primary.light',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>
                </Grid>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    mt: 3,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: '1rem',
                    letterSpacing: '0.5px',
                    bgcolor: 'primary.main',
                    background: 'linear-gradient(135deg, #6F4E37 0%, #8D6E63 100%)',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                      background: 'linear-gradient(135deg, #5C3D2E 0%, #6F4E37 100%)',
                      transform: 'translateY(-2px)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  startIcon={!loading && <PersonAddIcon />}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Create Account'
                  )}
                </Button>
                <Divider sx={{ 
                  my: 3, 
                  color: 'text.secondary', 
                  '&:before, &:after': {
                    borderColor: 'rgba(111, 78, 55, 0.15)',
                  } 
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                    or
                  </Typography>
                </Divider>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ 
                    color: 'text.secondary',
                    fontWeight: 400,
                    fontSize: '0.95rem',
                  }}>
                    Already have an account?{' '}
                    <Typography
                      component={Link}
                      to="/login"
                      variant="body2"
                      sx={{
                        color: 'primary.main',
                        fontWeight: 600,
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: 'primary.dark',
                        },
                        transition: 'color 0.2s ease',
                      }}
                    >
                      Sign in
                    </Typography>
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Fade>
        </Container>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{
            '& .MuiSnackbarContent-root': {
              borderRadius: 2,
            }
          }}
        >
          <Alert
            elevation={6}
            variant="filled"
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{
              width: '100%',
              alignItems: 'center',
              borderRadius: 2,
            }}
            iconMapping={{
              success: <img src={coffeeLogo} alt="" style={{ width: 24, height: 24, marginRight: 8, borderRadius: '50%' }} />,
              error: <img src={coffeeLogo} alt="" style={{ width: 24, height: 24, marginRight: 8, borderRadius: '50%', filter: 'grayscale(100%)' }} />,
            }}
            action={
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleCloseSnackbar}
              >
                <Close fontSize="small" />
              </IconButton>
            }
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default Register;